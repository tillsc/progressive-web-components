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

## Build system

`build.js` uses esbuild with `.css` loaded as text. Each component (and variant) produces
a separate ESM bundle in `dist/`. `dist/` is committed to git.

There is no linter or formatter configured.

### Commands

| Command | Description |
|---|---|
| `npm run build` | One-shot build |
| `npm run build:watch` | Incremental rebuild on change |
| `npm test` | Build + run all tests (Playwright, headless) |
| `npm run test:verbose` | Build + run tests with detailed step-by-step output |
| `npm run serve` | Start dev server (port 5123) |
| `npm run watch` | Build watch + dev server (concurrently) |

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

- Tests are written as HTML pages named `*.test.html`
- Test files live in `src/<component>/test/`
- The test runner discovers tests by globbing `src/*/test/*.test.html`
- Tests run via `node:test` with Playwright (headless or interactive)
- A minimal harness provides assertions and result reporting
- No test framework dependency beyond `node:test`
- Tests can also be opened manually in the browser for debugging
- Components may provide dynamic test routes in `src/<component>/test/routes.mjs`
- Run a subset of tests: `node --test --test-name-pattern="filter"`

### Test harness API

`static/testing/harness.js` exports `run(fn)`. The callback receives a context `t`:

- `t.assert(condition, message)` — counted assertion, throws on failure
- `t.equal(actual, expected, message)` — strict equality assertion
- `t.waitFor(predicate, { timeoutMs, intervalMs, message, label })` — poll until truthy
- `t.nextTick(label?)` — await microtask
- `t.log(message)` — log entry (doubles as step-through pause point in UI mode)

In headless mode (Playwright) tests auto-start. In the browser, Run/Step/Next buttons
allow manual debugging.
