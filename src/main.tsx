import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DEFAULT_BASE_COLOR, applyThemeToDocument } from "./features/finance/utils/themeRuntime";
import "./core/api/gmailErrorHandler"; // Initialize Gmail token error handler
import "./index.css";
import { initAnalytics } from "@/lib/analytics";

initAnalytics();

// Prevent Vite from showing the error overlay for benign Supabase abort errors during HMR/Strict Mode
if (typeof window !== 'undefined') {
  // Prevent Vite from showing the error overlay for benign Supabase abort errors
  window.addEventListener('unhandledrejection', (event) => {
    const isAbortError =
      event.reason?.name === 'AbortError' ||
      (typeof event.reason?.message === 'string' && event.reason.message.includes('signal is aborted without reason'));

    if (isAbortError) {
      event.preventDefault(); // Stop the error from crashing the app/showing Vite overlay
      console.warn('⚠️ [Global] Ignored unhandled AbortError (common in Supabase during React StrictMode/HMR)', event.reason);
    }
  });

  // Handle Vite dynamic import errors (e.g., when a new deployment invalidates old chunks)
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite preload error (likely due to a new deployment). Reloading page...');
    event.preventDefault();
    window.location.reload();
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    applyThemeToDocument(DEFAULT_BASE_COLOR);
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error('Fatal error during app mount:', error);
    // Ensure the global error overlay shows this fatal error
    if (window.__tf_showError) {
      window.__tf_showError({
        err: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          plugin: 'App Mount Error'
        }
      });
    }
  }
}
