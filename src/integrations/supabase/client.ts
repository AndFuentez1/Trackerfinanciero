import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Ponemos los valores directamente para desbloquear la app
const SUPABASE_URL = "https://pcdwjaxsfirliwnnikff.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHdqYXhzZmlybGl3bm5pa2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODAzNTEsImV4cCI6MjA4MzY1NjM1MX0.rEypN7dCKrAU9EBC55wl6BjziL0U2jqE-hh3Rd23RUg";

// Custom storage handler to support "Remember Me"
const customStorage = {
  getItem: (key: string) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    const rememberMe = localStorage.getItem('sb_remember_me') === 'true';
    if (rememberMe) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});