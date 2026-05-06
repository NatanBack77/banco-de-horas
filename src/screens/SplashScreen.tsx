import { Logo } from '@/components/Logo';
import { BrandWave } from '@/components/Wave';

export function SplashScreen() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center relative overflow-hidden">
      <div className="flex flex-col items-center gap-6 -mt-10 animate-pulse">
        <h1 className="text-3xl font-bold text-primary text-center tracking-tight">BANCO DE HORAS</h1>
        <p className="text-sm text-text-muted text-center -mt-3">Seu tempo, seu controle.</p>
        <Logo size={120} showText={false} />
      </div>
      <div className="absolute bottom-0 inset-x-0">
        <BrandWave />
      </div>
    </div>
  );
}
