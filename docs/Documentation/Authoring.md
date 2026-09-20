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

## What may live in docs/

Anything under `docs/` that is not a page is copied into the published site
unchanged, at a URL matching its path. That is how images, fonts and stylesheets
get published, and it used to be how a stray file got published too --- a `.bak`
left beside a page, a `.twin` sample, a scratch `.md`, a `Thumbs.db` the shell
wrote without being asked. All of them went to a public URL on a green build.

The build now refuses anything that is not a publishable type, names the file,
and stops before writing:

```
1 file would be published from docs but is not a publishable type:
  Reference/NOTES.md
      from docs\Reference\NOTES.md
      markdown with no frontmatter block -- it would be served as raw
      markdown (the opening `---` must be the first line)
```

The types a source file may use: `.html`, `.png`, `.jpg`, `.jpeg`, `.gif`,
`.svg`, `.woff2`, `.css`, `.js`, `.txt`, and `CNAME` at the site root. Pages
(`.md` with frontmatter) are rendered rather than copied, so they are not
affected.

Three things follow.

**A file you do not want published does not belong under `docs/`,** unless a
pattern in `_config.yml`'s `exclude:` already covers it. Source that sits beside
the pages it produces is excluded that way, at any depth in the tree: `.scss`
stylesheets, `.dot` diagram sources, and the Affinity `.af` screenshot sources
under `_Images/`. So is everything underscore-prefixed at the root of `docs/`
--- `_config.yml` and `_book.yml`, the `_sass/` stylesheet tree, and the build's
own output trees (`_site/`, `_site-offline/`, `_serve/`, `_pdf/` and their
variants). Scratch notes, editor backups and working documents have no such
exemption --- keep them outside the tree.

That root-level underscore rule is two patterns --- `_*` for the root's own
files, `_*/**` for the contents of its folders --- and where it stops matters to
anyone documenting a COM interface. Both are matched against a
file's path relative to `docs/` under fast-glob semantics, where `*` does not
cross a directory separator, so `_*/**` reaches into a folder only when the
underscore sits at the top level. A `docs/_Config/` is therefore dropped, and
every page in it disappears without a message: excluded files are not missing
files, and the build cannot report on a page it never saw. A
`docs/Reference/Built-In/SomePackage/_Config/` is untouched, and so is an
underscore-prefixed *page* at any depth, such as
`Reference/Built-In/CustomControls/Framework/_CustomControlContext.md`.

The rule is scoped that narrowly because a wider one did real damage. It was
once `**/_*/**`, which matches an underscore folder anywhere in the tree, and it
swallowed all 37 pages under
`Reference/Built-In/AppGlobalClassObject/_App/` --- the twinBASIC interface is
named `_App`, following the COM convention for a hidden interface, and the
folder is named after the interface. Nothing reported the loss. An interface or
class whose name begins with an underscore is documented exactly like any other,
wherever it sits in the tree; the one placement to avoid is an underscore-named
folder directly under `docs/`.

**A `.md` the build reports as unpublishable is a file with no frontmatter block
at all.** Either it genuinely has none --- a scratch note, a README --- or
something precedes the opening `---`, which has to be the first line. A blank
line before it is enough. A file in that state is not a broken page: without the
refusal it would be copied out and served as raw markdown, frontmatter keys and
all, which is how one package index page was published for months.

Two neighbouring faults are *not* this, and knowing which you have saves a
search:

- **A UTF-8 BOM is handled.** Windows editors add one without asking, and it
  used to be exactly this failure --- it sits in front of the `---` and the
  parser then reports no frontmatter. The build strips it before parsing, so a
  BOM'd page renders normally and never reaches this message.
- **Malformed YAML inside the block reports itself.** It does not fall through
  to this check; it aborts with `Failed to parse frontmatter in <file>` and the
  parser's own line and column.

**If a file genuinely belongs on the published site,** there are two ways to
allow it, and picking the wrong one quietly undoes the allowlist. The question is
whether you are adding a *type* or a *file*.

