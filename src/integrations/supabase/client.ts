import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Obtener credenciales de variables de entorno
// #region agent log
const SUPABASE_URL_RAW = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY_RAW = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// fetch('http://127.0.0.1:7242/ingest/...')
// #endregion
const SUPABASE_URL = SUPABASE_URL_RAW;
const SUPABASE_PUBLISHABLE_KEY = SUPABASE_KEY_RAW;

// #region agent log
// fetch('http://127.0.0.1:7242/ingest/...')
// #endregion

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // #region agent log
  // fetch('http://127.0.0.1:7242/ingest/...')
  // #endregion
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.'
  );
}

// #region agent log
fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:25',message:'Before createClient',data:{urlIsValid:SUPABASE_URL?.startsWith('http'),urlLength:SUPABASE_URL?.length,keyLength:SUPABASE_PUBLISHABLE_KEY?.length,urlValue:SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion

// Usamos localStorage por defecto para persistencia robusta
// Eliminamos la lógica condicional que causaba pérdida de sesión en magic links
const customStorage = localStorage;

// #region agent log
// Check localStorage for Supabase tokens before creating client
// const supabaseStorageKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'));
// fetch('http://127.0.0.1:7242/ingest/...')
// #endregion

// Intercept and suppress refresh token errors during initialization
// This prevents console errors when Supabase tries to refresh invalid tokens
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const errorInterceptor = (...args: unknown[]) => {
  const fullErrorStr = args.map(String).join(' ');
  
  // Check if this is a refresh token error
  if (fullErrorStr.includes('Invalid Refresh Token') || 
      fullErrorStr.includes('Refresh Token Not Found') ||
      (fullErrorStr.includes('AuthApiError') && fullErrorStr.includes('refresh'))) {
    // #region agent log
    // fetch('http://127.0.0.1:7242/ingest/...')
    // #endregion
    // Clear invalid tokens silently
    const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.startsWith('sb-'));
    supabaseKeys.forEach(key => localStorage.removeItem(key));
    // Suppress the error - don't log to console
    return;
  }
  // Log other errors normally
  originalConsoleError.apply(console, args);
};

const warnInterceptor = (...args: unknown[]) => {
  const fullWarnStr = args.map(String).join(' ');
  // Suppress refresh token warnings too
  if (fullWarnStr.includes('Invalid Refresh Token') || fullWarnStr.includes('Refresh Token Not Found')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Intercept errors during initial load (first 10 seconds to catch async errors)
console.error = errorInterceptor;
console.warn = warnInterceptor;
setTimeout(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}, 10000);

// #region agent log
let supabaseClient;
try {
  supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: customStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  
  // Set up error handler for refresh token errors - handle silently
  supabaseClient.auth.onAuthStateChange((event, session) => {
    // #region agent log
    // fetch('http://127.0.0.1:7242/ingest/...')
    // #endregion
    
    // Handle token refresh failures silently
    if (event === 'TOKEN_REFRESHED' && !session) {
      // #region agent log
      // fetch('http://127.0.0.1:7242/ingest/...')
      // #endregion
      // Clear invalid session silently
      supabaseClient.auth.signOut().catch(() => {
        // Ignore errors during cleanup
      });
    }
  });
  
  // Handle initialization errors silently - clear invalid tokens on startup
  supabaseClient.auth.getSession().then(({ error }) => {
    if (error && (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found'))) {
      // #region agent log
      // fetch('http://127.0.0.1:7242/ingest/...')
      // #endregion
      // Clear all Supabase-related localStorage items
      const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.startsWith('sb-'));
      supabaseKeys.forEach(key => localStorage.removeItem(key));
      supabaseClient.auth.signOut().catch(() => {
        // Ignore errors during cleanup
      });
    }
  }).catch(() => {
    // Ignore initialization errors - they're handled above
  });
  
  fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:58',message:'createClient succeeded',data:{success:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
  // fetch('http://127.0.0.1:7242/ingest/...')
} catch (error) {
  // fetch('http://127.0.0.1:7242/ingest/...')
  throw error;
}
export const supabase = supabaseClient;
// #endregion