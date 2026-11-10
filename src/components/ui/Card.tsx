import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { noPad?: boolean; }

export const Card: React.FC<CardProps> = ({ className, children, noPad, ...props }) => (
  <div className={cn('bg-white rounded-card border border-slate-200/80 shadow-subtle', !noPad && 'p-5', className)} {...props}>
    {children}
  </div>
);

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export const CardHeader: React.FC<CardHeaderProps> = ({ className, children, ...props }) => (
  <div className={cn('flex items-center justify-between mb-4', className)} {...props}>{children}</div>
);

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export const CardTitle: React.FC<CardTitleProps> = ({ className, children, ...props }) => (
  <h3 className={cn('text-sm font-bold text-slate-900', className)} {...props}>{children}</h3>
);

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export const CardContent: React.FC<CardContentProps> = ({ className, children, ...props }) => (
  <div className={className} {...props}>{children}</div>
);
