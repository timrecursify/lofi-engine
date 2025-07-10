import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    sveltekit(),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: process.env.TAURI_PLATFORM ? 1420 : 5173,
    strictPort: !!process.env.TAURI_PLATFORM,
    host: true,
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // For Tauri: chrome105/safari13, for web: modern browsers that support BigInt
    target: process.env.TAURI_PLATFORM 
      ? (process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13")
      : ["chrome91", "firefox90", "safari14", "edge91"], // Modern browsers with BigInt support
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  ssr: {
    // Exclude Tone.js and all engine files from SSR as they're client-side audio libraries
    noExternal: [],
    external: ["tone"]
  },
  resolve: {
    alias: {
      // Make Tone.js a no-op during SSR
      'tone': 'tone'
    }
  },
  optimizeDeps: {
    // Include Tone.js in dependency optimization
    include: ["tone"],
    exclude: []
  }
});
