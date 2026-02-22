# Validity — Internals

## Architecture

`BaseValidity` (`base.js`) extends `PwcChildrenObserverElement` (with `observeMode: "tree"` and
`observeAttributes: ["data-validity"]`) and provides the core logic. It defines a **subclass contract**:

| Hook | Responsibility |
|------|---------------|
| `_updateMessage(el, text)` | Display (`text` is a string) or remove (`text` is `null`) the error message in the DOM |

The vanilla variant inserts a `<span class="pwc-validity-message">` after the element.
The BS5 variant adds `is-invalid` to the element and inserts a `<div class="invalid-feedback">`.

Both variants wrap their DOM mutations in `_withoutChildrenChangedNotification()` to prevent
the MutationObserver from re-triggering `onChildrenChanged`.

## Subtree observation

The component observes both child-list mutations (for dynamically added elements) and attribute
mutations filtered to `data-validity`. On connect, `onChildrenChanged([])` scans all existing
`[data-validity]` elements. On subsequent mutations, only the affected elements are processed.

## Applying validity

`_applyValidity(el)` reads the `data-validity` attribute value:
- **Non-empty**: calls `setCustomValidity(value)`, delegates to `_updateMessage`, sets up clearing
- **Empty/removed**: calls `setCustomValidity("")` (only if a custom error was set), delegates to `_updateMessage` with `null`

## Clearing mechanism

`_setupClearing(el)` resolves clearing parameters with per-element override via `??`:
`data-validity-clear-on` / `data-validity-clear-after` on the element take precedence over
`clear-on` / `clear-after` on the component. Either can be set to `"off"` to disable that
clearing channel for a specific element.

The clear action removes the `data-validity` attribute — the MutationObserver then detects this
and calls `_applyValidity` with the empty value, which resets the custom validity. This indirection
keeps the clearing logic in one place regardless of the mutation source.

All event listeners and timeouts are tracked in `_cleanups` and torn down on disconnect.
