import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global React Error Boundary that catches runtime errors
 * and displays them using the same overlay as Vite compile errors.
 * 
 * Also hooks into window.onerror and unhandledrejection for
 * errors outside the React tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);

    // Also show in the global overlay (shared with Vite compile errors)
    // Wrap in try-catch to prevent error handling loop
    try {
      if (typeof (window as any).__tf_showError === 'function') {
        (window as any).__tf_showError({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }
    } catch (e) {
      console.error("Failed to report error to global overlay", e);
    }
  }

  // NOTE: Window error handlers are now centralized in index.html for earlier detection.
  // We keep this component for React-specific lifecycle errors.
  componentDidMount() {
    // Host Verification - Detect mismatch between expected and current port in dev
    const expectedPort = '8080';
    const currentPort = window.location.port;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocal && currentPort && currentPort !== expectedPort) {
      console.warn(`[ErrorBoundary] Port mismatch: expected ${expectedPort}, found ${currentPort}`);
      if (typeof (window as any).__tf_showError === 'function') {
        (window as any).__tf_showError({
          err: {
            message: `Estás accediendo a la aplicación desde el puerto ${currentPort}.`,
            plugin: 'Advertencia de Puerto',
            stack: `La configuración oficial de desarrollo espera el puerto ${expectedPort}.\n\nPor favor usa: http://localhost:${expectedPort}/`
          }
        });
      }
    }
  }

  componentWillUnmount() {
    // No-op
  }

  handleWindowError = (event: ErrorEvent) => {
    // Deprecated in favor of global index.html handler
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    // Deprecated in favor of global index.html handler
  };

  handleRetry = () => {
    clearRuntimeError();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // We delegate UI to the global overlay (index.html)
      // We render an empty container to keep the React tree valid but invisible behind the overlay
      return <div data-tf-error-boundary="true" style={{ display: 'none' }} />;
    }

    return this.props.children;
  }
}

// ─── DOM-based error overlay (shared with Vite compile errors) ───

const OVERLAY_ID = 'tf-compile-error-overlay';

// Kept for backward compatibility if used elsewhere, but delegates to global handler
function showRuntimeError(info: {
  message: string;
  stack?: string;
  componentStack?: string | null;
  source?: string;
}) {
  if (typeof (window as any).__tf_showError === 'function') {
    (window as any).__tf_showError({
      err: {
        message: info.message,
        stack: info.stack,
        frame: info.componentStack
      }
    });
  } else {
    console.error("Critical: Global error handler not loaded.", info);
    alert("Error crítico: " + info.message);
  }
}

function clearRuntimeError() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.style.display = 'none';
}

