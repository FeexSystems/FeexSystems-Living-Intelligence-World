/** Security Repository — handles security scans, vulnerabilities, and remediation operations */

import { prisma, SecurityScanStatus, Severity } from '@prisma/client';

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
    const result = await prisma.security_scan.create({
      data: {
        user_id: scan.userId,
        target: scan.target,
        scan_type: scan.scanType,
        configuration: scan.configuration,
        scheduled_at: scan.scheduledAt,
        priority: scan.priority,
        status: 'queued',
        created_at: new Date(),
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
    const where: any = { user_id: userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.scanType) where.scan_type = filters.scanType;
    if (filters?.startDate) where.created_at = { ...where.created_at, gte: filters.startDate };
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = { ...where.created_at, lte: end };
    }

    const [scans, total] = await Promise.all([
      prisma.security_scan.findMany({ where, orderBy: { created_at: 'desc' } }),
      prisma.security_scan.count({ where })
    ]);
    return { scans, total };
  }

  async getScan(scanId: string): Promise<any | null> {
    return prisma.security_scan.findFirst({ where: { id: scanId } });
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
    const result = await prisma.vulnerability_remediation_ticket.create({
      data: {
        user_id: ticket.userId,
        vulnerability_id: ticket.vulnerability.id,
        vulnerability_title: ticket.vulnerability.title,
        vulnerability_severity: ticket.vulnerability.severity,
        security_scan_id: ticket.scanId,
        assigned_to: ticket.assignedTo,
        priority: ticket.priority,
        due_date: ticket.dueDate,
        tags: ticket.tags,
        notes: ticket.notes,
        status: 'open',
        created_at: new Date(),
      }
    });
    return result;
  }

  async listRemediationTickets(userId: string, filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
  }): Promise<{ tickets: any[]; total: number }> {
    const where: any = { user_id: userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.assignedTo) where.assigned_to = filters.assignedTo;
    if (filters?.priority) where.priority = filters.priority;

    const [tickets, total] = await Promise.all([
      prisma.vulnerability_remediation_ticket.findMany({ where, orderBy: { created_at: 'desc' } }),
      prisma.vulnerability_remediation_ticket.count({ where })
    ]);
    return { tickets, total };
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    return prisma.vulnerability_remediation_ticket.update({
      where: { id: ticketId },
      data: { status, updated_at: new Date() }
    });
  }
}