A **type** is an extension the site will go on using --- a new image format, a new
font format --- where the next file of that kind should publish without anyone
having to think about it. Add the extension to `SOURCE_EXTENSIONS` in
[`builder/publish-policy.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/publish-policy.mjs)
in the same commit as the file. That is a deliberate one-line edit, and it is the
point of the rule: the decision gets made once, by the person who knows they are
making it.

A **file** is one particular download or sample whose extension you would not
want blessed everywhere --- a `.py` script, a `.json` data file, a `.zip`.
Declare it in `_config.yml`'s `bundle_extra`, which spells out a source and a
published path and exempts that exact path rather than the extension:

```yaml
bundle_extra:
  - src: ../scripts/impexp.py
    dest: Features/Packages/downloads/impexp.py
```

`src` is resolved against `docs/`, so it may point outside the tree --- the two
real entries publish the [Import/Export Tool](../../Features/Packages/Import-Export-Tool)
from `scripts/`, where it is maintained and run, instead of requiring a second
copy under `docs/` that would drift from it. `dest` is the path in the built
site, and it is what the page links to. A `src` that does not exist aborts the
build, so a typo there is not silent either.

Between the two, **prefer `bundle_extra` unless you really are adding a type.**
Widening `SOURCE_EXTENSIONS` to `.json` so that one download can ship makes every
stray `.json` under `docs/` publishable again --- a `docs/secrets.json` would
reach a public URL, which is the whole class of accident the allowlist exists to
refuse, reintroduced by the person fixing a build failure.
`scripts/check_publish_policy.mjs` asserts that a `bundle_extra` exemption stays
pinned to its declared path and never leaks to the extension.

The other half of this --- how the refusal is enforced --- is on the build page.
[What the build refuses to publish](Building#what-the-build-refuses-to-publish)
covers the two inventories the policy sweeps (the source files on disk, before
anything is written, and what each output tree is about to receive), why a
finding there aborts the build outright where a broken link only sets an exit
code, and how that self-test proves the allowlist can still refuse something
rather than having been widened until it refuses nothing.

## Frontmatter and permalinks

Every page opens with a YAML frontmatter block. The keys that matter:

- **`title`** --- the page's name in the sidebar, breadcrumb, and search results.
- **`parent`** (and sometimes **`grand_parent`**) --- the title of the nav parent. The build aborts if this does not resolve to exactly one page, so a typo is caught at build time rather than silently dropping the page from the sidebar or attaching it under the wrong branch.
- **`permalink`** --- **required on every page.** The page's stable URL, and the contract the IDE help system and in-source `[Documentation(...)]` attribute links rely on. The build aborts if it is missing rather than deriving one from the file path: this tree deliberately does not mirror its URLs (`Reference/Built-In/CEF/` publishes at `/tB/Packages/CEF/`), so a derived URL would be wrong, and wrong silently. Reference pages follow a fixed scheme by section: a core keyword is `/tB/Core/<Symbol>`, a library symbol is `/tB/Packages/<Package>/...`, and so on. [Permanent Links](Permanent-Links) documents the full scheme.
- **`nav_order`** --- optional integer that orders the page among its siblings in the sidebar.
- **`redirect_from`** --- optional. List any earlier URL the page has moved from, so existing links keep resolving. Each entry becomes a small stub page at that URL, so two rules apply and the build aborts naming both files if either is broken: a `redirect_from` entry may not point at a URL some page already publishes at, and no two pages may claim the same one.
- **`vba_attribution`** --- set to `true` only on pages adapted from the VBA-Docs source; see [Attribution](#attribution).
- **`nav_exclude`**, **`sitemap: false`**, **`search_exclude: true`** --- optional opt-outs, each from exactly one thing: the sidebar, `sitemap.xml`, and the search index. They are independent; a page that should be unlisted everywhere sets all three. The build's own link check honours the last two, so a page that opts out is not then reported as missing from the index it opted out of.

A package's `index.md` may also carry **`indexed_from`**, **`exclude_from_docs`** and **`exclude_kinds`**. Those are provenance for the authoring pass, not build input: they record which twinBASIC build the package download was indexed against, and what was deliberately left undocumented, so a later re-index can tell a genuine gap from a deliberate omission. The build ignores them and they never reach the HTML. **Leave them in place**, and bump `indexed_from` in the same commit if you re-index a package against a newer build.

Any key the build does not recognise is simply inert --- nothing iterates frontmatter generically, so an unknown key is never emitted into the page. A key whose *value* is not valid YAML is a different matter: the build aborts with `Failed to parse frontmatter in <file>`, quoting the YAML parser's own line and column.

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

Do **not** jump from `#` straight to `###`. That old "house style" --- an h1 followed directly by an h3 --- is a heading-order defect on the built site, where headings must not skip a level. Older pages that still do it are repaired at build time by the `headingLevelNormalizePlugin`, but new content must use the correct levels from the start. See [Extending the Builder](Extending) for where that plugin sits in the render stage.

The repair is a re-levelling of the whole page, not a patch to one heading. The plugin raises **every** heading of level 3 or deeper until each one sits exactly one level below the heading it belongs under, closing every gap in a single pass: `#` / `###` renders as h1 / h2, and `#` / `###` / `#####` renders as h1 / h2 / h3. Only the h1 chapters are left as they are, since a page may legitimately have several.

### Editing a page that still uses the old style

The repair is conditional, and the condition is easy to break without noticing. **The plugin runs only on a page that uses `#` and `###` and no `##` anywhere** --- a single `##` and it does not run at all. More than four hundred pages on this site are currently in that state, so on most of them, adding one `##` section disarms the normalizer for the whole page: every `###` that was already there stops being repaired and becomes a live heading-order defect, in the same edit that added a correctly-levelled section.

Nothing tells you. The build still succeeds --- heading order is not one of the things it checks --- and `check.bat`'s accessibility scan audits thirteen sample pages out of roughly 1,160, so unless you happened to edit one of those thirteen, the defect ships.

So when you add a section to a page whose headings start at `###`, pick one of these and finish it:

- **Leave the page in the old style** and write your new section as `###` too. The normalizer goes on repairing the whole page, your addition included. This is the smaller and safer edit, and the right one when you are adding a section to a page you are otherwise not touching.
- **Convert the page, in the same commit.** Renumber every heading so it sits one level below its parent --- which is what the normalizer was computing for you --- then add your section at the level it belongs. Done correctly the rendered HTML does not change at all, which is what makes the conversion safe to make on its own and easy to review: the diff is only `#` characters.

What you must not do is mix the two and leave it there.

## Renaming a heading without breaking its links

A heading's text is its anchor. Nothing in the source declares the `id` --- `headerIdPlugin` derives it from the words, by lowercasing them, dropping every character that is not a letter, digit, hyphen or space, and turning each remaining space into a hyphen. `## Heading levels` becomes `id="heading-levels"`, and `#heading-levels` is what every link into that section uses. Reword the heading and the id changes with it. The old link does not fail visibly: a fragment that matches no element leaves the reader at the top of the page --- the right page, no error --- with nothing to say the section they asked for was ever there.

Two details of the slug surprise people. Runs of hyphens are not collapsed and the ends are not trimmed, so `## AppObject  (optional Bool)` --- two spaces, a parenthesised type --- produces `appobject--optional-bool`, not `appobject-optional-bool`. And repeated heading text is disambiguated by position: the first keeps the bare slug, the second gets `-1` appended, the third `-2`. Adding a second `## Example` *above* an existing one renames the existing one's anchor without touching a character of its text.

**Pin the id when the wording might change, or when anything outside the page links to it.** Write the attribute on the line directly below the heading, as `Reference/Attributes.md` does for all 55 of its attribute headings:

    ## AppObject  (optional Bool)
    {: #appobject }

`headerIdPlugin` skips a heading that already carries an `id`, so the pinned value wins and the heading can then be reworded freely. Two things about the syntax are load-bearing. The delimiters are `{:` and `}`, not the bare braces the upstream plugin defaults to. And the blank line decides the direction: an attribute list on the line *immediately* after a block attaches backward to that block, while one separated by a blank line attaches forward to the next one. Leave a blank line in and the id silently lands on the following paragraph.

The same attribute works inline, attached to a span instead of a block, and that is where most of its use is --- `| **vbPRCMColor**{: #vbPRCMColor } | 2 | ...` gives one enumeration member in a table its own anchor. Across `docs/` 1,342 attribute lists set an id, in 179 files. Only 159 stand alone on a line of their own, 146 of them pinning a heading; the other 1,183 are inline.

**`redirect_from` cannot rescue a renamed anchor,** and it is the first thing most people reach for. It emits a whole-page stub --- one destination URL written four times, as the canonical link, a `location=` assignment, a meta refresh and a visible fallback link --- and nothing in it maps one fragment to another. It moves a page. It cannot move a section.

To find what a rename would break, start with `grep -rn "#old-anchor" docs`, then let the build settle it. `build.bat` resolves every fragment in the tree against the ids that actually reached the HTML and reports `fragment #old-anchor not found` for each link that misses. It is the oracle rather than grep because almost every id is generated: it exists in the built page and in no source file, so there is nothing for grep to match on the receiving end.

That check sees only links made from inside this repository, and the `/tB/` anchors have a consumer outside it. [Permanent Links](Permanent-Links) enumerates 56 `#<attribute>` anchors on `/tB/Core/Attributes` --- the URLs the IDE help system and in-source `[Documentation(...)]` references resolve against. They are covered by the build's check only because that page links to each one. An anchor nothing in the repository links to is invisible here, and two of `Attributes.md`'s pinned ids are in exactly that position: `#customcontrol` and `#specialcompilerbinding` are listed nowhere. Three of the 56 are more fragile still. `#classinterface`, `#dispinterface` and `#dualinterface` carry no pinned id at all, and resolve only because those three headings happen to be a single bare word where their 55 neighbours carry a parenthesised type. Appending a type to one of them, to match the others, would break the published URL for it.

## Formatting conventions

- **Bold** (`**...**`) for keywords and literal tokens the reader would type verbatim; *italic* (`*...*`) for placeholders and argument names.
- twinBASIC code goes in a ` ```tb ` fenced block --- Shiki highlights it with the vendored twinBASIC grammar, and `twinbasic`, `vb` and `vba` select the same grammar. The other highlighted fence languages are `js`, `yaml`, `json`, `c`, `html`, `xml`, `sql` and `batch`. Anything else renders as unhighlighted plain text: the build does not fail, but it prints `highlight: unknown fence language "<name>"` naming the language and the list to add it to, so check the build output rather than the page.
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
![The Package Manager panel, with arrows pointing at the PUBLISH THIS PACKAGE button](Images/packPublishButton.png)
```

**The text in the square brackets is the image's alt text, and every image needs one.** Write what a reader who cannot see the picture would otherwise miss --- what the screenshot shows and which part of it the surrounding prose is pointing at --- rather than a label for the file. A caption-length phrase is usually right; the file name, the word *screenshot*, and the name of the button you happened to be looking for are not.

Nothing in the build will correct you, and it is worth knowing exactly why. The accessibility scan's `image-alt` rule asks only whether an accessible name *exists*, never whether it is the right one. `![image](…)` passes it. So does `![img](…)`. So does an empty `![](…)`, because an empty alt is the explicit signal that an image is decorative and a screen reader should skip it --- true of a spacer or a bullet glyph, never true of a screenshot. A green `check.bat` therefore says only that something is present in the brackets. Whether it describes the picture is a judgement no gate here makes, and the scan samples thirteen pages in any case, so most images are never looked at by it at all.

One habit to avoid in particular: copy the *shape* of a neighbouring page's image markdown, never its alt text. The example above used to read `![Create Package]`, and that one string travelled from it onto ten further images across the site --- a references dialog, a toolbox, a properties window, an animated GIF --- describing none of them, on pages that passed every check the project has. They have since been rewritten, but nothing except a reader would ever have found them.

Use the markdown form. A raw `<img>` tag with a page-relative `src` is **not** rewritten when the PDF book is assembled: the book flattens every page into a single document, so a path like `Images/x.png` that resolves correctly on the site resolves against the book root instead and the render aborts with `pdf: missing image`. The markdown form is rewritten to a section-qualified path and works in all three outputs.

**A finished page never *renders* an image from a remote URL.** Pasting a screenshot into a GitHub issue or pull request produces a `https://github.com/user-attachments/assets/...` link, and pasting that straight into a page is fine --- the build vendors it for you. The next local build downloads the file to `assets/attachments/gh-<uuid>.<ext>` and substitutes that path while rendering, so the published HTML, the offline mirror and the PDF all point at the local copy. Your markdown keeps the remote URL, which is why the downloaded file has to be committed along with your edit: it is the only copy the site has. Any *other* remote host has no such handling --- download it yourself, commit it under the section's `Images/` folder, and reference that path in the page.

There are three reasons, in increasing order of severity:

- **Every page view pays a network round trip.** A GitHub attachment URL answers with a redirect to S3, so a single image costs two requests --- up to about a second on a cold connection.
- **The offline mirror stops being self-contained.** `_site-offline/` is meant to be browsable from a `file://` URL with no network at all. A remote image renders as a broken placeholder there.
- **The PDF book fails to build.** The forked paged.js in `book/lib/` dropped support for loading images asynchronously, so an image that has not finished downloading by the time the page-breaking pass runs raises an error and aborts the whole render. A remote image makes `book.bat` depend on a reachable third-party host; when that host is slow, blocked, or has expired the asset, the build does not degrade to a missing picture --- it stops.

[`build.bat`](Building#checking-link-integrity) enforces this. A remote `<img>` --- `http://`, `https://`, or protocol-relative `//host/...` --- is reported as `remote-asset:` and fails the run.

### Videos

Link the video and mark it `.video`:

```markdown
[twinBASIC - Introduction](https://www.youtube.com/watch?v=havi3Dv4saY){: .video }
```

The build renders that as a poster frame with a play button, linking out to the video page. The link text becomes the image's accessible name, so write the real title.

The poster frame is downloaded once to `assets/thumbnails/yt-<video-id>.jpg` and committed; the build never re-fetches a thumbnail it already has. Do **not** hotlink `img.youtube.com` --- that reintroduces the third-party request, and [`build.bat`](Building#checking-link-integrity) fails the run for it, exactly as it does for any other remote `<img>`.

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
| bites (figurative) | affects, matters |

Delete vague praise outright --- *powerful*, *robust*, *easily* --- and say something concrete instead. Terms with a specific technical meaning stay as they are: *no-op*, *round-trip*, *marshal*, *message pump*, *idiomatic*.

Beyond word choice: prefer the active voice and the present tense (`returns`, not `will return`), keep one idea per sentence, and write the reference body in the third person (*the constant*, *the source*) rather than addressing the reader as *you*. *You* is fine in the lead-in to an example and throughout tutorials.

**Name the fault directly; never build up to it.** Setting up a contrast and then withholding the point is coy, and it makes the reader parse the sentence twice to get one fact out of it. Write *double-clicking it is obvious, and wrong* --- not *double-clicking it is the obvious shortcut, and it is the one that misleads*. Say what the thing is and what it does, in that order, in one clause. The same applies to *and that is the one that...*, *which is the one thing that...*, *which is precisely the...* and *therein lies the...*.

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

## Listing a new page

A new page reaches the sidebar on its own --- the nav tree is generated from `parent`. The site's hand-written indexes are not generated, and a page missing from them is reachable only by search and by whatever happens to link to it.

**Nothing catches the omission.** The link check verifies that the links a page *makes* resolve; it has no opinion about whether anything links *to* it, and an unlisted page is a perfectly valid page. So the entry has to go in deliberately, in the same commit as the page, or it does not go in at all.

The indexes to join depend on what the page documents:

- **A core statement or keyword** (a page under `docs/Reference/Core/`) is listed in three places: [Statements](../../Reference/Statements), as one alphabetical bullet with a short description; [Categories](../../Reference/Categories), under the heading matching what it does; and [Permanent Links](Permanent-Links), whose `/tB/Core/` section enumerates core pages individually because that list is the URL contract the IDE help system relies on.
- **An operator** goes in [Operators](../../Reference/Operators) rather than Statements, grouped by kind. The other two still apply.
- **A twinBASIC addition** --- a symbol or construct standard VBA does not have --- is additionally listed in [twinBASIC Additions](../../Reference/twinBASIC-Additions), under the category it belongs to. A page for a symbol VBA already has does not belong there.
- **A runtime procedure, function, or property** is listed in [Procedures and Functions](../../Reference/Procedures-and-Functions) under its initial letter, and introduced in the prose of its own module's `index.md`. Those module pages present their members in themed groups rather than as a flat list, so add the link to the paragraph it fits rather than to the end. [Permanent Links](Permanent-Links) lists the modules, not their members, so it needs no edit.
- **A class, control, or enumeration inside a package** is introduced on that package's `index.md`. A control in the VB package is additionally listed in [Controls](../../tB/Controls), under the group matching its purpose.
- **An enumeration** is listed in [Enumerations](../../Reference/Enumerations) **twice** --- once in the by-package section and once in the alphabetical index below it --- and moves the enumeration total stated on the [Reference Section](../../Reference) landing page.
- **A whole new package** needs a bullet on [Default Packages](../../tB/Packages/Default/) or [Built-In Packages](../../tB/Packages/Built-In/), and moves the package counts written into the prose of [Packages](../../tB/Packages/) and the [Reference Section](../../Reference) landing page.

Every one of these entries is a link plus a one-line description in the style of its neighbours, so the reliable way to write one is to copy the entry above the position you are inserting at and replace its contents.

## See also

- [Permanent Links](Permanent-Links) -- the stable `/tB/` URL scheme a `permalink` must follow.
- [Building and Deployment](Building) -- build, serve, and check a page locally before committing.
- [Tools and Scripts](Tools) -- the batch files and scripts behind the workflow.
- [Extending the Builder](Extending) -- add a markdown-it plugin or pipeline task when a page needs new behaviour.
