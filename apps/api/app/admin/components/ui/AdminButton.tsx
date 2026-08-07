import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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
  ...props
}: AdminButtonProps) {
  const baseClass = 'admin-button';
  const variantClass = variant !== 'primary' ? `admin-button-${variant}` : 'admin-button-primary';
  const blockClass = fullWidth ? 'admin-button-block' : '';

  const combinedClass = [baseClass, variantClass, blockClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={combinedClass} disabled={disabled || loading} {...props}>
      {loading ? loadingText || 'Loading...' : children}
    </button>
  );
}
