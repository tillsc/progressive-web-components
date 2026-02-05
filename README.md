# progressive-web-components

Server-first web components.

This repository collects Custom Elements designed to work with server-rendered HTML.

## Scope

- Custom Elements without Shadow DOM by default
- Server-rendered HTML as the baseline
- Small, composable components
- Optional Bootstrap 5 variants
- Minimal JavaScript
- Bundler-independent source files
- JS-only distribution

## Source structure

Example: <dialog-opener> component

    src/
        core/
            define-once.js
            install-css-once.js

        dialog-opener/
            dialog-opener.js
            dialog-opener.css
            index.js

            bs5/
                dialog-opener.js
                dialog-opener.css
                index.js

    dist/
        dialog-opener.js
        dialog-opener-bs5.js

## Conventions

- Each component has a base Custom Element
- The base component defines structure and behavior
- Base components do not import CSS directly
- CSS is coupled only in index.js for bundling
- No Shadow DOM
- Stable internal markup and explicit styling hooks
- Styles are registered once, never per instance
- Shared runtime helpers are imported, not duplicated

## Bootstrap 5 variants

- Located in a dedicated subdirectory per component
- Implemented as extensions of the base component
- Built as separate distribution artifacts
- Same DOM structure as the base component
- Additional classes and attributes only
- Optional Bootstrap-specific CSS

## CSS handling

- Authoritative styles live in plain .css files
- CSS is not imported by component source files
- index.js files are responsible for bundling JS and CSS
- CSS is installed once at define time

## Distribution

- dist contains JavaScript files only
- One file per component variant
- Components may be bundled or code-split
- No required build step for consumers