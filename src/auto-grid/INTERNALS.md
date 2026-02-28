# `<pwc-auto-grid>` — Internals

## Architecture

`pwc-auto-grid` is a pure CSS component. No custom element is registered via
`customElements.define()`. The element tag serves only as a CSS selector.

`index.js` calls `registerCss(cssText)` at import time to inject the stylesheet
via a constructable `CSSStyleSheet` adopted on the document.

The `cols`, `gap`, and `min-width` attributes are mapped to their CSS custom
properties via `attr()` with type keywords (CSS Values Level 5,
[spec](https://www.w3.org/TR/css-values-5/#attr-notation)), wrapped in an
`@supports (width: attr(x type(<length>), 0px))` block so that browsers without
support fall back silently to the plain custom property defaults. The test uses
the `width` property because custom properties accept any value as valid and
cannot be used for feature detection via `@supports`.

Chrome 133+ ships the `type()` wrapper syntax — `attr(x type(<length>), 0px)`,
`attr(x type(<integer>), 0)` — rather than the earlier draft bare-keyword form
`attr(x length, 0px)`. Firefox does not yet support this feature.

The `attr()` fallback does not need to match the declared type — `1fr` is a
valid fallback for `type(<length>)` because fallback values are treated as
`<declaration-value>` (arbitrary CSS). Chrome resolves the fallback in context,
so `attr(max-width type(<length>), 1fr)` produces `1fr` when the attribute is
absent, which is valid inside `minmax()`.

## Column width calculation

With no `cols` attribute (or `--pwc-auto-grid-cols: -1`) the intermediate
`--pwc-auto-grid-col-optimistic` evaluates to a large negative value. The
`max()` in `--pwc-auto-grid-col-realistic` discards it, so the effective column
sizing degrades to:

```
minmax(--pwc-auto-grid-min-width, --pwc-auto-grid-max-width)
```

When `cols` is a positive integer the column width is computed as:

```
gap-total    = (cols - 1) × gap
optimistic   = (100% − gap-total) / cols
realistic    = max(min-width, optimistic)
col          = minmax(realistic, max-width)
```

`repeat(auto-fit, col)` packs as many columns as possible into each row.

## Switcher variant

The `.switcher` class overrides `--pwc-auto-grid-col` using a CSS
pseudo-boolean technique (requires `cols` to be a positive integer):

- **Items fit** (`optimistic ≥ min-width`): `--pwc-auto-grid-col-should-break = 0px`,
  column width = `optimistic` (all items in one row).
- **Items don't fit** (`optimistic < min-width`): `--pwc-auto-grid-col-should-break = 1px`,
  column width = `100%` (each item takes the full width).

`clamp(0px, min-width − optimistic, 1px)` produces the binary `0px`/`1px`
flag. Multiplying by `9999` turns it into a dominant or zero contribution in
the final `calc()`.

The resulting `--pwc-auto-grid-col` is a bare `calc()` length (not `minmax()`),
which is passed to `repeat(auto-fit, …)`. This is technically outside the CSS
Grid spec but works in all major browsers. The variant is therefore marked
experimental.
