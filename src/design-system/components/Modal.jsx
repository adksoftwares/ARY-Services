import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

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
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current && onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus initial dialog ONLY on initial opening, NOT on subsequent renders/re-renders
    if (!wasOpenRef.current && dialogRef.current) {
      if (!dialogRef.current.contains(document.activeElement)) {
        dialogRef.current.focus();
      }
      wasOpenRef.current = true;
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`ds-modal-backdrop ${isBottomSheet ? 'ds-bottom-sheet' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose && onClose();
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
            <IconButton
              icon={X}
              aria-label="Close dialog"
              size="sm"
              onClick={onClose}
            />
          </div>
        )}

        <div className="ds-modal-body">
          {children}
        </div>

        {footer && (
          <div className="ds-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function BottomSheet(props) {
  return <Modal {...props} isBottomSheet={true} />;
}

export default Modal;
