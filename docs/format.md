# Widget format

A widget is `widgets/<id>.html`. It is a CMS source document, not a standalone HTML page. Keep the existing catalogue format. A widget does not require separate CSS, JavaScript, README or preview files.

| Section | Environment and purpose |
| --- | --- |
| `<script total>` | Metadata and optional server hooks |
| `<style>` | Widget CSS |
| `<settings>` | Editor configuration UI; may contain its own `<style>` and `<script>` |
| `<body>` | Initial editable content |
| `<script>` | Optional public browser code outside settings/body |
| `<template>` | Optional template made available to the render hook |
| `<readme>` | Purpose, options, dependencies and verification notes |

Use exact lowercase opening tags; the CMS parser looks for those strings. Keep one of each outer section, and put settings before outer style/script sections: the parser extracts settings first, then other sections, so nested blocks must remain inside settings. A literal closing script tag inside JavaScript strings can end a section early: split the string if needed.

## Metadata

```js
exports.id = 'notice';
exports.name = 'Notice';
exports.author = 'Your author name';
exports.version = '1';
exports.preview = 'data:image/png;base64,...';
exports.config = { align: 'left' };
```

Use the actual author supplied for the widget. The metadata values `id`, `name`, `author`, `version`, `preview` follow the existing catalogue. The preview is an embedded image shown in the widget picker. Generate a screenshot with `tools/browser.js --preview`; no separate image is added to the catalogue. The database builder derives the catalogue id from the filename, so it must match `exports.id`.

`exports.config` is optional for a widget without settings. Defaults must agree with initial body classes/content. Use plain serializable values. An optional `exports.dependencies` accepts URLs as an array (the CMS also accepts a comma/semicolon-separated string). Declare only actual dependencies. A dependency that requires configuration or ordering must be verified on the consuming site.

## CSS and instances

The CMS derives `w-<normalized-id>` from `exports.id` and substitutes `CLASS` in CSS, settings, template, public JS and body. For example `.CLASS-title` becomes `.w-notice-title`. All instances of that widget type share this prefix: it is not an instance identifier.

Use `.CLASS ...` for descendants and `.CLASS-...` for widget-owned sub-elements. The CMS inserts a wrapper with the widget class. Do not add global `body`, `p` or `a` rules. Settings styles should be rooted in `.CLASS-settings`, not affect the entire admin.

The `<script total>` code is evaluated before substitution and is not rewritten. A server hook must not return unresolved `CLASS` strings; reuse `opt.html` or emit markup using known classes explicitly. The static checker cannot prove every CSS selector is safe: inspect complex selectors, keyframes and external styles manually.

## Settings

Use the CMS input/configuration components and `?.key`, for example `<ui-component name="input" path="?.align" config="dirsource:left|Left,center|Center,right|Right">Align</ui-component>`. Use the closest existing widget as the control reference; the main admin uses jComponent v19.

`exports.save(config, el)` changes only `el` and its descendants. Clear old state classes before adding new ones and validate dropdown values even when the UI restricts them. Do not replace the whole body to apply a cosmetic setting: it would discard edited content, repeated blocks and nested widgets. See [API](api.md).
