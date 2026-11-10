import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck, UserCheck, AlertCircle, CheckCircle2, XCircle,
  Download, Pencil, CalendarDays, UserPlus,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { AttendanceBadge, Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { Input, TextArea } from '../../components/ui/Input';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/DataState';
import { DataSourceBanner } from '../../components/common/DataSourceBanner';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatTime, todayIST } from '../../lib/utils';
import { downloadCsv } from '../../lib/csv';
import {
  useAttendanceRoster,
  useCorrectionRequests,
  useEmployees,
  useLeaveRequests,
  useMarkAttendance,
  useReviewCorrectionRequest,
  useUpdateLeaveRequestStatus,
} from '../../hooks/useHrmsData';
import { istTimeToIso, type RosterEntry } from '../../services/attendanceService';
import type { AttendanceStatus } from '../../types';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'paid_leave', label: 'Paid Leave' },
  { value: 'unpaid_leave', label: 'Unpaid Leave' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'work_from_home', label: 'Work From Home' },
];

// ─── Mark / Correct modal ──────────────────────────────────

interface MarkForm {
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  reason: string;
  notes: string;
}

const MarkAttendanceModal: React.FC<{
  entry: RosterEntry | null;
  date: string;
  onClose: () => void;
}> = ({ entry, date, onClose }) => {
  const toast = useToast();
  const markMutation = useMarkAttendance();
  const [form, setForm] = useState<MarkForm>(() => ({
    status: entry?.isMarked ? entry.status : 'present',
    checkIn: entry?.checkInAt ? toTimeInput(entry.checkInAt) : '',
    checkOut: entry?.checkOutAt ? toTimeInput(entry.checkOutAt) : '',
    reason: '',
    notes: entry?.notes ?? '',
  }));

  if (!entry) return null;

  const isCorrection = entry.isMarked;
  const needsReason = ['absent', 'paid_leave', 'unpaid_leave', 'half_day', 'work_from_home'].includes(form.status);

  const handleSubmit = async () => {
    if (isCorrection && !form.reason.trim()) {
      toast.error('A correction reason is required.');
      return;
    }
    // Validate chronological order only if both times are provided
    if (form.checkIn && form.checkOut) {
      const inIso = istTimeToIso(date, form.checkIn);
      const outIso = istTimeToIso(date, form.checkOut);
      if (inIso && outIso && outIso <= inIso) {
        toast.error('Check-out time must be after check-in time.');
        return;
      }
    }

    try {
      await markMutation.mutateAsync({
        employeeId: entry.employeeId,
        date,
        status: form.status,
        checkInAt: form.checkIn ? istTimeToIso(date, form.checkIn) : undefined,
        checkOutAt: form.checkOut ? istTimeToIso(date, form.checkOut) : undefined,
        reason: form.reason.trim() || undefined,
        notes: form.notes.trim() || undefined,
        actorRole: 'admin',
        isCorrection,
      });
      toast.success(
        isCorrection ? 'Attendance Corrected' : 'Attendance Marked',
        `${entry.employeeName} — ${form.status.replace(/_/g, ' ')} for ${formatDate(date)}.`,
      );
      onClose();
    } catch (err: any) {
      toast.error('Could not save attendance', err?.message || 'Unknown error');
    }
  };

  return (
    <Modal
      isOpen={!!entry}
      onClose={onClose}
      title={isCorrection ? 'Correct Attendance' : 'Mark Attendance'}
      description={`${entry.employeeName} (${entry.employeeCode}) · ${entry.departmentName} · ${formatDate(date)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button isLoading={markMutation.isPending} onClick={handleSubmit} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
            {isCorrection ? 'Save Correction' : 'Mark Attendance'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {entry.isWeeklyOff && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            {formatDate(date)} is a weekly off — attendance is not applicable for this date.
          </div>
        )}
        {entry.isHoliday && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            {formatDate(date)} is a holiday ({entry.holidayName}) — attendance is not applicable for this date.
          </div>
        )}

        <Select
          label="Attendance Status *"
          value={form.status}
          onChange={e => setForm(p => ({ ...p, status: e.target.value as AttendanceStatus }))}
          options={STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Check In"
            type="time"
            value={form.checkIn}
            onChange={e => setForm(p => ({ ...p, checkIn: e.target.value }))}
          />
          <Input
            label="Check Out"
            type="time"
            value={form.checkOut}
            onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))}
          />
        </div>

        <TextArea
          label={isCorrection ? 'Correction Reason *' : 'Reason'}
          value={form.reason}
          rows={3}
          onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
          placeholder={isCorrection ? 'Explain why this record is being corrected…' : 'Optional reason or note…'}
        />

        <TextArea
          label="Notes"
          value={form.notes}
          rows={2}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Optional note…"
        />
      </div>
    </Modal>
  );
};

const toTimeInput = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
  }).formatToParts(d);
  const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
  const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
};

// ─── Main page ─────────────────────────────────────────────

export const AdminAttendance: React.FC = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    initialTab === 'leave' || initialTab === 'corrections' ? initialTab : 'today',
  );
  const [marking, setMarking] = useState<RosterEntry | null>(null);

  const { user } = useAuth();
  const reviewerName = user?.name || 'Admin';
  const { data: roster, isLoading, error, refetch } = useAttendanceRoster(selectedDate);

  const employeesQuery = useEmployees();
  const leaveQuery = useLeaveRequests();
  const correctionsQuery = useCorrectionRequests();
  const leaveStatusMutation = useUpdateLeaveRequestStatus();
  const correctionMutation = useReviewCorrectionRequest();

  const employeeName = (employeeId: string): string =>
    employeesQuery.data?.find(e => e.id === employeeId)?.fullName ?? 'Unknown employee';

  const summary = roster?.summary;
  const entries = roster?.entries ?? [];

  const leaveRequests = leaveQuery.data ?? [];
  const correctionRequests = correctionsQuery.data ?? [];
  const pendingLeave = leaveRequests.filter(r => r.status === 'pending').length;
  const pendingCorrections = correctionRequests.filter(r => r.status === 'pending').length;

  const tabs = [
    { id: 'today',       label: 'Daily Roster',     badge: entries.length },
    { id: 'pending',     label: 'Pending Marking',  badge: summary?.pending ?? 0 },
    { id: 'leave',       label: 'Leave Requests',   badge: pendingLeave },
    { id: 'corrections', label: 'Corrections',      badge: pendingCorrections },
  ];

  const kpis = [
    { label: 'Present Today', val: summary?.present ?? '—', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <UserCheck className="w-5 h-5" /> },
    { label: 'On Leave',      val: summary?.onLeave ?? '—', color: 'text-amber-600',   bg: 'bg-amber-50',   icon: <CalendarCheck className="w-5 h-5" /> },
    { label: 'Absent',        val: summary?.absent ?? '—', color: 'text-rose-600',    bg: 'bg-rose-50',    icon: <XCircle className="w-5 h-5" /> },
    { label: 'Pending Actions', val: summary?.pending ?? '—', color: 'text-brand-600', bg: 'bg-brand-50',  icon: <AlertCircle className="w-5 h-5" /> },
  ];

  /** Downloads the roster of the selected date as a CSV file. */
  const handleExport = () => {
    if (entries.length === 0) return;
    downloadCsv(
      `attendance-${selectedDate}.csv`,
      ['Employee ID', 'Employee', 'Department', 'Designation', 'Check In', 'Check Out', 'Status', 'Source', 'Notes'],
      entries.map(entry => [
        entry.employeeCode,
        entry.employeeName,
        entry.departmentName,
        entry.designationName,
        entry.checkInAt ? formatTime(entry.checkInAt) : '',
        entry.checkOutAt ? formatTime(entry.checkOutAt) : '',
        entry.status.replace(/_/g, ' '),
        entry.source ? entry.source.replace(/_/g, ' ') : '',
        entry.correctionReason ?? entry.notes ?? '',
      ]),
    );
    toast.success('Attendance exported', `${entries.length} record(s) for ${formatDate(selectedDate)}.`);
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage employee attendance for Clixhora</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          size="sm"
          onClick={handleExport}
          disabled={entries.length === 0}
        >
          Export Report
        </Button>
      </div>

      <DataSourceBanner />

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(({ label, val, color, bg, icon }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${bg} ${color} flex-shrink-0`}>{icon}</div>
            <div>
              <p className={`text-xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {summary && summary.halfDay > 0 && (
        <p className="text-xs text-slate-500">
          Includes {summary.halfDay} half day{summary.halfDay === 1 ? '' : 's'} — {summary.weeklyOff} on weekly off,{' '}
          {summary.holiday} on holiday.
        </p>
      )}

      {/* Date selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" leftIcon={<CalendarDays className="w-4 h-4" />} onClick={() => setSelectedDate(todayIST())}>
          Today
        </Button>
        {roster?.isWeeklyOff && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
            Weekly off
          </span>
        )}
        {roster?.holiday && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
            {roster.holiday.name}
          </span>
        )}
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={tab => {
          setActiveTab(tab);
          setSearchParams(tab === 'today' ? {} : { tab }, { replace: true });
        }}
      />

      {/* Daily roster */}
      {activeTab === 'today' && (
        <div className="card overflow-hidden p-0">
          {isLoading ? (
            <LoadingState label="Loading attendance roster…" className="py-16" />
          ) : error ? (
            <div className="p-5">
              <ErrorState error={error} title="Could not load the attendance roster" onRetry={() => refetch()} />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              title="No active employees"
              message="Attendance can only be marked for active employees. Add an employee on the Employees page and they will appear here automatically."
              icon={<UserPlus className="w-6 h-6 text-slate-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee ID</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Check In</th>
                    <th className="px-4 py-3 text-left">Check Out</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {entries.map(entry => (
                    <tr key={entry.employeeId} className="table-row">
                      <td className="px-4 py-3 font-mono text-slate-500">{entry.employeeCode}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={entry.employeeName} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-900">{entry.employeeName}</p>
                            <p className="text-slate-400 text-[10px]">{entry.designationName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.departmentName}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{entry.checkInAt ? formatTime(entry.checkInAt) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{entry.checkOutAt ? formatTime(entry.checkOutAt) : '—'}</td>
                      <td className="px-4 py-3">
                        <AttendanceBadge status={entry.status} />
                        {entry.correctionReason && (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">corrected: {entry.correctionReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-500">{entry.source ? entry.source.replace('_', ' ') : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {entry.isWeeklyOff || entry.isHoliday ? (
                          <span className="text-[11px] text-slate-400">Not applicable</span>
                        ) : (
                          <Button size="sm" variant="outline" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setMarking(entry)}>
                            {entry.isMarked ? 'Correct' : 'Mark'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending marking */}
      {activeTab === 'pending' && (
        <div className="card overflow-hidden p-0">
          {isLoading ? (
            <LoadingState label="Loading roster…" className="py-16" />
          ) : error ? (
            <div className="p-5">
              <ErrorState error={error} title="Could not load the attendance roster" onRetry={() => refetch()} />
            </div>
          ) : (summary?.pending ?? 0) === 0 ? (
            <EmptyState
              title="Everything is marked"
              message="Every active employee has an attendance record for this date."
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee ID</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {entries.filter(e => e.isPending).map(entry => (
                    <tr key={entry.employeeId} className="table-row">
                      <td className="px-4 py-3 font-mono text-slate-500">{entry.employeeCode}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={entry.employeeName} size="sm" />
                          <p className="font-semibold text-slate-900">{entry.employeeName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.departmentName}</td>
                      <td className="px-4 py-3"><AttendanceBadge status="not_marked" /></td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => setMarking(entry)}>
                          Mark Attendance
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Leave requests */}
      {activeTab === 'leave' && (
        <div className="card overflow-hidden p-0">
          {leaveQuery.isLoading ? (
            <LoadingState label="Loading leave requests…" className="py-16" />
          ) : leaveQuery.error ? (
            <div className="p-5">
              <ErrorState error={leaveQuery.error} title="Could not load the leave requests" onRetry={() => leaveQuery.refetch()} />
            </div>
          ) : leaveRequests.length === 0 ? (
            <EmptyState
              title="No leave requests"
              message="Leave requests raised by employees appear here for approval."
              icon={<CalendarCheck className="w-6 h-6 text-slate-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Dates</th>
                    <th className="px-4 py-3 text-left">Duration</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {leaveRequests.map(request => (
                    <tr key={request.id} className="table-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={employeeName(request.employeeId)} size="sm" />
                          <p className="font-semibold text-slate-900">{employeeName(request.employeeId)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">{request.leaveType.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {request.startDate}{request.endDate !== request.startDate ? ` → ${request.endDate}` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{request.duration}d</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[16rem] truncate">{request.reason}</td>
                      <td className="px-4 py-3"><Badge status={request.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {request.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              aria-label={`Approve leave of ${employeeName(request.employeeId)}`}
                              onClick={async () => {
                                try {
                                  await leaveStatusMutation.mutateAsync({ id: request.id, status: 'approved', reviewedBy: reviewerName });
                                  toast.success('Leave approved', `${employeeName(request.employeeId)} · ${request.startDate}`);
                                } catch (err: any) {
                                  toast.error('Could not approve the leave', err?.message || 'Unknown error');
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<XCircle className="w-3.5 h-3.5" />}
                              aria-label={`Reject leave of ${employeeName(request.employeeId)}`}
                              onClick={async () => {
                                try {
                                  await leaveStatusMutation.mutateAsync({ id: request.id, status: 'rejected', reviewedBy: reviewerName });
                                  toast.info('Leave rejected', `${employeeName(request.employeeId)} · ${request.startDate}`);
                                } catch (err: any) {
                                  toast.error('Could not reject the leave', err?.message || 'Unknown error');
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {request.reviewedAt ? `Reviewed ${formatDate(request.reviewedAt.slice(0, 10))}` : 'Reviewed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Correction requests */}
      {activeTab === 'corrections' && (
        <div className="card overflow-hidden p-0">
          {correctionsQuery.isLoading ? (
            <LoadingState label="Loading correction requests…" className="py-16" />
          ) : correctionsQuery.error ? (
            <div className="p-5">
              <ErrorState
                error={correctionsQuery.error}
                title="Could not load the correction requests"
                onRetry={() => correctionsQuery.refetch()}
              />
            </div>
          ) : correctionRequests.length === 0 ? (
            <EmptyState
              title="No correction requests"
              message="Correction requests raised by employees appear here for review."
              icon={<Pencil className="w-6 h-6 text-slate-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Requested</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {correctionRequests.map(request => (
                    <tr key={request.id} className="table-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={request.employeeName ?? employeeName(request.employeeId)} size="sm" />
                          <p className="font-semibold text-slate-900">
                            {request.employeeName ?? employeeName(request.employeeId)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(request.attendanceDate)}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {request.requestedCheckIn || request.requestedCheckOut || request.requestedStatus || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[16rem] truncate">{request.reason}</td>
                      <td className="px-4 py-3"><Badge status={request.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {request.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              aria-label={`Approve correction of ${request.employeeName ?? employeeName(request.employeeId)}`}
                              onClick={async () => {
                                try {
                                  await correctionMutation.mutateAsync({ id: request.id, status: 'approved', reviewedBy: reviewerName });
                                  toast.success('Correction approved', formatDate(request.attendanceDate));
                                } catch (err: any) {
                                  toast.error('Could not approve the correction', err?.message || 'Unknown error');
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<XCircle className="w-3.5 h-3.5" />}
                              aria-label={`Reject correction of ${request.employeeName ?? employeeName(request.employeeId)}`}
                              onClick={async () => {
                                try {
                                  await correctionMutation.mutateAsync({ id: request.id, status: 'rejected', reviewedBy: reviewerName });
                                  toast.info('Correction rejected', formatDate(request.attendanceDate));
                                } catch (err: any) {
                                  toast.error('Could not reject the correction', err?.message || 'Unknown error');
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {request.reviewedAt ? `Reviewed ${formatDate(request.reviewedAt.slice(0, 10))}` : 'Reviewed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {marking && (
        <MarkAttendanceModal
          key={`${marking.employeeId}-${marking.isMarked ? 'marked' : 'unmarked'}`}
          entry={marking}
          date={selectedDate}
          onClose={() => setMarking(null)}
        />
      )}
    </div>
  );
};