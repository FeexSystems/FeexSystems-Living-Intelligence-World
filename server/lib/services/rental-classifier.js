 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import {

  maintenanceClassificationSchema,
} from '../validations/rental-classification';












const CATEGORY_RULES = [
  { category: 'PLUMBING', keywords: ['leak', 'pipe', 'toilet', 'sink', 'drain', 'faucet', 'plumbing', 'water', 'burst', 'clog'] },
  { category: 'ELECTRICAL', keywords: ['power', 'electric', 'light', 'outlet', 'switch', 'circuit', 'wiring', 'electrical', 'socket', 'blackout'] },
  { category: 'HVAC', keywords: ['heating', 'cooling', 'ac ', 'air condition', 'furnace', 'vent', 'thermostat', 'hvac', 'temperature', 'boiler'] },
  { category: 'STRUCTURAL', keywords: ['wall', 'ceiling', 'floor', 'roof', 'window', 'door', 'crack', 'structural', 'foundation', 'beam'] },
  { category: 'PEST_CONTROL', keywords: ['pest', 'rodent', 'mouse', 'rat', 'insect', 'cockroach', 'ant', 'bed bug', 'termite', 'infestation'] },
  { category: 'OTHER', keywords: [] },
];

const URGENT_KEYWORDS = [
  'urgent', 'emergency', 'asap', 'immediately', 'critical', 'flooding',
  'burst', 'fire', 'gas', 'smell', 'dangerous', 'unsafe', 'broken',
];

const DEFAULT_CATEGORY = 'OTHER';

function scoreRules(text) {
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

function derivePriority(text, category) {
  if (URGENT_KEYWORDS.some((keyword) => text.includes(keyword))) return 'URGENT';
  if (category === 'PLUMBING' || category === 'ELECTRICAL') return 'HIGH';
  if (category === 'HVAC') return 'MEDIUM';
  if (category === 'STRUCTURAL') return 'MEDIUM';
  if (category === 'PEST_CONTROL') return 'MEDIUM';
  return 'LOW';
}

function firstSentence(text, maxLength = 240) {
  const normalised = text.replace(/\s+/g, ' ').trim();
  if (normalised.length <= maxLength) return normalised;

  const boundary = normalised.search(/[.!?]/);
  if (boundary > 20 && boundary < maxLength) {
    return normalised.slice(0, boundary + 1);
  }
  return `${normalised.slice(0, maxLength - 1).trimEnd()}…`;
}

const CATEGORY_RECOMMENDATION = {
  PLUMBING:
    'A licensed plumber should inspect and repair the issue. Turn off the water supply at the isolation valve if water is actively leaking.',
  ELECTRICAL:
    'A qualified electrician should inspect the issue. Do not attempt to repair electrical faults yourself; turn off the affected circuit at the consumer unit.',
  HVAC:
    'An HVAC technician should service the system. Check filters and thermostat settings in the meantime.',
  STRUCTURAL:
    'A building professional should assess the issue. Do not load or stress the affected area until it has been inspected.',
  PEST_CONTROL:
    'A pest control professional should treat the property. Remove food sources and seal entry points where possible.',
  OTHER:
    'A maintenance technician should inspect and advise on the appropriate remediation.',
};

const CATEGORY_NEXT_STEP = {
  PLUMBING: 'Plumbing team will attend and assess the repair.',
  ELECTRICAL: 'Electrical team will inspect and make safe.',
  HVAC: 'HVAC team will service and diagnose.',
  STRUCTURAL: 'Building team will assess structural integrity.',
  PEST_CONTROL: 'Pest control team will survey and treat.',
  OTHER: 'Maintenance team will review and assign.',
};

export function classifyMaintenanceDeterministically(
  input
) {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const { category } = scoreRules(text);
  const priority = derivePriority(text, category);
  const recipientAction = _nullishCoalesce(CATEGORY_RECOMMENDATION[category], () => ( CATEGORY_RECOMMENDATION.OTHER));
  const nextStep = _nullishCoalesce(CATEGORY_NEXT_STEP[category], () => ( CATEGORY_NEXT_STEP.OTHER));

  return {
    category,
    recommendedPriority: priority,
    confidence: 0,
    summary: firstSentence(input.description),
    recommendedAction: [
      `Maintenance request: "${input.title}".`,
      '',
      '',
      nextStep,
      '',
      recipientAction,
      '',
      'This recommendation was generated without a configured AI model and has not been acted upon. A member of the team will review before any work is ordered.',
      '',
      'Kind regards,',
      'FeexSystems RentAll',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function parseMaintenanceClassification(
  raw
) {
  if (!raw || typeof raw !== 'object') return null;

  const parsed = maintenanceClassificationSchema.safeParse(raw);
  if (!parsed.success) return null;

  return {
    category: parsed.data.category,
    recommendedPriority: parsed.data.recommendedPriority,
    confidence: parsed.data.confidence,
    summary: parsed.data.summary,
    recommendedAction: parsed.data.recommendedAction,
  };
}

export const MAINTENANCE_CLASSIFIER_SYSTEM_PROMPT = [
  'You are a property maintenance triage assistant for a B2B SaaS platform.',
  'Classify the inbound maintenance request and recommend an action for a human to review.',
  'Return ONLY a JSON object with exactly these fields:',
  '{ "category": string, "recommendedPriority": "LOW"|"MEDIUM"|"HIGH"|"URGENT", "confidence": number 0..1,',
  '  "summary": string (max 600 chars), "recommendedAction": string (max 4000 chars) }',
  'Categories to prefer: PLUMBING, ELECTRICAL, HVAC, STRUCTURAL, PEST_CONTROL, OTHER.',
  'Never promise repairs, bookings, or vendor dispatch that require a human. Never invent facts.',
  'Only recommend licensed professionals for electrical, gas, or structural work.',
].join('\n');

export function buildMaintenanceClassifierUserPrompt(
  input
) {
  return [
    `Title: ${input.title}`,
    `Category (user-provided): ${input.category}`,
    'Description:',
    input.description,
  ].join('\n');
}