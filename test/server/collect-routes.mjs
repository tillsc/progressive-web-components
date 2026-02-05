import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function collectRoutes(srcRootAbs) {
  const components = fs
    .readdirSync(srcRootAbs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const routes = [];

  for (const component of components) {
    const file = path.join(srcRootAbs, component, "test", "routes.mjs");
    if (!fs.existsSync(file)) continue;

    const mod = await import(pathToFileURL(file).href);

    if (typeof mod.attach !== "function") {
      throw new Error(`src/${component}/test/routes.mjs must export function attach(router, ctx)`);
    }

    routes.push({
      component,
      file,
      attach: mod.attach
    });
  }

  return routes;
}