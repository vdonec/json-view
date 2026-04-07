import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "demo-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.html",
    },
  },
});

