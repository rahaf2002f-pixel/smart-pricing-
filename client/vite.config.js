import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const directory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: directory,
  plugins: [react()],
  appType: "custom",
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  build: {
    outDir: resolve(directory, "dist"),
    emptyOutDir: true,
  },
});
