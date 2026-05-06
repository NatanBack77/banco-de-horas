import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, BadgeCheck } from 'lucide-react';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/contexts/AuthContext';
import { validateRegister } from '@/services/validation';
import { contractLabel } from '@/services/contract';
import { ContractType } from '@/types';

const TYPES: ContractType[] = ['FULL_TIME', 'PART_TIME', 'APPRENTICE'];

export function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [type, setType] = useState<ContractType>('FULL_TIME');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalErr(null);
    const errs = validateRegister({ name, email, password, confirm });
    if (errs.length) {
      setErrors(Object.fromEntries(errs.map((x) => [x.field, x.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    const r = await register({ name, email, password, contract_type: type });
    setLoading(false);
    if (!r.ok) setGlobalErr(r.error ?? 'Falha');
  }

  return (
    <div className="min-h-screen bg-bg app-shell">
      <Header title="Criar conta" subtitle="Configure seu perfil de trabalho" back />
      <div className="px-5 pb-12">
        <Card>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Input label="Nome" icon={<User size={18} />} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <Input label="E-mail" type="email" icon={<Mail size={18} />} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
            <Input label="Senha" type="password" icon={<Lock size={18} />} value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="Mínimo 6 caracteres" />
            <Input label="Confirmar senha" type="password" icon={<Lock size={18} />} value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />

            <div>
              <span className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">Tipo de contrato</span>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`
                      h-12 rounded-xl text-xs font-semibold border-2 transition flex items-center justify-center gap-1
                      ${type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-muted'}
                    `}
                  >
                    {type === t && <BadgeCheck size={14} />}
                    {contractLabel(t)}
                  </button>
                ))}
              </div>
            </div>

            {globalErr && <p className="text-sm text-accent text-center">{globalErr}</p>}
            <Button type="submit" loading={loading} full>Criar conta</Button>
            <Link to="/login" className="text-center text-sm text-primary font-semibold mt-2 hover:underline">
              Já tenho conta
            </Link>
          </form>
        </Card>
      </div>
    </div>
  );
}
