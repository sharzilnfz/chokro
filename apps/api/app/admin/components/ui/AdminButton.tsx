// Admin button with variant/block styling and a built-in loading state that disables the control.
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Available visual treatments across the console.
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';

// Extends the native button with variant, block width, and pending/loading affordances.
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
  // Compose the className from base, variant, block, and caller classes; derive disabled state.
  const baseClass = 'admin-button';
  const variantClass = variant !== 'primary' ? `admin-button-${variant}` : 'admin-button-primary';
  const blockClass = fullWidth ? 'admin-button-block' : '';

  const combinedClass = [baseClass, variantClass, blockClass, className]
    .filter(Boolean)
    .join(' ');

  const isDisabled = disabled || loading;

  // Renders the button, swapping children for a loading label and reflecting busy state via ARIA.
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
