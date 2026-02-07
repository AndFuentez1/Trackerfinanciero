import { ThemeSection } from './settings/sections/ThemeSection';
import { CategoriesSection } from './settings/sections/CategoriesSection';
import { PaymentMethodsSection } from './settings/sections/PaymentMethodsSection';
import { CurrencySection } from './settings/sections/CurrencySection';
import { SecuritySection } from './settings/sections/SecuritySection';
import { DangerZone } from './settings/sections/DangerZone';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonLoader } from '@/components/common/skeletons/SkeletonLoader';
import { Settings2, Github, Heart } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ConfiguracionPage() {
    const { loading } = useFinanceData();
    const navigate = useNavigate();
    const location = useLocation();
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const highlight = params.get('highlight');
        if (highlight) {
            setHighlightedSection(highlight);
        }
    }, [location.search]);

    if (loading) {
        return <SkeletonLoader tab="config" fullPage withLayoutWrapper />;
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
                            <p className="text-muted-foreground font-medium">Gestiona tus preferencias, cuentas y seguridad de la aplicación</p>
                        </div>
                    </div>
                </header>

                <div className="space-y-8">
                    <section className="space-y-8">
                        <ThemeSection />
                        <CurrencySection />
                        <div className="flex flex-col gap-10">
                            <div className={cn(
                                "transition-all duration-300",
                                highlightedSection === 'categories' && "scale-105 rounded-2xl border-2 border-primary shadow-lg shadow-primary/20 p-1"
                            )}>
                                <CategoriesSection
                                    highlighted={highlightedSection === 'categories'}
                                    onCategoryCreated={() => {
                                        if (highlightedSection === 'categories') {
                                            setTimeout(() => {
                                                setHighlightedSection(null);
                                                navigate('/auth');
                                            }, 500);
                                        }
                                    }}
                                />
                            </div>
                            <div className={cn(
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

                    <section className="space-y-8">
                        <SecuritySection />
                        <DangerZone />
                    </section>

                    {/* Information Card - Moved to bottom */}
                    <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary/80">Información</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <p className="text-sm text-balance leading-relaxed">
                                Todos tus datos se guardan de forma segura en la nube y se sincronizan en tiempo real con todos tus dispositivos.
                            </p>
                            <div className="space-y-3 pt-2">

                                <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground font-medium">
                                    Hecho con <Heart className="h-3 w-3 text-red-500 fill-current animate-pulse" /> por Joan Fuentes
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
