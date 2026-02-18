import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { glob } from "node:fs/promises";
import { chromium } from "playwright";
import { startServer } from "../server/server.mjs";

const TIMEOUT_MS = 15_000;
const VERBOSE = process.env.TEST_VERBOSE === "1";

let browser;
let baseUrl;
let closeServer;

before(async () => {
  const server = await startServer({ port: 0 });
  baseUrl = server.baseUrl;
  closeServer = server.close;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await closeServer?.();
});

async function processPage(t, url) {
  const page = await browser.newPage();
  const errors = [];

  let suppressPattern = null;

  page.on("pageerror", (err) => {
    if (suppressPattern !== null) {
      if (suppressPattern === "" || err.message.includes(suppressPattern)) return;
    }
    errors.push(err);
  });
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.startsWith("__SUPPRESS_ERRORS_START__")) {
      suppressPattern = text.includes(":") ? text.slice(text.indexOf(":") + 1) : "";
      return;
    }
    if (text === "__SUPPRESS_ERRORS_END__") {
      suppressPattern = null;
      return;
    }
    if (msg.type() === "error") {
      if (suppressPattern !== null) {
        if (suppressPattern === "" || text.includes(suppressPattern)) return;
      }
      errors.push(new Error(text));
    }
  });

  try {
    await page.goto(url, { waitUntil: "load", timeout: TIMEOUT_MS });

    await page.waitForFunction(() => {
      return window.__TEST_RESULTS__ && window.__TEST_RESULTS__.done === true;
    }, { timeout: TIMEOUT_MS });

    const results = await page.evaluate(() => window.__TEST_RESULTS__);

    if (VERBOSE && results?.logs?.length) {
      for (const line of results.logs) t.diagnostic(line);
    }

    if (results?.ok !== true || errors.length > 0) {
      const parts = [];

      if (results?.message) parts.push(results.message);
      if (results?.error?.message) parts.push(results.error.message);

      if (results?.error?.stack) {
        parts.push("Stack:\n" + results.error.stack);
      }

      for (const e of errors) {
        parts.push("Page error: " + e.message);
      }

      assert.fail(parts.join("\n") || "Test failed");
    }
  } finally {
    await page.close();
  }
}

const testFiles = [];
for await (const file of glob("src/*/test/*.test.html")) {
  testFiles.push(file);
}
testFiles.sort();

describe("progressive-web-components", { concurrency: true }, () => {
  for (const file of testFiles) {
    it(file, async (t) => {
      await processPage(t, `${baseUrl}/${file}`);
    });
  }
});
