import { describe, it, expect, beforeEach } from 'vitest';
import {
  listEmployees,
  listActiveEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  getEmployeeCounts,
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
  deleteEmployee,
} from '../services/employeeService';
import { clearDemoStorage } from '../services/repositories/demoStorage';

const resetDemo = () => {
  clearDemoStorage();
};

describe('employeeService (shared data layer)', () => {
  beforeEach(() => resetDemo());

  it('returns the six demo employees from the shared source', async () => {
    const employees = await listEmployees();
    expect(employees).toHaveLength(6);
    expect(employees.map(e => e.employeeCode)).toEqual([
      'CLX-01', 'CLX-02', 'CLX-03', 'CLX-04', 'CLX-05', 'CLX-06',
    ]);
    expect(employees.find(e => e.employeeCode === 'CLX-06')?.fullName).toBe('sudharsanan muthu');
  });

  it('exposes the canonical department slug for every employee', async () => {
    const employees = await listEmployees();
    const marketing = employees.filter(e => e.departmentSlug === 'marketing');
    expect(marketing.map(e => e.employeeCode).sort()).toEqual(['CLX-01', 'CLX-06']);
    expect(employees.every(e => !!e.departmentName && !!e.designationName)).toBe(true);
  });

  it('derives the counts from the same records the pages render', async () => {
    const employees = await listEmployees();
    const counts = await getEmployeeCounts();
    expect(counts.total).toBe(employees.length);
    expect(counts.active).toBe(employees.filter(e => e.employmentStatus === 'active').length);
    expect(counts.inactive).toBe(counts.total - counts.active);
  });

  it('looks an employee up by id and by work email', async () => {
    const byId = await getEmployeeById('demo-emp-06');
    const byEmail = await getEmployeeByEmail('sudharsanan.muthu.test@example.com');
    expect(byId?.employeeCode).toBe('CLX-06');
    expect(byEmail?.id).toBe(byId?.id);
  });

  it('creates an employee and assigns the next free code', async () => {
    const result = await createEmployee({
      fullName: 'Test Newcomer',
      workEmail: 'newcomer.test@example.com',
      departmentId: 'marketing',
      designationId: 'SEO Specialist',
      dateJoined: '2026-01-15',
      employmentType: 'full_time',
    });

    expect(result.success).toBe(true);
    expect(result.employee?.employeeCode).toBe('CLX-07');

    const employees = await listEmployees();
    expect(employees).toHaveLength(7);
  });

  it('refuses a duplicate work email', async () => {
    const result = await createEmployee({
      fullName: 'Duplicate',
      workEmail: 'arun.kumar.test@example.com',
      departmentId: 'sales',
      designationId: 'Sales Executive',
      dateJoined: '2026-01-15',
      employmentType: 'full_time',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });

  it('updates an employee and keeps the department name in sync', async () => {
    const updated = await updateEmployee('demo-emp-01', {
      fullName: 'Arun Kumar Updated',
      departmentId: 'software',
      designationId: 'Backend Developer',
    });

    expect(updated.fullName).toBe('Arun Kumar Updated');
    expect(updated.departmentName).toBe('Software Team');
    expect(updated.designationName).toBe('Backend Developer');
    expect(updated.departmentSlug).toBe('software');
  });

  it('deactivates an employee and removes them from the active list', async () => {
    await setEmployeeStatus('demo-emp-02', 'inactive');
    const active = await listActiveEmployees();
    expect(active.map(e => e.employeeCode)).not.toContain('CLX-02');
    expect((await getEmployeeCounts()).inactive).toBe(1);
  });

  it('deletes an employee', async () => {
    await deleteEmployee('demo-emp-03');
    const employees = await listEmployees();
    expect(employees.map(e => e.employeeCode)).not.toContain('CLX-03');
    expect(employees).toHaveLength(5);
  });

  it('persists the contact and emergency details an employee edits on their profile', async () => {
    const updated = await updateEmployee('demo-emp-01', {
      contactNumber: '+91 90000 00000',
      address: '12 MG Road, Bengaluru',
      emergencyContactName: 'Kumar',
      emergencyContactPhone: '+91 90000 11111',
    });

    expect(updated.contactNumber).toBe('+91 90000 00000');
    expect(updated.address).toBe('12 MG Road, Bengaluru');
    expect(updated.emergencyContactName).toBe('Kumar');
    expect(updated.emergencyContactPhone).toBe('+91 90000 11111');

    // The change is persisted, not just returned.
    const reloaded = await getEmployeeById('demo-emp-01');
    expect(reloaded?.emergencyContactName).toBe('Kumar');
  });
});
