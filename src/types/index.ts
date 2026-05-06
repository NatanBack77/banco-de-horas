export type ContractType = 'FULL_TIME' | 'PART_TIME' | 'APPRENTICE';

export type PunchType = 'IN' | 'LUNCH_OUT' | 'LUNCH_IN' | 'OUT';

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  contract_type: ContractType;
  apprentice_overtime_allowed: number; // 0 | 1
  monthly_goal_minutes: number;
  created_at: string;
}

export interface Shift {
  id: number;
  user_id: number;
  name: string;
  entry_time: string;       // HH:mm
  lunch_out_time: string;
  lunch_in_time: string;
  exit_time: string;
  daily_minutes: number;    // expected minutes/day
  lunch_minutes: number;
  active_days: string;      // JSON array of weekday ints (0=Sun..6=Sat)
  is_default: number;
  created_at: string;
}

export interface PunchRecord {
  id: number;
  user_id: number;
  type: PunchType;
  date: string;             // yyyy-MM-dd
  time: string;             // HH:mm
  note: string | null;
  source: 'MANUAL' | 'AUTO';
  created_at: string;
}

export interface WorkDay {
  id: number;
  user_id: number;
  date: string;
  expected_minutes: number;
  worked_minutes: number;
  balance_minutes: number;  // worked - expected
  closed: number;
}

export interface OvertimeUsage {
  id: number;
  user_id: number;
  minutes: number;
  date: string;
  reason: string | null;
  status: 'USED' | 'SCHEDULED' | 'CANCELED';
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR';
  read: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  entity: string;
  entity_id: number;
  action: string;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  user_id: number;
  notifications_enabled: number;
  haptics_enabled: number;
  weekly_goal_minutes: number;
}
