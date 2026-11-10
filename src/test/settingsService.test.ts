import { describe, it, expect, beforeEach } from 'vitest';
import {
  addHoliday,
  getAppSettings,
  removeHoliday,
  saveAttendanceSettings,
  saveCompanySettings,
  saveLeaveSettings,
  savePayrollSettings,
} from '../services/settingsService';
import { clearDemoStorage } from '../services/repositories/demoStorage';

describe('settingsService (shared data layer)', () => {
  beforeEach(() => clearDemoStorage());

  it('reads the company, policy and holiday calendar in one pass', async () => {
    const settings = await getAppSettings();

    expect(settings.company.name).toBeTruthy();
    expect(settings.attendance.weeklyOffDays).toContain('Sunday');
    expect(settings.leave.monthlyPaidLeaveEntitlement).toBeGreaterThan(0);
    expect(settings.payroll.payslipPublicationDay).toBeGreaterThan(0);
    expect(settings.holidays.length).toBeGreaterThan(0);
  });

  it('persists the attendance policy', async () => {
    await saveAttendanceSettings({
      weeklyOffDays: ['Saturday', 'Sunday'],
      gracePeriodMinutes: 20,
      halfDayThresholdMinutes: 240,
      minimumFullDayMinutes: 360,
    });

    const settings = await getAppSettings();
    expect(settings.attendance.weeklyOffDays).toEqual(['Saturday', 'Sunday']);
    expect(settings.attendance.gracePeriodMinutes).toBe(20);
  });

  it('persists the leave, payroll and company settings', async () => {
    await saveLeaveSettings({
      monthlyPaidLeaveEntitlement: 2,
      carryForwardEnabled: true,
      halfDayEnabled: false,
    });
    await savePayrollSettings({
      payslipPublicationDay: 7,
      payrollCutoffDay: 26,
      standardWorkingHours: 8,
      lopBasis: 'working_days',
      roundingPolicy: 'floor',
    });
    await saveCompanySettings({
      name: 'Clixhora Media Pvt Ltd',
      email: 'people@clixhora.com',
      address: 'Banaswadi, Bengaluru',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    });

    const settings = await getAppSettings();
    expect(settings.leave.monthlyPaidLeaveEntitlement).toBe(2);
    expect(settings.leave.carryForwardEnabled).toBe(true);
    expect(settings.payroll.payslipPublicationDay).toBe(7);
    expect(settings.payroll.lopBasis).toBe('working_days');
    expect(settings.company.name).toBe('Clixhora Media Pvt Ltd');
  });

  it('adds and removes holidays', async () => {
    const before = await getAppSettings();
    const created = await addHoliday({ name: 'Diwali', date: '2026-11-08' });

    const afterAdd = await getAppSettings();
    expect(afterAdd.holidays.length).toBe(before.holidays.length + 1);
    expect(afterAdd.holidays.map(h => h.name)).toContain('Diwali');

    await removeHoliday(created.id);
    const afterRemove = await getAppSettings();
    expect(afterRemove.holidays.length).toBe(before.holidays.length);
  });
});
