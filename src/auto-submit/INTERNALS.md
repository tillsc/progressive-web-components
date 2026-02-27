# Auto Submit — Internals

## Architecture

`PwcAutoSubmit` extends `PwcElement` directly. There is no base class or variant.

## Event handling

The component listens for `change`. `handleEvent` checks that the
event target has `data-pwc-auto-submit` before proceeding. The closest `<form>` is resolved from the
element's children or the target's ancestors.

## Two submission modes

1. **Native**: without `local-reload` (or without `id`), calls `form.submit()` — a full page navigation
2. **Fetch + transclude**: with `local-reload` and `id`, the form is submitted via `fetch` and the
   matching fragment is transcluded

The `local-reload` without `id` case logs a warning and falls back to native submission.

## Fetch & abort

Each `_submitAndLocalReload()` call creates a fresh `AbortController`. A new fetch aborts any
pending previous request first. On disconnect, pending requests are aborted via `_abortPending()`.

## Form data

`FormData` is built from the form element. An extra field `_pwc_autosubmitted_by` is added with
the trigger element's `name` or `id`, so the server can distinguish which control caused the
submission.

## Response handling

The response HTML is parsed with `DOMParser`. If a fragment with the same `id` is found, its
children are transcluded into the component. If no match is found, the entire document is replaced
as a fallback (`document.open/write/close`).
