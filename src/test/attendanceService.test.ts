import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAttendanceRoster,
  markAttendance,
  correctAttendance,
  weekdayName,
  istTimeToIso,
  summarise,
} from '../services/attendanceService';
import { setEmployeeStatus } from '../services/employeeService';
import { clearDemoStorage } from '../services/repositories/demoStorage';
import { ServiceError } from '../lib/errors';

// A normal working day (Monday) — not a Sunday.
const WORKING_DAY = '2026-01-05';
const SUNDAY = '2026-01-04';

const resetDemo = () => {
  clearDemoStorage();
};

describe('attendanceService — roster', () => {
  beforeEach(() => resetDemo());

  it('lists every active employee, even without a record', async () => {
    const roster = await getAttendanceRoster(WORKING_DAY);
    expect(roster.entries).toHaveLength(6);
    expect(roster.summary.totalEmployees).toBe(6);
    expect(roster.summary.pending).toBe(6);
    expect(roster.entries.every(e => e.status === 'not_marked')).toBe(true);
  });

  it('marks the weekly off on Sundays instead of pending', async () => {
    const roster = await getAttendanceRoster(SUNDAY);
    expect(roster.isWeeklyOff).toBe(true);
    expect(roster.summary.weeklyOff).toBe(6);
    expect(roster.summary.pending).toBe(0);
    expect(roster.entries.every(e => e.status === 'weekly_off')).toBe(true);
  });

  it('excludes deactivated employees from the roster', async () => {
    await setEmployeeStatus('demo-emp-02', 'inactive');
    const roster = await getAttendanceRoster(WORKING_DAY);
    expect(roster.entries).toHaveLength(5);
    expect(roster.entries.find(e => e.employeeCode === 'CLX-02')).toBeUndefined();
  });
});

describe('attendanceService — marking', () => {
  beforeEach(() => resetDemo());

  it('marks an employee present and updates the summary', async () => {
    const result = await markAttendance({
      employeeId: 'demo-emp-01',
      date: WORKING_DAY,
      status: 'present',
      checkInAt: istTimeToIso(WORKING_DAY, '09:30'),
      checkOutAt: istTimeToIso(WORKING_DAY, '18:30'),
      actorRole: 'admin',
    });

    expect(result.record.status).toBe('present');
    expect(result.summary.present).toBe(1);
    expect(result.summary.pending).toBe(5);
  });

  it('keeps exactly one record per employee and date', async () => {
    await markAttendance({
      employeeId: 'demo-emp-01',
      date: WORKING_DAY,
      status: 'present',
      checkInAt: istTimeToIso(WORKING_DAY, '09:30'),
      actorRole: 'admin',
    });
    await markAttendance({
      employeeId: 'demo-emp-01',
      date: WORKING_DAY,
      status: 'work_from_home',
      checkInAt: istTimeToIso(WORKING_DAY, '10:00'),
      reason: 'Working from home as approved',
      actorRole: 'admin',
    });

    const roster = await getAttendanceRoster(WORKING_DAY);
    const entry = roster.entries.find(e => e.employeeId === 'demo-emp-01');
    expect(roster.entries.filter(e => e.employeeId === 'demo-emp-01')).toHaveLength(1);
    expect(entry?.status).toBe('work_from_home');
    expect(roster.summary.present).toBe(1);
  });

  it('requires a reason for absent and leave', async () => {
    await expect(
      markAttendance({ employeeId: 'demo-emp-01', date: WORKING_DAY, status: 'absent', actorRole: 'admin' }),
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(
      markAttendance({ employeeId: 'demo-emp-01', date: WORKING_DAY, status: 'absent', actorRole: 'admin' }),
    ).rejects.toThrow(/reason is required/i);
  });

  it('refuses to mark a weekly off', async () => {
    await expect(
      markAttendance({
        employeeId: 'demo-emp-01',
        date: SUNDAY,
        status: 'present',
        checkInAt: istTimeToIso(SUNDAY, '09:30'),
        actorRole: 'admin',
      }),
    ).rejects.toThrow(/weekly off/i);
  });

  it('refuses to mark a future date', async () => {
    await expect(
      markAttendance({
        employeeId: 'demo-emp-01',
        date: '2099-01-01',
        status: 'present',
        checkInAt: '2099-01-01T04:00:00.000Z',
        actorRole: 'admin',
      }),
    ).rejects.toThrow(/future date/i);
  });

  it('rejects admin-only statuses for employees', async () => {
    await expect(
      markAttendance({
        employeeId: 'demo-emp-01',
        date: WORKING_DAY,
        status: 'absent',
        reason: 'Not present',
        actorRole: 'employee',
      }),
    ).rejects.toThrow(/administrator/i);
  });

  it('requires a reason for a correction and keeps the audit trail', async () => {
    await markAttendance({
      employeeId: 'demo-emp-01',
      date: WORKING_DAY,
      status: 'present',
      checkInAt: istTimeToIso(WORKING_DAY, '09:30'),
      actorRole: 'admin',
    });

    await expect(
      correctAttendance({
        employeeId: 'demo-emp-01',
        date: WORKING_DAY,
        status: 'present',
        checkInAt: istTimeToIso(WORKING_DAY, '10:15'),
        actorRole: 'admin',
        isCorrection: true,
      }),
    ).rejects.toThrow(/correction reason is required/i);

    const corrected = await correctAttendance({
      employeeId: 'demo-emp-01',
      date: WORKING_DAY,
      status: 'present',
      checkInAt: istTimeToIso(WORKING_DAY, '10:15'),
      reason: 'Badge did not work at the gate',
      actorRole: 'admin',
      isCorrection: true,
    });

    expect(corrected.record.correctionReason).toBe('Badge did not work at the gate');
  });
});

describe('attendanceService — helpers', () => {
  it('knows the weekday of a date', () => {
    expect(weekdayName('2026-01-04')).toBe('Sunday');
    expect(weekdayName('2026-01-05')).toBe('Monday');
  });

  it('converts an IST clock time into a UTC timestamp', () => {
    const iso = istTimeToIso('2026-01-05', '09:30');
    expect(iso).toBe('2026-01-05T04:00:00.000Z');
  });

  it('summarises entries from the records that exist', () => {
    const summary = summarise([
      { status: 'present', isMarked: true, isPending: false, isWeeklyOff: false, isHoliday: false } as any,
      { status: 'absent', isMarked: true, isPending: false, isWeeklyOff: false, isHoliday: false } as any,
      { status: 'paid_leave', isMarked: true, isPending: false, isWeeklyOff: false, isHoliday: false } as any,
      { status: 'not_marked', isMarked: false, isPending: true, isWeeklyOff: false, isHoliday: false } as any,
    ]);

    expect(summary.present).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.onLeave).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.totalEmployees).toBe(4);
  });
});
