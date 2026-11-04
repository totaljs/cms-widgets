# Verification

Run commands from the repository root with Node.js 20 or newer. These are development tools; they are not copied into a CMS site.

## Setup

```sh
npm i total5 playwright --no-save --package-lock=false
npx playwright install chromium
```

Tests load `total5` and `total5/test` directly. Tools also load `total5` directly and use the framework-exposed modules. A missing dependency is a setup error. The suite uses `Test.push()`, `Test.print()` and `Test.run()`.

## Static and native checks

```sh
node tools/check.js examples/notice.html
node tools/check.js widgets/newwidget.html --cms ../cms
node tools/check.js widgets --legacy
node test.js
node tools/llms.js --check
node tools/llms.js --write
```

The checker uses Total.js `String.parseComponent()` with the section order of `FUNC.recompile()`. It compiles scripts, reads metadata, checks required fields, filename/id, duplicate catalogue ids, preview images, configuration paths/defaults and embedded option documentation. It reports suspicious global CSS and instance ids. `--legacy` reports new authoring conventions as warnings; syntax and missing required sections still fail. It never edits catalogue files or runs install/uninstall/render hooks.

`--cms <source-url|checkout>` additionally runs that checkout's actual `FUNC.recompile()` in an isolated process and checks the parsed/scoped result. This does not start the CMS or access its storage. The CMS source URL is trusted executable code; the default is pinned to the revision in `tests/config`. Both native checks evaluate trusted `<script total>` code, just as importing it into CMS does. Do not use them for untrusted downloads.

Kit tests include malformed sections/JavaScript, duplicate ids, filename mismatch, unknown settings keys, undocumented options, non-object configuration, ids matching object property names, non-image previews and out-of-scope CSS. Native tests exercise example parsing and Framework 5 rendering, including hostile text and two separate configurations. Browser tests exercise settings hooks separately from the full CMS application.

## Test configuration

`tests/config` contains the two sources used for integration checks:

- `cms`: the CMS compiler source on GitHub, pinned to a specific commit.
- `spa`: the official `https://cdn.componentator.com/spa.min@19.js` bundle.

The runner reads them with `LOADCONFIG()`. `node test.js` runs all groups with these defaults and requires network access. Download failures fail the requested check; they do not silently switch sources. No database or CMS storage is accessed.

A local CMS checkout or compiler file and a downloaded UI bundle can be selected for offline checks:

```sh
node test.js --cms ../cms --spa /path/to/spa.min@19.js
```

Playwright uses its installed Chromium by default. `--channel chrome` optionally selects an installed Google Chrome instead; it is not a CMS setting. Clearing either source in `tests/config` explicitly disables its integration group, which is reported as skipped. `--browser` requires the browser check even when spa is blank.

## Browser smoke test and preview

```sh
npm i total5 playwright --no-save --package-lock=false
npx playwright install chromium
node tools/browser.js examples/notice.html
node tools/browser.js widgets/newwidget.html --preview
```

The browser tool reads `spa` from `tests/config`; `--spa <url|file>` overrides it. It downloads the bundle with native `RESTBuilder`, then injects it into an isolated page. Other page network requests are blocked. The selected bundle must match the consuming CMS. Use `--channel chrome` for installed Chrome instead of Playwright Chromium.

The tool mounts two wrappers, runs settings check/load/save hooks with the real UI library, preserves editable/nested content, repeats saves, and checks mobile/desktop overflow and browser exceptions. It does not load external widget dependencies, mount CMS settings components or run public scripts; those require actual CMS verification. Preview generation embeds a PNG screenshot into `exports.preview` of the explicitly selected file only. Commit that image only when it matches the final widget.

## Actual CMS verification

In a disposable local CMS, import the new widget through Widgets. Add two instances to a page, open its settings and exercise each control. Edit content, repeat/remove elements where offered, save settings twice, save/reopen the page and check persisted configuration and content. For containers, insert a nested widget and confirm it survives. Verify a published page at desktop and mobile widths, including links, images, keyboard operation and public JS. For dynamic widgets, check error/empty cases and cache behavior with representative data.

Never use production storage for verification. The kit does not start, clear or populate the CMS. Report actual CMS checks separately from static/native/browser results.
