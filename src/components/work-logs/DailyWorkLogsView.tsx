'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  History,
  CheckCheck,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  ArrowRight,
  FileText,
  UserCheck,
  Info,
  Layers,
  ChevronDown,
} from 'lucide-react';

export interface WorkLogActivityItem {
  id: string;
  ticketId?: string | null;
  ticketRef: string;
  activityType: string;
  description: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  durationMinutes: number;
  progressStatus: string;
  blockerFlag: boolean;
  blockerDetails?: string;
  blockerId?: string | null;
}

export interface DailyWorkLogsViewProps {
  currentUser: any;
  tickets: any[];
  attendance?: any;
  onShowToast: (message: string) => void;
  onRefreshData?: () => void;
  onOpenTicketDetails?: (ticket: any) => void;
}

const ACTIVITY_CATEGORIES = [
  'Requirement Analysis',
  'Research & Development',
  'UI/UX Design & Prototype',
  'Customer Discussion',
  'Internal Discussion',
  'Documentation & Spec',
  'Review & QA',
  'Rework & Bug Fixing',
  'Testing Support',
  'Other',
];

const PROGRESS_STATUSES = [
  { value: 'In Progress', label: 'In Progress', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'Completed', label: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'Review Ready', label: 'Review Ready', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'On Hold', label: 'On Hold / Blocked', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
];

// Helper: Format Date to YYYY-MM-DD
function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Calculate minutes between HH:mm and HH:mm
function calculateDurationBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;
  const startMin = sH * 60 + sM;
  let endMin = eH * 60 + eM;
  if (endMin < startMin) {
    endMin += 24 * 60; // Crosses midnight
  }
  return Math.max(0, endMin - startMin);
}

// Helper: Add minutes to HH:mm string
function addMinutesToTime(time: string, mins: number): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const totalMin = (h * 60 + m + mins) % (24 * 60);
  const newH = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const newM = String(totalMin % 60).padStart(2, '0');
  return `${newH}:${newM}`;
}

