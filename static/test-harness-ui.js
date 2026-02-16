// Floating UI panel for manual (non-headless) test sessions.
//
// Features:
// - Source code display with line numbers
// - Active step highlighting (yellow background on current log line)
// - Run / Step / Next controls for step-through execution

export function createUi(actions, { logs, getAssertions, source }) {
  const sourceLines = dedent(source);
  let lastHighlightIdx = -1;

  // --- DOM ---

  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;right:12px;bottom:12px;z-index:99999;" +
    "font:12px system-ui,sans-serif;color:#111;" +
    "background:#fff;border:1px solid rgba(0,0,0,.15);" +
    "border-radius:10px;padding:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);" +
    "max-width:680px;min-width:420px;display:flex;flex-direction:column;max-height:80vh;";

  // -- Button bar --

  const buttonBar = document.createElement("div");
  buttonBar.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:8px;";

  const runBtn = makeBtn("Run");
  runBtn.addEventListener("click", actions.onRun);

  const stepBtn = makeBtn("Step");
  stepBtn.addEventListener("click", actions.onStep);

  const nextBtn = makeBtn("Next");
  nextBtn.hidden = true;
  nextBtn.addEventListener("click", actions.onNext);

  const statusEl = document.createElement("span");
  statusEl.style.cssText = "margin-left:auto;font-weight:600;";
  statusEl.textContent = "Ready";

  const metaEl = document.createElement("span");
  metaEl.style.cssText = "margin-left:8px;color:#666;font-size:11px;";

  buttonBar.append(runBtn, stepBtn, nextBtn, statusEl, metaEl);

  // -- Source code --

  const codeEl = document.createElement("div");
  codeEl.style.cssText =
    "overflow:auto;max-height:50vh;background:#fafafa;" +
    "border-radius:8px;margin-bottom:8px;border:1px solid rgba(0,0,0,.08);" +
    "font:11px/1.6 ui-monospace,'SF Mono',Monaco,'Cascadia Code',monospace;";

  const lineEls = sourceLines.map((line, i) => {
    const div = document.createElement("div");
    div.style.cssText = "padding:0 8px;white-space:pre;transition:background .15s;";

    const numSpan = document.createElement("span");
    numSpan.textContent = String(i + 1).padStart(3) + "  ";
    numSpan.style.cssText = "color:#aaa;user-select:none;";

    div.appendChild(numSpan);
    div.appendChild(document.createTextNode(line));
    codeEl.appendChild(div);

    return div;
  });

  // -- Log output --

  const logEl = document.createElement("pre");
  logEl.style.cssText =
    "margin:0;max-height:100px;overflow:auto;" +
    "background:#f8f8f8;padding:6px 8px;border-radius:8px;font-size:11px;line-height:1.4;";

  panel.append(buttonBar, codeEl, logEl);
  document.body.appendChild(panel);

  // --- Render ---

  function render(state, message, stack) {
    // Update state-dependent elements only when state is provided
    if (state !== undefined) {
      switch (state) {
        case "running":
          statusEl.textContent = "Running\u2026";
          runBtn.disabled = true;
          stepBtn.hidden = true;
          nextBtn.hidden = true;
          break;
        case "stepping":
          statusEl.textContent = "Stepping\u2026";
          runBtn.textContent = "Continue";
          runBtn.disabled = false;
          stepBtn.hidden = true;
          nextBtn.hidden = false;
          nextBtn.disabled = true;
          break;
        case "paused":
          statusEl.textContent = "Paused";
          nextBtn.disabled = false;
          break;
        case "ok":
          statusEl.textContent = "OK";
          runBtn.disabled = true;
          nextBtn.hidden = true;
          break;
        case "fail":
          statusEl.textContent = "FAIL: " + (message || "");
          runBtn.disabled = true;
          nextBtn.hidden = true;
          break;
      }
    }

    // Always update meta and logs
    const res = window.__TEST_RESULTS__;
    const ms = typeof res?.ms === "number" ? res.ms : null;
    const asrt = typeof res?.assertions === "number" ? res.assertions : getAssertions();

    metaEl.textContent = [
      ms != null ? ms + " ms" : null,
      asrt + " assertions"
    ].filter(Boolean).join(" | ");

    logEl.textContent = logs.join("\n");
    if (state === "fail" && stack) {
      logEl.textContent += (logEl.textContent ? "\n\n" : "") + stack;
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  // --- Highlight ---

  function highlightLine(message) {
    if (lastHighlightIdx >= 0 && lastHighlightIdx < lineEls.length) {
      lineEls[lastHighlightIdx].style.background = "";
    }

    const idx = findLine(sourceLines, message, lastHighlightIdx);
    if (idx >= 0) {
      lastHighlightIdx = idx;
      lineEls[idx].style.background = "rgba(250, 204, 21, 0.3)";
      lineEls[idx].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  render();
  return { render, highlightLine };
}

// --- Helpers ---

function makeBtn(label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.style.cssText =
    "padding:5px 10px;border-radius:6px;border:1px solid rgba(0,0,0,.2);" +
    "background:#f7f7f7;cursor:pointer;font:inherit;";
  return btn;
}

function dedent(source) {
  const lines = source.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return lines;
  const min = Math.min(...nonEmpty.map((l) => l.match(/^(\s*)/)[1].length));
  return lines.map((l) => l.slice(min));
}

function findLine(sourceLines, message, afterIndex) {
  function search(str, from) {
    for (let i = from; i < sourceLines.length; i++) {
      if (sourceLines[i].includes(str)) return i;
    }
    return -1;
  }

  // Search forward from last highlighted position
  let idx = search(message, afterIndex + 1);
  if (idx >= 0) return idx;

  // For auto-generated "waitFor start: label" messages, try the label part
  const colonIdx = message.indexOf(": ");
  if (colonIdx >= 0) {
    idx = search(message.slice(colonIdx + 2), afterIndex + 1);
    if (idx >= 0) return idx;
  }

  return -1;
}
