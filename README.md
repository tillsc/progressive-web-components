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
            css.js
            pwc-element.js

        dialog-opener/
            base.js
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

- Each component has an internal base class (base.js)
- Base classes are not registered as Custom Elements
- Base classes contain shared logic and stable DOM contracts
- Public variants subclass the base class
- Each public variant defines exactly one Custom Element
- Base and variant source files do not import CSS directly
- CSS is coupled only in index.js for bundling
- No Shadow DOM
- Stable internal markup and explicit styling hooks
- Styles are registered once, never per instance
- Shared runtime helpers are imported, not duplicated

## Bootstrap 5 variants

- Implemented as separate component variants
- Located in a dedicated bs5/ subdirectory
- Subclass the shared base implementation
- Built as separate distribution artifacts
- Same DOM structure and behavior as the base
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
- Base implementations are not published
- Components may be bundled or code-split
- No required build step for consumers