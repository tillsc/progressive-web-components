import { chromium } from "playwright";
import { startServer } from "./server/server.mjs";

const TIMEOUT_MS = 15_000;

const CONCURRENCY = Math.max(1, Number(process.env.TEST_CONCURRENCY || "5"));
const VERBOSE = String(process.env.TEST_VERBOSE || "0") === "1";

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

async function processPage(browser, url) {
  const p = await browser.newPage();
  const perr = [];

  p.on("pageerror", (err) => perr.push(err));
  p.on("console", (msg) => {
    if (msg.type() === "error") perr.push(new Error(msg.text()));
  });

  try {
    await p.goto(url, { waitUntil: "load", timeout: TIMEOUT_MS });

    // Wait for zero-md to render (if present)
    await p.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll("zero-md"));
      if (els.length === 0) return true;

      return els.every((el) => {
        const sr = el.shadowRoot;
        if (!sr) return false;
        const root = sr.querySelector(".markdown-body");
        if (!root) return false;
        return (root.textContent || "").trim().length > 0;
      });
    }, { timeout: TIMEOUT_MS });

    // Scan for data-test-page links in Light DOM + zero-md Shadow DOM
    const links = await p.evaluate(() => {
      const result = [];

      // Light DOM
      for (const a of document.querySelectorAll("a[data-test-page][href]")) result.push(a.href);

      // Shadow DOM of zero-md
      for (const z of document.querySelectorAll("zero-md")) {
        const sr = z.shadowRoot;
        if (!sr) continue;
        for (const a of sr.querySelectorAll("a[data-test-page][href]")) result.push(a.href);
      }

      return result.filter(Boolean);
    });

    // Check if this page has test results
    let testResult = null;
    const hasTests = await p.evaluate(() => typeof window.__TEST_RESULTS__ !== "undefined");

    if (hasTests) {
      await p.waitForFunction(() => {
        return window.__TEST_RESULTS__ && window.__TEST_RESULTS__.done === true;
      }, { timeout: TIMEOUT_MS });

      const results = await p.evaluate(() => window.__TEST_RESULTS__);
      const assertions = typeof results?.assertions === "number" ? results.assertions : 0;
      const ms = typeof results?.ms === "number" ? results.ms : null;
      const rel = new URL(url).pathname;

      testResult = {
        rel,
        ok: results?.ok === true && perr.length === 0,
        results,
        perr,
        assertions,
        ms
      };
    }

    if (!hasTests && perr.length > 0) {
      const rel = new URL(url).pathname;
      fail(`  [${rel}] console/page errors:\n${perr.map((e) => "  " + e.message).join("\n")}`);
    }

    return { links, testResult };
  } catch (e) {
    const rel = new URL(url).pathname;
    const hasTests = await p.evaluate(() => typeof window.__TEST_RESULTS__ !== "undefined").catch(() => false);

    if (hasTests) {
      return {
        links: [],
        testResult: { rel, ok: false, results: { message: e.message }, perr, assertions: 0, ms: null }
      };
    }

    fail(`  [${rel}] error: ${e.message}`);
    return { links: [], testResult: null };
  } finally {
    await p.close();
  }
}

async function crawl(browser, startUrl, concurrency) {
  const seen = new Set([startUrl]);
  const queue = [startUrl];
  const results = [];
  let active = 0;

  let wakeup;
  let signal = new Promise((r) => { wakeup = r; });

  function notify() {
    wakeup();
    signal = new Promise((r) => { wakeup = r; });
  }

  function rel(url) {
    return url.startsWith(startUrl) ? url.slice(startUrl.length - 1) : url;
  }

  function enqueue(url, from) {
    if (seen.has(url)) return;
    seen.add(url);
    queue.push(url);
    console.log(`  + ${rel(url)}${VERBOSE ? ` (from ${rel(from)})` : ""}`);
    notify();
  }

  async function worker() {
    while (true) {
      while (queue.length === 0) {
        if (active === 0) return;
        await signal;
      }

      const url = queue.shift();
      active++;
      try {
        if (VERBOSE) console.log(`  > ${rel(url)} ...`);
        const { links, testResult } = await processPage(browser, url);
        for (const link of links) enqueue(link, url);
        if (testResult) results.push(testResult);
        if (VERBOSE) {
          const parts = [];
          if (links.length) parts.push(`${links.length} links`);
          if (testResult) parts.push(testResult.ok ? "test OK" : "test FAIL");
          if (parts.length) console.log(`    ${parts.join(", ")}`);
        }
      } finally {
        active--;
        notify();
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const { baseUrl, close } = await startServer({ port: 0 });

const browser = await chromium.launch({ headless: true });

let totalPages = 0;
let totalAssertions = 0;
let totalFailed = 0;

try {
  console.log(`Crawling from / (concurrency=${CONCURRENCY})...`);
  const results = await crawl(browser, baseUrl + "/", CONCURRENCY);

  totalPages = results.length;

  if (totalPages === 0) {
    fail("No test pages found.");
  } else {
    console.log(`\nFound ${totalPages} test pages. Running with concurrency=${CONCURRENCY}...\n`);
  }

  // Reporting
  for (const o of results) {
    totalAssertions += o.assertions;

    console.log(`- ${o.rel}`);
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
