import { type ReactNode } from 'react';

interface Slice {
  value: number;
  color: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  thickness?: number;
  children?: ReactNode;
  trackColor?: string;
}

export function DonutChart({ slices, size = 180, thickness = 18, children, trackColor = '#EFE7D2' }: Props) {
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;

  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={trackColor} strokeWidth={thickness}
        />
        {slices.map((s, i) => {
          const len = (Math.max(0, s.value) / total) * c;
          const dash = `${len} ${c - len}`;
          const dashOffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 600ms ease, stroke-dashoffset 600ms ease' }}
            />
          );
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      )}
    </div>
  );
}
