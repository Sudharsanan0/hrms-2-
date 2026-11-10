// ============================================================
// Clixhora HRMS — Attendance Service
//
// Builds the daily attendance roster from the SAME employee records that the
// Employees page and the dashboard use, and applies the attendance policy:
//
//  • Every active employee appears in the roster.
//  • An employee with no record for the selected date is shown as "Not marked"
//    (never silently dropped, never auto-marked present or absent).
//  • Sundays (weekly off) and configured holidays are respected.
//  • One record per employee per date (unique on employee_id + attendance_date).
//  • Corrections require a reason and are written to the audit trail.
// ============================================================

import { ServiceError } from '../lib/errors';
import { todayIST } from '../lib/utils';
import type {
  AttendanceRecord,
  AttendanceSource,
  AttendanceStatus,
  Holiday,
  LeaveSettings,
} from '../types';
import { listActiveEmployees, listEmployees, getEmployeeById } from './employeeService';
import {
  createAttendanceRepository,
  type AttendanceRepository,
  type UpsertAttendanceInput,
} from './repositories/attendanceRepository';
import { createSettingsRepository, type SettingsRepository } from './repositories/settingsRepository';

// ─── Types ───────────────────────────────────────────────────

export interface AttendanceSummary {
  totalEmployees: number;
  present: number;
  halfDay: number;
  onLeave: number;
  absent: number;
  /** Active employees with no record yet on a working day. */
  pending: number;
  weeklyOff: number;
  holiday: number;
}

export interface RosterEntry {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  designationName: string;
  status: AttendanceStatus;
  /** True when a real attendance record exists for this employee + date. */
  isMarked: boolean;
  /** True when the admin still has to mark this employee. */
  isPending: boolean;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holidayName?: string;
  record?: AttendanceRecord;
  checkInAt?: string;
  checkOutAt?: string;
  source?: AttendanceSource;
  correctionReason?: string;
  notes?: string;
}

export interface AttendanceRoster {
  date: string;
  isWeeklyOff: boolean;
  holiday?: Holiday;
  entries: RosterEntry[];
  summary: AttendanceSummary;
}

export interface MarkAttendanceInput {
  employeeId: string;
  /** YYYY-MM-DD */
  date: string;
  status: AttendanceStatus;
  /** ISO timestamp */
  checkInAt?: string;
  /** ISO timestamp */
  checkOutAt?: string;
  /** Required for absent, leave and corrections. */
  reason?: string;
  notes?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: 'admin' | 'employee';
  /** True when correcting an already marked record. */
  isCorrection?: boolean;
}

// ─── Repository handles ──────────────────────────────────────

let attendanceRepository: AttendanceRepository | null = null;
let settingsRepository: SettingsRepository | null = null;

export const getAttendanceRepository = (): AttendanceRepository => {
  if (!attendanceRepository) attendanceRepository = createAttendanceRepository();
  return attendanceRepository;
};

export const getSettingsRepository = (): SettingsRepository => {
  if (!settingsRepository) settingsRepository = createSettingsRepository();
  return settingsRepository;
};

export const setAttendanceRepository = (repo: AttendanceRepository | null): void => {
  attendanceRepository = repo;
};

export const setSettingsRepository = (repo: SettingsRepository | null): void => {
  settingsRepository = repo;
};

// ─── Date helpers ────────────────────────────────────────────

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/** Weekday name for a YYYY-MM-DD string (parsed as UTC midnight). */
export const weekdayName = (date: string): string => {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return WEEKDAY_NAMES[d.getUTCDay()];
};

/**
 * Convert a local IST clock time ("09:30") on a calendar date into a UTC ISO
 * timestamp so that the stored value is unambiguous.
 */
export const istTimeToIso = (date: string, time: string): string | undefined => {
  if (!time) return undefined;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return undefined;
  const hours = String(Math.min(23, Number(match[1]))).padStart(2, '0');
  const minutes = match[2];
  const iso = new Date(`${date}T${hours}:${minutes}:00+05:30`);
  return Number.isNaN(iso.getTime()) ? undefined : iso.toISOString();
};

const minutesBetween = (from?: string, to?: string): number | undefined => {
  if (!from || !to) return undefined;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return undefined;
  return Math.round((b - a) / 60000);
};

const isFutureDate = (date: string): boolean => date > todayIST();

// ─── Roster ──────────────────────────────────────────────────

