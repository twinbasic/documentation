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
| `--fallback-extensions <list>` | Comma-separated list of extensions to append when a link target does not exist as-is. Use `html` to mirror GitHub Pages' extensionless-URL behaviour. |
| `--index-files <list>` | Comma-separated list of filenames to try when a URL resolves to a directory. Use `'index.html,.'` to also accept the directory itself as a valid target. |
| `--base-path <prefix>` | Strip this prefix from root-absolute URLs before resolving. Used in CI when `--baseurl` is set. |
| `--include-fragments` | Resolve `#fragment` anchors against the target page's IDs. |
| `--forbid <prefix>` | Repeatable. Fail the run if any extracted link starts with `prefix`. Used by the offline pass to catch live-site links the offlinify rewrite missed (the bare prefix and `prefix/` are exempt). On a built offline tree, pass `--online-root` as well, or the links the rewrite writes on purpose to files only the website holds are reported. |
| `--online-root <dir>` | The online tree the `--forbid` prefixes serve. A forbidden link to a file that tree holds and the checked tree does not is the offline rewrite's link to the website, and is not reported, as the build's own offline check does not report it. A link to a page both trees hold is still a rewrite that was missed. |
| `--check-html` | Assert HTML well-formedness. |
| `--check-a11y` | Report accessibility hints (missing `alt`, etc.). |
| `--check-ids` | Flag duplicate `id` attributes within a page. |
| `--check-remote-assets` | Flag any `<img>` whose `src` points off-box (`http://`, `https://`, or protocol-relative `//host`). Remote images cost a network round trip per view, break the offline mirror, and abort the PDF book render --- the forked paged.js raises an error on an image that has not finished loading. The remedy depends on the host. A `https://github.com/user-attachments/assets/...` URL needs no edit: the next local build downloads it to `docs/assets/attachments/` and renders that copy instead, so commit the downloaded file alongside the page. Any other host has no such handling --- download the image yourself and commit it under the section's `Images/` folder. See [Authoring Pages](Authoring#images). |
| `--check-sitemap` | Assert `sitemap.xml` covers every page. |
| `--check-search` | Assert search-index entries resolve to existing pages. |
| `--check-canonical` | Assert each page's canonical URL matches its location. |
| `--no-fail` | Downgrade failures to informational output (exit 0 even with broken links). |

A finding can be a broken link, an integrity failure or both (the integrity checks share the same SAX parse pass as link extraction); the summary lines say which. `--no-fail` turns a finding's 1 into 0, and changes nothing else. The script dedupes `(target, fragment)` so each unique filesystem check fires exactly once regardless of how many pages link to the same target --- on the current tree (~733k link occurrences, ~12k unique targets across 1,127 HTML files / 124 MB) each pass runs in ~2.2 seconds on a development box.

Exit codes: **0** every check passed, or `--no-fail` turned the findings into 0; **1** a link, forbidden-prefix or integrity check failed (with `/sep/` segments, the highest code of any segment); **2** the check could not run: a refused command line (no arguments, an unknown option, a flag without its value, no `--offline`, or no input), or a crash.

