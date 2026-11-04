import { describe, it, expect } from 'vitest';
import {
  classifyDeterministically,
  parseModelClassification,
} from '../operations-classifier';

const base = {
  contactName: 'Ada Lovelace',
  company: 'Analytical Engines',
  subject: '',
  message: '',
};

describe('classifyDeterministically', () => {
  it('classifies billing keywords and marks billing as HIGH', () => {
    const result = classifyDeterministically({
      ...base,
      subject: 'Invoice question',
      message: 'We were charged twice on our last payment and need a refund.',
    });

    expect(result.category).toBe('billing');
    expect(result.priority).toBe('HIGH');
    expect(result.confidence).toBe(0);
  });

  it('classifies security keywords', () => {
    const result = classifyDeterministically({
      ...base,
      subject: 'Possible vulnerability',
      message: 'We believe there is a security vulnerability in the API.',
    });

    expect(result.category).toBe('security');
    expect(result.priority).toBe('HIGH');
  });

  it('treats urgent language as URGENT regardless of category', () => {
    const result = classifyDeterministically({
      ...base,
      subject: 'Production down',
      message: 'Our production system is down and this is urgent.',
    });

    expect(result.priority).toBe('URGENT');
  });

  it('falls back to general_enquiry when no rule matches', () => {
    const result = classifyDeterministically({
      ...base,
      subject: 'Hello',
      message: 'I would like to learn more about your company.',
    });

    expect(result.category).toBe('general_enquiry');
    expect(result.priority).toBe('NORMAL');
  });

  it('always states that the draft has not been sent', () => {
    const result = classifyDeterministically({
      ...base,
      subject: 'Pricing',
      message: 'Please share pricing for the team plan.',
    });

    expect(result.draftResponse).toContain('has not been sent');
    expect(result.draftResponse).toContain('Ada Lovelace');
  });

  it('is deterministic for identical input', () => {
    const input = {
      ...base,
      subject: 'Demo request',
      message: 'Could we book a demo of the platform next week?',
    };

    expect(classifyDeterministically(input)).toEqual(classifyDeterministically(input));
  });

  it('truncates an over-long summary', () => {
    const result = classifyDeterministically({
      ...base,
      subject: 'Long message',
      message: 'word '.repeat(200),
    });

    expect(result.summary.length).toBeLessThanOrEqual(241);
  });
});

describe('parseModelClassification', () => {
  const valid = {
    category: 'sales',
    priority: 'NORMAL',
    confidence: 0.82,
    summary: 'Interested in pricing.',
    draftResponse: 'Thanks for reaching out.',
  };

  it('accepts a valid model payload', () => {
    expect(parseModelClassification(valid)).toEqual(valid);
  });

  it('rejects a payload with an unknown priority', () => {
    expect(parseModelClassification({ ...valid, priority: 'SOON' })).toBeNull();
  });

  it('rejects a confidence outside 0..1', () => {
    expect(parseModelClassification({ ...valid, confidence: 1.4 })).toBeNull();
  });

  it('rejects non-object payloads', () => {
    expect(parseModelClassification(null)).toBeNull();
    expect(parseModelClassification('not json')).toBeNull();
  });
});
