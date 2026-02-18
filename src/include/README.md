# `<pwc-include>`

Client-side HTML transclusion. Fetches HTML from a URL and inserts it into the element.

Inspired by [h-include](https://github.com/gustafnk/h-include) by [Gustaf Nilsson Kotte](https://github.com/gustafnk).

---

## Basic usage

```html
<pwc-include src="/fragments/header.html"></pwc-include>
```

---

## Attributes

### `src`

URL to fetch.

```html
<pwc-include src="/api/user-info"></pwc-include>
```

### `fragment`

CSS selector applied to the response. All matching elements are inserted.

```html
<pwc-include src="/page.html" fragment=".sidebar"></pwc-include>
```

### `media`

Media query. The fetch is skipped when the query does not match.

```html
<pwc-include src="/desktop-widget.html" media="(min-width: 768px)"></pwc-include>
```

### `lazy`

Defers the fetch until the element enters the viewport (uses `IntersectionObserver`).

```html
<pwc-include src="/comments.html" lazy></pwc-include>
```

### `alt`

Fallback URL. Fetched automatically when the primary `src` request fails.

```html
<pwc-include src="/live-data" alt="/cached-data.html"></pwc-include>
```

### `with-credentials`

Sends cookies and credentials on cross-origin requests (`credentials: "include"`).

```html
<pwc-include src="https://other.example.com/fragment" with-credentials></pwc-include>
```

### `with-scripts`

Executes `<script>` elements found in the inserted HTML (both inline and external).

```html
<pwc-include src="/interactive-widget.html" with-scripts></pwc-include>
```

### `shadow`

Inserts content into a Shadow DOM. Styles inside the transcluded HTML are automatically scoped.

```html
<pwc-include src="/card.html" shadow></pwc-include>
```

### `extract-styles`

Extracts `<style>` and `<link rel="stylesheet">` elements from the transcluded HTML and converts
them into shared [Constructable Stylesheets](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet). Identical stylesheets are cached and shared across all instances (by URL for `<link>`, by normalized CSS text for `<style>`).

With `shadow`: sheets are adopted into the shadow root.
Without `shadow`: sheets are adopted into the document (like `registerCss()` from `utils.js`).

The attribute value controls **where** styles are collected from:

| Value | Collects from |
|---|---|
| `""` (boolean) | Same as `"fragment"` |
| `"fragment"` | The inserted content (or the selected `fragment`) |
| `"head"` | The `<head>` of the parsed document |
| `"fragment head"` | Both |
| `"document"` | The entire parsed document |

```html
<!-- Styles within the fragment are extracted and shared -->
<pwc-include src="/card.html" shadow extract-styles></pwc-include>

<!-- Also pick up <head> stylesheets (e.g. <link> in the fetched page) -->
<pwc-include src="/page.html" fragment=".content" shadow extract-styles="fragment head"></pwc-include>

<!-- Works without shadow too — sheets go to document.adoptedStyleSheets -->
<pwc-include src="/card.html" extract-styles></pwc-include>
```

---

## Properties & Methods

### `root`

The content root: the shadow root (when `shadow` is set) or the element itself. Read-only.

### `refresh()`

Re-fetches the current `src` and replaces the content.

```js
document.querySelector("pwc-include").refresh();
```

---

## Events

### `pwc-include:load`

Dispatched after HTML has been successfully inserted. Bubbles.

### `pwc-include:error`

Dispatched on fetch or network errors. Bubbles. The error object is available via `event.detail.error`.

```js
el.addEventListener("pwc-include:error", (e) => {
  console.error("Include failed:", e.detail.error);
});
```

---

## Styling

### `[aria-busy="true"]`

Set while a fetch is in flight. Can be used to show a loading indicator.

```css
pwc-include[aria-busy="true"] {
  opacity: 0.5;
}
```

---

## Dynamic updates

Changing the `src` or `media` attribute at runtime triggers a new fetch automatically.
