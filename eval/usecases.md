# Use-case catalogue

Each case is a **task**, not a topic. "Explain the scheduler" is a topic and every document
passes it; "add a task that fans out over pages and merges the results" is a task, and it
either walks into the barrier-`expected` hazard or it does not.

`H` marks a case with a known hazard: a way to do the task that looks right, is wrong, and is
recorded somewhere in the repository. **The evaluator is never told the hazard exists.**
Walking into it is the finding.

Do not paste this file into a corpus an evaluation will read --- `eval/` is excluded from the
mirror for exactly that reason.

---

## Round 1 --- the three personas

### Persona A: content contributor (never touches the builder)

| id | goal | hazard |
|----|------|--------|
| UC-01 | Add a reference page for a language statement: where does the file go, what frontmatter, how does it reach the nav and the indexes? | |
| UC-02 | Put a screenshot into a page --- where does it live, what is it named, what will the build refuse? | |
| UC-03 | A contributor's draft pastes a `github.com/user-attachments/...` image URL. Merge as-is? | **H** leaving the vendored copy uncommitted fails CI; the URL itself is fine |
| UC-04 | Embed a YouTube video. | **H** an `<iframe>` or hotlinked thumbnail is the obvious move and is banned |
| UC-05 | A page uses `#` then `###`. Is that acceptable? | **H** the build silently repairs legacy pages, which hides the defect from new authors |

### Persona B: toolchain user (runs the build, chases a gate, deploys)

| id | goal | hazard |
|----|------|--------|
| UC-06 | The build aborted: a file type may not be published. Diagnose and fix. | **H** widening `SOURCE_EXTENSIONS` is the obvious fix and the wrong one |
| UC-07 | The accessibility gate failed on one page. Reproduce it, look at it, fix it, prove it. | **H** `file://` in a preview pane renders unstyled; the scan targets `_site-offline/` |
| UC-08 | I edited a `.dot` diagram. What do I run, what do I commit? | **H** hand-editing the `.svg`, or setting the font anywhere but the `.dot` |
| UC-09 | Get my change deployed; what does CI run that my local build does not? | |
| UC-10 | Preview an edit and judge how it looks. | **H** `file://` is worthless for styling; `serve.bat` is required |

### Persona C: builder developer (modifies tbdocs itself)

| id | goal | hazard |
|----|------|--------|
| UC-11 | Add a task that fans out over pages and merges results into build state. | **H** a barrier must list every chunk task in `expected`; a zero dep count does not mean the submits ran |
| UC-12 | Add a markdown-it plugin that rewrites one kind of link. | **H** page-relative paths break the PDF book; emit root-absolute |
| UC-13 | Upgrade axe-core. What must be re-run before trusting a green check? | **H** the fingerprint gate alone is insufficient; two gates are required |
| UC-14 | Change the site's body typeface. What else must change? | **H** dark mode silently keeps system fonts; diagram metrics go stale |
| UC-15 | I edited the link checker. How do I know one implementation didn't quietly check less? | |
| UC-16 | Add a CSS rule for a component that works in both themes. | **H** the dark compilation raises specificity; a single-class rule silently loses |

## Round 2 --- recovery, and the URL contract

Round 1 under-sampled two things: **recovery** (something already went wrong and must be
diagnosed) and **the `/tB/` URL contract**, the one part of the site with an external
consumer. Both are where the repository's most expensive historical failures sit.

### Persona A: content contributor

| id | goal | hazard |
|----|------|--------|
| UC-17 | Document a COM interface whose real name begins with an underscore, with a folder of property pages. | **H** a blanket `**/_*/**` exclude once swallowed 37 pages and a package published nothing for months |
| UC-18 | Move a reference page between sections without breaking the `/tB/` links the IDE help system resolves against. | **H** the permalink is a contract; `redirect_from` is owed |
| UC-20 | Link from a VBA module page to a VBRUN module page, and back. | **H** the two sit at different URL depths, so the `../` counts are asymmetric |
| UC-21 | Write a passage with a parenthetical aside and a term list. | **H** literal `—` is forbidden in source; the bullet dash differs by list kind |
| UC-22 | Add a wide comparison table. | **H** a bare table once failed `scrollable-region-focusable` on 44 pages |
| UC-23 | Rename a section heading that other pages link to by anchor. | **H** `redirect_from` emits whole-page stubs and cannot remap a fragment |
| UC-30 | Add a fenced code sample in a language the highlighter has never seen. | **H** silently falls back to plain text with only a build-log warning |

### Persona B: toolchain user

| id | goal | hazard |
|----|------|--------|
| UC-19 | A new page built green and is not on the site. Diagnose. | **H** several distinct causes, most of them silent |
| UC-24 | `book.bat` failed. Triage it. | |
| UC-25 | The build has got slower. Find where the time went. | |
| UC-26 | Build and verify on macOS, where the `.bat` wrappers do not run. | |
| UC-29 | First contribution: what to read, in what order, what to run before opening a PR. | |

### Persona C: builder developer, and a reviewer

| id | goal | hazard |
|----|------|--------|
| UC-27 | Re-vendor a newer just-the-docs and keep the in-tree patches. | |
| UC-28 | Add a new verification gate to `check.bat`. | **H** not one of the three documented extension points |
| UC-31 | Review a pull request that changes `builder/`. | **H** the fixture's hard-coded counts break from a template change alone |
| UC-32 | I changed a build task. Which documentation must follow, and how do I know I found it all? | |

## Scoring

Per case, 0--4 each:

- **Completeness** --- does the corpus answer the goal well enough to act without guessing?
- **Discoverability** --- reachable from the goal alone? Measured separately per channel,
  because search and navigation fail on different pages.
- **Actionability** --- specific enough to execute (exact commands, files, order) and to
  verify afterwards?
- **Hazard coverage** --- pass / fail / n-a: was the reader warned at the place they were
  reading, or did they walk into it?

Also recorded, not scored: hops to first useful hit, dead ends, and whether full-text search
was needed.

## Writing a new case

**Mine the hazards.** `WIP.md` is substantially a catalogue of "this shipped broken and
nobody noticed" --- 27 mislabelled diagram boxes, ~6 pages silently dropped from the search
index, a package that published nothing. Each is a use case waiting to be written, and the
real question is never whether the warning exists but whether the reader meets it at the
point they would go wrong.

**Word the goal the way a person would say it**, and never hint at the hazard. If the case
mentions the trap, it measures reading comprehension instead of documentation.

**Expect premises to be wrong.** UC-18 assumed a page still needed moving; it had already
moved, and the evaluator audited the completed move against the documented checklist
instead, which produced three findings the intended scenario would not have. That is a
successful run, not a wasted one.
