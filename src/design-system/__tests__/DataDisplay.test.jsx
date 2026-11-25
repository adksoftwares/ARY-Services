import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Pagination, Tooltip } from '../components/DataDisplay';

describe('Data display primitives', () => {
  it('renders accessible table headers and an announced empty state', () => {
    render(<DataTable columns={[{ key: 'name', header: 'Provider' }]} data={[]} emptyMessage="No providers yet" ariaLabel="Provider list" />);
    expect(screen.getByRole('region', { name: 'Provider list' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Provider' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('No providers yet');
  });

  it('clamps invalid pagination values and disables unavailable navigation', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={8} totalPages={3} totalItems={25} pageSize={10} onPageChange={onPageChange} />);
    expect(screen.getByText('3 / 3')).toBeTruthy();
    const next = screen.getByRole('button', { name: 'Next Page' });
    expect(next.disabled).toBe(true);
    fireEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('exposes tooltip text to assistive technology', () => {
    render(<Tooltip content="Verified provider details"><button type="button">Provider info</button></Tooltip>);
    const tooltip = screen.getByRole('tooltip');
    const trigger = screen.getByRole('button', { name: 'Provider info' });
    expect(tooltip.textContent).toContain('Verified provider details');
    expect(trigger.getAttribute('aria-describedby')).toContain(tooltip.id);
  });
});
