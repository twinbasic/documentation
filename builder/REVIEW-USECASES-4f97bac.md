# Use-case review, round 4 --- the failure path, and a fix pass auditing itself, at `4f97bac`

Branch `staging` · reviewed 2026-09-21 · 8 cases

The fourth round of [the harness in `eval/`](../eval/README.md). Five new cases sampling
recovery from a gate, plus round 3's three worst cases re-run unchanged. Method unchanged:
a mirror with all source stubbed unreadable, `WIP.md` and all three prior reviews withheld,
search and navigation scored as separate channels.

## Verdict

**The best round so far on every axis, and the most damning findings — because most of them
are round 3's own fix pass, seven hours old.**

| | completeness | discoverability | actionability |
|---|---:|---:|---:|
| round 1 (16 cases) | 2.75 | 2.75 | 3.00 |
| round 2 (16 cases) | 2.56 | 2.69 | 2.69 |
| round 3 (8 cases) | 2.75 | 2.38 | 2.88 |
| **round 4 (8 cases)** | **3.00** | **2.50** | **3.00** |

Per case:

| case | compl. | disc. | act. | hazard |
|---|---:|---:|---:|---|
| UC-33 fence inside a fence *(re-run)* | 3 | 2 | 4 | pass |
| UC-34 a package count that cannot go stale *(re-run)* | 4 | 3 | 4 | pass |
| UC-36 compile a probe project from a script *(re-run)* | 3 | 2 | 3 | pass |
| UC-39 where does a gate that reads no page go | 4 | 3 | 3 | pass |
| UC-40 a gate refused my regex | 2 | 2 | 2 | pass |
| UC-41 the build printed its last line and stopped | 2 | **1** | 3 | **fail** |
| UC-42 delete a page other pages link to | 4 | **4** | 3 | pass |
| UC-43 `pick_a11y_sample --check` failed | 2 | 3 | 2 | pass |

### Round 3's fixes landed, and by the widest margin yet

All three re-runs improved on all three axes, and every one of the three hazards they walked
into last round is now passed:

| | round 3 | round 4 |
|---|---|---|
| UC-33 fence inside a fence | 2 / 1 / 2, hazard **fail** | 3 / 2 / 4, pass |
| UC-34 package count | 3 / 2 / 3, hazard **fail** | 4 / 3 / 4, pass |
| UC-36 compile from a script | 1 / 1 / 1, **unreachable** | 3 / 2 / 3, pass |
| mean | 2.00 / 1.33 / 2.00 | **3.33 / 2.33 / 3.67** |

UC-36 was the worst result this harness has produced. Its evaluator now reaches
`scripts/tbbuild.mjs` in two navigation hops, writes a correct end-to-end procedure, and
finds `gen_attribute_probes.mjs` on the way — a tool the brief never mentioned. UC-34's
evaluator copied the two new call sites verbatim.

**Three for three.** That is the whole argument for re-running cases rather than only
writing new ones.

## Tier 1 --- introduced by round 3's fix pass

This section is the finding. Round 3's pass closed thirteen findings across seven files in
parallel, and **five of the defects below did not exist before it**. Three evaluators found
the same one independently.

**1. `Building.md` contradicts itself on gate counts, three times against three.** Found by
UC-39, UC-40 and UC-41 separately:

| says | line |
|---|---|
| "**Five** gates that test the build system rather than the site" | `:248` |
| "**Four of the five** cannot be affected by an edit confined to `docs/`" | `:251` |
| "Another **of the five** is worth knowing about before you write a regex" | `:301` |
| "`test.bat` is **six** more, in the same cheapest-first order" | `:65` |
| "one of `test.bat`'s **six**" | `:39` |
| "all **six** of `test.bat`'s and three of `check.bat`'s four" | `:381` |

`test.bat` runs six. The three wrong ones are the section round 3 rewrote; the three right
ones are the lines round 3 patched afterwards when a sixth gate landed. **I audited for this
and my grep missed them** — it matched `five gates` case-sensitively and `five of` but not
`of the five`, so a sweep that looked thorough found four of seven sites.

**2. The gate I added to stop exactly this drift guards one page, and the drift reappeared
in the pages it does not guard — in the same commit.** `check_gate_lists.mjs` verifies
`Tools.md`'s two lists and both stated counts, and its own header says: *"If a third page
starts restating them, this gate will not notice --- which is the argument for not letting
one."* `Building.md` is that third page, `README.md` is a fourth, and both were already
wrong when the gate shipped green. UC-40 and UC-43 both quoted that sentence back.

A gate scoped to one page is not a guard against a class; it is a guard against one file.

