// Confirmation dialog for destructive-irreversible admin decisions, shown over a blurred backdrop.
'use client';

// Escape-key handling plus the shared button component for cancel/confirm.
import { useEffect, type ReactNode } from 'react';
import { AdminButton, type ButtonVariant } from './AdminButton';

// Props for the modal: visibility, copy, button variants, and confirm/cancel callbacks.
export type AdminConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function AdminConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: AdminConfirmModalProps) {
  // Closes on Escape when open and not currently submitting, keeping the modal keyboard-accessible.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  // Backdrop click also cancels unless the confirm action is in flight; returns null when closed.
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'grid',
        placeItems: 'center',
        backgroundColor: 'rgba(23, 34, 28, 0.45)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      {/* Dialog surface with the description and the cancel/confirm action row */}
      <div
        className="admin-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          background: 'var(--surface)',
          padding: '24px',
          borderRadius: 'var(--radius)',
        }}
      >
        <h2
          id="confirm-modal-title"
          className="admin-section-heading"
          style={{ marginBottom: '8px' }}
        >
          {title}
        </h2>
        <div
          id="confirm-modal-description"
          className="admin-section-copy"
          style={{ marginBottom: '24px', fontSize: '13px', color: 'var(--mineral-600)' }}
        >
          {description}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <AdminButton
            variant="secondary"
            type="button"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={confirmVariant}
            type="button"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
