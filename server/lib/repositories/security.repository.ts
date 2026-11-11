/** Security Repository — handles security scans, vulnerabilities, and remediation operations */

import { Prisma, ScanStatus, SecurityScanType } from '@prisma/client';
import { prisma } from '../database';

/**
 * Severity levels used by scan findings.
 *
 * The Prisma schema has no `Severity` enum — findings live inside the
 * `SecurityScan.results` JSON blob — so the domain type is declared here.
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecurityRepository {
  submitScan(scan: {
    userId: string;
    target: string;
    scanType: string;
    configuration?: any;
    scheduledAt?: Date;
    priority?: string;
  }): Promise<{ scanId: string; status: string }>;

  listScans(userId: string, filters?: {
    status?: string;
    scanType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ scans: any[]; total: number }>;

  getScan(scanId: string): Promise<any | null>;

  createRemediationTicket(ticket: {
    userId: string;
    vulnerability: {
      id: string;
      title: string;
      severity: Severity;
    };
    scanId: string;
    assignedTo?: string;
    priority?: string;
    dueDate?: Date;
    tags?: string[];
    notes?: string;
  }): Promise<any>;

  listRemediationTickets(userId: string, filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
  }): Promise<{ tickets: any[]; total: number }>;

  updateTicketStatus(ticketId: string, status: string): Promise<any>;
}

export class PrismaSecurityRepository implements SecurityRepository {
  async submitScan(scan: {
    userId: string;
    target: string;
    scanType: string;
    configuration?: any;
    scheduledAt?: Date;
    priority?: string;
  }): Promise<{ scanId: string; status: string }> {
    const result = await prisma.securityScan.create({
      data: {
        userId: scan.userId,
        // `targetData` is the schema's JSON column for the scan target.
        targetData: { target: scan.target, configuration: scan.configuration, priority: scan.priority },
        scanType: scan.scanType as SecurityScanType,
        scheduledAt: scan.scheduledAt,
        status: ScanStatus.QUEUED,
        createdAt: new Date(),
      }
    });
    return { scanId: result.id, status: result.status };
  }

  async listScans(userId: string, filters?: {
    status?: string;
    scanType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ scans: any[]; total: number }> {
    const where: any = { userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.scanType) where.scanType = filters.scanType;
    if (filters?.startDate) where.createdAt = { ...where.createdAt, gte: filters.startDate };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }

    const [scans, total] = await Promise.all([
      prisma.securityScan.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.securityScan.count({ where })
    ]);
    return { scans, total };
  }

  async getScan(scanId: string): Promise<any | null> {
    return prisma.securityScan.findUnique({ where: { id: scanId } });
  }

  async createRemediationTicket(ticket: {
    userId: string;
    vulnerability: {
      id: string;
      title: string;
      severity: Severity;
    };
    scanId: string;
    assignedTo?: string;
    priority?: string;
    dueDate?: Date;
    tags?: string[];
    notes?: string;
  }): Promise<any> {
    // There is no remediation-ticket table in the schema. Findings live inside
    // `SecurityScan.results`, so a ticket is recorded as a structured entry on
    // the owning scan rather than in a table that doesn't exist.
    const scan = await prisma.securityScan.findUnique({ where: { id: ticket.scanId } });
    if (!scan) {
      throw new Error(`Security scan not found: ${ticket.scanId}`);
    }

    const results = (scan.results ?? {}) as Record<string, unknown>;
    const tickets = Array.isArray(results.remediationTickets) ? results.remediationTickets : [];
    const entry = {
      id: `${ticket.scanId}:${ticket.vulnerability.id}`,
      vulnerabilityId: ticket.vulnerability.id,
      vulnerabilityTitle: ticket.vulnerability.title,
      vulnerabilitySeverity: ticket.vulnerability.severity,
      assignedTo: ticket.assignedTo ?? null,
      priority: ticket.priority ?? 'medium',
      dueDate: ticket.dueDate?.toISOString() ?? null,
      tags: ticket.tags ?? [],
      notes: ticket.notes ?? null,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    await prisma.securityScan.update({
      where: { id: ticket.scanId },
      // Prisma JSON columns reject `undefined` field values; cast through
      // InputJsonValue at the write boundary.
      data: { results: { ...results, remediationTickets: [...tickets, entry] } as unknown as Prisma.InputJsonValue },
    });

    return entry;
  }

  async listRemediationTickets(userId: string, filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
  }): Promise<{ tickets: any[]; total: number }> {
    const scans = await prisma.securityScan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const tickets = scans.flatMap((scan: { results: unknown }) => {
      const results = (scan.results ?? {}) as Record<string, unknown>;
      const entries = Array.isArray(results.remediationTickets) ? results.remediationTickets : [];
      return entries as Array<Record<string, unknown>>;
    }).filter((ticket: Record<string, unknown>) => {
      if (filters?.status && ticket.status !== filters.status) return false;
      if (filters?.assignedTo && ticket.assignedTo !== filters.assignedTo) return false;
      if (filters?.priority && ticket.priority !== filters.priority) return false;
      return true;
    });

    return { tickets, total: tickets.length };
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    const [scanId] = ticketId.split(':');
    if (!scanId) {
      throw new Error(`Malformed remediation ticket id: ${ticketId}`);
    }

    const scan = await prisma.securityScan.findUnique({ where: { id: scanId } });
    if (!scan) {
      throw new Error(`Security scan not found: ${scanId}`);
    }

    const results = (scan.results ?? {}) as Record<string, unknown>;
    const tickets = Array.isArray(results.remediationTickets) ? results.remediationTickets : [];
    const updated = (tickets as Array<Record<string, unknown>>).map((ticket) =>
      ticket.id === ticketId ? { ...ticket, status, updatedAt: new Date().toISOString() } : ticket
    );

    await prisma.securityScan.update({
      where: { id: scanId },
      // Prisma JSON input needs InputJsonValue; the spread payload is untyped.
      data: { results: JSON.parse(JSON.stringify({ ...results, remediationTickets: updated })) },
    });

    return updated.find((ticket) => ticket.id === ticketId) ?? null;
  }
}