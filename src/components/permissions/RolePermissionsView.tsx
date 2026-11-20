'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  Check,
  X,
  HelpCircle,
  Save,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Plus,
  Users,
  Smartphone,
  Monitor,
  CheckSquare,
  Square,
  Clock,
  Layers,
  Lock,
  Building,
} from 'lucide-react';
import { ActionPermissions, RolePermissionConfigData } from '@/app/api/permissions/roles/route';

interface RolePermissionsViewProps {
  onShowToast: (message: string) => void;
  currentRole: string;
}

export function RolePermissionsView({ onShowToast, currentRole }: RolePermissionsViewProps) {
  const [roles, setRoles] = useState<RolePermissionConfigData[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('member');
  const [searchRoleQuery, setSearchRoleQuery] = useState<string>('');
  const [activeDeviceTab, setActiveDeviceTab] = useState<'general' | 'mobile'>('general');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Modal to add custom role
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');

  const loadRolePermissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/permissions/roles');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.roles) && data.roles.length > 0) {
          setRoles(data.roles);
          if (!data.roles.some((r: any) => r.roleKey === selectedRoleKey)) {
            setSelectedRoleKey(data.roles[0].roleKey);
          }
        }
      } else {
        onShowToast('Failed to load role permissions');
      }
    } catch (e) {
      onShowToast('Error loading role permissions');
    } finally {
      setIsLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  useEffect(() => {
    loadRolePermissions();
  }, []);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.roleKey === selectedRoleKey) || roles[0];
  }, [roles, selectedRoleKey]);

  // Filtered roles list for left pane
  const filteredRoles = useMemo(() => {
    if (!searchRoleQuery.trim()) return roles;
    const q = searchRoleQuery.toLowerCase().trim();
    return roles.filter(
      (r) =>
        r.roleName.toLowerCase().includes(q) ||
        r.roleKey.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [roles, searchRoleQuery]);

  // Handle toggle for Direct Scopes
  const handleToggleDirectScope = (
    scopeKey: keyof RolePermissionConfigData['directScopes'],
    action: keyof ActionPermissions
  ) => {
    if (!selectedRole) return;
    setRoles((prev) =>
      prev.map((r) => {
        if (r.roleKey !== selectedRole.roleKey) return r;
        const currentVal = r.directScopes[scopeKey][action];
        return {
          ...r,
          directScopes: {
            ...r.directScopes,
            [scopeKey]: {
              ...r.directScopes[scopeKey],
              [action]: !currentVal,
            },
          },
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Handle toggle for Module Permissions
  const handleToggleModule = (
    moduleKey: keyof RolePermissionConfigData['modulePermissions'],
    action: keyof ActionPermissions
  ) => {
    if (!selectedRole) return;
    setRoles((prev) =>
      prev.map((r) => {
        if (r.roleKey !== selectedRole.roleKey) return r;
        const currentVal = r.modulePermissions[moduleKey][action];
        return {
          ...r,
          modulePermissions: {
            ...r.modulePermissions,
            [moduleKey]: {
              ...r.modulePermissions[moduleKey],
              [action]: !currentVal,
            },
          },
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Toggle all actions in a scope row
  const handleToggleScopeRowAll = (scopeKey: keyof RolePermissionConfigData['directScopes']) => {
    if (!selectedRole) return;
    const currentScope = selectedRole.directScopes[scopeKey];
    const allChecked = Object.values(currentScope).every(Boolean);
    const newVal = !allChecked;
    setRoles((prev) =>
      prev.map((r) => {
        if (r.roleKey !== selectedRole.roleKey) return r;
        return {
          ...r,
          directScopes: {
            ...r.directScopes,
            [scopeKey]: {
              view: newVal,
              create: newVal,
              edit: newVal,
              delete: newVal,
              submit: newVal,
              approve: newVal,
              export: newVal,
            },
          },
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Toggle all actions in a module row
  const handleToggleModuleRowAll = (moduleKey: keyof RolePermissionConfigData['modulePermissions']) => {
    if (!selectedRole) return;
    const currentMod = selectedRole.modulePermissions[moduleKey];
    const allChecked = Object.values(currentMod).every(Boolean);
    const newVal = !allChecked;
    setRoles((prev) =>
      prev.map((r) => {
        if (r.roleKey !== selectedRole.roleKey) return r;
        return {
          ...r,
          modulePermissions: {
            ...r.modulePermissions,
            [moduleKey]: {
              view: newVal,
              create: newVal,
              edit: newVal,
              delete: newVal,
              submit: newVal,
              approve: newVal,
              export: newVal,
            },
          },
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Save current role configuration to backend
  const handleSaveCurrentRole = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/permissions/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleKey: selectedRole.roleKey,
          roleName: selectedRole.roleName,
          description: selectedRole.description,
          directScopes: selectedRole.directScopes,
          modulePermissions: selectedRole.modulePermissions,
          exemptions: selectedRole.exemptions,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(`Permissions updated successfully for ${selectedRole.roleName}`);
        setHasUnsavedChanges(false);
      } else {
        onShowToast(data.error || 'Failed to save permissions');
      }
    } catch (e) {
      onShowToast('Error saving permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // Create new custom role
  const handleCreateCustomRole = async () => {
    if (!newRoleName.trim()) {
      onShowToast('Role name is required');
      return;
    }
    const roleKey = newRoleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newRole: RolePermissionConfigData = {
      roleKey,
      roleName: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Custom organizational functional role.',
      badge: 'Custom',
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
        tickets: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
        ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
        attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
        kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
        leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
        blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
        zohoSync: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
        userManagement: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      },
    };

    setRoles((prev) => [...prev, newRole]);
    setSelectedRoleKey(roleKey);
    setIsAddRoleModalOpen(false);
    setNewRoleName('');
    setNewRoleDesc('');
    setHasUnsavedChanges(true);
    onShowToast(`Created role: ${newRole.roleName}`);
  };

  const actionColumns: Array<{ key: keyof ActionPermissions; label: string }> = [
    { key: 'view', label: 'View / Access' },
    { key: 'create', label: 'Create' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
    { key: 'submit', label: 'Submit' },
    { key: 'approve', label: 'Approve' },
    { key: 'export', label: 'Export' },
  ];

  const directScopeRows: Array<{
    key: keyof RolePermissionConfigData['directScopes'];
    label: string;
    sublabel?: string;
    tooltip: string;
  }> = [
    {
      key: 'withinDepartment',
      label: 'Only within department',
      tooltip: 'Permissions applied to records and tickets belonging strictly to the user’s assigned department.',
    },
    {
      key: 'otherColleagues',
      label: 'Other colleagues',
      sublabel: '(Cross-department: Requirement, Development, Testing)',
      tooltip: 'Visibility and collaboration capabilities across other internal departments in the organization.',
    },
    {
      key: 'externalUsers',
      label: 'External users',
      sublabel: '(Contractors, Partners & Stakeholders)',
      tooltip: 'Access to interact with external guest members and contractor tickets.',
    },
  ];

  const moduleRows: Array<{
    key: keyof RolePermissionConfigData['modulePermissions'];
    label: string;
    icon: string;
    category: string;
  }> = [
    { key: 'teamWork', label: 'Team Channel & Assigned Tickets', icon: '🎯', category: 'Core Work' },
    { key: 'workLogs', label: 'Daily Work Logs & Timesheets', icon: '⏱️', category: 'Time Tracking' },
    { key: 'tickets', label: 'Tickets & Weightages Board', icon: '📋', category: 'Sprint Deliverables' },
    { key: 'ganttTimeline', label: 'Interactive Gantt Timeline', icon: '📊', category: 'Sprint Deliverables' },
    { key: 'attendance', label: 'Attendance & Work Shifts', icon: '📅', category: 'Time Tracking' },
    { key: 'kpiEngine', label: 'KPI Engine & Performance Targets', icon: '⚡', category: 'Analytics' },
    { key: 'leavePlanner', label: 'Leave Applications & Policies', icon: '🏖️', category: 'Work Schedule' },
    { key: 'blockers', label: 'Blocker Board & Escalations', icon: '🚨', category: 'Workflow Governance' },
    { key: 'zohoSync', label: 'Zoho Sprints Integration', icon: '🔄', category: 'Integrations' },
    { key: 'userManagement', label: 'User Directory & Role Assignment', icon: '👥', category: 'Administration' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions Bar (Exact match to screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 hover:text-slate-300 cursor-pointer">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin Panel</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Permissions - Roles</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Role Permission Matrix & Access Controls
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddRoleModalOpen(true)}
            className="btn-modern-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Role</span>
          </button>
          <button
            onClick={loadRolePermissions}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-white"
            title="Reload from server"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Two-Pane Split Layout (Roles list on left, Permission Matrix on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane: USER ROLES List */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] p-3 space-y-3 shadow-sm">
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              User Roles ({filteredRoles.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">RBAC Engine</span>
          </div>

          {/* Role Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter roles..."
              value={searchRoleQuery}
              onChange={(e) => setSearchRoleQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-xs outline-none text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          {/* Roles Cards List */}
          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-0.5">
            {filteredRoles.map((r) => {
              const isSelected = r.roleKey === selectedRole?.roleKey;
              return (
                <div
                  key={r.roleKey}
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (!confirm('You have unsaved permission changes. Switch role anyway?')) return;
                    }
                    setSelectedRoleKey(r.roleKey);
                    setHasUnsavedChanges(false);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500/50 dark:border-indigo-500/50 shadow-sm'
                      : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03] border-transparent hover:border-slate-200 dark:hover:border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {r.roleName}
                    </span>
                    {r.badge && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                          r.isDefault
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {r.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {r.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Granular Permissions Matrix for Selected Role */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col">
          {/* Header of Right Pane (Exact match to screenshot: Role Title, General / Mobile Switcher, X Button) */}
          <div className="p-4 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center font-bold text-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedRole?.roleName}</span>
                  {hasUnsavedChanges && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Unsaved Changes
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                  {selectedRole?.description}
                </p>
              </div>
            </div>

            {/* General / Mobile Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-white/[0.05] border border-slate-300/50 dark:border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab('general')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    activeDeviceTab === 'general'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>General</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab('mobile')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                    activeDeviceTab === 'mobile'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>
          </div>

          {/* Matrix Content Body */}
          <div className="p-5 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            {/* Section 1: Direct Work & Ticket Actions (Direct Conversations in screenshot) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Direct Work & Ticket Scopes
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">(Scope Level Access)</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.06]">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[180px] font-semibold text-[11px]">Scope</th>
                      {actionColumns.map((col) => (
                        <th key={col.key} className="py-2.5 px-2.5 text-center font-semibold text-[10px] uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {directScopeRows.map((row) => {
                      const scopeData = selectedRole?.directScopes[row.key];
                      const isAllChecked = scopeData && Object.values(scopeData).every(Boolean);

                      return (
                        <tr key={row.key} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.015]">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleScopeRowAll(row.key)}
                                className="text-slate-400 hover:text-indigo-400"
                                title="Toggle all actions in this scope"
                              >
                                {isAllChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500 fill-current" />
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                  {row.label}
                                </span>
                                {row.sublabel && (
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.sublabel}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          {actionColumns.map((col) => {
                            const isChecked = Boolean(scopeData?.[col.key]);
                            return (
                              <td key={col.key} className="py-2.5 px-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleDirectScope(row.key, col.key)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-white/[0.2] bg-white dark:bg-slate-900 cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Exemptions Box (Exact match to screenshot) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">Exemptions:</span>
                  <span>Time window to reply / edit when the access is restricted</span>
                  <span title="Grace days allowed to submit or edit logs after sprint end">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto font-mono">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={selectedRole?.exemptions?.editWindowDays || 4}
                    onChange={(e) => {
                      const days = Math.max(1, Number(e.target.value));
                      setRoles((prev) =>
                        prev.map((r) => {
                          if (r.roleKey !== selectedRole?.roleKey) return r;
                          return {
                            ...r,
                            exemptions: { ...r.exemptions, editWindowDays: days },
                          };
                        })
                      );
                      setHasUnsavedChanges(true);
                    }}
                    className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] text-center font-bold text-indigo-500 outline-none"
                  />
                  <select
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] text-xs font-semibold outline-none"
                    defaultValue="days"
                  >
                    <option value="days">Day(s)</option>
                    <option value="weeks">Week(s)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Workspaces & Modules (Conversations in screenshot) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Workspace & Module Permissions
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">(Feature Channel Access)</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.06]">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[220px] font-semibold text-[11px]">Feature Module</th>
                      {actionColumns.map((col) => (
                        <th key={col.key} className="py-2.5 px-2.5 text-center font-semibold text-[10px] uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {moduleRows.map((row) => {
                      const modData = selectedRole?.modulePermissions[row.key];
                      const isAllChecked = modData && Object.values(modData).every(Boolean);

                      return (
                        <tr key={row.key} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.015]">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleToggleModuleRowAll(row.key)}
                                className="text-slate-400 hover:text-indigo-400"
                                title="Toggle all actions for this module"
                              >
                                {isAllChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500 fill-current" />
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="text-sm">{row.icon}</span>
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                  {row.label}
                                </span>
                                <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-100 dark:bg-white/[0.05] text-slate-400">
                                  {row.category}
                                </span>
                              </div>
                            </div>
                          </td>
                          {actionColumns.map((col) => {
                            const isChecked = Boolean(modData?.[col.key]);
                            return (
                              <td key={col.key} className="py-2.5 px-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleModule(row.key, col.key)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-white/[0.2] bg-white dark:bg-slate-900 cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar (Exact match to screenshot: CANCEL & SAVE buttons) */}
          <div className="p-3.5 bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {hasUnsavedChanges ? (
                <span className="text-amber-500 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Unsaved changes for role: {selectedRole?.roleName}</span>
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Permissions synced with server database</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  loadRolePermissions();
                  onShowToast('Changes discarded');
                }}
                disabled={isSaving || !hasUnsavedChanges}
                className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentRole}
                disabled={isSaving}
                className="px-5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>SAVE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal to Add Custom Role */}
      {isAddRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.1] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Custom Role</h3>
              </div>
              <button onClick={() => setIsAddRoleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. QA Automation Specialist, Delivery Lead..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description & Scope</label>
                <textarea
                  rows={3}
                  placeholder="Summarize this role's authority and functional responsibilities..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsAddRoleModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomRole}
                className="btn-modern-primary px-4 py-1.5 text-xs font-bold"
              >
                Add Role & Configure Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
