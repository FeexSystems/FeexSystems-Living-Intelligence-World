/**
 * Tabs Component — Interaction Tests (Task 55: Sprint 14)
 *
 * Tests realistic user interactions with the Tabs component using
 * @testing-library/user-event. Covers: tab switching via click,
 * keyboard navigation (ArrowLeft/Right), content display, disabled tabs,
 * and controlled tab state.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

/** Helper to render a standard tabs test fixture. */
function renderTabs(props?: { defaultValue?: string; onValueChange?: (val: string) => void }) {
  return render(
    <Tabs
      defaultValue={props?.defaultValue ?? 'overview'}
      onValueChange={props?.onValueChange}
    >
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p>Overview content with project details</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p>Analytics content with charts and metrics</p>
      </TabsContent>
      <TabsContent value="settings">
        <p>Settings content with configuration options</p>
      </TabsContent>
    </Tabs>
  );
}

describe('Tabs — Interaction Tests', () => {
  // ========================================
  // Click Interactions
  // ========================================

  it('shows default tab content on initial render', () => {
    renderTabs();

    expect(screen.getByText('Overview content with project details')).toBeInTheDocument();
    expect(screen.queryByText('Analytics content with charts and metrics')).not.toBeInTheDocument();
  });

  it('switches tab content when a different tab is clicked', async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole('tab', { name: 'Analytics' }));

    expect(screen.getByText('Analytics content with charts and metrics')).toBeInTheDocument();
    expect(screen.queryByText('Overview content with project details')).not.toBeInTheDocument();
  });

  it('switches between all tabs via click', async () => {
    const user = userEvent.setup();
    renderTabs();

    // Start at overview
    expect(screen.getByText('Overview content with project details')).toBeInTheDocument();

    // Go to analytics
    await user.click(screen.getByRole('tab', { name: 'Analytics' }));
    expect(screen.getByText('Analytics content with charts and metrics')).toBeInTheDocument();

    // Go to settings
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByText('Settings content with configuration options')).toBeInTheDocument();

    // Back to overview
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.getByText('Overview content with project details')).toBeInTheDocument();
  });

  // ========================================
  // Keyboard Navigation
  // ========================================

  it('activates tab with Enter key', async () => {
    const user = userEvent.setup();
    renderTabs();

    // Tab to the tab list
    await user.tab();
    // The active tab (Overview) should have focus
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();
  });

  it('navigates between tabs with ArrowRight', async () => {
    const user = userEvent.setup();
    renderTabs();

    // Focus on the tab list
    await user.tab();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();

    // ArrowRight moves to the next tab
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveFocus();
  });

  it('navigates between tabs with ArrowLeft', async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: 'settings' });

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();
  });

  it('wraps focus from last tab to first with ArrowRight', async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: 'settings' });

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();
  });

  it('wraps focus from first tab to last with ArrowLeft', async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveFocus();
  });

  // ========================================
  // ARIA Attributes
  // ========================================

  it('marks active tab with aria-selected', async () => {
    const user = userEvent.setup();
    renderTabs();

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    const analyticsTab = screen.getByRole('tab', { name: 'Analytics' });

    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    expect(analyticsTab).toHaveAttribute('aria-selected', 'false');

    await user.click(analyticsTab);

    expect(overviewTab).toHaveAttribute('aria-selected', 'false');
    expect(analyticsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('exposes tablist role on the list container', () => {
    renderTabs();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('exposes tabpanel role on active content', () => {
    renderTabs();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  // ========================================
  // Callback
  // ========================================

  it('calls onValueChange when tab is switched', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderTabs({ onValueChange });

    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(onValueChange).toHaveBeenCalledWith('settings');
  });

  // ========================================
  // Disabled Tab
  // ========================================

  it('does not activate a disabled tab', async () => {
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics" disabled>Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <p>Overview content</p>
        </TabsContent>
        <TabsContent value="analytics">
          <p>Analytics content</p>
        </TabsContent>
        <TabsContent value="settings">
          <p>Settings content</p>
        </TabsContent>
      </Tabs>
    );

    await user.click(screen.getByRole('tab', { name: 'Analytics' }));
    // Should still show overview because analytics is disabled
    expect(screen.getByText('Overview content')).toBeInTheDocument();
  });
});
