# twinBASIC Documentation — Working Notes

Jekyll site (`just-the-docs` theme) deploying to `docs.twinbasic.com`. Source under `docs/`.

## Current Task

Fill out reference documentation by adapting Microsoft VBA-Docs (CC-BY-4.0) for twinBASIC. Always work from the cloned source — never paraphrase from memory.

## Where things live

- `docs/Reference/Core/` — language statements/keywords (`Dim`, `For-Next`, `Sub`, ...).
- `docs/Reference/Modules/<Mod>/` — runtime library, grouped by module:
  - Existing folders: `DateTime/`, `FileSystem/`, `Interaction/`.
  - Single-file modules (still to be split): `Math.md`, `Strings.md`, `Financial.md`.
- `docs/Reference/Modules/<Mod>/index.md` — module landing page listing its members.
- `docs/Reference/Statements.md` — alphabetical index of language statements.
- `docs/Reference/Procedures and Functions.md` — alphabetical index of procedures/functions.
- `docs/_includes/VBA-Attribution.md` — the attribution boilerplate include.

## VBA-Docs source (read-only)

Cloned as a sibling of this repo. All paths below are relative to the repo root:

```
../VBA-Docs/Language/Reference/User-Interface-Help/<symbol>-<kind>.md
```

Common kinds: `-statement`, `-function`, `-property`, `-method`, `-object`, `-operator`. Find the file with `ls ../VBA-Docs/Language/Reference/User-Interface-Help/ | grep -i <name>` before drafting.

## Page template

Match the existing style. Worked examples to imitate:

- Core statement: `docs/Reference/Core/Const.md`, `docs/Reference/Core/Dim.md`, `docs/Reference/Core/Call.md`.
- Module function: `docs/Reference/Modules/Interaction/AppActivate.md`, `docs/Reference/Modules/Interaction/Beep.md`.
- Property with `Core/` redirect: `docs/Reference/Modules/DateTime/Date.md`.

Skeleton:

````markdown
---
title: <Symbol>
parent: <Statements | Procedures and Functions | <Mod> Module>
permalink: /tB/Core/<Symbol>            # or /tB/Modules/<Mod>/<Symbol>
redirect_from:                          # only if relocated; e.g. moved from Core/ to a Module/
-  /tB/Core/<Symbol>
---
# <Symbol>
{: .no_toc }

<one-line description>

Syntax: **<Symbol>** [ *args* ]

*arg1*
: *required* | *optional*  description.

<remarks paragraphs>

### Example

This example...

```vb
' code
```

### See Also

- [Other](OtherSymbol)

{% include VBA-Attribution.md %}
````

Formatting conventions:

