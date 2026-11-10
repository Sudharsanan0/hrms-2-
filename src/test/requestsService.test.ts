import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLeaveRequest,
  listLeaveRequests,
  updateLeaveRequestStatus,
} from '../services/leaveService';
import { createCorrectionRequest, listCorrectionRequests, reviewCorrectionRequest } from '../services/correctionService';
import { clearDemoStorage } from '../services/repositories/demoStorage';

describe('leave requests (shared data layer)', () => {
  beforeEach(() => clearDemoStorage());

  it('creates a pending request and lists it for the employee', async () => {
    const created = await createLeaveRequest({
      employeeId: 'demo-emp-01',
      leaveType: 'paid',
      startDate: '2026-02-02',
      endDate: '2026-02-03',
      duration: 2,
      reason: 'Family function.',
    });

    expect(created.status).toBe('pending');

    const forEmployee = await listLeaveRequests({ employeeId: 'demo-emp-01' });
    expect(forEmployee.map(r => r.id)).toContain(created.id);
  });

  it('lets an admin approve or reject a request', async () => {
    const created = await createLeaveRequest({
      employeeId: 'demo-emp-01',
      leaveType: 'paid',
      startDate: '2026-02-10',
      endDate: '2026-02-10',
      duration: 1,
      reason: 'Medical appointment.',
    });

    const approved = await updateLeaveRequestStatus(created.id, 'approved', 'Admin', 'Approved');
    expect(approved.status).toBe('approved');
    expect(approved.reviewedBy).toBe('Admin');

    const pending = await listLeaveRequests({ status: 'pending' });
    expect(pending.map(r => r.id)).not.toContain(created.id);
  });
});

describe('correction requests (shared data layer)', () => {
  beforeEach(() => clearDemoStorage());

  it('creates a pending correction request', async () => {
    const created = await createCorrectionRequest({
      employeeId: 'demo-emp-01',
      attendanceDate: '2026-02-04',
      requestedCheckIn: '09:30',
      reason: 'Badge did not register.',
    });

    expect(created.status).toBe('pending');
    const all = await listCorrectionRequests();
    expect(all.map(r => r.id)).toContain(created.id);
  });

  it('lets an admin review a correction request', async () => {
    const created = await createCorrectionRequest({
      employeeId: 'demo-emp-01',
      attendanceDate: '2026-02-05',
      requestedCheckOut: '18:30',
      reason: 'Left late due to a client call.',
    });

    const reviewed = await reviewCorrectionRequest(created.id, 'approved', 'Admin');
    expect(reviewed.status).toBe('approved');

    const pending = await listCorrectionRequests({ status: 'pending' });
    expect(pending.map(r => r.id)).not.toContain(created.id);
  });
});
