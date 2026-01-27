
import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
    return (
        <Card className={cn("border border-border/60 bg-card shadow-sm mb-8", className)}>
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start md:items-center gap-4">
                    {icon && (
                        <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 ring-1 ring-primary/20">
                            {icon}
                        </div>
                    )}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                        {description && (
                            <p className="text-sm text-muted-foreground font-medium">{description}</p>
                        )}
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-3 justify-start md:justify-end flex-wrap">
                        {actions}
                    </div>
                )}
            </div>
        </Card>
    );
}
