# progressive-web-components

Server-first web components.

This repository collects Custom Elements designed to work with server-rendered HTML and progressive enhancement.

## Principles

- Server-rendered HTML is the baseline
- Custom Elements without Shadow DOM by default
- Small, composable components
- Minimal JavaScript
- No framework lock-in
- Bundler-independent source files
- JavaScript-only distribution artifacts
- Optional framework-specific variants (e.g. Bootstrap 5)

## Source structure

Example: `<dialog-opener>` component

    src/
        core/
            css.js
            pwc-element.js

        dialog-opener/
            base.js
            dialog-opener.js
            dialog-opener.css
            index.js

            bs5/
                dialog-opener.js
                index.js

    dist/
        dialog-opener.js
        dialog-opener-bs5.js

## Component conventions

- Each component has an internal base class (`base.js`)
- Base classes are not registered as Custom Elements
- Base classes define shared logic and stable DOM contracts
- Public variants subclass the base class
- Each public variant defines exactly one Custom Element
- No Shadow DOM
- Stable internal markup with explicit styling hooks
- Shared runtime helpers are imported, not duplicated

## Variants (e.g. Bootstrap 5)

- Implemented as separate component variants
- Located in a dedicated subdirectory per component (e.g. `bs5/`)
- Subclass the shared base implementation
- Same behavior as the base, variant-specific DOM structure
- Optional variant-specific CSS
- Built as separate distribution artifacts

## CSS handling

- Authoritative styles live in plain `.css` files
- Component source files do not import CSS directly
- `index.js` files are responsible for bundling JS and CSS
- CSS is installed once at define time
- No per-instance style registration

## Distribution

- `dist/` contains JavaScript files only
- One file per component variant
- Base implementations are not published
- Components may be bundled or code-split
- No required build step for consumers

## Testing

- Tests are written as HTML pages
- Each component may provide `src/<component>/test/index.html`
- Test pages are explicitly listed via `data-test-page` links
- Tests run in a real browser (headless or interactive)
- A minimal harness provides assertions and result reporting
- No test framework dependency
- Tests can be run headless via Playwright or manually in the browser