import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type SignInWithOtpResult = Awaited<ReturnType<typeof supabase.auth.signInWithOtp>>;
type SignInWithPasswordResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
type SignOutResult = Awaited<ReturnType<typeof supabase.auth.signOut>>;
type AuthErrorWithCode = AuthError & { code?: string };

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithOtp: (email: string, rememberMe?: boolean) => Promise<{ error: SignInWithOtpResult['error'] }>;
    signInWithPassword: (email: string, password: string, rememberMe?: boolean) => Promise<{ data?: SignInWithPasswordResult['data']; error: AuthErrorWithCode | null }>;
    signOut: () => Promise<{ error: SignOutResult['error'] }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {

    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        let oauthTimeout: number | undefined;

        const initAuth = async () => {
            try {
                console.log('🟢 [AuthContext] initAuth started');

                // 🔍 CRITICAL: Check for OAuth hash fragments FIRST
                // When Google/Magic Link redirects, URL contains: #access_token=...&refresh_token=...
                // We need to keep loading=true until onAuthStateChange processes these tokens
                const hash = window.location.hash || '';
                const search = window.location.search || '';
                const hasAuthTokens =
                    hash.includes('access_token') ||
                    hash.includes('refresh_token') ||
                    hash.includes('type=recovery');
                const hasAuthCode = search.includes('code=') || search.includes('error=');

                if (hasAuthTokens || hasAuthCode) {
                    // Don't set loading=false yet - let onAuthStateChange handle it
                    // This prevents App.tsx from evaluating user=null and redirecting to /auth
                    console.log('🔐 [AuthContext] OAuth tokens/code detected in URL, waiting for Supabase to process...');
                    if (hash) {
                        console.log('🔐 [AuthContext] Hash preview:', hash.substring(0, 50) + '...');
                    }
                    oauthTimeout = window.setTimeout(() => {
                        if (!ignore) {
                            console.warn('⚠️ [AuthContext] OAuth processing timeout, continuing without session');
                            setLoading(false);
                        }
                    }, 8000);
                    return;
                }

                console.log('🟢 [AuthContext] No hash tokens, calling getSession()');
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error && (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found'))) {
                    console.warn('⚠️ [AuthContext] Invalid refresh token, clearing storage');
                    const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.startsWith('sb-'));
                    supabaseKeys.forEach(key => localStorage.removeItem(key));
                    await supabase.auth.signOut();
                }

                if (!ignore) {
                    console.log('🟢 [AuthContext] Setting session from getSession:', session?.user?.email || 'null');
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            } catch (err) {
                console.error('❌ [AuthContext] initAuth error:', err);
                if (!ignore) {
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('🔄 [AuthContext] Auth state changed:', event, 'User:', session?.user?.email || 'null');
                if (!ignore) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            }
        );

        return () => {
            console.log('🔴 [AuthContext] Cleanup - unsubscribing');
            ignore = true;
            if (oauthTimeout) {
                clearTimeout(oauthTimeout);
            }
            subscription.unsubscribe();
        };
    }, []);

    const signInWithOtp = useCallback(async (email: string, rememberMe: boolean = true) => {
        localStorage.setItem('sb_remember_me', rememberMe.toString());
        const origin = `${window.location.origin}${import.meta.env.BASE_URL}`;
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: origin },
        });
        return { error };
    }, []);

    const signInWithPassword = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
        localStorage.setItem('sb_remember_me', rememberMe.toString());
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error && error.message.includes('Email not confirmed')) {
            return { error: { ...error, code: 'email_not_confirmed' } };
        }
        return { data, error };
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        localStorage.removeItem('sb_remember_me');
        localStorage.removeItem('lastActiveTime');
        return { error };
    }, []);

    const value = useMemo(() => ({
        user,
        session,
        loading,
        signInWithOtp,
        signInWithPassword,
        signOut,
    }), [user, session, loading, signInWithOtp, signInWithPassword, signOut]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}

// Alias for convenience
export const useAuth = useAuthContext;
