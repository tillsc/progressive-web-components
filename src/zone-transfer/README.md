# `<pwc-zone-transfer>`

Minimal zone-based drag & drop plus sorting between containers ("zones").

`<pwc-zone-transfer>` is a server-first, markup-driven component that uses the native
HTML5 Drag and Drop API without external libraries. It moves elements between zones and
emits a single change event.

The component does **not** use Shadow DOM and relies on regular DOM structure and data attributes.

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

Note:
- Keyboard-based zone moves are only active if **at least one** zone defines `data-pwc-zone-hotkey`.

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

Notes:
- The placeholder is a lightweight `<div aria-hidden="true">` with a height matching the dragged item.
- The component does **not** clone items.

---

## Limitations

- Native HTML5 DnD works best with mouse/trackpad. Touch support varies by browser.
- No "copy" mode: items are moved, not duplicated.
