# `<pwc-auto-submit>`

Submits a form when marked elements change. Without `local-reload`, the form is
submitted natively. With `local-reload` and an `id`, the form is submitted via
`fetch` and the matching fragment from the response is transcluded into the element.

---

## Basic usage

```html
<pwc-auto-submit id="color-form" local-reload>
  <form method="get" action="/colors">
    <select name="color" data-auto-submit>
      <option value="red">Red</option>
      <option value="blue">Blue</option>
    </select>
    <input name="note" placeholder="Not auto-submitted">
    <span class="result">Pick a color</span>
  </form>
</pwc-auto-submit>
```

Only elements with the `data-auto-submit` attribute trigger a submission on `change`.

---

## Attributes

### `local-reload`

Enables fetch + transclusion instead of native form submission. Requires an `id`
on the element. Without `local-reload` (or without `id`), the component falls back
to `form.submit()`.

### `id`

Required for `local-reload`. The component looks for an element with the same `id`
in the response HTML and transcludes its children.

### `nomorph`

Disables DOM morphing for this element (see [DOM morphing](../../README.md#dom-morphing)).

### `with-scripts`

Executes `<script>` elements in the transcluded HTML.

### `with-credentials`

Sends cookies on cross-origin requests (`credentials: "include"`).

---

## Data attributes (on form elements)

### `data-auto-submit`

Place on any form element (`<input>`, `<select>`, `<textarea>`) to opt it into
auto-submission. Elements without this attribute are ignored.

---

## Form data

An additional field `_pwc_autosubmitted_by` is added to the form data, containing
the `name` (or `id`) of the element that triggered the submission.

---

## Events

### `pwc-auto-submit:load`

Dispatched after successful transclusion. Bubbles.

### `pwc-auto-submit:error`

Dispatched on fetch or network errors. Bubbles. `event.detail.error` contains the error.

---

## Styling

### `[aria-busy="true"]`

Set while a fetch is in flight.

```css
pwc-auto-submit[aria-busy="true"] {
  opacity: 0.5;
}
```

---

## Fallback behaviour

- **No `local-reload`**: native `form.submit()`
- **`local-reload` without `id`**: warns and falls back to `form.submit()`
- **Fragment not found in response**: warns and replaces the entire document with the response
- **Network error**: dispatches `pwc-auto-submit:error`
