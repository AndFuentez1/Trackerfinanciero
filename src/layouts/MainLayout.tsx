import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
// import { useInactivityLogout } from "@/hooks/useInactivityLogout"; // Deshabilitado: solo cerrar sesión manual
import { useEffect, useState } from "react";
import { Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonLoader } from "@/components/common/skeletons/SkeletonLoader";
import { SetPasswordDialog } from "@/features/auth/components/SetPasswordDialog";
import { supabase } from "@/integrations/supabase/client";

export default function MainLayout() {
    const { user, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [hasCheckedPassword, setHasCheckedPassword] = useState(false);

    // Auto logout after 30 minutes of inactivity - DESHABILITADO
    // useInactivityLogout(30);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                navigate("/configuracion?highlight=password");
            }
        });
        return () => subscription.unsubscribe();
    }, [navigate]);

    // Check if user has password set
    useEffect(() => {
        const checkUserPassword = async () => {
            if (!user || !user.email_confirmed_at || hasCheckedPassword) return;

            try {
                const { data: { user: currentUser } } = await supabase.auth.getUser();

                if (currentUser) {
                    const lastSignInMethod = currentUser.app_metadata?.provider;

                    if (lastSignInMethod === 'email' && !localStorage.getItem('password_dialog_shown')) {
                        setTimeout(() => {
                            setShowPasswordDialog(true);
                            localStorage.setItem('password_dialog_shown', 'true');
                        }, 2000);
                    }
                }
                setHasCheckedPassword(true);
            } catch (error) {
                console.error('[MainLayout] Failed to check user password', error);
                setHasCheckedPassword(true);
            }
        };

        checkUserPassword();
    }, [user, hasCheckedPassword]);

    if (loading) {
        return <SkeletonLoader fullPage withLayoutWrapper={false} />;
    }

    if (!user) return null;

    // Email Confirmation Guard
    if (!user.email_confirmed_at) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
                <div className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                    <div className="p-4 rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mx-auto shadow-inner">
                        <Mail className="h-10 w-10 text-amber-600" />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-2xl font-bold tracking-tight">Verifica tu correo</h1>
                        <p className="text-muted-foreground text-sm">
                            Tu cuenta está casi lista. Hemos enviado un correo de confirmación a <span className="font-bold text-foreground">{user.email}</span>.
                        </p>
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-left">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                                <strong>Acceso limitado:</strong> Por seguridad, debes confirmar tu identidad antes de acceder a tus datos financieros. Revisa tu bandeja de entrada y spam.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Button variant="default" className="w-full h-11" onClick={() => window.location.reload()}>
                            Ya lo he confirmado
                        </Button>
                        <Button variant="destructive" className="w-full text-muted-foreground" onClick={() => signOut()}>
                            Cerrar sesión
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                className="flex h-screen w-full overflow-hidden font-sans antialiased"
            >
                <Sidebar />
                <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto h-screen relative">
                    <Outlet />
                </main>
                <MobileNav />
            </div>

            <SetPasswordDialog
                open={showPasswordDialog}
                onOpenChange={setShowPasswordDialog}
                userEmail={user?.email || ''}
            />
        </>
    );
}

