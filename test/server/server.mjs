import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

export async function startServer({ port = 0 } = {}) {
  const app = express();

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  const repoRoot = path.resolve(__dirname, "../..");
  const srcRoot = path.join(repoRoot, "src");

  // Load optional dynamic routes from component test directories
  const components = fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  for (const c of components) {
    const routesFile = path.join(srcRoot, c, "test", "routes.mjs");
    if (isFile(routesFile)) {
      const mod = await import(pathToFileURL(routesFile).href);
      if (typeof mod?.default === "function") {
        mod.default(app);
      } else {
        console.warn(`[routes] ${c}: routes.mjs has no default export function`);
      }
    }
  }

  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });

  // Serve the entire repo root as static files
  app.use(express.static(repoRoot, { etag: false, maxAge: 0 }));

  const server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;

  return {
    baseUrl: `http://127.0.0.1:${actualPort}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
