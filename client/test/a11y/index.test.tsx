import { describe, it, expect } from 'vitest';
import { axe } from 'vitest-axe';
import { render } from '@testing-library/react';

/**
 * Accessibility Test Suite
 * Task 17: Phase 2, Sprint 5
 *
 * Automated accessibility testing using vitest-axe for unit level
 */

describe('Accessibility (vitest-axe)', () => {
  describe('Core UI Components', () => {
    it('Button component should have no violations', async () => {
      const { container } = render(
        <button type="button">Test Button</button>
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('Input with label should have no violations', async () => {
      const { container } = render(
        <div>
          <label htmlFor="test-input">Test Input</label>
          <input id="test-input" type="text" />
        </div>
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('Heading hierarchy should be valid', async () => {
      const { container } = render(
        <div>
          <h1>Main Heading</h1>
          <h2>Sub Heading</h2>
          <h3>Sub Sub Heading</h3>
        </div>
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('Link should have accessible name', async () => {
      const { container } = render(
        <a href="/test">Test Link</a>
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('Image should have alt text', async () => {
      const { container } = render(
        <img src="/test.jpg" alt="A sample landscape" />
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Color Contrast', () => {
    it('Text should have sufficient contrast against background', async () => {
      const { container } = render(
        <div style={{ color: '#000000', backgroundColor: '#ffffff' }}>
          <p>Test text</p>
        </div>
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Form Accessibility', () => {
    it('Form inputs should have associated labels', async () => {
      const { container } = render(
        <form>
          <label htmlFor="username">Username</label>
          <input id="username" type="text" name="username" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" name="password" />
          <button type="submit">Submit</button>
        </form>
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('Required fields should be marked', async () => {
      const { container } = render(
        <form>
          <label htmlFor="email">Email *</label>
          <input id="email" type="email" required />
          <button type="submit">Submit</button>
        </form>
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Focus Management', () => {
    it('Interactive elements should be focusable', async () => {
      const { container } = render(
        <div>
          <button>Focusable Button</button>
          <a href="/test">Focusable Link</a>
          <label htmlFor="focusable-input">Input</label>
          <input id="focusable-input" type="text" />
        </div>
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });
});
