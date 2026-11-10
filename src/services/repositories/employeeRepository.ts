// ============================================================
// Clixhora HRMS — Employee repository
//
// ONE data source for employee records.
//   • SupabaseEmployeeRepository : the real, persistent `employees` table
//   • DemoEmployeeRepository     : clearly-labelled development fixtures
//
// Pages never talk to Supabase directly — they always go through
// `employeeService` (see services/employeeService.ts) which delegates here.
// ============================================================

import { ServiceError } from '../../lib/errors';
import { departmentName as resolveDepartmentName, designationName as resolveDesignationName } from '../../lib/org';
import { dataSourceMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { Employee, EmploymentStatus, EmploymentType } from '../../types';
import { DEMO_EMPLOYEES } from './demoData';
import { readDemoJson, writeDemoJson } from './demoStorage';

export type RepositoryMode = 'supabase' | 'demo';

export interface EmployeeSalaryInput {
  effectiveFrom: string;
  basicSalary: number;
  hra?: number;
  otherAllowances?: number;
  pfApplicable?: boolean;
  esiApplicable?: boolean;
  paymentMode?: string;
}

export interface EmployeeBankInput {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paymentMode?: string;
}

export interface EmployeeStatutoryInput {
  panNumber?: string;
  pfApplicable?: boolean;
  esiApplicable?: boolean;
}

export interface CreateEmployeeInput {
  fullName: string;
  workEmail: string;
  /** Optional explicit code (used by the controlled import workflow). */
  employeeCode?: string;
  contactNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  /** Department id as stored in the database (uuid) or slug (demo). */
  departmentId: string;
  /** Canonical department display name. */
  departmentName: string;
  designationId: string;
  designationName: string;
  dateJoined: string;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
  workLocation?: string;
  reportingManagerId?: string;
  invitationStatus?: Employee['invitationStatus'];
  salary?: EmployeeSalaryInput;
  bank?: EmployeeBankInput;
  statutory?: EmployeeStatutoryInput;
}

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, 'workEmail'>> & {
  employmentStatus?: EmploymentStatus;
};

export interface EmployeeRepository {
  readonly mode: RepositoryMode;
  list(): Promise<Employee[]>;
  getById(id: string): Promise<Employee | null>;
  getByAuthUserId(authUserId: string): Promise<Employee | null>;
  getByEmail(email: string): Promise<Employee | null>;
  create(input: CreateEmployeeInput): Promise<Employee>;
  update(id: string, patch: UpdateEmployeeInput): Promise<Employee>;
  remove(id: string): Promise<void>;
  nextEmployeeCode(): Promise<string>;
}

// ─── Shared helpers ─────────────────────────────────────────

const fromPostgrestError = (error: any, context: string): ServiceError => {
  const message: string = error?.message || 'Unknown database error';
  const code = String(error?.code || '');

  if (code === '42501' || /row-level security|permission denied|not authorized/i.test(message)) {
    return new ServiceError(
      'permission',
      `Supabase denied the request (${context}). Your user is not allowed to read or write this data — check the RLS policies. ${message}`,
      error,
    );
  }
  if (code === '42P01' || /does not exist|schema cache/i.test(message)) {
    return new ServiceError(
      'validation',
      `The database is missing a table used by the app (${context}). Run the migrations in supabase/migrations. ${message}`,
      error,
    );
  }
  if (code === '23505' || /duplicate key|already exists/i.test(message)) {
    return new ServiceError('conflict', message, error);
  }
  if (code === '23503' || /foreign key/i.test(message)) {
    return new ServiceError('validation', `Related record is missing (${context}). ${message}`, error);
  }
  if (code === '23502' || /not-null/i.test(message)) {
    return new ServiceError('validation', `A required field is missing (${context}). ${message}`, error);
  }
  if (/failed to fetch|network|timeout|ECONNREFUSED/i.test(message)) {
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

const asString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const s = String(value);
  return s.length ? s : undefined;
};

export const sortByCode = (employees: Employee[]): Employee[] =>
  [...employees].sort((a, b) => a.employeeCode.localeCompare(b.employeeCode, undefined, { numeric: true }));

export const nextCodeFrom = (employees: Employee[]): string => {
  const max = employees.reduce((acc, e) => {
    const m = e.employeeCode?.match(/^CLX-(\d+)$/);
    return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
  }, 0);
  return `CLX-${String(max + 1).padStart(2, '0')}`;
};

// ─── Supabase implementation ─────────────────────────────────

interface OrgLookup {
  departments: Map<string, string>;
  designations: Map<string, string>;
}

export class SupabaseEmployeeRepository implements EmployeeRepository {
  readonly mode: RepositoryMode = 'supabase';

  /** Loads departments + designations so names are always consistent. */
  private async loadLookups(): Promise<OrgLookup> {
    const departments = new Map<string, string>();
    const designations = new Map<string, string>();

    const deptResult = await supabase.from('departments' as any).select('id, name');
    if (!deptResult.error) {
      (deptResult.data ?? []).forEach((d: any) => {
        if (d?.id && d?.name) departments.set(String(d.id), String(d.name));
      });
    }

    const desigResult = await supabase.from('designations' as any).select('id, name');
    if (!desigResult.error) {
      (desigResult.data ?? []).forEach((d: any) => {
        if (d?.id && d?.name) designations.set(String(d.id), String(d.name));
      });
    }

    return { departments, designations };
  }

  private mapRow(row: any, lookups: OrgLookup): Employee {
    const departmentId = asString(row.department_id ?? row.departmentId);
    const designationId = asString(row.designation_id ?? row.designationId);

    const deptName =
      (departmentId && lookups.departments.get(departmentId)) ||
      asString(row.department_name) ||
      resolveDepartmentName(departmentId);

    const desigName =
      (designationId && lookups.designations.get(designationId)) ||
      asString(row.designation_name) ||
      resolveDesignationName(designationId);

    return {
      id: String(row.id),
      employeeCode: asString(row.employee_code) ?? '',
      authUserId: asString(row.auth_user_id),
      fullName: asString(row.full_name) ?? '',
      workEmail: asString(row.work_email) ?? '',
      personalEmail: asString(row.personal_email),
      contactNumber: asString(row.contact_number),
      dateOfBirth: asString(row.date_of_birth),
      gender: asString(row.gender),
      address: asString(row.address),
      emergencyContactName: asString(row.emergency_contact_name ?? row.emergencyContactName),
      emergencyContactPhone: asString(row.emergency_contact_phone ?? row.emergencyContactPhone),
      departmentId,
      departmentName: deptName,
      designationId,
      designationName: desigName,
      dateJoined: asString(row.date_joined) ?? asString(row.created_at) ?? '',
      employmentType: (asString(row.employment_type) ?? 'full_time') as EmploymentType,
      employmentStatus: (asString(row.employment_status) ?? 'active') as EmploymentStatus,
      workLocation: asString(row.work_location),
      reportingManagerId: asString(row.reporting_manager_id),
      invitationStatus: (asString(row.invitation_status) ?? 'not_invited') as Employee['invitationStatus'],
      createdAt: asString(row.created_at) ?? '',
      updatedAt: asString(row.updated_at) ?? asString(row.created_at) ?? '',
    };
  }

  async list(): Promise<Employee[]> {
    assertConfigured();
    const { data, error } = await supabase.from('employees' as any).select('*');
    if (error) throw fromPostgrestError(error, 'loading employees');
    const lookups = await this.loadLookups();
    return sortByCode((data ?? []).map((row: any) => this.mapRow(row, lookups)));
  }

  private async fetchOne(predicate: (qb: any) => any): Promise<Employee | null> {
    assertConfigured();
    const { data, error } = await predicate(supabase.from('employees' as any).select('*'));
    if (error) throw fromPostgrestError(error, 'loading employee');
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    const lookups = await this.loadLookups();
    return this.mapRow(row, lookups);
  }

  getById(id: string): Promise<Employee | null> {
    return this.fetchOne(qb => qb.eq('id', id).limit(1));
  }

  getByAuthUserId(authUserId: string): Promise<Employee | null> {
    return this.fetchOne(qb => qb.eq('auth_user_id', authUserId).limit(1));
  }

  getByEmail(email: string): Promise<Employee | null> {
    return this.fetchOne(qb => qb.eq('work_email', email.toLowerCase()).limit(1));
  }

  async nextEmployeeCode(): Promise<string> {
    const employees = await this.list();
    return nextCodeFrom(employees);
  }

  async create(input: CreateEmployeeInput): Promise<Employee> {
    assertConfigured();

    const existing = await this.getByEmail(input.workEmail);
    if (existing) {
      throw new ServiceError(
        'conflict',
        `An employee with email ${input.workEmail} already exists (${existing.employeeCode}).`,
      );
    }

    let employeeCode = input.employeeCode;
    if (employeeCode) {
      const clash = (await this.list()).find(e => e.employeeCode === employeeCode);
      if (clash) {
        throw new ServiceError(
          'conflict',
          `Employee code ${employeeCode} is already used by ${clash.fullName}.`,
        );
      }
    } else {
      employeeCode = await this.nextEmployeeCode();
    }
    const now = new Date().toISOString();

    const payload = {
      employee_code: employeeCode,
      full_name: input.fullName,
      work_email: input.workEmail.toLowerCase(),
      contact_number: input.contactNumber ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      address: input.address ?? null,
      emergency_contact_name: input.emergencyContactName ?? null,
      emergency_contact_phone: input.emergencyContactPhone ?? null,
      department_id: input.departmentId || null,
      designation_id: input.designationId || null,
      date_joined: input.dateJoined,
      employment_type: input.employmentType ?? 'full_time',
      employment_status: input.employmentStatus ?? 'active',
      work_location: input.workLocation ?? null,
      reporting_manager_id: input.reportingManagerId ?? null,
      invitation_status: input.invitationStatus ?? 'not_invited',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase.from('employees' as any).insert(payload).select('*').single();
    if (error) throw fromPostgrestError(error, 'creating employee');

    const row = Array.isArray(data) ? data[0] : data;

    // Optional related records — a failure here must not undo the employee.
    if (input.salary) {
      const gross =
        Number(input.salary.basicSalary || 0) +
        Number(input.salary.hra || 0) +
        Number(input.salary.otherAllowances || 0);
      const { error: salaryError } = await supabase.from('employee_salaries' as any).insert({
        employee_id: row.id,
        effective_from: input.salary.effectiveFrom,
        basic_salary: Number(input.salary.basicSalary || 0),
        hra: Number(input.salary.hra || 0),
        other_allowances: Number(input.salary.otherAllowances || 0),
        gross_salary: gross,
        pf_applicable: !!input.salary.pfApplicable,
        esi_applicable: !!input.salary.esiApplicable,
        payment_mode: input.salary.paymentMode ?? 'bank_transfer',
      });
      if (salaryError) console.warn('[employeeService] salary insert failed:', salaryError.message);
    }

    if (input.bank && (input.bank.bankName || input.bank.accountNumber)) {
      const { error: bankError } = await supabase.from('employee_bank_details' as any).insert({
        employee_id: row.id,
        bank_name: input.bank.bankName ?? null,
        account_number: input.bank.accountNumber ?? null,
        ifsc_code: input.bank.ifscCode ?? null,
        payment_mode: input.bank.paymentMode ?? 'bank_transfer',
      });
      if (bankError) console.warn('[employeeService] bank insert failed:', bankError.message);
    }

    if (input.statutory && (input.statutory.panNumber || input.statutory.pfApplicable || input.statutory.esiApplicable)) {
      const { error: statutoryError } = await supabase.from('employee_statutory_details' as any).insert({
        employee_id: row.id,
        pan_number: input.statutory.panNumber ?? null,
        pf_applicable: !!input.statutory.pfApplicable,
        esi_applicable: !!input.statutory.esiApplicable,
      });
      if (statutoryError) console.warn('[employeeService] statutory insert failed:', statutoryError.message);
    }

    const lookups = await this.loadLookups();
    return this.mapRow(row, lookups);
  }

  async update(id: string, patch: UpdateEmployeeInput): Promise<Employee> {
    assertConfigured();

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.fullName !== undefined) payload.full_name = patch.fullName;
    if (patch.contactNumber !== undefined) payload.contact_number = patch.contactNumber;
    if (patch.dateOfBirth !== undefined) payload.date_of_birth = patch.dateOfBirth;
    if (patch.gender !== undefined) payload.gender = patch.gender;
    if (patch.address !== undefined) payload.address = patch.address;
    if (patch.emergencyContactName !== undefined) payload.emergency_contact_name = patch.emergencyContactName || null;
    if (patch.emergencyContactPhone !== undefined) payload.emergency_contact_phone = patch.emergencyContactPhone || null;
    if (patch.departmentId !== undefined) payload.department_id = patch.departmentId || null;
    if (patch.designationId !== undefined) payload.designation_id = patch.designationId || null;
    if (patch.dateJoined !== undefined) payload.date_joined = patch.dateJoined;
    if (patch.employmentType !== undefined) payload.employment_type = patch.employmentType;
    if (patch.employmentStatus !== undefined) payload.employment_status = patch.employmentStatus;
    if (patch.workLocation !== undefined) payload.work_location = patch.workLocation;
    if (patch.reportingManagerId !== undefined) payload.reporting_manager_id = patch.reportingManagerId || null;
    if (patch.invitationStatus !== undefined) payload.invitation_status = patch.invitationStatus;

    const { data, error } = await supabase
      .from('employees' as any)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'updating employee');

    const row = Array.isArray(data) ? data[0] : data;
    const lookups = await this.loadLookups();
    return this.mapRow(row, lookups);
  }

  async remove(id: string): Promise<void> {
    assertConfigured();
    const { error } = await supabase.from('employees' as any).delete().eq('id', id);
    if (error) throw fromPostgrestError(error, 'deleting employee');
  }
}

// ─── Demo implementation (development only) ─────────────────

const DEMO_STORE = 'employees';

export class DemoEmployeeRepository implements EmployeeRepository {
  readonly mode: RepositoryMode = 'demo';

  private read(): Employee[] {
    const stored = readDemoJson<Employee[]>(DEMO_STORE, null as any);
    if (!Array.isArray(stored)) {
      writeDemoJson(DEMO_STORE, DEMO_EMPLOYEES);
      return DEMO_EMPLOYEES.map(e => ({ ...e }));
    }
    return stored;
  }

  private write(employees: Employee[]): void {
    writeDemoJson(DEMO_STORE, employees);
  }

  async list(): Promise<Employee[]> {
    return sortByCode(this.read());
  }

  async getById(id: string): Promise<Employee | null> {
    return this.read().find(e => e.id === id) ?? null;
  }

  async getByAuthUserId(authUserId: string): Promise<Employee | null> {
    return this.read().find(e => e.authUserId === authUserId) ?? null;
  }

  async getByEmail(email: string): Promise<Employee | null> {
    const needle = email.toLowerCase();
    return this.read().find(e => e.workEmail.toLowerCase() === needle) ?? null;
  }

  async nextEmployeeCode(): Promise<string> {
    return nextCodeFrom(this.read());
  }

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const employees = this.read();
    const existing = employees.find(e => e.workEmail.toLowerCase() === input.workEmail.toLowerCase());
    if (existing) {
      throw new ServiceError(
        'conflict',
        `An employee with email ${input.workEmail} already exists (${existing.employeeCode}).`,
      );
    }
    if (input.employeeCode) {
      const clash = employees.find(e => e.employeeCode === input.employeeCode);
      if (clash) {
        throw new ServiceError('conflict', `Employee code ${input.employeeCode} is already used by ${clash.fullName}.`);
      }
    }
    const now = new Date().toISOString();
    const employee: Employee = {
      id: `demo-emp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeCode: input.employeeCode ?? nextCodeFrom(employees),
      fullName: input.fullName,
      workEmail: input.workEmail.toLowerCase(),
      contactNumber: input.contactNumber,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      address: input.address,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      departmentId: input.departmentId,
      departmentName: input.departmentName,
      designationId: input.designationId,
      designationName: input.designationName,
      dateJoined: input.dateJoined,
      employmentType: input.employmentType ?? 'full_time',
      employmentStatus: input.employmentStatus ?? 'active',
      workLocation: input.workLocation,
      reportingManagerId: input.reportingManagerId,
      invitationStatus: input.invitationStatus ?? 'not_invited',
      createdAt: now,
      updatedAt: now,
    };
    this.write([...employees, employee]);
    return employee;
  }

  async update(id: string, patch: UpdateEmployeeInput): Promise<Employee> {
    const employees = this.read();
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) throw new ServiceError('not_found', 'Employee not found.');
    const merged: Employee = {
      ...employees[index],
      ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
      ...(patch.contactNumber !== undefined ? { contactNumber: patch.contactNumber } : {}),
      ...(patch.dateOfBirth !== undefined ? { dateOfBirth: patch.dateOfBirth } : {}),
      ...(patch.gender !== undefined ? { gender: patch.gender } : {}),
      ...(patch.address !== undefined ? { address: patch.address } : {}),
      ...(patch.emergencyContactName !== undefined ? { emergencyContactName: patch.emergencyContactName } : {}),
      ...(patch.emergencyContactPhone !== undefined ? { emergencyContactPhone: patch.emergencyContactPhone } : {}),
      ...(patch.departmentId !== undefined ? { departmentId: patch.departmentId } : {}),
      ...(patch.departmentName !== undefined ? { departmentName: patch.departmentName } : {}),
      ...(patch.designationId !== undefined ? { designationId: patch.designationId } : {}),
      ...(patch.designationName !== undefined ? { designationName: patch.designationName } : {}),
      ...(patch.dateJoined !== undefined ? { dateJoined: patch.dateJoined } : {}),
      ...(patch.employmentType !== undefined ? { employmentType: patch.employmentType } : {}),
      ...(patch.employmentStatus !== undefined ? { employmentStatus: patch.employmentStatus } : {}),
      ...(patch.workLocation !== undefined ? { workLocation: patch.workLocation } : {}),
      ...(patch.reportingManagerId !== undefined ? { reportingManagerId: patch.reportingManagerId } : {}),
      updatedAt: new Date().toISOString(),
    };
    const next = [...employees];
    next[index] = merged;
    this.write(next);
    return merged;
  }

  async remove(id: string): Promise<void> {
    const employees = this.read();
    const next = employees.filter(e => e.id !== id);
    if (next.length === employees.length) throw new ServiceError('not_found', 'Employee not found.');
    this.write(next);
  }
}

// ─── Factory ─────────────────────────────────────────────────

export const createEmployeeRepository = (): EmployeeRepository => {
  if (dataSourceMode === 'supabase') return new SupabaseEmployeeRepository();
  return new DemoEmployeeRepository();
};
