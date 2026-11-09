import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { syntheticPreviewPlugin } from "./preview/syntheticPreview.js";

// Standalone dev tooling: never imported by the normal application config/build.
export default defineConfig({
  plugins: [syntheticPreviewPlugin(), react(), tailwindcss()],
  envDir: false,
  envPrefix: [],
  define: { "import.meta.env.VITE_API_URL": JSON.stringify(""), "import.meta.env.VITE_APK_URL": JSON.stringify("") },
  cacheDir: fileURLToPath(new URL("../.tmp/synthetic-vite-cache", import.meta.url)),
  server: { host: "127.0.0.1", port: 5181, strictPort: true, open: false, cors: false },
});
