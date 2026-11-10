// ============================================================
// Clixhora HRMS — Announcements repository
//
// Stores company and department announcements. In Supabase mode the table is
// protected by row-level security (admins manage, employees read published
// announcements that target them). In demo mode the announcements live in the
// development-only browser storage so the module behaves the same locally.
// ============================================================

import { ServiceError } from '../../lib/errors';
import { dataSourceMode, isSupabaseConfigured, supabase } from '../../lib/supabase';
import type { Announcement, AnnouncementStatus, AnnouncementTheme } from '../../types';
import type { RepositoryMode } from './employeeRepository';
import { readDemoJson, writeDemoJson } from './demoStorage';

export interface AnnouncementFilter {
  status?: AnnouncementStatus;
  audience?: 'all' | 'department';
  departmentIds?: string[];
}

export interface AnnouncementInput {
  title: string;
  body: string;
  audience: Announcement['audience'];
  audienceDepartmentIds?: string[];
  status?: AnnouncementStatus;
  isPinned?: boolean;
  theme?: AnnouncementTheme;
  templateType?: string;
  publishAt?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface AnnouncementRepository {
  readonly mode: RepositoryMode;
  list(filter?: AnnouncementFilter): Promise<Announcement[]>;
  create(input: AnnouncementInput): Promise<Announcement>;
  update(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement>;
  setStatus(id: string, status: AnnouncementStatus): Promise<Announcement>;
  setPinned(id: string, isPinned: boolean): Promise<Announcement>;
  remove(id: string): Promise<void>;
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
      `The announcements table is missing (${context}). Run the migrations in supabase/migrations. ${message}`,
      error,
    );
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

const mapRow = (row: any): Announcement => ({
  id: String(row.id),
  title: row.title ?? '',
  body: row.body ?? '',
  audience: (row.audience ?? 'all') as Announcement['audience'],
  audienceDepartmentIds: Array.isArray(row.audience_department_ids) ? row.audience_department_ids.map(String) : [],
  status: (row.status ?? 'draft') as AnnouncementStatus,
  isPinned: Boolean(row.is_pinned),
  theme: (row.theme ?? 'none') as AnnouncementTheme,
  templateType: row.template_type ?? undefined,
  publishAt: row.publish_at ?? undefined,
  expiresAt: row.expires_at ?? undefined,
  deletedAt: row.deleted_at ?? undefined,
  createdBy: row.created_by ?? undefined,
  createdByName: row.created_by_name ?? undefined,
  createdAt: row.created_at ?? '',
  updatedAt: row.updated_at ?? '',
});

export class SupabaseAnnouncementRepository implements AnnouncementRepository {
  readonly mode: RepositoryMode = 'supabase';

  async list(filter?: AnnouncementFilter): Promise<Announcement[]> {
    assertConfigured();
    let query = supabase.from('announcements' as any).select('*');
    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.audience) query = query.eq('audience', filter.audience);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw fromPostgrestError(error, 'loading announcements');

    const rows = (data ?? []).map(mapRow);
    if (filter?.departmentIds?.length) {
      const allowed = new Set(filter.departmentIds);
      return rows.filter(
        a => a.audience === 'all' || (a.audienceDepartmentIds ?? []).some(id => allowed.has(id)),
      );
    }
    return rows;
  }

  async create(input: AnnouncementInput): Promise<Announcement> {
    assertConfigured();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements' as any)
      .insert({
        title: input.title,
        body: input.body,
        audience: input.audience,
        audience_department_ids: input.audienceDepartmentIds ?? [],
        status: input.status ?? 'draft',
        is_pinned: input.isPinned ?? false,
        theme: input.theme ?? 'none',
        template_type: input.templateType ?? null,
        publish_at: input.publishAt ?? null,
        created_by: input.createdBy ?? null,
        created_by_name: input.createdByName ?? null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'creating the announcement');
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }

  async update(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement> {
    assertConfigured();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.body !== undefined) payload.body = patch.body;
    if (patch.audience !== undefined) payload.audience = patch.audience;
    if (patch.audienceDepartmentIds !== undefined) payload.audience_department_ids = patch.audienceDepartmentIds;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.isPinned !== undefined) payload.is_pinned = patch.isPinned;
    if (patch.theme !== undefined) payload.theme = patch.theme;
    if (patch.templateType !== undefined) payload.template_type = patch.templateType;
    if (patch.publishAt !== undefined) payload.publish_at = patch.publishAt;

    const { data, error } = await supabase
      .from('announcements' as any)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'updating the announcement');
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }

  async setStatus(id: string, status: AnnouncementStatus): Promise<Announcement> {
    assertConfigured();
    const { data, error } = await supabase
      .from('announcements' as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'updating the announcement status');
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }

