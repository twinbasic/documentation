---
title: Site Checks
parent: Tools and Scripts
grand_parent: Documentation Development
nav_order: 2
permalink: /Documentation/Development/Tools-Site-Checks
---

# Site Checks
{: .no_toc }

Checks a built site: its links, its freshness against the sources, its diagrams, and its accessibility. The command-line conventions every tool shares are under [Command-line conventions](Tools#command-line-conventions).

* TOC goes here
{:toc}

## check_links.mjs
{: #check-links }

    node scripts/check_links.mjs [pass-args...] [/sep/ [pass-args...] ...]

Offline (filesystem-only) link checker plus optional integrity checks. Multiple `/sep/`-separated passes run in parallel through `worker_threads`. The relevant flags:

| Flag | Effect |
|---|---|
| `--offline` | Required. Online (network) link checking is not implemented. |
| `--root-dir <path>` | Filesystem root to resolve root-absolute URLs against. |
| `--fallback-extensions <list>` | Comma-separated extensions to append when a link target does not exist as-is. Use `html` to mirror GitHub Pages' extensionless URLs. |
| `--index-files <list>` | Comma-separated filenames to try when a URL resolves to a directory. Use `'index.html,.'` to also accept the directory itself. |
| `--base-path <prefix>` | Strip this prefix from root-absolute URLs before resolving. Used in CI when `--baseurl` is set. |
| `--include-fragments` | Resolve `#fragment` anchors against the target page's IDs. |
| `--forbid <prefix>` | Repeatable. Fail the run if any extracted link starts with `prefix`. The offline pass uses it to catch live-site links the offlinify rewrite missed (the bare prefix and `prefix/` are exempt). On a built offline tree, pass `--online-root` as well, or the links the rewrite writes on purpose to files only the website holds are reported. |
| `--online-root <dir>` | The online tree the `--forbid` prefixes serve. A forbidden link to a file that tree holds and the checked tree does not is the offline rewrite's link to the website, and is not reported. A link to a page both trees hold is a missed rewrite, and is reported. |
| `--check-html` | Assert HTML well-formedness. |
| `--check-a11y` | Report accessibility hints (missing `alt`, etc.). |
| `--check-ids` | Flag duplicate `id` attributes within a page. |
| `--check-remote-assets` | Flag any `<img>` whose `src` points off-box (`http://`, `https://`, or protocol-relative `//host`). Remote images cost a network round trip per view, break the offline mirror, and abort the PDF book render. The remedy depends on the host. A `https://github.com/user-attachments/assets/...` URL needs no edit: the next local build downloads it to `docs/assets/attachments/` and renders that copy, so commit the downloaded file with the page. For any other host, download the image and commit it under the section's `Images/` folder. See [Authoring Pages](Authoring#images). |
| `--check-sitemap` | Assert `sitemap.xml` covers every page. |
| `--check-search` | Assert search-index entries resolve to existing pages. |
| `--check-canonical` | Assert each page's canonical URL matches its location. |
| `--no-fail` | Downgrade failures to informational output (exit 0 even with broken links). |

A finding can be a broken link, an integrity failure or both; the summary lines say which. `--no-fail` turns a finding's 1 into 0 and changes nothing else. Each unique `(target, fragment)` is checked once, however many pages link to it, so a pass over the whole site takes ~2.2 seconds on a development box.

Exit codes: **0** every check passed, or `--no-fail` turned the findings into 0; **1** a link, forbidden-prefix or integrity check failed (with `/sep/` segments, the highest code of any segment); **2** the check could not run: a refused command line (no arguments, an unknown option, a flag without its value, no `--offline`, or no input), or a crash.

## crawl_check.mjs
{: #crawl-check }

    node scripts/crawl_check.mjs <start-url> [--concurrency N] [--timeout MS] [--skip-external]

Online link crawler for the deployed site. Use it after a manual `workflow_dispatch` deploy to verify the published site. `check_links.mjs` covers the local filesystem; `crawl_check.mjs` covers the live site.

It starts at `<start-url>`, fetches every same-origin, same-base-path page recursively, extracts every link the build's own check follows (`srcset` and `poster` included), and verifies that each responds 2xx (HEAD for cross-origin, GET for same-origin).

A request that fails before any response arrives, by connection reset or timeout, is tried twice more, each time with the full `--timeout`, before its link is reported broken. The timeout covers a page's body as well as its headers. A page whose body breaks off, or is still arriving when the timeout runs out, is reported broken at once, without a retry, and the part that arrived is not parsed for links.

It refuses a missing start URL or one that is not an absolute `http` or `https` URL, a `--concurrency` that is not a whole number of at least 1, a `--timeout` that is not a whole number of milliseconds from 1 to 2147483647, and a second argument.

Exit codes: **0** every link is reachable and every anchor exists, **1** a link is broken or an anchor is missing, **2** a refused command line, or a crash.

## check_a11y.mjs
{: #check-a11y }

    node scripts/check_a11y.mjs [--root-dir <path>] [--theme light|dark|both] [--viewport desktop|mobile|both]
                                [--stock-axe] [--minified]

Automated accessibility scan of the built site, and the second of `check.bat`'s four steps (right after [`check_tree_fresh.mjs`](#check-tree-fresh)). It loads `axe-core` into headless Chromium (via `puppeteer`) and runs it against sixteen sample pages in both themes at two viewports, plus two state audits that open a disclosure first --- 72 audits in all. The page list is derived, and [`scripts/pick_a11y_sample.mjs`](#pick-a11y-sample) keeps it representative.

This script only reports. The scan itself --- page list, themes and viewports, blocked requests, axe run options, source patches and state audits --- lives in [`scripts/lib/axe-scan.mjs`](#axe-scan), shared with `sweep_a11y.mjs` and `check_a11y_fingerprint.mjs`. Change the scan there, not here.

The scan uses the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` rule tags, plus the `heading-order` best-practice rule. All five WCAG tags must be listed because axe matches tags literally: a rule tagged only `wcag21aa` does not match `wcag22aa`. Incomplete (needs-review) results are reported but do not fail the run.

| Flag | Effect |
|---|---|
| `--root-dir <path>` | Tree to scan. Default: `docs/_site-offline`. |
| `--theme light\|dark\|both` | Which palette(s) to test. Default: `both`. |
| `--viewport desktop\|mobile\|both` | Which viewport(s) to test (`desktop` = 1280×900, `mobile` = 375×812). Default: `both`, so each page is scanned four times. |
| `--stock-axe` | Inject the unmodified axe bundle instead of the patched one. **Run this first if a result looks wrong**: it says whether the source patch is implicated. |
| `--minified` | Inject `axe.min.js`. The patched path needs the unminified bundle, so reproduce a stock baseline with `--minified` and `--stock-axe` together. |

Three details are easy to break:

- It scans **`_site-offline/`, not `_site/`**. The online tree's root-absolute asset URLs (`/assets/css/…`) resolve to nothing under `file://`, so every page would load unstyled and every colour-contrast result would be a meaningless black-on-white pass.
- It scans **each page in both themes**, because dark mode is a separate palette (applied via `[data-theme=dark]`).
- It **blocks the search index** (`search-data.js` + `lunr.min.js`): the ~3.2 MB of index per page never reaches the DOM axe examines, and blocking it cuts the run from ~27 s to ~9 s with identical results. `just-the-docs.js` is not blocked, because it installs the search combobox ARIA, and blocking it would make axe see less.

Run `build.bat` first, so `_site-offline/` is up to date.

Exit codes: **0** no page has a violation (incomplete checks are reported but do not fail), **1** at least one page has a violation, **2** the scan could not run: a refused command line, or a crash.

## pick_a11y_sample.mjs
{: #pick-a11y-sample }

    node scripts/pick_a11y_sample.mjs [--check|--propose|--census] [--fresh]

Derives the accessibility scan's page list, and checks that it still covers every construct the site uses. The scan reads sixteen pages out of ~1,160. If the list stops being representative, nothing fails: the rule for a construct no sample page carries never runs.

The script holds a list of **construct families**: markup shapes some axe rule keys on, each recording that rule. The modes:

- `--check` (the default, and what `check.bat` and both CI workflows run) verifies that at least one sample page covers every family the site uses. It names the gaps and the cheapest page that would close each.
- `--propose` runs a greedy set cover, ranked by measured per-page audit cost, and prints a replacement page list.
- `--census` reports what each family is, how many pages use it, and which page uses it most.

Two modes together are refused. `--fresh` applies to `--propose` only: by default the set cover is seeded with the current list and prints what to *add*; `--fresh` covers from scratch, which shows whether the pages already in the sample still earn their place.

**`--check` cannot report a construct nobody has registered.** When the docs start using a new construct, nothing prompts you to register its family.

A family is one entry in the `FAMILIES` object at the top of the script, keyed by a short name, with three fields:

    kbd: { re: /<kbd[\s>]/g, min: 2, why: "color-contrast on inline key caps" },

- `re` is a global regular expression matched against each page's built HTML, not the markdown, so key it on the tag or class the renderer produces.
- `min` is how many matches a page needs to count as covering the family. Use `1` when one instance exercises the rule as fully as fifty would, and more when the rule is about the relationship *between* instances. For example, `target-size` between consecutive `<summary>` elements is its own family at `min: 8`: a page with four disclosures does not exercise it.
- `why` names the axe rule that would otherwise have nothing to run on, and is what a failure prints.

Then run `--check`. If the new family is uncovered, it names the cheapest page that would close the gap. **Adding that page means editing `SAMPLE_PAGES` in `scripts/lib/axe-scan.mjs`, not this script.** An entry there is a bare string, the page's root-relative path in the built tree with the `.html` and no origin, as `--check` prints it:

    "/Documentation/Development/Pipeline-Stages.html",

Then run [`scripts/sweep_a11y.mjs`](#sweep-a11y) once over the whole site, to see what the new construct does on the pages that already have it. [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint) cannot vouch for the change, because it compares against a baseline produced by the same page set.

Exit codes: **0** the mode ran (with `--check`, every construct family in use is covered); **1** with `--check`, a construct family has no sample page, or a `SAMPLE_PAGES` entry is not in the built tree; **2** a refused command line, no built tree (run `build.bat` first), or a crash.

## check_links_diff.mjs
{: #check-links-diff }

    node scripts/check_links_diff.mjs [--a SIDE] [--b SIDE] [--case NAME ...]
                                      [--base-path-tree DIR] [--build-base-path]
                                      [--max-lines N] [-v]
    node scripts/check_links_diff.mjs --list
    node scripts/check_links_diff.mjs --self-test

Differential harness for the link checker. The check has two front ends: the standalone [`scripts/check_links.mjs`](#check-links), which reads a tree from disk, and the build's own `--check` pass, which checks the pages it holds in memory. A front end that silently checks less reports a clean pass, so this harness runs both over the same bytes and diffs their findings across the nine finding categories plus the per-run counts.

`--list` prints the two registries that decide a run. **Sides** are the implementations being compared, named by `--a` and `--b`:

| Side | What it is |
|---|---|
| `script` | `check_links.mjs` pinned to `--oracle fs`, run in-process. The reference side. On Windows its filesystem oracle answers "exists" for a wrong-case path that 404s on GitHub Pages; `index` is correct there. |
| `index` | The same script, with existence answered from a Set built off one directory listing instead of a stat per candidate. |
| `fused` | `tbdocs --check`, the build's own pass. |
| `mutant` | `script`, corrupted on purpose. Reachable only through `--self-test`. |

Both sides default to `script`, and a bare invocation is refused.

**Cases** are what gets checked and with which flags, selected by a repeatable `--case`. Omit it and all eight run:

| Case | Tree and flags | Fused equivalent |
|---|---|---|
| `online` | `_site/` --- integrity + sitemap + search + canonical | yes |
| `online-abs` | `online` again with an absolute `--root-dir`, asserted to reach identical findings | no |
| `offline` | `_site-offline/` --- integrity + `--forbid` | yes |
| `book` | `_site-pdf/book.html` --- fragments and `--forbid`, `--no-fail` | yes |
| `basepath` | a tree built with `--baseurl`, checked with the matching `--base-path` | yes |
| `fixture` | a synthetic tree written at run time, carrying one fault of every kind | no |
| `fixture-built` | `test/fixtures/check-src` built by `tbdocs` --- the online tree | yes |
| `fixture-built-offline` | the same build's offline tree, which has the forbidden prefix the online tree lacks | yes |

Under `--b fused`, the two cases with no fused equivalent are skipped, and a `skipped:` line names them: the build's pass checks only what the build produced. The real-tree cases are empty in nearly every category on a healthy site, so the fault-carrying cases give the comparison its content. `fixture-built` and `fixture-built-offline` are two cases because no single tree `tbdocs` produces carries all nine categories: the online tree has the sitemap, search and canonical checks, and the offline tree has the forbidden prefix.

Neither CI workflow runs the harness over the real site. `checks.yml` (pull requests) runs both halves:

    node scripts/check_links_diff.mjs --case fixture --a script --b index
    node scripts/check_links_diff.mjs --case fixture-built --case fixture-built-offline --a script --b fused

`tbdocs-gh-pages.yml` (deploy) runs only the first (~0.3 s). Run the full `--a script --b fused` over the real trees by hand after touching `builder/link-check.mjs`, `builder/check.mjs` or `scripts/check_links.mjs`; it builds the site itself.

`--self-test` runs `check_links.mjs`'s own regression guards, then diffs the `script` side against a corrupted copy, and fails unless the difference is reported. It proves the harness can see a difference at all.

Before editing the fixtures, read [`test/README.md`](https://github.com/twinbasic/documentation/blob/main/test/README.md). It covers what each page under `check-src/` provokes, and the hard-coded per-category counts (`FIXTURE_EXPECTED`, `FIXTURE_BUILT_ONLINE`, `FIXTURE_BUILT_OFFLINE`) asserted after every run.

**The fixture is built by the real `tbdocs`, so a template change can turn this gate red without anyone touching the fixture or the checker.** Adding the self-hosted fonts put two `<link rel="preload">` tags on every page; `check-src/` had no `assets/fonts/`, and its `broken` count went from 3 to 9. Fix that by adding the stub asset the template now expects, never by raising the expected count.

Exit codes: **0** the two sides agree in every case; **1** the sides differ, a fixture's category counts drifted, or `--self-test` failed; **2** the comparison could not run: a refused command line, an unknown side or case, `--a` equal to `--b`, a failed build, or a crash.

## axe-scan.mjs
{: #axe-scan }

Not a command --- `scripts/lib/axe-scan.mjs` is the shared module that **defines** the accessibility scan, imported by [`check_a11y.mjs`](#check-a11y), [`pick_a11y_sample.mjs`](#pick-a11y-sample), [`sweep_a11y.mjs`](#sweep-a11y), [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint) and [`check_axe_patch_equiv.mjs`](Tools-Toolchain-Tests#check-axe-patch-equiv). It holds `SAMPLE_PAGES`, `THEMES`, `VIEWPORTS`, `STATE_AUDITS`, `BLOCKED_REQUESTS`, `AXE_RUN_OPTIONS`, `SOURCE_PATCHES` and the `SCHEMES` registry, plus the `runMatrix` / `buildMatrix` drivers and the page discovery the sampler and the sweep share: `discoverPages`, and `STUB_TAG_CEILING`, below which a page is a redirect stub neither audits.

Any change to *what the scan runs* belongs here, and most must go through the [fingerprint gate](#check-a11y-fingerprint) first. **`SAMPLE_PAGES`, the constant most often edited, is the exception**: the gate cannot vouch for a change to which pages are walked. Run [`sweep_a11y.mjs`](#sweep-a11y) once, and use the gate's A/A control (`--baseline production --candidate production`) only to show the matrix is still deterministic.

axe never walks a closed `<details>` subtree (`notRendered`). `STATE_AUDITS` entries are layered onto the page × theme × viewport matrix and apply a DOM mutation from `PAGE_STATES` before the audit, which is how the section-links disclosure is audited open as well as closed. **Every `PAGE_STATES` function must assert it found what it expected.** A state that silently does nothing becomes a second audit of the default page: still green, covering nothing.

## check_tree_fresh.mjs
{: #check-tree-fresh }

    node scripts/check_tree_fresh.mjs [--tree DIR] [--source DIR ...]

`check.bat`'s first gate. It refuses a built tree older than the sources that produced it, by comparing the newest mtime under the sources with the built tree's `index.html`. Without it, editing a page and running `check.bat` without rebuilding audits the *previous* build and passes. CI never hits this because it builds in the same job; a development box hits it whenever the two commands run out of order. The message for a stale tree names `build.bat`.

The sources are `docs/`, `builder/` and `lib/`, and the two inputs of the [help add-in's project file](Tools-Build#the-help-add-ins-project-file): `add-in/`, less the help archive and the add-in's copy of the symbol index, which the build writes, and `scripts/impexp.mjs`. The build's own output trees under `docs/` are not sources; `lib/markdown-files.mjs` decides which folders those are, the same list [`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions) uses.

Exit codes: **0** the tree is at least as new as its inputs; **1** the tree is stale (run `build.bat`); **2** the check could not run: a refused command line, no built tree or marker file, or a crash.

## check_dot_fit.mjs
{: #check-dot-fit }

    node scripts/check_dot_fit.mjs [--verbose]

Renders every committed diagram with the real webfont and fails if a label sits outside the box Graphviz drew for it. Graphviz lays out boxes from a width table while the browser paints text with an actual font, and nothing in the build compares the two. When they disagree the SVG is still well-formed and the build still green; the only symptom is a label hanging past its edge. axe does not evaluate SVG `<text>` geometry. `builder/dot-metrics.mjs` fixes the cause; this gate proves it stays fixed.

It needs a browser, so it lives in `check.bat` rather than the build. Run it after touching any `.dot`, `builder/dot-metrics.mjs`, or `builder/inter-metrics.json`.

Exit codes: **0** every diagram's text fits its boxes, or no diagram was found; **1** the text of at least one diagram sits outside its box; **2** the gate could not run: a refused command line, no browser, or a crash.

## check_a11y_fingerprint.mjs
{: #check-a11y-fingerprint }

    node scripts/check_a11y_fingerprint.mjs --list
    node scripts/check_a11y_fingerprint.mjs [--candidate <scheme>] [--baseline <scheme>]
                                            [--patches <name>] [--unminified]
                                            [--root-dir <path>] [--pages <list>]
                                            [--theme <t>] [--viewport <v>] [--out <file>]

The gate for any change to *what the scan runs*. A change can make axe see **less** and still report a clean pass: blocking `just-the-docs.js` speeds the scan up and cuts the colour-contrast nodes axe examines on one page to almost none. This gate runs the full page × theme × viewport matrix twice, once under each of two named schemes from `axe-scan.mjs`'s registry, against one build. It diffs the findings audit by audit (violations by `ruleId:nodeCount`, incomplete by rule-id set).

Its limits:

- The baseline uses the same scheme's element set, so the gate **cannot** detect a change that stops auditing elements entirely. Argue anything touching viewport, visibility or request blocking from source.
- It compares *which* findings axe produces, never their shape, so a scheme that passes every audit can still crash the reporter.

`--baseline` and `--candidate` default to `production`, so a bare run is the A/A control; run it after touching the matrix. Each must name a scheme that `--list` prints, and `--patches` a list of the patches it prints.

Exit codes: **0** every fingerprint is identical, or `--list` printed the schemes; **1** at least one fingerprint differs; **2** the check could not run: a refused command line, or a crash.

### Upgrading axe-core
{: #upgrading-axe-core }

`package.json` pins `axe-core` exactly, with no caret, because the source patches are pinned to the bundle's current text and roughly fifty line citations in `builder/PLAN-axe-perf.md` to its current layout. A bump needs **both** gates, and neither implies the other. Each needs Chromium and an up-to-date `_site-offline/`:

    node scripts/check_a11y_fingerprint.mjs --patches plain-color-fields
    node scripts/check_axe_patch_equiv.mjs

The first asks whether the patched bundle still *finds* what the stock one finds, across the full matrix. `--patches` makes it ask that: without the flag every scheme inherits `DEFAULT_PATCHES`, so both sides would share a bundle. With it, the baseline runs stock axe and the candidate the named patches. The flag also selects the unminified bundle for the patched side, so `--unminified` is not part of this run.

Read a diff there as **news, not as a regression to suppress**: axe ships new and revised WCAG rules between minors, so a bump can legitimately change what the scan reports.

The second asks whether the patched bundle still *computes* what the stock one computes. `test.bat` and both CI workflows run it. It is required for a patch to the colour maths: the fingerprint gate compares `incomplete` as a rule-id *set*, so a colour error that shifted contrast ratios without flipping any pass/fail classification passes it. `--patch` defaults to `plain-color-fields`, the single entry `DEFAULT_PATCHES` carries; name another entry of `SOURCE_PATCHES` when adopting a new patch.

Each substitution inside a patch also asserts its target was found, so a bump that moves the code fails loudly. None of these reaches a result that merely looks wrong: [`check_a11y.mjs --stock-axe`](#check-a11y) injects the unmodified bundle and says whether the patch is implicated.

## sweep_a11y.mjs
{: #sweep-a11y }

    node scripts/sweep_a11y.mjs [--theme <t>] [--viewport <v>] [--filter <substr>]
                                [--limit N] [--resume] [--report] [--out FILE]
                                [--root-dir DIR] [--stock-axe] [--recycle-every N]

The full-site accessibility sweep: every page, both themes, both viewports --- 3,476 audits, roughly 20 minutes. That is too slow for a commit gate, so the sixteen-page sample runs instead; but the sample reports only on constructs it carries.

Run the sweep after any change that moves type metrics or page structure, and when adding a construct family to [`pick_a11y_sample.mjs`](#pick-a11y-sample). It audits disclosures **closed** only; open-state coverage is the sample scan's `STATE_AUDITS`.

Exit codes: **0** no accessibility violation was found, **1** the sweep found at least one violation, **2** a refused command line (a bad `--theme` or `--viewport` included), or a crash.
