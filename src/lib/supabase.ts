import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Clixhora HRMS — Supabase client + environment configuration
//
// Frontend variables (Vite):
//   VITE_SUPABASE_URL               https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY          legacy anon (public) key   [optional if publishable key used]
//   VITE_SUPABASE_PUBLISHABLE_KEY   new publishable key        [optional if anon key used]
//
// IMPORTANT: a service-role / secret key must NEVER be placed in a
// VITE_* variable — everything prefixed with VITE_ is shipped to the
// browser. If one is found we ignore it and report it as a configuration
// problem instead of using it.
// ============================================================

const PLACEHOLDER_VALUES = [
  'placeholder',
  'your-project-ref.supabase.co',
  'your-project.supabase.co',
  'your-anon-public-key-here',
  'your-anon-key',
  'your-publishable-key',
  'your_publishable_key',
  'changeme',
  'undefined',
  'null',
];

const isPlaceholder = (value: string | undefined): boolean => {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  if (PLACEHOLDER_VALUES.includes(v)) return true;
  return v.startsWith('https://your-');
};

const readEnv = (key: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const supabaseUrl = readEnv('VITE_SUPABASE_URL');
export const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY');
export const supabasePublishableKey = readEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

/**
 * The public key actually used by the browser.
 * Supports both the legacy `anon` key and the newer `publishable` key.
 */
export const supabasePublicKey: string | undefined =
  supabasePublishableKey ?? supabaseAnonKey;

export const supabaseKeyType: 'publishable' | 'anon' | 'none' =
  supabasePublishableKey ? 'publishable' : supabaseAnonKey ? 'anon' : 'none';

/** A secret key was found in a public env var — this is a security problem. */
export const serviceRoleKeyLeaked = Boolean(
  readEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || readEnv('VITE_SUPABASE_SERVICE_KEY'),
);

/**
 * Human readable configuration problems. Empty array === fully configured.
 */
export const supabaseConfigIssues: string[] = (() => {
  const issues: string[] = [];
  if (!supabaseUrl || isPlaceholder(supabaseUrl)) {
    issues.push('VITE_SUPABASE_URL is missing (expected: https://<project-ref>.supabase.co).');
  }
  if (!supabasePublicKey || isPlaceholder(supabasePublicKey)) {
    issues.push(
      'VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) is missing — expected the public/anon key from Supabase → Project Settings → API.',
    );
  }
  if (serviceRoleKeyLeaked) {
    issues.push(
      'A service-role/secret key was found in a VITE_* variable. It is ignored for safety — remove it from the frontend environment file immediately.',
    );
  }
  return issues;
})();

/**
 * True only when the project can actually talk to Supabase.
 */
export const isSupabaseConfigured: boolean = supabaseConfigIssues.length === 0;

/**
 * Development-only flag. Demo (in-browser) data may only ever be used in dev.
 */
export const isDevMode: boolean = import.meta.env.DEV === true;

/**
 * Runtime data source.
 *  - 'supabase'  : real, persistent database (production safe)
 *  - 'demo'      : local, clearly-labelled development data (never production)
 *  - 'unconfigured': no backend at all — the UI must show an explicit setup error
 */
export type DataSourceMode = 'supabase' | 'demo' | 'unconfigured';

export const dataSourceMode: DataSourceMode = isSupabaseConfigured
  ? 'supabase'
  : isDevMode
    ? 'demo'
    : 'unconfigured';

/** True when the app is running against the clearly-labelled demo adapter. */
export const isDemoMode: boolean = dataSourceMode === 'demo';

/**
 * The Supabase client. It is created lazily-safe so that importing this module
 * never throws when the project is not configured.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublicKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
);

/**
 * Generate a short-lived signed URL for a private storage path.
 * Used for payslip downloads — never expose direct public URLs.
 */
export const getSignedUrl = async (bucket: string, path: string, expiresIn = 60): Promise<string | null> => {
  if (!isSupabaseConfigured || !path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};