export function DailyWorkLogsView({
  currentUser,
  tickets = [],
  attendance,
  onShowToast,
  onRefreshData,
  onOpenTicketDetails,
}: DailyWorkLogsViewProps) {
  // Current active date (Defaults to today in local time)
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateToISO(new Date()));
  const [submissionStatus, setSubmissionStatus] = useState<string>('Draft');
  const [reviewComments, setReviewComments] = useState<string>('');
  const [activities, setActivities] = useState<WorkLogActivityItem[]>([]);
  const [timesheetHistory, setTimesheetHistory] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  // Active ticket search / picker for specific row
  const [ticketSearchOpenRowId, setTicketSearchOpenRowId] = useState<string | null>(null);
  const [ticketSearchQuery, setTicketSearchQuery] = useState<string>('');

  // Fetch work log for selected date
  const loadWorkLogForDate = useCallback(
    async (dateStr: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/work-logs?date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          if (data.workLog) {
            setSubmissionStatus(data.workLog.submissionStatus || 'Draft');
            setReviewComments(data.workLog.reviewComments || '');
            const mappedActivities = (data.workLog.activities || []).map((a: any) => ({
              id: a.id || `act-${Math.random().toString(36).substring(2, 9)}`,
              ticketId: a.ticketId || null,
              ticketRef: a.ticket?.reference || a.ticketRef || '',
              activityType: a.activityType || 'Requirement Analysis',
              description: a.description || '',
              startTime: a.startTime || '',
              endTime: a.endTime || '',
              durationMinutes: Number(a.durationMinutes || 0),
              progressStatus: a.progressStatus || 'In Progress',
              blockerFlag: Boolean(a.blockerFlag),
              blockerDetails: a.blockerDetails || '',
            }));
            setActivities(mappedActivities);
          } else {
            setSubmissionStatus('Draft');
            setReviewComments('');
            setActivities([]);
          }
          if (Array.isArray(data.history)) {
            setTimesheetHistory(data.history);
          }
        } else {
          onShowToast('Failed to load work log');
        }
      } catch (e) {
        onShowToast('Error fetching daily work log');
      } finally {
        setIsLoading(false);
        setHasUnsavedChanges(false);
      }
    },
    [onShowToast]
  );

  useEffect(() => {
    loadWorkLogForDate(selectedDate);
  }, [selectedDate, loadWorkLogForDate]);

  // Total logged minutes & hours
  const totalLoggedMinutes = useMemo(() => {
    return activities.reduce((sum, act) => sum + (Number(act.durationMinutes) || 0), 0);
  }, [activities]);

  const totalLoggedHours = (totalLoggedMinutes / 60).toFixed(1);
  const standardDailyTargetMin = 8 * 60; // 8 hours = 480 mins
  const progressPercent = Math.min(100, Math.round((totalLoggedMinutes / standardDailyTargetMin) * 100));

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(formatDateToISO(cur));
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(formatDateToISO(cur));
  };

  const handleSetToday = () => {
    setSelectedDate(formatDateToISO(new Date()));
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateToISO(d));
  };

  // Week strip calculation (Mon-Sun for the selectedDate)
  const weekDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const day = curr.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = day === 0 ? -6 : 1 - day; // distance to Monday
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMon);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = formatDateToISO(d);
      const isSelected = iso === selectedDate;
      const isToday = iso === formatDateToISO(new Date());

      // Check if history has hours for this date
      const histItem = timesheetHistory.find((h) => h.workDate === iso);

      days.push({
        iso,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isSelected,
        isToday,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        status: histItem?.submissionStatus || (isSelected ? submissionStatus : null),
        hours: histItem ? (histItem.totalMinutes / 60).toFixed(1) : isSelected ? totalLoggedHours : null,
      });
    }
    return days;
  }, [selectedDate, submissionStatus, timesheetHistory, totalLoggedHours]);

  // Formatted date string for header
  const formattedDateHeader = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate]);

  // Assigned tickets to current user
  const assignedTickets = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];
    const currentName = currentUser?.name?.toLowerCase() || '';
    return tickets.filter((t) => {
      const designer = (t.designer || t.assignee || '').toLowerCase();
      return (
        designer.includes(currentName) ||
        (t.developers && t.developers.includes(currentUser?.id)) ||
        (t.assignees && Array.isArray(t.assignees) && t.assignees.some((a: any) => a.name?.toLowerCase().includes(currentName)))
      );
    });
  }, [tickets, currentUser]);

  // Ticket selection list (Assigned first, then other sprint tickets)
  const searchableTickets = useMemo(() => {
    if (!ticketSearchQuery.trim()) return tickets.slice(0, 50);
    const q = ticketSearchQuery.toLowerCase().trim();
    return tickets.filter(
      (t) =>
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.customer && t.customer.toLowerCase().includes(q)) ||
        (t.stageName && t.stageName.toLowerCase().includes(q))
    );
  }, [tickets, ticketSearchQuery]);

  // Add new blank row or prefilled row
  const handleAddRow = (prefill?: Partial<WorkLogActivityItem>) => {
    // Infer default start time based on last activity's end time
    let defaultStart = '09:30';
    let defaultEnd = '10:30';
    if (activities.length > 0) {
      const lastAct = activities[activities.length - 1];
      if (lastAct.endTime) {
        defaultStart = lastAct.endTime;
        defaultEnd = addMinutesToTime(defaultStart, 60);
      }
    }

    const newRow: WorkLogActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketId: prefill?.ticketId || null,
      ticketRef: prefill?.ticketRef || (assignedTickets[0]?.reference || ''),
      activityType: prefill?.activityType || 'Requirement Analysis',
      description: prefill?.description || '',
      startTime: prefill?.startTime || defaultStart,
      endTime: prefill?.endTime || defaultEnd,
      durationMinutes: prefill?.durationMinutes || 60,
      progressStatus: prefill?.progressStatus || 'In Progress',
      blockerFlag: Boolean(prefill?.blockerFlag),
      blockerDetails: prefill?.blockerDetails || '',
    };

    setActivities((prev) => [...prev, newRow]);
    setHasUnsavedChanges(true);
  };

  // Row updates
  const handleUpdateRow = (id: string, updates: Partial<WorkLogActivityItem>) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== id) return act;
        const merged = { ...act, ...updates };

        // Auto-calculate duration if start or end time changed
        if ('startTime' in updates || 'endTime' in updates) {
          if (merged.startTime && merged.endTime) {
            const calculated = calculateDurationBetween(merged.startTime, merged.endTime);
            if (calculated > 0) {
              merged.durationMinutes = calculated;
            }
          }
        }

        return merged;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Increment duration by preset (e.g. +15, +30, +60 min)
  const handleQuickAddDuration = (id: string, minutesToAdd: number) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== id) return act;
        const newDur = Math.max(1, (act.durationMinutes || 0) + minutesToAdd);
        let newEnd = act.endTime;
        if (act.startTime) {
          newEnd = addMinutesToTime(act.startTime, newDur);
        }
        return {
          ...act,
          durationMinutes: newDur,
          endTime: newEnd,
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Duplicate Row
  const handleDuplicateRow = (act: WorkLogActivityItem) => {
    const clone: WorkLogActivityItem = {
      ...act,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      startTime: act.endTime || '11:00',
      endTime: act.endTime ? addMinutesToTime(act.endTime, act.durationMinutes || 60) : '12:00',
      description: `${act.description} (Continued)`,
    };
    setActivities((prev) => [...prev, clone]);
    setHasUnsavedChanges(true);
    onShowToast('Activity row duplicated');
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    setActivities((prev) => prev.filter((act) => act.id !== id));
    setHasUnsavedChanges(true);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: selectedDate,
          activities: activities.map((a) => ({
            id: a.id,
            ticketId: a.ticketId || null,
            ticketRef: a.ticketRef,
            activityType: a.activityType,
            description: a.description,
            startTime: a.startTime,
            endTime: a.endTime,
            durationMinutes: a.durationMinutes,
            progressStatus: a.progressStatus,
            blockerFlag: a.blockerFlag,
            blockerDetails: a.blockerDetails,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast(`Draft timesheet saved for ${selectedDate}`);
        setHasUnsavedChanges(false);
        setSubmissionStatus('Draft');
        if (onRefreshData) onRefreshData();
        loadWorkLogForDate(selectedDate);
      } else {
        onShowToast(data.error || 'Failed to save draft');
      }
    } catch (e) {
      onShowToast('Network error while saving draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Timesheet
  const handleSubmitTimesheet = async () => {
    if (activities.length === 0) {
      onShowToast('Please add at least one activity before submitting');
      return;
    }

    // Auto-save first if unsaved changes exist
    if (hasUnsavedChanges) {
      await handleSaveDraft();
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/work-logs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workDate: selectedDate }),
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(`Timesheet submitted for review (${totalLoggedHours}h logged)`);
        setSubmissionStatus('Submitted');
        setHasUnsavedChanges(false);
        if (onRefreshData) onRefreshData();
        loadWorkLogForDate(selectedDate);
      } else {
        onShowToast(data.error || 'Submission failed');
      }
    } catch (e) {
      onShowToast('Error submitting timesheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = submissionStatus === 'Approved';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Daily Work Logs & Timesheets
            </h1>
            <span
              className={`pill-badge ${
                submissionStatus === 'Approved'
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : submissionStatus === 'Submitted'
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                  : submissionStatus === 'Returned'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
              }`}
            >
              {submissionStatus}
            </span>
            {hasUnsavedChanges && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Log effort in integer minutes against assigned requirement tickets and submit for Team Lead approval.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="btn-modern-secondary px-3 py-2 text-xs flex items-center gap-1.5"
            title="View Timesheet History"
          >
            <History className="w-3.5 h-3.5" />
            <span>Timesheet History</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={isSaving || isLocked}
            className="btn-modern-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleSubmitTimesheet}
            disabled={isSubmitting || isLocked || activities.length === 0}
            className="btn-modern-primary px-4 py-2 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Timesheet'}</span>
          </button>
        </div>
      </div>

      {/* 2. INTERACTIVE DATE NAVIGATOR & WEEKLY STRIP */}
      <div className="modern-card p-4 space-y-4">
        {/* Date Switcher Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-600 dark:text-slate-300"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-600 dark:text-slate-300"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pl-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formattedDateHeader}
              </span>
            </div>

            {/* Quick Date Shortcuts */}
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-white/[0.08]">
              <button
                onClick={handleSetToday}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300"
              >
                Today
              </button>
              <button
                onClick={handleSetYesterday}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300"
              >
                Yesterday
              </button>
            </div>
          </div>

          {/* HTML5 Date Picker */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 font-medium">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>
        </div>

        {/* Weekly Day Strip (Mon-Sun) */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d) => (
            <button
              key={d.iso}
              onClick={() => setSelectedDate(d.iso)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                d.isSelected
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 font-bold shadow-sm ring-1 ring-indigo-500/30'
                  : d.isToday
                  ? 'bg-slate-100/80 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.15] text-slate-800 dark:text-slate-200'
                  : 'bg-transparent border-slate-200/60 dark:border-white/[0.04] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider">{d.dayName}</div>
              <div className="text-base font-extrabold my-0.5">{d.dayNumber}</div>
              <div className="text-[10px] font-mono">
                {d.hours ? (
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold ${
                      Number(d.hours) >= 8
                        ? 'text-emerald-500'
                        : Number(d.hours) > 0
                        ? 'text-indigo-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {d.hours}h
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">–</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. DAILY METRICS & TARGET PROGRESS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Logged vs Standard Shift Target */}
        <div className="modern-card p-4 space-y-2 border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Daily Target Effort
            </span>
            <span className="text-xs font-mono font-bold text-indigo-400">
              {totalLoggedHours}h / 8.0h ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                progressPercent >= 100
                  ? 'bg-emerald-500'
                  : progressPercent >= 75
                  ? 'bg-indigo-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{totalLoggedMinutes} minutes recorded</span>
            <span>
              {totalLoggedMinutes >= standardDailyTargetMin
                ? 'Target met'
                : `${standardDailyTargetMin - totalLoggedMinutes}m remaining`}
            </span>
          </div>
        </div>

        {/* Shift Attendance Context */}
        <div className="modern-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Shift Attendance
            </span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
              {attendance?.isCheckedIn
                ? `Checked In • ${attendance.totalMinutes || 0}m shift duration`
                : 'Not Checked In on this shift'}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Shift: {attendance?.checkInTime ? `Started at ${attendance.checkInTime}` : '09:00 - 18:00 (Standard)'}
            </p>
          </div>
        </div>

        {/* Review Comments or Submission State */}
        <div className="modern-card p-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              submissionStatus === 'Approved'
                ? 'bg-emerald-500/10 text-emerald-500'
                : submissionStatus === 'Submitted'
                ? 'bg-indigo-500/10 text-indigo-400'
                : submissionStatus === 'Returned'
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-amber-500/10 text-amber-500'
            }`}
          >
            {submissionStatus === 'Approved' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : submissionStatus === 'Returned' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Status & Feedback
            </span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
              {submissionStatus === 'Approved'
                ? 'Approved by Team Lead'
                : submissionStatus === 'Submitted'
                ? 'Pending Review by Lead'
                : submissionStatus === 'Returned'
                ? 'Returned for Corrections'
                : 'Draft (Editable)'}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {reviewComments ? `Lead: "${reviewComments}"` : 'Submit at end of shift for verification'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. QUICK-ADD ASSIGNED TICKETS STRIP */}
      {assignedTickets.length > 0 && (
        <div className="modern-card p-3.5 space-y-2 border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                My Assigned Sprints Tickets (Quick Log)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Click any ticket to add an activity row</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {assignedTickets.slice(0, 6).map((t) => (
              <button
                key={t.id || t.reference}
                onClick={() =>
                  handleAddRow({
                    ticketId: t.id,
                    ticketRef: t.reference,
                    description: t.title ? `Working on ${t.title}` : '',
                  })
                }
                className="shrink-0 px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] hover:border-indigo-500/40 text-left transition-all group max-w-[240px]"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono font-bold text-xs text-indigo-500 dark:text-indigo-400">
                    {t.reference}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400">
                    + Log
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                  {t.title || 'Untitled Ticket'}
                </div>
              </button>
            ))}

            {/* Quick Non-Ticket Common Activities */}
            <button
              onClick={() =>
                handleAddRow({
                  ticketRef: 'STANDUP',
                  activityType: 'Internal Discussion',
                  description: 'Daily Sprint Standup & Impediments check',
                  durationMinutes: 15,
                })
              }
              className="shrink-0 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-white/[0.1] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-400 hover:border-indigo-400 transition-colors"
            >
              + Standup (15m)
            </button>
            <button
              onClick={() =>
                handleAddRow({
                  ticketRef: 'MEETING',
                  activityType: 'Customer Discussion',
                  description: 'Customer sprint review & feature demo',
                  durationMinutes: 60,
                })
              }
              className="shrink-0 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-white/[0.1] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-400 hover:border-indigo-400 transition-colors"
            >
              + Client Demo (1h)
            </button>
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE ACTIVITIES SPREADSHEET */}
      <div className="modern-card overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-3.5 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Work Sessions ({activities.length})
            </span>
            <span className="text-xs text-slate-400">• Total Logged: {totalLoggedHours}h</span>
          </div>

          {!isLocked && (
            <button
              onClick={() => handleAddRow()}
              className="btn-modern-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Activity Row</span>
            </button>
          )}
        </div>

        {/* Activities Table */}
        {activities.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No activities logged for {formattedDateHeader}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Start tracking your daily progress by logging time against an assigned requirement ticket or quick standup.
              </p>
            </div>
            {!isLocked && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleAddRow()}
                  className="btn-modern-primary px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Activity</span>
                </button>
                {assignedTickets[0] && (
                  <button
                    onClick={() =>
                      handleAddRow({
                        ticketId: assignedTickets[0].id,
                        ticketRef: assignedTickets[0].reference,
                        description: `Work on ${assignedTickets[0].title}`,
                      })
                    }
                    className="btn-modern-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
                  >
                    <span>Log {assignedTickets[0].reference}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/[0.03] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-white/[0.06]">
                <tr>
                  <th className="py-3 px-3 w-48">Ticket Ref</th>
                  <th className="py-3 px-3 w-48">Category</th>
                  <th className="py-3 px-3">Description & Deliverables</th>
                  <th className="py-3 px-3 w-36 text-center">Interval</th>
                  <th className="py-3 px-3 w-32 text-center">Duration</th>
                  <th className="py-3 px-3 w-36">Status</th>
                  <th className="py-3 px-2 w-20 text-center">Blocker?</th>
                  <th className="py-3 px-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {activities.map((act) => {
                  const matchingTicket = tickets.find(
                    (t) => t.reference?.toLowerCase() === act.ticketRef?.toLowerCase()
                  );

                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Ticket Selector */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={act.ticketRef}
                              disabled={isLocked}
                              onChange={(e) => handleUpdateRow(act.id, { ticketRef: e.target.value })}
                              placeholder="e.g. LA-I7306"
                              className="w-28 px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] font-mono font-bold text-indigo-500 dark:text-indigo-400 outline-none uppercase"
                            />
                            {matchingTicket && (
                              <button
                                onClick={() => {
                                  if (onOpenTicketDetails) {
                                    onOpenTicketDetails(matchingTicket);
                                  } else if (matchingTicket.zohoItemUrl) {
                                    window.open(matchingTicket.zohoItemUrl, '_blank');
                                  }
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                                title="Open ticket details"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {matchingTicket && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                              {matchingTicket.title}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Activity Category */}
                      <td className="py-3 px-3 align-top">
                        <select
                          value={act.activityType}
                          disabled={isLocked}
                          onChange={(e) => handleUpdateRow(act.id, { activityType: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none text-slate-800 dark:text-slate-200"
                        >
                          {ACTIVITY_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1.5">
                          <textarea
                            rows={2}
                            value={act.description}
                            disabled={isLocked}
                            onChange={(e) => handleUpdateRow(act.id, { description: e.target.value })}
                            placeholder="What work was accomplished during this session?"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none"
                          />
                          {act.blockerFlag && (
                            <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <input
                                type="text"
                                value={act.blockerDetails || ''}
                                disabled={isLocked}
                                onChange={(e) => handleUpdateRow(act.id, { blockerDetails: e.target.value })}
                                placeholder="State what is blocking or what you are waiting on..."
                                className="w-full bg-transparent outline-none text-rose-300 placeholder-rose-400/60"
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Interval (Start - End) */}
                      <td className="py-3 px-3 align-top text-center font-mono">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="time"
                            value={act.startTime}
                            disabled={isLocked}
                            onChange={(e) => handleUpdateRow(act.id, { startTime: e.target.value })}
                            className="w-20 px-1 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-center text-xs outline-none text-slate-800 dark:text-slate-200"
                          />
                          <span className="text-slate-400">–</span>
                          <input
                            type="time"
                            value={act.endTime}
                            disabled={isLocked}
                            onChange={(e) => handleUpdateRow(act.id, { endTime: e.target.value })}
                            className="w-20 px-1 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-center text-xs outline-none text-slate-800 dark:text-slate-200"
                          />
                        </div>
                      </td>

                      {/* Duration & Quick Preset Increments */}
                      <td className="py-3 px-3 align-top text-center">
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1 font-bold">
                            <input
                              type="number"
                              min={1}
                              step={5}
                              value={act.durationMinutes}
                              disabled={isLocked}
                              onChange={(e) =>
                                handleUpdateRow(act.id, { durationMinutes: Math.max(1, Number(e.target.value)) })
                              }
                              className="w-16 px-1.5 py-1 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-center text-indigo-500 dark:text-indigo-400 outline-none"
                            />
                            <span className="text-[11px] text-slate-400 font-mono">
                              m ({(act.durationMinutes / 60).toFixed(1)}h)
                            </span>
                          </div>
                          {!isLocked && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleQuickAddDuration(act.id, 15)}
                                className="px-1 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-500"
                                title="Add 15 minutes"
                              >
                                +15m
                              </button>
                              <button
                                onClick={() => handleQuickAddDuration(act.id, 30)}
                                className="px-1 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-500"
                                title="Add 30 minutes"
                              >
                                +30m
                              </button>
                              <button
                                onClick={() => handleQuickAddDuration(act.id, 60)}
                                className="px-1 py-0.5 rounded text-[9px] font-mono bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-500"
                                title="Add 1 hour"
                              >
                                +1h
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 align-top">
                        <select
                          value={act.progressStatus}
                          disabled={isLocked}
                          onChange={(e) => handleUpdateRow(act.id, { progressStatus: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs outline-none"
                        >
                          {PROGRESS_STATUSES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Blocker? */}
                      <td className="py-3 px-2 align-top text-center">
                        <input
                          type="checkbox"
                          checked={act.blockerFlag}
                          disabled={isLocked}
                          onChange={(e) => handleUpdateRow(act.id, { blockerFlag: e.target.checked })}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-white/[0.2] cursor-pointer mt-1"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 align-top text-right">
                        {!isLocked && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDuplicateRow(act)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                              title="Duplicate Row"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(act.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer with Summary Bar */}
        {activities.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <span>{activities.length} activity rows</span>
              <span>•</span>
              <span className="font-bold text-slate-900 dark:text-white">
                Total: {totalLoggedMinutes} min ({totalLoggedHours} hours)
              </span>
            </div>

            {!isLocked && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="btn-modern-secondary px-3 py-1.5 text-xs"
                >
                  Save Draft
                </button>
                <button
                  onClick={handleSubmitTimesheet}
                  disabled={isSubmitting}
                  className="btn-modern-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Submit</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. TIMESHEET HISTORY DRAWER / MODAL */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Timesheet History & Past Submissions
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {timesheetHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No previous timesheet records found.
                </div>
              ) : (
                timesheetHistory.map((h) => (
                  <div
                    key={h.id || h.workDate}
                    onClick={() => {
                      setSelectedDate(h.workDate);
                      setShowHistoryDrawer(false);
                    }}
                    className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] hover:border-indigo-500/40 bg-slate-50/50 dark:bg-white/[0.02] cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {h.workDate}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {h.hoursFormatted || `${(h.totalMinutes / 60).toFixed(1)}h`} logged
                        {h.comments && ` • "${h.comments}"`}
                      </div>
                    </div>
                    <span
                      className={`pill-badge text-[10px] ${
                        h.submissionStatus === 'Approved'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : h.submissionStatus === 'Submitted'
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {h.submissionStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
