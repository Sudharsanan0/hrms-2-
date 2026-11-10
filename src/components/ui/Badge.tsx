import React from 'react';
import { cn, getStatusColor } from '../../lib/utils';

interface BadgeProps {
  children?: React.ReactNode;
  status?: string;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ children, status, className, dot }) => {
  const colorClass = status ? getStatusColor(status) : 'badge-neutral';
  const label = children ?? status ?? '';
  return (
    <span className={cn('badge', colorClass, className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
};

interface AttendanceBadgeProps { status: string; }
export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ status }) => {
  const map: Record<string, string> = {
    present:        'badge-success',
    absent:         'badge-error',
    weekly_off:     'badge-neutral',
    public_holiday: 'badge-info',
    paid_leave:     'badge-info',
    unpaid_leave:   'badge-warning',
    half_day:       'badge-warning',
    work_from_home: 'badge-info',
    not_marked:     'badge-neutral',
  };
  const labels: Record<string, string> = {
    present:        'Present',
    absent:         'Absent',
    weekly_off:     'Weekly Off',
    public_holiday: 'Holiday',
    paid_leave:     'Paid Leave',
    unpaid_leave:   'Unpaid Leave',
    half_day:       'Half Day',
    work_from_home: 'WFH',
    not_marked:     'Not Marked',
  };
  return <span className={cn('badge', map[status] || 'badge-neutral')}>{labels[status] || status}</span>;
};
