import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Ponemos los valores directamente para desbloquear la app
const SUPABASE_URL = "https://pcdwjaxsfirliwnnikff.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZHdqYXhzZmlybGl3bm5pa2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODAzNTEsImV4cCI6MjA4MzY1NjM1MX0.rEypN7dCKrAU9EBC55wl6BjziL0U2jqE-hh3Rd23RUg";

// Usamos localStorage por defecto para persistencia robusta
// Eliminamos la lógica condicional que causaba pérdida de sesión en magic links
const customStorage = localStorage;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});