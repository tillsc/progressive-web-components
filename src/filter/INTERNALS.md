# Filter — Internals

## Architecture

`BaseFilter` (`base.js`) extends `PwcSimpleInitElement` and provides the core filtering
logic. It defines a **subclass contract**:

| Hook | Responsibility |
|------|---------------|
| `_createInput()` | Build the search input, return `{ wrapper, input }` |

The vanilla variant returns a plain `<input type="search">`.
The BS5 variant wraps it in a `<div class="mb-2">` with `form-control` class.

## Text matching

Each row's `textContent` is normalized (collapse whitespace, lowercase) and checked
against every token via `String.prototype.includes()`. This gives full Unicode
case-insensitive matching through the native `toLowerCase()` implementation.

## Token logic

The filter splits input into whitespace-separated tokens. A row is visible only if
**all** tokens appear in its normalized text content (logical AND).
