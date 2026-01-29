import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics, startEventTimer } from "@/lib/analytics";

// Initialize Analytics
initAnalytics();
startEventTimer('transaction_created'); // Start timer for Time-to-Transaction metric
console.log("[Bootstrap] App initialization started");

// Environment Check
try {
    console.log("[Bootstrap] Checking Environment...");
    // Log critical config presence without exposing secrets
    console.table({
        NODE_ENV: process.env.NODE_ENV,
        SUPABASE_URL_SET: !!import.meta.env.VITE_SUPABASE_URL,
        SUPABASE_KEY_SET: !!(import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    });
} catch (e) {
    console.error("[Bootstrap] Environment check failed", e);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
    console.error("[Bootstrap] CRITICAL: Root element 'root' not found in DOM");
} else {
    try {
        createRoot(rootElement).render(<App />);
        console.log("[Bootstrap] React Root rendered");
    } catch (e) {
        console.error("[Bootstrap] Failed to render React Root", e);
        // Fallback UI if React itself crashes immediately
        rootElement.innerHTML = `<div style="padding: 20px; font-family: sans-serif; color: red;">
      <h1>Critical Startup Error</h1>
      <p>The application failed to initialize.</p>
      <pre>${e}</pre>
    </div>`;
    }
}
