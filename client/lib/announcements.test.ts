import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  announce,
  announcePolite,
  announceAssertive,
  initAnnouncementRegions,
  resetAnnouncementRegions,
} from './announcements';

/**
 * Task 28: live-region announcements.
 *
 * `announcements.ts` owns the app's only live regions, so these tests pin the
 * contract the screen-reader behaviour depends on: two persistent regions, the
 * ARIA-recommended role/live pairing, atomic updates, and no announcement at all
 * for empty input.
 */
describe('announcements', () => {
  beforeEach(() => {
    resetAnnouncementRegions();
  });

  afterEach(() => {
    resetAnnouncementRegions();
  });

  describe('initAnnouncementRegions', () => {
    it('creates both a polite and an assertive region', () => {
      initAnnouncementRegions();

      const polite = document.getElementById('a11y-live-region-polite');
      const assertive = document.getElementById('a11y-live-region-assertive');

      expect(polite).toBeInTheDocument();
      expect(assertive).toBeInTheDocument();
    });

    it('marks the regions atomic and screen-reader-only', () => {
      initAnnouncementRegions();

      const polite = document.getElementById('a11y-live-region-polite')!;
      // aria-atomic makes the reader announce the whole region, not just the diff.
      expect(polite).toHaveAttribute('aria-atomic', 'true');
      // Must stay in the accessibility tree: display:none would silence it.
      expect(polite).toHaveClass('sr-only');
    });

    it('is idempotent', () => {
      initAnnouncementRegions();
      initAnnouncementRegions();

      expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
      expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
    });
  });

  describe('announce', () => {
    it('writes the message into the polite region by default', () => {
      announce('Saved successfully');

      expect(document.getElementById('a11y-live-region-polite')).toHaveTextContent(
        'Saved successfully'
      );
    });

    it('uses role="status" for polite and role="alert" for assertive', () => {
      announcePolite('polite message');
      announceAssertive('assertive message');

      const polite = document.getElementById('a11y-live-region-polite')!;
      const assertive = document.getElementById('a11y-live-region-assertive')!;

      expect(polite).toHaveAttribute('role', 'status');
      expect(polite).toHaveAttribute('aria-live', 'polite');
      expect(assertive).toHaveAttribute('role', 'alert');
      expect(assertive).toHaveAttribute('aria-live', 'assertive');
    });

    it('creates the region lazily when not pre-initialised', () => {
      announce('lazy');

      expect(document.getElementById('a11y-live-region-polite')).toHaveTextContent('lazy');
    });

    it('reuses a single region across repeated announcements', () => {
      announce('first');
      announce('second');

      const regions = document.querySelectorAll('[role="status"]');
      expect(regions).toHaveLength(1);
      expect(regions[0]).toHaveTextContent('second');
    });

    it('ignores empty and whitespace-only messages', () => {
      announce('');
      announce('   ');

      expect(document.querySelectorAll('[role="status"]')).toHaveLength(0);
      expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
    });

    it('keeps polite and assertive messages independent', () => {
      announcePolite('a polite note');
      announceAssertive('an urgent error');

      expect(document.getElementById('a11y-live-region-polite')).toHaveTextContent(
        'a polite note'
      );
      expect(document.getElementById('a11y-live-region-assertive')).toHaveTextContent(
        'an urgent error'
      );
    });
  });

  describe('resetAnnouncementRegions', () => {
    it('removes both regions', () => {
      initAnnouncementRegions();
      resetAnnouncementRegions();

      expect(document.querySelectorAll('[role="status"]')).toHaveLength(0);
      expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
    });
  });
});
