// ============================================================
// Clixhora HRMS — Payroll service
//
// Thin facade over the payroll repository so that the admin payroll page and
// the employee payslip page read the same data and fail loudly instead of
// rendering an empty table that looks like "no payroll has run".
// ============================================================

import type { PayrollRun, Payslip } from '../types';
import {
  createPayrollRepository,
  type PayrollRepository,
} from './repositories/payrollRepository';

let repository: PayrollRepository | null = null;

export const getPayrollRepository = (): PayrollRepository => {
  if (!repository) repository = createPayrollRepository();
  return repository;
};

export const setPayrollRepository = (repo: PayrollRepository | null): void => {
  repository = repo;
};

export const listPayrollRuns = async (): Promise<PayrollRun[]> =>
  getPayrollRepository().listRuns();

export const getPayrollRunByMonth = async (payrollMonth: string): Promise<PayrollRun | null> =>
  getPayrollRepository().getRunByMonth(payrollMonth);

export const listPayslips = async (filter?: {
  employeeId?: string;
  payrollMonth?: string;
}): Promise<Payslip[]> => {
  const payslips = await getPayrollRepository().listPayslips(filter);
  return payslips.sort((a, b) => b.payrollMonth.localeCompare(a.payrollMonth));
};

export const getPayslipsForEmployee = async (employeeId: string): Promise<Payslip[]> =>
  listPayslips({ employeeId });

export const getLatestPayslipForEmployee = async (employeeId: string): Promise<Payslip | null> => {
  const payslips = await getPayslipsForEmployee(employeeId);
  return payslips[0] ?? null;
};

export const payrollService = {
  listRuns: listPayrollRuns,
  getRunByMonth: getPayrollRunByMonth,
  listPayslips,
  getPayslipsForEmployee,
  getLatestPayslipForEmployee,
};
