# Internals

Developer and maintainer documentation for the project architecture.

## Source structure

Example: `<pwc-multiselect-dual-list>` component

```
src/
  core/
    pwc-element.js
    pwc-simple-init-element.js
    pwc-sentinel-init-element.js
    pwc-children-observer-element.js
    context.js
    transclude.js
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
```

## Base class hierarchy

All components extend one of the init-strategy classes, which in turn extend `PwcElement`.

```
PwcElement
├── PwcSimpleInitElement
├── PwcSentinelInitElement
└── PwcChildrenObserverElement
```

**`PwcElement`** — Shared foundation. Declarative event binding through `static events`
and the `handleEvent` pattern, and a cleanup hook (`onDisconnect()`). No rendering,
no templating.

**`PwcSimpleInitElement`** — Calls `onConnect()` once per connection, deferred to a
microtask. Use this when server-rendered children are available synchronously and a
single microtask is sufficient to let the parser finish.

**`PwcSentinelInitElement`** — Calls `onConnect()` once a sentinel element
(`<pwc-sentinel>` or `[data-pwc-sentinel]`) appears in the light DOM. Uses a
MutationObserver only until the sentinel is found, then disconnects it. Use this
when the component's children are rendered asynchronously (e.g. streamed partials).

**`PwcChildrenObserverElement`** — Calls `onChildrenChanged()` on connect and on every
subsequent child mutation. Supports two modes via `static observeMode`: `"children"`
(direct children only, default) and `"tree"` (full subtree). Optional attribute
observation via `static observeAttributes` (array of attribute names, e.g.
`["data-validity"]`) — when set, `onChildrenChanged()` also fires on changes to the
listed attributes. Provides `_withoutChildrenChangedNotification(fn)` to suppress
observer callbacks during programmatic DOM changes.

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

## Naming conventions

All public names are prefixed with `pwc-` to avoid collisions with other libraries.
Uniqueness within the project is maintained by convention, not by technical enforcement.
Names are chosen for readability and usability first.

### Element tag names

Always use the full component name: `pwc-zone-transfer`, `pwc-multiselect-dual-list`.
These are globally registered and must be unique across all libraries.

### Host attributes

Attributes on the component element itself carry no prefix — they're already scoped by
the element's tag name. Examples: `hide-selected`, `clear-on`, `clear-after`.

### Data attributes on descendant elements

Use `data-pwc-<semantic-name>`. The component element provides the context, so the
component name is **not** repeated in the attribute name:

```html
<!-- correct -->
<pwc-zone-transfer>
  <div data-pwc-zone="available">
    <div data-pwc-item>Alice</div>
  </div>
</pwc-zone-transfer>

<!-- wrong: component name is redundant in context -->
<div data-pwc-zone-transfer-zone="available">
```

Exception: if an attribute's meaning cannot be inferred from context (e.g. it targets
an element shared across multiple components, or appears far from the component root),
a qualifier may be added.

### CSS classes on internal elements

Use `pwc-<component-name>-<role>`. The full component name makes classes discoverable
in DevTools and third-party stylesheets:

```css
.pwc-multiselect-dual-list-item   /* good */
.pwc-msdl-item                    /* avoid: abbreviation requires prior knowledge */
```

### CSS custom properties

Use `--pwc-<component-name>-<property>`. As with classes, the full component name aids
discoverability when reading a stylesheet:

```css
--pwc-modal-dialog-backdrop       /* good */
--pwc-md-backdrop                 /* avoid */
```

### Event names

Use `<component-name>:<event>` (colon-separated), e.g. `pwc-zone-transfer:change`.

## Variants (e.g. Bootstrap 5)

- Implemented as separate component variants
- Located in a dedicated subdirectory per component (e.g. `bs5/`)
- Same behavior as the base, variant-specific DOM structure
- Optional variant-specific CSS
- Built as separate distribution artifacts

## Build system

`build.js` uses esbuild with `.css` loaded as text. Each component (and variant) produces
a separate ESM bundle in `dist/`. `dist/` is committed to git.

### All-bundles (`src/index.js` / `src/index-bs5.js`)

Every component must appear in **both** all-bundles. `index-bs5.js` imports the `bs5/`
variant where one exists, and the plain component otherwise. When adding a new component
without a BS5 variant, add it to both files.

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
- CSS is installed once at define time via `registerCss(cssText)` from `utils.js`
- No per-instance style registration

