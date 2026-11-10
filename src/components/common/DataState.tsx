import React from 'react';
import { AlertTriangle, Database, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Loading…', className }) => (
  <div className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ''}`}>
    <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-slate-400 mt-2">{label}</p>
  </div>
);

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, title = 'Could not load data', onRetry, className }) => {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred.';

  return (
    <div className={`rounded-xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3 ${className ?? ''}`}>
      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-rose-800">{title}</p>
        <p className="text-xs text-rose-700 mt-1 break-words">{message}</p>
        <p className="text-[11px] text-rose-500 mt-1.5">
          This is a data loading failure — the numbers below are not updated.
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-3" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
};

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  message,
  icon,
  action,
  className,
}) => (
  <div className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ''}`}>
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
      {icon ?? <Inbox className="w-6 h-6 text-slate-300" />}
    </div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {message && <p className="text-xs text-slate-400 mt-1 max-w-sm">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

interface DataBoundaryProps {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  loadingLabel?: string;
  errorTitle?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}

/**
 * Renders exactly one of: loading / error / empty / content.
 * A failed request is NEVER rendered as an empty (successful) state.
 */
export const DataBoundary: React.FC<DataBoundaryProps> = ({
  isLoading,
  error,
  isEmpty,
  loadingLabel = 'Loading…',
  errorTitle = 'Could not load data',
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyIcon,
  onRetry,
  children,
}) => {
  if (isLoading) return <LoadingState label={loadingLabel} />;
  if (error) return <ErrorState error={error} title={errorTitle} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState title={emptyTitle} message={emptyMessage} icon={emptyIcon} />;
  return <>{children}</>;
};

export const DatabaseIcon = () => <Database className="w-4 h-4" />;

interface TableDataBoundaryProps {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  loadingLabel?: string;
  errorTitle?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRetry?: () => void;
  colSpan: number;
  children: React.ReactNode;
}

/**
 * Same contract as `DataBoundary`, but the non-content states are rendered
 * as table rows so the markup stays valid inside a `<tbody>`.
 */
export const TableDataBoundary: React.FC<TableDataBoundaryProps> = ({
  isLoading,
  error,
  isEmpty,
  loadingLabel = 'Loading…',
  errorTitle = 'Could not load data',
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyIcon,
  onRetry,
  colSpan,
  children,
}) => {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-4">
          <LoadingState label={loadingLabel} />
        </td>
      </tr>
    );
  }
  if (error) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-4">
          <ErrorState error={error} title={errorTitle} onRetry={onRetry} />
        </td>
      </tr>
    );
  }
  if (isEmpty) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-4">
          <EmptyState title={emptyTitle} message={emptyMessage} icon={emptyIcon} />
        </td>
      </tr>
    );
  }
  return <>{children}</>;
};
