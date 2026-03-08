import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
    DEFAULT_BASE_COLOR,
    applyThemeToDocument,
    clearStoredThemeBaseColor,
} from '@/features/finance/utils/themeRuntime';
import { writeStoredLastUpdated } from '@/features/finance/utils/lastUpdatedStorage';

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

        const initAuth = async () => {
            try {
                // Check if we're processing OAuth tokens in URL
                const hash = window.location.hash || '';
                const search = window.location.search || '';
                const hasAuthTokens =
                    hash.includes('access_token') ||
                    hash.includes('refresh_token') ||
                    hash.includes('type=recovery') ||
                    search.includes('code=') ||
                    search.includes('error=');

                if (hasAuthTokens) {
                    // Do not set loading to false yet.
                    // Let onAuthStateChange handle the completion of the token flow.
                    return;
                }

                const { data: { session }, error } = await supabase.auth.getSession();

                if (error && (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found'))) {
                    console.warn('⚠️ [AuthContext] Invalid refresh token on initial load');
                }

                if (!ignore) {
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
                if (event === 'SIGNED_OUT' || !session) {
                    clearStoredThemeBaseColor();
                    applyThemeToDocument(DEFAULT_BASE_COLOR);
                }

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

        if (data?.session) {
            setSession(data.session);
            setUser(data.user);
        }

        return { data, error };
    }, []);

    const signOut = useCallback(async () => {
        if (user?.id) {
            writeStoredLastUpdated(new Date(), user.id);
        }
        const { error } = await supabase.auth.signOut();
        localStorage.removeItem('sb_remember_me');
        localStorage.removeItem('lastActiveTime');
        localStorage.removeItem('keep_alive_enabled');
        clearStoredThemeBaseColor();
        applyThemeToDocument(DEFAULT_BASE_COLOR);
        return { error };
    }, [user?.id]);

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
