import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // CRITICAL: base must be "/" for Firebase Hosting / SPA routing
  // Without this, assets use relative paths that break on deep routes
  base: "/",
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: "dist/spa",
    sourcemap: false, // Disable sourcemaps in prod to reduce bundle size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — always loaded first
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Three.js is huge — split it to its own chunk
          "three-vendor": ["three"],
          // React Three Fiber ecosystem
          "r3f-vendor": ["@react-three/fiber", "@react-three/drei"],
          // UI component libraries
          "ui-vendor": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tooltip", "@radix-ui/react-accordion", "lucide-react"],
          // TanStack Query
          "query-vendor": ["@tanstack/react-query"],
        },
      },
    },
  },
  plugins: [react(), glslPlugin(), expressPlugin()],
  define: {
    "process.env": {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

export function glslPlugin(): Plugin {
  return {
    name: "vite-plugin-glsl-raw",
    transform(code, id) {
      const cleanId = id.split("?")[0];
      if (cleanId.endsWith(".vert") || cleanId.endsWith(".frag") || cleanId.endsWith(".glsl")) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: null,
        };
      }
    },
  };
}

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      try {
        const { createServer } = await import("./server");
        const app = createServer();
        // Add Express app as middleware to Vite dev server before internal HTML fallback
        server.middlewares.use(app);
      } catch (error) {
        console.error("Failed to load server:", error);
      }
    },
  };
}
