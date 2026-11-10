// ============================================================
// Clixhora HRMS — Employee Service (shared data layer)
//
// THE single entry point for employee data. Every module — Employees page,
// Admin Dashboard, Attendance Management, Payslips, Employee profile and the
// employee dashboard — reads and writes employees through this service.
//
//  • Supabase is the source of truth whenever it is configured.
//  • Otherwise a clearly-labelled development-only demo adapter is used.
//
// Errors are thrown (never swallowed) so a failed database request can never
// be displayed as a successful "0 employees".
// ============================================================

import { ServiceError } from '../lib/errors';
import { departmentName as canonicalDepartmentName, departmentSlug as canonicalDepartmentSlug } from '../lib/org';
import { dataSourceMode, isDemoMode as isDemoModeFlag } from '../lib/supabase';
import type { Employee, EmploymentStatus, EmploymentType } from '../types';
import {
  createEmployeeRepository,
  type CreateEmployeeInput,
  type EmployeeRepository,
  type UpdateEmployeeInput,
} from './repositories/employeeRepository';
import { orgService } from './orgService';

// ─── Public payload shapes (unchanged for the existing pages) ──

export interface CreateEmployeePayload {
  fullName: string;
  workEmail: string;
  /** Optional explicit employee code — used by the controlled import workflow. */
  employeeCode?: string;
  contactNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  /** Department slug (e.g. "marketing") or database id. */
  departmentId: string;
  /** Designation name (e.g. "Meta Ads Specialist") or database id. */
  designationId: string;
  dateJoined: string;
  employmentType: string;
  workLocation?: string;
  basicSalary?: string;
  hra?: string;
  otherAllowances?: string;
  paymentMode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  pfApplicable?: boolean;
  esiApplicable?: boolean;
  isTestData?: boolean;
}

export interface CreateEmployeeResult {
  success: boolean;
  employee?: Employee;
  error?: string;
  invitationStatus?: 'skipped' | 'sent' | 'failed';
}

export interface EmployeeCounts {
  total: number;
  active: number;
  inactive: number;
}

// ─── Repository handle ────────────────────────────────────────
// Exposed so that other services (attendance, dashboard) reuse the exact
// same instance and therefore the exact same data source.

let repository: EmployeeRepository | null = null;

export const getEmployeeRepository = (): EmployeeRepository => {
  if (!repository) repository = createEmployeeRepository();
  return repository;
};

/** Allows tests (and future implementations) to inject a repository. */
export const setEmployeeRepository = (repo: EmployeeRepository | null): void => {
  repository = repo;
};

const withSlug = (employee: Employee): Employee => ({
  ...employee,
  departmentSlug: canonicalDepartmentSlug(employee.departmentName || employee.departmentId),
});

// ─── Queries ─────────────────────────────────────────────────

export const listEmployees = async (): Promise<Employee[]> => {
  const employees = await getEmployeeRepository().list();
  return employees.map(withSlug);
};

export const listActiveEmployees = async (): Promise<Employee[]> => {
  const employees = await listEmployees();
  return employees.filter(e => e.employmentStatus === 'active');
};

export const getEmployeeById = async (id: string): Promise<Employee | null> => {
  const employee = await getEmployeeRepository().getById(id);
  return employee ? withSlug(employee) : null;
};

export const getEmployeeByAuthUserId = async (authUserId: string): Promise<Employee | null> => {
  const employee = await getEmployeeRepository().getByAuthUserId(authUserId);
  return employee ? withSlug(employee) : null;
};

export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  const employee = await getEmployeeRepository().getByEmail(email);
  return employee ? withSlug(employee) : null;
};

/**
 * Resolve the employee record that belongs to a signed-in user.
 *
 * Order: auth_user_id → work email → (demo mode only) the first active
 * employee, so that the demo login always has a working employee record.
 */
export const resolveEmployeeForLogin = async (
  authUserId?: string,
  email?: string,
): Promise<Employee | null> => {
  if (authUserId) {
    const byAuth = await getEmployeeByAuthUserId(authUserId);
    if (byAuth) return byAuth;
  }
  if (email) {
    const byEmail = await getEmployeeByEmail(email);
    if (byEmail) return byEmail;
  }
  if (isDemoModeFlag) {
    const employees = await listActiveEmployees();
    return employees[0] ?? null;
  }
  return null;
};

/**
 * Counts derived from the same source that feeds every page.
 * Active = employment_status 'active'.
 */
export const getEmployeeCounts = async (): Promise<EmployeeCounts> => {
  const employees = await listEmployees();
  const active = employees.filter(e => e.employmentStatus === 'active');
  return {
    total: employees.length,
    active: active.length,
    inactive: employees.length - active.length,
  };
};

// ─── Mutations ───────────────────────────────────────────────