- `**...**` for keywords/literal tokens; `*...*` for placeholders/arguments.
- Code blocks use ` ```vb `.
- Parameter lists use the kramdown `term` + `: definition` indentation pattern (NOT the MS-style markdown table).
- Don't drop the `{% include VBA-Attribution.md %}` line unless the page is fully original content.

### Cross-section linking

Bare relative links (e.g. `[Foo](Foo)`) only resolve within the **same folder** — i.e. siblings inside the same `Core/` or the same `Modules/<Mod>/`. Crossing a section requires an explicit relative path:

| From                         | To                          | Link                       |
|------------------------------|-----------------------------|----------------------------|
| `Modules/<Mod>/X`            | `Modules/<Mod>/Y` (sibling) | `[Y](Y)`                   |
| `Modules/<Mod>/X`            | `Core/Y`                    | `[Y](../../Core/Y)`        |
| `Modules/<Mod>/X`            | `Modules/<OtherMod>/Y`      | `[Y](../<OtherMod>/Y)`     |
| `Core/X`                     | `Modules/<Mod>/Y`           | `[Y](../Modules/<Mod>/Y)`  |
| `Core/X`                     | `Core/Y` (sibling)          | `[Y](Y)`                   |

Always link to the **canonical** location (the page's `permalink:`), not to a `redirect_from` alias. Pages that have moved out of `Core/` retain a `redirect_from: /tB/Core/<X>` so legacy links still work, but forward-style links should point at the new home.

## Per-symbol workflow

1. **Locate the source**: `ls ../VBA-Docs/Language/Reference/User-Interface-Help/ | grep -i <name>`.
2. **Decide placement**:
   - Pure language keyword (parsed by the compiler, no runtime call) → `docs/Reference/Core/`.
   - Runtime function/property → `docs/Reference/Modules/<Mod>/`. Add `redirect_from: /tB/Core/<name>` so legacy `tB/Core/<name>` links still work.
   - Pick `<Mod>` from VBA's grouping (Information, Interaction, Strings, FileSystem, DateTime, Math, Financial, Conversion, ...) and the existing folders under `Modules/`.
3. **Adapt content**:
   - Strip MS frontmatter (`ms.assetid`, `f1_keywords`, `keywords`, `ms.date`, `ms.localizationpriority`).
   - Strip the `[!include[Support and feedback]...]` footer.
   - Replace MS parameter tables with the `*name*` + `: definition` style.
   - Replace VBA-specific phrasing (e.g. "Visual Basic for Applications") with twinBASIC where it changes meaning; otherwise leave as-is.
   - Trim Mac/Windows 95/NT trivia unless historically illuminating.
4. **Flag tB deviations** with a `> [!NOTE]` callout (see next section).
5. **Update the parent index** (`Modules/<Mod>/index.md`, or `Reference/Statements.md`, or `Reference/Procedures and Functions.md`) — turn an unlinked bullet into a link with a short blurb. Match the existing style of the page.
6. **Remove the symbol's path from the matching `todo.md`** `redirect_from:` array:
   - `docs/Reference/Core/todo.md` — for `Core/` symbols.
   - `docs/Reference/Modules/todo.md` — for `Modules/` symbols.
   - `docs/Reference/Modules/VBA-todo.md` — for `Modules/VBA/` namespace.
7. **Add the page** to `Reference/Statements.md` or `Reference/Procedures and Functions.md` if not already listed there.
8. **Run the [site integrity check](#site-integrity-check)** after the batch and before committing.

## twinBASIC deviations from VBA to flag

Add a `> [!NOTE]` callout or rewrite the affected section when source diverges. Known cases:

- `Date`, `Date$`, `Time`, `Time$` are **properties** in twinBASIC, not functions/statements — see `Modules/DateTime/Date.md` for the pattern.
- `Decimal` data type is reserved but not currently supported. Note where applicable.
- twinBASIC adds `Continue`, attribute syntax `[Documentation("...")]`, and other features documented under `docs/Features/`.
- Some VBA-Docs pages have Office-host-specific Application objects — irrelevant; omit.
- Mac-specific notes from VBA-Docs are typically irrelevant; trim.

When in doubt about a tB-specific behavior, check `docs/Features/` and `docs/Reference/index.md` before assuming VBA semantics carry over.

## Scripts and tooling

Any new helper script (backlog reconciliation, content conversion, link checks beyond htmlproofer, etc.) should be written in **Python**. Do not add new Ruby code to this repo. The only Ruby allowed is the existing Jekyll/`just-the-docs` build chain (`Gemfile`, `Gemfile.lock`, `_plugins/`) — that stays as-is.

## Build / preview

From `docs/`:

- `bundle exec jekyll build` (or `build.bat`) — build to `_site/`.
- `bundle exec jekyll serve` (or `serve.bat`) — local server at `localhost:4000`.
- `bundle exec htmlproofer ./_site --disable-external --no-enforce-https` (or `check.bat`) — link check. See [Site integrity check](#site-integrity-check).

## Site integrity check

After a batch of changes, verify the site builds clean and all links resolve. From the `docs/` folder, run **exactly** this command:

```sh
bundle exec htmlproofer ./_site --disable-external --no-enforce-https
```

Do not add, remove, or substitute flags. This catches broken intra-site links, missing pages, and malformed `redirect_from` entries — the most common breakage when adding new pages or moving content between sections. A clean run is the bar for "ready to commit".

Requires a prior `bundle exec jekyll build` so `_site/` is current.

## Backlog discovery

The "missing" set is encoded in `redirect_from:` arrays of the three `todo.md` stub pages above. Anything still listed there is undocumented; presence of a real file at the redirect target means it's done. To pick a batch:

```sh
# from repo root
grep -E "^\s*-\s+/tB/" docs/Reference/Core/todo.md docs/Reference/Modules/todo.md docs/Reference/Modules/VBA-todo.md
```

## Repository Use

Favor concise one-line git commit messages.

## Don'ts

- Don't commit `.claude/` or `CLAUDE.md` — both gitignored. (`WIP.md` is committed; `CLAUDE.md` is just a local `@WIP.md` import shim.)
- Don't touch `_site/` (build output, gitignored).
- Don't push or force-push without explicit user request.
- Don't invent VBA semantics — read the source file in `../VBA-Docs/` first.
- Don't add boilerplate sections (Remarks, See Also) if the source has nothing meaningful for them.
- **Never add `Co-Authored-By:` (or any "Co-authored by" / "Generated with Claude" / similar) trailers to commit messages.** Repository policy. Plain commit messages only.
