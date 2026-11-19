'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Palette,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Building2,
  Shield,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Sliders,
  UserCheck,
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import {
  loadUserFilterPreferences,
  saveUserFilterPreferences,
  resetUserFilterPreferences,
  syncUserFilterPreferencesFromServer,
} from '@/lib/user-filters';

export interface UserManagementViewProps {
  currentRole: string;
  onShowToast: (message: string) => void;
  currentUserId?: string;
  currentUserName?: string;
}

interface UserViewFilters {
  searchQuery: string;
  teamFilter: string;
  roleFilter: string;
  statusFilter: string;
  designerFilter: string;
}

const DEFAULT_USER_FILTERS: UserViewFilters = {
  searchQuery: '',
  teamFilter: 'all',
  roleFilter: 'all',
  statusFilter: 'all',
  designerFilter: 'all',
};

export function UserManagementView({
  currentRole,
  onShowToast,
  currentUserId,
  currentUserName,
}: UserManagementViewProps) {
  const userKey = currentUserId || currentUserName || 'guest';
  const initialSavedFilters = useMemo(() => {
    return loadUserFilterPreferences<UserViewFilters>(userKey, 'users', DEFAULT_USER_FILTERS);
  }, [userKey]);

  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [zohoDesignerOptions, setZohoDesignerOptions] = useState<any[]>([]);
  const [zohoDesignerField, setZohoDesignerField] = useState<string>('UDF_MULTIPKL10');
  const [availableCustomFields, setAvailableCustomFields] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(initialSavedFilters.searchQuery);
  const [teamFilter, setTeamFilter] = useState<string>(initialSavedFilters.teamFilter);
  const [roleFilter, setRoleFilter] = useState<string>(initialSavedFilters.roleFilter);
  const [statusFilter, setStatusFilter] = useState<string>(initialSavedFilters.statusFilter);
  const [designerFilter, setDesignerFilter] = useState<string>(initialSavedFilters.designerFilter);

  // Auto-save user filters
  useEffect(() => {
    saveUserFilterPreferences(userKey, 'users', {
      searchQuery,
      teamFilter,
      roleFilter,
      statusFilter,
      designerFilter,
    });
  }, [userKey, searchQuery, teamFilter, roleFilter, statusFilter, designerFilter]);

  // Sync from server
  useEffect(() => {
    syncUserFilterPreferencesFromServer<UserViewFilters>(userKey, 'users', (serverFilters) => {
      if (typeof serverFilters.searchQuery === 'string') setSearchQuery(serverFilters.searchQuery);
      if (serverFilters.teamFilter) setTeamFilter(serverFilters.teamFilter);
      if (serverFilters.roleFilter) setRoleFilter(serverFilters.roleFilter);
      if (serverFilters.statusFilter) setStatusFilter(serverFilters.statusFilter);
      if (serverFilters.designerFilter) setDesignerFilter(serverFilters.designerFilter);
    });
  }, [userKey]);

  const handleResetUserFilters = async () => {
    setSearchQuery(DEFAULT_USER_FILTERS.searchQuery);
    setTeamFilter(DEFAULT_USER_FILTERS.teamFilter);
    setRoleFilter(DEFAULT_USER_FILTERS.roleFilter);
    setStatusFilter(DEFAULT_USER_FILTERS.statusFilter);
    setDesignerFilter(DEFAULT_USER_FILTERS.designerFilter);
    await resetUserFilterPreferences(userKey, 'users');
    onShowToast('User filters reset to defaults');
  };

  // Modals
  const [editUserModal, setEditUserModal] = useState<any | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [isFieldConfigModalOpen, setIsFieldConfigModalOpen] = useState<boolean>(false);
  const [newUserData, setNewUserData] = useState<any>({
    name: '',
    email: '',
    designation: 'Designer',
    roleName: 'Team Member',
    teamId: '',
    reportingLeadId: '',
    reportingManagerId: '',
    employmentStatus: 'Active',
    joiningDate: new Date().toISOString().substring(0, 10),
    capacityFactorOverride: '',
    experienceLevel: 'Mid',
    zohoDesignerName: '',
  });

  const loadUsersData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTeams(data.teams || []);
        setRoles(data.roles || []);
        setLeads(data.leads || []);
        setManagers(data.managers || []);
        setZohoDesignerOptions(data.zohoDesignerOptions || []);
        if (data.zohoDesignerField) setZohoDesignerField(data.zohoDesignerField);
        if (Array.isArray(data.availableCustomFields)) setAvailableCustomFields(data.availableCustomFields);
      } else {
        const err = await res.json();
        onShowToast(err.error || 'Failed to load user management data');
      }
    } catch (e: any) {
      console.error('Failed loading users:', e);
      onShowToast('Network error loading users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchDesig = u.designation?.toLowerCase().includes(q);
        const matchDesigner = u.zohoDesignerName?.toLowerCase().includes(q);
        const matchTeam = u.teamName?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDesig && !matchDesigner && !matchTeam) return false;
      }

      // 2. Team filter
      if (teamFilter !== 'all' && u.teamId !== teamFilter) return false;

      // 3. Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      // 4. Status filter
      if (statusFilter !== 'all' && u.employmentStatus !== statusFilter) return false;

      // 5. Designer mapping filter
      if (designerFilter === 'mapped' && !u.zohoDesignerName) return false;
      if (designerFilter === 'unmapped' && u.zohoDesignerName) return false;

      return true;
    });
  }, [users, searchQuery, teamFilter, roleFilter, statusFilter, designerFilter]);

  // Update User Handler
  const handleSaveUser = async () => {
    if (!editUserModal) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserModal),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast(`Successfully updated ${editUserModal.name}`);
        setEditUserModal(null);
        await loadUsersData();
      } else {
        onShowToast(data.error || 'Failed to update user');
      }
    } catch (e: any) {
      onShowToast('Error updating user');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Map Designer Handler
  const handleQuickMapDesigner = async (membershipId: string, designerName: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId,
          zohoDesignerName: designerName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast(`Mapped designer: ${designerName || 'Unmapped'}`);
        await loadUsersData();
      } else {
        onShowToast(data.error || 'Failed to map designer');
      }
    } catch (e) {
      onShowToast('Error mapping designer');
    } finally {
      setIsSaving(false);
    }
  };

  // Create User Handler
  const handleCreateUser = async () => {
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      onShowToast('Please provide both name and email');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast(`Added ${newUserData.name} to organization!`);
        setIsAddUserModalOpen(false);
        setNewUserData({
          name: '',
          email: '',
          designation: 'Designer',
          roleName: 'Team Member',
          teamId: '',
          reportingLeadId: '',
          reportingManagerId: '',
          employmentStatus: 'Active',
          joiningDate: new Date().toISOString().substring(0, 10),
          capacityFactorOverride: '',
          experienceLevel: 'Mid',
          zohoDesignerName: '',
        });
        await loadUsersData();
      } else {
        onShowToast(data.error || 'Failed to add user');
      }
    } catch (e) {
      onShowToast('Error adding user');
    } finally {
      setIsSaving(false);
    }
  };

  // Update Global Designer Custom Field
  const handleSaveDesignerField = async (paramName: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zohoDesignerField: paramName }),
      });
      const data = await res.json();
      if (res.ok) {
        setZohoDesignerField(paramName);
        onShowToast(`Saved Zoho Designer custom field: ${paramName}`);
        setIsFieldConfigModalOpen(false);
        await loadUsersData();
      } else {
        onShowToast(data.error || 'Failed to update designer field');
      }
    } catch (e) {
      onShowToast('Error saving designer field');
    } finally {
      setIsSaving(false);
    }
  };

  const totalMapped = users.filter((u) => u.zohoDesignerName).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Team & User Management</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              {users.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage staff members, roles, reporting lines, and map Zoho Sprints Designer custom fields.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsFieldConfigModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-colors"
            title="Configure which Zoho Sprints custom field represents Designer"
          >
            <Sliders className="w-3.5 h-3.5 text-pink-400" />
            <span>Field: <strong className="font-mono text-pink-400">{zohoDesignerField}</strong></span>
          </button>

          <button
            onClick={loadUsersData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-slate-400 hover:text-white transition-colors"
            title="Refresh user list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="btn-modern-primary px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Zoho Designer Custom Field Integration Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-950/20 via-purple-950/20 to-indigo-950/20 border border-pink-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center flex-shrink-0 text-pink-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">Zoho Sprints Designer Field Mapping</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {zohoDesignerField}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mapped <strong>{totalMapped}</strong> of <strong>{users.length}</strong> staff members to their Zoho Designer picklist identities. When Zoho tickets sync, requirement allocations automatically route to the mapped user.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsFieldConfigModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start md:self-center flex-shrink-0"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Change Designer Field</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, designer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none placeholder-slate-400 text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 hidden sm:inline">Team:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-transparent font-semibold outline-none cursor-pointer max-w-[120px] text-slate-800 dark:text-slate-100"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900">{t.name}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 hidden sm:inline">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent font-semibold outline-none cursor-pointer max-w-[120px] text-slate-800 dark:text-slate-100"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name} className="bg-white dark:bg-slate-900">{r.name}</option>
              ))}
            </select>
          </div>

          {/* Designer Mapping Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs">
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-slate-400 hidden sm:inline">Designer:</span>
            <select
              value={designerFilter}
              onChange={(e) => setDesignerFilter(e.target.value)}
              className="bg-transparent font-semibold outline-none cursor-pointer text-slate-800 dark:text-slate-100"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All ({users.length})</option>
              <option value="mapped" className="bg-white dark:bg-slate-900">Mapped ({totalMapped})</option>
              <option value="unmapped" className="bg-white dark:bg-slate-900">Unmapped ({users.length - totalMapped})</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-semibold">
            <Check className="w-2.5 h-2.5" />
            <span>Saved for {currentUserName || 'you'}</span>
          </div>

          {(searchQuery || teamFilter !== 'all' || roleFilter !== 'all' || designerFilter !== 'all') && (
            <button
              onClick={handleResetUserFilters}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors"
              title="Reset user filters"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Level (Scale)</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Reporting Line</th>
                <th className="py-3 px-4">Zoho Designer UDF Mapping</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading organization staff and Zoho designer mappings...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    No members match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Member */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-indigo-500/20">
                          {u.initials || u.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`pill-badge ${
                          u.role.toLowerCase().includes('lead')
                            ? 'bg-amber-500/15 text-amber-400'
                            : u.role.toLowerCase().includes('manager')
                            ? 'bg-purple-500/15 text-purple-400'
                            : u.role.toLowerCase().includes('hr')
                            ? 'bg-cyan-500/15 text-cyan-400'
                            : u.role.toLowerCase().includes('owner') || u.role.toLowerCase().includes('director')
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-slate-500/10 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Designation */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-300">
                      {u.designation}
                    </td>

                    {/* Level (Scale) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.experienceLevel === 'Senior' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                          Senior (1.5x)
                        </span>
                      ) : u.experienceLevel === 'Junior' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/20">
                          Junior (0.8x)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          Mid (1.0x)
                        </span>
                      )}
                    </td>

                    {/* Capacity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {typeof u.capacityFactorOverride === 'number' && u.capacityFactorOverride > 0 ? (
                        <span className="font-mono text-amber-400 font-semibold text-xs">
                          {u.capacityFactorOverride}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          {u.role.toLowerCase().includes('lead') ? '60% (Lead)' : '100%'}
                        </span>
                      )}
                    </td>

                    {/* Team */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {u.teamName}
                      </span>
                    </td>

                    {/* Reporting Line */}
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      <div>Lead: <strong className="text-slate-300">{u.reportingLeadName}</strong></div>
                      <div>Mgr: <strong className="text-slate-300">{u.reportingManagerName}</strong></div>
                    </td>

                    {/* Zoho Designer Mapping */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.zohoDesignerName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-500/15 text-pink-300 border border-pink-500/30 flex items-center gap-1.5">
                            <Palette className="w-3 h-3 text-pink-400" />
                            <span>{u.zohoDesignerName}</span>
                          </span>
                          <button
                            onClick={() => {
                              const promptVal = prompt(`Change Zoho Designer name for ${u.name}:`, u.zohoDesignerName);
                              if (promptVal !== null) {
                                handleQuickMapDesigner(u.membershipId, promptVal);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white"
                            title="Edit Designer Mapping"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleQuickMapDesigner(u.membershipId, e.target.value);
                              }
                            }}
                            className="text-[11px] py-1 px-2 rounded-lg bg-pink-500/5 hover:bg-pink-500/10 border border-dashed border-pink-500/30 text-pink-400 font-medium outline-none cursor-pointer"
                          >
                            <option value="" disabled>+ Map Zoho Designer</option>
                            {zohoDesignerOptions.map((opt) => (
                              <option key={opt.id} value={opt.name} className="bg-slate-900 text-white">
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`pill-badge ${
                          u.employmentStatus === 'Active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : u.employmentStatus === 'Onboarding'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {u.employmentStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setEditUserModal({ ...u })}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-indigo-600 hover:text-white border border-slate-200 dark:border-white/[0.08] text-slate-300 text-xs font-medium transition-all"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: EDIT USER & MAP DESIGNER */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="modern-card max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <h3 className="font-bold text-base">Edit Team Member</h3>
                <p className="text-xs text-slate-400">Update organizational roles and Zoho Sprints designer mapping</p>
              </div>
              <button onClick={() => setEditUserModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={editUserModal.name || ''}
                    onChange={(e) => setEditUserModal({ ...editUserModal, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={editUserModal.email || ''}
                    onChange={(e) => setEditUserModal({ ...editUserModal, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Designation / Title</label>
                  <input
                    type="text"
                    value={editUserModal.designation || ''}
                    onChange={(e) => setEditUserModal({ ...editUserModal, designation: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Role</label>
                  <select
                    value={editUserModal.role || 'Team Member'}
                    onChange={(e) => setEditUserModal({ ...editUserModal, role: e.target.value, roleName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name} className="bg-slate-900 text-white">{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Assigned Team</label>
                  <select
                    value={editUserModal.teamId || 'none'}
                    onChange={(e) => setEditUserModal({ ...editUserModal, teamId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  >
                    <option value="none">Unassigned</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Employment Status</label>
                  <select
                    value={editUserModal.employmentStatus || 'Active'}
                    onChange={(e) => setEditUserModal({ ...editUserModal, employmentStatus: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Reporting Lines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Reporting Lead</label>
                  <select
                    value={editUserModal.reportingLeadId || 'none'}
                    onChange={(e) => setEditUserModal({ ...editUserModal, reportingLeadId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  >
                    <option value="none">None</option>
                    {leads.map((l) => (
                      <option key={l.membershipId} value={l.membershipId} className="bg-slate-900 text-white">
                        {l.name} ({l.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Reporting Manager</label>
                  <select
                    value={editUserModal.reportingManagerId || 'none'}
                    onChange={(e) => setEditUserModal({ ...editUserModal, reportingManagerId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  >
                    <option value="none">None</option>
                    {managers.map((m) => (
                      <option key={m.membershipId} value={m.membershipId} className="bg-slate-900 text-white">
                        {m.name} ({m.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ZOHO SPRINTS DESIGNER FIELD MAPPING */}
              <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-pink-300 flex items-center gap-1.5 text-xs">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Mapped Zoho Sprints Designer Name</span>
                  </label>
                  <span className="text-[10px] text-pink-400 font-mono font-bold">
                    Field: {zohoDesignerField}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={editUserModal.zohoDesignerName || ''}
                    onChange={(e) => setEditUserModal({ ...editUserModal, zohoDesignerName: e.target.value })}
                    className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-pink-500/30 font-semibold text-pink-200 outline-none text-xs"
                  >
                    <option value="">-- Unmapped (No Zoho Designer) --</option>
                    {zohoDesignerOptions.map((opt) => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Or enter custom Zoho designer name..."
                    value={editUserModal.zohoDesignerName || ''}
                    onChange={(e) => setEditUserModal({ ...editUserModal, zohoDesignerName: e.target.value })}
                    className="w-full p-2 rounded-lg bg-black/30 border border-pink-500/20 text-xs text-pink-200 placeholder-slate-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  When tickets sync from Zoho Sprints, any item with this designer will automatically assign to {editUserModal.name}.
                </p>
              </div>

              {/* Experience Level & Target Multipliers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300 flex items-center justify-between">
                    <span>Experience Level</span>
                    <span className="text-[10px] text-indigo-400 font-bold">Multiplier</span>
                  </label>
                  <select
                    value={editUserModal.experienceLevel || 'Mid'}
                    onChange={(e) => setEditUserModal({ ...editUserModal, experienceLevel: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none font-semibold text-slate-200 text-xs"
                  >
                    <option value="Junior" className="bg-slate-900 text-white">Junior (0.8x Target Weightage)</option>
                    <option value="Mid" className="bg-slate-900 text-white">Mid (1.0x Target Weightage)</option>
                    <option value="Senior" className="bg-slate-900 text-white">Senior (1.5x Target Weightage)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Multiplies target weightage: Junior 0.8x, Mid 1.0x, Senior 1.5x</p>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-300 flex items-center justify-between">
                    <span>Capacity Factor Override (%)</span>
                    <span className="text-[10px] text-amber-400 font-bold">e.g. 60%</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Default (100% or 60% for Leads)"
                    value={editUserModal.capacityFactorOverride ?? ''}
                    onChange={(e) => setEditUserModal({ ...editUserModal, capacityFactorOverride: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Accommodates leadership responsibilities (e.g. 60% for Team Leads)</p>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Joining Date</label>
                <input
                  type="date"
                  value={editUserModal.joiningDate || ''}
                  onChange={(e) => setEditUserModal({ ...editUserModal, joiningDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setEditUserModal(null)}
                className="btn-modern-secondary px-3.5 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveUser}
                className="btn-modern-primary px-4 py-1.5 text-xs"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW USER */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="modern-card max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <h3 className="font-bold text-base">Add New Team Member</h3>
                <p className="text-xs text-slate-400">Invite a new member and configure Zoho Sprints designer mapping</p>
              </div>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="john@blindmatrix.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Designation / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Designer"
                    value={newUserData.designation}
                    onChange={(e) => setNewUserData({ ...newUserData, designation: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Role</label>
                  <select
                    value={newUserData.roleName}
                    onChange={(e) => setNewUserData({ ...newUserData, roleName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name} className="bg-slate-900 text-white">{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Assigned Team</label>
                  <select
                    value={newUserData.teamId}
                    onChange={(e) => setNewUserData({ ...newUserData, teamId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  >
                    <option value="">Unassigned</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-300">Reporting Lead</label>
                  <select
                    value={newUserData.reportingLeadId}
                    onChange={(e) => setNewUserData({ ...newUserData, reportingLeadId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                  >
                    <option value="">None</option>
                    {leads.map((l) => (
                      <option key={l.membershipId} value={l.membershipId} className="bg-slate-900 text-white">
                        {l.name} ({l.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Zoho Designer Mapping */}
              <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/30 space-y-2">
                <label className="font-bold text-pink-300 flex items-center gap-1.5 text-xs">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Map to Zoho Sprints Designer Field ({zohoDesignerField})</span>
                </label>
                <select
                  value={newUserData.zohoDesignerName}
                  onChange={(e) => setNewUserData({ ...newUserData, zohoDesignerName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-pink-500/30 font-semibold text-pink-200 outline-none text-xs"
                >
                  <option value="">-- Select Designer from Zoho Sprints --</option>
                  {zohoDesignerOptions.map((opt) => (
                    <option key={opt.id} value={opt.name}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Experience Level & Target Multipliers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-300 flex items-center justify-between">
                    <span>Experience Level</span>
                    <span className="text-[10px] text-indigo-400 font-bold">Multiplier</span>
                  </label>
                  <select
                    value={newUserData.experienceLevel || 'Mid'}
                    onChange={(e) => setNewUserData({ ...newUserData, experienceLevel: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none font-semibold text-slate-200 text-xs"
                  >
                    <option value="Junior" className="bg-slate-900 text-white">Junior (0.8x Target Weightage)</option>
                    <option value="Mid" className="bg-slate-900 text-white">Mid (1.0x Target Weightage)</option>
                    <option value="Senior" className="bg-slate-900 text-white">Senior (1.5x Target Weightage)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Junior: 0.8x | Mid: 1.0x | Senior: 1.5x</p>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-300 flex items-center justify-between">
                    <span>Capacity Factor Override (%)</span>
                    <span className="text-[10px] text-amber-400 font-bold">e.g. 60%</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Default (100% or 60% for Leads)"
                    value={newUserData.capacityFactorOverride ?? ''}
                    onChange={(e) => setNewUserData({ ...newUserData, capacityFactorOverride: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Accommodates leadership responsibilities</p>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Joining Date</label>
                <input
                  type="date"
                  value={newUserData.joiningDate || ''}
                  onChange={(e) => setNewUserData({ ...newUserData, joiningDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="btn-modern-secondary px-3.5 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCreateUser}
                className="btn-modern-primary px-4 py-1.5 text-xs"
              >
                {isSaving ? 'Adding...' : 'Add Team Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIGURE ZOHO DESIGNER CUSTOM FIELD (UDF) */}
      {isFieldConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="modern-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-pink-400" />
                <h3 className="font-bold text-base">Select Zoho Designer Custom Field</h3>
              </div>
              <button onClick={() => setIsFieldConfigModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Choose which custom field parameter from your Zoho Sprints layout corresponds to the <strong>Designer</strong>. RecActs will read designer assignments and options from this field.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Zoho Custom Layout Field</label>
                <select
                  value={zohoDesignerField}
                  onChange={(e) => setZohoDesignerField(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono font-bold text-pink-300 outline-none"
                >
                  <option value="UDF_MULTIPKL10">UDF_MULTIPKL10 (Designer - Multi-Picklist)</option>
                  <option value="UDF_PKL15">UDF_PKL15 (Designer - Picklist)</option>
                  {availableCustomFields
                    .filter((f) => f.paramName !== 'UDF_MULTIPKL10' && f.paramName !== 'UDF_PKL15')
                    .map((f) => (
                      <option key={f.paramName} value={f.paramName}>
                        {f.paramName} ({f.fieldName} - {f.fieldTypeName})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Or enter Custom Parameter Name</label>
                <input
                  type="text"
                  placeholder="e.g. UDF_MULTIPKL10"
                  value={zohoDesignerField}
                  onChange={(e) => setZohoDesignerField(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono text-xs text-pink-300 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] space-y-1 text-slate-400 text-[11px]">
                <p className="font-semibold text-slate-300">Detected Designer Options in Zoho:</p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                  {zohoDesignerOptions.map((opt) => (
                    <span key={opt.id} className="px-1.5 py-0.5 rounded text-[10px] bg-pink-500/15 text-pink-300">
                      {opt.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsFieldConfigModalOpen(false)}
                className="btn-modern-secondary px-3.5 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveDesignerField(zohoDesignerField)}
                className="btn-modern-primary px-4 py-1.5 text-xs"
              >
                {isSaving ? 'Saving...' : 'Set as Designer Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
