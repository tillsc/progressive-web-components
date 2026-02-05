import esbuild from "esbuild";

await esbuild.build({
  entryPoints: {
    "dialog-opener": "src/dialog-opener/index.js"
  },
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "es2024",
  minify: false,
  sourcemap: false,

  loader: {
    ".css": "text"
  }
});