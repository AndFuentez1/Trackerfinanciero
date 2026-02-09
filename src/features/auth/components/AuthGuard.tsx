import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Auth from '@/features/auth/pages/Auth';

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
            console.log('🔐 [AuthGuard] OAuth tokens detected, rendering Auth without redirect');
            setIsProcessingOAuth(true);

            // After 8 seconds, if still not authenticated, allow redirect
            // This prevents infinite loops if token processing fails
            const timeout = setTimeout(() => {
                console.warn('⚠️ [AuthGuard] OAuth processing timeout, allowing redirect');
                setIsProcessingOAuth(false);
            }, 8000);

            return () => clearTimeout(timeout);
        }
    }, []);

    if (isProcessingOAuth) {
        // Render Auth page directly to allow Supabase to process tokens
        return <Auth />;
    }

    // No tokens, redirect to /auth
    return <Navigate to="/auth" replace />;
};
