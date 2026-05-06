import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
}

const variantCls: Record<Variant, string> = {
  primary: 'bg-primary text-cream hover:bg-primary-dark active:scale-[0.98]',
  secondary: 'bg-cream text-brown border border-border hover:bg-border',
  ghost: 'bg-transparent text-primary hover:bg-cream',
  danger: 'bg-accent text-white hover:bg-accent-light active:scale-[0.98]',
};

const sizeCls: Record<Size, string> = {
  md: 'h-11 px-4 text-sm',
  lg: 'h-14 px-6 text-base',
};

export function Button({
  children, variant = 'primary', size = 'lg', loading, icon, full, className = '', disabled, ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-2xl font-semibold
        transition disabled:opacity-50 disabled:cursor-not-allowed
        ${variantCls[variant]} ${sizeCls[size]} ${full ? 'w-full' : ''} ${className}
      `}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
}
