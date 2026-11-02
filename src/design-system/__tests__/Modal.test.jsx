import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, BottomSheet } from '../components/Modal';

describe('Modal & BottomSheet primitives', () => {
  it('does not render when isOpen=false', () => {
    const { container } = render(
      <Modal isOpen={false} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and content when isOpen=true', () => {
    render(
      <Modal isOpen={true} title="Test Title">
        <p>Inner text</p>
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeDefined();
    expect(screen.getByText('Inner text')).toBeDefined();
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('calls onClose when close icon button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} title="Closable Modal" onClose={handleClose}>
        <p>Content</p>
      </Modal>
    );
    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} title="Escape Test" onClose={handleClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders as bottom sheet when isBottomSheet=true', () => {
    const { container } = render(
      <BottomSheet isOpen={true} title="Bottom Sheet Title">
        <p>Sheet body</p>
      </BottomSheet>
    );
    expect(container.querySelector('.ds-bottom-sheet')).toBeDefined();
    expect(container.querySelector('.ds-sheet-handle')).toBeDefined();
  });
});
