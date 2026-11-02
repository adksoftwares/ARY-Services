import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/Button';
import { ArrowRight } from 'lucide-react';

describe('Button primitive', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeDefined();
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('handles click events when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading spinner and disables button when loading=true', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Processing</Button>);
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.className).toContain('ds-btn-loading');
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies variant and size classes properly', () => {
    const { container } = render(<Button variant="danger" size="lg" fullWidth>Delete</Button>);
    const btn = container.querySelector('button');
    expect(btn.className).toContain('ds-btn-danger');
    expect(btn.className).toContain('ds-btn-lg');
    expect(btn.className).toContain('ds-btn-full');
  });

  it('renders icon and right icon', () => {
    render(<Button iconRight={ArrowRight}>Proceed</Button>);
    expect(screen.getByText('Proceed')).toBeDefined();
    expect(screen.getByRole('button').querySelector('svg')).toBeDefined();
  });
});
