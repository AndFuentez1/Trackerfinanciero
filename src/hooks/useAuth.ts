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
      const { data: { session } } = await supabase.auth.getSession();
      if (!ignore) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
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
    let redirectUrl = window.location.origin;
    if (!redirectUrl.startsWith('http')) {
      redirectUrl = `https://${redirectUrl}`;
    }
    redirectUrl = `${redirectUrl}/`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
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