import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { calculateProportionalTheme } from "./features/finance/utils/themeCalculations";
import "./core/api/gmailErrorHandler"; // Initialize Gmail token error handler
import "./index.css";

const DEFAULT_BASE_COLOR = '#64748b';

const bootstrapTheme = () => {
  if (typeof window === 'undefined') { return; }
  try {
    const stored = localStorage.getItem('theme-base-color');
    const baseColor = stored || DEFAULT_BASE_COLOR;
    const theme = calculateProportionalTheme(baseColor);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme)) {
      root.style.setProperty(key, value);
    }
  } catch (error) {
    console.warn('[theme] bootstrap failed', error);
  }
};

bootstrapTheme();

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log('🚀 [main.tsx] Application starting...');
  try {
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
