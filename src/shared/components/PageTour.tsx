import { useEffect, useState, type ComponentType } from 'react';
import { HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/core/utils';

export interface TourStep {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
}

interface PageTourProps {
  /** Identificador único del tour (se usa para recordar si ya se vio). */
  tourId: string;
  steps: TourStep[];
  /** Abrir automáticamente la primera vez que el usuario visita la página. */
  autoStart?: boolean;
  className?: string;
}

const storageKey = (tourId: string, userId?: string) => `tf_tour_seen_${tourId}_${userId ?? 'anon'}`;

function readSeen(key: string) {
  try { return localStorage.getItem(key) === '1'; } catch { return true; }
}

function writeSeen(key: string) {
  try { localStorage.setItem(key, '1'); } catch { /* almacenamiento no disponible */ }
}

/**
 * Tour guiado paso a paso para explicar una sección. Se muestra una vez por usuario
 * (recordado en este navegador) y puede reabrirse con el botón "¿Cómo funciona?".
 */
export function PageTour({ tourId, steps, autoStart = true, className }: PageTourProps) {
  const { user } = useAuth();
  const key = storageKey(tourId, user?.id);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!autoStart || !user?.id || readSeen(key)) { return; }
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [autoStart, key, user?.id]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      writeSeen(key);
      setIndex(0);
    }
  };

  if (steps.length === 0) { return null; }
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const Icon = step.icon;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn('gap-1.5 text-muted-foreground hover:text-primary', className)}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        ¿Cómo funciona?
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <DialogTitle>{step.title}</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-[15px] leading-relaxed">{step.description}</DialogDescription>
          </DialogHeader>

          <div className="flex justify-center gap-1.5 py-2" aria-label={`Paso ${index + 1} de ${steps.length}`} role="status">
            {steps.map((s, i) => (
              <span
                key={s.title}
                className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30')}
              />
            ))}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
              Omitir
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIndex((i) => i - 1)}
                disabled={index === 0}
                aria-label="Paso anterior"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => (isLast ? handleOpenChange(false) : setIndex((i) => i + 1))}
              >
                {isLast ? 'Entendido' : 'Siguiente'}
                {!isLast && <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
