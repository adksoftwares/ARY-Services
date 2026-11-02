import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, StatusPill } from '../components/Badge';

describe('Badge & StatusPill primitives', () => {
  it('renders badge with children and default variant', () => {
    const { container } = render(<Badge>Verified</Badge>);
    expect(screen.getByText('Verified')).toBeDefined();
    expect(container.firstChild.className).toContain('ds-badge-brand');
    expect(container.querySelector('.ds-badge-dot')).toBeDefined();
  });

  it('renders without dot when dot=false', () => {
    const { container } = render(<Badge dot={false}>No Dot</Badge>);
    expect(container.querySelector('.ds-badge-dot')).toBeNull();
  });

  it('renders correct variant classes', () => {
    const { container } = render(<Badge variant="success">Completed</Badge>);
    expect(container.firstChild.className).toContain('ds-badge-success');
  });

  it('renders StatusPill mapping correctly for active status', () => {
    const { container } = render(<StatusPill status="active" />);
    expect(screen.getByText('Active')).toBeDefined();
    expect(container.firstChild.className).toContain('ds-badge-success');
  });

  it('renders StatusPill mapping correctly for rejected status', () => {
    const { container } = render(<StatusPill status="rejected" />);
    expect(screen.getByText('Rejected')).toBeDefined();
    expect(container.firstChild.className).toContain('ds-badge-danger');
  });

  it('allows custom label override on StatusPill', () => {
    render(<StatusPill status="in_progress" label="Ongoing Service" />);
    expect(screen.getByText('Ongoing Service')).toBeDefined();
  });
});
