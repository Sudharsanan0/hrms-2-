import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listAnnouncementsForAudience,
  setAnnouncementStatus,
  updateAnnouncement,
} from '../services/announcementService';
import { clearDemoStorage } from '../services/repositories/demoStorage';

describe('announcementService (shared data layer)', () => {
  beforeEach(() => clearDemoStorage());

  it('starts from the demo announcements instead of an empty list', async () => {
    const all = await listAnnouncements();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some(a => a.status === 'published')).toBe(true);
  });

  it('creates an announcement and persists it', async () => {
    const created = await createAnnouncement({
      title: 'Quarterly review',
      body: 'The quarterly review starts on Monday.',
      audience: 'all',
      status: 'published',
      createdByName: 'Admin',
    });

    expect(created.id).toBeTruthy();
    expect(created.status).toBe('published');

    const all = await listAnnouncements();
    expect(all.map(a => a.id)).toContain(created.id);
  });

  it('edits and archives an announcement', async () => {
    const created = await createAnnouncement({
      title: 'Draft notice',
      body: 'Not ready yet.',
      audience: 'all',
      status: 'draft',
    });

    const updated = await updateAnnouncement(created.id, { title: 'Updated notice' });
    expect(updated.title).toBe('Updated notice');

    const archived = await setAnnouncementStatus(created.id, 'archived');
    expect(archived.status).toBe('archived');

    const published = await listAnnouncements({ status: 'published' });
    expect(published.map(a => a.id)).not.toContain(created.id);
  });

  it('permanently deletes an archived announcement', async () => {
    const created = await createAnnouncement({
      title: 'Outdated notice',
      body: 'This notice is no longer relevant.',
      audience: 'all',
      status: 'draft',
    });

    await setAnnouncementStatus(created.id, 'archived');
    await deleteAnnouncement(created.id);

    const all = await listAnnouncements();
    expect(all.map(a => a.id)).not.toContain(created.id);
  });

  it('only shows employees the announcements that target them', async () => {
    const softwareOnly = await listAnnouncementsForAudience({ departmentId: 'software' });
    expect(softwareOnly.length).toBeGreaterThan(0);
    // The software-only demo announcement is visible for that department.
    expect(softwareOnly.some(a => a.audienceDepartmentIds?.includes('software'))).toBe(true);

    const other = await listAnnouncementsForAudience({ departmentId: 'marketing' });
    expect(other.some(a => a.audienceDepartmentIds?.includes('software'))).toBe(false);
  });

  it('never shows drafts to employees', async () => {
    await createAnnouncement({
      title: 'Secret draft',
      body: 'Internal only.',
      audience: 'all',
      status: 'draft',
    });

    const visible = await listAnnouncementsForAudience({ departmentId: 'software' });
    expect(visible.map(a => a.title)).not.toContain('Secret draft');
  });
});
