# `<pwc-modal-dialog>`

Minimal modal dialog web component.

`<pwc-modal-dialog>` provides a small, explicit API to open modal dialogs from JavaScript.
It is designed as a low-level building block and does **not** manage navigation, iframes,
or application flow on its own.

---

## Basic usage

```html
<pwc-modal-dialog></pwc-modal-dialog>
```

```js
const dialog = document.querySelector("pwc-modal-dialog");

dialog.open({ title: "Example" });
dialog.bodyEl.innerHTML = "<p>Hello world</p>";
```

Calling `open()` renders and shows the dialog. Content is populated **after** opening.

If the element is not in the DOM when `open()` is called, it auto-appends to `<body>` and
auto-removes itself when the dialog closes.

---

## JavaScript API

### `open(options)`

Opens the dialog.

Supported options:
- `title` – dialog title text
- `width` – overrides `--pwc-modal-dialog-width` for this open (vanilla only)
- `size` – Bootstrap size preset: `sm`, `lg` (default), `xl` (BS5 only)
- `height` – overrides `--pwc-modal-dialog-height` for this open
- `closeText` – accessible label for close actions (default: `"Close"`)
- `showCloseButton` – show the X button in the header (default: `true`)

```js
dialog.open({
  title: "Edit item",
  closeText: "Cancel"
});
```

### `close()`

Closes the dialog programmatically.

```js
dialog.close();
```

---

## Content accessors

After `open()` the following properties are available:

- `bodyEl` – main content container
- `headerEl` – header container
- `footerEl` – footer container

```js
dialog.bodyEl.append(form);
dialog.footerEl.append(button);
```

Accessing these before `open()` throws an error.

---

## Close behavior

The dialog closes when:

- `close()` is called
- an element with `data-pwc-action="close"` is clicked
- the backdrop is clicked (implementation dependent)

Example close button:

```html
<button data-pwc-action="close">Close</button>
```

---

## Stacking behavior

If a dialog is opened while another dialog is already open:

- the parent dialog is temporarily suspended
- the child dialog is shown
- when the child closes, the parent is restored

This works for both vanilla and Bootstrap variants.

The Bootstrap variant also stacks correctly over regular (non-pwc) Bootstrap modals
that are already open.

---

## Styling (vanilla)

The vanilla implementation uses the native `<dialog>` element.

Key CSS hooks:

- `pwc-modal-dialog`
- `.pwc-modal-dialog-surface`
- `.pwc-modal-dialog-header`
- `.pwc-modal-dialog-body`
- `.pwc-modal-dialog-footer`

### CSS custom properties

Styling is controlled via CSS custom properties on the host element. The `width` and
`height` options in `open()` overwrite the corresponding custom properties as inline styles
for the duration of that open.

```css
pwc-modal-dialog {
  --pwc-modal-dialog-width: 720px;      /* also settable via open({ width }) */
  --pwc-modal-dialog-max-width: 92vw;
  --pwc-modal-dialog-height: auto;      /* also settable via open({ height }) */
  --pwc-modal-dialog-max-height: 90vh;
  --pwc-modal-dialog-padding-header: 12px 16px;
  --pwc-modal-dialog-padding-body: 16px;
  --pwc-modal-dialog-padding-footer: 12px 16px;
  --pwc-modal-dialog-gap-footer: 8px;
  --pwc-modal-dialog-bg: #fff;
  --pwc-modal-dialog-backdrop: rgba(0, 0, 0, 0.45);
  --pwc-modal-dialog-border-radius: 6px;
  --pwc-modal-dialog-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}
```

> [!NOTE]
> `--pwc-modal-dialog-height` sets the body's flex-basis, not the dialog's total
> height — unlike `width`, which applies to the dialog itself.

---

## Bootstrap 5 variant

A Bootstrap 5 based implementation is available:

```html
<pwc-modal-dialog-bs5></pwc-modal-dialog-bs5>
```

Same JavaScript API as the vanilla component, including the `size` option in `open()`.
- Uses Bootstrap modal markup and classes
- Can stack over regular Bootstrap modals (not just pwc modals)
