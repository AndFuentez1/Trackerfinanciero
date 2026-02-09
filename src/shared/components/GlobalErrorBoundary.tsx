import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        console.error("GlobalErrorBoundary caught an error:", error, errorInfo);

        // Save to localStorage for persistence
        localStorage.setItem('last_crash_error', error.toString());
        localStorage.setItem('last_crash_stack', errorInfo.componentStack || '');
        localStorage.setItem('last_crash_time', new Date().toISOString());
    }

    handleReload = () => {
        window.location.reload();
    };

    handleClearCacheAndReload = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = import.meta.env.BASE_URL; // Force navigate to base URL
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-gray-900">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full border border-red-200">
                        <h1 className="text-2xl font-bold text-red-600 mb-2">Algo salió mal (Survival Mode)</h1>
                        <p className="mb-4 text-gray-600">
                            La aplicación ha encontrado un error crítico y no puede continuar.
                        </p>

                        <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4 overflow-auto max-h-60">
                            <p className="font-mono text-sm text-red-700 font-semibold">
                                {this.state.error && this.state.error.toString()}
                            </p>
                            <pre className="font-mono text-xs text-gray-500 mt-2 whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                Recargar Página
                            </button>
                            <button
                                onClick={this.handleClearCacheAndReload}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            >
                                Borrar Caché y Reiniciar
                            </button>
                        </div>

                        <p className="mt-4 text-xs text-gray-400">
                            Este error ha sido guardado localmente para diagnósticos.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
