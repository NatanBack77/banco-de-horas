interface Props {
  color?: string;
  height?: number;
  className?: string;
}

export function Wave({ color = '#008943', height = 90, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 400 90"
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height, display: 'block' }}
    >
      <path
        d="M0,40 C80,80 200,0 400,50 L400,90 L0,90 Z"
        fill={color}
        opacity="0.95"
      />
    </svg>
  );
}

export function BrandWave({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full ${className}`} aria-hidden>
      <svg viewBox="0 0 400 140" preserveAspectRatio="none" className="w-full block" style={{ height: 140 }}>
        <path d="M0,80 C90,30 220,120 400,60 L400,140 L0,140 Z" fill="#F9C23C" opacity="0.85" />
        <path d="M0,100 C90,60 240,130 400,80 L400,140 L0,140 Z" fill="#F15A29" opacity="0.9" />
        <path d="M0,115 C100,90 250,140 400,100 L400,140 L0,140 Z" fill="#008943" />
      </svg>
    </div>
  );
}
