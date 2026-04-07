import { defineConfig } from "vite";

export default defineConfig({
  base: "/json-view/",
  build: {
    outDir: "demo-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.html",
    },
  },
});

