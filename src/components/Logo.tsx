interface Props {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 140, showText = true }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src="/logo.jpg"
        alt="São Geraldo - Cajuína"
        width={size}
        height={size}
        className="select-none drop-shadow-[0_4px_14px_rgba(91,58,23,0.18)]"
        style={{ width: size, height: size, objectFit: 'contain' }}
        draggable={false}
      />
      {showText && (
        <div className="text-center leading-tight">
          <p className="text-xl font-bold text-text">Banco de Horas</p>
          <p className="text-sm text-text-muted">Seu tempo, seu controle.</p>
        </div>
      )}
    </div>
  );
}
