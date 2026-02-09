# Modal-Dialog — Internals

## Architecture

`ModalDialogBase` (`base.js`) provides orchestration for opening, closing, and stacking modals.
It defines a **subclass contract** — a set of hooks that variants must implement:

| Hook | Responsibility |
|------|---------------|
| `_render(ctx)` | Build DOM, return `{ rootEl, bodyEl, headerEl, footerEl, teardown? }` |
| `_getOpenSibling()` | Find an already-open modal (for stacking) |
| `_suspend(el)` / `_restore(el)` | Hide/show a sibling modal during stacking |
| `_show(ui, options)` / `_hide(ui)` | Actually show/hide the modal |
| `_armFinalClose(ui, onFinalClose)` | Wire up the "real close" callback |

The vanilla variant uses native `<dialog>` + `showModal()`.
The BS5 variant uses `bootstrap.Modal`.

## Open lifecycle

1. If the element is not in the DOM, it auto-appends to `<body>` (and auto-removes on close)
2. Any previous UI is torn down
3. `_render()` builds fresh DOM and returns the `ui` object
4. `_getOpenSibling()` checks for a currently open modal
5. If a sibling exists → `_suspend()` hides it (marked as `closeReason=suspend`)
6. `_armFinalClose()` registers the close callback
7. `_show()` makes the modal visible

## Stacking

When a second modal opens while the first is visible:

- The first modal is suspended (hidden but not destroyed)
- Its `dataset.closeReason` is set to `"suspend"` so close handlers know to ignore it
- When the second modal closes, `_onFinalClose()` restores the first via `_restore()`
- The restore happens in a `queueMicrotask` to avoid event ordering issues

## Close detection

The tricky part is distinguishing a **final close** (user dismissed the dialog) from a
**suspend close** (another modal is temporarily hiding this one).

- Vanilla: listens to the `<dialog>` `close` event, checks `dataset.closeReason`
- BS5: listens to `hidden.bs.modal`, same check

Only a final close triggers teardown and parent restoration.

## Close triggers

Handled in `ModalDialogBase.handleEvent()`:

- Click on `[data-pwc-action="close"]` → `close()`
- Click directly on `ui.rootEl` (backdrop) → `close()`

`close()` sets `dataset.closeReason = "final"` and calls `_hide()`.
