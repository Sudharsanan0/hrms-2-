// ============================================================
// Clixhora HRMS — Dashboard service
//
// Every metric is derived from the shared employee / attendance / payroll
// data sources. A failed query is surfaced as an error — it is never
// converted into a misleading zero.
// ============================================================

import { toYYYYMM, todayIST } from '../lib/utils';
import type { Employee, Holiday, PayrollRunStatus } from '../types';
import { getAttendanceRoster, getSettingsRepository } from './attendanceService';
import { listEmployees } from './employeeService';
import { createCorrectionRepository } from './repositories/correctionRepository';
import { createLeaveRepository } from './repositories/leaveRepository';
import { createPayrollRepository } from './repositories/payrollRepository';

export interface DashboardMetrics {
  currentDate: string;
  currentMonth: string;
  totalEmployees: number;
  totalActiveEmployees: number;
  presentToday: number;
  halfDayToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingToday: number;
  pendingLeaveRequests: number;
  pendingCorrectionRequests: number;
  payrollStatus: PayrollRunStatus | null;
  totalGrossPayroll: number;
  totalDeductions: number;
  totalNetPayroll: number;
  payrollEmployeeCount: number;
  recentlyJoined: Employee[];
  upcomingHolidays: Holiday[];
}

/** Most recently joined employees first (joined date, then creation date). */
export const sortByRecentlyJoined = (employees: Employee[]): Employee[] =>
  [...employees].sort((a, b) => {
    const byDate = (b.dateJoined ?? '').localeCompare(a.dateJoined ?? '');
    if (byDate !== 0) return byDate;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });

export const getAdminDashboardMetrics = async (date: string = todayIST()): Promise<DashboardMetrics> => {
  const payrollRepository = createPayrollRepository();
  const leaveRepository = createLeaveRepository();
  const correctionRepository = createCorrectionRepository();

  const [employees, roster, runs, pendingLeave, pendingCorrections, holidays] = await Promise.all([
    listEmployees(),
    getAttendanceRoster(date),
    payrollRepository.listRuns(),
    leaveRepository.listRequests({ status: 'pending' }),
    correctionRepository.listRequests({ status: 'pending' }),
    getSettingsRepository().listHolidays(),
  ]);

  const active = employees.filter(e => e.employmentStatus === 'active');
  const currentMonth = toYYYYMM();
  const currentRun = runs.find(r => r.payrollMonth === currentMonth) ?? null;

  const upcomingHolidays = holidays
    .filter(h => h.holidayDate >= date)
    .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
    .slice(0, 5);

  return {
    currentDate: date,
    currentMonth,
    totalEmployees: employees.length,
    totalActiveEmployees: active.length,
    presentToday: roster.summary.present,
    halfDayToday: roster.summary.halfDay,
    absentToday: roster.summary.absent,
    onLeaveToday: roster.summary.onLeave,
    pendingToday: roster.summary.pending,
    pendingLeaveRequests: pendingLeave.length,
    pendingCorrectionRequests: pendingCorrections.length,
    payrollStatus: currentRun?.status ?? null,
    totalGrossPayroll: currentRun?.totalGross ?? 0,
    totalDeductions: currentRun?.totalDeductions ?? 0,
    totalNetPayroll: currentRun?.totalNet ?? 0,
    payrollEmployeeCount: currentRun?.employeeCount ?? 0,
    recentlyJoined: sortByRecentlyJoined(employees).slice(0, 5),
    upcomingHolidays,
  };
};
