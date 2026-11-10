// ============================================================
// Clixhora HRMS — Test employee import (explicit, idempotent)
//
// This is the SAFE way to move the six existing demo records into a real
// Supabase project:
//
//   • It never deletes or overwrites an existing record.
//   • It never resets the database.
//   • It keeps the CLX-01 … CLX-06 identifiers, but only when they do not
//     conflict with a record that already exists in the database.
//   • It is only ever triggered manually (button on the Employees page) or
//     through the SQL migration — never automatically on app start.
// ============================================================

import { dataSourceMode } from '../lib/supabase';
import { createEmployee, listEmployees, type CreateEmployeePayload } from './employeeService';

export interface SeedResult {
  created: string[];
  skipped: string[];
  failed: { name: string; error: string }[];
}

/**
 * The six records that were previously visible in the browser session.
 * They are fictional test data (example.com addresses).
 */
export const TEST_EMPLOYEES: CreateEmployeePayload[] = [
  {
    employeeCode: 'CLX-01',
    fullName: 'Arun Kumar',
    workEmail: 'arun.kumar.test@example.com',
    contactNumber: '+91 98765 43201',
    dateOfBirth: '1995-03-15',
    gender: 'male',
    address: 'Koramangala, Bengaluru',
    departmentId: 'marketing',
    designationId: 'Meta Ads Specialist',
    dateJoined: '2025-01-10',
    employmentType: 'full_time',
    workLocation: 'Banaswadi, Bengaluru',
    basicSalary: '28000',
    hra: '12000',
    otherAllowances: '5000',
    paymentMode: 'bank_transfer',
    pfApplicable: true,
    esiApplicable: false,
    isTestData: true,
  },
  {
    employeeCode: 'CLX-02',
    fullName: 'Priya Sharma',
    workEmail: 'priya.sharma.test@example.com',
    contactNumber: '+91 98765 43202',
    dateOfBirth: '1997-07-22',
    gender: 'female',
    address: 'Indiranagar, Bengaluru',
    departmentId: 'production',
    designationId: 'Video Editor',
    dateJoined: '2025-02-15',
    employmentType: 'full_time',
    workLocation: 'Banaswadi, Bengaluru',
    basicSalary: '25000',
    hra: '10000',
    otherAllowances: '4000',
    paymentMode: 'bank_transfer',
    pfApplicable: true,
    esiApplicable: false,
    isTestData: true,
  },
  {
    employeeCode: 'CLX-03',
    fullName: 'Karthik Raj',
    workEmail: 'karthik.raj.test@example.com',
    contactNumber: '+91 98765 43203',
    dateOfBirth: '1994-11-08',
    gender: 'male',
    address: 'HSR Layout, Bengaluru',
    departmentId: 'software',
    designationId: 'Frontend Developer',
    dateJoined: '2025-03-01',
    employmentType: 'full_time',
    workLocation: 'Banaswadi, Bengaluru',
    basicSalary: '35000',
    hra: '14000',
    otherAllowances: '6000',
    paymentMode: 'bank_transfer',
    pfApplicable: true,
    esiApplicable: false,
    isTestData: true,
  },
  {
    employeeCode: 'CLX-04',
    fullName: 'Divya R',
    workEmail: 'divya.r.test@example.com',
    contactNumber: '+91 98765 43204',
    dateOfBirth: '1998-05-30',
    gender: 'female',
    address: 'Whitefield, Bengaluru',
    departmentId: 'telecalling',
    designationId: 'Telecaller',
    dateJoined: '2025-04-10',
    employmentType: 'full_time',
    workLocation: 'Banaswadi, Bengaluru',
    basicSalary: '18000',
    hra: '8000',
    otherAllowances: '3000',
    paymentMode: 'bank_transfer',
    pfApplicable: false,
    esiApplicable: true,
    isTestData: true,
  },
  {
    employeeCode: 'CLX-05',
    fullName: 'Sanjay Kumar',
    workEmail: 'sanjay.kumar.test@example.com',
    contactNumber: '+91 98765 43205',
    dateOfBirth: '1996-09-14',
    gender: 'male',
    address: 'Marathahalli, Bengaluru',
    departmentId: 'sales',
    designationId: 'Online Sales Executive',
    dateJoined: '2025-05-20',
    employmentType: 'full_time',
    workLocation: 'Banaswadi, Bengaluru',
    basicSalary: '22000',
    hra: '9000',
    otherAllowances: '4000',
    paymentMode: 'bank_transfer',
    pfApplicable: true,
    esiApplicable: false,
    isTestData: true,
  },
  {
    employeeCode: 'CLX-06',
    fullName: 'sudharsanan muthu',
    workEmail: 'sudharsanan.muthu.test@example.com',
    contactNumber: '+91 98765 43206',
    dateOfBirth: '1995-11-02',
    gender: 'male',
    address: 'Hebbal, Bengaluru',
    departmentId: 'marketing',
    designationId: 'Google Ads Specialist',
    dateJoined: '2025-06-05',
    employmentType: 'full_time',
    workLocation: 'Banaswadi, Bengaluru',
    basicSalary: '26000',
    hra: '11000',
    otherAllowances: '4500',
    paymentMode: 'bank_transfer',
    pfApplicable: true,
    esiApplicable: false,
    isTestData: true,
  },
];

/**
 * Import the six test employees. Idempotent — employees whose work email
 * already exists are skipped and never overwritten.
 */
export const importTestEmployees = async (): Promise<SeedResult> => {
  const result: SeedResult = { created: [], skipped: [], failed: [] };

  const existing = await listEmployees();
  const existingEmails = new Set(existing.map(e => e.workEmail.toLowerCase()));
  const existingCodes = new Set(existing.map(e => e.employeeCode));

  for (const employee of TEST_EMPLOYEES) {
    if (existingEmails.has(employee.workEmail.toLowerCase())) {
      result.skipped.push(employee.fullName);
      continue;
    }

    // Keep the CLX-xx identifier only when it is free in the database.
    const payload: CreateEmployeePayload = {
      ...employee,
      employeeCode: existingCodes.has(employee.employeeCode!) ? undefined : employee.employeeCode,
    };

    try {
      const res = await createEmployee(payload);
      if (res.success && res.employee) {
        existingEmails.add(res.employee.workEmail.toLowerCase());
        existingCodes.add(res.employee.employeeCode);
        result.created.push(`${res.employee.employeeCode} — ${employee.fullName}`);
      } else {
        result.failed.push({ name: employee.fullName, error: res.error || 'Unknown error' });
      }
    } catch (err: any) {
      result.failed.push({ name: employee.fullName, error: err?.message || 'Unknown error' });
    }
  }

  return result;
};

/** Kept for backwards compatibility with the existing call sites. */
export const seedDummyEmployees = importTestEmployees;

/** Check whether we are in development mode */
export function isDevelopment(): boolean {
  return import.meta.env.DEV === true || import.meta.env.MODE === 'development';
}

/** True when the app is talking to the real database. */
export const isDatabaseConnected = (): boolean => dataSourceMode === 'supabase';
