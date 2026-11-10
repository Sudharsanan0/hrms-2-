import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { greetingIST, todayLabelIST } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';

interface TopNavbarProps {
  onMenuClick: () => void;
  pageTitle?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onMenuClick }) => {
  const { user, role } = useAuth();

  const greeting = greetingIST();
  const announcementsPath = role === 'admin' ? '/admin/announcements' : '/employee/announcements';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-900">
            {greeting}, {user?.name?.split(' ')[0] || 'there'} 👋
          </p>
          <p className="text-xs text-slate-400">
            {todayLabelIST()}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Link
          to={announcementsPath}
          aria-label="Announcements"
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <Avatar name={user?.name || 'U'} size="sm" />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-400 leading-tight capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
