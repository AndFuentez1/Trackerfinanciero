import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

type LegalDocumentShellProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalDocumentShell({ title, lastUpdated, children }: LegalDocumentShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 pb-16">
        <div className="mb-10 space-y-2 border-b border-border/60 pb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">TrackFinance</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground">Última actualización: {lastUpdated}</p>
        </div>
        <div className="space-y-8 text-sm leading-relaxed text-foreground/90 [&_h2]:scroll-mt-24 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-muted-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}
