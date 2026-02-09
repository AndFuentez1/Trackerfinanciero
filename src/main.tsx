import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
