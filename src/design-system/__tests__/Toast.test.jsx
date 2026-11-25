import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from '../components/Toast';

function ToastControls() {
  const { addToast } = useToast();
  return <button type="button" onClick={() => addToast('Saved successfully', 'success', 1000)}>Show toast</button>;
}

describe('Toast lifecycle', () => {
  afterEach(() => vi.useRealTimers());

  it('automatically removes a toast after its duration', () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastControls /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved successfully');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText('Saved successfully')).toBeNull();
  });

  it('clears its auto-dismiss timer when manually dismissed', () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastControls /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Saved successfully')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
