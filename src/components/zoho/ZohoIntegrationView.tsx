'use client';

import React, { useState } from 'react';
import {
  Kanban,
  Database,
  Clock,
  Lock,
  RefreshCw,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code,
  Copy,
  Sparkles,
} from 'lucide-react';

interface ZohoIntegrationViewProps {
  hasZohoAuthConnected: boolean;
  isSyncingZoho: boolean;
  zohoSchedule: any;
  setZohoSchedule: (val: any) => void;
  availableZohoProjects: any[];
  selectedZohoProjectIds: string[];
  zohoProjectSearch: string;
  setZohoProjectSearch: (val: string) => void;
  isSavingZohoProjects: boolean;
  customZohoProjId: string;
  setCustomZohoProjId: (val: string) => void;
  customZohoProjName: string;
  setCustomZohoProjName: (val: string) => void;
  zohoTokenInput: string;
  setZohoTokenInput: (val: string) => void;
  zohoRegionInput: 'us' | 'in' | 'eu' | 'au';
  setZohoRegionInput: (val: any) => void;
  zohoPortalInput: string;
  setZohoPortalInput: (val: string) => void;
  zohoClientIdInput: string;
  setZohoClientIdInput: (val: string) => void;
  zohoClientSecretInput: string;
  setZohoClientSecretInput: (val: string) => void;
  zohoErrorMessage: string | null;
  showAdvancedCredentials: boolean;
  setShowAdvancedCredentials: (val: boolean) => void;
  discoveredZohoFields: any[];
  customFieldsSchema?: any[];
  zohoRawItemReferences: string[];
  selectedRawTicketRef: string;
  setSelectedRawTicketRef: (val: string) => void;
  selectedRawPayload: any;
  isSavingSchedule: boolean;
  schemaFieldFilter: string;
  setSchemaFieldFilter: (val: string) => void;
  onSync: () => void;
  onSaveProjects: () => void;
  onToggleProject: (id: string) => void;
  onSelectAllProjects: () => void;
  onDeselectAllProjects: () => void;
  onSelectDefaultProjects: () => void;
  onAddCustomProject: () => void;
  onSaveSchedule: () => void;
  onSelectRawTicket: (ref: string) => void;
  onShowToast: (msg: string) => void;
}

