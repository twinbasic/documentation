# Use-case evaluation protocol

Hand this file to an evaluator, then give it one goal from [usecases.md](usecases.md).
Nothing else. In particular do not tell it what the case is testing, which page answers it,
or that a hazard exists --- walking into the hazard is the finding.

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

    node eval/site_search.mjs "your query here"

It prints ranked results as title + URL + snippet. A URL like
`/Documentation/Development/Extending#adding-a-pipeline-task` corresponds to the corpus file
`docs/Documentation/Extending.md`. Only published pages are indexed --- files under
`builder/`, `perf/`, `test/` and the repository root are NOT reachable this way.

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

Round 6 introduced this because rounds 1--5 had tested 4% of the search index and left the
reference's 80.9% unopened. It immediately returned the harness's first hazard failure in
two rounds and its first non-compiling code samples --- a ListView example that raises a
documented run-time error, and an `Event` sample with a nameless `Sub`.

**A site-protocol run is not comparable with a repo-protocol run of the same goal.** They
see different trees and start navigation in different places, so a re-run must keep the
protocol it was first run under.

## For the orchestrator

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

**Examples are the part readers copy, and nothing tests them.** Two of `Extending.md`'s three
worked examples were defective --- one duplicated a shipped renderer rule and weakened its
accessibility fix, one rendered an empty element because the body was consumed by a line-skip
loop. Both had been published for months. Any brief that adds or changes an example must say
to execute it.
