import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer({ port = 0 } = {}) {
  const app = express();

  const repoRoot = path.resolve(__dirname, "..");

  app.get("/favicon.ico", (_req, res) => { res.status(204).end(); });

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
