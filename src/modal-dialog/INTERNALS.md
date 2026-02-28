# Modal-Dialog — Internals

## Architecture

`ModalDialogBase` (`base.js`) provides orchestration for opening, closing, and stacking modals.
It defines a **subclass contract** — a set of hooks that variants must implement:

| Hook | Responsibility |
|------|---------------|
| `_render(ctx)` | Build DOM, return `{ rootEl, bodyEl, headerEl, footerEl, teardown? }`. Receives `{ title, height, closeText, showCloseButton, … }` plus variant-specific options (`width` for vanilla, `size` for BS5) |
| `_getOpenSibling()` | Find an already-open modal (for stacking) |
| `_suspend(el)` / `_restore(el)` | Hide/show a sibling modal during stacking |
| `_show(ui, options)` / `_hide(ui)` | Actually show/hide the modal |
| `_armFinalClose(ui, onFinalClose)` | Wire up the "real close" callback |

The vanilla variant uses native `<dialog>` + `showModal()`.
The BS5 variant uses `bootstrap.Modal`.

## Vanilla layout

The vanilla `<dialog>` uses a flex column layout to keep header and footer pinned while
the body scrolls:

- `dialog` — flex column, `max-height: var(--pwc-modal-dialog-max-height)`
- `.pwc-modal-dialog-surface` — `flex: 1`, nested flex column, `overflow: hidden` (clips border-radius)
- `.pwc-modal-dialog-header` / `.pwc-modal-dialog-footer` — `flex-shrink: 0`
- `.pwc-modal-dialog-body` — `flex: 1 1 var(--pwc-modal-dialog-height)`, `overflow: auto`

`width` and `height` options passed to `open()` are applied as inline custom properties
(`--pwc-modal-dialog-width`, `--pwc-modal-dialog-height`) on the host element inside
`_render()`, and cleared again if the next `open()` omits them.

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

The BS5 variant's `_getOpenSibling()` queries `.modal.show` (not just pwc elements),
so it can suspend and restore regular Bootstrap modals that happen to be open.

## Close detection

The tricky part is distinguishing a **final close** (user dismissed the dialog) from a
**suspend close** (another modal is temporarily hiding this one).

- Vanilla: listens to the `<dialog>` `close` event, checks `dataset.closeReason`
- BS5: listens to `hidden.bs.modal`, same check

Only a final close triggers teardown and parent restoration.

## Close triggers

Handled in `ModalDialogBase.handleEvent()`:

- Click on `[data-pwc-action="close"]` → `close()`
- Click directly on `ui.rootEl` (backdrop) → `close()` (vanilla only; BS5 delegates backdrop clicks to Bootstrap)

`close()` sets `dataset.closeReason = "final"` and calls `_hide()`.

## BS5 variant — `dispose()` timing

Bootstrap's `hide()` schedules `_hideModal` via `_queueCallback`, which registers both a
`transitionend` listener and a fallback `setTimeout`. `dispose()` nulls Bootstrap's
internal `_element` — if it runs before the fallback fires, `_hideModal` crashes.

Therefore `dispose()` is only called at the start of `_render()`, immediately before
replacing `innerHTML`. At that point a new `open()` is beginning, so all Bootstrap timers
from the previous close have long settled. It is intentionally **not** called from
`teardown` or `onDisconnect`.
