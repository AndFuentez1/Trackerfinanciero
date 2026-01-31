import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    // Check session first
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        // If refresh token error, clear invalid session
        if (error && (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found'))) {
          // Clear all Supabase-related localStorage items
          const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.startsWith('sb-'));
          supabaseKeys.forEach(key => localStorage.removeItem(key));
          await supabase.auth.signOut();
        }

        if (!ignore) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        if (!ignore) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {


        if (!ignore) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOtp = async (email: string, rememberMe: boolean = true) => {
    localStorage.setItem('sb_remember_me', rememberMe.toString());

    // ⚠️ CRITICAL: Supabase magic link callback handler
    // El redirect URL DEBE SER EXACTO - sin "/" final, sin "/auth", solo el origin
    const origin = window.location.origin;




    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // NO cambiar esta URL - debe ser EXACTA a como está en Allowed Redirect URLs
        // Supabase agrega automáticamente los parámetros #access_token=...
        emailRedirectTo: origin,
      },
    });

    if (error) {

    }

    return { error };
  };

  const signInWithPassword = async (email: string, password: string, rememberMe: boolean = true) => {
    localStorage.setItem('sb_remember_me', rememberMe.toString());
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && error.message.includes('Email not confirmed')) {
      return { error: { ...error, code: 'email_not_confirmed' } };
    }

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    localStorage.removeItem('sb_remember_me');
    return { error };
  };

  return {
    user,
    session,
    loading,
    signInWithOtp,
    signInWithPassword,
    signOut,
  };
}