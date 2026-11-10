import React, { useState } from 'react';
import {
  Plus, Megaphone, Globe, Building2, CheckCircle, Archive,
  Edit, Trash2, Pin, PinOff, FileText, Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, TextArea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { ErrorState, LoadingState } from '../../components/common/DataState';
import {
  AccentBanner,
  THEME_ACCENT,
  THEME_EMOJI,
  THEME_IMAGES,
} from '../../components/common/AnnouncementTheme';
import { useToast } from '../../hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  usePinAnnouncement,
  useSetAnnouncementStatus,
  useUpdateAnnouncement,
} from '../../hooks/useHrmsData';
import { formatDateTime } from '../../lib/utils';
import { orgService } from '../../services/orgService';
import type { Announcement, AnnouncementStatus, AnnouncementTheme } from '../../types';

// ─── Templates ────────────────────────────────────────────────

interface Template {
  id: string;
  label: string;
  title: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'general',
    label: 'General Announcement',
    title: 'General Announcement',
    body: 'Dear Team,\n\nWe would like to inform you about the following update:\n\n[Add your announcement details here]\n\nThank you.',
  },
  {
    id: 'public_holiday',
    label: 'Public Holiday',
    title: 'Public Holiday Notice — [Holiday Name]',
    body: 'Dear Team,\n\n[Holiday Name] falls on [Date]. The office will remain closed on this day.\n\nPlease plan your work accordingly and have a wonderful holiday.\n\nRegards,\nHR Team',
  },
  {
    id: 'festival_wishes',
    label: 'Festival Wishes',
    title: 'Festival Wishes from Clixhora',
    body: 'Dear Team,\n\nWishing everyone at Clixhora a joyful and wonderful celebration. May the occasion bring happiness and positivity to you and your family.\n\nWith warm regards,\nThe Clixhora Team',
  },
  {
    id: 'office_closure',
    label: 'Office Closure',
    title: 'Office Closure Notice',
    body: 'Dear Team,\n\nPlease note that the office will remain closed on [date] for [reason]. Please plan your work accordingly.\n\nFor urgent matters, reach out to your reporting manager.\n\nRegards,\nHR Team',
  },
  {
    id: 'office_event',
    label: 'Office Event',
    title: '[Event Name] — Save the Date',
    body: 'Dear Team,\n\nWe are excited to announce [Event Name] scheduled for [Date] at [Time] in [Venue/Platform].\n\nAll employees are encouraged to participate. Further details will be shared soon.\n\nRegards,\nHR Team',
  },
  {
    id: 'important_reminder',
    label: 'Important Reminder',
    title: 'Important Reminder — [Subject]',
    body: 'Dear Team,\n\nThis is a friendly reminder regarding [subject].\n\n[Add details here]\n\nKindly ensure compliance by [deadline]. Please reach out to HR for any queries.\n\nRegards,\nHR Team',
  },
];

const THEME_OPTIONS: { value: AnnouncementTheme; label: string; img: string }[] = [
  { value: 'none',         label: 'None',         img: '/themes/theme-none.png' },
  { value: 'red',          label: 'Red',          img: '/themes/theme-red.png' },
  { value: 'firecrackers', label: 'Firecrackers', img: '/themes/theme-firecrackers.png' },
  { value: 'flowers',      label: 'Flowers',      img: '/themes/theme-flowers.png' },
  { value: 'ribbon',       label: 'Ribbon',       img: '/themes/theme-ribbon.png' },
  { value: 'popup',        label: 'Popup',        img: '/themes/theme-popup.png' },
];

// ─── Image-based theme picker ─────────────────────────────────

