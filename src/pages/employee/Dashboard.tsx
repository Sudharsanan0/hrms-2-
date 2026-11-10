import React, { useState, useEffect } from 'react';
import {
  FileText, Megaphone, ArrowRight, LogIn, LogOut, CalendarCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { useCheckInOut, useEmployee, useMyAnnouncements, useMyAttendance, useMyLeaveRequests, useMyPayslips } from '../../hooks/useHrmsData';
import { todayIST } from '../../lib/utils';

export const EmpDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [time, setTime] = useState(() => new Date());
  const [loading, setLoading] = useState(false);

  const employeeId = user?.employeeId;
  const month = todayIST().slice(0, 7);

  const attendanceQuery = useMyAttendance(employeeId, month);
  const leaveQuery = useMyLeaveRequests(employeeId);
  const payslipsQuery = useMyPayslips(employeeId);
  const checkInOut = useCheckInOut();
  const employeeQuery = useEmployee(employeeId);
  const announcementsQuery = useMyAnnouncements(
    employeeQuery.data?.departmentId ?? employeeQuery.data?.departmentSlug,
  );

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayRecord = (attendanceQuery.data ?? []).find(r => r.attendanceDate === todayIST());
  const checkedIn = !!todayRecord?.checkInAt;
  const checkedOut = !!todayRecord?.checkOutAt;

  const records = attendanceQuery.data ?? [];
  const stats = records.reduce(
    (acc, rec) => {
      if (rec.status === 'present' || rec.status === 'work_from_home') acc.present += 1;
      else if (rec.status === 'paid_leave' || rec.status === 'unpaid_leave') acc.leave += 1;
      else if (rec.status === 'absent') acc.absent += 1;
      return acc;
    },
    { present: 0, leave: 0, absent: 0 },
  );

  const leaveRequests = leaveQuery.data ?? [];
  const payslips = payslipsQuery.data ?? [];

  const today = time.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const timeStr = time.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  const handleCheckIn = async () => {
    if (!employeeId) { toast.error('No employee record linked to your login.'); return; }
    setLoading(true);
    try {
      await checkInOut.mutateAsync({ employeeId, action: 'in', actorName: user?.name });
      toast.success('Checked In!', `Marked present at ${time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`);
    } catch (err: any) {
      toast.error('Could not record your check-in', err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId) { toast.error('No employee record linked to your login.'); return; }
    setLoading(true);
    try {
      await checkInOut.mutateAsync({ employeeId, action: 'out', actorName: user?.name });
      toast.info('Checked Out', 'Your attendance has been recorded.');
    } catch (err: any) {
      toast.error('Could not record your check-out', err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-enter">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hello, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{today}</p>
      </div>

      {/* Check In / Out Card */}
      <div className="bg-gradient-to-br from-navy-700 to-brand-700 rounded-2xl p-6 text-white shadow-modal">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Current Time (IST)</p>
            <p className="text-4xl font-bold font-mono tracking-tight">{timeStr}</p>
            <p className="text-white/60 text-sm mt-1">
              {checkedIn
                ? `Checked in at ${todayRecord?.checkInAt
                    ? new Date(todayRecord.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                    : '—'}`
                : 'Not checked in yet'}
              {checkedOut && todayRecord?.checkOutAt
                ? ` · Checked out at ${new Date(todayRecord.checkOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}`
                : ''}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${checkedIn ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-white/60'}`}>
              <span className={`w-2 h-2 rounded-full ${checkedIn ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
              {checkedIn ? 'Present' : 'Not Checked In'}
            </div>
            {!checkedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="flex items-center gap-2 bg-white text-brand-700 font-bold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all disabled:opacity-60 text-sm shadow-md"
              >
                {loading ? <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                Check In
              </button>
            ) : !checkedOut ? (
              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="flex items-center gap-2 bg-rose-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-rose-600 transition-all disabled:opacity-60 text-sm shadow-md"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogOut className="w-4 h-4" />}
                Check Out
              </button>
            ) : (
              <span className="text-xs text-white/60 bg-white/10 px-3 py-2 rounded-lg">
                Your attendance for today is complete.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Present Days',   val: stats.present, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'On Leave',       val: stats.leave,   color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Absent',         val: stats.absent,  color: 'text-rose-600',    bg: 'bg-rose-50'    },
          { label: 'Leave Requests', val: leaveRequests.length, color: 'text-brand-600', bg: 'bg-brand-50' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`card p-4 text-center ${bg} border-0`}>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leave */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
            <Link to="/employee/attendance?tab=leave">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {leaveQuery.isLoading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading leave requests…</p>
            ) : leaveRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CalendarCheck className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No leave requests yet</p>
                <Link to="/employee/attendance?tab=leave" className="mt-2">
                  <Button size="sm" variant="outline">Apply for Leave</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {leaveRequests.slice(0, 3).map(req => (
                  <div key={req.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-700 capitalize">{req.leaveType.replace('_', ' ')} leave</span>
                    <span className="text-slate-400">{req.startDate} · {req.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Payslip */}
        <Card>
          <CardHeader>
            <CardTitle>Latest Payslip</CardTitle>
            <Link to="/employee/payslips">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {payslipsQuery.isLoading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading payslips…</p>
            ) : payslips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No payslips available yet</p>
                <p className="text-[10px] text-slate-300 mt-1">Payslips are published after salary payment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payslips.slice(0, 3).map(ps => (
                  <div key={ps.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-700">{ps.payrollMonth}</span>
                    <span className="font-semibold text-slate-900">₹{ps.netSalary.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
          <Link to="/employee/announcements">
            <Button size="sm" variant="ghost" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {announcementsQuery.isLoading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading announcements…</p>
          ) : (announcementsQuery.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Megaphone className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">No announcements right now</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(announcementsQuery.data ?? []).slice(0, 3).map(ann => (
                <div key={ann.id} className="flex items-start justify-between gap-3 text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-700">{ann.title}</span>
                  <span className="text-slate-400 whitespace-nowrap">{ann.publishAt || ann.createdAt}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
