import type { ReactNode, SelectHTMLAttributes } from 'react';

type Option = {
  value: string;
  label: ReactNode;
};

type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  options: readonly Option[] | readonly string[];
};

export function AdminSelect({
  label,
  options,
  id,
  className = '',
  ...props
}: AdminSelectProps) {
  return (
    <div className="admin-field">
      {label && (
        <label className="admin-label" htmlFor={id}>
          {label}
        </label>
      )}
      <select className={['admin-select', className].filter(Boolean).join(' ')} id={id} {...props}>
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
    </div>
  );
}
