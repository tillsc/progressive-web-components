# Zone-Transfer — Internals

## Core invariants

- The component is **DOM authoritative**: it moves existing nodes. No cloning.
- “What is a zone / item / handle” is resolved via `closest()` + `this.contains(...)` checks.
- Cross-component dragging is ignored by design (containment check is the boundary).

## Why `PwcChildrenObserverElement`

The component relies on `PwcChildrenObserverElement` (observe mode `tree`) to re-assert required
attributes when the DOM changes for reasons outside the component:

- server-driven re-renders
- app code inserting/removing items
- items being moved in from other components

The observer work is intentionally small: it only ensures items are draggable and maintains a sane
roving-tabindex setup for keyboard focus.

## Drag and drop state

The component keeps only the minimum transient state in `this._drag`:

- `item`: the element being moved
- `fromZone`: origin zone (element reference)

Everything else (zone membership, ordering) is derived from the current DOM when needed.

## Placeholder strategy

The placeholder is a single lightweight `<div aria-hidden="true">` stored as `this._placeholder`.

- Created lazily on first drag of an item
- Height is derived once from the dragged item’s bounding box
- Repositioned on `dragover`
- Removed on `drop` and `dragend`

Rationale:
- no duplicated interactive state
- stable layout feedback without copying node trees
- minimal mutation surface

## Insertion point algorithm

During `dragover`, the component computes a “before” element by comparing the pointer Y position
to each candidate item’s vertical midpoint (excluding the dragged item and the placeholder).

- first item whose midpoint is below the pointer becomes `beforeEl`
- otherwise we append at the end

This keeps ordering intuitive and avoids expensive heuristics.

## Keyboard model

Implementation notes:
- The handler bails out early for typing contexts (`input`, `textarea`, `select`, `button`, `[contenteditable]`).
- The keyboard path uses the same `_emitChange(...)` payload generation as drag-and-drop, so consumers
  see one consistent event shape.

## Error handling philosophy

No silent swallowing of unexpected errors:
- DOM operations are expected to work on well-formed markup.
- If a consumer supplies invalid markup (missing zones, etc.), the component should fail loudly in dev.

The only “soft failures” are early returns when resolution fails (e.g., drag start on non-item).

## Live region for keyboard moves

Created in `onChildrenChanged()` so it is available from the start.
Appended via `_withoutChildrenChangedNotification()` to avoid
re-triggering the MutationObserver.

The announcement text is intentionally minimal and mostly language-agnostic.
Subclasses can override `_getOrCreateLiveRegion()` to customize.

## Testing notes

- DnD tests stub `dataTransfer` because it is not reliably constructible across browsers.
- Keyboard tests should avoid duplicating what the basic DnD test already asserts; focus on:
  roving focus + reorder + hotkey zone moves.
