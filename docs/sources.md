# Implementation references

The kit follows the existing widget format. This reference was checked against the following source revisions; verify another consuming CMS rather than assuming compatibility.

| Source | Revision | Contract |
| --- | --- | --- |
| [cms-widgets](https://github.com/totaljs/cms-widgets) | `dc92cb7f40cb782c80af0a2cf0f9dcf9f92c8963` | Existing catalogue and `db.js` metadata extraction |
| [CMS](https://github.com/totaljs/cms) | `2d3e9471c166a31e33ea9e93e32bb9a501ebcc9c` | Widget compilation, settings and editor |
| [Framework 5](https://github.com/totaljs/framework5) | `7d2d553fc774090081b4e3b1ae75a52ef06b42b8` | Section parser and public rendering |

Read these files in the matching checkout:

- CMS `definitions/func.js`, `FUNC.recompile`: section extraction, metadata evaluation, CLASS substitution and dependencies.
- CMS `public/widget.txt`: widget template and hook arguments.
- CMS `public/cmseditor/index.html`: insertion wrapper, editor markers, settings check/load/save and saved config.
- CMS `public/cmseditor/settings.html`: settings model and submission.
- CMS `views/admin.html`: UI v19 bundle; `definitions/init.js`: preloaded admin controls.
- Framework 5 `utils.js`, `String.parseComponent`: exact section extraction.
- Framework 5 `cms.js`, `compile` and renderer: instance configuration, callback, wrapper replacement and cache.
- Catalogue `widgets/headline.html`, `widgets/alert.html`, `widgets/container.html`, `widgets/code.html`: configuration, scoping, nested content and server hooks.

CMS uses Framework 5 while the existing standalone catalogue builder `db.js` loads Total.js 4. The kit does not change or run that builder. A widget's settings UI must match the consuming CMS; backend framework major and jComponent major are separate decisions.
