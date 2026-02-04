import { Card } from "@/components/ui/card";

export function PremiumSkeleton() {
    return (
        <div className="flex min-h-screen bg-background w-full overflow-hidden">
            {/* Sidebar Skeleton - Desktop */}
            <div className="hidden lg:flex flex-col w-64 border-r p-6 gap-8 bg-card/50">
                {/* Logo area */}
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-16 bg-muted/60 animate-pulse rounded" />
                    </div>
                </div>

                {/* Nav Items */}
                <div className="flex-1 space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-12 w-full rounded-xl bg-muted/30 animate-pulse" />
                    ))}
                </div>

                {/* Footer info */}
                <div className="mt-auto h-8 w-full bg-muted/20 animate-pulse rounded-xl" />
            </div>

            {/* Loading Message Overlay */}
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className="bg-background/80 backdrop-blur-sm px-6 py-3 rounded-full border border-primary/20 shadow-lg flex items-center gap-3">
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                    <span className="text-sm font-medium text-foreground tracking-tight">Cargando...</span>
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-75" />
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Header mobile/desktop placeholder */}
                <header className="h-16 border-b flex items-center px-6 justify-between bg-card/20">
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-9 w-9 rounded-full bg-primary/20 animate-pulse" />
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-8 space-y-8">
                    {/* Dashboard Header */}
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-96 bg-muted/60 animate-pulse rounded" />
                    </div>

                    {/* Cards Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i} className="p-6 space-y-4 border-primary/10 shadow-md relative overflow-hidden bg-card/40">
                                <div className="flex justify-between items-start">
                                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                                    <div className="h-4 w-4 bg-primary/20 animate-pulse rounded" />
                                </div>
                                <div className="space-y-1">
                                    <div className="h-8 w-32 bg-primary/10 animate-pulse rounded" />
                                    <div className="h-3 w-20 bg-muted/50 animate-pulse rounded" />
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Main Chart / Content Area */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4 p-6 border-primary/10 shadow-md min-h-[300px] bg-card/40">
                            <div className="flex items-center justify-between mb-6">
                                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                                <div className="flex gap-2">
                                    <div className="h-8 w-20 bg-muted/30 animate-pulse rounded" />
                                    <div className="h-8 w-20 bg-muted/30 animate-pulse rounded" />
                                </div>
                            </div>
                            <div className="h-[200px] w-full bg-gradient-to-t from-primary/5 to-transparent animate-pulse rounded-lg" />
                        </Card>

                        <Card className="col-span-3 p-6 border-primary/10 shadow-md min-h-[300px] bg-card/40">
                            <div className="h-5 w-32 bg-muted animate-pulse rounded mb-6" />
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 animate-pulse" />
                                        <div className="space-y-1 flex-1">
                                            <div className="h-4 w-full bg-muted/40 animate-pulse rounded" />
                                            <div className="h-3 w-2/3 bg-muted/20 animate-pulse rounded" />
                                        </div>
                                        <div className="h-4 w-12 bg-muted/40 animate-pulse rounded" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