export const createEmployee = async (payload: CreateEmployeePayload): Promise<CreateEmployeeResult> => {
  try {
    const repo = getEmployeeRepository();

    const email = payload.workEmail.trim().toLowerCase();
    const duplicate = await repo.getByEmail(email);
    if (duplicate) {
      return {
        success: false,
        error: `An employee with email ${email} already exists (${duplicate.employeeCode}).`,
      };
    }

    const department = await orgService.resolveDepartment(payload.departmentId);
    const designation = await orgService.resolveDesignation(payload.designationId, payload.departmentId);

    const input: CreateEmployeeInput = {
      fullName: payload.fullName.trim(),
      workEmail: email,
      employeeCode: payload.employeeCode?.trim() || undefined,
      contactNumber: payload.contactNumber?.trim() || undefined,
      dateOfBirth: payload.dateOfBirth || undefined,
      gender: payload.gender || undefined,
      address: payload.address?.trim() || undefined,
      departmentId: department.id,
      departmentName: department.name,
      designationId: designation.id,
      designationName: designation.name,
      dateJoined: payload.dateJoined,
      employmentType: (payload.employmentType || 'full_time') as EmploymentType,
      employmentStatus: 'active',
      workLocation: payload.workLocation?.trim() || undefined,
      invitationStatus: 'not_invited',
    };

    if (payload.basicSalary) {
      input.salary = {
        effectiveFrom: payload.dateJoined,
        basicSalary: Number(payload.basicSalary),
        hra: Number(payload.hra || 0),
        otherAllowances: Number(payload.otherAllowances || 0),
        pfApplicable: !!payload.pfApplicable,
        esiApplicable: !!payload.esiApplicable,
        paymentMode: payload.paymentMode,
      };
    }

    if (payload.bankName || payload.accountNumber) {
      input.bank = {
        bankName: payload.bankName?.trim() || undefined,
        accountNumber: payload.accountNumber?.trim() || undefined,
        ifscCode: payload.ifscCode?.trim() || undefined,
        paymentMode: payload.paymentMode,
      };
    }

    if (payload.panNumber || payload.pfApplicable || payload.esiApplicable) {
      input.statutory = {
        panNumber: payload.panNumber?.trim() || undefined,
        pfApplicable: !!payload.pfApplicable,
        esiApplicable: !!payload.esiApplicable,
      };
    }

    const employee = await repo.create(input);
    return {
      success: true,
      employee: withSlug(employee),
      invitationStatus: 'skipped',
    };
  } catch (err) {
    const message = err instanceof ServiceError ? err.message : (err as Error)?.message || 'Unexpected error';
    return { success: false, error: message };
  }
};

export const updateEmployee = async (
  id: string,
  patch: {
    fullName?: string;
    contactNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    departmentId?: string;
    designationId?: string;
    dateJoined?: string;
    employmentType?: EmploymentType;
    employmentStatus?: EmploymentStatus;
    workLocation?: string;
  },
): Promise<Employee> => {
  const repo = getEmployeeRepository();
  const update: UpdateEmployeeInput = { ...patch };

  if (patch.departmentId) {
    const department = await orgService.resolveDepartment(patch.departmentId);
    update.departmentId = department.id;
    update.departmentName = department.name;
  }
  if (patch.designationId) {
    const designation = await orgService.resolveDesignation(patch.designationId, patch.departmentId);
    update.designationId = designation.id;
    update.designationName = designation.name;
  }

  const employee = await repo.update(id, update);
  return withSlug(employee);
};

export const setEmployeeStatus = async (id: string, status: EmploymentStatus): Promise<Employee> => {
  const employee = await getEmployeeRepository().update(id, { employmentStatus: status });
  return withSlug(employee);
};

export const activateEmployee = (id: string) => setEmployeeStatus(id, 'active');
export const deactivateEmployee = (id: string) => setEmployeeStatus(id, 'inactive');

export const deleteEmployee = async (id: string): Promise<void> => {
  await getEmployeeRepository().remove(id);
};

// ─── Public facade (kept for backwards compatibility) ─────────

export const employeeService = {
  getAll: listEmployees,
  getActive: listActiveEmployees,
  getById: getEmployeeById,
  getByAuthUserId: getEmployeeByAuthUserId,
  getByEmail: getEmployeeByEmail,
  getCounts: getEmployeeCounts,
  create: createEmployee,
  update: updateEmployee,
  setStatus: setEmployeeStatus,
  activate: activateEmployee,
  deactivate: deactivateEmployee,
  delete: deleteEmployee,
  isDemoMode: (): boolean => isDemoModeFlag,
  get mode(): 'supabase' | 'demo' | 'unconfigured' {
    return dataSourceMode;
  },
};

export { canonicalDepartmentName };
