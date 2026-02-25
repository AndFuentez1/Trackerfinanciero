import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Auth from '@/features/auth/pages/Auth';
import { useAuth } from '@/features/auth/context/AuthContext';

/**
 * AuthGuard component that prevents redirect loops during OAuth callback
 * 
 * When Google/Magic Link redirects back with tokens in the URL hash,
 * we need to render the Auth page WITHOUT redirecting, so Supabase
 * can process the tokens.
 * 
 * This uses proper React patterns with useEffect and useState.
 */
export const AuthGuard = () => {
    const { user, loading: isLoading } = useAuth();
    const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

    useEffect(() => {
        // Check if we're processing OAuth tokens
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const hasOAuthTokens =
            hash.includes('access_token') ||
            hash.includes('refresh_token') ||
            hash.includes('type=recovery') ||
            search.includes('code=') ||
            search.includes('error=');

        if (hasOAuthTokens) {
            setIsProcessingOAuth(true);
        }
    }, []);

    // If still loading auth state from Supabase, or processing OAuth tokens, render Auth directly
    if (isLoading || isProcessingOAuth) {
        return <Auth />;
    }

    // If authenticated, AuthContext should ideally redirect to dashboard, but just in case:
    if (user) {
        return <Navigate to="/" replace />;
    }

    // No tokens and not authenticated, redirect to /auth
    return <Navigate to="/auth" replace />;
};
