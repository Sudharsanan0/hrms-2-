import React from 'react';
import { cn } from '../../lib/utils';

interface Tab { id: string; label: string; badge?: number; }

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => (
  <div className={cn('flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-hide', className)}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap',
          activeTab === tab.id
            ? 'border-brand-600 text-brand-700'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
        )}
      >
        {tab.label}
        {tab.badge !== undefined && tab.badge > 0 && (
          <span className={cn(
            'text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center',
            activeTab === tab.id ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
          )}>
            {tab.badge > 99 ? '99+' : tab.badge}
          </span>
        )}
      </button>
    ))}
  </div>
);
