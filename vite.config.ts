import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: [
        "src/sheets-orm.ts",
        "src/key-value-store.ts",
        "src/drive-fs-util.ts",
      ],
      formats: ["es"],
    },
    rollupOptions: {
      external: ["rollup"],
    },
  },
});
