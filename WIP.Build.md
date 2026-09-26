# twinBASIC Documentation --- The Build Pipeline and Its Gates

Every gate's failure history: what it caught, what shipped green past it, and
the rule that came out of that. Split out of [WIP.md](WIP.md), which keeps the
roster, the wrapper commands and the rules themselves under [The gates, and
where their internals are](WIP.md#the-gates-and-where-their-internals-are).

**Read this before adding a gate, changing one, or adding any rewrite over
markdown source or rendered HTML.** Most of what is here was written after
something shipped broken with every gate green over it, and the recurring shape
is a check that quietly stopped checking --- which reports exactly what a
healthy tree reports.

## The pipeline

**Before adding a fan-out to the task graph, read [why a dep count of zero does not mean the submits have run](builder/PLAN-sab-pull-scheduler.md#a-dep-count-of-zero-does-not-mean-the-submits-have-run).** A worker posts its result and *then* decrements its successors' dependency counts in shared memory, so a barrier's count can reach zero while results are still queued and the `submit()` calls that merge them into build state have not run --- the shared counter orders the work, not the state. A dynamic barrier must therefore list every chunk task in its `expected`, even when its own `execute()` ignores the inputs; that list is the only thing the scheduler checks before it lets the barrier proceed. `renderJoin` went without it and silently dropped ~6 pages from `search-data.json` on about one build in three, because the index is built by flattening a `new Array(N)` and `Array.prototype.flat()` skips holes without reporting anything. Two silent failures combining into one invisible one. Both halves are fixed, and every skip on the chunk-merge path that used to tolerate a missing piece now refuses to continue --- see [where the completeness checks are](builder/PLAN-sab-pull-scheduler.md#where-the-completeness-checks-are). Keep it that way: on this path, "the piece is missing" is a bug, not a case to handle.

**A sort key on this path must be total.** `discover()` fills `pages` from inside
a `Promise.all`, so a page is pushed when its `readFile` resolves, not in
`allFiles` order; `pages.sort(byName)` is stable and Jekyll's key is the
*basename*, so every tie kept that I/O completion order --- and ~111 folder-style
classes are all named `index.md`. That reordered the chunking and made
`search-data.json` differ between two builds of one commit, 545 of 3,724 entries
every time. `byName` breaks ties on `srcRel` now. Two builds of a commit are
byte-identical except for `BuildInfo.html` and `gantt.svg`, which record build
timings and cannot be.

**`scripts/compare_trees.mjs` is the check that relies on it.** It builds a
commit and the working tree from two git worktrees and compares all three trees
byte for byte, replacing those two regions and the PDF title page's build line,
which also differs when the sides are different commits or were built on
different days. Run it after any change to `builder/` that should leave the
output alone; a change meant to alter the output is checked the same way, and
what it reports should be the intended differences and nothing else. Build the
working tree from a checkout, never in place: under `core.autocrlf` a file a
tool has rewritten holds LF where a fresh checkout writes CRLF, and every file
the build copies verbatim then differs, which is what the tool's first version
found.

### A hung build times out and says where it hung

Readers get this at [When a build stops instead of
failing](docs/Documentation/Building.md), with a `--stall-timeout` row in
`Tools.md`'s flag table and an entry in `Builder.md`'s failure-mode list. Keep
those in step with any change here: a feature nobody can find is worth what an
absent one is worth.

**A task that a worker claims and never finishes wedges the whole graph in
silence.** Its successors' dep counts never drop, `_remaining` never reaches
zero, the scheduler's promise never settles, and the process sits there with its
last log line on screen --- no error, no exit code, nothing to grep. Nothing in
the SAB protocol can notice, because the scheduler is waiting on a message that
is not coming.

`Scheduler` now watches for that: if no task completes for `--stall-timeout`
seconds (default **120**, `0` disables), it prints what was outstanding and
fails the build. The default is deliberately generous --- the longest single task
here is worker cold boot at ~1.6 s, so a loaded CI box may be an order of
magnitude slower than the dev box without being called stalled.

The report splits the outstanding tasks three ways, because listing them
together buries the two names that matter under a dozen that do not:

- **Claimed by a worker that never returned** --- the cause. For a `render:i` or
  `flush:i` chunk it also prints the chunk's source pages, via an optional
  `describe()` on the task def that nothing but this report reads. "render:33
  never returned" is not actionable; the six paths under it are, because the
  fault is nearly always one page's content.
- **Runnable, but nothing picked it up** --- including the `F_PIN_TO_PRED` case,
  which is worth spelling out: a pinned `flush:i` can only run on the lane its
  `render:i` ran on, so when that lane is the wedged one the task is runnable and
  permanently unrunnable at once. Unlabelled it reads as a second, unrelated
  fault.
- **Blocked on a predecessor** --- the consequence, with the missing input names.

Two details worth knowing. `Worker.terminate()` *does* kill a thread spinning
inside a regex, so the abort really does end the process rather than adding a
second hang --- verified against the real fault. And under `--serve` the pool
outlives a rebuild, so a wedged worker would poison every later build (the
per-worker tasks wait on every lane); the stall error carries a `stalled` flag
and `serve.mjs` replaces the whole pool when it sees one. Replacing just the
wedged lane would mean identifying it, and the SAB records the lane a task
*completed* on, not the one that claimed it.

Folding `check.bat`'s gates into that same graph is designed in [builder/PLAN-checks.md](builder/PLAN-checks.md). Phase A, the link checker, is **implemented**: extraction runs inside `flush`, where both trees' final HTML is already in worker memory, so the build no longer writes ~270 MB out only to read it back and re-parse it. The `pick_a11y_sample.mjs --check` census and the axe scan's orchestration are follow-ons, seeded with measurements and open questions but not yet designed.

Historical engineering notes from the Jekyll era --- the original build pipeline, the HTML-compress plugin, the per-phase optimisation passes that preceded the JS port, the migration notes, and the Phase 11 parity-update retrospective --- live in [WIP.OldJekyll.md](WIP.OldJekyll.md).

## Tooling policy

### Tooling is JavaScript, and the two remaining `.py` files each have a reason

Everything under `scripts/`, `builder/`, `lib/`, `book/`, `eval/` and `wisdom/` is Node.js.
One trap the ports away from Python left behind: **a tool that rewrites a file must
preserve its line endings byte-exactly.** Python's `Path.read_text` / `write_text`
round-trip applies universal-newline translation, rewriting any LF file it touches to
CRLF on Windows --- a whole-file diff for a one-character fix. 24 of the tree's 906
markdown files are LF.

Two `.py` files stay, and neither is an oversight:

- **`scripts/impexp.py`** is not tooling. It is a published download, declared in
  `_config.yml`'s `bundle_extra` beside `impexp.mjs` and offered to readers on
  [Import/Export Tool](docs/Features/Packages/Import-export%20tool.md) as the Python edition
  of the same standalone tool. Porting it would delete a deliberate offering.
- **`scripts/build_fonts.py`** stays because the JavaScript build of HarfBuzz it would
  use produces wrong CFF2 metrics --- a one-line build-configuration defect in harfbuzzjs,
  documented with the evidence in [WIP.Fonts.md](WIP.Fonts.md).

One `.ps1` exists for a third kind of reason. **`scripts/lib/tb-launch.ps1`** is Win32
calls --- `CreateDesktop`, `CreateProcess` with `STARTUPINFO.lpDesktop`, and the job object
the IDE runs in (`CreateJobObject`, `AssignProcessToJobObject`) --- which Node cannot make
without a native FFI addon, and adding one for a handful of calls would mean
`npm install` no longer suffices to run the tooling. It is also not a script anyone runs:
`scripts/lib/tb-ide.mjs` reads the text and passes it through `-EncodedCommand`, so it never meets the
execution policy. See [Compiling a twinBASIC project without the IDE in front of
you](WIP.Harness.md#compiling-a-twinbasic-project-without-the-ide-in-front-of-you).

Two `.mjs` files also run a little PowerShell inline, for Windows state Node has no API
for, and neither adds a file: `scripts/tbrun.mjs` takes a process snapshot with
`Get-Process`, and `scripts/lib/tb-registry.mjs` reads and restores the IDE's registry
keys through .NET, because `reg.exe` mangles names outside the console code page. See
[What a run leaves in the registry](WIP.Harness.md#what-a-run-leaves-in-the-registry-and-putting-it-back).

The full account of the JavaScript port of `build_fonts.py` --- what works, the harfbuzzjs
build defect that blocks it, the evidence, the root cause in `hb-config.hh`, and what the
port must check for when it happens --- is in [WIP.Fonts.md](WIP.Fonts.md).

`lib/` — modules that every other tooling folder may import, and that import none of them.
`builder/` may not import `scripts/`, so code that both need lives here;
[lib/README.md](lib/README.md) states the rule, and `biome.jsonc` refuses an import that
breaks either one.

`wisdom/` — Discord knowledge-harvesting tool (three-phase: export → process → extract). Plans in `wisdom/PLAN-{1,2,3}.md`; implementation under `wisdom/`. Uses only Node.js built-in APIs. Running it is [WIP.Wisdom.md](WIP.Wisdom.md).

`eval/` — use-case evaluation of the developer documentation. `build_corpus.mjs` mirrors the
repository with every non-prose file stubbed unreadable, so "documentation only" is a property
of the tree rather than an instruction; `site_search.mjs` replays the site's real lunr index
and query logic, because search and navigation fail on different pages. `usecases.md` is the
catalogue, `protocol.md` is what an evaluator is given. **This asks whether the docs *work*,
which is orthogonal to whether they are accurate** — most findings so far involve sentences
that are individually true. Mine this file for cases: it is substantially a catalogue of
"this shipped broken and nobody noticed", and each entry is a use case waiting to be written.

## The gates, and the machinery they guard

### What belongs in test.bat rather than check.bat

**The split is by what a gate interrogates, not by what it happens to open.** `check_axe_patch_equiv.mjs` loads a built page, but only because its probe needs some document to run inside --- what it tests is the axe source patch, and it would be worth running against an empty `docs/`. That is the test: a new gate belongs in `test.bat` if it would still mean something with no documentation in the tree.

Older notes under `builder/PLAN-*.md` still place `check_publish_policy.mjs` and `check_axe_patch_equiv.mjs` in `check.bat`; both are in `test.bat`, and those notes are historical.

**Both CI workflows run every one of these scripts as its own step, unconditionally**, and always did --- CI never invoked the `.bat` files. So the split changes what a *local* content edit has to pay for and nothing about what reaches `staging`; a tooling regression cannot get in by someone skipping `test.bat`.

**The link and integrity check runs inside the build.** `build.bat` passes `--check-audit-index`, which implies `--check`, and the check walks the HTML on the worker lanes that produced it -- both trees' final strings are already decoded and in memory at `flush()`, so the ~270 MB the two trees weigh is never written out only to be read back. It also audits the tree index the build derives from its own records against what landed on disk -- the one direction the two-checker comparison structurally cannot see, since a spurious entry makes the oracle answer "exists" for a path that 404s in production. It catches broken intra-site links, missing pages, malformed `redirect_from` entries (the most common breakage when adding new pages or moving content between sections), duplicate ids, remote `<img src>`, badly nested tags, sitemap and search-index gaps, canonical mismatches, and (via a forbidden-prefix rule on the offline tree) any extracted link that still points at the live docs site after the offlinify rewrite. A clean `build.bat && check.bat` is the bar for "ready to commit".

A failing check never aborts the build: a broken link still produces a site you want on disk to inspect. It sets the exit code instead, using the same scheme `check_links.mjs` has always used -- 1 for link failures, 2 for integrity failures, 3 for both -- so CI can tell them apart.

The remote-asset rule fails the run on any `<img src>` resolving off-box (`http://`, `https://`, or protocol-relative `//host`). In the build it is unconditional -- `checkRemoteAssets: true` on both trees in `builder/check.mjs`'s `TREES` -- and is *not* reachable by a flag: `tbdocs` rejects `--check-remote-assets` as an unknown argument. That name belongs to the standalone `scripts/check_links.mjs`, where it is opt-in. The PDF pass over `book.html` is informational, so enforcement comes from the `_site/` pass -- every page in the book is also in `_site/`, making it a superset. The check is deliberately scoped to `<img>` only; `<iframe>` is untouched.

### The two link checkers, and the gate that catches divergence

[scripts/check_links.mjs](scripts/check_links.mjs) is still the tool for a tree the build did not produce -- a release zip, a bisect, someone else's artifact -- and both CI workflows still run it, though not directly: they invoke `check_links_diff.mjs`, which calls the script in-process as its `script` side (only the `fused` side spawns, and it spawns `tbdocs`). It is exercised only against the fixtures, never against the real trees. The pure core both front ends share lives in [builder/link-check.mjs](builder/link-check.mjs); the build-side plumbing is [builder/check.mjs](builder/check.mjs) and [builder/check-tree.mjs](builder/check-tree.mjs).

Two implementations of one check is exactly the shape that rots quietly: **a checker that silently checks less reports a clean pass.** [scripts/check_links_diff.mjs](scripts/check_links_diff.mjs) is the gate against that, and it plays the same role on this side that `check_a11y_fingerprint.mjs` plays on the axe side. Run it whenever `link-check.mjs`, `check.mjs` or `check_links.mjs` changes:

```sh
node scripts/check_links_diff.mjs --a script --b fused
```

It diffs the two implementations' findings category by category across the real invocations -- `_site/` with sitemap + search + canonical, `_site-offline/` with the forbidden-prefix rule, `book.html` with the same rule (there it collects the links that leave the book for the website, reported as `OUT OF BOOK`), and a `--baseurl` tree checked with the matching base path. It is deliberately *not* in `check.bat`: the script side costs ~3 s, which is the whole saving.

Two further modes matter:

- `--self-test` diffs the script against a deliberately corrupted side and fails unless the difference is reported. Everything else the harness prints reduces to "the two sides agreed", which is also what a harness comparing nothing says.
- `tbdocs --src docs --check-audit-index` diffs the tree index the build derives from its own records against what actually landed on disk. This is the one failure mode the findings comparison structurally cannot see: a *missing* index entry turns a working link into a reported break, which is loud, but a *spurious* one masks a real break, and on a clean site nothing links to a path that does not exist, so nothing would ever notice.

The harness carries a synthetic `fixture` case for the same reason -- the real site is clean, so every other case compares empty against empty in eight of the nine categories. The fixture provokes one fault of each kind and asserts the count, so a fixture that stops provoking one fails loudly instead of quietly going back to empty-vs-empty.

### The publish allowlist

**`discover()` files every non-page it finds under `docs/` as a static file, and
`write.mjs` copies it verbatim, so the source tree's shape *is* the site's shape.**
The only filter used to be `_config.yml`'s `exclude:`, and a denylist can only
refuse what someone thought to name in advance. Measured against the real config:
a scratch `.md` with no frontmatter, a `.bak`, a `.twin`, a `secrets.json`, a
`.docx`, a `deploy.pem`, `Thumbs.db` and a `build.log`, all planted in `docs/`,
every one published at a public URL on a green build.

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

Three details of the policy are load-bearing:

- **`SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` are separate sets, and must stay
  separate.** The build emits `.xml` and `.json`; a contributor has no business
  dropping either into `docs/`, and `.json` is among the extensions most worth
  refusing at source. Folding the two together would pass every other assertion
  in the self-test, so the self-test asserts the disjointness directly.
- **`.md` is deliberately absent from both.** A markdown file that reaches the
  check is one `gray-matter` found no frontmatter block in --- the
  AppGlobalClassObject shape, where the raw markdown was served verbatim for
  months. The two causes that come to mind first are both handled upstream: a
  **UTF-8 BOM** is stripped before parsing, and **malformed YAML** inside the
  block throws `Failed to parse frontmatter in <file>` from `discover.mjs`. What
  reaches here is a file with no block at all, or one where something precedes
  the opening `---` --- a blank line is enough --- so keep the message naming
  that and not the BOM.
- **`bundle_extra` is exempt by *path*, not by extension.** `_config.yml`
  declares `Features/Packages/downloads/impexp.py` and `impexp.mjs` with both
  ends spelled out, which is what makes them shippable. The same extension
  anywhere else still fails --- otherwise declaring one entry would quietly bless
  a whole type.

**A clean build says only that nothing in `docs/` is currently refused, which is
also what an allowlist widened until it refuses nothing says.** The interesting
assertion is the other one, and no build over a clean tree can make it, so
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
the point** --- the cost is paid once, by the person who knows they are adding it,
instead of being paid silently by whoever drops a key file into `docs/` three
years from now.

### Never rewrite markdown source without knowing what is code

`render.mjs` applies several kramdown-parity rewrites to **raw markdown**, before
markdown-it has parsed anything. A rewrite at that layer cannot tell prose from
code, and this site's subject matter *is* code. Four defects of exactly that
shape shipped, none of them caught by anything:

| rewrite | what it did |
|---|---|
| `stripLiquidRawTags` | removed `{% raw %}` inside fences, so no page could show the tag it existed to handle |
| `rewriteAdmonitions` body strip | ate the indentation of code inside an admonition |
| `encodeSpacesInMediaUrls` | turned `Items[1](a, b)` into `Items[1](a,%20b)` |
| `rewriteListItemSetextHeadings` | **deleted** a YAML sample's closing `---` and promoted the line above it to a heading |

`Reference/Default/VBA/Interaction/InputBox` shipped its `If`/`ElseIf`/`Else`
bodies flush left --- wrong control flow, in a language reference. Fixing the
admonition strip corrected **11 pages, not three**: the greedy `\s*` had also
been merging paragraphs inside admonition *prose*, which a code-focused audit
never thinks to look for.

**The same class exists on rendered HTML.** `book.mjs`'s chapter transforms
rewrite `id="`, `href="#` and `src="/` across a whole body. An inline code span
is emitted through `escapeHtmlMinimal`, which escapes only `&`, `<` and `>`, so
quotes survive as literal bytes and all three patterns match inside a sample.
Every one of the six exposed code spans in the corpus was corrupted in the
published PDF --- `<style id="jtd-nav-activation">` read
`<style id="ch-Documentation-Development-Pipeline-Stages-jtd-nav-activation">`.

Highlighted *blocks* escape this only by accident: the highlighter splits
attributes across `<span>` boundaries, so `src="/vs/loader.js"` never appears as
a contiguous byte sequence. Inline spans get no such treatment. **Do not rely on
that accident.**

Two mechanisms now exist, and a new rewrite must use one of them:

- **Source rewrites** go inside `applyPreRenderRewrites` in
  [builder/render.mjs](builder/render.mjs), between `maskCodeRegions` and its
  `restore`. The mask hides fenced blocks (backtick or tilde, any length) and
  inline code spans (any backtick-run length).
- **Rendered-HTML rewrites** use `replaceOutsideCode` in
  [builder/book.mjs](builder/book.mjs), or the same leading-alternation shape
  found in `offline-rewrite.mjs:299`, `pdf.mjs:138` and `book.mjs`'s
  `IMG_SRC_RE_BOOK`, which consume `<code>` and `<pre>` atomically.

**One gap is deliberate and stated rather than hidden:** `maskCodeRegions` does
not protect **indented** (4-space) code blocks, because telling one from a
list-item continuation needs block context a pre-render pass does not have, and
guessing would change how real list content renders. `check_code_regions.mjs`
*does* compare them, so a rewrite that damages one is reported --- and must be
fixed at the rewrite, not by widening the mask.

`rewriteAdmonitions` deliberately runs **outside** the mask. A fence inside an
admonition still carries its `> ` markers at that point, so the mask does not
see it as a fence, and the admonition rewrite is what strips those markers.

### Whitespace inside inline code is content

`compress.mjs` split the page on `<pre>` only, and collapsed every whitespace
run outside it --- including inside inline `<code>`. The comment said this
matched "the upstream behaviour", meaning Jekyll's. **That parity is not a
reason for anything any more, and it was destroying documented values.**

[Partition](docs/Reference/Default/VBA/Interaction/Partition.md) returns
fixed-width, space-padded range strings. Its page says so in prose --- "pads
each end of the range with leading spaces" --- and the table demonstrating it
rendered `" 0: 4"` where the function returns `"  0:  4"`. Thirteen spans on
that one page stated wrong return values, and the page contradicted itself.

Fixing it turned up three more of the same defect: `Features/Language/Pointers`
and `Features/Standard-Library/New-Functions` document what `Debug.Print` emits
with comma separators, where the print-zone padding *is* the behaviour being
shown, and both rendered it as single spaces.

> **Those two pages were still wrong after that fix**, because a pipeline can
> only preserve padding that reaches it and the padding was never in their
> *source*. Measured through `tbrun` against the pages' own samples, five claims
> were wrong: each missing the leading space a positive number carries where its
> sign would be, and the trailing space, and two showing a thirteen-space print
> zone as two spaces.
>
> **An inline code span cannot carry a leading or trailing space naively**, which
> is the trap that keeps this defect coming back. CommonMark strips one space
> from each end of a code span whose content is not all spaces, so writing
> `` ` 1 … 3 ` `` renders as `1 … 3` --- the exact value the page is trying to
> state, silently de-padded by the parser rather than by anything in `builder/`.
> Double the outer spaces to defeat it, and verify in the built HTML rather than
> by eye. Four sites were fixed this way and the rendered `<code>` now matches
> the measured output byte for byte.

**Two changes, and neither works alone:**

- `compress.mjs` now treats inline `<code>` as a preserved region as well as
  `<pre>`, so the bytes survive compression.
- `custom/custom.scss` and `print.css` give inline code `white-space: pre-wrap`,
  because a browser collapses runs inside inline code by default. `pre-wrap`
  rather than `pre` so a long snippet still wraps instead of forcing a
  horizontal scroll --- measured at the mobile viewport: no page overflow, and
  the table's own wrapper scrolls as it already did.

**One trap in making `<code>` a split boundary**, worth knowing if this is ever
touched again. The collapse function trimmed each segment's ends, which was
harmless when the only boundaries were block-level `<pre>`. Adding inline
`<code>` created boundaries *inside* sentences, and trimming there welds the
code to the word beside it --- `a <code>x</code> b` came out as `ax b`. Trimming
is now conditional on which element bounds the segment, so `<pre>` boundaries
stay byte-identical to what they produced before.

Blast radius across the whole site was 6 pages plus the two stylesheets; every
change was a padded value being restored.

### The book refuses a stale source tree

Testing only that `docs\_site-pdf\book.html` **exists** is not enough: edit a
page, run `book.bat` without `build.bat`, and it spends two minutes rendering the
*previous* book and reports success. Nothing downstream can notice --- the PDF is
internally consistent, correctly paginated and correctly bookmarked, simply the
wrong book. So the freshness gate runs first:

```sh
node scripts/check_tree_fresh.mjs --tree docs/_site-pdf --marker book.html
```

**`--marker` is what makes that work on this tree.** The script identifies a tree
by its `index.html`, which every output tree has *except* `_site-pdf/` --- that one
holds a single `book.html`. Exit codes are the script's: **2** when the tree is
absent, **1** when it is older than `docs/` or `builder/`.

> **One batch detail that is easy to get wrong:** `%ERRORLEVEL%` inside a parenthesised `if errorlevel 1 (...)`
> block expands when the block is **parsed**, not when it runs, so the value
> captured there is the one from before the check. The guard uses
> `goto :fail` and captures outside the block, which is the same shape
> `test.bat` already uses, and for the same reason.

**Known false positive, inherited rather than introduced.** `DEFAULT_SOURCES` is
`["docs", "builder"]` and does not distinguish code from notes, so editing a
`builder/PLAN-*.md` or `REVIEW-*.md` marks every tree stale even though nothing
in the build reads those files. It errs toward refusing, which is the safe
direction, and a rebuild is ~4 s --- but wiring the check into `book.bat` means
a pure note edit now also blocks a render until you rebuild.

**Which folders under `docs/` are outputs comes from one list.** The script used to
name them one at a time, and missed four that sat beside the ones it named, all
read as sources. Two were real outputs: a build given `--dest docs/_site-basepath`
writes `_site-basepath-offline` and `_site-basepath-pdf` as well. The other two,
`_serve-offline` and `_serve-pdf`, should never have existed. `prepDest` in
`builder/tbdocs.mjs` prepared `<dest>-offline` and `<dest>-pdf` for every run, so
serve mode --- which runs neither pass --- recreated both, empty, on every rebuild. It
now prepares `_serve` alone, and the two were deleted. All four were empty, so
nothing had gone wrong yet; a file planted in one made the old script call a fresh
tree stale. It now skips the top-level folders that `isOutputTree` in
[lib/markdown-files.mjs](lib/markdown-files.mjs) names --- the
prefix list the markdown walk uses --- and keeps only `.git` and `node_modules` as
names of its own.

### The code-region gate

[scripts/check_code_regions.mjs](scripts/check_code_regions.mjs) tokenises every
markdown file, applies the real `applyPreRenderRewrites` chain, re-tokenises,
and compares the `fence` / `code_block` / `code_inline` contents in order. Any
difference fails. In `test.bat` and both CI workflows; ~2 s, no browser, no
built tree.

```sh
node scripts/check_code_regions.mjs
node scripts/check_code_regions.mjs --verbose
node scripts/check_code_regions.mjs --self-test
```

Two details are load-bearing. **It imports the chain rather than reconstructing
it**, so removing the mask from one rewrite changes what the gate runs and is
caught --- a gate that exercised `maskCodeRegions` alone would have passed. And
**its seven probes ride along in the normal run**, each a defect this repository
actually shipped, because the corpus is clean: a sweep that finds nothing is
otherwise indistinguishable from a gate that has stopped detecting. Verified by
reverting a rewrite to run outside the mask, which the probes catch while the
906-file sweep still reports zero.

**Nothing else can see this class.** The link check, integrity check, publish
allowlist, regex-safety gate and axe scan all passed green on a tree with six
corrupted code samples in the published book, because the corruption is inside
`<code>` and none of them looks there.

**Its sweep used to crash while `serve.bat` was running**, over nothing in any page.
The walk was a recursive `readdir` of `docs/` that dropped the output trees from
its results afterwards, so it had already descended into `_serve` --- which a
running preview deletes and rewrites on every rebuild --- and died with `ENOENT`
when a folder vanished under it. `test.bat` failed that way on 2026-09-23. Two
other tools carried their own copies of the same walk, and one of them did not
skip the output trees at all, so all three now call
[lib/markdown-files.mjs](lib/markdown-files.mjs), which skips
`_site*`, `_serve*` and `_pdf*` before entering them. Measured against a live
preview: the old walk hit `ENOENT` during a rebuild, while the new one opens 142
folders, none of them inside an output tree, returns the same 910 files, and
stayed clean through 642 walks and five full gate runs timed into rebuilds.

### The page-count drift guard

`tbdocs.mjs` ended with `if (pages.length < 836)`, described in
[Builder.md](docs/Documentation/Builder.md) as catching "a discover-rule
regression that silently drops content". **A floor is not a drift check**, and
this one had stopped being even a loose one: the constant was written when the
site had 836 pages, the site has **908**, and the loss it exists to catch was
**37**. Repeat the `_App` disaster today --- the blanket `**/_*/**` exclude that
swallowed AppGlobalClassObject's 37 pages --- and the count lands at 871, well
clear of 836, and the build says nothing at all.

The baseline is now `builder/page-baseline.json`, a committed artifact of the
same kind as `inter-metrics.json`: **a rise rewrites it and says so, a fall
fails the build.** Raising the constant to a tight floor was the obvious
alternative and is wrong --- it would fire on every legitimate page removal, and
a gate that fires on ordinary work gets switched off. A rise costs nothing, so
the number stays current by itself; only a fall wants a decision, and
`--update-page-baseline` is how it is recorded, in the same commit as the
deletion.

**Three things about it were learned by getting them wrong**, and each is now a
comment in [builder/page-baseline.mjs](builder/page-baseline.mjs):

- **The baseline has to be keyed to a source tree.** `tbdocs` is not only run
  over `docs/`: `check_links_diff.mjs` spawns it over
  `test/fixtures/check-src`, three pages, to compare the two link checkers.
  Against an unkeyed baseline that build reports **905 pages missing** --- a
  loud, confident, entirely wrong finding, on the one harness whose whole job is
  noticing when two implementations disagree. `GUARDED_SRC` names the tree the
  numbers are of and every other root is skipped in silence.
- **The build now writes a tracked file, and `check_tree_fresh.mjs` watches
  `builder/`.** The write happens after the tree, so without an exclusion the
  very next `check.bat` would call the tree it had just built stale --- on
  exactly the builds that added a page. `IGNORED_FILES` closes it, and the
  reasoning is not a special case: the script's own comment says its sources are
  "the inputs that decide the built bytes", and a baseline decides none of them.
  `dot` and `vendorAssets` write into `docs/` and escape this only because they
  run early.
- **Neither CI nor `--serve` may write.** A CI run that rewrote the file would
  record the drop it was asked to catch, so there a missing baseline is an error
  rather than a first run. `--serve` rebuilds on every save under `docs/`, so a
  page half-deleted in an editor would lower the baseline and a half-added one
  would raise it.

**OR the exit code on this path, never assign it.** Plain `process.exitCode = 1`
after the link check has already set bits 1 and 2 reports only the later failure.

`scripts/check_page_baseline.mjs` is the gate on the gate, in `test.bat` and
both CI workflows: eleven probes against a scratch baseline, no browser, no
built tree. **It is not optional bookkeeping** --- the guard is silent on a
healthy tree, so a green build is exactly what a guard that has stopped working
produces. Reverting the comparison to the old floor fails three of the eleven,
including the `_App` replay; the two probes that look redundant (foreign source
root, missing baseline under CI) are the two that caught the real bugs above.

#### The mirror fault: a rewrite that does not fire

The gate above compares code regions, and there is a second way the same
confusion shows up that it **structurally cannot see**. A rewrite that mistakes
prose for code does not corrupt anything --- the text is stashed and restored
unchanged, so every region matches --- it simply never runs.

`rewriteAdmonitions` stashed fences with one regex that paired an opening fence
with the next fence marker **anywhere**, including one in the middle of a line.
[Reference/Attributes.md](docs/Reference/Attributes.md) has exactly that: the
`[Description(...)]` entry's sample builds a Markdown string out of twinBASIC
string literals, two of which are ``` markers. The `tb` fence around it closed on
the literal, and every pairing for the rest of the file was off by one --- so
from there on the stasher had prose and code the wrong way round.

**All six of that page's admonitions shipped as the literal text `[!NOTE]`**,
inside a plain blockquote, on one page of 869. Every gate was green: the region
comparison matched, the link check passed, and axe has no opinion about a
blockquote. It was found only because a new entry added to that page rendered
the same way and looked wrong.

The stasher is a line scan now --- CommonMark closes a fence on a line that is
only the fence character, repeated at least as often as in the opener, which is
a rule about lines rather than something to express as one regex over a whole
document. Measured across the site, the fix changes four files: `Attributes.html`,
`search-data.json` (which indexes it), and the two that record build timings.

The same stasher had a second way to fail: it recognised *backtick* fences only,
reasoning that `maskCodeRegions` knows about tildes --- but `rewriteAdmonitions` runs
**outside** the mask by design, so nothing protected a tilde fence. `FENCE_OPEN_RE`
accepts either character now and closes on the one that opened. `docs/` contains no
tilde fence, which is why the corpus sweep could never have found it --- the same
blind spot that makes the ADMONITION_PROBES necessary.

Five probes in `check_code_regions.mjs` assert this direction, and **writing one
correctly is not obvious**: a mis-paired opener swallows text only as far as the next
fence marker, so a probe with no fence *after* the admonition passes against the very
stasher it was written to catch. The damage is always to the prose **between** two
fences.

### The book-coverage warnings

**A page no `_book.yml` entry selected was left out of the PDF without a word**, and
by September 2026 that had taken 52 pages out of the book. Some were deliberate ---
the 404 page, Videos, Challenges --- and some were not: Data Types, Enumerations and
twinBASIC Additions are as plainly reference material as anything the book carries,
and nothing recorded why they were missing. The IDE section's pages with real prose
went the same way as its placeholders. The only trace was the book pass of the link
check, which listed the 32 links from the book to pages it did not carry as `BROKEN`,
on a pass marked informational --- so the list read as noise.

Two halves fixed it, and the second is what makes the first worth having. **`left_out:`
in `_book.yml` names every page that is out on purpose, with a `reason:`**, and
`bookCoverage()` in `builder/book.mjs` warns about a page that is in neither. Every
page has an entry one way or the other, so a warning is a decision nobody has made.
Without the list the warning fired for 37 pages on every build, which is a warning
nobody reads after the first week.

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
  `scripts/lib/tb-packages.mjs` (shared with `census_attributes.mjs`, whose output was
  verified identical across the move), scans them with `scripts/lib/twin-api.mjs`, and
  writes 255 KB. `package-api.json` is a build *input*, so `check_tree_fresh.mjs`
  watches it; `symbol-baseline.json` is an output and is in its `IGNORED_FILES`.
- **The heading scan is `indexOf`, not a regex.** `/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/`
  is cubic in the regex gate's census, and it runs over every reference page; the scan
  gives a byte-identical index.

**The drift guard is the page-count guard's shape applied to URLs**
([builder/symbol-baseline.mjs](builder/symbol-baseline.mjs)): `builder/symbol-baseline.json`
lists every URL the index has published, one to a line; a build that loses one fails and
names it; a build that adds one rewrites the list; CI, `--serve` and `--dry-run` never
write; a source root other than `docs` is skipped; `--update-symbol-baseline` records a
removal. It exists because **an anchor has no `redirect_from:`** --- a reworded member
heading moves its id, an installed add-in keeps the old URL, and the link check only
follows links made inside the site, so before this nothing noticed. The failure message
leads with the usual fix, pinning the old id on the reworded heading.

`scripts/check_symbol_index.mjs` is the gate on all three pieces, in `test.bat` and both
CI workflows: forty-six probes on fixtures, no tree, no install. The scanner's probes are
the traps the BETA 983 packages actually contain; the derivation's are each a rule that the
real site exercised only once or twice (`symbols:`, the section heading named like a
member, the ellipsis the typographer puts in a Core H1 --- whose absence from the rules
was found only because `Do…Loop`'s first heading never split).

**The guard caught the first two defects it met, before either was committed.** Six
`### Example` and `#### Example` headings, placed among a class's members, went into the
index as members named `Example` by the rule that a heading under Properties or Methods is
a member. With that rule narrowed to headings one level under the section and not named
like prose, the six URLs left the index and the build failed naming them. Then the
snapshot learned the members of VB's `Screen`, declared on a private interface, and
`Screen.Fonts` moved from `#fonts-1`, its `### Fonts` under Properties, to `#fonts`, a
prose section above it --- because the first heading of a member's name on the page won.
The build named that URL too, and the fix, placing headings under a section of members
first, moved three more entries back from prose sections to their properties (`Style` on
ComboBox and ListBox, `CheckBoxes` on TreeView). A probe now holds each shape.

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

`defaultPackages` and `builtInPackages` exist because `packages` alone could not
express either sentence the site writes: `Reference/index.md` called all thirteen
"built-in" while `Reference/Packages.md` reserved the word for the ten, both
arithmetically right, and no reader could tell that from either page. **A count name
is also a way of naming the set**, which is a second thing it buys beyond not going
stale.

**A name is a derivation over build state, never a constant.** A registry
holding `pages: 908` would not have removed the stale figure, only moved it
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

Three things fell out of building it that the design had not predicted:

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
- **`markdownInit` gained a dependency on `deriveRedirects`**, for
  `redirectStubs` alone. No cycle, but it is a task-graph edge added for a
  count.

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

**A gate scoped to one page guards one file, not a class.** The first version read
`Tools.md` alone, on the convention that one page owns the lists and the others cite
it --- and `Building.md` and `README.md` were already restating them, wrong, in the
commit that shipped the gate green. Hence the sweep.

Four shapes are recognised, each taken from a site that really published:

| shape | example |
|---|---|
| possessive | ``two of `check.bat`'s four steps`` |
| verb | ``` `test.bat` is six more ```, ``` `check.bat` runs six further gates ``` |
| line-initial | `check.bat     # six more gates`, a table cell restating a wrapper |
| section total | a wrapper's own section opening *"Five gates that ..."* |

**The fourth is why the sweep is per section, and it is the one a first attempt
misses.** `Building.md:248` states the count in a section whose only mention of
the wrapper is the indented command under its heading, so nothing on that line
names a wrapper and a line-by-line scan reports nothing. A section's subject is
the wrapper in its heading, else the wrapper on the first command line beneath
it --- and **the kramdown attribute block has to be skipped to get there**
(`{: #tests-of-the-toolchain }` sits between the two), which is a one-line
detail that silently cost the rule the only section it was written for.

Two judgement calls worth keeping:

- **Only the *first* bare `N gates` in a wrapper's section counts as its
  total.** Later ones are legitimate subset claims. The cost runs the other
  way: a section that *opens* with a subset claim is reported, and the fix is
  to delete the number rather than correct it --- which is what the failure
  message says, because that is the editorial remedy the round asked for.
- **Verbs, not proximity.** `Tools.md` narrates this gate's own history,
  including the numbers that were wrong at the time. A proximity rule read
  *"found `test.bat` documented as three gates when it had four"* as a false
  claim, so the verb list is explicit.

Twelve of its eighteen probes cover the sweep, seven positive and five
negative, each taken from the real corpus. The verification that means anything
is reverting the offending pages to the commit that shipped them and confirming
the gate names every site.

**Its six patterns are built with `new RegExp(...)` from shared constants, and that
is what made [check_regex_safety.mjs](#the-regex-safety-gate) read constructed
regexes** --- as literals-only it could not see them, and the line-initial rule was
in fact polynomial (a lazy gap and the count after it could divide the same text).
It is two steps now, anchored at the head of the line with no division to try. All
six are `safe`, and all six are checked on every run.

### The regex-safety gate

[scripts/check_regex_safety.mjs](scripts/check_regex_safety.mjs) parses every
`.mjs` under `builder/`, `scripts/`, `lib/`, `book/`, `eval/` and `wisdom/` with
acorn, takes the regex literals *and* every `new RegExp(...)` whose arguments the
source decides, and refuses any that can backtrack exponentially. In `test.bat`
and both CI workflows; ~5 s, no browser, no built tree.

```sh
node scripts/check_regex_safety.mjs           # the gate
node scripts/check_regex_safety.mjs --census  # full classification, by kind
node scripts/check_regex_safety.mjs --self-test
```

**An exponential regex does not fail a build, it stops one.** `VOID_TAGS_RE` in
[builder/render.mjs](builder/render.mjs) spelled a void tag's attribute list as
`(?:\s+[^>/]+...)*`. `[^>/]` matches a space and so does `\s`, so one run of
attribute text could be partitioned in exponentially many ways, and every
partition got tried whenever the match failed --- which it did on any `/` the
quoted-value alternative did not cover. Two alt strings in `docs/` contained one,
`Line/Column` and `/Packages/WinDevLib`, and each hung a render worker outright:
two of 152 chunks stayed CLAIMED, the barriers behind them never reached a dep
count of zero, and the build printed its last line and sat there. Three such
processes accumulated in one session before the cause was found.

Nothing existing could have caught it. The regex looks ordinary, the corpus
passed for as long as no page happened to contain the trigger, and the failure
was a hang rather than an error. This gate asks the question of the regex itself,
so it does not wait for content to ask it.

**Two things it found immediately, and both are the argument for keeping it.**
`STANDALONE_INLINE_HTML_RE`, sitting in the same file, was exponential too and
nobody knew: `[^>]*\/?` spells an optional slash that `[^>]` already covers, so
each tag parses two ways and an html_block of *n* of them parses 2^n ways ---
measured at 22 tags in 106 ms, rising ~4x per two added tags. And the *first*
fix for `VOID_TAGS_RE` --- narrowing the name class to `[^\s>/]+`, which does
stop both real alt strings --- was **still exponential**, because `[^\s>/]` still
matches `=`, `"` and `'`, so an attribute could be consumed either by the name
class or by the quoted-value alternative. That is the same 2^n one level down,
and hand-reasoning had pronounced it fixed. The witness is `<BR\tG=` followed by
`""\t"=''\t=='/">'\tG=` repeated: 186 characters took 97 ms.

Both regexes now match to the first `>` and nothing else ---
`<(br|hr|...)\b([^>]*)>` --- with the trailing `/` removed afterwards by
`stripSelfClose()`. `[^>]*` and the `>` after it share no character, so there is
nothing to partition. Verified byte-identical against every void tag in the built
site (4,137 distinct tags) and against a full two-tree build diff.

> **Do not reintroduce a per-attribute sub-pattern in either of them.** It was
> written that way, fixed that way, and was wrong both times.

**It gates on exponential only.** recheck also reports polynomial blowup, and
about a fifth of the patterns here are polynomial --- nearly all the ordinary
`<tag[^>]*>` shape, degree 2, on bounded input. A gate that failed on those would
fail on day one against fifty findings, and a gate that fails on day one gets
switched off. Exponential is the class that turns a content edit into an
unbounded hang.

**Never quote a `degN` from a census.** The two backends disagree on it --- the
native agent says polynomial degree 2 where the pure-JavaScript fallback says
degree 3 on the same pattern --- while agreeing on exponential-or-not, which is
what the gate rests on, and on all eight classification probes. A degree is a
ranking aid for reading a census, not a number to write into prose.

Three implementation details are load-bearing:

- **The self-test probes ride along inside the normal run**, not behind a
  `--self-test` nobody remembers. Eight classification probes, both directions:
  the three regexes this repo actually shipped (including the incomplete fix),
  `^(a+)+$`, and four that must *not* be flagged --- plus fourteen fold probes,
  below. A green line saying "no exponential regex" is otherwise
  indistinguishable from a gate that has stopped detecting.
- **Parallelism comes from separate processes.** Importing `recheck` spawns one
  long-lived agent and feeds it requests one at a time, so awaiting several
  checks concurrently in a single process buys nothing --- measured at 42.5 s for
  concurrency 1 against 37.5 s for 16. Sharding across the CPUs, each shard its
  own process and its own agent, is what takes it from ~19 s to ~4 s.
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

Honest limitation, which should not be papered over: a regex recheck cannot
decide comes back `unknown`, and an unknown is an *unchecked* regex rather than a
passing one (currently 0; `--census` prints them).

#### It reads constructed regexes too

**Building a pattern out of shared fragments is the ordinary way to avoid writing
a sub-pattern six times**, and a literals-only scan cannot see one --- so a gate
whose coverage you leave by writing idiomatic JavaScript is not covering much.
`check_gate_lists.mjs` has six such patterns and one of them was polynomial; while
the scan counted constructions in `--census` instead of folding them, nothing in
the repository would have said so.

[scripts/lib/regex-fold.mjs](scripts/lib/regex-fold.mjs) folds a construction to
the pattern it builds, where the source decides that: string and template
literals, `+` concatenation, `String.raw`, a `const` declared once in the file,
`X.source` of a `const` regex, `A.join(sep)` over a `const` array of string
literals, and a ternary (checked as both branches). Twelve of the tree's
eighteen constructions resolve; each is then checked exactly as a literal is.

**One rule is a model rather than an exact fold, and it is marked as one.** A
call to an escaping helper --- `escapeRegExp(x)` and anything written to the same
shape, recognised by body rather than by name so all three copies in the tree are
covered without a list --- yields a fixed character sequence with no regex
operator in it, whatever `x` holds. Those fold to a one-character placeholder and
are tagged `modelled`, in the census and in any finding. The gap is stated rather
than hidden: an escaped splice *inside a quantified alternation* could be
ambiguous with a sibling branch in a way the placeholder is not --- `(${esc}|a)+`
is exponential when `esc` holds `a` and safe when it holds `x`. A fixed sequence
cannot be a quantified atom by itself, so the surrounding pattern has to quantify
a group containing it; none of the three in the tree does.

**The remaining six are a list with a reason each, not a count.** *`pattern` is a
function parameter --- check the call sites* says where to look; *`re` is a `let`,
so its value is not fixed* says not to bother, because it is a glob compiler
building a pattern character by character. That is the difference between a blind
spot someone can close and one they can only watch.

Fourteen more probes ride along in the normal run, eight that must resolve to an
exact pattern and six that must be refused with a reason. **The negative six are
the ones that matter**: a folder that resolves less than it claims does not fail,
it moves constructions into the unresolved list, where nothing checks them and
the run goes green --- which is what the gate looked like before it could fold at
all. A folder that resolves *more* than it can know is worse, and the negatives
are what say it does not.

### Remote-asset vendoring

[builder/vendor-assets.mjs](builder/vendor-assets.mjs) is a seed task (`vendorAssets`, modelled on `dot`) that scans the discovered markdown for YouTube video markers and GitHub user-attachment URLs, downloads anything missing into `docs/assets/thumbnails/` or `docs/assets/attachments/`, and hands the new files to the static-file copy pass. It is idempotent -- a present file is never re-fetched -- and the artifacts are committed to git exactly like the generated DOT SVGs.

**CI never downloads.** `process.env.CI` selects offline mode (`--fetch-assets` / `--no-fetch-assets` override it), and in offline mode a referenced-but-uncommitted asset throws rather than fetching. If CI could fetch, an author who wrote the markdown but forgot to commit the image would get a green build while the published site went on hotlinking a third party -- the exact failure the whole mechanism exists to prevent. A fetch *failure* in dev mode is softer: warn, keep building, and flip the exit code, so one dead video doesn't block a local preview.

The render-side halves are `videoLinkPlugin` (marked link -> poster frame + outbound link) and `remoteImagePlugin` (user-attachment `<img src>` -> the vendored copy), both in [builder/render.mjs](builder/render.mjs). Both emit **root-absolute** paths, because the PDF book flattens every page into one document and a page-relative src resolves against the book root there.
