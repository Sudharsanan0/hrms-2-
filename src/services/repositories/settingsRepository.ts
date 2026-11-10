// ============================================================
// Clixhora HRMS — Settings & holidays repository
//
// Supplies the attendance policy (weekly off days) and the holiday
// calendar used by the roster and the payroll calculations.
// ============================================================

import { ServiceError } from '../../lib/errors';
import { dataSourceMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { AttendanceSettings, Holiday, LeaveSettings } from '../../types';
import { DEMO_ATTENDANCE_SETTINGS, DEMO_HOLIDAYS } from './demoData';
import { readDemoJson, writeDemoJson } from './demoStorage';
import type { RepositoryMode } from './employeeRepository';

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  weeklyOffDays: ['Sunday'],
  gracePeriodMinutes: 15,
  halfDayThresholdMinutes: 240,
  minimumFullDayMinutes: 360,
};

export const DEFAULT_LEAVE_SETTINGS: LeaveSettings = {
  monthlyPaidLeaveEntitlement: 1,
  carryForwardEnabled: false,
  halfDayEnabled: true,
};

export interface CompanySettings {
  name: string;
  email: string;
  address: string;
  timezone: string;
  currency: string;
}

export interface PayrollSettings {
  payslipPublicationDay: number;
  payrollCutoffDay: number;
  standardWorkingHours: number;
  lopBasis: 'calendar_days' | 'working_days';
  roundingPolicy: 'round' | 'floor' | 'ceil';
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'Clixhora Digital Marketing & Technology',
  email: 'hr@clixhora.com',
  address: 'Banaswadi, Bengaluru',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
};

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  payslipPublicationDay: 5,
  payrollCutoffDay: 28,
  standardWorkingHours: 9,
  lopBasis: 'calendar_days',
  roundingPolicy: 'round',
};

export interface SettingsRepository {
  readonly mode: RepositoryMode;
  getAttendanceSettings(): Promise<AttendanceSettings>;
  getLeaveSettings(): Promise<LeaveSettings>;
  listHolidays(): Promise<Holiday[]>;
  getCompanySettings(): Promise<CompanySettings>;
  getPayrollSettings(): Promise<PayrollSettings>;
  saveAttendanceSettings(settings: AttendanceSettings): Promise<AttendanceSettings>;
  saveLeaveSettings(settings: LeaveSettings): Promise<LeaveSettings>;
  saveCompanySettings(settings: CompanySettings): Promise<CompanySettings>;
  savePayrollSettings(settings: PayrollSettings): Promise<PayrollSettings>;
  addHoliday(holiday: { name: string; date: string; description?: string; isOptional?: boolean }): Promise<Holiday>;
  removeHoliday(id: string): Promise<void>;
}

