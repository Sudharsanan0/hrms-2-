import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, CalendarOff, UserX, Clock,
  AlertCircle, FileText, TrendingUp, Plus, ArrowRight,
  Calendar, Banknote, UserPlus, Hourglass,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardMetrics } from '../../hooks/useHrmsData';
import { StatsCard } from '../../components/ui/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState, TableDataBoundary } from '../../components/common/DataState';
import { DataSourceBanner } from '../../components/common/DataSourceBanner';
import { formatDate, formatCurrency, todayIST, todayLabelIST } from '../../lib/utils';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const today = todayLabelIST();

  const { data, isLoading, error, refetch } = useDashboardMetrics(todayIST());

  return (
    <div className="space-y-6 animate-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/employees">
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      <DataSourceBanner />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Total Employees"
          value={data?.totalEmployees ?? (isLoading ? '—' : '—')}
          description="All employee records"
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-brand-50 text-brand-600"
        />
        <StatsCard
          title="Active Employees"
          value={data?.totalActiveEmployees ?? '—'}
          description="Currently employed"
          icon={<UserPlus className="w-5 h-5" />}
          iconBg="bg-brand-50 text-brand-600"
        />
        <StatsCard
          title="Present Today"
          value={data?.presentToday ?? '—'}
          description={todayIST()}
          icon={<UserCheck className="w-5 h-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatsCard
          title="On Leave"
          value={data?.onLeaveToday ?? '—'}
          description="Approved leave today"
          icon={<CalendarOff className="w-5 h-5" />}
          iconBg="bg-amber-50 text-amber-600"
        />
        <StatsCard
          title="Absent Today"
          value={data?.absentToday ?? '—'}
          description="Marked absent"
          icon={<UserX className="w-5 h-5" />}
          iconBg="bg-rose-50 text-rose-600"
        />
        <StatsCard
          title="Pending Marking"
          value={data?.pendingToday ?? '—'}
          description="Not marked yet today"
          icon={<Hourglass className="w-5 h-5" />}
          iconBg="bg-slate-100 text-slate-600"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <p className="font-semibold text-rose-800">Dashboard metrics could not be loaded</p>
          <p className="mt-1">{error instanceof Error ? error.message : String(error)}</p>
          <button onClick={() => refetch()} className="mt-2 underline font-medium">Try again</button>
        </div>
      )}

      {/* Pending Actions + Payroll Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions */}
        <div className="space-y-4">
          <Card className="border-l-4 border-l-amber-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Pending Leave Requests</p>
                  <p className="text-xs text-slate-400">Awaiting your approval</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-amber-600">{data?.pendingLeaveRequests ?? '—'}</span>
            </div>
            <Link to="/admin/attendance?tab=leave" className="mt-3 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
              Review requests <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card className="border-l-4 border-l-blue-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Correction Requests</p>
                  <p className="text-xs text-slate-400">Attendance corrections</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">{data?.pendingCorrectionRequests ?? '—'}</span>
            </div>
            <Link to="/admin/attendance?tab=corrections" className="mt-3 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
              View corrections <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>

        {/* Payroll Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Month Payroll</CardTitle>
            <Link to="/admin/payslips">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Manage Payroll
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <p className="text-sm text-rose-600 py-6 text-center">Payroll data could not be loaded.</p>
            ) : !data || data.payrollStatus === null ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">No payroll run yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  {data && data.totalActiveEmployees > 0
                    ? `${data.totalActiveEmployees} active employee${data.totalActiveEmployees === 1 ? '' : 's'} are ready — process attendance to generate payroll.`
                    : 'Add employees and process attendance to generate payroll.'}
                </p>
                <Link to="/admin/payslips" className="mt-4">
                  <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Start Payroll Run
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Gross</p>
                  <p className="font-bold text-slate-900">{formatCurrency(data.totalGrossPayroll)}</p>
                </div>
                <div className="text-center p-3 bg-rose-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Deductions</p>
                  <p className="font-bold text-rose-700">{formatCurrency(data.totalDeductions)}</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Net Payable</p>
                  <p className="font-bold text-emerald-700">{formatCurrency(data.totalNetPayroll)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Employees + Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Employees */}
        <Card noPad className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Employees</h3>
            <Link to="/admin/employees" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="table-header">
                <tr>
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-5 py-3 text-left">Department</th>
                  <th className="px-5 py-3 text-left">Joined</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <TableDataBoundary
                  isLoading={isLoading}
                  error={error}
                  isEmpty={(data?.recentlyJoined.length ?? 0) === 0}
                  loadingLabel="Loading employees…"
                  errorTitle="Could not load employees"
                  emptyTitle="No employees yet"
                  emptyMessage="Add your first team member to see them here."
                  colSpan={4}
                  onRetry={() => refetch()}
                >
                  {data?.recentlyJoined.map(emp => (
                    <tr key={emp.id} className="table-row">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp.fullName} size="sm" />
                          <div>
                            <Link to={`/admin/employees/${emp.id}`} className="font-semibold text-slate-900 hover:text-brand-600">
                              {emp.fullName}
                            </Link>
                            <p className="text-slate-400 text-[10px]">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{emp.departmentName}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(emp.dateJoined)}</td>
                      <td className="px-5 py-3"><Badge status={emp.employmentStatus} /></td>
                    </tr>
                  ))}
                </TableDataBoundary>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Upcoming Holidays */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Holidays</CardTitle>
            <Calendar className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <p className="text-xs text-rose-600 py-4 text-center">Could not load holidays.</p>
            ) : (data?.upcomingHolidays.length ?? 0) === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No holidays configured</p>
                <Link to="/admin/settings" className="text-xs text-brand-600 hover:underline mt-1 block">
                  Configure holidays →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.upcomingHolidays.map(h => (
                  <div key={h.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-brand-600 uppercase">
                        {new Date(h.holidayDate).toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold text-brand-700">
                        {new Date(h.holidayDate).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{h.name}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(h.holidayDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Snapshot</CardTitle>
          <Banknote className="w-4 h-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          {data?.payrollStatus ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <Badge status={data.payrollStatus}>{data.payrollStatus.replace('_', ' ')}</Badge>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Employees</p>
                <p className="font-bold text-slate-900">{data.payrollEmployeeCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Gross</p>
                <p className="font-bold text-slate-900">{formatCurrency(data.totalGrossPayroll)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 mb-1">Net</p>
                <p className="font-bold text-emerald-700">{formatCurrency(data.totalNetPayroll)}</p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No payroll run for this month"
              message="Payroll is generated from attendance records. Run a payroll cycle from the Payroll & Payslips page."
              icon={<FileText className="w-6 h-6 text-slate-300" />}
              action={
                <Link to="/admin/payslips">
                  <Button size="sm" variant="outline" leftIcon={<TrendingUp className="w-3.5 h-3.5" />}>
                    Go to Payroll
                  </Button>
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>

      {user && (
        <p className="text-[11px] text-slate-400 text-right">Signed in as {user.email}</p>
      )}
    </div>
  );
};
