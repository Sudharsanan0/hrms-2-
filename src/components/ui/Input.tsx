import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-') || generatedId}`;
    return (
      <div className={cn('w-full', className)}>
        {label && <label htmlFor={inputId} className="form-label">{label}</label>}
        <div className="relative w-full">
          {leftIcon && (
            <div className="absolute left-3 top-0 bottom-0 flex items-center text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'form-input w-full',
              leftIcon && 'pl-9',
              error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, id, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || `ta-${label?.toLowerCase().replace(/\s+/g, '-') || generatedId}`;
    return (
      <div className={cn('w-full', className)}>
        {label && <label htmlFor={inputId} className="form-label">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            'form-input w-full resize-none',
            error && 'border-rose-400'
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';
