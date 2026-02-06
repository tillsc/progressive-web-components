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

---

## Attributes

### `close`
Text for the close button inside the dialog.

```html
<pwc-dialog-opener close="Cancel">
```

### `move-out`
Moves action buttons from the iframe content into the dialog footer.

Supported values:
- `submit`
- `primary`

```html
<pwc-dialog-opener move-out="primary">
```

### `local-reload`
Enables server-side fragment reload instead of full page navigation when the dialog
signals completion.

Supported tokens (space-separated):
- `with-scripts` – re-executes inline scripts in the replaced fragment
- `replace-url` – updates the browser URL via `history.replaceState`
- `push-url` – updates the browser URL via `history.pushState`

```html
<pwc-dialog-opener id="editor" local-reload="with-scripts replace-url">
```

The element **must have an `id`** for `local-reload` to work.

---

## Dialog completion protocol

The iframe content is considered "finished" when its URL contains the query parameter:

```
dialog_finished_with=ok
```

When detected:
- the dialog closes
- local reload is attempted (if enabled)
- otherwise a full page navigation is performed

---

## `default` query parameter

When opening the iframe URL, the component collects values from the **first-level inputs inside**
`<pwc-dialog-opener>` and appends them as a `default` query parameter.

This mechanism is essential for server-driven workflows where the dialog is used as a
fallback or completion step.

A common example is an autocomplete or reference selector:
- the user types a value
- no matching target exists yet
- the dialog opens a “create” form
- the previously entered value is forwarded as a default

Current behavior:
- reads the values of all `input` elements inside the component
- ignores empty values
- concatenates values from multiple inputs into a single `default` query parameter

```html
<pwc-dialog-opener>
  <input name="search" value="bar">
  <a href="/teams/new">Open</a>
</pwc-dialog-opener>
```

The iframe will be opened with:

```
/teams/new?default=bar&_layout=false
```

---

## Styling

The vanilla variant uses the native `<dialog>` element.

Key CSS hooks:
- `.pwc-dialog-opener-modal`
- `.pwc-dialog-opener-body`
- `.pwc-dialog-opener-footer`
- `.pwc-dialog-opener-close`

Height can be controlled via CSS variables on the host element:

```css
pwc-dialog-opener {
  --pwc-dialog-opener-height: 550px;
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
