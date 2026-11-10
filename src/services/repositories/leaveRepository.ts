// ============================================================
// Clixhora HRMS — Leave repository (leave requests)
// ============================================================

import { ServiceError } from '../../lib/errors';
import { dataSourceMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { LeaveRequest, LeaveStatus, LeaveType } from '../../types';
import type { RepositoryMode } from './employeeRepository';
import { readDemoJson, writeDemoJson } from './demoStorage';

/** A pending request so the demo shows a real approval workflow. */
const DEMO_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'demo-leave-01',
    employeeId: 'demo-emp-02',
    leaveType: 'paid',
    startDate: '2026-01-12',
    endDate: '2026-01-13',
    duration: 2,
    isHalfDay: false,
    reason: 'Family function out of town.',
    status: 'pending',
    createdAt: '2026-01-08T09:30:00.000Z',
    updatedAt: '2026-01-08T09:30:00.000Z',
  },
];

export interface LeaveRepository {
  readonly mode: RepositoryMode;
  listRequests(filter?: { status?: LeaveStatus; employeeId?: string }): Promise<LeaveRequest[]>;
  createRequest(input: {
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    duration: number;
    isHalfDay?: boolean;
    reason: string;
  }): Promise<LeaveRequest>;
  updateStatus(id: string, status: LeaveStatus, reviewedBy?: string, reviewNote?: string): Promise<LeaveRequest>;
}

const fromPostgrestError = (error: any, context: string): ServiceError => {
  const message: string = error?.message || 'Unknown database error';
  const code = String(error?.code || '');
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new ServiceError('permission', `Supabase denied the request (${context}). ${message}`, error);
  }
  if (code === '42P01' || /does not exist/i.test(message)) {
    return new ServiceError('validation', `The leave table is missing (${context}). Run the migrations in supabase/migrations. ${message}`, error);
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

const mapRow = (row: any): LeaveRequest => ({
  id: String(row.id),
  employeeId: String(row.employee_id),
  leaveType: (row.leave_type ?? 'paid') as LeaveType,
  startDate: String(row.start_date).slice(0, 10),
  endDate: String(row.end_date).slice(0, 10),
  duration: Number(row.duration ?? 1),
  isHalfDay: !!row.is_half_day,
  reason: row.reason ?? '',
  status: (row.status ?? 'pending') as LeaveStatus,
  reviewedBy: row.reviewed_by ?? undefined,
  reviewedAt: row.reviewed_at ?? undefined,
  reviewNote: row.review_note ?? undefined,
  createdAt: row.created_at ?? '',
  updatedAt: row.updated_at ?? '',
});

export class SupabaseLeaveRepository implements LeaveRepository {
  readonly mode: RepositoryMode = 'supabase';

  async listRequests(filter?: { status?: LeaveStatus; employeeId?: string }): Promise<LeaveRequest[]> {
    assertConfigured();
    let query = supabase.from('leave_requests' as any).select('*');
    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.employeeId) query = query.eq('employee_id', filter.employeeId);
    const { data, error } = await query;
    if (error) throw fromPostgrestError(error, 'loading leave requests');
    return (data ?? []).map(mapRow);
  }

  async createRequest(input: {
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    duration: number;
    isHalfDay?: boolean;
    reason: string;
  }): Promise<LeaveRequest> {
    assertConfigured();
    const { data, error } = await supabase
      .from('leave_requests' as any)
      .insert({
        employee_id: input.employeeId,
        leave_type: input.leaveType,
        start_date: input.startDate,
        end_date: input.endDate,
        duration: input.duration,
        is_half_day: !!input.isHalfDay,
        reason: input.reason,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'creating leave request');
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }

  async updateStatus(id: string, status: LeaveStatus, reviewedBy?: string, reviewNote?: string): Promise<LeaveRequest> {
    assertConfigured();
    const { data, error } = await supabase
      .from('leave_requests' as any)
      .update({
        status,
        reviewed_by: reviewedBy ?? null,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'updating leave request');
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }
}

export class DemoLeaveRepository implements LeaveRepository {
  readonly mode: RepositoryMode = 'demo';

  private read(): LeaveRequest[] {
    const stored = readDemoJson<LeaveRequest[] | null>('leaveRequests', null);
    if (stored) return stored;
    writeDemoJson('leaveRequests', DEMO_LEAVE_REQUESTS);
    return [...DEMO_LEAVE_REQUESTS];
  }

  private write(list: LeaveRequest[]): void {
    writeDemoJson('leaveRequests', list);
  }

  async listRequests(filter?: { status?: LeaveStatus; employeeId?: string }): Promise<LeaveRequest[]> {
    let rows = this.read();
    if (filter?.status) rows = rows.filter(r => r.status === filter.status);
    if (filter?.employeeId) rows = rows.filter(r => r.employeeId === filter.employeeId);
    return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async createRequest(input: {
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    duration: number;
    isHalfDay?: boolean;
    reason: string;
  }): Promise<LeaveRequest> {
    const now = new Date().toISOString();
    const request: LeaveRequest = {
      id: `demo-leave-${Date.now()}`,
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      duration: input.duration,
      isHalfDay: !!input.isHalfDay,
      reason: input.reason,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.write([request, ...this.read()]);
    return request;
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    reviewedBy?: string,
    reviewNote?: string,
  ): Promise<LeaveRequest> {
    const list = this.read();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) {
      throw new ServiceError('not_found', 'That leave request no longer exists.');
    }
    list[index] = {
      ...list[index],
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewNote,
      updatedAt: new Date().toISOString(),
    };
    this.write(list);
    return list[index];
  }
}

export const createLeaveRepository = (): LeaveRepository => {
  if (dataSourceMode === 'supabase') return new SupabaseLeaveRepository();
  return new DemoLeaveRepository();
};
