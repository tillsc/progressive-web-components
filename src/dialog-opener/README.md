# `<pwc-dialog-opener>`

Server-first dialog opener web component.

`<pwc-dialog-opener>` enhances existing links to open their targets inside a modal dialog.
It is designed to work with server-rendered HTML and minimal JavaScript.

The component does **not** use Shadow DOM and relies on stable, explicit markup hooks.

---

## Basic usage

```html
<pwc-dialog-opener>
  <a href="/path/to/page">Open</a>
</pwc-dialog-opener>
```

Clicking the link opens the target URL inside a dialog using an `<iframe>`.

The iframe target **must be same-origin**. Cross-origin URLs are not supported.

---

## Attributes

### `close-text`
Text for the close button inside the dialog.

```html
<pwc-dialog-opener close-text="Cancel">
```

### `hoist-actions`
Hoists clickable elements from the iframe content into the dialog footer.

The value is a CSS selector. Matching elements are recreated in the dialog footer;
clicking them triggers `click()` on the original inside the iframe.

This only makes sense for clickable elements (buttons, links). Other elements
(e.g. text inputs) will not have their values synced back to the iframe.

Supported magic values:
- `submit` — matches `button[type=submit]` and `input[type=submit]`
- `primary` — **Bootstrap 5 variant only**, matches `.btn-primary[type=submit]`

```html
<pwc-dialog-opener hoist-actions="submit">
```

### `local-reload`
Enables server-side fragment reload instead of full page navigation when the dialog
signals completion.

Supported tokens (space-separated):
- `with-scripts` — re-executes inline scripts in the replaced fragment
- `replace-url` — updates the browser URL via `history.replaceState`
- `push-url` — updates the browser URL via `history.pushState`

```html
<pwc-dialog-opener id="editor" local-reload="with-scripts replace-url">
```

The element **must have an `id`** for `local-reload` to work.

---

## Accessibility

### `iframe-title`
Sets the `title` attribute on the iframe so screen readers can identify it.

```html
<pwc-dialog-opener iframe-title="Neuen Eintrag anlegen">
  <a href="/entries/new">+ Neu</a>
</pwc-dialog-opener>
```

When omitted, the title is derived automatically with a "Dialog: " prefix:
1. `aria-label` of the clicked link
2. text content of the clicked link

- The close button has an `aria-label` set to the `close-text` attribute value.

---

## Dialog completion protocol

The iframe content is considered "finished" when its URL contains the query parameter:

```
pwc_done_with=<value>
```

The value typically carries an identifier (e.g. the ID of the created/edited record).

When detected:
- the dialog closes
- local reload is attempted (if enabled)
- otherwise a full page navigation is performed

---

## Query parameters

The component uses the following query parameters when opening the iframe URL:

| Parameter | Description |
|-----------|-------------|
| `pwc_embedded` | Set to `true` to indicate the page is loaded inside a dialog iframe, not opened directly in the browser |
| `pwc_default` | Collected values from `<input>` elements inside the component (comma-separated) |
| `pwc_done_with` | Set by the iframe content to signal dialog completion |
| `pwc_cb` | Cache-buster appended to the completion URL |

### `pwc_default`

When opening the iframe URL, the component collects values from the **first-level inputs inside**
`<pwc-dialog-opener>` and appends them as a `pwc_default` query parameter.

This mechanism is essential for server-driven workflows where the dialog is used as a
fallback or completion step.

A common example is an autocomplete or reference selector:
- the user types a value
- no matching target exists yet
- the dialog opens a "create" form
- the previously entered value is forwarded as a default

Current behavior:
- reads the values of all `input` elements inside the component
- ignores empty values
- concatenates values from multiple inputs into a single `pwc_default` query parameter

```html
<pwc-dialog-opener>
  <input name="search" value="bar">
  <a href="/teams/new">Open</a>
</pwc-dialog-opener>
```

The iframe will be opened with:

```
/teams/new?pwc_default=bar&pwc_embedded=true
```

---

## Styling

The dialog-opener reuses `<pwc-modal-dialog>` (or its BS5 variant) for all layout and
chrome. If your page already styles the modal-dialog component, the dialog-opener will
inherit that styling automatically — no additional CSS is needed.

The component itself provides **no visual styling** for buttons. Since the dialog displays
server-rendered content, only the consuming page knows what design system is in use.

### CSS classes

| Class | Element | Purpose |
|-------|---------|---------|
| `.pwc-dialog-opener-actions` | Footer element | Added to the modal-dialog footer; used internally by `hoist-actions` |
| `.pwc-dialog-opener-close` | Close button | The close button inside the footer |

Hoisted action buttons are placed inside a `<dialog-opener-buttons>` element within
the footer. This can be used as a styling hook to distinguish hoisted actions from the
close button.

### CSS custom properties

| Property | Default | Description |
|----------|---------|-------------|
| `--pwc-dialog-opener-height` | `550px` | Height of the iframe inside the dialog |

```css
pwc-dialog-opener {
  --pwc-dialog-opener-height: 550px;
}
```

### Example: styling the vanilla close button

```css
.pwc-dialog-opener-close {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
```

---

## Bootstrap 5 variant

A Bootstrap 5 styled variant is provided with the same API:

```html
<pwc-dialog-opener-bs5>
  <a href="/path/to/page">Open</a>
</pwc-dialog-opener-bs5>
```

Notes:
- Same attributes and behavior as the vanilla component
- Uses Bootstrap modal markup and classes
- Requires Bootstrap 5 JavaScript and CSS to be present

---
