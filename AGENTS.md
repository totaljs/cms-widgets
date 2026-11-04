# CMS widget authoring

Create Total.js CMS widgets from a description. Each deliverable is a single `widgets/<id>.html` file in the existing repository format. Keep existing widgets, `db.js`, README and license unchanged unless the user explicitly includes them in the task.

## Start here

- [docs/ai.md](docs/ai.md): commands and entry points.
- [docs/format.md](docs/format.md): sections, metadata, settings and CSS scope.
- [docs/api.md](docs/api.md): editor hooks, rendering and content markers.
- [docs/workflow.md](docs/workflow.md): creation and review.
- [docs/testing.md](docs/testing.md): checks and CMS verification.
- [docs/sources.md](docs/sources.md): authoritative implementation and compatibility.

Read the nearest existing widget before writing one. Use `examples/notice.html` for a configurable content widget, `examples/insetpanel.html` for a container, and `examples/statusmessage.html` for server rendering. Examples are outside the published `widgets/` catalogue.

## Rules

- Plain JavaScript: `var`, `function`, tabs, semicolons and single quotes. Preserve native CMS HTML sections; do not wrap a widget in a full web page or a `COMPONENT()` registration.
- Use `<script total>` for metadata/server hooks and `<settings><script>` for editor hooks. They run in different environments.
- New ids are lowercase letters/digits, begin with a letter, and match the filename. Check both ids and names in `widgets/` before choosing one. Do not rename existing widgets.
- Scope widget CSS with `.CLASS` or `.CLASS-...`. `CLASS` becomes a class for the widget type, shared by all its instances. Use the `el` argument to change one instance.
- Preserve user-edited content when settings change. Call hooks repeatedly and verify two instances. Do not put instance data in module globals or fixed DOM ids.
- Settings use `?.key` paths and matching defaults in `exports.config`. Document each option and allowed values in `<readme>`.
- The reference CMS admin loads jComponent v19. Match the consuming CMS; do not introduce v20-only controls. CMS-provided controls are listed in `docs/api.md`.
- Use native Total.js APIs in server hooks. Encode untrusted text with `.encode()` and use `.text()` in editor hooks; validate URLs and finite option values before using them in HTML or CSS. Cache rendered output only when sharing it is correct.
- Use semantic, accessible HTML and responsive CSS. Keep the visitor content editable with the CMS markers appropriate to the widget. Do not mark public content as translated admin interface text.
- Do not commit credentials, generated catalogues, node_modules or package-lock.json. No dependency is needed by a widget unless its actual behavior requires one.

## Verification

```sh
node tools/check.js examples/notice.html
node tools/check.js widgets/newwidget.html --cms ../cms
node tools/browser.js examples/notice.html
node test.js
node tools/llms.js --check
```

Install Total.js locally with `npm i total5 playwright --no-save --package-lock=false`. Tests use the native `total5/test` runner; tools use `Total.Fs`, `Total.Path` and other exposed modules. Browser checks need Playwright and Chrome/Chromium; see `docs/testing.md`. Run the widget in the actual CMS editor and on a published page before claiming CMS integration. Report skipped checks explicitly. Instructions and tooling do not grant permission to publish or modify other repositories.
