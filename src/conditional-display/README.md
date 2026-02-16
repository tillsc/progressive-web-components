# `<pwc-shown-if>` `<pwc-hidden-if>` `<pwc-enabled-if>` `<pwc-disabled-if>`

Conditionally show/hide or enable/disable DOM sections based on the value of a form input.

---

## Basic usage

```html
<select id="payment">
  <option value="card">Credit card</option>
  <option value="paypal">PayPal</option>
  <option value="invoice">Invoice</option>
</select>

<pwc-shown-if selector="#payment" value="card">
  <input name="card_number" placeholder="Card number">
</pwc-shown-if>

<pwc-hidden-if selector="#payment" value="paypal">
  <input name="address" placeholder="Billing address">
</pwc-hidden-if>
```

---

## Elements

### `<pwc-shown-if>`

Shows its content when the input value matches. Hides and disables contained form fields otherwise.

### `<pwc-hidden-if>`

Hides its content when the input value matches. Shows and enables contained form fields otherwise.

### `<pwc-enabled-if>`

Enables contained form fields when the input value matches. Disables them otherwise.

### `<pwc-disabled-if>`

Disables contained form fields when the input value matches. Enables them otherwise.

---

## Attributes

### `selector`

A CSS selector pointing to the controlling input element (anywhere in the document).

```html
<pwc-shown-if selector="#my-select" value="foo">
```

### `value`

Comma-separated list of values to match against.

```html
<pwc-shown-if selector="#color" value="red,green,blue">
```

---

## Supported input types

### `<select>`

Matches against the selected option's value.

### `<input type="radio">`

Evaluates the entire radio group. The `selector` should point to any radio button in the group.

```html
<input type="radio" name="plan" value="free">
<input type="radio" name="plan" value="pro">

<pwc-shown-if selector="input[name=plan]" value="pro">
  <input name="billing_email">
</pwc-shown-if>
```

### `<input type="checkbox">`

Without `value` attribute: matches based on the checkbox's `checked` state.

```html
<input type="checkbox" id="agree">
<pwc-shown-if selector="#agree">
  <p>Thank you!</p>
</pwc-shown-if>
```

With `value` attribute: matches the checkbox's value when checked.

```html
<input type="checkbox" id="color" value="red">
<pwc-shown-if selector="#color" value="red">
  <input name="shade">
</pwc-shown-if>
```

### Other inputs

Matches against the input's `.value` property (text, number, date, etc.).

---

## Visibility behaviour

When `<pwc-shown-if>` or `<pwc-hidden-if>` hides a section:

- The `hidden` attribute is set on the component element
- All contained `<input>`, `<select>`, and `<textarea>` elements are disabled (prevents submission of hidden values)
- Already-disabled fields are left untouched and not re-enabled when the section is shown again

---

## Dynamic updates

The components react to:

- **Input value changes** via `change` events
- **Attribute changes** on `selector` and `value` (via `observedAttributes`)
- **DOM mutations** inside the component (via `MutationObserver`) — new children added by chunked HTML streaming or client-side rendering are handled automatically
