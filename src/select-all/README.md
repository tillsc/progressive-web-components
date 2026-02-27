# `<pwc-select-all>`

Lightweight mass-selection web component.

`<pwc-select-all>` coordinates the checked state of a group of checkboxes and
provides select-all, deselect-all, and invert actions. It works with **tables,
lists, or any structured DOM**.

---

## Basic usage

Wrap the checkboxes and action controls together. Buttons with `data-pwc-action`
trigger the corresponding action on click:

```html
<pwc-select-all>
  <button type="button" data-pwc-action="select-all">All</button>
  <button type="button" data-pwc-action="deselect-all">None</button>
  <button type="button" data-pwc-action="invert">Invert</button>

  <ul>
    <li><input type="checkbox" name="item" value="1"> One</li>
    <li><input type="checkbox" name="item" value="2"> Two</li>
  </ul>
</pwc-select-all>
```

---

## Trigger checkbox

A checkbox with `data-pwc-select-all` acts as a trigger: checking it selects
all managed checkboxes, unchecking it deselects all. Its `indeterminate`
property is kept in sync automatically when some (but not all) managed
checkboxes are checked.

Trigger checkboxes are automatically excluded from the managed set.

```html
<pwc-select-all>
  <label>
    <input type="checkbox" data-pwc-select-all> Select all
  </label>

  <ul>
    <li><input type="checkbox" name="item" value="1"> One</li>
    <li><input type="checkbox" name="item" value="2"> Two</li>
  </ul>
</pwc-select-all>
```

A typical table places the trigger in the header:

```html
<pwc-select-all>
  <table>
    <thead>
      <tr>
        <th><input type="checkbox" data-pwc-select-all></th>
        <th>Name</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><input type="checkbox" name="id" value="1"></td>
        <td>Alice</td>
      </tr>
    </tbody>
  </table>
</pwc-select-all>
```

---

## Per-column selector

Add `data-pwc-select-all-selector` to a trigger checkbox or action button to
scope it to a CSS-selector subset of the managed checkboxes. This is useful for
tables with multiple checkbox columns — each trigger tracks the `indeterminate`
state of its own column independently:

```html
<pwc-select-all>
  <table>
    <thead>
      <tr>
        <th><input type="checkbox" data-pwc-select-all
                   data-pwc-select-all-selector="input[name='approved']"></th>
        <th><input type="checkbox" data-pwc-select-all
                   data-pwc-select-all-selector="input[name='flagged']"></th>
        <th>Name</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><input type="checkbox" name="approved" value="1"></td>
        <td><input type="checkbox" name="flagged" value="1"></td>
        <td>Alice</td>
      </tr>
    </tbody>
  </table>
</pwc-select-all>
```

---

## Count display

Place `pwc-select-all-checked` or `[data-pwc-select-all-checked]` inside the
component to display the number of currently checked managed checkboxes.
Use `pwc-select-all-total` or `[data-pwc-select-all-total]` for the total count.
Add `data-pwc-select-all-selector` on either element to scope the count to a
subset:

```html
<pwc-select-all>
  <pwc-select-all-checked></pwc-select-all-checked> of
  <pwc-select-all-total></pwc-select-all-total> selected

  <!-- per-column counts in a table header -->
  <input type="checkbox" data-pwc-select-all
         data-pwc-select-all-selector="input[name='approved']">
  (<span data-pwc-select-all-checked
         data-pwc-select-all-selector="input[name='approved']"></span>
  of <span data-pwc-select-all-total
           data-pwc-select-all-selector="input[name='approved']"></span>)
</pwc-select-all>
```

---

## Attributes

### `checkbox-selector`

Overrides the selector used to find managed checkboxes within the component.
Trigger checkboxes (`data-pwc-select-all`) are always excluded regardless of
this selector.

Default: `input[type=checkbox]`

```html
<pwc-select-all checkbox-selector="input.selectable">
```

---

## Action elements

### Buttons — `data-pwc-action`

| Value | Effect |
|---|---|
| `select-all` | Checks all managed checkboxes |
| `deselect-all` | Unchecks all managed checkboxes |
| `invert` | Toggles each managed checkbox |

### Trigger checkboxes — `data-pwc-select-all`

Checking selects all managed checkboxes, unchecking deselects all. The
`indeterminate` state is maintained automatically.

### Scoping — `data-pwc-select-all-selector`

Scopes a trigger checkbox, action button, or count display to a CSS-selector
subset of the managed checkboxes.

---

## Programmatic API

### `selectAll()`, `deselectAll()`, `invertSelection()`

Execute the corresponding action programmatically.

```js
const el = document.querySelector("pwc-select-all");
el.selectAll();
el.deselectAll();
el.invertSelection();
```

### `pwc-select-all:change` event

Dispatched after every selection change. Bubbles.

```js
el.addEventListener("pwc-select-all:change", (e) => {
  e.detail.action;  // "select-all" | "deselect-all" | "invert"
});
```

Fired once per mass action. For individual checkbox changes, the native
`change` event bubbles through the component as usual. After a mass action, a
native `change` event is also dispatched on each checkbox whose state changed,
so other components (e.g. `<pwc-auto-submit>`) react correctly.
