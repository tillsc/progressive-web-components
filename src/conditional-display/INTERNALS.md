# Conditional Display — Internals

## Architecture

`ConditionalDisplayBase` extends `PwcChildrenObserverElement` (with `observeMode: "tree"`)
and provides the shared logic. It is not exported. Four thin subclasses implement `_apply(isActive)`:

| Class | `_apply` delegates to |
|-------|----------------------|
| `PwcShownIf` | `_setVisible(isActive)` |
| `PwcHiddenIf` | `_setVisible(!isActive)` |
| `PwcEnabledIf` | `_setEnabled(isActive)` |
| `PwcDisabledIf` | `_setEnabled(!isActive)` |

## Three update triggers

1. **Change event** on the controlling input (bound via `_onChange` callback)
2. **Attribute change** (`selector`, `value`) via `attributeChangedCallback`
3. **Child mutation** via `onChildrenChanged` — re-resolves the input and re-applies state

## Event binding

The change event listener target depends on the input type:

- **Radio**: bound on the closest `<form>`, or `document` as fallback (because `change` fires on the newly selected radio, not the one referenced by `selector`)
- **Everything else**: bound directly on the input element

The listener is managed in `_resolveInput()` (bind) and `_unbindChangeEvent()` (unbind).
Re-resolving the input always unbinds the previous listener first.

## Disable tracking

When hiding a section, contained form fields are disabled to prevent submission of hidden values.
The attribute `data-pwc-temporarily-disabled` marks fields that were disabled by the component
(as opposed to fields that were already disabled). Only marked fields are re-enabled when the
section becomes visible again.

## Checkbox shorthand

When the `value` attribute is not set (or empty) and the input is a checkbox,
`_isActive` returns the checkbox's `checked` state directly instead of comparing values.
