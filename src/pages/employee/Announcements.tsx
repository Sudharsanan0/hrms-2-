import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, Globe, Building2, Pin, X } from 'lucide-react';

import { formatDateTime } from '../../lib/utils';
import { ErrorState, LoadingState } from '../../components/common/DataState';
import { useAuth } from '../../hooks/useAuth';
import { useEmployee, useMyAnnouncements } from '../../hooks/useHrmsData';
import {
  AccentBanner,
  PopupHeader,
  THEME_ACCENT,
  THEME_EMOJI,
} from '../../components/common/AnnouncementTheme';
import type { Announcement } from '../../types';

// ─── Popup modal ──────────────────────────────────────────────

const PopupAnnouncement: React.FC<{ announcement: Announcement; onClose: () => void }> = ({
  announcement,
  onClose,
}) => createPortal(
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-enter">
      {/* Themed header */}
      <PopupHeader theme={announcement.theme} title={announcement.title} />
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 hover:bg-black/50 transition-colors text-white z-10"
        aria-label="Close announcement"
      >
        <X className="w-4 h-4" />
      </button>
      {/* Body */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{announcement.body}</p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            {announcement.createdByName ? `${announcement.createdByName} · ` : ''}
            {formatDateTime(announcement.publishAt || announcement.createdAt)}
          </p>
          <button
            onClick={onClose}
            className="text-xs text-brand-600 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>,
  document.body,
);

// ─── Themed announcement card ─────────────────────────────────

const AnnouncementCard: React.FC<{ ann: Announcement }> = ({ ann }) => {
  const accent = THEME_ACCENT[ann.theme ?? 'none'];
  const emoji = THEME_EMOJI[ann.theme ?? 'none'] ?? '';
  const hasTheme = ann.theme && ann.theme !== 'none';

  return (
    <div className={`card overflow-hidden hover:shadow-card transition-shadow border ${accent.border}`}>
      {/* Decorative image banner — only for themed announcements */}
      {hasTheme && <AccentBanner theme={ann.theme} heightClass="h-28" />}

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${accent.icon}`}>
            <Megaphone className={`w-4 h-4 ${accent.iconText}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {ann.isPinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              <h3 className="text-sm font-bold text-slate-900">
                {emoji ? `${emoji} ` : ''}{ann.title}
              </h3>
              <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {ann.audience === 'all'
                  ? <><Globe className="w-3 h-3" /> All Employees</>
                  : <><Building2 className="w-3 h-3" /> Department</>}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{ann.body}</p>
            <p className="text-[10px] text-slate-400 mt-2">
              {ann.createdByName ? `${ann.createdByName} · ` : ''}
              {formatDateTime(ann.publishAt || ann.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────

export const EmpAnnouncements: React.FC = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId;
  const employeeQuery = useEmployee(employeeId);
  const departmentId = employeeQuery.data?.departmentId ?? employeeQuery.data?.departmentSlug;

  const announcementsQuery = useMyAnnouncements(departmentId);
  const announcements = announcementsQuery.data ?? [];

  // Track dismissed popup-theme announcements per session
  const [dismissedPopups, setDismissedPopups] = useState<Set<string>>(new Set());
  const pendingPopup = announcements.find(
    a => a.theme === 'popup' && !dismissedPopups.has(a.id),
  );
  const dismissPopup = (id: string) =>
    setDismissedPopups(prev => new Set([...prev, id]));

  return (
    <div className="space-y-6 animate-enter">
      {/* Auto-popup for popup-theme announcements */}
      {pendingPopup && (
        <PopupAnnouncement
          announcement={pendingPopup}
          onClose={() => dismissPopup(pendingPopup.id)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
        <p className="text-sm text-slate-500 mt-0.5">Company-wide and department updates</p>
      </div>

      {announcementsQuery.isLoading ? (
        <LoadingState label="Loading announcements…" />
      ) : announcementsQuery.error ? (
        <ErrorState
          error={announcementsQuery.error}
          title="Could not load the announcements"
          onRetry={() => announcementsQuery.refetch()}
        />
      ) : announcements.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No announcements</p>
          <p className="text-xs text-slate-400 mt-2">Check back later for company updates and news.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => (
            <AnnouncementCard key={ann.id} ann={ann} />
          ))}
        </div>
      )}
    </div>
  );
};
