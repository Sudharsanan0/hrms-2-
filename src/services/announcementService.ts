// ============================================================
// Clixhora HRMS — Announcement service
//
// Facade over the announcement repository. Employees only ever see published
// (or due scheduled) announcements that target them; admins manage the full
// list. Reads throw on failure so the UI can show an explicit error instead
// of an empty list.
// ============================================================

import type { Announcement, AnnouncementStatus } from '../types';
import {
  createAnnouncementRepository,
  type AnnouncementInput,
  type AnnouncementRepository,
} from './repositories/announcementRepository';

export type { AnnouncementInput };

let repository: AnnouncementRepository | null = null;

export const getAnnouncementRepository = (): AnnouncementRepository => {
  if (!repository) repository = createAnnouncementRepository();
  return repository;
};

export const setAnnouncementRepository = (repo: AnnouncementRepository | null): void => {
  repository = repo;
};

/** Sort helper: pinned first, then by publish_at / created_at descending. */
const pinnedFirst = (a: Announcement, b: Announcement): number => {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  const aDate = a.publishAt ?? a.createdAt;
  const bDate = b.publishAt ?? b.createdAt;
  return bDate.localeCompare(aDate);
};

/** Every announcement — admins only (excluding soft-deleted). */
export const listAnnouncements = async (filter?: {
  status?: AnnouncementStatus;
}): Promise<Announcement[]> => {
  const rows = await getAnnouncementRepository().list(filter);
  // Exclude soft-deleted rows (safety fallback if RLS doesn't cover demo mode)
  return rows.filter(a => !a.deletedAt).sort(pinnedFirst);
};

/**
 * The announcements an employee may read: published ones, scheduled ones
 * whose publish time has arrived, and only those targeting their audience.
 */
export const listAnnouncementsForAudience = async (input: {
  departmentId?: string;
}): Promise<Announcement[]> => {
  const rows = await getAnnouncementRepository().list(
    input.departmentId ? { departmentIds: [input.departmentId] } : undefined,
  );
  const now = Date.now();
  return rows
    .filter(a => {
      if (a.deletedAt) return false;
      if (a.status === 'published') return true;
      if (a.status === 'scheduled') {
        return !!a.publishAt && new Date(a.publishAt).getTime() <= now;
      }
      return false;
    })
    .sort(pinnedFirst);
};

export const createAnnouncement = async (input: AnnouncementInput): Promise<Announcement> =>
  getAnnouncementRepository().create(input);

export const updateAnnouncement = async (
  id: string,
  patch: Partial<AnnouncementInput>,
): Promise<Announcement> => getAnnouncementRepository().update(id, patch);

export const setAnnouncementStatus = async (
  id: string,
  status: AnnouncementStatus,
): Promise<Announcement> => getAnnouncementRepository().setStatus(id, status);

export const setPinned = async (id: string, isPinned: boolean): Promise<Announcement> =>
  getAnnouncementRepository().setPinned(id, isPinned);

export const deleteAnnouncement = async (id: string): Promise<void> =>
  getAnnouncementRepository().remove(id);

export const announcementService = {
  list: listAnnouncements,
  listForAudience: listAnnouncementsForAudience,
  create: createAnnouncement,
  update: updateAnnouncement,
  setStatus: setAnnouncementStatus,
  setPinned,
  remove: deleteAnnouncement,
};
