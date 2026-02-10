# Multiselect-Dual-List — Internals

## Architecture

`MultiselectDualListBase` (`base.js`) extends `PwcChildrenObserverElement` and provides
the core logic for parsing options, managing selection state, and delegating events.
It defines a **subclass contract** — a set of hooks that variants must implement:

| Hook | Responsibility |
|------|---------------|
| `_buildUI()` | Build DOM, return `{ availableList, selectedList, filterInput }` |
| `_createAvailableEntry(item)` | Create a DOM element for an available list entry |
| `_createSelectedEntry(item)` | Create a DOM element for a selected list entry |
| `get _selectedClass` | CSS class toggled on available entries when selected |
| `_filterAvailable(text)` | Show/hide available entries, return `{ matchCount, totalCount }` |

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

- `depth` is computed by walking the `data-parent` chain (with cycle protection)
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
- Vanilla: `pwc-msdl-item--selected` (default in base)
- BS5: `list-group-item-secondary` (override)

## Filter logic

### `_buildFilterRegex(text)` (base)

Shared helper that compiles a filter string into a case-insensitive `RegExp`.
Returns `null` when `text` is empty. Falls back to an escaped literal if the input
is not valid regex syntax.

### `_filterAvailable(text)` (variants)

Implemented by each variant because the show/hide mechanism differs:
- Vanilla: `el.style.display = "none"`
- BS5: `el.classList.toggle("d-none", ...)`

Both use `_buildFilterRegex()` and return `{ matchCount, totalCount }`.

### `_applyFilter(text)` (base)

Orchestration method: calls `_filterAvailable(text)`, then dispatches a
`pwc-multiselect-dual-list:filter` CustomEvent with
`{ filterText, matchCount, totalCount }`. Called from `handleEvent` (on user input),
the `filterText` setter, and after `_populateLists()` in `onChildrenChanged()`
when a filter is active.

## Event handling

The base class registers `click` and `input` listeners via `static events` (from
`PwcChildrenObserverElement`). `handleEvent()` dispatches to:

- `click` on `[data-action="add"]` → `_addItem(value)`
- `click` on `[data-action="remove"]` → `_removeItem(value)`
- `input` on the filter input → `_filterAvailable(text)`

## Observer suppression

The MutationObserver watches `childList` on the full subtree (`observeMode = "tree"`).
`_withoutChildrenChangedNotification()` is used only around actual `childList` mutations
to avoid re-entrant `onChildrenChanged()` calls:

- `onChildrenChanged()` — wraps `_buildUI()`, `_populateLists()`, and `select.style.display`
- `_addItem()` — wraps `replaceChildren()` (single-select clear) and `appendChild()`
- `_removeItem()` — wraps `selEl.remove()`

Operations that only touch attributes or styles (`classList`, `style.display`,
`setAttribute`) do not trigger `childList` mutations and need no suppression.
