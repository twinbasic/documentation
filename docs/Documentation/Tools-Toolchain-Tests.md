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

The gate on the publish allowlist. Everything under `docs/` that is not a page is copied into the published site verbatim, so the source tree's shape is the site's shape --- [`builder/publish-policy.mjs`](Builder#module-map) is the list of types that may be published, enforced inside the build at the source inventory and again at each output tree's inventory. A finding there aborts the build rather than setting an exit code: a broken link still leaves a tree worth inspecting, a tree with a private key in it does not.

A clean build only says **nothing in `docs/` is currently refused**, which is also what an allowlist widened until it refuses nothing would say, and no build over a clean tree can distinguish the two. So this asserts the other half: thirteen named probes that must stay refused (a `.bak`, a `.pem`, a `.docx`, a `.twin`, a `secrets.json`, a `Thumbs.db`, a frontmatter-less `.md`, an extensionless `LICENSE`, a dotfile), six that must keep publishing (`.png`, `.PNG`, `.woff2`, `.txt`, `.html`, `CNAME`), that `bundle_extra` exemptions stay scoped to the exact declared path rather than blessing the extension everywhere, that the [help add-in's project file](Tools-Build#the-help-add-ins-project-file) publishes from the output trees at its declared path and a `.twinproj` nowhere else, and that `SOURCE_EXTENSIONS` and `BUILD_EXTENSIONS` stay disjoint --- folding the two together would pass every other assertion here while quietly making a stray `docs/secrets.json` publishable.

It also checks that the refusal *message* for a `.md` still names a fault that can happen, which is a narrower thing than it sounds. The message tells the reader the opening `---` must be the first line, and that is the right advice only because the two causes that come to mind first are handled elsewhere: a UTF-8 BOM is stripped before parsing, and malformed YAML aborts with its own error. An earlier draft named the BOM and would have sent every reader hunting for something that cannot occur, so all three behaviours are now asserted against real files --- nothing else in the repository covers them.

No browser, no built tree, ~40 ms, which is why it is `test.bat`'s first step. Run it after touching `builder/publish-policy.mjs`. Each failed assertion is named.

Exit codes: **0** every assertion held, and the source tree holds no file the allowlist refuses; **1** an assertion failed, or the source tree holds a file the allowlist refuses; **2** the gate could not run: a refused command line, or a crash.

## check_regex_safety.mjs
{: #check-regex-safety }

    node scripts/check_regex_safety.mjs [--census] [--self-test]

Refuses a regex that can backtrack exponentially. Parses every `.mjs` under `builder/`, `scripts/`, `lib/`, `book/`, `eval/` and `wisdom/` with acorn and classifies each pattern with [recheck](https://makenowjust-labs.github.io/recheck/). No browser, no built tree, a few seconds.

**It reads two things: regex literals, and every `new RegExp(...)` whose arguments can be resolved from the source.** The second half matters more than it sounds, because building a pattern out of shared fragments --- `const NUM = "..."; new RegExp(`${WRAP}${NUM}`)` --- is the ordinary way to avoid writing a sub-pattern six times, and for as long as the gate read literals only, doing that made a regex invisible to it. Six in one gate were, and one of them turned out to be polynomial rather than safe; it was found by a person running recheck against it by hand, which is not a process. A construction it cannot resolve is listed by `--census` with the reason --- *a function parameter, check the call sites*, *a `let`, so its value is not fixed* --- so the remaining blind spot is a short list rather than a count.

**An exponential regex does not fail a build, it stops one.** The corpus passes for as long as no page happens to contain the trigger; then a worker sits inside `String.replace` and never returns, and the build prints its last line. That is not hypothetical --- `VOID_TAGS_RE` in `builder/render.mjs` shipped that way, and the two alt strings that triggered it (`Line/Column`, `/Packages/WinDevLib`) are ordinary English. This gate asks the question of the regex rather than waiting for content to ask it. When it first ran it found a second exponential regex in the same file that nobody knew about, and then found that the first attempt at fixing `VOID_TAGS_RE` was still exponential on a subtler input. The [stall watchdog](Building#when-a-build-stops) ends such a run after two minutes and names the wedged task and the pages it was rendering, which turns a silent hang into a diagnosis --- it does not make the regex safe.

**When it refuses one**, the report gives the file, the line, the pattern, and a **witness** --- an input that makes that pattern blow up. Keep the witness: pasting it into a scratch `re.test(witness)` is how you watch the fault, and it is the only thing that later says the rewrite worked, since the corpus passed before the fix and passes after it. It is printed whole, with its length, and must be pasted whole. The report used to cut it to 70 characters, and a shortened witness has fewer repetitions of the part that causes the blowup: for the first attempt at fixing `VOID_TAGS_RE`, the 492-character witness ran for more than 30 seconds while its first 70 characters returned in under a millisecond.

The cause is one shape, every time: **two parts of the pattern can match the same character**, so a single run of input can be divided between them in exponentially many ways, and a match that ultimately fails tries every division. Both regexes this repository shipped were that. `VOID_TAGS_RE` spelled a void tag's attribute list as `(?:\s+[^>/]+...)*`, and `[^>/]` matches a space exactly as `\s` does, so any run of attribute text divides arbitrarily. Narrowing the class to `[^\s>/]` looked like the fix and was not --- it still matches `"`, `'` and `=`, so an attribute could be taken either by the name class or by the quoted-value alternative, which is the same ambiguity one level down. That second version was pronounced safe by hand and refused by this gate.

**The rewrite that works is to stop describing the structure between the delimiters.** Both regexes are `<(br|hr|...)\b([^>]*)>`, and the attribute handling happens afterwards in ordinary JavaScript, where it is easier to read and cannot backtrack at all. `[^>]*` and the `>` after it share no character, so there is no division to try. **Do not reintroduce a per-attribute sub-pattern in either one**: a per-attribute sub-pattern is what made them exponential.

It gates on **exponential only**. recheck also reports polynomial blowup, and about a fifth of the patterns here are polynomial --- nearly all the ordinary `<tag[^>]*>` shape on bounded input. Failing those would mean fifty findings on day one, and a gate that fails on day one gets switched off. The `degN` a census prints is worth even less than that: on one pattern, over three runs each, the native backend calls it degree 2 and the pure-JavaScript fallback calls it degree 3. Both agree on exponential-or-not, which is the only thing the gate rests on.

Two sets of probes run inside the normal pass rather than behind `--self-test`, because a green line saying *no exponential regex* is otherwise indistinguishable from a gate that has stopped detecting them. Eight are regexes with known answers in both directions, including the three this repository actually shipped. Fourteen more cover the folding: eight constructions that must resolve to an exact pattern, and six that must be refused with a reason --- a folder that quietly resolves nothing moves every construction into the unresolved list and the run still passes.

A probe that comes back wrong is a 1, like a finding: the gate ran and its verdict cannot be trusted. A failure to do the job at all is a 2 rather than a 1, because each of those leaves something unchecked --- a file that would not parse, a regex that could not be analysed, a crash --- and a 2 wins over a 1 when both happen in one run. That is the [convention for a gate's exit codes](Extending#conventions).

Exit codes: **0** no regex can backtrack exponentially (with `--self-test`, every probe was classified correctly); **1** a regex can backtrack exponentially, or a probe came back wrong (also `--self-test`); **2** the gate could not run, and 2 wins over 1: a refused command line, a file it could not parse, a regex it could not analyse, or a crash.

## check_code_regions.mjs
{: #check-code-regions }

    node scripts/check_code_regions.mjs [--verbose] [--self-test]

Verifies that no pre-render rewrite in `builder/render.mjs` alters the contents of a code fence, an indented code block or an inline code span. Tokenises every markdown file under `docs/`, applies the real rewrite chain, re-tokenises, and compares the code regions in order. No browser, no built tree, a couple of seconds.

The list of files comes from `lib/markdown-files.mjs`, which [`convert_em_dash_separators.mjs`](Tools-Build#convert-em-dash-separators), [`check_tree_fresh.mjs`](Tools-Site-Checks#check-tree-fresh), `scripts/lib/tb-fences.mjs` (and through it [`check_examples.mjs`](Tools-Samples#check-examples)), `eval/nav_hops.mjs`, `eval/build_corpus.mjs`, `wisdom/extract/sitemap.mjs` and the builder's `write.mjs` and `serve.mjs` share. It never enters the build's output trees, so a running `serve.bat` cannot fail the gate: the preview deletes and rewrites `docs/_serve` on every rebuild, and a walk inside it at that moment fails with `ENOENT`.

Those rewrites run over **raw markdown**, before markdown-it has parsed anything, so none of them can tell prose from code --- and this site's subject matter is code. A rewrite without a code guard can print `If` / `ElseIf` / `Else` bodies flush left, drop the blank line between two examples, percent-encode a link's argument list inside a fence, or delete a YAML sample's closing `---`. **No other gate can see any of it**, because the damage sits inside `<code>` and the link, integrity, publish and accessibility checks all pass over it.

Probes ride along in the normal run, each a defect this repository actually shipped, and a passing run prints how many of each kind it ran. The corpus is clean, so a sweep that finds nothing is otherwise indistinguishable from a gate that has stopped detecting. It imports the rewrite chain rather than reconstructing it, which is what makes removing the code mask from one rewrite change what the gate runs.

The admonition probes test the mirror fault, which the region comparison structurally cannot see: **a rewrite that misreads what is code can also fail to fire on real prose**, and the regions still come back identical because the text was only stashed and restored. `Reference/Attributes.md` shipped all six of its admonitions as the literal text `[!NOTE]` for exactly that reason --- a `[Description(...)]` sample whose argument is a Markdown string containing two fence markers as twinBASIC string literals, which the fence stasher closed the surrounding fence on. Every pairing after it was off by one.

Four probes hold the rewrites that run over every page's rendered HTML, `render.mjs`'s `applyPostRenderRewrites` and `template.mjs`'s `injectAnchorHeadings`. A `<pre>` or `<code>` written as raw HTML must come through them as written, and a match outside it must still be rewritten. Code the renderer produced cannot match them, since its `<` is escaped; the probes are for raw HTML, which markdown-it passes through unchanged, and whitespace inside a `<pre>` is content.

It is also the gate on `lib/markdown.mjs` and `lib/frontmatter.mjs`, the modules that tell the tools what in a page is code and where its frontmatter ends. Their probes run with the others, and on every page the sweep checks that `blockRegions`, which parses blocks only, finds exactly the fences, code blocks and HTML blocks of a full parse. The summary line gives the number of fences that full parse found. Three more probes hold the build to the same answer: the rewrite chain must leave alone a fence that only the site's parser finds, and an admonition written inside one, and the build's check of `{{tbdocs:<name>}}` count names must skip names in code and give an unknown one's line in its file. One more holds the build's warning about a frontmatter value left unquoted that ends in `#`: `discover` must name the page and line of `title: Input #`, and say nothing about a quoted value. Another set holds [`convert_em_dash_separators.mjs`](Tools-Build#convert-em-dash-separators), which rewrites page source by hand rather than in the build, to converting prose and nothing else.

`--verbose` prints the first few altered regions of each failing file, before and after. `--self-test` replaces the normal run rather than adding to it, so neither the probes nor the sweep runs: it de-indents the body of one small fence by hand and passes only if the comparison notices. That proves the comparator can still see a change, and nothing more --- it runs no rewrite at all.

[When `test.bat` fails in `check_code_regions`](Extending#code-regions-altered) says what to change.

Exit codes: **0** no code region was altered, and every probe passed (with `--self-test`, the comparison detects the altered region); **1** a code region was altered, a probe failed or the two parses disagree (with `--self-test`, the comparison missed the altered region); **2** the gate could not run: a refused command line, or a crash.

## check_gate_lists.mjs
{: #check-gate-lists }

    node scripts/check_gate_lists.mjs
    node scripts/check_gate_lists.mjs --verbose
    node scripts/check_gate_lists.mjs --self-test

Two checks in one. It verifies that the two numbered gate lists on this page --- [`check.bat`](Tools#checkbat) and [`test.bat`](Tools#testbat) --- still name the same scripts, in the same order, as the wrappers that run them, and that each section's stated step count matches its own list. Then it sweeps `README.md` and every page under `docs/Documentation/` for a gate count stated in prose anywhere, and fails on any that disagrees with the wrapper. Pure text: no browser, no built tree, well under a second.

A gate scoped to one page guards one file, not every page that restates a count, which is why the sweep covers `README.md` and all of `docs/Documentation/`.

Three things follow from how it works. **The wrapper is the source of truth**, not the prose: a gate comparing the pages against each other would be satisfied by two pages that agree and are both wrong. **This page owns the lists**, and every other page cites these entries rather than restating them. And **the sweep reads per section, not per line** --- a count is often stated in a section whose only mention of the wrapper is the command line under its heading, so a line-by-line grep misses most sites.

When it fires on a count that is merely a subset --- *three cheaper gates run first* --- the fix is to delete the number rather than correct it. The command block or the linked list beneath it already states it, and a number nothing derives is a number that goes stale. The script's header names what the sweep deliberately does not see.

Its probes ride along in the ordinary run rather than hiding behind `--self-test`, because a green line from a gate that has stopped detecting looks exactly like a green line from a working one. Some probes are wrong gate lists, and the rest cover the sweep: count sentences as real pages word them, each of which must be reported, and correct ones, which must not. One puts a heading-shaped line in a code fence, as in [Wisdom](Wisdom)'s `staging.md` example, inside a wrapper's section, because such a line starts no section.

Exit codes: **0** the wrappers match the gate lists, every stated count agrees, and every probe passed; **1** a list or a stated count disagrees, or a probe failed; **2** the gate could not run: a refused command line, or a crash.

## check_ci_workflows.mjs
{: #check-ci-workflows }

    node scripts/check_ci_workflows.mjs

The same question as [`check_gate_lists.mjs`](#check-gate-lists), asked of the two CI workflows, which nothing else reads. It requires that `checks.yml` and `tbdocs-gh-pages.yml` each run every gate [`test.bat`](Tools#testbat) and [`check.bat`](Tools#checkbat) run, with the same arguments and in each wrapper's own order; that the two workflows run the same gate steps in the same order; and that each workflow's build passes every argument [`build.bat`](Tools#buildbat) passes, plus `--no-fetch-assets`, and never `--no-help-archive`, because the help add-in's project file that CI publishes would then hold no [help archive](Tools-Build#the-help-archive). A step dropped from a workflow, a gate added to a wrapper and never to CI, or a lost `--check-audit-index` would otherwise leave CI green over a check it had stopped making.

The gates both workflows share are one composite action, `.github/actions/run-gates/action.yml`, and the gate reads a workflow step that uses a local action as that action's own steps. A local action it cannot read is a finding, so a renamed action cannot take its gates out of CI unnoticed.

The differences that are meant are listed in the script, each with where it is recorded: `check_tree_fresh.mjs` runs only locally, because CI builds the tree in the same job; the two `check_links_diff.mjs` fixture steps run only in CI, one of them only in `checks.yml`; and the deploy build adds `--url` and `--baseurl`. CI may also interleave the two wrappers' gates, as long as each wrapper's own order holds. Anything else is a finding, and so is an allowance that no longer matches anything.

Its probes ride along in every run: each plants one defect in a small synthetic set of wrappers, workflows and actions --- a missing gate, a step no wrapper runs, two gates swapped, changed arguments, a build flag lost or added, a gate missing from the shared action, a workflow that stops calling it --- and requires exactly the findings it should produce. Pure text: no browser, no built tree.

Exit codes: **0** both workflows run every gate the wrappers run, and its own probes pass; **1** a workflow differs from the wrappers (a finding is listed), or one of its probes failed; **2** the gate could not run: a refused command line, or a crash.

## check_lint.mjs
{: #check-lint }

    node scripts/check_lint.mjs
    node scripts/check_lint.mjs --staged

Runs Biome, pinned to an exact version, over the tooling: `builder/`, `scripts/`, `lib/`, `book/`, `eval/`, `wisdom/`, `test/` and the site's two scripts in `docs/assets/js/`, less the exceptions that `biome.jsonc` at the repository root lists and explains. It runs `biome check`, which lints and checks formatting in one pass. The lint rules are the ones that find defects --- Biome's correctness and suspicious groups --- and none about style; the configuration names the few it turns off and the one it adds, `noUndeclaredVariables`, each with its reason, and declares the page globals --- `axe`, `Paged` --- only for the files whose code runs in that page. Moving and deleting code leaves unused imports and undeclared names behind, and nothing else reads the tooling for them. Style belongs to the formatter, whose settings are in the same file: a file it would change is a finding, and `npx biome format --write` fixes it. A literal table laid out by hand keeps its layout under a `// biome-ignore format:` comment with a reason. No browser, no built tree, a fraction of a second.

**Warnings fail as well as errors.** Biome reports an unused import or variable as a warning, and exits 0 on warnings, so a plain `npx biome lint` passes a file full of them. The gate also refuses to pass when Biome could not lint. Biome exits 1 for a broken `biome.jsonc`, as it does for a finding, and 0 for a scope that matches no script at all, so the gate reads the summary Biome writes beside its usual output to tell these apart.

Lint before every commit that touches one of those folders, or let the pre-commit hook do it. `.githooks/pre-commit` runs this gate with `--staged`, on the scripts the commit adds or changes, as they are in the working tree, and runs nothing else. Biome skips the staged scripts its scope excludes, and a commit that stages no script returns before Biome starts. Enable the hook in a clone with:

    git config core.hooksPath .githooks

A clone without the hook is still checked, because `test.bat` and both CI workflows run this gate over the whole scope. The commit that first applied the formatter changed only layout, and `.git-blame-ignore-revs` lists it so that `git blame` looks through it. GitHub reads that file by itself; a clone reads it once told to:

    git config blame.ignoreRevsFile .git-blame-ignore-revs

`npx biome lint --write` applies the fixes Biome marks safe. The fixes it offers for an unused import or variable are marked unsafe and need `--unsafe` as well, so read the diff after applying them.

Exit codes: **0** Biome found nothing (with `--staged`, also when no script is staged, so nothing was linted); **1** Biome found an error or a warning, or a file the formatter would change; **2** the gate could not lint: a refused command line, git or Biome failing to run, Biome checking no script over the whole scope, or a crash.

## search.test.mjs
{: #search-test }

    node --test test/search.test.mjs

Unit tests for the site search, run by Node's own test runner rather than as a script under `scripts/`. The first group builds search entries from small synthetic pages through `builder/search.mjs` and checks what each entry holds: the split at headings, the folding of generic sections such as See Also into the member they belong to, index marks, the join with the symbol index, and output that is the same byte for byte from one build to the next. The build's own check sees only which URLs the index covers. The rest are guards that the copies of the search client's query code still agree --- the online client under `builder/vendor/just-the-docs/`, the offline client in `builder/offline.mjs` and the replica in `eval/site_search.mjs`, all three or two of them --- and that the online client's index, built in slices, is the index lunr builds in one call. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## render.test.mjs
{: #render-test }

    node --test test/render.test.mjs

Unit tests for the markdown-it plugins in `builder/render.mjs`, run by Node's own test runner through the site's own `createMarkdownIt`. The build compares whole pages, so a plugin that is wrong only on input no page holds passes it; these tests give each plugin such input. They cover the ellipsis plugin, which keeps the dots past the third in a run such as `....`, next to code spans, dashes, guillemets, quotes and autolinks. They also cover the offline tree's URL rewrite in `builder/offline-rewrite.mjs` for a link to a file only the website holds: a link the offline tree holds becomes page-relative, one that only the online tree holds becomes the website's absolute URL (with the base path, and encoded) and is not counted as unresolved, and one in neither tree stays as written and is. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## strftime.test.mjs
{: #strftime-test }

    node --test test/strftime.test.mjs

Unit tests for `builder/strftime.mjs`, which formats the "Page last modified" line in a page's footer. That line is written only for a page that sets `last_modified_date`, and no page does, so no build calls the formatter and the build's output cannot catch a fault in it. These call it directly: the site's own format, the day of the year, an unknown token and a value that is not a date. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## png.test.mjs
{: #png-test }

    node --test test/png.test.mjs

Unit tests for the pictures a bug reproducer carries (see [`bug_repro.mjs`](Tools-Defects#bug-repro)). `scripts/lib/png.mjs` reads and writes PNG files, compares two pictures and draws the side-by-side image: these tests build PNG files by hand for each filter type, for RGB and for palette images, and check that a wrong checksum and every unsupported kind of file is refused, that `comparePngs` counts each differing pixel once, and that the comparison image has the size, the labels and the red pixels it should. `scripts/lib/repro-images.mjs` holds the files and judgements behind `images` and `expect.imagesDiffer`: the check of a reproducer's `PngDump` modules, the `Probe.vbp` line, and the rule that decides whether a run reproduces. The last group runs `bug_repro.mjs` itself over fixture reproducers in a temp folder (`BUG_REPRO_BUGS` names it), through `new --with-images` and the refusals of `verify`, which end before any IDE is looked for. No twinBASIC, no VB6, no browser, no built tree, a few seconds.

Exit codes: **0** every test passed, **1** a test failed.

## compact-image.test.mjs
{: #compact-image-test }

    node --test test/compact-image.test.mjs

Unit tests for what an embedded image keeps: `compactImage`, `stripFile` and the functions behind them in `scripts/lib/compact-image.mjs`, and [`imagestrip`](Tools-IDE#imagestrip), which does to a CSS or SVG file in twinBASIC what `stripFile` does. The IDE's icons contain an editor's metadata --- EXIF, IPTC and XMP profiles, "Created with GIMP", CorelDRAW's and Illustrator's comments --- that is dropped, and one has a licence's attribution that must stay with it. The tests build PNG, JPEG, GIF and SVG images with both kinds and check what comes out: the metadata gone; the pixels, an animated PNG's frames and any colour space but sRGB kept; a JPEG or a GIF labelled by its bytes; and a title, author, source, copyright or licence kept whole, in a text chunk, a comment, or an EXIF, IPTC or XMP profile of its own. They check `stripFile` too: an image inside an SVG inside a CSS file is stripped and keeps its encoding, base64 is read as a browser reads it, a `data:` URI is read only where it follows a quote or `url(`, an SVG's references are undone in a URI and kept in what stays, a style sheet in a `data:` URI is stripped as a CSS file is, an SVG's style elements and style attributes are read as CSS, and an SVG file loses its own metadata and that of the images inside it. No browser, no built tree, well under a second.

The tests of `imagestrip` run only on Windows, and only when `IMAGESTRIP_EXE` names its built exe; otherwise they are skipped, as they are in `test.bat` and CI. They write every image the other tests build into one CSS file, with what a stylesheet can hold around them: CRLF line ends, UTF-8 outside the images, wrong and upper-case labels, a PNG cut short, a BMP, a font, SVGs in base64 and as text with CSS and percent escapes and images inside them, base64 with white space and an escape inside it, and URIs that cannot be read. They run the program on that file and on SVG files on a private desktop, and check that it writes, prints and reports what `stripFile` says, byte for byte. They also check that a second run changes nothing, that the output may be the input, that the program strips the stylesheets of the newest twinBASIC install as `stripFile` does, and its exit codes and messages for empty files, a wrong command line and a file it cannot read or write. About ten seconds.

Exit codes: **0** every test passed, **1** a test failed.

## svgshot.test.mjs
{: #svgshot-test }

    node --test test/svgshot.test.mjs

Unit tests for `oneLine` in `scripts/svgshot/snapshot-svg.mjs`, which writes a picture's SVG on one line (see [A picture as SVG](Authoring#a-picture-as-svg)). A line break inside a tag becomes a space, and one in text becomes a character reference, so the picture looks the same. Git may check an SVG out with Windows line endings, and on one line only its last line ending changes. The same file tests where an underline goes: `underlineBand` gives its distance below the baseline and its thickness from the font size, by figures checked against Edge, and `decoratingBoxes` finds the boxes whose underline applies to a text. It also tests `naturalSize`, which reads a background image's size from its bytes rather than from the type its URL names, since the IDE labels a JPEG as `image/png`. For a page inside an `<iframe>`, such as the help add-in's pane, it tests where that page is drawn: inside the frame's content box, moved by the frame's scroll position, scaled when the frame is zoomed, over the frame's own background. And it tests how a web font is found: the `@font-face` rule that CSS font matching picks for the text, read from a WOFF2 file and cut at each weight a variable font is drawn at. When a font is split into several files by `unicode-range`, as many websites serve them, it tests that each character is drawn from the file whose range holds it. It also tests how the `<svg>` icons inside a page are found and kept apart from one another. Finally, it tests `scripts/svgshot/colour-filter.mjs`, which turns a CSS filter such as `brightness()` or `invert()` into the colours it produces. The picture then needs no SVG filter, which a PDF viewer would show as a bitmap. It checks that the colours come out as the filter makes them, step by step, and that an embedded image keeps a real filter. What the SVG keeps of an image it embeds is `compactImage`'s, from `scripts/lib/compact-image.mjs`, which [`compact-image.test.mjs`](#compact-image-test) tests. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## example-batches.test.mjs
{: #example-batches-test }

    node --test test/example-batches.test.mjs

Runs the probes of [`check_examples.mjs`](Tools-Samples#check-examples) under Node's own test runner. They live in `scripts/lib/example-batches.mjs`, beside what they test: how samples are packed into projects, how a batch whose build crashed the compiler is cut down to the samples that crash it, the canary every batch carries, the fence classifier, and how a `check_run` sample is refused, read for what it says it prints, called and judged. `check_examples.mjs` runs them before every run too, but it needs a twinBASIC install, so it runs only by hand and never in CI. The probes need no IDE: crash isolation is driven through a fake lane whose builds crash on the samples a probe chooses. The same file also runs the probes of [`vb6run.mjs`](Tools-Defects#vb6run), from `scripts/lib/vb6.mjs`: the `Debug.Print` rewrite on strings, comments, statement separators, single-line `If` and a bare `Debug.Print`, the generated modules, the reading of VB6's build log and the Windows-1252 encoding. It also holds the probes for a bug reproducer's VB6 project (see [`bug_repro.mjs`](Tools-Defects#bug-repro)): which files go into its zip, what refuses a project (the `PngDump.bas` picture module among the sources that must pass), and the project file the build copy gets. They need no VB6. No browser, no built tree, well under a second.

Exit codes: **0** every test passed, **1** a test failed.

## ports.test.mjs
{: #ports-test }

    node --test test/ports.test.mjs

Unit tests for `scripts/lib/tb-ports.mjs`, which claims the DevTools ports that [`addin_test.mjs`](Tools-IDE#addin-test), [`ide_test.mjs`](Tools-IDE#ide-test) and [`try_help_addin.mjs`](Tools-IDE#try-help-addin) start their IDEs on. A port is claimed with a lock file in `tb-ports` under the system temp directory before it is checked, and runs claim one at a time, so two runs started together never get the same one. Four child processes claim three ports each at the same time, from a range where one port is in use, one has the lock of a process that has ended and one the lock of a live process, and each holds its ports until all have claimed. The test checks that the claims are disjoint, that they are exactly the free ports with the stale lock taken over, and that each lock is gone once its process exits. Two more tests ask for more free ports than the range holds, which is refused with the port found unlocked again, and claim past the unfinished claim of a run that ended. Starts no IDE. No browser, no built tree, about 2 s.

Exit codes: **0** every test passed, **1** a test failed.

## addin-project.test.mjs
{: #addin-project-test }

    node --test test/addin-project.test.mjs

Unit tests for `builder/addin-project.mjs`, which packs the help add-in's folder, `add-in/`, into the project file the build publishes beside [Help Add-In](../../tB/IDE/AddIns/Help) (see [The help add-in's project file](Tools-Build#the-help-add-ins-project-file)). The build's index audit says only that the file is in each tree; nothing in the build reads what it holds. The first test packs the real `add-in/` and compares the project, file by file, with the files git tracks there: a file lost or gained, a changed file or a `Resources/HELP/` file in the project fails it. The others pack fixture folders, each a git repository of its own, for what the real folder cannot show on every machine: a file git does not track and a `Resources/HELP/site.zip` on the disk, tracked or not, are both left out, the archive the build hands over is packed as `Resources/HELP/site.zip` byte for byte, the index the build passes replaces the folder's copy, a CRLF checkout packs to the same bytes as an LF one, two packs are identical, and the file is written into exactly the trees it is given. A second group writes small archives with `lib/help-archive.mjs` and checks them against their tree, as the build does at its end: a tree as it was archived has no differences, only the files named may differ in content, and any other changed, added or removed file is named. Needs git; no browser, no built tree, no twinBASIC, about 1 s.

Exit codes: **0** every test passed, **1** a test failed.

## check_page_baseline.mjs
{: #check-page-baseline }

    node scripts/check_page_baseline.mjs

Verifies the [page-count drift guard](Building#the-page-count-drift-guard) still refuses what it exists to refuse. Eleven probes against a scratch baseline file in the system temp directory, so nothing here touches `builder/page-baseline.json`. No browser, no built tree, well under a second.

The guard says nothing on a healthy tree, so every ordinary build sounds exactly like one whose guard has stopped working --- which is the whole reason this exists. The first probe is a whole package lost to a blanket `exclude:` rule, which a fixed floor on the page count would not notice. Two probes look redundant and are not. A **foreign source root must be ignored**: [`check_links_diff.mjs`](Tools-Site-Checks#check-links-diff) builds a three-page fixture tree, and a baseline keyed to nothing would report every other page missing. And **CI must refuse a missing baseline** rather than create one, because a run that wrote the file would record whatever drop it had been asked to catch.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_book_coverage.mjs
{: #check-book-coverage }

    node scripts/check_book_coverage.mjs

Verifies the build still warns about a page [`docs/_book.yml`](Book-Configuration#pages-left-out-of-the-book) does not mention. Twelve probes over a manifest and pages built in memory, so nothing here reads `docs/`. No browser, no built tree, well under a second.

The warnings say nothing when every page has an entry --- in a part, or in `left_out:` with a reason --- which is also all a check that had stopped working would say. Without them, a whole section can drop out of the PDF with nothing to report it.

Eight probes give each of the five findings a fault to report: a page with no entry, a page in the book and in `left_out:`, an entry of each kind that selects no page, and a landing or foreword URL that names none. The other four hold the opposite: a consistent manifest reports nothing, and the three pages the book carries without a selector naming them --- a chaptered part's landing, a foreword, and the book page itself --- are never reported. Dropping any one emission site from `bookCoverage()` fails most of the twelve at once, and the probe named after that site says which.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_symbol_index.mjs
{: #check-symbol-index }

    node scripts/check_symbol_index.mjs

Verifies the [symbol index](Building#the-symbol-index) still places each kind of symbol, and that its drift guard still refuses a URL the index has stopped publishing. Every probe is a fixture of its own --- a few lines of twinBASIC, a page or three, a scratch baseline file --- so it needs no built tree and no twinBASIC install, and never touches `builder/symbol-baseline.json`. Under a second.

A build that indexes the reference cleanly says nothing about the rules that did not fire on it, so each rule is asserted against the case that made it necessary. The `.twin` scanner's: a `Type` whose `Sub`s have bodies, an `Interface` line inside a `CoClass`, `[Hidden]` on a module whose members are global, a `$` name escaped in brackets. The derivation's: a member on a page of its own and under a heading, an inherited member found on its declaring type's page, a page filed under one module and declared in another, a `$` form, a `## Properties` heading on a type that has a `Properties` property, and the ellipsis the typographer puts in a Core page's heading. And the guard's: a lost anchor fails and is named, and CI never writes the list.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_twin_parsers.mjs
{: #check-twin-parsers }

    node scripts/check_twin_parsers.mjs

Verifies the scanners that read twinBASIC source and the attribute reference still read the shapes each of them once misread. None of them says so when it misreads: a line read as the wrong kind is counted, generated or skipped as that kind. Every probe is a fixed input, so it needs no built tree and no twinBASIC install. Under a second.

The modifier words that may precede a declaration keyword are one list, in `scripts/lib/twin-declarations.mjs`, and a word missing from it makes the keyword after it invisible. So each word is run through all three scanners that use the list: the attribute census's `declarationKind`, `scripts/lib/twin-api.mjs`'s `parseTwin` and `scripts/lib/tb-fences.mjs`'s `classify`. The census's declaration kinds are asserted too, including an inline block comment before the keyword and a `Const` kept apart from a variable, and so are the targets `parseTargets` in `scripts/lib/attributes-doc.mjs` reads from an `Applicable to:` line, including the phrases that must be matched before the line is split on commas and "and".

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_attribute_sweep.mjs
{: #check-attribute-sweep }

    node scripts/check_attribute_sweep.mjs

Verifies the logic of [`sweep_attributes.mjs`](Tools-Samples#sweep-attributes), the tool that asks the compiler where every attribute is legal. None of that tool's failures announces itself: a site skeleton that is wrong reads as "every attribute is refused here", a control the classifier ignores reads as a recognised attribute, and a refusal taken for an acceptance is published as a finding about the compiler. The IDE is what cannot run here, so the parts that decide what an answer *means* live in `scripts/lib/attribute-sweep.mjs` and `scripts/lib/attribute-sites.mjs`, and every probe is a fixed input: no IDE, no built tree and no twinBASIC install. Under a second.

The probes cover, in turn: the site skeletons --- what each renders, that the attribute lands on the line `attributeLine` names, that every name a skeleton declares belongs to its probe alone, that a `$&` in an attribute is written literally, and that every site is in a family of `Applicable to:` targets or is listed in the gate as being in none, so a new site is a decision and not an accident; how a probe's diagnostics are read, including which refusal wins, what counts as accepted, the errors a skeleton draws by itself, and what the control's fold does and does not fold; which probe each of the compiler's rows belongs to; the argument shapes each name is tried in, and the batches, in which every probe appears once and none holds two of an attribute the compiler allows once per project; how probes become one cell per site, where a form nobody built and the `(False)` form must not decide the answer; and how an `Applicable to:` line is read and laid against the cells, including every `Applicable to:` line the page has, each pinned to the targets it reads to. The runner that isolates what goes wrong is probed with a scripted fake in place of the IDE, which is what lets a crash that names the probe, one that names an innocent one, one that needs two probes together, a hang, a disturbed canary, a stray error row and a build that could not run each be checked, along with the cap on every one of them; so are the preflight's verdict on a site and the comparison `--verify` makes.

A fault injected into the code the probes guard, one at a time, fails at least one probe.

Exit codes: **0** every probe passed, **1** a probe failed, **2** the gate could not run: a refused command line, or a crash.

## check_cli.mjs
{: #check-cli }

    node scripts/check_cli.mjs

Verifies `lib/cli.mjs`, the module the tools read their command lines through, and each tool's recorded command-line errors. Nothing else tests how a tool reads its command line, and a hand-written parse reads a value flag given no value as `NaN` or as the next flag. No built tree, no browser, no twinBASIC install; a few seconds.

The module's probes cover what `parseCli` returns and refuses, with a comparison against a strict `node:util` `parseArgs` over the same argument lists, and what `numberOption`, `choiceOption`, `regexOption`, `urlOption`, `dateOption`, `refuseTogether`, `withUsageError` and `printHelpAndExit` do. The first five are how a tool reads a value after the parse, and `refuseTogether` refuses options that exclude each other. The parse is strict for every tool: `parseCli` refuses an unknown option, a boolean flag given a value, a value flag with no value, a positional beyond the count the tool declares, and an empty value unless the option allows one --- only `tbdocs`'s `--baseurl` does. The probes cover each refusal and the `--` that ends the options. They also cover the options `builder/command-line.mjs` returns for `tbdocs`, where `--no-check` makes the order of the flags matter; no case can, since each of those command lines starts a build.

The recorded cases are invocations that stop while the tool reads its command line, or at its first check of the project, folder, file or install the command line names, each with its exit code and what it prints on each stream: the tool's own words for the error exactly, a crash's only by the line that names the problem, and the opening of a usage text printed after it. Each case runs the tool as a child process, in an empty folder of its own (or one holding just the file the case writes there) and with `TB_IDE` and `PUPPETEER_EXECUTABLE_PATH` naming files that do not exist, so a case that gets past the command line fails on a different message rather than starting a twinBASIC IDE or a browser. A case belongs here only if the tool stops before doing any work.

Exit codes: **0** every probe and recorded case passed, **1** a probe or a recorded case failed, **2** the gate could not run: a refused command line, or a crash.

## check_pdf_shims_equiv.mjs
{: #check-pdf-shims-equiv }

    node scripts/check_pdf_shims_equiv.mjs

Verifies that the book's [pdf-lib patches](Fixes/PDFLib) write what pdf-lib itself writes. `book/render-book.mjs` loads Chromium's PDF, adds the metadata and the outline, and saves it, with a dozen shims replacing pdf-lib's parser, object classes and writer, and `parallelSave` in place of `save()`. This loads, changes and saves one document twice, with stock pdf-lib and with every shim `render-book.mjs` imports, each side in a process of its own, does the same for a document built with `PDFDocument.create`, and compares each pair of files object by object with every stream inflated, since `node:zlib` and pdf-lib's own deflate can compress the same bytes differently. It also checks each file's cross-reference entries against the objects they locate, since pdf-lib's own parser finds objects without them. No built tree, no browser; under a second.

The document is written by the gate, without pdf-lib, so the forms the shims' parsers branch on are known to be in it: names with `#` escapes, numbers in every lexical form, a classic cross-reference table, and an incremental update with an object stream and a cross-reference stream. The change mirrors `render-book.mjs`'s and adds what reaches the rest of the shims: text drawn on a page that has just been given a new key, which moves the page's entries in `fast-dict-onebuf`'s buffer and must keep the page's two flags with them, a page inserted and one removed, objects parsed early and edited late, and a call of each patched method the book does not make, its result written into the document so that the comparison checks it. The created document reaches the factories that build a page tree and a catalog. Each member of pdf-lib that a shim puts a function into is checked against `PATCHES`, a list in the gate. A listed member that is not patched fails it, and so does a patched member that is not listed: a patch applied to a copy of a class leaves pdf-lib's own member as it was. Each listed member's function must run, unless the list marks the member as one neither document reaches and says why, and a marked member that runs fails the gate as well, so the marks stay true. A shim none of whose functions runs is reported whole, since the documents then no longer test it, or the book does not need it. Each patched member must also be in the table of targets its shim passes to `checkTargets` (`book/lib/shim-targets.mjs`), the check that stops the import when pdf-lib's own version of a member changes: a patch whose member is missing from the table would let a pdf-lib update change it unnoticed, so the gate fails and names the shim and the member. On a difference, that document's shimmed side runs again with each shim alone and with each left out, and the report names the shims that make it.

Exit codes: **0** the shims write what stock pdf-lib writes, and every shim and patched member is reached, as listed and in its shim's table; **1** a pair of files differs, a shim or patched member is no longer reached, or a patched member is not as listed or not in its shim's table; **2** the check could not run: a refused command line, a failure of the check itself, or a crash.

## check_impexp_parity.mjs
{: #check-impexp-parity }

    node scripts/check_impexp_parity.mjs

Verifies that the two editions of the [impexp tool](Tools-Compiler#impexp), `scripts/impexp.mjs` and `scripts/impexp.py`, behave the same, as that section promises. Both `--self-test` suites must pass, with the same test names in the same order. Then one sequence of commands runs through each edition, each in a scratch folder of its own holding copies of `indexer/sample.twinpack` and `test/example-projects/console`: export and import, the printing commands, and each refusal, failure and warning the exit codes name. After every command, both editions must give the exit code the command is there for, print the same on each stream, and leave the same files, compared as bytes. On Windows, Python writes CRLF to the console, so there a CRLF in the printed output is read as LF on both sides; on Linux, as in CI, the output is compared as written. About four seconds, most of it Python starting once a command.

Without Python 3.6 or later on the `PATH` (it tries `python3`, then `python`, then `py -3` on Windows), the gate prints `SKIPPED` and exits 0, so `test.bat` passes on a machine without Python. When `CI` is `true`, as GitHub sets it, the same case fails instead: CI must compare the two.

Exit codes: **0** the two editions agree, or the check was skipped because no Python was found; **1** the editions differ, or a built-in test failed; **2** the check could not run: a refused command line, no Python when `CI=true`, or a crash.

## check_axe_patch_equiv.mjs
{: #check-axe-patch-equiv }

    node scripts/check_axe_patch_equiv.mjs [--patch NAME]

Value-equivalence check for the vendored axe source patches. Builds the same colours under the stock and patched bundles and compares every derived value `color-contrast` consumes. This is the companion to the [fingerprint gate](Tools-Site-Checks#check-a11y-fingerprint), and both are needed: the fingerprint gate compares `incomplete` as a rule-id *set*, so a colour error that shifted contrast ratios without flipping any pass/fail classification would sail straight through it. Run it before adopting a new `SOURCE_PATCHES` entry and after **every** axe-core upgrade --- the patches are pinned to the bundle's current text, and an upgrade needs this gate *and* the fingerprint gate, never one of the two. See [Upgrading axe-core](Tools-Site-Checks#upgrading-axe-core) for the sequence.

Exit codes: **0** the patched bundle gives the same colour values as stock axe, **1** at least one colour value differs, **2** the check could not run: a refused command line, or a crash.
