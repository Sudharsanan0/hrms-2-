// ============================================================
// Clixhora HRMS — Payroll repository (payroll runs + payslips)
// ============================================================

import { ServiceError } from '../../lib/errors';
import { dataSourceMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { PayrollRun, PayrollRunStatus, Payslip } from '../../types';
import type { RepositoryMode } from './employeeRepository';

export interface PayrollRepository {
  readonly mode: RepositoryMode;
  listRuns(): Promise<PayrollRun[]>;
  getRunByMonth(payrollMonth: string): Promise<PayrollRun | null>;
  listPayslips(filter?: { employeeId?: string; payrollMonth?: string }): Promise<Payslip[]>;
}

const fromPostgrestError = (error: any, context: string): ServiceError => {
  const message: string = error?.message || 'Unknown database error';
  const code = String(error?.code || '');
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new ServiceError('permission', `Supabase denied the request (${context}). ${message}`, error);
  }
  if (code === '42P01' || /does not exist/i.test(message)) {
    return new ServiceError('validation', `The payroll tables are missing (${context}). Run the migrations in supabase/migrations. ${message}`, error);
  }
  if (/failed to fetch|network|timeout/i.test(message)) {
    return new ServiceError('network', `Could not reach Supabase (${context}). ${message}`, error);
  }
  return new ServiceError('unknown', `${context}: ${message}`, error);
};

const assertConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new ServiceError(
      'not_configured',
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) to your .env file.',
    );
  }
};

const mapRun = (row: any): PayrollRun => ({
  id: String(row.id),
  payrollMonth: String(row.payroll_month),
  status: (row.status ?? 'draft') as PayrollRunStatus,
  preparedAt: row.prepared_at ?? undefined,
  finalizedAt: row.finalized_at ?? undefined,
  paymentDate: row.payment_date ?? undefined,
  paymentConfirmedAt: row.payment_confirmed_at ?? undefined,
  publishedAt: row.published_at ?? undefined,
  totalGross: Number(row.total_gross ?? 0),
  totalDeductions: Number(row.total_deductions ?? 0),
  totalNet: Number(row.total_net ?? 0),
  employeeCount: Number(row.employee_count ?? 0),
  createdAt: row.created_at ?? '',
});

const mapPayslip = (row: any): Payslip => ({
  id: String(row.id),
  payrollItemId: String(row.payroll_item_id ?? row.id),
  payrollRunId: String(row.payroll_run_id),
  employeeId: String(row.employee_id),
  employeeName: row.employee_name ?? '',
  employeeCode: row.employee_code ?? '',
  departmentName: row.department_name ?? '',
  designationName: row.designation_name ?? '',
  payrollMonth: String(row.payroll_month),
  version: Number(row.version ?? 1),
  status: (row.status ?? 'draft') as Payslip['status'],
  storagePath: row.storage_path ?? undefined,
  generatedAt: row.generated_at ?? undefined,
  publishedAt: row.published_at ?? undefined,
  payslipNumber: row.payslip_number ?? '',
  basicSalary: Number(row.basic_salary ?? 0),
  grossSalary: Number(row.gross_salary ?? 0),
  totalDeductions: Number(row.total_deductions ?? 0),
  netSalary: Number(row.net_salary ?? 0),
  payableDays: Number(row.payable_days ?? 0),
  lopDays: Number(row.lop_days ?? 0),
  earnings: row.earnings ?? [],
  deductions: row.deductions ?? [],
  attendanceSummary: row.attendance_summary ?? {},
  dateJoined: row.date_joined ?? undefined,
  paymentMode: row.payment_mode ?? undefined,
});

export class SupabasePayrollRepository implements PayrollRepository {
  readonly mode: RepositoryMode = 'supabase';

  async listRuns(): Promise<PayrollRun[]> {
    assertConfigured();
    const { data, error } = await supabase.from('payroll_runs' as any).select('*');
    if (error) throw fromPostgrestError(error, 'loading payroll runs');
    return (data ?? []).map(mapRun).sort((a, b) => b.payrollMonth.localeCompare(a.payrollMonth));
  }

  async getRunByMonth(payrollMonth: string): Promise<PayrollRun | null> {
    const runs = await this.listRuns();
    return runs.find(r => r.payrollMonth === payrollMonth) ?? null;
  }

  async listPayslips(filter?: { employeeId?: string; payrollMonth?: string }): Promise<Payslip[]> {
    assertConfigured();
    let query = supabase.from('payslips' as any).select('*');
    if (filter?.employeeId) query = query.eq('employee_id', filter.employeeId);
    if (filter?.payrollMonth) query = query.eq('payroll_month', filter.payrollMonth);
    const { data, error } = await query;
    if (error) throw fromPostgrestError(error, 'loading payslips');
    return (data ?? []).map(mapPayslip);
  }
}

export class DemoPayrollRepository implements PayrollRepository {
  readonly mode: RepositoryMode = 'demo';

  async listRuns(): Promise<PayrollRun[]> {
    // No payroll has been processed in the demo environment.
    return [];
  }

  async getRunByMonth(): Promise<PayrollRun | null> {
    return null;
  }

  async listPayslips(): Promise<Payslip[]> {
    return [];
  }
}

export const createPayrollRepository = (): PayrollRepository => {
  if (dataSourceMode === 'supabase') return new SupabasePayrollRepository();
  return new DemoPayrollRepository();
};
