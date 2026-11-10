export type FunctionalRole = 'member' | 'lead' | 'manager' | 'hr' | 'owner' | 'god';

export interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
  allowedRoles: FunctionalRole[];
}

export const PERMISSIONS: Record<string, FunctionalRole[]> = {
  // Attendance
  'attendance:check_in': ['member', 'lead', 'manager', 'hr', 'owner'],
  'attendance:view_own': ['member', 'lead', 'manager', 'hr', 'owner'],
  'attendance:view_team': ['lead', 'manager', 'hr', 'owner'],
  'attendance:correct_request': ['member', 'lead', 'manager', 'hr', 'owner'],
  'attendance:correct_approve': ['hr', 'manager', 'owner'],

  // Daily Work Logs
  'work_logs:create': ['member', 'lead', 'manager', 'owner'],
  'work_logs:edit_draft': ['member', 'lead', 'manager', 'owner'],
  'work_logs:submit': ['member', 'lead', 'manager', 'owner'],
  'work_logs:approve': ['lead', 'manager', 'owner'],
  'work_logs:return': ['lead', 'manager', 'owner'],
  'work_logs:view_history': ['member', 'lead', 'manager', 'hr', 'owner'],

  // Tickets & Weightages
  'tickets:view': ['member', 'lead', 'manager', 'owner'],
  'tickets:create': ['lead', 'manager', 'owner'],
  'tickets:edit': ['lead', 'manager', 'owner'],
  'tickets:allocate_weightage': ['lead', 'manager', 'owner'],
  'tickets:reassign': ['lead', 'manager', 'owner'],
  'timeline:view': ['member', 'lead', 'manager', 'owner'],
  'timeline:edit': ['lead', 'manager', 'owner'],

  // Blockers
  'blockers:raise': ['member', 'lead', 'manager', 'owner'],
  'blockers:acknowledge': ['lead', 'manager', 'owner'],
  'blockers:resolve': ['lead', 'manager', 'owner'],
  'blockers:escalate': ['lead', 'manager', 'owner'],

  // Leave Planner
  'leave:apply': ['member', 'lead', 'manager', 'hr', 'owner'],
  'leave:view_balance': ['member', 'lead', 'manager', 'hr', 'owner'],
  'leave:view_calendar': ['member', 'lead', 'manager', 'hr', 'owner'],
  'leave:approve': ['lead', 'manager', 'hr', 'owner'],
  'leave:reject': ['lead', 'manager', 'hr', 'owner'],
  'leave:manage_policies': ['hr', 'owner'],

  // KPI Engine & Targets
  'kpi:view_own': ['member', 'lead', 'manager', 'owner'],
  'kpi:view_team': ['lead', 'manager', 'owner'],
  'kpi:view_org': ['manager', 'owner'],
  'kpi:override_submit': ['lead', 'manager', 'owner'],
  'kpi:override_approve': ['manager', 'owner'],
  'kpi:deduct_impact': ['lead', 'manager', 'owner'],
  'kpi:reverse_impact': ['manager', 'owner'],
  'kpi:configure_rules': ['owner'],

  // Reports & Analytics
  'reports:view': ['lead', 'manager', 'hr', 'owner'],
  'reports:export': ['lead', 'manager', 'hr', 'owner'],
  'reports:eod_resend': ['lead', 'manager', 'hr', 'owner'],

  // Administration & Audit
  'org:manage_settings': ['owner'],
  'org:manage_employees': ['hr', 'owner'],
  'audit:view': ['manager', 'hr', 'owner', 'god'],
  'platform:api_docs': ['owner', 'god'],

  // God Mode (Platform Admin)
  'platform:manage_orgs': ['god'],
  'platform:manage_flags': ['god'],
  'platform:support_session': ['god'],
  'platform:view_health': ['god'],
};

export function hasPermission(role: FunctionalRole, permission: string): boolean {
  if (role === 'god') {
    // God mode has platform permissions and audited support access
    return true;
  }
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}
