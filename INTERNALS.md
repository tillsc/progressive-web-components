# Internals

Developer and maintainer documentation for the project architecture.

## Source structure

Example: `<pwc-multiselect-dual-list>` component

    src/
        core/
            pwc-element.js
            pwc-simple-init-element.js
            pwc-sentinel-init-element.js
            pwc-children-observer-element.js
            utils.js

        multiselect-dual-list/
            base.js
            multiselect-dual-list.js
            multiselect-dual-list.css
            index.js

            bs5/
                multiselect-dual-list.js
                index.js

    dist/
        multiselect-dual-list.js
        multiselect-dual-list-bs5.js

## Base class hierarchy

All components extend one of the init-strategy classes, which in turn extend `PwcElement`.

    PwcElement
    ├── PwcSimpleInitElement
    ├── PwcSentinelInitElement
    └── PwcChildrenObserverElement

**`PwcElement`** — Shared foundation. Idempotent lifecycle via a `_connected` guard,
declarative event binding through `static events` and the `handleEvent` pattern,
and a cleanup hook (`onDisconnect()`). No rendering, no templating.

**`PwcSimpleInitElement`** — Calls `onConnect()` once per connection, deferred to a
microtask. Use this when server-rendered children are available synchronously and a
single microtask is sufficient to let the parser finish.

**`PwcSentinelInitElement`** — Calls `onConnect()` once a sentinel element
(`<pwc-sentinel>` or `[data-pwc-sentinel]`) appears in the light DOM. Uses a
MutationObserver only until the sentinel is found, then disconnects it. Use this
when the component's children are rendered asynchronously (e.g. streamed partials).

**`PwcChildrenObserverElement`** — Calls `onChildrenChanged()` on connect and on every
subsequent child mutation. Supports two modes via `static observeMode`: `"children"`
(direct children only, default) and `"tree"` (full subtree). Provides
`_withoutChildrenChangedNotification(fn)` to suppress observer callbacks during
programmatic DOM changes.

### Choosing a base class

- **Children are static after init?** → `PwcSimpleInitElement`
- **Children arrive asynchronously (streamed HTML)?** → `PwcSentinelInitElement`
- **Component must react to ongoing child mutations?** → `PwcChildrenObserverElement`

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
