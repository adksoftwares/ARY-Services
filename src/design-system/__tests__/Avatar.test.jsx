import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from '../components/Avatar';

describe('Avatar fallback behavior', () => {
  it('shows initials when the remote image fails to load', () => {
    render(<Avatar src="https://example.invalid/avatar.png" name="Arikarran Sriskandarajah" />);
    const avatar = screen.getByRole('img', { name: 'Arikarran Sriskandarajah' });
    fireEvent.error(avatar.querySelector('img'));
    expect(avatar.textContent).toContain('AS');
    expect(avatar.querySelector('img')).toBeNull();
  });

  it('restores the image when the source changes after a failure', () => {
    const { rerender } = render(<Avatar src="/broken.png" name="AK" />);
    const avatar = screen.getByRole('img', { name: 'AK' });
    fireEvent.error(avatar.querySelector('img'));
    expect(avatar.textContent).toContain('AK');
    rerender(<Avatar src="/replacement.png" name="AK" />);
    expect(avatar.querySelector('img')).not.toBeNull();
  });

  it('uses a neutral initial for missing names', () => {
    render(<Avatar />);
    expect(screen.getByRole('img', { name: 'User avatar' }).textContent).toBe('?');
  });
});
