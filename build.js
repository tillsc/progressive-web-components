import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const entryPoints = {
  "filter": "src/filter/index.js",
  "filter-bs5": "src/filter/bs5/index.js",
  "dialog-opener": "src/dialog-opener/index.js",
  "dialog-opener-bs5": "src/dialog-opener/bs5/index.js",
  "modal-dialog": "src/modal-dialog/index.js",
  "modal-dialog-bs5": "src/modal-dialog/bs5/index.js",
  "multiselect-dual-list": "src/multiselect-dual-list/index.js",
  "multiselect-dual-list-bs5": "src/multiselect-dual-list/bs5/index.js",
  "conditional-display": "src/conditional-display/index.js",
  "zone-transfer": "src/zone-transfer/index.js",
  "include": "src/include/index.js",
  "auto-submit": "src/auto-submit/index.js",
  "validity": "src/validity/index.js",
  "validity-bs5": "src/validity/bs5/index.js",
  "select-all": "src/select-all/index.js",
  "auto-grid": "src/auto-grid/index.js",
  "all": "src/index.js",
  "all-bs5": "src/index-bs5.js",
};

const config = {
  entryPoints,
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "es2024",
  minify: false,
  sourcemap: false,
  loader: {
    ".css": "text"
  }
};

if (!watch) {
  await esbuild.build(config);
  process.exit(0);
}

const ctx = await esbuild.context(config);
await ctx.watch();

console.log("[build] watching...");

// Keep process alive (ctx.watch should keep it, but make it explicit)
await new Promise(() => { });