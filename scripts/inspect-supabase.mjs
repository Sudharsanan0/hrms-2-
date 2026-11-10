#!/usr/bin/env node
// ============================================================
// Clixhora HRMS — Supabase inspection script
//
// Verifies that the project the app is configured for actually contains the
// tables, columns and reference data the app needs. Run it after applying
// the migrations:
//
//   node scripts/inspect-supabase.mjs
//
// It never writes anything — it only reads.
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');

// ─── Read the environment ──────────────────────────────────────

const readEnvFile = (file) => {
  if (!existsSync(file)) return {};
  const raw = readFileSync(file, 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
};

const fileEnv = {
  ...readEnvFile(resolve(projectRoot, '.env')),
  ...readEnvFile(resolve(projectRoot, '.env.local')),
};

const env = { ...fileEnv, ...process.env };

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

const PLACEHOLDERS = ['placeholder', 'your-project-ref', 'your-publishable-key', 'your-anon'];

const looksLikePlaceholder = (value) => {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return PLACEHOLDERS.some(p => v.includes(p));
};

console.log('Clixhora HRMS — Supabase inspection\n' + '='.repeat(46));

if (looksLikePlaceholder(url) || looksLikePlaceholder(key)) {
  console.error('\n✗ Supabase is not configured.');
  console.error('  VITE_SUPABASE_URL       :', url ? '(placeholder)' : '(missing)');
  console.error('  VITE_SUPABASE_*_KEY     :', key ? '(placeholder)' : '(missing)');
  console.error('\n  Copy .env.example to .env, add the public key, then run again.');
  console.error('  See docs/SUPABASE_SETUP.md for the full walkthrough.\n');
  process.exit(1);
}

/**
 * A legacy `anon` JWT is fine — it is a public key meant for the browser.
 * A `service_role` JWT is not: it bypasses RLS and must never be committed
 * or shipped to the client.
 */
const readJwtRole = (value) => {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
};

const keyRole = readJwtRole(key);
const isServiceRoleKey =
  keyRole === 'service_role' || /service_role/.test(key);

if (isServiceRoleKey) {
  console.error('\n✗ The key is a service-role key.');
  console.error('  It bypasses row level security and must never live in .env or the browser.');
  console.error('  Remove it from .env immediately and rotate it in the Supabase dashboard.\n');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`  Project URL : ${url}`);
console.log(`  Key type    : ${env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'publishable' : keyRole === 'anon' ? 'legacy anon' : 'unknown'}\n`);

const TABLES = [
  'departments',
  'designations',
  'employees',
  'employee_salaries',
  'employee_bank_details',
  'employee_statutory_details',
  'attendance_records',
  'attendance_correction_requests',
  'audit_logs',
  'leave_requests',
  'leave_balances',
  'payroll_runs',
  'payslips',
  'settings',
  'holidays',
  'profiles',
];

let failures = 0;

const check = (label, ok, detail) => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

console.log('Tables');
for (const table of TABLES) {
  const { error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  check(table, !error, error ? error.message : `${count ?? 0} rows`);
}

console.log('\nReference data');
const { data: departments, error: deptError } = await supabase
  .from('departments')
  .select('slug, name');
check('departments seeded', !deptError && (departments?.length ?? 0) >= 5, `${departments?.length ?? 0} departments`);

const { data: designations, error: desigError } = await supabase
  .from('designations')
  .select('id');
check('designations seeded', !desigError && (designations?.length ?? 0) > 0, `${designations?.length ?? 0} designations`);

const { data: attendanceSettings, error: settingsError } = await supabase
  .from('settings')
  .select('key, value')
  .eq('key', 'attendance')
  .maybeSingle();
check(
  'attendance policy present',
  !settingsError && !!attendanceSettings,
  attendanceSettings ? `weekly off: ${(attendanceSettings.value?.weeklyOffDays ?? []).join(', ')}` : 'missing',
);

console.log('\nEmployee data');
const { data: employees, error: empError } = await supabase
  .from('employees')
  .select('employee_code, full_name, employment_status, is_test_data');
check('employees readable', !empError, empError ? empError.message : `${employees?.length ?? 0} employees`);

if (employees?.length) {
  const test = employees.filter(e => e.is_test_data);
  console.log(`    · ${test.length} test record(s): ${test.map(e => e.employee_code).join(', ')}`);
  console.log(`    · ${employees.filter(e => !e.is_test_data).length} production record(s)`);
}

console.log('\nAttendance');
const { count: attendanceCount, error: attError } = await supabase
  .from('attendance_records')
  .select('id', { count: 'exact', head: true });
check('attendance_records readable', !attError, attError ? attError.message : `${attendanceCount ?? 0} records`);

console.log('\n' + '='.repeat(46));
if (failures === 0) {
  console.log('✓ Everything the app needs is in place.\n');
  process.exit(0);
} else {
  console.log(`✗ ${failures} check(s) failed.`);
  console.log('  Apply the migrations in supabase/migrations and run this script again.\n');
  process.exit(1);
}
