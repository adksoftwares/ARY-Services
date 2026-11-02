import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input, PasswordInput, PhoneInput, Select } from '../components/Input';

describe('Input primitives', () => {
  it('renders input with label and helper text', () => {
    render(<Input label="Full Name" helperText="Enter your official name" placeholder="John Doe" />);
    expect(screen.getByLabelText(/Full Name/)).toBeDefined();
    expect(screen.getByText('Enter your official name')).toBeDefined();
    expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
  });

  it('handles value changes properly', () => {
    const handleChange = vi.fn();
    render(<Input label="City" onChange={handleChange} />);
    const input = screen.getByLabelText('City');
    fireEvent.change(input, { target: { value: 'Colombo' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders required indicator and invalid state on error', () => {
    render(<Input label="Email" required error="Valid email is required" />);
    const input = screen.getByLabelText(/Email/);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Valid email is required')).toBeDefined();
  });

  it('PasswordInput toggles visibility on eye icon click', () => {
    render(<PasswordInput label="Password" defaultValue="secret123" />);
    const input = screen.getByLabelText('Password');
    expect(input.type).toBe('password');

    const toggleBtn = screen.getByLabelText(/Show password/i);
    fireEvent.click(toggleBtn);
    expect(input.type).toBe('text');

    const hideBtn = screen.getByLabelText(/Hide password/i);
    fireEvent.click(hideBtn);
    expect(input.type).toBe('password');
  });

  it('PhoneInput renders tel type and placeholder', () => {
    render(<PhoneInput label="Phone" />);
    const input = screen.getByLabelText('Phone');
    expect(input.type).toBe('tel');
    expect(input.placeholder).toContain('077');
  });

  it('Select renders options and handles change', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'colombo', label: 'Colombo' },
      { value: 'kandy', label: 'Kandy' }
    ];
    render(<Select label="District" options={options} onChange={handleChange} />);
    const select = screen.getByLabelText('District');
    fireEvent.change(select, { target: { value: 'kandy' } });
    expect(handleChange).toHaveBeenCalled();
  });
});
