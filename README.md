# progressive-web-components

[![npm version](https://img.shields.io/npm/v/@tillsc/progressive-web-components)](https://www.npmjs.com/package/@tillsc/progressive-web-components)
[![Tests](https://github.com/tillsc/progressive-web-components/actions/workflows/tests.yml/badge.svg)](https://github.com/tillsc/progressive-web-components/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Server-first web components.

A collection of Custom Elements designed to work with server-rendered HTML and progressive enhancement.

## Principles

- Server-rendered HTML is the baseline
- Custom Elements without Shadow DOM by default
- Small, composable components
- Minimal JavaScript
- No framework lock-in
- Optional framework-specific variants (e.g. Bootstrap 5)

## Components

| Component | Description |
|---|---|
| [`<pwc-shown-if>`](src/conditional-display/) / [`<pwc-hidden-if>`](src/conditional-display/) / [`<pwc-enabled-if>`](src/conditional-display/) / [`<pwc-disabled-if>`](src/conditional-display/) | Conditionally show/hide or enable/disable DOM sections based on a form input |
| [`<pwc-dialog-opener>`](src/dialog-opener/) | Enhances links to open their targets in a modal dialog |
| [`<pwc-filter>`](src/filter/) | Adds a search input to filter arbitrary markup based on free-text input |
| [`<pwc-modal-dialog>`](src/modal-dialog/) | Low-level building block for modal dialogs from JavaScript |
| [`<pwc-multiselect-dual-list>`](src/multiselect-dual-list/) | Dual-list multiselect UI that enhances a native `<select>` element |
| [`<pwc-zone-transfer>`](src/zone-transfer/) | Zone-based drag & drop and keyboard sorting for moving elements between containers |

## Installation

```
npm install @tillsc/progressive-web-components
```

Import individual components:

```js
import "@tillsc/progressive-web-components/filter";
import "@tillsc/progressive-web-components/filter-bs5";
```

Or import all components at once:

```js
import "@tillsc/progressive-web-components/all";
import "@tillsc/progressive-web-components/all-bs5";
```

### Custom builds from source

For more control you can import the unbundled source files directly
(e.g. `src/filter/filter.js`). In that case you need to:

1. Call the exported `define()` function yourself to register the Custom Element.
2. Bundle the accompanying CSS file (`src/<component>/<component>.css`) into your
   stylesheet where one exists.

## Distribution

`dist/` contains one JavaScript file per component (and variant). No build step is required for consumers.

- `conditional-display.js` (no Bootstrap variant needed)
- `dialog-opener.js` / `dialog-opener-bs5.js`
- `filter.js` / `filter-bs5.js`
- `modal-dialog.js` / `modal-dialog-bs5.js`
- `multiselect-dual-list.js` / `multiselect-dual-list-bs5.js`
- `zone-transfer.js` (no Bootstrap variant needed)
- `all.js` / `all-bs5.js` (all components bundled)
