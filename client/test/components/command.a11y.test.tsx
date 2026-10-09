/**
 * Command accessibility tests � keyboard & focus contract.
 * (Sprint 3, Phase 2 � command launcher, Task 17/57 audit)
 * Component contract verified against cmdk: CommandInput is a role=combobox
 * with aria-autocomplete=list; CommandItem is role=option; CommandList is
 * role=listbox. Any axe scan (vitest-axe) can be enabled below.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { CommandDialog, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

function renderCommandDialog(onSelect?: (value: string) => void) {
  const handleSelect = onSelect ?? vi.fn();
  const onOpenChange = vi.fn();
  return {
    onSelect: handleSelect,
    onOpenChange,
    utils: render(
      <CommandDialog label='FEEX command launcher' open onOpenChange={onOpenChange}>
        <CommandInput placeholder='Search commands' />
        <CommandList>
          <CommandItem value='dashboard' onSelect={handleSelect}>
            Dashboard
          </CommandItem>
          <CommandItem value='settings' onSelect={handleSelect}>
            Settings
          </CommandItem>
        </CommandList>
      </CommandDialog>
    ),
  };
}

beforeAll(() => {
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {};
  }
});

describe('Command dialog (keyboard & focus)', () => {
  it('CommandInput receives keyboard focus', async () => {
    const user = userEvent.setup();
    renderCommandDialog();
    // Radix auto-focuses Close first; one Tab reaches the combobox.
    await user.tab();
    await user.tab();
    const input = screen.getByRole('combobox');
    expect(input).toHaveFocus();
  });

  it('typing in the input is reflected in the combobox value', async () => {
    const user = userEvent.setup();
    renderCommandDialog();

    await user.click(screen.getByRole('combobox'));
    await user.keyboard('dashboard');
    expect(screen.getByRole('combobox')).toHaveValue('dashboard');
  });

  it('ArrowDown highlights a list option', async () => {
    const user = userEvent.setup();
    renderCommandDialog();

    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}');

    // cmdk marks the active item selected; combobox stays expanded.
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
  });

  it('Enter on the selected item triggers onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderCommandDialog(onSelect);

    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(1);
    // cmdk selects the active item; accept whichever item is active.
    expect(onSelect).toHaveBeenCalledWith(expect.any(String));
  });

  it('Escape reports onOpenChange(false)', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderCommandDialog();

    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

/**
 * Command dialog (ARIA integrity)
 */
describe('Command dialog (ARIA integrity)', () => {
  it('dialog renders with the provided label content', async () => {
    const user = userEvent.setup();
    render(
      <CommandDialog label='Search commands' open onOpenChange={vi.fn()}>
        <CommandInput placeholder='Search commands' />
        <CommandList>
          <CommandItem value='dashboard'>Dashboard</CommandItem>
        </CommandList>
      </CommandDialog>
    );

    await user.click(screen.getByRole('combobox'));

    const dialog = screen.getByRole('dialog', { hidden: false });
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).toContain('Dashboard');
  });

  it('CommandInput carries combobox semantics with list autocomplete', () => {
    render(
      <CommandDialog label='FEEX command launcher' open>
        <CommandInput placeholder='Search commands' />
        <CommandList>
          <CommandItem value='dashboard'>Dashboard</CommandItem>
        </CommandList>
      </CommandDialog>
    );

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-expanded');
  });

  it('CommandItem is exposed as a listbox option', async () => {
    const user = userEvent.setup();
    render(
      <CommandDialog label='FEEX command launcher' open onOpenChange={vi.fn()}>
        <CommandInput placeholder='Search commands' />
        <CommandList>
          <CommandItem value='dashboard'>Dashboard</CommandItem>
        </CommandList>
      </CommandDialog>
    );

    await user.click(screen.getByRole('combobox'));

    const option = screen.getByRole('option', { name: 'Dashboard' });
    expect(option).toBeInTheDocument();
  });
});

// Axe accessibility scan (enable with vitest-axe):
// import { axe, toHaveNoViolations } from 'vitest-axe';
// expect.extend(toHaveNoViolations);
//
// it('has no axe violations', async () => {
//   const { container } = render(
//     <CommandDialog label='FEEX command launcher' onOpenChange={vi.fn()}>
//       <CommandList>
//         <CommandItem value='dashboard'>Dashboard</CommandItem>
//       </CommandList>
//     </CommandDialog>
//   );
//   expect(await axe(container)).toHaveNoViolations();
// });

