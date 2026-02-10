import { chromium } from "playwright";
import { startServer } from "./server/server.mjs";

const TIMEOUT_MS = 15_000;

const CONCURRENCY = Math.max(1, Number(process.env.TEST_CONCURRENCY || "5"));
const VERBOSE = String(process.env.TEST_VERBOSE || "0") === "1";

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

async function pool(items, worker, concurrency) {
  const results = new Array(items.length);
  let i = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  });

  await Promise.all(runners);
  return results;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

const { baseUrl, components, close } = await startServer({ port: 0 });

if (!components || components.length === 0) {
  console.log("No component tests found. Expected src/<component>/index.html");
  await close();
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });

let totalPages = 0;
let totalAssertions = 0;
let totalFailed = 0;

try {
  // 1) Collect pages in parallel (one index.html per component)
  const collectOne = async (component) => {
    const indexPath = `/src/${component}/index.html`;
    const indexUrl = `${baseUrl}${indexPath}`;

    const p = await browser.newPage();
    const perr = [];

    p.on("pageerror", (err) => perr.push(err));
    p.on("console", (msg) => {
      if (msg.type() === "error") perr.push(new Error(msg.text()));
    });

    try {
      await p.goto(indexUrl, { waitUntil: "load", timeout: TIMEOUT_MS });

      // Wait for zero-md to render (if present)
      await p.waitForFunction(() => {
        const els = Array.from(document.querySelectorAll("zero-md"));
        if (els.length === 0) return true;

        return els.every((el) => {
          const sr = el.shadowRoot;
          if (!sr) return false;
          const root = sr.querySelector(".markdown-body, article, main, div");
          if (!root) return false;
          return (root.textContent || "").trim().length > 0;
        });
      }, { timeout: TIMEOUT_MS });

      const linksAbs = await p.evaluate(() => {
        const links = [];

        // Light DOM
        for (const a of document.querySelectorAll("a[data-test-page][href]")) links.push(a.href);

        // Shadow DOM of zero-md (optional but often needed)
        for (const z of document.querySelectorAll("zero-md")) {
          const sr = z.shadowRoot;
          if (!sr) continue;
          for (const a of sr.querySelectorAll("a[data-test-page][href]")) links.push(a.href);
        }

        return links.filter(Boolean);
      });

      if (perr.length) {
        return { component, ok: false, indexPath, error: `console/page errors:\n${perr.map((e) => "  " + e.message).join("\n")}`, pages: [] };
      }

      if (linksAbs.length === 0) {
        return { component, ok: false, indexPath, error: "no links with [data-test-page] found", pages: [] };
      }

      const allowedPrefix = `${baseUrl}/src/${component}/test/`;
      const pagesToRun = uniq(
        linksAbs
          .map((u) => u.trim())
          .filter((u) => u.startsWith(allowedPrefix))
      ).sort();

      if (pagesToRun.length === 0) {
        return {
          component,
          ok: false,
          indexPath,
          error: `no runnable test pages under ${allowedPrefix.replace(baseUrl, "")}`,
          pages: []
        };
      }

      return {
        component,
        ok: true,
        indexPath,
        error: null,
        pages: pagesToRun.map((url) => ({ url, rel: url.replace(baseUrl, ""), component }))
      };
    } catch (e) {
      return { component, ok: false, indexPath, error: e.message, pages: [] };
    } finally {
      await p.close();
    }
  };

  const collected = await pool(components, collectOne, CONCURRENCY);

  const pages = [];
  for (const c of collected) {
    if (!c.ok) {
      fail(`  [${c.component}] FAIL: index ${c.indexPath} -> ${c.error}`);
      continue;
    }

    totalPages += c.pages.length;
    for (const pg of c.pages) pages.push(pg);
  }

  if (pages.length === 0) {
    fail("No runnable test pages found.");
  } else {
    console.log(`\nFound ${pages.length} pages. Running tests with concurrency=${CONCURRENCY}...`);
  }

  // 2) Run pages in parallel
  const runOne = async ({ url, rel }) => {
    const p = await browser.newPage();
    const perr = [];

    p.on("pageerror", (err) => perr.push(err));
    p.on("console", (msg) => {
      if (msg.type() === "error") perr.push(new Error(msg.text()));
    });

    try {
      await p.goto(url, { waitUntil: "load", timeout: TIMEOUT_MS });

      await p.waitForFunction(() => {
        return window.__TEST_RESULTS__ && window.__TEST_RESULTS__.done === true;
      }, { timeout: TIMEOUT_MS });

      const results = await p.evaluate(() => window.__TEST_RESULTS__);
      const assertions = typeof results?.assertions === "number" ? results.assertions : 0;
      const ms = typeof results?.ms === "number" ? results.ms : null;

      return { rel, ok: results?.ok === true && perr.length === 0, results, perr, assertions, ms };
    } catch (e) {
      return { rel, ok: false, results: { message: e.message }, perr, assertions: 0, ms: null };
    } finally {
      await p.close();
    }
  };

  const outcomes = await pool(pages, runOne, CONCURRENCY);

  // 3) Simple reporting per page
  for (const o of outcomes) {
    totalAssertions += o.assertions;

    console.log(`\n- ${o.rel}`);
    if (o.ok) {
      console.log(`  OK${o.ms != null ? ` (${o.ms} ms)` : ""} | ${o.assertions || 0} assertions`);

      if (VERBOSE && o.results?.logs?.length) {
        console.log("  logs:");
        for (const line of o.results.logs) console.log(`    ${line}`);
      }
      continue;
    }

    totalFailed += 1;

    const msg = o.results?.message || o.results?.error?.message || "unknown failure";
    fail(`  FAIL: ${o.rel} -> ${msg}`);

    if (o.results?.logs?.length) {
      console.error("  logs:");
      for (const line of o.results.logs) console.error(`    ${line}`);
    }

    if (o.results?.error?.stack) {
      console.error("  stack:");
      console.error(
        o.results.error.stack
          .split("\n")
          .map((l) => "    " + l)
          .join("\n")
      );
    }

    if (o.perr.length) {
      console.error("  console/page errors:");
      for (const e of o.perr) console.error(`    ${e.message}`);
    }
  }
} finally {
  await browser.close();
  await close();
}

console.log(`\nSummary: ${totalPages} pages | ${totalAssertions} assertions | ${totalFailed} failed | concurrency=${CONCURRENCY}`);

if (process.exitCode === 1) process.exit(1);