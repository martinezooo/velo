import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "fs";

const host = process.env.TAURI_DEV_HOST;

// Single source of truth for the version shown in the app and on the splash
// screen: package.json, which release tooling already keeps in step with
// tauri.conf.json and Cargo.toml.
const appVersion = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
).version as string;

/** Replace %APP_VERSION% in the HTML entry points at build time. */
function versionInHtml() {
  return {
    name: "revelo-version-in-html",
    transformIndexHtml(html: string) {
      return html.replace(/%APP_VERSION%/g, appVersion);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), versionInHtml()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        splashscreen: path.resolve(__dirname, "splashscreen.html"),
      },
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
