import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const entryPoints = {
  "dialog-opener": "src/dialog-opener/index.js",
  "dialog-opener-bs5": "src/dialog-opener/bs5/index.js",
  "modal-dialog": "src/modal-dialog/index.js",
  "modal-dialog-bs5": "src/modal-dialog/bs5/index.js"
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