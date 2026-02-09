# progressive-web-components

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
|-----------|-------------|
| [`<pwc-dialog-opener>`](src/dialog-opener/README.md) | Enhances links to open their targets in a modal dialog |
| [`<pwc-modal-dialog>`](src/modal-dialog/README.md) | Low-level building block for modal dialogs from JavaScript |

Each component ships a **vanilla** variant and a **Bootstrap 5** variant.

## Distribution

`dist/` contains one JavaScript file per component variant. No build step required for consumers.

- `dialog-opener.js` / `dialog-opener-bs5.js`
- `modal-dialog.js` / `modal-dialog-bs5.js`
