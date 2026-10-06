import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  optimizeDeps: {
    include: ["@fina/types", "nestjs-zod", "zod"],
    esbuildOptions: {
      target: "es2020"
    }
  },
  server: {
    host: true,
    fs: {
      strict: false
    },
    allowedHosts: ["2e50-2804-411c-1e2b-fd1-e813-25f7-ebca-4fdc.ngrok-free.app"]
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-label"
          ],
          "utils-vendor": ["dayjs", "zod", "react-hook-form"]
        }
      }
    }
  }
})
