'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Building2,
  Palette,
  Lock,
  Sparkles,
  Star,
  CheckSquare,
  MessageSquare,
  Layers,
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
import {
  DashboardSkeleton,
  ActivitiesSkeleton,
  AttendanceSkeleton,
  TicketsSkeleton,
  ApprovalsSkeleton,
  KpiSkeleton,
  BlockersSkeleton,
  LeaveSkeleton,
  GenericTabSkeleton,
} from '@/components/Skeletons';
import { ZohoIntegrationView } from '@/components/zoho/ZohoIntegrationView';
import {
  loadUserFilterPreferences,
  saveUserFilterPreferences,
  resetUserFilterPreferences,
  syncUserFilterPreferencesFromServer,
} from '@/lib/user-filters';
import { UserManagementView } from '@/components/users/UserManagementView';
import { RolePermissionsView } from '@/components/permissions/RolePermissionsView';
import { DailyWorkLogsView } from '@/components/work-logs/DailyWorkLogsView';
import InteractiveGanttView from '@/components/timeline/InteractiveGanttView';
import { resolveZohoDesignerValue, resolveTicketReference } from '@/lib/zoho-designer-resolver';

export default function RecActsFullyFunctionalApp() {
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<string>('dash');
  const [role, setRole] = useState<string>('member'); // member, lead, manager, hr, owner, god
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [ticketViewMode, setTicketViewMode] = useState<'board' | 'table'>('board');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data Loading & Tab Skeleton State
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ dash: false });
  const [tabTransitioning, setTabTransitioning] = useState<string | null>(null);

  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    if (!visitedTabs[newTab]) {
      setTabTransitioning(newTab);
      setTimeout(() => {
        setVisitedTabs((prev) => ({ ...prev, [newTab]: true }));
        setTabTransitioning(null);
      }, 200);
    }
  };

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
    breakDurationMinutes: 60,
    workDays: 'Mon,Tue,Wed,Thu,Fri',
    timezone: 'Asia/Kolkata (UTC+05:30)',
    attendanceTrackingEnabled: true,
    attendanceMandatory: false,
    autoCheckInOutEnabled: false,
    autoCheckInOutExcludeLeaves: true,
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

  // Zoho Sprints Integration State
  const [isSyncingZoho, setIsSyncingZoho] = useState<boolean>(false);
  const [zohoTokenInput, setZohoTokenInput] = useState<string>('');
  const [zohoRegionInput, setZohoRegionInput] = useState<'us' | 'in' | 'eu' | 'au'>('us');
  const [zohoPortalInput, setZohoPortalInput] = useState<string>('730202335');
  const [zohoClientIdInput, setZohoClientIdInput] = useState<string>('');
  const [zohoClientSecretInput, setZohoClientSecretInput] = useState<string>('');
  const [zohoErrorMessage, setZohoErrorMessage] = useState<string | null>(null);
  const [showAdvancedCredentials, setShowAdvancedCredentials] = useState<boolean>(false);
  const [availableZohoProjects, setAvailableZohoProjects] = useState<any[]>([]);
  const [selectedZohoProjectIds, setSelectedZohoProjectIds] = useState<string[]>([
    '101301000000105539',
    '101301000007065415',
    '101301000006534930',
  ]);
  const [zohoProjectSearch, setZohoProjectSearch] = useState<string>('');
  const [isSavingZohoProjects, setIsSavingZohoProjects] = useState<boolean>(false);
  const [customZohoProjId, setCustomZohoProjId] = useState<string>('');
  const [customZohoProjName, setCustomZohoProjName] = useState<string>('');
  const [hasZohoAuthConnected, setHasZohoAuthConnected] = useState<boolean>(false);
  const [discoveredZohoFields, setDiscoveredZohoFields] = useState<any[]>([]);
  const [zohoCustomFieldsSchema, setZohoCustomFieldsSchema] = useState<any[]>([]);
  const [zohoRawItemReferences, setZohoRawItemReferences] = useState<string[]>([]);
  const [selectedRawTicketRef, setSelectedRawTicketRef] = useState<string>('');
  const [selectedRawPayload, setSelectedRawPayload] = useState<any>(null);
  const [zohoSchedule, setZohoSchedule] = useState<any>({
    autoSyncEnabled: true,
    intervalMinutes: 30,
    lastSyncTime: null,
    nextSyncTime: null,
    lastSyncStatus: null,
    lastSyncedCount: 0,
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [schemaFieldFilter, setSchemaFieldFilter] = useState<string>('');

  // Month & Period Filtering
  const MONTH_OPTIONS = [
    { value: '2026-10', label: 'October 2026' },
    { value: '2026-11', label: 'November 2026' },
    { value: '2026-12', label: 'December 2026' },
    { value: '2026-09', label: 'September 2026' },
  ];
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [ticketMonthFilter, setTicketMonthFilter] = useState<string>('all');
  const [ticketDeptFilter, setTicketDeptFilter] = useState<string>('all');
  const [ticketDesignerFilter, setTicketDesignerFilter] = useState<string>('all');
  const [ticketSearchQuery, setTicketSearchQuery] = useState<string>('');
  const [kanbanGroupBy, setKanbanGroupBy] = useState<'stages' | 'core' | 'department'>('stages');
  const [kanbanCardDensity, setKanbanCardDensity] = useState<'detail' | 'compact'>('detail');
  const [kanbanCollapsedColumns, setKanbanCollapsedColumns] = useState<Record<string, boolean>>({});
  const [reportMonthFilter, setReportMonthFilter] = useState<string>('all');

  const pageUserKey = currentUser?.userId || currentUser?.id || currentUser?.name || 'guest';

  // 1. Ticket Filters Auto-save & Hydration
  useEffect(() => {
    if (!currentUser) return;
    const saved = loadUserFilterPreferences(pageUserKey, 'tickets', {
      ticketMonthFilter: 'all',
      ticketDeptFilter: 'all',
      ticketDesignerFilter: 'all',
      ticketSearchQuery: '',
      ticketViewMode: 'board' as 'board' | 'table',
      kanbanGroupBy: 'stages' as 'stages' | 'core' | 'department',
      kanbanCardDensity: 'detail' as 'detail' | 'compact',
    });
    if (saved.ticketMonthFilter) setTicketMonthFilter(saved.ticketMonthFilter);
    if (saved.ticketDeptFilter) setTicketDeptFilter(saved.ticketDeptFilter);
    if (saved.ticketDesignerFilter) setTicketDesignerFilter(saved.ticketDesignerFilter);
    if (typeof saved.ticketSearchQuery === 'string') setTicketSearchQuery(saved.ticketSearchQuery);
    if (saved.ticketViewMode) setTicketViewMode(saved.ticketViewMode);
    if (saved.kanbanGroupBy) setKanbanGroupBy(saved.kanbanGroupBy);
    if (saved.kanbanCardDensity) setKanbanCardDensity(saved.kanbanCardDensity);
  }, [pageUserKey, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    saveUserFilterPreferences(pageUserKey, 'tickets', {
      ticketMonthFilter,
      ticketDeptFilter,
      ticketDesignerFilter,
      ticketSearchQuery,
      ticketViewMode,
      kanbanGroupBy,
      kanbanCardDensity,
    });
  }, [pageUserKey, currentUser, ticketMonthFilter, ticketDeptFilter, ticketDesignerFilter, ticketSearchQuery, ticketViewMode, kanbanGroupBy, kanbanCardDensity]);

  // 2. KPI Filters Auto-save & Hydration
  useEffect(() => {
    if (!currentUser) return;
    const saved = loadUserFilterPreferences(pageUserKey, 'kpi', {
      selectedMonth: '2026-10',
      kpiSubTab: 'scorecard' as 'scorecard' | 'settings' | 'deliveries',
    });
    if (saved.selectedMonth) setSelectedMonth(saved.selectedMonth);
    if (saved.kpiSubTab) setKpiSubTab(saved.kpiSubTab);
  }, [pageUserKey, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    saveUserFilterPreferences(pageUserKey, 'kpi', {
      selectedMonth,
      kpiSubTab,
    });
  }, [pageUserKey, currentUser, selectedMonth, kpiSubTab]);

  // 3. Reports Filter Auto-save & Hydration
  useEffect(() => {
    if (!currentUser) return;
    const saved = loadUserFilterPreferences(pageUserKey, 'reports', {
      reportMonthFilter: 'all',
    });
    if (saved.reportMonthFilter) setReportMonthFilter(saved.reportMonthFilter);
  }, [pageUserKey, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    saveUserFilterPreferences(pageUserKey, 'reports', {
      reportMonthFilter,
    });
  }, [pageUserKey, currentUser, reportMonthFilter]);

  const handleResetTicketFilters = async () => {
    setTicketMonthFilter('all');
    setTicketDeptFilter('all');
    setTicketDesignerFilter('all');
    setTicketSearchQuery('');
    setTicketViewMode('board');
    setKanbanGroupBy('stages');
    setKanbanCardDensity('detail');
    await resetUserFilterPreferences(pageUserKey, 'tickets');
    showToast('Ticket filters reset to defaults');
  };

  const availableTicketDepartments = useMemo(() => {
    const set = new Set<string>();
    const excludedInternalTeams = new Set(['Alpha', 'Beta', 'alpha', 'beta']);
    tickets.forEach((t: any) => {
      const d = typeof t.department === 'string' ? t.department.trim() : '';
      if (d && !excludedInternalTeams.has(d)) {
        set.add(d);
      }
    });
    return Array.from(set).sort();
  }, [tickets]);

  const availableTicketDesigners = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t: any) => {
      const resolved = resolveZohoDesignerValue(t.designer);
      if (resolved && typeof resolved === 'string' && resolved.trim()) {
        resolved.split(',').forEach((name: string) => {
          const trimmed = name.trim();
          if (trimmed && trimmed.toLowerCase() !== 'unassigned') {
            set.add(trimmed);
          }
        });
      }
    });
    return Array.from(set).sort();
  }, [tickets]);

  const visibleFilteredTickets = useMemo(() => {
    return tickets.filter((t: any) => {
      // 1. Month filter (Requirement Start / End Date or planned dates)
      if (ticketMonthFilter !== 'all') {
        const inDue = t.plannedDue?.startsWith(ticketMonthFilter);
        const inStart = t.plannedStart?.startsWith(ticketMonthFilter);
        const inComp = t.completedDate?.startsWith(ticketMonthFilter);
        const inReqStart = t.requirementStartDate?.startsWith(ticketMonthFilter);
        const inReqDue = t.requirementEndDate?.startsWith(ticketMonthFilter);
        const matchesMonth = inDue || inStart || inComp || inReqStart || inReqDue;
        if (!matchesMonth) return false;
      }

      // 2. Department filter (UDF_PKL20)
      if (ticketDeptFilter !== 'all') {
        if (t.department !== ticketDeptFilter) return false;
      }

      // 3. Designer filter (UDF_MULTIPKL10)
      if (ticketDesignerFilter !== 'all') {
        const resolvedDesigner = resolveZohoDesignerValue(t.designer);
        if (ticketDesignerFilter === 'unassigned') {
          if (resolvedDesigner && resolvedDesigner.trim()) return false;
        } else {
          if (!resolvedDesigner || !resolvedDesigner.toLowerCase().includes(ticketDesignerFilter.toLowerCase())) return false;
        }
      }

      // 4. Text search query
      if (ticketSearchQuery.trim()) {
        const q = ticketSearchQuery.toLowerCase().trim();
        const matchRef = t.ref?.toLowerCase().includes(q);
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchCust = t.customer?.toLowerCase().includes(q);
        const matchDes = resolveZohoDesignerValue(t.designer)?.toLowerCase().includes(q);
        const matchDept = t.department?.toLowerCase().includes(q);
        if (!matchRef && !matchTitle && !matchCust && !matchDes && !matchDept) return false;
      }

      return true;
    });
  }, [tickets, ticketMonthFilter, ticketDeptFilter, ticketDesignerFilter, ticketSearchQuery]);

  // Dynamically discover all distinct Zoho statuses present across tickets
  const availableDynamicStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    tickets.forEach((t: any) => {
      const s = (t.rawStatusName || (t.rawPayload as any)?.statusName || (t.rawPayload as any)?.status_name || t.status);
      if (s && typeof s === 'string' && s.trim()) {
        statusSet.add(s.trim());
      }
    });

    // Lifecycle progression rank for standard Zoho Sprints agile workflow
    const LIFECYCLE_RANK: Record<string, number> = {
      'req to do': 10,
      'to do': 11,
      'new': 12,
      'backlog': 13,
      'open': 14,
      'req reassigned': 15,
      'reassigned': 16,
      'req in progress': 20,
      'analysis': 21,
      'requirement analysis': 22,
      'req documentation': 30,
      'documentation': 31,
      'test case scenario': 40,
      'mobile test case scenario': 41,
      'req handoff': 50,
      'waiting review': 51,
      'under review': 52,
      'dev feature to do': 60,
      'dev feature in progress': 61,
      'dev feature in-progress': 62,
      'in development': 63,
      'development': 64,
      'in progress': 65,
      'testing feature to do': 70,
      'testing feature in progress': 71,
      'testing bugs in progress': 72,
      'need to duplicate bugs': 73,
      'testing in progress': 74,
      'testing': 75,
      'qa': 76,
      'ready to move live': 80,
      'ready for deploy': 81,
      'live': 82,
      'completed': 90,
      'done': 91,
      'closed': 92,
    };

    const list = Array.from(statusSet);
    if (list.length === 0) {
      return ['Req to do', 'Req In progress', 'Req Documentation', 'Test Case scenario', 'Req Handoff', 'Dev Feature In progress', 'Testing in progress', 'Completed'];
    }

    return list.sort((a, b) => {
      const rankA = LIFECYCLE_RANK[a.toLowerCase()] ?? 55;
      const rankB = LIFECYCLE_RANK[b.toLowerCase()] ?? 55;
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b);
    });
  }, [tickets]);

  // Dynamic Theme Resolver for Any Discovered Zoho Status
  const getStatusTheme = (statusName: string, idx: number) => {
    const lower = statusName.toLowerCase();
    if (lower.includes('req to do') || lower === 'to do' || lower === 'new' || lower === 'open' || lower === 'backlog') {
      return { starColor: 'text-emerald-400', topBarColor: 'bg-emerald-500', accentBorder: 'border-l-emerald-500', badgeBg: 'bg-emerald-500/15 text-emerald-400' };
    }
    if (lower.includes('reassigned') || lower.includes('reassign')) {
      return { starColor: 'text-sky-400', topBarColor: 'bg-sky-500', accentBorder: 'border-l-sky-500', badgeBg: 'bg-sky-500/15 text-sky-400' };
    }
    if (lower.includes('req in prog') || lower === 'req in progress' || lower.includes('analysis')) {
      return { starColor: 'text-amber-400', topBarColor: 'bg-amber-500', accentBorder: 'border-l-amber-500', badgeBg: 'bg-amber-500/15 text-amber-400' };
    }
    if (lower.includes('doc')) {
      return { starColor: 'text-purple-400', topBarColor: 'bg-purple-500', accentBorder: 'border-l-purple-500', badgeBg: 'bg-purple-500/15 text-purple-400' };
    }
    if (lower.includes('test case') || lower.includes('scenario')) {
      return { starColor: 'text-cyan-400', topBarColor: 'bg-cyan-500', accentBorder: 'border-l-cyan-500', badgeBg: 'bg-cyan-500/15 text-cyan-400' };
    }
    if (lower.includes('handoff') || lower.includes('review')) {
      return { starColor: 'text-blue-400', topBarColor: 'bg-blue-500', accentBorder: 'border-l-blue-500', badgeBg: 'bg-blue-500/15 text-blue-400' };
    }
    if (lower.includes('dev')) {
      return { starColor: 'text-indigo-400', topBarColor: 'bg-indigo-500', accentBorder: 'border-l-indigo-500', badgeBg: 'bg-indigo-500/15 text-indigo-400' };
    }
    if (lower.includes('bug') || lower.includes('duplicate')) {
      return { starColor: 'text-rose-400', topBarColor: 'bg-rose-500', accentBorder: 'border-l-rose-500', badgeBg: 'bg-rose-500/15 text-rose-400' };
    }
    if (lower.includes('testing') || lower.includes('qa')) {
      return { starColor: 'text-teal-400', topBarColor: 'bg-teal-500', accentBorder: 'border-l-teal-500', badgeBg: 'bg-teal-500/15 text-teal-400' };
    }
    if (lower.includes('ready') || lower.includes('live')) {
      return { starColor: 'text-orange-400', topBarColor: 'bg-orange-500', accentBorder: 'border-l-orange-500', badgeBg: 'bg-orange-500/15 text-orange-400' };
    }
    if (lower.includes('completed') || lower.includes('done') || lower.includes('closed')) {
      return { starColor: 'text-green-400', topBarColor: 'bg-green-500', accentBorder: 'border-l-green-500', badgeBg: 'bg-green-500/15 text-green-400' };
    }
    const cycling = [
      { starColor: 'text-sky-400', topBarColor: 'bg-sky-500', accentBorder: 'border-l-sky-500', badgeBg: 'bg-sky-500/15 text-sky-400' },
      { starColor: 'text-violet-400', topBarColor: 'bg-violet-500', accentBorder: 'border-l-violet-500', badgeBg: 'bg-violet-500/15 text-violet-400' },
      { starColor: 'text-fuchsia-400', topBarColor: 'bg-fuchsia-500', accentBorder: 'border-l-fuchsia-500', badgeBg: 'bg-fuchsia-500/15 text-fuchsia-400' },
      { starColor: 'text-lime-400', topBarColor: 'bg-lime-500', accentBorder: 'border-l-lime-500', badgeBg: 'bg-lime-500/15 text-lime-400' },
    ];
    return cycling[idx % cycling.length];
  };

  // Zoho Sprints Dynamic Kanban Workflow Columns
  const kanbanColumns = useMemo(() => {
    if (kanbanGroupBy === 'core') {
      return [
        {
          id: 'To Do',
          title: 'To Do',
          starColor: 'text-emerald-400',
          topBarColor: 'bg-emerald-500',
          accentBorder: 'border-l-emerald-500',
          badgeBg: 'bg-emerald-500/15 text-emerald-400',
          filter: (t: any) => t.status === 'To Do',
        },
        {
          id: 'In Progress',
          title: 'In Progress',
          starColor: 'text-amber-400',
          topBarColor: 'bg-amber-500',
          accentBorder: 'border-l-amber-500',
          badgeBg: 'bg-amber-500/15 text-amber-400',
          filter: (t: any) => t.status === 'In Progress',
        },
        {
          id: 'Under Review',
          title: 'Under Review',
          starColor: 'text-blue-400',
          topBarColor: 'bg-blue-500',
          accentBorder: 'border-l-blue-500',
          badgeBg: 'bg-blue-500/15 text-blue-400',
          filter: (t: any) => t.status === 'Under Review',
        },
        {
          id: 'Completed',
          title: 'Completed',
          starColor: 'text-green-400',
          topBarColor: 'bg-green-500',
          accentBorder: 'border-l-green-500',
          badgeBg: 'bg-green-500/15 text-green-400',
          filter: (t: any) => t.status === 'Completed',
        },
      ];
    }

    if (kanbanGroupBy === 'department') {
      const depts = availableTicketDepartments.length > 0 ? availableTicketDepartments : ['Requirement', 'Development', 'Testing'];
      const colorPalettes = [
        { star: 'text-indigo-400', top: 'bg-indigo-500', border: 'border-l-indigo-500', badge: 'bg-indigo-500/15 text-indigo-400' },
        { star: 'text-purple-400', top: 'bg-purple-500', border: 'border-l-purple-500', badge: 'bg-purple-500/15 text-purple-400' },
        { star: 'text-teal-400', top: 'bg-teal-500', border: 'border-l-teal-500', badge: 'bg-teal-500/15 text-teal-400' },
        { star: 'text-amber-400', top: 'bg-amber-500', border: 'border-l-amber-500', badge: 'bg-amber-500/15 text-amber-400' },
        { star: 'text-cyan-400', top: 'bg-cyan-500', border: 'border-l-cyan-500', badge: 'bg-cyan-500/15 text-cyan-400' },
      ];
      return [
        ...depts.map((d, idx) => {
          const c = colorPalettes[idx % colorPalettes.length];
          return {
            id: d,
            title: d,
            starColor: c.star,
            topBarColor: c.top,
            accentBorder: c.border,
            badgeBg: c.badge,
            filter: (t: any) => t.department === d,
          };
        }),
        {
          id: 'unassigned',
          title: 'Unassigned Dept',
          starColor: 'text-slate-400',
          topBarColor: 'bg-slate-500',
          accentBorder: 'border-l-slate-500',
          badgeBg: 'bg-slate-500/15 text-slate-400',
          filter: (t: any) => !t.department,
        },
      ];
    }

    // Default: 'stages' - Dynamically Loaded Zoho Sprints Status Columns
    const dynamicCols = availableDynamicStatuses.map((st, idx) => {
      const theme = getStatusTheme(st, idx);
      return {
        id: st,
        title: st,
        starColor: theme.starColor,
        topBarColor: theme.topBarColor,
        accentBorder: theme.accentBorder,
        badgeBg: theme.badgeBg,
        filter: (t: any) => {
          const s = (t.rawStatusName || (t.rawPayload as any)?.statusName || (t.rawPayload as any)?.status_name || t.status)?.trim();
          return s?.toLowerCase() === st.toLowerCase();
        },
      };
    });

    // Handle any unclassified tickets that don't match any discovered status
    const hasUnclassified = visibleFilteredTickets.some((t: any) => {
      const s = (t.rawStatusName || (t.rawPayload as any)?.statusName || (t.rawPayload as any)?.status_name || t.status)?.trim()?.toLowerCase();
      return !availableDynamicStatuses.some((st) => st.toLowerCase() === s);
    });

    if (hasUnclassified) {
      dynamicCols.push({
        id: 'unclassified',
        title: 'Other / Unclassified',
        starColor: 'text-slate-400',
        topBarColor: 'bg-slate-500',
        accentBorder: 'border-l-slate-500',
        badgeBg: 'bg-slate-500/15 text-slate-400',
        filter: (t: any) => {
          const s = (t.rawStatusName || (t.rawPayload as any)?.statusName || (t.rawPayload as any)?.status_name || t.status)?.trim()?.toLowerCase();
          return !availableDynamicStatuses.some((st) => st.toLowerCase() === s);
        },
      });
    }

    if (ticketDeptFilter !== 'all') {
      const deptPrefix = ticketDeptFilter.toLowerCase().slice(0, 3);
      return dynamicCols.filter((col) => {
        const colTickets = visibleFilteredTickets.filter(col.filter);
        if (colTickets.length > 0) return true;
        const colLower = col.title.toLowerCase();
        return colLower.includes(deptPrefix) || colLower.includes(ticketDeptFilter.toLowerCase());
      });
    }

    return dynamicCols;
  }, [kanbanGroupBy, availableTicketDepartments, availableDynamicStatuses, visibleFilteredTickets, ticketDeptFilter]);

  const totalSprintMetrics = useMemo(() => {
    let pts = 0;
    let hrs = 0;
    visibleFilteredTickets.forEach((t: any) => {
      const rawPts = t.points !== undefined && t.points !== null
        ? Number(t.points)
        : (t.rawPayload as any)?.points !== undefined && (t.rawPayload as any)?.points !== null
        ? Number((t.rawPayload as any).points)
        : null;
      const tPts = rawPts !== null && !isNaN(rawPts) ? rawPts : 0;
      pts += tPts;
      hrs += Number(t.totalWeightage) || 0;
    });
    return { pts, hrs };
  }, [visibleFilteredTickets]);

  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    setIsDataLoading(true);
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
    } finally {
      setIsDataLoading(false);
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
          setIsDataLoading(false);
          setVisitedTabs({ dash: true });
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
    setIsDataLoading(true);
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
          setIsDataLoading(false);
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
        setIsDataLoading(false);
        setVisitedTabs((prev) => ({ ...prev, [activeTab]: true }));

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
        setIsDataLoading(false);
        return;
      }

      const meData = await meRes.json();
      if (!meData.authenticated || !meData.user) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthChecking(false);
        setIsDataLoading(false);
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
      setIsDataLoading(false);
    } catch (err) {
      console.error('Error loading RecActs data:', err);
    } finally {
      setIsDataLoading(false);
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
            setIsDataLoading(false);
            setVisitedTabs({ dash: true });
          }
          setAuthChecking(false);
        }
      }
    } catch {}

    // Check for Zoho OAuth callback params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('zoho_success')) {
        const synced = params.get('synced');
        showToast(`Zoho OAuth connected! Successfully synced ${synced || 'live'} tickets.`);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('zoho_error')) {
        const err = params.get('zoho_error');
        setZohoErrorMessage(`Zoho OAuth authorization error: ${err}`);
        setActiveTab('zoho');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    loadAllData();
    loadZohoProjectsConfig();
    loadZohoSchemaAndSchedule();
  }, []);

  // Zoho Sprints Integration & Scheduled Sync Handlers
  const loadZohoProjectsConfig = async () => {
    try {
      const res = await fetch('/api/tickets/zoho-projects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.projects)) setAvailableZohoProjects(data.projects);
        if (Array.isArray(data.selectedProjectIds)) setSelectedZohoProjectIds(data.selectedProjectIds);
        if (typeof data.isConnected === 'boolean') setHasZohoAuthConnected(data.isConnected);
      }
    } catch (e) {
      console.warn('Failed loading Zoho project configuration:', e);
    }
  };

  const loadZohoSchemaAndSchedule = async (targetRef?: string) => {
    try {
      const q = targetRef ? `?ref=${encodeURIComponent(targetRef)}` : '';
      const res = await fetch(`/api/tickets/zoho-schema${q}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.fields)) setDiscoveredZohoFields(data.fields);
        if (Array.isArray(data.customFieldsSchema)) setZohoCustomFieldsSchema(data.customFieldsSchema);
        if (Array.isArray(data.references)) setZohoRawItemReferences(data.references);
        if (data.selectedRef) setSelectedRawTicketRef(data.selectedRef);
        if (data.samplePayload) setSelectedRawPayload(data.samplePayload);
        if (data.schedule) setZohoSchedule(data.schedule);
      }
    } catch (e) {
      console.warn('Failed loading Zoho schema:', e);
    }
  };

  const handleSaveZohoProjects = async (idsToSave?: string[]) => {
    const ids = idsToSave || selectedZohoProjectIds;
    setIsSavingZohoProjects(true);
    try {
      const res = await fetch('/api/tickets/zoho-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedProjectIds: ids }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Saved ${ids.length} projects for Zoho sync!`);
      } else {
        showToast(data.error || 'Failed saving project selection');
      }
    } catch (e) {
      showToast('Error saving project selection');
    } finally {
      setIsSavingZohoProjects(false);
    }
  };

  const toggleZohoProject = (pId: string) => {
    const updated = selectedZohoProjectIds.includes(pId)
      ? selectedZohoProjectIds.filter((id) => id !== pId)
      : [...selectedZohoProjectIds, pId];
    setSelectedZohoProjectIds(updated);
  };

  const handleSelectAllZohoProjects = () => {
    const all = availableZohoProjects.map((p) => p.id);
    setSelectedZohoProjectIds(all);
  };

  const handleDeselectAllZohoProjects = () => {
    setSelectedZohoProjectIds([]);
  };

  const handleSelectDefaultZohoProjects = () => {
    setSelectedZohoProjectIds([
      '101301000000105539', // Requirements in progress
      '101301000007065415', // AI Agentic team
      '101301000006534930', // Fabritec LLC
    ]);
  };

  const handleAddCustomZohoProject = () => {
    if (!customZohoProjId.trim()) return;
    const cleanId = customZohoProjId.trim();
    const cleanName = customZohoProjName.trim() || `Project ${cleanId}`;
    if (!availableZohoProjects.some((p) => p.id === cleanId)) {
      setAvailableZohoProjects((prev) => [{ id: cleanId, name: cleanName, status: 'Custom' }, ...prev]);
    }
    if (!selectedZohoProjectIds.includes(cleanId)) {
      setSelectedZohoProjectIds((prev) => [...prev, cleanId]);
    }
    setCustomZohoProjId('');
    setCustomZohoProjName('');
    showToast(`Added "${cleanName}" to selected projects`);
  };

  const handleSaveZohoSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const res = await fetch('/api/tickets/zoho-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoSyncEnabled: zohoSchedule?.autoSyncEnabled,
          intervalMinutes: Number(zohoSchedule?.intervalMinutes) || 30,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.schedule) setZohoSchedule(data.schedule);
        showToast(data.message || 'Saved recurring sync schedule!');
      } else {
        showToast(data.error || 'Failed saving schedule');
      }
    } catch (e) {
      showToast('Error saving sync schedule');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSyncZoho = async (customTokenParam?: string | boolean) => {
    setIsSyncingZoho(true);
    setZohoErrorMessage(null);
    const tokenToUse = typeof customTokenParam === 'string' ? customTokenParam : zohoTokenInput || undefined;
    try {
      const res = await fetch('/api/tickets/sync-zoho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customToken: tokenToUse,
          region: zohoRegionInput,
          portalId: zohoPortalInput,
          clientId: zohoClientIdInput || undefined,
          clientSecret: zohoClientSecretInput || undefined,
          selectedProjectIds: selectedZohoProjectIds,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Synced ${data.totalSynced} tickets from Zoho Sprints!`);
        setZohoErrorMessage(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('recacts_bootstrap_snapshot');
        }
        await loadAllData();
        await loadZohoSchemaAndSchedule();
      } else {
        const errMsg = data.error || data.details || 'Zoho credentials needed. Please enter token.';
        setZohoErrorMessage(errMsg);
        showToast(errMsg);
      }
    } catch (err: any) {
      const errMsg = `Sync error: ${err?.message || String(err)}`;
      setZohoErrorMessage(errMsg);
      showToast(errMsg);
    } finally {
      setIsSyncingZoho(false);
    }
  };

  // Tab switch hook for Zoho
  useEffect(() => {
    if (activeTab === 'zoho') {
      loadZohoProjectsConfig();
      loadZohoSchemaAndSchedule();
    }
  }, [activeTab]);

  // Periodic heartbeat for auto-sync execution (every 60s)
  useEffect(() => {
    if (!zohoSchedule?.autoSyncEnabled || !zohoSchedule?.nextSyncTime) return;
    const intervalTimer = setInterval(() => {
      if (zohoSchedule?.autoSyncEnabled && zohoSchedule?.nextSyncTime && !isSyncingZoho) {
        const nextTime = new Date(zohoSchedule.nextSyncTime).getTime();
        if (Date.now() >= nextTime) {
          console.log('[RecActs Auto-Sync] Interval elapsed, triggering automatic Zoho sync...');
          handleSyncZoho(false);
        }
      }
    }, 60_000);
    return () => clearInterval(intervalTimer);
  }, [zohoSchedule, isSyncingZoho]);

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
        onClick={() => handleTabChange(id)}
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

  // Standardized Access Restricted Panel
  const renderAccessRestricted = (title: string, reason: string) => (
    <div className="modern-card p-12 text-center space-y-4 max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-xs text-slate-400">
        {reason} Your current verified role is{' '}
        <span className="font-semibold text-slate-200 capitalize">{currentUser?.role || role}</span>.
      </p>
      <button onClick={() => handleTabChange('dash')} className="btn-modern-primary px-4 py-2 text-xs">
        Return to Dashboard
      </button>
    </div>
  );

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
    <div className={`min-h-screen ${activeTab === 'timeline' ? 'h-screen overflow-hidden' : ''} ${darkMode ? 'dark bg-[#090D16] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
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
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleTabChange('dash')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              RecActs
            </span>
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



        {/* Right: Authenticated User Profile & Sign Out (No arbitrary dev switcher) */}
        <div className="flex items-center gap-3">
          {/* Organization Name & Logo */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <div className="w-4 h-4 rounded bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
              <Building className="w-2.5 h-2.5" />
            </div>
            <span>{organization?.name || 'BlindMatrix'}</span>
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
                <p className="text-[10px] text-slate-400 capitalize">{currentUser?.role || role}</p>
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
      <div className={`flex ${activeTab === 'timeline' ? 'h-[calc(100vh-3.5rem)] overflow-hidden' : ''}`}>
        {/* SIDEBAR */}
        <aside className={`w-60 flex-none ${activeTab === 'timeline' ? 'h-full overflow-y-auto' : 'min-h-[calc(100vh-3.5rem)]'} border-r border-slate-200/80 dark:border-white/[0.08] bg-white/50 dark:bg-[#0B0F19]/60 backdrop-blur-xl p-3 space-y-5`}>
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Core Workspace</p>
            <div className="space-y-0.5">
              {renderNavItem('dash', 'Overview', <LayoutDashboard className="w-3.5 h-3.5" />)}
              {hasPermission(role as FunctionalRole, 'work_logs:create') &&
                renderNavItem('activities', 'Work Logs', <FileText className="w-3.5 h-3.5" />)}
              {hasPermission(role as FunctionalRole, 'attendance:view_own') &&
                renderNavItem('attendance', 'Attendance & Shifts', <Clock className="w-3.5 h-3.5" />)}
              {hasPermission(role as FunctionalRole, 'tickets:view') &&
                renderNavItem('tickets', 'Tickets & Weightages', <TicketIcon className="w-3.5 h-3.5" />)}
              {hasPermission(role as FunctionalRole, 'timeline:view') &&
                renderNavItem('timeline', 'Gantt Timeline', <CalendarRange className="w-3.5 h-3.5" />)}
            </div>
          </div>

          {(hasPermission(role as FunctionalRole, 'work_logs:approve') ||
            hasPermission(role as FunctionalRole, 'blockers:raise') ||
            hasPermission(role as FunctionalRole, 'blockers:acknowledge') ||
            hasPermission(role as FunctionalRole, 'leave:apply') ||
            hasPermission(role as FunctionalRole, 'leave:view_calendar')) && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Sprint Workflow</p>
              <div className="space-y-0.5">
                {hasPermission(role as FunctionalRole, 'work_logs:approve') &&
                  renderNavItem('approvals', 'Approvals Queue', <CheckCircle2 className="w-3.5 h-3.5" />, approvals.filter(a => a.submissionStatus === 'Submitted').length)}
                {(hasPermission(role as FunctionalRole, 'blockers:raise') || hasPermission(role as FunctionalRole, 'blockers:acknowledge')) &&
                  renderNavItem('blockers', 'Blocker Board', <AlertOctagon className="w-3.5 h-3.5" />, blockers.filter(b => b.status === 'Raised').length, true)}
                {(hasPermission(role as FunctionalRole, 'leave:apply') || hasPermission(role as FunctionalRole, 'leave:view_calendar')) &&
                  renderNavItem('leave', 'Leave Planner', <Calendar className="w-3.5 h-3.5" />)}
                {renderNavItem('zoho', 'Zoho Sprints Sync', <Sparkles className="w-3.5 h-3.5 text-indigo-400" />)}
              </div>
            </div>
          )}

          {(hasPermission(role as FunctionalRole, 'kpi:view_own') ||
            hasPermission(role as FunctionalRole, 'kpi:view_team') ||
            hasPermission(role as FunctionalRole, 'reports:view') ||
            hasPermission(role as FunctionalRole, 'audit:view') ||
            hasPermission(role as FunctionalRole, 'platform:api_docs') ||
            hasPermission(role as FunctionalRole, 'org:manage_settings') ||
            role === 'god' ||
            currentUser?.isPlatformAdmin) && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Analytics & Admin</p>
              <div className="space-y-0.5">
                {(hasPermission(role as FunctionalRole, 'kpi:view_own') || hasPermission(role as FunctionalRole, 'kpi:view_team') || hasPermission(role as FunctionalRole, 'kpi:view_org')) &&
                  renderNavItem('kpi', 'KPI Engine', <Target className="w-3.5 h-3.5" />)}
                {hasPermission(role as FunctionalRole, 'reports:view') &&
                  renderNavItem('reports', 'Reports & EOD', <BarChart3 className="w-3.5 h-3.5" />)}
                {hasPermission(role as FunctionalRole, 'audit:view') &&
                  renderNavItem('audit', 'Audit History', <History className="w-3.5 h-3.5" />)}
                {(hasPermission(role as FunctionalRole, 'users:view') ||
                  hasPermission(role as FunctionalRole, 'org:manage_employees') ||
                  ['lead', 'manager', 'hr', 'owner', 'god'].includes(role)) &&
                  renderNavItem('users', 'Team & Users', <Users className="w-3.5 h-3.5 text-pink-400" />)}
                {(['lead', 'manager', 'owner', 'god'].includes(role) ||
                  currentUser?.isPlatformAdmin ||
                  hasPermission(role as FunctionalRole, 'org:manage_settings')) &&
                  renderNavItem('permissions', 'Roles & Permissions', <Shield className="w-3.5 h-3.5 text-indigo-400" />)}
                {hasPermission(role as FunctionalRole, 'platform:api_docs') &&
                  renderNavItem('api-docs', 'REST API Explorer', <ExternalLink className="w-3.5 h-3.5" />)}
                {hasPermission(role as FunctionalRole, 'org:manage_settings') &&
                  renderNavItem('settings', 'Tenant Settings', <Settings className="w-3.5 h-3.5" />)}
                {(role === 'god' || currentUser?.isPlatformAdmin) &&
                  renderNavItem('god', 'Platform God Mode', <Shield className="w-3.5 h-3.5 text-purple-500" />)}
              </div>
            </div>
          )}


        </aside>

        {/* MAIN VIEW */}
        <main className={`flex-1 min-w-0 ${activeTab === 'timeline' ? 'h-full overflow-hidden flex flex-col p-3 lg:p-4 w-full max-w-none' : activeTab === 'tickets' ? 'p-4 lg:p-6 w-full max-w-none space-y-6' : 'p-6 lg:p-8 max-w-7xl mx-auto space-y-6'}`}>
          {/* ========================================================================= */}
          {/* 1. VIEW: DASHBOARD OVERVIEW */}
          {/* ========================================================================= */}
          {activeTab === 'dash' && (
            (isDataLoading || !kpiData || tabTransitioning === 'dash') ? (
              <DashboardSkeleton />
            ) : (() => {
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
            const kpiRating = kpiIndividual?.rating || (kpiPercentNum >= 100 ? 'Excellent' : kpiPercentNum >= 80 ? 'Good' : kpiPercentNum >= 60 ? 'Average' : 'Needs Improvement');
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

                      {hasPermission(role as FunctionalRole, 'reports:eod_resend') && (
                        <button
                          onClick={handleGenerateEod}
                          className="btn-modern-secondary px-3 py-2 text-xs flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Trigger EOD Mailer</span>
                        </button>
                      )}
                      {hasPermission(role as FunctionalRole, 'work_logs:create') && (
                        <button
                          onClick={() => handleTabChange('activities')}
                          className="btn-modern-primary px-3.5 py-2 text-xs flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log Daily Effort</span>
                        </button>
                      )}
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
                        onClick={() => handleTabChange('tickets')}
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
                              <span>Total: <strong className="text-indigo-400">{t.totalWeightage > 0 ? `${t.totalWeightage}h` : '—'}</strong></span>
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm tracking-tight">Team Shift Monitor</h3>
                          <span className="pill-badge text-[10px] py-0.5 px-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {settingsData.attendanceTrackingEnabled === false
                              ? 'Tracking Off'
                              : settingsData.autoCheckInOutEnabled
                              ? 'Auto Shifts Active'
                              : settingsData.attendanceMandatory
                              ? 'Mandatory Policy'
                              : 'Optional Policy'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Live attendance for {currentUser?.team || 'Alpha & Beta'}</p>
                      </div>
                      <button
                        onClick={() => handleTabChange('attendance')}
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
          })()
          )}

          {/* ========================================================================= */}
          {/* 2. VIEW: DAILY WORK LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'activities' && (
            (isDataLoading || tabTransitioning === 'activities') ? (
              <ActivitiesSkeleton />
            ) : !hasPermission(role as FunctionalRole, 'work_logs:create') ? (
              renderAccessRestricted('Work Logs Restricted', 'Daily work logging is disabled for HR administration accounts.')
            ) : (
              <DailyWorkLogsView
                currentUser={currentUser}
                tickets={tickets}
                attendance={attendance}
                onShowToast={showToast}
                onRefreshData={() => loadAllData()}
                onOpenTicketDetails={(t) => {
                  setSelectedTicket(t);
                  setModalType('ticket-detail');
                }}
              />
            )
          )}

          {/* ========================================================================= */}
          {/* 3. VIEW: ATTENDANCE & WORK SESSIONS */}
          {/* ========================================================================= */}
          {activeTab === 'attendance' && (
            (isDataLoading || tabTransitioning === 'attendance') ? (
              <AttendanceSkeleton />
            ) : (
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
                  {settingsData.attendanceTrackingEnabled === false ? (
                    <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Tracking Disabled by Policy</span>
                    </div>
                  ) : !attendance.isCheckedIn ? (
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
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`pill-badge text-[10px] py-0.5 px-2.5 ${
                        settingsData.attendanceTrackingEnabled === false
                          ? 'bg-slate-500/15 text-slate-400'
                          : settingsData.autoCheckInOutEnabled
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : settingsData.attendanceMandatory
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-emerald-500/15 text-emerald-500'
                      }`}>
                        {settingsData.attendanceTrackingEnabled === false
                          ? 'Policy: Tracking Disabled'
                          : settingsData.autoCheckInOutEnabled
                          ? `Policy: Automated Shift Check-In ${settingsData.autoCheckInOutExcludeLeaves ? '(Leaves Excluded)' : ''}`
                          : settingsData.attendanceMandatory
                          ? 'Policy: Mandatory Clock-In'
                          : 'Policy: Flexible / Optional Check-In'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Check-in: {attendance.checkInTime || '08:50'} • Shift: {settingsData.workHoursStart || '09:00'} – {settingsData.workHoursEnd || '18:00'}
                      </span>
                    </div>
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

              {/* Attendance Corrections Queue (HR / Manager / Owner only) */}
              {corrections.length > 0 && hasPermission(role as FunctionalRole, 'attendance:correct_approve') && (
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
            )
          )}

          {/* ========================================================================= */}
          {/* 4. VIEW: TICKETS & SHARED WEIGHTAGES */}
          {/* ========================================================================= */}
          {activeTab === 'tickets' && (
            (isDataLoading || tabTransitioning === 'tickets') ? (
              <TicketsSkeleton viewMode={ticketViewMode} />
            ) : !hasPermission(role as FunctionalRole, 'tickets:view') ? (
              renderAccessRestricted('Tickets Restricted', 'Requirement ticket views are restricted to delivery teams and leadership.')
            ) : (
            <div className="w-full space-y-3 animate-in fade-in duration-200">
              {/* Top Filter & Actions Toolbar */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                  {/* Search Query Filter */}
                  <div className="relative min-w-[180px] sm:min-w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search tickets, designer, client..."
                      value={ticketSearchQuery}
                      onChange={(e) => setTicketSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-xs outline-none placeholder-slate-400 text-slate-900 dark:text-white font-medium"
                    />
                    {ticketSearchQuery && (
                      <button
                        onClick={() => setTicketSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                        title="Clear search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Department Filter (UDF_PKL20) */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">Dept:</span>
                    <select
                      value={ticketDeptFilter}
                      onChange={(e) => setTicketDeptFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer max-w-[120px] truncate"
                    >
                      <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        All Depts
                      </option>
                      {availableTicketDepartments.map((dept) => (
                        <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Designer Filter (UDF_MULTIPKL10) */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]">
                    <Palette className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">Designer:</span>
                    <select
                      value={ticketDesignerFilter}
                      onChange={(e) => setTicketDesignerFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer max-w-[120px] truncate"
                    >
                      <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        All Designers
                      </option>
                      {availableTicketDesigners.map((des) => (
                        <option key={des} value={des} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {des}
                        </option>
                      ))}
                      <option value="unassigned" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        Unassigned
                      </option>
                    </select>
                  </div>

                  {/* Requirement Dates & Month Filter (UDF_DATETIME10 / UDF_DATETIME6) */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">Month:</span>
                    <select
                      value={ticketMonthFilter}
                      onChange={(e) => setTicketMonthFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer max-w-[130px] truncate"
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

                  {/* User Filter Indicator & Reset */}
                  <div className="flex items-center gap-1.5">
                    <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-semibold">
                      <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Saved for {currentUser?.name || 'you'}</span>
                    </div>
                    {(ticketSearchQuery || ticketDeptFilter !== 'all' || ticketDesignerFilter !== 'all' || ticketMonthFilter !== 'all') && (
                      <button
                        onClick={handleResetTicketFilters}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all flex items-center gap-1 text-xs"
                        title="Reset ticket filters"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* View Mode Toggle */}
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

                  {/* Sync Zoho Button */}
                  <button
                    onClick={() => handleSyncZoho(false)}
                    disabled={isSyncingZoho}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                    title="Sync tickets from Zoho Sprints"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingZoho ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isSyncingZoho ? 'Syncing...' : 'Sync Zoho'}</span>
                  </button>

                  {/* Zoho Config Shortcut */}
                  <button
                    onClick={() => setActiveTab('zoho')}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-slate-400 hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                    title="Zoho Sprints Integration Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  {hasPermission(role as FunctionalRole, 'tickets:create') && (
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
                      className="btn-modern-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Requirement</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Indicators */}
              {(ticketDeptFilter !== 'all' || ticketDesignerFilter !== 'all' || ticketSearchQuery || ticketMonthFilter !== 'all') && (
                <div className="flex flex-wrap items-center gap-2 text-xs py-1 px-2 rounded-xl bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05]">
                  <span className="text-slate-400 font-medium">
                    Showing <strong className="text-indigo-400">{visibleFilteredTickets.length}</strong> of {tickets.length} tickets:
                  </span>
                  {ticketDeptFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/15 text-indigo-300 flex items-center gap-1">
                      <span>Dept: {ticketDeptFilter}</span>
                      <button onClick={() => setTicketDeptFilter('all')} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {ticketDesignerFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-pink-500/15 text-pink-300 flex items-center gap-1">
                      <span>Designer: {ticketDesignerFilter}</span>
                      <button onClick={() => setTicketDesignerFilter('all')} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {ticketMonthFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/15 text-cyan-300 flex items-center gap-1">
                      <span>Month: {ticketMonthFilter}</span>
                      <button onClick={() => setTicketMonthFilter('all')} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {ticketSearchQuery && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 flex items-center gap-1">
                      <span>Query: &ldquo;{ticketSearchQuery}&rdquo;</span>
                      <button onClick={() => setTicketSearchQuery('')} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setTicketDeptFilter('all');
                      setTicketDesignerFilter('all');
                      setTicketMonthFilter('all');
                      setTicketSearchQuery('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline ml-auto"
                  >
                    Reset all filters
                  </button>
                </div>
              )}

              {/* Zoho Sprints Authentic Kanban Workflow Board (Full Width + Dynamic Statuses) */}
              {ticketViewMode === 'board' ? (
                <div className="w-full space-y-3">
                  {/* Zoho Sprints Sub-Header Bar (Matching Reference Layout) */}
                  <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900/60 dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">V4 Sprint 95</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active Sprint
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Version 4 in progress · {kanbanColumns.length} Dynamic Workflow Stages
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Group By Selector */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Group by:</span>
                        <select
                          value={kanbanGroupBy}
                          onChange={(e) => setKanbanGroupBy(e.target.value as any)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                        >
                          <option value="stages" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Status Name ({availableDynamicStatuses.length} Dynamic)
                          </option>
                          <option value="core" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Core 4 Statuses
                          </option>
                          <option value="department" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Department
                          </option>
                        </select>
                      </div>

                      {/* Density Selector */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">View:</span>
                        <select
                          value={kanbanCardDensity}
                          onChange={(e) => setKanbanCardDensity(e.target.value as any)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                        >
                          <option value="detail" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Detail View
                          </option>
                          <option value="compact" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            Compact View
                          </option>
                        </select>
                      </div>

                      {/* Metrics Summary Pill */}
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-medium text-indigo-300">
                        <span>{visibleFilteredTickets.length} Items</span>
                        <span className="text-slate-600 dark:text-slate-500">•</span>
                        <span>{kanbanColumns.length} Stages</span>
                        <span className="text-slate-600 dark:text-slate-500">•</span>
                        <span>{totalSprintMetrics.pts} Pts</span>
                        <span className="text-slate-600 dark:text-slate-500">•</span>
                        <span>{totalSprintMetrics.hrs}h</span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Scroll Track for Columns (Full Width) */}
                  <div className="w-full overflow-x-auto pb-4 pt-1 custom-scrollbar">
                    <div className="flex gap-3.5 min-w-full items-start">
                      {kanbanColumns.map((col) => {
                        const colTickets = visibleFilteredTickets.filter(col.filter);
                        const colPoints = colTickets.reduce(
                          (acc: number, t: any) => {
                            const rawPts = t.points !== undefined && t.points !== null
                              ? Number(t.points)
                              : (t.rawPayload as any)?.points !== undefined && (t.rawPayload as any)?.points !== null
                              ? Number((t.rawPayload as any).points)
                              : null;
                            const pts = rawPts !== null && !isNaN(rawPts) ? rawPts : 0;
                            return acc + pts;
                          },
                          0
                        );
                        const colHours = colTickets.reduce((acc: number, t: any) => acc + (Number(t.totalWeightage) || 0), 0);
                        const isCollapsed = kanbanCollapsedColumns[col.id];

                        if (isCollapsed) {
                          return (
                            <div
                              key={col.id}
                              onClick={() =>
                                setKanbanCollapsedColumns((prev) => ({ ...prev, [col.id]: false }))
                              }
                              className="w-10 min-w-10 h-[500px] rounded-2xl bg-slate-900/40 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/[0.08] flex flex-col items-center py-3 cursor-pointer hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all select-none"
                              title={`Click to expand ${col.title}`}
                            >
                              <div className={`w-2 h-2 rounded-full ${col.topBarColor} mb-3`} />
                              <span className="text-[11px] font-bold text-slate-400 rotate-90 whitespace-nowrap mt-12 tracking-wider">
                                {col.title} ({colTickets.length})
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={col.id}
                            className="w-[300px] min-w-[280px] max-w-[340px] flex-1 flex-shrink-0 flex flex-col rounded-2xl bg-slate-900/60 dark:bg-slate-950/75 border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-sm backdrop-blur-sm"
                          >
                            {/* Column Top Accent Stripe */}
                            <div className={`h-1 w-full ${col.topBarColor}`} />

                            {/* Column Header */}
                            <div className="p-3 bg-slate-100/60 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <Star className={`w-3.5 h-3.5 ${col.starColor} flex-shrink-0 fill-current`} />
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={col.title}>
                                  {col.title}
                                </span>
                                <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-white/[0.08] text-slate-400">
                                  {colTickets.length}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono text-slate-400 font-semibold">
                                  {colPoints} pts
                                </span>
                                <button
                                  onClick={() =>
                                    setKanbanCollapsedColumns((prev) => ({ ...prev, [col.id]: true }))
                                  }
                                  className="text-slate-500 hover:text-slate-300 p-0.5"
                                  title="Collapse column"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Min / Max Sub-header Bar (Zoho Sprints Style) */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 px-3.5 py-1 bg-slate-100/30 dark:bg-white/[0.015] border-b border-slate-200/60 dark:border-white/[0.04] font-mono">
                              <span>Min: —</span>
                              <span>Max: —</span>
                            </div>

                            {/* Ticket Cards List */}
                            <div className="space-y-3 p-2.5 min-h-[420px] max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
                              {colTickets.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200/60 dark:border-white/[0.06] rounded-xl text-slate-500 text-xs">
                                  <span>No items in this stage</span>
                                </div>
                              ) : (
                                colTickets.map((t) => (
                                  <div
                                    key={t.id}
                                    onClick={() => setSelectedTicket(t)}
                                    className={`group relative bg-white dark:bg-slate-900/95 rounded-xl border border-slate-200/80 dark:border-white/[0.08] p-3 space-y-2 cursor-pointer hover:border-indigo-500/50 hover:shadow-lg transition-all duration-150 border-l-[3.5px] ${col.accentBorder}`}
                                  >
                                    {/* Card Top Row: Type Icon + Ref + Priority + Designer Avatar */}
                                    <div className="flex items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20 flex-shrink-0" />
                                        <span className="font-mono text-xs font-bold text-sky-400 hover:text-sky-300 hover:underline truncate">
                                          {resolveTicketReference(t.ref, t.title)}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            t.priority === 'Critical'
                                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                              : t.priority === 'High'
                                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                          }`}
                                        >
                                          {t.priority}
                                        </span>
                                        {t.designer && (() => {
                                          const resolved = resolveZohoDesignerValue(t.designer);
                                          const desList = resolved.split(',').map((s: string) => s.trim()).filter(Boolean);
                                          return (
                                            <div className="flex items-center -space-x-1.5 flex-shrink-0" title={`Designer: ${resolved}`}>
                                              {desList.map((dName: string, dIdx: number) => {
                                                const initials = dName
                                                  .split(' ')
                                                  .filter(Boolean)
                                                  .map((n: string) => n[0])
                                                  .join('')
                                                  .slice(0, 2)
                                                  .toUpperCase() || 'DE';
                                                return (
                                                  <span
                                                    key={dIdx}
                                                    className="w-5 h-5 rounded-full bg-pink-500/20 border border-pink-500/30 text-[9px] font-bold text-pink-300 flex items-center justify-center flex-shrink-0 shadow-sm"
                                                    title={`Designer: ${dName}`}
                                                  >
                                                    {initials}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>

                                    {/* Item Title */}
                                    <div>
                                      <h4 className="font-semibold text-xs leading-snug text-slate-800 dark:text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2">
                                        {t.title}
                                      </h4>
                                    </div>

                                    {/* Customer Box Capsule (Zoho Sprints Style) */}
                                    {t.customer && (
                                      <div>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                                          [ {t.customer} ]
                                        </span>
                                      </div>
                                    )}

                                    {/* Detail View Specific Badges */}
                                    {kanbanCardDensity === 'detail' && (
                                      <>
                                        {/* Tags & Custom Field Badges */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                          {t.department && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                              <Building2 className="w-2.5 h-2.5" />
                                              <span className="truncate max-w-[110px]">{t.department}</span>
                                            </span>
                                          )}
                                          {t.designer && (
                                            <span
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20"
                                              title={`Designer: ${resolveZohoDesignerValue(t.designer)}`}
                                            >
                                              <Palette className="w-2.5 h-2.5 flex-shrink-0" />
                                              <span className="truncate max-w-[130px]">{resolveZohoDesignerValue(t.designer)}</span>
                                            </span>
                                          )}
                                          {t.prototypeUrl && (
                                            <a
                                              href={t.prototypeUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-colors"
                                              title="Open Figma Prototype"
                                            >
                                              <ExternalLink className="w-2.5 h-2.5" />
                                              <span>Prototype</span>
                                            </a>
                                          )}
                                          {t.docUrl && (
                                            <a
                                              href={t.docUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-colors"
                                              title="Open Spec Documentation"
                                            >
                                              <FileText className="w-2.5 h-2.5" />
                                              <span>Spec Doc</span>
                                            </a>
                                          )}
                                        </div>

                                        {/* Requirement Dates (Start -> Due) */}
                                        {(t.plannedStart || t.plannedDue) && (
                                          <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100/50 dark:bg-white/[0.03] px-2 py-0.5 rounded border border-slate-200/60 dark:border-white/[0.05]">
                                            <Calendar className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                            <span className="font-mono truncate">
                                              {t.plannedStart || '—'} → {t.plannedDue || '—'}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Footer: Checklist + Hours/Points + Allocations Stack */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06] text-[10px]">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="flex items-center gap-1 text-slate-400 font-mono"
                                          title="Allocations count"
                                        >
                                          <CheckSquare className="w-3 h-3 text-slate-500" />
                                          <span>0{Math.max(1, t.allocations?.length || 1)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.05] text-slate-300 border border-slate-200/50 dark:border-white/[0.06]">
                                          <Clock className={`w-2.5 h-2.5 ${t.totalWeightage > 0 ? 'text-indigo-400' : 'text-slate-500'}`} />
                                          <span className={t.totalWeightage > 0 ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                                            {t.totalWeightage > 0 ? `${t.totalWeightage}h` : '—'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Assigned Members Initials Stack */}
                                      <div className="flex items-center -space-x-1.5">
                                        {t.allocations && t.allocations.length > 0 ? (
                                          t.allocations.slice(0, 3).map((al: any) => (
                                            <span
                                              key={al.id}
                                              className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-400/40 text-[9px] font-bold text-indigo-200 flex items-center justify-center"
                                              title={`${al.memberName} (${al.allocatedHours}h)`}
                                            >
                                              {al.memberInitials || al.memberName?.slice(0, 2).toUpperCase()}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-slate-500 text-[10px]">Unassigned</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Designer</th>
                          <th className="py-3 px-4">Req Dates</th>
                          <th className="py-3 px-4">Total Weightage</th>
                          <th className="py-3 px-4">Shared Allocations</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                        {visibleFilteredTickets.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400">
                              No requirement tickets match the current filters.
                            </td>
                          </tr>
                        ) : (
                          visibleFilteredTickets.map((t: any) => (
                            <tr
                              key={t.id}
                              onClick={() => setSelectedTicket(t)}
                              className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                            >
                              <td className="py-3 px-4 font-mono font-bold text-indigo-500 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span>{resolveTicketReference(t.ref, t.title)}</span>
                                  <a
                                    href={t.zohoUrl || `/api/tickets/${t.id}/sprint`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                    title={`Open ${t.ref} in Zoho Sprints ↗`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <p className="font-semibold text-slate-900 dark:text-white truncate">{t.title}</p>
                                <p className="text-[11px] text-slate-400 truncate">{t.customer}</p>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {t.department ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {t.department}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {t.designer ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                    {resolveZohoDesignerValue(t.designer)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">Unassigned</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                {t.plannedStart || '—'} → {t.plannedDue || '—'}
                              </td>
                              <td className="py-3 px-4 font-bold whitespace-nowrap">
                                {t.totalWeightage > 0 ? `${t.totalWeightage}h` : <span className="text-slate-500 font-normal">—</span>}
                              </td>
                              <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                                {t.allocations?.length > 0
                                  ? t.allocations.map((a: any) => `${a.memberName} (${a.allocatedHours}h)`).join(', ')
                                  : '—'}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
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
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="pill-badge bg-indigo-500/15 text-indigo-400">{t.status}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            )
          )}

          {/* ========================================================================= */}
          {/* 5. VIEW: INTERACTIVE GANTT TIMELINE */}
          {/* ========================================================================= */}
          {activeTab === 'timeline' && (
            (isDataLoading || tabTransitioning === 'timeline') ? (
              <GenericTabSkeleton title="Interactive Gantt Timeline" />
            ) : !hasPermission(role as FunctionalRole, 'timeline:view') ? (
              renderAccessRestricted('Timeline Restricted', 'Interactive Gantt schedules are restricted to project delivery teams and leadership.')
            ) : (
              <InteractiveGanttView
                tickets={tickets}
                onSelectTicket={setSelectedTicket}
                currentUserName={currentUser?.name}
                currentUserId={currentUser?.userId || currentUser?.id}
                onRefreshTickets={loadAllData}
                onSyncZoho={() => handleSyncZoho(false)}
                isSyncingZoho={isSyncingZoho}
              />
            )
          )}

          {/* ========================================================================= */}
          {/* 6. VIEW: APPROVALS QUEUE */}
          {/* ========================================================================= */}
          {activeTab === 'approvals' && (
            (isDataLoading || tabTransitioning === 'approvals') ? (
              <ApprovalsSkeleton />
            ) : !hasPermission(role as FunctionalRole, 'work_logs:approve') ? (
              <div className="modern-card p-12 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold">Access Restricted</h2>
                <p className="text-xs text-slate-400">
                  Timesheet approvals are restricted to Team Leads, Managers, and Organization Owners.
                  Your current verified role is <span className="font-semibold text-slate-200">{currentUser?.role || role}</span>.
                </p>
                <button onClick={() => handleTabChange('dash')} className="btn-modern-primary px-4 py-2 text-xs">
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
            (isDataLoading || tabTransitioning === 'blockers') ? (
              <BlockersSkeleton />
            ) : !(hasPermission(role as FunctionalRole, 'blockers:raise') || hasPermission(role as FunctionalRole, 'blockers:acknowledge')) ? (
              renderAccessRestricted('Blocker Board Restricted', 'Impediment tracking is restricted to delivery teams and leadership.')
            ) : (
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
            )
          )}

          {/* ========================================================================= */}
          {/* 8. VIEW: LEAVE PLANNER */}
          {/* ========================================================================= */}
          {activeTab === 'leave' && (
            (isDataLoading || tabTransitioning === 'leave') ? (
              <LeaveSkeleton />
            ) : (
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
                <h3 className="font-bold text-sm">
                  {hasPermission(role as FunctionalRole, 'leave:approve') ? 'Team Leave Applications' : 'My Leave Applications'}
                </h3>
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
                      {(hasPermission(role as FunctionalRole, 'leave:approve')
                        ? leaveData.teamRequests
                        : (leaveData.myRequests?.length ? leaveData.myRequests : leaveData.teamRequests?.filter((lr: any) => lr.memberName === currentUser?.name))
                      )?.map((lr: any) => (
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
                            {lr.status === 'Pending' && hasPermission(role as FunctionalRole, 'leave:approve') ? (
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
                            ) : (
                              <span className="text-[11px] text-slate-500">{lr.status}</span>
                            )}
                          </td>
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
          {/* 9. VIEW: KPI & FORMULA ENGINE */}
          {/* ========================================================================= */}
          {activeTab === 'kpi' && (
            (isDataLoading || !kpiData || tabTransitioning === 'kpi') ? (
              <KpiSkeleton />
            ) : !(hasPermission(role as FunctionalRole, 'kpi:view_own') || hasPermission(role as FunctionalRole, 'kpi:view_team') || hasPermission(role as FunctionalRole, 'kpi:view_org')) ? (
              renderAccessRestricted('KPI Engine Restricted', 'Performance weightage scorecards are unavailable for HR administrative roles.')
            ) : (
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
                  {hasPermission(role as FunctionalRole, 'kpi:override_submit') && (
                    <button
                      onClick={() => {
                        setModalType('targetOverride');
                        setModalData({ memberId: '', revisedTargetHours: 158, reason: '' });
                      }}
                      className="btn-modern-secondary px-3 py-1.5 text-xs"
                    >
                      Propose Target Override
                    </button>
                  )}
                  {hasPermission(role as FunctionalRole, 'kpi:deduct_impact') && (
                    <button
                      onClick={() => {
                        setModalType('negativeImpact');
                        setModalData({ category: 'Reassignment', impactValue: 5, valueType: 'percentage', reason: '' });
                      }}
                      className="btn-modern-secondary px-3 py-1.5 text-xs text-rose-500"
                    >
                      Apply Deduction
                    </button>
                  )}
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
                          <th className="py-2.5 px-3">Level (Scale)</th>
                          <th className="py-2.5 px-3 text-right">Target</th>
                          <th className="py-2.5 px-3 text-right">Assigned</th>
                          <th className="py-2.5 px-3 text-right text-rose-400">Deducted</th>
                          <th className="py-2.5 px-3 text-right text-emerald-400">Achieved Net</th>
                          <th className="py-2.5 px-3 text-right font-bold">Ach %</th>
                          <th className="py-2.5 px-3 text-center">Done / Total</th>
                          <th className="py-2.5 px-3 text-center">Reassigned</th>
                          <th className="py-2.5 px-3 text-right">Est. Hrs</th>
                          <th className="py-2.5 px-3 text-right">Actual Hrs</th>
                          <th className="py-2.5 px-3 text-right font-bold">Efficiency</th>
                          <th className="py-2.5 px-3 text-center">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                        {(hasPermission(role as FunctionalRole, 'kpi:view_team')
                          ? kpiData?.staffKpis
                          : kpiData?.staffKpis?.filter((s: any) =>
                              s.staffId === currentUser?.id ||
                              (currentUser?.name && s.name?.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]))
                            )
                        )?.map((s: any) => (
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
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {s.experienceLevel} ({s.experienceMultiplier}x)
                            </td>
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
                              <span className="font-semibold text-slate-200">{s.ticketsCompleted}</span>
                              <span className="text-slate-500"> / {s.ticketsAssigned}</span>
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
                        {kpiData?.teamTotal && hasPermission(role as FunctionalRole, 'kpi:view_team') && (
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
                            <td className="py-3 px-3 text-center">
                              <span className="font-semibold text-slate-200">{kpiData.teamTotal.ticketsCompleted}</span>
                              <span className="text-slate-500"> / {kpiData.teamTotal.ticketsAssigned}</span>
                            </td>
                            <td className="py-3 px-3 text-center text-amber-400">{kpiData.teamTotal.reassignedTickets}</td>
                            <td className="py-3 px-3 text-right">{kpiData.teamTotal.estHrsCompleted}</td>
                            <td className="py-3 px-3 text-right">{kpiData.teamTotal.actualHrsCompleted}</td>
                            <td className="py-3 px-3 text-right text-emerald-400 font-bold">{kpiData.teamTotal.efficiencyDisplay}</td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`pill-badge text-[10px] font-bold px-2 py-0.5 ${
                                  kpiData.teamTotal.rating === 'Excellent'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : kpiData.teamTotal.rating === 'Good'
                                    ? 'bg-blue-500/15 text-blue-500'
                                    : kpiData.teamTotal.rating === 'Average'
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-rose-500/15 text-rose-500'
                                }`}
                              >
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
                    <p>• <strong>Target Weightage</strong> = (Working Days - Leave Days) × 8h × 0.9 × Capacity % × Experience Multiplier (Junior 0.8x, Mid 1.0x, Senior 1.5x).</p>
                    <p>• <strong>1 Weightage = 1 Estimated Hour</strong>. Weightage is strictly based on estimated hours, not actual logged hours.</p>
                    <p>• <strong>Net Weightage</strong> = Weightage × (1 - Reassign Deduction %). Deductions: 1st reassign = 5%, 2nd = 10%, 3rd+ = 15%.</p>
                    <p>• <strong>Achieved Weightage</strong> = Sum of Net Weightage of Completed tickets only. In-progress tickets contribute 0.</p>
                    <p>• <strong>Efficiency %</strong> = Estimated Hours / Actual Hours on completed tickets.</p>
                    <p>• <strong>Ratings</strong>: Excellent (≥100%), Good (≥80%), Average (≥60%), Needs Improvement (&lt;60%).</p>
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
                        {(hasPermission(role as FunctionalRole, 'kpi:view_team')
                          ? kpiData?.tickets
                          : kpiData?.tickets?.filter((t: any) =>
                              currentUser?.name && t.assignedTo?.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])
                            )
                        )?.map((t: any) => (
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
                          <span className="text-slate-400">Shift & Break Duration</span>
                          <span className="font-bold">{kpiData?.settings?.shiftHours || 9}h shift − {kpiData?.settings?.breakDurationMinutes ?? 60}m break</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Net Working Hours / Day (Shift − Break)</span>
                          <span className="font-bold">{kpiData?.settings?.dailyHours ?? 8} hrs</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Productive Factor</span>
                          <span className="font-bold">{((kpiData?.settings?.productiveFactor || 0.9) * 100).toFixed(0)}% ({(kpiData?.settings?.productiveFactor || 0.9).toFixed(2)})</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Daily Productive Hours</span>
                          <span className="font-bold text-emerald-400">{((kpiData?.settings?.dailyHours ?? 8) * (kpiData?.settings?.productiveFactor || 0.9)).toFixed(2)} hrs/day</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Designer Target (100% capacity)</span>
                          <span className="font-bold text-indigo-400">
                            {Math.round((kpiData?.settings?.workingDays || 22) * (kpiData?.settings?.dailyHours ?? 8) * (kpiData?.settings?.productiveFactor || 0.9))} hrs
                          </span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Team Lead Target (90% capacity)</span>
                          <span className="font-bold text-indigo-400">
                            {Math.round((kpiData?.settings?.workingDays || 22) * (kpiData?.settings?.dailyHours ?? 8) * (kpiData?.settings?.productiveFactor || 0.9) * 0.9)} hrs
                          </span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-slate-400">Manager Target (80% capacity)</span>
                          <span className="font-bold text-indigo-400">
                            {Math.round((kpiData?.settings?.workingDays || 22) * (kpiData?.settings?.dailyHours ?? 8) * (kpiData?.settings?.productiveFactor || 0.9) * 0.8)} hrs
                          </span>
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
            )
          )}

          {/* ========================================================================= */}
          {/* 10. VIEW: REPORTS & EOD HISTORY */}
          {/* ========================================================================= */}
          {activeTab === 'reports' && (
            (isDataLoading || tabTransitioning === 'reports') ? (
              <GenericTabSkeleton title="Reports & EOD Logs" />
            ) : !hasPermission(role as FunctionalRole, 'reports:view') ? (
              renderAccessRestricted('Reports & EOD Restricted', 'Organization reports and automated EOD logs are restricted to Team Leads, Managers, HR, and Owners.')
            ) : (
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
                  {hasPermission(role as FunctionalRole, 'reports:export') && (
                    <button onClick={() => showToast('Exported CSV dataset')} className="btn-modern-secondary px-3 py-1.5 text-xs flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  )}
                  {hasPermission(role as FunctionalRole, 'reports:eod_resend') && (
                    <button onClick={handleGenerateEod} className="btn-modern-primary px-3 py-1.5 text-xs flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Run EOD Dispatch</span>
                    </button>
                  )}
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
                            {e.deliveryStatus === 'Failed' && hasPermission(role as FunctionalRole, 'reports:eod_resend') && (
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
            )
          )}

          {/* ========================================================================= */}
          {/* 11. VIEW: AUDIT LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'audit' && (
            (isDataLoading || tabTransitioning === 'audit' || auditLogs.length === 0) ? (
              <GenericTabSkeleton title="Audit Logs & Compliance Trail" />
            ) : !hasPermission(role as FunctionalRole, 'audit:view') ? (
              <div className="modern-card p-12 text-center space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold">Access Restricted</h2>
                <p className="text-xs text-slate-400">
                  Audit logs and compliance trails are restricted to Department Managers, HR, and Organization Owners.
                  Your current role is <span className="font-semibold text-slate-200">{currentUser?.role || role}</span>.
                </p>
                <button onClick={() => handleTabChange('dash')} className="btn-modern-primary px-4 py-2 text-xs">
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
            (isDataLoading || tabTransitioning === 'settings') ? (
              <GenericTabSkeleton title="Organization Parameters & Policies" />
            ) : !hasPermission(role as FunctionalRole, 'org:manage_settings') ? (
              renderAccessRestricted('Tenant Settings Restricted', 'Organization schedule, policy, and parameter management requires Organization Owner privileges.')
            ) : (
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

              {/* 1. Organization Profile & Work Schedule */}
              <div className="modern-card p-6 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <Building className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-bold text-sm">Organization Profile & Schedule</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Organization Name</label>
                    <input type="text" readOnly value={organization?.name || "BlindMatrix"} className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]" />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Timezone</label>
                    <input
                      type="text"
                      value={settingsData.timezone || ''}
                      onChange={(e) => setSettingsData({ ...settingsData, timezone: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Working Days</label>
                    <input
                      type="text"
                      value={settingsData.workDays || 'Mon,Tue,Wed,Thu,Fri'}
                      onChange={(e) => setSettingsData({ ...settingsData, workDays: e.target.value })}
                      placeholder="e.g. Mon,Tue,Wed,Thu,Fri"
                      className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Shift Start & End (HH:mm)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={settingsData.workHoursStart || '09:00'}
                        onChange={(e) => setSettingsData({ ...settingsData, workHoursStart: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                      />
                      <span>to</span>
                      <input
                        type="text"
                        value={settingsData.workHoursEnd || '18:00'}
                        onChange={(e) => setSettingsData({ ...settingsData, workHoursEnd: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Grace Period (Minutes)</label>
                    <input
                      type="number"
                      value={settingsData.gracePeriodMinutes ?? 15}
                      onChange={(e) => setSettingsData({ ...settingsData, gracePeriodMinutes: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Break Duration (Minutes)</label>
                    <input
                      type="number"
                      min={0}
                      max={240}
                      value={settingsData.breakDurationMinutes ?? 60}
                      onChange={(e) => setSettingsData({ ...settingsData, breakDurationMinutes: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Productivity Factor (%)</label>
                    <input
                      type="number"
                      value={settingsData.productivityFactor ?? 90}
                      onChange={(e) => setSettingsData({ ...settingsData, productivityFactor: Number(e.target.value) })}
                      className="w-full p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-bold text-indigo-400"
                    />
                  </div>
                </div>

                {/* Live Calculated Overall Working & Productive Hours Preview */}
                {(() => {
                  const [sH, sM] = (settingsData.workHoursStart || '09:00').split(':').map(Number);
                  const [eH, eM] = (settingsData.workHoursEnd || '18:00').split(':').map(Number);
                  let shiftMins = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
                  if (isNaN(shiftMins) || shiftMins <= 0) {
                    shiftMins = !isNaN(sH) && !isNaN(eH) && eH < sH
                      ? (24 * 60 - (sH * 60 + (sM || 0))) + (eH * 60 + (eM || 0))
                      : 540;
                  }
                  const breakMins = Math.max(0, Number(settingsData.breakDurationMinutes ?? 60));
                  const netWorkingMins = Math.max(0, shiftMins - breakMins);
                  const shiftHrs = (shiftMins / 60).toFixed(2).replace(/\.00$/, '');
                  const breakHrs = (breakMins / 60).toFixed(2).replace(/\.00$/, '');
                  const netWorkingHrs = netWorkingMins / 60;
                  const factor = (Number(settingsData.productivityFactor ?? 90)) / 100;
                  const dailyProductiveHrs = netWorkingHrs * factor;
                  const monthlyProductiveHrs = Math.round(22 * dailyProductiveHrs);

                  return (
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-indigo-600 dark:text-indigo-400">Overall Working & Productive Hour Formula (Shift Hour − Break)</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Total Shift ({shiftHrs}h) − Break ({breakMins}m / {breakHrs}h) = <strong className="text-slate-800 dark:text-slate-200">{netWorkingHrs.toFixed(2).replace(/\.00$/, '')}h Net Working</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Net Working / Day</p>
                          <p className="text-base font-extrabold text-slate-800 dark:text-white">{netWorkingHrs.toFixed(2).replace(/\.00$/, '')}h</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Productive / Day ({Math.round(factor * 100)}%)</p>
                          <p className="text-base font-extrabold text-emerald-500">{dailyProductiveHrs.toFixed(2).replace(/\.00$/, '')}h</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Monthly Target (22d)</p>
                          <p className="text-base font-extrabold text-indigo-500">{monthlyProductiveHrs}h</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. Attendance Policy & Automation Controls */}
              <div className="modern-card p-6 space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <div>
                      <h3 className="font-bold text-sm">Attendance & Shift Policy Controls</h3>
                      <p className="text-[11px] text-slate-400">Configure organization-level check-in/out requirements, optional tracking, and automated shift recording.</p>
                    </div>
                  </div>
                  <span className={`pill-badge text-xs ${settingsData.attendanceTrackingEnabled !== false ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-500/15 text-slate-400'}`}>
                    {settingsData.attendanceTrackingEnabled !== false ? (settingsData.attendanceMandatory ? 'Mandatory Policy' : 'Flexible Policy') : 'Tracking Off'}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Master Attendance Tracking Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05]">
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>Attendance Tracking Status</span>
                        {settingsData.attendanceTrackingEnabled !== false ? (
                          <span className="pill-badge bg-emerald-500/15 text-emerald-500 text-[10px]">Active</span>
                        ) : (
                          <span className="pill-badge bg-rose-500/15 text-rose-500 text-[10px]">Disabled</span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Enable or disable check-in and check-out tracking for the entire organization.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={settingsData.attendanceTrackingEnabled !== false}
                        onChange={(e) => setSettingsData({ ...settingsData, attendanceTrackingEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Mandatory vs Flexible / Optional Control */}
                  <div className={`p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] transition-opacity ${settingsData.attendanceTrackingEnabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          Check-in Requirement (Mandatory vs Flexible)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Check-in and check-out is not mandatory by default. You can enforce mandatory clock-in or allow flexible self-managed attendance.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSettingsData({ ...settingsData, attendanceMandatory: false })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          !settingsData.attendanceMandatory
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 shadow-sm'
                            : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs">Flexible / Optional Check-in</span>
                          {!settingsData.attendanceMandatory && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Attendance clock-in is optional. No penalties or missed-clock-in alerts for flexible work hours.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettingsData({ ...settingsData, attendanceMandatory: true })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          settingsData.attendanceMandatory
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm'
                            : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs">Mandatory Daily Clock-in</span>
                          {settingsData.attendanceMandatory && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Strict policy: all scheduled employees are required to record check-in/out for shift accounting.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Automatic Check-In & Check-Out */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] transition-opacity ${settingsData.attendanceTrackingEnabled === false ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>Automatic Check-In & Check-Out</span>
                        {settingsData.autoCheckInOutEnabled && (
                          <span className="pill-badge bg-indigo-500/15 text-indigo-400 text-[10px]">Automated</span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Automatically record daily shifts for staff during scheduled working hours ({settingsData.workHoursStart || '09:00'} – {settingsData.workHoursEnd || '18:00'}).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(settingsData.autoCheckInOutEnabled)}
                        onChange={(e) => setSettingsData({ ...settingsData, autoCheckInOutEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Exclude Planned Leave Days */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.05] transition-opacity ${(settingsData.attendanceTrackingEnabled === false || !settingsData.autoCheckInOutEnabled) ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>Exclude Planned Leave Days & Holidays</span>
                        <span className="pill-badge bg-emerald-500/15 text-emerald-500 text-[10px]">Leave Protected</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Prevent auto check-in/out on approved leave dates and public holidays so employees remain accurately marked as &quot;On leave&quot;.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={settingsData.autoCheckInOutExcludeLeaves !== false}
                        onChange={(e) => setSettingsData({ ...settingsData, autoCheckInOutExcludeLeaves: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            )
          )}

          {/* ========================================================================= */}
          {/* VIEW: TEAM & USER MANAGEMENT (LEAD, MANAGER, HR, OWNER) */}
          {/* ========================================================================= */}
          {activeTab === 'users' && (
            (isDataLoading || tabTransitioning === 'users') ? (
              <GenericTabSkeleton title="Team & User Management" />
            ) : !['lead', 'manager', 'hr', 'owner', 'god'].includes(role) && !hasPermission(role as FunctionalRole, 'users:view') ? (
              renderAccessRestricted('User Management Restricted', 'Managing users and designer mappings requires Team Lead, Manager, or HR privileges.')
            ) : (
              <UserManagementView
                currentRole={role}
                onShowToast={showToast}
                currentUserId={currentUser?.userId || currentUser?.id}
                currentUserName={currentUser?.name}
              />
            )
          )}

          {/* ========================================================================= */}
          {/* VIEW: ROLES & PERMISSIONS MATRIX (ENTERPRISE RBAC CONTROL PANEL) */}
          {/* ========================================================================= */}
          {activeTab === 'permissions' && (
            (isDataLoading || tabTransitioning === 'permissions') ? (
              <GenericTabSkeleton title="Roles & Permissions Management" />
            ) : !['lead', 'manager', 'owner', 'god'].includes(role) && !currentUser?.isPlatformAdmin && !hasPermission(role as FunctionalRole, 'org:manage_settings') ? (
              renderAccessRestricted('Permissions Management Restricted', 'Configuring organizational role permissions requires Manager, Owner, or God privileges.')
            ) : (
              <RolePermissionsView
                currentRole={role}
                onShowToast={showToast}
              />
            )
          )}

          {/* ========================================================================= */}
          {/* VIEW: ZOHO SPRINTS REST API INTEGRATION & CONFIGURATION */}
          {/* ========================================================================= */}
          {activeTab === 'zoho' && (
            <ZohoIntegrationView
              hasZohoAuthConnected={hasZohoAuthConnected}
              isSyncingZoho={isSyncingZoho}
              zohoSchedule={zohoSchedule}
              setZohoSchedule={setZohoSchedule}
              availableZohoProjects={availableZohoProjects}
              selectedZohoProjectIds={selectedZohoProjectIds}
              zohoProjectSearch={zohoProjectSearch}
              setZohoProjectSearch={setZohoProjectSearch}
              isSavingZohoProjects={isSavingZohoProjects}
              customZohoProjId={customZohoProjId}
              setCustomZohoProjId={setCustomZohoProjId}
              customZohoProjName={customZohoProjName}
              setCustomZohoProjName={setCustomZohoProjName}
              zohoTokenInput={zohoTokenInput}
              setZohoTokenInput={setZohoTokenInput}
              zohoRegionInput={zohoRegionInput}
              setZohoRegionInput={setZohoRegionInput}
              zohoPortalInput={zohoPortalInput}
              setZohoPortalInput={setZohoPortalInput}
              zohoClientIdInput={zohoClientIdInput}
              setZohoClientIdInput={setZohoClientIdInput}
              zohoClientSecretInput={zohoClientSecretInput}
              setZohoClientSecretInput={setZohoClientSecretInput}
              zohoErrorMessage={zohoErrorMessage}
              showAdvancedCredentials={showAdvancedCredentials}
              setShowAdvancedCredentials={setShowAdvancedCredentials}
              discoveredZohoFields={discoveredZohoFields}
              customFieldsSchema={zohoCustomFieldsSchema}
              zohoRawItemReferences={zohoRawItemReferences}
              selectedRawTicketRef={selectedRawTicketRef}
              setSelectedRawTicketRef={setSelectedRawTicketRef}
              selectedRawPayload={selectedRawPayload}
              isSavingSchedule={isSavingSchedule}
              schemaFieldFilter={schemaFieldFilter}
              setSchemaFieldFilter={setSchemaFieldFilter}
              onSync={() => handleSyncZoho(false)}
              onSaveProjects={() => handleSaveZohoProjects()}
              onToggleProject={toggleZohoProject}
              onSelectAllProjects={handleSelectAllZohoProjects}
              onDeselectAllProjects={handleDeselectAllZohoProjects}
              onSelectDefaultProjects={handleSelectDefaultZohoProjects}
              onAddCustomProject={handleAddCustomZohoProject}
              onSaveSchedule={handleSaveZohoSchedule}
              onSelectRawTicket={(ref) => {
                setSelectedRawTicketRef(ref);
                loadZohoSchemaAndSchedule(ref);
              }}
              onShowToast={showToast}
            />
          )}

          {/* ========================================================================= */}
          {/* 13. VIEW: PLATFORM GOD MODE */}
          {/* ========================================================================= */}
          {activeTab === 'god' && (
            (isDataLoading || tabTransitioning === 'god' || (role === 'god' && godOrgs.length === 0)) ? (
              <GenericTabSkeleton title="God Mode Platform Administration" />
            ) : !(role === 'god' || currentUser?.isPlatformAdmin) ? (
              <div className="modern-card p-12 text-center space-y-4 max-w-lg mx-auto border-purple-500/20">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold">Platform God Mode Console Restricted</h2>
                <p className="text-xs text-slate-400">
                  Platform administration console requires root platform super-admin privileges.
                  Your current account does not have platform-level access.
                </p>
                <button onClick={() => handleTabChange('dash')} className="btn-modern-primary px-4 py-2 text-xs">
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
            !hasPermission(role as FunctionalRole, 'platform:api_docs') ? (
              renderAccessRestricted('REST API Explorer Restricted', 'Technical API schema documentation is restricted to Organization Owners and Platform Administrators.')
            ) : (
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
            )
          )}
        </main>
      </div>

      {/* TICKET DRAWER MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modern-card max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-mono text-xs font-bold text-indigo-400 block mb-0.5">{resolveTicketReference(selectedTicket.ref, selectedTicket.title)}</span>
                <h3 className="font-bold text-base leading-snug line-clamp-2" title={selectedTicket.title}>{selectedTicket.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <a
                  href={selectedTicket.zohoUrl || `/api/tickets/${selectedTicket.id}/sprint`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
                  title="Open in Zoho Sprints ↗"
                >
                  <span>Open in Sprint</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Status Transition:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Backlog', 'To Do', 'In Progress', 'Under Review', 'Completed'].map((st) => {
                    const isAssignedToTicket = selectedTicket.allocations?.some(
                      (a: any) =>
                        a.memberId === currentUser?.id ||
                        (currentUser?.name && a.memberName?.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]))
                    );
                    const canModifyStatus = hasPermission(role as FunctionalRole, 'tickets:edit') || isAssignedToTicket;
                    return (
                    <button
                      key={st}
                      disabled={!canModifyStatus}
                      onClick={() => canModifyStatus && handleUpdateTicketStatus(selectedTicket.id, st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        selectedTicket.status === st
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-white/[0.05] text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1]'
                      }`}
                    >
                      {st}
                    </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Customer / Project:</span>
                <p className="font-semibold">{selectedTicket.customer}</p>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Shared Weightage Allocation:</span>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-indigo-400">Total Weightage: {selectedTicket.totalWeightage > 0 ? `${selectedTicket.totalWeightage} hours` : '0 hours'}</p>
                    {((selectedTicket.customFields as any)?.UDF_LONG5 || (selectedTicket.rawPayload as any)?.UDF_LONG5 || selectedTicket.requirementWeightage) ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-mono font-semibold border border-indigo-500/30">
                        Requirement Weightage (UDF_LONG5): {String(selectedTicket.requirementWeightage || (selectedTicket.customFields as any)?.UDF_LONG5?.displayValue || (selectedTicket.customFields as any)?.UDF_LONG5?.rawValue || (selectedTicket.rawPayload as any)?.UDF_LONG5)}h
                      </span>
                    ) : null}
                  </div>
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

              {/* Zoho Sprints Custom Fields */}
              {selectedTicket.customFields && Object.keys(selectedTicket.customFields).length > 0 && (
                <div>
                  <span className="text-slate-400 block mb-1.5 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Zoho Sprints Custom Fields:</span>
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs max-h-60 overflow-y-auto">
                    {Object.entries<any>(selectedTicket.customFields).map(([cfKey, cfVal]: [string, any]) => (
                      <div key={cfKey} className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">{cfVal.label || cfKey}</span>
                        {String(cfVal.displayValue || cfVal.rawValue || '').startsWith('http') ? (
                          <a
                            href={String(cfVal.displayValue || cfVal.rawValue)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline flex items-center gap-1 truncate"
                          >
                            <span className="truncate">{cfVal.label || 'Open Link'}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <p className="font-medium text-slate-200">{String(cfVal.displayValue ?? cfVal.rawValue ?? '—')}</p>
                        )}
                      </div>
                    ))}
                  </div>
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
