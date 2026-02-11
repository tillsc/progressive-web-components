# Internals

Developer and maintainer documentation for the project architecture.

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

- Base classes define shared logic and stable DOM contracts
- Public variants subclass the base class
- Each public variant defines exactly one Custom Element
- Stable internal markup with explicit styling hooks
- Shared runtime helpers are imported, not duplicated

## Variants (e.g. Bootstrap 5)

- Implemented as separate component variants
- Located in a dedicated subdirectory per component (e.g. `bs5/`)
- Same behavior as the base, variant-specific DOM structure
- Optional variant-specific CSS
- Built as separate distribution artifacts

## CSS handling

- Authoritative styles live in plain `.css` files
- Component source files do not import CSS directly
- `index.js` files are responsible for bundling JS and CSS
- CSS is installed once at define time
- No per-instance style registration

## Trust model for attributes

Attribute values are trusted and may be inserted via `innerHTML` without escaping.
Attributes are authored by the page developer, not by end users. If an attacker can
modify HTML attributes, they already have full control over the page and can inject
scripts directly. Escaping attribute-sourced values would be security theater.

Child content (e.g. iframe responses, user input) is a different story and must be
handled with care.

## Testing

- Tests are written as HTML pages
- Each component may provide `src/<component>/test/index.html`
- Test pages are explicitly listed via `data-test-page` links
- Tests run in a real browser (headless or interactive)
- A minimal harness provides assertions and result reporting
- No test framework dependency
- Tests can be run headless via Playwright or manually in the browser
