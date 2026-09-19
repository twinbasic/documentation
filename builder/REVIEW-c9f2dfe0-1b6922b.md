# Review of `c9f2dfe0..HEAD`

38 commits · 110 files · +12,152 / −1,519 · branch `staging` at `1b6922b` · reviewed 2026-09-19

## Verdict

The range is sound where it matters most. The `renderJoin` race is genuinely fixed — confirmed at source, by a harness over the real scheduler, and by a forced-race build that fails loudly 3/3 without the fix and passes 3/3 with it. The fused link/integrity checker detects every category it claims (a probe page provoked 9/9). Every one of ~20 claimed contrast ratios recomputes exactly; the theme toggle, the 16 thumbnails, the grammar change, exit-code plumbing, tree-index derivation and CI wiring all check out; `checks.yml` dispatched green at HEAD with numbers identical to a local run.

The defects cluster in two places. **Three of the new gates report coverage they do not have** — the very pattern this range set out to eliminate. And **the link-checker fold-in and the sample widening never propagated** to the contributor docs, the maintainer guide, or the vendored-theme README. On top of that, a handful of real code bugs, two of them S1.

### Provenance

Seven area agents (link-check fold-in, scheduler, a11y scan infrastructure, render/template/vendoring, styling, claims audit, CI) plus one verifier. Every S1/S2 citation from agents 1, 2, 3, 5 and 6 was re-read against source by the orchestrator — zero discrepancies. Agents 4 and 7's top items were verified by the verifier with quoted lines and executed scratch scripts; agent 4's S3-level items rest on its own executed renders, which were not repeated.

Experiments run (details in the appendix): isolated probe build for the fused checker's categories and the audit index; forced-race reproduction on a byte-identical copy; FAQ / Menu-Window open-disclosure axe pass; Gloss.html accessibility-tree link counts; aux-nav focus-ring screenshots; `checks.yml` dispatch on the fork.

Working tree clean at `1b6922b`; the shared `docs/_site*` trees were never written during the review. No commits, no pushes.

Severity used here: **S1** — silent wrong result, data loss, or a gate that can pass while checking nothing. **S2** — loud failure, visible wrong behaviour, or a documented claim that is false in a way someone would act on. **S3** — would mislead a maintainer.

---

## Tier 1 — gates that pass while not checking what they claim

1. **[S1] Callout coverage rests on footnotes** — `scripts/pick_a11y_sample.mjs:68`.
   The `callout` family regex `/class="[^"]*(?:note|important|warning)/` matches `class="footnote"` and `class="reversefootnote"`. The only sample page reaching `min: 2` (`Features/index.html`) has 3 footnote hits and **zero callouts**. The regex also never matches `tip` (16 site-wide) or `caution`. `--check` prints "every construct family in use is covered" — CI printed exactly that today. `markdown-alert-important` (49) and `-tip` (16), each with its own title colour per theme in `admonitions.scss:16-30`, are never colour-contrast-audited by the gate.
   *Fix:* key the family on `class="markdown-alert markdown-alert-` (covers all five variants, matches nothing else).

2. **[S2] `SCHEMES.production` is not what production runs** — `scripts/lib/axe-scan.mjs:248`, `scripts/check_a11y.mjs:107,130-134`, `scripts/sweep_a11y.mjs:59`.
   The scheme labelled "what check_a11y.mjs runs today" carries only `runOptions`, no `patches`. `check_a11y.mjs` never calls `getScheme` — it declares its own `AXE_PATCHES` and injects the unminified patched bundle; `sweep_a11y.mjs` holds a third copy of the patch list. So the fingerprint gate's A/A control (`--baseline production --candidate production`) validates stock-minified axe against itself, not the bundle `check.bat` ships; any future `configure:` on the scheme would not reach the production scan.
   *Fix:* `patches: ["plain-color-fields"]` on `SCHEMES.production`; `check_a11y.mjs` and `sweep_a11y.mjs` obtain everything through `getScheme("production")`.

3. **[S2] "The patch asserts an exact occurrence count at each substitution point" is false for 12 of 20** — `scripts/lib/axe-scan.mjs:456,462`.
   `substitute(src, name, from, to, expectedCount = null)` enforces a count only when one is passed. `brand-init`, `brand-call` and the six `init<f>` pass `1`; the six `get<f>` and six `set<f>` pass nothing and assert only "≥ 1". Babel numbers duplicate private-field bindings (`_r`, `_r2`), so an axe bump that changes class order can bind the names to a different class; if that class's fields are also uninitialised the eight counted assertions still see 1, the patch rewrites the wrong class consistently (no runtime error), Color2 keeps its WeakMaps, `check_axe_patch_equiv.mjs` (Color2 values only) passes, and the −26 % is silently gone with every gate green. The claim underwrites the upgrade procedure in `check_a11y.mjs:103`, `WIP.md:598`, `builder/PLAN-axe-perf.md:1320,1461` and `.github/workflows/checks.yml:96`.
   *Fix:* pass `1` and `2` on the get/set substitutions (current counts, measured).

