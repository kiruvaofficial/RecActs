'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CalendarRange,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsUpDown,
  ExternalLink,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar as CalendarIcon,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  CloudDownload,
  Edit3,
  Check,
  X,
  Save,
  Building2,
  Palette,
} from 'lucide-react';
import {
  loadUserFilterPreferences,
  saveUserFilterPreferences,
  resetUserFilterPreferences,
  syncUserFilterPreferencesFromServer,
} from '@/lib/user-filters';

export interface InteractiveGanttProps {
  tickets: any[];
  onSelectTicket?: (ticket: any) => void;
  currentUserName?: string;
  currentUserId?: string;
  onRefreshTickets?: () => void;
  onSyncZoho?: () => Promise<void>;
  isSyncingZoho?: boolean;
}

// Convert Zoho / UTC timestamp to IST calendar date (YYYY-MM-DD)
function parseZohoDate(val: any): string | null {
  if (!val || val === '-1' || val === -1) return null;
  let d: Date;
  if (typeof val === 'number') {
    d = new Date(val);
  } else if (typeof val === 'string' && /^\d{10,13}$/.test(val.trim())) {
    const num = Number(val.trim());
    d = new Date(num > 9999999999 ? num : num * 1000);
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
    return null;
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// Calculate days between two YYYY-MM-DD dates inclusive
function calcDaysInclusive(startStr: string, endStr: string): number {
  try {
    const s = new Date(startStr + 'T00:00:00');
    const e = new Date(endStr + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  } catch {
    return 1;
  }
}

// Format date nicely (e.g. "12 Nov 2026")
function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface ProcessedTicket {
  raw: any;
  id: string;
  ref: string;
  title: string;
  customer: string;
  status: string;
  rawStatusName: string;
  statusCategory: 'In progress' | 'Documentation' | 'To do' | 'Completed';
  department: string | null;
  designers: string[];
  primaryDesigner: string;
  developer: string | null;
  // Resolved dates for active track
  startDate: string | null;
  endDate: string | null;
  days: number | null;
  dateStatus: 'Scheduled' | 'End only' | 'Start only' | 'No dates';
  // Specific track dates
  reqStartDate: string | null;
  reqEndDate: string | null;
  devStartDate: string | null;
  devEndDate: string | null;
  targetLiveDate: string | null;
  weightage: number;
  zohoUrl?: string;
}

interface TimelineFilters {
  zoomLevel: 'day' | 'week' | 'month';
  dateTrack: 'requirement' | 'development' | 'combined';
  groupBy: 'designer' | 'department' | 'status' | 'developer' | 'none';
  searchQuery: string;
  filterDepartment: string;
  filterDesigner: string;
  filterStatus: string;
  filterDateStatus: 'all' | 'scheduled' | 'missing' | 'end_only' | 'no_dates';
}

const DEFAULT_TIMELINE_FILTERS: TimelineFilters = {
  zoomLevel: 'week',
  dateTrack: 'requirement',
  groupBy: 'designer',
  searchQuery: '',
  filterDepartment: 'all',
  filterDesigner: 'all',
  filterStatus: 'all',
  filterDateStatus: 'all',
};

export default function InteractiveGanttView({
  tickets: initialTickets,
  onSelectTicket,
  currentUserName,
  currentUserId,
  onRefreshTickets,
  onSyncZoho,
  isSyncingZoho: isSyncingZohoProp,
}: InteractiveGanttProps) {
  const userKey = currentUserId || currentUserName || 'guest';

  // Local mutable copy of tickets so quick edits reflect immediately
  const [ticketsList, setTicketsList] = useState<any[]>(initialTickets);
  useEffect(() => {
    setTicketsList(initialTickets);
  }, [initialTickets]);

  // Initial user-saved filter hydration
  const initialSavedFilters = useMemo(() => {
    return loadUserFilterPreferences<TimelineFilters>(userKey, 'timeline', DEFAULT_TIMELINE_FILTERS);
  }, [userKey]);

  // Filter States
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>(initialSavedFilters.zoomLevel);
  const [dateTrack, setDateTrack] = useState<'requirement' | 'development' | 'combined'>(initialSavedFilters.dateTrack);
  const [groupBy, setGroupBy] = useState<'designer' | 'department' | 'status' | 'developer' | 'none'>(initialSavedFilters.groupBy);
  const [searchQuery, setSearchQuery] = useState<string>(initialSavedFilters.searchQuery);
  const [filterDepartment, setFilterDepartment] = useState<string>(initialSavedFilters.filterDepartment);
  const [filterDesigner, setFilterDesigner] = useState<string>(initialSavedFilters.filterDesigner);
  const [filterStatus, setFilterStatus] = useState<string>(initialSavedFilters.filterStatus);
  const [filterDateStatus, setFilterDateStatus] = useState<'all' | 'scheduled' | 'missing' | 'end_only' | 'no_dates'>(initialSavedFilters.filterDateStatus);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [hoveredTicketId, setHoveredTicketId] = useState<string | null>(null);
  const [tableHeight, setTableHeight] = useState<'fit' | 'tall' | 'compact'>('fit');

  // Sync state & Quick Edit Modal State
  const [isSyncingLocal, setIsSyncingLocal] = useState<boolean>(false);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [editingTicket, setEditingTicket] = useState<ProcessedTicket | null>(null);
  const [editForm, setEditForm] = useState<{
    reqStart: string;
    reqEnd: string;
    devStart: string;
    devEnd: string;
    targetLive: string;
    department: string;
    status: string;
  }>({
    reqStart: '',
    reqEnd: '',
    devStart: '',
    devEnd: '',
    targetLive: '',
    department: '',
    status: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // Auto-save filters to user profile on changes
  useEffect(() => {
    const currentFilters: TimelineFilters = {
      zoomLevel,
      dateTrack,
      groupBy,
      searchQuery,
      filterDepartment,
      filterDesigner,
      filterStatus,
      filterDateStatus,
    };
    saveUserFilterPreferences(userKey, 'timeline', currentFilters);
  }, [userKey, zoomLevel, dateTrack, groupBy, searchQuery, filterDepartment, filterDesigner, filterStatus, filterDateStatus]);

  // Background server sync for filters
  useEffect(() => {
    syncUserFilterPreferencesFromServer<TimelineFilters>(userKey, 'timeline', (serverFilters) => {
      if (serverFilters.zoomLevel) setZoomLevel(serverFilters.zoomLevel);
      if (serverFilters.dateTrack) setDateTrack(serverFilters.dateTrack);
      if (serverFilters.groupBy) setGroupBy(serverFilters.groupBy);
      if (typeof serverFilters.searchQuery === 'string') setSearchQuery(serverFilters.searchQuery);
      if (serverFilters.filterDepartment) setFilterDepartment(serverFilters.filterDepartment);
      if (serverFilters.filterDesigner) setFilterDesigner(serverFilters.filterDesigner);
      if (serverFilters.filterStatus) setFilterStatus(serverFilters.filterStatus);
      if (serverFilters.filterDateStatus) setFilterDateStatus(serverFilters.filterDateStatus);
    });
  }, [userKey]);

  // Reset filters handler
  const handleResetFilters = async () => {
    setZoomLevel(DEFAULT_TIMELINE_FILTERS.zoomLevel);
    setDateTrack(DEFAULT_TIMELINE_FILTERS.dateTrack);
    setGroupBy(DEFAULT_TIMELINE_FILTERS.groupBy);
    setSearchQuery(DEFAULT_TIMELINE_FILTERS.searchQuery);
    setFilterDepartment(DEFAULT_TIMELINE_FILTERS.filterDepartment);
    setFilterDesigner(DEFAULT_TIMELINE_FILTERS.filterDesigner);
    setFilterStatus(DEFAULT_TIMELINE_FILTERS.filterStatus);
    setFilterDateStatus(DEFAULT_TIMELINE_FILTERS.filterDateStatus);
    await resetUserFilterPreferences(userKey, 'timeline');
    showToast('Filters reset to default', 'info');
  };

  // Live Refresh handler
  const handleRefresh = async () => {
    setIsRefreshingLocal(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('recacts_bootstrap_snapshot');
      }
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tickets)) {
          setTicketsList(data.tickets);
          showToast(`Refreshed ${data.tickets.length} tickets from database!`);
        }
      } else {
        showToast('Failed to refresh tickets', 'error');
      }
      if (onRefreshTickets) onRefreshTickets();
    } catch (e: any) {
      showToast(`Refresh error: ${e.message}`, 'error');
    } finally {
      setIsRefreshingLocal(false);
    }
  };

  // Sync Zoho handler
  const handleSyncZoho = async () => {
    if (onSyncZoho) {
      await onSyncZoho();
      await handleRefresh();
      return;
    }
    setIsSyncingLocal(true);
    try {
      const res = await fetch('/api/tickets/sync-zoho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Successfully synced ${data.totalSynced || 'all'} tickets from Zoho!`);
        await handleRefresh();
      } else {
        showToast(data.error || 'Zoho sync failed', 'error');
      }
    } catch (e: any) {
      showToast(`Zoho sync error: ${e.message}`, 'error');
    } finally {
      setIsSyncingLocal(false);
    }
  };

  // Open Quick Edit Modal
  const openEditModal = (t: ProcessedTicket, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTicket(t);
    setEditForm({
      reqStart: t.reqStartDate || '',
      reqEnd: t.reqEndDate || '',
      devStart: t.devStartDate || '',
      devEnd: t.devEndDate || '',
      targetLive: t.targetLiveDate || '',
      department: t.department || '',
      status: t.status || 'To Do',
    });
  };

  // Save Quick Edit Dates
  const handleSaveEdit = async () => {
    if (!editingTicket) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/tickets/${editingTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementStartDate: editForm.reqStart || null,
          requirementEndDate: editForm.reqEnd || null,
          devStartDate: editForm.devStart || null,
          devEndDate: editForm.devEnd || null,
          targetLiveDate: editForm.targetLive || null,
          department: editForm.department || null,
          status: editForm.status || undefined,
        }),
      });

      if (res.ok) {
        showToast(`Updated dates for ${editingTicket.ref}!`);
        // Update local ticket list immediately
        setTicketsList((prev) =>
          prev.map((t) => {
            if (t.id === editingTicket.id) {
              const currentCf = t.customFields || {};
              return {
                ...t,
                requirementStartDate: editForm.reqStart || null,
                requirementEndDate: editForm.reqEnd || null,
                devStartDate: editForm.devStart || null,
                devEndDate: editForm.devEnd || null,
                targetLiveDate: editForm.targetLive || null,
                department: editForm.department || t.department,
                status: editForm.status || t.status,
                customFields: {
                  ...currentCf,
                  UDF_DATETIME10: {
                    label: 'Requirement Start Date',
                    rawValue: editForm.reqStart ? `${editForm.reqStart}T00:00:00.000Z` : '',
                    displayValue: editForm.reqStart ? `${editForm.reqStart}T00:00:00.000Z` : '',
                  },
                  UDF_DATETIME6: {
                    label: 'Requirement End Date',
                    rawValue: editForm.reqEnd ? `${editForm.reqEnd}T00:00:00.000Z` : '',
                    displayValue: editForm.reqEnd ? `${editForm.reqEnd}T00:00:00.000Z` : '',
                  },
                },
              };
            }
            return t;
          })
        );
        setEditingTicket(null);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update ticket dates', 'error');
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 1. Process and normalize every ticket
  const processedTickets: ProcessedTicket[] = useMemo(() => {
    return ticketsList.map((t) => {
      const cf = t.customFields || {};
      const raw = t.rawPayload || {};

      // Requirement dates
      const reqStart =
        t.requirementStartDate ||
        parseZohoDate(cf.UDF_DATETIME10?.rawValue || cf.UDF_DATETIME10?.displayValue || raw.UDF_DATETIME10 || cf.UDF_DATE10?.rawValue) ||
        parseZohoDate(t.plannedStartDate || t.plannedStart);
      const reqEnd =
        t.requirementEndDate ||
        parseZohoDate(cf.UDF_DATETIME6?.rawValue || cf.UDF_DATETIME6?.displayValue || raw.UDF_DATETIME6 || cf.UDF_DATE6?.rawValue) ||
        parseZohoDate(t.plannedDueDate || t.plannedDue);

      // Development dates
      const devStart =
        t.devStartDate ||
        parseZohoDate(cf.UDF_DATE4?.rawValue || cf.UDF_DATE4?.displayValue || raw.UDF_DATE4);
      const devEnd =
        t.devEndDate ||
        parseZohoDate(cf.UDF_DATE3?.rawValue || cf.UDF_DATE3?.displayValue || raw.UDF_DATE3);

      // Target live date
      const targetLive =
        t.targetLiveDate ||
        parseZohoDate(cf.UDF_DATE5?.rawValue || cf.UDF_DATE5?.displayValue || raw.UDF_DATE5);

      // Effective dates based on chosen dateTrack
      let effectiveStart: string | null = null;
      let effectiveEnd: string | null = null;

      if (dateTrack === 'requirement') {
        effectiveStart = reqStart;
        effectiveEnd = reqEnd;
      } else if (dateTrack === 'development') {
        effectiveStart = devStart;
        effectiveEnd = devEnd || targetLive;
      } else {
        effectiveStart = reqStart || devStart;
        effectiveEnd = reqEnd || devEnd || targetLive;
      }

      // Designers list
      let designersList: string[] = [];
      if (Array.isArray(t.designers) && t.designers.length > 0) {
        designersList = t.designers.filter(Boolean);
      } else if (typeof t.designer === 'string' && t.designer) {
        designersList = t.designer.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      if (designersList.length === 0) {
        designersList = ['Unassigned'];
      }

      // Normalized status category
      const rawStatus = String(t.rawStatusName || t.status || '').trim();
      const lower = rawStatus.toLowerCase();
      let statusCategory: ProcessedTicket['statusCategory'] = 'To do';

      if (lower.includes('doc') || lower.includes('review') || lower.includes('spec')) {
        statusCategory = 'Documentation';
      } else if (lower.includes('progress') || lower.includes('testing') || lower.includes('dev') || lower.includes('wip')) {
        statusCategory = 'In progress';
      } else if (lower.includes('complete') || lower.includes('done') || lower.includes('closed') || lower.includes('live')) {
        statusCategory = 'Completed';
      } else {
        statusCategory = 'To do';
      }

      // Date status
      let dateStatus: ProcessedTicket['dateStatus'] = 'No dates';
      let days: number | null = null;

      if (effectiveStart && effectiveEnd) {
        dateStatus = 'Scheduled';
        days = calcDaysInclusive(effectiveStart, effectiveEnd);
      } else if (effectiveEnd) {
        dateStatus = 'End only';
      } else if (effectiveStart) {
        dateStatus = 'Start only';
      } else {
        dateStatus = 'No dates';
      }

      const dept = (t.department || cf.UDF_PKL20?.displayValue || raw.department || '').trim() || null;

      return {
        raw: t,
        id: t.id,
        ref: t.ref || `LA-I${t.id?.slice(0, 4)}`,
        title: t.title || 'Untitled Deliverable',
        customer: t.customer || 'Internal',
        status: t.status || rawStatus || 'To Do',
        rawStatusName: rawStatus,
        statusCategory,
        department: dept,
        designers: designersList,
        primaryDesigner: designersList[0] || 'Unassigned',
        developer: t.developers || (cf.UDF_MULTIPKL1?.displayValue) || null,
        startDate: effectiveStart,
        endDate: effectiveEnd,
        days,
        dateStatus,
        reqStartDate: reqStart,
        reqEndDate: reqEnd,
        devStartDate: devStart,
        devEndDate: devEnd,
        targetLiveDate: targetLive,
        weightage: t.totalWeightage || t.points || 0,
        zohoUrl: t.zohoUrl || (t.id ? `/api/tickets/${t.id}/sprint` : undefined),
      };
    });
  }, [ticketsList, dateTrack]);

  // 2. Extract unique departments for filter dropdown
  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    const excluded = new Set(['Alpha', 'Beta', 'alpha', 'beta']);
    for (const t of processedTickets) {
      if (t.department && !excluded.has(t.department)) {
        set.add(t.department);
      }
    }
    return Array.from(set).sort();
  }, [processedTickets]);

  // 3. Extract unique designers for filter dropdown
  const allDesigners = useMemo(() => {
    const set = new Set<string>();
    for (const t of processedTickets) {
      for (const d of t.designers) {
        if (d) set.add(d);
      }
    }
    return Array.from(set).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
  }, [processedTickets]);

  // 4. Filtered tickets
  const filteredTickets = useMemo(() => {
    return processedTickets.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = t.ref.toLowerCase().includes(q);
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesCustomer = t.customer.toLowerCase().includes(q);
        const matchesDesigner = t.designers.some((d) => d.toLowerCase().includes(q));
        const matchesDev = t.developer ? t.developer.toLowerCase().includes(q) : false;
        if (!matchesRef && !matchesTitle && !matchesCustomer && !matchesDesigner && !matchesDev) {
          return false;
        }
      }

      // Department filter
      if (filterDepartment !== 'all') {
        if (t.department !== filterDepartment) return false;
      }

      // Designer filter
      if (filterDesigner !== 'all') {
        if (!t.designers.includes(filterDesigner)) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        if (t.statusCategory !== filterStatus && t.rawStatusName !== filterStatus && t.status !== filterStatus) {
          return false;
        }
      }

      // Date status filter
      if (filterDateStatus === 'scheduled' && t.dateStatus !== 'Scheduled') return false;
      if (filterDateStatus === 'missing' && t.dateStatus === 'Scheduled') return false;
      if (filterDateStatus === 'end_only' && t.dateStatus !== 'End only') return false;
      if (filterDateStatus === 'no_dates' && t.dateStatus !== 'No dates') return false;

      return true;
    });
  }, [processedTickets, searchQuery, filterDepartment, filterDesigner, filterStatus, filterDateStatus]);

  // 5. Summary KPI statistics (matching the XLS top summary)
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    let scheduled = 0;
    let inProgress = 0;
    let missingDates = 0;
    const designersSet = new Set<string>();

    for (const t of filteredTickets) {
      if (t.dateStatus === 'Scheduled') scheduled++;
      else missingDates++;

      if (t.statusCategory === 'In progress') inProgress++;
      for (const d of t.designers) {
        if (d && d !== 'Unassigned') designersSet.add(d);
      }
    }

    return {
      total,
      scheduled,
      inProgress,
      missingDates,
      designersCount: designersSet.size || (allDesigners.filter((d) => d !== 'Unassigned').length || 1),
    };
  }, [filteredTickets, allDesigners]);

  // 6. Grouping
  interface TicketGroup {
    id: string;
    name: string;
    tickets: ProcessedTicket[];
    earliestDate: string | null;
    latestDate: string | null;
    totalSpanDays: number | null;
  }

  const groupedTickets = useMemo<TicketGroup[]>(() => {
    const groupMap = new Map<string, ProcessedTicket[]>();

    if (groupBy === 'designer') {
      for (const t of filteredTickets) {
        for (const d of t.designers) {
          const list = groupMap.get(d) || [];
          list.push(t);
          groupMap.set(d, list);
        }
      }
    } else if (groupBy === 'department') {
      for (const t of filteredTickets) {
        const key = t.department || 'No Department';
        const list = groupMap.get(key) || [];
        list.push(t);
        groupMap.set(key, list);
      }
    } else if (groupBy === 'status') {
      for (const t of filteredTickets) {
        const key = t.statusCategory;
        const list = groupMap.get(key) || [];
        list.push(t);
        groupMap.set(key, list);
      }
    } else if (groupBy === 'developer') {
      for (const t of filteredTickets) {
        const key = t.developer || 'No Developer';
        const list = groupMap.get(key) || [];
        list.push(t);
        groupMap.set(key, list);
      }
    } else {
      groupMap.set('All Items', filteredTickets);
    }

    const groups: TicketGroup[] = [];
    groupMap.forEach((gTickets, name) => {
      let minDate: string | null = null;
      let maxDate: string | null = null;

      for (const t of gTickets) {
        const tMin = t.startDate || t.endDate;
        const tMax = t.endDate || t.startDate;

        if (tMin) {
          if (!minDate || tMin < minDate) minDate = tMin;
        }
        if (tMax) {
          if (!maxDate || tMax > maxDate) maxDate = tMax;
        }
      }

      let totalSpanDays: number | null = null;
      if (minDate && maxDate) {
        totalSpanDays = calcDaysInclusive(minDate, maxDate);
      }

      const sortedTickets = [...gTickets].sort((a, b) => {
        if (a.dateStatus === 'Scheduled' && b.dateStatus !== 'Scheduled') return -1;
        if (b.dateStatus === 'Scheduled' && a.dateStatus !== 'Scheduled') return 1;
        const dateA = a.startDate || a.endDate || '9999-99-99';
        const dateB = b.startDate || b.endDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      });

      groups.push({
        id: name,
        name,
        tickets: sortedTickets,
        earliestDate: minDate,
        latestDate: maxDate,
        totalSpanDays,
      });
    });

    return groups.sort((a, b) => {
      if (a.name === 'Unassigned' || a.name === 'No Developer') return 1;
      if (b.name === 'Unassigned' || b.name === 'No Developer') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredTickets, groupBy]);

  // 7. Dynamic Calendar Date Grid Range
  const { timelineStart, timelineEnd, totalDays, calendarDays, calendarMonths } = useMemo(() => {
    let minDateStr: string | null = null;
    let maxDateStr: string | null = null;

    for (const t of filteredTickets) {
      const s = t.startDate;
      const e = t.endDate;
      if (s) {
        if (!minDateStr || s < minDateStr) minDateStr = s;
        if (!maxDateStr || s > maxDateStr) maxDateStr = s;
      }
      if (e) {
        if (!minDateStr || e < minDateStr) minDateStr = e;
        if (!maxDateStr || e > maxDateStr) maxDateStr = e;
      }
    }

    const now = new Date(todayStr + 'T00:00:00');
    if (!minDateStr) {
      const dMin = new Date(now.getTime() - 30 * 86400000);
      minDateStr = dMin.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }
    if (!maxDateStr) {
      const dMax = new Date(now.getTime() + 45 * 86400000);
      maxDateStr = dMax.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }

    if (todayStr < minDateStr) minDateStr = todayStr;
    if (todayStr > maxDateStr) maxDateStr = todayStr;

    const startDate = new Date(minDateStr + 'T00:00:00');
    const dayOfWeek = (startDate.getDay() + 6) % 7;
    startDate.setDate(startDate.getDate() - dayOfWeek - 7);

    const endDate = new Date(maxDateStr + 'T00:00:00');
    const endDayOfWeek = (endDate.getDay() + 6) % 7;
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek) + 7);

    const daysCount = Math.max(14, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);

    const daysArr: Array<{
      dateStr: string;
      dayNumber: number;
      dayName: string;
      isWeekend: boolean;
      isToday: boolean;
      monthKey: string;
    }> = [];

    const monthMap = new Map<string, { label: string; startIndex: number; count: number }>();

    for (let i = 0; i < daysCount; i++) {
      const cur = new Date(startDate.getTime() + i * 86400000);
      const curStr = cur.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const dayNum = cur.getDate();
      const dOfWeek = cur.getDay();
      const isWeekend = dOfWeek === 0 || dOfWeek === 6;
      const isToday = curStr === todayStr;

      const monthKey = cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();

      daysArr.push({
        dateStr: curStr,
        dayNumber: dayNum,
        dayName: cur.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isWeekend,
        isToday,
        monthKey,
      });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { label: monthKey, startIndex: i, count: 1 });
      } else {
        const m = monthMap.get(monthKey)!;
        m.count += 1;
      }
    }

    const tStart = daysArr[0]?.dateStr || minDateStr;
    const tEnd = daysArr[daysArr.length - 1]?.dateStr || maxDateStr;

    return {
      timelineStart: tStart,
      timelineEnd: tEnd,
      totalDays: daysCount,
      calendarDays: daysArr,
      calendarMonths: Array.from(monthMap.values()),
    };
  }, [filteredTickets, todayStr]);

  // Position helpers
  const getPercentageForDate = (dateStr: string): number => {
    if (!dateStr || dateStr < timelineStart) return 0;
    if (dateStr > timelineEnd) return 100;
    const s = new Date(timelineStart + 'T00:00:00').getTime();
    const cur = new Date(dateStr + 'T00:00:00').getTime();
    const e = new Date(timelineEnd + 'T00:00:00').getTime();
    const pct = ((cur - s) / (e - s)) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const todayPositionPct = useMemo(() => {
    return getPercentageForDate(todayStr);
  }, [todayStr, timelineStart, timelineEnd]);

  // Auto-scroll to Today on mount
  useEffect(() => {
    if (timelineContainerRef.current && todayPositionPct > 0) {
      const container = timelineContainerRef.current;
      const scrollWidth = container.scrollWidth;
      const targetScroll = (scrollWidth * todayPositionPct) / 100 - container.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [zoomLevel, todayPositionPct]);

  // Group collapse toggles
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const expandAll = () => setCollapsedGroups({});
  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    for (const g of groupedTickets) all[g.id] = true;
    setCollapsedGroups(all);
  };

  // Status badge styling
  const renderStatusBadge = (cat: ProcessedTicket['statusCategory'], rawText: string) => {
    switch (cat) {
      case 'In progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
            {rawText || 'In Progress'}
          </span>
        );
      case 'Documentation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400" />
            {rawText || 'Documentation'}
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            {rawText || 'Completed'}
          </span>
        );
      case 'To do':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            {rawText || 'To Do'}
          </span>
        );
    }
  };

  // Date status pill
  const renderDateStatusPill = (t: ProcessedTicket) => {
    switch (t.dateStatus) {
      case 'Scheduled':
        return (
          <button
            onClick={(e) => openEditModal(t, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 whitespace-nowrap hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all cursor-pointer"
            title="Click to edit dates"
          >
            <span>●</span> Scheduled
          </button>
        );
      case 'End only':
        return (
          <button
            onClick={(e) => openEditModal(t, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 whitespace-nowrap hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all cursor-pointer"
            title="Click to set start date"
          >
            <span>◐</span> End only
          </button>
        );
      case 'Start only':
        return (
          <button
            onClick={(e) => openEditModal(t, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20 whitespace-nowrap hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all cursor-pointer"
            title="Click to set end date"
          >
            <span>◐</span> Start only
          </button>
        );
      case 'No dates':
      default:
        return (
          <button
            onClick={(e) => openEditModal(t, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-500/10 dark:hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20 whitespace-nowrap transition-all cursor-pointer"
            title="Click to set dates"
          >
            <span>○</span> Set dates
          </button>
        );
    }
  };

  // Bar colors by status
  const getBarGradient = (cat: ProcessedTicket['statusCategory']) => {
    switch (cat) {
      case 'In progress':
        return 'from-blue-600 via-indigo-600 to-indigo-700 shadow-indigo-500/25 text-white';
      case 'Documentation':
        return 'from-purple-600 via-violet-600 to-fuchsia-700 shadow-purple-500/25 text-white';
      case 'Completed':
        return 'from-emerald-600 via-teal-600 to-green-700 shadow-emerald-500/25 text-white';
      case 'To do':
      default:
        return 'from-amber-600 via-amber-700 to-orange-700 shadow-amber-500/25 text-white';
    }
  };

  const dayColWidth = zoomLevel === 'day' ? 38 : zoomLevel === 'week' ? 22 : 14;
  const gridMinWidth = totalDays * dayColWidth;
  const isSyncingActive = isSyncingZohoProp || isSyncingLocal;

  const heightClass =
    tableHeight === 'tall'
      ? 'h-[calc(100vh-210px)] min-h-[640px]'
      : tableHeight === 'compact'
      ? 'h-[500px]'
      : 'h-[calc(100vh-275px)] min-h-[520px]';

  return (
    <div className="h-full flex flex-col gap-2.5 overflow-hidden animate-in fade-in duration-200 text-slate-900 dark:text-slate-100 relative">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl border bg-slate-900 text-white border-slate-700 text-xs font-semibold animate-in slide-in-from-bottom-2">
          {feedbackToast.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
          {feedbackToast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {feedbackToast.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400" />}
          <span>{feedbackToast.message}</span>
          <button onClick={() => setFeedbackToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Interactive Gantt Timeline
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-medium">
                  {dateTrack === 'requirement' ? 'Requirement View' : dateTrack === 'development' ? 'Development View' : 'Combined View'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Grouped by designer &bull; Real-time schedule with live status, duration spans, and milestone overlays.
              </p>
            </div>
          </div>
        </div>

        {/* View Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Data Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshingLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Fetch latest tickets from database (clears cached snapshot)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLocal ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{isRefreshingLocal ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {/* Sync Zoho Button */}
          <button
            onClick={handleSyncZoho}
            disabled={isSyncingActive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
            title="Fetch live updated dates and tickets from Zoho Sprints"
          >
            <CloudDownload className={`w-3.5 h-3.5 ${isSyncingActive ? 'animate-bounce' : ''}`} />
            <span>{isSyncingActive ? 'Syncing Zoho...' : 'Sync Zoho'}</span>
          </button>

          {/* Timeline Track Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setDateTrack('requirement')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                dateTrack === 'requirement'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="View Requirement Start & End dates"
            >
              Requirement Dates
            </button>
            <button
              onClick={() => setDateTrack('development')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                dateTrack === 'development'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="View Development Start & Target Live dates"
            >
              Development Dates
            </button>
          </div>

          {/* Zoom switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            {(['day', 'week', 'month'] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${
                  zoomLevel === z
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {z} View
              </button>
            ))}
          </div>

          {/* Jump to Today Button */}
          <button
            onClick={() => {
              if (timelineContainerRef.current) {
                const container = timelineContainerRef.current;
                const scrollWidth = container.scrollWidth;
                const targetScroll = (scrollWidth * todayPositionPct) / 100 - container.clientWidth / 2;
                container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold transition-all"
            title="Center timeline on today's date"
          >
            <Clock className="w-3.5 h-3.5" />
            Jump to Today
          </button>
        </div>
      </div>

      {/* 2. Compact Minimal KPI Metrics */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-2xs">
          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tickets:</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{stats.total}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-emerald-200/80 dark:border-emerald-900/30 bg-white/80 dark:bg-slate-900/60 shadow-2xs">
          <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Scheduled:</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats.scheduled}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-indigo-200/80 dark:border-indigo-900/30 bg-white/80 dark:bg-slate-900/60 shadow-2xs">
          <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">In Progress:</span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{stats.inProgress}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-amber-200/80 dark:border-amber-900/30 bg-white/80 dark:bg-slate-900/60 shadow-2xs">
          <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Missing Dates:</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">{stats.missingDates}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-purple-200/80 dark:border-purple-900/30 bg-white/80 dark:bg-slate-900/60 shadow-2xs col-span-2 sm:col-span-1">
          <div className="w-6 h-6 rounded-md bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Designers:</span>
            <span className="text-sm font-black text-purple-600 dark:text-purple-400">{stats.designersCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="shrink-0 modern-card p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket ID, title, designer, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-7 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Group By selector */}
          <div>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full h-8 py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 font-medium transition-colors"
            >
              <option value="designer">Group by Designer (Default)</option>
              <option value="department">Group by Department</option>
              <option value="status">Group by Status</option>
              <option value="developer">Group by Developer</option>
              <option value="none">Flat List (No Grouping)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full h-8 py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 font-medium transition-colors"
            >
              <option value="all">All Departments ({allDepartments.length})</option>
              {allDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Designer Filter */}
          <div>
            <select
              value={filterDesigner}
              onChange={(e) => setFilterDesigner(e.target.value)}
              className="w-full h-8 py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 font-medium transition-colors"
            >
              <option value="all">All Designers ({allDesigners.length})</option>
              {allDesigners.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Date Status Filter */}
          <div>
            <select
              value={filterDateStatus}
              onChange={(e) => setFilterDateStatus(e.target.value as any)}
              className="w-full h-8 py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 font-medium transition-colors"
            >
              <option value="all">All Date Statuses</option>
              <option value="scheduled">Scheduled Only (●)</option>
              <option value="end_only">End Date Only (◆)</option>
              <option value="missing">Missing Dates</option>
              <option value="no_dates">No Dates Only (○)</option>
            </select>
          </div>
        </div>

        {/* User filter status bar + Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
            <button
              onClick={expandAll}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
            >
              Expand All
            </button>
            <span>&bull;</span>
            <button
              onClick={collapseAll}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
            >
              Collapse All
            </button>
          </div>

          {/* User Level Saved Filter Indicator */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-semibold">
              <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
              <span>User filters saved: {currentUserName || 'active profile'}</span>
            </div>

            <button
              onClick={handleResetFilters}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Reset all filters to defaults"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Split View: Table Columns + Calendar Grid */}
      <div className="flex-1 min-h-0 modern-card rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-lg overflow-hidden flex flex-col">
        {/* Scrollable Container Filling 100% Remaining Height */}
        <div className="flex-1 min-h-0 overflow-auto relative" ref={timelineContainerRef}>
          <div className="min-w-fit flex flex-col">
            {/* Header: Left Table Column Titles + Right Month/Day Ticks */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 sticky top-0 z-30">
              {/* Left Table Headers */}
              <div className="w-[560px] shrink-0 flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 sticky left-0 z-40 shadow-[4px_0_12px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_16px_rgba(0,0,0,0.5)]">
                <div className="w-28 shrink-0 px-3 py-2.5">Item ID</div>
                <div className="flex-1 min-w-0 px-3 py-2.5">Deliverable / Ticket</div>
                <div className="w-28 shrink-0 px-2 py-2.5 text-center">Status</div>
                <div className="w-24 shrink-0 px-2 py-2.5 text-center">Dates</div>
              </div>

              {/* Right Calendar Month/Day Header Tier */}
              <div
                className="flex-1 flex flex-col relative z-10 overflow-hidden"
                style={{ width: `${gridMinWidth}px`, minWidth: `${gridMinWidth}px` }}
              >
                {/* Upper Tier: Months */}
                <div className="flex h-7 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {calendarMonths.map((m) => (
                    <div
                      key={m.label + m.startIndex}
                      className="border-r border-slate-200 dark:border-slate-800/80 px-2 flex items-center text-indigo-700 dark:text-indigo-400 bg-slate-100/70 dark:bg-slate-900/40 truncate"
                      style={{ width: `${m.count * dayColWidth}px` }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>

                {/* Lower Tier: Days / Day Numbers */}
                <div className="flex h-8 text-[10px] text-slate-500 dark:text-slate-400">
                  {calendarDays.map((d) => (
                    <div
                      key={d.dateStr}
                      className={`flex flex-col items-center justify-center border-r border-slate-200/60 dark:border-slate-800/40 shrink-0 ${
                        d.isWeekend ? 'bg-slate-100/60 dark:bg-slate-950/60 text-slate-400 dark:text-slate-600' : ''
                      } ${d.isToday ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border-rose-300 dark:border-rose-500/40' : ''}`}
                      style={{ width: `${dayColWidth}px` }}
                      title={`${d.dateStr} (${d.dayName})`}
                    >
                      <span className="text-[9px] font-mono leading-none">{d.dayNumber}</span>
                      {zoomLevel === 'day' && (
                        <span className="text-[8px] opacity-75 uppercase leading-none mt-0.5">{d.dayName}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Today Marker Line in Header */}
                {todayPositionPct >= 0 && todayPositionPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
                    style={{ left: `${todayPositionPct}%` }}
                  >
                    <span className="px-1.5 py-0.5 rounded-b bg-rose-500 text-white text-[9px] font-bold shadow-md shadow-rose-500/40 whitespace-nowrap -translate-x-1/2">
                      Today
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Body: Groups & Tickets */}
            <div className="relative bg-white dark:bg-slate-900/40">
              {groupedTickets.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-500/80 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">No tickets found matching current filters</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting your search query, department, or date status filters.</p>
                </div>
              ) : (
                groupedTickets.map((group) => {
                  const isCollapsed = Boolean(collapsedGroups[group.id]);

                  // Group span percentage
                  let groupStartPct = 0;
                  let groupWidthPct = 0;
                  if (group.earliestDate && group.latestDate) {
                    groupStartPct = getPercentageForDate(group.earliestDate);
                    const groupEndPct = getPercentageForDate(group.latestDate);
                    groupWidthPct = Math.max(0.5, groupEndPct - groupStartPct);
                  }

                  return (
                    <div key={group.id} className="border-b border-slate-200/80 dark:border-slate-800/80">
                      {/* Group Header Row */}
                      <div className="flex items-center bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-200/70 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-200 dark:border-slate-800/60">
                        {/* Left Table: Group Header Info */}
                        <div
                          onClick={() => toggleGroup(group.id)}
                          className="w-[560px] shrink-0 px-3 py-2 flex items-center justify-between cursor-pointer border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 sticky left-0 z-20 select-none shadow-[4px_0_12px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_16px_rgba(0,0,0,0.5)]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{group.name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shrink-0">
                              {group.tickets.length} {group.tickets.length === 1 ? 'ticket' : 'tickets'}
                            </span>
                          </div>

                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 text-right shrink-0 pl-2">
                            {group.earliestDate && group.latestDate ? (
                              <span>
                                {formatDateDisplay(group.earliestDate)} &ndash; {formatDateDisplay(group.latestDate)}{' '}
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">({group.totalSpanDays}d)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">No active dates</span>
                            )}
                          </div>
                        </div>

                        {/* Right Calendar: Designer Span Bar */}
                        <div
                          className="flex-1 h-9 relative isolate overflow-hidden flex items-center bg-slate-100/50 dark:bg-slate-900/80 z-0"
                          style={{ width: `${gridMinWidth}px`, minWidth: `${gridMinWidth}px` }}
                        >
                          {/* Today line */}
                          {todayPositionPct >= 0 && todayPositionPct <= 100 && (
                            <div
                              className="absolute top-0 bottom-0 pointer-events-none z-0 w-px bg-rose-500/70"
                              style={{ left: `${todayPositionPct}%` }}
                            />
                          )}

                          {group.earliestDate && group.latestDate && groupWidthPct > 0 && (
                            <div
                              className="absolute h-5 rounded-md bg-purple-100/80 dark:bg-purple-500/15 border border-purple-300 dark:border-purple-500/40 text-[10px] text-purple-700 dark:text-purple-300 flex items-center px-2 font-mono font-bold shadow-xs truncate z-1"
                              style={{
                                left: `${groupStartPct}%`,
                                width: `${groupWidthPct}%`,
                              }}
                              title={`${group.name} active window: ${group.earliestDate} to ${group.latestDate} (${group.totalSpanDays} days)`}
                            >
                              <span className="truncate">
                                {group.name} span: {group.totalSpanDays} days
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ticket Rows */}
                      {!isCollapsed &&
                        group.tickets.map((t) => {
                          const isHovered = hoveredTicketId === t.id;

                          // Percentage positioning for scheduled bar
                          let startPct = 0;
                          let widthPct = 0;
                          let endPct = 0;

                          if (t.startDate && t.endDate) {
                            startPct = getPercentageForDate(t.startDate);
                            endPct = getPercentageForDate(t.endDate);
                            widthPct = Math.max(0.6, endPct - startPct);
                          } else if (t.endDate) {
                            endPct = getPercentageForDate(t.endDate);
                          } else if (t.startDate) {
                            startPct = getPercentageForDate(t.startDate);
                          }

                          const barTooltip = `${t.ref} • ${t.title}\nStatus: ${t.status}\nDesigner: ${t.designers.join(', ')}\nStart: ${t.startDate || '-'}\nEnd: ${t.endDate || '-'}${t.days ? ` (${t.days} days)` : ''}`;

                          return (
                            <div
                              key={`${group.id}-${t.id}`}
                              onMouseEnter={() => setHoveredTicketId(t.id)}
                              onMouseLeave={() => setHoveredTicketId(null)}
                              className={`flex items-center border-b border-slate-100 dark:border-slate-800/40 transition-colors text-xs group ${
                                isHovered ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                              }`}
                            >
                              {/* Left Table Data */}
                              <div className="w-[560px] shrink-0 flex items-center border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky left-0 z-20 py-2 shadow-[4px_0_12px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_16px_rgba(0,0,0,0.5)]">
                                {/* Item ID & Actions */}
                                <div className="w-28 shrink-0 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate flex items-center justify-between gap-1">
                                  <button
                                    onClick={() => onSelectTicket && onSelectTicket(t.raw)}
                                    className="hover:underline text-left truncate"
                                    title={`View ${t.ref} in RecActs`}
                                  >
                                    <span>{t.ref}</span>
                                  </button>
                                  <div className="flex items-center shrink-0">
                                    <a
                                      href={t.zohoUrl || `/api/tickets/${t.id}/sprint`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                      title={`Open ${t.ref} in Zoho Sprints ↗`}
                                    >
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                    <button
                                      onClick={(e) => openEditModal(t, e)}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity"
                                      title="Quick Edit Dates & Details"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Title / Deliverable */}
                                <div
                                  className="flex-1 min-w-0 px-3 truncate text-slate-800 dark:text-slate-200 font-medium cursor-pointer flex items-center gap-1.5"
                                  onClick={() => onSelectTicket && onSelectTicket(t.raw)}
                                  title={`${t.ref}: ${t.title}`}
                                >
                                  <span className="truncate">{t.title}</span>
                                  {t.department && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.1]">
                                      {t.department}
                                    </span>
                                  )}
                                </div>

                                {/* Status */}
                                <div className="w-28 shrink-0 px-2 flex justify-center">
                                  {renderStatusBadge(t.statusCategory, t.rawStatusName || t.status)}
                                </div>

                                {/* Dates Status Pill (Clickable to Edit) */}
                                <div className="w-24 shrink-0 px-2 flex justify-center">
                                  {renderDateStatusPill(t)}
                                </div>
                              </div>

                              {/* Right Calendar Grid: Gantt Bar / Milestone Marker */}
                              <div
                                className="flex-1 h-9 relative isolate overflow-hidden flex items-center px-1 bg-white dark:bg-slate-900/40 z-0"
                                style={{ width: `${gridMinWidth}px`, minWidth: `${gridMinWidth}px` }}
                              >
                                {/* Today vertical line */}
                                {todayPositionPct >= 0 && todayPositionPct <= 100 && (
                                  <div
                                    className="absolute top-0 bottom-0 pointer-events-none z-0 w-px bg-rose-500/70"
                                    style={{ left: `${todayPositionPct}%` }}
                                  />
                                )}

                                {t.dateStatus === 'Scheduled' && (
                                  <div
                                    onClick={() => onSelectTicket && onSelectTicket(t.raw)}
                                    title={barTooltip}
                                    className={`absolute h-6 rounded-md bg-gradient-to-r ${getBarGradient(
                                      t.statusCategory
                                    )} flex items-center px-2 text-[10px] font-bold shadow-sm cursor-pointer hover:brightness-105 dark:hover:brightness-110 transition-all z-1 group truncate`}
                                    style={{
                                      left: `${startPct}%`,
                                      width: `${widthPct}%`,
                                      minWidth: '24px',
                                    }}
                                  >
                                    <span className="truncate drop-shadow-sm">
                                      {t.ref} &bull; {t.days}d
                                    </span>
                                  </div>
                                )}

                                {t.dateStatus === 'End only' && (
                                  <div
                                    onClick={() => onSelectTicket && onSelectTicket(t.raw)}
                                    title={`Milestone: Requirement End Date: ${t.endDate} (${t.ref})`}
                                    className="absolute flex items-center cursor-pointer group z-1"
                                    style={{ left: `${endPct}%` }}
                                  >
                                    <div className="w-5 h-5 -ml-2.5 rounded-full bg-purple-100 dark:bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-600 dark:text-purple-300 shadow-sm">
                                      <span className="text-xs font-black">◆</span>
                                    </div>
                                    <span className="ml-1 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-500/30 whitespace-nowrap shadow-xs">
                                      End: {formatDateDisplay(t.endDate)}
                                    </span>
                                  </div>
                                )}

                                {t.dateStatus === 'Start only' && (
                                  <div
                                    onClick={() => onSelectTicket && onSelectTicket(t.raw)}
                                    title={`Milestone: Requirement Start Date: ${t.startDate} (${t.ref})`}
                                    className="absolute flex items-center cursor-pointer group z-1"
                                    style={{ left: `${startPct}%` }}
                                  >
                                    <div className="w-5 h-5 -ml-2.5 rounded-full bg-sky-100 dark:bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-600 dark:text-sky-300 shadow-sm">
                                      <span className="text-xs font-black">◆</span>
                                    </div>
                                    <span className="ml-1 text-[10px] font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-500/30 whitespace-nowrap shadow-xs">
                                      Start: {formatDateDisplay(t.startDate)}
                                    </span>
                                  </div>
                                )}

                                {t.dateStatus === 'No dates' && (
                                  <button
                                    onClick={(e) => openEditModal(t, e)}
                                    className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 italic px-2 transition-colors cursor-pointer"
                                    title="Click to set dates"
                                  >
                                    + Add dates for this deliverable
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 5. Bottom Legend & Info Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20">
          <div className="flex flex-wrap items-center gap-3.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-0.5">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> In progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-purple-500" /> Documentation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> To do
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 rounded bg-purple-100 dark:bg-indigo-500/20 border border-purple-300 dark:border-indigo-400/40" /> Designer span
            </span>
            <span className="flex items-center gap-1">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-xs">◆</span> End-date only
            </span>
            <span className="flex items-center gap-1">
              <span className="text-sky-600 dark:text-sky-400 font-bold text-xs">◆</span> Start-date only
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
              <span className="w-1 h-3 bg-rose-500 rounded-full inline-block" /> Today ({formatDateDisplay(todayStr)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Table Height Preset Selector */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded text-[10px] font-medium text-slate-600 dark:text-slate-400">
              <span className="px-1.5 text-slate-500 uppercase text-[9px] font-bold">Height:</span>
              <button
                onClick={() => setTableHeight('fit')}
                className={`px-1.5 py-0.5 rounded ${tableHeight === 'fit' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-2xs' : 'hover:text-slate-900 dark:hover:text-slate-200'}`}
                title="Full height of screen (Fit viewport)"
              >
                Full Screen
              </button>
              <button
                onClick={() => setTableHeight('tall')}
                className={`px-1.5 py-0.5 rounded ${tableHeight === 'tall' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-2xs' : 'hover:text-slate-900 dark:hover:text-slate-200'}`}
                title="Expanded tall height"
              >
                Tall
              </button>
              <button
                onClick={() => setTableHeight('compact')}
                className={`px-1.5 py-0.5 rounded ${tableHeight === 'compact' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-2xs' : 'hover:text-slate-900 dark:hover:text-slate-200'}`}
                title="Compact fixed height (500px)"
              >
                Compact
              </button>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:block">
              Timeline: <span className="text-slate-800 dark:text-slate-200 font-bold">{formatDateDisplay(timelineStart)}</span> &ndash;{' '}
              <span className="text-slate-800 dark:text-slate-200 font-bold">{formatDateDisplay(timelineEnd)}</span> ({totalDays}d)
            </div>
          </div>
        </div>
      </div>

      {/* 6. Quick Date & Details Edit Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Edit Deliverable Dates
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                      {editingTicket.ref}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    {editingTicket.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Requirement Dates */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                  Requirement Dates (Gantt Schedule)
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Start Date</label>
                    <input
                      type="date"
                      value={editForm.reqStart}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, reqStart: e.target.value }))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">End Date</label>
                    <input
                      type="date"
                      value={editForm.reqEnd}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, reqEnd: e.target.value }))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Development & Target Live Dates */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  Development & Target Live Dates
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Dev Start Date</label>
                    <input
                      type="date"
                      value={editForm.devStart}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, devStart: e.target.value }))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Target Live Date</label>
                    <input
                      type="date"
                      value={editForm.targetLive}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, targetLive: e.target.value }))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Department & Status */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Requirement, Testing"
                    value={editForm.department}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="Req In progress">Req In progress</option>
                    <option value="Req Documentation">Req Documentation</option>
                    <option value="Req to do">Req to do</option>
                    <option value="Req Handoff">Req Handoff</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingTicket(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingEdit ? 'Saving...' : 'Save Dates'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
