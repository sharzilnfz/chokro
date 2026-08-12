import type { ReactNode, SelectHTMLAttributes } from 'react';

export type Option = {
  value: string;
  label: ReactNode;
};

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
      <select
        className={['admin-select', error ? 'admin-select-error' : '', className]
          .filter(Boolean)
          .join(' ')}
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
