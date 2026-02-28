# `<pwc-auto-grid>`

A responsive auto-fitting CSS grid layout component. Columns are sized automatically
to fill the available space, respecting a minimum width per column.

Based on ideas and code by [Joy Heron](https://github.com/joyheron).

No JavaScript behavior — `<pwc-auto-grid>` is a CSS-only layout container.

---

## Basic usage

Wrap any content. Columns fill the row and wrap automatically once the minimum
column width can no longer be maintained:

```html
<pwc-auto-grid>
  <div>Item A</div>
  <div>Item B</div>
  <div>Item C</div>
  <div>Item D</div>
</pwc-auto-grid>
```

By default columns are at least `100px` wide and grow up to `1fr`.

---

## Full-width items

Add the `pwc-auto-grid-wide` class to any direct child to span all columns:

```html
<pwc-auto-grid>
  <div class="pwc-auto-grid-wide">Header spanning all columns</div>
  <div>Item A</div>
  <div>Item B</div>
  <div>Item C</div>
</pwc-auto-grid>
```

---

## Attributes

| Attribute | Default | Description |
|---|---|---|
| `cols` | auto | Number of columns. Without this attribute columns auto-fit. |
| `gap` | `10px` | Gap between grid cells |
| `min-width` | `100px` | Minimum column width |
| `max-width` | `1fr` | Maximum column width. Useful in auto-fit mode to prevent columns from growing too wide. |

```html
<pwc-auto-grid cols="3" gap="1rem" min-width="200px">
  ...
</pwc-auto-grid>
```

When `cols` is set the grid always has exactly that many columns, but columns
will not shrink below `min-width`. 

Attributes require CSS `attr()` with type
keywords (Chrome 133+); use the CSS custom properties below for broader
compatibility.

---

## CSS custom properties

For cases where HTML attributes are insufficient — e.g. CSS-driven values,
inheritance, or theming — the underlying custom properties can be set directly.

| Property | Default | Description |
|---|---|---|
| `--pwc-auto-grid-cols` | `-1` | Fixed number of columns. `-1` = auto-fit. |
| `--pwc-auto-grid-gap` | `10px` | Gap between grid cells |
| `--pwc-auto-grid-min-width` | `100px` | Minimum column width |
| `--pwc-auto-grid-max-width` | `1fr` | Maximum column width |

```css
pwc-auto-grid {
  --pwc-auto-grid-max-width: 300px;
}
```

---

## Switcher variant (experimental)

Add the `switcher` class to switch between a single-column and a multi-column
layout without media queries. Requires `cols` to be set to the intended number
of columns.

When the container is wide enough for all columns to reach `min-width`, items
are placed in one row. Otherwise every item takes the full width:

```html
<pwc-auto-grid class="switcher" cols="3" min-width="120px">
  <div>Item A</div>
  <div>Item B</div>
  <div>Item C</div>
</pwc-auto-grid>
```

The example above uses a single row when the container is ≥ 360 px wide
(3 × 120 px), and stacks all items vertically when it is narrower.
