# Use-case evaluation protocol

An evaluator gets the part of this file between the rule below and [For the
orchestrator](#for-the-orchestrator), then one goal from [usecases.md](usecases.md).
Nothing else. In particular do not tell it what the case is testing, which page answers it,
or that a hazard exists --- walking into the hazard is the finding. `eval/run_case.mjs`
assembles exactly that and runs the evaluator; never hand it over by any other route (see
[For the orchestrator](#for-the-orchestrator)).

---

You are evaluating a documentation set by trying to USE it. Play a competent developer who
is NEW to this project and knows nothing about it beyond what you read here.

## Corpus

    <CORPUS_ROOT>

- Work ONLY inside that root. Never read the repository the corpus was built from.
- Read-only. Do not write or edit any file.
- A file whose content is `/* [ source withheld ... ] */` is UNREADABLE source. Note it as a
  dead end; never guess its contents.
- Do not use prior knowledge of this project. If you cannot cite a corpus file, say UNKNOWN.

## The site's search box

The published site has a search box. This replica uses the real index and the real query
logic:

    site-search "your query here"

It prints ranked results as title + URL + snippet. A URL like
`/Documentation/Development/Extending#adding-a-pipeline-task` corresponds to the corpus file
`docs/Documentation/Extending.md`: to open a result, find the file whose frontmatter
`permalink:` matches the URL. A grep for the permalink is fine for that, and does not count
as full-text search. Only published pages are indexed --- files under `builder/`, `perf/`,
`test/` and the repository root are NOT reachable this way.

## Three channels, measured independently

Run all three. Do not let what you learn in one channel contaminate how you report another.

- **Channel 0 --- cold guess.** Before opening anything, write the 1--3 places you would look
  first, given only the goal.
- **Channel 1 --- site search.** Issue 2--4 queries phrased the way a person with this goal
  would actually type them, not terms you have since learned. For each, record the top 5.
  Report whether the page that answers the goal appears, and at what rank. If no query
  surfaces it, say MISS.
- **Channel 2 --- navigation.** Start at the corpus `README.md`. Follow links, headings and
  directory listings ONLY --- no content search. Log every file opened in order with one
  line on whether it helped. Report hops to the first genuinely useful content, or STALL.
- **Channel 3 --- full-text search.** Last resort, only if 1 and 2 both fail. Log every
  query. Reaching the answer only here means both reader-facing channels failed; say so.

Measuring search and navigation separately is not ceremony. They fail on different pages: a
round-1 case found its answer at search rank 1 and six navigation hops away, and another
found it in two navigation hops having missed on four of four searches.

## Deliver (under 900 words)

1. **THE ANSWER** --- the actual deliverable the goal asks for, as you would hand it to a
   colleague: concrete, ordered, exact file paths and commands. Cite `path:line` for every
   substantive claim.
2. **CONFIDENCE** --- would you act on this without asking a maintainer? What are you still
   guessing at?
3. **TRACE** --- Channel 0 guesses; Channel 1 queries with the rank of the answer page or
   MISS; Channel 2 ordered file list, hops, dead ends; whether Channel 3 was needed.
4. **GAPS** --- anything missing, ambiguous, contradictory, or stated in two places that
   disagree. Quote both sides. Be blunt; a flattering report is a useless one.
5. **SCORES** 0--4 with one-line justification: completeness, discoverability, actionability.

## The site-entry variant

For a case about the twinBASIC reference rather than the toolchain, the evaluator is a
reader of `docs.twinbasic.com`, not a developer in the repository. Two lines of the above
change, and nothing else:

- The corpus root is `<CORPUS_ROOT>/docs`, and **only files under it may be opened** ---
  that is what the site publishes. `README.md`, `builder/`, `scripts/` and the repository
  root do not exist for this reader.
- **Channel 2 starts at `docs/index.md`**, the published welcome page, rather than the
  repository README.

## For the orchestrator

**Hand an evaluator the text above this heading and nothing below it**, with
`<CORPUS_ROOT>` filled in and `site-search` pointing at the index snapshotted with the
corpus. What follows names defects earlier rounds found, which is an answer key for any case
that re-runs them.

**Run every evaluator with `eval/run_case.mjs`, never as a subagent of the session you are
working in.** A subagent started in this repository receives that session's `CLAUDE.md`,
and the local `CLAUDE.md` imports `WIP.md` --- the file the corpus exists to withhold,
holding every gate's hazard and remedy. Asked without tools, a subagent quoted `WIP.md`'s
first heading. The runner starts `claude -p` inside the corpus instead: safe mode, read-only
tools, reads refused outside its working directory, and one command allowed, the
`site-search` shim it generates over the snapshot. For a site-protocol case the working
directory is the corpus's `docs/`, so the variant's boundary is enforced rather than asked
for. Run `--smoke` once before a round; it checks all of that and fails loudly. The
consequences for rounds 1--7 are in [eval/README.md](README.md#why-an-evaluator-is-a-separate-process).

**Audit the channels from the session, not from the report.** The runner keeps the whole
session and prints `eval/transcript.mjs`'s digest: every search, read and full-text search,
in order. Of the first two evaluators run this way, one searched the whole corpus for the
gate's name before its first site search and then reported Channel 3 as not needed; the
other found its answer by search and walked the navigation path afterwards, to links it
already knew. Neither report said so. Where the digest flags a full-text search the report
does not own up to, score discoverability from what can be checked --- the search ranks and
the links --- and record the discrepancy.

**The site-entry variant** exists because rounds 1--5 had tested 4% of the search index and
left the reference's 80.9% unopened. Round 6 introduced it, and it immediately returned the
harness's first hazard failure in two rounds and its first non-compiling code samples ---
a ListView example that raises a documented run-time error, and an `Event` sample with a
nameless `Sub`. **A site-protocol run is not comparable with a repo-protocol run of the
same goal.** They see different trees and start navigation in different places, so a
re-run must keep the protocol it was first run under.

**Record the evaluator model.** Rounds 1--6 did not; round 7 ran on Sonnet. A re-run on a
different model mixes the fix's effect with the model's, which the orchestrator's own
re-measured search ranks do not. The runner writes the model and the Claude Code version
into every case's `.meta.json`.

**An executed case** --- round 7's UC-54 --- asks the evaluator for a complete project and
what it will print, then runs it: the evaluator's code verbatim in a template from
`test/example-projects/`, a `[RunAfterBuild]` Sub beginning `Debug.Cls` standing in for the
reader's click, and `scripts/tbrun.mjs`. Change one expected value for a second run, since
the failure path is what the pages are least likely to have been checked against. A
program that opens a `MsgBox` or waits for a user at a form cannot be run this way.

**Measure what an answer says the product does.** None of round 8's four most serious
findings was in an evaluator's report: the IDE's Export Project emptying a Git repository,
derived-class constructors failing in silence, error numbers that are not VBA's, and a debugger
Stop that stops one procedure. Each came from checking an answer's claim about the product
against the product, because an evaluator cannot find a behaviour that no page mentions. Drive
the IDE the way `WIP.Harness.md` describes --- a probe agent per question, a port range of its
own, scratch folders only --- and measure before a sentence about the product is written.

**Re-verify every finding against the file before recording it.** In round 1, seven of
twenty-six findings needed amendment after an agent checked the source, every one in the
direction of the reviewer having overstated severity. Evaluators reason from prose and can
misread; so can whoever writes the use cases. Two round-1 briefs contained outright errors
--- one asserted the image files were unreadable when they render, another predicted a table
of contents change on a page that has no table of contents --- and in both cases the agent
was right to check instead of comply.

A case whose premise turns out to be false is not a wasted run. Record what the evaluator
found instead; round 2's page-move case discovered the move had already happened and audited
it against the documented checklist, which surfaced three findings the intended scenario
would not have.

## For the fix pass

**A finding that spans two pages needs a canonical-plus-pointer decision before dispatch.**
Asking one agent to close the same gap in two files, pitched for each audience, is a
reasonable-sounding instruction that produces two full copies which then drift independently.
It happened on the publish-allowlist remedies: roughly 40 lines of near-parallel prose across
`Authoring.md` and `Building.md`, created in a single commit. Decide which page owns the
answer and what the other one says instead, then say so in the brief.

**Partition agents by file, never by finding**, and run a phase alone when its files overlap
everyone else's. Parallel agents committing with explicit pathspecs do not collide; two
agents holding one file do.

**Tell agents to verify rather than comply.** Several briefs in the first two fix passes
contained errors --- image files described as unreadable when they render, a table-of-contents
change predicted on a page with no table of contents, a gate count wrong on three of six, a
contradiction reported as three-way that was four-way. Every one was caught by an agent
reading the source instead of trusting the brief, and each correction is recorded in the
review it came from.

**Tell agents not to background a `tbdocs` build.** It prints a long timing line, so a
backgrounded run whose stdout nobody drains fills the pipe buffer and blocks on the write
*after* finishing its work --- leaving a process that has already written correct output,
burned its usual few seconds of CPU, and will never exit. Three accumulated in one fix pass
before anyone noticed. Run builds in the foreground, or drain the output.

**A section written to be found must be a `##`.** The site search gives an entry to h1 and h2
sections only, and folds an h3 into its parent's; a symptom-titled `###` is invisible to the
search it was written for. Round 8 found this through UC-15's answer, an h3 with no entry.

**Give every agent that drives the IDE its own port range**, and have it pass `--port` to
`examples.bat` as well: another session may be running one on the default ports, and its work
folder is keyed to the port.

**Examples are the part readers copy, and nothing tests them.** Two of `Extending.md`'s three
worked examples were defective --- one duplicated a shipped renderer rule and weakened its
accessibility fix, one rendered an empty element because the body was consumed by a line-skip
loop. Both had been published for months. Any brief that adds or changes an example must say
to execute it.
