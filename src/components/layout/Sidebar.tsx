import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, FileText,
  Megaphone, Settings, LogOut, UserCircle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const ADMIN_NAV: NavItem[] = [
  { path: '/admin/dashboard',     label: 'Dashboard',     icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { path: '/admin/employees',     label: 'Employees',     icon: <Users className="w-[18px] h-[18px]" /> },
  { path: '/admin/attendance',    label: 'Attendance',    icon: <CalendarCheck className="w-[18px] h-[18px]" /> },
  { path: '/admin/payslips',      label: 'Payslips',      icon: <FileText className="w-[18px] h-[18px]" /> },
  { path: '/admin/announcements', label: 'Announcements', icon: <Megaphone className="w-[18px] h-[18px]" /> },
  { path: '/admin/settings',      label: 'Settings',      icon: <Settings className="w-[18px] h-[18px]" /> },
];

const EMPLOYEE_NAV: NavItem[] = [
  { path: '/employee/dashboard',     label: 'Dashboard',     icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { path: '/employee/attendance',    label: 'Attendance',    icon: <CalendarCheck className="w-[18px] h-[18px]" /> },
  { path: '/employee/payslips',      label: 'Payslips',      icon: <FileText className="w-[18px] h-[18px]" /> },
  { path: '/employee/announcements', label: 'Announcements', icon: <Megaphone className="w-[18px] h-[18px]" /> },
  { path: '/employee/profile',       label: 'My Profile',    icon: <UserCircle className="w-[18px] h-[18px]" /> },
];

interface SidebarProps {
  onLinkClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLinkClick }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="sidebar-gradient w-64 h-full flex flex-col">
      {/* ─── Brand Logo ─────────────────────────── */}
      <div className="px-5 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/clixhora-logo.png"
            alt="Clixhora"
            className="w-9 h-9 rounded-lg object-contain bg-white/10 p-0.5"
          />
          <div>
            <p className="text-white font-bold text-[13px] leading-tight tracking-wide">Clixhora</p>
            <p className="text-white/40 text-[10px] leading-tight">HRMS Portal</p>
          </div>
        </div>
      </div>

      {/* ─── Section Label ──────────────────────── */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-[10px] font-bold tracking-[0.12em] text-white/30 uppercase">
          {role === 'admin' ? 'Admin Panel' : 'My Portal'}
        </span>
      </div>

      {/* ─── Navigation ─────────────────────────── */}
      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onLinkClick}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/80'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn(
                  'flex items-center justify-center w-5 h-5 shrink-0',
                  isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ─── User Footer ────────────────────────── */}
      <div className="px-3 pb-4 pt-3 border-t border-white/8 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">{user?.name || 'User'}</p>
            <p className="text-white/35 text-[10px] truncate leading-tight">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full mt-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/40 hover:text-white hover:bg-white/8 text-xs font-medium transition-all"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
