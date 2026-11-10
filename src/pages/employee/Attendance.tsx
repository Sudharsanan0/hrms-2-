import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck, Clock, AlertCircle, CheckCircle2, XCircle, Plus,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, TextArea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/DataState';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useMyAttendance, useMyCorrectionRequests, useMyLeaveRequests } from '../../hooks/useHrmsData';
import { createLeaveRequest } from '../../services/leaveService';
import { createCorrectionRequest } from '../../services/correctionService';
import { formatDate, formatTime, todayIST } from '../../lib/utils';

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = d.toISOString().slice(0, 7);
  return { value: val, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

export const EmpAttendance: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab]     = useState(
    initialTab === 'leave' || initialTab === 'corrections' ? initialTab : 'attendance',
  );
  const [leaveModal, setLeaveModal]   = useState(false);
  const [corrModal, setCorrModal]     = useState(false);
  const [selectedMonth, setMonth]     = useState(MONTHS[0].value);
  const [leaveLoading, setLeaveLoad]  = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    startDate: todayIST(),
    endDate: todayIST(),
    isHalfDay: false,
    reason: '',
  });

  const [corrForm, setCorrForm] = useState({
    date: todayIST(),
    requestedCheckIn: '',
    requestedCheckOut: '',
    reason: '',
  });

  const employeeId = user?.employeeId;
  const attendanceQuery = useMyAttendance(employeeId, selectedMonth);
  const leaveQuery = useMyLeaveRequests(employeeId);
  const correctionQuery = useMyCorrectionRequests(employeeId);

  const attendanceRecords = attendanceQuery.data ?? [];
  const leaveRequests = leaveQuery.data ?? [];
  const correctionRequests = correctionQuery.data ?? [];

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const pendingCorrectionCount = correctionRequests.filter(r => r.status === 'pending').length;

  const tabs = [
    { id: 'attendance', label: 'Attendance Log' },
    { id: 'leave',      label: 'Leave Requests', badge: pendingCount },
    { id: 'corrections', label: 'Corrections',  badge: pendingCorrectionCount },
  ];

  const stats = attendanceRecords.reduce(
    (acc, rec) => {
      if (rec.status === 'present' || rec.status === 'work_from_home') acc.present += 1;
      else if (rec.status === 'paid_leave' || rec.status === 'unpaid_leave') acc.leave += 1;
      else if (rec.status === 'absent') acc.absent += 1;
      else if (rec.status === 'half_day') acc.halfDays += 1;
      return acc;
    },
    { present: 0, leave: 0, absent: 0, halfDays: 0 },
  );

  const handleLeaveSubmit = async () => {
    if (!employeeId) { toast.error('No employee record linked to your login.'); return; }
    if (!leaveForm.reason.trim()) { toast.error('Please provide a reason.'); return; }
    if (leaveForm.startDate > leaveForm.endDate) { toast.error('End date must be after start date.'); return; }
    setLeaveLoad(true);
    try {
      const duration = leaveForm.isHalfDay
        ? 0.5
        : Math.max(1, Math.round((new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / 86400000) + 1);
      await createLeaveRequest({
        employeeId,
        leaveType: 'paid',
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        duration,
        isHalfDay: leaveForm.isHalfDay,
        reason: leaveForm.reason.trim(),
      });
      await leaveQuery.refetch();
      toast.success('Leave Applied', 'Your request is pending admin approval.');
      setLeaveModal(false);
      setLeaveForm({ startDate: todayIST(), endDate: todayIST(), isHalfDay: false, reason: '' });
    } catch (err: any) {
      toast.error('Could not submit the leave request', err?.message || 'Unknown error');
    } finally {
      setLeaveLoad(false);
    }
  };

  const handleCorrSubmit = async () => {
    if (!employeeId) { toast.error('No employee record linked to your login.'); return; }
    if (!corrForm.reason.trim()) { toast.error('Please provide a reason.'); return; }
    try {
      await createCorrectionRequest({
        employeeId,
        attendanceDate: corrForm.date,
        requestedCheckIn: corrForm.requestedCheckIn || undefined,
        requestedCheckOut: corrForm.requestedCheckOut || undefined,
        reason: corrForm.reason.trim(),
      });
      await correctionQuery.refetch();
      toast.success('Correction Requested', 'Your correction request is pending admin review.');
      setCorrModal(false);
      setCorrForm({ date: todayIST(), requestedCheckIn: '', requestedCheckOut: '', reason: '' });
    } catch (err: any) {
      toast.error('Could not submit the correction request', err?.message || 'Unknown error');
    }
  };

  if (!employeeId) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium text-slate-700">No employee record linked to your login</p>
        <p className="text-xs text-slate-400 mt-1">
          Ask your HR admin to set your work email ({user?.email}) on your employee record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your attendance and leave</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<AlertCircle className="w-4 h-4" />} onClick={() => setCorrModal(true)}>
            Request Correction
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setLeaveModal(true)}>
            Apply Leave
          </Button>
        </div>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Present Days', val: stats.present,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'On Leave',     val: stats.leave,    color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Absent',       val: stats.absent,   color: 'text-rose-600',    bg: 'bg-rose-50'    },
          { label: 'Half Days',    val: stats.halfDays, color: 'text-brand-600',   bg: 'bg-brand-50'   },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`card p-4 text-center ${bg} border-0`}>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <div className="w-52">
          <Select options={MONTHS} value={selectedMonth} onChange={e => setMonth(e.target.value)} />
        </div>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={tab => {
          setActiveTab(tab);
          setSearchParams(tab === 'attendance' ? {} : { tab }, { replace: true });
        }}
      />

      {/* Attendance Log */}
      {activeTab === 'attendance' && (
        <div className="card overflow-hidden p-0">
          {attendanceQuery.isLoading ? (
            <LoadingState label="Loading your attendance…" className="py-16" />
          ) : attendanceQuery.error ? (
            <div className="p-5">
              <ErrorState
                error={attendanceQuery.error}
                title="Could not load your attendance"
                onRetry={() => attendanceQuery.refetch()}
              />
            </div>
          ) : attendanceRecords.length === 0 ? (
            <EmptyState
              title={`No attendance records for ${selectedMonth}`}
              message="Attendance records appear here as soon as they are marked. Check in from your dashboard to record today's attendance."
              icon={<CalendarCheck className="w-6 h-6 text-slate-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Check In</th>
                    <th className="px-4 py-3 text-left">Check Out</th>
                    <th className="px-4 py-3 text-left">Hours</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {attendanceRecords.map(rec => (
                    <tr key={rec.id} className="table-row">
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatDate(rec.attendanceDate)}</td>
                      <td className="px-4 py-3 font-mono text-emerald-700">{rec.checkInAt ? formatTime(rec.checkInAt) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-rose-600">{rec.checkOutAt ? formatTime(rec.checkOutAt) : '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {rec.totalMinutes ? `${Math.floor(rec.totalMinutes / 60)}h ${rec.totalMinutes % 60}m` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={rec.status}>{rec.status.replace('_', ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Leave Requests */}
      {activeTab === 'leave' && (
        <div className="space-y-3">
          {leaveQuery.isLoading ? (
            <LoadingState label="Loading leave requests…" className="py-12" />
          ) : leaveQuery.error ? (
            <div className="card p-5">
              <ErrorState
                error={leaveQuery.error}
                title="Could not load your leave requests"
                onRetry={() => leaveQuery.refetch()}
              />
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">No leave requests</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">You haven't applied for any leave yet.</p>
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setLeaveModal(true)}>
                Apply for Leave
              </Button>
            </div>
          ) : leaveRequests.map(req => (
            <div key={req.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    req.status === 'pending'  ? 'bg-amber-50' :
                    req.status === 'approved' ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}>
                    {req.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                     req.status === 'rejected' ? <XCircle className="w-4 h-4 text-rose-600" /> :
                     <Clock className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold capitalize text-slate-900">{req.leaveType.replace('_', ' ')} Leave</span>
                      <Badge status={req.status}>{req.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(req.startDate)}
                      {req.startDate !== req.endDate && ` – ${formatDate(req.endDate)}`}
                      {' · '}
                      {req.duration} day{req.duration > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 italic">"{req.reason}"</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Correction requests */}
      {activeTab === 'corrections' && (
        <div className="space-y-3">
          {correctionQuery.isLoading ? (
            <LoadingState label="Loading correction requests…" className="py-12" />
          ) : correctionQuery.error ? (
            <div className="card p-5">
              <ErrorState
                error={correctionQuery.error}
                title="Could not load your correction requests"
                onRetry={() => correctionQuery.refetch()}
              />
            </div>
          ) : correctionRequests.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">No correction requests</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">You haven't raised any attendance corrections yet.</p>
              <Button size="sm" leftIcon={<AlertCircle className="w-3.5 h-3.5" />} onClick={() => setCorrModal(true)}>
                Request Correction
              </Button>
            </div>
          ) : correctionRequests.map(req => (
            <div key={req.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    req.status === 'pending'  ? 'bg-amber-50' :
                    req.status === 'approved' ? 'bg-emerald-50' : 'bg-rose-50'
                  }`}>
                    {req.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                     req.status === 'rejected' ? <XCircle className="w-4 h-4 text-rose-600" /> :
                     <Clock className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{formatDate(req.attendanceDate)}</span>
                      <Badge status={req.status}>{req.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {req.requestedCheckIn ? `In ${req.requestedCheckIn}` : ''}
                      {req.requestedCheckIn && req.requestedCheckOut ? ' · ' : ''}
                      {req.requestedCheckOut ? `Out ${req.requestedCheckOut}` : ''}
                      {!req.requestedCheckIn && !req.requestedCheckOut ? 'Time correction' : ''}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 italic">"{req.reason}"</p>
                    {req.reviewNote && (
                      <p className="text-xs text-slate-500 mt-1">Admin note: {req.reviewNote}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal
        isOpen={leaveModal}
        onClose={() => setLeaveModal(false)}
        title="Apply for Leave"
        description="Your request will be sent to the HR admin for approval"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLeaveModal(false)}>Cancel</Button>
            <Button isLoading={leaveLoading} onClick={handleLeaveSubmit}>Submit Request</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <strong>Leave Policy:</strong> You are entitled to <strong>1 paid leave per calendar month</strong>. Additional leave will be unpaid.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={leaveForm.startDate}
              onChange={e => setLeaveForm(p => ({ ...p, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={leaveForm.endDate}
              onChange={e => setLeaveForm(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
            <input type="checkbox" checked={leaveForm.isHalfDay}
              onChange={e => setLeaveForm(p => ({ ...p, isHalfDay: e.target.checked }))} className="rounded" />
            <span className="text-sm font-medium text-slate-700">Apply for Half Day</span>
          </label>
          <TextArea label="Reason *" value={leaveForm.reason} rows={3}
            onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Briefly explain the reason for your leave..." />
        </div>
      </Modal>

      {/* Correction Modal */}
      <Modal isOpen={corrModal} onClose={() => setCorrModal(false)} title="Request Attendance Correction"
        description="Submit a correction if your check-in/out time is wrong"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCorrModal(false)}>Cancel</Button>
            <Button onClick={handleCorrSubmit}>Submit Request</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Attendance Date" type="date" value={corrForm.date}
            onChange={e => setCorrForm(p => ({ ...p, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Correct Check In" type="time" value={corrForm.requestedCheckIn}
              onChange={e => setCorrForm(p => ({ ...p, requestedCheckIn: e.target.value }))} />
            <Input label="Correct Check Out" type="time" value={corrForm.requestedCheckOut}
              onChange={e => setCorrForm(p => ({ ...p, requestedCheckOut: e.target.value }))} />
          </div>
          <TextArea label="Reason *" value={corrForm.reason} rows={3}
            onChange={e => setCorrForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Explain why correction is needed..." />
        </div>
      </Modal>
    </div>
  );
};
