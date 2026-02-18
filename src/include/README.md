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

---

## Methods

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
