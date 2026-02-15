import { ThemeSection } from '../components/sections/ThemeSection';
import { CategoriesSection } from '../components/sections/CategoriesSection';
import { PaymentMethodsSection } from '../components/sections/PaymentMethodsSection';
import { CurrencySection } from '../components/sections/CurrencySection';
import { SecuritySection } from '../components/sections/SecuritySection';
import { DangerZone } from '../components/sections/DangerZone';
import { AdvancedSettings } from '@/features/settings/components/AdvancedSettings';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { Settings2, Heart, ChevronDown, Shield } from 'lucide-react';
import { Separator } from '@/shared/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/core/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function ConfiguracionPage() {
    const { loading: authLoading } = useAuth();
    const { categories, categoriesLoading, paymentMethodsLoading, profileLoading } = useFinanceData();
    const navigate = useNavigate();
    const location = useLocation();
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
    const [pendingCategoryReturn, setPendingCategoryReturn] = useState(false);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(() => {
        return localStorage.getItem('settings-advanced-open') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('settings-advanced-open', String(isAdvancedOpen));
    }, [isAdvancedOpen]);


    const settingsBootLoading = authLoading || categoriesLoading || paymentMethodsLoading || profileLoading;
    const [showBootSkeleton, setShowBootSkeleton] = useState(settingsBootLoading);
    const bootStartRef = useRef(settingsBootLoading ? Date.now() : 0);
    const hasBootedRef = useRef(!settingsBootLoading);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const highlight = params.get('highlight');
        if (highlight) {
            setHighlightedSection(highlight);
            // Scroll to section after a short delay to ensure DOM is ready
            setTimeout(() => {
                const element = document.getElementById(highlight);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }, [location.search]);

    useEffect(() => {
        if (!pendingCategoryReturn || highlightedSection !== 'categories') { return; }
        if (categories.length < 3) { return; }
        setPendingCategoryReturn(false);
        setHighlightedSection(null);
        navigate('/auth');
    }, [categories.length, highlightedSection, navigate, pendingCategoryReturn]);

    useEffect(() => {
        if (hasBootedRef.current) { return; }
        if (!settingsBootLoading) {
            const elapsed = bootStartRef.current ? Date.now() - bootStartRef.current : 0;
            const minDelay = 300;
            const remaining = Math.max(0, minDelay - elapsed);
            const t = setTimeout(() => {
                hasBootedRef.current = true;
                setShowBootSkeleton(false);
            }, remaining);
            return () => clearTimeout(t);
        }
    }, [settingsBootLoading]);

    if (showBootSkeleton) {
        return <SkeletonLoader tab="config" fullPage={false} withLayoutWrapper />;
    }

    return (
        <div className="min-h-screen bg-background/30 pb-20">
            <div className="container max-w-6xl mx-auto px-4 py-10 space-y-12 animate-in fade-in duration-700">

                {/* Header Section */}
                <header className="space-y-4 border-b border-border/40 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border">
                            <Settings2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Configuración</h1>
                            <p className="text-base text-muted-foreground font-medium">Gestiona tus preferencias, cuentas y seguridad de la aplicación</p>
                        </div>
                    </div>
                </header>

                <div className="space-y-8">
                    <section className="space-y-8">
                        <ThemeSection />
                        <CurrencySection />
                        <div className="flex flex-col gap-10">
                            <div
                                id="categories"
                                className={cn(
                                    "transition-all duration-300",
                                    highlightedSection === 'categories' && "scale-105 rounded-2xl border-2 border-primary shadow-lg shadow-primary/20 p-1"
                                )}>
                                <CategoriesSection
                                    highlighted={highlightedSection === 'categories'}
                                    onCategoryCreated={() => {
                                        if (highlightedSection === 'categories') {
                                            setPendingCategoryReturn(true);
                                        }
                                    }}
                                />
                            </div>
                            <div
                                id="payment-methods"
                                className={cn(
                                    "transition-all duration-300",
                                    highlightedSection === 'payment-methods' && "scale-105 rounded-2xl border-2 border-primary shadow-lg shadow-primary/20 p-1"
                                )}>
                                <PaymentMethodsSection
                                    highlighted={highlightedSection === 'payment-methods'}
                                    onPaymentMethodCreated={() => {
                                        if (highlightedSection === 'payment-methods') {
                                            setTimeout(() => {
                                                setHighlightedSection(null);
                                                navigate('/auth');
                                            }, 500);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </section>

                    <Separator className="my-8 opacity-50" />

                    {/* Security & Privacy Section */}
                    <div className="space-y-8">
                        <SecuritySection />
                        <div id="advanced" className="pt-4">
                            <AdvancedSettings
                                isOpen={isAdvancedOpen}
                                onOpenChange={setIsAdvancedOpen}
                            />
                        </div>
                        <DangerZone />
                    </div>


                    {/* Information Card - Moved to bottom */}
                    <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary/80">Información</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <p className="text-base text-balance leading-relaxed">
                                Todos tus datos se guardan de forma segura en la nube y se sincronizan en tiempo real con todos tus dispositivos.
                            </p>

                            <Separator className="my-4 opacity-50" />

                            {/* Privacy Policy Section - Collapsible */}
                            <Collapsible className="space-y-2">
                                <CollapsibleTrigger className="flex items-center justify-between w-full group hover:opacity-80 transition-opacity">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-primary" />
                                        <h4 className="text-lg font-semibold text-foreground">Privacidad de Datos</h4>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-2 text-base text-muted-foreground leading-relaxed pt-2 pl-6 animate-in slide-in-from-top-2 duration-200">
                                    <ul className="space-y-4">
                                        <li>
                                            <strong className="text-foreground block">Almacenamiento seguro</strong>
                                            <ul className="list-disc pl-5 mt-1">
                                                <li>Tus datos financieros se almacenan de forma segura en Supabase con encriptación en tránsito y en reposo.</li>
                                            </ul>
                                        </li>
                                        <li>
                                            <strong className="text-foreground block">Acceso exclusivo</strong>
                                            <ul className="list-disc pl-5 mt-1">
                                                <li>Solo tú tienes acceso a tu información. Utilizamos autenticación segura y cada usuario tiene su propio espacio aislado.</li>
                                            </ul>
                                        </li>
                                        <li>
                                            <strong className="text-foreground block">Privacidad absoluta</strong>
                                            <ul className="list-disc pl-5 mt-1">
                                                <li>No compartimos, vendemos ni utilizamos tus datos para publicidad. Tu información financiera es privada y confidencial.</li>
                                            </ul>
                                        </li>
                                        <li>
                                            <strong className="text-foreground block">Control total</strong>
                                            <ul className="list-disc pl-5 mt-1">
                                                <li>Puedes exportar o eliminar todos tus datos en cualquier momento desde la sección "Zona de Peligro".</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </CollapsibleContent>
                            </Collapsible>
                        </CardContent>
                    </Card>

                    {/* Footer */}
                    <footer className="text-center py-6">
                        <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
                            Hecho con <Heart className="inline h-3 w-3 text-red-500 fill-current animate-pulse" /> por Joan Fuentes
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
