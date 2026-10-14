---
title: Authoring Pages
parent: Documentation Development
nav_order: 2
permalink: /Documentation/Development/Authoring
---

# Authoring Pages
{: .no_toc }

The starting point for writing or editing a documentation page: frontmatter, headings, formatting, prose style, attribution and links. To build and preview, see [Building and Deployment](Building). For the URL contract a page's `permalink` must honour, see [Permanent Links](Permanent-Links).

The best guide is an existing page of the same kind. Open a sibling in the same sidebar folder and match its shape. Two worked reference pages to imitate: [`Const.md`](https://github.com/twinbasic/documentation/blob/main/docs/Reference/Core/Const.md) and [`Dim.md`](https://github.com/twinbasic/documentation/blob/main/docs/Reference/Core/Dim.md).

* TOC goes here
{:toc}

## Where content lives

The documentation is grouped by area, each a folder under `docs/`:

- **Reference** --- the language and library reference: core keywords and statements, plus one page per runtime symbol grouped by package, module, and class. The bulk of the site.
- **Tutorials** --- step-by-step guides that build something end to end.
- **Features** --- articles on individual twinBASIC language features.
- **LLVM** --- compiling with the LLVM back end: turning it on, its options, and its current limitations.
- **IDE** --- the IDE user guide.
- **Documentation** --- this section: the toolchain reference and this authoring guide.

A page's `permalink` fixes its URL independently of the folder the file lives in. With the right permalink (next section) the file can move without breaking a link.

## What may live in docs/

Anything under `docs/` that is not a page is copied into the published site
unchanged, at a URL matching its path. That is how images, fonts and stylesheets
get published. The build refuses anything that is not a publishable type (a
`.bak` beside a page, a `.twin` sample, a scratch `.md`, a `Thumbs.db`), names
the file, and stops before writing:

```
1 file would be published from docs but is not a publishable type:
  Reference/NOTES.md
      from docs\Reference\NOTES.md
      markdown with no frontmatter block -- it would be served as raw
      markdown (the opening `---` must be the first line)
```

The types a source file may use: `.html`, `.png`, `.jpg`, `.jpeg`, `.gif`,
`.svg`, `.woff2`, `.css`, `.js`, `.txt`, and `CNAME` at the site root. Pages
(`.md` with frontmatter) are rendered rather than copied.

**A file you do not want published does not belong under `docs/`,** unless a
pattern in `_config.yml`'s `exclude:` covers it. These are excluded at any depth:
`.scss` stylesheets, `.dot` diagram sources, and the Affinity `.af` screenshot
sources under `_Images/`. So is everything underscore-prefixed at the root of
`docs/` --- `_config.yml` and `_book.yml`, the `_sass/` tree, and the build's
output trees (`_site/`, `_site-offline/`, `_serve/`, `_pdf/` and their
variants). Keep scratch notes, editor backups and working documents outside the
tree.

The root-level underscore rule is two patterns --- `_*` for the root's own
files, `_*/**` for the contents of its folders. `*` does not cross a directory
separator, so `_*/**` reaches into a folder only when the underscore sits at the
top level. A `docs/_Config/` is therefore dropped, and every page in it
disappears without a message. A `docs/Reference/Built-In/SomePackage/_Config/`
is untouched, and so is an underscore-prefixed *page* at any depth, such as
`Reference/Built-In/CustomControls/Framework/_CustomControlContext.md`.

The rule is narrow because a wider one, `**/_*/**`, once swallowed all 37 pages
under `Reference/Built-In/AppGlobalClassObject/_App/` (the interface is named
`_App`, following the COM convention for a hidden interface). Document an
interface or class whose name begins with an underscore like any other; avoid
only an underscore-named folder directly under `docs/`.

**A `.md` the build reports as unpublishable has no frontmatter block.** Either
it has none --- a scratch note, a README --- or something precedes the opening
`---`, which must be the first line. A blank line before it is enough. Without
the refusal, the file would be served as raw markdown, frontmatter keys and all.

Two neighbouring faults are *not* this:

- **A UTF-8 BOM is handled.** Windows editors add one without asking. The build
  strips it before parsing, so a BOM'd page renders normally.
- **Malformed YAML inside the block reports itself.** The build aborts with
  `Failed to parse frontmatter in <file>` and the parser's own line and column.

**If a file belongs on the published site,** there are two ways to allow it, and
the wrong one quietly undoes the allowlist. Decide whether you are adding a
*type* or a *file*.

A **type** is an extension the site will go on using --- a new image format, a new
font format --- so the next file of that kind publishes without further thought.
Add the extension to `SOURCE_EXTENSIONS` in
[`builder/publish-policy.mjs`](https://github.com/twinbasic/documentation/blob/main/builder/publish-policy.mjs)
in the same commit as the file.

A **file** is one particular download or sample whose extension you would not
want allowed everywhere --- a `.py` script, a `.json` data file, a `.zip`.
Declare it in `_config.yml`'s `bundle_extra`, which gives a source and a
published path and exempts that exact path rather than the extension:

```yaml
bundle_extra:
  - src: ../scripts/impexp.py
    dest: Features/Packages/downloads/impexp.py
```

`src` is resolved against `docs/`, so it may point outside the tree --- the real
entries publish the three editions of the [Import/Export Tool](../../Features/Packages/Import-Export-Tool)
from `scripts/`, where they are maintained, with no second copy under `docs/`.
`dest` is the path in the built site, and the page links to it. A `src` that
does not exist aborts the build.

**Prefer `bundle_extra` unless you are adding a type.** Widening
`SOURCE_EXTENSIONS` to `.json` for one download makes every stray `.json` under
`docs/` publishable again --- a `docs/secrets.json` would reach a public URL.
`scripts/check_publish_policy.mjs` asserts that a `bundle_extra` exemption stays
pinned to its declared path and never leaks to the extension.

How the refusal is enforced is in
[What the build refuses to publish](Building#what-the-build-refuses-to-publish).

## Frontmatter and permalinks

Every page opens with a YAML frontmatter block. The keys that matter:

- **`title`** --- the page's name in the sidebar, breadcrumb, and search results.
- **`parent`** (and sometimes **`grand_parent`**) --- the title of the nav parent. The build aborts if this does not resolve to exactly one page, so a typo cannot drop the page from the sidebar or attach it to the wrong branch.
- **`permalink`** --- **required on every page.** The page's stable URL, and the contract the IDE help system relies on. The build aborts if it is missing: this tree does not mirror its URLs (`Reference/Built-In/CEF/` publishes at `/tB/Packages/CEF/`), so a URL derived from the file path would be wrong. A core keyword is `/tB/Core/<Symbol>`, a library symbol is `/tB/Packages/<Package>/...`, and so on; [Permanent Links](Permanent-Links) documents the full scheme.
- **`nav_order`** --- optional integer that orders the page among its siblings in the sidebar.
- **`has_toc`** --- set to `false` to suppress the automatic list of child pages the template appends to a page that has any; see [Folder-style pages](#folder-style-pages-and-has_toc). Every page that sets it sets it to `false`.
- **`redirect_from`** --- optional. List any earlier URL the page has moved from, so existing links keep resolving. Each entry becomes a small stub page at that URL. The build aborts, naming both files, if an entry points at a URL some page already publishes at, or if two pages claim the same one.
- **`vba_attribution`** --- set to `true` only on pages adapted from the VBA-Docs source; see [Attribution](#attribution).
- **`nav_exclude`**, **`sitemap: false`**, **`search_exclude: true`** --- optional opt-outs from the sidebar, `sitemap.xml` and the search index. They are independent; a page that should be unlisted everywhere sets all three. The link check honours the last two, so an opted-out page is not reported as missing from the index.
- **`symbols`** --- optional, and rare. The names a page documents, when its title and first heading cannot say; see [Naming what a page documents](#symbols).
- **`index`**, **`index_also`** --- optional. Terms a reader searches for that should find this page, as a book's index lists them; see [Index entries for the site search](#index-entries-for-the-site-search).

A package's `index.md` may also have **`package_name`**, **`indexed_from`**, **`exclude_from_docs`** and **`exclude_kinds`**. They record which packages the section documents, which twinBASIC build the package download was indexed against and what was excluded from the docs, so a later re-index can tell a gap from an exclusion. `package_name` names the packages as the [package indexer](Tools-Build#twin-index) names them, and is needed only where the section's folder is named otherwise. The build uses `exclude_from_docs` only to leave those names out of the [symbol index](Building#the-symbol-index)'s count of undocumented symbols; none of the four reaches the HTML. **Leave them in place**, and bump `indexed_from` in the same commit if you re-index a package against a newer build.

An unrecognised key is inert and never emitted into the page. A key whose *value* is not valid YAML aborts the build with `Failed to parse frontmatter in <file>`, quoting the parser's own line and column.

A value that is valid YAML can still mean less than it shows. YAML reads a `#` after a space, and everything after it, as a comment, so `title: Input #` titles the page *Input*. The build warns about any unquoted value that ends in `#`, naming the file and line. Quote the value --- `title: "Input #"` --- to keep the `#`. Quoting also silences the warning where YAML would have kept the `#` anyway, as in `C#`.

A minimal reference-page header:

```yaml
---
title: MyFunction
parent: Interaction Module
permalink: /tB/Modules/Interaction/MyFunction
vba_attribution: true
---
```

## Folder-style pages and `has_toc`

A symbol that needs sub-pages is documented as a folder: `<Class>/index.md` for
the class itself, and one sibling `.md` beside it per sub-page. CEF's browser
control is the smallest complete example --- `Reference/Built-In/CEF/CefBrowser/`
holds `index.md` and `EnvironmentOptions.md`, and publishes at
`/tB/Packages/CEF/CefBrowser/` and `/tB/Packages/CEF/CefBrowser/EnvironmentOptions`.
{{tbdocs:folderStyleIndexes}} pages under `Reference/` are `index.md` files of
this shape, {{tbdocs:folderStyleSlashPermalinks}} of them declaring a permalink
that ends in a slash.

**The filename carries no meaning; the permalink decides the output.** `index.md`
is not special to the build, and the source folder is not the URL folder: that
CEF page lives at `Reference/Built-In/CEF/CefBrowser/` and publishes under
`/tB/Packages/CEF/`. One character decides the shape of the output:

    permalink: /tB/Packages/CEF/CefBrowser/     ->  tB/Packages/CEF/CefBrowser/index.html
    permalink: /tB/Packages/CEF/CefBrowser      ->  tB/Packages/CEF/CefBrowser.html

A trailing slash makes the page an `index.html` inside a folder of that name;
without one it is a file beside its siblings. Relative links resolve against the
rendered URL, and the trailing-slash form has one more URL segment, so every
`../` count on the page and every link written *to* it changes with the slash.
Pick the form first and do not change it afterwards.

The frontmatter follows the same nesting. The index declares `parent: <Package>
Package`; each sibling declares `parent: <Class>` and `grand_parent: <Package>
Package`, so the sidebar nests one level deeper. A sibling addresses its own index
as `[CefBrowser](.)`, and a section of it as `[Create](.#create)`.

**Set `has_toc: false` on every page in the group.** It suppresses the automatic
"Table of contents" heading and list of child pages that the template otherwise
appends to a parent page. On a reference index that list repeats the members the
page already introduces, so every one of the 238 pages that sets the key sets it
to `false`. The `AppGlobalClassObject` package is the example to copy --- its
`index.md` and all 37 pages under `_App/` carry it.

`has_toc` is unrelated to the in-page table of contents, which is the
`* TOC goes here` / `{:toc}` marker, and to `{: .no_toc }` on the page title,
which keeps the title out of that list. A page can use all three, and most
reference index pages do.

## Page skeleton

A reference page has the title, a one-line summary, the syntax, the parameters, any remarks, then an example and the related links. Parameters use a definition list --- a term line, then a `:` line beneath it:

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

The page title is a single `#` (a *chapter*; a page may have more than one). Top-level sections such as **Example** and **See Also** are `##`; subsections are `###`.

Do **not** jump from `#` straight to `###`. An h1 followed directly by an h3 is a heading-order defect on the built site, where headings must not skip a level. The `headingLevelNormalizePlugin` repairs older pages that still do it at build time, but new content must use the correct levels. See [Extending the Builder](Extending) for where that plugin sits in the render stage.

The repair re-levels the whole page. The plugin raises **every** heading of level 3 or deeper until each sits exactly one level below its parent: `#` / `###` renders as h1 / h2, and `#` / `###` / `#####` renders as h1 / h2 / h3. Only the h1 chapters are left as they are.

**Only `#`, `##` and `###` headings get an entry of their own in the site search.** The search index cuts each page at its h1, h2 and h3 headings and gives each piece one entry, titled with its heading. A `####` or deeper heading gets no entry: its text joins the nearest heading above it. So does a heading with a generic name, such as **Example** or **See Also**, at any level. The list is `search.fold_headings` in `docs/_config.yml`. The index is built from the rendered page, so it sees the levels after the repair.

### Editing a page that still uses the old style

**The plugin runs only on a page that uses `#` and `###` and no `##` anywhere.** More than four hundred pages are in that state. Adding one `##` section to such a page disarms the normalizer: every `###` already there stops being repaired and becomes a heading-order defect, in the same edit that added a correctly-levelled section.

Nothing warns you. The build succeeds, because it does not check heading order, and `check.bat`'s accessibility scan audits fourteen sample pages out of roughly 1,160.

When you add a section to a page whose headings start at `###`, pick one of these and finish it:

- **Leave the page in the old style** and write your new section as `###` too. The normalizer keeps repairing the whole page. This is the smaller edit, and the right one when you are not otherwise touching the page.
- **Convert the page, in the same commit.** Renumber every heading so it sits one level below its parent, then add your section at the level it belongs. The rendered HTML does not change, so the diff is only `#` characters and easy to review.

Do not mix the two.

## Renaming a heading without breaking its links

A heading's text is its anchor. `headerIdPlugin` derives the `id` from the words: it lowercases them, drops every character that is not a letter, digit, hyphen or space, and turns each remaining space into a hyphen. `## Heading levels` becomes `id="heading-levels"`, and every link into that section uses `#heading-levels`. Reword the heading and the id changes with it. The old link fails silently: a fragment that matches no element leaves the reader at the top of the right page, with no error.

Two details of the slug surprise people. Runs of hyphens are not collapsed and the ends are not trimmed, so `## AppObject  (optional Bool)` --- two spaces, a parenthesised type --- produces `appobject--optional-bool`, not `appobject-optional-bool`. And repeated heading text is disambiguated by position: the first keeps the bare slug, the second gets `-1` appended, the third `-2`. Adding a second `## Example` *above* an existing one renames the existing one's anchor.

**Pin the id when the wording might change, or when anything outside the page links to it.** Write the attribute on the line directly below the heading, as `Reference/Attributes.md` does for all 55 of its attribute headings:

    ## AppObject  (optional Bool)
    {: #appobject }

`headerIdPlugin` skips a heading that already carries an `id`, so the heading can then be reworded freely. Two details of the syntax matter. The delimiters are `{:` and `}`, not bare braces. And a blank line changes the direction: an attribute list on the line *immediately* after a block attaches to that block, while one after a blank line attaches to the next block. Leave a blank line in and the id lands on the following paragraph.

The same attribute works inline, attached to a span --- `| **vbPRCMColor**{: #vbPRCMColor } | 2 | ...` gives one enumeration member in a table its own anchor. Across `docs/`, 1,342 attribute lists set an id, in 179 files. Only 159 stand alone on a line of their own, 146 of them pinning a heading; the other 1,183 are inline.

**`redirect_from` cannot rescue a renamed anchor.** It emits a whole-page stub (one destination URL written four times, as the canonical link, a `location=` assignment, a meta refresh and a visible fallback link) and nothing maps one fragment to another. It moves a page, not a section.

To find what a rename would break, run `grep -rn "#old-anchor" docs`, then let the build settle it. `build.bat` resolves every fragment in the tree against the ids that reached the HTML and reports `fragment #old-anchor not found` for each link that misses. Grep alone is not enough because almost every id is generated and exists in no source file.

That check sees only links made from inside this repository. The `/tB/` anchors have a consumer outside it: the IDE help add-in, through the [symbol index](Building#the-symbol-index). Every member heading on a reference page, and every attribute heading on `/tB/Core/Attributes`, is an entry in that index, and **a build that loses one of its URLs fails**, naming it. A reworded member heading is caught even if nothing in the site links to it. The fix is the one above: keep the new wording and pin the old id.

Every heading on the attributes page carries a pinned `{: #... }` id. Three once had none and resolved on the default slug alone, so appending a parenthesised type to one, to match its neighbours, would have broken it silently. Pin the id when you add the heading.

## Naming what a page documents
{: #symbols }

The [symbol index](Building#the-symbol-index) reads what a reference page documents from the page itself: its title, less a trailing word such as `Module` or `class`, and the comma-separated names of its first heading --- `# Left, LeftB` documents both. On a Core page the words of the title are the statement and its keywords: `Do...Loop` is the **Do** statement, and **Loop** is a keyword that leads to it.

A page whose title cannot name its subject lists the names in `symbols:`, which replaces those names:

```yaml
---
title: (Default) Module
parent: VBA Package
permalink: /tB/Modules/HiddenModule/
symbols: [_HiddenModule]
---
```

On a statement page the first name is the statement and the rest are its keywords; on an operator page each is an operator of its own --- the comparison operators page lists `["=", "<>", "<", "<=", ">", ">="]`, quoted, because a bare `>` is YAML syntax. Only two pages need it today. A page in a package folder that gives the index no entry at all is named after the build's summary.

## Index entries for the site search

The search finds a page by the words in it. That fails for a term the right page never uses: a reader searching for *conditional compilation* should land on the `#If` / `#Const` page, whose text never says those words. An index entry names such a term, as a book's index does, and a search for the whole term then finds that page first.

A page takes entries in its frontmatter, as one term or a list:

```yaml
---
title: '#If, #Const'
parent: Statements
permalink: /tB/Core/Topic-Preprocessor
index: conditional compilation
---
```

A section takes them on its heading, with terms separated by `;`, on the line directly below it as with a [pinned id](#renaming-a-heading-without-breaking-its-links):

    ## Object
    {: index="late binding" }

**`index`** is the main entry: the page a reader searching for the term wants first. **`index_also`** is a strong second answer that ranks right behind it --- `/Reference/Compiler-Constants` takes `index_also: conditional compilation`. A term has one main entry across the site; the build stops, naming every page that claims it, if two do. Any number of pages may take it as `index_also`.

A term matches a search that names all of it, alone or among other words: *late binding* and *late binding in VBA* find the entry, *binding* on its own does not. Capitals, hyphens and word endings do not matter. The entries never appear on the page. The build fails on `index` written on anything but a heading.

Mark a term only where the page's own words cannot find it, and name the page a reader wants for that term. Few entries are in use; before adding one, search for the term on a built site and see where it lands.

## Counts the build fills in
{: #counts }

A count written by hand goes stale without any gate noticing. Write the numbers
the build already knows as names:

    {{tbdocs:pages}} pages under `Reference/` are `index.md` files of this shape

renders as the current figure. The names are derived on every build:

| name | is |
|---|---|
| `pages` | every page `discover` found |
| `staticFiles` | everything else under `docs/`, copied verbatim |
| `referencePages` | pages under `Reference/` |
| `documentationPages` | pages under `Documentation/` |
| `folderStyleIndexes` | `Reference/` pages written as `<Name>/index.md` |
| `folderStyleSlashPermalinks` | of those, the ones whose permalink ends in a slash |
| `packages` | packages under `Reference/Default/` and `Reference/Built-In/` |
| `defaultPackages` | of those, the ones under `Reference/Default/` |
| `builtInPackages` | of those, the ones under `Reference/Built-In/` |
| `attributeAnchors` | pinned heading ids in `Reference/Attributes.md` |
| `enumerations` | entries in the alphabetical index of `Reference/Enumerations.md` |
| `redirectStubs` | whole-page stubs emitted for `redirect_from:` entries |

The package names are separate because the words for them collide. The
[welcome page](../../) heads a section *Built-in packages* and lists all
{{tbdocs:packages}} under it, while [Packages](../../tB/Packages/) reserves that
word for the {{tbdocs:builtInPackages}} a project references on demand. Both are
right, so a sentence meaning one of them should use the name for that set, not a
digit.

**A name is always derived from the build.** A number that cannot be derived
does not get a name; an assertion that needs a person to check it belongs in
prose.

Two consequences:

- **A misspelled name fails the build**, before any page renders, naming the
  file, the line and the nearest match.
- **Code needs no escaping.** A placeholder inside backticks or a fence is left
  alone. To *show* the syntax, put it in backticks. A placeholder inside a raw
  HTML block fails the build.

Numbers already written as words stay as words, because a substitution always
yields digits. [Callouts](#callouts) below opens *Three severities, used
distinctly* and keeps the word: it counts the three bullets beneath it, a fact
about that sentence, not about the site.

## Formatting conventions

- **Bold** (`**...**`) for keywords and literal tokens the reader would type verbatim; *italic* (`*...*`) for placeholders and argument names.
- twinBASIC code goes in a ` ```tb ` fenced block. Shiki highlights it with the vendored twinBASIC grammar; `twinbasic`, `vb` and `vba` select the same grammar. The other highlighted fence languages are `js`, `yaml`, `json`, `c`, `html`, `xml`, `sql` and `batch`. Anything else renders as plain text, and the build prints `highlight: unknown fence language "<name>"` without failing, so check the build output rather than the page.
- Parameter lists use the definition-list pattern (a term line, then a `: definition` line beneath it), not a markdown table.
- **An inline code span cannot start or end with a single space.** CommonMark removes one space from each end of a span whose content is not all spaces, so `` ` 1  2 ` `` renders as `1  2`. That matters when the padding *is* the value shown --- what `Debug.Print` emits into its 14-column print zones, a fixed-width return such as [Partition](../tB/Modules/Interaction/Partition)'s. Write two spaces at each end to get one, and confirm against the built HTML rather than the preview.
- **The IDE's own words** are written as the IDE spells them, in bold: **Project Explorer**, **Break On All Errors**. A menu path is bold with an arrow, **File → Export Project**. A key is written `<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>`: each key in mixed case and by name, with no spaces around the `+`. Arrows are `<kbd>Up</kbd>`, `<kbd>Down</kbd>`, `<kbd>Left</kbd>` and `<kbd>Right</kbd>`, never a glyph.
- For dashes, write `--` in the source (it renders as an en-dash) or `---` (an em-dash). Never paste a literal `–` or `—`. The build does not reject one, so a stray dash ships silently. `scripts/convert_em_dash_separators.mjs` is the normaliser, and it is run by hand.

### A code sample that holds a fence marker
{: #fence-in-fence }

A sample that builds a Markdown string has ` ``` ` inside it. The form of the
fence around the sample depends on where the marker sits.

**A marker in the middle of a line needs nothing special.** A fence closes only
on a line that is nothing but backticks, so an ordinary three-backtick fence
holds a sample whose markers are inside string literals. The
[`Description`](../../tB/Core/Attributes#description) entry on the attribute
reference is an example: it assembles a Markdown description from twinBASIC
literals, two of which are fence markers, inside a plain ` ```tb ` fence.

    ```tb
    [Description("### Example" & vbCrLf & _
                 "```basic" & vbCrLf & _
                 "Dim x As Long" & vbCrLf & _
                 "```")]
    ```

**A marker that stands alone on its own line needs a longer opening fence.** Open
with four backticks and close with four:

    ````tb
    Dim md As String
    md = "```"
    ```
    ````

Nothing else changes. A fence closes only on a run at least as long as the one
that opened it, and the language tag reaching the highlighter is the same string
either way. No page in `docs/` uses one yet.

**Prefer backticks to a tilde fence.** Both work, but every fence in `docs/` is
a backtick one. A fault in how the admonition rewrite finds fences shows every
`> [!NOTE]` after it as literal text; the attribute reference once shipped all
six of its admonitions that way.
[`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions), which
`test.bat` runs, is the only gate that sees this class of fault.

### Typography

The site ships its own fonts, so a page renders the same on every platform: **Inter** for text, **Cascadia Mono** for code, and **Source Serif 4** for body text in the PDF book. They apply automatically. Two things follow.

**Characters outside the shipped subsets fall back to a system font**, visible as a glyph in the wrong face. The subsets cover Latin (including Latin Extended-A and -B), Greek, punctuation, arrows, mathematical operators, currency, fractions, geometric shapes, dingbats, and --- for code --- box drawing. Emoji are excluded and come from the platform's own emoji font. Write the check mark as **U+2713** (✓), not **U+2714** (✔), which no text face in the stack carries. Prefer `:` over **U+22EE** (⋮) inside a monospaced ASCII diagram, where a fallback glyph of a different width shears the box borders.

Those two example glyphs are the only characters on the site that fall back, so the ✔ and ⋮ above are drawn by your system's symbol font, next to text that is not. That difference in weight and shape is the effect to avoid.

Diagram exports carry the font with them. The Download / Copy SVG and PNG buttons of each diagram embed the typeface into the exported file, because an exported SVG cannot use the site's stylesheet. All four buttons work on every diagram.

**Do not hand-edit a diagram's `.svg`.** It is a build artifact: the `.dot` beside it is the source, and the next build overwrites your edit. Changing the font is especially harmful --- Graphviz sizes each box to the text it measured, so labels in a font the layout never saw hang outside their boxes. `check.bat` fails on that; see [Diagrams](#diagrams) below.

## Adding a CSS rule that works in both themes
{: #css-rules }

A style rule for something new goes in `docs/_sass/custom/custom.scss`. Do not put it in the vendored theme under `builder/vendor/just-the-docs/`, and do not start a stylesheet of your own, which no page would load. Everything under `docs/_sass/` is compiled into `just-the-docs-combined.css`, which every page loads. `serve.bat` rebuilds it each time you save.

**The dark theme is a second copy of the whole theme, not a set of CSS variables.** The build compiles the theme twice and emits the dark copy inside a theme selector such as `html[data-theme="dark"]`, so every theme rule is more specific in dark mode. A rule with a single class can therefore beat the theme in light mode and lose to it in dark, with no error: `.reversefootnote` did exactly that. Prefix the selector with `.main-content` --- `.main-content .reversefootnote` --- and it wins in both. [The specificity trap](Builder#the-specificity-trap) covers the cases where that is not enough.

**Check it in both themes.** Run `serve.bat`, open a page that uses the rule, and switch themes with the theme button in the page header, not with your operating system's setting: the button is what exercises the `[data-theme]` rules. No gate reports a rule that fails only in dark.

[Project styling](Builder#project-styling) says which file under `docs/_sass/` holds what and how to verify a style change.

## Checking that a sample compiles

The ordinary build does not look inside a code fence. The link check, the accessibility
scan and the code-region gate all pass a twinBASIC sample that the compiler would refuse.

A sample can ask to be compiled. Add `check_build` to its fence:

````markdown
```tb check_build
Dim greeting As String
greeting = "Hello"
Debug.Print greeting
```
````

Then run it, which needs a twinBASIC install and Windows:

    examples.bat --only "^Reference/Core"

**Paste the summary line into the pull request description.** `examples.bat` runs in no
CI workflow, so the line a run ends with is the reviewer's only evidence. Run it over the
pages you changed, and paste the command with the line:

    examples.bat --only "^Tutorials/Testing-with-Assert"
    check_examples: 7 sample(s), 7 compile, 0 finding(s), 19.6s -- clean

`-- clean` is what a reviewer looks for. A run with a finding ends without it, lists each
sample that failed against its page and line, and exits 1.

**The marker never reaches the page.** The renderer takes the first word of a fence's info
string as the language and discards the rest, so the built site, the search index and the
PDF are identical with or without it.

**Mark every `tb` fence: `check_build` for a sample that is a program, `inert=<reason>` for
one that is not.** A statement run with an elision in it, a signature with no body, a
syntax skeleton with `<placeholders>` are good documentation, but a compiler has nothing to
say about them. Mark them anyway, as [Saying that a sample is
not a program](#saying-that-a-sample-is-not-a-program) describes: an unmarked fence
is never compiled, and `examples.bat --census` counts it as still unmarked.

The tool works out what to build around a sample --- a whole `Class` goes in a file of its
own, procedures and declarations go in a generated module, loose statements go in a
generated `Sub`. These keys override it when it guesses wrong:

| In the fence | Means |
|---|---|
| `check_build` | Compile this sample. |
| `check_run` | Compile it, build it and run it, then compare what it prints with what the page says it prints, as described below. Only a statement sample (`slot=sub`) can be run. A sample that raises an error, does not return, or prints something else is a finding. A sample that calls `MsgBox` or `InputBox`, or contains an `End` statement, is refused without being built. |
| `hidden` | Context for the page's other samples that the reader never sees. Implies `check_build`. See below. |
| `slot=file` / `slot=module` / `slot=sub` / `slot=class` / `slot=method` | What to generate around it, when the inference is wrong. `class` and `method` are the same two shapes inside a `Class` rather than a `Module`, for code-behind. The report names the slot it used. |
| `inherits=<class>` | The sample is code-behind *of* something --- `inherits=Form`, `inherits=MDIForm`. The wrapper becomes a `Class` that inherits it, so `Me.Caption` resolves against the real type. |
| `project=<name>` | Which template project to build into. The default follows the page: a page under `Reference/Built-In/` gets the one that references every package. `project=form` is for a `check_run` sample that needs a real form, to draw on or to read a property of: the project has an empty `Form1`, and the checker unloads every form a sample leaves loaded. Every fence of a `projname` group names the same project. |
| `projname=<name>` | Build these samples **as one project**, for a page that presents one program in pieces --- a function in one fence and the tests for it in the next three. Samples sharing the name are compiled together and with nothing else. |
| `concat_group=<name>` | Join these fences, in page order, into **one** piece of code before building it --- for a single construct shown in parts, such as a `Sub` or a `Class` introduced a section at a time. Implies `check_build`. See below. |
| `expect-error=<code>` | This sample is *meant* not to compile --- it shows what goes wrong --- and the run fails if it compiles. |
| `resource=<path>` | **On a fence in any language**, not just ` ```tb `. The fence's contents are written into the generated project at that project-relative path, so the page's samples can be compiled against it. For the compile-time attributes that read a project file --- see below. |
| `inert=<reason>` | This fence is **not a program**: it is never compiled or proposed, and is counted under its reason instead of sitting in the backlog. See below. |

A `check_run` sample states what it prints in one of two ways, read from the
sample's own text. A trailing comment on a `Debug.Print` line gives that line's
output. It can go on with a note for the reader after ` -- `, which is not
compared: `' 0 -- nothing left in Err` states `0`. A comment line that is exactly
`' Output:` gives the whole output, one line per comment line below it, each taken
whole; output that itself holds ` -- ` is stated this way. When a sample states anything, it must print
exactly as many lines as it states. Each line is compared with the spaces at both
ends removed, because twinBASIC prints a space before a positive number.

A sample that states nothing is still run, and must return without raising an
error. An error the sample handles itself is not raised, so a sample can show an
error with `On Error Resume Next` and print `Err.Number`.

````markdown
```tb check_run
Debug.Print InStr(1, "abc", "b")   ' 2
Debug.Print UCase("tb")            ' TB
Debug.Print Len("")                ' 0 -- an empty string has no characters
```
````

````markdown
```tb check_run
Dim i As Long
For i = 1 To 3
    Debug.Print i
Next
' Output:
' 1
' 2
' 3
```
````

### Saying that a sample is not a program

Many good fences are not programs. A syntax skeleton written with placeholder names
(`Interface name Extends base_interface`) teaches the shape better than a compilable
stand-in; so does a fence that continues the previous one or shows the invalid form beside
the valid one.

Mark those `inert=<reason>` rather than leaving them unmarked, so nobody triages them twice:

| Reason | For |
|---|---|
| `skeleton` | placeholder identifiers --- `name`, `base_interface`, `<method 1>` |
| `signature` | a procedure's signature shown without a body, where a body would mislead --- the members an interface declares, which a reader implements under other names |
| `excerpt` | continues another fence, or shows part of one |
| `pseudo` | prose, a table or a protocol listing set in a code fence |
| `contrast` | shows the invalid form, beside the valid one |
| `external` | needs a file or environment the checker cannot provide |
| `designer` | needs a real form designer --- a `Handles` clause on designer-declared fields, or a control array |
| `blocked` | correct code that a **product defect** stops compiling *and for which no workaround exists*. Look hard for one first --- a package's private half can be reached with an asterisk [library symbol](../Features/Packages/Library-Symbols), and a page that shows the qualified form plus a note beats one that shows code the reader cannot run |

An unrecognised reason is refused, as is `inert` together with `check_build`. The
census reports how many samples are checked, how many are inert, and how many are
**undecided**. Only the last is a backlog.

**A fence that stops before its closing line is usually one line from compiling.** Before
marking it `excerpt` or `signature`, put an elision comment (`' ...`) where the omitted code
would go and add the construct's closing line --- `End Function`, `End Interface`. The
reader still sees that something was left out, and the compiler can check what was left in.

### A sample that reads a file

Some twinBASIC features read a project file *while compiling*.
[`[PopulateFrom]`](../tB/Core/Attributes#populatefrom) fills an empty **Enum** with
members taken from a JSON resource, so a page documenting it has an enum whose members
exist only if that file does.

Mark the JSON block that the page already shows with `resource=`, and the file is staged
beside the samples:

````markdown
```json resource=/Resources/MESSAGETABLE/Strings.json
{ "events": [ { "id": 1000, "name": "service_started" } ] }
```
````

Every sample on that page is compiled against the file. The block is rendered normally,
and the path may not climb out of the project: no `..` and no drive letter. The enum
members the page's *other* samples use come from that JSON, so the compiler checks the
file's shape and the names it produces against the code that reads them.

A sample that assumes a control on a form is fine: the templates declare `Text1`,
`ListView1`, `CefBrowser1` and the others, as a reader's own project would.

**`Me` and `WithEvents` mark class code-behind.** Neither is legal in a standard module,
so the tool wraps a fence using either in a `Class` without being told. It cannot guess
*which* class, so a sample reaching a member of the thing it is code-behind of ---
`Me.Caption`, `Me.Arrange` --- needs `inherits=`.

### A page can carry its own context

A fence marked `hidden` is compiled with the page's other samples and **rendered to
nothing**: it is absent from the page, the search index, the offline mirror and the PDF.

It is for the declarations a sample assumes but no reader needs to read --- a class the
page describes in prose but never lists, an API `Declare`, a control instance only this
page uses. They stay in one file beside the samples that need them, not in a template
shared by every other page.

````markdown
```tb hidden
' The reader's own session class; the package never sees the type.
Class ClientSession
    Public Sub HandleMessage(ByRef Data() As Byte)
    End Sub
End Class
```
````

Use it for context, not for hiding a sample. A hidden fence is compiled like any other,
but nobody can read it, and a fence nobody can read is not documentation.

**Decide what to hide by asking what the reader needs.** Show a line the reader would
write, or needs to know where an object comes from: an event handler's header
(`Request.Headers` means nothing until the reader sees which event passes `Request`), the
subject of a `With` that a leading-dot line depends on, or the `WithEvents` field that an
event handler's name is built from. Hide what the reader brings from elsewhere: their own
helper routines, the controls the form designer declares, and stand-ins for declarations
that an external library provides.

### One construct across several fences

`concat_group=<name>` joins every fence on the page that carries the name, in page order,
into one piece of code. It is for a single construct shown in parts --- a `Sub` built up a
few lines at a time, a `Class` whose members are introduced one section at a time --- which
no fence can compile on its own, because each part is an unclosed block. It differs from
`projname`, which compiles its samples as *separate* modules of one project: the parts of a
`concat_group` become one file, so a `Private` field declared in the first part is visible
in the last.

Parts can be `hidden`. The [Painting](../Tutorials/CustomControls/Painting) tutorial shows
only the `OnPaint` method it is teaching. A hidden fence before it opens the class,
implements the interface's other two members and declares the field the method draws with,
and a hidden fence after it closes the class. A `hidden` fence alone could not do this: it
is built as a unit of its own, so it can declare what a sample *refers to* but cannot put
the sample *inside* anything. The joined code is reported as its first visible part, and an
error in any part is reported against that part's own line.

**A sample that needs another sample needs `projname`.** Samples are packed several to a
generated project, so one can see another's declarations by luck, and a page passes one
run and fails the next. Naming the group states the dependency, and the tool refuses a
group that is only half marked.

**A mistyped marker is caught.** `check_bild` renders like no marker at all, so the tool
reports an unrecognised token rather than skipping the fence silently.

[Code Samples and Attributes](Tools-Samples#check-examples) covers running it --- the census and survey
modes, the flags, and what the report means.

## Bullet lists, dashes, and parentheses

Most bullets on this site are a term, a dash, and a description. The dash depends
on what precedes it:

- A **bold-term** bullet takes `---`, the em-dash: `- **Reference** --- the language and library reference.` All 50 such bullets in `docs/Reference/` do this.
- A **link** bullet takes `--`, the en-dash: `- [Permanent Links](Permanent-Links) -- the stable URL scheme.` All 1,570 in `docs/Reference/` do this.

A bold term is a label with a definition after it, so the separator has to read as
a break. A link already ends in its own visual boundary, and an em-dash after it
crowds the line. Do not mix the two on a page.

**The description after the dash continues the sentence and is not capitalised.**
Of the bold-term bullets in `docs/Reference/` that begin with a letter, 26 of 26
are lowercase, and in `docs/Documentation/` 16 of 16. Link bullets hold to the
same rule where they can: 1,411 begin lowercase, and almost all of the 94 that do
not begin with a word that carries its own capital anyway --- `Win32`, `OLE`,
`GDI`, `Variant`, `JavaScript`. The only exceptions are 36 bullets on
`Reference/Built-In/AppGlobalClassObject/index.md`, which writes each annotation
as a full sentence starting `Returns` or `Gets`.

**Parentheses are for a short label, `---` for an aside that is a clause.**
Across the prose of `docs/Reference/`, 78% of parenthesised spans are 25
characters or shorter and the median is 12. They hold a tag the reader takes in
without stopping --- `(default)` 152 times, `(VBRUN)` 86, `(twinBASIC)` 59,
`(optional Bool)` 38, and the kind markers `(Class)`, `(Property)`, `(Sub)`. An
aside with a verb in it is part of the argument of the sentence and belongs
between em-dashes:

    ... or **Any** (twinBASIC; the type is inferred from *expression*)

    ... equivalent to a separate assignment immediately after the **Dim**
    --- `Dim i As Long = 1` is the same as `Dim i As Long: i = 1`.

`Reference/Core/Dim.md` currently does both within four lines of each other. Apply
the length test: a tag of two or three words goes in parentheses, anything that
could stand as its own sentence takes `---`.

## Tables

A table is plain GitHub-flavoured markdown --- a header row, a delimiter row, then
the body. **Do not write the scroll wrapper.** The renderer's `table_open` rule
wraps every table in `<div class="table-wrapper" tabindex="0">`. The wrapper is
`overflow-x: auto`, and the `tabindex` lets a keyboard user focus and scroll it.
`th` gets its `scope="col"` from the same place. If you are writing a markdown-it
plugin, do not add a second wrapper: the outer one would have no `tabindex`.

**A literal `|` inside a cell must be escaped as `\|`,** or the parser reads it as
the next column boundary and the row silently gains a cell. Backticks do not
help: the row is split into cells before inline parsing runs, so an unescaped pipe
inside a code span breaks the row too. It comes up often here, because `|`
separates alternatives in a twinBASIC syntax line and the builder's reference
writes type unions with it --- `[ ( True \| False ) ]`, `string\|undefined`.

Per-column alignment goes in the delimiter row, with a colon on the side the
content should sit: `:---` left, `---:` right, `:---:` centred, and a bare `---`
for the default. Use it for numeric columns, where ragged right edges make values
hard to compare. Most tables do not need it --- 1,191 columns across the site take
the default against 73 explicit left, 24 centred and 4 right.

**Keep the column count down.** Of the 459 tables on the site, 437 have two or
three columns, 16 have four, and five have five. Exactly one has more:
`Reference/Default/VBA/Interaction/Partition.md` at seven, and it is the model to
copy if you need one that wide. It right-aligns the three numeric argument columns
and left-aligns the four result columns, and a sentence of prose before the table
explains the two least obvious column headings.

**Every total in this section is a hand count of `docs/`, taken on 2026-09-21.**
No [count name](#counts) covers tables, so the totals drift. The proportions last:
two or three columns is the norm, four is rare, five rarer, and seven is one page.
Re-count before quoting a total.

Check a wide table in the PDF as well as on the site. The PDF has no scroll
wrapper (`book.mjs` strips it) and `print.css` sets `table { width: 100% }`, so a
table too wide for the 170mm text column runs into the margin, and nothing reports
it. Run `book.bat` and look at the page.

## Diagrams

A diagram is a Graphviz `.dot` file. Put it in `docs/assets/images/dot/` if more than one page uses it, or in the `Images/` folder beside the page if only one does. The build renders an `.svg` next to it, inlines that into the page, and gives it the zoom and export controls. Commit both files.

```
docs/Tutorials/CEF/Images/MonacoArchitecture.dot     <-- you write this
docs/Tutorials/CEF/Images/MonacoArchitecture.svg     <-- the build writes this
```

**Reference the `.svg`, never the `.dot`**, and use the markdown image form rather
than a raw `<img>` tag, as under [Images](#images) below:

```markdown
![A twinBASIC form holding two CefBrowser controls. The left one hosts the Monaco
editor and posts the edited HTML to a handler in twinBASIC code, which passes it to
the right control to render as a preview.](Images/MonacoArchitecture.svg)
```

Copy the `node`, `edge` and `graph` blocks from an existing diagram of the same kind, which name the font, and let the build measure it: `docs/Tutorials/CEF/Images/MonacoArchitecture.dot` for one belonging to a page, `docs/assets/images/dot/toolchain-overview.dot` for a shared one. They differ in node `margin` --- `0.16,0.09` against `0.12,0.06`. Nothing special is needed for Inter: `builder/dot-metrics.mjs` installs its real widths into Graphviz before layout, and `check.bat` asserts that nothing overflowed.

Leave node text alone: it is dark against each node's light fill in both themes. Only the cluster and edge labels follow the page's text colour, because they sit on the page background. A diagram needs alt text like any other image. The whole diagram gets one accessible name, so describe what it shows, not what shapes it contains, and never `![Diagram]`. What [Images](#images) says about alt text applies here.

A box can link somewhere: give its node, or its cluster, a `URL`, relative to the page that shows the diagram (`URL="Tools-Build#tbdocs"`). Give the box a `tooltip` as well: a pointer shows it on hover, and without one Graphviz shows the label, `<BR/>` and all. The diagram is then a group of links rather than one image, and the build moves each cluster's label just before the first box inside it, so the Tab key takes each label and then its boxes. Declare the nodes in reading order and set `outputorder=nodesfirst` on the graph, so the boxes come in that order too. `docs/Documentation/Images/Tools-Groups.dot` does both. The link check reports a link that leads nowhere.

## Images

Images live in an `Images/` folder beside the page that uses them, and are referenced by a relative path:

```markdown
![The Package Manager panel, with arrows pointing at the PUBLISH THIS PACKAGE button](Images/packPublishButton.png)
```

**The text in the square brackets is the image's alt text, and every image needs one.** Write what a reader who cannot see the picture would otherwise miss --- what the screenshot shows and which part of it the surrounding prose is pointing at. A caption-length phrase is usually right; the file name, the word *screenshot*, and the name of the button you happened to be looking for are not.

No gate checks the alt text. The accessibility scan's `image-alt` rule asks only whether an accessible name *exists*. `![image](…)` passes it. So does `![img](…)`. So does an empty `![](…)`, because an empty alt marks an image as decorative, which is right for a spacer and wrong for a screenshot. The scan also samples only fourteen pages. Whether the text describes the picture is for you and your reviewer to judge.

Copy the *shape* of a neighbouring page's image markdown, never its alt text. The example above used to read `![Create Package]`, and that string spread onto ten further images --- a references dialog, a toolbox, a properties window, an animated GIF --- describing none of them.

Use the markdown form. A raw `<img>` tag with a page-relative `src` is **not** rewritten when the PDF book is assembled. The book flattens every page into one document, so a path like `Images/x.png` resolves against the book root and the render aborts with `pdf: missing image`. The markdown form is rewritten to a section-qualified path and works in all three outputs.

**A finished page never *renders* an image from a remote URL.** Pasting a screenshot into a GitHub issue or pull request produces a `https://github.com/user-attachments/assets/...` link, and pasting that into a page is fine. The next local build downloads the file to `assets/attachments/gh-<uuid>.<ext>` and substitutes that path while rendering, so the published HTML, the offline mirror and the PDF all point at the local copy. Your markdown keeps the remote URL, so commit the downloaded file with your edit: it is the only copy the site has. Any *other* remote host has no such handling --- download the image, commit it under the section's `Images/` folder, and reference that path.

A remote image does harm in three ways, in increasing order of severity:

- **Every page view pays a network round trip.** A GitHub attachment URL answers with a redirect to S3, so a single image costs two requests --- up to about a second on a cold connection.
- **The offline mirror stops being self-contained.** `_site-offline/` is meant to be browsable from a `file://` URL with no network. A remote image renders as a broken placeholder there.
- **The PDF book fails to build.** The forked paged.js in `book/lib/` cannot load images asynchronously, so an image still downloading when the page-breaking pass runs aborts the whole render. When the host is slow, blocked, or has expired the asset, `book.bat` stops.

[`build.bat`](Building#checking-link-integrity) enforces this. A remote `<img>` --- `http://`, `https://`, or protocol-relative `//host/...` --- is reported as `remote-asset:` and fails the run.

### A figure's buttons

An image that stands alone in its paragraph is shown as a *figure*: the image with a bar of buttons to download it, copy it and zoom it. That holds for a diagram, a picture in both themes and any other PNG, JPEG, GIF or WebP. An image inside a sentence, or inside a link, is a plain image with no bar, so put an image you want to be zoomable on a line of its own.

Give a picture its `{:width="..." height="..."}`. A figure at least as tall as the bar stood on end gets the bar beside it, in the margin of a wide window and in view while the figure scrolls past. A shorter figure gets the bar above it or at its top right. A picture with no stated size is treated as short, however tall it is.

### A picture in both themes

A screenshot of the IDE shows one of its themes, and the site has two. To give a picture a version for the light theme, save it beside the first one under the same name with `.light` before the extension:

```text
docs/IDE/Images/Watches.png         <-- the dark picture: the page names this one
docs/IDE/Images/Watches.light.png   <-- the light picture: the page never names it
```

The page keeps naming `Watches.png` with its `{:width height}`. The build finds the light picture by its name and puts both into the page: a reader sees the light one in the light theme and the dark one in the dark theme, whether the theme was chosen with the toggle or follows the operating system, and the browser downloads only the one it shows. The PDF book has the light picture only.

Three rules:

- **Never name the `.light.png` in a page**, in an image, a link or raw HTML. The build stops and names the page, because that picture would then show in both themes.
- **Take the two pictures at the same scale.** The width and height in the page are for the dark picture, and the build shows the light one at the same scale: a light picture 8 pixels narrower is shown 4 pixels narrower when the page halves the dark one. The two need not be exactly the same size, because the IDE's light theme lays some things out a few pixels smaller.
- **A `.light.png` needs its dark picture beside it.** One without stops the build.

The IDE's own screenshots come from `scripts/shoot_docs.mjs`, which takes each one in both themes and writes both files; it keeps no light picture that looks exactly like the dark one. The alt text and the prose around a picture serve both themes, so describe it in words true in both: "The Run button", not "the white Run button".

### A picture as SVG

Most of the IDE's screenshots are also kept as SVG, beside their PNGs under the same name:

```text
docs/IDE/Images/Watches.png         <-- the page names this one
docs/IDE/Images/Watches.svg         <-- shown in its place
docs/IDE/Images/Watches.light.png
docs/IDE/Images/Watches.light.svg   <-- shown in the light theme
```

`scripts/shoot_docs.mjs --svg` draws each SVG from the IDE's page at the moment it takes the PNG. Its text is real text, in the fonts the IDE drew it with, so the picture stays sharp at any zoom, and in the PDF book its text can be selected and searched. The page still names `Watches.png`, and the build shows the SVG in its place in each theme.

- **Name the PNG, never the SVG.** The PNG stays in the repository, and an output that shows PNGs uses it. The `picture_svg` setting in `docs/_config.yml` decides which outputs show the SVGs: the website and the PDF book do, and the offline copy and the IDE help add-in's archive show the PNGs (the SVGs would make that archive half as large again).
- **To keep one picture's PNG everywhere**, put `png` in its attribute block: `![The Watches panel](Images/Watches.png){:width="190" height="337" png}`. The build takes the word out of the page.
- **Do not edit a picture's SVG.** Take the picture again. `shoot_docs` writes an SVG only when it matches its PNG closely: if more than 0.25% of its pixels are far from the PNG's, it is not written, an older one is removed, and the page shows the PNG.

### Videos

Link the video and mark it `.video`:

```markdown
[twinBASIC - Introduction](https://www.youtube.com/watch?v=havi3Dv4saY){: .video }
```

The build renders that as a poster frame with a play button, linking out to the video page. The link text becomes the image's accessible name, so write the real title.

The poster frame is downloaded once to `assets/thumbnails/yt-<video-id>.jpg` and committed; the build never re-fetches it. Do **not** hotlink `img.youtube.com`: [`build.bat`](Building#checking-link-integrity) fails the run, as it does for any remote `<img>`.

The pages do not embed YouTube players. An `<iframe>` embed contacts Google and sets third-party cookies as soon as the page is viewed. A local thumbnail contacts nobody until the reader clicks, so the site makes no third-party requests at all.

### Committing downloaded assets

Both cases above download into the source tree on a **local** build, and the result must be committed. CI never downloads anything: if an asset is referenced but not committed, the CI build fails.

When you add a video or paste a screenshot, build locally once, then commit the new file under `docs/assets/thumbnails/` or `docs/assets/attachments/` with your page edit. `git status` after a build shows what to add.

## Writing for an international audience

The audience is worldwide, and many readers do not have English as a first language. Reference and tutorial prose uses plain English.

**Remove metaphors borrowed from outside programming, but keep vocabulary that has a precise meaning inside Win32, COM, and event-driven programming.** A phrase a reader would have to look up in a tech blog does not belong in reference prose; a term with an exact technical meaning does.

Common substitutions:

| Instead of | Write |
|---|---|
| leverage, utilize | use |
| in order to | to |
| spin up, kick off | start |
| surface (as a verb) | expose, raise |
| wire up | connect |
| under the hood | internally |
| bites (figurative) | affects, matters |

Delete vague praise --- *powerful*, *robust*, *easily* --- and say something concrete instead. Terms with a specific technical meaning stay: *no-op*, *round-trip*, *marshal*, *message pump*, *idiomatic*.

Beyond word choice: prefer the active voice and the present tense (`returns`, not `will return`), keep one idea per sentence, and write the reference body in the third person (*the constant*, *the source*) rather than addressing the reader as *you*. *You* is fine in the lead-in to an example and throughout tutorials.

**Name the fault directly; never build up to it.** Setting up a contrast and then withholding the point makes the reader parse the sentence twice to get one fact. Write *double-clicking it is obvious, and wrong* --- not *double-clicking it is the obvious shortcut, and it is the one that misleads*. Say what the thing is and what it does, in that order, in one clause. The same applies to *and that is the one that...*, *which is the one thing that...*, *which is precisely the...* and *therein lies the...*.

**State what twinBASIC does; do not report having measured, probed or observed it.** The documentation is the authority on what twinBASIC does, so it states behaviour as fact rather than as the result of an experiment. The same goes for *probed*, *observed*, *noticed*, *turns out* and *appears to*. Write *the comma form also turns LLVM on* --- not *measured on BETA 995, the comma form also turns LLVM on*. Where the build matters, say *in BETA 995* or *since BETA 984*. When a sentence must say that a claim was checked, write *checked*, *tested*, *confirmed* or *verified*, never *measured*. *Measure* keeps its literal sense: a size, a duration, a unit of measurement, **TextWidth** measuring a string.

## Attribution

Some reference pages are adapted from Microsoft's VBA-Docs, which is licensed CC-BY-4.0. Those pages set `vba_attribution: true` in their frontmatter, which renders an extra attribution line in the site footer.

The rule is **per page, by provenance**, not by package. Set the flag only when the page was derived, verbatim or paraphrased, from a specific VBA-Docs source page. Omit it on pages written independently and on twinBASIC-original symbols, even when a same-named symbol exists in VBA.

## Callouts

Three severities, used distinctly:

- `> [!NOTE]` --- twinBASIC-versus-VBA deviations, behaviour clarifications, and useful caveats.
- `> [!IMPORTANT]` --- requirements that affect correctness, such as admin rights, threading constraints, or ordering.
- `> [!WARNING]` --- operations that can corrupt state or lose data.

A known defect in twinBASIC follows the same scale. A defect that silently gives a wrong result --- a function that returns the wrong value and raises no error --- is a `> [!WARNING]` until a fixed build is released, because nothing tells the reader their data is wrong. A defect that crashes the program is a `> [!WARNING]` too, because unsaved work is lost. So is a defect whose error hides a silent part, such as a procedure that runs twice before the error is raised. A defect the reader cannot miss and that loses nothing, such as an error raised or a statement the compiler refuses, is a `> [!NOTE]`. Either callout names the build it applies to, in its label. Once a fixed build is out, remove the callout and describe the correct behaviour with no mention of the defect: the documentation is not a record of past defects.

Where twinBASIC and VB6 behave differently, say what VB6 does. Check it in VB6 --- [`vb6run.mjs`](Tools-Defects#vb6run) builds and runs a sample there --- rather than writing it from memory. Where twinBASIC's behaviour is the intended one, the VB6 behaviour goes in a `> [!NOTE]`. Inside a defect's `> [!WARNING]` it is one sentence, such as "VB6 raises error 6, *Overflow*."

Use one callout per concern, and only for genuine notes: plain "why this is useful" prose stays a plain paragraph.

### What a callout applies to

A callout that is true of one twinBASIC build, or of one version of a package, says so in its label: the rest of the `[!TYPE]` line. The page shows each item of the label as a tag after the callout's title.

```md
> [!WARNING] BETA 1005
> **DateAdd** with the "m", "q" or "yyyy" interval does not stop at the end of a shorter month.
```

- `BETA 1005` --- true of that build, the usual label of a defect.
- `since BETA 984` --- true from that build on.
- `1.0.0.4` --- true of that version of the package whose section the page is in, written with all four parts.
- `1.6.151.1, BETA 1005` --- both, separated by a comma.
- `timeless` --- true of every build and every version: a fact of Windows or COM, behaviour the package exists to reproduce, such as the Scripting Runtime's for a replacement of it, or a design decision the package's sources state. It stands alone, and the page shows no tag for it.

The text then starts with the fact itself, not with "In twinBASIC BETA 1005, ..." or "In version 1.0.0.4, ...". If only part of a callout depends on the build, split it into two callouts. In a contributed package's section every callout has a label: the section's version for what the package does, `BETA <n>` for a fact of twinBASIC alone, or `timeless`. The build fails on a callout there without one, on any other label, and on a package version other than the one the section documents, its landing page's `indexed_from`. So when a section moves to a new version of its package, each callout labelled with the old one is checked again before the build passes. [`twin-index analyze`](Tools-Build#twin-index) lists those callouts, and after a new twinBASIC build, the callouts labelled with an older one.

A page states what the product does, never what the documentation's own checking could or could not do. "The samples harness cannot capture a console" is a fact about this repository's tools, not about the package, and has no place in a published page. A claim nobody has been able to check is written as the source supports it, or left out.

### Callouts in a contributed package's section

Every `> [!NOTE]` and `> [!WARNING]` in a contributed package's section is backed by test cases in the package's test project, `test/package-tests/<Package>/`, and names them in an HTML comment on the line above it:

    <!-- test: FilesTests.Item_MissingName, FilesTests.Item_MissingIndex -->
    > [!NOTE]

An item is a `Fixture.Sub` test case, `compile <Name>` for a compile case, `probe <id>` for a scenario of the package's `probe/` harness, or `none -- <reason>` for a callout no program can check. A case checks what is correct, so a defect of the package is a failing case.

A callout is for a real difference or limit. A statement that only describes how the package works stays prose, and its cases are tied to it by a region: the same marker on a line of its own above the prose, and `<!-- /test -->` after it.

```md
<!-- test: SearchGivesUpTests.Execute_CatastrophicPatternKeepsMatchesFound -->
A search that backtracks without end gives up instead of hanging.
<!-- /test -->
```

A region may hold paragraphs, lists, tables and samples, and regions do not nest. The folder's README says how to write a case, and [`check_package_tests.mjs`](Tools-Toolchain-Tests#check-package-tests), in `test.bat`, fails a callout with neither a marker nor a region, a region left open, and a case no marker names. [`package-tests.bat`](Tools#package-testsbat) runs the cases. The section's landing page ends with a short **Test cases** section that links to the project the build publishes, `<Package>-tests.twinproj`. [Updating a Contributed Package](Contributed-Packages) lists the steps that move a section to a new version of its package.

## Document the product as it is

twinBASIC is in a long beta, and names still move. **When one does, document the current
name and drop the old one.** A reader cannot call or search for a superseded name. Update
the sample and the prose around it, and leave no note about the old name.

This applies to names that never shipped in a release. When a behaviour changed *between*
builds, a reader may still be on the older one: say which build changed it and describe both.

## Cross-section links

Relative links resolve against a page's **rendered URL** (its `permalink`), not its location in the source tree. A link to a sibling in the same URL folder is a bare name --- `[Dim](Dim)`; crossing into another folder climbs out with `../`. Always link to a page's canonical `permalink`, never to one of its `redirect_from` aliases.

When the right number of `../` steps is not obvious, copy a working link from a neighbouring page that points where you want to go and change the final segment. [`build.bat`](Building#checking-link-integrity) catches any link that resolves to nothing.

## Crossing between VBA and a package: the depth asymmetry

**VBA pages sit one URL segment shallower than every package page.** The VBA
module scheme kept its `/tB/Modules/` prefix while everything else moved
under `/tB/Packages/<Package>/`, so the `../` count against the rendered URL
differs in each direction:

    /tB/Modules/Strings/Len                            VBA:    module, symbol
    /tB/Packages/VBRUN/AmbientProperties/BackColor     VBRUN:  package, module, symbol

From a VBA page the climb is two levels; from the VBRUN page pointing back it is
three:

    from /tB/Modules/Strings/Len
      [BackColor](../../Packages/VBRUN/AmbientProperties/BackColor)

    from /tB/Packages/VBRUN/AmbientProperties/BackColor
      [Len](../../../Modules/Strings/Len)

The seven links of the second kind in `docs/Reference/Default/VBRUN/` all count
three, and are the ones to copy from.

**There is nothing to copy for the first kind.** No page in
`docs/Reference/Default/VBA/` links to a package page: across all 285 of them
there is no markdown link to a `Packages/` URL, and the single occurrence of the
string is `VBA/index.md`'s own permalink. Count the `../` steps against the two
permalinks, and let [`build.bat`](Building#checking-link-integrity) confirm them.

The split runs through VBA itself. `VBA/index.md` publishes at `/tB/Packages/VBA`,
at package depth, while every symbol it introduces publishes under `/tB/Modules/`,
so the package index reaches its own modules by climbing out of the package tree:
`[Collection](../Modules/Collection)`. It is the nearest precedent in the tree,
and it points the wrong way.

`Core/` is one segment below `/tB/`, so VBA reaches it with `../../Core/Y` and
VBRUN with `../../../Core/Y`. Package-to-package stays inside `/tB/Packages/` and
is shorter than either: from the folder-style `CefBrowser/` index to a VB class is
`../../VB/CheckBox/`.

## Listing a new page

A new page reaches the sidebar on its own: the nav tree is generated from `parent`. The site's hand-written indexes are not generated, and a page missing from them is reachable only by search and by whatever links to it.

**Nothing catches the omission.** The link check verifies that the links a page *makes* resolve, not that anything links *to* it. Add the entries in the same commit as the page.

The indexes to join depend on what the page documents:

- **A core statement or keyword** (a page under `docs/Reference/Core/`) is listed in three places: [Statements](../../Reference/Statements), as one alphabetical bullet with a short description; [Categories](../../Reference/Categories), under the heading matching what it does; and [Permanent Links](Permanent-Links), whose `/tB/Core/` section lists core pages individually as the URL contract the IDE help system relies on.
- **An operator** goes in [Operators](../../Reference/Operators) rather than Statements, grouped by kind. The other two still apply.
- **A twinBASIC addition** --- a symbol or construct standard VBA does not have --- is additionally listed in [twinBASIC Additions](../../Reference/twinBASIC-Additions), under the category it belongs to. A page for a symbol VBA already has does not belong there.
- **A runtime procedure, function, or property** is listed in [Procedures and Functions](../../Reference/Procedures-and-Functions) under its initial letter, and introduced in the prose of its own module's `index.md`. Module pages group their members by theme, so add the link to the paragraph it fits, not to the end. [Permanent Links](Permanent-Links) lists modules, not members, and needs no edit.
- **A class, control, or enumeration inside a package** is introduced on that package's `index.md`. A control in the VB package is additionally listed in [Controls](../../tB/Controls), under the group matching its purpose.
- **An enumeration** is listed in [Enumerations](../../Reference/Enumerations) **twice** --- once in the by-package section and once in the alphabetical index below it. It also moves the enumeration total on the [Reference Section](../../Reference) landing page, written as `{{tbdocs:enumerations}}`, which follows on its own. That total is derived from the *alphabetical index* alone, so an entry added only to the by-package section is a half-edit that nothing reports.
- **A whole new package** needs a bullet on [Default Packages](../../tB/Packages/Default/) or [Built-In Packages](../../tB/Packages/Built-In/) **and on the [welcome page](../../)**, whose *Built-in packages* section names every package on the site's front page. It also moves the package counts in the prose of [Packages](../../tB/Packages/) and the [Reference Section](../../Reference) landing page; write them as `{{tbdocs:defaultPackages}}`, `{{tbdocs:builtInPackages}}` or `{{tbdocs:packages}}` so the next package costs nobody an edit. It needs its own `###` section in [Permanent Links](Permanent-Links), under `/tB/Packages/`, stating the URL shape its members follow.

Each entry is a link plus a one-line description in the style of its neighbours. Copy the entry above the position you are inserting at and replace its contents.

**The PDF book is the one list that catches the omission.** Every page needs an entry in `docs/_book.yml`: a part or chapter that selects it, or a `left_out:` entry that names it with a reason. A page with neither gets a `book:` warning in the build's summary. Most parts select by URL prefix, so a new page in a section the book already carries --- another operator, another VBA function --- usually has its entry already. [Book Configuration](Book-Configuration#pages-left-out-of-the-book) has the details.

## Removing a page

Removal is the more dangerous direction: a page missing from an index is merely
hard to find, while an entry left behind after the page is gone sends the reader
to a 404.

[`build.bat`](Building#checking-link-integrity) reports a stale entry, because it
resolves every intra-site link against the pages that reached the tree. Go through
the same places [Listing a new page](#listing-a-new-page) names, then let the
build confirm:

- **A core statement or keyword** comes out of [Statements](../../Reference/Statements), [Categories](../../Reference/Categories) and the `/tB/Core/` list in [Permanent Links](Permanent-Links).
- **An operator** comes out of [Operators](../../Reference/Operators) instead of Statements; the other two still apply.
- **A twinBASIC addition** comes out of [twinBASIC Additions](../../Reference/twinBASIC-Additions) as well.
- **A runtime procedure, function, or property** comes out of [Procedures and Functions](../../Reference/Procedures-and-Functions) and out of its module's `index.md`, where it is a phrase inside a themed paragraph. Reread that sentence afterwards: taking one link out of a list of three can leave it unreadable.
- **A class, control, or enumeration inside a package** comes out of that package's `index.md`, and a VB control out of [Controls](../../tB/Controls).
- **An enumeration** comes out of [Enumerations](../../Reference/Enumerations) in both places. The total on the [Reference Section](../../Reference) landing page is a [count name](#counts) and follows on its own.
- **A whole package** comes out of [Default Packages](../../tB/Packages/Default/) or [Built-In Packages](../../tB/Packages/Built-In/), out of the *Built-in packages* section of the [welcome page](../../), and out of its `###` section in [Permanent Links](Permanent-Links). Package counts already written as [count names](#counts) follow on their own; any still written as digits do not.
- **Any page `docs/_book.yml` names on its own** --- as a `landing_page:`, or in a `left_out:` entry --- comes out of the manifest too. The build warns about an entry that no longer matches a page.

Three things have no counterpart in adding a page.

**The URL stops resolving, and the link check sees only links made from inside
the tree.** If another page takes over the removed page's subject, give it a
`redirect_from:` entry naming the old URL; the collision rule allows that
because the old page no longer publishes there. If nothing replaces it, the URL is
gone, and for a `/tB/` URL that breaks the contract the IDE help system resolves
against. Retiring one is a deliberate decision, set out under [what the guarantee
covers](Permanent-Links#retiring-a-url). In short: a redirect wherever anything can
carry the URL, the entry out of [Permanent Links](Permanent-Links) in the same
commit, and the retired URL named in the commit message.

**The page count falls, and the drift guard fails on a fall.** A rise rewrites
the baseline by itself; a fall needs one build with `--update-page-baseline`, and
`builder/page-baseline.json` is committed with the deletions. [The
page-count drift guard](Building#the-page-count-drift-guard) has the command.

**A page that other pages name as their `parent:` cannot simply be deleted.** The nav
integrity check aborts the build with `Nav-parent orphan detected`, naming every
child left without a parent. The match is on the parent's **title**, not its
file, so deleting a page whose title another page still carries is fine. A
genuine orphan needs a parent that exists: re-point the children, retitle
their new home, or delete them too. A child that sets `nav_exclude` is not
checked. [The next section](#nav-parent-orphan) lists every message the check
prints.

## When the build stops with `Nav-parent orphan detected`
{: #nav-parent-orphan }

The build stops when a page's `parent:` does not name exactly one page. It lists
each page it could not place, with the reason:

    Nav-parent orphan detected in 12 page(s):
      Features/Example/Child.md: no page titled "Old Title" exists

**The match is on the parent's title, not its file, and it is exact, case included:**
`parent: Strings module` does not find the page titled `Strings Module`.
`nav_sort: case_insensitive` in `_config.yml` does not change that: it only orders
the sidebar. Changing a page's `title:` leaves every page whose `parent:` names the
old title without a parent. Change each of those lines to the new title, in the
same commit as the rename. One search finds them, and the `grand_parent:` lines
that name it as well:

    git grep -n -F "parent: Old Title" -- docs

Change the `grand_parent:` lines too. The check reads `grand_parent:` only when two pages
share the parent's title, so a stale one passes today and fails on the day a second
page takes that title.

Each reason the check can give:

| Reason | Means |
|---|---|
| `no page titled "X" exists` | The parent was renamed, deleted or misspelt --- or it sets `nav_exclude`, and a page hidden from the navigation cannot be a parent. |
| `N pages are titled "X" and no grand_parent is declared to disambiguate` | Reported under *Nav-parent ambiguity detected*. Add `grand_parent:` naming the intended parent's own parent. |
| `grand_parent "G" does not match any page titled "X"` | The title is shared, and `grand_parent:` names the parent of neither page. |
| `N pages titled "X" share parent "G" - grand_parent does not disambiguate` | Two pages with the same title under the same parent. Retitle one of them. |

A page that sets `nav_exclude` is never reported.

## See also

- [Permanent Links](Permanent-Links) -- the stable `/tB/` URL scheme a `permalink` must follow.
- [Building and Deployment](Building) -- build, serve, and check a page locally before committing.
- [Tools and Scripts](Tools) -- the batch files and scripts behind the workflow.
- [Extending the Builder](Extending) -- add a markdown-it plugin or pipeline task when a page needs new behaviour.
