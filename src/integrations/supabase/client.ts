import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL_RAW = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY_RAW = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_URL = SUPABASE_URL_RAW;
const SUPABASE_PUBLISHABLE_KEY = SUPABASE_KEY_RAW;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.'
  );
}

const customStorage = localStorage;

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const errorInterceptor = (...args: unknown[]) => {
  const fullErrorStr = args.map(String).join(' ');

  if (fullErrorStr.includes('Invalid Refresh Token') ||
    fullErrorStr.includes('Refresh Token Not Found') ||
    (fullErrorStr.includes('AuthApiError') && fullErrorStr.includes('refresh'))) {
    // Silently ignore to prevent race conditions during fast logins
    return;
  }
  originalConsoleError.apply(console, args);
};

const warnInterceptor = (...args: unknown[]) => {
  const fullWarnStr = args.map(String).join(' ');
  if (fullWarnStr.includes('Invalid Refresh Token') || fullWarnStr.includes('Refresh Token Not Found')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

console.error = errorInterceptor;
console.warn = warnInterceptor;
setTimeout(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}, 10000);

let supabaseClient;
try {
  supabaseClient = createClient<Database>(
    SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_PUBLISHABLE_KEY || 'placeholder',
    {
      auth: {
        storage: customStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,  // 🔥 CRITICAL: Enable automatic hash detection
        flowType: 'pkce'  // 🔥 CRITICAL: Use PKCE flow for better security
      }
    });

  // Set up error handler for refresh token errors - handle silently
  supabaseClient.auth.onAuthStateChange((event, session) => {
    // Handle token refresh failures silently
    if (event === 'TOKEN_REFRESHED' && !session) {
      console.warn('⚠️ [client.ts] Token refresh failed, signing out');
      supabaseClient.auth.signOut().catch((err) => {
        console.warn('[Supabase] Failed to sign out during token refresh cleanup', err);
      });
    }
  });

  // Handle initialization errors silently
  supabaseClient.auth.getSession().then(({ error }) => {
    if (error && (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found'))) {
      console.warn('⚠️ [client.ts] Invalid refresh token on startup');
      // We do not call signOut() here to prevent race conditions with new logins
    }
  }).catch((err) => {
    console.warn('[Supabase] Failed to get session during init', err);
  });

} catch (error) {
  console.warn('Supabase client failed to initialize:', error);
  supabaseClient = createClient(
    'https://placeholder.supabase.co',
    'placeholder',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
export const supabase = supabaseClient;