const fromPostgrestError = (error: any, context: string): ServiceError => {
  const message: string = error?.message || 'Unknown database error';
  const code = String(error?.code || '');
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new ServiceError('permission', `Supabase denied the request (${context}). ${message}`, error);
  }
  if (code === '42P01' || /does not exist/i.test(message)) {
    return new ServiceError('validation', `The holidays/settings table is missing (${context}). Run the migrations in supabase/migrations. ${message}`, error);
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

const mapHoliday = (row: any): Holiday => ({
  id: String(row.id),
  name: row.name,
  holidayDate: String(row.holiday_date).slice(0, 10),
  description: row.description ?? undefined,
  applicability: (row.applicability ?? 'all') as Holiday['applicability'],
  isOptional: !!row.is_optional,
  createdAt: row.created_at ?? '',
});

export class SupabaseSettingsRepository implements SettingsRepository {
  readonly mode: RepositoryMode = 'supabase';

  async getAttendanceSettings(): Promise<AttendanceSettings> {
    assertConfigured();
    const { data, error } = await supabase
      .from('settings' as any)
      .select('value')
      .eq('key', 'attendance')
      .limit(1);

    if (error) {
      // A missing settings row is not fatal — fall back to the documented defaults.
      if (error.code === '42P01') {
        console.warn('[settingsRepository] settings table missing, using defaults');
        return { ...DEFAULT_ATTENDANCE_SETTINGS };
      }
      throw fromPostgrestError(error, 'loading attendance settings');
    }

    const row = Array.isArray(data) ? data[0] : data;
    const value = row?.value;
    if (!value) return { ...DEFAULT_ATTENDANCE_SETTINGS };

    const parsed = typeof value === 'string' ? safeParse(value) : value;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_ATTENDANCE_SETTINGS };

    return {
      weeklyOffDays: Array.isArray(parsed.weeklyOffDays)
        ? parsed.weeklyOffDays.map(String)
        : DEFAULT_ATTENDANCE_SETTINGS.weeklyOffDays,
      gracePeriodMinutes: Number(parsed.gracePeriodMinutes ?? DEFAULT_ATTENDANCE_SETTINGS.gracePeriodMinutes),
      halfDayThresholdMinutes: Number(parsed.halfDayThresholdMinutes ?? DEFAULT_ATTENDANCE_SETTINGS.halfDayThresholdMinutes),
      minimumFullDayMinutes: Number(parsed.minimumFullDayMinutes ?? DEFAULT_ATTENDANCE_SETTINGS.minimumFullDayMinutes),
    };
  }

  async listHolidays(): Promise<Holiday[]> {
    assertConfigured();
    const { data, error } = await supabase.from('holidays' as any).select('*');
    if (error) throw fromPostgrestError(error, 'loading holidays');
    return (data ?? []).map(mapHoliday).sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
  }

  async getLeaveSettings(): Promise<LeaveSettings> {
    assertConfigured();
    const { data, error } = await supabase
      .from('settings' as any)
      .select('value')
      .eq('key', 'leave')
      .limit(1);

    if (error) {
      if (error.code === '42P01') return { ...DEFAULT_LEAVE_SETTINGS };
      throw fromPostgrestError(error, 'loading leave settings');
    }

    const row = Array.isArray(data) ? data[0] : data;
    const parsed = row?.value ? (typeof row.value === 'string' ? safeParse(row.value) : row.value) : null;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_LEAVE_SETTINGS };

    return {
      monthlyPaidLeaveEntitlement: Number(
        parsed.monthlyPaidLeaveEntitlement ?? DEFAULT_LEAVE_SETTINGS.monthlyPaidLeaveEntitlement,
      ),
      carryForwardEnabled: !!parsed.carryForwardEnabled,
      halfDayEnabled: parsed.halfDayEnabled === undefined
        ? DEFAULT_LEAVE_SETTINGS.halfDayEnabled
        : !!parsed.halfDayEnabled,
    };
  }

  async getCompanySettings(): Promise<CompanySettings> {
    const value = await this.readSetting('company');
    return {
      name: String(value.name ?? DEFAULT_COMPANY_SETTINGS.name),
      email: String(value.email ?? DEFAULT_COMPANY_SETTINGS.email),
      address: String(value.address ?? DEFAULT_COMPANY_SETTINGS.address),
      timezone: String(value.timezone ?? DEFAULT_COMPANY_SETTINGS.timezone),
      currency: String(value.currency ?? DEFAULT_COMPANY_SETTINGS.currency),
    };
  }

  async getPayrollSettings(): Promise<PayrollSettings> {
    const value = await this.readSetting('payroll');
    return {
      payslipPublicationDay: Number(value.payslipPublicationDay ?? DEFAULT_PAYROLL_SETTINGS.payslipPublicationDay),
      payrollCutoffDay: Number(value.payrollCutoffDay ?? DEFAULT_PAYROLL_SETTINGS.payrollCutoffDay),
      standardWorkingHours: Number(value.standardWorkingHours ?? DEFAULT_PAYROLL_SETTINGS.standardWorkingHours),
      lopBasis: value.lopBasis === 'working_days' ? 'working_days' : DEFAULT_PAYROLL_SETTINGS.lopBasis,
      roundingPolicy: (['round', 'floor', 'ceil'].includes(value.roundingPolicy)
        ? value.roundingPolicy
        : DEFAULT_PAYROLL_SETTINGS.roundingPolicy) as PayrollSettings['roundingPolicy'],
    };
  }

  async saveAttendanceSettings(settings: AttendanceSettings): Promise<AttendanceSettings> {
    await this.writeSetting('attendance', settings);
    return settings;
  }

  async saveLeaveSettings(settings: LeaveSettings): Promise<LeaveSettings> {
    await this.writeSetting('leave', settings);
    return settings;
  }

  async saveCompanySettings(settings: CompanySettings): Promise<CompanySettings> {
    await this.writeSetting('company', settings);
    return settings;
  }

  async savePayrollSettings(settings: PayrollSettings): Promise<PayrollSettings> {
    await this.writeSetting('payroll', settings);
    return settings;
  }

  async addHoliday(holiday: {
    name: string;
    date: string;
    description?: string;
    isOptional?: boolean;
  }): Promise<Holiday> {
    assertConfigured();
    const { data, error } = await supabase
      .from('holidays' as any)
      .insert({
        name: holiday.name,
        holiday_date: holiday.date,
        description: holiday.description ?? null,
        applicability: 'all',
        is_optional: !!holiday.isOptional,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'adding the holiday');
    const row = Array.isArray(data) ? data[0] : data;
    return mapHoliday(row);
  }

  async removeHoliday(id: string): Promise<void> {
    assertConfigured();
    const { error } = await supabase.from('holidays' as any).delete().eq('id', id);
    if (error) throw fromPostgrestError(error, 'removing the holiday');
  }

  /** Reads one settings row and returns its jsonb value. */
  private async readSetting(key: string): Promise<Record<string, any>> {
    assertConfigured();
    const { data, error } = await supabase
      .from('settings' as any)
      .select('value')
      .eq('key', key)
      .limit(1);
    if (error) {
      if (error.code === '42P01') return {};
      throw fromPostgrestError(error, `loading the ${key} settings`);
    }
    const row = Array.isArray(data) ? data[0] : data;
    const value = row?.value;
    if (!value) return {};
    const parsed = typeof value === 'string' ? safeParse(value) : value;
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  /** Upserts one settings row. */
  private async writeSetting(key: string, value: unknown): Promise<void> {
    assertConfigured();
    const { error } = await supabase
      .from('settings' as any)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw fromPostgrestError(error, `saving the ${key} settings`);
  }
}

const safeParse = (value: string): any => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export class DemoSettingsRepository implements SettingsRepository {
  readonly mode: RepositoryMode = 'demo';

  async getAttendanceSettings(): Promise<AttendanceSettings> {
    const stored = readDemoJson<AttendanceSettings | null>('attendanceSettings', null);
    if (stored) return { ...DEFAULT_ATTENDANCE_SETTINGS, ...stored };
    writeDemoJson('attendanceSettings', DEMO_ATTENDANCE_SETTINGS);
    return { ...DEMO_ATTENDANCE_SETTINGS };
  }

  async getLeaveSettings(): Promise<LeaveSettings> {
    const stored = readDemoJson<LeaveSettings | null>('leaveSettings', null);
    if (stored) return { ...DEFAULT_LEAVE_SETTINGS, ...stored };
    writeDemoJson('leaveSettings', DEFAULT_LEAVE_SETTINGS);
    return { ...DEFAULT_LEAVE_SETTINGS };
  }

  async listHolidays(): Promise<Holiday[]> {
    const stored = readDemoJson<Holiday[] | null>('holidays', null);
    if (stored) return stored;
    writeDemoJson('holidays', DEMO_HOLIDAYS);
    return [...DEMO_HOLIDAYS];
  }

  async getCompanySettings(): Promise<CompanySettings> {
    const stored = readDemoJson<CompanySettings | null>('companySettings', null);
    if (stored) return { ...DEFAULT_COMPANY_SETTINGS, ...stored };
    writeDemoJson('companySettings', DEFAULT_COMPANY_SETTINGS);
    return { ...DEFAULT_COMPANY_SETTINGS };
  }

  async getPayrollSettings(): Promise<PayrollSettings> {
    const stored = readDemoJson<PayrollSettings | null>('payrollSettings', null);
    if (stored) return { ...DEFAULT_PAYROLL_SETTINGS, ...stored };
    writeDemoJson('payrollSettings', DEFAULT_PAYROLL_SETTINGS);
    return { ...DEFAULT_PAYROLL_SETTINGS };
  }

  async saveAttendanceSettings(settings: AttendanceSettings): Promise<AttendanceSettings> {
    writeDemoJson('attendanceSettings', settings);
    return settings;
  }

  async saveLeaveSettings(settings: LeaveSettings): Promise<LeaveSettings> {
    writeDemoJson('leaveSettings', settings);
    return settings;
  }

  async saveCompanySettings(settings: CompanySettings): Promise<CompanySettings> {
    writeDemoJson('companySettings', settings);
    return settings;
  }

  async savePayrollSettings(settings: PayrollSettings): Promise<PayrollSettings> {
    writeDemoJson('payrollSettings', settings);
    return settings;
  }

  async addHoliday(holiday: {
    name: string;
    date: string;
    description?: string;
    isOptional?: boolean;
  }): Promise<Holiday> {
    const created: Holiday = {
      id: `demo-holiday-${Date.now()}`,
      name: holiday.name,
      holidayDate: holiday.date,
      description: holiday.description,
      applicability: 'all',
      isOptional: !!holiday.isOptional,
      createdAt: new Date().toISOString(),
    };
    const list = await this.listHolidays();
    writeDemoJson('holidays', [...list, created].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate)));
    return created;
  }

  async removeHoliday(id: string): Promise<void> {
    const list = await this.listHolidays();
    writeDemoJson('holidays', list.filter(h => h.id !== id));
  }
}

export const createSettingsRepository = (): SettingsRepository => {
  if (dataSourceMode === 'supabase') return new SupabaseSettingsRepository();
  return new DemoSettingsRepository();
};
