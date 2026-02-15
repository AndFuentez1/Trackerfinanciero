import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Settings, Check } from 'lucide-react';
import { useSettingsProfile } from '../hooks/useSettingsProfile';
import { cn } from '@/core/utils';

export function ThemeSection() {
    const { baseColor, themeOptions, setAppThemePreference } = useSettingsProfile();

    return (
        <Card className="rounded-2xl shadow-sm border-border/50 bg-gray-50/50 dark:bg-muted/20 overflow-hidden">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-start gap-2 text-lg sm:text-xl md:text-2xl font-bold leading-none tracking-tight">
                    <Settings className="h-5 w-5 text-primary flex-shrink-0" />
                    Tema de la app
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">Personaliza el color principal de la interfaz y el texto</CardDescription>
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

