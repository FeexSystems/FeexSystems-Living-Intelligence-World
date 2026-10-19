import {
  OperationsClassification,
  OperationsEnquiryPriority,
} from '../../../shared/operations';
import { operationsClassificationSchema } from '../validations/operations';

/**
 * Deterministic enquiry classifier.
 *
 * This is the safe fallback required when no model credential is configured, and
 * the validation gate for model output. It is intentionally:
 *   - pure (no I/O, no clock, no randomness) so it is unit-testable and repeatable;
 *   - conservative (confidence 0, never claims certainty);
 *   - explicit that a human must review the draft before it is used.
 */

export interface EnquiryTextInput {
  contactName: string;
  company?: string | null;
  subject: string;
  message: string;
}

interface CategoryRule {
  category: string;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'security',
    keywords: ['breach', 'vulnerability', 'hacked', 'security', 'unauthorised', 'unauthorized', 'exploit', 'leak'],
  },
  {
    category: 'billing',
    keywords: ['invoice', 'billing', 'payment', 'refund', 'charge', 'charged', 'paystack', 'subscription', 'receipt'],
  },
  {
    category: 'technical_support',
    keywords: ['error', 'bug', 'broken', 'not working', 'crash', 'fails', 'failure', 'timeout', 'unable', 'cannot', '500'],
  },
  {
    category: 'sales',
    keywords: ['pricing', 'price', 'quote', 'demo', 'plan', 'purchase', 'subscribe', 'trial', 'cost'],
  },
  {
    category: 'partnership',
    keywords: ['partner', 'partnership', 'collaborate', 'reseller', 'integration', 'integrate'],
  },
];

const URGENT_KEYWORDS = ['urgent', 'asap', 'immediately', 'critical', 'outage', 'down', 'breach', 'production'];

const DEFAULT_CATEGORY = 'general_enquiry';

function scoreRules(text: string): { category: string; hits: number } {
  let best = { category: DEFAULT_CATEGORY, hits: 0 };

  for (const rule of CATEGORY_RULES) {
    const hits = rule.keywords.reduce(
      (count, keyword) => (text.includes(keyword) ? count + 1 : count),
      0
    );
    if (hits > best.hits) {
      best = { category: rule.category, hits };
    }
  }

  return best;
}

function derivePriority(text: string, category: string): OperationsEnquiryPriority {
  if (URGENT_KEYWORDS.some((keyword) => text.includes(keyword))) return 'URGENT';
  if (category === 'security' || category === 'technical_support') return 'HIGH';
  if (category === 'billing') return 'HIGH';
  return 'NORMAL';
}

function firstSentence(text: string, maxLength = 240): string {
  const normalised = text.replace(/\s+/g, ' ').trim();
  if (normalised.length <= maxLength) return normalised;

  const boundary = normalised.search(/[.!?]/);
  if (boundary > 20 && boundary < maxLength) {
    return normalised.slice(0, boundary + 1);
  }
  return `${normalised.slice(0, maxLength - 1).trimEnd()}…`;
}

const CATEGORY_NEXT_STEP: Record<string, string> = {
  security:
    'Our security team will review this report and confirm next steps. Please do not send additional sensitive details until you hear back.',
  billing:
    'Our billing team will verify the account and respond with the relevant invoice or adjustment details.',
  technical_support:
    'Our support team will reproduce the issue and respond with a diagnosis. Adding the exact error text and timestamps will speed this up.',
  sales:
    'Our team will follow up with the relevant commercial details and a short discovery call if useful.',
  partnership:
    'Our partnerships lead will review the proposal and respond with fit and next steps.',
  general_enquiry:
    'Our team will review your message and respond with the appropriate next step.',
};

/**
 * Produce a conservative, deterministic classification + draft.
 * Always returns a value; never claims external success.
 */
export function classifyDeterministically(input: EnquiryTextInput): OperationsClassification {
  const text = `${input.subject} ${input.message}`.toLowerCase();
  const { category } = scoreRules(text);
  const priority = derivePriority(text, category);
  const recipient = input.contactName?.trim() || 'there';
  const nextStep = CATEGORY_NEXT_STEP[category] ?? CATEGORY_NEXT_STEP.general_enquiry;

  return {
    category,
    priority,
    confidence: 0,
    summary: firstSentence(input.message),
    draftResponse: [
      `Hi ${recipient},`,
      '',
      `Thank you for contacting us about "${input.subject}".`,
      '',
      nextStep,
      '',
      'This draft was generated without a configured AI model and has not been sent. A member of the team will review it before any reply is issued.',
      '',
      'Kind regards,',
      'FeexSystems Operations',
    ].join('\n'),
  };
}

/**
 * Validate raw model output. Returns null when the payload does not satisfy the
 * contract, so callers fall back to `classifyDeterministically`.
 */
export function parseModelClassification(raw: unknown): OperationsClassification | null {
  if (!raw || typeof raw !== 'object') return null;

  const parsed = operationsClassificationSchema.safeParse(raw);
  if (!parsed.success) return null;

  return {
    category: parsed.data.category,
    priority: parsed.data.priority,
    confidence: parsed.data.confidence,
    summary: parsed.data.summary,
    draftResponse: parsed.data.draftResponse,
  };
}

/** Prompt used for the provider-neutral AI gateway. */
export const OPERATIONS_CLASSIFIER_SYSTEM_PROMPT = [
  'You are an operations triage assistant for a B2B SaaS company.',
  'Classify the inbound enquiry and draft a reply for a human to review.',
  'Return ONLY a JSON object with exactly these fields:',
  '{ "category": string, "priority": "LOW"|"NORMAL"|"HIGH"|"URGENT", "confidence": number 0..1,',
  '  "summary": string (max 600 chars), "draftResponse": string (max 4000 chars) }',
  'Categories to prefer: security, billing, technical_support, sales, partnership, general_enquiry.',
  'Never promise refunds, bookings, or actions that require a human. Never invent facts.',
].join('\n');

export function buildClassifierUserPrompt(input: EnquiryTextInput): string {
  return [
    `Contact name: ${input.contactName}`,
    `Company: ${input.company || 'unknown'}`,
    `Subject: ${input.subject}`,
    'Message:',
    input.message,
  ].join('\n');
}
