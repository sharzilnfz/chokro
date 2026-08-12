import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';

export type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
  children: ReactNode;
};

export function AdminButton({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  loadingText,
  className = '',
  disabled,
  children,
  type = 'button',
  ...props
}: AdminButtonProps) {
  const baseClass = 'admin-button';
  const variantClass = variant !== 'primary' ? `admin-button-${variant}` : 'admin-button-primary';
  const blockClass = fullWidth ? 'admin-button-block' : '';

  const combinedClass = [baseClass, variantClass, blockClass, className]
    .filter(Boolean)
    .join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      className={combinedClass}
      disabled={isDisabled}
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      type={type}
      {...props}
    >
      {loading ? loadingText || 'Loading...' : children}
    </button>
  );
}
