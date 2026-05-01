export interface Member {
  id: number;
  name: string;
  email: string;
  github_handle: string;
  role: string;
  location: string;
  manager_id: number | null;
  active: boolean;
  custom_fields: Record<string, unknown>;
  created_at: string;
}

export interface BigRock {
  id: number;
  title: string;
  description: string;
  owner_id: number | null;
  owner_name?: string | null;
  quarter: string;
  status: string;
  target_date: string | null;
  progress_pct: number;
  notes: string;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTask {
  id: number;
  owner_id: number | null;
  owner_name?: string | null;
  week_start: string;
  title: string;
  priority: string;
  status: string;
  big_rock_id: number | null;
  big_rock_title?: string | null;
  notes: string;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Interrupt {
  id: number;
  customer: string;
  owner_id: number | null;
  owner_name?: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  reported_date: string | null;
  resolved_date: string | null;
  jira_link: string;
  hours_spent: number;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CustomColumn {
  id: number;
  table_name: string;
  column_name: string;
  column_type: string;
}

export interface ActivityRow {
  id: number;
  user_name: string;
  table_name: string;
  record_id: number;
  action: string;
  diff_json: string;
  created_at: string;
}

export interface Stats {
  members_active: number;
  big_rocks_total: number;
  big_rocks_at_risk: number;
  big_rocks_done: number;
  tasks_this_week: number;
  tasks_blocked: number;
  interrupts_open: number;
  interrupts_sev1_or_2_open: number;
}

export const ROCK_STATUSES = ['Not Started', 'In Progress', 'At Risk', 'Done', 'Dropped'] as const;
export const TASK_STATUSES = ['Planned', 'In Progress', 'Blocked', 'Done', 'Dropped'] as const;
export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export const SEVERITIES = ['Sev1', 'Sev2', 'Sev3', 'Sev4'] as const;
export const INTERRUPT_STATUSES = ['Open', 'Investigating', 'Mitigated', 'Closed'] as const;
