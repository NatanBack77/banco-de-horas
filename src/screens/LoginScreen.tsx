import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BrandWave } from '@/components/Wave';
import { useAuth } from '@/contexts/AuthContext';

export function LoginScreen() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (!r.ok) setError(r.error ?? 'Falha ao entrar');
  }

  return (
    <div className="min-h-screen bg-bg app-shell flex flex-col relative overflow-hidden">
      <div className="flex-1 flex flex-col justify-center px-6 pt-12 pb-32">
        <div className="flex flex-col items-center mb-8">
          <Logo size={180} showText />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3 w-full max-w-sm mx-auto">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
          />
          <div className="relative">
            <Input
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
            />
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-brown"
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => nav('/recuperar-senha')}
            className="text-right text-xs text-primary font-semibold hover:underline"
          >
            Esqueceu sua senha?
          </button>

          {error && <p className="text-sm text-accent text-center">{error}</p>}

          <Button type="submit" loading={loading} full className="mt-2">Entrar</Button>
          <Link to="/register" className="block">
            <Button type="button" variant="secondary" full>Criar conta</Button>
          </Link>
        </form>
      </div>

      <div className="absolute bottom-0 inset-x-0 pointer-events-none">
        <BrandWave />
      </div>
    </div>
  );
}
