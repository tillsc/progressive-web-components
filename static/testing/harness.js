// Minimal browser test harness for HTML-based tests.
//
// Public API (passed into run(fn))
// - t.assert(cond, message)
// - t.equal(actual, expected, message)
// - t.waitFor(predicate, options)
// - t.nextTick(label?)
// - t.log(message)              — await this for step-through support
//
// Runner contract
// - window.__TEST_RESULTS__ = { done, ok, message?, error?, logs?, ms?, assertions? }
//
// Behavior
// - Shows a "Run tests" button when NOT automated
// - Auto-starts ONLY in headless automation (Playwright Chromium headless)
// - Captures window.onerror + unhandledrejection ONLY while the test is running
// - Counts assertions (assert + equal)
// - Step mode: pauses at each log() call, user advances via "Next" button
//
// Notes
// - In UI mode, tests do not start automatically.
// - In UI mode, errors from manual interaction do not fail a test unless you started it.

import { createUi } from "./harness-ui.js";

function isAutomatedHeadless() {
  return navigator.webdriver === true;
}

function serializeError(err) {
  if (!err) return { message: "unknown error", stack: "" };
  if (typeof err === "string") return { message: err, stack: "" };
  return { message: err.message || String(err), stack: err.stack || "" };
}

export function run(fn, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;

  const automated = options.automated ?? isAutomatedHeadless();
  const showUi = options.ui ?? !automated;

  let started = false;
  let finished = false;

  let startedAt = null;
  const logs = [];
  let assertions = 0;

  // Step-through state
  let stepMode = false;
  let stepResolve = null;

  function nowMs() {
    if (startedAt == null) return 0;
    return Math.round(performance.now() - startedAt);
  }

  function pushLog(line) {
    logs.push(line);
    render();
  }

  function log(message) {
    pushLog(`${nowMs()}ms ${String(message)}`);
    highlightLine(message);
    if (stepMode) {
      render("paused");
      return new Promise((resolve) => { stepResolve = resolve; });
    }
  }

  function assert(cond, message = "assertion failed") {
    assertions += 1;
    if (!cond) throw new Error(message);
  }

  function equal(actual, expected, message = "not equal") {
    assertions += 1;
    if (actual !== expected) {
      throw new Error(
        `${message}. expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`
      );
    }
  }

  async function nextTick(label = "nextTick") {
    await log(label);
    await Promise.resolve();
  }

  async function waitFor(
    predicate,
    { timeoutMs: tmo = 10_000, intervalMs = 25, message = "waitFor timeout", label } = {}
  ) {
    const start = performance.now();
    await log(`waitFor start${label ? `: ${label}` : ""}`);

    while (true) {
      try {
        if (await predicate()) {
          return;
        }
      } catch {
        // ignore while waiting
      }
      if (performance.now() - start > tmo) {
        throw new Error(label ? `${message}: ${label}` : message);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  async function suppressErrors(patternOrFn, maybeFn) {
    const pattern = typeof patternOrFn === "string" ? patternOrFn : "";
    const fn = maybeFn || patternOrFn;
    console.log("__SUPPRESS_ERRORS_START__" + (pattern ? ":" + pattern : ""));
    try {
      await fn();
    } finally {
      console.log("__SUPPRESS_ERRORS_END__");
    }
  }

  // Runner reads this. Do not mark as done unless we actually ran.
  window.__TEST_RESULTS__ = { done: false, ok: false, message: "idle" };

  function finishOk() {
    if (finished) return;
    finished = true;

    const ms = startedAt == null ? 0 : Math.round(performance.now() - startedAt);
    window.__TEST_RESULTS__ = { done: true, ok: true, logs, ms, assertions };

    render("ok");
  }

  function finishFail(err) {
    if (finished) return;
    finished = true;

    const e = serializeError(err);
    const ms = startedAt == null ? 0 : Math.round(performance.now() - startedAt);

    window.__TEST_RESULTS__ = {
      done: true,
      ok: false,
      message: e.message,
      error: e,
      logs,
      ms,
      assertions
    };

    render("fail", e.message, e.stack);
  }

  // Global error capture is only active while the test is running.
  function onGlobalError(e) {
    if (!started || finished) return;
    finishFail(e?.error || e?.reason || e?.message || e);
  }

  function installGlobalErrorHandlers() {
    window.addEventListener("error", onGlobalError);
    window.addEventListener("unhandledrejection", onGlobalError);
  }

  function uninstallGlobalErrorHandlers() {
    window.removeEventListener("error", onGlobalError);
    window.removeEventListener("unhandledrejection", onGlobalError);
  }

  // Timeout is armed only once the test starts (UI click or headless autostart).
  let timeoutId = null;

  function armTimeout() {
    if (timeoutId != null) return;
    timeoutId = setTimeout(() => finishFail(new Error("timeout")), timeoutMs);
  }

  function disarmTimeout() {
    if (timeoutId != null) clearTimeout(timeoutId);
    timeoutId = null;
  }

  function cleanup() {
    disarmTimeout();
    uninstallGlobalErrorHandlers();
  }

  function continueStep() {
    if (stepResolve) {
      render("stepping");
      const r = stepResolve;
      stepResolve = null;
      r();
    }
  }

  async function start(stepping = false) {
    if (started) return;
    started = true;
    stepMode = stepping;

    startedAt = performance.now();
    render(stepping ? "stepping" : "running");

    installGlobalErrorHandlers();
    if (!stepping) armTimeout();

    try {
      const t = { assert, equal, waitFor, nextTick, log, suppressErrors };
      await fn(t);
      cleanup();
      finishOk();
    } catch (err) {
      cleanup();
      finishFail(err);
    }
  }

  // --- UI actions ---

  function handleRun() {
    if (!started) {
      start(false);
    } else if (stepMode) {
      // "Continue" — switch from step mode to run mode
      stepMode = false;
      render("running");
      armTimeout();
      continueStep();
    }
  }

  function handleStep() {
    if (!started) {
      start(true);
    }
  }

  // --- UI ---
  let render = () => {};
  let highlightLine = () => {};

  if (showUi) {
    ({ render, highlightLine } = createUi(
      { onRun: handleRun, onStep: handleStep, onNext: continueStep },
      { logs, getAssertions: () => assertions, source: fn.toString() }
    ));
  } else {
    // Headless automation: auto-start.
    start(false);
  }

  return { start };
}