const ThemePicker: React.FC<{
  value: AnnouncementTheme;
  onChange: (v: AnnouncementTheme) => void;
}> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
    {THEME_OPTIONS.map(opt => {
      const selected = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={selected}
          aria-label={`Select theme: ${opt.label}`}
          className={[
            'group relative rounded-xl overflow-hidden border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            selected
              ? 'border-brand-500 shadow-md shadow-brand-100'
              : 'border-slate-200 hover:border-slate-300',
          ].join(' ')}
        >
          {/* Thumbnail */}
          <div className="w-full aspect-[16/9] overflow-hidden bg-slate-100">
            <img
              src={opt.img}
              alt={opt.label}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              draggable={false}
            />
          </div>
          {/* Label strip */}
          <div className={[
            'px-2 py-1.5 text-center transition-colors',
            selected ? 'bg-brand-50' : 'bg-white group-hover:bg-slate-50',
          ].join(' ')}>
            <span className={[
              'text-[11px] font-semibold tracking-wide',
              selected ? 'text-brand-700' : 'text-slate-600',
            ].join(' ')}>
              {opt.label}
            </span>
          </div>
          {/* Selected check badge */}
          {selected && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center shadow">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// ─── Theme decoration helper ──────────────────────────────────

const themeClasses = (theme: AnnouncementTheme, status: AnnouncementStatus): string => {
  if (status !== 'published') return '';
  switch (theme) {
    case 'red':         return 'border-l-4 border-l-red-500';
    case 'firecrackers': return 'border-l-4 border-l-amber-400 bg-amber-50/30';
    case 'flowers':     return 'border-l-4 border-l-pink-400 bg-pink-50/30';
    case 'ribbon':      return 'border-l-4 border-l-purple-400 bg-purple-50/30';
    case 'popup':       return 'border-l-4 border-l-brand-400';
    default:            return '';
  }
};

const themeLabel = (theme: AnnouncementTheme): string => {
  const opt = THEME_OPTIONS.find(t => t.value === theme);
  return opt?.label ?? theme;
};

// ─── Form state ───────────────────────────────────────────────

const EMPTY_FORM = {
  title: '',
  body: '',
  audienceType: 'all' as 'all' | 'department',
  departmentId: '',
  /** Controls which of the 3 modes is active */
  publishMode: 'publish' as 'publish' | 'draft' | 'schedule',
  publishAt: '',
  theme: 'none' as AnnouncementTheme,
  templateType: '',
};

type FormState = typeof EMPTY_FORM;

// ─── Main component ───────────────────────────────────────────

export const AdminAnnouncements: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'published' | 'draft' | 'scheduled' | 'archived'>('published');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: 'archive' | 'delete' } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const announcementsQuery = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const statusMutation = useSetAnnouncementStatus();
  const pinMutation = usePinAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const departmentsQuery = useQuery({
    queryKey: ['org', 'departments'],
    queryFn: () => orgService.listDepartments(),
  });
  const departments = departmentsQuery.data ?? [];

  const announcements = (announcementsQuery.data ?? []).filter(a => !a.deletedAt);

  const tabs = [
    { id: 'published',  label: 'Published',  badge: announcements.filter(a => a.status === 'published').length },
    { id: 'draft',      label: 'Drafts',     badge: announcements.filter(a => a.status === 'draft').length },
    { id: 'scheduled',  label: 'Scheduled',  badge: announcements.filter(a => a.status === 'scheduled').length },
    { id: 'archived',   label: 'Archived',   badge: announcements.filter(a => a.status === 'archived').length },
  ];

  const filtered = announcements.filter(a => a.status === activeTab);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowTemplates(false);
    setModalOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    const mode: FormState['publishMode'] =
      announcement.status === 'published' ? 'publish' :
      announcement.status === 'scheduled'  ? 'schedule' : 'draft';
    setForm({
      title: announcement.title,
      body: announcement.body,
      audienceType: announcement.audience === 'all' ? 'all' : 'department',
      departmentId: announcement.audienceDepartmentIds?.[0] ?? '',
      publishMode: mode,
      publishAt: announcement.publishAt ? announcement.publishAt.slice(0, 16) : '',
      theme: announcement.theme ?? 'none',
      templateType: announcement.templateType ?? '',
    });
    setShowTemplates(false);
    setModalOpen(true);
  };

  const applyTemplate = (t: Template) => {
    setForm(p => ({ ...p, title: t.title, body: t.body, templateType: t.id }));
    setShowTemplates(false);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Please fill in title and content.');
      return;
    }
    if (form.audienceType === 'department' && !form.departmentId) {
      toast.error('Choose the department this announcement targets.');
      return;
    }
    if (form.publishMode === 'schedule' && !form.publishAt) {
      toast.error('Please pick a future date and time to schedule.');
      return;
    }
    if (form.publishMode === 'schedule' && form.publishAt) {
      const scheduledDate = new Date(form.publishAt);
      if (scheduledDate <= new Date()) {
        toast.error('Scheduled time must be in the future.');
        return;
      }
    }

    const status: AnnouncementStatus =
      form.publishMode === 'publish'   ? 'published' :
      form.publishMode === 'schedule'  ? 'scheduled' : 'draft';

    const audienceDepartmentIds =
      form.audienceType === 'department' && form.departmentId ? [form.departmentId] : [];

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      audience: (form.audienceType === 'all' ? 'all' : 'department') as Announcement['audience'],
      audienceDepartmentIds,
      status,
      theme: form.theme,
      templateType: form.templateType || undefined,
      publishAt: form.publishMode === 'schedule' && form.publishAt
        ? new Date(form.publishAt).toISOString()
        : undefined,
      createdByName: 'Admin',
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success('Announcement updated', payload.title);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(
          status === 'published' ? 'Announcement published' :
          status === 'scheduled' ? 'Announcement scheduled' : 'Draft saved',
          payload.title,
        );
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      toast.error('Could not save the announcement', err?.message || 'Unknown error');
    }
  };

  const handleStatusChange = async (announcement: Announcement, status: AnnouncementStatus) => {
    try {
      await statusMutation.mutateAsync({ id: announcement.id, status });
      toast.success(
        status === 'published' ? 'Announcement published' :
        status === 'archived' ? 'Announcement archived' : 'Announcement updated',
        announcement.title,
      );
    } catch (err: any) {
      toast.error('Could not update the announcement', err?.message || 'Unknown error');
    }
  };

  const handlePin = async (announcement: Announcement) => {
    try {
      await pinMutation.mutateAsync({ id: announcement.id, isPinned: !announcement.isPinned });
      toast.success(
        announcement.isPinned ? 'Announcement unpinned' : 'Announcement pinned',
        announcement.title,
      );
    } catch (err: any) {
      toast.error('Could not update the pin state', err?.message || 'Unknown error');
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const announcement = announcements.find(a => a.id === pendingAction.id);
    try {
      if (pendingAction.action === 'archive') {
        await statusMutation.mutateAsync({ id: pendingAction.id, status: 'archived' });
        toast.success('Announcement archived', 'It is no longer shown to employees.');
      } else {
        await deleteMutation.mutateAsync(pendingAction.id);
        toast.success('Announcement deleted', announcement?.title);
      }
      setPendingAction(null);
    } catch (err: any) {
      toast.error(
        pendingAction.action === 'archive' ? 'Could not archive the announcement' : 'Could not delete the announcement',
        err?.message || 'Unknown error',
      );
    }
  };

  const departmentName = (announcement: Announcement): string => {
    if (announcement.audience === 'all') return 'All Employees';
    const id = announcement.audienceDepartmentIds?.[0];
    const department = departments.find(d => d.id === id);
    return department?.name ?? 'Department';
  };

  // ─── Announcement card ────────────────────────────────────

  const AnnouncementCard = ({ ann }: { ann: Announcement }) => {
    const theme = ann.theme ?? 'none';
    const accent = THEME_ACCENT[theme];
    const hasImage = !!THEME_IMAGES[theme];
    const emoji = THEME_EMOJI[theme] ?? '';
    const themeName = THEME_OPTIONS.find(t => t.value === theme)?.label ?? theme;

    return (
      <div className={`card overflow-hidden hover:shadow-card transition-shadow border ${accent.border}`}>
        {/* Decorative artwork banner */}
        {hasImage && <AccentBanner theme={theme} heightClass="h-20" />}

        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                ann.status === 'published' ? accent.icon :
                ann.status === 'scheduled' ? 'bg-amber-50' : 'bg-slate-100'
              }`}>
                <Megaphone className={`w-4 h-4 ${
                  ann.status === 'published' ? accent.iconText :
                  ann.status === 'scheduled' ? 'text-amber-600' : 'text-slate-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {ann.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                      <Pin className="w-3 h-3" /> Pinned
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-slate-900">
                    {emoji ? `${emoji} ` : ''}{ann.title}
                  </h3>
                  <Badge status={ann.status} />
                  {theme !== 'none' && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${accent.badge}`}>
                      {themeName}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    {ann.audience === 'all'
                      ? <><Globe className="w-3 h-3" /> All Employees</>
                      : <><Building2 className="w-3 h-3" /> {departmentName(ann)}</>}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{ann.body}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {ann.createdByName ? `${ann.createdByName} · ` : ''}{formatDateTime(ann.createdAt)}
                  {ann.publishAt ? ` · Publishes ${formatDateTime(ann.publishAt)}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {ann.status === 'published' && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={ann.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  aria-label={ann.isPinned ? `Unpin ${ann.title}` : `Pin ${ann.title}`}
                  onClick={() => handlePin(ann)}
                  title={ann.isPinned ? 'Unpin' : 'Pin to top'}
                />
              )}
              {ann.status !== 'published' && ann.status !== 'archived' && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                  aria-label={`Publish ${ann.title}`}
                  onClick={() => handleStatusChange(ann, 'published')}
                  title="Publish now"
                />
              )}
              {ann.status === 'archived' && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                  aria-label={`Restore ${ann.title}`}
                  onClick={() => handleStatusChange(ann, 'draft')}
                  title="Restore to Draft"
                >
                  Restore
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Edit className="w-3.5 h-3.5" />}
                aria-label={`Edit ${ann.title}`}
                onClick={() => openEdit(ann)}
              />
              {ann.status !== 'archived' && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Archive className="w-3.5 h-3.5" />}
                  aria-label={`Archive ${ann.title}`}
                  onClick={() => setPendingAction({ id: ann.id, action: 'archive' })}
                  title="Archive"
                />
              )}
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                aria-label={`Delete ${ann.title}`}
                onClick={() => setPendingAction({ id: ann.id, action: 'delete' })}
                title="Delete permanently"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Publish company-wide and department announcements</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          New Announcement
        </Button>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={id => setActiveTab(id as typeof activeTab)} />

      {announcementsQuery.isLoading ? (
        <LoadingState label="Loading announcements…" />
      ) : announcementsQuery.error ? (
        <ErrorState
          error={announcementsQuery.error}
          title="Could not load the announcements"
          onRetry={() => announcementsQuery.refetch()}
        />
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <Megaphone className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No {activeTab} announcements</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Keep your team informed with company updates.</p>
              {activeTab === 'published' && (
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                  Create Announcement
                </Button>
              )}
            </div>
          ) : filtered.map(ann => <AnnouncementCard key={ann.id} ann={ann} />)}
        </div>
      )}

      {/* ─── Create / Edit modal ─────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? 'Edit Announcement' : 'New Announcement'}
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-slate-400">
              {form.publishMode === 'publish'  ? '📢 Will be published immediately' :
               form.publishMode === 'schedule' && form.publishAt
                 ? `⏰ Scheduled for ${new Date(form.publishAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
                 : form.publishMode === 'schedule'
                 ? '⏰ Pick a date & time below'
                 : '📝 Will be saved as a draft'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setModalOpen(false); setEditing(null); }}>Cancel</Button>
              <Button
                isLoading={createMutation.isPending || updateMutation.isPending}
                onClick={handleSubmit}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                {editing
                  ? 'Save Changes'
                  : form.publishMode === 'publish'
                  ? 'Publish Now'
                  : form.publishMode === 'schedule'
                  ? 'Schedule'
                  : 'Save as Draft'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Template picker */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => setShowTemplates(p => !p)}
            >
              Use Template
            </Button>
            {form.templateType && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Template: {TEMPLATES.find(t => t.id === form.templateType)?.label ?? form.templateType}
              </span>
            )}
          </div>

          {showTemplates && (
            <div className="border border-slate-200 rounded-xl p-3 space-y-1.5 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 mb-2">Select a template to pre-fill the form:</p>
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-white hover:shadow-sm transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <Input
            label="Title *"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Office Closure — Diwali Holiday"
          />
          <TextArea
            label="Content *"
            value={form.body}
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            rows={6}
            placeholder="Write your announcement here…"
          />

          {/* Audience selector — fixed: two separate fields */}
          <Select
            label="Audience"
            value={form.audienceType}
            onChange={e => setForm(p => ({
              ...p,
              audienceType: e.target.value as 'all' | 'department',
              departmentId: e.target.value === 'all' ? '' : p.departmentId,
            }))}
            options={[
              { value: 'all', label: '🌐 All Employees' },
              { value: 'department', label: '🏢 Specific Department' },
            ]}
          />
          {form.audienceType === 'department' && (
            <Select
              label="Department *"
              value={form.departmentId}
              onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
              options={[
                { value: '', label: '— Select a department —' },
                ...departments.map(d => ({ value: d.id, label: d.name })),
              ]}
            />
          )}

          {/* Publish mode selector */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Publishing</p>
            <div className="grid grid-cols-3 gap-2">

              {/* Publish Now */}
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, publishMode: 'publish', publishAt: '' }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                  form.publishMode === 'publish'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-tight">Publish Now</span>
                <span className="text-[10px] opacity-70 leading-tight">Go live immediately</span>
              </button>

              {/* Save as Draft */}
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, publishMode: 'draft', publishAt: '' }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                  form.publishMode === 'draft'
                    ? 'border-slate-500 bg-slate-50 text-slate-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-tight">Save Draft</span>
                <span className="text-[10px] opacity-70 leading-tight">Not visible yet</span>
              </button>

              {/* Schedule */}
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, publishMode: 'schedule' }))}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                  form.publishMode === 'schedule'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <Globe className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-tight">Schedule</span>
                <span className="text-[10px] opacity-70 leading-tight">Pick a date &amp; time</span>
              </button>

            </div>

            {/* Date/time picker — only shown in Schedule mode */}
            {form.publishMode === 'schedule' && (
              <div className="pt-1">
                <Input
                  type="datetime-local"
                  label="Publish date & time (IST)"
                  value={form.publishAt}
                  onChange={e => setForm(p => ({ ...p, publishAt: e.target.value }))}
                />
                {!form.publishAt && (
                  <p className="text-[11px] text-amber-600 mt-1 pl-0.5">
                    ⚠ A date and time is required to schedule.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Theme picker — image-based, no heading */}
          <ThemePicker
            value={form.theme}
            onChange={v => setForm(p => ({ ...p, theme: v }))}
          />
        </div>
      </Modal>

      {/* ─── Archive / delete confirmation ───────────────────── */}
      <Modal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        title={pendingAction?.action === 'delete' ? 'Delete announcement?' : 'Archive announcement?'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingAction(null)}>Cancel</Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending || statusMutation.isPending}
              onClick={handleConfirmAction}
            >
              {pendingAction?.action === 'delete' ? 'Delete' : 'Archive'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {pendingAction?.action === 'delete'
            ? 'This permanently removes the announcement from employee-facing views and the admin list. This cannot be undone.'
            : 'Archived announcements are no longer shown to employees. You can restore them from the Archived tab.'}
        </p>
      </Modal>
    </div>
  );
};