4. **[S2] No gate exercises the fused checker's integrity detectors** — `scripts/check_links_diff.mjs:535-538`; CI `checks.yml:92`, `tbdocs-gh-pages.yml:81`.
   `if (usesFused && !c.fused) { skipped.push(...); continue; }` drops the `fixture` case on every `--b fused` run, and `FIXTURE_EXPECTED` (`:155`) is asserted only inside the branch that is then never reached. The real site is clean, so every fused case compares empty-against-empty in eight of nine categories — `broken` is the only category ever non-empty on a fused case (the book's ten). CI runs `--case fixture --a script --b index`: both sides are the standalone script, under two oracle strategies. **The implementation is fine** — a probe page provoked eight categories on the first run and `canonical` once genuinely provoked (see appendix) — but a regression in `builder/check.mjs` that stops *reporting* a category would leave every gate green.
   *Fix:* a fixture-fused case built from a small markdown source via `tbdocs --src <dir> --check-findings`; the natural home is `checks.yml`, which is a PR gate that does not deploy and has the time.

5. **[S2] `--check-audit-index` is invoked by nothing** — `builder/check-tree.mjs:9-14`; parsed only at `builder/tbdocs.mjs:131`.
   It is the sole guard on the module that declares itself "most able to fail silently": a spurious entry in `deriveTreeRels` makes `IndexOracle` answer "exists" for a path that 404s in production, and every link to it passes. The direction it covers lost its previous coverage when `b97c75f` removed CI's `FsOracle` pass over the built trees. It is in no `.bat`, no workflow, no `package.json` script. Measured today: 0 spurious / 0 missing on both trees.
   *Fix:* bake it into `build.bat`'s flags and the two CI build steps — one `readdir` per tree; its result already feeds `integrityFailed`.

6. **[S2] `check_links.mjs`'s three regression guards run in no automated context** — `scripts/check_links.mjs:736-749`.
   `selfTest()` (base-path stripping, `isOutsideBasePath`, canonical mismatch) is inside the `isEntry` branch; `check_links_diff.mjs:62` imports `runCheck` in-process, and since `b97c75f` CI no longer invokes the script directly.
   *Fix:* call `selfTest()` from `check_links_diff.mjs` (or its `--self-test`).

7. **[S2, latent] Fused cross-file checks can go dark silently** — `builder/check.mjs:246-261`, `:298`.
   `sitemapIssues` / `searchIssues` / `canonicalIssues` stay `null` when a precondition fails (`aux.sitemapXml == null`, `JSON.parse` failure, empty canonical map), and `formatReport`'s `if (!issues || !issues.length) continue` prints `0 integrity` for `null` and `[]` alike. The standalone script prints `warning: --check-sitemap: sitemap.xml not found ..., skipping`. Only `check_links_diff`'s deliberate `null`-vs-`[]` distinction would notice — a manual step. Not reachable today (`writeAux` always supplies both fields).
   *Fix:* record why a cross-file check was skipped and print it, as the script does.

8. **[S2, local only] `check.bat` has no freshness check** — `check.bat:7-11`, `scripts/check_a11y.mjs:46`.
   All three gates read whatever `docs/_site-offline/` holds; an edit-then-`check.bat` without a rebuild audits the previous build and passes. CI is unaffected (builds in the same job).

---

## Tier 2 — code defects

9. **[S1] A 200 response with a non-image body becomes a permanent poster frame** — `builder/vendor-assets.mjs:105-113`, `:192`.
   `fetchToFile` checks only `res.ok` and `buf.length > 0` — no content-type, no magic bytes, no size floor — writes directly to the final path, and `present.has(name)` never re-fetches. Confirmed by execution with a stubbed `fetch`: a captive-portal HTML interstitial was written as `yt-….jpg` with `failed: 0` and a clean exit; the next run reported it present; CI-offline mode accepts it as satisfied. `fetchAttachment` (`:126-139`) *does* gate on content-type via `CONTENT_TYPE_EXT` — the asymmetry is the bug. The same hole covers the documented YouTube trap (`maxresdefault` 404 → `hqdefault` 200 as a 120×90 grey placeholder). All 16 committed thumbnails are genuine 1280×720.
   *Fix:* require `content-type` `image/*`, a size floor, reject a 120×90 SOF on the YouTube variants, write to a temp path and rename.

10. **[S2] A network-level fetch rejection aborts the whole build** — `builder/vendor-assets.mjs:106,108,128,130,201,232`.
    No `try`/`catch` around any `fetch` / `arrayBuffer`; only an HTTP non-2xx or an empty body takes the soft path. A rejection (DNS, TLS, reset, proxy) propagates out of `vendorAssets.execute` into `builder/scheduler.mjs:118` → `_abort` → the build dies with a raw stack. Contradicts the module's own comment at `:43-48` ("warn, record it ... one dead video should not stop a local preview") and `WIP.md:521`. Confirmed by execution.
    *Fix:* try/catch each fetch into the existing `failed++` / `console.warn` path.

11. **[S2] `brokenUnique` double-counts a cross-page broken fragment** — `builder/link-check.mjs:748` vs `:763`.
    `entryKey` keys on `entry.target` (pre-resolution); `settleFragments` keys on `p.target`, which is `entry.resolved` (`:704-707`, post-fallback `.html`). Both land in one `Set` (`builder/check.mjs:215`, `:236`). Confirmed by experiment: three pages, one broken cross-page fragment — `brokenUnique = 2` when the target page shares a chunk with one referrer, `1` otherwise. `build.bat` would print `2 broken` where the script prints `1`, and the harness would report a `counts.brokenUnique` difference that reads as a fused-side bug.
    *Fix:* carry `entry.target` on pending fragments and key `settleFragments` off it.

12. **[S2, latent] Fused `checkSitemap` / `checkSearch` ignore the opt-outs the generators honour** — `builder/link-check.mjs:778` vs `builder/sitemap.mjs:51`, `builder/search.mjs:76`.
    The checkers' only exemption is `EXCLUDE = new Set(["book.html", "404.html"])`; the generators skip `sitemap: false` and `search_exclude: true`. Any page using either key fails `--check` with `sitemap-missing` / `search-missing`. Confirmed by probe (removing `sitemap: false` dropped the finding). Also `checkSearch` (`:814`) applies only `stripHtmlSuffix`, so a `permalink:` ending in `/index.html` yields `/probe/index` against `deriveUrlPath`'s `/probe/`; `checkSitemap` escapes because `sitemap.mjs:74-77` strips `/index.html` first. No page under `docs/` uses either key today.

13. **[S2] The aux-nav "twinBASIC Home" focus ring is clipped** — `.aux-nav` (`overflow: auto`, `navigation.scss:182`) vs `a.site-button`.
    The link's box is `top: 0 / bottom: 59`, identical to the nav's; its ring is the UA `outline: auto 1px` at `+1px` offset (outset). Screenshots at 1050 px in both themes show the left and right bars ending in rounded corners with **no bottom segment** — only the header's border line beneath — while the toggle's inset ring (control) draws all four sides. `WIP.md` asserts the opposite: "Chrome's UA `outline: auto` on the aux-nav link renders in full, so only the author-defined ring needed the accommodation." Outside this range's fix list, but the range's prose vouches for it.
    *Fix:* `.aux-nav .site-button:focus-visible { outline: 2px solid <link colour>; outline-offset: -2px; }`, as for `#theme-toggle`.

14. **[S2] `.section-links > ul` margin silently reverts in dark mode** — `docs/_sass/custom/custom.scss:176-178`; compiled `just-the-docs-combined.css:208` vs `:8027` / `:14992`.
    `.section-links > ul { margin: 0.25rem 0 0 }` is (0,1,1). The dark pass re-emits JTD's `ul { margin-top: 0 }` reset as `html:not([data-theme=light]) ul` / `html[data-theme=dark] ul` at (0,1,2), later in the file, so it wins `margin-top`. Third instance of the trap `WIP.md` documents (footnote underline, `hr` margins). Cosmetic (4 px) — but axe cannot see it and nothing else does.
    *Fix:* `.main-content .section-links > ul`.

15. **[S2] `def.submit` runs outside every try/catch** — `builder/scheduler.mjs:128`, `:178`.
    `_executeMainTask`'s try wraps only `execute`; the worker-message path has no try at all and is called from `worker-pool.mjs:33`'s `message` listener. The new assertion in `render:i.submit` (`tbdocs.mjs:727-733`) therefore escapes as an uncaught exception: `_abort` never runs, `runBuild`'s `finally` never destroys the pool, `main().catch` never runs; under `--serve` the dev server dies with a raw Node stack instead of `task render:3 failed`. Reproduced with a worker-thread harness.
    *Fix:* wrap both calls → `this._abort(name, err)`.

16. **[S2] The barrier invariant has two unbound halves** — `builder/tbdocs.mjs:702` (`setDepCount(views, renderJoinIdx, N)`) and `:778` (the `expected` clone loop), 76 lines apart in a 140-line `dispatch.submit()`.
    Nothing ties them together; `verifySchedulerSAB` iterates static `taskDefs` only and runs before `dispatch.submit` exists; there are no tests. A third fan-out that copies the dep-count block and misses the clone loop reproduces the original bug exactly.
    *Fix:* one helper — `registerBarrier(scheduler, views, idMap, join, predNames)` — that does both, so the count cannot be written without the list.

17. **[S2 claim / S3 code] Three merge-path tolerances survive "everywhere on the merge path"** — `builder/check.mjs:210` (`if (!c) continue`), `builder/cpu-worker.mjs:264` (`items.filter(p => p.offlineHtml !== undefined)`), `builder/tbdocs.mjs:400-402` (`r?.written ?? 0`).
    None is live: the `short` count guard at `tbdocs.mjs:945-948` and identical per-lane tree-key sets cover them. But `WIP.md` ("every skip on the chunk-merge path that used to tolerate a missing piece now refuses to continue") and `PLAN-sab-pull-scheduler.md:598-611` say they are gone, and the PLAN's `formatReport` row ("an errored chunk fails the run") is false for the book: `TREES.pdf.noFail` (`check.mjs:95`) makes `formatReport` return `integrityFailed: false` (`:324-325`), so a `checkBook` chunk error prints and exits 0.
    *Fix:* `if (!c) throw`, drop the `c?.` at `tbdocs.mjs:954`, and correct the two documents.

18. **[S2] `FsOracle` is case-insensitive on NTFS, and the script is called "the oracle of record"** — `builder/link-check.mjs:449-461` vs `:516-525`; `scripts/check_links_diff.mjs:247`.
    `IndexOracle`'s `indexKey` normalises separators and trailing slashes, never case. `fs.statSync("docs/_site/tb/gloss.html").isFile()` is `true` on this box for the file `tB/Gloss.html`. A wrong-case link passes the script on Windows and 404s on GitHub Pages; the harness would report the fused side (correct) as the one with the extra finding. No such link exists today.
    *Fix:* default `--oracle index` when `process.platform === "win32"`, or document it beside the flag.

19. **[S2] The vendored README says `_sass/` is byte-for-byte and names `buttons.scss`** — `builder/vendor/just-the-docs/README.md:12`.
    This range patched four `_sass` files (`buttons.scss` `.btn-reset { color: inherit }`, `layout.scss`, `navigation.scss`, `support/_variables.scss` `$grey-dk-100` / `$link-color`) with no patch manifest; the README has an "In-tree patches to `just-the-docs.js`" section but nothing for Sass, and its re-vendoring procedure `rm -rf`s `_sass` — which would silently revert the AAA contrast fixes and the 1.39:1 button fix.
    *Fix:* an "In-tree patches to `_sass/`" section naming the four files, and correct the inventory row.

20. **[S3] The heading normaliser is a blanket +1 shift** — `builder/render.mjs:1078`.
    Trigger: h1 present, h3 present, h2 absent. Action: every level ≥ 3 raised by one. `# / ### / #####` → h1/h2/**h4** — the skip survives, now invisible in source; `# / ####` never triggers; a raw `<h2>` HTML block is not counted, so a page mixing it with `###` gets its h3s promoted over the author's structure. Confirmed by scratch render. No page affected today (0 heading skips across all 1,159 built pages). `WIP.md` describes it as "raises h3→h2".

21. **[S3] "6 unresolved" on every green offline build is a regex artifact** — `builder/offline-rewrite.mjs:292-295`, `:405-408`.
    `HTML_COMBINED_RE`'s `\b(href|src)=` matches the tail of the **`data-svg-src`** attribute on the six inlined diagrams (`-` is a non-word character, so `\b` succeeds). The misses are counted into `offlineMisses` and printed at `tbdocs.mjs:1208`; they are never listed anywhere. All six files exist in `_site-offline`; zero root-absolute `href`/`src` survive in the offline HTML.
    *Fix:* `(?<![\w-])(href|src)=` and a way to list the misses.

---

## Tier 3 — smaller code issues

- `builder/tbdocs.mjs:880` — `writePdf.expected` names `flushJoin` with a comment saying it guarantees `renderedContent`; that holds only transitively via `flush:i` being lane-pinned to `render:i`. Add `"renderJoin"` (already DONE by then; zero cost).
- `builder/tbdocs.mjs:800` — `writeAssets` depends on `vendorAssets` only through `prepPageDirs ← prepDest ← dispatch ← markdownInit`; `dot` is listed explicitly for the identical reason. Add `"vendorAssets"`.
- `builder/render.mjs:1735` — `setClass` replaces the whole `class` attribute; `[T](…){: .video .float-right }` renders `class="video-link"`.
- `builder/render.mjs:1789` — the SVG paragraph unwrap bails unless the paragraph is a lone image; `See this: ![d](x.svg)` still emits `<div>` inside `<p>`. No page does this today.
- `builder/render.mjs:1750` — `remoteImagePlugin` hooks only markdown-it's `image` rule; a raw `<img src="https://github.com/user-attachments/…">` is downloaded by the scan (`vendor-assets.mjs:62` says it covers both) but never rewritten, so `--check-remote-assets` fails with no hint that the syntax is the problem. This half has never run: no page references a user-attachment URL; the four committed PNGs were vendored by hand in `780c77a`.
- `builder/highlight-theme.mjs:168`, `:181` — `clampContrast` returns a non-hex colour, or one it cannot raise to 4.5:1, unchanged with no warning and no CSS comment. Not reachable with the current `.theme` files.
- `builder/check.mjs:412` — `findingsFor.integrityFailed = integrityCount > 0` omits `r.errors`, unlike `formatReport:313`; `--check-findings` can report `false` for a run that exited 2.
- `scripts/check_a11y.mjs:76` — `--theme` is unvalidated; `--theme drak` sets `data-theme="drak"`, renders light, and labels the report `[drak, …]`. `:131` — `--stock-axe` also switches to the minified bundle, so it answers "patch *or* minification", not "patch".
- `scripts/check_links_diff.mjs:149-154` — the fixture's `html` pair is two `closed-early` findings, not "one of each kind"; `unclosed-tag` is provoked by nothing and is unreachable through the template (which always emits `</body></html>`). `WIP.md:492`'s "unclosed and badly nested tags" overstates the site-facing check.
- `scripts/check_links_diff.mjs:434`, `:578` — a bare invocation defaults to `--a script --b script`, prints `No differences across 6 case(s)`, and compares nothing (the fixture assertions do run). `--help` is honest; the output is not.
- `builder/tbdocs.mjs:1253` — `injectGanttChart` rewrites `BuildInfo.html` in both trees after `checkReport` (`:1220`); the check did not see the bytes that shipped. Exposure nil today (the SVG has no links or ids).
- `scripts/pick_a11y_sample.mjs:62-63` — `why` strings name `scope-attr-valid` and `empty-table-header`, both best-practice-only and never run; a `--check` failure would tell a maintainer to feed a rule that is off.
- `scripts/lib/axe-scan.mjs:619` — `--pages` narrowing still drops state audits silently (`stateAudits.filter(s => seen.has(s.filePath))`), despite the load-time assertion's stated rationale. `check_a11y.mjs` has no `--pages`, so production is unaffected.
- `scripts/lib/axe-scan.mjs:548` — `gotoPage` waits for `domcontentloaded` only and no `<img>` carries dimensions; `.video-link img { width: 100%; height: auto }` makes the card's `target-size` box depend on decode timing nothing waits for. A/A control was 48/48 identical.
- Content `<details>` are never audited open: `PAGE_STATES` opens only `details.section-links`; `FAQ.html` (29 content disclosures) is not in `SAMPLE_PAGES` at all; `Menu/Window.html`'s 3 stay closed during its own state audit. **Verified no live defect** (zero violations with all opened), but opening Menu/Window on mobile takes `color-contrast` incomplete nodes from 0 to 118 — a real measure of the un-audited surface.
- `docs/_sass/custom/custom.scss:45-60` — `.text-muted` is dead since `e045ab5` (zero emissions in `builder/`, zero in the built tree) and its comment describes the old footer.
- `docs/_sass/modules-dark.scss:1-9` — header still describes `html.dark-mode` / `meta.load-css`; the actual wrapper is the `dark-theme` mixin.
- `builder/cpu-worker.mjs:504-506` — the comment "Post output BEFORE the SAB update (ordering constraint: the merge message must arrive on the main thread before any downstream main-thread task could be claimed)" asserts exactly the guarantee the fix exists to deny. A maintainer reading it would omit the `expected` list.
- `builder/PLAN-sab-pull-scheduler.md:536` — the two new sections are spliced between steps 4 and 5 of a numbered procedure.
- `docs/Tutorials/CEF/_Images/MonacoArchitecture.md` — hand-maintained Mermaid source the build never reads; the committed SVG is a *dark*-theme export with edge-label chips hand-darkened to `rgb(68,68,68)` (6.07:1), while the source's own comment tells a re-exporter to use the default light theme. Regenerating loses the contrast fix.
- Commit subjects: no forbidden trailers anywhere in the range; 30 of 38 subject lines exceed 80 characters (one is 124) against the repository's "concise one-line" rule.

---

## Tier 4 — documentation drift

Stale or false statements a maintainer would act on. All confirmed against the current files.

| Where | Says | Reality |
|---|---|---|
| `docs/Documentation/Authoring.md:92` | literal `–`/`—` "in source are rejected" by the build | No such gate exists anywhere; the typographer converts ASCII forms and passes literals through. `scripts/convert_em_dash_separators.py` is a manual normaliser. |
| `docs/Documentation/Building.md:62-70`, `Tools.md:35`, `Tools.md:111` | `check.bat` "runs two passes of `scripts/check_links.mjs`" and continues into the a11y scan "when the link check passes" | `check.bat` runs patch-equiv, sample coverage, a11y only; link + integrity moved into `build.bat --check` (`8cbecca`). |
| `docs/Documentation/Authoring.md:112`, `:181` | `check.bat` enforces the remote-asset rule / catches dead links | Both are in `build.bat --check` (`builder/check.mjs:59,73` hardcode `checkRemoteAssets: true`). |
| `WIP.md:500`, `scripts/check_links.mjs:7-8`, `builder/PLAN-checks.md:606` | "both CI workflows still invoke [`check_links.mjs`] directly" / "Both CI workflows are untouched" | Since `b97c75f` CI runs `check_links_diff.mjs --case fixture --a script --b index` — the script in-process against a six-file fixture, never against a real tree. |
| `WIP.md:540` | section-links disclosure "at the end of `<main>`" | First child of `<footer role="contentinfo">` after `</main>` since `e045ab5` (`template.mjs:96-101`); omitted on pages with fewer than two headings (452 of 1,159). |
| `WIP.md:496`, `:621` | `--check-remote-assets` as a build flag | `tbdocs` has no such argument (`Unknown argument`); the check is unconditional on `_site` and `_site-offline`. |
| `WIP.md` (build pipeline), `PLAN-sab-pull-scheduler.md:598-611` | every merge-path skip made loud; `formatReport` fails on an errored chunk | Three survive (item 17); the `formatReport` row is false for the book. |
| `check_a11y.mjs:103`, `WIP.md:598`, `PLAN-axe-perf.md:1320,1461`, `checks.yml:96` | exact occurrence count at each substitution point | False for 12 of 20 (item 3). |
| `WIP.md` a11y section | "Chrome's UA `outline: auto` on the aux-nav link renders in full" | It is clipped at the bottom (item 13). |
| `builder/PLAN-a11y.md:281`, `Tools.md:111`, `Building.md:66` | "six sample pages" | Eleven since `c67abe4`. |
| `WIP.md:530`, `PLAN-axe-perf.md:1333,1352` | "all 24 page/theme/viewport combinations" | 48 audits now; `axe-scan.mjs:162` hedges correctly ("what was then a 24-audit matrix"), these read as current. |
| `WIP.md:571` | "3,488 audits" | `perf/results/a11y-sweep.jsonl` holds 3,476 (869 × 4). |
| `docs/Documentation/Tools.md:23`, `:48` | `build.bat` wraps `node builder\tbdocs.mjs --src docs` | It passes `--check`; the CLI table omits `--check`, `--no-check`, `--check-audit-index`, `--check-findings`. |
| `docs/Documentation/Builder.md:385` | `"axe-core": "^4.13.0"` | `74b3395` removed the caret deliberately; `package.json` is `"4.13.0"`. |
| `docs/Documentation/Builder.md` module table (`:90`), task enumeration (`:178-179`) | — | No row for `vendor-assets.mjs` / `vendorAssets`; `renderSectionLinks`, `videoLinkPlugin`, `remoteImagePlugin`, `headingLevelNormalizePlugin` unmentioned; `injectAnchorHeadings` still documented as `(html) → string`. |
| `perf/README.md:547` | `rouge.css`, `drop-rouge` | Renamed to `tb-highlight.css` / `drop-highlight` by `76abd6c`. |
| `WIP.md:538` | "7,031 [permalinks] over 869 pages" | 7,031 and Gloss's 172 are exact; 867 pages carry at least one. |
| `WIP.md:490`, both workflow comments | "230 MB" written out | `_site` + `_site-offline` are ~280 MB today. |
| `docs/Documentation/Builder.md:92`, `Pipeline-Stages.md:487` | "the emitted rule **carries** a `raised to 4.5:1` comment" | Figurative *carry* is on the Replace table. ("drives" ×4 in `Builder.md:403,419,428`, `Building.md:66` is borderline browser-automation idiom.) |

Verified **true** by the claims audit, for the record: exit codes 1/2/3; `navigation.scss:182`; the (0,0,1)→(0,1,2) and (0,3,1) specificity arithmetic; the font-size table and "0.8 px"; `Array.prototype.flat()` skipping holes; "~6 pages, one build in three" (corroborated in two other files); 707 pages with the disclosure; the `section-links-open` applier's behaviour; 14 vs 72 items; `k = 2.73`, −26 % / −30 %, −10.7 % vs −0.4 %, 5.9×, 6.2 s / 15.3 s / 2.45×, "six violation classes on 54 pages"; 1,159 built pages; the retraction chain `16ad61a → 6a21217 → 7801a75` has no stale echoes; every anchor in `WIP.md` and the PLAN files resolves; no `footgun` remains; no literal dash was added under `docs/`; **Gloss.html 166 links closed / 338 open reproduces exactly** by four independent accessibility-tree methods (the earlier 140/312 was `#main-content` only; the 26 are page chrome).

---

## Verified sound

What was checked and found correct — so it need not be revisited.

**Scheduler.** `_claimMainTask` reads `this.tasks.get(name)` at claim time (`scheduler.mjs:93-104`) and `_assembleInputs` returns `null` — releasing the task to READY — if any `expected` name lacks a result (`:148-155`); the cloned `expected` list therefore genuinely gates the barrier. Confirmed at runtime with a harness over the real `Scheduler` + SAB (`expected: []` reproduces the bug) and by the forced-race build (appendix). `renderJoin`'s own `renderedContent` assertion fires *before* the search-index guard and names the wiring. An empty chunk stores `[]`, never a hole. `--serve` rebuilds construct a fresh `Map` per build. `checkReport` cannot report with `linkJoin` or `checkBook` missing. Chapter order in the book comes from `bookData` declaration order, not arrival. Every `execute()` throw reaches `_abort` → pool destroyed → exit 1. `gantt.mjs`'s change is CSS-selector migration only.

**Link checker.** `deriveTreeRels` accounts for every file kind actually in `_site/` and `_site-offline/` (pages, stubs, aux, static, theme assets, dot SVGs, vendored JS, offline exclusions); audit index 0/0 both directions. `--check-html` now fires (the old `tagStack` never could); the htmlparser2 stray-close silence is documented accurately. No `check_links.mjs` flag was dropped or re-defaulted. Exit-code mapping and both `.bat` files' `ERRORLEVEL` capture are right; the PDF pass cannot contribute to the exit code; `--check-findings` does not suppress it. Base-path handling flags `/assets/x.css` as outside the base path, which is correct for a project site. `captureIds` takes ids from every element, so the disclosure's `#id` links and the anchor icons are both checked against post-dedup ids; `<use xlink:href>` is correctly not a link. The fused checker detects all nine categories (probe).

**a11y scan.** `plain-color-fields` is enumeration-safe (nothing in the bundle enumerates a Color; `Color2.toJSON` explicit); `check_axe_patch_equiv` covers the channel maths where a ratio-shifting error would live; axe 4.13.0 has **zero** rules tagged `wcag22a`, so the five-tag list is complete; `heading-order` re-admission works; `BLOCKED_REQUESTS` cannot match `just-the-docs.js`; the state applier is class-scoped and its count is plumbed unconditionally; `fingerprint()` is deterministic (A/A 48/48); `readAxeSource` throws on a layout change; `--check` genuinely exits 1 on a gap; gate ordering and errorlevel capture are correct.

**Render / template / vendoring.** Every section-links `<a href="#id">` across all 1,159 pages resolves to an id on that page; no double-encoding; zero- and one-heading pages emit nothing. `book.html` and `search-data.json` carry no section-links, anchor-icon or footer markup (`renderedContent` is upstream of the template). The footer restructure loses nothing (attribution, edit link, offline zip, PDF all present; row invariants hold). Video cards: root-absolute in `_site`, rewritten relative in `_site-offline`, all 16 thumbnails referenced and genuine 1280×720. Link-text handling in `videoLinkPlugin` is correct for bold/code/nested image/entities; two markers per line both convert; `youtu.be` and `&t=` match. Plugin order is right (`remoteImagePlugin` after `svgInlinePlugin`; the normaliser before `header-id`, so TOC and ids use final levels). tmLanguage: 747 `Dim`/`Const`/`ReDim` spans site-wide, 0 not followed by a variable span; strings with commas, `WithEvents`, `Preserve`, `New Foo(1, 2)`, `String * 10`, `#Const` all behave. WCAG maths correct; the 0.03928-vs-0.04045 threshold difference is provably inert for 8-bit input; 11 tokens raised in light, 4 in dark, comments present in the shipped CSS. gitignore additions ignore nothing that is committed.

**Styling.** All ~20 claimed contrast ratios recompute within 0.01 and every post-fix value clears its stated threshold; every pre-fix value fails as claimed. The theme toggle: no-FOUC script inline in `<head>` before both stylesheets; every `localStorage` access in try/catch; system mode follows the OS via CSS `@media` with no listener needed; no-JS path is a genuinely dead `hidden` button; `aria-label` rewritten on every state change; native `<button>`; no functional `theme-switch.js` reference remains. `#theme-toggle`'s inset ring beats the dark `.btn-reset:focus-visible` (0,3,1) in all four compiled occurrences. `.main-content summary` vs `.section-links > summary` set disjoint properties; `<summary>` keeps `display: list-item`. `content: "/" / ""` compiles to spec-valid `content:"/"/""` with the fallback first. The code-font-size override is later than the JTD default in all three emission contexts. `$grey-dk-100`'s only non-text consumer is the `.btn-outline:focus` ring. Footer has no overflow path at 375 px and every visible text colour clears 7:1 in both themes.

**CI.** `checks.yml` dispatched at `1b6922b`: green in 1m10s, all five gate steps ran, numbers byte-identical to local (0/0 both trees; 0 violations / 34 incomplete; state exposed 14 links) — so the geometry rules hold on the Linux runner's fonts. No `continue-on-error`, `|| true` or `set +e` anywhere; the deploy job `needs: build`; both workflows build and check all three trees; `CI=true` → offline mode → a missing asset **throws**; `npm ci`; action pins current; the deploy publishes `docs/_site` with `CNAME`. `checks.yml` has no `push` trigger so it cannot double-fire; the deploy group queues rather than cancels (three successive pushes on 2026-09-19 each deployed). The empty PR-run history is inherited — the workflow had no distinct job while the deploy workflow checked links — and its current form is now proven except for the declarative `on.pull_request` filter itself, which the first real PR will exercise.

---

## Decisions for you

1. **Where the fused comparison lives.** `check_links_diff --a script --b fused` (plus a fixture-fused case, item 4) is the one gate CI lacks; `checks.yml` is a PR gate that does not deploy and has the time. Adding it there gives that workflow a purpose beyond timing.
2. **Fonts before 19 October 2026.** The dispatched run's annotation: `ubuntu-latest` migrates to Ubuntu 26 then. Neither workflow installs fonts, and `target-size` is calibrated against Liberation Sans 15 px. A `fonts-liberation` install step or a pinned runner image removes the variable.
3. **The aux-nav ring** (item 13) is outside the range's fix list; it is a one-rule fix and the prose already claims it is fine.
4. **Whether `FAQ.html` should join the sample** and whether content `<details>` deserve an open-state audit (no live defect today, 118 unaudited nodes on one page).
5. **The documentation batch** (Tier 4) is one commit's worth of edits across `Authoring.md`, `Building.md`, `Tools.md`, `Builder.md`, `WIP.md`, the two PLANs, `perf/README.md`, the vendored README and two source comments.

---

## Appendix — experiments

All builds for experiments ran from a byte-identical copy of `docs/` and `builder/` under the session scratchpad (`--src` and `--dest` both there; `write.mjs:103` refuses an out-of-tree `--dest` unless `builder/` is copied too, and `_config.yml`'s `bundle_extra` resolves `../scripts/impexp.*` against the parent of `--src`). The repository's `docs/_site*` were never written.

**Fused-path probe.** A `Probe.md` carrying one fault of each kind (broken link, in-page and cross-page broken fragment, forbidden prefix, `<strong><em>` crossing, `<img>` without `alt`, empty anchor, empty `href`, duplicate id, remote `<img>`, `sitemap: false`, `search_exclude: true`, `permalink: /probe/index.html`). Clean build: exit 0, 0/0, audit index 0/0. Probe build: exit 3 — online 3 broken + 8 integrity (`html-closed-early`, `a11y-img-missing-alt`, `a11y-empty-anchor`, `a11y-empty-href`, `duplicate-id`, `remote-asset`, `sitemap-missing`, `search-missing`); offline 3 broken + 1 forbidden + 6 integrity. `canonical` needed a percent-encoded permalink (`/pro%62e/index.html`) to provoke — `seoCanonical` and `deriveUrlPath` are otherwise the same function — and then fired: 9 integrity. All ten faults survived markdown-it verbatim.

**Forced race.** In `cpu-worker.mjs`, `onTaskDone` + notify moved *before* the result `postMessage` with a 25 ms `await` between. With the fix: 3595 search-index entries, exit 0, three runs. With `renderJoin` removed from the pair list at `tbdocs.mjs:778`: exit 1 all three runs — `task renderJoin failed: 18 / 12 / 30 of 870 pages have no renderedContent ... A render chunk's submit() did not run before the barrier`. The race is not marginal under the delay, and the earlier guard wins. Edits reverted; `git status` clean.

**Open disclosures.** `FAQ.html` (29 content `<details>`) and `Menu/Window.html` (3) audited closed and open × 2 themes × 2 viewports with the production options and patched bundle: zero violations on every row. Menu/Window mobile: `color-contrast` incomplete 0 → 118 when opened.

**Gloss.html links.** `accessibility.snapshot` (interesting and full) and CDP `getFullAXTree` (with and without ignored nodes) all give 166 closed / 338 open. The 172 anchor-heading icons are absent from the tree entirely (aria-hidden), not merely ignored.

**Aux-nav ring.** Puppeteer at 1050 × 800 @2×, Tab ×22 to `a.site-button`: computed `outline: rgb(16,16,16) auto 1px`, `outline-offset: 1px`; link rect `top 0 / bottom 59` = `.aux-nav` rect; `.aux-nav` `overflow: auto`. PNGs in the scratchpad (`expC/auxnav-{light,dark}.png`, `expC/toggle-{light,dark}.png`): aux-nav bars only, no bottom edge, both themes; toggle control complete on all four sides.

**`checks.yml` dispatch.** Run 35449763006 on `staging` @ `1b6922b`, `workflow_dispatch`, success, 1m10s; every gate step executed with local-identical output.

**Review mechanics worth recording.** `builder/link-check.mjs`, `builder/check.mjs`, `scripts/check_links.mjs` and `scripts/check_links_diff.mjs` contain literal NUL bytes (a pre-existing `\0` key-separator idiom) — ripgrep, and therefore any Grep-based tooling, classifies them as binary and returns zero matches silently. Use `grep -a` or an editor. `git diff` renders them as text because the NULs sit past its 8 kB sniff window.
