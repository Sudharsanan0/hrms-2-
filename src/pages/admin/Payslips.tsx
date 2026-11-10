import React, { useState } from 'react';
import { FileText, Download, Eye, Play, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/DataState';
import { DataSourceBanner } from '../../components/common/DataSourceBanner';
import { usePayslips } from '../../hooks/useHrmsData';
import { useToast } from '../../hooks/useToast';
import { listPayrollRuns } from '../../services/payrollService';
import { getSettingsRepository } from '../../services/attendanceService';
import { generatePayslipPdf } from '../../lib/pdfPayslipGenerator';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPayrollMonth } from '../../lib/utils';

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = d.toISOString().slice(0, 7);
  return { value: val, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
});

const STEP_ORDER = ['draft', 'processing', 'ready', 'finalized', 'payment_confirmed', 'published'];

export const AdminPayslips: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab]   = useState('payroll');
  const [selectedMonth, setMonth]   = useState(MONTHS[0].value);
  const [policyOpen, setPolicyOpen] = useState(false);

  const runsQuery = useQuery({ queryKey: ['payroll', 'runs'], queryFn: listPayrollRuns });
  const payslipsQuery = usePayslips({ payrollMonth: selectedMonth });
  const policyQuery = useQuery({
    queryKey: ['policy'],
    queryFn: async () => {
      const settings = getSettingsRepository();
      const [attendance, leave] = await Promise.all([
        settings.getAttendanceSettings(),
        settings.getLeaveSettings(),
      ]);
      return { attendance, leave };
    },
    enabled: policyOpen,
  });

  /**
   * Payroll runs are produced by the payroll workflow (attendance → earnings →
   * payslips). This build reads the runs that exist in the shared data source,
   * so the button explains where the data comes from instead of failing silently.
   */
  const handleStartRun = () => {
    toast.info(
      'Payroll runs are generated from attendance',
      `No payroll run exists for ${formatPayrollMonth(selectedMonth)}. Runs are created by the payroll workflow and then read here — see docs/SUPABASE_SETUP.md.`,
    );
  };

  const payrollRuns = runsQuery.data ?? [];
  const currentRun = payrollRuns.find(r => r.payrollMonth === selectedMonth);
  const payslips = payslipsQuery.data ?? [];

  const tabs = [
    { id: 'payroll',  label: 'Payroll Runs' },
    { id: 'payslips', label: 'Payslips', badge: payslips.length },
  ];

  const payrollSteps = [
    { num: 1, label: 'Prepare',          desc: 'Calculate attendance & earnings', status: 'draft' },
    { num: 2, label: 'Review',           desc: 'Verify all employee payroll items', status: 'ready' },
    { num: 3, label: 'Finalize & Lock',  desc: 'Lock payroll for the month', status: 'finalized' },
    { num: 4, label: 'Confirm Payment',  desc: 'Confirm salary has been paid', status: 'payment_confirmed' },
    { num: 5, label: 'Publish Payslips', desc: 'Make payslips available to employees', status: 'published' },
  ];

  const currentStepIndex = currentRun ? STEP_ORDER.indexOf(currentRun.status) : -1;

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll & Payslips</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage monthly payroll and publish payslips</p>
        </div>
        <div className="w-52 shrink-0">
          <Select options={MONTHS} value={selectedMonth} onChange={e => setMonth(e.target.value)} />
        </div>
      </div>

      <DataSourceBanner />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Payroll Runs Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Payroll Workflow Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Payroll Workflow — {formatPayrollMonth(selectedMonth)}</CardTitle>
              <Badge status={currentRun?.status || 'not_started'}>
                {currentRun ? currentRun.status.replace('_', ' ') : 'Not Started'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 overflow-x-auto pb-2">
                {payrollSteps.map((step, i) => {
                  const done = currentStepIndex >= STEP_ORDER.indexOf(step.status);
                  return (
                    <div key={step.num} className="flex items-start gap-3 flex-shrink-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {done ? '✓' : step.num}
                        </div>
                        {i < payrollSteps.length - 1 && (
                          <div className="w-px h-8 bg-slate-200 mt-1" />
                        )}
                      </div>
                      <div className="pt-1">
                        <p className="text-xs font-semibold text-slate-900">{step.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-[120px]">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Start Payroll */}
          {!currentRun && !runsQuery.isLoading && !runsQuery.error && (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                No payroll run for {formatPayrollMonth(selectedMonth)}
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md">
                Process employee attendance records, calculate earnings and deductions, and generate payslips for this month.
              </p>
              <div className="flex items-center gap-3">
                <Button leftIcon={<Play className="w-4 h-4" />} onClick={handleStartRun}>
                  Start Payroll Run
                </Button>
                <Button variant="outline" leftIcon={<Info className="w-4 h-4" />} onClick={() => setPolicyOpen(true)}>
                  View Policy
                </Button>
              </div>
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left max-w-md">
                <p className="text-xs font-semibold text-amber-800 mb-1">⚠ Before starting payroll</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Ensure all attendance records are up-to-date</li>
                  <li>• Approve pending leave requests</li>
                  <li>• Verify employee salary structures</li>
                  <li>• Resolve any correction requests</li>
                </ul>
              </div>
            </div>
          )}

          {runsQuery.isLoading && <LoadingState label="Loading payroll runs…" className="py-12" />}
          {runsQuery.error && (
            <div className="card p-5">
              <ErrorState
                error={runsQuery.error}
                title="Could not load payroll runs"
                onRetry={() => runsQuery.refetch()}
              />
            </div>
          )}

          {/* Payroll Summary when run exists */}
          {currentRun && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card text-center p-4">
                <p className="text-xs text-slate-400 mb-1">Total Gross</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(currentRun.totalGross)}</p>
              </div>
              <div className="card text-center p-4">
                <p className="text-xs text-slate-400 mb-1">Total Deductions</p>
                <p className="text-2xl font-bold text-rose-600">{formatCurrency(currentRun.totalDeductions)}</p>
              </div>
              <div className="card text-center p-4 border-2 border-emerald-200 bg-emerald-50">
                <p className="text-xs text-emerald-600 mb-1">Net Payable</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(currentRun.totalNet)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payslips Tab */}
      {activeTab === 'payslips' && (
        <div className="card overflow-hidden p-0">
          {payslipsQuery.isLoading ? (
            <LoadingState label="Loading payslips…" className="py-16" />
          ) : payslipsQuery.error ? (
            <div className="p-5">
              <ErrorState
                error={payslipsQuery.error}
                title="Could not load payslips"
                onRetry={() => payslipsQuery.refetch()}
              />
            </div>
          ) : payslips.length === 0 ? (
            <EmptyState
              title="No payslips yet"
              message={`Run payroll for ${formatPayrollMonth(selectedMonth)} to generate payslips.`}
              icon={<FileText className="w-6 h-6 text-slate-300" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3 text-left">Payslip No.</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Payable Days</th>
                    <th className="px-4 py-3 text-left">Net Salary</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {payslips.map(ps => (
                    <tr key={ps.id} className="table-row">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-500">{ps.payslipNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{ps.employeeName}</td>
                      <td className="px-4 py-3 text-slate-600">{ps.departmentName}</td>
                      <td className="px-4 py-3">{ps.payableDays}d</td>
                      <td className="px-4 py-3 font-bold font-mono">{formatCurrency(ps.netSalary)}</td>
                      <td className="px-4 py-3"><Badge status={ps.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => generatePayslipPdf(ps)}>View</Button>
                          {ps.status === 'published' && (
                            <Button size="sm" variant="outline" leftIcon={<Download className="w-3.5 h-3.5" />}
                              onClick={() => generatePayslipPdf(ps)}>PDF</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Attendance & leave policy — the rules payroll is calculated with */}
      <Modal
        isOpen={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="Payroll Policy"
        description="The attendance and leave rules the payroll workflow uses."
        size="md"
      >
        {policyQuery.isLoading ? (
          <LoadingState label="Loading policy…" />
        ) : policyQuery.error ? (
          <ErrorState error={policyQuery.error} title="Could not load the policy" onRetry={() => policyQuery.refetch()} />
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                <li>· Weekly off: {policyQuery.data?.attendance.weeklyOffDays.join(', ') || '—'}</li>
                <li>· Grace period: {policyQuery.data?.attendance.gracePeriodMinutes} minutes</li>
                <li>· Half day threshold: {policyQuery.data?.attendance.halfDayThresholdMinutes} minutes</li>
                <li>· Minimum full day: {policyQuery.data?.attendance.minimumFullDayMinutes} minutes</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Leave</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                <li>· Monthly paid leave entitlement: {policyQuery.data?.leave.monthlyPaidLeaveEntitlement} day(s)</li>
                <li>· Carry forward: {policyQuery.data?.leave.carryForwardEnabled ? 'allowed' : 'not allowed'}</li>
                <li>· Half day leave: {policyQuery.data?.leave.halfDayEnabled ? 'allowed' : 'not allowed'}</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
