import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  footer?: ReactNode;
  wide?: boolean;
}

/** דיאלוג מודאלי כללי. Escape סוגר (אם onClose סופק). */
export function Modal({ title, children, onClose, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          {onClose && (
            <button className="btn btn--icon" onClick={onClose} aria-label="סגירה" title="סגירה">✕</button>
          )}
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** דיאלוג אישור סטנדרטי לפעולות הרסניות (משחק חדש, מחיקה...). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
          <button className="btn" onClick={onCancel}>{cancelLabel}</button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
