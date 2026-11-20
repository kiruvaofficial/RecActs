export interface ActionPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  submit: boolean;
  approve: boolean;
  export: boolean;
}

export interface RolePermissionConfigData {
  id?: string;
  roleKey: string;
  roleName: string;
  description: string;
  badge?: string;
  isDefault?: boolean;
  exemptions: {
    editWindowDays: number;
    backdatedLoggingAllowed: boolean;
    requireLeadApproval: boolean;
  };
  directScopes: {
    withinDepartment: ActionPermissions;
    otherColleagues: ActionPermissions;
    externalUsers: ActionPermissions;
  };
  modulePermissions: {
    teamWork: ActionPermissions;
    workLogs: ActionPermissions;
    tickets: ActionPermissions;
    ganttTimeline: ActionPermissions;
    attendance: ActionPermissions;
    kpiEngine: ActionPermissions;
    leavePlanner: ActionPermissions;
    blockers: ActionPermissions;
    zohoSync: ActionPermissions;
    userManagement: ActionPermissions;
  };
}

export const DEFAULT_ACTIONS: ActionPermissions = {
  view: true,
  create: true,
  edit: true,
  delete: false,
  submit: true,
  approve: false,
  export: false,
};

export const READ_ONLY_ACTIONS: ActionPermissions = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  submit: false,
  approve: false,
  export: false,
};

export const ALL_ACTIONS: ActionPermissions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  submit: true,
  approve: true,
  export: true,
};