## crawl_check.mjs
{: #crawl-check }

    node scripts/crawl_check.mjs <start-url> [--concurrency N] [--timeout MS] [--skip-external]

Online link crawler for the deployed site. Starts at `<start-url>`, GETs every same-origin / same-base-path page recursively, extracts every link the build's own check follows (`srcset` and `poster` included), and verifies that each link responds 2xx (HEAD for cross-origin, GET for same-origin). A request that fails before any response arrives, whether its connection is reset or it times out, is tried twice more, each time with the full `--timeout`, before its link is reported broken. The timeout covers a page's body as well as its headers. A page whose body breaks off, or is still arriving when the timeout runs out, is reported broken at once, without a retry, and the part that arrived is not parsed for links. A command line it refuses includes a missing start URL or one that is not an absolute `http` or `https` URL, a `--concurrency` that is not a whole number of at least 1, a `--timeout` that is not a whole number of milliseconds from 1 to 2147483647, and a second argument. Use it after a manual `workflow_dispatch` deploy to verify the published site --- `check_links.mjs` covers the local filesystem; `crawl_check.mjs` covers the live deployed site.

Exit codes: **0** every link is reachable and every anchor exists, **1** a link is broken or an anchor is missing, **2** a refused command line, or a crash.

## check_a11y.mjs
{: #check-a11y }

    node scripts/check_a11y.mjs [--root-dir <path>] [--theme light|dark|both] [--viewport desktop|mobile|both]
                                [--stock-axe] [--minified]

Automated accessibility scan of the built site, and the second of `check.bat`'s four steps (right after [`check_tree_fresh.mjs`](#check-tree-fresh)). Loads `axe-core` into headless Chromium (via `puppeteer`) and runs it against fourteen sample pages in both themes at two viewports, plus two state audits that open a disclosure first --- 64 audits in all. The page list is derived rather than hand-maintained, and [`scripts/pick_a11y_sample.mjs`](#pick-a11y-sample) is what keeps it representative.

**This script is the reporting front end, not the scan.** What the scan *is* --- the page list, the themes and viewports, the blocked requests, the axe run options, the vendored source patches and the state audits --- lives in [`scripts/lib/axe-scan.mjs`](#axe-scan), which `check_a11y.mjs`, `sweep_a11y.mjs` and `check_a11y_fingerprint.mjs` all share. Change the scan there, not here. The scan uses the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` rule tags, plus the `heading-order` best-practice rule. All five WCAG tags must be listed because axe matches tags literally, with no version rollup --- a rule tagged only `wcag21aa` does not match `wcag22aa`, even though WCAG 2.2 AA is a superset of 2.1 AA. Incomplete (needs-review) results are reported but do not fail the run.

| Flag | Effect |
|---|---|
| `--root-dir <path>` | Tree to scan. Default: `docs/_site-offline`. |
| `--theme light\|dark\|both` | Which palette(s) to test. Default: `both`. |
| `--viewport desktop\|mobile\|both` | Which viewport(s) to test (`desktop` = 1280×900, `mobile` = 375×812). Default: `both`, so each page is scanned four times. |
| `--stock-axe` | Inject the unmodified axe bundle instead of the patched one. **Run this first if a result ever looks wrong** --- it says in one command whether the source patch is implicated. |
| `--minified` | Inject `axe.min.js`. The patched path needs the unminified bundle, so this and `--stock-axe` go together when reproducing a stock baseline. |

Three details are essential and easy to break. It scans **`_site-offline/`, not `_site/`**: the online tree's root-absolute asset URLs (`/assets/css/…`) resolve to nothing under `file://`, so every page would load unstyled and every colour-contrast result would be a meaningless black-on-white pass --- the offline tree uses relative asset paths and renders for real. It scans **each page in both themes**, because dark mode is a separate palette (applied via `[data-theme=dark]`) and a light-mode pass says nothing about it. And it **blocks the search index** (`search-data.js` + `lunr.min.js`) while scanning: every page pulls in ~3.2 MB of index that never reaches the DOM axe walks, so aborting it cuts the run from ~27 s to ~9 s with identical results. `just-the-docs.js` is deliberately not blocked --- it installs the search combobox ARIA, and blocking it would make axe see less. Requires `build.bat` to have produced an up-to-date `_site-offline/`.

Exit codes: **0** no page has a violation (incomplete checks are reported but do not fail), **1** at least one page has a violation, **2** the scan could not run: a refused command line, or a crash.

## pick_a11y_sample.mjs
{: #pick-a11y-sample }

    node scripts/pick_a11y_sample.mjs [--check|--propose|--census] [--fresh]

Derives the accessibility scan's page list, and checks that it still covers every construct the site uses. The scan reads fourteen pages out of ~1,160, so the page list decides what it can report at all --- and a list that stops being representative fails silently: the rule for a construct no sample page carries simply never runs, and the gate stays green.

The script holds a list of **construct families**: markup shapes some axe rule keys on, each recording the rule that would otherwise have nothing to run on. `--check` (the default, and what `check.bat` and both CI workflows run) verifies every family the site uses is covered by at least one sample page, and names the gaps and the cheapest page that would close each. `--propose` runs a greedy set cover, ranked by measured per-page audit cost, and prints a replacement page list. `--census` reports what each family is, how many pages use it, and which page uses it most. Two of the three modes together are refused. `--fresh` applies to `--propose` alone: by default the set cover is seeded with the current list, so it prints what to *add*, and `--fresh` ignores the current list and covers from scratch --- which is how to ask whether the pages already in the sample still earn their place.

**`--check` cannot report a construct nobody has registered.** It iterates the families that exist and asks whether the sample still covers each, so markup no family describes produces silence --- and that silence is the failure a derived sample exists to prevent. When the docs start using a construct they have not used before, registering the family is a deliberate step nothing will prompt you to take.

A family is one entry in the `FAMILIES` object at the top of the script, keyed by a short name, with three fields:

    kbd: { re: /<kbd[\s>]/g, min: 2, why: "color-contrast on inline key caps" },

`re` is a global regular expression matched against each page's built HTML --- the emitted markup, not the markdown --- so key it on the tag or class the renderer actually produces. `min` is how many matches a page needs before it counts as covering the family, and it is the field that needs a decision: `1` when one instance exercises the rule exactly as fifty would, higher when the rule is about the relationship *between* instances. Consecutive `<summary>` elements are the worked case --- `target-size` between two of them is registered as its own family at `min: 8`, because a page with one disclosure does not exercise it and neither does a page with four. `why` names the axe rule that would otherwise have nothing to run on, and is what a failure prints.

Then run `--check`. If the new family is uncovered it names the cheapest page that would close the gap, and **adding that page means editing `SAMPLE_PAGES` in `scripts/lib/axe-scan.mjs`, not this script.** An entry there is a bare string --- the page's path in the built tree, root-relative, with the `.html` on it and no origin:

    "/Documentation/Development/Pipeline-Stages.html",

which is the path `--check` names for you. Two things follow from that second edit. Run [`scripts/sweep_a11y.mjs`](#sweep-a11y) once over the whole site, because the sample can only ever report on the markup it contains, and the sweep is what says what the new construct is doing on the pages that already have it. And do not expect [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint) to vouch for it: it compares a candidate against a baseline produced by the same page set, so a change to *which* pages are walked is its documented blind spot.

Exit codes: **0** the mode ran (with `--check`, every construct family in use is covered); **1** with `--check`, a construct family has no sample page, or a `SAMPLE_PAGES` entry is not in the built tree; **2** a refused command line, no built tree (run `build.bat` first), or a crash.

## check_links_diff.mjs
{: #check-links-diff }

    node scripts/check_links_diff.mjs [--a SIDE] [--b SIDE] [--case NAME ...]
                                      [--base-path-tree DIR] [--build-base-path]
                                      [--max-lines N] [-v]
    node scripts/check_links_diff.mjs --list
    node scripts/check_links_diff.mjs --self-test

Differential harness for the link checker. The check has two front ends --- the standalone [`scripts/check_links.mjs`](#check-links), which reads a tree from disk, and the build's own `--check` pass, which checks the pages it holds in memory against an index of what it wrote, in chunks across its workers. Both run the same functions in `builder/check.mjs` and differ only in how they read the tree, which is still enough to hide a fault, because **a checker that silently checks less reports a clean pass**. This runs both over the same bytes and diffs their findings category by category, across the nine finding categories plus the per-run counts.

Two registries decide what a run actually does, and `--list` prints both. **Sides** are the implementations being compared, named by `--a` and `--b`:

| Side | What it is |
|---|---|
| `script` | `check_links.mjs` pinned to `--oracle fs`, run in-process. The reference side --- though not an oracle of record: on Windows its filesystem oracle answers "exists" for a wrong-case path that 404s on GitHub Pages, and on that one question `index` is the correct side. |
| `index` | The same script over the same walk, with existence answered from a Set built off one directory listing rather than a stat per candidate. Proves the oracle's lookup semantics. |
| `fused` | `tbdocs --check`, the build's own pass. The side the whole harness exists for: the one that could quietly check less, with nothing else on a clean site to say so. |
| `mutant` | `script`, corrupted on purpose. Reachable only through `--self-test`. |

Both default to `script`, and a bare invocation is refused rather than printing agreement between an implementation and itself.

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

That last column is the part worth reading before trusting a green run. Under `--b fused` the two cases with no fused equivalent are skipped --- named in a `skipped:` line, not silently --- because the build's pass checks what the build produced and has nothing to say about a `--root-dir` shape variation or a hand-written tree it never wrote. The real-tree cases are empty in nearly every category on a healthy site, so for as long as `fixture` was the only fault-carrying case, **every `--b fused` run dropped the one case that gave the comparison anything to compare.** The built pair closes that: the same idea in a tree `tbdocs` produced, split across two cases because no single tree carries all nine categories --- the online tree has the sitemap, search and canonical checks, and the offline tree has the forbidden prefix the online tree lacks.

Both CI workflows run the harness, and neither runs it over the real site. `checks.yml` (pull requests) runs both halves:

    node scripts/check_links_diff.mjs --case fixture --a script --b index
    node scripts/check_links_diff.mjs --case fixture-built --case fixture-built-offline --a script --b fused

`tbdocs-gh-pages.yml` (deploy) keeps only the first: ~0.3 s over a synthetic tree, enough that the script side cannot rot unnoticed, while the extra three-page build stays on the PR gate. What is in neither, and deliberately not in `check.bat` either, is the full `--a script --b fused` over the real trees --- it builds the site itself so both sides read the same bytes, and the script side then costs a few seconds, which is the entire saving of having folded the check into the build. Run that one by hand after touching `builder/link-check.mjs`, `builder/check.mjs` or `scripts/check_links.mjs`.

`--self-test` is the guard on the guard. It runs `check_links.mjs`'s own regression guards --- nothing else does --- and then diffs the `script` side against a deliberately corrupted copy, failing unless the difference is reported. Everything else the harness prints reduces to *the two sides agreed*, which is also what a harness comparing nothing says.

The fixtures have their own document, and it is the one to read before editing them: [`test/README.md`](https://github.com/twinbasic/documentation/blob/main/test/README.md) covers what each page under `check-src/` is there to provoke, and the hard-coded per-category counts (`FIXTURE_EXPECTED`, `FIXTURE_BUILT_ONLINE`, `FIXTURE_BUILT_OFFLINE`) that are asserted after every run, so a fixture that stops provoking a category fails loudly instead of quietly returning to empty-against-empty. It also covers the hazard that catches people out: **the fixture is built by the real `tbdocs`, so a template change can turn this gate red without anyone touching the fixture or the checker.** Adding the self-hosted fonts put two `<link rel="preload">` tags on every page, `check-src/` had no `assets/fonts/`, and its `broken` count went from 3 to 9. The fix for that shape of failure is to add the stub asset the template now expects --- never to raise the expected count, which dilutes a category the fixture exists to hold at an exact number.

Exit codes: **0** the two sides agree in every case; **1** the sides differ, a fixture's category counts drifted, or `--self-test` failed; **2** the comparison could not run: a refused command line, an unknown side or case, `--a` equal to `--b`, a failed build, or a crash.

## axe-scan.mjs
{: #axe-scan }

Not a command --- `scripts/lib/axe-scan.mjs` is the shared module that **defines** the accessibility scan, imported by [`check_a11y.mjs`](#check-a11y), [`pick_a11y_sample.mjs`](#pick-a11y-sample), [`sweep_a11y.mjs`](#sweep-a11y), [`check_a11y_fingerprint.mjs`](#check-a11y-fingerprint) and [`check_axe_patch_equiv.mjs`](Tools-Toolchain-Tests#check-axe-patch-equiv). It holds `SAMPLE_PAGES`, `THEMES`, `VIEWPORTS`, `STATE_AUDITS`, `BLOCKED_REQUESTS`, `AXE_RUN_OPTIONS`, `SOURCE_PATCHES` and the `SCHEMES` registry, plus the `runMatrix` / `buildMatrix` drivers, and the page discovery the sampler and the sweep share: `discoverPages`, and `STUB_TAG_CEILING`, below which a page is a redirect stub neither of them audits. Any change to *what the scan runs* belongs here, and most of them must go through the [fingerprint gate](#check-a11y-fingerprint) first. **`SAMPLE_PAGES` is the exception, and it is the constant most often edited**: the gate compares a candidate against a baseline produced by the same page set, so a change to *which* pages are walked is its documented blind spot, and a green run there vouches for nothing. Argue that one from source, run [`sweep_a11y.mjs`](#sweep-a11y) once, and use the gate's A/A control (`--baseline production --candidate production`) only to show the matrix is still deterministic.

`STATE_AUDITS` deserves a note: a closed `<details>` subtree is `notRendered`, so axe never walks it. Entries here are layered onto the page × theme × viewport matrix and apply a DOM mutation from `PAGE_STATES` before the audit, which is how the section-links disclosure gets audited open as well as closed. **Every `PAGE_STATES` function must assert it found what it expected** --- a state that silently does nothing degrades into a second audit of the default page: slower, still green, covering nothing.

## check_tree_fresh.mjs
{: #check-tree-fresh }

    node scripts/check_tree_fresh.mjs [--tree DIR] [--source DIR ...]

`check.bat`'s first gate. Refuses a built tree older than the sources that produced it, by comparing the newest mtime under the sources against the built tree's `index.html`. The sources are `docs/`, `builder/` and `lib/`, and the two inputs of the [help add-in's project file](Tools-Build#the-help-add-ins-project-file): `add-in/`, less the help archive and the add-in's copy of the symbol index, which the build writes, and `scripts/impexp.mjs`. The build's own output trees under `docs/` are not sources, and which folders those are comes from `lib/markdown-files.mjs`, the list [`check_code_regions.mjs`](Tools-Toolchain-Tests#check-code-regions) walks by. Without it, editing a page and running `check.bat` without rebuilding audits the *previous* build and passes --- a green run that says nothing about the change just made. CI never hits this because it builds in the same job; a development box hits it whenever the two commands run out of order. The message for a stale tree names `build.bat`.

Exit codes: **0** the tree is at least as new as its inputs; **1** the tree is stale (run `build.bat`); **2** the check could not run: a refused command line, no built tree or marker file, or a crash.

## check_dot_fit.mjs
{: #check-dot-fit }

    node scripts/check_dot_fit.mjs [--verbose]

Renders every committed diagram with the real webfont and fails if a label sits outside the box Graphviz drew for it. Graphviz lays out boxes from a width table while the browser paints text with an actual font --- two measurements of the same string that nothing inside the build compares. When they disagree the SVG is still well-formed and the build still green; the only symptom is a label hanging past its edge. Twenty-seven labels across three diagrams shipped that way, on pages that had passed the full accessibility sweep, because axe does not evaluate SVG `<text>` geometry either. `builder/dot-metrics.mjs` fixed the cause; this proves it stayed fixed. Needs a browser, which is why it lives in `check.bat` rather than the build. Run it after touching any `.dot`, `builder/dot-metrics.mjs`, or `builder/inter-metrics.json`.

Exit codes: **0** every diagram's text fits its boxes, or no diagram was found; **1** the text of at least one diagram sits outside its box; **2** the gate could not run: a refused command line, no browser, or a crash.

## check_a11y_fingerprint.mjs
{: #check-a11y-fingerprint }

    node scripts/check_a11y_fingerprint.mjs --list
    node scripts/check_a11y_fingerprint.mjs [--candidate <scheme>] [--baseline <scheme>]
                                            [--patches <name>] [--unminified]
                                            [--root-dir <path>] [--pages <list>]
                                            [--theme <t>] [--viewport <v>] [--out <file>]

The gate for any change to *what the scan runs*. axe is the site's correctness oracle, which makes it dangerous to tune: a change can make axe see **less** and still report a clean pass. Blocking `just-the-docs.js`, for example, makes the scan faster and quietly cuts the colour-contrast nodes axe examines on one page to almost none. This runs the full page × theme × viewport matrix twice, once under each of two named schemes from `axe-scan.mjs`'s registry, against one build in one process, and diffs the findings audit by audit (violations by `ruleId:nodeCount`, incomplete by rule-id set).

Two limits worth knowing. It compares a candidate against a baseline produced by that same scheme's element set, so it **cannot** detect a change that stops auditing elements entirely --- anything touching viewport, visibility or request blocking has to be argued from source instead. And it compares *which* findings axe produces, never their shape, so a scheme that passes every audit can still crash the reporter. Necessary, not sufficient. Both `--baseline` and `--candidate` default to `production`, so a bare run is already that A/A control --- run it after touching the matrix. Each must name a scheme that `--list` prints, and `--patches` a list of the patches it prints.

Exit codes: **0** every fingerprint is identical, or `--list` printed the schemes; **1** at least one fingerprint differs; **2** the check could not run: a refused command line, or a crash.

### Upgrading axe-core
{: #upgrading-axe-core }

`package.json` pins `axe-core` exactly --- no caret --- because the source patches are pinned to the bundle's current text and roughly fifty line citations in `builder/PLAN-axe-perf.md` are pinned to its current layout. A bump is therefore a deliberate act, and it needs **both** gates. Neither is implied by the other, and each needs Chromium and an up-to-date `_site-offline/`:

    node scripts/check_a11y_fingerprint.mjs --patches plain-color-fields
    node scripts/check_axe_patch_equiv.mjs

The first asks whether the patched bundle still *finds* what the stock one finds, across the full page × theme × viewport matrix. `--patches` is what makes it ask that. Without the flag each side runs its own scheme's patch list, and since every scheme inherits `DEFAULT_PATCHES` the two sides would share a bundle --- a no-op for this question. With it the flag overrides both: stock on the baseline, the named patches on the candidate. It also selects the unminified bundle for the patched side on its own, so `--unminified` is not part of this run.

Read that diff as **news, not as a regression to be suppressed.** axe ships new and revised WCAG rules between minors, so a bump can legitimately change what the scan reports. The gate exists to make the change visible, not to freeze coverage where it is.

The second asks whether the patched bundle still *computes* what the stock one computes, and it is the half a reader is most likely to skip --- `test.bat` and both CI workflows run it, so a bump that breaks it surfaces as a red PR rather than as something the upgrade asked for. It is not optional for a patch to the colour maths, because the fingerprint gate compares `incomplete` as a rule-id *set*: a colour error that shifted contrast ratios without flipping any pass/fail classification produces the same set and sails through. `--patch` defaults to `plain-color-fields`, the single entry `DEFAULT_PATCHES` carries; name another, an entry of `SOURCE_PATCHES`, when adopting a new one.

A third failure mode needs no gate at all: each substitution inside a patch asserts its target was found, so a bump that moves the code fails loudly rather than silently reverting to the slow path. What none of the three reaches is a result that merely looks wrong. [`check_a11y.mjs --stock-axe`](#check-a11y) injects the unmodified bundle, which says in one command whether the patch is implicated.

## sweep_a11y.mjs
{: #sweep-a11y }

    node scripts/sweep_a11y.mjs [--theme <t>] [--viewport <v>] [--filter <substr>]
                                [--limit N] [--resume] [--report] [--out FILE]
                                [--root-dir DIR] [--stock-axe] [--recycle-every N]

The full-site accessibility sweep: every page, both themes, both viewports --- 3,476 audits, roughly 20 minutes. The fourteen-page sample exists because this is too slow for a commit gate, but the sample can only report on constructs it carries, and when the sample was six hand-picked pages this sweep found **six violation classes on 54 pages**, every one in a construct the sample could not see. Run it after any change that moves type metrics or page structure, and when adding a construct family to [`pick_a11y_sample.mjs`](#pick-a11y-sample). Note it audits every page with disclosures **closed** only; the open-state coverage is the sample scan's `STATE_AUDITS`.

Exit codes: **0** no accessibility violation was found, **1** the sweep found at least one violation, **2** a refused command line (a bad `--theme` or `--viewport` included), or a crash.