export const ZohoIntegrationView: React.FC<ZohoIntegrationViewProps> = ({
  hasZohoAuthConnected,
  isSyncingZoho,
  zohoSchedule,
  setZohoSchedule,
  availableZohoProjects,
  selectedZohoProjectIds,
  zohoProjectSearch,
  setZohoProjectSearch,
  isSavingZohoProjects,
  customZohoProjId,
  setCustomZohoProjId,
  customZohoProjName,
  setCustomZohoProjName,
  zohoTokenInput,
  setZohoTokenInput,
  zohoRegionInput,
  setZohoRegionInput,
  zohoPortalInput,
  setZohoPortalInput,
  zohoClientIdInput,
  setZohoClientIdInput,
  zohoClientSecretInput,
  setZohoClientSecretInput,
  zohoErrorMessage,
  showAdvancedCredentials,
  setShowAdvancedCredentials,
  discoveredZohoFields,
  customFieldsSchema = [],
  zohoRawItemReferences,
  selectedRawTicketRef,
  setSelectedRawTicketRef,
  selectedRawPayload,
  isSavingSchedule,
  schemaFieldFilter,
  setSchemaFieldFilter,
  onSync,
  onSaveProjects,
  onToggleProject,
  onSelectAllProjects,
  onDeselectAllProjects,
  onSelectDefaultProjects,
  onAddCustomProject,
  onSaveSchedule,
  onSelectRawTicket,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'schema' | 'schedule' | 'auth'>('projects');
  const [schemaViewMode, setSchemaViewMode] = useState<'custom_layouts' | 'all_raw'>('custom_layouts');
  const [selectedFieldForOptions, setSelectedFieldForOptions] = useState<any | null>(null);
  const [currentOrigin, setCurrentOrigin] = useState<string>('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const redirectUri = currentOrigin
    ? `${currentOrigin}/oauth/callback`
    : 'https://rec-acts.vercel.app/oauth/callback';

  const accountsDomain =
    zohoRegionInput === 'in'
      ? 'https://accounts.zoho.in'
      : zohoRegionInput === 'eu'
      ? 'https://accounts.zoho.eu'
      : zohoRegionInput === 'au'
      ? 'https://accounts.zoho.com.au'
      : 'https://accounts.zoho.com';

  const effectiveClientId = (zohoClientIdInput && zohoClientIdInput.trim()) || '1000.O1OL92CNYEKKMU9P7ABHC4NNR9XJCP';
  const zohoAuthUrl = `${accountsDomain}/oauth/v2/auth?scope=ZohoSprints.fullaccess.ALL&client_id=${effectiveClientId}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}&prompt=consent`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">
              REST API Integration
            </span>
            {hasZohoAuthConnected ? (
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                ⚠️ Authorization Needed
              </span>
            )}
            {zohoSchedule?.autoSyncEnabled && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                ⏱️ Every {zohoSchedule.intervalMinutes}m
              </span>
            )}
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Zoho Sprints Sync &amp; Schema Inspector
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live ticket synchronization, project filtering, complete field schema analysis, and recurring scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onSync}
            disabled={isSyncingZoho}
            className="btn-modern-primary px-4 py-2 text-xs flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm shadow-indigo-600/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingZoho ? 'animate-spin' : ''}`} />
            <span>{isSyncingZoho ? 'Syncing...' : 'Sync Live Tickets Now'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200/50 dark:border-white/[0.06] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('projects')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'projects'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Kanban className="w-3.5 h-3.5" />
          <span>Projects Selection</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
            activeSubTab === 'projects' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 dark:bg-white/10 text-slate-300'
          }`}>
            {selectedZohoProjectIds.length} Selected
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('schema')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'schema'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Raw Fields &amp; Schema Explorer</span>
          {discoveredZohoFields.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${
              activeSubTab === 'schema' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 dark:bg-white/10 text-slate-300'
            }`}>
              {discoveredZohoFields.length} Fields
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('schedule')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'schedule'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Scheduled Auto-Sync</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
            zohoSchedule?.autoSyncEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-200 dark:bg-white/10 text-slate-400'
          }`}>
            {zohoSchedule?.autoSyncEnabled ? `${zohoSchedule.intervalMinutes}m` : 'Off'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('auth')}
          className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'auth'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Authentication &amp; Credentials</span>
        </button>
      </div>

      {/* Error Banner */}
      {zohoErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Zoho Sprints Synchronization Notice</h4>
            <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">{zohoErrorMessage}</p>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: PROJECTS SELECTION */}
      {activeSubTab === 'projects' && (
        <div className="space-y-4">
          <div className="modern-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={zohoProjectSearch}
                  onChange={(e) => setZohoProjectSearch(e.target.value)}
                  placeholder="Search 28+ projects by name, ID, or prefix..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={onSelectAllProjects}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-300 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={onDeselectAllProjects}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-300 transition-colors"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={onSelectDefaultProjects}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                >
                  Default 3
                </button>
                <button
                  type="button"
                  onClick={onSaveProjects}
                  disabled={isSavingZohoProjects}
                  className="btn-modern-primary px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                >
                  {isSavingZohoProjects ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Selection</span>
                </button>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {availableZohoProjects
                .filter((p) => {
                  if (!zohoProjectSearch.trim()) return true;
                  const q = zohoProjectSearch.toLowerCase();
                  return (
                    p.name?.toLowerCase().includes(q) ||
                    p.id?.toLowerCase().includes(q) ||
                    p.prefix?.toLowerCase().includes(q)
                  );
                })
                .map((proj) => {
                  const isSelected = selectedZohoProjectIds.includes(proj.id);
                  return (
                    <div
                      key={proj.id}
                      onClick={() => onToggleProject(proj.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-400 hover:border-slate-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer pointer-events-none"
                        />
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span className="text-slate-900 dark:text-white">{proj.name}</span>
                            {proj.prefix && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 dark:bg-white/10 text-slate-400 font-mono">
                                {proj.prefix}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            ID: {proj.id}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'text-slate-500'
                      }`}>
                        {isSelected ? 'Included' : 'Excluded'}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Add Custom Project */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={customZohoProjId}
                onChange={(e) => setCustomZohoProjId(e.target.value)}
                placeholder="Add Custom Zoho Project ID (e.g. 10130100000...)"
                className="flex-1 p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono text-xs outline-none"
              />
              <input
                type="text"
                value={customZohoProjName}
                onChange={(e) => setCustomZohoProjName(e.target.value)}
                placeholder="Project Label / Name"
                className="flex-1 p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none"
              />
              <button
                type="button"
                onClick={onAddCustomProject}
                className="btn-modern-secondary px-4 py-2.5 text-xs font-bold"
              >
                + Add Custom Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RAW FIELDS & SCHEMA EXPLORER */}
      {activeSubTab === 'schema' && (
        <div className="space-y-5">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="modern-card p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">Zoho Custom Fields (UDF)</p>
              <p className="text-2xl font-extrabold text-amber-400">{customFieldsSchema.length || discoveredZohoFields.filter((f: any) => f.fieldName.startsWith('UDF_')).length}</p>
              <p className="text-[11px] text-slate-500">Custom layout fields configured in Zoho Sprints</p>
            </div>
            <div className="modern-card p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Discovered Attributes</p>
              <p className="text-2xl font-extrabold text-indigo-400">{discoveredZohoFields.length}</p>
              <p className="text-[11px] text-slate-500">Unique attributes across all synced work items</p>
            </div>
            <div className="modern-card p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">Raw Item Payloads Stored</p>
              <p className="text-2xl font-extrabold text-purple-400">{zohoRawItemReferences.length}</p>
              <p className="text-[11px] text-slate-500">Lossless JSON snapshots persisted in database &amp; store</p>
            </div>
            <div className="modern-card p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">Core RecActs Mapped</p>
              <p className="text-2xl font-extrabold text-emerald-400">
                {discoveredZohoFields.filter((f: any) => f.isMappedToCoreDb).length}
              </p>
              <p className="text-[11px] text-slate-500">Mapped to PostgreSQL columns &amp; customFields JSON</p>
            </div>
          </div>

          {/* Segmented Control for Schema Mode */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-3">
            <button
              type="button"
              onClick={() => setSchemaViewMode('custom_layouts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                schemaViewMode === 'custom_layouts'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.03]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Custom Layouts &amp; Fields ({customFieldsSchema.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSchemaViewMode('all_raw')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                schemaViewMode === 'all_raw'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.03]'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>All Raw Attributes Dictionary ({discoveredZohoFields.length})</span>
            </button>
          </div>

          {/* VIEW A: CUSTOM LAYOUTS & FIELDS (UDF) */}
          {schemaViewMode === 'custom_layouts' && (
            <div className="modern-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Zoho Sprints Custom Layout &amp; Field Definitions</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Custom fields extracted from Zoho Sprints REST API (<code>/settings/customization/modules/fields</code> &amp; <code>/modules/formfields</code>).
                  </p>
                </div>
                <div className="relative w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={schemaFieldFilter}
                    onChange={(e) => setSchemaFieldFilter(e.target.value)}
                    placeholder="Search custom fields by name, UDF, or type..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none"
                  />
                </div>
              </div>

              {customFieldsSchema.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.08] space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-amber-400/60" />
                  <p className="text-xs font-semibold text-slate-300">No custom layout fields cached yet</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Click <strong>&quot;Sync Live Tickets&quot;</strong> to query Zoho Sprints formfields layouts and populate all custom user-defined fields (UDF).
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/[0.06]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="py-2.5 px-3">Field Label</th>
                        <th className="py-2.5 px-3">Zoho Parameter (UDF)</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Section / Project</th>
                        <th className="py-2.5 px-3">Configured Options</th>
                        <th className="py-2.5 px-3">Live Value ({selectedRawTicketRef || 'Selected Ticket'})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {customFieldsSchema
                        .filter((cf: any) => {
                          if (!schemaFieldFilter.trim()) return true;
                          const q = schemaFieldFilter.toLowerCase();
                          return (
                            cf.fieldName?.toLowerCase().includes(q) ||
                            cf.paramName?.toLowerCase().includes(q) ||
                            cf.fieldTypeName?.toLowerCase().includes(q) ||
                            cf.sectionName?.toLowerCase().includes(q)
                          );
                        })
                        .map((cf: any, idx: number) => {
                          const currentTicketVal = selectedRawPayload?._customFields?.[cf.paramName]?.displayValue ||
                            selectedRawPayload?.[cf.paramName];
                          const hasOptions = cf.options && cf.options.length > 0;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-semibold text-slate-200">
                                <div className="flex items-center gap-1.5">
                                  <span>{cf.fieldName}</span>
                                  {cf.isMandatory && (
                                    <span className="text-red-400 text-[10px]" title="Mandatory in Zoho Sprints">*</span>
                                  )}
                                </div>
                                {cf.tooltip && (
                                  <span className="text-[10px] text-slate-500 block truncate max-w-xs">{cf.tooltip}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                                {cf.paramName}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/20">
                                  {cf.fieldTypeName || 'Custom'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                {cf.sectionName || 'General'}
                                {cf.projectName && (
                                  <span className="text-[10px] text-slate-500 block">({cf.projectName})</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {hasOptions ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedFieldForOptions(cf)}
                                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-indigo-400 font-medium border border-slate-200 dark:border-white/[0.08]"
                                  >
                                    {cf.options.length} Choices ↗
                                  </button>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-[11px]">
                                {currentTicketVal !== undefined && currentTicketVal !== null && currentTicketVal !== '' && currentTicketVal !== '-1' ? (
                                  String(currentTicketVal).startsWith('http') ? (
                                    <a
                                      href={String(currentTicketVal)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-400 hover:underline flex items-center gap-1 truncate max-w-xs"
                                    >
                                      <span className="truncate">{String(currentTicketVal)}</span>
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded font-mono truncate inline-block max-w-xs">
                                      {String(currentTicketVal)}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW B: ALL RAW ATTRIBUTES DICTIONARY */}
          {schemaViewMode === 'all_raw' && (
            <div className="modern-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Zoho Sprints Item Attributes &amp; Field Dictionary</h3>
                  <p className="text-[11px] text-slate-400">All fields returned by Zoho Sprints item APIs, available for custom logic and feature expansion.</p>
                </div>
                <div className="relative w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={schemaFieldFilter}
                    onChange={(e) => setSchemaFieldFilter(e.target.value)}
                    placeholder="Filter fields by name or type..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/[0.06]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="py-2.5 px-3">Field Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Mapping in RecActs</th>
                      <th className="py-2.5 px-3">Live Sample Value from Zoho</th>
                      <th className="py-2.5 px-3 text-right">Coverage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                    {discoveredZohoFields
                      .filter((f: any) => {
                        if (!schemaFieldFilter.trim()) return true;
                        const q = schemaFieldFilter.toLowerCase();
                        return f.fieldName.toLowerCase().includes(q) || f.dataType.toLowerCase().includes(q);
                      })
                      .map((field: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-400">{field.fieldName}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/10 font-mono text-slate-300">
                              {field.dataType}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {field.isMappedToCoreDb ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                ✓ {field.mappedColumn}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-white/5 text-slate-400 font-normal">
                                Stored in rawPayload
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-400 truncate max-w-xs" title={String(field.sampleValue)}>
                            {String(field.sampleValue)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-400 text-[11px]">
                            {Math.round((field.presentCount / Math.max(1, field.totalItems)) * 100)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Interactive Raw Item Payload Viewer */}
          <div className="modern-card p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  <span>Live Raw Item Payload Viewer</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Inspect the exact, lossless JSON data structure for any synced Zoho Sprints ticket.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 font-semibold">Select Ticket:</label>
                <select
                  value={selectedRawTicketRef}
                  onChange={(e) => onSelectRawTicket(e.target.value)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs font-mono outline-none"
                >
                  {zohoRawItemReferences.map((ref) => (
                    <option key={ref} value={ref} className="bg-slate-900 text-white">
                      {ref}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedRawPayload) {
                      navigator.clipboard.writeText(JSON.stringify(selectedRawPayload, null, 2));
                      onShowToast('Copied raw JSON to clipboard!');
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto border border-slate-800">
              {selectedRawPayload
                ? JSON.stringify(selectedRawPayload, null, 2)
                : '// Click "Sync Live Tickets Now" to populate raw payloads'}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SCHEDULED AUTO-SYNC */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-5">
          <div className="modern-card p-6 space-y-5">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Recurring Automated Synchronization</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure periodic background fetching so tickets, sprint statuses, and member allocations are automatically kept in sync with Zoho Sprints.
              </p>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">Enable Background Auto-Sync</p>
                <p className="text-[11px] text-slate-500">Automatically poll Zoho Sprints at the configured interval</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={zohoSchedule?.autoSyncEnabled ?? true}
                  onChange={(e) => setZohoSchedule({ ...zohoSchedule, autoSyncEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Interval Options */}
            <div className="space-y-2">
              <label className="font-bold text-xs text-slate-300 block">Synchronization Interval</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { value: 15, label: 'Every 15 min', tag: 'High Frequency' },
                  { value: 30, label: 'Every 30 min', tag: 'Recommended' },
                  { value: 60, label: 'Every 1 hour', tag: 'Standard' },
                  { value: 120, label: 'Every 2 hours', tag: 'Balanced' },
                  { value: 360, label: 'Every 6 hours', tag: 'Low Impact' },
                  { value: 720, label: 'Every 12 hours', tag: 'Twice Daily' },
                  { value: 1440, label: 'Every 24 hours', tag: 'Daily' },
                ].map((opt) => {
                  const isSelected = Number(zohoSchedule?.intervalMinutes) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setZohoSchedule({ ...zohoSchedule, intervalMinutes: opt.value })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-400 hover:border-slate-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{opt.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Timing Summary Card */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Last Sync Status</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{zohoSchedule?.lastSyncStatus || 'Success'} ({zohoSchedule?.lastSyncedCount || 0} items)</span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Last Completed Run</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">
                  {zohoSchedule?.lastSyncTime ? new Date(zohoSchedule.lastSyncTime).toLocaleString() : 'Just now'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Next Scheduled Run</span>
                <span className="font-semibold text-indigo-300 mt-0.5 block">
                  {zohoSchedule?.autoSyncEnabled && zohoSchedule?.nextSyncTime
                    ? new Date(zohoSchedule.nextSyncTime).toLocaleTimeString()
                    : 'Paused'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onSaveSchedule}
                disabled={isSavingSchedule}
                className="btn-modern-primary px-5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-sm shadow-indigo-600/30"
              >
                {isSavingSchedule ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Schedule Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: AUTHENTICATION & CREDENTIALS */}
      {activeSubTab === 'auth' && (
        <div className="space-y-4">
          <div className="modern-card p-6 space-y-5">
            {/* Option A: 1-Click Browser Authorize */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Option A: 1-Click Browser Authorization (Recommended)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  Zero Manual Tokens
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Authorize RecActs with your registered Zoho Client (<strong>Kiru&apos;s BM Dashboard</strong>). Zoho will display a consent dialog; clicking &ldquo;Accept&rdquo; will automatically redirect to <code className="bg-black/30 px-1 py-0.5 rounded text-indigo-300 font-mono">/oauth/callback</code>, exchange the token, and save it permanently.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <a
                  href={zohoAuthUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-sm shadow-indigo-600/30 cursor-pointer w-fit"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Authorize with Zoho (Kiru&apos;s BM Dashboard)</span>
                </a>
                <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 w-fit">
                  <span className="text-slate-400">Callback:</span>
                  <code className="text-indigo-300 font-mono select-all">{redirectUri}</code>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined') {
                        navigator.clipboard.writeText(redirectUri);
                        onShowToast('Copied callback URL to clipboard!');
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Callback URL"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-indigo-300">💡 Important for Deployed App (Vercel):</p>
                <p>
                  Ensure <code className="bg-black/40 px-1 py-0.5 rounded text-indigo-200 font-mono">{redirectUri}</code> is registered under <strong>Authorized Redirect URIs</strong> for Client <code className="bg-black/40 px-1 py-0.5 rounded text-indigo-200 font-mono">{effectiveClientId}</code> in the <a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline font-semibold">Zoho API Console</a>.
                </p>
              </div>
            </div>

            {/* Option B: Self Client Code */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-4">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Option B: Paste Grant Code or Refresh Token</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] text-xs space-y-1.5 text-slate-400">
                <p className="font-semibold text-slate-300">How to generate a Grant Code in 30 seconds:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Open <a href="https://api-console.zoho.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">Zoho API Console</a>.</li>
                  <li>In the left sidebar, click <strong>Self Client</strong>.</li>
                  <li>Click the <strong>Generate Code</strong> tab, enter Scope: <code className="bg-black/30 px-1 py-0.5 rounded text-indigo-300 font-mono">ZohoSprints.fullaccess.ALL</code>, Duration: <strong>10 minutes</strong>, Description: <strong>RecActs</strong>, then click <strong>Create</strong>.</li>
                  <li>Copy the code and paste it below.</li>
                </ol>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300 text-xs">Grant Code / Permanent Refresh Token</label>
                <input
                  type="password"
                  value={zohoTokenInput}
                  onChange={(e) => setZohoTokenInput(e.target.value)}
                  placeholder="Paste code (1000.xxxx) or permanent refresh token here..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono text-xs outline-none placeholder-slate-500"
                />
              </div>

              {/* Advanced Client Credentials Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedCredentials(!showAdvancedCredentials)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <span>{showAdvancedCredentials ? '▼ Hide Client ID & Secret' : '▶ Custom Client ID & Secret (for Self Client)'}</span>
                </button>

                {showAdvancedCredentials && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-white/[0.06] animate-in fade-in">
                    <div>
                      <label className="font-semibold block mb-1 text-slate-400 text-xs">Client ID</label>
                      <input
                        type="text"
                        value={zohoClientIdInput}
                        onChange={(e) => setZohoClientIdInput(e.target.value)}
                        placeholder="1000.O1OL92CNYEKKMU9P7ABHC4NNR9XJCP"
                        className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1 text-slate-400 text-xs">Client Secret</label>
                      <input
                        type="password"
                        value={zohoClientSecretInput}
                        onChange={(e) => setZohoClientSecretInput(e.target.value)}
                        placeholder="85015712e3bbd0f9763d9ac4142370ca..."
                        className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono text-xs outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Region & Portal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Data Center Region</label>
                <select
                  value={zohoRegionInput}
                  onChange={(e) => setZohoRegionInput(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none"
                >
                  <option value="us">🇺🇸 US / Global (.zoho.com)</option>
                  <option value="in">🇮🇳 India (.zoho.in)</option>
                  <option value="eu">🇪🇺 Europe (.zoho.eu)</option>
                  <option value="au">🇦🇺 Australia (.zoho.com.au)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Portal / Team ID</label>
                <input
                  type="text"
                  value={zohoPortalInput}
                  onChange={(e) => setZohoPortalInput(e.target.value)}
                  placeholder="730202335"
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono text-xs outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Field Options Preview Modal */}
      {selectedFieldForOptions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="modern-card max-w-lg w-full max-h-[80vh] flex flex-col p-6 space-y-4 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{selectedFieldForOptions.fieldName}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedFieldForOptions.paramName} • {selectedFieldForOptions.fieldTypeName} ({selectedFieldForOptions.options?.length || 0} options)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFieldForOptions(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-1.5 max-h-96 pr-2">
              {selectedFieldForOptions.options?.map((opt: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-white/[0.03] text-xs"
                >
                  <span className="font-medium text-slate-200">{opt.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{opt.id}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFieldForOptions(null)}
                className="btn-modern-secondary px-4 py-1.5 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