**3. `README.md` sends a builder developer to the wrong wrapper.** `:35` reads
`check.bat  # six more gates, from the publish allowlist to the accessibility scan`. Three
things wrong in one line: `check.bat` runs **four**, the publish allowlist is `test.bat`'s
first gate, and **`README.md` never mentions `test.bat` at all**. Found by UC-39, UC-40 and
UC-43. `:47` separately says `Extending.md` "covers all three extension points" where that
page lists four — the missing one is the verification gate, which is what UC-39 was doing.

**4. `Extending.md:532` — "Register it in three places" — omits the one that is machine
enforced.** It names the wrapper and both CI workflows, and not `Tools.md`. Since round 3,
omitting the `Tools.md` entry fails `check_gate_lists.mjs`, so a contributor who follows the
bolded list ships a red `test.bat`. The sentence even ends "which is the convention already
in all four files." UC-39 caught it and worked out the fourth registration from
`check_gate_lists.mjs`'s own description rather than from the instruction.

**5. `Authoring.md:327`'s rationale cites a page its own fix pass corrected.** It explains
the three package-count names by saying *"`Reference/index.md` calls every package
built-in"*. That page now says "the `{{tbdocs:builtInPackages}}` Built-In packages" — the
narrow sense — because the same pass fixed it. Two agents, two files, one cross-file factual
claim, and no one re-read the other's work. UC-34 checked the citation, found no
contradiction at it, and reports that a reader may conclude the distinction is imaginary.

The collision is real and still live, on a third page: `docs/index.md:33-35` heads a section
"Built-in packages" covering all thirteen. The rationale should point there.

**6. `Authoring.md` and `Building.md` disagree on whether a build must follow
`--update-page-baseline`.** `Authoring.md:723` — the command "and the plain `build.bat` that
must follow it". `Building.md:187` — "Both printed forms are a full build, and both carry
the link and integrity check, so nothing needs rebuilding afterwards." `Building.md` is
right. Two agents in one pass, writing the same step from opposite ends. UC-42 scored
actionability 3 for this alone.

## Tier 2 --- actively wrong, and older

**7. Two pages tell a reader with a hung build that nothing will rescue it. The build rescues
itself after 120 seconds.** `Tools.md:341`: *"a worker sits inside `String.replace` and never
returns, the build prints its last line, and nothing times out."* `Building.md:303-305` says
the same in milder words.

That was true when `VOID_TAGS_RE` shipped and has not been true since. `builder/scheduler.mjs:79`
runs a `setInterval` that aborts the build with `{ stalled: true }`; `tbdocs.mjs:107` sets
`stallTimeoutMs: 120000`; `--stall-timeout` takes seconds and `0` disables it. The report
splits the outstanding tasks three ways and, for a render or flush chunk, names the source
pages under it.

**The string `--stall-timeout` appears zero times under `docs/`.** So the best diagnostic the
build has for the exact situation UC-41 was given is undocumented, and the two pages that
discuss that situation assert it does not exist. The evaluator followed them and told the
user to press Ctrl+C.

**8. `Extending.md:624` describes something `pick_a11y_sample --check` structurally cannot
do.** It says the gate "fails when the change introduced a construct the sample does not
cover". `pick_a11y_sample.mjs` iterates `Object.entries(FAMILIES)` and nothing else, so it
tests only families somebody already registered; a genuinely new construct with no family
produces silence. That silence is the exact failure the derived sample exists to prevent,
and the sentence sends a reader looking for a construct the gate cannot have flagged. UC-43
found it by reading the two pages against each other.

**9. `/tB/` URLs are "guaranteed not to move", and there is now a routine for retiring one.**
`Permanent-Links.md:11` states the guarantee as the contract the IDE help system relies on;
`Authoring.md:716-719` — added by round 3 — gives the procedure. Nothing says who authorises
breaking it or whether a redirect is mandatory. UC-42 flagged it as unresolved and was right
to.

## Tier 3 --- gaps at the point of need

**10. A hung `build.bat` has no triage anywhere.** Beyond finding 7: UC-41 missed on 4 of 4
searches and stalled after 5 navigation hops, reaching the answer only by grepping a phrase
it would have had to know already. `Builder.md`'s *Drift guards and failure modes* — the
list a reader consults for "what can go wrong" — enumerates eleven ways the build aborts or
flips the exit code and omits the one that does neither. The asymmetry is stark:
`book.bat` has a phase-by-phase "Stalled, or still working" table; `build.bat` has one clause
inside a paragraph about writing regexes.

**11. No repair guidance for an exponential regex.** UC-40: the docs name the disease in
three places, record that the first fix was still exponential, and never say what makes a
pattern exponential or how to rewrite one. The one worked example is unreadable from the
corpus. The evaluator correctly refused to suppress the gate and then could not fix the
regex.

**12. The `pick_a11y_sample` remedy is an instruction the reader cannot execute.** "Register
a construct family" — with no family shape, no field list, no example, and `FAMILIES`
appearing nowhere in `docs/`. The remedy also splits across two files (`pick_a11y_sample.mjs`
for a family, `axe-scan.mjs` for `SAMPLE_PAGES`) and neither page says so, nor that touching
the second drags in the fingerprint gate.

