# `<pwc-zone-transfer>`

Minimal zone-based drag & drop plus sorting between containers ("zones").

`<pwc-zone-transfer>` is a server-first, markup-driven component that uses the native
HTML5 Drag and Drop API without external libraries. It moves elements between zones and
emits a single change event.

---
  
## Basic usage

Zones can be declared either via tag name or via data attributes.

### Custom elements (recommended)

```html
<pwc-zone-transfer>
    <pwc-zone-transfer-zone name="available">
        <pwc-zone-transfer-item>Alice</pwc-zone-transfer-item>
        <pwc-zone-transfer-item>Bob</pwc-zone-transfer-item>
    </pwc-zone-transfer-zone>

    <pwc-zone-transfer-zone name="selected"></pwc-zone-transfer-zone>
</pwc-zone-transfer>
```

### Data attributes (works with any markup)

```html
<pwc-zone-transfer>
  <div data-pwc-zone="available">
    <div data-pwc-item>Alice</div>
    <div data-pwc-item>Bob</div>
  </div>

  <div data-pwc-zone="selected"></div>
</pwc-zone-transfer>
```

---

## How it works

Items contain hidden inputs with form values. By moving items between zones,
you control which values are part of the form submission — and in which order.
The position of the `<form>` element determines which items are submitted.

### Example: sortable multiselect

Unlike [`<pwc-multiselect-dual-list>`](../multiselect-dual-list/)
(which enhances a `<select>`), zone-transfer preserves the **order** of
selected items. This matters when the server needs to know the sequence
(e.g. a playlist, priority ranking, or column order).

The "available" zone sits outside the form, the "selected" zone inside it.
Only items inside the form contribute to FormData:

```html
<pwc-zone-transfer>
  <h3>Available</h3>
  <pwc-zone-transfer-zone name="available">
    <div data-pwc-item="a">Alice<input type="hidden" name="people[]" value="alice"></div>
    <div data-pwc-item="b">Bob<input type="hidden" name="people[]" value="bob"></div>
  </pwc-zone-transfer-zone>

  <form method="post" action="/teams/1">
    <h3>Selected</h3>
    <pwc-zone-transfer-zone name="selected">
      <!-- items dragged here become part of the form -->
    </pwc-zone-transfer-zone>
    <button type="submit">Save</button>
  </form>
</pwc-zone-transfer>
```

After dragging Bob then Alice into "Selected", the form submits:

```
people[]=bob&people[]=alice
```

The server receives an ordered array `["bob", "alice"]`.

> [!NOTE]
> The `[]` suffix is a convention used by frameworks like Rails, Phoenix, and
> Express to parse repeated parameters into arrays. Frameworks that don't use this
> convention (e.g. Java Servlets) can simply omit the brackets and use
> `request.getParameterValues("people")` on the repeated name.

### Example: multi-lane (Kanban-style)

All zones live inside the same form. A hidden input at the beginning of each
zone acts as a lane marker. Items and lane markers share the same `name`,
so the server receives a single flat array. Lane markers are distinguished
from item IDs by a prefix:

```html
<form method="post" action="/board/1">
  <pwc-zone-transfer>
    <pwc-zone-transfer-zone name="todo">
      <input type="hidden" name="items[]" value="lane-todo">
      <div data-pwc-item="1">Task A<input type="hidden" name="items[]" value="1"></div>
      <div data-pwc-item="2">Task B<input type="hidden" name="items[]" value="2"></div>
    </pwc-zone-transfer-zone>

    <pwc-zone-transfer-zone name="doing">
      <input type="hidden" name="items[]" value="lane-doing">
      <div data-pwc-item="3">Task C<input type="hidden" name="items[]" value="3"></div>
    </pwc-zone-transfer-zone>

    <pwc-zone-transfer-zone name="done">
      <input type="hidden" name="items[]" value="lane-done">
    </pwc-zone-transfer-zone>
  </pwc-zone-transfer>
  <button type="submit">Save</button>
</form>
```

After dragging Task B from "todo" to "doing", the form submits:

```
items[]=lane-todo&items[]=1&items[]=lane-doing&items[]=2&items[]=3&items[]=lane-done
```

The server receives a single array `["lane-todo", "1", "lane-doing", "2", "3", "lane-done"]`
and splits on the `lane-` entries to reconstruct the lanes.

---

## Hooks (selectors)

Defaults (can be overridden by subclassing and changing the static selectors):

- Zones:  `pwc-zone-transfer-zone, [data-pwc-zone]`
- Items:  `pwc-zone-transfer-item, [data-pwc-item]`
- Handle: `pwc-zone-transfer-handle, [data-pwc-handle]`

---

## Data contracts

### Zone name

One of:
- `<pwc-zone-transfer-zone name="selected">`
- `data-pwc-zone="selected"`

### Item id (optional)

If present, it is included in the change event payload.

Supported forms:
- `data-pwc-item="123"`
- `id="123"`
- (for `<pwc-zone-transfer-item>`) `data-id="123"`

If none of these are present, `itemId` in the event payload will be an empty string.

---

## Optional handle

If an item contains a handle element (matches the handle selector), dragging is only allowed
when the drag starts on that handle.

Example:

```html
<div data-pwc-item>
  <span data-pwc-handle>⠿</span>
  Alice
</div>
```

---

## Keyboard

- ArrowUp / ArrowDown: move focus within the current zone
- Ctrl+ArrowUp / Ctrl+ArrowDown (Cmd on macOS): reorder the focused item within the zone
- Optional zone hotkeys: move the focused item to a specific zone

### Zone hotkeys (optional)

Assign a key to a zone:

```html
<pwc-zone-transfer-zone name="selected" data-pwc-zone-hotkey="2"></pwc-zone-transfer-zone>
```

Pressing that key moves the focused item into that zone.

> [!NOTE]
> Keyboard-based zone moves are only active if **at least one** zone defines `data-pwc-zone-hotkey`.

---

## Accessibility

- Zones receive `role="listbox"`. If no `aria-label` is present, it is
  auto-set from the zone name (`name` attribute or `data-pwc-zone`).
- Items receive `role="option"` and are part of a roving tabindex group.
- Keyboard moves are announced via a visually hidden `aria-live="assertive"`
  region:
  - Zone change → announces the target zone name
  - Reorder within zone → announces the new 1-based position

---

## Events

### `pwc-zone-transfer:change`

Fired after:
- drag & drop
- keyboard reorder
- keyboard move to another zone

```js
el.addEventListener("pwc-zone-transfer:change", (e) => {
  console.log(e.detail);
});
```

Payload (`e.detail`):

- `itemId`: string (may be empty)
- `fromZone`: string
- `toZone`: string
- `index`: number (position in the target zone after the move)
- `trigger`: `"drag"` or `"keyboard"`

---

## Styling

This component only adds two CSS hooks:

- `.pwc-zone-transfer-dragging` on the dragged item
- `.pwc-zone-transfer-placeholder` for the drop placeholder element

A minimal baseline:

```css
pwc-zone-transfer .pwc-zone-transfer-placeholder {
    box-sizing: border-box;
    border: 1px dashed currentColor;
    border-radius: 4px;
    opacity: 0.35;
}
```

> [!NOTE]
> - The placeholder is a lightweight `<div aria-hidden="true">` with a height matching the dragged item.
> - The component does **not** clone items.

---

## Limitations

- Native HTML5 DnD works best with mouse/trackpad. Touch support varies by browser.
- No "copy" mode: items are moved, not duplicated.
