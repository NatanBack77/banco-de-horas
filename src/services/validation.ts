export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isStrongPassword = (v: string) =>
  v.length >= 6;

export const isHm = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export const isYmd = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export interface ValidationError { field: string; message: string }

export function validateRegister(input: {
  name: string; email: string; password: string; confirm: string;
}): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!input.name.trim()) errs.push({ field: 'name', message: 'Informe seu nome' });
  if (!isEmail(input.email)) errs.push({ field: 'email', message: 'E-mail inválido' });
  if (!isStrongPassword(input.password)) errs.push({ field: 'password', message: 'Senha mínima de 6 caracteres' });
  if (input.password !== input.confirm) errs.push({ field: 'confirm', message: 'Senhas não conferem' });
  return errs;
}

export function validateShift(input: {
  entry_time: string; lunch_out_time: string; lunch_in_time: string; exit_time: string;
}): ValidationError[] {
  const errs: ValidationError[] = [];
  for (const [k, v] of Object.entries(input)) {
    if (!isHm(v)) errs.push({ field: k, message: 'Horário inválido (HH:mm)' });
  }
  return errs;
}
