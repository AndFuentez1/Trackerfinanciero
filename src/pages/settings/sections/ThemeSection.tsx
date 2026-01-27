import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Check } from 'lucide-react';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { cn } from '@/lib/utils';

export function ThemeSection() {
    const { baseColor, themeOptions, setAppThemePreference } = useSettingsProfile();

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-card overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <Settings className="h-5 w-5 text-primary" />
                    Tema de la app
                </CardTitle>
                <CardDescription>Personaliza el color principal de la interfaz</CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 justify-items-center"
                >
                    {themeOptions.map((option) => (
                        <button
                            key={option.hex}
                            onClick={() => setAppThemePreference(option.hex)}
                            className={cn(
                                "group relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-200 hover:bg-muted/50 w-full",
                                baseColor === option.hex ? "border-2 border-primary" : "border border-border",
                                baseColor === option.hex && "bg-muted shadow-inner"
                            )}
                        >
                            <div
                                className={cn(
                                    "h-10 w-10 md:h-12 md:w-12 rounded-xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110",
                                    baseColor === option.hex
                                        ? "border-2 border-primary"
                                        : "border border-border"
                                )}
                                style={{ backgroundColor: option.hex }}
                            >
                                {baseColor === option.hex && (
                                    <Check className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-md" />
                                )}
                            </div>
                            <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {option.label}
                            </span>
                            {/* Punto indicador eliminado */}
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
