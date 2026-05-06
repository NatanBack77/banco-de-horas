import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}

export function Header({ title, subtitle, back, right, onBack }: Props) {
  const nav = useNavigate();
  // Quando há back: título centralizado (sub-telas, estilo iOS).
  // Quando não há back: título grande à esquerda (telas raiz).
  if (back) {
    return (
      <div className="relative flex items-center px-5 pt-6 pb-4 bg-bg sticky top-0 z-10">
        <button
          onClick={onBack ?? (() => nav(-1))}
          className="w-10 h-10 grid place-items-center rounded-full bg-cream hover:bg-border transition shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} className="text-brown" />
        </button>
        <div className="flex-1 text-center px-2 min-w-0">
          <h1 className="text-lg font-bold text-text leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 shrink-0 flex items-center justify-end">{right}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-4 bg-bg sticky top-0 z-10">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-text leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-0.5 truncate">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
