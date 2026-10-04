# twinBASIC Documentation --- The Build Pipeline and Its Gates

Why the pipeline and each gate are built the way they are: what each one checks,
the failure it guards against, and the rule that follows. [WIP.md](WIP.md) keeps
the roster, the wrapper commands and the rules themselves under [The gates, and
where their internals are](WIP.md#the-gates-and-where-their-internals-are).

**Read this before adding a gate, changing one, or adding any rewrite over
markdown source or rendered HTML.** Each gate here guards a failure that every
other gate passes. The recurring shape is a check that quietly stops checking,
which reports exactly what a healthy tree reports.

## The pipeline

**Before adding a fan-out to the task graph, read [why a dep count of zero does not mean the submits have run](builder/PLAN-sab-pull-scheduler.md#a-dep-count-of-zero-does-not-mean-the-submits-have-run).** A worker posts its result and *then* decrements its successors' dependency counts in shared memory. A barrier's count can therefore reach zero while results are still queued and the `submit()` calls that merge them into build state have not run: the shared counter orders the work, not the state.

A dynamic barrier must list every chunk task in its `expected`, even when its own `execute()` ignores the inputs. That list is the only thing the scheduler checks before it lets the barrier proceed. Without it, some builds drop pages from `search-data.json`: the index is built by flattening a `new Array(N)`, and `Array.prototype.flat()` skips holes without reporting anything. A race and a silent skip combine into one invisible failure.

So every skip on the chunk-merge path refuses to continue when a piece is missing --- see [where the completeness checks are](builder/PLAN-sab-pull-scheduler.md#where-the-completeness-checks-are). On this path, "the piece is missing" is a bug, not a case to handle.

**A sort key on this path must be total.** `discover()` fills `pages` from inside
a `Promise.all`, so a page is pushed when its `readFile` resolves, not in
`allFiles` order. `pages.sort(byName)` is stable and Jekyll's key is the
*basename*, so a tie would keep that I/O completion order --- and over a hundred
folder-style classes are all named `index.md`. Tied pages would reorder the
chunking and make `search-data.json` differ between two builds of one commit.
`byName` breaks ties on `srcRel`. Two builds of a commit are byte-identical
except for `BuildInfo.html` and `gantt.svg`, which record build timings and
cannot be.

**`scripts/compare_trees.mjs` relies on that.** It builds a commit and the
working tree from two git worktrees and compares all three trees byte for byte.
It replaces those two regions and the PDF title page's build line, which also
differs when the sides are different commits or were built on different days.
Run it after any change to `builder/` that should leave the output alone. A
change meant to alter the output is checked the same way: the report should show
the intended differences and nothing else. Build the working tree from a
checkout, never in place: under `core.autocrlf` a file a tool has rewritten holds
LF where a fresh checkout writes CRLF, so every file the build copies verbatim
would differ.

### A hung build times out and says where it hung

Readers get this at [When a build stops instead of
failing](docs/Documentation/Building.md), with a `--stall-timeout` row in
`Tools.md`'s flag table and an entry in `Builder.md`'s failure-mode list. Keep
those in step with any change here.

**A task that a worker claims and never finishes wedges the whole graph in
silence.** Its successors' dep counts never drop, `_remaining` never reaches
zero, the scheduler's promise never settles, and the process sits there with its
last log line on screen. Nothing in the SAB protocol can notice, because the
scheduler is waiting on a message that is not coming.

`Scheduler` watches for that. If no task completes for `--stall-timeout`
seconds (default **120**, `0` disables), it prints what was outstanding and
fails the build. The default is generous: the longest single task is worker cold
boot at ~1.6 s, and a loaded CI box may be an order of magnitude slower than the
dev box without being stalled.

The report splits the outstanding tasks three ways, because one list buries the
two names that matter under a dozen that do not:

- **Claimed by a worker that never returned** --- the cause. For a `render:i` or
  `flush:i` chunk it also prints the chunk's source pages, via an optional
  `describe()` on the task def that nothing but this report reads. "render:33
  never returned" is not actionable; the six paths under it are, because the
  fault is nearly always one page's content.
- **Runnable, but nothing picked it up** --- including the `F_PIN_TO_PRED` case.
  A pinned `flush:i` can only run on the lane its `render:i` ran on. When that
  lane is the wedged one, the task is runnable and permanently unrunnable at
  once; unlabelled, it reads as a second, unrelated fault.
- **Blocked on a predecessor** --- the consequence, with the missing input names.

Two details:

- `Worker.terminate()` kills a thread spinning inside a regex, so the abort ends
  the process rather than adding a second hang.
- Under `--serve` the pool outlives a rebuild, so a wedged worker would poison
  every later build (the per-worker tasks wait on every lane). The stall error
  carries a `stalled` flag and `serve.mjs` replaces the whole pool when it sees
  one. Replacing just the wedged lane would need to identify it, and the SAB
  records the lane a task *completed* on, not the one that claimed it.

[builder/PLAN-checks.md](builder/PLAN-checks.md) designs folding `check.bat`'s
gates into the task graph. The link checker is in: extraction runs inside
`flush`, where both trees' final HTML is already in worker memory, so the build
never writes ~270 MB out only to read it back and re-parse it. The
`pick_a11y_sample.mjs --check` census and the axe scan's orchestration are not
yet designed; the plan holds measurements and open questions for them.

## Tooling policy

### Tooling is JavaScript, and the two remaining `.py` files each have a reason

Everything under `scripts/`, `builder/`, `lib/`, `book/`, `eval/` and `wisdom/` is Node.js.
One trap: **a tool that rewrites a file must preserve its line endings
byte-exactly.** Python's `Path.read_text` / `write_text` round-trip applies
universal-newline translation, rewriting any LF file it touches to CRLF on Windows
--- a whole-file diff for a one-character fix. Some of the tree's markdown files
are LF, so the trap is live.

Two `.py` files stay, and neither is an oversight:

- **`scripts/impexp.py`** is not tooling. It is a published download, declared in
  `_config.yml`'s `bundle_extra` beside `impexp.mjs` and offered to readers on
  [Import/Export Tool](docs/Features/Packages/Import-export%20tool.md) as the Python edition
  of the same standalone tool. Porting it would delete a deliberate offering.
- **`scripts/build_fonts.py`** stays because the JavaScript build of HarfBuzz it would
  use produces wrong CFF2 metrics --- a one-line build-configuration defect in harfbuzzjs,
  documented with the evidence in [WIP.Fonts.md](WIP.Fonts.md), which also holds the full
  account of the blocked JavaScript port.

One `.ps1` exists for a third kind of reason. **`scripts/lib/tb-launch.ps1`** is Win32
calls --- `CreateDesktop`, `CreateProcess` with `STARTUPINFO.lpDesktop`, and the job object
the IDE runs in (`CreateJobObject`, `AssignProcessToJobObject`) --- which Node cannot make
without a native FFI addon. Adding one for a few calls would mean
`npm install` no longer suffices to run the tooling. It is also not a script anyone runs:
`scripts/lib/tb-ide.mjs` reads the text and passes it through `-EncodedCommand`, so it never meets the
execution policy. See [Compiling a twinBASIC project without the IDE in front of
you](WIP.Harness.md#compiling-a-twinbasic-project-without-the-ide-in-front-of-you).

Two `.mjs` files also run a little PowerShell inline, for Windows state Node has no API
for, and neither adds a file: `scripts/tbrun.mjs` takes a process snapshot with
`Get-Process`, and `scripts/lib/tb-registry.mjs` reads and restores the IDE's registry
keys through .NET, because `reg.exe` mangles names outside the console code page. See
[What a run leaves in the registry](WIP.Harness.md#what-a-run-leaves-in-the-registry-and-putting-it-back).

`lib/` — modules that every other tooling folder may import, and that import none of them.
`builder/` may not import `scripts/`, so code that both need lives here;
[lib/README.md](lib/README.md) states the rule, and `biome.jsonc` refuses an import that
breaks either one.

`wisdom/` — Discord knowledge-harvesting tool (three-phase: export → process → extract). Plans in `wisdom/PLAN-{1,2,3}.md`; implementation under `wisdom/`. Uses only Node.js built-in APIs. Running it is [WIP.Wisdom.md](WIP.Wisdom.md).

`eval/` — use-case evaluation of the developer documentation. `build_corpus.mjs` mirrors the
repository with every non-prose file stubbed unreadable, so "documentation only" is a property
of the tree rather than an instruction. `site_search.mjs` replays the site's real lunr index
and query logic, because search and navigation fail on different pages. `usecases.md` is the
catalogue, `protocol.md` is what an evaluator is given. **This asks whether the docs *work*,
which is orthogonal to whether they are accurate** — most findings involve sentences
that are individually true. Mine this file for cases: it is substantially a catalogue of
"this shipped broken and nobody noticed", and each entry is a use case waiting to be written.

## The gates, and the machinery they guard

### What belongs in test.bat rather than check.bat

**The split is by what a gate interrogates, not by what it happens to open.** `check_axe_patch_equiv.mjs` loads a built page, but only because its probe needs some document to run inside --- what it tests is the axe source patch, and it would be worth running against an empty `docs/`. That is the test: a new gate belongs in `test.bat` if it would still mean something with no documentation in the tree.

Older notes under `builder/PLAN-*.md` still place `check_publish_policy.mjs` and `check_axe_patch_equiv.mjs` in `check.bat`. Both are in `test.bat`.

**Both CI workflows run every one of these scripts as its own step, unconditionally** --- CI never invokes the `.bat` files. So the split changes what a *local* content edit has to pay for and nothing about what reaches `staging`; a tooling regression cannot get in by someone skipping `test.bat`.

**The link and integrity check runs inside the build.** `build.bat` passes `--check-audit-index`, which implies `--check`. The check walks the HTML on the worker lanes that produced it: both trees' final strings are already decoded and in memory at `flush()`, so the ~270 MB the two trees weigh is never written out only to be read back. It also audits the tree index the build derives from its own records against what landed on disk --- the one direction the two-checker comparison structurally cannot see, since a spurious entry makes the oracle answer "exists" for a path that 404s in production.

It catches broken intra-site links, missing pages, malformed `redirect_from` entries (the most common breakage when adding new pages or moving content between sections), duplicate ids, remote `<img src>`, badly nested tags, sitemap and search-index gaps, canonical mismatches, and (via a forbidden-prefix rule on the offline tree) any extracted link that still points at the live docs site after the offlinify rewrite. A clean `build.bat && check.bat` is the bar for "ready to commit".

A failing check never aborts the build: a broken link still produces a site you want on disk to inspect. It sets the exit code to 1 instead, whether the check found link failures, integrity failures or both (the summary lines say which). It keeps 2 for a build that could not do its job: a refused command line, a stall or a crash. `check_links.mjs` uses the same scheme.

The remote-asset rule fails the run on any `<img src>` resolving off-box (`http://`, `https://`, or protocol-relative `//host`). In the build it is unconditional --- `checkRemoteAssets: true` on both trees in `builder/check.mjs`'s `TREES` --- and *not* reachable by a flag: `tbdocs` rejects `--check-remote-assets` as an unknown argument. That name belongs to the standalone `scripts/check_links.mjs`, where it is opt-in. The PDF pass over `book.html` is informational, so enforcement comes from the `_site/` pass; every page in the book is also in `_site/`, making it a superset. The check is scoped to `<img>` only; `<iframe>` is untouched.

### The link check's two front ends, and the gate that catches divergence

[scripts/check_links.mjs](scripts/check_links.mjs) is the tool for a tree the build did not produce --- a release zip, a bisect, someone else's artifact. Both CI workflows run it, though not directly: the shared gates action invokes `check_links_diff.mjs --case fixture --a script --b index`, which calls the script in-process as its `script` side (only a `fused` side spawns, and it spawns `tbdocs`). In CI it is exercised only against fixtures, never against the real trees.

Both front ends run the check in [builder/check.mjs](builder/check.mjs), over the pure core in [builder/link-check.mjs](builder/link-check.mjs). The script keeps only its command line, its walk and reads of the tree, and its report's summary lines. [builder/check-tree.mjs](builder/check-tree.mjs) is the build's alone.

The two read the tree differently --- the build from memory, through an index of what it wrote and in chunks across its workers --- and **a checker that silently checks less reports a clean pass.** [scripts/check_links_diff.mjs](scripts/check_links_diff.mjs) is the gate against that, and it plays the same role on this side that `check_a11y_fingerprint.mjs` plays on the axe side. Run it whenever `link-check.mjs`, `check.mjs` or `check_links.mjs` changes:

```sh
node scripts/check_links_diff.mjs --a script --b fused
```

It diffs the two front ends' findings category by category across the real invocations: `_site/` with sitemap + search + canonical, `_site-offline/` with the forbidden-prefix rule, `book.html` with the same rule (there it collects the links that leave the book for the website, reported as `OUT OF BOOK`), and a `--baseurl` tree checked with the matching base path.

It is deliberately *not* in `check.bat`. CI runs only its fixture cases: `fixture` in the shared gates action, and `fixture-built` and `fixture-built-offline` against a `fused` side in `checks.yml` alone. The script side over the real trees costs ~3 s, which is the whole saving.

Two further modes matter:

- `--self-test` diffs the script against a deliberately corrupted side and fails unless the difference is reported. Everything else the harness prints reduces to "the two sides agreed", which is also what a harness comparing nothing says.
- `tbdocs --src docs --check-audit-index` diffs the tree index the build derives from its own records against what actually landed on disk. The findings comparison structurally cannot see this failure mode: a *missing* index entry turns a working link into a reported break, which is loud, but a *spurious* one masks a real break, and on a clean site nothing links to a path that does not exist.

The harness carries synthetic cases for the same reason: the real site is clean, so every real case compares empty against empty in eight of the nine categories. `fixture` is a hand-written tree. `fixture-built` and `fixture-built-offline` are trees the build produces from `test/fixtures/check-src`, which is the only way the fused side is held to a fault. Each provokes faults of known kinds and asserts the count, so a fixture that stops provoking one fails loudly instead of quietly going back to empty-vs-empty.

### The publish allowlist

**`discover()` files every non-page it finds under `docs/` as a static file, and
`write.mjs` copies it verbatim, so the source tree's shape *is* the site's shape.**
`_config.yml`'s `exclude:` alone is a denylist, and a denylist can only
refuse what someone thought to name in advance: a scratch `.md` with no
frontmatter, a `.bak`, a `.twin`, a `secrets.json`, a `.docx`, a `deploy.pem`,
`Thumbs.db` or a `build.log` planted in `docs/` would each be published at a
public URL on a green build.

Two publish surfaces reach the world from those trees: the deploy workflow
uploads `docs/_site/` wholesale to Pages, and the manual-dispatch path zips
`docs/_site-offline/` onto a GitHub release. Neither looks at what it is
carrying.

[builder/publish-policy.mjs](builder/publish-policy.mjs) inverts the rule ---
name what may ship, refuse the rest --- and is enforced at two points, both
**unconditional**, because a build run with `--no-check` is exactly when nothing
else is watching:

- **Source**, in the `discover` task, over the static-file inventory. Names the
  file on disk and aborts before anything is written.
- **Tree**, in the `dispatch` task, over each tree's derived inventory
  (`deriveTreeRels`). Covers what the source sweep structurally cannot see:
  redirect stubs, vendored theme assets, and the generated auxiliaries
  (`sitemap.xml`, `search-data.json`) are all minted by the build, not found in
  `docs/`.

Unlike the link check, **a finding here aborts the build**. A broken link still
leaves a tree worth inspecting; a tree with a private key in it is a tree nobody
should be one `upload-pages-artifact` away from publishing.

Three details of the policy are essential:

- **`SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` are separate sets, and must stay
  separate.** The build emits `.xml` and `.json`; a contributor has no business
  dropping either into `docs/`, and `.json` is among the extensions most worth
  refusing at source. Folding the two together would pass every other assertion
  in the self-test, so the self-test asserts the disjointness directly.
- **`.md` is deliberately absent from both.** A markdown file that reaches the
  check is one `discover` found no frontmatter block in, so it would be
  served as raw markdown. The two likeliest causes are handled upstream: a
  **UTF-8 BOM** is stripped before parsing, and **malformed YAML** inside the
  block throws `Failed to parse frontmatter in <file>` from `discover.mjs`. What
  reaches here is a file with no block at all, or one where something precedes
  the opening `---` --- a blank line is enough --- so keep the message naming
  that and not the BOM.
- **`bundle_extra` is exempt by *path*, not by extension.** `_config.yml`
  declares `Features/Packages/downloads/impexp.py` and `impexp.mjs` with both
  ends spelled out, which is what makes them shippable. The same extension
  anywhere else still fails; otherwise declaring one entry would bless a whole
  type.

**A clean build says only that nothing in `docs/` is currently refused, which is
also what an allowlist widened until it refuses nothing says.** No build over a
clean tree can make the other assertion, so
[scripts/check_publish_policy.mjs](scripts/check_publish_policy.mjs) makes it
against named probes --- a `.bak`, a `.pem`, a `.docx`, a frontmatter-less `.md`,
a `Thumbs.db` --- plus the reverse (a `.png`, a `.PNG`, a `.woff2`, `CNAME` must
still publish, or a policy that refuses everything would also report a clean
sweep). No browser, no built tree, ~40 ms. It runs first in `test.bat` and in
both CI workflows.

```sh
node scripts/check_publish_policy.mjs
```

**Adding a new asset type is a one-line edit to `publish-policy.mjs`, and that is
the point:** the cost is paid once, by the person who knows they are adding it,
instead of silently by whoever drops a key file into `docs/` years from now.

### Never rewrite markdown source without knowing what is code

**[lib/markdown.mjs](lib/markdown.mjs) is the one answer to what is code in a
markdown source.** Its exports: `blockRegions` (every fence, indented code block
and HTML block, with its lines, from a block-only markdown-it parse), `maskCode`
(hide the code, rewrite the prose, restore the code), `splitCodeSpans` (one line
cut into prose and code-span segments), `splitOnMarker` (sections split on a
marker line outside any region) and `mapLines` (rewrite each line, keeping its own
line ending). A tool that decides for itself what is code disagrees with the
renderer somewhere --- on a backtick fence whose info string holds a backtick, on
a fence a definition list makes --- so every tool that rewrites or scans page
source asks this module, with the site's parser when the site's syntax matters. Its
importers: `builder/render.mjs` (`applyPreRenderRewrites`, `rewriteAdmonitions`),
`builder/counts.mjs` (the count validator), `scripts/check_code_regions.mjs` (the
gate), `scripts/convert_em_dash_separators.mjs`, `scripts/check_examples.mjs` and
`scripts/lib/example-batches.mjs`, `scripts/check_gate_lists.mjs`,
`scripts/lib/attributes-doc.mjs`, `eval/nav_hops.mjs`, `eval/run_case.mjs` and
`wisdom/extract/merger.mjs`. A new one joins them; it does not write a private
fence regex. [lib/frontmatter.mjs](lib/frontmatter.mjs) plays the same part for
where a page's frontmatter ends.

`render.mjs` applies several kramdown-parity rewrites to **raw markdown**, before
markdown-it has parsed anything. A rewrite at that layer cannot tell prose from
code, and this site's subject matter *is* code, so an unguarded rewrite corrupts
code samples. What each one does when it is not guarded:

| rewrite | damage without a guard |
|---|---|
| `rewriteAdmonitions` body strip | eats the indentation of code inside an admonition, leaving `If`/`ElseIf`/`Else` bodies flush left --- wrong control flow, in a language reference. The same greedy strip also merges paragraphs inside admonition *prose*, which a code-focused audit never thinks to look for |
| `encodeSpacesInMediaUrls` | turns `Items[1](a, b)` into `Items[1](a,%20b)` |
| `rewriteTripleAsteriskEmphasis` | turns `' *** banner ***` into `' **_ banner _**` |
| `rewriteListItemSetextHeadings` | **deletes** a YAML sample's closing `---` and promotes the line above it to a heading |
| a Liquid-tag strip | removes `{% raw %}` inside fences, so no page could show the tag; no rewrite does this, and a probe in `check_code_regions.mjs` keeps it so |

**The same class exists on rendered HTML.** `book.mjs`'s chapter transforms
rewrite `id="`, `href="#` and `src="/` across a whole body. An inline code span
is emitted through `escapeMarkup`, which escapes only `&`, `<` and `>`, so
quotes survive as literal bytes and all three patterns match inside a sample:
`<style id="jtd-nav-activation">` would read `<style id="ch-...-jtd-nav-activation">`
in the PDF.

Highlighted *blocks* escape this only by accident: the highlighter splits
attributes across `<span>` boundaries, so `src="/vs/loader.js"` never appears as
a contiguous byte sequence. Inline spans get no such treatment. **Do not rely on
that accident.**

Three mechanisms exist, and a new rewrite must use one of them:

- **Source rewrites** go inside `applyPreRenderRewrites` in
  [builder/render.mjs](builder/render.mjs), between `maskCode` and its
  `restore`. The chain between them is `rewriteTripleAsteriskEmphasis`,
  `encodeSpacesInMediaUrls`, `rewriteListItemSetextHeadings` and
  `absorbTrailingHtmlComments`. `maskCode` masks every fence the site's parser
  finds --- including one inside a blockquote or admonition, inside a list item,
  or one the definition-list plugin makes after `: ` --- plus every inline code
  span outside a fence. `applyPreRenderRewrites` takes the site's markdown-it
  instance and throws without one, because a bare parser would mask differently from the build.
- **Rendered-HTML rewrites** use `replaceOutsideCode` from
  [builder/code-guard.mjs](builder/code-guard.mjs), or compose their pattern
  from its `CODE_OR_PRE`, a leading alternative that consumes `<code>` and
  `<pre>` atomically, as `offline-rewrite.mjs`'s `HTML_COMBINED_RE`,
  `book.mjs`'s `IMG_SRC_RE_BOOK` and `counts.mjs`'s `SURVIVING_PLACEHOLDER_RE` do.
  The three that rewrite every page, `normaliseVoidTags` and `padEmptyCells`
  (`render.mjs`'s `applyPostRenderRewrites`) and `template.mjs`'s
  `injectAnchorHeadings`, go through `replaceOutsideCode` too. Code the
  renderer produced cannot match their patterns, since its `<` is escaped, but
  a `<pre>` or `<code>` written as raw HTML reaches them as written, and
  whitespace inside one is content.
- **Token rules**: an `md.core` rule that rewrites only `text` tokens, as
  `kramdown-dashes`, `kramdown-ellipsis` and `kramdown-possessive` do, never
  sees code, because markdown-it gives code spans, fences and indented blocks
  token types of their own (`code_inline`, `fence`, `code_block`).

**One gap is deliberate:** the chain does not
mask **indented** (4-space) code blocks or HTML blocks, since it calls `maskCode`
without `indented: true` (which masks indented blocks; HTML blocks are never
masked). `check_code_regions.mjs` *does* compare indented blocks, so a rewrite that
damages one is reported --- and must be fixed at the rewrite, not by widening the
mask. Code inside a raw HTML block is invisible to the gate: it is one `html_block`
token, which the comparison does not read.

`rewriteAdmonitions` deliberately runs **outside** the mask. It finds an
admonition's lines by their `>` markers and strips them, and a masked fence
inside an admonition takes its markers with it into the stash. It asks
`blockRegions`, with the same parser, which lines are code instead.

### Whitespace inside inline code is content

A documented value can be a padded string: [Partition](docs/Reference/Default/VBA/Interaction/Partition.md)
returns fixed-width, space-padded range strings, and `Debug.Print` with comma
separators emits print-zone padding that *is* the behaviour a page shows. A
pipeline that collapses whitespace runs inside inline `<code>` renders
`"  0:  4"` as `" 0: 4"` and states a wrong return value. Matching Jekyll's
compressor is not a reason to do it.

**The padding has to be in the page's source, and be the measured value.** A
pipeline can only preserve padding that reaches it. Check a claim about padding
by running the page's own sample through `tbrun`: a positive number carries a
leading space where its sign would be, and a trailing space, and a print zone is
thirteen spaces wide.

**An inline code span cannot carry a leading or trailing space naively.**
CommonMark strips one space from each end of a code span whose content is not all
spaces, so writing `` ` 1 … 3 ` `` renders as `1 … 3` --- the exact value the page
is trying to state, silently de-padded by the parser rather than by anything in
`builder/`. Double the outer spaces to defeat it, and verify in the built HTML
rather than by eye.

**Two behaviours, and neither works alone:**

- `compress.mjs` treats inline `<code>` as a preserved region as well as `<pre>`
  (`CODE_BLOCK_RE`), so the bytes survive compression.
- `custom/custom.scss` and `print.css` give inline code `white-space: pre-wrap`,
  because a browser collapses runs inside inline code by default. `pre-wrap`
  rather than `pre` so a long snippet still wraps instead of forcing a
  horizontal scroll.

**Making `<code>` a split boundary has one trap.** The collapse function trims
each segment's ends, which is harmless beside a block-level `<pre>` but, beside
an inline `<code>`, welds the code to the word next to it --- `a <code>x</code> b`
would come out as `ax b`. Trimming is conditional on which element bounds the
segment, so `<pre>` boundaries trim as they always did.

### The book refuses a stale source tree

Testing only that `docs\_site-pdf\book.html` **exists** is not enough: edit a
page, run `book.bat` without `build.bat`, and it would spend two minutes rendering
the *previous* book and report success. Nothing downstream can notice --- the PDF is
internally consistent, correctly paginated and correctly bookmarked, simply the
wrong book. So the freshness gate runs first:

```sh
node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html
```

**`--marker` is what makes that work on this tree.** The script identifies a tree
by its `index.html`, which every output tree has *except* `_site-pdf/` --- that one
holds a single `book.html`. Exit codes are the script's: **2** when the tree is
absent, **1** when it is older than `docs/`, `builder/` or `lib/`. The renderer that runs after it
has no 1, so `book.bat`'s 1 means a stale tree (or a failed `npm install`) and nothing about the render.

> **Batch detail:** `%ERRORLEVEL%` inside a parenthesised `if errorlevel 1 (...)`
> block expands when the block is **parsed**, not when it runs, so the value
> captured there is the one from before the check. The guard uses
> `goto :fail` and captures outside the block, which is the same shape
> `test.bat` uses, and for the same reason.

**Known false positive.** `DEFAULT_SOURCES` is `["docs", "builder", "lib"]` and
does not distinguish code from notes, so editing a `builder/PLAN-*.md` or
`REVIEW-*.md` marks every tree stale even though nothing in the build reads those
files. It errs toward refusing, which is the safe direction, and a rebuild is
~4 s --- but a pure note edit blocks a `book.bat` render until you rebuild.

**Which folders under `docs/` are outputs comes from one list.** A build given
`--dest docs/_site-basepath` writes `_site-basepath-offline` and
`_site-basepath-pdf` as well, so naming output folders one at a time misses some
and reads them as sources. The script skips the top-level folders that
`isOutputTree` in [lib/markdown-files.mjs](lib/markdown-files.mjs) names --- the
prefix list (`_site`, `_serve`, `_pdf`) the markdown walk uses --- and keeps only
`.git` and `node_modules` as names of its own. Serve mode prepares `_serve` alone
(`prepDest` in `builder/tbdocs.mjs`), so it leaves no `_serve-offline` or
`_serve-pdf` beside it.

**Files the build writes into a source folder are not sources.**
`page-baseline.json` and `symbol-baseline.json` (`IGNORED_FILES`) are written
after the tree, so counting them would mark every tree that added a page or a
heading stale on the next `check.bat`. `package-api.json` is an input: the build
reads it and it decides the bytes of `tB/symbols.json`.

### The code-region gate

[scripts/check_code_regions.mjs](scripts/check_code_regions.mjs) tokenises every
markdown file under `docs/` (`markdownFiles`), applies the real
`applyPreRenderRewrites` chain, re-tokenises, and compares the `fence` /
`code_block` / `code_inline` contents in order. Any difference fails. It also
checks on every page that `blockRegions`, which parses blocks only, finds exactly
the fences, code blocks and HTML blocks of the full parse. It is the gate on
`lib/markdown.mjs` and `lib/frontmatter.mjs` too (twelve module probes), and
holds the tools that ask them what is code: `builder/counts.mjs`'s count
validator, `builder/discover.mjs`'s warning about an unquoted frontmatter value
that ends in `#`, and `scripts/convert_em_dash_separators.mjs`'s dash normaliser.
Its other probes run `applyPostRenderRewrites` and `injectAnchorHeadings` over a
raw `<pre>` and `<code>`, which must come through as written. In `test.bat` and
both CI workflows; a few seconds, no browser, no built tree. Exit 0 clean, 1 a
code region changed or a probe failed, 2 the gate could not run.

```sh
node scripts/check_code_regions.mjs
node scripts/check_code_regions.mjs --verbose
node scripts/check_code_regions.mjs --self-test
```

Two details are essential. **It imports the chain rather than reconstructing
it**, so removing the mask from one rewrite changes what the gate runs and is
caught --- a gate that exercised `maskCode` alone would pass. And **its probes
ride along in the normal run**, because the corpus is clean: a sweep that finds
nothing is otherwise indistinguishable from a gate that has stopped detecting. A
rewrite moved outside the mask is caught by the seven region probes (one or two
per damage in the table above, and a doubled-backtick span) while the sweep still
reports zero. After changing the chain or `maskCode`, move one rewrite outside the
mask and confirm a probe fails.

**The mirror fault needs probes of its own.** A rewrite that mistakes prose for
code corrupts nothing --- the text is stashed and restored unchanged, so every
region matches --- it simply never runs, and the sweep structurally cannot see
that. The case to hold in mind is a fence marker in the middle of a line:
[Reference/Attributes.md](docs/Reference/Attributes.md)'s `[Description(...)]`
sample builds a Markdown string out of twinBASIC string literals, two of which
are triple-backtick markers. A scan that pairs an opening fence with the next
marker *anywhere* closes the `tb` fence on the literal and mis-pairs every fence
after it. The page's admonitions then render as the literal text `[!NOTE]` in a
plain blockquote, and every other gate stays green: the region comparison
matches, the links resolve and axe has no opinion about a blockquote.

CommonMark closes a fence only on a line holding nothing but the fence character,
repeated at least as often as in the opener --- a rule about lines, not something
to express as one regex over a document. That is why `rewriteAdmonitions` asks
`blockRegions`, with the site's parser, which lines are code. It sees a fence a
definition list's `: ` makes, and leaves an admonition alone when its `[!TYPE]`
line is in a region. A fence *inside* an admonition is a region too, and the
rewrite still strips its `>` markers.

The six admonition probes and two "chain leaves alone" probes assert this. An
admonition must still be converted between two ordinary fences, beside a fence
whose body holds a fence marker, after a tilde fence, after a fence closed by a
longer run, after a line whose backtick info string keeps it from opening a fence,
and before any fence, and must be left alone inside a fence the definition-list
plugin makes. **Writing one correctly is not obvious**: a mis-paired fence opener
swallows text only as far as the next fence marker, so a probe with no fence
*after* the admonition passes against the very fault it was written to catch. The
damage is always to the prose **between** two fences. The docs corpus holds no
tilde fence, so the sweep could never find a fault there.

**Nothing else can see this class.** The link check, integrity check, publish
allowlist, regex-safety gate and axe scan all pass on a tree with corrupted code
samples in the published book, because the corruption is inside `<code>` and none
of them looks there.

**Walk `docs/` for markdown with `markdownFiles`, never a private `readdir`.** A
recursive `readdir` that drops the output trees from its results afterwards has
already descended into `_serve`, which a running preview deletes and rewrites on
every rebuild, and dies with `ENOENT` when a folder vanishes under it.
[lib/markdown-files.mjs](lib/markdown-files.mjs) skips the top-level `_site*`,
`_serve*` and `_pdf*` folders before entering them.

### The page-count drift guard

**A floor is not a drift check.** A constant floor on the page count catches a
loss only while the site is close to it: a site of 914 pages that loses 37 to a
blanket `**/_*/**` exclude (the AppGlobalClassObject pages live under `_App/`)
still clears a floor written for 836, and the build says nothing at all. The
guard is `builder/page-baseline.json`, a committed artifact of the same kind as
`inter-metrics.json`, holding the page and static-file counts:
**a rise rewrites it and says so, a fall fails the build.** A tight floor is the
wrong alternative: it fires on every legitimate page removal, and a gate that
fires on ordinary work gets switched off. A rise costs nothing, so the number
stays current by itself; only a fall wants a decision, and
`--update-page-baseline` records it, in the same commit as the deletion.

Three rules about it, each a comment where it is decided: the first and third in
[builder/baseline.mjs](builder/baseline.mjs), which holds the comparison the page
and symbol guards share, and the second in
[scripts/check_tree_fresh.mjs](scripts/check_tree_fresh.mjs):

- **The baseline is keyed to a source tree.** `tbdocs` is not only run over
  `docs/`: `check_links_diff.mjs` spawns it over `test/fixtures/check-src`, three
  pages. Against an unkeyed baseline that build would report hundreds of pages
  missing --- a loud, confident, entirely wrong finding, on the one harness whose
  job is noticing when two front ends disagree. `GUARDED_SRC` names the tree the
  numbers are of and every other root is skipped in silence.
- **The build writes a tracked file, so `check_tree_fresh.mjs` must not count
  it.** The write happens after the tree, so without `IGNORED_FILES` the next
  `check.bat` would call the tree it had just built stale, on exactly the builds
  that added a page. The script's sources are "the inputs that decide the built
  bytes", and a baseline decides none of them. `dot` and `vendorAssets` write into
  `docs/` and escape this only because they run early.
- **Neither CI nor `--serve` may write.** A CI run that rewrote the file would
  record the drop it was asked to catch, so there a missing baseline is an error
  rather than a first run. `--serve` rebuilds on every save under `docs/`, so a
  page half-deleted in an editor would lower the baseline and a half-added one
  would raise it.

**Mark a build failed through `failBuild`, never by assigning
`process.exitCode`.** `failBuild` is the one place `runBuild` sets the found-problems
exit code (1), so no later step can clear it; a refused command line or a crash
exits 2 instead.

`scripts/check_page_baseline.mjs` is the gate on the gate, in `test.bat` and
both CI workflows: eleven probes against a scratch baseline, no browser, no
built tree. **It is not optional bookkeeping** --- the guard is silent on a
healthy tree, so a green build is exactly what a guard that has stopped working
produces. One probe replays the loss of 37 pages; the two that look redundant
(foreign source root, missing baseline under CI) each guard one of the rules
above.

### The book-coverage warnings

**A page no `_book.yml` entry selects is left out of the PDF without a word**
unless something says so. Some pages are out deliberately --- the 404 page,
Videos, Challenges --- and some would be left out by accident; with nothing
recorded, the two look the same. The book pass of the link check lists the links
from the book to pages it does not carry, but on a pass marked informational that
list reads as noise.

Two halves make it work, and the second is what makes the first worth having.
**`left_out:` in `_book.yml` names every page that is out on purpose, with a
`reason:`**, and `bookCoverage()` in `builder/book.mjs` warns about a page that is
in neither. Every page has an entry one way or the other, so a warning is a
decision nobody has made. Without the list the warning fires for dozens of pages
on every build, which is a warning nobody reads.

It reports five things, all empty on a consistent manifest: a page in no entry, a page
in the book and in `left_out:`, a book entry that selects no page, a `left_out:` entry
that matches none (a page renamed or deleted), and a landing or foreword URL no page
publishes at. **They are warnings, not failures**: the book is complete for the
manifest it was given, and a new page should not stop a build. They print under the
`pdf:` summary, and only when the book is built, so `--serve` does not repeat them on
every save. A link from the book to a page left out opens the website instead, and the
link check lists it as `OUT OF BOOK` --- which left-out pages the book still links to.

**"In the book" has to mirror `emitPart`, not the selectors.** A chaptered part's
`landing_page` and a `foreword_page` are emitted by URL rather than selected, so a
check that walked only `_chapters` would report the Features landing and the Packages
foreword on every build. The emission sites are listed once, in `bookCoverage()`, and
two probes pin them.

`scripts/check_book_coverage.mjs` is the gate on it, in `test.bat` and both CI
workflows: twelve probes over pages and a manifest built in memory, so it reads nothing
under `docs/`. Dropping the chaptered-landing site fails ten of the twelve; ignoring
`left_out:` fails nine.

### The symbol index, and the drift guard on its URLs

`tB/symbols.json` is written by the `symbolIndex` task
([builder/symbols.mjs](builder/symbols.mjs)) for the IDE help add-in; why it exists and
what it has to say is [WIP.HelpAddin.md, Stage 3](WIP.HelpAddin.md#stage-3-the-symbol-index-generated-by-the-docs-build).
Three decisions about the build side, each with the alternative it rules out:

- **The entries come from the rendered pages, and the packages only annotate them.** A
  URL is a `permalink:` as written or that plus the id the render gave a heading, read
  out of `renderedContent` --- never recomputed with `kramdownSlug`, which would
  disagree with the page on every pinned `{: #id }` and every `-1` duplicate. What the
  pages cannot say comes from `builder/package-api.json`, a committed snapshot. An
  index built the other way round, from the packages, would list thousands of symbols
  with no page and put the docs' own layout (Array filed under Information, the Styles
  classes documented though declared `Private`) in the wrong place.
- **The snapshot is committed, like `inter-metrics.json`, because making it needs a
  twinBASIC install.** `scripts/build_package_api.mjs` exports the packages through
  `scripts/lib/tb-packages.mjs` (shared with `census_attributes.mjs`), scans them with
  `scripts/lib/twin-api.mjs`, and writes ~255 KB. `package-api.json` is a build *input*, so `check_tree_fresh.mjs`
  watches it; `symbol-baseline.json` is an output and is in its `IGNORED_FILES`.
- **The heading scan is `indexOf`, not a regex.** `/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/`
  is cubic in the regex gate's census, and it runs over every reference page; the scan
  gives a byte-identical index.

**The drift guard is the page-count guard's shape applied to URLs**
([builder/symbol-baseline.mjs](builder/symbol-baseline.mjs)): `builder/symbol-baseline.json`
lists every URL the index has published, one to a line. A build that loses one fails and
names it; a build that adds one rewrites the list; CI, `--serve` and `--dry-run` never
write; a source root other than `docs` is skipped; `--update-symbol-baseline` records a
removal. It exists because **an anchor has no `redirect_from:`** --- a reworded member
heading moves its id, an installed add-in keeps the old URL, and the link check only
follows links made inside the site, so nothing else would notice. The failure message
leads with the usual fix, pinning the old id on the reworded heading.

`scripts/check_symbol_index.mjs` is the gate on all three pieces, in `test.bat` and both
CI workflows: forty-six probes on fixtures, no tree, no install. The scanner's probes are
the traps the packages' `.twin` sources contain; the derivation's are each a rule the real
site exercises only once or twice (`symbols:`, a section heading named like a member, the
ellipsis the typographer puts in a Core H1).

Two placement rules each hold a probe, because the wrong answer is a URL that leaves
the index or moves. **A heading is a member only when it is one level under its
Properties or Methods section and is not named like prose** (`### Example` and
`#### Example` among a class's members are prose). **Headings under a section of
members are placed before the rest**, so a member's URL is the heading under
Properties and not a prose section of the same name above it (`Screen.Fonts` is
`#fonts-1`, its `### Fonts`, not a prose `#fonts`).

### Build-time counts as named values

`{{tbdocs:pages}}` in a page renders as the number of pages the build
discovered. Designed in [builder/PLAN-counts.md](builder/PLAN-counts.md),
implemented in [builder/counts.mjs](builder/counts.mjs), documented for
contributors at [Authoring
Pages](docs/Documentation/Authoring.md#counts-the-build-fills-in). Twelve names
are live, and most of the prose is still hand-written.

`enumerations` counts the bullets in `Reference/Enumerations.md`'s alphabetical index
--- the `attributeAnchors` shape, a scan of one page's `rawContent`, legitimate because
the page *is* the list. It reads the index alone, so an entry added only to the
by-package section above it is still a half-edit that nothing reports.

`defaultPackages` and `builtInPackages` exist because `packages` alone cannot
express both sentences the site writes: all the packages, and the ones the IDE
ships but a project references on demand, for which "built-in" is reserved. A
sentence that says `{{tbdocs:builtInPackages}}` cannot drift into the other set's
number. **A count name is also a way of naming the set**, which is a second thing
it buys beyond not going stale.

**A name is a derivation over build state, never a constant.** A registry
holding a fixed page count would not remove the stale figure, only move it
from a page a contributor reads into a module nobody opens. If a number cannot
be derived it does not get a name.

**The substitution is a core rule over the inline token stream**, and that
layer is the whole design. Code is immune without a rule for it, because a
fence and an indented block are *block* tokens with no children and an inline
code span is a token type of its own --- so an inline walk cannot reach any of
them. On a corpus whose subject matter is programming languages that matters
more than it sounds: it is the same hazard as [Never rewrite markdown source
without knowing what is code](#never-rewrite-markdown-source-without-knowing-what-is-code),
avoided by construction rather than by a mask.

Three consequences of that design:

- **The walk has to recurse, for image alt.** An `image` token carries its alt
  as its own children, so a flat walk stops at the image. markdown-it's own
  `replacements` rule does not descend, which is why `kramdownDashesPlugin`
  recurses as well --- see [Source dashes](WIP.md#source-dashes).
- **A raw HTML block is unreachable, and source validation cannot see it.**
  `html_block` is one opaque token with no children, and a placeholder inside
  one has a perfectly good *name* --- so the validator passes it and the page
  publishes `{{tbdocs:pages}}` to readers, which is the exact failure the
  feature exists to prevent, arriving by a new route. It takes a second check
  on the other side of the render: `findSurvivingPlaceholder` scans the
  rendered HTML for a placeholder outside `<code>` and `<pre>`. One string
  scan per page, and it catches every cause rather than the anticipated ones.
- **`markdownInit` depends on `deriveRedirects`**, for `redirectStubs` alone.
  No cycle, but it is a task-graph edge that exists for a count.

**Validation is on main, before any worker renders**, because an unknown name
cannot be an error inside the rule: markdown-it emits an unrecognised inline
verbatim, so the rule would publish the typo rather than fail. The message
names the file, the line and the nearest match.

### The gate-list gate, and a gate that guarded one file

[scripts/check_gate_lists.mjs](scripts/check_gate_lists.mjs) compares
`check.bat` and `test.bat` against the two numbered lists on
[Tools and Scripts](docs/Documentation/Tools.md) --- membership, order, and the
step count each section states --- and then sweeps `README.md` and every page
under `docs/Documentation/` for a gate count asserted anywhere in prose. In
`test.bat` and both CI workflows; ~50 ms, no browser, no built tree.

**A gate scoped to one page guards one file, not a class.** One page, `Tools.md`,
owns the lists and the others cite it, but nothing enforces that convention: any
page can restate a count, wrongly. Hence the sweep over `README.md` and every
developer page.

Five shapes are recognised, each a form a count can take in prose:

| shape | example |
|---|---|
| possessive | ``two of `check.bat`'s four steps`` |
| verb | ``` `test.bat` is six more ```, ``` `check.bat` runs six further gates ``` |
| line-initial | `check.bat     # six more gates`, a table cell restating a wrapper |
| section total | a wrapper's own section opening *"Five gates that ..."* |
| back-reference | "four of the five", where the number matches the section's own total |

**The section total is why the sweep is per section.** A section can state the count where its only mention of the
wrapper is the indented command under its heading, so nothing on that line names a
wrapper and a line-by-line scan reports nothing. A section's subject is the
wrapper in its heading, else the wrapper on the first command line beneath it ---
and **the kramdown attribute block has to be skipped to get there**
(`{: #tests-of-the-toolchain }` sits between the two), or the rule silently skips
the one section it exists for.

Two judgement calls:

- **Only the *first* bare `N gates` in a wrapper's section counts as its
  total.** Later ones are legitimate subset claims. The cost runs the other
  way: a section that *opens* with a subset claim is reported, and the fix is
  to delete the number rather than correct it --- which is what the failure
  message says, because a subset count restated in prose is what drifts.
- **Verbs, not proximity.** Developer pages may quote a past wrong number as
  history, such as *"found `test.bat` documented as three gates when it had
  four"*. A proximity rule reads that true sentence as a false claim, so the
  verb list is explicit.

Which gates a wrapper runs is read by `scripts/lib/gate-roster.mjs`
(`gatesFromBat`); `check_ci_workflows.mjs` reads the wrappers and workflows
through the same module.

A change to the sweep is checked on real pages, not only on the probes: put a wrong
count back into a page, in each of the five shapes, and confirm the gate names every
site.

Thirteen of its twenty-four probes cover the sweep, eight positive and five
negative. One puts a fenced `## ` line, the shape of Wisdom.md's `staging.md`
example, inside a wrapper's section, since sections are split through
`lib/markdown.mjs`'s `splitOnMarker` and a heading-shaped line in a region starts
none.

**Its patterns are built with `new RegExp(...)` from shared constants, which is
why [check_regex_safety.mjs](#the-regex-safety-gate) reads constructed regexes**
--- a literals-only scan cannot see them, and a gate whose own patterns escape the
regex gate is not covered by it. The line-initial rule is two steps, anchored at
the head of the line and then a bounded search of what follows, because one regex
with a lazy gap and the count after it can divide the same text, which is
polynomial. Every one of the constructions classifies `safe`.

### The regex-safety gate

[scripts/check_regex_safety.mjs](scripts/check_regex_safety.mjs) parses every
`.mjs` under `builder/`, `scripts/`, `lib/`, `book/`, `eval/` and `wisdom/` with
acorn, takes the regex literals *and* every `new RegExp(...)` whose arguments the
source decides, and refuses any that can backtrack exponentially. In `test.bat`
and both CI workflows; ~10 s, no browser, no built tree. Exit 0 no exponential
regex, 1 one found or a probe wrong, 2 the gate could not run.

```sh
node scripts/check_regex_safety.mjs           # the gate
node scripts/check_regex_safety.mjs --census  # full classification, by kind
node scripts/check_regex_safety.mjs --self-test
```

**An exponential regex does not fail a build, it stops one.** A void tag's
attribute list written as `(?:\s+[^>/]+...)*` is exponential: `[^>/]` matches a
space and so does `\s`, so one run of attribute text can be partitioned in
exponentially many ways, and every partition is tried whenever the match fails ---
on any `/` the quoted-value alternative does not cover. An alt string such as
`Line/Column` in a page then hangs a render worker outright: its chunk stays
CLAIMED, the barriers behind it never reach a dep count of zero, and the build
prints its last line and sits there.

Nothing else catches it. The regex looks ordinary, the corpus passes for as long
as no page happens to contain the trigger, and the failure is a hang rather than
an error. This gate asks the question of the regex itself, so it does not wait for
content to ask it. Its probes hold two shapes:

- `[^>]*\/?` spells an optional slash that `[^>]` already covers, so each tag
  parses two ways and an html_block of *n* of them parses 2^n ways.
- Narrowing the name class to `[^\s>/]+` still leaves it exponential, because
  `[^\s>/]` still matches `=`, `"` and `'`, so an attribute can be consumed either
  by the name class or by the quoted-value alternative --- the same 2^n one level
  down, which hand-reasoning pronounces fixed. The witness is `<BR\tG=` followed
  by `""\t"=''\t=='/">'\tG=` repeated.

`VOID_TAGS_RE` and `STANDALONE_INLINE_HTML_RE` in
[builder/render.mjs](builder/render.mjs) therefore match to the first `>` and
nothing else --- `<(br|hr|...)\b([^>]*)>` --- with the trailing `/` removed
afterwards by `stripSelfClose()`. `[^>]*` and the `>` after it share no character,
so there is nothing to partition. A change to either regex is checked with
`compare_trees.mjs`, and must leave every void tag in the built site byte-identical.

> **Do not reintroduce a per-attribute sub-pattern in either of them.** Both
> natural ways of writing one are exponential.

**It gates on exponential only.** recheck also reports polynomial blowup, and
about one regex in eight here is polynomial --- nearly all the ordinary
`<tag[^>]*>` shape, low degree, on bounded input. A gate that failed on those would
fail on day one against dozens of findings, and a gate that fails on day one gets
switched off. Exponential is the class that turns a content edit into an
unbounded hang.

**Never quote a `degN` from a census.** The two backends disagree on it ---
the native agent says polynomial degree 2 where the pure-JavaScript fallback says
degree 3 on the same pattern --- while agreeing on exponential-or-not, which is
what the gate rests on, and on all eight classification probes. A degree is a
ranking aid for reading a census, not a number to write into prose.

Three implementation details are essential:

- **The self-test probes ride along inside the normal run**, not behind a
  `--self-test` nobody remembers. Eight classification probes, both directions:
  the three regexes this repo has shipped (including the incomplete fix),
  `^(a+)+$`, and four that must *not* be flagged --- plus nineteen fold probes,
  below. A green line saying "no exponential regex" is otherwise
  indistinguishable from a gate that has stopped detecting.
- **Parallelism comes from separate processes.** Importing `recheck` spawns one
  long-lived agent and feeds it requests one at a time, so awaiting several
  checks concurrently in a single process buys nothing --- measured at 42.5 s for
  concurrency 1 against 37.5 s for 16. Sharding across the CPUs, each shard its
  own process and its own agent, brings the run from tens of seconds to
  about ten.
- **recheck 4.5.0 cannot find its own backend on Windows**, and the failure is
  quiet. It locates both `recheck-jar` and `recheck-<platform>-<arch>` by
  stripping `/package.json` with a forward-slash regex from a path Node returns
  with backslashes, so the strip does nothing and it tries to execute
  `package.json`: an "Invalid or corrupt jarfile" line, then `spawn EFTYPE`, then
  a silent fall back to the pure-JS implementation --- correct, but roughly a
  hundred times slower. The script resolves the binary properly and sets
  `RECHECK_BIN` itself. If no native backend is found it says so in its summary
  line rather than just being slow. Both backends classify all eight probes
  identically, so the fallback is slower, not weaker.

Limitation: a regex recheck cannot decide comes back `unknown`, and an unknown is
an *unchecked* regex rather than a passing one (currently 0; `--census` prints them).

#### It reads constructed regexes too

**Building a pattern out of shared fragments is the ordinary way to avoid writing
a sub-pattern several times**, and a literals-only scan cannot see one --- so a gate
whose coverage you leave by writing idiomatic JavaScript is not covering much.
`check_gate_lists.mjs` builds all its patterns this way.

[scripts/lib/regex-fold.mjs](scripts/lib/regex-fold.mjs) folds a construction to
the pattern it builds, where the source decides that: string and template
literals, `+` concatenation, `String.raw`, a `const` declared once in the file,
`X.source` of a `const` regex, `A.join(sep)` over a `const` array of string
literals, and a ternary (checked as both branches). A `const` imported by a
relative path resolves too, when its module declares it with a string or regex
literal, which is how `builder/code-guard.mjs`'s `CODE_OR_PRE` reaches the patterns
composed from it. Most of the tree's constructions resolve, and the summary line
counts the rest; each one resolved is checked exactly as a literal is.

**One rule is a model rather than an exact fold, and it is marked as one.** A
call to an escaping helper --- `escapeRegExp(x)` and anything written to the same
shape, recognised by body rather than by name, in the file or in a module it
imports by a relative path, so no list of names is kept --- yields a fixed
character sequence with no regex operator in it, whatever `x` holds. Those fold
to a one-character placeholder and are tagged `modelled`, in the census and in
any finding. The gap: an escaped splice *inside a quantified alternation* could be ambiguous with a sibling branch in a way the
placeholder is not --- `(${esc}|a)+` is exponential when `esc` holds `a` and safe
when it holds `x`. A fixed sequence cannot be a quantified atom by itself, so the
surrounding pattern has to quantify a group containing it; none of the tree's
modelled calls does (`--census` lists them).

**The unresolved constructions are a list with a reason each, not a count.**
*`pattern` is a function parameter --- check the call sites* says where to look;
*`re` is a `let`, so its value is not fixed* says not to bother, because it is a
glob compiler building a pattern character by character. That is the difference
between a blind spot someone can close and one they can only watch.

Nineteen fold probes ride along in the normal run, eleven that must resolve to an
exact pattern and eight that must be refused with a reason. **The negative eight
are the ones that matter**: a folder that resolves less than it claims does not fail,
it moves constructions into the unresolved list, where nothing checks them and
the run goes green. A folder that resolves *more* than it can know is worse, and the negatives
are what say it does not.

### Remote-asset vendoring

[builder/vendor-assets.mjs](builder/vendor-assets.mjs) is a seed task (`vendorAssets`, modelled on `dot`) that scans the discovered markdown for YouTube video markers and GitHub user-attachment URLs, downloads anything missing into `docs/assets/thumbnails/` or `docs/assets/attachments/`, and hands the new files to the static-file copy pass. It is idempotent -- a present file is never re-fetched -- and the artifacts are committed to git exactly like the generated DOT SVGs.

**CI never downloads.** `process.env.CI` selects offline mode (`--fetch-assets` / `--no-fetch-assets` override it), and in offline mode a referenced-but-uncommitted asset throws rather than fetching. If CI could fetch, an author who wrote the markdown but forgot to commit the image would get a green build while the published site went on hotlinking a third party -- the exact failure the whole mechanism exists to prevent. A fetch *failure* in dev mode is softer: warn, keep building, and flip the exit code, so one dead video doesn't block a local preview.

The render-side halves are `videoLinkPlugin` (marked link -> poster frame + outbound link) and `remoteImagePlugin` (user-attachment `<img src>` -> the vendored copy), both in [builder/render.mjs](builder/render.mjs). Both emit **root-absolute** paths, because the PDF book flattens every page into one document and a page-relative src resolves against the book root there.
