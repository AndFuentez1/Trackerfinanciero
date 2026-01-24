// vite.config.ts
import { defineConfig } from "file:///C:/Users/joan.fuentes/OneDrive%20-%20Universidad%20EIA/Escritorio/Personales/Trackerfinanciero/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/joan.fuentes/OneDrive%20-%20Universidad%20EIA/Escritorio/Personales/Trackerfinanciero/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/joan.fuentes/OneDrive%20-%20Universidad%20EIA/Escritorio/Personales/Trackerfinanciero/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\joan.fuentes\\OneDrive - Universidad EIA\\Escritorio\\Personales\\Trackerfinanciero";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
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
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqb2FuLmZ1ZW50ZXNcXFxcT25lRHJpdmUgLSBVbml2ZXJzaWRhZCBFSUFcXFxcRXNjcml0b3Jpb1xcXFxQZXJzb25hbGVzXFxcXFRyYWNrZXJmaW5hbmNpZXJvXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqb2FuLmZ1ZW50ZXNcXFxcT25lRHJpdmUgLSBVbml2ZXJzaWRhZCBFSUFcXFxcRXNjcml0b3Jpb1xcXFxQZXJzb25hbGVzXFxcXFRyYWNrZXJmaW5hbmNpZXJvXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9qb2FuLmZ1ZW50ZXMvT25lRHJpdmUlMjAtJTIwVW5pdmVyc2lkYWQlMjBFSUEvRXNjcml0b3Jpby9QZXJzb25hbGVzL1RyYWNrZXJmaW5hbmNpZXJvL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBobXI6IHtcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTgwMCxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzXCIpKSB7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIikpIHJldHVybiBcInN1cGFiYXNlXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJsdWNpZGUtcmVhY3RcIikpIHJldHVybiBcImljb25zXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAcmFkaXgtdWlcIikpIHJldHVybiBcInJhZGl4XCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJyZWNoYXJ0c1wiKSkgcmV0dXJuIFwiY2hhcnRzXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJ4bHN4XCIpKSByZXR1cm4gXCJleGNlbFwiO1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCIpIHx8IGlkLmluY2x1ZGVzKFwicmVhY3QtaG9vay1mb3JtXCIpKSByZXR1cm4gXCJkYXRhXCI7XG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJyZWFjdC1yb3V0ZXItZG9tXCIpKSByZXR1cm4gXCJyb3V0ZXJcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThjLFNBQVMsb0JBQW9CO0FBQzNlLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxpQkFBaUIsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUM5RSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFDZixjQUFJLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFDL0IsZ0JBQUksR0FBRyxTQUFTLHVCQUF1QixFQUFHLFFBQU87QUFDakQsZ0JBQUksR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQ3hDLGdCQUFJLEdBQUcsU0FBUyxXQUFXLEVBQUcsUUFBTztBQUNyQyxnQkFBSSxHQUFHLFNBQVMsVUFBVSxFQUFHLFFBQU87QUFDcEMsZ0JBQUksR0FBRyxTQUFTLE1BQU0sRUFBRyxRQUFPO0FBQ2hDLGdCQUFJLEdBQUcsU0FBUyx1QkFBdUIsS0FBSyxHQUFHLFNBQVMsaUJBQWlCLEVBQUcsUUFBTztBQUNuRixnQkFBSSxHQUFHLFNBQVMsa0JBQWtCLEVBQUcsUUFBTztBQUFBLFVBQzlDO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
