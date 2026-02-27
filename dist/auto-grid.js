// src/core/utils.js
var _sheetCache = /* @__PURE__ */ new Map();
function getOrCreateSheet(cssText) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  const normalized = Array.from(sheet.cssRules, (r) => r.cssText).join("\n");
  if (_sheetCache.has(normalized)) {
    return _sheetCache.get(normalized);
  }
  _sheetCache.set(normalized, sheet);
  return sheet;
}
function registerCss(cssText) {
  adoptSheets(document, [getOrCreateSheet(cssText)]);
}
function adoptSheets(target, sheets) {
  const existing = target.adoptedStyleSheets;
  const newOnes = sheets.filter((s) => !existing.includes(s));
  if (newOnes.length) {
    target.adoptedStyleSheets = [...existing, ...newOnes];
  }
}

// src/auto-grid/auto-grid.css
var auto_grid_default = 'pwc-auto-grid {\n  --pwc-auto-grid-cols: -1;\n  --pwc-auto-grid-gap: 10px;\n  --pwc-auto-grid-min-width: 100px;\n  --pwc-auto-grid-max-width: 1fr;\n\n  /* Total width consumed by gaps (garbage when --cols is -1, but max() below saves it) */\n  --pwc-auto-grid-gap-total: calc((var(--pwc-auto-grid-cols) - 1) * var(--pwc-auto-grid-gap));\n  /* Width each column would have if all cols fit in one row */\n  --pwc-auto-grid-col-optimistic: calc((100% - var(--pwc-auto-grid-gap-total)) / var(--pwc-auto-grid-cols));\n  /* At least --min-width; the max() degrades gracefully when --cols is -1 */\n  --pwc-auto-grid-col-realistic: max(var(--pwc-auto-grid-min-width), var(--pwc-auto-grid-col-optimistic));\n  /* Final column sizing */\n  --pwc-auto-grid-col: minmax(var(--pwc-auto-grid-col-realistic), var(--pwc-auto-grid-max-width));\n\n  display: grid;\n  gap: var(--pwc-auto-grid-gap);\n  grid-template-columns: repeat(auto-fit, var(--pwc-auto-grid-col));\n}\n\npwc-auto-grid > .pwc-auto-grid-wide {\n  grid-column: 1 / -1;\n}\n\n/* Maps cols, gap, and min-width attributes to their CSS custom properties.\n * Guarded so older browsers fall back silently to the defaults above. */\n@supports (width: attr(x length, 0px)) {\n  pwc-auto-grid {\n    --pwc-auto-grid-cols: attr(cols integer, -1);\n    --pwc-auto-grid-gap: attr(gap length, 10px);\n    --pwc-auto-grid-min-width: attr(min-width length, 100px);\n  }\n}\n\n/* \u2500\u2500 Switcher variant (experimental) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n *\n * Requires cols to be set to the intended number of columns.\n *\n * Places all items in one row when the container is wide enough for each item\n * to reach --pwc-auto-grid-min-width. Otherwise each item takes the full width.\n *\n * Technique: produces a CSS "boolean" (0px / 1px) via clamp(), then multiplies\n * by a large factor to force a binary column-width choice \u2014 no media queries.\n */\npwc-auto-grid.switcher {\n  /* 1px when items are too wide to fit, 0px when they fit */\n  --pwc-auto-grid-col-should-break: clamp(\n    0px,\n    var(--pwc-auto-grid-min-width) - var(--pwc-auto-grid-col-optimistic),\n    1px\n  );\n  --pwc-auto-grid-col-should-not-break: calc(1px - var(--pwc-auto-grid-col-should-break));\n\n  /* When breaking: 100% width. When not breaking: equal share of available width. */\n  --pwc-auto-grid-col: calc(\n    min(100%, var(--pwc-auto-grid-col-should-break) * 9999) +\n    min(var(--pwc-auto-grid-col-optimistic), var(--pwc-auto-grid-col-should-not-break) * 9999)\n  );\n}\n';

// src/auto-grid/index.js
function register() {
  registerCss(auto_grid_default);
}
register();
export {
  register
};
