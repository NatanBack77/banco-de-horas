import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  suffix?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, icon, iconRight, suffix, hint, className = '', ...rest }, ref
) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">{label}</span>}
      <div className={`
        flex items-center gap-2 bg-surface border-2 rounded-2xl px-4 h-13
        ${error ? 'border-accent' : 'border-border focus-within:border-primary'}
        transition
      `}>
        {icon && <span className="text-text-muted shrink-0">{icon}</span>}
        <input
          ref={ref}
          className={`flex-1 min-w-0 bg-transparent outline-none text-base text-text placeholder:text-text-soft py-3 ${className}`}
          {...rest}
        />
        {suffix && <span className="text-sm font-medium text-text-muted shrink-0">{suffix}</span>}
        {iconRight && <span className="text-text-muted shrink-0">{iconRight}</span>}
      </div>
      {error && <span className="block text-xs text-accent mt-1">{error}</span>}
      {hint && !error && <span className="block text-xs text-text-muted mt-1">{hint}</span>}
    </label>
  );
});
