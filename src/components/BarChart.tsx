interface Bar {
  label: string;
  value: number;
  color?: string;
  usageMinutes?: number;
}

interface Props {
  data: Bar[];
  height?: number;
  defaultColor?: string;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 160, defaultColor = '#008943', formatValue }: Props) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const hasUsage = data.some((d) => (d.usageMinutes ?? 0) > 0);
  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const h = (Math.abs(d.value) / max) * (height - 24);
          const negative = d.value < 0;
          const used = (d.usageMinutes ?? 0) > 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              {formatValue && <span className="text-[10px] font-semibold text-text-muted">{formatValue(d.value)}</span>}
              <div className="relative w-full flex justify-center">
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: Math.max(4, h),
                    background: d.color ?? (negative ? '#F15A29' : defaultColor),
                    opacity: d.value === 0 ? 0.25 : 1,
                  }}
                />
                {used && (
                  <span
                    title={`Banco utilizado: ${d.usageMinutes}min`}
                    className="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-brown border border-cream"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[10px] text-text-muted truncate block">{d.label}</span>
          </div>
        ))}
      </div>
      {hasUsage && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-2 h-2 rounded-full bg-brown shrink-0" />
          <span className="text-[10px] text-text-muted">Banco de horas utilizado</span>
        </div>
      )}
    </div>
  );
}
