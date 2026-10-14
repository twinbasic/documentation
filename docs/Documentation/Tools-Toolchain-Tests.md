---
title: Toolchain Tests
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 3
permalink: /Documentation/Development/Tools-Toolchain-Tests
---

# Toolchain Tests
{: .no_toc }

Tests the toolchain itself rather than the documentation: the gates `test.bat` runs, which would still mean something with no page in the tree. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

* TOC goes here
{:toc}

## check_publish_policy.mjs
{: #check-publish-policy }

    node scripts/check_publish_policy.mjs [--src <path>]

The gate on the publish allowlist. Everything under `docs/` that is not a page is copied into the published site verbatim, so the source tree's shape is the site's shape. [`builder/publish-policy.mjs`](Builder#module-map) lists the types that may be published, and the build enforces it at the source inventory and at each output tree's inventory. A finding there aborts the build instead of setting an exit code: a tree with a private key in it must not be left lying around.

A clean build shows only that nothing in `docs/` is refused, which an allowlist widened until it refuses nothing would show too. So this gate asserts the other half:

- thirteen named probes must stay refused: a `.bak`, a `.pem`, a `.docx`, a `.twin`, a `secrets.json`, a `Thumbs.db`, a frontmatter-less `.md`, an extensionless `LICENSE`, a dotfile;
- six must keep publishing: `.png`, `.PNG`, `.woff2`, `.txt`, `.html`, `CNAME`;
- `bundle_extra` exemptions stay scoped to the exact declared path, not the extension everywhere;
- the [help add-in's project file](Tools-Build#the-help-add-ins-project-file) publishes from the output trees at its declared path, and a `.twinproj` nowhere else;
- `SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` stay disjoint. Folding them together would make a stray `docs/secrets.json` publishable without failing any other assertion.

It also checks the refusal *message* for a `.md`, which says the opening `---` must be the first line. That advice is right only because the other likely causes are handled elsewhere: a UTF-8 BOM is stripped before parsing, and malformed YAML aborts with its own error. All three behaviours are asserted against real files.

No browser, no built tree, ~40 ms. Run it after touching `builder/publish-policy.mjs`. Each failed assertion is named.

Exit codes: **0** every assertion held, and the source tree holds no file the allowlist refuses; **1** an assertion failed, or the source tree holds a file the allowlist refuses; **2** the gate could not run: a refused command line, or a crash.

## check_regex_safety.mjs
{: #check-regex-safety }

    node scripts/check_regex_safety.mjs [--census] [--self-test]

Refuses a regex that can backtrack exponentially. Parses every `.mjs` under `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/` and `indexer/` with acorn and classifies each pattern with [recheck](https://makenowjust-labs.github.io/recheck/). No browser, no built tree, a few seconds.

**It reads regex literals and every `new RegExp(...)` whose arguments can be resolved from the source.** Patterns built from shared fragments --- `const NUM = "..."; new RegExp(`${WRAP}${NUM}`)` --- are checked too. `--census` lists a construction it cannot resolve, with the reason --- *a function parameter, check the call sites*, *a `let`, so its value is not fixed* --- so the blind spot is a short list.

**An exponential regex does not fail a build, it stops one.** The corpus passes until a page contains the trigger; then a worker sits inside `String.replace` and never returns, and the build prints its last line. `VOID_TAGS_RE` in `builder/render.mjs` shipped that way, triggered by two ordinary alt strings (`Line/Column`, `/Packages/WinDevLib`). The [stall watchdog](Building#when-a-build-stops) ends such a run after two minutes and names the wedged task and its pages, but does not make the regex safe. This gate checks the regex instead of waiting for content to trigger it.

**When it refuses one**, the report gives the file, the line, the pattern, and a **witness**: an input that makes the pattern blow up. Keep it, and paste it whole into a scratch `re.test(witness)` to watch the fault and, after the rewrite, to confirm the fix. A shortened witness may not trigger it: one 492-character witness ran for more than 30 seconds, while its first 70 characters returned in under a millisecond.

The cause is always the same: **two parts of the pattern can match the same character**. One run of input can then be divided between them in exponentially many ways, and a failing match tries every division. `VOID_TAGS_RE` spelled a void tag's attribute list as `(?:\s+[^>/]+...)*`, and `[^>/]` matches a space as `\s` does. Narrowing the class to `[^\s>/]` did not help: it still matches `"`, `'` and `=`, so an attribute could be taken by the name class or by the quoted-value alternative.

**The fix is to stop describing the structure between the delimiters.** Both regexes are now `<(br|hr|...)\b([^>]*)>`, and the attributes are handled afterwards in ordinary JavaScript, which cannot backtrack. `[^>]*` and the `>` after it share no character, so there is no division to try. **Do not reintroduce a per-attribute sub-pattern in either one.**

The gate fails on **exponential only**. About a fifth of the patterns are polynomial, nearly all the ordinary `<tag[^>]*>` shape on bounded input, and failing them would mean fifty findings. Ignore the `degN` a census prints: the native backend and the pure-JavaScript fallback disagree on it, though both agree on exponential-or-not.

Two sets of probes run in every pass, not only behind `--self-test`. Eight are regexes with known answers in both directions, including the three this repository shipped. Fourteen cover the folding: eight constructions that must resolve to an exact pattern, and six that must be refused with a reason.

A probe that comes back wrong is a 1, like a finding. A failure to do the job at all --- a file that would not parse, a regex that could not be analysed, a crash --- is a 2, and a 2 wins over a 1 in one run. That is the [convention for a gate's exit codes](Extending#conventions).

Exit codes: **0** no regex can backtrack exponentially (with `--self-test`, every probe was classified correctly); **1** a regex can backtrack exponentially, or a probe came back wrong (also `--self-test`); **2** the gate could not run, and 2 wins over 1: a refused command line, a file it could not parse, a regex it could not analyse, or a crash.

## check_code_regions.mjs
{: #check-code-regions }

    node scripts/check_code_regions.mjs [--verbose] [--self-test]

Verifies that no pre-render rewrite in `builder/render.mjs` alters the contents of a code fence, an indented code block or an inline code span. Tokenises every markdown file under `docs/`, applies the real rewrite chain, re-tokenises, and compares the code regions in order. No browser, no built tree, a couple of seconds.

The list of files comes from `lib/markdown-files.mjs`, which never enters the build's output trees, so a running `serve.bat` cannot fail the gate by rewriting `docs/_serve` mid-walk.

The rewrites run over **raw markdown**, before markdown-it parses anything, so none can tell prose from code --- and this site's subject matter is code. A rewrite without a code guard can print `If` / `ElseIf` / `Else` bodies flush left, drop the blank line between two examples, percent-encode a link's argument list inside a fence, or delete a YAML sample's closing `---`. **No other gate can see any of it.** The damage sits inside `<code>`, and the link, integrity, publish and accessibility checks all pass over it.

Probes run in every pass, each a defect this repository shipped; a passing run prints how many of each kind it ran. They import the rewrite chain instead of reconstructing it, so removing the code mask from one rewrite changes what the gate runs.

The admonition probes test the mirror fault, which the region comparison cannot see: **a rewrite that misreads what is code can also fail to fire on real prose**, and the regions still come back identical. `Reference/Attributes.md` shipped all six of its admonitions as the literal text `[!NOTE]` this way: a `[Description(...)]` sample held two fence markers in a twinBASIC string literal, the fence stasher closed the surrounding fence on them, and every later pairing was off by one.

Four probes hold the rewrites over every page's rendered HTML, `render.mjs`'s `applyPostRenderRewrites` and `template.mjs`'s `injectAnchorHeadings`. A `<pre>` or `<code>` written as raw HTML must come through as written, and a match outside it must still be rewritten.

The gate also covers `lib/markdown.mjs` and `lib/frontmatter.mjs`, the modules that tell the tools what in a page is code and where its frontmatter ends. On every page the sweep checks that `blockRegions`, which parses blocks only, finds exactly the fences, code blocks and HTML blocks of a full parse. More probes check that:

- the rewrite chain leaves alone a fence that only the site's parser finds, and an admonition written inside one;
- the build's check of `{{tbdocs:<name>}}` count names skips names in code and gives an unknown one's line in its file;
- `discover` names the page and line of `title: Input #`, and says nothing about a quoted value;
- [`convert_em_dash_separators.mjs`](Tools-Build#convert-em-dash-separators), which rewrites page source by hand, converts prose and nothing else.

`--verbose` prints the first few altered regions of each failing file, before and after. `--self-test` replaces the normal run: it de-indents the body of one small fence by hand and passes only if the comparison notices. That shows the comparator can still see a change, and nothing more.

[When `test.bat` fails in `check_code_regions`](Extending#code-regions-altered) says what to change.

Exit codes: **0** no code region was altered, and every probe passed (with `--self-test`, the comparison detects the altered region); **1** a code region was altered, a probe failed or the two parses disagree (with `--self-test`, the comparison missed the altered region); **2** the gate could not run: a refused command line, or a crash.

## check_gate_lists.mjs
{: #check-gate-lists }

    node scripts/check_gate_lists.mjs
    node scripts/check_gate_lists.mjs --verbose
    node scripts/check_gate_lists.mjs --self-test

Two checks in one. First, it verifies that the two numbered gate lists --- [`check.bat`](Tools#checkbat) and [`test.bat`](Tools#testbat) --- name the same scripts, in the same order, as the wrappers that run them, and that each section's stated step count matches its own list. Second, it sweeps `README.md` and every page under `docs/Documentation/` for a gate count stated in prose, and fails on any that disagrees with the wrapper. Pure text: no browser, no built tree, well under a second.

- **The wrapper is the source of truth**, not the prose. Pages compared only with each other could agree and both be wrong.
- **[Tools and Scripts](Tools) owns the lists**, and the gate reads them from that page alone. Every other page cites its entries rather than restating them.
- **The sweep reads per section, not per line.** A count is often stated in a section whose only mention of the wrapper is the command line under its heading.

When it fires on a count that is merely a subset --- *three cheaper gates run first* --- delete the number instead of correcting it. The command block or the linked list beneath it already states the count, and a number nothing derives goes stale. The script's header names what the sweep deliberately does not see.

Its probes run in every pass. Some are wrong gate lists; the rest cover the sweep, with count sentences as real pages word them, which must be reported, and correct ones, which must not. One puts a heading-shaped line in a code fence inside a wrapper's section, as in [Wisdom](Wisdom)'s `staging.md` example. Such a line starts no section.

Exit codes: **0** the wrappers match the gate lists, every stated count agrees, and every probe passed; **1** a list or a stated count disagrees, or a probe failed; **2** the gate could not run: a refused command line, or a crash.

## check_ci_workflows.mjs
{: #check-ci-workflows }

    node scripts/check_ci_workflows.mjs

The same question as [`check_gate_lists.mjs`](#check-gate-lists), asked of the two CI workflows, which nothing else reads. It requires that:

- `checks.yml` and `tbdocs-gh-pages.yml` each run every gate [`test.bat`](Tools#testbat) and [`check.bat`](Tools#checkbat) run, with the same arguments and in each wrapper's own order;
- the two workflows run the same gate steps in the same order;
- each workflow's build passes every argument [`build.bat`](Tools#buildbat) passes, plus `--no-fetch-assets`, and never `--no-help-archive`, because the help add-in's project file that CI publishes would then hold no [help archive](Tools-Build#the-help-archive).

Without this gate, a dropped step, a gate added to a wrapper and never to CI, or a lost `--check-audit-index` would leave CI green over a check it had stopped making.

The gates both workflows share are one composite action, `.github/actions/run-gates/action.yml`. The gate reads a workflow step that uses a local action as that action's own steps. A local action it cannot read is a finding.

The script lists the intended differences, each with where it is recorded:

- `check_tree_fresh.mjs` runs only locally, because CI builds the tree in the same job;
- the two `check_links_diff.mjs` fixture steps run only in CI, one of them only in `checks.yml`;
- the deploy build adds `--url` and `--baseurl`.

CI may interleave the two wrappers' gates, as long as each wrapper's own order holds. Anything else is a finding, and so is an allowance that no longer matches anything.

Its probes run in every pass. Each plants one defect in a small synthetic set of wrappers, workflows and actions --- a missing gate, a step no wrapper runs, two gates swapped, changed arguments, a build flag lost or added, a gate missing from the shared action, a workflow that stops calling it --- and requires exactly the findings it should produce. Pure text: no browser, no built tree.

Exit codes: **0** both workflows run every gate the wrappers run, and its own probes pass; **1** a workflow differs from the wrappers (a finding is listed), or one of its probes failed; **2** the gate could not run: a refused command line, or a crash.

## check_lint.mjs
{: #check-lint }

    node scripts/check_lint.mjs
    node scripts/check_lint.mjs --staged

Runs Biome, pinned to an exact version, over the tooling: `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/`, `indexer/`, `test/` and the site's two scripts in `docs/assets/js/`, less the exceptions that `biome.jsonc` at the repository root lists and explains. It runs `biome check`, which lints and checks formatting in one pass. No browser, no built tree, a fraction of a second.

The lint rules are Biome's correctness and suspicious groups, which find defects; none is about style. `biome.jsonc` names the few it turns off and the one it adds, `noUndeclaredVariables`, each with its reason. It declares the page globals --- `axe`, `Paged` --- only for the files whose code runs in that page.

Style belongs to the formatter, configured in the same file. A file it would change is a finding, and `npx biome format --write` fixes it. A literal table laid out by hand keeps its layout under a `// biome-ignore format:` comment with a reason.

**Warnings fail as well as errors.** Biome reports an unused import or variable as a warning and exits 0, so a plain `npx biome lint` passes a file full of them. The gate also refuses to pass when Biome could not lint. Biome exits 1 for a broken `biome.jsonc`, as it does for a finding, and 0 for a scope that matches no script at all. The gate reads the summary Biome writes beside its usual output to tell these apart.

Lint before every commit that touches one of those folders, or let the pre-commit hook do it. `.githooks/pre-commit` runs this gate with `--staged` on the scripts the commit adds or changes, as they are in the working tree, and runs nothing else. Biome skips staged scripts its scope excludes, and a commit that stages no script returns before Biome starts. Enable the hook in a clone with:

    git config core.hooksPath .githooks

A clone without the hook is still checked, because `test.bat` and both CI workflows run this gate over the whole scope. `.git-blame-ignore-revs` lists the commit that first applied the formatter, so that `git blame` looks through it. GitHub reads that file by itself; a clone must be told to:

    git config blame.ignoreRevsFile .git-blame-ignore-revs

`npx biome lint --write` applies the fixes Biome marks safe. The fixes it offers for an unused import or variable are marked unsafe and need `--unsafe` as well, so read the diff after applying them.

Exit codes: **0** Biome found nothing (with `--staged`, also when no script is staged, so nothing was linted); **1** Biome found an error or a warning, or a file the formatter would change; **2** the gate could not lint: a refused command line, git or Biome failing to run, Biome checking no script over the whole scope, or a crash.

## search.test.mjs
{: #search-test }

    node --test test/search.test.mjs

Unit tests for the site search, run by Node's own test runner. The first group builds search entries from small synthetic pages through `builder/search.mjs` and checks what each entry holds: the split at headings, the folding of generic sections such as See Also into the member they belong to, index marks, the join with the symbol index, and identical output from one build to the next. The build's own check sees only which URLs the index covers.

The rest guard two things:

- the copies of the search client's query code still agree --- the online client under `builder/vendor/just-the-docs/`, the offline client in `builder/offline.mjs` and the replica in `eval/site_search.mjs`, all three or two of them;
- the online client's index, built in slices, is the index lunr builds in one call.

No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## render.test.mjs
{: #render-test }

    node --test test/render.test.mjs

Unit tests for the markdown-it plugins in `builder/render.mjs`, run by Node's own test runner through the site's own `createMarkdownIt`. The build compares whole pages, so a plugin that is wrong only on input no page holds passes it. These tests give each plugin such input.

They cover the ellipsis plugin, which keeps the dots past the third in a run such as `....`, next to code spans, dashes, guillemets, quotes and autolinks. They also cover the offline tree's URL rewrite in `builder/offline-rewrite.mjs`, for a link to a file only the website holds:

- a link the offline tree holds becomes page-relative;
- a link only the online tree holds becomes the website's absolute URL (with the base path, and encoded) and is not counted as unresolved;
- a link in neither tree stays as written and is counted.

No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## strftime.test.mjs
{: #strftime-test }

    node --test test/strftime.test.mjs

Unit tests for `builder/strftime.mjs`, which formats the "Page last modified" line in a page's footer. No page sets `last_modified_date`, so no build calls the formatter and the build's output cannot catch a fault in it. These tests call it directly: the site's own format, the day of the year, an unknown token and a value that is not a date. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## png.test.mjs
{: #png-test }

    node --test test/png.test.mjs

Unit tests for the pictures a bug reproducer carries (see [`bug_repro.mjs`](Tools-Defects#bug-repro)).

`scripts/lib/png.mjs` reads and writes PNG files, compares two pictures and draws the side-by-side image. The tests build PNG files by hand for each filter type, for RGB and for palette images, and check that a wrong checksum and every unsupported kind of file is refused, that `comparePngs` counts each differing pixel once, and that the comparison image has the size, labels and red pixels it should.

`scripts/lib/repro-images.mjs` holds the files and judgements behind `images` and `expect.imagesDiffer`: the check of a reproducer's `PngDump` modules, the `Probe.vbp` line, and the rule that decides whether a run reproduces. The last group runs `bug_repro.mjs` over fixture reproducers in a temp folder (`BUG_REPRO_BUGS` names it), through `new --with-images` and the refusals of `verify`, which end before any IDE is looked for.

No twinBASIC, no VB6, no browser, no built tree, a few seconds.

Exit codes: **0** every test passed, **1** a test failed.

## compact-image.test.mjs
{: #compact-image-test }

    node --test test/compact-image.test.mjs

Unit tests for what an embedded image keeps: `compactImage`, `stripFile` and the functions behind them in `scripts/lib/compact-image.mjs`, and [`imagestrip`](Tools-IDE#imagestrip), which does to a CSS or SVG file in twinBASIC what `stripFile` does. The IDE's icons contain an editor's metadata --- EXIF, IPTC and XMP profiles, "Created with GIMP", CorelDRAW's and Illustrator's comments --- that is dropped. One icon has a licence's attribution that must stay with it.

The tests build PNG, JPEG, GIF and SVG images with both kinds of metadata and check what comes out:

- the metadata is gone;
- the pixels, an animated PNG's frames and any colour space but sRGB are kept;
- a JPEG or a GIF is labelled by its bytes;
- a title, author, source, copyright or licence is kept whole, in a text chunk, a comment, or an EXIF, IPTC or XMP profile of its own.

For `stripFile` they also check that:

- an image inside an SVG inside a CSS file is stripped and keeps its encoding;
- base64 is read as a browser reads it;
- a `data:` URI is read only where it follows a quote or `url(`;
- a style sheet in a `data:` URI is stripped as a CSS file is, and an SVG's style elements and attributes are read as CSS;
- an SVG file loses its own metadata and that of the images inside it.

The `imagestrip` tests run only on Windows, and only when `IMAGESTRIP_EXE` names its built exe; `test.bat` and CI skip them. They write every image the other tests build into one CSS file, together with what a stylesheet can hold around them: CRLF line ends, UTF-8 outside the images, wrong and upper-case labels, a PNG cut short, a BMP, a font, SVGs in base64 and as text, base64 with white space and an escape inside it, and URIs that cannot be read.

They run the program on that file and on SVG files on a private desktop, and check that its output, messages and reports equal what `stripFile` gives, byte for byte. They also check that a second run changes nothing, that the output may be the input, that the program strips the stylesheets of the newest twinBASIC install as `stripFile` does, and its exit codes and messages for empty files, a wrong command line and a file it cannot read or write. About ten seconds.

Exit codes: **0** every test passed, **1** a test failed.

## svgshot.test.mjs
{: #svgshot-test }

    node --test test/svgshot.test.mjs

Unit tests for the SVG screenshot converter. They cover:

- `oneLine` in `scripts/svgshot/snapshot-svg.mjs`, which writes a picture's SVG on one line (see [A picture as SVG](Authoring#a-picture-as-svg)). A line break inside a tag becomes a space, and one in text becomes a character reference, so the picture looks the same. Git may check an SVG out with Windows line endings, and on one line only its last line ending changes.
- Underlines: `underlineBand` gives the distance below the baseline and the thickness from the font size, by figures checked against Edge, and `decoratingBoxes` finds the boxes whose underline applies to a text.
- `naturalSize`, which reads a background image's size from its bytes rather than from the type its URL names, since the IDE labels a JPEG as `image/png`.
- A page inside an `<iframe>`, such as the help add-in's pane: drawn inside the frame's content box, moved by the frame's scroll position, scaled when the frame is zoomed, over the frame's own background.
- Web fonts: the `@font-face` rule that CSS font matching picks for the text, read from a WOFF2 file and cut at each weight a variable font is drawn at. When a font is split into files by `unicode-range`, each character is drawn from the file whose range holds it.
- How the `<svg>` icons inside a page are found and kept apart.
- `scripts/svgshot/colour-filter.mjs`, which turns a CSS filter such as `brightness()` or `invert()` into the colours it produces, so the picture needs no SVG filter (a PDF viewer would show one as a bitmap). The tests check the colours step by step, and that an embedded image keeps a real filter.

What the SVG keeps of an image it embeds is `compactImage`'s, from `scripts/lib/compact-image.mjs`, which [`compact-image.test.mjs`](#compact-image-test) tests. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## example-batches.test.mjs
{: #example-batches-test }

    node --test test/example-batches.test.mjs

Runs the probes of [`check_examples.mjs`](Tools-Samples#check-examples) under Node's own test runner. `check_examples.mjs` runs them before every run too, but it needs a twinBASIC install, so it runs only by hand and never in CI.

The probes live in `scripts/lib/example-batches.mjs`. They cover how samples are packed into projects, how a batch whose build crashed the compiler is cut down to the samples that crash it, the canary every batch carries, the fence classifier, and how a `check_run` sample is refused, read for what it says it prints, called and judged. They need no IDE: crash isolation runs through a fake lane whose builds crash on the samples a probe chooses.

The same file runs the probes of [`vb6run.mjs`](Tools-Defects#vb6run), from `scripts/lib/vb6.mjs`: the `Debug.Print` rewrite on strings, comments, statement separators, single-line `If` and a bare `Debug.Print`, the generated modules, the reading of VB6's build log and the Windows-1252 encoding. It also holds the probes for a bug reproducer's VB6 project (see [`bug_repro.mjs`](Tools-Defects#bug-repro)): which files go into its zip, what refuses a project (the `PngDump.bas` picture module among the sources that must pass), and the project file the build copy gets. They need no VB6. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## ports.test.mjs
{: #ports-test }

    node --test test/ports.test.mjs

Unit tests for `scripts/lib/tb-ports.mjs`, which claims the DevTools ports that [`addin_test.mjs`](Tools-IDE#addin-test), [`ide_test.mjs`](Tools-IDE#ide-test) and [`try_help_addin.mjs`](Tools-IDE#try-help-addin) start their IDEs on. A port is claimed with a lock file in `tb-ports` under the system temp directory before it is checked, and runs claim one at a time, so two runs started together never get the same one.

Four child processes claim three ports each at the same time. The range holds one port in use, one with the lock of a process that has ended and one with the lock of a live process, and each child holds its ports until all have claimed. The test checks that the claims are disjoint, that they are exactly the free ports with the stale lock taken over, and that each lock is gone once its process exits. Two more tests ask for more free ports than the range holds, which is refused with the port found unlocked again, and claim past the unfinished claim of a run that ended.

The same file tests what an IDE leaves under the system temp directory. `launchIde` gives each IDE a temp folder and a WebView2 profile named for its port, and `shutdownIde` and `shutdownIdeAsync` remove both once the IDE's process has gone. The tests give them a handle for a process that cannot exist, and check that its two folders are removed and a third is not, and that a folder already gone, a handle with no folders and no handle are no error.

Starts no IDE. No browser, no built tree, about 2 s.

Exit codes: **0** every test passed, **1** a test failed.

## addin-project.test.mjs
{: #addin-project-test }

    node --test test/addin-project.test.mjs

Unit tests for `builder/addin-project.mjs`, which packs the help add-in's folder, `add-in/`, into the project file the build publishes beside [Help Add-In](../../tB/IDE/AddIns/Help) (see [The help add-in's project file](Tools-Build#the-help-add-ins-project-file)). The build's index audit says only that the file is in each tree; nothing else reads what it holds.

The first test packs the real `add-in/` and compares the project, file by file, with the files git tracks there. A file lost or gained, a changed file or a `Resources/HELP/` file in the project fails it.

The others pack fixture folders, each a git repository of its own:

- a file git does not track, and a `Resources/HELP/site.zip` on the disk (tracked or not), are left out;
- the archive the build hands over is packed as `Resources/HELP/site.zip`, byte for byte;
- the index the build passes replaces the folder's copy;
- a CRLF checkout packs to the same bytes as an LF one, and two packs are identical;
- the file is written into exactly the trees it is given.

A second group writes small archives with `lib/help-archive.mjs` and checks them against their tree, as the build does at its end. A tree as it was archived has no differences, only the files named may differ in content, and any other changed, added or removed file is named.

Needs git; no browser, no built tree, no twinBASIC, about 1 s.

Exit codes: **0** every test passed, **1** a test failed.

## indexer.test.mjs
{: #indexer-test }

    node --test test/indexer.test.mjs

Unit tests for the [package indexer](Tools-Build#twin-index) in `indexer/lib/`, which turns the packages' sources into the `api.json` files the documentation is maintained from. The indexer promises that a snapshot changes only when the API does, and each test is a case where that promise fails without a sound if a rule stops working. The VB6 preprocessing is tested for the name a file gets (its `VB_Name`, else its file's name, as for a file that is commented out whole), the header it drops, and the extension that decides whether it is a Module or a Class. The reading of a package's files is tested on `indexer/sample.twinpack` and on a project packed for the test: the files come back in code-unit order and not in the order of any locale, and whatever sits under a `Packages` folder, a copy of another package, is left out. The model is tested on hand-made sources and on the sample: types sorted by their path, with the type they are declared in as `in`; members sorted by name, uppercase first; the values of an enumeration and the fields of a `Type` in the order they are written; a type-declaration character stripped from an unbracketed name and kept in a bracketed one; the public flag of a type; the VB6 files and the designer files in a package; and the same bytes from the same files in any order. The differ is tested on small `api.json` objects: what is added, removed and modified, and in what (signature, attributes or detail); a property's accessors as one symbol; a nested type told apart from a type of the same name elsewhere; a `Declare`; Private and Protected members; and the coverage audit of the public symbols against a map of page titles. It needs no network, no git, no twinBASIC install and no built tree, and runs in well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## check_page_baseline.mjs
{: #check-page-baseline }

    node scripts/check_page_baseline.mjs

Verifies the [page-count drift guard](Building#the-page-count-drift-guard) still refuses what it exists to refuse, and still writes only where it may. Seventeen probes run against a scratch baseline file in the system temp directory, so `builder/page-baseline.json` is never touched. No browser, no built tree, well under a second.

The guard says nothing on a healthy tree, so a build whose guard has stopped working sounds the same. The first probe is a whole package lost to a blanket `exclude:` rule, which a fixed floor on the page count would not notice. Two probes look redundant and are not:

- **A foreign source root must be ignored.** [`check_links_diff.mjs`](Tools-Site-Checks#check-links-diff) builds a three-page fixture tree, and a baseline keyed to nothing would report every other page missing.
- **CI must refuse a missing baseline** instead of creating one, because a run that wrote the file would record whatever drop it had been asked to catch.

The last six ask who may write: a build into `docs/_site` may, and a build into another `--dest`, CI and `--serve` may not. A rise built into another destination leaves the file alone and says so, and a fall there still fails.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_book_coverage.mjs
{: #check-book-coverage }

    node scripts/check_book_coverage.mjs

Verifies the build still warns about a page [`docs/_book.yml`](Book-Configuration#pages-left-out-of-the-book) does not mention. Twelve probes run over a manifest and pages built in memory, so nothing here reads `docs/`. No browser, no built tree, well under a second.

The warnings say nothing when every page has an entry --- in a part, or in `left_out:` with a reason --- which is all a broken check would say too. Without these probes, a whole section can drop out of the PDF unreported.

Eight probes give each of the five findings a fault to report: a page with no entry, a page in the book and in `left_out:`, an entry of each kind that selects no page, and a landing or foreword URL that names none. The other four hold the opposite: a consistent manifest reports nothing, and the three pages the book carries without a selector naming them --- a chaptered part's landing, a foreword, and the book page itself --- are never reported. Dropping any one emission site from `bookCoverage()` fails most of the twelve probes, and the probe named after that site says which.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_package_tests.mjs
{: #check-package-tests }

    node scripts/check_package_tests.mjs

Verifies that every NOTE and WARNING of a contributed package's section names the test cases behind it, and that each [package test project](Tools-Samples#package-tests) is in order. It reads only the sources --- the section's pages, the project's files and the sample template that names the package's version --- so it needs no install, no browser and no built tree, and takes well under a second.

A callout names its cases in an HTML comment on the line above it:

    <!-- test: FileSystemTools.GetRelativePath_LongBase, compile NoWin64 -->
    > [!WARNING]

The same comment anywhere else opens a region, which `<!-- /test -->` closes: it ties the paragraphs, lists, tables and samples between them, which describe how the package works, to the cases that check them. Regions do not nest, and a callout inside one is marked by it.

Each item is a `Fixture.Sub` for a `[TestCase]`, `compile <Name>` for a compile case, `probe <id>` for a scenario of the package's `probe/` harness, or `none -- <reason>` for a callout no program can check. For a package with a test project, the gate fails when a callout has neither a marker nor a region around it, when a region is not closed or opens inside another, when an item names nothing that exists, when a case is named by no marker, when a `[TestCase]` does not start with `Expect.Begin` and end with `Expect.Done`, when `expect.json` is for another version than the section's `indexed_from` or names a case that does not exist, and when the generated `RunAll.twin` is out of date. A section with no test project yet is listed in the script's `PENDING` set; the gate fails on a name there with a project, and on a section neither there nor with one, so the list only shrinks.

Thirteen probes run first, on pages, sources and an `expect.json` built in memory: how a marker, a region and their items are read, the RunAll module, how `expect.json` is read and written, and how a case's result is judged.

Exit codes: **0** every probe passed and every test project is in order, **1** a probe failed, or a section or test project is not in order, **2** the gate could not run: a refused command line, or a crash.

## check_symbol_index.mjs
{: #check-symbol-index }

    node scripts/check_symbol_index.mjs

Verifies the [symbol index](Building#the-symbol-index) still places each kind of symbol, and that its drift guard still refuses a URL the index has stopped publishing. Every probe is a fixture of its own --- a few lines of twinBASIC, a page or three, a scratch baseline file --- so it needs no built tree and no twinBASIC install, and never touches `builder/symbol-baseline.json`. Under a second.

A build that indexes the reference cleanly says nothing about the rules that did not fire on it, so each rule is asserted against the case that made it necessary:

- **The `.twin` scanner:** a `Type` whose `Sub`s have bodies, an `Interface` line inside a `CoClass`, `[Hidden]` on a module whose members are global, a `$` name escaped in brackets, an `Alias`, a field named for a keyword, a procedure whose body shares its line, an enumeration value named for a modifier, an enumeration value written as `[Name]` on a line of its own (a value, as the compiler reads it, and not the attribute of the next line), and what the record of a declaration says: its signature, the arguments of its attributes, its description, its return type and its accessor. Also the forms the scanner once lost without a word: `Inherits A, B` and `Implements A, B`, a CoClass's `Interface stdole.IUnknown`, `[Hidden(False)]`, a field in a `Type` named for a modifier, a variable with an initialiser and no `As`, a bracket group at the start of a `Type` member's line, a result type before an `Overrides` clause, a `Declare` with no modifier, and the branches of an `#If`, which are alternatives: two headers that share a body, an `End Sub` in each branch, alternative `Class` headers, and the attributes before and inside the `#If`, and the condition each branch gives the members declared in it (`Win64`, then `Not (Win64)`). Also declarations joined by colons (`Private x As Long: Private y As Long`, `Class C: End Class`, `Enum E: A: B: End Enum`, an `End Sub` after a label), identifiers with characters past ASCII (`Größe`, and `Publicé`, which is a name and not the modifier `Public`), and a type-declaration character on a name (`Function Size%()` returns an Integer and is called `Size`). The words `Abstract` and `Virtual` are checked too, as words the compiler does not accept as modifiers.
- **The derivation:** a member on a page of its own and under a heading, an inherited member found on its declaring type's page, a page filed under one module and declared in another, a `$` form, a `## Properties` heading on a type that has a `Properties` property, and the ellipsis the typographer puts in a Core page's heading.
- **The guard:** a lost anchor fails and is named, and CI never writes the list.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_twin_parsers.mjs
{: #check-twin-parsers }

    node scripts/check_twin_parsers.mjs

Verifies that the scanners that read twinBASIC source and the attribute reference still read the shapes each of them once misread. A misreading is silent: a line read as the wrong kind is counted, generated or skipped as that kind. Every probe is a fixed input: no built tree, no twinBASIC install. Under a second.

The modifier words that may precede a declaration keyword are one list, in `scripts/lib/twin-declarations.mjs`, and a word missing from it makes the keyword after it invisible. So each word is run through all three scanners that use the list: the attribute census's `declarationKind`, `scripts/lib/twin-api.mjs`'s `parseTwin` and `scripts/lib/tb-fences.mjs`'s `classify`.

The census's declaration kinds are asserted too, including an inline block comment before the keyword and a `Const` kept apart from a variable. So is what the census scanner, `scripts/lib/census-scan.mjs`, records for a bracket group alone on its line: an attribute in a Module or a **Type**, and nothing in an **Enum**, where the group is a member. So are the targets `parseTargets` in `scripts/lib/attributes-doc.mjs` reads from an `Applicable to:` line, including the phrases that must be matched before the line is split on commas and "and".

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_attribute_sweep.mjs
{: #check-attribute-sweep }

    node scripts/check_attribute_sweep.mjs

Verifies the logic of [`sweep_attributes.mjs`](Tools-Samples#sweep-attributes), the tool that asks the compiler where every attribute is legal. None of that tool's failures announces itself: a wrong site skeleton reads as "every attribute is refused here", a control the classifier ignores reads as a recognised attribute, and a refusal taken for an acceptance is published as a finding about the compiler. The parts that decide what an answer *means* live in `scripts/lib/attribute-sweep.mjs` and `scripts/lib/attribute-sites.mjs`, and every probe is a fixed input: no IDE, no built tree, no twinBASIC install. Under a second.

The probes cover:

- **The site skeletons.** What each renders; that the attribute lands on the line `attributeLine` names; that every name a skeleton declares belongs to its probe alone; that a `$&` in an attribute is written literally; and that every site is in a family of `Applicable to:` targets or is listed in the gate as being in none, so a new site is a decision and not an accident.
- **How a probe's diagnostics are read.** Which refusal wins, what counts as accepted, the errors a skeleton draws by itself, and what the control's fold does and does not fold.
- **Which probe each of the compiler's rows belongs to.**
- **The argument shapes and the batches.** Every probe appears once, and none holds two of an attribute the compiler allows once per project.
- **One cell per site.** A form nobody built and the `(False)` form must not decide the answer.
- **How an `Applicable to:` line is read and laid against the cells**, including every such line the page has, each pinned to the targets it reads to.
- **The runner that isolates failures.** It runs against a scripted fake in place of the IDE, which lets each failure be checked, along with the cap on it: a crash that names the probe, one that names an innocent one, one that needs two probes together, a hang, a disturbed canary, a stray error row and a build that could not run.
- **The preflight's verdict on a site and the comparison `--verify` makes.**

A fault injected into the code the probes guard, one at a time, fails at least one probe.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_cli.mjs
{: #check-cli }

    node scripts/check_cli.mjs

Verifies `lib/cli.mjs`, the module the tools read their command lines through, and each tool's recorded command-line errors. Nothing else tests how a tool reads its command line, and a hand-written parse reads a value flag given no value as `NaN` or as the next flag. No built tree, no browser, no twinBASIC install; a few seconds.

The module's probes cover what `parseCli` returns and refuses, compared with a strict `node:util` `parseArgs` over the same argument lists. They also cover `numberOption`, `choiceOption`, `regexOption`, `urlOption`, `dateOption`, `refuseTogether`, `withUsageError` and `printHelpAndExit`. The first five read a value after the parse, and `refuseTogether` refuses options that exclude each other.

The parse is strict for every tool. `parseCli` refuses an unknown option, a boolean flag given a value, a value flag with no value, a positional beyond the count the tool declares, and an empty value unless the option allows one --- only `tbdocs`'s `--baseurl` does. The probes cover each refusal and the `--` that ends the options. They also cover the options `builder/command-line.mjs` returns for `tbdocs`, where `--no-check` makes the order of the flags matter, and the trees those options make the build prepare (`destinationTrees` in `builder/write.mjs`): with `--no-offline` and `--no-pdf`, the online tree alone, the other two removed. No recorded case can test that, since each of those command lines starts a build.

The recorded cases are invocations that stop while the tool reads its command line, or at its first check of the project, folder, file or install the command line names. Each records its exit code and what it prints on each stream: the tool's own words for the error exactly, a crash's only by the line that names the problem, and the opening of a usage text printed after it.

Each case runs the tool as a child process in an empty folder (or one holding just the file the case writes), with `TB_IDE` and `PUPPETEER_EXECUTABLE_PATH` naming files that do not exist. A case that gets past the command line therefore fails on a different message, instead of starting an IDE or a browser. A case belongs here only if the tool stops before doing any work.

Exit codes: **0** every probe and recorded case passed, **1** a probe or a recorded case failed, **2** the gate could not run: a refused command line, or a crash.

## check_pdf_shims_equiv.mjs
{: #check-pdf-shims-equiv }

    node scripts/check_pdf_shims_equiv.mjs

Verifies that the book's [pdf-lib patches](Fixes/PDFLib) write what pdf-lib itself writes. `book/render-book.mjs` loads Chromium's PDF, adds the metadata and the outline, and saves it, with a dozen shims in place of pdf-lib's parser, object classes and writer, and `parallelSave` in place of `save()`.

The gate loads, changes and saves one document twice, with stock pdf-lib and with every shim `render-book.mjs` imports, each side in a process of its own. It does the same for a document built with `PDFDocument.create`. It compares each pair of files object by object, with every stream inflated, since `node:zlib` and pdf-lib's own deflate can compress the same bytes differently. It also checks each file's cross-reference entries against the objects they locate. No built tree, no browser; under a second.

The document is written by the gate, without pdf-lib, so the forms the shims' parsers branch on are known to be in it: names with `#` escapes, numbers in every lexical form, a classic cross-reference table, and an incremental update with an object stream and a cross-reference stream. The change mirrors `render-book.mjs`'s and adds what reaches the rest of the shims:

- text drawn on a page that has just been given a new key, which moves the page's entries in `fast-dict-onebuf`'s buffer and must keep the page's two flags with them;
- a page inserted and one removed;
- objects parsed early and edited late;
- a call of each patched method the book does not make, its result written into the document so that the comparison checks it.

The created document reaches the factories that build a page tree and a catalog.

`PATCHES`, a list in the gate, names each member of pdf-lib that a shim puts a function into. A listed member that is not patched fails the gate, and so does a patched member that is not listed. Each listed function must run, unless the list marks the member as one neither document reaches and says why; a marked member that runs fails the gate too, so the marks stay true. A shim none of whose functions runs is reported whole.

Each patched member must also be in the table of targets its shim passes to `checkTargets` (`book/lib/shim-targets.mjs`), which stops the import when pdf-lib's own version of a member changes. A member missing from the table would let a pdf-lib update change the patch unnoticed, so the gate fails and names the shim and the member.

On a difference, that document's shimmed side runs again with each shim alone and with each left out, and the report names the shims that cause it.

Exit codes: **0** the shims write what stock pdf-lib writes, and every shim and patched member is reached, as listed and in its shim's table; **1** a pair of files differs, a shim or patched member is no longer reached, or a patched member is not as listed or not in its shim's table; **2** the check could not run: a refused command line, a failure of the check itself, or a crash.

## check_impexp_parity.mjs
{: #check-impexp-parity }

    node scripts/check_impexp_parity.mjs

Verifies that the editions of the [impexp tool](Tools-Compiler#impexp) behave the same, as that section promises: `scripts/impexp.mjs`, `scripts/impexp.py` and, when it is named, the built exe of the twinBASIC edition, `scripts/impexp/`. Every `--self-test` suite must pass, with the same test names in the same order. Then one sequence of commands runs through each edition, each in a scratch folder of its own holding copies of `indexer/sample.twinpack` and `test/example-projects/console`: export and import, the printing commands, and each refusal, failure and warning the exit codes name.

After every command, every edition must give the exit code the command is there for, print the same on each stream, and leave the same files, compared as bytes. On Windows, Python writes CRLF to the console, so a CRLF in the printed output is read as LF in every edition; on Linux, as in CI, the output is compared as written. About four seconds for the two scripts, most of it Python starting once per command.

**The twinBASIC edition is compared only when `IMPEXP_EXE` names its built exe**, on Windows, because no gate can build it, as none can build [`imagestrip`](Tools-IDE#imagestrip). The exe runs in the scratch folder of each command, on a private desktop of its own through `launchOnDesktop`, so it cannot open anything on the desktop in use; a message box it opens counts as a difference. CI never sets the variable. With it, a run takes about 30 seconds.

    set IMPEXP_EXE=<path of impexp_win32.exe>
    node scripts/check_impexp_parity.mjs

Without Python 3.6 or later on the `PATH` (it tries `python3`, then `python`, then `py -3` on Windows), the gate prints `SKIPPED` and exits 0, so `test.bat` passes on a machine without Python. When `CI` is `true`, as GitHub sets it, the same case fails instead: CI must compare the two scripts. With `IMPEXP_EXE` set and no Python outside CI, the gate compares `impexp.mjs` with the exe and reports that `impexp.py` was not compared.

Exit codes: **0** the editions agree, or the check was skipped because no Python was found; **1** the editions differ, or a built-in test failed; **2** the check could not run: a refused command line, no Python when `CI=true`, an `IMPEXP_EXE` that is not a file or is set off Windows, or a crash.

## check_axe_patch_equiv.mjs
{: #check-axe-patch-equiv }

    node scripts/check_axe_patch_equiv.mjs [--patch NAME]

Value-equivalence check for the vendored axe source patches. Builds the same colours under the stock and patched bundles and compares every derived value `color-contrast` consumes.

It is the companion to the [fingerprint gate](Tools-Site-Checks#check-a11y-fingerprint), and both are needed. The fingerprint gate compares `incomplete` as a rule-id *set*, so a colour error that shifted contrast ratios without flipping any pass/fail classification would pass it.

Run this gate before adopting a new `SOURCE_PATCHES` entry and after **every** axe-core upgrade. The patches are pinned to the bundle's current text, so an upgrade needs this gate *and* the fingerprint gate, never one of the two. See [Upgrading axe-core](Tools-Site-Checks#upgrading-axe-core) for the sequence.

Exit codes: **0** the patched bundle gives the same colour values as stock axe, **1** at least one colour value differs, **2** the check could not run: a refused command line, or a crash.
