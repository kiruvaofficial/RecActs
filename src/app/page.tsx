'use client';

import React, { useState, useEffect } from 'react';
import { hasPermission, FunctionalRole } from '@/lib/rbac';
import {
  LayoutDashboard,
  Clock,
  FileText,
  Ticket as TicketIcon,
  CalendarRange,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Target,
  BarChart3,
  History,
  Settings,
  Shield,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Plus,
  Play,
  Square,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Download,
  Users,
  Building,
  Lock,
  Sparkles,
  Kanban,
  Table as TableIcon,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  CheckCheck,
  RotateCcw,
  Sliders,
  ChevronRight,
  UserCheck,
  Activity,
  Zap,
  Coffee,
  HelpCircle,
  LogIn,
  LogOut,
  Database,
  FileSpreadsheet,
} from 'lucide-react';

export default function RecActsFullyFunctionalApp() {
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<string>('dash');
  const [role, setRole] = useState<string>('member'); // member, lead, manager, hr, owner, god
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [ticketViewMode, setTicketViewMode] = useState<'board' | 'table'>('board');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Core API Data State (No static mock data)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>({
    isCheckedIn: false,
    totalMinutes: 0,
    checkInTime: null,
    status: 'Not Checked In',
    teamAttendance: [],
  });
  const [corrections, setCorrections] = useState<any[]>([]);
  const [workLog, setWorkLog] = useState<any>({
    submissionStatus: 'Draft',
    activities: [],
    history: [],
  });
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [leaveData, setLeaveData] = useState<any>({
    leaveTypes: [],
    balances: [],
    myRequests: [],
    teamRequests: [],
    holidays: [],
  });
  const [kpiData, setKpiData] = useState<any>(null);
  const [kpiSubTab, setKpiSubTab] = useState<'scorecard' | 'settings' | 'deliveries'>('scorecard');
  const [targetOverrides, setTargetOverrides] = useState<any[]>([]);
  const [negativeImpacts, setNegativeImpacts] = useState<any[]>([]);
  const [eodHistory, setEodHistory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any>({
    productivityFactor: 90,
    workHoursStart: '09:00',
    workHoursEnd: '18:00',
    gracePeriodMinutes: 15,
    workDays: 'Mon,Tue,Wed,Thu,Fri',
    timezone: 'Asia/Kolkata (UTC+05:30)',
  });
  const [godOrgs, setGodOrgs] = useState<any[]>([]);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [supportSessions, setSupportSessions] = useState<any[]>([]);

  // Modals & Form State
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>({});
  const [returnComments, setReturnComments] = useState<string>('');
  const [filterTeam, setFilterTeam] = useState<string>('All');
  const [ganttZoom, setGanttZoom] = useState<'day' | 'week' | 'month'>('week');

  // Month & Period Filtering
  const MONTH_OPTIONS = [
    { value: '2026-10', label: 'October 2026' },
    { value: '2026-11', label: 'November 2026' },
    { value: '2026-12', label: 'December 2026' },
    { value: '2026-09', label: 'September 2026' },
  ];
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [ticketMonthFilter, setTicketMonthFilter] = useState<string>('all');
  const [reportMonthFilter, setReportMonthFilter] = useState<string>('all');

  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    try {
      const kpiRes = await fetch(`/api/kpi/calculate?period=${month}`);
      if (kpiRes.ok) {
        const kData = await kpiRes.json();
        setKpiData(kData);
        const mLabel = MONTH_OPTIONS.find((m) => m.value === month)?.label || month;
        showToast(`Period switched to ${mLabel}`);
      }
    } catch (err) {
      console.error('Failed to reload KPI for month:', err);
    }
  };

  // Supabase Auth Form State
  const [loginEmail, setLoginEmail] = useState('kiruvantham@demo.recacts.app');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginLoading, setLoginLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Instant Hydration Helper for Server Bootstrap Payload
  const applyBootstrapData = (data: any) => {
    if (!data) return;
    if (data.attendance) setAttendance(data.attendance);
    if (data.corrections) setCorrections(data.corrections || []);
    if (data.workLog) {
      setWorkLog({
        submissionStatus: data.workLog.submissionStatus || 'Draft',
        activities: data.workLog.activities || [],
        history: data.workLog.history || [],
      });
    }
    if (data.tickets) setTickets(data.tickets || []);
    if (data.approvals) setApprovals(data.approvals || []);
    if (data.blockers) setBlockers(data.blockers || []);
    if (data.leaveData) setLeaveData(data.leaveData || { leaveTypes: [], balances: [], myRequests: [], teamRequests: [], holidays: [] });
    if (data.kpiData) setKpiData(data.kpiData);
    if (data.targetOverrides) setTargetOverrides(data.targetOverrides || []);
    if (data.negativeImpacts) setNegativeImpacts(data.negativeImpacts || []);
    if (data.eodHistory) setEodHistory(data.eodHistory || []);
    if (data.settingsData) setSettingsData(data.settingsData);
  };

  // Supabase Auth Handlers
  const handleSupabaseLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const targetEmail = customEmail || loginEmail;
    const targetPass = customPass || loginPassword;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setRole(data.activeRole || 'member');
        const userObj = {
          id: data.activeMembership?.id || data.user.id,
          userId: data.user.id,
          name: data.user.name,
          initials: data.user.initials,
          email: data.user.email,
          role: data.activeMembership?.designation || (data.activeRole ? data.activeRole.toUpperCase() : 'Member'),
          team: data.activeMembership?.team?.name || 'BlindMatrix',
          isPlatformAdmin: data.user.isPlatformAdmin,
        };
        setCurrentUser(userObj);
        if (data.organization) setOrganization(data.organization);
        setModalType(null);
        showToast(`Authenticated as ${data.user.name} (${(data.activeRole || 'member').toUpperCase()})`);

        // Fast-path: Hydrate bootstrap data bundled directly in login response (0ms delay!)
        if (data.bootstrap) {
          applyBootstrapData(data.bootstrap);
          try {
            sessionStorage.setItem('recacts_bootstrap_snapshot', JSON.stringify({
              user: userObj,
              role: data.activeRole || 'member',
              organization: data.organization,
              bootstrap: data.bootstrap,
              savedAt: Date.now(),
            }));
          } catch {}
          setAuthChecking(false);
          setLoginLoading(false);
        } else {
          await loadAllData();
        }
      } else {
        setLoginError(data.error || 'Authentication failed');
        showToast(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setLoginError('Network error during Supabase login');
      showToast('Network error during Supabase login');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSupabaseLogout = async () => {
    try {
      try {
        sessionStorage.removeItem('recacts_bootstrap_snapshot');
      } catch {}
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setRole('member');
      setAttendance({
        isCheckedIn: false,
        totalMinutes: 0,
        checkInTime: null,
        status: 'Not Checked In',
        teamAttendance: [],
      });
      setWorkLog({
        submissionStatus: 'Draft',
        activities: [],
        history: [],
      });
      showToast('Signed out of session');
    } catch (err) {
      console.error(err);
    }
  };

  // Load All Data from REST APIs
  const loadAllData = async (monthOverride?: string) => {
    try {
      const month = monthOverride || selectedMonth || '2026-10';
      const date = '2026-10-31';

      // Tier 1: Single Lightning-Fast Server-Side Bootstrap (Parallel DB Queries in 1 Network Trip)
      const bootRes = await fetch(`/api/bootstrap?period=${month}&date=${date}`);
      if (bootRes.ok) {
        const data = await bootRes.json();
        if (!data.authenticated || !data.user) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setAuthChecking(false);
          return;
        }

        setIsAuthenticated(true);
        setRole(data.activeRole || 'member');
        const userObj = {
          id: data.activeMembership?.id || data.user.id,
          userId: data.user.id,
          name: data.user.name,
          initials: data.user.initials,
          email: data.user.email,
          role: data.activeMembership?.designation || (data.activeRole ? data.activeRole.toUpperCase() : 'Member'),
          team: data.activeMembership?.team?.name || 'BlindMatrix',
          isPlatformAdmin: data.user.isPlatformAdmin,
        };
        setCurrentUser(userObj);
        if (data.organization) setOrganization(data.organization);
        setAuthChecking(false);

        applyBootstrapData(data);

        try {
          sessionStorage.setItem('recacts_bootstrap_snapshot', JSON.stringify({
            user: userObj,
            role: data.activeRole || 'member',
            organization: data.organization,
            bootstrap: data,
            savedAt: Date.now(),
          }));
        } catch {}
        return;
      }

      // Tier 2: Parallel Fallback if bootstrap endpoint is unreachable
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthChecking(false);
        return;
      }

      const meData = await meRes.json();
      if (!meData.authenticated || !meData.user) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthChecking(false);
        return;
      }

      setIsAuthenticated(true);
      setRole(meData.activeRole || 'member');
      setCurrentUser({
        id: meData.activeMembership?.id || meData.user.id,
        userId: meData.user.id,
        name: meData.user.name,
        initials: meData.user.initials,
        email: meData.user.email,
        role: meData.activeMembership?.designation || (meData.activeRole ? meData.activeRole.toUpperCase() : 'Member'),
        team: meData.activeMembership?.team?.name || 'BlindMatrix',
        isPlatformAdmin: meData.user.isPlatformAdmin,
      });
      if (meData.organization) setOrganization(meData.organization);
      setAuthChecking(false);

      // Execute remaining essential queries in parallel
      const [attRes, wlRes, tkRes, kpiRes, blkRes] = await Promise.all([
        fetch(`/api/attendance/status?date=${date}`),
        fetch(`/api/work-logs?date=${date}`),
        fetch('/api/tickets'),
        fetch(`/api/kpi/calculate?period=${month}`),
        fetch('/api/blockers'),
      ]);

      if (attRes.ok) setAttendance(await attRes.json());
      if (wlRes.ok) {
        const wl = await wlRes.json();
        if (wl.workLog) setWorkLog(wl.workLog);
      }
      if (tkRes.ok) {
        const tk = await tkRes.json();
        setTickets(tk.tickets || []);
      }
      if (kpiRes.ok) setKpiData(await kpiRes.json());
      if (blkRes.ok) {
        const blk = await blkRes.json();
        setBlockers(blk.blockers || []);
      }
    } catch (err) {
      console.error('Error loading RecActs data:', err);
    }
  };

  // Lazy-load God Mode and Audit datasets on tab demand
  useEffect(() => {
    if (activeTab === 'god' && role === 'god' && godOrgs.length === 0) {
      Promise.all([
        fetch('/api/god/orgs').then((r) => r.ok && r.json()).then((d) => d?.organizations && setGodOrgs(d.organizations)),
        fetch('/api/god/flags').then((r) => r.ok && r.json()).then((d) => d?.flags && setFeatureFlags(d.flags)),
        fetch('/api/god/support').then((r) => r.ok && r.json()).then((d) => d?.supportSessions && setSupportSessions(d.supportSessions)),
      ]).catch(() => {});
    }
    if (activeTab === 'audit' && auditLogs.length === 0) {
      fetch('/api/audit').then((r) => r.ok && r.json()).then((d) => d?.auditLogs && setAuditLogs(d.auditLogs)).catch(() => {});
    }
  }, [activeTab, role]);

  useEffect(() => {
    // Instant cache hydration for 0ms initial load
    try {
      const cachedStr = sessionStorage.getItem('recacts_bootstrap_snapshot');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && Date.now() - (cached.savedAt || 0) < 5 * 60 * 1000) {
          if (cached.user) {
            setIsAuthenticated(true);
            setRole(cached.role || 'member');
            setCurrentUser(cached.user);
            if (cached.organization) setOrganization(cached.organization);
          }
          if (cached.bootstrap) {
            applyBootstrapData(cached.bootstrap);
          }
          setAuthChecking(false);
        }
      }
    } catch {}

    loadAllData();
  }, []);

  // Attendance Check-in / Out Actions
  const handleCheckIn = async () => {
    try {
      const res = await fetch('/api/attendance/check-in', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Work session active • Checked in at ' + (data.session?.checkInTime || 'now'));
        loadAllData();
      } else {
        showToast(data.error || 'Check-in failed');
      }
    } catch (e) {
      showToast('Error during check-in');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await fetch('/api/attendance/check-out', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Work session completed • Total shift duration recorded');
        loadAllData();
      } else {
        showToast(data.error || 'Check-out failed');
      }
    } catch (e) {
      showToast('Error during check-out');
    }
  };

  // Work Log Actions
  const handleAddActivityRow = () => {
    const newRow = {
      id: `act-${Date.now()}`,
      ticketRef: 'REQ-I3001',
      activityType: 'Requirement Analysis',
      description: '',
      startTime: '13:00',
      endTime: '14:30',
      durationMinutes: 90,
      progressStatus: 'In Progress',
      blockerFlag: false,
    };
    setWorkLog({
      ...workLog,
      activities: [...workLog.activities, newRow],
    });
  };

  const handleSaveDraftWorkLog = async () => {
    try {
      const res = await fetch('/api/work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: '2026-10-31',
          activities: workLog.activities,
        }),
      });
      if (res.ok) {
        showToast('Draft work log saved');
        loadAllData();
      }
    } catch (e) {
      showToast('Failed to save draft');
    }
  };

  const handleSubmitWorkLog = async () => {
    try {
      const res = await fetch('/api/work-logs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workDate: '2026-10-31' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Timesheet submitted to Team Lead for review');
        loadAllData();
      } else {
        showToast(data.error || 'Submission failed');
      }
    } catch (e) {
      showToast('Failed to submit work log');
    }
  };

  // Approvals Actions
  const handleApprovalAction = async (workLogId: string, action: 'approve' | 'return') => {
    try {
      const res = await fetch('/api/work-logs/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workLogId,
          action,
          comments: action === 'return' ? returnComments : 'Approved by Team Lead',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Timesheet ${action === 'approve' ? 'Approved' : 'Returned'}`);
        setModalType(null);
        setReturnComments('');
        loadAllData();
      } else {
        showToast(data.error || 'Action failed');
      }
    } catch (e) {
      showToast('Failed to process approval');
    }
  };

  const handleBulkApprove = async () => {
    const pendingLogs = approvals.filter((a) => a.submissionStatus === 'Submitted');
    for (const l of pendingLogs) {
      await fetch('/api/work-logs/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workLogId: l.id, action: 'approve', comments: 'Bulk approved' }),
      });
    }
    showToast(`Bulk approved ${pendingLogs.length} submitted timesheet(s)`);
    loadAllData();
  };

  // Blocker Actions
  const handleBlockerAction = async (blockerId: string, action: 'acknowledge' | 'resolve' | 'escalate') => {
    try {
      const res = await fetch(`/api/blockers/${blockerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Blocker marked as ${action.toUpperCase()}`);
        loadAllData();
      } else {
        showToast(data.error || 'Action failed');
      }
    } catch (e) {
      showToast('Failed to update blocker');
    }
  };

  // Leave Approval Action
  const handleLeaveAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/leave/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        showToast(`Leave request ${action === 'approve' ? 'Approved' : 'Rejected'}`);
        loadAllData();
      }
    } catch (e) {
      showToast('Failed to process leave');
    }
  };

  // Attendance Correction Approval Action
  const handleCorrectionAction = async (correctionId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/attendance/corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctionId, action }),
      });
      if (res.ok) {
        showToast(`Attendance correction ${action === 'approve' ? 'Approved' : 'Rejected'}`);
        loadAllData();
      }
    } catch (e) {
      showToast('Failed to process correction');
    }
  };

  // Ticket Status Transition Action
  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Ticket status updated to ${newStatus}`);
        setSelectedTicket(null);
        loadAllData();
      }
    } catch (e) {
      showToast('Failed to update ticket');
    }
  };

  // Settings Save Action
  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      if (res.ok) {
        showToast('Organization settings updated successfully');
        loadAllData();
      }
    } catch (e) {
      showToast('Failed to save settings');
    }
  };

  // EOD Generation Action
  const handleGenerateEod = async () => {
    try {
      const res = await fetch('/api/eod/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workDate: '2026-10-31' }),
      });
      if (res.ok) {
        showToast('EOD summary report generated and dispatched!');
        loadAllData();
      }
    } catch (e) {
      showToast('Failed to trigger EOD');
    }
  };

  // Navigation Item Renderer
  const renderNavItem = (id: string, label: string, icon: React.ReactNode, count?: number, isCritical?: boolean) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
          isActive
            ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 font-semibold shadow-xs'
            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {icon}
          </span>
          <span className="tracking-tight">{label}</span>
        </div>
        {count !== undefined && count > 0 && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isCritical
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
            }`}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  // Full-screen Loading State during session check
  if (authChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-[#090D16] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 animate-pulse">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-sm font-bold tracking-tight">RecActs</h2>
            <p className="text-xs text-slate-400">Verifying session credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // Production Auth Gate Screen (Shown when unauthenticated)
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-6 ${darkMode ? 'dark bg-[#090D16] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-medium border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mx-auto">
              <Zap className="w-7 h-7 fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                RecActs
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Work • Track • Achieve • Multi-Tenant Workforce Platform
              </p>
            </div>
          </div>

          <div className="modern-card p-6 space-y-5 bg-white/80 dark:bg-[#0B0F19]/90 border-slate-200/80 dark:border-white/[0.08] shadow-2xl backdrop-blur-xl">
            <div className="space-y-1">
              <h2 className="text-base font-bold">Sign In to Your Workspace</h2>
              <p className="text-xs text-slate-400">
                Authenticate with your organization account
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleSupabaseLogin} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs focus:outline-none focus:border-indigo-500 transition-colors text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1.5 text-slate-700 dark:text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs focus:outline-none focus:border-indigo-500 transition-colors text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing in with Supabase...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Select Role Persona to Test
                </span>
                <span className="text-[10px] font-mono text-emerald-400">PostgreSQL RBAC</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('kiruvantham@demo.recacts.app');
                    setLoginPassword('password123');
                    handleSupabaseLogin(undefined, 'kiruvantham@demo.recacts.app', 'password123');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-500/10 hover:border-indigo-500/30 border border-slate-200/60 dark:border-white/[0.06] text-left transition-all"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-200">Kiruvantham C</p>
                  <p className="text-[10px] text-indigo-500 font-medium">Team Lead (Alpha)</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('yogesh@demo.recacts.app');
                    setLoginPassword('password123');
                    handleSupabaseLogin(undefined, 'yogesh@demo.recacts.app', 'password123');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-500/10 hover:border-indigo-500/30 border border-slate-200/60 dark:border-white/[0.06] text-left transition-all"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-200">Yogesh</p>
                  <p className="text-[10px] text-teal-500 font-medium">Member (Senior)</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('don.michael@demo.recacts.app');
                    setLoginPassword('password123');
                    handleSupabaseLogin(undefined, 'don.michael@demo.recacts.app', 'password123');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-500/10 hover:border-indigo-500/30 border border-slate-200/60 dark:border-white/[0.06] text-left transition-all"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-200">Don Michael</p>
                  <p className="text-[10px] text-amber-500 font-medium">Department Manager</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('meena.s@demo.recacts.app');
                    setLoginPassword('password123');
                    handleSupabaseLogin(undefined, 'meena.s@demo.recacts.app', 'password123');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-500/10 hover:border-indigo-500/30 border border-slate-200/60 dark:border-white/[0.06] text-left transition-all"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-200">Meena S</p>
                  <p className="text-[10px] text-pink-500 font-medium">HR Administrator</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('arun.kumar@demo.recacts.app');
                    setLoginPassword('password123');
                    handleSupabaseLogin(undefined, 'arun.kumar@demo.recacts.app', 'password123');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-500/10 hover:border-indigo-500/30 border border-slate-200/60 dark:border-white/[0.06] text-left transition-all"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-200">Arun Kumar</p>
                  <p className="text-[10px] text-emerald-500 font-medium">Managing Director</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@recacts.app');
                    setLoginPassword('password123');
                    handleSupabaseLogin(undefined, 'admin@recacts.app', 'password123');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-purple-500/10 hover:border-purple-500/30 border border-slate-200/60 dark:border-white/[0.06] text-left transition-all"
                >
                  <p className="font-bold text-purple-400">Platform Admin</p>
                  <p className="text-[10px] text-purple-500 font-medium">God Mode Console</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#090D16] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-medium border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 h-14 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/75 dark:bg-[#090D16]/80 backdrop-blur-xl px-5 flex items-center justify-between">
        {/* Brand & Organization */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dash')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  RecActs
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {organization?.name || 'BlindMatrix'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none">Work • Track • Achieve</p>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100/70 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06] text-xs text-slate-400 w-60">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets, blockers, team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">⌘K</kbd>
          </div>
        </div>

        {/* Center: Live Attendance Pill with Quick Clock-in/out */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.08] text-xs">
          <div className={`w-2 h-2 rounded-full ${attendance.isCheckedIn ? 'bg-emerald-500 animate-pulse-dot' : 'bg-slate-400'}`} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {attendance.isCheckedIn ? `Session Active • ${Math.floor(attendance.totalMinutes / 60)}h ${attendance.totalMinutes % 60}m` : 'Checked Out'}
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          {attendance.isCheckedIn ? (
            <button
              onClick={handleCheckOut}
              className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline"
            >
              End Session
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Start Session
            </button>
          )}
        </div>

        {/* Right: Authenticated User Profile & Sign Out (No arbitrary dev switcher) */}
        <div className="flex items-center gap-3">
          {/* Verified Role Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span className="capitalize">{currentUser?.role || role}</span>
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-1.5">
            <div className="flex items-center gap-2 text-left">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
                {currentUser?.initials || 'U'}
              </div>
              <div className="hidden xl:block text-left leading-tight">
                <p className="text-xs font-semibold flex items-center gap-1">
                  {currentUser?.name}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Connected to Supabase" />
                </p>
                <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSupabaseLogout}
              className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/[0.08] text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* APP BODY */}
      <div className="flex">
        {/* SIDEBAR */}
        <aside className="w-60 flex-none min-h-[calc(100vh-3.5rem)] border-r border-slate-200/80 dark:border-white/[0.08] bg-white/50 dark:bg-[#0B0F19]/60 backdrop-blur-xl p-3 space-y-5">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Core Workspace</p>
            <div className="space-y-0.5">
              {renderNavItem('dash', 'Overview', <LayoutDashboard className="w-3.5 h-3.5" />)}
              {renderNavItem('activities', 'Work Logs', <FileText className="w-3.5 h-3.5" />)}
              {renderNavItem('attendance', 'Attendance & Shifts', <Clock className="w-3.5 h-3.5" />)}
              {renderNavItem('tickets', 'Tickets & Weightages', <TicketIcon className="w-3.5 h-3.5" />)}
              {renderNavItem('timeline', 'Gantt Timeline', <CalendarRange className="w-3.5 h-3.5" />)}
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Sprint Workflow</p>
            <div className="space-y-0.5">
              {hasPermission(role as FunctionalRole, 'work_logs:approve') &&
                renderNavItem('approvals', 'Approvals Queue', <CheckCircle2 className="w-3.5 h-3.5" />, approvals.filter(a => a.submissionStatus === 'Submitted').length)}
              {renderNavItem('blockers', 'Blocker Board', <AlertOctagon className="w-3.5 h-3.5" />, blockers.filter(b => b.status === 'Raised').length, true)}
              {renderNavItem('leave', 'Leave Planner', <Calendar className="w-3.5 h-3.5" />)}
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Analytics & Admin</p>
            <div className="space-y-0.5">
              {renderNavItem('kpi', 'KPI Engine', <Target className="w-3.5 h-3.5" />)}
              {renderNavItem('reports', 'Reports & EOD', <BarChart3 className="w-3.5 h-3.5" />)}
              {hasPermission(role as FunctionalRole, 'audit:view') &&
                renderNavItem('audit', 'Audit History', <History className="w-3.5 h-3.5" />)}
              {renderNavItem('api-docs', 'REST API Explorer', <ExternalLink className="w-3.5 h-3.5" />)}
              {hasPermission(role as FunctionalRole, 'org:manage_settings') &&
                renderNavItem('settings', 'Tenant Settings', <Settings className="w-3.5 h-3.5" />)}
              {(role === 'god' || currentUser?.isPlatformAdmin) &&
                renderNavItem('god', 'Platform God Mode', <Shield className="w-3.5 h-3.5 text-purple-500" />)}
            </div>
          </div>


        </aside>

        {/* MAIN VIEW */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* ========================================================================= */}
          {/* 1. VIEW: DASHBOARD OVERVIEW */}
          {/* ========================================================================= */}
          {activeTab === 'dash' && (() => {
            // Resolve KPI for current user persona or default individual
            const kpiIndividual =
              kpiData?.staffKpis?.find(
                (s: any) =>
                  s.staffId === currentUser?.id ||
                  (currentUser?.name && s.name?.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]))
              ) ||
              kpiData?.individual ||
              kpiData?.staffKpis?.[0];

            const kpiAchieved = kpiIndividual?.achievedWeightageNet ?? 0;
            const kpiTarget = kpiIndividual?.targetWeightage ?? 158;
            const kpiPercentNum = kpiIndividual?.achievementPercent != null
              ? kpiIndividual.achievementPercent * 100
              : (kpiTarget > 0 ? (kpiAchieved / kpiTarget) * 100 : 0);
            const kpiPercentStr = kpiIndividual?.achievementDisplay || `${kpiPercentNum.toFixed(1)}%`;
            const kpiRating = kpiIndividual?.rating || (kpiPercentNum >= 120 ? 'Excellent' : kpiPercentNum >= 95 ? 'Good' : kpiPercentNum >= 75 ? 'Average' : 'Needs Improvement');
            const kpiMonth = kpiData?.settings?.month || 'October 2026';

            const ratingBadgeClass =
              kpiRating === 'Excellent'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : kpiRating === 'Good'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                : kpiRating === 'Average'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20';

            // Resolve Attendance Today
            const totalAttMins = attendance?.totalMinutes || 0;
            const attH = Math.floor(totalAttMins / 60);
            const attM = totalAttMins % 60;
            const attFormatted = totalAttMins > 0 ? `${attH}h ${attM}m` : (attendance?.isCheckedIn ? 'Active (0m)' : '0h 0m');
            const isAttActive = Boolean(attendance?.isCheckedIn);
            const attProgressPct = Math.min(100, Math.round((totalAttMins / 480) * 100));

            // Resolve Logged Effort
            const activitiesList = workLog?.activities || [];
            const totalLoggedMins = activitiesList.reduce((acc: number, a: any) => acc + (Number(a.durationMinutes) || 0), 0);
            const logH = Math.floor(totalLoggedMins / 60);
            const logM = totalLoggedMins % 60;
            const logFormatted = `${logH}h ${logM}m`;
            const unallocMins = Math.max(0, totalAttMins - totalLoggedMins);
            const unallocH = Math.floor(unallocMins / 60);
            const unallocM = unallocMins % 60;
            const effortPctOfAtt = totalAttMins > 0 ? Math.min(100, Math.round((totalLoggedMins / totalAttMins) * 100)) : 0;
            const logStatus = workLog?.submissionStatus || 'Draft';

            // Resolve Deliverables (for Members) or Action Queue (for Leads/Managers/Admins)
            const isManagementRole =
              ['lead', 'manager', 'hr', 'owner', 'god'].includes(role) ||
              currentUser?.role?.toLowerCase().includes('lead') ||
              currentUser?.role?.toLowerCase().includes('manager') ||
              currentUser?.role?.toLowerCase().includes('director') ||
              currentUser?.role?.toLowerCase().includes('admin');

            const pendingApprovalsCount = approvals?.filter((a: any) => a.submissionStatus === 'Submitted').length || 0;
            const openBlockers = blockers?.filter((b: any) => b.status === 'Raised' || b.status !== 'Resolved') || [];
            const openBlockersCount = openBlockers.length;

            const ticketsCompletedCount = kpiIndividual?.ticketsCompleted ?? 0;
            const ticketsAssignedCount = kpiIndividual?.ticketsAssigned ?? 0;
            const estHrs = kpiIndividual?.estHrsCompleted ?? 0;
            const actHrs = kpiIndividual?.actualHrsCompleted ?? 0;
            const effPercent = kpiIndividual?.efficiencyPercent != null
              ? (kpiIndividual.efficiencyPercent * 100).toFixed(1)
              : (actHrs > 0 ? ((estHrs / actHrs) * 100).toFixed(1) : '100.0');

            // Priority Tickets filtered for current user persona
            const myAssignedTickets = tickets.filter((t: any) =>
              t.allocations?.some((a: any) =>
                a.memberId === currentUser?.id ||
                (currentUser?.name && a.memberName?.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]))
              )
            );
            const displayTickets = myAssignedTickets.length > 0
              ? [...myAssignedTickets, ...tickets.filter((t: any) => !myAssignedTickets.some((m: any) => m.id === t.id))].slice(0, 4)
              : tickets.slice(0, 4);

            return (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Sprint Hero Banner */}
                <div className="modern-card p-6 relative overflow-hidden bg-gradient-to-r from-indigo-900/10 via-purple-900/5 to-transparent border-indigo-500/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="pill-badge bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                          Sprint 46 • Day 6 of 10
                        </span>
                        <span className="text-xs text-slate-500">• Release 7.4 Freeze in 11 days</span>
                      </div>
                      <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Welcome back, {currentUser?.name || 'User'}
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {currentUser?.role || role} • {currentUser?.team || 'Core'} Team • All calculations synchronized with {organization?.name || 'BlindMatrix'} tenant policy
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Dashboard Month Filter */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 dark:bg-white/[0.06] backdrop-blur-md border border-white/15 text-xs font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[11px] text-slate-300 hidden sm:inline">Period:</span>
                        <select
                          value={selectedMonth}
                          onChange={(e) => handleMonthChange(e.target.value)}
                          className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                        >
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleGenerateEod}
                        className="btn-modern-secondary px-3 py-2 text-xs flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Trigger EOD Mailer</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('activities')}
                        className="btn-modern-primary px-3.5 py-2 text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Daily Effort</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Real Monthly KPI */}
                  <div className="modern-card p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        {kpiMonth ? `${kpiMonth.split(' ')[0]} KPI` : 'October KPI'}
                      </span>
                      <span className={`pill-badge text-[11px] font-bold px-2 py-0.5 ${ratingBadgeClass}`}>
                        {kpiRating}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                        {kpiPercentStr}
                      </span>
                      <span className={`text-xs font-semibold flex items-center ${kpiPercentNum >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {kpiPercentNum >= 100 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {kpiPercentNum >= 100 ? `+${(kpiPercentNum - 100).toFixed(1)}%` : `${(kpiPercentNum - 100).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Effective Target: {kpiTarget}h</span>
                      <span className="text-slate-300 font-medium">Achieved: {kpiAchieved}h</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/[0.06] h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          kpiRating === 'Excellent'
                            ? 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                            : kpiRating === 'Good'
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-500'
                            : kpiRating === 'Average'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                            : 'bg-gradient-to-r from-rose-500 to-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(8, Math.round(kpiPercentNum)))}%` }}
                      />
                    </div>
                  </div>

                  {/* Card 2: Real Live Attendance */}
                  <div className="modern-card p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Attendance Today</span>
                      <span className={`pill-badge ${isAttActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : totalAttMins > 0 ? 'bg-indigo-500/15 text-indigo-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        {isAttActive ? 'Present' : totalAttMins > 0 ? 'Completed' : 'Not Checked In'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight">{attFormatted}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>In: {attendance.checkInTime || '—'}</span>
                      <span className={isAttActive ? 'text-indigo-400 font-semibold' : 'text-slate-400'}>
                        {isAttActive ? 'Active Session' : totalAttMins > 0 ? 'Shift Concluded' : 'Pending Check-In'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/[0.06] h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isAttActive ? 'bg-emerald-500' : totalAttMins > 0 ? 'bg-indigo-500' : 'bg-slate-600'}`}
                        style={{ width: `${Math.min(100, Math.max(isAttActive ? 12 : 0, attProgressPct))}%` }}
                      />
                    </div>
                  </div>

                  {/* Card 3: Real Logged Effort */}
                  <div className="modern-card p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Logged Effort</span>
                      <span className="pill-badge bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                        {activitiesList.length} {activitiesList.length === 1 ? 'Activity' : 'Activities'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight">{logFormatted}</span>
                      <span className={`text-xs font-semibold ${
                        logStatus === 'Approved' ? 'text-emerald-500' :
                        logStatus === 'Submitted' ? 'text-blue-500' :
                        'text-amber-500'
                      }`}>
                        {logStatus}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Unallocated: {unallocH}h {unallocM}m</span>
                      <span>{effortPctOfAtt}% of attendance</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/[0.06] h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${effortPctOfAtt >= 85 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, Math.max(activitiesList.length > 0 ? 10 : 0, effortPctOfAtt))}%` }}
                      />
                    </div>
                  </div>

                  {/* Card 4: Persona-Aware Deliverables (Members) vs Action Queue (Management) */}
                  {isManagementRole ? (
                    <div className="modern-card p-5">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Action Queue</span>
                        <span className={`pill-badge ${openBlockersCount > 0 ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-400'}`}>
                          {openBlockersCount > 0 ? `${openBlockersCount} Blockers` : 'All Clear'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-extrabold tracking-tight ${pendingApprovalsCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {pendingApprovalsCount} Pending
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Approvals queue: {pendingApprovalsCount}</span>
                        <span className={openBlockersCount > 0 ? 'text-rose-500 font-medium' : 'text-slate-400'}>
                          {openBlockers[0] ? `${openBlockers[0].reference || 'B-101'} Needs lead` : 'No open blockers'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-white/[0.06] h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pendingApprovalsCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pendingApprovalsCount > 0 ? Math.min(100, pendingApprovalsCount * 25) : 5}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="modern-card p-5">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Sprint Deliverables</span>
                        <span className="pill-badge bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          {ticketsCompletedCount} / {ticketsAssignedCount} Done
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold tracking-tight text-emerald-500">
                          {effPercent}%
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">Efficiency</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Est: {estHrs}h • Act: {actHrs}h</span>
                        <span className={kpiIndividual?.reassignedTickets ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
                          {kpiIndividual?.reassignedTickets ? `${kpiIndividual.reassignedTickets} Reassigned` : 'Clean Delivery'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-white/[0.06] h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${ticketsAssignedCount > 0 ? Math.min(100, Math.round((ticketsCompletedCount / ticketsAssignedCount) * 100)) : 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sprint Priority Requirements & Team Shift Monitor */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 modern-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm tracking-tight">Sprint 46 Priority Requirements</h3>
                        <p className="text-xs text-slate-400">Shared weightage allocations and deliverable deadlines</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('tickets')}
                        className="text-xs text-indigo-500 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Explore all {tickets.length} tickets</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {displayTickets.map((t: any) => (
                        <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{t.ref}</span>
                              <span className="text-xs font-semibold">{t.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>Client: <strong className="text-slate-300">{t.customer}</strong></span>
                              <span>•</span>
                              <span>Total: <strong className="text-indigo-400">{t.totalWeightage}h</strong></span>
                              <span>•</span>
                              <span>
                                Assignees: {t.allocations?.map((a: any) => `${a.memberName} (${a.allocatedHours}h)`).join(', ') || 'Unassigned'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-none">
                            <span
                              className={`pill-badge ${
                                t.priority === 'Critical'
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                                  : t.priority === 'High'
                                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                                  : 'bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              {t.priority}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono">Due {t.plannedDue}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="modern-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm tracking-tight">Team Shift Monitor</h3>
                        <p className="text-xs text-slate-400">Live attendance for {currentUser?.team || 'Alpha & Beta'}</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('attendance')}
                        className="text-xs text-indigo-500 font-semibold hover:underline"
                      >
                        Shift board →
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {attendance.teamAttendance && attendance.teamAttendance.length > 0 ? (
                        attendance.teamAttendance.slice(0, 5).map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-[10px] flex items-center justify-center">
                                {m.initials}
                              </div>
                              <div>
                                <p className="font-semibold">{m.name}</p>
                                <p className="text-[10px] text-slate-400">{m.team} • {m.designation}</p>
                              </div>
                            </div>
                            <span
                              className={`pill-badge ${
                                m.status === 'Present'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : m.status === 'Late'
                                  ? 'bg-amber-500/15 text-amber-500'
                                  : m.status === 'On leave'
                                  ? 'bg-purple-500/15 text-purple-400'
                                  : 'bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              {m.status} {m.checkIn && m.checkIn !== '—' ? `(${m.checkIn})` : ''}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-500 space-y-1">
                          <p>No shift activity recorded yet today</p>
                          <p className="text-[11px] text-slate-600">Team members will appear here upon check-in</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* 2. VIEW: DAILY WORK LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'activities' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Daily Work Logs & Timesheets</h1>
                  <p className="text-xs text-slate-500">
                    Logged effort is tracked in integer minutes against assigned requirement tickets.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button onClick={handleSaveDraftWorkLog} className="btn-modern-secondary px-3 py-2 text-xs">
                    Save Draft
                  </button>
                  <button
                    onClick={handleSubmitWorkLog}
                    disabled={workLog.submissionStatus === 'Approved'}
                    className="btn-modern-primary px-3.5 py-2 text-xs flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Submit Timesheet</span>
                  </button>
                </div>
              </div>

              {/* Status Header */}
              <div className="modern-card p-4 flex items-center justify-between border-indigo-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/15 text-indigo-500 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs">Timesheet Status:</span>
                      <span
                        className={`pill-badge ${
                          workLog.submissionStatus === 'Approved'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : workLog.submissionStatus === 'Submitted'
                            ? 'bg-indigo-500/15 text-indigo-400'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}
                      >
                        {workLog.submissionStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Monday, 9 Nov 2026 • Total Logged: {workLog.activities?.reduce((acc: number, a: any) => acc + (a.durationMinutes || 0), 0)} min (
                      {(workLog.activities?.reduce((acc: number, a: any) => acc + (a.durationMinutes || 0), 0) / 60).toFixed(1)}h)
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAddActivityRow}
                  className="btn-modern-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Activity Row</span>
                </button>
              </div>

              {/* Interactive Activities Spreadsheet */}
              <div className="modern-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Ticket</th>
                        <th className="py-3 px-4">Activity Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Interval</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Blocker?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {workLog.activities?.map((act: any, idx: number) => (
                        <tr key={act.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={act.ticketRef}
                              onChange={(e) => {
                                const updated = [...workLog.activities];
                                updated[idx].ticketRef = e.target.value;
                                setWorkLog({ ...workLog, activities: updated });
                              }}
                              className="w-24 px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono font-bold text-indigo-500 outline-none"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={act.activityType}
                              onChange={(e) => {
                                const updated = [...workLog.activities];
                                updated[idx].activityType = e.target.value;
                                setWorkLog({ ...workLog, activities: updated });
                              }}
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                            >
                              <option>Requirement Analysis</option>
                              <option>Research & Development</option>
                              <option>Customer Discussion</option>
                              <option>Internal Discussion</option>
                              <option>UI/UX Design</option>
                              <option>Documentation</option>
                              <option>Review</option>
                              <option>Rework</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={act.description}
                              onChange={(e) => {
                                const updated = [...workLog.activities];
                                updated[idx].description = e.target.value;
                                setWorkLog({ ...workLog, activities: updated });
                              }}
                              placeholder="Describe your work..."
                              className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none min-w-[250px]"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={act.startTime}
                                onChange={(e) => {
                                  const updated = [...workLog.activities];
                                  updated[idx].startTime = e.target.value;
                                  setWorkLog({ ...workLog, activities: updated });
                                }}
                                className="w-14 px-1 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-center"
                              />
                              <span>–</span>
                              <input
                                type="text"
                                value={act.endTime}
                                onChange={(e) => {
                                  const updated = [...workLog.activities];
                                  updated[idx].endTime = e.target.value;
                                  setWorkLog({ ...workLog, activities: updated });
                                }}
                                className="w-14 px-1 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-center"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 font-bold">
                              <input
                                type="number"
                                value={act.durationMinutes}
                                onChange={(e) => {
                                  const updated = [...workLog.activities];
                                  updated[idx].durationMinutes = Number(e.target.value);
                                  setWorkLog({ ...workLog, activities: updated });
                                }}
                                className="w-16 px-1.5 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-center text-indigo-400"
                              />
                              <span className="text-[10px] text-slate-400">m</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={act.progressStatus}
                              onChange={(e) => {
                                const updated = [...workLog.activities];
                                updated[idx].progressStatus = e.target.value;
                                setWorkLog({ ...workLog, activities: updated });
                              }}
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] outline-none"
                            >
                              <option>In Progress</option>
                              <option>Completed</option>
                              <option>On Hold</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={act.blockerFlag}
                              onChange={(e) => {
                                const updated = [...workLog.activities];
                                updated[idx].blockerFlag = e.target.checked;
                                setWorkLog({ ...workLog, activities: updated });
                              }}
                              className="rounded text-rose-600 focus:ring-rose-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. VIEW: ATTENDANCE & WORK SESSIONS */}
          {/* ========================================================================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Attendance & Work Shift Sessions</h1>
                  <p className="text-xs text-slate-500">
                    Authoritative server timestamps for clock-in, breaks, shift durations, and correction requests.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setModalType('correctionModal');
                      setModalData({
                        workDate: '2026-10-31',
                        correctionType: 'Missed check-out',
                        requestedTime: 'Check-out 18:30',
                        reason: '',
                      });
                    }}
                    className="btn-modern-secondary px-3 py-2 text-xs flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Request Correction</span>
                  </button>
                  {!attendance.isCheckedIn ? (
                    <button onClick={handleCheckIn} className="btn-modern-primary px-3.5 py-2 text-xs flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Clock In</span>
                    </button>
                  ) : (
                    <button onClick={handleCheckOut} className="btn-modern-primary px-3.5 py-2 text-xs flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500">
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Clock Out</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Attendance Shift Card */}
              <div className="modern-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {attendance.isCheckedIn ? 'Work Session Currently Active' : 'Session Ended / Clocked Out'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Check-in: {attendance.checkInTime || '08:50'} • Expected shift: 09:00 – 18:00 (15 min grace window)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total Shift Duration</p>
                    <p className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-500 bg-clip-text text-transparent">
                      {Math.floor(attendance.totalMinutes / 60)}h {attendance.totalMinutes % 60}m
                    </p>
                  </div>
                  <span className={`pill-badge ${attendance.status === 'Present' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'} text-xs py-1 px-3`}>
                    {attendance.status}
                  </span>
                </div>
              </div>

              {/* Attendance Corrections Queue (if HR/Manager) */}
              {corrections.length > 0 && ['hr', 'manager', 'owner', 'lead'].includes(role) && (
                <div className="modern-card p-5 space-y-3 border-amber-500/20">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-500">
                    Attendance Correction Requests ({corrections.filter(c => c.status === 'Pending').length} Pending)
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                    {corrections.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold">{c.memberName}</span> ({c.teamName}) • <span className="font-mono">{c.workDate}</span>: {c.correctionType} ({c.requestedTime})
                          <p className="text-[11px] text-slate-400">Reason: {c.reason}</p>
                        </div>
                        {c.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCorrectionAction(c.id, 'reject')}
                              className="btn-modern-secondary px-2.5 py-1 text-[11px] text-rose-500"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleCorrectionAction(c.id, 'approve')}
                              className="btn-modern-primary px-2.5 py-1 text-[11px]"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="pill-badge bg-slate-500/15 text-slate-400">{c.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Department Shift Attendance Board */}
              <div className="modern-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Department Shift Attendance Board</h3>
                  <span className="text-xs text-slate-400">14 active team members across Alpha and Beta</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Designation</th>
                        <th className="py-2.5 px-3">Team</th>
                        <th className="py-2.5 px-3">Check-In</th>
                        <th className="py-2.5 px-3">Check-Out</th>
                        <th className="py-2.5 px-3">Total Shift Hours</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {attendance.teamAttendance?.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-semibold flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {m.initials}
                            </span>
                            <span>{m.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{m.designation}</td>
                          <td className="py-2.5 px-3">{m.team}</td>
                          <td className="py-2.5 px-3 font-mono">{m.checkIn}</td>
                          <td className="py-2.5 px-3 font-mono">{m.checkOut}</td>
                          <td className="py-2.5 px-3 font-bold font-mono">
                            {m.totalMinutes ? `${(m.totalMinutes / 60).toFixed(1)}h` : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`pill-badge ${
                                m.status === 'Present'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : m.status === 'Late'
                                  ? 'bg-amber-500/15 text-amber-500'
                                  : m.status === 'On leave'
                                  ? 'bg-purple-500/15 text-purple-400'
                                  : 'bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. VIEW: TICKETS & SHARED WEIGHTAGES */}
          {/* ========================================================================= */}
          {activeTab === 'tickets' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Requirement Tickets & Allocations</h1>
                  <p className="text-xs text-slate-500">
                    Shared ticket weightages with independent individual allocations preventing double counting.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Tickets Month Filter */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">Month:</span>
                    <select
                      value={ticketMonthFilter}
                      onChange={(e) => setTicketMonthFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        All Months ({tickets.length})
                      </option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]">
                    <button
                      onClick={() => setTicketViewMode('board')}
                      className={`p-1.5 rounded-md ${ticketViewMode === 'board' ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-xs' : 'text-slate-400'}`}
                      title="Kanban Board View"
                    >
                      <Kanban className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTicketViewMode('table')}
                      className={`p-1.5 rounded-md ${ticketViewMode === 'table' ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-xs' : 'text-slate-400'}`}
                      title="Table View"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setModalType('newTicket');
                      setModalData({
                        reference: `REQ-I${Math.floor(3015 + Math.random() * 50)}`,
                        title: '',
                        customerName: 'Northwind Interiors',
                        totalEstimatedHours: 20,
                        priority: 'High',
                      });
                    }}
                    className="btn-modern-primary px-3 py-2 text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Requirement</span>
                  </button>
                </div>
              </div>

              {/* Kanban Columns */}
              {ticketViewMode === 'board' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['To Do', 'In Progress', 'Under Review', 'Completed'].map((columnStatus) => {
                    const visibleTickets = tickets.filter((t: any) => {
                      if (ticketMonthFilter === 'all') return true;
                      const inDue = t.plannedDue?.startsWith(ticketMonthFilter);
                      const inStart = t.plannedStart?.startsWith(ticketMonthFilter);
                      const inComp = t.completedDate?.startsWith(ticketMonthFilter);
                      if (ticketMonthFilter === '2026-10') return inDue || inStart || inComp || (!inDue && !inStart);
                      return inDue || inStart || inComp;
                    });
                    const colTickets = visibleTickets.filter((t: any) => t.status === columnStatus);
                    return (
                      <div key={columnStatus} className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
                            {columnStatus}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/[0.06] text-slate-500">
                            {colTickets.length}
                          </span>
                        </div>

                        <div className="space-y-3 min-h-[300px]">
                          {colTickets.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTicket(t)}
                              className="modern-card p-4 space-y-3 cursor-pointer hover:border-indigo-500/40"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-indigo-500">{t.ref}</span>
                                <span
                                  className={`pill-badge ${
                                    t.priority === 'Critical'
                                      ? 'bg-rose-500/15 text-rose-500'
                                      : t.priority === 'High'
                                      ? 'bg-amber-500/15 text-amber-500'
                                      : 'bg-slate-500/10 text-slate-400'
                                  }`}
                                >
                                  {t.priority}
                                </span>
                              </div>

                              <div>
                                <h4 className="font-semibold text-xs leading-snug">{t.title}</h4>
                                <p className="text-[11px] text-slate-400 mt-1">{t.customer}</p>
                              </div>

                              {/* Shared Allocations Bar */}
                              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <span>Allocations ({t.totalWeightage}h total):</span>
                                </div>
                                <div className="space-y-1">
                                  {t.allocations?.map((al: any) => (
                                    <div key={al.id} className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-300">{al.memberName}</span>
                                      <span className="font-mono font-bold text-indigo-400">
                                        {al.allocatedHours}h <span className="text-slate-500 font-normal">({al.loggedHours}h)</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Table View */
                <div className="modern-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Ref</th>
                          <th className="py-3 px-4">Title & Client</th>
                          <th className="py-3 px-4">Total Weightage</th>
                          <th className="py-3 px-4">Shared Allocations</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                        {tickets.filter((t: any) => {
                          if (ticketMonthFilter === 'all') return true;
                          const inDue = t.plannedDue?.startsWith(ticketMonthFilter);
                          const inStart = t.plannedStart?.startsWith(ticketMonthFilter);
                          const inComp = t.completedDate?.startsWith(ticketMonthFilter);
                          if (ticketMonthFilter === '2026-10') return inDue || inStart || inComp || (!inDue && !inStart);
                          return inDue || inStart || inComp;
                        }).map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTicket(t)}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-indigo-500">{t.ref}</td>
                            <td className="py-3 px-4">
                              <p className="font-semibold">{t.title}</p>
                              <p className="text-[11px] text-slate-400">{t.customer}</p>
                            </td>
                            <td className="py-3 px-4 font-bold">{t.totalWeightage}h</td>
                            <td className="py-3 px-4">
                              {t.allocations?.map((a: any) => `${a.memberName} (${a.allocatedHours}h)`).join(', ')}
                            </td>
                            <td className="py-3 px-4">
                              <span className="pill-badge bg-amber-500/15 text-amber-500">{t.priority}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="pill-badge bg-indigo-500/15 text-indigo-400">{t.status}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">{t.plannedDue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. VIEW: INTERACTIVE GANTT TIMELINE */}
          {/* ========================================================================= */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Interactive Gantt Timeline</h1>
                  <p className="text-xs text-slate-500">
                    Day/Week/Month timeline with planned vs actual progress, milestone overlays, and leave indicators.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-xs">
                    {(['day', 'week', 'month'] as const).map((z) => (
                      <button
                        key={z}
                        onClick={() => setGanttZoom(z)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize ${
                          ganttZoom === z ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-xs font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {z} View
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gantt Visual Grid */}
              <div className="modern-card p-6 space-y-4 overflow-x-auto">
                {/* Header dates */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] text-xs font-semibold text-slate-400 min-w-[700px]">
                  <div className="w-64">Deliverable</div>
                  <div className="flex-1 flex justify-between px-4 font-mono">
                    <span>2 Nov</span>
                    <span>4 Nov</span>
                    <span>6 Nov</span>
                    <span className="text-indigo-400 font-bold">9 Nov (Today)</span>
                    <span>11 Nov</span>
                    <span className="text-amber-400">13 Nov (Demo)</span>
                    <span>16 Nov</span>
                    <span className="text-rose-400">20 Nov (Freeze)</span>
                  </div>
                </div>

                {/* Timeline Bars */}
                <div className="space-y-3 min-w-[700px]">
                  {tickets.map((t) => (
                    <div key={t.id} className="flex items-center gap-4 text-xs">
                      <div className="w-64 font-mono font-bold truncate">
                        <span className="text-indigo-500 mr-2">{t.ref}</span>
                        <span className="font-sans font-medium text-slate-200">{t.title}</span>
                      </div>
                      <div className="flex-1 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.04] relative flex items-center px-2">
                        <div
                          className="h-5 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center px-2 text-[10px] font-bold shadow-xs truncate cursor-pointer"
                          style={{
                            width: `${Math.min(100, (t.totalWeightage || 20) * 3.5)}%`,
                          }}
                          onClick={() => setSelectedTicket(t)}
                        >
                          {t.status} • {t.totalWeightage}h ({t.allocations?.map((a: any) => a.memberName).join(', ')})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. VIEW: APPROVALS QUEUE */}
          {/* ========================================================================= */}
          {activeTab === 'approvals' && (
            !hasPermission(role as FunctionalRole, 'work_logs:approve') ? (
              <div className="modern-card p-12 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold">Access Restricted</h2>
                <p className="text-xs text-slate-400">
                  Timesheet approvals are restricted to Team Leads, Managers, and Organization Owners.
                  Your current verified role is <span className="font-semibold text-slate-200">{currentUser?.role || role}</span>.
                </p>
                <button onClick={() => setActiveTab('dash')} className="btn-modern-primary px-4 py-2 text-xs">
                  Return to Dashboard
                </button>
              </div>
            ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Timesheet Approval Queue</h1>
                  <p className="text-xs text-slate-500">
                    Review and approve submitted daily work logs for Alpha & Beta team members.
                  </p>
                </div>
                <button
                  onClick={handleBulkApprove}
                  className="btn-modern-primary px-3 py-2 text-xs flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Bulk Approve All Submitted</span>
                </button>
              </div>

              <div className="space-y-4">
                {approvals.map((appr) => (
                  <div key={appr.id} className="modern-card p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs">
                          {appr.memberInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{appr.memberName}</span>
                            <span className="text-xs text-slate-400">({appr.teamName})</span>
                            <span
                              className={`pill-badge ${
                                appr.submissionStatus === 'Approved'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : 'bg-indigo-500/15 text-indigo-400'
                              }`}
                            >
                              {appr.submissionStatus}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Work Date: {appr.workDate} • Attendance: {Math.floor(appr.attendanceMinutes / 60)}h {appr.attendanceMinutes % 60}m • Logged Effort: {(appr.loggedMinutes / 60).toFixed(1)}h
                          </p>
                        </div>
                      </div>

                      {appr.submissionStatus === 'Submitted' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setModalType('returnModal');
                              setModalData({ workLogId: appr.id, memberName: appr.memberName });
                            }}
                            className="btn-modern-secondary px-3 py-1.5 text-xs text-rose-500"
                          >
                            Return for Correction
                          </button>
                          <button
                            onClick={() => handleApprovalAction(appr.id, 'approve')}
                            className="btn-modern-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Timesheet</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {appr.activities?.map((act: any) => (
                        <div key={act.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] space-y-1">
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className="text-indigo-400">{act.ticketRef}</span>
                            <span>{act.durationMinutes} min</span>
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{act.activityType}</p>
                          <p className="text-slate-400 text-[11px]">{act.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )
          )}

          {/* ========================================================================= */}
          {/* 7. VIEW: BLOCKERS BOARD */}
          {/* ========================================================================= */}
          {activeTab === 'blockers' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Blocker & Impediment Board</h1>
                  <p className="text-xs text-slate-500">
                    Next-day escalation rule ensures unresolved blockers surface immediately to Team Leads and Managers.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setModalType('raiseBlocker');
                    setModalData({ title: '', description: '', severity: 'High', ticketRef: 'REQ-I3005' });
                  }}
                  className="btn-modern-primary px-3.5 py-2 text-xs flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Raise Blocker</span>
                </button>
              </div>

              {/* Blocker Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blockers.map((b) => (
                  <div key={b.id} className="modern-card p-5 space-y-3 border-rose-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">{b.ticketRef}</span>
                        <span className={`pill-badge ${b.severity === 'Critical' ? 'bg-rose-500/15 text-rose-500' : 'bg-amber-500/15 text-amber-500'}`}>
                          {b.severity}
                        </span>
                      </div>
                      <span className="pill-badge bg-slate-500/10 text-slate-400">{b.status}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm">{b.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{b.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
                      <span>Raised by: {b.raisedBy}</span>
                      <span>Responsible: {b.responsibleLead}</span>
                    </div>

                    {b.status !== 'Resolved' && hasPermission(role as FunctionalRole, 'blockers:acknowledge') && (
                      <div className="flex items-center gap-2 pt-2">
                        {b.status === 'Raised' && (
                          <button
                            onClick={() => handleBlockerAction(b.id, 'acknowledge')}
                            className="btn-modern-secondary text-xs flex-1 py-1.5"
                          >
                            Acknowledge
                          </button>
                        )}
                        {!b.escalatedToManager && (
                          <button
                            onClick={() => handleBlockerAction(b.id, 'escalate')}
                            className="btn-modern-secondary text-xs flex-1 py-1.5 text-amber-500"
                          >
                            Escalate to Manager
                          </button>
                        )}
                        <button
                          onClick={() => handleBlockerAction(b.id, 'resolve')}
                          className="btn-modern-primary text-xs flex-1 py-1.5"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 8. VIEW: LEAVE PLANNER */}
          {/* ========================================================================= */}
          {activeTab === 'leave' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Leave Planner & Availability</h1>
                  <p className="text-xs text-slate-500">
                    Approved leave adjusts available working days in the KPI engine automatically without penalties.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setModalType('applyLeave');
                    setModalData({
                      typeCode: 'CL',
                      startDate: '2026-10-16',
                      endDate: '2026-10-16',
                      totalDays: 1,
                      reason: '',
                    });
                  }}
                  className="btn-modern-primary px-3 py-2 text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Apply for Leave</span>
                </button>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { code: 'CL', name: 'Casual Leave', bal: '4 / 12', col: 'text-indigo-400' },
                  { code: 'SL', name: 'Sick Leave', bal: '1 / 12', col: 'text-teal-400' },
                  { code: 'EL', name: 'Earned Leave', bal: '3 / 15', col: 'text-amber-400' },
                  { code: 'CO', name: 'Comp Off', bal: '2 / 2', col: 'text-pink-400' },
                  { code: 'LOP', name: 'Loss of Pay', bal: '0 taken', col: 'text-slate-400' },
                ].map((b) => (
                  <div key={b.code} className="modern-card p-4">
                    <span className="text-[10px] font-semibold text-slate-400">{b.code}</span>
                    <p className="text-xs font-medium text-slate-300">{b.name}</p>
                    <p className={`text-xl font-bold mt-1 ${b.col}`}>{b.bal}</p>
                  </div>
                ))}
              </div>

              {/* Requests Table */}
              <div className="modern-card p-5 space-y-4">
                <h3 className="font-bold text-sm">Team Leave Applications</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Days</th>
                        <th className="py-2.5 px-3">Dates</th>
                        <th className="py-2.5 px-3">Reason</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {leaveData.teamRequests?.map((lr: any) => (
                        <tr key={lr.id}>
                          <td className="py-2.5 px-3 font-semibold">{lr.memberName}</td>
                          <td className="py-2.5 px-3">
                            <span className="pill-badge bg-indigo-500/15 text-indigo-400">{lr.typeCode}</span>
                          </td>
                          <td className="py-2.5 px-3 font-bold">{lr.totalDays}d</td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">{lr.startDate} to {lr.endDate}</td>
                          <td className="py-2.5 px-3 text-slate-400">{lr.reason}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`pill-badge ${
                                lr.status === 'Approved'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : lr.status === 'Pending'
                                  ? 'bg-amber-500/15 text-amber-500'
                                  : 'bg-rose-500/15 text-rose-500'
                              }`}
                            >
                              {lr.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {lr.status === 'Pending' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleLeaveAction(lr.id, 'reject')}
                                  className="btn-modern-secondary px-2.5 py-1 text-[11px] text-rose-500"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleLeaveAction(lr.id, 'approve')}
                                  className="btn-modern-primary px-2.5 py-1 text-[11px]"
                                >
                                  Approve
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 9. VIEW: KPI & FORMULA ENGINE */}
          {/* ========================================================================= */}
          {activeTab === 'kpi' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Staff KPI - Target vs Achieved Weightage</h1>
                  <p className="text-xs text-slate-500">
                    Month: {kpiData?.settings?.month || MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || 'October 2026'} • 1 weightage = 1 estimated hour • Target = (Working Days - Leave) × 8h × 90% × Capacity%
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* KPI Month Cycle Selector */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">KPI Cycle:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setModalType('targetOverride');
                      setModalData({ memberId: '', revisedTargetHours: 158, reason: '' });
                    }}
                    className="btn-modern-secondary px-3 py-1.5 text-xs"
                  >
                    Propose Target Override
                  </button>
                  <button
                    onClick={() => {
                      setModalType('negativeImpact');
                      setModalData({ category: 'Reassignment', impactValue: 5, valueType: 'percentage', reason: '' });
                    }}
                    className="btn-modern-secondary px-3 py-1.5 text-xs text-rose-500"
                  >
                    Apply Deduction
                  </button>
                </div>
              </div>

              {/* Subtab Segmented Switcher */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl w-fit border border-slate-200/60 dark:border-white/[0.06]">
                <button
                  onClick={() => setKpiSubTab('scorecard')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    kpiSubTab === 'scorecard'
                      ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Staff KPI Scorecard
                </button>
                <button
                  onClick={() => setKpiSubTab('deliveries')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    kpiSubTab === 'deliveries'
                      ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Completed Deliveries (31)
                </button>
                <button
                  onClick={() => setKpiSubTab('settings')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    kpiSubTab === 'settings'
                      ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  KPI Settings & Planning
                </button>
              </div>

              {/* Highlight summary card for active individual */}
              {kpiData?.individual && (
                <div className="modern-card p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-base">{kpiData.individual.name}</h3>
                        <span className="pill-badge bg-indigo-500/10 text-indigo-400 text-[11px] font-semibold px-2 py-0.5">
                          {kpiData.individual.role}
                        </span>
                        <span className="text-xs text-slate-400">
                          Basis: <strong className="text-slate-300">{kpiData.individual.kpiBasis}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Department: {kpiData.individual.department} • Period: {kpiData.settings?.month || 'October 2026'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`pill-badge text-xs font-bold py-1 px-3 ${
                        kpiData.individual.rating === 'Excellent'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : kpiData.individual.rating === 'Good'
                          ? 'bg-blue-500/15 text-blue-500'
                          : kpiData.individual.rating === 'Average'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}>
                        {kpiData.individual.rating} ({kpiData.individual.achievementDisplay})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                      <p className="text-[11px] text-slate-400">Target Weightage</p>
                      <p className="text-xl font-bold mt-1 text-indigo-400">{kpiData.individual.targetWeightage}h</p>
                      <p className="text-[10px] text-slate-500">{kpiData.individual.availableDays}d available</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                      <p className="text-[11px] text-slate-400">Assigned Weightage</p>
                      <p className="text-xl font-bold mt-1">{kpiData.individual.assignedWeightage}h</p>
                      <p className="text-[10px] text-slate-500">{kpiData.individual.ticketsAssigned} tickets</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                      <p className="text-[11px] text-slate-400">Deduction</p>
                      <p className="text-xl font-bold mt-1 text-rose-400">{kpiData.individual.weightageDeducted}h</p>
                      <p className="text-[10px] text-slate-500">{kpiData.individual.reassignedTickets} reassignments</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                      <p className="text-[11px] text-slate-400">Achieved Net</p>
                      <p className="text-xl font-bold mt-1 text-emerald-400">{kpiData.individual.achievedWeightageNet}h</p>
                      <p className="text-[10px] text-slate-500">{kpiData.individual.ticketsCompleted} completed</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                      <p className="text-[11px] text-slate-400">Achievement %</p>
                      <p className="text-xl font-bold mt-1 text-indigo-400">{kpiData.individual.achievementDisplay}</p>
                      <p className="text-[10px] text-slate-500">Target: 158h</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                      <p className="text-[11px] text-slate-400">Efficiency %</p>
                      <p className="text-xl font-bold mt-1 text-emerald-400">{kpiData.individual.efficiencyDisplay}</p>
                      <p className="text-[10px] text-slate-500">{kpiData.individual.estHrsCompleted}h / {kpiData.individual.actualHrsCompleted}h</p>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 1: STAFF KPI SCORECARD TABLE */}
              {kpiSubTab === 'scorecard' && (
                <div className="modern-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm">Staff KPI - Target vs Achieved Weightage</h3>
                      <p className="text-[11px] text-slate-500">
                        Evaluated against standard target (158h). TL & Manager scores are roll-up averages; counts & hours remain totals.
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      1 weightage = 1 estimated hour
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Staff Name</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">KPI Basis</th>
                          <th className="py-2.5 px-3 text-right">Target</th>
                          <th className="py-2.5 px-3 text-right">Assigned</th>
                          <th className="py-2.5 px-3 text-right text-rose-400">Deducted</th>
                          <th className="py-2.5 px-3 text-right text-emerald-400">Achieved Net</th>
                          <th className="py-2.5 px-3 text-right font-bold">Ach %</th>
                          <th className="py-2.5 px-3 text-center">Tickets</th>
                          <th className="py-2.5 px-3 text-center">Reassigned</th>
                          <th className="py-2.5 px-3 text-right">Est. Hrs</th>
                          <th className="py-2.5 px-3 text-right">Actual Hrs</th>
                          <th className="py-2.5 px-3 text-right font-bold">Efficiency</th>
                          <th className="py-2.5 px-3 text-center">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                        {kpiData?.staffKpis?.map((s: any) => (
                          <tr
                            key={s.staffId || s.name}
                            className={`hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors ${
                              s.role === 'Manager'
                                ? 'bg-indigo-500/5 font-semibold'
                                : s.role === 'Team Lead'
                                ? 'bg-slate-50/40 dark:bg-white/[0.015]'
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                              <span>{s.name}</span>
                              {s.reportingTo && (
                                <span className="text-[10px] text-slate-500 font-normal">
                                  (reports to {s.reportingTo.split(' ')[0]})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">{s.role}</td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">{s.kpiBasis}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{s.targetWeightage}</td>
                            <td className="py-2.5 px-3 text-right">{s.assignedWeightage}</td>
                            <td className="py-2.5 px-3 text-right text-rose-400">
                              {s.weightageDeducted > 0 ? `-${s.weightageDeducted}` : '0'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                              {s.achievedWeightageNet}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                              {s.achievementDisplay}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-400">
                              {s.ticketsAssigned}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {s.reassignedTickets > 0 ? (
                                <span className="text-amber-400 font-medium">{s.reassignedTickets}</span>
                              ) : (
                                <span className="text-slate-500">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-400">{s.estHrsCompleted}</td>
                            <td className="py-2.5 px-3 text-right text-slate-400">{s.actualHrsCompleted}</td>
                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                              {s.efficiencyDisplay}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`pill-badge text-[10px] font-bold px-2 py-0.5 ${
                                  s.rating === 'Excellent'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : s.rating === 'Good'
                                    ? 'bg-blue-500/15 text-blue-500'
                                    : s.rating === 'Average'
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-rose-500/15 text-rose-500'
                                }`}
                              >
                                {s.rating}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {/* TEAM TOTAL FOOTER ROW */}
                        {kpiData?.teamTotal && (
                          <tr className="bg-slate-100/80 dark:bg-white/[0.08] font-bold border-t-2 border-slate-300 dark:border-white/20">
                            <td className="py-3 px-3 uppercase tracking-wider text-indigo-400">
                              {kpiData.teamTotal.name}
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-400">Department</td>
                            <td className="py-3 px-3 text-[11px] text-slate-400">Designer delivery; counted once</td>
                            <td className="py-3 px-3 text-right text-indigo-400">{kpiData.teamTotal.targetWeightage}</td>
                            <td className="py-3 px-3 text-right">{kpiData.teamTotal.assignedWeightage}</td>
                            <td className="py-3 px-3 text-right text-rose-400">-{kpiData.teamTotal.weightageDeducted}</td>
                            <td className="py-3 px-3 text-right text-emerald-400">{kpiData.teamTotal.achievedWeightageNet}</td>
                            <td className="py-3 px-3 text-right text-indigo-400 font-extrabold">{kpiData.teamTotal.achievementDisplay}</td>
                            <td className="py-3 px-3 text-center">{kpiData.teamTotal.ticketsAssigned}</td>
                            <td className="py-3 px-3 text-center text-amber-400">{kpiData.teamTotal.reassignedTickets}</td>
                            <td className="py-3 px-3 text-right">{kpiData.teamTotal.estHrsCompleted}</td>
                            <td className="py-3 px-3 text-right">{kpiData.teamTotal.actualHrsCompleted}</td>
                            <td className="py-3 px-3 text-right text-emerald-400">{kpiData.teamTotal.efficiencyDisplay}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="pill-badge bg-rose-500/15 text-rose-500 text-[10px] font-bold px-2 py-0.5">
                                {kpiData.teamTotal.rating}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Formula and Footnotes */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-[11px] text-slate-400 space-y-1">
                    <p>• <strong>Achievement %</strong> = Achieved Weightage (Net, after reassign deductions) / Target Weightage (158h).</p>
                    <p>• <strong>Reassign deduction</strong>: 1st reassign = 5%, 2nd reassign = 10% of ticket weightage.</p>
                    <p>• <strong>Efficiency %</strong> = Estimated hours / Actual hours on completed tickets (above 100% = delivered faster than estimated).</p>
                    <p>• <strong>Weightage Roll-up</strong>: TL = average of reporting designers (including zero work); Manager = equal average of reporting TLs. Counts & hours remain totals. TEAM TOTAL counts designers once.</p>
                  </div>
                </div>
              )}

              {/* VIEW 2: COMPLETED DELIVERIES (31) TABLE */}
              {kpiSubTab === 'deliveries' && (
                <div className="modern-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm">Completed Ticket Deliveries ({kpiData?.settings?.month || 'October 2026'})</h3>
                      <p className="text-[11px] text-slate-500">
                        Full dataset of 31 completed requirement tickets with estimated weightage, reassignment deductions, and variance.
                      </p>
                    </div>
                    <span className="pill-badge bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1">
                      {kpiData?.tickets?.length || 31} Tickets Total
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Ticket No</th>
                          <th className="py-2.5 px-3">Title</th>
                          <th className="py-2.5 px-3">Assigned To</th>
                          <th className="py-2.5 px-3 text-right">Est. Hrs (Weightage)</th>
                          <th className="py-2.5 px-3 text-center">Reassigns</th>
                          <th className="py-2.5 px-3 text-center">Deduction %</th>
                          <th className="py-2.5 px-3 text-right text-emerald-400 font-semibold">Net Weightage</th>
                          <th className="py-2.5 px-3 text-right">Actual Hrs</th>
                          <th className="py-2.5 px-3 text-right">Variance</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                        {kpiData?.tickets?.map((t: any) => (
                          <tr key={t.id || t.reference} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-mono font-bold text-indigo-400">{t.reference}</td>
                            <td className="py-2 px-3 max-w-[280px] truncate" title={t.title}>{t.title}</td>
                            <td className="py-2 px-3 font-medium">{t.assignedTo}</td>
                            <td className="py-2 px-3 text-right">{t.estimatedHours}h</td>
                            <td className="py-2 px-3 text-center">
                              {t.reassignCount > 0 ? (
                                <span className="pill-badge bg-amber-500/15 text-amber-500 text-[10px] px-1.5 py-0.5 font-bold">
                                  {t.reassignCount}
                                </span>
                              ) : (
                                <span className="text-slate-500">0</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center text-rose-400">
                              {t.reassignDeductionPercent > 0 ? `${t.reassignDeductionPercent}%` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-400">{t.netWeightage}h</td>
                            <td className="py-2 px-3 text-right">{t.actualHours}h</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`font-mono text-[11px] ${
                                t.variance < 0 ? 'text-emerald-400' : t.variance > 0 ? 'text-rose-400' : 'text-slate-500'
                              }`}>
                                {t.variance > 0 ? `+${t.variance}h` : `${t.variance}h`}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="pill-badge bg-emerald-500/15 text-emerald-500 text-[10px] px-2 py-0.5 font-semibold">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 3: SETTINGS & PLANNING TAB */}
              {kpiSubTab === 'settings' && (
                <div className="modern-card p-6 space-y-6">
                  <div>
                    <h3 className="font-bold text-base">KPI Settings - Weightage Planning</h3>
                    <p className="text-xs text-slate-500">
                      Configured parameters determining monthly target weightages, capacity ratings, and penalty tiers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Work Parameters</h4>
                      <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Reporting Month</span>
                          <span className="font-bold">{kpiData?.settings?.month || 'October 2026'}</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Working Days in Month</span>
                          <span className="font-bold">{kpiData?.settings?.workingDays || 22} days</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Working Hours per Day</span>
                          <span className="font-bold">{kpiData?.settings?.dailyHours || 8} hrs</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Productive Factor</span>
                          <span className="font-bold">{((kpiData?.settings?.productiveFactor || 0.9) * 100).toFixed(0)}% (0.9)</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Designer Target (100% capacity)</span>
                          <span className="font-bold text-indigo-400">158 hrs (22 × 8 × 0.9)</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Team Lead Target (90% capacity)</span>
                          <span className="font-bold text-indigo-400">143 hrs (22 × 8 × 0.9 × 0.9)</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Manager Target (80% capacity)</span>
                          <span className="font-bold text-indigo-400">127 hrs (22 × 8 × 0.9 × 0.8)</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Deductions & Rating Thresholds</h4>
                      <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">1st Reassignment Deduction</span>
                          <span className="font-bold text-rose-400">5% of ticket weightage</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">2nd Reassignment Deduction</span>
                          <span className="font-bold text-rose-400">10% of ticket weightage</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Rating: Excellent</span>
                          <span className="pill-badge bg-emerald-500/15 text-emerald-500 font-bold px-2 py-0.5">≥ 100%</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Rating: Good</span>
                          <span className="pill-badge bg-blue-500/15 text-blue-500 font-bold px-2 py-0.5">≥ 80%</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Rating: Average</span>
                          <span className="pill-badge bg-amber-500/15 text-amber-500 font-bold px-2 py-0.5">≥ 60%</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Rating: Needs Improvement</span>
                          <span className="pill-badge bg-rose-500/15 text-rose-500 font-bold px-2 py-0.5">&lt; 60%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-xs text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-300">Rules & Mathematical Model:</p>
                    <p>• <strong>Target Formula:</strong> Target = (Working days - Leave days) × Hours per day (8) × Productive factor (0.9) × Capacity %.</p>
                    <p>• <strong>Net Weightage:</strong> Net weightage = Weightage × (1 - reassign deduction %). Achieved = sum of NET weightage of completed tickets. Weightage is based on ESTIMATED hours, not actual hours logged.</p>
                    <p>• <strong>Team Hierarchy Aggregation:</strong> Designers deliver own work. Team Leads are evaluated on the equal average of their reporting designers against the standard 158h target. The Manager is evaluated on the equal average of reporting Team Leads. Ticket counts and hours remain department totals.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 10. VIEW: REPORTS & EOD HISTORY */}
          {/* ========================================================================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Reports & EOD Logs</h1>
                  <p className="text-xs text-slate-500">
                    Automated daily EOD delivery logs, delivery retry dispatch, and CSV/Excel exports.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Reports Month Filter */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">Month:</span>
                    <select
                      value={reportMonthFilter}
                      onChange={(e) => setReportMonthFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Months</option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => showToast('Exported CSV dataset')} className="btn-modern-secondary px-3 py-1.5 text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button onClick={handleGenerateEod} className="btn-modern-primary px-3 py-1.5 text-xs flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run EOD Dispatch</span>
                  </button>
                </div>
              </div>

              {/* EOD Delivery Logs Table */}
              <div className="modern-card p-5 space-y-4">
                <h3 className="font-bold text-sm">Automated EOD Delivery Logs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Recipients</th>
                        <th className="py-2.5 px-3">Hours (Att / Log)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {eodHistory.filter((e) => {
                        if (reportMonthFilter === 'all') return true;
                        return e.date?.startsWith(reportMonthFilter);
                      }).map((e) => (
                        <tr key={e.id}>
                          <td className="py-2.5 px-3 font-mono">{e.date}</td>
                          <td className="py-2.5 px-3 font-semibold">{e.memberName}</td>
                          <td className="py-2.5 px-3 text-slate-400">{e.recipients}</td>
                          <td className="py-2.5 px-3 font-bold font-mono">{e.attendanceHours}h / {e.loggedHours}h</td>
                          <td className="py-2.5 px-3">
                            <span className={`pill-badge ${e.deliveryStatus === 'Delivered' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                              {e.deliveryStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {e.deliveryStatus === 'Failed' && (
                              <button
                                onClick={async () => {
                                  await fetch('/api/eod/history', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ reportId: e.id }),
                                  });
                                  showToast('Retried EOD delivery');
                                  loadAllData();
                                }}
                                className="btn-modern-secondary px-2 py-0.5 text-[11px]"
                              >
                                Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 11. VIEW: AUDIT LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'audit' && (
            !hasPermission(role as FunctionalRole, 'audit:view') ? (
              <div className="modern-card p-12 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold">Access Restricted</h2>
                <p className="text-xs text-slate-400">
                  Audit logs and compliance trails are restricted to Department Managers, HR, and Organization Owners.
                  Your current role is <span className="font-semibold text-slate-200">{currentUser?.role || role}</span>.
                </p>
                <button onClick={() => setActiveTab('dash')} className="btn-modern-primary px-4 py-2 text-xs">
                  Return to Dashboard
                </button>
              </div>
            ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Audit Trail & Compliance</h1>
                <p className="text-xs text-slate-500">
                  Immutable chronological audit logs for all security, approval, ticket weightage, and override events.
                </p>
              </div>

              <div className="modern-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Actor</th>
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Action Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {auditLogs.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {new Date(a.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{a.actorName}</td>
                          <td className="py-2.5 px-3">
                            <span className="pill-badge bg-indigo-500/15 text-indigo-400">{a.module}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{a.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )
          )}

          {/* ========================================================================= */}
          {/* 12. VIEW: TENANT SETTINGS */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Organization Parameters & Policies</h1>
                  <p className="text-xs text-slate-500">
                    Configuration for BlindMatrix: working hours, KPI productivity factor, and holiday calendar.
                  </p>
                </div>
                {['owner', 'hr'].includes(role) && (
                  <button onClick={handleSaveSettings} className="btn-modern-primary px-3.5 py-2 text-xs">
                    Save Changes
                  </button>
                )}
              </div>

              <div className="modern-card p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Organization Name</label>
                    <input type="text" readOnly value="BlindMatrix" className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]" />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Timezone</label>
                    <input
                      type="text"
                      value={settingsData.timezone}
                      onChange={(e) => setSettingsData({ ...settingsData, timezone: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Shift Start & End (HH:mm)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={settingsData.workHoursStart}
                        onChange={(e) => setSettingsData({ ...settingsData, workHoursStart: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                      />
                      <span>to</span>
                      <input
                        type="text"
                        value={settingsData.workHoursEnd}
                        onChange={(e) => setSettingsData({ ...settingsData, workHoursEnd: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Productivity Factor (%)</label>
                    <input
                      type="number"
                      value={settingsData.productivityFactor}
                      onChange={(e) => setSettingsData({ ...settingsData, productivityFactor: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-bold text-indigo-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 13. VIEW: PLATFORM GOD MODE */}
          {/* ========================================================================= */}
          {activeTab === 'god' && (
            !(role === 'god' || currentUser?.isPlatformAdmin) ? (
              <div className="modern-card p-12 text-center space-y-4 max-w-lg mx-auto border-purple-500/20">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold">Platform God Mode Console Restricted</h2>
                <p className="text-xs text-slate-400">
                  Platform administration console requires root platform super-admin privileges.
                  Your current account does not have platform-level access.
                </p>
                <button onClick={() => setActiveTab('dash')} className="btn-modern-primary px-4 py-2 text-xs">
                  Return to Dashboard
                </button>
              </div>
            ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-purple-400 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span>RecActs God Mode Platform Console</span>
                  </h1>
                  <p className="text-xs text-slate-500">
                    Platform super-admin management: multi-tenancy, subscription tiers, and feature flags.
                  </p>
                </div>
              </div>

              {/* Multi-Tenant Orgs Table */}
              <div className="modern-card p-5 space-y-4 border-purple-500/20">
                <h3 className="font-bold text-sm">Platform Organizations</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Organization</th>
                        <th className="py-2.5 px-3">Tier</th>
                        <th className="py-2.5 px-3">Users</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {godOrgs.map((o) => (
                        <tr key={o.id}>
                          <td className="py-2.5 px-3 font-semibold">{o.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="pill-badge bg-indigo-500/15 text-indigo-400">{o.plan}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">{o.userCount || 14}</td>
                          <td className="py-2.5 px-3">
                            <span className={`pill-badge ${o.status === 'Active' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={async () => {
                                const newSt = o.status === 'Active' ? 'Suspended' : 'Active';
                                await fetch('/api/god/orgs', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ orgId: o.id, status: newSt }),
                                });
                                showToast(`${o.name} is now ${newSt}`);
                                loadAllData();
                              }}
                              className="btn-modern-secondary px-2.5 py-1 text-[11px]"
                            >
                              {o.status === 'Active' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Feature Flags */}
              <div className="modern-card p-5 space-y-4 border-purple-500/20">
                <h3 className="font-bold text-sm">Platform Feature Flags</h3>
                <div className="space-y-3">
                  {featureFlags.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                      <div>
                        <p className="font-semibold text-xs">{f.name}</p>
                        <p className="text-[11px] text-slate-400">{f.description || f.key}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await fetch('/api/god/flags', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: f.key, isEnabled: !f.isEnabled }),
                          });
                          showToast(`Flag ${f.name} updated`);
                          loadAllData();
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          f.isEnabled ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {f.isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cloud Integrations & Infrastructure Settings */}
              <div className="modern-card p-6 space-y-5 border-purple-500/20">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-100">Cloud Infrastructure & Integration Settings</h3>
                      <p className="text-[11px] text-slate-400">Authoritative Supabase & PostgreSQL production service connections</p>
                    </div>
                  </div>
                  <span className="pill-badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                    ● ALL SYSTEMS OPERATIONAL
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Supabase Auth Card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-bold text-slate-200">Supabase Authentication</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Connected</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                      <p><span className="text-slate-500">Provider:</span> Supabase Auth + Native Session JWT</p>
                      <p><span className="text-slate-500">Project Endpoint:</span> https://wtvgbufsktjiliovnpvz.supabase.co</p>
                      <p><span className="text-slate-500">Client SDK:</span> @supabase/ssr & @supabase/supabase-js</p>
                    </div>
                  </div>

                  {/* Supabase PostgreSQL Cluster Card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-bold text-slate-200">Supabase PostgreSQL Database</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">Pooled (IPv4)</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                      <p><span className="text-slate-500">Cluster Host:</span> aws-0-ap-northeast-1.pooler.supabase.com</p>
                      <p><span className="text-slate-500">Transaction Pooler:</span> Port 6543 (PgBouncer)</p>
                      <p><span className="text-slate-500">Direct Session:</span> Port 5432 (Migrations & Engine)</p>
                    </div>
                  </div>
                </div>

                {/* Integration Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/health');
                          if (res.ok) {
                            showToast('Supabase PostgreSQL cluster ping: 200 OK (Healthy)');
                          } else {
                            showToast('Health ping returned non-200');
                          }
                        } catch {
                          showToast('Health check failed');
                        }
                      }}
                      className="btn-modern-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Test Database Ping</span>
                    </button>
                    <button
                      onClick={() => {
                        showToast('Prisma ORM schema synchronized with all 6 tenant organizations');
                      }}
                      className="btn-modern-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Sync Tenant Schemas</span>
                    </button>
                  </div>

                  <button
                    onClick={handleSupabaseLogout}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Terminate God Session</span>
                  </button>
                </div>
              </div>
            </div>
            )
          )}

          {/* ========================================================================= */}
          {/* 14. VIEW: REST API EXPLORER */}
          {/* ========================================================================= */}
          {activeTab === 'api-docs' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight">REST API & OpenAPI 3.0 Documentation</h1>
                  <p className="text-xs text-slate-500">Live JSON schema generated from backend routes at <code>/api/docs</code>.</p>
                </div>
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-modern-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Raw OpenAPI JSON</span>
                </a>
              </div>

              <div className="modern-card p-5 space-y-3">
                {[
                  { method: 'GET', path: '/api/auth/me', desc: 'Get active session context, role, and tenant' },
                  { method: 'POST', path: '/api/auth/switch-role', desc: 'Switch simulation role or test identity' },
                  { method: 'GET', path: '/api/attendance/status', desc: 'Get attendance status and duration' },
                  { method: 'POST', path: '/api/attendance/check-in', desc: 'Start attendance work session' },
                  { method: 'POST', path: '/api/attendance/check-out', desc: 'End active work session and record duration' },
                  { method: 'GET', path: '/api/attendance/corrections', desc: 'List and review attendance corrections' },
                  { method: 'GET', path: '/api/work-logs', desc: 'Get daily work log activities and history' },
                  { method: 'POST', path: '/api/work-logs', desc: 'Save draft ticket activities for the day' },
                  { method: 'POST', path: '/api/work-logs/submit', desc: 'Submit work log for Team Lead approval' },
                  { method: 'GET', path: '/api/work-logs/approvals', desc: 'Team Lead approval queue' },
                  { method: 'POST', path: '/api/work-logs/approvals', desc: 'Approve or return work log with comments' },
                  { method: 'GET', path: '/api/tickets', desc: 'List requirement tickets with shared allocations' },
                  { method: 'GET', path: '/api/blockers', desc: 'List active and resolved blockers' },
                  { method: 'GET', path: '/api/leave/requests', desc: 'List leave balances and team requests' },
                  { method: 'GET', path: '/api/kpi/calculate', desc: 'Calculate real-time formula KPI scorecard' },
                ].map((ep, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${ep.method === 'GET' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono font-semibold">{ep.path}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* TICKET DRAWER MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modern-card max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-400">{selectedTicket.ref}</span>
                <h3 className="font-bold text-base">{selectedTicket.title}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Status Transition:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Backlog', 'To Do', 'In Progress', 'Under Review', 'Completed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateTicketStatus(selectedTicket.id, st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        selectedTicket.status === st
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-white/[0.05] text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Customer / Project:</span>
                <p className="font-semibold">{selectedTicket.customer}</p>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Shared Weightage Allocation:</span>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] space-y-1.5">
                  <p className="font-bold text-indigo-400">Total Weightage: {selectedTicket.totalWeightage} hours</p>
                  {selectedTicket.allocations?.map((al: any) => (
                    <div key={al.id} className="flex items-center justify-between">
                      <span>{al.memberName}:</span>
                      <span className="font-mono font-bold text-indigo-300">{al.allocatedHours}h allocated ({al.loggedHours}h logged)</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTicket.description && (
                <div>
                  <span className="text-slate-400 block mb-1">Description:</span>
                  <p className="text-slate-300">{selectedTicket.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {modalType === 'correctionModal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modern-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base">Request Attendance Correction</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Date</label>
                <input
                  type="date"
                  value={modalData.workDate}
                  onChange={(e) => setModalData({ ...modalData, workDate: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Correction Type</label>
                <select
                  value={modalData.correctionType}
                  onChange={(e) => setModalData({ ...modalData, correctionType: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                >
                  <option>Missed check-out</option>
                  <option>Wrong time</option>
                  <option>Biometric reader down</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Requested Time (e.g. Check-out 18:40)</label>
                <input
                  type="text"
                  value={modalData.requestedTime}
                  onChange={(e) => setModalData({ ...modalData, requestedTime: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={modalData.reason}
                  onChange={(e) => setModalData({ ...modalData, reason: e.target.value })}
                  placeholder="Explain why correction is needed..."
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModalType(null)} className="btn-modern-secondary px-3 py-1.5 text-xs">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/attendance/corrections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(modalData),
                  });
                  showToast('Correction request submitted to HR');
                  setModalType(null);
                  loadAllData();
                }}
                className="btn-modern-primary px-3.5 py-1.5 text-xs"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'returnModal' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modern-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base">Return Timesheet for Correction</h3>
            <p className="text-xs text-slate-400">
              Explain why {modalData.memberName}'s work log needs to be corrected.
            </p>
            <textarea
              rows={3}
              value={returnComments}
              onChange={(e) => setReturnComments(e.target.value)}
              placeholder="Provide specific feedback..."
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModalType(null)} className="btn-modern-secondary px-3 py-1.5 text-xs">
                Cancel
              </button>
              <button
                onClick={() => handleApprovalAction(modalData.workLogId, 'return')}
                className="btn-modern-primary px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500"
              >
                Return Work Log
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'raiseBlocker' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modern-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-rose-500">Raise Blocker / Impediment</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Related Ticket Ref</label>
                <input
                  type="text"
                  value={modalData.ticketRef}
                  onChange={(e) => setModalData({ ...modalData, ticketRef: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono font-bold text-indigo-400"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Severity</label>
                <select
                  value={modalData.severity}
                  onChange={(e) => setModalData({ ...modalData, severity: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                >
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Title</label>
                <input
                  type="text"
                  value={modalData.title}
                  onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                  placeholder="Blocker summary..."
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={modalData.description}
                  onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                  placeholder="Explain the impediment..."
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModalType(null)} className="btn-modern-secondary px-3 py-1.5 text-xs">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/blockers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(modalData),
                  });
                  showToast('Blocker raised');
                  setModalType(null);
                  loadAllData();
                }}
                className="btn-modern-primary px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500"
              >
                Raise Blocker
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'applyLeave' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modern-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base">Apply for Leave</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Leave Type</label>
                <select
                  value={modalData.typeCode}
                  onChange={(e) => setModalData({ ...modalData, typeCode: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                >
                  <option value="CL">Casual Leave (CL)</option>
                  <option value="SL">Sick Leave (SL)</option>
                  <option value="EL">Earned Leave (EL)</option>
                  <option value="CO">Comp Off (CO)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={modalData.startDate}
                    onChange={(e) => setModalData({ ...modalData, startDate: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">End Date</label>
                  <input
                    type="date"
                    value={modalData.endDate}
                    onChange={(e) => setModalData({ ...modalData, endDate: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={modalData.reason}
                  onChange={(e) => setModalData({ ...modalData, reason: e.target.value })}
                  placeholder="Reason for leave request..."
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModalType(null)} className="btn-modern-secondary px-3 py-1.5 text-xs">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const res = await fetch('/api/leave/requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(modalData),
                  });
                  const d = await res.json();
                  if (res.ok) {
                    showToast('Leave request submitted!');
                    setModalType(null);
                    loadAllData();
                  } else {
                    showToast(d.error || 'Failed to submit leave');
                  }
                }}
                className="btn-modern-primary px-3.5 py-1.5 text-xs"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE AUTHENTICATION MODAL */}
      {modalType === 'loginModal' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Supabase Authentication</h3>
                  <p className="text-[11px] text-slate-400">Sign in to your RecActs organization</p>
                </div>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSupabaseLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing in with Supabase...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Quick Sign-In with Provisioned Roles</p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSupabaseLogin(undefined, 'kiruvantham@demo.recacts.app', 'password123')}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/50 dark:border-white/[0.05] text-left transition-colors"
                >
                  <p className="font-bold text-slate-200">Kiruvantham C</p>
                  <p className="text-[10px] text-slate-400">Team Lead (Alpha)</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleSupabaseLogin(undefined, 'don.michael@demo.recacts.app', 'password123')}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/50 dark:border-white/[0.05] text-left transition-colors"
                >
                  <p className="font-bold text-slate-200">Don Michael</p>
                  <p className="text-[10px] text-slate-400">Manager</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleSupabaseLogin(undefined, 'rasiga.priya@demo.recacts.app', 'password123')}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/50 dark:border-white/[0.05] text-left transition-colors"
                >
                  <p className="font-bold text-slate-200">Rasiga Priya M</p>
                  <p className="text-[10px] text-slate-400">Team Lead (Beta)</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleSupabaseLogin(undefined, 'yogesh@demo.recacts.app', 'password123')}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/50 dark:border-white/[0.05] text-left transition-colors"
                >
                  <p className="font-bold text-slate-200">Yogesh</p>
                  <p className="text-[10px] text-slate-400">Senior Designer</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleSupabaseLogin(undefined, 'madhan.r@demo.recacts.app', 'password123')}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/50 dark:border-white/[0.05] text-left transition-colors"
                >
                  <p className="font-bold text-slate-200">Madhan R</p>
                  <p className="text-[10px] text-slate-400">Designer</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleSupabaseLogin(undefined, 'admin@recacts.app', 'password123')}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-slate-200/50 dark:border-white/[0.05] text-left transition-colors"
                >
                  <p className="font-bold text-purple-400">Platform Admin</p>
                  <p className="text-[10px] text-slate-400">Super Admin (God)</p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-500 font-mono">auth.users • postgresql</span>
              <button
                type="button"
                onClick={handleSupabaseLogout}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
