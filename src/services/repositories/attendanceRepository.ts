// ============================================================
// Clixhora HRMS — Attendance repository
//
// One attendance store shared by the admin roster, the employee self-service
// pages and the dashboard metrics. Exactly one record per employee per date
// (unique on employee_id + attendance_date).
// ============================================================

import { ServiceError } from '../../lib/errors';
import { dataSourceMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { AttendanceRecord, AttendanceSource, AttendanceStatus } from '../../types';
import { readDemoJson, writeDemoJson } from './demoStorage';
import type { RepositoryMode } from './employeeRepository';

export interface UpsertAttendanceInput {
  employeeId: string;
  /** YYYY-MM-DD (IST calendar date). */
  attendanceDate: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  totalMinutes?: number | null;
  notes?: string | null;
  correctionReason?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface AuditEntry {
  actorUserId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string | null;
}

export interface AttendanceRepository {
  readonly mode: RepositoryMode;
  listForDate(date: string): Promise<AttendanceRecord[]>;
  listForRange(startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  listForEmployee(employeeId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  upsert(input: UpsertAttendanceInput): Promise<AttendanceRecord>;
  recordAudit(entry: AuditEntry): Promise<void>;
}

const fromPostgrestError = (error: any, context: string): ServiceError => {
  const message: string = error?.message || 'Unknown database error';
  const code = String(error?.code || '');
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new ServiceError('permission', `Supabase denied the request (${context}). ${message}`, error);
  }
  if (code === '42P01' || /does not exist/i.test(message)) {
    return new ServiceError(
      'validation',
      `The attendance table is missing (${context}). Run the migrations in supabase/migrations. ${message}`,
      error,
    );
  }
  if (code === '23505' || /duplicate key/i.test(message)) {
    return new ServiceError('conflict', `A record already exists for this employee and date (${context}). ${message}`, error);
  }
  if (/failed to fetch|network|timeout/i.test(message)) {
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

const mapRow = (row: any): AttendanceRecord => ({
  id: String(row.id),
  employeeId: String(row.employee_id),
  attendanceDate: String(row.attendance_date).slice(0, 10),
  checkInAt: row.check_in_at ?? undefined,
  checkOutAt: row.check_out_at ?? undefined,
  status: (row.status ?? 'present') as AttendanceStatus,
  source: (row.source ?? 'manual_admin') as AttendanceSource,
  totalMinutes: row.total_minutes ?? undefined,
  correctionReason: row.correction_reason ?? undefined,
  notes: row.notes ?? undefined,
  createdBy: row.created_by ?? undefined,
  updatedBy: row.updated_by ?? undefined,
  createdAt: row.created_at ?? '',
  updatedAt: row.updated_at ?? '',
});

export class SupabaseAttendanceRepository implements AttendanceRepository {
  readonly mode: RepositoryMode = 'supabase';

  private async selectRows(query: (qb: any) => any, context: string): Promise<AttendanceRecord[]> {
    assertConfigured();
    const { data, error } = await query(supabase.from('attendance_records' as any).select('*'));
    if (error) throw fromPostgrestError(error, context);
    return (data ?? []).map(mapRow);
  }

  listForDate(date: string): Promise<AttendanceRecord[]> {
    return this.selectRows(qb => qb.eq('attendance_date', date), 'loading attendance for date');
  }

  listForRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return this.selectRows(
      qb => qb.gte('attendance_date', startDate).lte('attendance_date', endDate),
      'loading attendance range',
    );
  }

  listForEmployee(employeeId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return this.selectRows(
      qb => qb.eq('employee_id', employeeId).gte('attendance_date', startDate).lte('attendance_date', endDate),
      'loading employee attendance',
    );
  }

  async upsert(input: UpsertAttendanceInput): Promise<AttendanceRecord> {
    assertConfigured();
    const now = new Date().toISOString();

    const payload = {
      employee_id: input.employeeId,
      attendance_date: input.attendanceDate,
      status: input.status,
      source: input.source,
      check_in_at: input.checkInAt ?? null,
      check_out_at: input.checkOutAt ?? null,
      total_minutes: input.totalMinutes ?? null,
      notes: input.notes ?? null,
      correction_reason: input.correctionReason ?? null,
      created_by: input.createdBy ?? null,
      updated_by: input.updatedBy ?? null,
      updated_at: now,
    };

    let result = await supabase
      .from('attendance_records' as any)
      .upsert(payload, { onConflict: 'employee_id,attendance_date' })
      .select('*')
      .single();

    if (result.error) {
      // The unique constraint may be missing (older database). Fall back to
      // an explicit select → update / insert so we never create duplicates.
      const existing = await supabase
        .from('attendance_records' as any)
        .select('*')
        .eq('employee_id', input.employeeId)
        .eq('attendance_date', input.attendanceDate)
        .limit(1);

      if (existing.error) throw fromPostgrestError(result.error, 'saving attendance');

      const current = Array.isArray(existing.data) ? existing.data[0] : existing.data;

      if (current) {
        result = await supabase
          .from('attendance_records' as any)
          .update(payload)
          .eq('id', current.id)
          .select('*')
          .single();
      } else {
        result = await supabase
          .from('attendance_records' as any)
          .insert({ ...payload, created_at: now })
          .select('*')
          .single();
      }
    }

    if (result.error) throw fromPostgrestError(result.error, 'saving attendance');
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return mapRow(row);
  }

  async recordAudit(entry: AuditEntry): Promise<void> {
    assertConfigured();
    const { error } = await supabase.from('audit_logs' as any).insert({
      actor_user_id: entry.actorUserId ?? null,
      actor_name: entry.actorName ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      before_data: entry.beforeData ?? null,
      after_data: entry.afterData ?? null,
      reason: entry.reason ?? null,
      created_at: new Date().toISOString(),
    });
    if (error) {
      // The audit trail is important — surface it, but never break the write.
      console.error('[attendanceRepository] audit insert failed:', error.message);
    }
  }
}

const DEMO_STORE = 'attendance';
const DEMO_AUDIT_STORE = 'audit';

export class DemoAttendanceRepository implements AttendanceRepository {
  readonly mode: RepositoryMode = 'demo';

  private read(): AttendanceRecord[] {
    return readDemoJson<AttendanceRecord[]>(DEMO_STORE, []);
  }

  private write(records: AttendanceRecord[]): void {
    writeDemoJson(DEMO_STORE, records);
  }

  async listForDate(date: string): Promise<AttendanceRecord[]> {
    return this.read().filter(r => r.attendanceDate === date);
  }

  async listForRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return this.read().filter(r => r.attendanceDate >= startDate && r.attendanceDate <= endDate);
  }

  async listForEmployee(employeeId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return this.read().filter(
      r => r.employeeId === employeeId && r.attendanceDate >= startDate && r.attendanceDate <= endDate,
    );
  }

  async upsert(input: UpsertAttendanceInput): Promise<AttendanceRecord> {
    const records = this.read();
    const index = records.findIndex(r => r.employeeId === input.employeeId && r.attendanceDate === input.attendanceDate);
    const now = new Date().toISOString();

    const record: AttendanceRecord = {
      id: index >= 0 ? records[index].id : `demo-att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      employeeId: input.employeeId,
      attendanceDate: input.attendanceDate,
      checkInAt: input.checkInAt ?? undefined,
      checkOutAt: input.checkOutAt ?? undefined,
      status: input.status,
      source: input.source,
      totalMinutes: input.totalMinutes ?? undefined,
      notes: input.notes ?? undefined,
      correctionReason: input.correctionReason ?? undefined,
      createdBy: input.createdBy ?? undefined,
      updatedBy: input.updatedBy ?? undefined,
      createdAt: index >= 0 ? records[index].createdAt : now,
      updatedAt: now,
    };

    const next = [...records];
    if (index >= 0) next[index] = record;
    else next.push(record);
    this.write(next);
    return record;
  }

  async recordAudit(entry: AuditEntry): Promise<void> {
    const logs = readDemoJson<any[]>(DEMO_AUDIT_STORE, []);
    logs.push({ ...entry, createdAt: new Date().toISOString() });
    writeDemoJson(DEMO_AUDIT_STORE, logs.slice(-200));
  }
}

export const createAttendanceRepository = (): AttendanceRepository => {
  if (dataSourceMode === 'supabase') return new SupabaseAttendanceRepository();
  return new DemoAttendanceRepository();
};
