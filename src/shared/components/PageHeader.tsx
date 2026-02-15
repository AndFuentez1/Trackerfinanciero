
import React from 'react';
import { cn } from '@/core/utils';
import { Card } from '@/shared/ui/card';

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
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                    {icon && (
                        <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 ring-1 ring-primary/20">
                            {icon}
                        </div>
                    )}
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none">{title}</h1>
                        {description && (
                            <p className="text-sm text-muted-foreground font-medium mt-1 leading-none">{description}</p>
                        )}
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-3 justify-start md:justify-end flex-wrap md:mt-1">
                        {actions}
                    </div>
                )}
            </div>
        </Card>
    );
}