**13. Three smaller ones, each verified.** `docs/index.md` enumerates all thirteen packages
and is absent from `Authoring.md`'s new-package checklist, so a new package goes unlisted on
the site's front page (UC-34). `Tools.md:507` hands the reader a scripted
`twinBASIC_win32.exe import` while the "exit code is always 0" caveat sits on another page,
uncross-linked — a script written from `Tools.md` alone silently compiles a stale project
(UC-36). And `Building.md`'s requirements never mention that `tbbuild.mjs` needs Windows and
an IDE install (UC-36).

**14. `Authoring.md` vouches for the wrong mechanism.** Its four-backtick advice is reassured
by "`maskCodeRegions` applies that same rule", but the hazard the section is about is
`rewriteAdmonitions`, which runs *outside* the mask — that is why the tilde defect existed.
The two are one paragraph apart and the substitution is on the critical path for exactly the
page the reader is writing. UC-33 caught it and declined to ship the four-backtick form
unverified.

## What round 4 confirms about the method

**Re-running cases is now three-for-three as the only direct evidence a fix works**, and this
round adds the converse: it is also the only thing that catches a fix pass damaging what it
touched. Findings 1 to 6 are all round 3's, and nothing else in the repository would have
reported any of them. A clean `build.bat && check.bat && test.bat` ran over every one.

**Partitioning agents by file has a blind spot, and it is cross-file factual claims.**
The protocol says to partition by file, never by finding, and that is still right — two
agents holding one file collide. But findings 5 and 6 are both one agent asserting something
about a *different* agent's file, concurrently. Neither agent was wrong when it wrote the
sentence. The fix is not to re-partition; it is to **re-read every cross-file claim after the
pass, not during it** — a cheap sweep nobody ran.

**My own audit was the weakest link, twice.** The grep that missed three of seven gate-count
sites, and the brief that told an agent `check_code_regions.mjs`'s sweep catches the
fence-marker case when its probes do. An orchestrator checking parallel agents' work needs
the same "verify rather than comply" discipline the agents are given, and I applied it to
their reports and not to my own sweeps.

**One evaluator correction, in the usual direction.** UC-33 reports the four-backtick form
has "zero corpus coverage"; `Authoring.md` itself now contains one, inside a five-backtick
fence, which is why the grep missed it. The observation stands anyway — it is an example in
the instruction, not a page exercising the construct.

## Method

Unchanged. Corpus built at `4f97bac` from a current build (908 pages, 3,742 index entries):
982 readable prose files, 254 sources stubbed unreadable, `WIP.md` + the twelve `WIP.*.md` +
all three prior `REVIEW-USECASES-*.md` withheld. Eight independent evaluators, one goal each,
never told what the case tested or that a hazard existed.

Search ranks in the Verdict were re-measured by the orchestrator against `eval/site_search.mjs`
directly. Every finding above was verified against the source before recording.

## What to do next

**1. Fix Tier 1, and treat it as one defect.** Findings 1 to 4 are a single class: a count or
a list restated outside the page that owns it. The editorial fix is to stop restating —
`Building.md`'s prose does not need the number when the command block beneath it carries the
list, and `README.md` does not need a count at all.

**2. Widen `check_gate_lists.mjs` past the one page it guards.** It should scan `README.md`
and every page under `docs/Documentation/` for a gate count asserted in prose, not only
`Tools.md`'s two lists. A first probe for this found nothing, because it matched per line and
`Building.md:248` states the count in a section whose heading is the only mention of the
wrapper — the scan has to be per section. Without this, finding 1 will recur a third time.

**3. Publish the stall watchdog (finding 7).** It is a good feature, it is invisible, and two
pages deny it exists. `WIP.md`'s *A hung build times out and says where it hung* transplants
almost directly, and `Builder.md`'s failure-mode list is where it belongs.

**4. The rest of Tier 2 and 3**, in rough value order: the `--check` claim (8), a `tbbuild`
line in the requirements and the `import` exit-code cross-link (13), the `maskCodeRegions`
substitution (14), the `/tB/` retirement authority (9), `docs/index.md` in the checklist (13).
Findings 11 and 12 are larger and may not be worth closing in prose — "how to rewrite an
exponential regex" is a general skill, and the honest fix may be to say so and point at
`--census` rather than to teach it.

**5. Round 5 candidates.** Re-run UC-40, UC-41 and UC-43, which are this round's worst three
and all now have fixes owed. Beyond them, the surface no round has touched: `serve.bat`'s
persistent worker pool (a builder edit that silently does not take effect), the offline
mirror as a deliverable rather than a scan target, and a first-contribution case run against
`README.md` alone, since three of this round's findings are on that file and no case has ever
started there deliberately.
