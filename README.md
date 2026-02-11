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

| Component                                                                               | Description |
|-----------------------------------------------------------------------------------------|-------------|
| <a href="src/dialog-opener/" data-test-page>&lt;pwc-dialog-opener&gt;</a>               | Enhances links to open their targets in a modal dialog |
| <a href="src/filter/" data-test-page>&lt;pwc-filter&gt;</a>                             | Adds a search input to filter arbitrary markup based on free-text input |
| <a href="src/modal-dialog/" data-test-page>&lt;pwc-modal-dialog&gt;</a>                 | Low-level building block for modal dialogs from JavaScript |
| <a href="src/multiselect-dual-list/" data-test-page>&lt;pwc-multiselect-dual-list&gt;</a> | Dual-list multiselect UI that enhances a native `<select>` element |
| <a href="src/zone-transfer/" data-test-page>&lt;pwc-zone-transfer&gt;</a>               | Zone-based drag & drop and keyboard sorting for moving elements between containers |

## Distribution

`dist/` contains one JavaScript file per component (and variant). No build step is required for consumers.

- `dialog-opener.js` / `dialog-opener-bs5.js`
- `filter.js` / `filter-bs5.js`
- `modal-dialog.js` / `modal-dialog-bs5.js`
- `multiselect-dual-list.js` / `multiselect-dual-list-bs5.js`
- `zone-transfer.js` (no Bootstrap variant needed)
- `all.js` / `all-bs5.js` (all components bundled)
