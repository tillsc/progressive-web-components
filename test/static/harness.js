// Minimal browser test harness for HTML-based tests.
//
// Public API (passed into run(fn))
// - t.assert(cond, message)
// - t.equal(actual, expected, message)
// - t.waitFor(predicate, options)
// - t.nextTick(label?)
// - t.log(message)
//
// Runner contract
// - window.__TEST_RESULTS__ = { done, ok, message?, error?, logs?, ms?, assertions? }
//
// Behavior
// - Shows a "Run tests" button when NOT automated
// - Auto-starts ONLY in headless automation (Playwright Chromium headless)
// - Captures window.onerror + unhandledrejection ONLY while the test is running
// - Counts assertions (assert + equal)
//
// Notes
// - In UI mode, tests do not start automatically.
// - In UI mode, errors from manual interaction do not fail a test unless you started it.

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
    log(label);
    await Promise.resolve();
  }

  async function waitFor(
    predicate,
    { timeoutMs: tmo = 10_000, intervalMs = 25, message = "waitFor timeout", label } = {}
  ) {
    const start = performance.now();
    log(`waitFor start${label ? `: ${label}` : ""}`);

    while (true) {
      try {
        if (await predicate()) {
          log(`waitFor ok${label ? `: ${label}` : ""}`);
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

  async function start() {
    if (started) return;
    started = true;

    startedAt = performance.now();
    render("running");

    installGlobalErrorHandlers();
    armTimeout();

    try {
      const t = { assert, equal, waitFor, nextTick, log };
      await fn(t);
      cleanup();
      finishOk();
    } catch (err) {
      cleanup();
      finishFail(err);
    }
  }

  // --- UI (only for non-automation sessions)
  let panel, statusEl, metaEl, logEl;

  function render(state, message, stack) {
    if (!panel) return;

    const res = window.__TEST_RESULTS__;
    const ms = typeof res?.ms === "number" ? res.ms : null;
    const asrt = typeof res?.assertions === "number" ? res.assertions : assertions;

    if (!started) statusEl.textContent = "Ready";
    else if (state === "running") statusEl.textContent = "Running…";
    else if (state === "ok") statusEl.textContent = "OK";
    else if (state === "fail") statusEl.textContent = `FAIL: ${message || ""}`;

    metaEl.textContent = [
      started && ms != null ? `${ms} ms` : null,
      `${asrt} assertions`
    ].filter(Boolean).join(" | ");

    const text = logs.join("\n");
    logEl.textContent = text;

    if (state === "fail" && stack) {
      logEl.textContent = text ? `${text}\n\n${stack}` : stack;
    }
  }

  if (showUi) {
    panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;right:12px;bottom:12px;z-index:99999;" +
      "font:12px system-ui,sans-serif;color:#111;" +
      "background:#fff;border:1px solid rgba(0,0,0,.15);" +
      "border-radius:10px;padding:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);" +
      "max-width:520px;min-width:320px;";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Run tests";
    button.style.cssText =
      "padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.2);" +
      "background:#f7f7f7;cursor:pointer;";

    statusEl = document.createElement("div");
    statusEl.style.cssText = "margin-top:8px;font-weight:600;";

    metaEl = document.createElement("div");
    metaEl.style.cssText = "margin-top:4px;color:#444;";

    logEl = document.createElement("pre");
    logEl.style.cssText =
      "margin-top:8px;max-height:240px;overflow:auto;" +
      "background:#f8f8f8;padding:8px;border-radius:8px;";

    button.addEventListener("click", start);

    panel.appendChild(button);
    panel.appendChild(statusEl);
    panel.appendChild(metaEl);
    panel.appendChild(logEl);
    document.body.appendChild(panel);

    render();
  } else {
    // Headless automation: auto-start.
    start();
  }

  return { start };
}