  async setPinned(id: string, isPinned: boolean): Promise<Announcement> {
    assertConfigured();
    const { data, error } = await supabase
      .from('announcements' as any)
      .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw fromPostgrestError(error, 'updating the pin state');
    const row = Array.isArray(data) ? data[0] : data;
    return mapRow(row);
  }

  async remove(id: string): Promise<void> {
    assertConfigured();
    // Soft-delete: set deleted_at so RLS hides it from employees
    const { error } = await supabase
      .from('announcements' as any)
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw fromPostgrestError(error, 'deleting the announcement');
  }
}

const DEMO_KEY = 'announcements';

const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'demo-ann-01',
    title: 'Office closed on Sunday',
    body: 'The office stays closed every Sunday as per the weekly off policy. Please plan your work accordingly.',
    audience: 'all',
    audienceDepartmentIds: [],
    status: 'published',
    isPinned: true,
    theme: 'none',
    createdByName: 'HR Team',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ann-02',
    title: 'Software team demo on Friday',
    body: 'The software team demos the new release on Friday at 4:00 PM in the meeting room.',
    audience: 'department',
    audienceDepartmentIds: ['software'],
    status: 'published',
    isPinned: false,
    theme: 'none',
    createdByName: 'HR Team',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ann-03',
    title: 'Updated leave policy',
    body: 'Draft of the revised leave policy — awaiting approval before publishing.',
    audience: 'all',
    audienceDepartmentIds: [],
    status: 'draft',
    isPinned: false,
    theme: 'none',
    createdByName: 'HR Team',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export class DemoAnnouncementRepository implements AnnouncementRepository {
  readonly mode: RepositoryMode = 'demo';

  private read(): Announcement[] {
    const stored = readDemoJson<Announcement[] | null>(DEMO_KEY, null);
    if (stored) return stored;
    writeDemoJson(DEMO_KEY, DEMO_ANNOUNCEMENTS);
    return [...DEMO_ANNOUNCEMENTS];
  }

  private write(list: Announcement[]): void {
    writeDemoJson(DEMO_KEY, list);
  }

  async list(filter?: AnnouncementFilter): Promise<Announcement[]> {
    let rows = this.read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter?.status) rows = rows.filter(a => a.status === filter.status);
    if (filter?.audience) rows = rows.filter(a => a.audience === filter.audience);
    if (filter?.departmentIds?.length) {
      const allowed = new Set(filter.departmentIds);
      rows = rows.filter(a => a.audience === 'all' || (a.audienceDepartmentIds ?? []).some(id => allowed.has(id)));
    }
    return rows;
  }

  async create(input: AnnouncementInput): Promise<Announcement> {
    const now = new Date().toISOString();
    const announcement: Announcement = {
      id: `demo-ann-${Date.now()}`,
      title: input.title,
      body: input.body,
      audience: input.audience,
      audienceDepartmentIds: input.audienceDepartmentIds ?? [],
      status: input.status ?? 'draft',
      isPinned: input.isPinned ?? false,
      theme: input.theme ?? 'none',
      templateType: input.templateType,
      publishAt: input.publishAt,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: now,
      updatedAt: now,
    };
    this.write([announcement, ...this.read()]);
    return announcement;
  }

  async update(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement> {
    const list = this.read();
    const index = list.findIndex(a => a.id === id);
    if (index === -1) {
      throw new ServiceError('not_found', 'That announcement no longer exists.');
    }
    const prev = list[index];
    const updated: Announcement = {
      ...prev,
      title: patch.title ?? prev.title,
      body: patch.body ?? prev.body,
      audience: patch.audience ?? prev.audience,
      audienceDepartmentIds: patch.audienceDepartmentIds ?? prev.audienceDepartmentIds,
      status: patch.status ?? prev.status,
      isPinned: patch.isPinned !== undefined ? patch.isPinned : prev.isPinned,
      theme: patch.theme ?? prev.theme,
      templateType: patch.templateType !== undefined ? patch.templateType : prev.templateType,
      publishAt: patch.publishAt !== undefined ? patch.publishAt : prev.publishAt,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.write(list);
    return updated;
  }

  async setStatus(id: string, status: AnnouncementStatus): Promise<Announcement> {
    return this.update(id, { status });
  }

  async setPinned(id: string, isPinned: boolean): Promise<Announcement> {
    return this.update(id, { isPinned });
  }

  async remove(id: string): Promise<void> {
    // Soft-delete in demo mode
    const list = this.read();
    const index = list.findIndex(a => a.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], deletedAt: new Date().toISOString() };
      this.write(list);
    }
  }
}

export const createAnnouncementRepository = (): AnnouncementRepository => {
  if (dataSourceMode === 'supabase') return new SupabaseAnnouncementRepository();
  return new DemoAnnouncementRepository();
};
