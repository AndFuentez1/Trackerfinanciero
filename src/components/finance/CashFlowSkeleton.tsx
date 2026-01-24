import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CashFlowSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full rounded" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
