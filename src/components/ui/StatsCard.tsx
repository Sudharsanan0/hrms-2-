import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title, value, description, icon, iconBg = 'bg-brand-50 text-brand-600', trend, trendLabel, onClick
}) => (
  <div
    className={cn('card p-4 flex items-start gap-4', onClick && 'cursor-pointer hover:shadow-card transition-shadow')}
    onClick={onClick}
  >
    {icon && (
      <div className={cn('p-2.5 rounded-xl flex-shrink-0', iconBg)}>
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide truncate">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      {trendLabel && (
        <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium',
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-400'
        )}>
          {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> :
           trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
           <Minus className="w-3.5 h-3.5" />}
          {trendLabel}
        </div>
      )}
    </div>
  </div>
);
