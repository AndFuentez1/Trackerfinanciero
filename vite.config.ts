import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  base: '/Trackerfinanciero/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist_deploy',
    emptyOutDir: false,
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase/supabase-js")) return "supabase";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("recharts")) return "charts";
            if (id.includes("xlsx")) return "excel";
            if (id.includes("@tanstack/react-query") || id.includes("react-hook-form")) return "data";
            if (id.includes("react-router-dom")) return "router";
          }
        },
      },
    },
  },
}));
