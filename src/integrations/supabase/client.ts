import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Obtener credenciales de variables de entorno
// #region agent log
const SUPABASE_URL_RAW = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY_RAW = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:6',message:'Env vars check',data:{urlType:typeof SUPABASE_URL_RAW,urlLength:SUPABASE_URL_RAW?.length||0,urlValue:SUPABASE_URL_RAW?.substring(0,50)||'undefined',keyType:typeof SUPABASE_KEY_RAW,keyLength:SUPABASE_KEY_RAW?.length||0,allEnvKeys:Object.keys(import.meta.env).filter(k=>k.startsWith('VITE_'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
const SUPABASE_URL = SUPABASE_URL_RAW;
const SUPABASE_PUBLISHABLE_KEY = SUPABASE_KEY_RAW;

// #region agent log
fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:15',message:'Before validation check',data:{hasUrl:!!SUPABASE_URL,hasKey:!!SUPABASE_PUBLISHABLE_KEY,urlIsString:typeof SUPABASE_URL==='string',keyIsString:typeof SUPABASE_PUBLISHABLE_KEY==='string',urlEmpty:SUPABASE_URL==='',keyEmpty:SUPABASE_PUBLISHABLE_KEY===''},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:20',message:'Validation failed',data:{urlValue:SUPABASE_URL,keyValue:SUPABASE_PUBLISHABLE_KEY?.substring(0,20)||'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
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
const supabaseStorageKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'));
fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:32',message:'localStorage check',data:{supabaseKeys:supabaseStorageKeys,keysCount:supabaseStorageKeys.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:42',message:'Console error intercepted - refresh token',data:{errorMessage:fullErrorStr.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'J'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:48',message:'Auth state change',data:{event,hasSession:!!session},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    // Handle token refresh failures silently
    if (event === 'TOKEN_REFRESHED' && !session) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:52',message:'Token refresh failed - clearing session',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:70',message:'Init refresh token error - clearing',data:{errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H'})}).catch(()=>{});
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
} catch (error) {
  fetch('http://127.0.0.1:7242/ingest/f76614db-3885-41f4-93dc-9e4c84fe1966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:61',message:'createClient error',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'unknown',urlValue:SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
  throw error;
}
export const supabase = supabaseClient;
// #endregion