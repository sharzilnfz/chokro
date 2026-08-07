import type { InputHTMLAttributes, ReactNode } from 'react';

type AdminInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
};

export function AdminInput({ label, hint, id, className = '', ...props }: AdminInputProps) {
  return (
    <div className="admin-field">
      {label && (
        <label className="admin-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input className={['admin-input', className].filter(Boolean).join(' ')} id={id} {...props} />
      {hint && <p className="admin-field-hint">{hint}</p>}
    </div>
  );
}
