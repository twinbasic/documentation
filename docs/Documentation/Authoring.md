---
title: Authoring Pages
parent: Documentation Development
nav_order: 2
permalink: /Documentation/Development/Authoring
---

# Authoring Pages
{: .no_toc }

The starting point for writing or editing a documentation page. It covers the anatomy of a page --- frontmatter, headings, formatting, prose style, attribution, and links --- so a first contribution matches the rest of the site without a second editing pass. For the build-and-preview workflow that turns markdown into HTML, see [Building and Deployment](Building); for the stable URL contract a page's `permalink` must honour, see [Permanent Links](Permanent-Links).

The surest guide is an existing page of the same kind. Open the nearest neighbour to what you are writing --- a sibling in the same sidebar folder --- and match its shape. The rules below are the conventions those pages already follow. Two worked reference pages to imitate: [`Const.md`](https://github.com/twinbasic/documentation/blob/main/docs/Reference/Core/Const.md) and [`Dim.md`](https://github.com/twinbasic/documentation/blob/main/docs/Reference/Core/Dim.md).

* TOC goes here
{:toc}

## Where content lives

The documentation is grouped by area, each a folder under `docs/`:

- **Reference** --- the language and library reference: core keywords and statements, plus one page per runtime symbol grouped by package, module, and class. The bulk of the site.
- **Tutorials** --- step-by-step guides that build something end to end.
- **Features** --- articles on individual twinBASIC language features.
- **IDE** --- the IDE user guide.
- **Documentation** --- this section: the toolchain reference and the authoring guide you are reading now.

Where a page sits in the source tree matters less than its `permalink`, which fixes the page's URL independently of the folder the file lives in. Get the permalink right (next section) and the file can move without breaking a single link.

## Frontmatter and permalinks

Every page opens with a YAML frontmatter block. The keys that matter:

- **`title`** --- the page's name in the sidebar, breadcrumb, and search results.
- **`parent`** (and sometimes **`grand_parent`**) --- the title of the nav parent. The build aborts if this does not resolve to exactly one page, so a typo is caught at build time rather than silently dropping the page from the sidebar or attaching it under the wrong branch.
- **`permalink`** --- the page's stable URL, the contract the IDE help system and in-source `[Documentation(...)]` attribute links rely on. Reference pages follow a fixed scheme by section: a core keyword is `/tB/Core/<Symbol>`, a library symbol is `/tB/Packages/<Package>/...`, and so on. [Permanent Links](Permanent-Links) documents the full scheme.
- **`nav_order`** --- optional integer that orders the page among its siblings in the sidebar.
- **`redirect_from`** --- optional. List any earlier URL the page has moved from, so existing links keep resolving.
- **`vba_attribution`** --- set to `true` only on pages adapted from the VBA-Docs source; see [Attribution](#attribution).

A minimal reference-page header:

```yaml
---
title: MyFunction
parent: Interaction Module
permalink: /tB/Modules/Interaction/MyFunction
vba_attribution: true
---
```

## Page skeleton

A reference page follows a predictable shape: the title, a one-line summary, the syntax, the parameters, any remarks, then an example and the related links. The parameters use a definition list --- a term line, then a `:` line indented beneath it:

    # MyFunction
    {: .no_toc }

    One-line description of what the symbol does.

    Syntax: **MyFunction** ( *arg* )

    *arg*
    : *optional* --- what the argument means.

    Any remarks go here, in plain prose.

    ## Example

    This example does something useful.

    ```tb
    Dim result As Long
    result = MyFunction(42)
    ```

    ## See Also

    - [OtherSymbol](OtherSymbol) function

## Heading levels

The page title is a single `#` (a *chapter* --- a page may legitimately have more than one). Top-level sections such as **Example** and **See Also** are `##`; subsections are `###`.

Do **not** jump from `#` straight to `###`. That old "house style" --- an h1 followed directly by an h3 --- is a heading-order defect on the built site, where headings must not skip a level. Older pages that still do it are repaired automatically at build time by the `headingLevelNormalizePlugin` (it raises an orphaned `h3` up to `h2`), but new content must use the correct levels from the start. See [Extending the Builder](Extending) for where that plugin sits in the render stage.

## Formatting conventions

- **Bold** (`**...**`) for keywords and literal tokens the reader would type verbatim; *italic* (`*...*`) for placeholders and argument names.
- twinBASIC code goes in a ` ```tb ` fenced block --- Shiki highlights it with the vendored twinBASIC grammar. `yaml` and `json` are the other highlighted fence languages; anything else falls back to unhighlighted plain text.
- Parameter lists use the definition-list pattern (a term line, then a `: definition` line beneath it), not a markdown table.
- For dashes, write `--` in the source (it renders as an en-dash) or `---` (an em-dash). Never paste a literal `–` or `—` --- the build's typographer converts the ASCII forms, and literal dash characters in source are rejected.

## Writing for an international audience

The audience is worldwide, and many readers do not have English as a first language. Reference and tutorial prose uses plain English.

The guiding principle: **remove metaphors borrowed from outside programming, but keep vocabulary that has a precise meaning inside Win32, COM, and event-driven programming.** A phrase a reader would have to look up in a tech blog does not belong in reference prose; a term with an exact technical meaning does.

A few of the most common substitutions:

| Instead of | Write |
|---|---|
| leverage, utilize | use |
| in order to | to |
| spin up, kick off | start |
| surface (as a verb) | expose, raise |
| wire up | connect |
| under the hood | internally |

Delete vague praise outright --- *powerful*, *robust*, *easily* --- and say something concrete instead. Terms with a specific technical meaning stay as they are: *no-op*, *round-trip*, *marshal*, *message pump*, *idiomatic*.

Beyond word choice: prefer the active voice and the present tense (`returns`, not `will return`), keep one idea per sentence, and write the reference body in the third person (*the constant*, *the source*) rather than addressing the reader as *you*. *You* is fine in the lead-in to an example and throughout tutorials.

## Attribution

Some reference pages are adapted from Microsoft's VBA-Docs, which is licensed CC-BY-4.0. Those pages set `vba_attribution: true` in their frontmatter, which renders an extra attribution line in the site footer.

The rule is **per page, by provenance** --- not by package. A symbol merely existing in VBA is not enough: the page must actually have been derived, verbatim or paraphrased, from a specific VBA-Docs source page. Pages written independently, and twinBASIC-original symbols, omit the flag even when a same-named symbol exists in VBA.

## Callouts

Three severities, used distinctly:

- `> [!NOTE]` --- twinBASIC-versus-VBA deviations, behaviour clarifications, and useful caveats.
- `> [!IMPORTANT]` --- requirements that affect correctness, such as admin rights, threading constraints, or ordering.
- `> [!WARNING]` --- operations that can corrupt state or lose data.

Use one callout per concern, and reserve them for genuine notes --- plain "why this is useful" prose should stay a plain paragraph.

## Cross-section links

Relative links resolve against a page's **rendered URL** (its `permalink`), not its location in the source tree. A link to a sibling in the same URL folder is a bare name --- `[Dim](Dim)`; crossing into another folder climbs out with `../`. Always link to a page's canonical `permalink`, never to one of its `redirect_from` aliases.

When the right number of `../` steps is not obvious, copy a working link from a neighbouring page that already points where you want to go and change the final segment. That is faster and less error-prone than counting folders, and [`check.bat`](Building#checking-link-integrity) catches any link that resolves to nothing before it reaches the site.

## See also

- [Permanent Links](Permanent-Links) -- the stable `/tB/` URL scheme a `permalink` must follow.
- [Building and Deployment](Building) -- build, serve, and check a page locally before committing.
- [Tools and Scripts](Tools) -- the batch files and scripts behind the workflow.
- [Extending the Builder](Extending) -- add a markdown-it plugin or pipeline task when a page needs new behaviour.
