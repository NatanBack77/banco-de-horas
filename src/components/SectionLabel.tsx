import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function SectionLabel({ children, right, className = '' }: Props) {
  return (
    <div className={`flex items-baseline justify-between px-1 mb-2 ${className}`}>
      <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{children}</span>
      {right}
    </div>
  );
}
