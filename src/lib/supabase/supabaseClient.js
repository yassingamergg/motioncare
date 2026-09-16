import { createClient } from '@supabase/supabase-js';

const getEnvOrStored = (envKey, storedKey) => {
  const envVal = typeof import.meta !== 'undefined' && import.meta.env?.[envKey];
  if (envVal && !envVal.includes('your-project') && !envVal.includes('your-anon')) return envVal;
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem(storedKey) || '';
    }
  } catch {
    // Safe fallback for non-browser/test runtimes
  }
  return '';
};

export function getSupabaseConfig() {
  const url = getEnvOrStored('VITE_SUPABASE_URL', 'motioncare_supabase_url');
  const anonKey = getEnvOrStored('VITE_SUPABASE_ANON_KEY', 'motioncare_supabase_key');
  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('http') &&
    !url.includes('your-project')
  );
  return { url, anonKey, isConfigured };
}

export function getSupabaseClient() {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  try {
    return createClient(url, anonKey);
  } catch (err) {
    console.error('[MotionCare] Error initializing Supabase client:', err);
    return null;
  }
}

// Initial exports
const initialConfig = getSupabaseConfig();
export const isSupabaseConfigured = initialConfig.isConfigured;
export const supabase = getSupabaseClient();
