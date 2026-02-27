# select-all — Internals

## Architecture

`PwcSelectAll` (`select-all.js`) extends `PwcChildrenObserverElement` directly —
no base/variant split is needed as there is no Bootstrap variant.

`observeMode = "tree"` ensures `onChildrenChanged` fires when checkboxes are
added or removed anywhere in the subtree (e.g. after a `<pwc-include>` reload).

## Checkbox resolution — `_checkboxes(selectorOverride?)`

Collects all checkboxes matching the effective selector (`selectorOverride` →
`checkbox-selector` attribute → `defaultCheckboxSelector`) within the component,
then filters out any that carry `data-pwc-select-all` (trigger checkboxes are
never part of the managed set).

The selector is evaluated on every call — not cached — so dynamic DOM changes
are reflected automatically.

## Display updates — `_updateDisplays()`

Called from `onChildrenChanged` and after every action. Wrapped entirely in
`_withoutChildrenChangedNotification` because writing to `textContent` and
checkbox properties causes subtree mutations that would otherwise re-trigger
`onChildrenChanged` in an infinite loop.

Two passes:

1. **Trigger checkboxes** (`input[type=checkbox][data-pwc-select-all]`): sets
   `checked` and `indeterminate` based on the checked count within the element's
   scoped subset (via `data-pwc-select-all-selector`).
2. **Checked displays** (`pwc-select-all-checked, [data-pwc-select-all-checked]`):
   sets `textContent` to the number of checked checkboxes within the element's
   scoped subset.
3. **Total displays** (`pwc-select-all-total, [data-pwc-select-all-total]`):
   sets `textContent` to the total number of managed checkboxes within the
   element's scoped subset.

## Event handling

`static events = ["change", "click"]` — both bound on the host, routed via
`handleEvent`.

- **`click`**: walks up from `e.target` to find a `[data-pwc-action]` element,
  then calls `_applyAction` with its action value and optional
  `data-pwc-select-all-selector`. `e.preventDefault()` prevents default
  button/link behaviour.
- **`change`** on a `[data-pwc-select-all]` checkbox: `checked → "select-all"`,
  `unchecked → "deselect-all"`, scoped by `data-pwc-select-all-selector`.
- **`change`** on any other checkbox (while `!_applyingAction`): calls
  `_updateDisplays()`. The native event already bubbles — no additional event
  is emitted.

## Mass actions — `_applyAction(action, selectorOverride?)`

Sets `_applyingAction = true` for the duration to suppress re-entrant `change`
handling. For each managed checkbox that actually changes state, dispatches a
native `change` event (`bubbles: true`) so external listeners (e.g.
`<pwc-auto-submit>`) react correctly. After the loop, calls `_updateDisplays()`
and emits a single `pwc-select-all:change`.
