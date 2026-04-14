import { ThemeSection } from '../components/sections/ThemeSection';
import { useSEO } from '@/shared/hooks/useSEO';
import { CategoriesSection } from '../components/sections/CategoriesSection';
import { PaymentMethodsSection } from '../components/sections/PaymentMethodsSection';
import { CurrencySection } from '../components/sections/CurrencySection';
import { SecuritySection } from '../components/sections/SecuritySection';
import { DangerZone } from '../components/sections/DangerZone';
import { AdvancedSettings } from '@/features/settings/components/AdvancedSettings';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { Settings2, Heart, ChevronDown, Shield, Info, Activity } from 'lucide-react';
import { Separator } from '@/shared/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/core/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePageBootLoading } from '@/shared/layouts/PageBootContext';

export default function ConfiguracionPage() {
    useSEO({
        title: 'Configuración',
        description: 'Application Settings - Manage your preferences, categories, and account security.'
    });
    const { loading: authLoading } = useAuth();
    const { categories } = useFinanceData();
    const navigate = useNavigate();
    const location = useLocation();
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
    const [pendingCategoryReturn, setPendingCategoryReturn] = useState(false);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);


    const settingsBootLoading = authLoading;
    const showBootSkeleton = settingsBootLoading;

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const highlight = params.get('highlight');
        if (!highlight) return;

        setHighlightedSection(highlight);
        const timerId = setTimeout(() => {
            const element = document.getElementById(highlight);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        return () => clearTimeout(timerId);
    }, [location.search]);

    useEffect(() => {
        if (!pendingCategoryReturn || highlightedSection !== 'categories') { return; }
        if (categories.length < 3) { return; }
        setPendingCategoryReturn(false);
        setHighlightedSection(null);
        navigate('/dashboard');
    }, [categories.length, highlightedSection, navigate, pendingCategoryReturn]);

    usePageBootLoading(showBootSkeleton);


    return (
        <div className="min-h-screen bg-background/30 pb-20">
            <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
                {showBootSkeleton ? (
                    <SkeletonLoader tab="config" withLayoutWrapper={true} fullPage={false} />
                ) : (
                    <>
                        <header className="border-b border-border pb-8">
                            <div className="flex items-start gap-4 px-1">
                                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                                    <Settings2 className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Configuración</h1>
                                    <p className="text-muted-foreground font-medium mt-[-6px] leading-none text-[15px]">Gestiona tus preferencias y cuenta de usuario</p>
                                </div>
                            </div>
                        </header>

                        <div className="flex flex-col gap-6">
                            <ThemeSection />
                            <CurrencySection />
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
                                                navigate('/dashboard');
                                            }, 500);
                                        }
                                    }}
                                />
                            </div>

                            <SecuritySection />

                            <Separator className="opacity-50" />

                            <div id="advanced">
                                <AdvancedSettings
                                    isOpen={isAdvancedOpen}
                                    onOpenChange={setIsAdvancedOpen}
                                />
                            </div>

                            <Separator className="opacity-50" />

                            <DangerZone />

                            {/* Information Card - Moved to bottom */}
                            <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden shadow-sm">
                                <CardHeader className="pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex shrink-0 items-center justify-center p-1">
                                                <Activity className="h-5 w-5 text-primary" strokeWidth={2.5} />
                                            </div>
                                            <div className="flex flex-col min-w-0 text-left">
                                                <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none mt-1">
                                                    Información
                                                </p>
                                                <p className="text-[15px] text-muted-foreground mt-1 leading-tight">Privacidad y acerca de la aplicación</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    <p className="text-[15px] text-balance leading-relaxed text-muted-foreground">
                                        Todos tus datos se guardan de forma segura en la nube y se sincronizan en tiempo real con todos tus dispositivos.
                                    </p>
                                    <p className="text-sm flex flex-wrap gap-x-4 gap-y-1">
                                        <Link to="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
                                            Términos del servicio
                                        </Link>
                                        <Link to="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                                            Política de privacidad
                                        </Link>
                                    </p>

                                    <Separator className="my-4 opacity-50" />

                                    {/* Privacy Policy Section - Collapsible */}
                                    <Collapsible className="space-y-2">
                                        <CollapsibleTrigger className="flex items-center justify-between w-full group hover:opacity-80 transition-opacity">
                                            <div className="flex items-start gap-4">
                                                <div className="flex shrink-0 items-center justify-center p-1">
                                                    <Shield className="h-5 w-5 text-primary" strokeWidth={2.5} />
                                                </div>
                                                <div className="flex flex-col min-w-0 text-left">
                                                    <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none mt-1">
                                                        Privacidad de Datos
                                                    </p>
                                                    <p className="text-[15px] text-muted-foreground mt-1 leading-tight">Uso y protección de tus datos financieros</p>
                                                </div>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-2 text-[15px] text-muted-foreground leading-relaxed pt-2 pl-6 animate-in slide-in-from-top-2 duration-200">
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
                                <p className="text-muted-foreground" style={{ fontSize: '15px' }}>
                                    Hecho con <Heart className="inline h-3 w-3 text-red-500 fill-current" /> por Joan Fuentes
                                </p>
                            </footer>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
