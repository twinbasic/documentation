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
- **LLVM** --- compiling with the LLVM back end: turning it on, its options, and its current limitations.
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
- **`permalink`** --- **required on every page.** The page's stable URL, and the contract the IDE help system relies on. The build aborts if it is missing rather than deriving one from the file path: this tree deliberately does not mirror its URLs (`Reference/Built-In/CEF/` publishes at `/tB/Packages/CEF/`), so a derived URL would be wrong, and wrong silently. Reference pages follow a fixed scheme by section: a core keyword is `/tB/Core/<Symbol>`, a library symbol is `/tB/Packages/<Package>/...`, and so on. [Permanent Links](Permanent-Links) documents the full scheme.
- **`nav_order`** --- optional integer that orders the page among its siblings in the sidebar.
- **`has_toc`** --- set to `false` to suppress the automatic list of child pages the template appends to a page that has any; see [Folder-style pages](#folder-style-pages-and-has_toc). Every page that sets it sets it to `false`.
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

## Folder-style pages and `has_toc`

A symbol that needs sub-pages is documented as a folder: `<Class>/index.md` for
the class itself, and one sibling `.md` beside it per sub-page. CEF's browser
control is the smallest complete example --- `Reference/Built-In/CEF/CefBrowser/`
holds `index.md` and `EnvironmentOptions.md`, and publishes at
`/tB/Packages/CEF/CefBrowser/` and `/tB/Packages/CEF/CefBrowser/EnvironmentOptions`.
{{tbdocs:folderStyleIndexes}} pages under `Reference/` are `index.md` files of
this shape, {{tbdocs:folderStyleSlashPermalinks}} of them declaring a permalink
that ends in a slash, and the layout is written down nowhere but in them.

**The filename carries no meaning; the permalink does all the work.** `index.md`
is not special to the build --- nothing in `discover` looks at basenames except to
sort by them --- and the source folder is not the URL folder either: that CEF page
lives at `Reference/Built-In/CEF/CefBrowser/` and publishes under
`/tB/Packages/CEF/`. What decides the shape of the output is one character:

    permalink: /tB/Packages/CEF/CefBrowser/     ->  tB/Packages/CEF/CefBrowser/index.html
    permalink: /tB/Packages/CEF/CefBrowser      ->  tB/Packages/CEF/CefBrowser.html

A trailing slash makes the page an `index.html` inside a folder of that name;
without one it is a file beside its siblings. That is not cosmetic, because
relative links resolve against the rendered URL: the trailing-slash form has one
more URL segment than the other, so every `../` count on the page and every link
written *to* it changes with the slash. Pick the form first and do not change it
afterwards.

The frontmatter follows the same nesting. The index declares `parent: <Package>
Package`; each sibling declares `parent: <Class>` and `grand_parent: <Package>
Package`, so the sidebar nests one level deeper. A sibling addresses its own index
as `[CefBrowser](.)`, and a section of it as `[Create](.#create)`.

**Set `has_toc: false` on every page in the group.** It is a real key the template
reads, and it suppresses `renderChildrenNav` --- the automatic "Table of contents"
heading and list of child pages that the template otherwise appends to a parent
page, after its own content. On a reference index that list repeats the members
the page already introduces in prose, so every one of the 238 pages that sets the
key sets it to `false`; it is never `true` anywhere on the site. The whole
`AppGlobalClassObject` package is the precedent to copy --- its `index.md` and all
37 pages under `_App/` carry it.

Note what it does not do. `has_toc` has nothing to do with the in-page table of
contents, which is the separate `* TOC goes here` / `{:toc}` marker, or with
`{: .no_toc }` on the page title, which keeps the title out of that list. A page
can use all three, and most reference index pages do.

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

**Only `#` and `##` headings get an entry of their own in the site search.** The search index cuts each page at its h1 and h2 headings and gives each piece one entry, titled with its heading. A `###` or deeper heading gets no entry: its text is folded into the entry of the nearest `#` or `##` above it. So a section a reader should be able to find by searching for its subject needs a `##` heading. The index is built from the rendered page, after the normalizer has run, so on an old-style page a `###` that renders as h2 does get an entry.

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

That check sees only links made from inside this repository, and the `/tB/` anchors have a consumer outside it. [Permanent Links](Permanent-Links) enumerates the `#<attribute>` anchors on `/tB/Core/Attributes` --- the URLs the IDE help system resolves against. They are covered by the build's check only because that page links to each one, so an attribute added to `Attributes.md` and not added to that list is unchecked from the moment it is written. Two were in exactly that position until recently, and adding them to the list is what put them under the check.

Every heading on that page also carries a pinned `{: #... }` id, and that is not decoration. Three of them once had none and resolved on the default slug alone --- which ties the published URL to the heading text, so appending a parenthesised type to one, to match its neighbours, would have broken it silently. Pin the id when you add the heading.

## Counts the build fills in
{: #counts }

A figure written by hand is correct the day it is written and attached to
nothing that would notice when it stops being correct. A wrong count breaks no
link, fails no gate, and reads exactly like a right one. So the numbers the
build already knows are written as names:

    {{tbdocs:pages}} pages under `Reference/` are `index.md` files of this shape

renders as the current figure. The available names, each derived on every build
from the same data the pages themselves come from:

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

The three package names are separate because the words for them collide. The
[welcome page](../../) heads a section *Built-in packages* and lists all
{{tbdocs:packages}} under it, while [Packages](../../tB/Packages/) reserves that
word for the {{tbdocs:builtInPackages}} a project references on demand. Neither
is wrong, and no reader can tell the two apart from one page alone, so a
sentence meaning one of them should not be written with a digit. Pick the name
for the set your sentence means and it cannot drift into the other set's number.

**A name is a derivation, never a constant.** A registry holding `pages: 908`
would not have removed the stale figure, only moved it from a page a
contributor reads into a module nobody opens. If a number cannot be derived it
does not get a name --- an assertion that needs a person to check it belongs in
prose, where a reader can see that it is a claim.

Two consequences worth knowing before using one:

- **A misspelled name fails the build**, before any page renders, naming the
  file, the line and the nearest match. It cannot be allowed to pass: an
  unrecognised placeholder would otherwise be published to readers verbatim,
  which is the failure the whole mechanism exists to prevent.
- **Code is immune, and needs no escaping.** A placeholder inside backticks or
  a fence is left alone, because the substitution runs over markdown's inline
  text and code is a different kind of token entirely. A page that needs to
  *show* the syntax puts it in backticks, which is what such a page does
  anyway. The one placement that does not work is inside a raw HTML block; the
  build fails on that too rather than publishing it.

Numbers already written as words stay as words, because a substitution always
yields digits. [Callouts](#callouts) below opens *Three severities, used
distinctly*, and should keep the word: it counts the three bullets directly
beneath it, which is a fact about that sentence rather than about the site and
could not be derived from build state at all.

## Formatting conventions

- **Bold** (`**...**`) for keywords and literal tokens the reader would type verbatim; *italic* (`*...*`) for placeholders and argument names.
- twinBASIC code goes in a ` ```tb ` fenced block --- Shiki highlights it with the vendored twinBASIC grammar, and `twinbasic`, `vb` and `vba` select the same grammar. The other highlighted fence languages are `js`, `yaml`, `json`, `c`, `html`, `xml`, `sql` and `batch`. Anything else renders as unhighlighted plain text: the build does not fail, but it prints `highlight: unknown fence language "<name>"` naming the language and the list to add it to, so check the build output rather than the page.
- Parameter lists use the definition-list pattern (a term line, then a `: definition` line beneath it), not a markdown table.
- **An inline code span cannot start or end with a single space.** CommonMark removes one space from each end of a span whose content is not all spaces, so `` ` 1  2 ` `` renders as `1  2`. That matters whenever the padding *is* the value being shown --- what `Debug.Print` emits into its 14-column print zones, a fixed-width return such as [Partition](../tB/Modules/Interaction/Partition)'s, anything a reader might count characters in. Write two spaces at each end to get one, and confirm against the built HTML rather than the preview: five claims on two pages were quietly de-padded this way, each of them a documented output value with its leading and trailing spaces missing.
- For dashes, write `--` in the source (it renders as an en-dash) or `---` (an em-dash). Never paste a literal `–` or `—`. Nothing in the build rejects one: the typographer converts the ASCII forms and passes a literal character straight through, so a stray dash ships silently and only the source becomes inconsistent. `scripts/convert_em_dash_separators.mjs` is the normaliser, and it is run by hand.

### A code sample that holds a fence marker
{: #fence-in-fence }

A sample that builds a Markdown string has ` ``` ` inside it, and the fence
around the sample has to survive that. Which form to use depends on where the
marker sits.

**A marker in the middle of a line needs nothing special.** A fence closes only
on a line that is nothing but backticks, so an ordinary three-backtick fence
holds a sample whose markers are inside string literals. The
[`Description`](../../tB/Core/Attributes#description) entry on the attribute
reference is the shipped precedent: its example assembles a Markdown description
from twinBASIC literals, two of which are fence markers, inside a plain ` ```tb `
fence.

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
that opened it, and both pre-render passes that have to find fences apply that
same rule --- `maskCodeRegions`, which hides code from the rewrites, and the
fence stasher inside `rewriteAdmonitions`, which is the one that matters here
because it runs *outside* the mask by design. The language tag reaching the
highlighter is the same string either way --- a four-backtick `tb` fence is highlighted exactly as a
three-backtick one is. No page in `docs/` uses one yet, so there is no example to
copy; it is still the right form.

**Prefer backticks to a tilde fence.** Both work: `rewriteAdmonitions` used to
recognise backtick fences only, so a tilde fence holding a ` ``` ` line was not
hidden from it and every `> [!NOTE]` after it rendered as literal text in a plain
blockquote. That is fixed, and `check_code_regions.mjs` carries a probe for it.
Backticks remain the house form because every fence in `docs/` is one, and a
longer backtick run is the one construct here with a shipped precedent.

That failure is not hypothetical. The attribute reference once shipped all six of
its admonitions as the literal text `[!NOTE]`, because the same pairing closed
that page's opening fence on a marker in the middle of a line and every pairing
after it was off by one. The mid-line case is fixed --- the rewrite scans lines
now --- and [`check_code_regions.mjs`](Tools#check-code-regions), which
`test.bat` runs, is the only gate that sees this class of fault at all.

### Typography

The site ships its own fonts, so a page renders the same on every platform: **Inter** for text, **Cascadia Mono** for code, and **Source Serif 4** for body text in the PDF book. Nothing is needed from you to use them --- they apply automatically --- but two things follow from it.

**Characters outside the shipped subsets fall back to a system font**, which is visible as a glyph in the wrong face. The subsets cover Latin (including Latin Extended-A and -B), Greek, punctuation, arrows, mathematical operators, currency, fractions, geometric shapes, dingbats, and --- for code --- box drawing. Emoji are deliberately excluded and come from the platform's own emoji font. Two specifics worth knowing: write the check mark as **U+2713** (✓), not **U+2714** (✔), which no text face in the stack carries; and prefer `:` over **U+22EE** (⋮) inside a monospaced ASCII diagram, where a fallback glyph of a different width shears the box borders.

Those two example glyphs are, deliberately, the only characters on the whole site that fall back --- so the ✔ and ⋮ above are being drawn by your system's symbol font right now, next to text that is not. That difference in weight and shape is the effect this section is about.

Diagram exports carry the font with them. The Download / Copy SVG and PNG buttons above each diagram embed the typeface into the exported file, because an exported SVG has no access to the site's stylesheet and would otherwise render in whatever the viewer has installed. All four buttons work on every diagram.

**Do not hand-edit a diagram's `.svg`.** It is a build artifact: the `.dot` beside it is the source, and the next build overwrites your edit. Changing the face is the edit that looks most harmless and is not --- Graphviz sizes each box to the text it measured, so a diagram whose labels are painted in a font the layout never saw has text hanging outside its boxes. `check.bat` fails on that; see [Diagrams](#diagrams) below.

## Adding a CSS rule that works in both themes
{: #css-rules }

A style rule for something new on the site goes in `docs/_sass/custom/custom.scss`. Do not put it in the vendored theme under `builder/vendor/just-the-docs/`, and do not start a stylesheet of your own, which no page would load: everything under `docs/_sass/` is compiled into `just-the-docs-combined.css`, which every page does load. `serve.bat` rebuilds it each time you save.

**The dark theme is a second copy of the whole theme, not a set of CSS variables.** The build compiles the theme twice and emits the dark copy inside a theme selector such as `html[data-theme="dark"]`, so every theme rule is more specific in dark mode than it is in light. A rule you write with a single class can therefore beat the theme in light mode and lose to it in dark, with no error: `.reversefootnote` did exactly that. Prefix the selector with `.main-content` --- `.main-content .reversefootnote` --- and it wins in both. [The specificity trap](Builder#the-specificity-trap) covers the cases where that is not enough.

**Check it in both themes.** Run `serve.bat`, open a page that uses the rule, and switch themes with the theme button in the page header rather than with your operating system's setting, because the button is what exercises the `[data-theme]` rules. A rule that fails only in the dark theme is usually cosmetic, and no gate reports it.

[Project styling](Builder#project-styling) is the full account: which file under `docs/_sass/` holds what, why the theme is compiled twice, and how to verify a style change.

## Checking that a sample compiles

Nothing in the ordinary build looks inside a code fence. The link check, the accessibility
scan and the code-region gate all pass over a twinBASIC sample that the compiler would
refuse --- two such samples shipped, one of them a flagship example on a package page, and
every gate was green over both.

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
CI workflow, so a green pull request says nothing about a sample; the line a run ends with
is the evidence a reviewer has. Run it over the pages you changed, and paste the command
with the line:

    examples.bat --only "^Tutorials/Testing-with-Assert"
    check_examples: 7 sample(s), 7 compile, 0 finding(s), 19.6s -- clean

`-- clean` is what a reviewer looks for. A run with a finding ends without it, lists each
sample that failed against its page and line, and exits 1.

**The marker never reaches the page.** The renderer takes the first word of a fence's info
string as the language and discards the rest, so a marked fence produces byte-identical
HTML to an unmarked one. Nothing in the built site, the search index or the PDF can tell
the difference.

**Mark every `tb` fence: `check_build` for a sample that is a program, `inert=<reason>` for
one that is not.** A statement run with an elision in it, a signature with no body, a
syntax skeleton with `<placeholders>` --- those are good documentation, and there is nothing
for a compiler to say about them. They are marked all the same, as [Saying that a sample is
not a program](#saying-that-a-sample-is-not-a-program) describes, because an unmarked fence
is never compiled and `examples.bat --census` counts it as still unmarked. Checking is
opt-in for a historical reason: when the harness arrived, roughly a third of the fences
were not programs, and a gate that demanded every fence compile would have needed hundreds
of exceptions on the first day.

The tool works out what to build around a sample --- a whole `Class` goes in a file of its
own, procedures and declarations go in a generated module, loose statements go in a
generated `Sub`. Three keys override it when it guesses wrong, and one flag asks for more:

| In the fence | Means |
|---|---|
| `check_build` | Compile this sample. |
| `check_run` | Compile it and run it, capturing what it prints. *Not implemented yet --- such a fence is compiled only, and the run says so.* |
| `hidden` | Context for the page's other samples that the reader never sees. Implies `check_build`. See below. |
| `slot=file` / `slot=module` / `slot=sub` / `slot=class` / `slot=method` | What to generate around it, when the inference is wrong. `class` and `method` are the same two shapes inside a `Class` rather than a `Module`, for code-behind. The report always names the slot it used, so a wrong guess reads as a wrong guess. |
| `inherits=<class>` | The sample is code-behind *of* something --- `inherits=Form`, `inherits=MDIForm`. The wrapper becomes a `Class` that inherits it, so `Me.Caption` resolves against the real type. |
| `project=<name>` | Which template project to build into. The default follows the page: a page under `Reference/Built-In/` gets the one that references every package. |
| `projname=<name>` | Build these samples **as one project**, for a page that presents one program in pieces --- a function in one fence and the tests for it in the next three. Every sample sharing the name is compiled together and nothing else is compiled with them. |
| `concat_group=<name>` | Join these fences, in page order, into **one** piece of code before building it --- for a single construct shown in parts, such as a `Sub` or a `Class` introduced a section at a time. Implies `check_build`. See below. |
| `expect-error=<code>` | This sample is *meant* not to compile --- it is showing what goes wrong --- and the run fails if it compiles. |
| `resource=<path>` | **On a fence in any language**, not just ` ```tb `. The fence's contents are written into the generated project at that project-relative path, so the page's samples can be compiled against it. For the compile-time attributes that read a project file --- see below. |
| `inert=<reason>` | This fence is **not a program**, and saying so settles it: it is never compiled, never proposed, and counted under its reason instead of sitting in the backlog. See below. |

### Saying that a sample is not a program

Plenty of good fences are not programs. A syntax skeleton written with placeholder names
(`Interface name Extends base_interface`) teaches the shape better than any compilable
stand-in would; a fence that continues the previous one, or shows the invalid form beside
the valid one, is doing its job exactly as written.

Mark those `inert=<reason>` rather than leaving them unmarked, so nobody triages them twice:

| Reason | For |
|---|---|
| `skeleton` | placeholder identifiers --- `name`, `base_interface`, `<method 1>` |
| `signature` | a procedure's signature shown on purpose without a body, where a body would mislead --- the members an interface declares, which a reader implements under other names |
| `excerpt` | deliberately continues another fence, or shows part of one |
| `pseudo` | prose, a table or a protocol listing set in a code fence |
| `contrast` | shows the invalid form on purpose, beside the valid one |
| `external` | needs a file or environment the checker cannot provide |
| `designer` | needs a real form designer --- a `Handles` clause on designer-declared fields, or a control array |
| `blocked` | correct code that a **product defect** stops compiling *and for which no workaround exists*. Look hard for one first --- a package's private half can be reached with an asterisk [library symbol](../Features/Packages/Library-Symbols), and a page that shows the qualified form plus a note is better than a page that shows code the reader cannot run |

An unrecognised reason is refused, the same as a bad `slot=`, and `inert` together with
`check_build` is refused as a contradiction. The census then reports three numbers rather
than two: how many samples are checked, how many are inert, and how many are **undecided**.
Only the last is a backlog.

**A fence that stops before its closing line is usually one line from compiling.** Before
marking it `excerpt` or `signature`, put an elision comment (`' ...`) where the omitted code
would go and add the construct's closing line --- `End Function`, `End Interface`. The
reader still sees that something was left out, and the compiler can now check what was
left in.

### A sample that reads a file

Some twinBASIC features read a project file *while compiling*.
[`[PopulateFrom]`](../tB/Core/Attributes#populatefrom) is the one to know: it fills an empty
**Enum** with members taken from a JSON resource, so a page documenting it has an enum whose
members exist only if that file does.

Mark the JSON block that the page already shows with `resource=`, and the file is staged
beside the samples:

````markdown
```json resource=/Resources/MESSAGETABLE/Strings.json
{ "events": [ { "id": 1000, "name": "service_started" } ] }
```
````

The file travels with its page, exactly as a `hidden` fence does, so every sample on that
page is compiled against it. The block is rendered normally --- the reader is meant to see
the file --- and the path may not climb out of the project, so no `..` and no drive letter.

What this buys is more than a green tick: the enum members the page's *other* samples use
come from that JSON, so the compiler checks the file's shape and the names it produces
against the code that reads them.

A sample that assumes a control on a form is fine: the templates declare `Text1`,
`ListView1`, `CefBrowser1` and the others, exactly as a reader's own project would, so what
gets checked is the part the sample is actually claiming.

**`Me` and `WithEvents` are read as declarations of intent.** Neither is legal in a standard
module --- the compiler says so in as many words --- so a fence using either is class
code-behind, and the tool wraps it in a `Class` without being told. What it cannot guess is
*which* class, so a sample reaching a member of the thing it is code-behind of ---
`Me.Caption`, `Me.Arrange` --- needs `inherits=` to say.

### A page can carry its own context

A fence marked `hidden` is compiled with the page's other samples and **rendered to
nothing**: it is absent from the page, the search index, the offline mirror and the PDF.

It is for the declarations a sample assumes but no reader needs to read --- a class the
page describes in prose but never lists, an API `Declare`, a control instance only this
page uses. Putting them in a hidden fence keeps them beside the samples that need them,
in one file, instead of in a template shared by every other page on the site.

````markdown
```tb hidden
' The reader's own session class; the package never sees the type.
Class ClientSession
    Public Sub HandleMessage(ByRef Data() As Byte)
    End Sub
End Class
```
````

Use it for context, not for hiding a sample. A hidden fence is still compiled, so it is
checked like everything else --- but nobody can read it, and a fence nobody can read is
not documentation.

**Decide what to hide by asking what the reader needs.** Before hiding a line, ask whether
a reader would write it, or would need it to know where an object comes from. An event
handler's header is both --- `Request.Headers` means nothing until the reader sees which
event passes `Request` --- and so is the subject of a `With` that a leading-dot line depends
on, or the `WithEvents` field that an event handler's name is built from. Show those. Hide
what the reader brings from elsewhere: their own helper routines, the controls the form
designer declares, and stand-ins for declarations that an external library provides.

### One construct across several fences

`concat_group=<name>` joins every fence on the page that carries the name, in page order,
into one piece of code before anything else happens. It is for a single construct shown in
parts --- a `Sub` built up a few lines at a time, a `Class` whose members are introduced one
section at a time --- which no fence can compile on its own, because each part is an
unclosed block. It is not `projname`: that compiles its samples as *separate* modules of one
project, while the parts of a `concat_group` become one file, so a `Private` field declared
in the first part is visible in the last.

Parts can be `hidden`. The [Painting](../Tutorials/CustomControls/Painting) tutorial shows
only the `OnPaint` method it is teaching. A hidden fence before it opens the class,
implements the interface's other two members and declares the field the method draws with,
and a hidden fence after it closes the class. A `hidden` fence alone could not do this: it
is built as a unit of its own, so it can declare what a sample *refers to* but cannot put
the sample *inside* anything. The joined code is reported as its first visible part, and an
error in any part is reported against that part's own line.

**A sample that needs another sample needs `projname`.** Samples are packed several to a
generated project, so one can sometimes see another's declarations by luck --- and luck
changes with what else is being checked, which makes a page pass one run and fail the next.
Naming the group says the dependency out loud, and the tool then refuses a group that is
only half marked rather than reporting a missing symbol in the sample that is fine.

**A mistyped marker is caught.** `check_bild` renders identically to no marker at all, so a
sample carrying one would simply never be compiled; the tool reports an unrecognised token
rather than skipping it in silence.

[Tools and Scripts](Tools#check-examples) covers running it --- the census and survey
modes, the flags, and what the report means.

## Bullet lists, dashes, and parentheses

Most bullets on this site are a term, a dash, and a description, and which dash
depends on what precedes it. The practice is near-absolute and has never been
written down, so it survives only by imitation:

- A **bold-term** bullet takes `---`, the em-dash: `- **Reference** --- the language and library reference.` 50 of the 50 such bullets in `docs/Reference/` do this, with no exceptions.
- A **link** bullet takes `--`, the en-dash: `- [Permanent Links](Permanent-Links) -- the stable URL scheme.` 1,570 of 1,570 in `docs/Reference/`, again with none the other way.

The reason is visual rather than grammatical. A bold term is a label with a
definition after it, so the separator has to be strong enough to read as a break;
a link already ends in its own visual boundary, and an em-dash after it crowds
the line. The distinction matters only because it is consistent: a page that
mixes the two looks like two people wrote it.

**The description after the dash continues the sentence and is not capitalised.**
Of the bold-term bullets in `docs/Reference/` that begin with a letter, 26 of 26
are lowercase, and in `docs/Documentation/` 16 of 16. Link bullets hold to the
same rule where they can: 1,411 begin lowercase, and almost all of the 94 that do
not begin with a word that carries its own capital anyway --- `Win32`, `OLE`,
`GDI`, `Variant`, `JavaScript`. The only genuine exceptions are 36 bullets on
`Reference/Built-In/AppGlobalClassObject/index.md`, which writes each annotation
as a full sentence starting `Returns` or `Gets`. That is one page's local habit,
not a second convention to choose between.

**Parentheses are for a short label, `---` for an aside that is a clause.** The
split is real practice, not a preference: across the prose of `docs/Reference/`,
78% of parenthesised spans are 25 characters or shorter and the median is 12. What
fills them is a tag the reader takes in without stopping --- `(default)` 152
times, `(VBRUN)` 86, `(twinBASIC)` 59, `(optional Bool)` 38, and the kind markers
`(Class)`, `(Property)`, `(Sub)`. Once the aside has a verb in it, it is part of
the argument of the sentence and belongs between em-dashes, where the reader
still reads it:

    ... or **Any** (twinBASIC; the type is inferred from *expression*)

    ... equivalent to a separate assignment immediately after the **Dim**
    --- `Dim i As Long = 1` is the same as `Dim i As Long: i = 1`.

`Reference/Core/Dim.md` currently does both within four lines of each other,
which is what an unstated rule looks like. Apply the length test: a tag of two or
three words goes in parentheses, anything that could stand as its own sentence
takes `---`.

## Tables

A table is plain GitHub-flavoured markdown --- a header row, a delimiter row, then
the body. Nothing else is needed, and in particular **the scroll wrapper is not
yours to write.** The renderer's `table_open` rule wraps every table in
`<div class="table-wrapper" tabindex="0">` on its way out, and that `tabindex` is
an accessibility fix rather than decoration: the wrapper is `overflow-x: auto`, and
a scroll container a keyboard user cannot focus cannot be scrolled without a
mouse. It is unconditional because whether a given table overflows depends on the
reader's viewport, so there is no answer to give at render time. `th` gets its
`scope="col"` from the same place. If you are writing a markdown-it plugin, do not
add a second wrapper: the outer one would have no `tabindex`, which is the shipped
fix undone.

**A literal `|` inside a cell must be escaped as `\|`,** or the parser reads it as
the next column boundary and the row silently gains a cell. Backticks are no
protection: the row is split into cells before inline parsing runs, so an
unescaped pipe inside a code span breaks the row exactly as a bare one does. It
comes up in this documentation more than in most, because `|` is twinBASIC's
separator for alternatives in a syntax line and the builder's own reference writes
type unions with it --- `[ ( True \| False ) ]`, `string\|undefined`. It is escaped
in 38 files and explained in none of them.

Per-column alignment goes in the delimiter row, with a colon on the side the
content should sit: `:---` left, `---:` right, `:---:` centred, and a bare `---`
for the default. Use it for numeric columns, where ragged right edges make values
hard to compare. Most tables do not need it --- 1,191 columns across the site take
the default against 73 explicit left, 24 centred and 4 right.

**Keep the column count down.** Of the 459 tables on the site, 437 have two or
three columns, 16 have four, and five have five. Exactly one has more:
`Reference/Default/VBA/Interaction/Partition.md` at seven, and it is the model to
copy if you need one that wide. It right-aligns the three numeric argument columns
and left-aligns the four result columns, and it spends a sentence of prose before
the table explaining what the two least obvious column headings mean, which is
what makes seven columns readable at all.

**Every total in this section is a hand count of `docs/`, taken on 2026-09-21.**
No [count name](#counts) covers tables, and a number the build cannot derive does
not get one --- so nothing keeps these current, and each of them is already a
little wrong by the time you read it. The proportions are the durable part, and
the rarities are more durable still: two or three columns stays the norm, four
stays rare, five rarer, and seven stays one page, however many tables get
written. Quote the shape, and re-count before quoting a total.

Check a wide table in the PDF as well as on the site, because the two behave
differently and only one of them degrades gracefully. `book.mjs` strips the
`table-wrapper` before assembling the book, and `print.css` sets `table { width:
100% }` with no overflow rule anywhere --- so a table too wide for the 170mm text
column has no scroll affordance to fall back on and simply runs into the margin.
Nothing reports it. Run `book.bat` and look at the page.

## Diagrams

A diagram is a Graphviz `.dot` file. Put it where it belongs: `docs/assets/images/dot/` if more than one page uses it, or in the `Images/` folder beside the page if only one does. The build renders an `.svg` next to it, inlines that into the page, and gives it the zoom and export controls. Both files belong in git.

```
docs/Tutorials/CEF/Images/MonacoArchitecture.dot     <-- you write this
docs/Tutorials/CEF/Images/MonacoArchitecture.svg     <-- the build writes this
```

**Reference the `.svg`, never the `.dot`**, and use the markdown image form rather
than a raw `<img>` tag --- the same rule, and the same reason, as [Images](#images)
below:

```markdown
![A twinBASIC form holding two CefBrowser controls. The left one hosts the Monaco
editor and posts the edited HTML to a handler in twinBASIC code, which passes it to
the right control to render as a preview.](Images/MonacoArchitecture.svg)
```

Name the font as the existing diagrams do --- copy the `node`, `edge` and `graph` blocks from one of them --- and let the build measure it. Copy from a diagram of the same kind: `docs/Tutorials/CEF/Images/MonacoArchitecture.dot` for one belonging to a page, `docs/assets/images/dot/toolchain-overview.dot` for a shared one. They differ in node `margin` --- `0.16,0.09` against `0.12,0.06` --- so a figure quoted for one family is not the other's. You do not need to do anything special for Inter: `builder/dot-metrics.mjs` installs its real widths into Graphviz before layout, and `check.bat` asserts afterwards that nothing overflowed.

Two things to leave alone. Node text is deliberately dark against each node's light fill in both themes; only the cluster and edge labels follow the page's text colour, because those are the ones sitting on the page background. And a diagram needs alt text like any other image --- the whole diagram gets one accessible name, so describe what it shows, not what shapes it contains, and never `![Diagram]`. Everything under [Images](#images) about what makes alt text worth having, and about nothing in the build being able to tell you, applies here unchanged.

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

## Document the product as it is

twinBASIC is in a long beta, and names still move. **When one does, document the current
name and drop the old one.** A superseded name is not history a reader can use: they cannot
call it, cannot search for it, and have to carry two names in their head to read one
snippet. Update the sample, update the prose around it, and do not leave a note explaining
what the thing used to be called.

This is about names that never shipped in a release. A behaviour that changed *between*
builds is different --- a reader may still be on the older one --- so say which build changed
it and describe both.

## Cross-section links

Relative links resolve against a page's **rendered URL** (its `permalink`), not its location in the source tree. A link to a sibling in the same URL folder is a bare name --- `[Dim](Dim)`; crossing into another folder climbs out with `../`. Always link to a page's canonical `permalink`, never to one of its `redirect_from` aliases.

When the right number of `../` steps is not obvious, copy a working link from a neighbouring page that already points where you want to go and change the final segment. That is faster and less error-prone than counting folders, and [`build.bat`](Building#checking-link-integrity) catches any link that resolves to nothing before it reaches the site.

## Crossing between VBA and a package: the depth asymmetry

**VBA pages sit one URL segment shallower than every package page.** The VBA
module scheme kept its original `/tB/Modules/` prefix while everything else moved
under `/tB/Packages/<Package>/`, so counting `../` against the rendered URL gives
a different answer in each direction:

    /tB/Modules/Strings/Len                            VBA:    module, symbol
    /tB/Packages/VBRUN/AmbientProperties/BackColor     VBRUN:  package, module, symbol

So the two directions do not mirror each other. From a VBA page the climb is two
levels; from the VBRUN page pointing back it is three:

    from /tB/Modules/Strings/Len
      [BackColor](../../Packages/VBRUN/AmbientProperties/BackColor)

    from /tB/Packages/VBRUN/AmbientProperties/BackColor
      [Len](../../../Modules/Strings/Len)

Both land on `/tB/`, which is the only thing the two paths have in common; the
difference is purely how far down each one started. The seven links of the second
kind that exist in `docs/Reference/Default/VBRUN/` all count three, and are the
ones to copy from.

**There is nothing to copy for the first kind.** The advice above --- take a
working link from a neighbouring page --- has no answer here, because no page in
`docs/Reference/Default/VBA/` links to a package page at all: across all 285 of
them there is not one markdown link pointing at a `Packages/` URL, and the single
occurrence of the string is `VBA/index.md`'s own permalink. The first
VBA-to-package link anyone writes will be the first on the site, with no
precedent beside it and a `../` count that differs from every VBRUN example they
might reach for instead. Count it against the two permalinks, and let
[`build.bat`](Building#checking-link-integrity) confirm it.

That permalink is worth a second look, because the split runs through VBA itself.
`VBA/index.md` publishes at `/tB/Packages/VBA`, at package depth, while every
symbol it introduces publishes under `/tB/Modules/`, so the package index reaches
its own modules by climbing out of the package tree: `[Collection](../Modules/Collection)`.
It is the nearest thing to a precedent in the tree, and it points the wrong way.

Everything else follows from the same arithmetic once the two prefixes are in
view. `Core/` is one segment below `/tB/`, so VBA reaches it with `../../Core/Y`
and VBRUN with `../../../Core/Y`. Package-to-package stays inside `/tB/Packages/`
and is shorter than either: from the folder-style `CefBrowser/` index to a VB
class is `../../VB/CheckBox/`.

## Listing a new page

A new page reaches the sidebar on its own --- the nav tree is generated from `parent`. The site's hand-written indexes are not generated, and a page missing from them is reachable only by search and by whatever happens to link to it.

**Nothing catches the omission.** The link check verifies that the links a page *makes* resolve; it has no opinion about whether anything links *to* it, and an unlisted page is a perfectly valid page. So the entry has to go in deliberately, in the same commit as the page, or it does not go in at all.

The indexes to join depend on what the page documents:

- **A core statement or keyword** (a page under `docs/Reference/Core/`) is listed in three places: [Statements](../../Reference/Statements), as one alphabetical bullet with a short description; [Categories](../../Reference/Categories), under the heading matching what it does; and [Permanent Links](Permanent-Links), whose `/tB/Core/` section enumerates core pages individually because that list is the URL contract the IDE help system relies on.
- **An operator** goes in [Operators](../../Reference/Operators) rather than Statements, grouped by kind. The other two still apply.
- **A twinBASIC addition** --- a symbol or construct standard VBA does not have --- is additionally listed in [twinBASIC Additions](../../Reference/twinBASIC-Additions), under the category it belongs to. A page for a symbol VBA already has does not belong there.
- **A runtime procedure, function, or property** is listed in [Procedures and Functions](../../Reference/Procedures-and-Functions) under its initial letter, and introduced in the prose of its own module's `index.md`. Those module pages present their members in themed groups rather than as a flat list, so add the link to the paragraph it fits rather than to the end. [Permanent Links](Permanent-Links) lists the modules, not their members, so it needs no edit.
- **A class, control, or enumeration inside a package** is introduced on that package's `index.md`. A control in the VB package is additionally listed in [Controls](../../tB/Controls), under the group matching its purpose.
- **An enumeration** is listed in [Enumerations](../../Reference/Enumerations) **twice** --- once in the by-package section and once in the alphabetical index below it --- and moves the enumeration total stated on the [Reference Section](../../Reference) landing page. That total is written as `{{tbdocs:enumerations}}`, so it follows on its own --- but it is derived from the *alphabetical index* alone, so an entry added only to the by-package section above it is still a half-edit, and nothing reports one.
- **A whole new package** needs a bullet on [Default Packages](../../tB/Packages/Default/) or [Built-In Packages](../../tB/Packages/Built-In/) **and on the [welcome page](../../)**, whose *Built-in packages* section names every package on the site's front page and is the entry the other lists do not imply. It also moves the package counts written into the prose of [Packages](../../tB/Packages/) and the [Reference Section](../../Reference) landing page. Those counts do have names, so write them as `{{tbdocs:defaultPackages}}`, `{{tbdocs:builtInPackages}}` or `{{tbdocs:packages}}` while you are there and the package after yours costs nobody an edit. It also needs its own `###` section in [Permanent Links](Permanent-Links), under `/tB/Packages/`, stating the URL shape its members follow. That page is the URL contract, and a package missing from it has none.

Every one of these entries is a link plus a one-line description in the style of its neighbours, so the reliable way to write one is to copy the entry above the position you are inserting at and replace its contents.

**The PDF book is the one list that does catch the omission.** Every page needs an entry in `docs/_book.yml`: a part or chapter that selects it, or a `left_out:` entry that names it with a reason. A page with neither gets a `book:` warning in the build's summary. Most parts select by URL prefix, so a new page in a section the book already carries --- another operator, another VBA function --- usually has its entry already, and the warning appears only for a page somewhere new. [Book Configuration](Book-Configuration#pages-left-out-of-the-book) has the details.

## Removing a page

Deleting the file is the easy half, and removal is the more dangerous direction:
a page missing from an index is merely hard to find, while an entry left behind
after the page is gone sends the reader to a 404.

That much the build catches. [`build.bat`](Building#checking-link-integrity)
resolves every intra-site link against the pages that reached the tree, so a
stale entry is reported rather than shipped. Go through the same places
[Listing a new page](#listing-a-new-page) names, then let the build confirm:

- **A core statement or keyword** comes out of [Statements](../../Reference/Statements), [Categories](../../Reference/Categories) and the `/tB/Core/` list in [Permanent Links](Permanent-Links).
- **An operator** comes out of [Operators](../../Reference/Operators) instead of Statements; the other two still apply.
- **A twinBASIC addition** comes out of [twinBASIC Additions](../../Reference/twinBASIC-Additions) as well.
- **A runtime procedure, function, or property** comes out of [Procedures and Functions](../../Reference/Procedures-and-Functions) and out of its module's `index.md`, where it is a phrase inside a themed paragraph rather than a bullet. Read that sentence afterwards --- taking one link out of a list of three leaves a sentence that no longer reads.
- **A class, control, or enumeration inside a package** comes out of that package's `index.md`, and a VB control out of [Controls](../../tB/Controls).
- **An enumeration** comes out of [Enumerations](../../Reference/Enumerations) in both places. The total on the [Reference Section](../../Reference) landing page is a [count name](#counts) and follows on its own.
- **A whole package** comes out of [Default Packages](../../tB/Packages/Default/) or [Built-In Packages](../../tB/Packages/Built-In/), out of the *Built-in packages* section of the [welcome page](../../), and out of its `###` section in [Permanent Links](Permanent-Links). Package counts already written as [count names](#counts) follow on their own; any still written as digits do not.
- **Any page `docs/_book.yml` names on its own** --- as a `landing_page:`, or in a `left_out:` entry --- comes out of the manifest too. The build warns about an entry that no longer matches a page.

Three things then have no counterpart in adding a page.

**The URL stops resolving, and the link check sees only links made from inside
the tree.** If another page takes the removed page's subject over, give it a
`redirect_from:` entry naming the old URL --- the collision rule allows that
because the old page no longer publishes there. If nothing replaces it the URL is
gone, and for a `/tB/` URL that breaks the contract the IDE help system resolves
against. Retiring one is a deliberate decision with three things expected of it,
set out under [what the guarantee covers](Permanent-Links#retiring-a-url); the
short form is a redirect wherever anything can carry the URL, the entry out of
[Permanent Links](Permanent-Links) in the same commit, and the retired URL named
in the commit message.

**The page count falls, and the drift guard fails on a fall.** A rise rewrites
the baseline by itself; a fall needs one build with `--update-page-baseline`, and
`builder/page-baseline.json` is committed with the deletions. That build is a
full one and includes the link check, so nothing needs rebuilding after it. [The
page-count drift guard](Building#the-page-count-drift-guard) has the command.

**A page other pages name as their `parent:` cannot simply be deleted.** The nav
integrity check aborts the build with `Nav-parent orphan detected`, naming every
child left without a parent. The match is on the parent's **title**, not its
file, so deleting a page whose title another page still carries is fine. A
genuine orphan needs a parent that exists --- re-point the children, retitle
their new home, or delete them too. Only nav-visible pages are checked, so a
child that sets `nav_exclude` is not caught. [The next
section](#nav-parent-orphan) lists every message the check prints.

## When the build stops with `Nav-parent orphan detected`
{: #nav-parent-orphan }

The build checks that every page's `parent:` names exactly one page, and stops when one
does not. It lists each page it could not place, with the reason:

    Nav-parent orphan detected in 12 page(s):
      Features/Example/Child.md: no page titled "Old Title" exists

**The match is on the parent's title, not its file, and it is exact, case included:**
`parent: Strings module` does not find the page titled `Strings Module`. Setting
`nav_sort: case_insensitive` in `_config.yml` would not change that, because the build
reads it only to order the sidebar. Changing a page's `title:` leaves every page whose
`parent:` names the old title without a parent, although nothing moved.
Change each of those lines to the new title, in the same commit as the rename. One search
finds them, and the `grand_parent:` lines that name it as well:

    git grep -n -F "parent: Old Title" -- docs

Change the `grand_parent:` lines too. The check reads `grand_parent:` only when two pages
share the parent's title, so a stale one does not fail the build today; it fails on the
day a second page takes that title.

Each reason the check can give:

| Reason | Means |
|---|---|
| `no page titled "X" exists` | The parent was renamed, deleted or misspelt --- or it sets `nav_exclude`, and a page hidden from the navigation cannot be a parent. |
| `N pages are titled "X" and no grand_parent is declared to disambiguate` | Reported under *Nav-parent ambiguity detected*. Add `grand_parent:` naming the intended parent's own parent. |
| `grand_parent "G" does not match any page titled "X"` | The title is shared, and `grand_parent:` names the parent of neither page. |
| `N pages titled "X" share parent "G" - grand_parent does not disambiguate` | Two pages with the same title under the same parent. Retitle one of them. |

Only nav-visible pages are checked, so a page that sets `nav_exclude` is never reported
itself.

## See also

- [Permanent Links](Permanent-Links) -- the stable `/tB/` URL scheme a `permalink` must follow.
- [Building and Deployment](Building) -- build, serve, and check a page locally before committing.
- [Tools and Scripts](Tools) -- the batch files and scripts behind the workflow.
- [Extending the Builder](Extending) -- add a markdown-it plugin or pipeline task when a page needs new behaviour.
