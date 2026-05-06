import { ContractType, User } from '@/types';

export interface ContractRules {
  defaultDailyMinutes: number;
  lunchRequired: boolean;
  allowOvertime: (user: User) => boolean;
  maxDailyMinutes: number; // alert above
}

export function rulesFor(type: ContractType): ContractRules {
  switch (type) {
    case 'PART_TIME':
      return {
        defaultDailyMinutes: 4 * 60,
        lunchRequired: false,
        allowOvertime: () => true,
        maxDailyMinutes: 6 * 60,
      };
    case 'APPRENTICE':
      return {
        defaultDailyMinutes: 6 * 60,
        lunchRequired: false,
        allowOvertime: (u) => u.apprentice_overtime_allowed === 1,
        maxDailyMinutes: 6 * 60,
      };
    case 'FULL_TIME':
    default:
      return {
        defaultDailyMinutes: 8 * 60,
        lunchRequired: true,
        allowOvertime: () => true,
        maxDailyMinutes: 10 * 60,
      };
  }
}

export const contractLabel = (t: ContractType): string =>
  t === 'FULL_TIME' ? 'Integral' : t === 'PART_TIME' ? 'Meio período' : 'Jovem aprendiz';
