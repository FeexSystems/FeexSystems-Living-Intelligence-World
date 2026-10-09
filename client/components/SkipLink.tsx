import React from 'react';

/**
 * Skip Navigation Link Component
 * Task 24: Phase 2, Sprint 6
 *
 * Allows keyboard users to skip navigation and jump directly to main content.
 * Appears on focus only using the existing .sr-only class pattern.
 */

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only"
      style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 50,
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--primary)',
        color: 'var(--primary-foreground)',
        borderRadius: '0.25rem',
        outline: '2px solid var(--primary)',
        outlineOffset: '2px',
      }}
      onFocus={(e) => {
        (e.target as HTMLElement).classList.remove('sr-only');
      }}
      onBlur={(e) => {
        (e.target as HTMLElement).classList.add('sr-only');
      }}
    >
      {children}
    </a>
  );
}
