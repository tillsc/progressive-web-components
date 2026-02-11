# `<pwc-multiselect-dual-list>`

Dual-list multiselect web component.

`<pwc-multiselect-dual-list>` enhances a native `<select>` element with a two-column UI:
selected items on the left, available items on the right.
Hierarchical relationships between options are displayed as indentation.

The component does **not** use Shadow DOM and relies on stable, explicit markup hooks.

---

## Basic usage

```html
<pwc-multiselect-dual-list>
  <select multiple name="items">
    <option value="1">Item A</option>
    <option value="2">Item B</option>
    <option value="3" selected>Item C</option>
  </select>
</pwc-multiselect-dual-list>
```

The `<select>` is hidden and replaced by the dual-list UI. The native `<select>` remains
the source of truth for form submission.

---

## Attributes

### `selected-label`
Header text for the selected items column. Default: `"Selected"`.

### `available-label`
Header text for the available items column. Default: `"Available"`.

### `add-label`
Text for the add button on available items. Default: `"←"`.

### `remove-label`
Text for the remove button on selected items. Default: `"×"`.

### `hide-selected`
When present, selected items are hidden in the available list instead of being grayed out.

```html
<pwc-multiselect-dual-list
  selected-label="Chosen"
  available-label="Options"
  add-label="Add"
  remove-label="Remove"
  hide-selected
>
```

---

## Option attributes

Options on the native `<select>` support additional data attributes:

### `data-parent`
Establishes a parent-child relationship. The value must be another option's `value`.
Child options are indented according to their depth.

```html
<option value="parent">Parent</option>
<option value="child" data-parent="parent">Child</option>
```

### `data-warn-on-unselect`
When set, a `confirm()` dialog is shown before removing the item.
The attribute value is used as the confirmation message.

```html
<option value="critical" data-warn-on-unselect="Are you sure?">Critical Item</option>
```

### `selected`
Pre-selects the option. The item will appear in the selected column on load.

### `disabled`
Prevents the option from being added. The item is shown without an add button.

---

## Single vs. multiple select

The component supports both `<select multiple>` and single `<select>`:

- **Multiple**: items are added and removed independently
- **Single**: adding an item deselects any previously selected item

---

## Filter (progressive enhancement)

Filtering is provided by composing `<pwc-filter>` (or `<pwc-filter-bs5>`) inside the
dual-list. When the filter component is loaded, a search input appears above the
available items. When it is **not** loaded, the dual-list works normally without a
filter — true progressive enhancement.

To enable filtering, load the filter component alongside the dual-list:

```html
<script type="module" src="dist/filter.js"></script>
<script type="module" src="dist/multiselect-dual-list.js"></script>
```

The filter uses `<pwc-filter>`'s API. Access it via:

```js
const filter = host.querySelector("pwc-filter");
filter.filterText = "search";   // apply filter
filter.filterText = "";          // clear filter
```

Listen for filter changes via the `pwc-filter:change` event:

```js
host.addEventListener("pwc-filter:change", (e) => {
  const { filterText, matchCount, totalCount } = e.detail;
});
```

See the [`<pwc-filter>` documentation](../filter/README.md) for full API details.

---

## Styling (vanilla)

Key CSS hooks:

- `pwc-multiselect-dual-list` — host element
- `.pwc-msdl-container` — flex container for both columns
- `.pwc-msdl-selected` / `.pwc-msdl-available` — column wrappers
- `.pwc-msdl-header` — column headers
- `.pwc-msdl-list` — scrollable item lists
- `.pwc-msdl-item` — individual items
- `.pwc-msdl-item--selected` — available item that is currently selected
- `.pwc-msdl-item--disabled` — disabled item
- `.pwc-msdl-action` — add/remove buttons

Custom properties on the host element:

```css
pwc-multiselect-dual-list {
  --pwc-msdl-width: 100%;
  --pwc-msdl-gap: 12px;
  --pwc-msdl-padding: 8px;
  --pwc-msdl-item-padding: 6px 10px;
  --pwc-msdl-list-max-height: 20em;
  --pwc-msdl-bg: #fff;
  --pwc-msdl-border: 1px solid rgba(0, 0, 0, 0.15);
  --pwc-msdl-border-radius: 4px;
  --pwc-msdl-item-bg: #f8f8f8;
  --pwc-msdl-item-hover-bg: #f0f0f0;
  --pwc-msdl-item-selected-bg: #e8e8e8;
  --pwc-msdl-item-selected-color: #999;
  --pwc-msdl-item-disabled-color: #bbb;
}
```

---

## Bootstrap 5 variant

A Bootstrap 5 styled variant is provided with the same API:

```html
<pwc-multiselect-dual-list-bs5>
  <select multiple name="items">
    <option value="1">Item A</option>
  </select>
</pwc-multiselect-dual-list-bs5>
```

Notes:
- Same attributes and behavior as the vanilla component
- Uses Bootstrap `list-group` markup and utility classes
- Requires Bootstrap 5 CSS to be present
