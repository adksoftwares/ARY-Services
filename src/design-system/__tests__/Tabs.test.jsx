import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, SegmentedControl } from '../components/Tabs';

describe('Tabs accessibility and keyboard navigation', () => {
  it('uses roving tab focus and moves selection with arrow keys', () => {
    const onChange = vi.fn();
    render(
      <Tabs
        tabs={[{ id: 'overview', label: 'Overview' }, { id: 'jobs', label: 'Jobs' }, { id: 'wallet', label: 'Wallet' }]}
        activeTab="overview"
        onChange={onChange}
      />
    );
    const overview = screen.getByRole('tab', { name: 'Overview' });
    const jobs = screen.getByRole('tab', { name: 'Jobs' });
    const wallet = screen.getByRole('tab', { name: 'Wallet' });
    expect(overview.tabIndex).toBe(0);
    expect(jobs.tabIndex).toBe(-1);

    overview.focus();
    fireEvent.keyDown(overview, { key: 'ArrowRight' });
    expect(jobs).toHaveFocus();
    expect(onChange).toHaveBeenCalledWith('jobs');

    fireEvent.keyDown(jobs, { key: 'End' });
    expect(wallet).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('wallet');
  });

  it('supports arrow-key selection for segmented controls', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }]}
        value="all"
        onChange={onChange}
      />
    );
    const all = screen.getByRole('radio', { name: 'All' });
    const pending = screen.getByRole('radio', { name: 'Pending' });
    all.focus();
    fireEvent.keyDown(all, { key: 'ArrowRight' });
    expect(pending).toHaveFocus();
    expect(onChange).toHaveBeenCalledWith('pending');
  });
});
