# Include — Internals

## Architecture

`PwcInclude` extends `PwcSimpleInitElement`. There is no base class or variant — the component
is simple enough to live in a single file.

## Lifecycle

1. `onConnect()` calls `refresh()`
2. `refresh()` checks the gates in order: missing `src` → `media` mismatch → `lazy` not yet triggered
3. If all gates pass, `_fetch(src)` is called

## Attribute reactivity

`observedAttributes` covers `src` and `media`. `attributeChangedCallback` triggers `refresh()`
on any change (guarded by `isConnected` and value-equality checks).

## Fetch & abort

Each `_fetch()` call creates a fresh `AbortController`. A new fetch aborts any pending previous
request first. On disconnect, pending requests are aborted via `_abortPending()`.

## Fallback (`alt`)

When the primary fetch fails (network error or non-2xx status), `_fetch()` checks for an `alt`
attribute and re-calls itself with the fallback URL. The `src !== alt` guard prevents infinite
loops when both URLs fail.

## Fragment extraction

When a `fragment` attribute is present, the response is parsed with `DOMParser` and
`querySelectorAll(fragment)` extracts all matches. The matched elements themselves are
adopted into the document and replace the element's children.

## Script execution (`with-scripts`)

`_executeScripts()` iterates over all `<script>` elements in the inserted DOM and
replaces them with fresh `<script>` elements (preserving `src`, `type` and `noModule`)
so the browser executes them.

## Lazy loading

`_setupLazy()` creates an `IntersectionObserver` that watches the element. Once it becomes
visible, the observer disconnects and `refresh()` is re-invoked. `_lazyTriggered` ensures
the observer is only used once; subsequent `refresh()` calls bypass it.

## Shadow DOM (`shadow`)

The shadow root is created lazily at the beginning of `_insert()`, not during `onConnect()`.
This keeps the original light DOM content (e.g. a loading placeholder) visible until the
fetched content is ready. The `root` getter returns the shadow root when present, otherwise
the element itself — all content insertion and script execution go through `root`.

## Style extraction (`extract-styles`)

When set, `_insert()` always parses the response with `DOMParser` (even without `fragment`).
The pipeline:

1. `_collectStyleElements()` gathers `<style>` and `<link rel="stylesheet">` based on the mode
2. Collected elements are removed from the parsed DOM before content insertion
3. `_resolveSheets()` converts them into `CSSStyleSheet` objects using the shared cache
   in `utils.js` (`getOrCreateSheet` for inline CSS, `fetchSheet` for URLs)
4. `adoptSheets()` adds sheets to the target (shadow root or document),
   skipping any already adopted (reference equality)

Styles are adopted before content is inserted to prevent FOUC in shadow DOM.

The cache is module-level in `utils.js` and shared across all component instances. For `<link>`
elements, the URL is resolved relative to the include's `src` attribute. For inline `<style>`,
the browser normalizes the CSS via `CSSStyleSheet.replaceSync()` and `cssRules` serialization,
so whitespace differences don't create duplicate cache entries.
