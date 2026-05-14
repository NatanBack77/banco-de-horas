import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BrandWave } from '@/components/Wave';
import { findUserByEmail, updateUser } from '@/database/repositories/userRepo';
import { hashPassword } from '@/services/auth';
import { isEmail, isStrongPassword } from '@/services/validation';

type Step = 'email' | 'newpass' | 'done';

export function ForgotPasswordScreen() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const checkEmail = async () => {
    setErr(null);
    if (!isEmail(email)) { setErr('Informe um e-mail válido'); return; }
    setBusy(true);
    try {
      const user = await findUserByEmail(email.trim().toLowerCase());
      if (!user) { setErr('Nenhuma conta encontrada com este e-mail'); return; }
      setUserId(user.id);
      setStep('newpass');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setErr(null);
    if (!isStrongPassword(newPass)) { setErr('Senha mínima de 6 caracteres'); return; }
    if (newPass !== confirm) { setErr('Senhas não conferem'); return; }
    if (!userId) return;
    setBusy(true);
    try {
      await updateUser(userId, { password_hash: hashPassword(newPass) });
      setStep('done');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg app-shell flex flex-col relative overflow-hidden">
      <div className="flex-1 flex flex-col justify-center px-6 pt-12 pb-32">
        <div className="flex flex-col items-center mb-8">
          <Logo size={140} showText />
        </div>

        <div className="w-full max-w-sm mx-auto">

          {/* Passo 1 — e-mail */}
          {step === 'email' && (
            <div className="flex flex-col gap-4">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-3">
                  <Mail size={26} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-text">Recuperar senha</h2>
                <p className="text-sm text-text-muted mt-1">
                  Informe o e-mail da sua conta para redefinir a senha.
                </p>
              </div>

              <Input
                type="email"
                autoComplete="email"
                placeholder="Seu e-mail cadastrado"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(null); }}
              />

              {err && <p className="text-sm text-accent text-center">{err}</p>}

              <Button full loading={busy} onClick={checkEmail}>Verificar e-mail</Button>

              <button
                type="button"
                onClick={() => nav('/login')}
                className="text-center text-xs text-primary font-semibold hover:underline"
              >
                Voltar para o login
              </button>

              <div className="mt-2 px-4 py-3 bg-yellow/20 border border-yellow/40 rounded-2xl">
                <p className="text-xs text-brown text-center">
                  Por ser um app pessoal, o e-mail é usado como verificação de identidade. Não é enviado nenhum e-mail.
                </p>
              </div>
            </div>
          )}

          {/* Passo 2 — nova senha */}
          {step === 'newpass' && (
            <div className="flex flex-col gap-4">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-3">
                  <Lock size={26} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-text">Nova senha</h2>
                <p className="text-sm text-text-muted mt-1">
                  Conta encontrada para <strong className="text-text">{email}</strong>. Escolha uma nova senha.
                </p>
              </div>

              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); setErr(null); }}
                  iconRight={
                    <button type="button" onClick={() => setShowNew(v => !v)}>
                      {showNew
                        ? <EyeOff size={16} className="text-text-muted" />
                        : <Eye size={16} className="text-text-muted" />}
                    </button>
                  }
                />
              </div>

              <Input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErr(null); }}
              />

              {/* Indicador de força */}
              {newPass.length > 0 && (
                <div className="flex gap-1.5 items-center">
                  {[6, 8, 12].map(len => (
                    <div
                      key={len}
                      className={`flex-1 h-1 rounded-full transition-colors ${newPass.length >= len ? 'bg-primary' : 'bg-border'}`}
                    />
                  ))}
                  <span className="text-xs text-text-muted ml-1">
                    {newPass.length < 6 ? 'Fraca' : newPass.length < 8 ? 'Ok' : newPass.length < 12 ? 'Boa' : 'Forte'}
                  </span>
                </div>
              )}

              {err && <p className="text-sm text-accent text-center">{err}</p>}

              <Button full loading={busy} onClick={savePassword}>Redefinir senha</Button>

              <button
                type="button"
                onClick={() => { setStep('email'); setErr(null); setNewPass(''); setConfirm(''); }}
                className="text-center text-xs text-primary font-semibold hover:underline"
              >
                Usar outro e-mail
              </button>
            </div>
          )}

          {/* Passo 3 — concluído */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 grid place-items-center">
                <CheckCircle size={40} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">Senha redefinida!</h2>
                <p className="text-sm text-text-muted mt-1">
                  Sua senha foi alterada com sucesso. Faça login com a nova senha.
                </p>
              </div>
              <Button full onClick={() => nav('/login')}>Ir para o login</Button>
            </div>
          )}

        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 pointer-events-none">
        <BrandWave />
      </div>
    </div>
  );
}
