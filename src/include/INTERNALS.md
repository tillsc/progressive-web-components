# Include — Internals

## Architecture

`PwcInclude` extends `PwcSimpleInitElement`. There is no base class or variant — the component
is simple enough to live in a single file.

## Lifecycle

1. `onConnect()` calls `_load()`
2. `_load()` checks the three gates in order: missing `src` → `media` mismatch → `lazy` not yet triggered
3. If all gates pass, `_fetch(src)` is called

## Attribute reactivity

`observedAttributes` covers `src` and `media`. `attributeChangedCallback` triggers `_load()`
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
visible, the observer disconnects and `_load()` is re-invoked. `_lazyTriggered` ensures
the observer is only used once; subsequent `refresh()` calls bypass it.