### Shared utilities (`utils.js`)

General helpers:

- `ensureId(el, prefix)` — assigns a random ID if the element has none
- `defineOnce(name, classDef)` — registers a Custom Element only if the name isn't taken
- `tokenList(str)` — parses a space-separated string into a `DOMTokenList`

Constructable stylesheet management (shared module-level cache):

- `registerCss(cssText)` — registers a stylesheet on the document (shorthand below)
- `getOrCreateSheet(cssText)` — creates a `CSSStyleSheet`, caches by browser-normalized CSS
  (whitespace differences share the same sheet)
- `fetchSheet(url)` — fetches CSS by URL, caches the resulting sheet
- `adoptSheets(target, sheets)` — adopts sheets into a target (`document` or `shadowRoot`),
  deduplicating by reference

### Context Protocol (`context.js`)

- `requestContext(element, name)` — W3C Context Protocol DI. Dispatches a
  `context-request` event from `element`, falls back to `window.PWC?.[name]`.

### Transclusion (`transclude.js`)

Shared DOM replacement logic used by `pwc-include`, `pwc-dialog-opener`,
`pwc-auto-submit`, and future components that fetch HTML and insert it into
the page.

- `transclude(target, content, contextElement)` — Replaces children of `target`
  with `content` (string or node array). Supports an optional morph library via
  the `"idiomorph"` context.
- `executeScripts(root)` — Re-creates `<script>` elements so the browser executes them.

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
- Run a subset of tests: `node --test --test-name-pattern="filter"`

### Test harness API

`static/testing/harness.js` exports `run(fn)`. The callback receives a context `t`:

- `t.assert(condition, message)` — counted assertion, throws on failure
- `t.equal(actual, expected, message)` — strict equality assertion
- `t.waitFor(predicate, { timeoutMs, intervalMs, message, label })` — poll until truthy
- `t.nextTick(label?)` — await microtask
- `t.log(message)` — log entry (doubles as step-through pause point in UI mode)
- `t.suppressErrors(fn)` — suppress all console errors during `fn`
- `t.suppressErrors(pattern, fn)` — suppress only errors matching `pattern`

`static/testing/mock-server.js` provides Service Worker based request mocking:

- `mockRoutes(routes)` — registers a SW that intercepts fetch requests
  matching the given routes. Each route is `{ path, handle(request) }`
  where `path` is resolved relative to the page URL (e.g. `"./mock/basic"`)
  and `handle` returns a `Response`. Handlers run on the page and have
  full DOM access.
- `echoElement(selector, { values, texts })` — clones an element (or
  `<template>` content) from the current page and applies changes.
  `values` maps selectors to `value` attributes, `texts` maps selectors
  to `textContent`. Returns a `Response`.

`static/testing/helpers.js` provides DOM interaction helpers:

- `setValue(el, value, { change })` — set value and dispatch input/change events
- `click(el)` — dispatch click event
- `clickRadio(radio)` — check radio and dispatch change
- `toggleCheckbox(cb, checked?)` — toggle checkbox and dispatch change; if `checked` is provided, set to that value instead of toggling
- `drag(item, targetZone, { clientY })` — simulate drag-and-drop
- `key(el, k, opts)` — dispatch keyboard event
- `waitForEvent(el, name, { timeoutMs })` — returns a Promise that resolves with the event

In headless mode (Playwright) tests auto-start. In the browser, Run/Step/Next buttons
allow manual debugging.

### Error suppression

The test runner (`test/run.mjs`) collects all console errors and page errors during a test
and fails if any are present. Some tests intentionally trigger errors (e.g. fetching a
non-existent URL to test fallback behaviour).

`t.suppressErrors(pattern?, fn)` uses console markers (`__SUPPRESS_ERRORS_START__` /
`__SUPPRESS_ERRORS_END__`) to signal the runner. The runner's console handler recognises
these markers and skips matching errors between them.

**Why console markers instead of a `window` variable?** The runner's event handler runs in
Node (Playwright). Reading a browser variable would require `page.evaluate()` which is async.
Between the moment the error arrives and the evaluate completing, the test may have already
cleared the flag — a race condition. Console messages are delivered in order by Playwright,
so START always arrives before the error, which arrives before END.