/**
 * Build the roster for a date: every active employee + their record (if any).
 */
export const getAttendanceRoster = async (date: string): Promise<AttendanceRoster> => {
  const [employees, records, settings, holidays] = await Promise.all([
    listActiveEmployees(),
    getAttendanceRepository().listForDate(date),
    getSettingsRepository().getAttendanceSettings(),
    getSettingsRepository().listHolidays(),
  ]);

  const isWeeklyOff = settings.weeklyOffDays.includes(weekdayName(date));
  const holiday = holidays.find(h => h.holidayDate === date && !h.isOptional);

  const entries: RosterEntry[] = employees.map(employee => {
    const record = records.find(r => r.employeeId === employee.id);

    const base: RosterEntry = {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.fullName,
      departmentName: employee.departmentName,
      designationName: employee.designationName,
      status: 'not_marked',
      isMarked: false,
      isPending: false,
      isWeeklyOff,
      isHoliday: !!holiday,
      holidayName: holiday?.name,
    };

    if (record) {
      return {
        ...base,
        status: record.status,
        isMarked: true,
        isPending: false,
        record,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
        source: record.source,
        correctionReason: record.correctionReason,
        notes: record.notes,
      };
    }

    if (isWeeklyOff) return { ...base, status: 'weekly_off' };
    if (holiday) return { ...base, status: 'public_holiday' };
    return { ...base, isPending: true };
  });

  return {
    date,
    isWeeklyOff,
    holiday,
    entries,
    summary: summarise(entries),
  };
};

/** Counts derived strictly from valid records for the selected date. */
export const summarise = (entries: RosterEntry[]): AttendanceSummary => {
  const summary: AttendanceSummary = {
    totalEmployees: entries.length,
    present: 0,
    halfDay: 0,
    onLeave: 0,
    absent: 0,
    pending: 0,
    weeklyOff: 0,
    holiday: 0,
  };

  entries.forEach(entry => {
    if (entry.isMarked) {
      switch (entry.status) {
        case 'present':
        case 'work_from_home':
          summary.present += 1;
          break;
        case 'half_day':
          summary.halfDay += 1;
          break;
        case 'paid_leave':
        case 'unpaid_leave':
          summary.onLeave += 1;
          break;
        case 'absent':
          summary.absent += 1;
          break;
        case 'weekly_off':
          summary.weeklyOff += 1;
          break;
        case 'public_holiday':
          summary.holiday += 1;
          break;
        default:
          break;
      }
      return;
    }
    if (entry.isWeeklyOff) summary.weeklyOff += 1;
    else if (entry.isHoliday) summary.holiday += 1;
    else summary.pending += 1;
  });

  return summary;
};

// ─── Marking ─────────────────────────────────────────────────

const STATUS_REQUIRING_REASON: AttendanceStatus[] = [
  'absent',
  'paid_leave',
  'unpaid_leave',
  'half_day',
  'work_from_home',
];

const ADMIN_ONLY_STATUSES: AttendanceStatus[] = ['absent', 'paid_leave', 'unpaid_leave', 'half_day'];

export interface MarkResult {
  record: AttendanceRecord;
  summary: AttendanceSummary;
}

/**
 * Create or update one attendance record.
 * Duplicate records for the same employee + date are impossible (unique key).
 */
