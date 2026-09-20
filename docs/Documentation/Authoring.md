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
- **`nav_exclude`**, **`sitemap: false`**, **`search_exclude: true`** --- optional opt-outs, each from exactly one thing: the sidebar, `sitemap.xml`, and the search index. They are independent; a page that should be unlisted everywhere sets all three. The build's own link check honours the last two, so a page that opts out is not then reported as missing from the index it opted out of.

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
- For dashes, write `--` in the source (it renders as an en-dash) or `---` (an em-dash). Never paste a literal `–` or `—`. Nothing in the build rejects one: the typographer converts the ASCII forms and passes a literal character straight through, so a stray dash ships silently and only the source becomes inconsistent. `scripts/convert_em_dash_separators.py` is the normaliser, and it is run by hand.

### Typography

The site ships its own fonts, so a page renders the same on every platform: **Inter** for text, **Cascadia Mono** for code, and **Source Serif 4** for body text in the PDF book. Nothing is needed from you to use them --- they apply automatically --- but two things follow from it.

**Characters outside the shipped subsets fall back to a system font**, which is visible as a glyph in the wrong face. The subsets cover Latin (including Latin Extended-A and -B), Greek, punctuation, arrows, mathematical operators, currency, fractions, geometric shapes, dingbats, and --- for code --- box drawing. Emoji are deliberately excluded and come from the platform's own emoji font. Two specifics worth knowing: write the check mark as **U+2713** (✓), not **U+2714** (✔), which no text face in the stack carries; and prefer `:` over **U+22EE** (⋮) inside a monospaced ASCII diagram, where a fallback glyph of a different width shears the box borders.

Those two example glyphs are, deliberately, the only characters on the whole site that fall back --- so the ✔ and ⋮ above are being drawn by your system's symbol font right now, next to text that is not. That difference in weight and shape is the effect this section is about.

Diagram exports carry the font with them. The Download / Copy SVG and PNG buttons above each diagram embed the typeface into the exported file, because an exported SVG has no access to the site's stylesheet and would otherwise render in whatever the viewer has installed. All four buttons work on every diagram.

**Do not hand-edit a diagram's `.svg`.** It is a build artifact: the `.dot` beside it is the source, and the next build overwrites your edit. Changing the face is the edit that looks most harmless and is not --- Graphviz sizes each box to the text it measured, so a diagram whose labels are painted in a font the layout never saw has text hanging outside its boxes. `check.bat` fails on that; see [Diagrams](#diagrams) below.

## Diagrams

A diagram is a Graphviz `.dot` file. Put it where it belongs: `docs/assets/images/dot/` if more than one page uses it, or in the `Images/` folder beside the page if only one does. The build renders an `.svg` next to it, inlines that into the page, and gives it the zoom and export controls. Both files belong in git.

```
docs/Tutorials/CEF/Images/MonacoArchitecture.dot     <-- you write this
docs/Tutorials/CEF/Images/MonacoArchitecture.svg     <-- the build writes this
```

Name the font as the existing diagrams do --- copy the `node`, `edge` and `graph` blocks from one of them --- and let the build measure it. You do not need to do anything special for Inter: `builder/dot-metrics.mjs` installs its real widths into Graphviz before layout, and `check.bat` asserts afterwards that nothing overflowed.

Two things to leave alone. Node text is deliberately dark against each node's light fill in both themes; only the cluster and edge labels follow the page's text colour, because those are the ones sitting on the page background. And a diagram needs alt text like any other image --- the whole diagram gets one accessible name, so describe what it shows, not what shapes it contains.

## Images

Images live in an `Images/` folder beside the page that uses them, and are referenced by a relative path:

```markdown
![Create Package](Images/packPublishButton.png)
```

Use the markdown form. A raw `<img>` tag with a page-relative `src` is **not** rewritten when the PDF book is assembled: the book flattens every page into a single document, so a path like `Images/x.png` that resolves correctly on the site resolves against the book root instead and the render aborts with `pdf: missing image`. The markdown form is rewritten to a section-qualified path and works in all three outputs.

**A finished page never references an image by a remote URL.** Pasting a screenshot into a GitHub issue or pull request produces a `https://github.com/user-attachments/assets/...` link, and pasting that straight into a page is fine --- the build vendors it for you. The next local build downloads the file to `assets/attachments/gh-<uuid>.<ext>` and rewrites the page to point there; commit the downloaded file along with your edit. Any *other* remote host has no such handling: download it yourself and commit it under the section's `Images/` folder.

There are three reasons, in increasing order of severity:

- **Every page view pays a network round trip.** A GitHub attachment URL answers with a redirect to S3, so a single image costs two requests --- up to about a second on a cold connection.
- **The offline mirror stops being self-contained.** `_site-offline/` is meant to be browsable from a `file://` URL with no network at all. A remote image renders as a broken placeholder there.
- **The PDF book fails to build.** This is the one that actually bites. The forked paged.js in `book/lib/` dropped support for loading images asynchronously, so an image that has not finished downloading by the time the page-breaking pass runs raises an error and aborts the whole render. A remote image makes `book.bat` depend on a reachable third-party host; when that host is slow, blocked, or has expired the asset, the build does not degrade to a missing picture --- it stops.

[`build.bat`](Building#checking-link-integrity) enforces this. A remote `<img>` --- `http://`, `https://`, or protocol-relative `//host/...` --- is reported as `remote-asset:` and fails the run.

### Videos

Link the video and mark it `.video`:

```markdown
[twinBASIC - Introduction](https://www.youtube.com/watch?v=havi3Dv4saY){: .video }
```

The build renders that as a poster frame with a play button, linking out to the video page. The link text becomes the image's accessible name, so write the real title.

The poster frame is downloaded once to `assets/thumbnails/yt-<video-id>.jpg` and committed; the build never re-fetches a thumbnail it already has. Do **not** hotlink `img.youtube.com` --- that reintroduces the third-party request, and `check.bat` fails the build for it.

This is why the pages do not embed YouTube players. An `<iframe>` embed loads Google's player as soon as the page is viewed, contacting Google and setting third-party cookies before the reader has done anything. A local thumbnail contacts nobody until the reader clicks, at which point they are on youtube.com and it is Google's own relationship with them. With no embeds anywhere, the site makes no third-party requests at all.

### Committing downloaded assets

Both cases above download into the source tree on a **local** build, and both expect the result to be committed. That is deliberate: CI never downloads anything. If an asset is referenced but not committed, the CI build fails rather than quietly fetching it --- otherwise a forgotten file would produce a green build while the published site went on hotlinking a third party.

So when you add a video or paste a screenshot: build locally once, then commit the new file under `docs/assets/thumbnails/` or `docs/assets/attachments/` together with your page edit. `git status` after a build shows you exactly what to add.

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

When the right number of `../` steps is not obvious, copy a working link from a neighbouring page that already points where you want to go and change the final segment. That is faster and less error-prone than counting folders, and [`build.bat`](Building#checking-link-integrity) catches any link that resolves to nothing before it reaches the site.

## See also

- [Permanent Links](Permanent-Links) -- the stable `/tB/` URL scheme a `permalink` must follow.
- [Building and Deployment](Building) -- build, serve, and check a page locally before committing.
- [Tools and Scripts](Tools) -- the batch files and scripts behind the workflow.
- [Extending the Builder](Extending) -- add a markdown-it plugin or pipeline task when a page needs new behaviour.
