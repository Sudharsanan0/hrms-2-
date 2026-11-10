// ============================================================
// Clixhora HRMS — Attendance correction requests repository
// ============================================================

import { ServiceError } from '../../lib/errors';
import { dataSourceMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { AttendanceCorrectionRequest, CorrectionRequestStatus } from '../../types';
import type { RepositoryMode } from './employeeRepository';
import { readDemoJson, writeDemoJson } from './demoStorage';

/** A pending request so the demo shows a real review workflow. */
const DEMO_CORRECTION_REQUESTS: AttendanceCorrectionRequest[] = [
  {
    id: 'demo-correction-01',
    employeeId: 'demo-emp-03',
    attendanceDate: '2026-01-07',
    requestedCheckIn: '09:35',
    reason: 'Badge machine did not register my check-in.',
    status: 'pending',
    createdAt: '2026-01-08T08:15:00.000Z',
  },
];

export interface CorrectionRepository {
  readonly mode: RepositoryMode;
  listRequests(filter?: { status?: CorrectionRequestStatus; employeeId?: string }): Promise<AttendanceCorrectionRequest[]>;
  createRequest(input: {
    employeeId: string;
    attendanceDate: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    requestedStatus?: string;
    reason: string;
  }): Promise<AttendanceCorrectionRequest>;
  review(id: string, status: CorrectionRequestStatus, reviewedBy: string, reviewNote?: string): Promise<AttendanceCorrectionRequest>;
}

const fromPostgrestError = (error: any, context: string): ServiceError => {
  const message: string = error?.message || 'Unknown database error';
  const code = String(error?.code || '');
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new ServiceError('permission', `Supabase denied the request (${context}). ${message}`, error);
  }
  if (code === '42P01' || /does not exist/i.test(message)) {
    return new ServiceError('validation', `The correction-requests table is missing (${context}). Run the migrations in supabase/migrations. ${message}`, error);
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

const mapRow = (row: any): AttendanceCorrectionRequest => ({
  id: String(row.id),
  employeeId: String(row.employee_id),
  attendanceRecordId: row.attendance_record_id ?? undefined,
  attendanceDate: String(row.attendance_date).slice(0, 10),
  requestedCheckIn: row.requested_check_in ?? undefined,
  requestedCheckOut: row.requested_check_out ?? undefined,
  requestedStatus: row.requested_status ?? undefined,
  reason: row.reason ?? '',
  status: (row.status ?? 'pending') as CorrectionRequestStatus,
  reviewedBy: row.reviewed_by ?? undefined,
  reviewedAt: row.reviewed_at ?? undefined,
  reviewNote: row.review_note ?? undefined,
  createdAt: row.created_at ?? '',
});

export class SupabaseCorrectionRepository implements CorrectionRepository {
  readonly mode: RepositoryMode = 'supabase';

  async listRequests(filter?: { status?: CorrectionRequestStatus; employeeId?: string }): Promise<AttendanceCorrectionRequest[]> {
    assertConfigured();
    let query = supabase.from('attendance_correction_requests' as any).select('*');
    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.employeeId) query = query.eq('employee_id', filter.employeeId);
    const { data, error } = await query;
    if (error) throw fromPostgrestError(error, 'loading correction requests');
    return (data ?? []).map(mapRow);
  }

  async createRequest(input: {
    employeeId: string;
    attendanceDate: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    requestedStatus?: string;
    reason: string;
  }): Promise<AttendanceCorrectionRequest> {
    assertConfigured();
    const { data, error } = await supabase
      .from('attendance_correction_requests' as any)
      .insert({
        employee_id: input.employeeId,
        attendance_date: input.attendanceDate,
        requested_check_in: input.requestedCheckIn ?? null,
        requested_check_out: input.requestedCheckOut ?? null,
        requested_status: input.requestedStatus ?? null,
        reason: input.reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'creating correction request');
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }

  async review(id: string, status: CorrectionRequestStatus, reviewedBy: string, reviewNote?: string): Promise<AttendanceCorrectionRequest> {
    assertConfigured();
    const { data, error } = await supabase
      .from('attendance_correction_requests' as any)
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote ?? null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'reviewing correction request');
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }
}

export class DemoCorrectionRepository implements CorrectionRepository {
  readonly mode: RepositoryMode = 'demo';

  private read(): AttendanceCorrectionRequest[] {
    const stored = readDemoJson<AttendanceCorrectionRequest[] | null>('correctionRequests', null);
    if (stored) return stored;
    writeDemoJson('correctionRequests', DEMO_CORRECTION_REQUESTS);
    return [...DEMO_CORRECTION_REQUESTS];
  }

  private write(list: AttendanceCorrectionRequest[]): void {
    writeDemoJson('correctionRequests', list);
  }

  async listRequests(filter?: { status?: CorrectionRequestStatus; employeeId?: string }): Promise<AttendanceCorrectionRequest[]> {
    let rows = this.read();
    if (filter?.status) rows = rows.filter(r => r.status === filter.status);
    if (filter?.employeeId) rows = rows.filter(r => r.employeeId === filter.employeeId);
    return rows.sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
  }

  async createRequest(input: {
    employeeId: string;
    attendanceDate: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    requestedStatus?: string;
    reason: string;
  }): Promise<AttendanceCorrectionRequest> {
    const now = new Date().toISOString();
    const request: AttendanceCorrectionRequest = {
      id: `demo-correction-${Date.now()}`,
      employeeId: input.employeeId,
      attendanceDate: input.attendanceDate,
      requestedCheckIn: input.requestedCheckIn,
      requestedCheckOut: input.requestedCheckOut,
      requestedStatus: input.requestedStatus as AttendanceCorrectionRequest['requestedStatus'],
      reason: input.reason,
      status: 'pending',
      createdAt: now,
    };
    this.write([request, ...this.read()]);
    return request;
  }

  async review(
    id: string,
    status: CorrectionRequestStatus,
    reviewedBy: string,
    reviewNote?: string,
  ): Promise<AttendanceCorrectionRequest> {
    const list = this.read();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) {
      throw new ServiceError('not_found', 'That correction request no longer exists.');
    }
    list[index] = {
      ...list[index],
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewNote,
    };
    this.write(list);
    return list[index];
  }
}

export const createCorrectionRepository = (): CorrectionRepository => {
  if (dataSourceMode === 'supabase') return new SupabaseCorrectionRepository();
  return new DemoCorrectionRepository();
};
