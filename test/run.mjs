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
      results[idx] = await worker(items[idx]);
    }
  });

  await Promise.all(runners);
  return results;
}

const { baseUrl, components, close } = await startServer({ port: 0 });

if (!components || components.length === 0) {
  console.log("No component tests found. Expected src/<component>/test/index.html");
  await close();
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });

let totalPages = 0;
let totalAssertions = 0;
let totalFailed = 0;

try {
  for (const component of components) {
    const indexPath = `/src/${component}/test/index.html`;
    const indexUrl = `${baseUrl}${indexPath}`;

    console.log(`\n## ${component}`);
    console.log(`- index: ${indexPath}`);

    const indexPage = await browser.newPage();
    const indexErrors = [];

    indexPage.on("pageerror", (err) => indexErrors.push(err));
    indexPage.on("console", (msg) => {
      if (msg.type() === "error") indexErrors.push(new Error(msg.text()));
    });

    let linksAbs = [];

    try {
      await indexPage.goto(indexUrl, { waitUntil: "load", timeout: TIMEOUT_MS });

      linksAbs = await indexPage.evaluate(() => {
        return Array.from(document.querySelectorAll("a[data-test-page][href]"))
          .map((a) => a.href)
          .filter(Boolean);
      });
    } catch (e) {
      fail(`  FAIL: index ${indexPath} -> ${e.message}`);
      await indexPage.close();
      continue;
    } finally {
      await indexPage.close();
    }

    if (indexErrors.length) {
      fail(
        `  FAIL: index ${indexPath} -> console/page errors:\n` +
          indexErrors.map((e) => "    " + e.message).join("\n")
      );
      continue;
    }

    if (linksAbs.length === 0) {
      fail(`  FAIL: index ${indexPath} -> no links with [data-test-page] found`);
      continue;
    }

    const allowedPrefix = `${baseUrl}/src/${component}/test/`;
    const pagesToRun = linksAbs
      .map((u) => u.trim())
      .filter((u) => u.startsWith(allowedPrefix))
      .filter((u, i, arr) => arr.indexOf(u) === i)
      .sort();

    if (pagesToRun.length === 0) {
      fail(`  FAIL: index ${indexPath} -> no runnable test pages under ${allowedPrefix.replace(baseUrl, "")}`);
      continue;
    }

    totalPages += pagesToRun.length;

    const runOne = async (url) => {
      const rel = url.replace(baseUrl, "");
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

        return {
          rel,
          ok: results?.ok === true && perr.length === 0,
          results,
          perr,
          assertions,
          ms
        };
      } catch (e) {
        return { rel, ok: false, results: { message: e.message }, perr, assertions: 0, ms: null };
      } finally {
        await p.close();
      }
    };

    const outcomes = await pool(pagesToRun, runOne, CONCURRENCY);

    for (const o of outcomes) {
      totalAssertions += o.assertions;

      console.log(`- ${o.rel}`);
      if (o.ok) {
        const a = o.assertions ? `${o.assertions} assertions` : "0 assertions";
        const t = o.ms != null ? `${o.ms} ms` : null;
        console.log(`  OK${t ? ` (${t})` : ""} | ${a}`);

        if (VERBOSE && o.results?.logs?.length) {
          console.log("  logs:");
          for (const line of o.results.logs) console.log(`    ${line}`);
        }
        continue;
      }

      totalFailed += 1;

      const msg =
        o.results?.message ||
        o.results?.error?.message ||
        "unknown failure";

      fail(`  FAIL: ${o.rel} -> ${msg}`);

      if (o.results?.logs?.length) {
        console.error("    logs:");
        for (const line of o.results.logs) console.error(`      ${line}`);
      }

      if (o.results?.error?.stack) {
        console.error("    stack:");
        console.error(
          o.results.error.stack
            .split("\n")
            .map((l) => "      " + l)
            .join("\n")
        );
      }

      if (o.perr.length) {
        console.error("    console/page errors:");
        for (const e of o.perr) console.error(`      ${e.message}`);
      }
    }
  }
} finally {
  await browser.close();
  await close();
}

console.log(`\nSummary: ${totalPages} pages | ${totalAssertions} assertions | ${totalFailed} failed | concurrency=${CONCURRENCY}`);

if (process.exitCode === 1) process.exit(1);