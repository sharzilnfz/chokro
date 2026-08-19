// Accessible labeled select with hint/error messages and a described-by chain wired to the field id.
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cx } from '../../lib/formatters';

// Single dropdown option; strings render as their own label.
export type Option = {
  value: string;
  label: ReactNode;
};

// Wraps native select semantics with an id-driven hint/error mechanism.
export type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: readonly Option[] | readonly string[];
};

export function AdminSelect({
  label,
  hint,
  error,
  options,
  id,
  className = '',
  'aria-describedby': explicitDescribedBy,
  ...props
}: AdminSelectProps) {
  // Derives accessible ids for hint/error text and combines them with any caller provided value.
  const hintId = hint && id ? `${id}-hint` : undefined;
  const errorId = error && id ? `${id}-error` : undefined;

  const describedBy = cx(hintId, errorId, explicitDescribedBy) || undefined;

  // Field group: label, select (error-styled and aria-invalid when needed), hint, and error blocks.
  return (
    <div className="admin-field">
      {label && (
        <label className="admin-label" htmlFor={id}>
          {label}
        </label>
      )}
      <select
        className={cx('admin-select', error && 'admin-select-error', className)}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {options.map((opt) => {
          if (typeof opt === 'string') {
            return (
              <option key={opt} value={opt}>
                {opt}
              </option>
            );
          }
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
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
