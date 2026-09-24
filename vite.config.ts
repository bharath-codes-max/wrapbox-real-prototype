import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Wrapbox Real Prototype — isolated dev server. Port 5980 is intentionally
// distinct from the main wrapbox-prototype app so both can run side by side.
export default defineConfig({
  plugins: [react()],
  server: { port: 5980, strictPort: true },
});
