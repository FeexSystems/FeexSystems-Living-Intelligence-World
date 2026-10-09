/**
 * DataTable component test — Task 60, Sprint 15, Phase 4.
 *
 * Covers: render, sorting (aria-sort contract), filtering, row selection,
 * pagination, empty state, and accessibility (roles, accessible names,
 * keyboard reachability of sort + pagination controls).
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';

interface Person {
  name: string;
  role: string;
  score: number;
}

const data: Person[] = [
  { name: 'Ada', role: 'Engineer', score: 92 },
  { name: 'Grace', role: 'Admiral', score: 88 },
  { name: 'Linus', role: 'Maintainer', score: 75 },
];

const columns: ColumnDef<Person, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'score', header: 'Score' },
];

describe('DataTable', () => {
  // ========================================
  // Render Tests
  // ========================================

  it('renders a table with all rows and headers', () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /score/i })).toBeInTheDocument();

    // One header row + three data rows.
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Linus')).toBeInTheDocument();
  });

  it('renders the empty state when there are no rows', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here." />);
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  // ========================================
  // Sorting Tests
  // ========================================

  it('exposes aria-sort on the sortable header and toggles ascending/descending', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} />);

    const scoreHeader = screen.getByRole('columnheader', { name: /score/i });
    expect(scoreHeader).toHaveAttribute('aria-sort', 'none');

    const sortButton = within(scoreHeader).getByRole('button', { name: /sort by score/i });

    // TanStack's default first sort for numeric columns is descending.
    await user.click(sortButton);
    expect(scoreHeader).toHaveAttribute('aria-sort', 'descending');

    const rowsAfterDesc = screen.getAllByRole('row');
    expect(within(rowsAfterDesc[1]).getByText('Ada')).toBeInTheDocument();

    await user.click(sortButton);
    expect(scoreHeader).toHaveAttribute('aria-sort', 'ascending');

    const rowsAfterAsc = screen.getAllByRole('row');
    expect(within(rowsAfterAsc[1]).getByText('Linus')).toBeInTheDocument();
  });

  it('is keyboard operable for sorting', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} />);

    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    const sortButton = within(nameHeader).getByRole('button', { name: /sort by name/i });

    sortButton.focus();
    expect(sortButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  // ========================================
  // Filtering Tests
  // ========================================

  it('filters rows through the filter input', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={data}
        filterColumnId="name"
        filterPlaceholder="Search names"
      />
    );

    expect(screen.getByText('Grace')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search names'), 'Ada');

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.queryByText('Grace')).not.toBeInTheDocument();
    expect(screen.queryByText('Linus')).not.toBeInTheDocument();
  });

  it('shows the empty message when the filter matches nothing', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={data}
        filterColumnId="name"
        filterPlaceholder="Search names"
        emptyMessage="No match."
      />
    );

    await user.type(screen.getByPlaceholderText('Search names'), 'zzz');
    expect(screen.getByText('No match.')).toBeInTheDocument();
  });

  // ========================================
  // Selection Tests
  // ========================================

  it('supports row selection with accessible checkboxes', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} enableRowSelection />);

    const selectAll = screen.getByRole('checkbox', { name: /select all rows/i });
    expect(selectAll).toBeInTheDocument();

    const rowCheckbox = screen.getByRole('checkbox', { name: /select row 1/i });
    await user.click(rowCheckbox);

    expect(screen.getByText(/1 of 3 row\(s\) selected/i)).toBeInTheDocument();
  });

  it('selects every row via the header checkbox', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} enableRowSelection />);

    await user.click(screen.getByRole('checkbox', { name: /select all rows/i }));
    expect(screen.getByText(/3 of 3 row\(s\) selected/i)).toBeInTheDocument();
  });

  // ========================================
  // Pagination Tests
  // ========================================

  it('paginates rows and disables controls at the bounds', async () => {
    const user = userEvent.setup();
    const many: Person[] = Array.from({ length: 25 }, (_, i) => ({
      name: `Person ${i + 1}`,
      role: 'Engineer',
      score: i,
    }));

    render(<DataTable columns={columns} data={many} enablePagination pageSize={10} />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    const prev = screen.getByRole('button', { name: /previous page/i });
    const next = screen.getByRole('button', { name: /next page/i });

    // First page: previous is disabled.
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    await user.click(next);
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(prev).toBeEnabled();

    await user.click(next);
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    // Last page: next is disabled.
    expect(next).toBeDisabled();
  });
  // ========================================
  // Accessibility Tests
  // ========================================

  it('exposes the table role and a caption-less labelled structure', () => {
    render(<DataTable columns={columns} data={data} />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    // Every data cell is reachable via the table's accessible structure.
    expect(screen.getAllByRole('cell').length).toBeGreaterThanOrEqual(9); // 3 rows x 3 cols
  });

  it('gives the filter input an accessible name', () => {
    render(
      <DataTable columns={columns} data={data} filterColumnId="name" filterPlaceholder="Search names" />
    );
    expect(screen.getByLabelText('Search names')).toBeInTheDocument();
  });
});
