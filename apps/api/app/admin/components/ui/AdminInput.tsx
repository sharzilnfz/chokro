import type { InputHTMLAttributes, ReactNode } from 'react';

export type AdminInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function AdminInput({
  label,
  hint,
  error,
  id,
  className = '',
  'aria-describedby': explicitDescribedBy,
  ...props
}: AdminInputProps) {
  const hintId = hint && id ? `${id}-hint` : undefined;
  const errorId = error && id ? `${id}-error` : undefined;

  const describedBy = [hintId, errorId, explicitDescribedBy]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="admin-field">
      {label && (
        <label className="admin-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        className={['admin-input', error ? 'admin-input-error' : '', className]
          .filter(Boolean)
          .join(' ')}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p className="admin-field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="admin-field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
