import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser } from '@/database/repositories/userRepo';
import { contractLabel } from '@/services/contract';
import { ContractType } from '@/types';

const CONTRACTS: ContractType[] = ['FULL_TIME', 'PART_TIME', 'APPRENTICE'];

export function ProfileScreen() {
  const { user, refresh, logout } = useAuth();
  const [name, setName] = useState('');
  const [contract, setContract] = useState<ContractType>('FULL_TIME');
  const [appOt, setAppOt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setContract(user.contract_type);
    setAppOt(user.apprentice_overtime_allowed === 1);
  }, [user]);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateUser(user.id, {
        name: name.trim(),
        contract_type: contract,
        apprentice_overtime_allowed: contract === 'APPRENTICE' ? (appOt ? 1 : 0) : 0,
      });
      await refresh();
      setMsg('Perfil atualizado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell pb-24">
      <Header title="Perfil" back />
      <div className="px-5 space-y-3">
        <Card delay={0}>
          <SectionLabel>Conta</SectionLabel>
          <div className="space-y-3">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <span className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">E-mail</span>
              <p className="text-text font-medium">{user?.email ?? '—'}</p>
            </div>
          </div>
        </Card>

        <Card delay={0.05}>
          <SectionLabel>Contrato</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {CONTRACTS.map(c => (
              <button
                key={c}
                onClick={() => setContract(c)}
                className={`h-12 rounded-xl text-xs font-semibold transition px-2 ${contract === c ? 'bg-primary text-cream' : 'bg-cream text-brown'}`}
              >
                {contractLabel(c)}
              </button>
            ))}
          </div>
          {contract === 'APPRENTICE' && (
            <label className="flex items-center justify-between gap-3 mt-4 cursor-pointer">
              <span className="text-sm text-text">Permitir hora extra</span>
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={appOt} onChange={(e) => setAppOt(e.target.checked)} />
            </label>
          )}
        </Card>

        {msg && (
          <Card delay={0.1} noAnimate className="bg-primary/10 border-primary/30">
            <p className="text-sm text-primary font-medium">{msg}</p>
          </Card>
        )}

        <Button full onClick={onSave} loading={saving}>Salvar</Button>
        <Button full variant="secondary" onClick={logout}>Sair</Button>
      </div>
    </div>
  );
}