export const markAttendance = async (input: MarkAttendanceInput): Promise<MarkResult> => {
  const { employeeId, date, status } = input;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ServiceError('validation', 'A valid attendance date (YYYY-MM-DD) is required.');
  }
  if (isFutureDate(date)) {
    throw new ServiceError('validation', 'Attendance cannot be marked for a future date.');
  }

  const employee = await getEmployeeById(employeeId);
  if (!employee) throw new ServiceError('not_found', 'Employee not found.');
  if (employee.employmentStatus !== 'active') {
    throw new ServiceError('validation', `${employee.fullName} is not an active employee.`);
  }

  const [settings, leaveSettings, holidays] = await Promise.all([
    getSettingsRepository().getAttendanceSettings(),
    getSettingsRepository().getLeaveSettings(),
    getSettingsRepository().listHolidays(),
  ]);

  const isWeeklyOff = settings.weeklyOffDays.includes(weekdayName(date));
  const holiday = holidays.find(h => h.holidayDate === date && !h.isOptional);

  if (isWeeklyOff && status !== 'weekly_off') {
    throw new ServiceError('validation', `${date} is a weekly off (${weekdayName(date)}) — attendance cannot be marked.`);
  }
  if (holiday && status !== 'public_holiday') {
    throw new ServiceError('validation', `${date} is a holiday (${holiday.name}) — attendance cannot be marked.`);
  }
  if (status === 'half_day' && !leaveSettings.halfDayEnabled) {
    throw new ServiceError('validation', 'Half day marking is disabled in the leave policy.');
  }
  if (ADMIN_ONLY_STATUSES.includes(status) && input.actorRole && input.actorRole !== 'admin') {
    throw new ServiceError('permission', `Only an administrator can mark "${status}".`);
  }
  // Reason is required only for corrections, not for initial admin markings
  if (input.isCorrection && !input.reason?.trim()) {
    throw new ServiceError('validation', 'A correction reason is required.');
  }

  const repository = getAttendanceRepository();
  const existing = (await repository.listForDate(date)).find(r => r.employeeId === employeeId);

  const checkInAt = input.checkInAt ?? existing?.checkInAt ?? null;
  const checkOutAt = input.checkOutAt ?? existing?.checkOutAt ?? null;

  const payload: UpsertAttendanceInput = {
    employeeId,
    attendanceDate: date,
    status,
    source: input.actorRole === 'employee' ? 'web' : 'manual_admin',
    checkInAt,
    checkOutAt,
    totalMinutes: minutesBetween(checkInAt ?? undefined, checkOutAt ?? undefined) ?? null,
    notes: input.notes ?? null,
    correctionReason: input.isCorrection ? input.reason?.trim() ?? null : existing?.correctionReason ?? null,
    createdBy: input.actorId ?? null,
    updatedBy: input.actorId ?? null,
  };

  const record = await repository.upsert(payload);

  if (input.isCorrection || existing) {
    await repository.recordAudit({
      actorUserId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      action: input.isCorrection ? 'attendance.corrected' : 'attendance.marked',
      entityType: 'attendance_record',
      entityId: record.id,
      beforeData: existing
        ? { status: existing.status, checkInAt: existing.checkInAt, checkOutAt: existing.checkOutAt }
        : null,
      afterData: { status: record.status, checkInAt: record.checkInAt, checkOutAt: record.checkOutAt },
      reason: input.reason?.trim() ?? null,
    });
  }

  const roster = await getAttendanceRoster(date);
  return { record, summary: roster.summary };
};

/**
 * Correct an existing record — a reason is mandatory and the change is
 * written to the audit trail.
 */
export const correctAttendance = async (input: MarkAttendanceInput): Promise<MarkResult> => {
  if (!input.reason?.trim()) {
    throw new ServiceError('validation', 'A correction reason is required.');
  }
  return markAttendance({ ...input, isCorrection: true });
};

// ─── Employee self service ───────────────────────────────────

export const getEmployeeAttendance = async (
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<AttendanceRecord[]> => {
  const records = await getAttendanceRepository().listForEmployee(employeeId, startDate, endDate);
  return records.sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
};

export const checkIn = async (
  employeeId: string,
  date: string = todayIST(),
  actor?: { id?: string; name?: string },
): Promise<MarkResult> => {
  const now = new Date().toISOString();
  return markAttendance({
    employeeId,
    date,
    status: 'present',
    checkInAt: now,
    actorId: actor?.id,
    actorName: actor?.name,
    actorRole: 'employee',
  });
};

export const checkOut = async (
  employeeId: string,
  date: string = todayIST(),
  actor?: { id?: string; name?: string },
): Promise<MarkResult> => {
  const existing = (await getAttendanceRepository().listForDate(date)).find(r => r.employeeId === employeeId);
  if (!existing) {
    throw new ServiceError('not_found', 'No attendance record found for today — check in first.');
  }
  const now = new Date().toISOString();
  return markAttendance({
    employeeId,
    date,
    status: existing.status === 'present' ? 'present' : existing.status,
    checkInAt: existing.checkInAt ?? now,
    checkOutAt: now,
    actorId: actor?.id,
    actorName: actor?.name,
    actorRole: 'employee',
  });
};

// ─── Helpers used by the dashboard ───────────────────────────

export const getTodaySummary = async (date: string = todayIST()): Promise<AttendanceSummary> => {
  const roster = await getAttendanceRoster(date);
  return roster.summary;
};

export { listEmployees };
export type { LeaveSettings };
