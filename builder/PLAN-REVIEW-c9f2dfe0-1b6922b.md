# Addressing `REVIEW-c9f2dfe0-1b6922b.md` — plan, and what landed

Companion to [REVIEW-c9f2dfe0-1b6922b.md](REVIEW-c9f2dfe0-1b6922b.md). Twenty commits in
five phases, covering every numbered finding (1–21), every Tier 3 bullet, every Tier 4
drift row, and the five decisions. A coverage table at the end maps each finding to its
commit.

## Status: complete

All twenty landed, as `45e6336..9f6c38f` — 21 commits, `90dd617` through `9f6c38f`,
C07 having needed a one-line follow-up.
`build.bat && check.bat` is clean, `check_links_diff.mjs --a script --b fused` agrees
across all six comparable cases, its `--self-test` passes, `check_axe_patch_equiv.mjs`
reports the patch value-preserving, and the index audit is clean on both trees.

**Each section below keeps its original plan text, and carries a `Landed` note where
the code turned out to differ from what the plan described.** Those notes are the
useful part of this document now. Eleven sections carry one: five because the plan's
diagnosis was wrong, the rest because the commit landed wider than planned. Two
defects also surfaced that the review did not have. The corrections are collected under
[Where the plan was wrong](#where-the-plan-was-wrong) and the new defects under
[Found while implementing](#found-while-implementing).

The landing order was not the plan's order. C12 and C19 went early because they are
self-contained and needed no build; C09 and C13 went late because they were delegated
and came back after the commits numbered above them. Nothing depended on the difference:
the only stated ordering constraint, C01 before C02, held.

## The organising idea

Two of the review's observations decide the order of everything below.

**A gate that reports coverage it does not have is worse than no gate**, because it
converts an unchecked area into a green tick. Items 1–8 are that class, and three of them
(1, 2, 4) are gates this range *added*. They go first.

**Some documentation drift is fixed by the code, not by the prose.** Four Tier 4 rows
describe behaviour the range intended and did not quite ship: the exact-occurrence-count
claim (D8), the aux-nav focus ring (D9), the merge-path tolerances (D7), and the
`--check-remote-assets` flag (D6). Editing the prose to match the shipped behaviour would
lock in the defect. So the documentation batch lands **last**, after the code it describes
has been made true — and three of those rows then need no edit at all.

The shape of that held; the count did not. Two rows needed no edit (D8, and the
tolerances half of D7). **D9 needed the opposite of no edit**: the prose asserts the
aux-nav UA ring "renders in full", and the measurement in C15 shows it does not, so
fixing the code made the sentence *more* wrong rather than true. Landing the batch last
is also what exposed several of this plan's own figures as stale — see C20.

## Phase order

| Phase | Commits | Why here |
|---|---|---|
| 1 — the gates | C01–C08 | Everything else is judged by these. A green run means nothing until they check what they claim. |
| 2 — the two S1 bugs | C09 | Silent data corruption (a bad poster frame, permanently) and a build that dies on a DNS failure. |
| 3 — remaining code | C10–C14 | Scheduler, merge path, oracle, render, offline. |
| 4 — styling and tooling | C15–C19 | Visible defects and maintainer-facing sharp edges. |
| 5 — documentation | C20 | Written against the code as it then is. |

Commit subjects stay under 80 characters throughout (Tier 3's last bullet: 30 of this
range's 38 exceeded it, one by 44). Longer explanation belongs in the body. **Held**:
the longest of the 21 subjects is 72 characters.

---

# Phase 1 — make the gates check what they claim

## C01 (`90dd617`) — `a11y: assert exact substitution counts on the Color2 get/set patches`

**Finding 3 (S2).** `substitute()` enforces a count only when one is passed. Eight of the
twenty substitution points pass `1`; the twelve `get`/`set` points pass nothing and assert
only "at least one". An axe bump that rebinds Babel's duplicate private-field names (`_r`,
`_r2`) to a different class would rewrite the wrong class consistently, leave Color2's
WeakMaps in place, pass `check_axe_patch_equiv.mjs` (which only reads Color2 values), and
silently give back the 26 %.

**Change.** `scripts/lib/axe-scan.mjs:456,462` — pass the measured counts. Confirmed today
against axe-core 4.13.0, all six fields identical:

| Substitution | Occurrences |
|---|---|
| `_classPrivateFieldGet(<f>, this)` | 1 |
| `_classPrivateFieldSet(<f>, this, ` | 2 |

**Verify.** `node scripts/check_axe_patch_equiv.mjs` and one `node scripts/check_a11y.mjs`
run still pass. Deliberately corrupt one count and confirm the patch throws by name.

**Unlocks.** Tier 4 row D8 becomes true without a prose edit, in four files at once.

## C02 (`3187638`) — `a11y: route the production scan through the scheme registry`

**Finding 2 (S2).** `SCHEMES.production` describes itself as "what check_a11y.mjs runs
today" and carries no `patches`. `check_a11y.mjs` never calls `getScheme` at all; it
declares its own `AXE_PATCHES`, and `sweep_a11y.mjs` holds a third copy. So the fingerprint
gate's A/A control validates stock minified axe against itself, not the bundle that ships,
and any future `configure:` added to the scheme would never reach production.

**Change.** Add `patches: ["plain-color-fields"]` to `SCHEMES.production`. Have
`check_a11y.mjs` and `sweep_a11y.mjs` take `runOptions`, `configure` and `patches` from
`getScheme("production")`. Keep `--stock-axe` as an explicit override of the scheme's patch
list, not as a second source of truth.

**Verify.** `node scripts/check_a11y_fingerprint.mjs --baseline production --candidate production`
is now a genuine A/A over the shipped bundle and must be 48/48 identical. Findings from
`check_a11y.mjs` must be unchanged from before the commit.

**Note.** Do this after C01: if the counts are wrong, routing production through the
registry changes which run throws first, and the failure gets harder to read.

## C03 (`f4cd53c`) — `a11y: key the callout family on the admonition class`

**Finding 1 (S1)** and **Tier 3's `why`-string bullet**. The family regex
`/class="[^"]*(?:note|important|warning)/` matches `class="footnote"` and
`class="reversefootnote"`. The only page reaching `min: 2` has three footnote hits and zero
callouts, so `markdown-alert-important` (49 site-wide) and `-tip` (16) — each with its own
title colour per theme — have never been colour-contrast-audited, while `--check` printed
"every construct family in use is covered".

**Change.** `scripts/pick_a11y_sample.mjs:68` — key on
`class="markdown-alert markdown-alert-`, which is exactly what `render.mjs:1492` emits for
all five variants and matches nothing else. Also correct the two `why` strings at `:62-63`,
which name `scope-attr-valid` and `empty-table-header`: both are best-practice-only and
never run under the current tag set, so a `--check` failure currently tells a maintainer to
feed a rule that is switched off.

**Verify.** `--census` before and after: the callout count should drop to the real
admonition pages, and `tip` / `caution` should start appearing. Then `--check`.

**Expect this to fail `--check`**, and treat that as the finding landing rather than a
problem: no current sample page is likely to carry two real admonitions. Run `--propose`
and add the cheapest page it names, in the same commit, with its measured audit cost
recorded in the commit body.

**Landed**, with one addition the plan does not specify. Re-keying alone would not have
fixed the finding: a single `callout` family is satisfied by a page carrying two NOTEs,
and the review's point is that IMPORTANT and TIP have their own title colours and had
never been audited. So the family is split per variant — `calloutNote`,
`calloutImportant`, `calloutWarning`, `calloutTip`, `calloutCaution` — at `min: 1`,
because one real admonition exercises that variant's colours exactly as fifty would.
(`caution` has zero site-wide emissions, so `--check` skips it as a family the site does
not use.) `--check` then failed on `calloutImportant` and `calloutTip`, as expected.

`--propose` named two pages; the commit adds one.
`/Features/Language/Generics.html` is the only page in the site carrying both variants,
so it closes both gaps for one page load — 485/454/398/399 ms over the four
combinations, +1,736 ms against `--propose`'s 1,591 ms for its two. The 145 ms is 0.9 %
of the scan and buys a smaller matrix.

## C04 (`39e03ab`) — `check: key brokenUnique on the pre-resolution target`

**Finding 11 (S2).** `entryKey` (`builder/link-check.mjs:748`) keys on `entry.target`;
`settleFragments` (`:763`) keys on `p.target`, which is `entry.resolved` — post `.html`
fallback. Both sets merge in `builder/check.mjs:215,236`, so one broken cross-page fragment
counts once or twice depending on whether the target page shares a chunk with a referrer.
`build.bat` prints `2 broken` where the script prints `1`.

**Change.** Carry `entry.target` on each pending fragment and key `settleFragments` off it.

**Verify.** `node scripts/check_links_diff.mjs --a script --b fused` must show no
`counts.brokenUnique` difference. Reproduce the review's three-page experiment as a scratch
fixture first, to confirm the count is 1 in both chunk arrangements.

**Blocks C07**: without this, the fused fixture case reports a phantom difference that
reads as a fused-side bug.

## C05 (`7df8625`) — `check: honour sitemap:false and search_exclude:true`

**Finding 12 (S2, latent).** `checkSitemap` and `checkSearch` exempt only `book.html` /
`404.html`, while `sitemap.mjs:51` and `search.mjs:76` skip pages carrying `sitemap: false`
/ `search_exclude: true`. Any page using either key fails `--check` immediately. No page
under `docs/` uses them today, which is the only reason this is latent — and
`Pipeline-Stages.md:539` documents `sitemap: false` as a supported key, so the first author
to use it hits a build failure with no hint why.

**Change.** Thread both opt-out sets from the generators into the checkers, alongside the
existing stub exclusion, so the rule is "check the pages the generator was asked to emit".
Also fix `checkSearch` (`link-check.mjs:814`), which applies only `stripHtmlSuffix`: a
`permalink:` ending `/index.html` yields `/probe/index` against `deriveUrlPath`'s
`/probe/`. `checkSitemap` escapes this by accident because `sitemap.mjs:74-77` strips
`/index.html` first.

**Verify.** Add a page carrying each key to the fixture (C07) and confirm no finding;
remove the key and confirm the finding returns. This is the probe the review already ran.

**Landed**, but not verified through C07's fixture, because that fixture is compared
against the standalone script and this is the one thing the script structurally cannot
do: nothing in the built HTML records a deliberate omission, so a `sitemap: false` page
and a bug look identical to it. Putting one in the shared fixture would have produced a
permanent script-vs-fused difference. Verified on a throwaway two-page tree instead —
with both keys, 0 integrity findings; with the opt-out sets disabled, `sitemap-missing`
and `search-missing` both return. `check_links.mjs` now records the limitation where its
two flags are defined.

The `/index.html` half is worse than the review describes. With the normaliser reverted,
a page at `permalink: /probe/index.html` reports `search-missing` — and so does the root
`index.html` of any tree whose home page has no explicit permalink, because
`stripHtmlSuffix("/index.html")` is `/index` against `deriveUrlPath`'s `/`.

## C06 (`d2c3a74`) — `check: say why a cross-file check was skipped`

**Finding 7 (S2, latent)** and **Tier 3's `findingsFor` bullet**.

`sitemapIssues` / `searchIssues` / `canonicalIssues` stay `null` when a precondition fails
(`builder/check.mjs:246-261`), and `formatReport`'s `if (!issues || !issues.length) continue`
(`:298`) prints `0 integrity` for `null` and `[]` alike. The standalone script prints
`warning: --check-sitemap: sitemap.xml not found ..., skipping`. Only the harness's
deliberate `null`-vs-`[]` distinction would catch it, and that is a manual step.

Separately, `findingsFor.integrityFailed` (`:412`) is `integrityCount > 0` and omits
`r.errors`, unlike `formatReport:313` — so `--check-findings` can report `false` for a run
that exited 2.

**Change.** Record a skip reason alongside each `null` and print it in the same shape the
script uses. Add the error term to `findingsFor`.

**Verify.** Provoke each precondition on a scratch tree (drop the sitemap, corrupt the
search JSON) and confirm the report names the skip. Confirm `--check-findings` and the
process exit code agree on a run with a chunk error.

## C07 (`8eacc5c`) — `check: run a fixture through the build's own checker`

**Finding 4 (S2)**, plus **finding 6 (S2)** and two Tier 3 harness bullets.

`check_links_diff.mjs:535-538` drops any case without a `fused` entry on every `--b fused`
run — which is the `fixture` case, the only case that makes more than one category
non-empty. `FIXTURE_EXPECTED` is asserted only inside the branch that is then never
reached. The implementation is fine (a probe provoked 9/9), but a regression in
`builder/check.mjs` that stopped *reporting* a category would leave every gate green.

**Change, in four parts.**

1. **A fixture the build can produce.** A small markdown source tree carrying one fault of
   each kind, built with `tbdocs --src <dir> --check-findings`. This is the piece that
   takes real work: `write.mjs:103` refuses an out-of-tree `--dest`, and `_config.yml`'s
   `bundle_extra` resolves `../scripts/impexp.*` against the parent of `--src`, so the
   fixture source needs either a sibling layout under the project tree or its own minimal
   `_config.yml`. Prefer the latter — a fixture that depends on the real config is a
   fixture that breaks when the config changes.
2. **Call `selfTest()` from the harness** (finding 6). `check_links.mjs`'s three regression
   guards — base-path stripping, `isOutsideBasePath`, canonical mismatch — sit inside the
   `isEntry` branch, and since `b97c75f` nothing invokes the script as an entry point in
   CI. Export it and call it from `check_links_diff.mjs`, or from its `--self-test`.
3. **Make the fixture's `html` claim honest** (Tier 3). The pair is two `closed-early`
   findings, not "one of each kind": `unclosed-tag` is provoked by nothing and is
   unreachable through the template, which always emits `</body></html>`. Correct the
   comment at `:149-154`; the matching overstatement in `WIP.md` goes in C20.
4. **Stop a bare invocation claiming a comparison** (Tier 3). `--a script --b script`
   prints `No differences across 6 case(s)` having compared nothing. Either default `--b`
   to `fused`, or refuse equal sides unless `--self-test`. Recommend refusing: the default
   that costs two builds should be asked for.

**Verify.** `node scripts/check_links_diff.mjs --case fixture --a script --b fused` must
provoke all nine categories on both sides and agree. Then delete a category's reporting in
`builder/check.mjs` and confirm the harness fails.

**CI.** Add this one case to `checks.yml` only — see Decision 1.

**Landed as two cases, and seven categories of nine — the other two are not
provokable.**

No single tree carries all nine: the online tree has the sitemap, search and canonical
checks, and the offline tree is the only one with a forbidden prefix. So
`test/fixtures/check-src` builds once and two cases read it, `fixture-built` and
`fixture-built-offline`, each asserting its counts on both sides — including `null` for
a check the tree does not enable, which is a different statement from `0`.

`sitemap` and `search` are asserted as `0`, and that is the honest answer rather than a
gap. A correct build cannot omit a page from either index, established rather than
assumed:

- `checkSitemap` runs the extracted `<loc>` through the same `normalizeUrlPath` as the
  file-derived path, so the shapes that look like divergences converge. The fixture
  carries `Weird.md` at `permalink: /Weird-index.html` — a permalink ending in the
  literal text `index.html` — to hold that claim to the awkward case.
- `deriveSearchEntries` pushes a fallback entry for a page with no headings, and
  `titleFound` can only become true inside the loop that fills `sections`, so
  `sections.length === 0` never co-occurs with an indexable page.

The other seven are real: `broken` 3, `html` 1, `a11y` 3, `dupIds` 1, `remoteAssets` 1
and `canonical` 1 on the online tree, `forbidden` 1 on the offline one. The canonical
finding comes from a second `<link rel="canonical">` in the markdown body — the SAX
walker keeps the last one it sees — which is also a link, so one tag provokes two
categories.

**Verified the way that matters**: deleting the `dupIds` and `canonical` reporting from
`builder/check.mjs` makes the harness fail with 6 differences, naming both the count
assertion and the diff. A one-line follow-up (`95f19b5`) gitignores the fixture's PDF
tree.

## C08 (`1c2f895`) — `build: audit the tree index on every build; gate check.bat on freshness`

**Finding 5 (S2)** and **finding 8 (S2, local)**.

`--check-audit-index` is parsed at `builder/tbdocs.mjs:131` and invoked by nothing: no
`.bat`, no workflow, no npm script. It is the sole guard on the module that
`builder/check-tree.mjs:9-14` itself calls "the piece most able to fail silently", and the
direction it covers lost its previous coverage when `b97c75f` removed CI's `FsOracle` pass.
A spurious `deriveTreeRels` entry makes `IndexOracle` answer "exists" for a path that 404s
in production, and every link to it passes. Cost is one `readdir` per tree; the result
already feeds `integrityFailed`.

Separately, `check.bat` reads whatever `docs/_site-offline/` holds. Edit, run `check.bat`
without rebuilding, and it audits the previous build and passes. CI is unaffected because
it builds in the same job.

**Change.** Add `--check-audit-index` to `build.bat`'s baked-in flags and to both CI build
steps. Add a freshness check to `check.bat`: compare the newest mtime under `docs/` (less
the ignored output trees) against `docs/_site-offline/index.html`, and refuse with a
message naming `build.bat` rather than scanning a stale tree.

**Also here, per Decision 2:** add a `fonts-liberation` install step to both workflows.
`target-size` is calibrated against Liberation Sans at 15 px, and `ubuntu-latest` migrates
to Ubuntu 26 on 19 October 2026. Installing the font explicitly removes the variable before
it moves under us.

**Verify.** A clean `build.bat` prints `0 on disk but not indexed, 0 indexed but not on
disk` for both trees. Add a file to `_site/` by hand and confirm the audit reports it.

---

# Phase 2 — the two S1 code bugs

## C09 (`3c0c6b6`) — `vendor-assets: validate the response, and survive a dead network`

**Findings 9 (S1) and 10 (S2).** One module, one theme.

`fetchToFile` (`builder/vendor-assets.mjs:105-113`) checks only `res.ok` and
`buf.length > 0` — no content type, no magic bytes, no size floor — writes straight to the
final path, and `present.has(name)` at `:192` never re-fetches it. A captive-portal HTML
interstitial becomes `yt-<id>.jpg` with `failed: 0` and a clean exit; the next run reports
it present; CI-offline mode accepts it as satisfied. The same hole covers the documented
YouTube trap, where `maxresdefault` 404s and `hqdefault` returns 200 with a 120×90 grey
placeholder. `fetchAttachment` (`:126-139`) already gates on content type via
`CONTENT_TYPE_EXT`; the asymmetry is the bug.

And no `fetch` or `arrayBuffer` call in the module is wrapped (`:106,108,128,130,201,232`).
Only an HTTP non-2xx or an empty body takes the soft path; a DNS failure, TLS error, reset
or proxy refusal propagates out of `vendorAssets.execute` into `scheduler.mjs:118` and
kills the build with a raw stack. That contradicts the module's own comment at `:43-48` and
`WIP.md:521`, both of which promise a warning.

**Change.**

- Require a `content-type` of `image/*`, a plausible size floor, and JPEG/PNG magic bytes.
- Reject a 120×90 SOF on the YouTube variants, so the placeholder falls through to the next
  variant instead of being cached forever.
- Write to a temp path and rename, so a partial or rejected body never occupies the final
  name.
- Wrap each fetch so a rejection joins the existing `failed++` / `console.warn` path.

**Verify.** The review's stubbed-`fetch` experiment, rerun as a scratch script: an HTML body
must be rejected and `failed` must be 1; a network rejection must warn, set the exit code,
and let the build finish. Confirm all 16 committed thumbnails still validate (they are
genuine 1280×720).

**Landed**, with `fetchAttachment` hardened alongside `fetchToFile` rather than left as
the already-better half: it gains the size floor, the temp-file-then-rename, and a
magic-byte cross-check, so a body served under a spoofed `image/png` is caught and not
just an outright wrong content type.

Verified against a stubbed fetch: an HTML captive-portal body is rejected on content
type, and on magic bytes when served as `image/jpeg`; a 120x90 placeholder falls through
to the next variant and the real image lands; a `fetch` rejection and an `arrayBuffer`
rejection each warn, count as failed, and do not throw. No file is left at the final path
in any failing case. All 16 committed thumbnails re-parse as genuine 1280×720.

---

# Phase 3 — remaining code defects

## C10 (`648b607`) — `scheduler: put submit inside the abort path, and bind the barrier halves`

**Findings 15 and 16 (S2)**, plus two Tier 3 `expected`-list bullets and one comment.

`def.submit` runs outside every try/catch — `_executeMainTask`'s try wraps only `execute`
(`builder/scheduler.mjs:128`), and the worker-message path (`:178`) has no try at all and is
called from `worker-pool.mjs:33`'s listener. So the new assertion in `render:i.submit`
(`tbdocs.mjs:727-733`), added by this range to make a missing page loud, escapes as an
uncaught exception: `_abort` never runs, the pool is never destroyed, and under `--serve`
the dev server dies with a raw Node stack instead of `task render:3 failed`.

The barrier invariant has two unbound halves — `setDepCount(views, renderJoinIdx, N)` at
`tbdocs.mjs:702` and the `expected` clone loop at `:778`, 76 lines apart inside a 140-line
`dispatch.submit()`. Nothing ties them together, `verifySchedulerSAB` iterates static
`taskDefs` only and runs before `dispatch.submit` exists, and there are no tests. A third
fan-out that copies the dep-count block and misses the clone loop reproduces the original
`renderJoin` bug exactly.

**Change.**

- Wrap both `def.submit` calls so a throw reaches `this._abort(name, err)`.
- Extract `registerBarrier(scheduler, views, idMap, join, predNames)` doing both halves, so
  the dep count cannot be written without the list. Use it for `renderJoin` and `flushJoin`.
- `tbdocs.mjs:880` — add `"renderJoin"` to `writePdf.expected`. Its comment says `flushJoin`
  guarantees `renderedContent`, which holds only transitively via `flush:i` being lane-pinned
  to `render:i`. `renderJoin` is DONE by then, so this costs nothing.
- `tbdocs.mjs:800` — add `"vendorAssets"` to `writeAssets.expected`. It currently depends on
  it only through `prepPageDirs ← prepDest ← dispatch ← markdownInit`; `dot` is listed
  explicitly for the identical reason.
- `cpu-worker.mjs:504-506` — rewrite the comment. It asserts exactly the guarantee the
  `renderJoin` fix exists to deny ("the merge message must arrive on the main thread before
  any downstream main-thread task could be claimed"). A maintainer reading it would conclude
  the `expected` list is unnecessary.

**Verify.** Re-run the review's forced-race reproduction: move `onTaskDone` before the
result `postMessage` with a delay, and confirm the build still fails loudly with
`renderJoin` removed from the pair list and passes with it. Throw from inside a `submit` and
confirm `_abort` runs and the pool is destroyed.

**Landed, and the reproduction is the clearest evidence in the range.** With
`onTaskDone` moved ahead of the result post and a 40 ms delay, the build is clean with
the pair list and fails on **every one of three runs** without it, naming 24, 36 and 30
pages with no `renderedContent`. A throwing `submit` reports `task render:2 failed`
through `_abort` on the worker path and `task flushJoin failed` on the main-task path;
before the change the worker path escaped as an uncaught exception.

## C11 (`f9ef5a4`) — `build: make the three surviving merge-path tolerances loud`

**Finding 17 (S2 claim / S3 code).** `WIP.md` and `PLAN-sab-pull-scheduler.md:598-611` say
every merge-path skip that used to tolerate a missing piece now refuses to continue. Three
survive: `builder/check.mjs:210` (`if (!c) continue`), `builder/cpu-worker.mjs:264`
(`items.filter(p => p.offlineHtml !== undefined)`), and `builder/tbdocs.mjs:400-402`
(`r?.written ?? 0`). None is live today — the `short` count guard at `tbdocs.mjs:945-948`
and identical per-lane tree-key sets cover them — but the documents claim they are gone.

**Change.** Make `check.mjs:210` throw, drop the optional chaining at `tbdocs.mjs:954`, and
turn the other two into assertions. The document corrections go in C20, including the PLAN's
`formatReport` row, which claims an errored chunk fails the run — false for the book, where
`TREES.pdf.noFail` (`check.mjs:95`) makes `formatReport` return `integrityFailed: false`
(`:324-325`), so a `checkBook` chunk error prints and exits 0. That behaviour is deliberate
and stays; only the row is wrong.

**Verify.** Provoke each by hand on a scratch copy and confirm the build fails naming the
missing piece. Then a clean `build.bat` to confirm none fires in normal operation.

## C12 (`c0d5ff9`) — `check: make the standalone link checker case-sensitive on Windows`

**Finding 18 (S2).** `IndexOracle.indexKey` normalises separators and trailing slashes but
never case; `FsOracle` inherits NTFS's case-insensitivity, so
`statSync("docs/_site/tb/gloss.html")` is `true` for the file `tB/Gloss.html`. A wrong-case
link passes the script on Windows and 404s on GitHub Pages — and because
`check_links_diff.mjs:247` calls the script "the oracle of record", the harness would report
the fused side (which is correct) as the one with the extra finding.

**Change.** Default `--oracle index` when `process.platform === "win32"`, which is the
review's recommendation and needs no per-path `readdir`. Document the platform difference
beside the flag either way, because a release-zip check on Windows is exactly the case the
standalone script exists for.

**Verify.** Create a wrong-case link on a scratch tree and confirm both sides report it.

## C13 (`b966f12`) — `render: four narrow correctness fixes`

**Finding 20 (S3)** plus three Tier 3 bullets. All in `builder/render.mjs`, all with zero
current site impact — which is the argument for fixing them now rather than when a page
first trips one.

- **`:1078` heading normaliser.** It fires on "h1 present, h3 present, h2 absent" and then
  raises *every* level at or below h3 by one. `# / ### / #####` becomes h1/h2/**h4** — the
  skip survives and is now invisible in source. `# / ####` never triggers. A raw `<h2>` HTML
  block is not counted, so a page mixing it with `###` gets its h3s promoted over the
  author's structure. Narrow it to what `WIP.md` already says it does: raise h3 to h2 and
  close the gap, rather than shifting the whole tail blindly. Zero heading skips across all
  1,159 built pages today, so the change is provably inert.
- **`:1735` `setClass`.** Replaces the whole `class` attribute, so
  `[T](…){: .video .float-right }` renders `class="video-link"` and silently drops the
  second class. Merge instead of replace.
- **`:1789` SVG paragraph unwrap.** Bails unless the paragraph is a lone image, so
  `See this: ![d](x.svg)` still emits a `<div>` inside a `<p>`. Handle the mixed case, or
  leave the image un-inlined there and say so.
- **`:1750` `remoteImagePlugin`.** Hooks only markdown-it's `image` rule, so a raw
  `<img src="https://github.com/user-attachments/…">` is downloaded by the scan
  (`vendor-assets.mjs:62` claims to cover both syntaxes) but never rewritten —
  `--check-remote-assets` then fails with no hint that the syntax is the problem. Either
  rewrite raw `<img>` too, or make the failure name the cause. This half has never run: no
  page references a user-attachment URL, and the four committed PNGs were vendored by hand
  in `780c77a`.

**Verify.** A scratch render of each shape, plus `build.bat && check.bat` for no change to
the 1,159 real pages.

**Landed.** Two things the plan's description understates.

`setClass` dropped **both** classes, not only the sibling: `{: .video .float-right }`
rendered `class="video-link"` with nothing of the author's left. And merging alone is not
the fix — it leaks `.video` into the output, which changed 16 elements on the two Videos
pages. `.video` is the marker that selects the link and matches nothing in any
stylesheet, so it is consumed explicitly now, and any *other* class survives.
`{: .video .float-right }` gives `class="float-right video-link"`.

The heading normaliser needed a stack of still-open ancestors rather than the clamp the
plan's wording suggests. `Reference/Core/Open` has two `###` sections around a run of six
`####`, and a `min(raw, last + 1)` formula puts the second `###` at h3 — same raw level,
different result — because it does not reset when a heading returns to a shallower level.
A fixed offset also closes only the *first* gap on a page: `# / ### / ##### / ### /
#####` comes out h1/h2/h4/h2/h4. The stack closes every gap in one pass.

**Inert, demonstrated rather than argued**: every one of the 1,159 built pages hashes
identically before and after, and the 7 `svg-container` and 16 `video-link` emissions are
unchanged.

## C14 (`8c93e02`) — `offline: stop counting the six phantom unresolved links`

**Finding 21 (S3).** Every green offline build prints `6 unresolved`. `HTML_COMBINED_RE`'s
`\b(href|src)=` matches the tail of the `data-svg-src` attribute on the six inlined
diagrams, because `-` is a non-word character and the word boundary succeeds there. The
misses count into `offlineMisses` and print at `tbdocs.mjs:1208`, and are listed nowhere.
All six files exist in `_site-offline`; zero root-absolute `href` / `src` survive.

**Change.** Tighten the boundary to exclude a preceding hyphen at
`offline-rewrite.mjs:292-295` and `:405-408`, plus a way to list the misses — a
permanently-nonzero counter nobody can inspect is a counter nobody reads.

**Verify.** The count must go to 0 on a clean build, and the forbidden-prefix rule on the
offline tree must still report nothing.

---

# Phase 4 — styling, tooling, and the vendored theme

## C15 (`a581290`) — `style: four fixes axe cannot see`

**Findings 13 and 14 (S2)** and two dead-code bullets.

- **The aux-nav "twinBASIC Home" focus ring is clipped** (finding 13, and Decision 3).
  `.aux-nav` is `overflow-x: auto` (`navigation.scss:182`), which the overflow spec turns
  into a scroll container clipping on all four sides. `a.site-button`'s box is
  `top: 0 / bottom: 59` — identical to the nav's — and its ring is the UA `outline: auto` at
  `+1px`, outset. Screenshots in both themes show left and right bars and no bottom segment.
  `WIP.md` currently asserts the opposite. Fix exactly as `#theme-toggle` was fixed, with an
  inset ring. Check the specificity against the dark compilation before committing — the
  toggle needed an id selector to out-rank `html[data-theme=dark] .btn-reset:focus-visible`
  at (0,3,1), and a descendant selector at (0,3,0) would apply in light mode only. This is
  the third instance of that trap in this file.
- **`.section-links > ul` margin reverts in dark mode** (finding 14). It is (0,1,1); the
  dark pass re-emits JTD's `ul` margin reset as `html[data-theme=dark] ul` at (0,1,2), later
  in the file. Prefix with `.main-content`, as the footnote rule already documents.
  Cosmetic, 4 px, invisible to axe.
- **`.text-muted` is dead** since `e045ab5` — zero emissions in `builder/`, zero in the
  built tree — and its comment describes the old footer. Delete both the rule and its
  dark-mode twin.
- **`docs/_sass/modules-dark.scss:1-9`** still describes `html.dark-mode` and
  `meta.load-css`; the actual wrapper is the `dark-theme` mixin.

**Verify.** `check.bat` for the specificity fixes (the dark half is what catches them), and
a manual keyboard pass over the aux nav in both themes — axe does not evaluate whether a
focus ring is visible, only that focusable things are reachable and labelled.

**Landed. The `.section-links > ul` diagnosis is wrong**: the margin does not revert in
dark mode, it never applied in either. `.main-content ol, .main-content ul, …` sets
`margin-top: 0.5em` at the same (0,1,1) and later in the file, so the list has been taking
the body-prose 6px since it shipped, light and dark alike. Measured in both themes: 6px
before, 4px after.

The remedy is the one the plan names anyway — `.main-content` in front — plus the dark
override, because the dark compilation re-emits the JTD rule at (0,2,2) and out-ranks
(0,2,1). So the trap the plan warns about is real here; it is just not what was breaking
the rule.

The aux-nav ring was measured rather than eyeballed: at 1280x900 in both themes the nav's
box is top 0 / bottom 59 and the link's is identical, so the UA ring's `+1px` offset puts
its top and bottom segments outside the clip box. After the fix, solid 2px at `-2px`,
`#4e26af` light and `#8cc2ff` dark, with no edge outside the clip box.

## C16 (`fdf157c`) — `a11y: tighten five sharp edges in the scan tooling`

Five Tier 3 bullets, none affecting production results today.

- **`check_a11y.mjs:76`** — `--theme` is unvalidated. `--theme drak` sets
  `data-theme="drak"`, renders light, and labels the report `[drak, …]`. Validate against
  `THEMES`; same for `--viewport`.
- **`check_a11y.mjs:131`** — `--stock-axe` also switches to the minified bundle, so it
  answers "patch *or* minification", not "patch". Separate the two, so the documented
  first-response diagnostic actually isolates the patch.
- **`axe-scan.mjs:619`** — `--pages` narrowing drops state audits silently, despite the
  load-time assertion at `:157` existing to prevent exactly that. Warn when a narrowing
  drops one.
- **`axe-scan.mjs:548`** — `gotoPage` waits for `domcontentloaded` only, and no `<img>`
  carries dimensions, so the video card's `target-size` box depends on decode timing nothing
  waits for. The A/A control was 48/48 identical, so this is a latent flake, not a live one.
  Wait for image decode on pages carrying video cards, or give the images intrinsic
  dimensions in the markup — the second is better for readers too.
- **`highlight-theme.mjs:168,181`** — `clampContrast` returns a non-hex colour, or one it
  cannot raise to 4.5:1, unchanged with no warning and no CSS comment. Not reachable with
  the current `.theme` files. Warn, and mark it in the emitted CSS.

**Verify.** `check_a11y_fingerprint.mjs --baseline production --candidate production` stays
48/48 after the `gotoPage` change; that is the control that would surface a
nondeterministic audit.

## C17 (`0e8753d`) — `a11y: audit content disclosures, and the page that stacks them`

**Decision 4** and the matching Tier 3 bullet. `PAGE_STATES` opens only
`details.section-links`. `FAQ.html` carries 29 content disclosures and is not in
`SAMPLE_PAGES` at all; `Menu/Window.html`'s three stay closed during its own state audit.
The review verified no live defect — zero violations with everything opened — but opening
Menu/Window at the mobile viewport takes `color-contrast` incomplete nodes from 0 to 118,
which measures the surface currently not audited.

**Recommendation: do it, but measure first.** Audit cost is super-linear in element count
(k = 2.73), and the sample already costs 15.3 s. Run `pick_a11y_sample.mjs --propose` and
`--census` before choosing between adding `FAQ.html` and adding a `content-details-open`
state on a page already in the sample. Prefer the second if it covers the construct: a state
audit on an existing page reuses a page already paid for.

Whichever is chosen, the new `PAGE_STATES` entry must assert what it found, like
`section-links-open` does — a state that silently no-ops is a slower audit of the same page,
reporting a pass and covering nothing.

**Verify.** Revert a target-size fix in-page and confirm the new audit catches it at both
viewports. Then the A/A control.

**Landed — and that verification is not achievable, which is what made the commit worth
more than planned.** Opening the disclosures is precisely what *removes* the target-size
defect: with `.main-content summary`'s `min-height` reverted, FAQ reports `target-size`
x16 **closed** at the mobile viewport and **zero** open, because opening pushes the
summaries apart until the spacing allowance rescues them. The open state audits
different surface, not more of the same.

What that measurement found instead is a bigger hole than the one it was testing. **The
site-wide `<summary>` min-height was guarded by nothing.** FAQ.html stacks 30
disclosures against the next page's 4, and is the only page in the site where the defect
class is reachable at all — and it was not in `SAMPLE_PAGES`. Reverting the fix produced
a clean pass.

So the commit does both, and Decision 4's preference is overridden on the evidence:
FAQ.html joins the sample (272/236/229/215 ms over the four combinations), and
`content-details-open` is hosted on it rather than on Menu/Window. Reverting the fix now
fails the gate with 2 violations. `pick_a11y_sample.mjs` gains a `detailsStacked` family
at `min: 8` so `--check` demands a page that stacks them; only FAQ does.

The applier asserts both ways, as the plan requires: it throws on a page with no content
disclosure, and on one whose disclosures reveal nothing. A/A control: 60/60 identical.

## C18 (`a7a040f`) — `build: check the Gantt chart's bytes, not the ones it replaced`

**Tier 3.** `injectGanttChart` (`tbdocs.mjs:1253`) rewrites `BuildInfo.html` in both trees
after `checkReport` runs at `:1220`, so the check did not see the bytes that shipped.
Exposure is nil today because the SVG carries no links and no ids — which is precisely the
kind of thing that stops being true without anyone noticing.

**Change.** Move the injection ahead of the check, or feed the injected HTML through the
same check path.

**Landed as the second option, because the first is impossible**: the Gantt is rendered
from that run's own timings, so it cannot exist before the check runs. It now happens
before the check is *reported*, and the patched pages go back through `checkChunk`
against the same tree env. Only the delta against the pre-injection findings is printed,
so a finding the page already had is not counted twice.

Verified by injecting an SVG carrying a duplicate id, a remote `<img>` and a dead link:
all three are reported, per tree, and the build exits 2.

## C19 (`040aea1`) — `vendor: record the in-tree _sass patches`

**Finding 19 (S2).** `builder/vendor/just-the-docs/README.md:12` says `_sass/` is the gem's
tree "byte-for-byte", and the re-vendoring procedure at step 2 removes it wholesale.
Following that procedure today silently reverts the AAA contrast work and the 1.39:1
`.btn-reset` fix.

The divergence is larger than the review's four files and predates this range. Measured
against the vendoring commit `e7dd843`, 30 files differ. They fall into three groups, and
the manifest should say which is which:

1. **Syntax migration** — `edc9990` (`@import` to `@use` / `@forward`) and `32a404b`
   (deprecated construct ports). Mechanical, re-derivable, affects most of the 30.
2. **Deleted vendor syntax themes** — `OneDarkJekyll` / `OneLightJekyll`, already covered by
   procedure step 3.
3. **Accessibility patches, which must survive re-vendoring** — `3db9794` (`buttons.scss`
   `.btn-reset` colour inheritance, `layout.scss`), `0813181` (`layout.scss`,
   `navigation.scss`, `support/_variables.scss` `$grey-dk-100` / `$link-color`), `56c5570`
   (`navigation.scss`). These are the ones a re-vendor would lose, and the reason each was
   made is recorded in the commit body.

**Change.** An "In-tree patches to `_sass/`" section naming group 3 file by file with its
commit and its reason, a note on groups 1 and 2, a corrected inventory row at `:12`, and a
re-vendoring step that re-applies group 3.

**Landed, with two additions the plan's group list misses.**

**`c9f2dfe` is a fourth accessibility commit**, not a migration. It restores focus
outlines that upstream suppresses — `.btn-reset:focus-visible` in `buttons.scss`, the
copy-code control's `outline: none` in `code.scss`, and the search input's `outline: 0`
in `search.scss`. A re-vendor following the old procedure would have lost all three.
Group 3 is six files across four commits, not four files across three.

**`1632d3d` is not purely a theme deletion.** `color_schemes/dark.scss` and `light.scss`
each carried a `@use "./vendor/One*Jekyll/syntax"` pointing into the deleted directories,
and those two lines had to go in the same commit or Dart Sass fails on a missing partial.
Procedure step 3 as written deletes the directories and leaves the two `@use` statements,
which breaks the build; it now says to remove both halves.

Every ratio and value in the manifest was re-checked against the current tree rather than
copied out of the commit bodies.

---

# Phase 5 — documentation

## C20 (`9f6c38f`) — `docs: correct the drift the link-check fold-in and sample widening left`

One commit across `Authoring.md`, `Building.md`, `Tools.md`, `Builder.md`, `WIP.md`, the two
PLANs, `perf/README.md`, `Pipeline-Stages.md` and the two workflow comments. Written last,
against the code as it then is.

**Three Tier 4 rows need no edit by then**, because Phases 1 to 3 made them true: D8 (exact
occurrence counts, fixed by C01), D9 (the aux-nav ring, fixed by C15), and the tolerances
half of D7 (fixed by C11). Re-read each before deciding it is clean.

**Contributor docs — the fold-in never propagated.**

- `Authoring.md:92` — literal dashes are *not* "rejected" by the build. No such gate exists;
  the typographer converts the ASCII forms and passes literals through, and
  `scripts/convert_em_dash_separators.py` is a manual normaliser. Either say so, or add the
  gate — recommend saying so, and naming the normaliser.
- `Authoring.md:112,181` — `check.bat` does not enforce the remote-asset rule or catch dead
  links; both moved into `build.bat --check`, where `builder/check.mjs:59,73` hardcode the
  remote-asset check on.
- `Building.md:62-70` and `Tools.md:35,111` — `check.bat` does not run two passes of
  `scripts/check_links.mjs`, and the a11y scan is not gated on "when the link check passes"
  within that file. It runs patch-equiv, sample coverage, then a11y.
- `Tools.md:23,48` — `build.bat` passes `--check`, and the CLI table omits `--check`,
  `--no-check`, `--check-audit-index` and `--check-findings`. C08 adds `--check-audit-index`
  to the baked-in flags, so document the set as it then stands.
- `Building.md:66`, `Tools.md:111`, `PLAN-a11y.md:281` — "six sample pages" has been eleven
  since `c67abe4`, and will be twelve if C17 adds one.

**`WIP.md`.**

- `:500` (and `check_links.mjs:7-8`, `PLAN-checks.md:606`) — "both CI workflows still invoke
  it directly" and "Both CI workflows are untouched". Since `b97c75f` CI runs
  `check_links_diff.mjs` against a synthetic fixture, in-process, never against a real tree.
  C07 changes this again, so write it against the final shape.
- `:496`, `:621` — `--check-remote-assets` is not a `tbdocs` argument; passing it throws
  `Unknown argument`. The check is unconditional on `_site` and `_site-offline`. It *is* a
  `check_links.mjs` flag, which is where the name comes from — say which tool.
- `:540` — the section-links disclosure is not "at the end of `<main>`". Since `e045ab5` it
  is the first child of the page footer after the main element closes
  (`template.mjs:96-101`), and it is omitted on pages with fewer than two headings — 452 of
  1,159.
- `:530`, and `PLAN-axe-perf.md:1333,1352` — "all 24 page/theme/viewport combinations" is 48
  audits now. `axe-scan.mjs:162` hedges correctly ("what was then a 24-audit matrix"); these
  read as current.
- `:571` — "3,488 audits". `perf/results/a11y-sweep.jsonl` holds 3,476 (869 × 4), confirmed.
- `:538` — "7,031 permalinks over 869 pages". The 7,031 and Gloss's 172 are exact; 867 pages
  carry at least one.
- `:490`, and both workflow comments — "230 MB" written out. The two trees are ~280 MB today.
- `:492` — "unclosed and badly nested tags" overstates the site-facing check; the unclosed
  shape is unreachable through the template. Pairs with C07's comment fix.
- The `formatReport` row in `PLAN-sab-pull-scheduler.md:598-611` — an errored chunk does
  **not** fail the run for the book, because `TREES.pdf.noFail` makes `formatReport` return
  a non-failing result. The behaviour is deliberate; the row is wrong.

**`Builder.md` and `perf/README.md`.**

- `Builder.md:385` — the axe-core dependency is shown with a caret. `74b3395` removed it
  deliberately; `package.json` pins the exact version, and the source patches are why.
- `Builder.md:90,178-179` — no module-table row for `vendor-assets.mjs` and no
  `vendorAssets` in the task enumeration; `renderSectionLinks`, `videoLinkPlugin`,
  `remoteImagePlugin` and `headingLevelNormalizePlugin` are unmentioned; `injectAnchorHeadings`
  is still documented with its old signature.
- `Builder.md:92` and `Pipeline-Stages.md:487` — "the emitted rule **carries** a
  `raised to 4.5:1` comment". Figurative *carry* is on `WIP.md`'s Replace table. Same for
  the four figurative uses of "drives" in `Builder.md:403,419,428`. `Building.md:66` is
  borderline browser-automation idiom and can stay.
- `perf/README.md:547` — the old highlighter stylesheet name and its drop-variant were
  renamed by `76abd6c`.

**Two structural items.**

- `PLAN-sab-pull-scheduler.md:536` — the two new sections are spliced between steps 4 and 5
  of a numbered procedure. Move them after the procedure ends.
- `docs/Tutorials/CEF/_Images/MonacoArchitecture.md` — the hand-maintained Mermaid source
  the build never reads, whose committed SVG is a *dark*-theme export with edge-label chips
  hand-darkened to 6.07:1, while the source's own comment tells a re-exporter to use the
  default light theme. Following the instruction loses the contrast fix. Either re-export
  light and re-check contrast, or correct the instruction to describe what was actually
  done. Recommend the second: the hand-darkened chips are the shipped, measured state.

**Verify.** Every changed claim re-read against the file it describes, and
`build.bat && check.bat` for the anchors — `WIP.md` and the PLANs carry in-doc anchors that
`redirect_from` does not cover.

**Landed**, with several of the plan's own numbers found stale in turn — they were
written against an eleven-page sample and the sample is thirteen by the time this batch
runs. Corrected against measurement: "six sample pages" and "eleven" are **thirteen**;
"all 24 combinations" is **60 audits**; the plan's own "48 audits" was already out of
date. "3,488 audits" is **3,476** — in `WIP.md` and in `axe-scan.mjs`'s own comment, which
the plan does not list. "230 MB" is **~270 MB**, in four files rather than the three the
plan names. The synthetic fixture is **nine** files, not the six both workflows claim.

`WIP.md:538`'s "7,031 permalinks … 172 on Gloss" checked out exactly and is unchanged,
except to say 867 of the 869 pages carry one.

Two rows needed no edit as predicted (D8 via C01, the tolerances half of D7 via C11).
**D9 needed the opposite of no edit**: the paragraph asserts the aux-nav UA ring "renders
in full", and the measurement in C15 shows it does not, so it had to be rewritten to
describe the author ring that replaced it.

`MonacoArchitecture.md` needed nothing. The plan recommends correcting its instruction to
describe what was actually done; it already does, and the committed SVG's fill values
confirm it.

Two additions the plan does not list. `Tools.md` had no entry at all for
`pick_a11y_sample.mjs` or `check_links_diff.mjs`, which is itself drift in a tool
catalogue, so both were added. And `PLAN-a11y.md` / `PLAN-axe-perf.md` are phase logs
rather than live documents, so their figures are marked as the matrix of their time
rather than rewritten — the same treatment `axe-scan.mjs:244` already gives its own
"what was then a 24-audit matrix".

---

# Decisions, with recommendations — and what was decided

1. **Where the fused comparison lives.** Add the fixture-fused case to `checks.yml` only,
   not to the deploy workflow. `checks.yml` is a PR gate that does not deploy and has the
   time, and catching this before a merge is the point. The deploy workflow keeps its cheap
   fixture run against the index oracle. (C07, C08.)
   → **Taken as recommended.** `checks.yml` runs `--case fixture-built --case
   fixture-built-offline --a script --b fused`; the deploy workflow is unchanged apart
   from its `--check-audit-index` flag and the font install.
2. **Fonts before 19 October 2026.** Install `fonts-liberation` in both workflows. Pinning
   the runner image would also work and expires differently; the font install is the smaller
   commitment and addresses the actual variable. (C08.)
   → **Taken as recommended**, in both workflows.
3. **The aux-nav ring.** Fix it. One rule, and the prose already vouches for it. (C15.)
   → **Taken**, though the prose vouched for the opposite: `WIP.md` said the UA ring
   "renders in full". The measurement is in C15 and the sentence is corrected in C20.
4. **`FAQ.html` and content disclosures.** Add the coverage, but measure first and prefer a
   state audit on a page already in the sample over a new page. (C17.)
   → **Measured first, and the preference reversed by what the measurement showed.** A
   state audit on a page already in the sample covers the construct but guards nothing:
   opening the disclosures is what removes the target-size defect. `FAQ.html` is added as
   a page *and* hosts the state. See C17.
5. **The documentation batch.** One commit, last. (C20.)
   → **Taken as recommended.** Landing it last is what let three Tier 4 rows resolve by
   code rather than by prose, and it is also why several of the plan's own figures were
   themselves stale by the time the batch ran.

---

# Coverage

Every finding in the review, mapped to the commit that addresses it. All landed; a
row whose premise turned out to be wrong says so, and the commit's `Landed` note has
the measurement.

| Finding | Severity | Commit |
|---|---|---|
| 1 — callout family matches footnotes | S1 | C03 (`f4cd53c`) |
| 2 — `SCHEMES.production` lacks its patches | S2 | C02 (`3187638`) |
| 3 — 12 of 20 substitutions assert no count | S2 | C01 (`90dd617`) |
| 4 — no gate exercises the fused detectors | S2 | C07 (`8eacc5c`) — seven categories of nine |
| 5 — `--check-audit-index` invoked by nothing | S2 | C08 (`1c2f895`) |
| 6 — `selfTest()` runs in no automated context | S2 | C07 (`8eacc5c`) |
| 7 — cross-file checks can go dark silently | S2 | C06 (`d2c3a74`) |
| 8 — `check.bat` has no freshness check | S2 | C08 (`1c2f895`) |
| 9 — a 200 with a non-image body is cached forever | S1 | C09 (`3c0c6b6`) |
| 10 — a fetch rejection kills the build | S2 | C09 (`3c0c6b6`) |
| 11 — `brokenUnique` double-counts | S2 | C04 (`39e03ab`) |
| 12 — sitemap/search opt-outs ignored | S2 | C05 (`7df8625`) |
| 13 — aux-nav focus ring clipped | S2 | C15 (`a581290`) |
| 14 — `.section-links > ul` reverts in dark | S2 | C15 (`a581290`) — it never applied in either theme |
| 15 — `def.submit` outside every try/catch | S2 | C10 (`648b607`) |
| 16 — barrier invariant has two unbound halves | S2 | C10 (`648b607`) |
| 17 — three merge-path tolerances survive | S2 / S3 | C11 (`f9ef5a4`) code, C20 (`9f6c38f`) PLAN row |
| 18 — `FsOracle` case-insensitive on NTFS | S2 | C12 (`c0d5ff9`) |
| 19 — vendored README claims byte-for-byte `_sass` | S2 | C19 (`040aea1`) — four patch commits, not three |
| 20 — heading normaliser is a blanket shift | S3 | C13 (`b966f12`) |
| 21 — "6 unresolved" is a regex artifact | S3 | C14 (`8c93e02`) |

| Tier 3 item | Commit |
|---|---|
| `writePdf.expected` missing `renderJoin` | C10 (`648b607`) |
| `writeAssets` missing `vendorAssets` | C10 (`648b607`) |
| `setClass` replaces the class attribute | C13 (`b966f12`) |
| SVG paragraph unwrap bails on mixed content | C13 (`b966f12`) |
| `remoteImagePlugin` misses raw `<img>` | C13 (`b966f12`) |
| `clampContrast` fails silently | C16 (`fdf157c`) |
| `findingsFor.integrityFailed` omits errors | C06 (`d2c3a74`) |
| `--theme` unvalidated; `--stock-axe` conflates two things | C16 (`fdf157c`) |
| fixture `html` pair is not one of each kind | C07 (`8eacc5c`) |
| bare invocation compares nothing | C07 (`8eacc5c`) |
| Gantt injected after the check | C18 (`a7a040f`) |
| `why` strings name rules that never run | C03 (`f4cd53c`) |
| `--pages` drops state audits silently | C16 (`fdf157c`) |
| `gotoPage` does not wait for image decode | C16 (`fdf157c`) |
| content disclosures never audited open | C17 (`0e8753d`) |
| `.text-muted` is dead | C15 (`a581290`) |
| `modules-dark.scss` header is stale | C15 (`a581290`) |
| `cpu-worker` comment denies the fix | C10 (`648b607`) |
| PLAN sections spliced into a procedure | C20 (`9f6c38f`) |
| Monaco Mermaid source vs the shipped SVG | none — the comment is already accurate |
| commit subjects over 80 characters | convention, held throughout — longest is 72 |

| Tier 4 row | Commit |
|---|---|
| `Authoring.md:92` literal dashes "rejected" | C20 (`9f6c38f`) |
| `Building.md:62-70`, `Tools.md:35,111` two check_links passes | C20 (`9f6c38f`) |
| `Authoring.md:112,181` check.bat enforces remote assets | C20 (`9f6c38f`) |
| `WIP.md:500`, `check_links.mjs:7-8`, `PLAN-checks.md:606` CI invokes it directly | C20 (`9f6c38f`) |
| `WIP.md:540` disclosure "at the end of `<main>`" | C20 (`9f6c38f`) |
| `WIP.md:496,621` `--check-remote-assets` as a build flag | C20 (`9f6c38f`) |
| merge-path skips and the `formatReport` row | C11 (`f9ef5a4`) + C20 (`9f6c38f`) |
| `Tools.md` has no entry for two live tools | C20 (`9f6c38f`) — not in the review |
| `axe-scan.mjs`'s own "3,488 audits" comment | C20 (`9f6c38f`) — not in the review |
| exact occurrence count, 4 files | C01 (`90dd617`) — no edit needed |
| aux-nav UA outline "renders in full" | C20 (`9f6c38f`) — the prose was wrong the other way |
| "six sample pages", 3 files | C20 (`9f6c38f`) |
| "all 24 combinations", 3 files | C20 (`9f6c38f`) |
| "3,488 audits" against 3,476 | C20 (`9f6c38f`) |
| `Tools.md:23,48` build.bat flags and CLI table | C20 (`9f6c38f`) |
| `Builder.md:385` axe-core caret | C20 (`9f6c38f`) |
| `Builder.md:90,178-179` missing module, task and plugin rows | C20 (`9f6c38f`) |
| `perf/README.md:547` renamed highlighter stylesheet | C20 (`9f6c38f`) |
| `WIP.md:538` "869 pages" against 867 | C20 (`9f6c38f`) |
| `WIP.md:490` and both workflows "230 MB" against ~280 MB | C20 (`9f6c38f`) |
| `Builder.md:92`, `Pipeline-Stages.md:487` figurative "carries" | C20 (`9f6c38f`) |

## The bar for each commit

`build.bat && check.bat` clean, plus the commit's own named verification. Where a commit
changes a gate, the gate must also be shown to fail on a deliberately reintroduced defect —
a gate that passes after the fix proves nothing on its own, which is the whole subject of
this review.

**Met for all twenty**, and it is the thing that earned its keep. Every one of the five
places the plan turned out to be wrong was caught by the reintroduced-defect half, not by
reading the code: reverting `.main-content summary`'s `min-height` and watching the gate
stay green (C17), reverting the normaliser and diffing 1,159 page hashes (C13), measuring
the `<ul>` margin in both themes and finding it identical (C15), forcing the
`renderJoin` race with the pair list removed (C10), and deleting two categories'
reporting from `builder/check.mjs` (C07).

## Where the plan was wrong

Five, each found by provoking the defect rather than trusting the description.

| Item | The plan said | What is actually true |
|---|---|---|
| C15 (`a581290`) | `.section-links > ul` reverts in dark mode | It never applied in *either* theme; `.main-content ul` wins at equal specificity, later in the file |
| C17 (`0e8753d`) | The new open-disclosure audit catches a reverted `target-size` fix | Opening the disclosures *removes* that defect. The real gap was `FAQ.html` — the only page where the class is reachable — not being sampled at all |
| C19 (`040aea1`) | Three accessibility commits to preserve | Four. And procedure step 3 leaves two dangling `@use` statements that break the Sass build |
| C07 (`8eacc5c`) | A build fixture can carry one fault of each kind | Seven of nine. `sitemap` and `search` are not provokable from a correct build |
| C13 (`b966f12`) | `setClass` drops `.float-right` | It dropped *both* classes, and the naive merge then leaks the `.video` build marker into the output |

Two more where the plan was right but its figures were not: C20's own correction list was
written against an eleven-page sample and needed re-measuring against thirteen, and its
"three Tier 4 rows need no edit" is two — D9 needed rewriting in the opposite direction.

## Found while implementing

Two defects the review did not have, both surfaced by building something the plan asked
for rather than by looking for them.

- **`checkReport` did not depend on `scss`** (fixed in C07). `--check-audit-index` reads
  the tree off disk, and the combined stylesheet is in the index from the moment
  `dispatch` builds it — so the audit could run first and report it as "indexed but not
  on disk". On the real site `scss` finishes long before the check and it never fires; on
  a three-page fixture it does not, and the audit failed the build over nothing. This is
  also the shape of a real production risk: had the SCSS compile ever failed, the index
  would have claimed a stylesheet that was not there.
- **`--pages` narrowing dropped state audits silently** (fixed in C16), walking straight
  past the load-time assertion beside `SAMPLE_PAGES` that exists to prevent exactly that.
  The same hole from the other side.
