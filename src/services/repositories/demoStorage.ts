// ============================================================
// Clixhora HRMS — Development-only browser storage adapter
//
// This adapter exists ONLY to keep the demo experience consistent across
// pages (Employees / Dashboard / Attendance / Payslips) during local
// development. It is never used when Supabase is configured, and it is
// unavailable outside `import.meta.env.DEV`.
//
// It is NOT a production store: localStorage is per-browser, per-origin and
// trivially editable, so it must never be treated as the source of truth
// for real employee, attendance or payroll records.
// ============================================================

import { isDevMode } from '../../lib/supabase';

export const DEMO_STORAGE_PREFIX = 'clixhora.demo.v1';

const canUseStorage = (): boolean => {
  if (!isDevMode) return false;
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

export const demoStorageKey = (name: string) => `${DEMO_STORAGE_PREFIX}.${name}`;

export function readDemoJson<T>(name: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(demoStorageKey(name));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeDemoJson(name: string, value: unknown): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(demoStorageKey(name), JSON.stringify(value));
  } catch {
    /* quota / private mode — demo data simply stays in memory */
  }
}

export function clearDemoStorage(): void {
  if (!canUseStorage()) return;
  try {
    Object.keys(window.localStorage)
      .filter(k => k.startsWith(DEMO_STORAGE_PREFIX))
      .forEach(k => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
