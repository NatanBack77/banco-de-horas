import { signedHm } from '@/utils/date';

interface Props {
  minutes: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BalancePill({ minutes, label, size = 'md' }: Props) {
  const positive = minutes >= 0;
  const sizeCls = {
    sm: 'h-7 px-2.5 text-xs',
    md: 'h-9 px-3.5 text-sm',
    lg: 'h-12 px-5 text-lg',
  }[size];
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-bold ${sizeCls}
        ${positive ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}
      `}
    >
      {label && <span className="opacity-70 font-medium">{label}</span>}
      <span>{signedHm(minutes)}</span>
    </span>
  );
}
