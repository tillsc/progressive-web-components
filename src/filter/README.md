# `<pwc-filter>`

Lightweight text filter web component.

`<pwc-filter>` adds a search input and filters arbitrary markup based on free-text input.
It is designed to work with **tables, lists, or any structured DOM**.

---

## Basic usage

```html
<pwc-filter>
  <table>
    <tr data-pwc-filter-row>
      <td>Alice</td><td>Anderson</td>
    </tr>
    <tr data-pwc-filter-row>
      <td>Bob</td><td>Brown</td>
    </tr>
  </table>
</pwc-filter>
```

The component automatically prepends a `<input type="search">` element and filters rows
as the user types.

---

## How filtering works

- The input value is split into whitespace-separated tokens
- Each token is matched case-insensitively against the row's `textContent`
- Only rows matching **all tokens** remain visible
- Rows are hidden using the standard `hidden` attribute

Filtering is purely presentational. The DOM structure is not modified.

---

## Row selection

Rows are identified via a selector.

Default:
```
pwc-filter-row, [data-pwc-filter-row]
```

Typical usage:

```html
<tr data-pwc-filter-row>...</tr>
```

You can override the selector via attribute:

```html
<pwc-filter row-selector="tr[data-row]">
```

---

## Attributes

### `placeholder`

Sets the placeholder text of the generated search input.

```html
<pwc-filter placeholder="Search users…">
```

### `debounce`

Debounce delay in milliseconds for the input handler. Default: `300`.

```html
<pwc-filter debounce="300">
```

Set to `0` to disable debouncing (recommended for tests).

---

## Status display

The component tracks how many rows match the current filter. By default, this
information is announced to screen readers via a visually hidden live region.

To make the count visible to all users, place a status element inside the
component:

```html
<pwc-filter>
  <h3>Items <span data-pwc-filter-status></span></h3>
  <table>…</table>
</pwc-filter>
```

The status element is identified via a selector.

Default:
```
pwc-filter-status, [data-pwc-filter-status]
```

When the user types, the status element's `textContent` is updated to
`"<matchCount> / <totalCount>"` (e.g. `"3 / 10"`). When the filter is cleared,
the text is set to `""`.

If no status element is found in the markup, the component creates a visually
hidden `<span>` automatically so screen readers still receive updates.

The component ensures `role="status"`, `aria-live="polite"`, and
`aria-atomic="true"` are set on the status element (unless already present).

---

## Input placement

By default the search input is prepended as the **first child** of the component.

To control where the input appears, place a target element inside the component:

```html
<pwc-filter>
  <h3>Items <span data-pwc-filter-status></span></h3>
  <div data-pwc-filter-input></div>
  <table>…</table>
</pwc-filter>
```

The input is appended **inside** the target element, which can double as a
styling wrapper.

Default selector:
```
pwc-filter-input, [data-pwc-filter-input]
```

## Generated markup

The component always creates its own search input.
No input markup needs to be provided by the consumer.

The input receives an `aria-label` matching the `placeholder` text.

---

## Styling (vanilla)

The component does not impose any styling.

Style the generated input using regular CSS:

```css
pwc-filter input[type="search"] {
  margin-bottom: 0.5rem;
}
```

---

## Programmatic API

### `filterText` property

Get or set the current filter text programmatically.

```js
const filter = document.querySelector("pwc-filter");
filter.filterText = "alice";   // apply filter
console.log(filter.filterText); // "alice"
filter.filterText = "";         // clear filter
```

### `applyFilter()` method

Re-evaluates the filter against current row content. Call this after dynamically
adding, removing, or modifying rows so the filter state stays in sync.

```js
const filter = document.querySelector("pwc-filter");
// … modify rows …
filter.applyFilter();
```

### `pwc-filter:change` event

Dispatched on every filter update (including programmatic changes). Bubbles.

```js
filter.addEventListener("pwc-filter:change", (e) => {
  e.detail.filterText;  // current filter string
  e.detail.matchCount;  // number of visible rows
  e.detail.totalCount;  // total number of rows
});
```

---

## Bootstrap 5 variant

A Bootstrap 5 styled variant is provided with the same API:

```html
<pwc-filter-bs5 placeholder="Search users…">
  <table>…</table>
</pwc-filter-bs5>
```

- Same attributes and behavior as the vanilla component
- Uses Bootstrap `form-control` class on the input
