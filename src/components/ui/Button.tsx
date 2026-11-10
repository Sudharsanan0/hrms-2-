import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon,
  className, children, disabled, ...props
}) => {
  const base = [
    'inline-flex items-center justify-center gap-1.5',
    'font-semibold rounded-lg whitespace-nowrap',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'select-none',
  ].join(' ');

  const variants: Record<string, string> = {
    primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-500 shadow-sm',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400',
    outline:   'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus-visible:ring-slate-400',
    ghost:     'text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
    danger:    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-sm',
  };

  const sizes: Record<string, string> = {
    sm:  'text-xs  px-3  h-8  min-w-[2rem]',
    md:  'text-sm  px-4  h-9  min-w-[2.25rem]',
    lg:  'text-sm  px-5  h-11 min-w-[2.75rem]',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="spinner-sm" />
      ) : leftIcon ? (
        <span className="flex items-center justify-center shrink-0">{leftIcon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon && (
        <span className="flex items-center justify-center shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};
