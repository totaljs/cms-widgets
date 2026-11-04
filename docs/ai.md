# AI authoring kit

Start with [AGENTS.md](../AGENTS.md). The kit teaches the existing CMS widget format and provides examples and checks. It adds no application runtime or service.

| Resource | Purpose |
| --- | --- |
| [Format](format.md) | Sections, metadata, scoping and configuration |
| [API](api.md) | Editor markers, hooks and server rendering |
| [Workflow](workflow.md) | Turn a description into a working widget |
| [Testing](testing.md) | Commands, limitations and integration checks |
| [Sources](sources.md) | Implementation references and runtime compatibility |
| [llms.txt](../llms.txt) | Documentation index |
| [llms-full.txt](../llms-full.txt) | Documentation in one file |

Codex discovers `AGENTS.md` and `.agents/skills/`. Claude Code has `CLAUDE.md` and matching skill entry points in `.claude/skills/`. Gemini and Copilot have pointers to the same rules. Shared workflows are maintained in `.agents/skills/`.

- `cms-widget-create`: create a single-file widget with settings and editable content.
- `cms-widget-review`: review or correct a widget and verify its editor/public behavior.

An assistant reading a remote repository can begin at `llms.txt`. A local assistant should run checks from the repository root. These files guide an assistant; they cannot guarantee its output without execution and review.
