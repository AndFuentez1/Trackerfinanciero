import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Settings, Check } from 'lucide-react';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { cn } from '@/core/utils';

export function ThemeSection() {
    const { baseColor, themeOptions, setAppThemePreference } = useSettingsProfile();

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-gray-50/50 dark:bg-muted/20 overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex shrink-0 items-center justify-center p-1">
                            <Settings className="h-5 w-5 text-primary" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
                                Tema de la app
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 leading-tight">Personaliza el color principal de la interfaz y el texto</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 justify-items-center">
                    {themeOptions.map((option) => (
                        <button
                            key={option.hex}
                            onClick={() => setAppThemePreference(option.hex)}
                            className={cn(
                                "group relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-200 hover:bg-muted/50 w-full",
                                baseColor === option.hex && "bg-muted shadow-inner"
                            )}
                        >
                            <div
                                className="h-10 w-10 md:h-12 md:w-12 rounded-xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110"
                                style={{ backgroundColor: option.hex }}
                            >
                                {baseColor === option.hex && (
                                    <Check className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-md" />
                                )}
                            </div>
                            <span className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                {option.label}
                            </span>
                            {baseColor === option.hex && (
                                <div
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

