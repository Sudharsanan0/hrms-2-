import { describe, it, expect, beforeEach } from 'vitest';
import { getAdminDashboardMetrics, sortByRecentlyJoined } from '../services/dashboardService';
import { markAttendance } from '../services/attendanceService';
import { setEmployeeStatus } from '../services/employeeService';
import { clearDemoStorage } from '../services/repositories/demoStorage';
import { istTimeToIso } from '../services/attendanceService';

const WORKING_DAY = '2026-01-05';

describe('dashboardService', () => {
  beforeEach(() => clearDemoStorage());

  it('derives the employee counts from the shared employee data', async () => {
    const metrics = await getAdminDashboardMetrics(WORKING_DAY);
    expect(metrics.totalEmployees).toBe(6);
    expect(metrics.totalActiveEmployees).toBe(6);
  });

  it('counts a deactivated employee as inactive, not as missing data', async () => {
    await setEmployeeStatus('demo-emp-05', 'inactive');
    const metrics = await getAdminDashboardMetrics(WORKING_DAY);
    expect(metrics.totalEmployees).toBe(6);
    expect(metrics.totalActiveEmployees).toBe(5);
  });

  it('reflects the marked attendance instead of hardcoded zeros', async () => {
    await markAttendance({
      employeeId: 'demo-emp-01',
      date: WORKING_DAY,
      status: 'present',
      checkInAt: istTimeToIso(WORKING_DAY, '09:30'),
      actorRole: 'admin',
    });

    const metrics = await getAdminDashboardMetrics(WORKING_DAY);
    expect(metrics.presentToday).toBe(1);
    expect(metrics.pendingToday).toBe(5);
  });

  it('lists the most recently joined employees first', async () => {
    const metrics = await getAdminDashboardMetrics(WORKING_DAY);
    expect(metrics.recentlyJoined[0].employeeCode).toBe('CLX-06');
    expect(metrics.recentlyJoined).toHaveLength(5);
  });

  it('sorts by joining date and then by creation date', () => {
    const sorted = sortByRecentlyJoined([
      { id: 'a', employeeCode: 'CLX-01', fullName: 'A', workEmail: 'a@x.com', departmentName: 'D', designationName: 'G', dateJoined: '2025-01-01', employmentType: 'full_time', employmentStatus: 'active', createdAt: '2025-01-01', updatedAt: '' },
      { id: 'b', employeeCode: 'CLX-02', fullName: 'B', workEmail: 'b@x.com', departmentName: 'D', designationName: 'G', dateJoined: '2025-06-01', employmentType: 'full_time', employmentStatus: 'active', createdAt: '2025-06-01', updatedAt: '' },
    ] as any);
    expect(sorted.map(e => e.employeeCode)).toEqual(['CLX-02', 'CLX-01']);
  });
});
