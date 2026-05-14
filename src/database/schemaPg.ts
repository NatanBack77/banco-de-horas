export const SCHEMA_PG_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    contract_type TEXT NOT NULL DEFAULT 'FULL_TIME',
    apprentice_overtime_allowed INTEGER NOT NULL DEFAULT 0,
    monthly_goal_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')
  )`,
  `CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    entry_time TEXT NOT NULL,
    lunch_out_time TEXT NOT NULL,
    lunch_in_time TEXT NOT NULL,
    exit_time TEXT NOT NULL,
    daily_minutes INTEGER NOT NULL,
    lunch_minutes INTEGER NOT NULL DEFAULT 60,
    active_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')
  )`,
  `CREATE TABLE IF NOT EXISTS punch_records (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('IN','LUNCH_OUT','LUNCH_IN','OUT')),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')
  )`,
  `CREATE INDEX IF NOT EXISTS idx_punch_user_date ON punch_records(user_id, date)`,
  `CREATE TABLE IF NOT EXISTS work_days (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    expected_minutes INTEGER NOT NULL DEFAULT 0,
    worked_minutes INTEGER NOT NULL DEFAULT 0,
    balance_minutes INTEGER NOT NULL DEFAULT 0,
    closed INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
  )`,
  `CREATE TABLE IF NOT EXISTS overtime_usage (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    minutes INTEGER NOT NULL,
    date TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'USED' CHECK(status IN ('USED','SCHEDULED','CANCELED')),
    created_at TEXT NOT NULL DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'INFO',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    haptics_enabled INTEGER NOT NULL DEFAULT 1,
    weekly_goal_minutes INTEGER NOT NULL DEFAULT 0
  )`,
  `ALTER TABLE overtime_usage ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'MANUAL'`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    created_at TEXT NOT NULL DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')
  )`,
];
