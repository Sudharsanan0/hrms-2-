import React from 'react';
import { AlertTriangle, Database, FlaskConical, ShieldAlert } from 'lucide-react';
import { dataSourceMode, isDemoMode, supabaseConfigIssues } from '../../lib/supabase';

/**
 * A single, explicit banner that describes where the data currently comes
 * from. It never claims that data was saved to Supabase when it was not.
 */
export const DataSourceBanner: React.FC<{ className?: string }> = ({ className }) => {
  if (dataSourceMode === 'supabase') {
    return (
      <div className={`p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-700 ${className ?? ''}`}>
        <Database className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold">Connected to Supabase</p>
          <p className="mt-0.5">Employee, attendance and payroll records are read from and written to the database.</p>
        </div>
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className={`p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-700 ${className ?? ''}`}>
        <FlaskConical className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold">Demo Mode — development only</p>
          <p className="mt-0.5">
            Supabase is not configured, so the app uses clearly-labelled demo records kept in this browser only
            (<code className="bg-amber-100 px-1 py-0.5 rounded">localStorage</code>). These records are{' '}
            <strong>not</strong> saved to Supabase and must never be treated as real employee data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 ${className ?? ''}`}>
      <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-semibold">Supabase is not configured — persistence is unavailable</p>
        <p className="mt-0.5">Add the following to a <code className="bg-rose-100 px-1 py-0.5 rounded">.env</code> file in the project root and restart the dev server:</p>
        <ul className="mt-1.5 space-y-0.5 font-mono text-[11px]">
          <li>VITE_SUPABASE_URL=https://&lt;project-ref&gt;.supabase.co</li>
          <li>VITE_SUPABASE_ANON_KEY=&lt;anon / publishable key&gt;</li>
        </ul>
        {supabaseConfigIssues.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
            {supabaseConfigIssues.map(issue => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const InlineSetupNotice: React.FC = () => (
  <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
    <span>Demo data — stored in this browser only, never written to Supabase.</span>
  </div>
);
