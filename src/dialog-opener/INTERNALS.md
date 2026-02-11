# Dialog-Opener — Internals

## Architecture

`BaseDialogOpener` (`base.js`) extends `PwcElement` and provides the flow from link click
to iframe-based dialog. It defines a **subclass contract**:

| Hook | Responsibility |
|------|---------------|
| `findOrCreateDialog(src)` | Create/reuse a `<pwc-modal-dialog>`, open it, place the iframe, set `this.dialog` and `this.modal` |
| `_moveOutSelector()` | Return CSS selector for buttons to move out (can extend, e.g. BS5 adds `"primary"` magic value) |

The base class never touches DOM rendering directly. Variants own the dialog creation and
provide a uniform adapter interface (`this.modal.show()` / `this.modal.hide()`).

## Flow: link click to dialog

1. Click on an `<a>` inside the component is intercepted (`handleEvent`)
2. `prepareIFrameLink()` builds the iframe URL:
   - collects `input` values as `default` query param
   - appends `_layout=false`
3. `findOrCreateDialog(src)` (variant hook) creates the modal and iframe
4. `enhanceIFrame()` waits for the iframe `load` event, then calls `iFrameLoad()`
5. `iFrameLoad()` checks the iframe URL:
   - If `dialog_finished_with` is present → close dialog, trigger reload or navigation
   - Otherwise → run `moveElementsToOuterActions()`, show iframe

## Move-out mechanism

When `move-out` is set, buttons are **cloned** from the iframe document into the dialog footer.
The original buttons are hidden. Clicking a cloned button triggers `click()` on the original
inside the iframe, then hides the iframe (to show a loading state while the form submits).

## Local reload

When the dialog completes and `local-reload` is set:

1. The completion URL is fetched via `fetch()`
2. The response HTML is parsed with `DOMParser`
3. The element matching `this.id` is extracted from the response
4. Its children replace the current component's children
5. Optionally: `history.pushState` / `replaceState` updates the URL
6. Optionally: inline `<script>` tags are re-executed (cloned into new elements)
7. A `pwc-dialog-opener:local-reload` custom event is dispatched

If any step fails, it falls back to full page navigation.

## Modal adapter pattern

The base class expects `this.modal` with `.show()` and `.hide()`. Since both variants use
`<pwc-modal-dialog>` (which is already open by the time `findOrCreateDialog` returns),
`show()` is a no-op and `hide()` delegates to `modalDialog.close()`.
