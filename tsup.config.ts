import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    outExtension({ format }) {
        return {
            js: format === "cjs" ? ".cjs" : ".mjs",
        };
    },
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    target: "es2020",
});
