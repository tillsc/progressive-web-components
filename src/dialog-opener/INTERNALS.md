# Dialog-Opener — Internals

## Architecture

`BaseDialogOpener` (`base.js`) extends `PwcElement` and provides the flow from link click
to iframe-based dialog. It defines a **subclass contract**:

| Hook | Responsibility |
|------|---------------|
| `findOrCreateDialog(src)` | Create/reuse a `<pwc-modal-dialog>`, open it, place the iframe, return the dialog element |
| `closeDialog()` | Close the dialog |
| `_moveOutSelector()` | Return CSS selector for elements to hoist (can extend, e.g. BS5 adds `"primary"` magic value) |

The base class never touches DOM rendering directly. Variants own the dialog creation.

## Flow: link click to dialog

1. Click on an `<a>` inside the component is intercepted (`handleEvent`)
2. `prepareIFrameLink()` builds the iframe URL:
   - collects `input` values as `pwc_default` query param
   - appends `pwc_embedded=true`
3. `findOrCreateDialog(src)` (variant hook) creates the modal and iframe
4. `enhanceIFrame()` waits for the iframe `load` event, then calls `iFrameLoad()`
5. `iFrameLoad()` checks the iframe URL:
   - If `pwc_done_with` is present → close dialog, trigger reload or navigation
   - Otherwise → run `moveElementsToOuterActions()`, show iframe

## Hoist-actions mechanism

When `hoist-actions` is set, elements are **recreated** from the iframe document into the
dialog footer (new elements with copied tag, attributes, and innerHTML — not `cloneNode`,
since that doesn't work across documents). The original elements are hidden. Clicking a
recreated element triggers `click()` on the original inside the iframe, then hides the
iframe (to show a loading state while the form submits).

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
