import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

// Single-file build of the portfolio deck: every script, style, screenshot and
// logo is inlined so docs/portfolio.html opens from disk and publishes as one
// artifact. `npm run build:portfolio`.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "docs/portfolio-build",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { input: resolve(__dirname, "portfolio.html") },
  },
});
