import { useEffect, useState } from 'react';
import { UserCircle, Eye, EyeOff, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser, findUserByEmail } from '@/database/repositories/userRepo';
import { hashPassword, verifyPassword } from '@/services/auth';
import { isEmail, isStrongPassword } from '@/services/validation';
import { contractLabel } from '@/services/contract';
import { ContractType } from '@/types';

const CONTRACTS: ContractType[] = ['FULL_TIME', 'PART_TIME', 'APPRENTICE'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileScreen() {
  const { user, refresh, logout } = useAuth();

  // — Dados pessoais —
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dataMsg, setDataMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dataBusy, setDataBusy] = useState(false);

  // — Contrato —
  const [contract, setContract] = useState<ContractType>('FULL_TIME');
  const [appOt, setAppOt] = useState(false);
  const [contractMsg, setContractMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [contractBusy, setContractBusy] = useState(false);

  // — Senha —
  const [showPass, setShowPass] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passBusy, setPassBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setContract(user.contract_type);
    setAppOt(user.apprentice_overtime_allowed === 1);
  }, [user]);

  const saveData = async () => {
    if (!user) return;
    setDataMsg(null);
    if (!name.trim()) { setDataMsg({ ok: false, text: 'Nome não pode estar vazio' }); return; }
    if (!isEmail(email)) { setDataMsg({ ok: false, text: 'E-mail inválido' }); return; }
    const trimEmail = email.trim().toLowerCase();
    if (trimEmail !== user.email) {
      const existing = await findUserByEmail(trimEmail);
      if (existing && existing.id !== user.id) {
        setDataMsg({ ok: false, text: 'E-mail já usado por outra conta' });
        return;
      }
    }
    setDataBusy(true);
    try {
      await updateUser(user.id, { name: name.trim(), email: trimEmail });
      await refresh();
      setDataMsg({ ok: true, text: 'Dados atualizados' });
    } catch {
      setDataMsg({ ok: false, text: 'Erro ao salvar' });
    } finally {
      setDataBusy(false);
    }
  };

  const saveContract = async () => {
    if (!user) return;
    setContractMsg(null);
    setContractBusy(true);
    try {
      await updateUser(user.id, {
        contract_type: contract,
        apprentice_overtime_allowed: contract === 'APPRENTICE' ? (appOt ? 1 : 0) : 0,
      });
      await refresh();
      setContractMsg({ ok: true, text: 'Contrato atualizado' });
    } catch {
      setContractMsg({ ok: false, text: 'Erro ao salvar' });
    } finally {
      setContractBusy(false);
    }
  };

  const savePassword = async () => {
    if (!user) return;
    setPassMsg(null);
    if (!verifyPassword(currentPass, user.password_hash)) {
      setPassMsg({ ok: false, text: 'Senha atual incorreta' });
      return;
    }
    if (!isStrongPassword(newPass)) {
      setPassMsg({ ok: false, text: 'Nova senha: mínimo 6 caracteres' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ ok: false, text: 'Senhas não conferem' });
      return;
    }
    setPassBusy(true);
    try {
      await updateUser(user.id, { password_hash: hashPassword(newPass) });
      await refresh();
      setPassMsg({ ok: true, text: 'Senha alterada com sucesso' });
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setTimeout(() => setShowPass(false), 1500);
    } catch {
      setPassMsg({ ok: false, text: 'Erro ao alterar senha' });
    } finally {
      setPassBusy(false);
    }
  };

  const avatarInitials = user ? initials(user.name) : '?';

  return (
    <div className="app-shell pb-24">
      <Header title="Meu perfil" back />
      <div className="px-5 space-y-4">

        {/* Avatar */}
        <Card delay={0} className="flex flex-col items-center py-6 gap-3">
          <div className="w-20 h-20 rounded-full bg-primary grid place-items-center shadow-md">
            <span className="text-3xl font-bold text-cream tracking-tight">{avatarInitials}</span>
          </div>
          <div className="text-center">
            <p className="font-bold text-text text-lg leading-tight">{user?.name}</p>
            <p className="text-sm text-text-muted mt-0.5">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {user ? contractLabel(user.contract_type) : '—'}
            </span>
          </div>
        </Card>

        {/* Dados pessoais */}
        <Card delay={0.05}>
          <SectionLabel>Dados pessoais</SectionLabel>
          <div className="space-y-3">
            <Input
              label="Nome completo"
              value={name}
              onChange={(e) => { setName(e.target.value); setDataMsg(null); }}
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setDataMsg(null); }}
            />
          </div>
          {dataMsg && (
            <p className={`text-xs mt-2 font-medium ${dataMsg.ok ? 'text-primary' : 'text-accent'}`}>
              {dataMsg.text}
            </p>
          )}
          <Button full className="mt-4" onClick={saveData} loading={dataBusy}>
            Salvar dados
          </Button>
        </Card>

        {/* Contrato */}
        <Card delay={0.1}>
          <SectionLabel>Tipo de contrato</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {CONTRACTS.map(c => (
              <button
                key={c}
                onClick={() => { setContract(c); setContractMsg(null); }}
                className={`h-12 rounded-xl text-xs font-semibold transition px-2 ${contract === c ? 'bg-primary text-cream' : 'bg-cream text-brown border border-border'}`}
              >
                {contractLabel(c)}
              </button>
            ))}
          </div>
          {contract === 'APPRENTICE' && (
            <label className="flex items-center justify-between gap-3 mt-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-text">Permitir hora extra</p>
                <p className="text-xs text-text-muted">Jovem aprendiz com OT liberado</p>
              </div>
              <button
                role="switch"
                aria-checked={appOt}
                onClick={() => { setAppOt(v => !v); setContractMsg(null); }}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${appOt ? 'bg-primary' : 'bg-border'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-cream shadow transition-transform ${appOt ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
          )}
          {contractMsg && (
            <p className={`text-xs mt-2 font-medium ${contractMsg.ok ? 'text-primary' : 'text-accent'}`}>
              {contractMsg.text}
            </p>
          )}
          <Button full className="mt-4" onClick={saveContract} loading={contractBusy} variant="secondary">
            Salvar contrato
          </Button>
        </Card>

        {/* Segurança / senha */}
        <Card delay={0.15}>
          <button
            className="w-full flex items-center justify-between"
            onClick={() => { setShowPass(v => !v); setPassMsg(null); }}
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-brown/10 grid place-items-center">
                <UserCircle size={16} className="text-brown" />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-text">Alterar senha</p>
                <p className="text-xs text-text-muted">Manter sua conta segura</p>
              </div>
            </div>
            {showPass ? <ChevronUp size={18} className="text-brown" /> : <ChevronDown size={18} className="text-brown" />}
          </button>

          {showPass && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="relative">
                <Input
                  label="Senha atual"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPass}
                  onChange={(e) => { setCurrentPass(e.target.value); setPassMsg(null); }}
                  iconRight={
                    <button type="button" onClick={() => setShowCurrent(v => !v)}>
                      {showCurrent ? <EyeOff size={16} className="text-text-muted" /> : <Eye size={16} className="text-text-muted" />}
                    </button>
                  }
                />
              </div>
              <Input
                label="Nova senha"
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => { setNewPass(e.target.value); setPassMsg(null); }}
                iconRight={
                  <button type="button" onClick={() => setShowNew(v => !v)}>
                    {showNew ? <EyeOff size={16} className="text-text-muted" /> : <Eye size={16} className="text-text-muted" />}
                  </button>
                }
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                value={confirmPass}
                onChange={(e) => { setConfirmPass(e.target.value); setPassMsg(null); }}
              />
              {passMsg && (
                <p className={`text-xs font-medium ${passMsg.ok ? 'text-primary' : 'text-accent'}`}>
                  {passMsg.text}
                </p>
              )}
              <Button full onClick={savePassword} loading={passBusy}>
                Alterar senha
              </Button>
            </div>
          )}
        </Card>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-accent/30 bg-accent/5 text-accent font-semibold text-sm hover:bg-accent/10 transition"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </div>
  );
}
