import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectOption { value: string; label: string; }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-') || generatedId}`;
    return (
      <div className={cn('w-full', className)}>
        {label && <label htmlFor={inputId} className="form-label">{label}</label>}
        <div className="relative w-full">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'form-input appearance-none pr-9 cursor-pointer w-full',
              error && 'border-rose-400'
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-3 top-0 bottom-0 flex items-center pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
