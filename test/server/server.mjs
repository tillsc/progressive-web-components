import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

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
  const distRoot = path.join(repoRoot, "dist");
  const testStaticRoot = path.join(repoRoot, "test", "static");

  const staticOpts = { etag: false, maxAge: 0 };

  app.use("/dist", express.static(distRoot, staticOpts));
  app.use("/test/static", express.static(testStaticRoot, staticOpts));

  // /src/<component>/test/*
  const components = fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const componentsWithTests = [];

  for (const c of components) {
    const testDir = path.join(srcRoot, c, "test");
    const indexFile = path.join(testDir, "index.html");
    if (!isDir(testDir) || !isFile(indexFile)) continue;

    // Static assets for this component (serves test/ and .md files)
    app.use(`/src/${c}`, express.static(path.join(srcRoot, c), staticOpts));

    // Optional dynamic routes for this component
    const routesFile = path.join(testDir, "routes.mjs");
    if (isFile(routesFile)) {
      const mod = await import(pathToFileURL(routesFile).href);
      if (typeof mod?.default === "function") {
        mod.default(app);
      } else {
        console.warn(`[routes] ${c}: routes.mjs has no default export function`);
      }
    }

    componentsWithTests.push(c);
  }

  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });

  // Root index: list component test indexes
  app.get("/", (_req, res) => {
    const links = componentsWithTests
      .map((c) => `<li><a href="/src/${c}/test/index.html" data-test-page>${c}</a></li>`)
      .join("\n");

    res.type("html").send(`<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Component Tests</title></head>
  <body>
    <h1>Component test indexes</h1>
    <ul>${links}</ul>
  </body>
</html>`);
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;

  return {
    baseUrl: `http://127.0.0.1:${actualPort}`,
    components: componentsWithTests,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}