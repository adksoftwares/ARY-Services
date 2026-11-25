import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

let bodyLockCount = 0;
let previousBodyOverflow = '';
const modalStack = [];

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bodyLockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined' || bodyLockCount === 0) return;
  bodyLockCount -= 1;
  if (bodyLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = '';
  }
}

const FOCUSABLE_SELECTOR = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'object', 'embed',
  '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])'
].join(',');

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '520px',
  isBottomSheet = false,
  className = ''
}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    lockBodyScroll();
    modalStack.push(dialog);

    const focusableElements = () => dialog
      ? Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter(element => element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0)
      : [];

    const handleKeyDown = (event) => {
      if (modalStack[modalStack.length - 1] !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    if (dialog && !dialog.contains(document.activeElement)) {
      const preferred = dialog.querySelector('[autofocus], [data-autofocus]');
      (preferred || dialog).focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const stackIndex = modalStack.lastIndexOf(dialog);
      if (stackIndex !== -1) modalStack.splice(stackIndex, 1);
      unlockBodyScroll();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`ds-modal-backdrop ${isBottomSheet ? 'ds-bottom-sheet' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        tabIndex={-1}
        className={`ds-modal-dialog ${className}`}
        style={{ maxWidth: isBottomSheet ? undefined : maxWidth }}
      >
        {isBottomSheet && <div className="ds-sheet-handle" aria-hidden="true" />}
        {title && (
          <div className="ds-modal-header">
            <h2 className="ds-modal-title">{title}</h2>
            <IconButton icon={X} aria-label="Close dialog" size="sm" onClick={onClose} />
          </div>
        )}
        <div className="ds-modal-body">{children}</div>
        {footer && <div className="ds-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function BottomSheet(props) {
  return <Modal {...props} isBottomSheet={true} />;
}

export default Modal;
