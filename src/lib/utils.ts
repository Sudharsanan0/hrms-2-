import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ─── CSS class utility ───────────────────────────────────────
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

// ─── Currency Formatting ─────────────────────────────────────
/**
 * Format a number as Indian Rupee — ₹1,23,456.00
 */
export const formatCurrency = (amount: number | undefined | null, showPaise = false): string => {
  if (amount === undefined || amount === null) return '₹0';
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  }).format(amount);
  return formatted;
};

// ─── Date Formatting ─────────────────────────────────────────
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format a date string as "21 Oct 2026"
 */
export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: IST_TIMEZONE,
    });
  } catch {
    return dateStr;
  }
};

/**
 * Format a UTC ISO timestamp as "21 Oct 2026, 09:30 AM" in IST
 */
export const formatDateTime = (isoStr: string | undefined | null): string => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: IST_TIMEZONE,
    });
  } catch {
    return isoStr;
  }
};

/**
 * Format a UTC ISO timestamp as "09:30 AM" in IST
 */
export const formatTime = (isoStr: string | undefined | null): string => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: IST_TIMEZONE,
    });
  } catch {
    return isoStr;
  }
};

/**
 * Get YYYY-MM string from a Date or today
 */
export const toYYYYMM = (d?: Date): string => {
  const date = d || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/**
 * Get today's date in YYYY-MM-DD format (IST)
 */
export const todayIST = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE }); // YYYY-MM-DD
};

/**
 * Long human readable "today" label, e.g. "Thursday, 22nd October 2026" (IST).
 * Kept here so components never read the clock during render.
 */
export const todayLabelIST = (): string => {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: IST_TIMEZONE,
  });
};

/**
 * Time-of-day greeting based on the IST clock (hour < 12 / < 17 / else).
 */
export const greetingIST = (): string => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      hourCycle: 'h23',
      timeZone: IST_TIMEZONE,
    }).format(new Date()),
  );
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

/**
 * Convert a payroll month string "YYYY-MM" to display like "October 2026"
 */
export const formatPayrollMonth = (yyyyMM: string): string => {
  if (!yyyyMM || !yyyyMM.includes('-')) return yyyyMM;
  const [year, month] = yyyyMM.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

/**
 * Get number of calendar days in a month
 */
export const daysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

/**
 * Check if a given date is a Sunday (or other configured weekly off)
 */
export const isWeeklyOff = (date: Date, weeklyOffDays: string[] = ['Sunday']): boolean => {
  const dayName = date.toLocaleDateString('en-IN', { weekday: 'long', timeZone: IST_TIMEZONE });
  return weeklyOffDays.includes(dayName);
};

// ─── String Utilities ────────────────────────────────────────

export const capitalize = (str: string): string =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Mask sensitive information — show last 4 chars only
 */
export const maskSensitive = (value: string | undefined | null, showChars = 4): string => {
  if (!value) return '****';
  if (value.length <= showChars) return '*'.repeat(value.length);
  return '*'.repeat(value.length - showChars) + value.slice(-showChars);
};

// ─── Number utilities ────────────────────────────────────────

export const roundToTwo = (n: number): number => Math.round(n * 100) / 100;

/**
 * Safe division to avoid divide-by-zero
 */
export const safeDivide = (numerator: number, denominator: number): number => {
  if (!denominator || denominator === 0) return 0;
  return numerator / denominator;
};

// ─── Color helpers ───────────────────────────────────────────

export const getStatusColor = (status: string): string => {
  const s = status.toLowerCase();
  if (['active', 'present', 'approved', 'published', 'paid'].some(k => s.includes(k)))
    return 'badge-success';
  if (['pending', 'draft', 'processing', 'invited'].some(k => s.includes(k)))
    return 'badge-warning';
  if (['inactive', 'terminated', 'resigned', 'absent', 'rejected', 'failed'].some(k => s.includes(k)))
    return 'badge-error';
  if (['leave', 'holiday', 'weekly_off', 'scheduled'].some(k => s.includes(k)))
    return 'badge-info';
  return 'badge-neutral';
};

export const getAttendanceStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    weekly_off: 'Weekly Off',
    public_holiday: 'Public Holiday',
    paid_leave: 'Paid Leave',
    unpaid_leave: 'Unpaid Leave',
    half_day: 'Half Day',
    work_from_home: 'Work From Home',
    not_marked: 'Not Marked',
  };
  return map[status] || status;
};
