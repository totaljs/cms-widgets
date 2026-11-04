# CMS widget API

This is the contract used by the reference CMS and Framework 5 sources listed in [Sources](sources.md). Verify the consuming CMS when using another version.

## Editable content markers

| Class | Editor behavior |
| --- | --- |
| `CMS_edit` | Editable text, link, image or icon, according to the element |
| `CMS_remove` | Element can be removed |
| `CMS_repeat` | Element can be repeated/reordered |
| `CMS_widgets` | Container for nested widgets |
| `CMS_attribute` | Element exposes attribute editing |
| `CMS_unwrap` | Editor can unwrap the element |
| `CMS_search` | Include the content in editor search |

Markers belong to appropriate elements, not indiscriminately on the wrapper. Use semantic headings, lists, links and buttons. Images need meaningful alt text or an empty alt for decoration. Do not place a button inside a link. A nested `CMS_widgets` slot must survive repeated settings saves.

## Editor hooks

Inside the `<script>` in `<settings>`:

```js
exports.check = function(config, el) { };
exports.load = function(config, el) { };
exports.save = function(config, el) { };
```

- `check` runs when the editor checks an instance, including after insertion.
- `load` runs when opening settings; it can read instance state into config.
- `save` runs when settings are saved; it applies configuration to that instance.

Hooks are optional. `el` is a jQuery-style wrapper for the widget instance. Use `el.find()`, `.text()`, `.css()`, `.attr()` and the native `.aclass()`, `.rclass2()` and `.tclass()` patterns found in existing widgets. CMS controls use `ui-component` and model paths under `?`; the editor handles storing the configuration. Do not create a separate store or session.

The reference CMS loads `input`, `configuration`, `choose`, `colorpicker`, `icons`, `keyvalue` and other controls in `definitions/init.js`. A control absent there is not automatically available: verify and declare the dependency instead of assuming it exists. Settings may use normal HTML and the CMS's existing spacing/grid classes.

## Server hooks

Inside `<script total>`:

```js
exports.install = function(db) { };
exports.uninstall = function(db) { };
exports.render = function(opt, next) {
	next(opt.html);
};
```

Install/uninstall are optional CMS lifecycle hooks receiving the CMS database object. Do not call them from a static check: they can schedule work or mutate state. A widget with background resources must release them in uninstall and tolerate reloads.

`render` is optional: static widgets publish their stored edited body without it. For dynamic widgets:

| Value | Meaning |
| --- | --- |
| `opt.config` | Configuration stored on this widget instance |
| `opt.id` | Instance identifier during rendering |
| `opt.widget` | Widget type id |
| `opt.html` | Inner HTML of this instance |
| `opt.body` | Whole instance body including its wrapper |
| `opt.template` | Extracted template body |
| `opt.url`, `opt.vars`, `opt.controller` | Page context supplied by the caller |
| `opt.user` | Optional user context; not guaranteed |

`next(content, replace, cache)` completes rendering. Call it exactly once on every success, empty and error path. Content is HTML. `replace: true` removes the outer wrapper as well; the default preserves it. `cache: true` reuses rendered content; do not use it for user-specific or changing content without understanding the CMS cache scope and invalidation.

The compiler does not merge `exports.config` into every incoming render config. Treat missing fields defensively, especially for pages saved before an option was added. Server hooks have Total.js globals; browser hooks do not. Use `.encode()` for text inserted into server HTML and `.text()` for text in editor DOM. Restrict URL schemes before inserting links or fetching remote resources. Use timeouts and an explicit fallback for remote requests; do not contact live providers in unit tests.

An outer `<script>` is public browser JavaScript, not an editor hook. It may run without the admin UI library. Do not assume `$`, `COMPONENT`, admin models or editor globals are available on every published layout.
