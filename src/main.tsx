import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DEFAULT_BASE_COLOR, applyThemeToDocument } from "./features/finance/utils/themeRuntime";
import "./core/api/gmailErrorHandler"; // Initialize Gmail token error handler
import "./index.css";

// Prevent Vite from showing the error overlay for benign Supabase abort errors during HMR/Strict Mode
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const isAbortError =
      event.reason?.name === 'AbortError' ||
      (typeof event.reason?.message === 'string' && event.reason.message.includes('signal is aborted without reason'));

    if (isAbortError) {
      event.preventDefault(); // Stop the error from crashing the app/showing Vite overlay
      console.warn('⚠️ [Global] Ignored unhandled AbortError (common in Supabase during React StrictMode/HMR)', event.reason);
    }
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
