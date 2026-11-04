# Create and review a widget

1. Inspect `widgets/` for a matching purpose, id and visual pattern. Read [Format](format.md) and [API](api.md). Check the actual consuming CMS runtime before adding a control or API.
2. Define a short contract: purpose, editable content, defaults, valid values, nested slots, dependencies and whether server rendering is needed. Keep it in `<readme>`. Ask only when a missing requirement changes behavior.
3. Start from the smallest matching example: [notice](../examples/notice.html), [container](../examples/insetpanel.html) or [server rendering](../examples/statusmessage.html). Keep only the sections and hooks the widget needs.
4. Write a new `widgets/<id>.html`. Preserve catalogue files already present. Match metadata, filename, CSS, defaults and settings. Use editor markers to retain visitor content editing.
5. Validate metadata/sections/JavaScript and the settings paths with `node tools/check.js widgets/<id>.html`. See [Testing](testing.md) for framework, browser and actual CMS checks.
6. Exercise every option, repeated saves, edited text, repeat/remove, nested content, empty/long values, hostile text and two differently configured instances. Verify desktop/mobile and the published page. Generate an embedded preview of the final appearance.
7. Report the new file and what was verified. Do not call an isolated browser check a full CMS editor integration test.

When reviewing, first reproduce the reported issue and check the existing contract. Correct only the requested behavior. Preserve saved configuration keys, widget id and editable content. A legacy catalogue warning is not permission to rewrite that widget. Add a focused regression check for a behavioral bug rather than a test that merely repeats implementation text.
