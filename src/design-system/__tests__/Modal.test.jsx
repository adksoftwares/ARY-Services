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

  it('traps keyboard focus inside the dialog', () => {
    const getRects = vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 1, height: 1 }]);
    render(
      <Modal isOpen title="Focus trap">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    const first = screen.getByRole('button', { name: 'Close dialog' });
    const last = screen.getByRole('button', { name: 'Last action' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    getRects.mockRestore();
  });

  it('restores page scroll when the dialog unmounts', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(<Modal isOpen title="Scroll lock"><p>Body</p></Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });

});
