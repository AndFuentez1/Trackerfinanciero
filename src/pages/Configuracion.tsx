import { ThemeSection } from './settings/sections/ThemeSection';
import { CategoriesSection } from './settings/sections/CategoriesSection';
import { PaymentMethodsSection } from './settings/sections/PaymentMethodsSection';
import { CurrencySection } from './settings/sections/CurrencySection';
import { SecuritySection } from './settings/sections/SecuritySection';
import { DangerZone } from './settings/sections/DangerZone';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonLoader } from '@/components/common/skeletons/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { Settings2, Github, Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';

export default function ConfiguracionPage() {
    const { loading } = useFinanceData();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const section = searchParams.get('section');

    useEffect(() => {
        if (section) {
            const element = document.getElementById(section);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-primary', 'ring-offset-8', 'rounded-2xl', 'transition-all', 'duration-1000');
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-primary', 'ring-offset-8');
                    }, 3000);
                }, 100);
            }
        }
    }, [section]);

    if (loading) {
        return <SkeletonLoader tab="config" fullPage withLayoutWrapper />;
    }

    return (
        <div className="min-h-screen bg-background/30 pb-20">
            <div className="container max-w-6xl mx-auto px-4 py-8 space-y-12 animate-in fade-in duration-700">

                <PageHeader
                    title="Configuración"
                    description="Gestiona tus preferencias, cuentas y seguridad de la aplicación"
                    icon={<Settings2 className="h-6 w-6" />}
                />

                <div className="space-y-8">
                    <section className="space-y-8">
                        <ThemeSection />
                        <CurrencySection />
                        <div className="flex flex-col gap-10">
                            <div id="categories" className="scroll-mt-20">
                                <CategoriesSection />
                            </div>
                            <div id="payment-methods" className="scroll-mt-20">
                                <PaymentMethodsSection />
                            </div>
                        </div>
                    </section>

                    <Separator className="my-8 opacity-50" />

                    <section className="space-y-8">
                        <SecuritySection />
                        <DangerZone />
                    </section>

                    {/* Information Card - Moved to bottom */}
                    <Card className="rounded-2xl shadow-sm border-destructive/20 bg-destructive/5 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary/80">Información</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <p className="text-sm text-balance leading-relaxed">
                                Todos tus datos se guardan de forma segura en la nube y se sincronizan en tiempo real con todos tus dispositivos.
                            </p>
                            <div className="space-y-3 pt-2">
                                <a
                                    href="https://github.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-[color-border]/50 group"
                                >
                                    <div className="p-1.5 rounded-lg bg-slate-900 text-white shadow-sm">
                                        <Github className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-semibold group-hover:text-primary transition-colors">Contribuir en GitHub</span>
                                </a>
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
