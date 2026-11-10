import React from 'react';
import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  xs:  'w-6 h-6 text-[9px]',
  sm:  'w-8 h-8 text-[11px]',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-base',
};

const COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizes[size], className)}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold flex-shrink-0', sizes[size], colorFor(name), className)}>
      {getInitials(name)}
    </div>
  );
};
