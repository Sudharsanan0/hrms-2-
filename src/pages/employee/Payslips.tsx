import React, { useState } from 'react';
import { FileText, Download, Eye, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/DataState';
import { useAuth } from '../../hooks/useAuth';
import { useMyPayslips } from '../../hooks/useHrmsData';
import { formatCurrency, formatPayrollMonth } from '../../lib/utils';
import { generatePayslipPdf } from '../../lib/pdfPayslipGenerator';

const YEARS = Array.from({ length: 3 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export const EmpPayslips: React.FC = () => {
  const { user } = useAuth();
  const [selectedYear, setYear] = useState(() => String(new Date().getFullYear()));
  const [viewing, setViewing]   = useState<any>(null);

  const payslipsQuery = useMyPayslips(user?.employeeId);
  const allPayslips = payslipsQuery.data ?? [];
  const payslips = allPayslips.filter(ps => ps.payrollMonth.startsWith(selectedYear));

  if (!user?.employeeId) {
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
          <h1 className="text-2xl font-bold text-slate-900">My Payslips</h1>
          <p className="text-sm text-slate-500 mt-0.5">Download your published monthly salary slips</p>
        </div>
        <Select options={YEARS} value={selectedYear} onChange={e => setYear(e.target.value)} className="w-32" />
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Lock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Payslips are published by HR after salary payment confirmation. Only finalized payslips are visible here. Downloads are secured with short-lived signed links.
        </p>
      </div>

      {/* Payslip Grid */}
      {payslipsQuery.isLoading ? (
        <LoadingState label="Loading your payslips…" className="py-16" />
      ) : payslipsQuery.error ? (
        <div className="card p-5">
          <ErrorState
            error={payslipsQuery.error}
            title="Could not load your payslips"
            onRetry={() => payslipsQuery.refetch()}
          />
        </div>
      ) : payslips.length === 0 ? (
        <EmptyState
          title={`No payslips for ${selectedYear}`}
          message="Payslips will appear here once your HR team processes payroll and publishes your salary slip. This typically happens by the 5th of the following month."
          icon={<FileText className="w-6 h-6 text-slate-300" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {payslips.map(ps => (
            <div key={ps.id} className="card p-5 hover:shadow-card transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{formatPayrollMonth(ps.payrollMonth)}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{ps.payslipNumber}</p>
                </div>
                <Badge status={ps.status}>{ps.status}</Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Payable Days</span>
                  <span className="font-semibold text-slate-900">{ps.payableDays} days</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Gross Salary</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(ps.grossSalary)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Deductions</span>
                  <span className="font-semibold text-rose-600">- {formatCurrency(ps.totalDeductions)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-100 pt-2 mt-2">
                  <span className="font-semibold text-slate-900">Net Salary</span>
                  <span className="font-bold text-emerald-700 text-sm">{formatCurrency(ps.netSalary)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" leftIcon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => setViewing(ps)}>
                  View
                </Button>
                <Button size="sm" className="flex-1" leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => generatePayslipPdf(ps)}>
                  PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Payslip Modal */}
      {viewing && (
        <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={`Payslip — ${formatPayrollMonth(viewing.payrollMonth)}`} size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
              <Button leftIcon={<Download className="w-4 h-4" />} onClick={() => generatePayslipPdf(viewing)}>
                Download PDF
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl text-xs">
              <div><span className="text-slate-400">Employee</span><p className="font-semibold text-slate-900 mt-0.5">{viewing.employeeName}</p></div>
              <div><span className="text-slate-400">Employee ID</span><p className="font-mono font-semibold text-slate-900 mt-0.5">{viewing.employeeCode}</p></div>
              <div><span className="text-slate-400">Department</span><p className="font-semibold text-slate-900 mt-0.5">{viewing.departmentName}</p></div>
              <div><span className="text-slate-400">Payslip No.</span><p className="font-mono font-semibold text-slate-900 mt-0.5">{viewing.payslipNumber}</p></div>
            </div>
            {/* Attendance */}
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { l: 'Working Days', v: viewing.attendanceSummary?.scheduledWorkingDays || 0 },
                { l: 'Payable',      v: viewing.payableDays || 0 },
                { l: 'Present',      v: viewing.attendanceSummary?.presentDays || 0 },
                { l: 'Leave',        v: viewing.attendanceSummary?.paidLeaveDays || 0 },
                { l: 'LOP',          v: viewing.lopDays || 0, red: true },
              ].map(({ l, v, red }) => (
                <div key={l} className={`p-2 rounded-lg ${red ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  <p className={`text-lg font-bold ${red ? 'text-rose-600' : 'text-slate-900'}`}>{v}</p>
                  <p className="text-[10px] text-slate-400">{l}</p>
                </div>
              ))}
            </div>
            {/* Earnings & Deductions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wide">Earnings</p>
                {(viewing.earnings || []).map((e: any) => (
                  <div key={e.name} className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-600">{e.name}</span>
                    <span className="font-semibold font-mono">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs py-1.5 font-bold border-t-2 border-slate-200 mt-1">
                  <span>Total Earnings</span><span className="font-mono">{formatCurrency(viewing.grossSalary)}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-rose-700 mb-2 uppercase tracking-wide">Deductions</p>
                {(viewing.deductions || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No deductions</p>
                ) : (viewing.deductions || []).map((d: any) => (
                  <div key={d.name} className="flex justify-between text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-600">{d.name}</span>
                    <span className="font-semibold font-mono text-rose-600">- {formatCurrency(d.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs py-1.5 font-bold border-t-2 border-slate-200 mt-1">
                  <span>Total Deductions</span><span className="font-mono text-rose-600">- {formatCurrency(viewing.totalDeductions)}</span>
                </div>
              </div>
            </div>
            {/* Net */}
            <div className="bg-gradient-to-r from-navy-700 to-brand-700 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Net Salary</p>
                <p className="text-white text-xs mt-0.5">Take-home amount</p>
              </div>
              <p className="text-white text-2xl font-bold font-mono">{formatCurrency(viewing.netSalary)}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
