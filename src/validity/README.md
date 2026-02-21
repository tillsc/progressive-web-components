# `<pwc-validity>`

Maps `data-validity` attributes on form elements to `setCustomValidity()`. Observes
the subtree for changes via MutationObserver and optionally clears errors after a
DOM event or a timeout.

---

## Basic usage

```html
<pwc-validity clear-on="input" clear-after="5000">
  <form>
    <input name="email" data-validity="Invalid email address">
    <select name="role" data-validity="Please select a role">
      <option value="">--</option>
      <option value="admin">Admin</option>
    </select>
  </form>
</pwc-validity>
```

The server renders `data-validity` on elements that failed validation.
`<pwc-validity>` picks them up and calls `setCustomValidity()`.

---

## Attributes (on `<pwc-validity>`)

### `clear-on`

Space-separated list of event types that clear the error on the triggering element.

```html
<pwc-validity clear-on="input">...</pwc-validity>
<pwc-validity clear-on="input focus">...</pwc-validity>
```

### `clear-after`

Timeout in milliseconds after which the error is automatically cleared.

```html
<pwc-validity clear-after="5000">...</pwc-validity>
```

Both attributes are combinable. The error clears on whichever happens first.

---

## Data attributes (on form elements)

### `data-validity`

The custom validation message. Set by the server on elements that failed validation.

```html
<input name="email" data-validity="Invalid email address">
```

### `data-validity-clear="none"`

Prevents auto-clearing for this specific element, regardless of `clear-on` / `clear-after`.

```html
<input name="token" data-validity="Token expired" data-validity-clear="none">
```

---

## Styling (vanilla)

Error messages are inserted as `<span class="pwc-validity-message">` directly after
the invalid element.

```css
.pwc-validity-message {
  color: red;
  font-size: 0.875rem;
}
```

---

## Bootstrap 5 variant

A Bootstrap 5 styled variant is provided with the same API:

```html
<pwc-validity-bs5 clear-on="input">
  <form>
    <input name="email" class="form-control" data-validity="Invalid email address">
  </form>
</pwc-validity-bs5>
```

Notes:
- Same attributes and behavior as the vanilla component
- Adds `is-invalid` class to the element and inserts a `<div class="invalid-feedback">`
