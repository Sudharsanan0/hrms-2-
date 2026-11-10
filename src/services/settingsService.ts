// ============================================================
// Clixhora HRMS — Settings service
//
// Facade over the settings repository: the company profile, the attendance and
// leave policy, the payroll policy and the holiday calendar. Reads throw on
// failure so the UI can show an explicit error instead of silently falling
// back to defaults.
// ============================================================

import type { AttendanceSettings, Holiday, LeaveSettings } from '../types';
import {
  createSettingsRepository,
  type CompanySettings,
  type PayrollSettings,
  type SettingsRepository,
} from './repositories/settingsRepository';

let repository: SettingsRepository | null = null;

export const getSettingsRepository = (): SettingsRepository => {
  if (!repository) repository = createSettingsRepository();
  return repository;
};

export const setSettingsRepository = (repo: SettingsRepository | null): void => {
  repository = repo;
};

export interface AppSettings {
  company: CompanySettings;
  attendance: AttendanceSettings;
  leave: LeaveSettings;
  payroll: PayrollSettings;
  holidays: Holiday[];
}

/** Every setting the admin portal can edit, read in one pass. */
export const getAppSettings = async (): Promise<AppSettings> => {
  const settings = getSettingsRepository();
  const [company, attendance, leave, payroll, holidays] = await Promise.all([
    settings.getCompanySettings(),
    settings.getAttendanceSettings(),
    settings.getLeaveSettings(),
    settings.getPayrollSettings(),
    settings.listHolidays(),
  ]);
  return { company, attendance, leave, payroll, holidays };
};

export const saveCompanySettings = async (company: CompanySettings): Promise<CompanySettings> =>
  getSettingsRepository().saveCompanySettings(company);

export const saveAttendanceSettings = async (
  attendance: AttendanceSettings,
): Promise<AttendanceSettings> => getSettingsRepository().saveAttendanceSettings(attendance);

export const saveLeaveSettings = async (leave: LeaveSettings): Promise<LeaveSettings> =>
  getSettingsRepository().saveLeaveSettings(leave);

export const savePayrollSettings = async (payroll: PayrollSettings): Promise<PayrollSettings> =>
  getSettingsRepository().savePayrollSettings(payroll);

export const addHoliday = async (holiday: {
  name: string;
  date: string;
  description?: string;
  isOptional?: boolean;
}): Promise<Holiday> => getSettingsRepository().addHoliday(holiday);

export const removeHoliday = async (id: string): Promise<void> =>
  getSettingsRepository().removeHoliday(id);

export const settingsService = {
  getAll: getAppSettings,
  saveCompany: saveCompanySettings,
  saveAttendance: saveAttendanceSettings,
  saveLeave: saveLeaveSettings,
  savePayroll: savePayrollSettings,
  addHoliday,
  removeHoliday,
};
