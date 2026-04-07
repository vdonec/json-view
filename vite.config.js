import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/json-view.js"),
      name: "jsonview",
      fileName: "jsonview",
      formats: ["umd", "es"],
    },
    outDir: "dist",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        exports: "named",
        globals: {
          jsonview: "jsonview",
        },
      },
    },
  },
});
