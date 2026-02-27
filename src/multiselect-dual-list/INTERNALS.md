# Multiselect-Dual-List — Internals

## Architecture

`MultiselectDualListBase` (`base.js`) extends `PwcChildrenObserverElement` and provides
the core logic for parsing options, managing selection state, and delegating events.
It defines a **subclass contract** — a set of hooks that variants must implement:

| Hook | Responsibility |
|------|---------------|
| `_buildUI()` | Build DOM, return `{ availableList, selectedList }` |
| `_createAvailableEntry(item)` | Create a DOM element for an available list entry |
| `_createSelectedEntry(item)` | Create a DOM element for a selected list entry |
| `get _selectedClass` | CSS class toggled on available entries when selected |

The vanilla variant uses plain HTML (`<ul>/<li>`) with custom CSS classes.
The BS5 variant uses Bootstrap `list-group` markup (`<div>` with Bootstrap classes).

## Rebuild lifecycle

1. `onChildrenChanged()` is called by `PwcChildrenObserverElement` when the DOM subtree changes
2. The `<select>` is parsed into an item list
3. On first run, `_buildUI()` is called to create the container DOM
4. `_populateLists()` fills both columns via `_createAvailableEntry()` / `_createSelectedEntry()`
5. The native `<select>` is hidden

DOM mutations during rebuild are wrapped in `_withoutChildrenChangedNotification()` to avoid
re-entrant observer calls.

## Item model

Each option is parsed into an item object:

```js
{ value, label, parent, depth, selected, disabled, warnOnUnselect }
```

- `depth` is computed by walking the `data-pwc-parent` chain (with cycle protection)
- Items are stored in `_items` (array) and `_itemsByValue` (Map)

## Add / remove logic

`_addItem(value)` and `_removeItem(value)` live in the base class. They handle:

- Updating the native `<select>` option state
- Single-select mode: deselecting all before adding
- Toggling `_selectedClass` and `aria-selected` on available entries
- Showing/hiding the add button
- Appending/removing selected entries
- `warnOnUnselect` confirmation before removal

The only variant-specific part is the CSS class name, provided by `get _selectedClass`:
- Vanilla: `pwc-multiselect-dual-list-item--selected` (default in base)
- BS5: `list-group-item-secondary` (override)

## Filter composition

Filtering is delegated to `<pwc-filter>` / `<pwc-filter-bs5>` via composition.
Each variant's `_buildUI()` wraps the available list in a filter element. If the
filter component is not loaded, the element is treated as an unknown HTML element
and the dual-list works without filtering (progressive enhancement).

After `_populateLists()` rebuilds the available entries (e.g. on dynamic option
changes), `onChildrenChanged()` calls `applyFilter()` on the filter element to
re-evaluate the current filter text against the new content.

## Event handling

The base class registers a `click` listener via `static events` (from
`PwcChildrenObserverElement`). `handleEvent()` dispatches to:

- `click` on `[data-action="add"]` → `_addItem(value)`
- `click` on `[data-action="remove"]` → `_removeItem(value)`

## Observer suppression

The MutationObserver watches `childList` on the full subtree (`observeMode = "tree"`).
`_withoutChildrenChangedNotification()` is used only around actual `childList` mutations
to avoid re-entrant `onChildrenChanged()` calls:

- `onChildrenChanged()` — wraps `_buildUI()`, `_populateLists()`, and `select.style.display`
- `_addItem()` — wraps `replaceChildren()` (single-select clear) and `appendChild()`
- `_removeItem()` — wraps `selEl.remove()`

Operations that only touch attributes or styles (`classList`, `style.display`,
`setAttribute`) do not trigger `childList` mutations and need no suppression.