export const INITIAL_ROLES_CATALOG: RolePermissionConfigData[] = [
  {
    roleKey: 'admin',
    roleName: 'Admin',
    description: 'Default Role: Full administrative authority across all modules, approvals, and configurations.',
    badge: 'Full Access',
    isDefault: true,
    exemptions: { editWindowDays: 14, backdatedLoggingAllowed: true, requireLeadApproval: false },
    directScopes: {
      withinDepartment: { ...ALL_ACTIONS },
      otherColleagues: { ...ALL_ACTIONS },
      externalUsers: { ...ALL_ACTIONS },
    },
    modulePermissions: {
      teamWork: { ...ALL_ACTIONS },
      workLogs: { ...ALL_ACTIONS },
      tickets: { ...ALL_ACTIONS },
      ganttTimeline: { ...ALL_ACTIONS },
      attendance: { ...ALL_ACTIONS },
      kpiEngine: { ...ALL_ACTIONS },
      leavePlanner: { ...ALL_ACTIONS },
      blockers: { ...ALL_ACTIONS },
      zohoSync: { ...ALL_ACTIONS },
      userManagement: { ...ALL_ACTIONS },
    },
  },
  {
    roleKey: 'member',
    roleName: 'Member',
    description: 'Default Role: Standard staff members who log daily activities, view tickets, and track individual progress.',
    badge: 'Standard',
    isDefault: true,
    exemptions: { editWindowDays: 4, backdatedLoggingAllowed: false, requireLeadApproval: true },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      tickets: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      zohoSync: { ...READ_ONLY_ACTIONS, view: false },
      userManagement: { ...READ_ONLY_ACTIONS, view: false },
    },
  },
  {
    roleKey: 'lead',
    roleName: 'Leadership Staff',
    description: 'Team Leads and principal engineers overseeing delivery quality, reviewing timesheets, and mitigating blockers.',
    badge: 'Lead Access',
    isDefault: false,
    exemptions: { editWindowDays: 7, backdatedLoggingAllowed: true, requireLeadApproval: false },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      otherColleagues: { view: true, create: true, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      tickets: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      ganttTimeline: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: true },
      attendance: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      kpiEngine: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: true },
      leavePlanner: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      blockers: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      zohoSync: { view: true, create: true, edit: true, delete: false, submit: false, approve: false, export: true },
      userManagement: { view: true, create: false, edit: true, delete: false, submit: false, approve: false, export: false },
    },
  },
  {
    roleKey: 'manager',
    roleName: 'Organization Managers',
    description: 'Department heads managing cross-functional operations, KPI calibrations, and org-wide resource planning.',
    badge: 'Manager Access',
    isDefault: false,
    exemptions: { editWindowDays: 10, backdatedLoggingAllowed: true, requireLeadApproval: false },
    directScopes: {
      withinDepartment: { ...ALL_ACTIONS, delete: false },
      otherColleagues: { ...ALL_ACTIONS, delete: false },
      externalUsers: { view: true, create: true, edit: false, delete: false, submit: false, approve: false, export: true },
    },
    modulePermissions: {
      teamWork: { ...ALL_ACTIONS, delete: false },
      workLogs: { ...ALL_ACTIONS, delete: false },
      tickets: { ...ALL_ACTIONS, delete: false },
      ganttTimeline: { ...ALL_ACTIONS, delete: false },
      attendance: { ...ALL_ACTIONS, delete: false },
      kpiEngine: { ...ALL_ACTIONS, delete: false },
      leavePlanner: { ...ALL_ACTIONS, delete: false },
      blockers: { ...ALL_ACTIONS, delete: false },
      zohoSync: { ...ALL_ACTIONS, delete: false },
      userManagement: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
    },
  },
  {
    roleKey: 'dept_manager',
    roleName: 'Department Managers',
    description: 'Managers dedicated to individual vertical departments with full departmental approval authority.',
    badge: 'Dept Manager',
    isDefault: false,
    exemptions: { editWindowDays: 7, backdatedLoggingAllowed: true, requireLeadApproval: false },
    directScopes: {
      withinDepartment: { ...ALL_ACTIONS, delete: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { ...ALL_ACTIONS, delete: false },
      workLogs: { ...ALL_ACTIONS, delete: false },
      tickets: { ...ALL_ACTIONS, delete: false },
      ganttTimeline: { ...ALL_ACTIONS, delete: false },
      attendance: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      kpiEngine: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      leavePlanner: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      blockers: { ...ALL_ACTIONS, delete: false },
      zohoSync: { view: true, create: true, edit: false, delete: false, submit: false, approve: false, export: true },
      userManagement: { view: true, create: false, edit: true, delete: false, submit: false, approve: false, export: false },
    },
  },
  {
    roleKey: 'design_team',
    roleName: 'Design Team',
    description: 'Specialists authoring UI/UX wireframes, requirement specifications, and prototype documentation.',
    badge: 'Design Staff',
    isDefault: false,
    exemptions: { editWindowDays: 4, backdatedLoggingAllowed: false, requireLeadApproval: true },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      tickets: { view: true, create: false, edit: true, delete: false, submit: false, approve: false, export: false },
      ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      zohoSync: { ...READ_ONLY_ACTIONS, view: false },
      userManagement: { ...READ_ONLY_ACTIONS, view: false },
    },
  },
  {
    roleKey: 'developers',
    roleName: 'Developers',
    description: 'Engineering personnel implementing features, fixing software bugs, and logging technical effort.',
    badge: 'Engineering',
    isDefault: false,
    exemptions: { editWindowDays: 4, backdatedLoggingAllowed: false, requireLeadApproval: true },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      tickets: { view: true, create: false, edit: true, delete: false, submit: false, approve: false, export: false },
      ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      zohoSync: { ...READ_ONLY_ACTIONS, view: false },
      userManagement: { ...READ_ONLY_ACTIONS, view: false },
    },
  },
  {
    roleKey: 'content_writer',
    roleName: 'Content Writer',
    description: 'Authors conducting product research, drafting knowledge base articles, and publishing release guides.',
    badge: 'Content',
    isDefault: false,
    exemptions: { editWindowDays: 3, backdatedLoggingAllowed: false, requireLeadApproval: true },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      tickets: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      zohoSync: { ...READ_ONLY_ACTIONS, view: false },
      userManagement: { ...READ_ONLY_ACTIONS, view: false },
    },
  },
];
