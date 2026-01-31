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

export default function ConfiguracionPage() {
    const { loading } = useFinanceData();

    if (loading) {
        return <SkeletonLoader tab="config" fullPage withLayoutWrapper />;
    }

    return (
        <div className="min-h-screen bg-background/30 pb-20">
            <div className="container max-w-6xl mx-auto px-4 py-10 space-y-12 animate-in fade-in duration-700">

                {/* Header Section */}
                <header className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                            <Settings2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight">Configuración</h1>
                            <p className="text-muted-foreground font-medium">Gestiona tus preferencias, cuentas y seguridad de la aplicación</p>
                        </div>
                    </div>
                </header>

                <div className="space-y-8">
                    <section className="space-y-8">
                        <ThemeSection />
                        <CurrencySection />
                        <div className="flex flex-col gap-10">
                            <CategoriesSection />
                            <PaymentMethodsSection />
                        </div>
                    </section>

                    <Separator className="my-8 opacity-50" />

                    <section className="space-y-8">
                        <SecuritySection />
                        <DangerZone />
                    </section>

                    {/* Information Card - Moved to bottom */}
                    <Card className="rounded-2xl border-primary/10 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden border-border/50 shadow-sm">
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
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors border border-transparent hover:border-border/50 group"
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
