import { format, parse, differenceInMinutes, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const today = () => format(new Date(), 'yyyy-MM-dd');
export const nowHm = () => format(new Date(), 'HH:mm');
export const ym = (d: Date | string = new Date()) =>
  typeof d === 'string' ? d.slice(0, 7) : format(d, 'yyyy-MM');

export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHm(mins: number): string {
  const sign = mins < 0 ? '-' : '';
  const a = Math.abs(mins);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `${sign}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export function signedHm(mins: number): string {
  const sign = mins > 0 ? '+' : mins < 0 ? '-' : '';
  const a = Math.abs(mins);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `${sign}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export function diffMinutes(start: string, end: string): number {
  const a = hmToMinutes(start);
  const b = hmToMinutes(end);
  return Math.max(0, b - a);
}

export function formatPtDate(d: string): string {
  const date = parse(d, 'yyyy-MM-dd', new Date());
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function formatPtMonth(yyyymm: string): string {
  const d = parse(yyyymm + '-01', 'yyyy-MM-dd', new Date());
  return format(d, "MMMM yyyy", { locale: ptBR });
}

export { format, parse, differenceInMinutes, addMinutes };
