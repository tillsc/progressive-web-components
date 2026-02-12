# Filter — Internals

## Architecture

`BaseFilter` (`base.js`) extends `PwcSimpleInitElement` and provides the core filtering
logic. It defines a **subclass contract**:

| Hook | Responsibility |
|------|---------------|
| `_createInput()` | Build the search input, return `{ wrapper, input }` |

The vanilla variant returns a plain `<input type="search">`.
The BS5 variant wraps it in a `<div class="mb-2">` with `form-control` class.

## Input placement

`defaultInputSelector` is used to find an optional target element. The wrapper
returned by `_createInput()` is placed inside this target, or prepended to the
component if none is found.

## Text matching

Each row's `textContent` is normalized (collapse whitespace, lowercase) and checked
against every token via `String.prototype.includes()`. This gives full Unicode
case-insensitive matching through the native `toLowerCase()` implementation.

## Status element

`defaultStatusSelector` is used to find a user-provided status element. If none
is found, a visually hidden `<span>` is created and appended.

ARIA attributes (`role`, `aria-live`, `aria-atomic`) are only set when the
attribute is not already present, so authors can override defaults (e.g.
`aria-live="assertive"`).
