# Filter — Internals

## Architecture

`BaseFilter` (`base.js`) extends `PwcSimpleInitElement` and provides the core filtering
logic. It defines a **subclass contract**:

| Hook | Responsibility |
|------|---------------|
| `_createInput()` | Build the search input, return `{ wrapper, input }` |

The vanilla variant returns a plain `<input type="search">`.
The BS5 variant wraps it in a `<div class="mb-2">` with `form-control` class.

## XPath-based matching

XPath was chosen deliberately over query selectors or manual text traversal:

- Matches rendered text content across arbitrary nested markup
- No custom indexing or preprocessing needed
- `translate()` is used for case-insensitive matching (avoids regex compilation per row)
- Evaluation is scoped to the component root via `document.evaluate(expr, this, ...)`

## Token intersection algorithm

The filter splits input into whitespace-separated tokens and resolves each independently
via XPath. Results are then intersected (logical AND) — only rows present in **all** token
result sets remain visible. This keeps the implementation simple without building a
per-row text index.
