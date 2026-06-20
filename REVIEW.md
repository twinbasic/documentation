# twinBASIC Documentation Review

Date: 2026-05-29
Branch: `staging`

> [!NOTE]
>
> This is a historical review, applicable to the state of the repository at commit 5b21474f

A structured pass over `docs/` looking for completeness gaps, broken expectations, and concrete cleanup opportunities. Findings are prioritised P0 (empty entry points) through P10 (informational), with file paths and line numbers throughout.

The reference content underneath all of this is in genuinely good shape --- twelve packages fully documented, prose-style rules from [WIP.md](WIP.md) honored, build clean, link integrity perfect. The improvements below are the polish that makes that work visible to a reader who lands cold on the docs.

---

## Summary

- **Build integrity is solid** --- `build.bat && check.bat` reports 0 broken intra-site links across both `_site/` (7685 unique) and `_site-offline/` (7077 unique). Only the PDF book trips eight outbound links to pages it intentionally excludes.
- **Prose-style adherence is essentially done** --- the WIP.md vocabulary table is followed across the corpus; only two real misses found, and `convert_em_dash_separators.py` runs clean.
- **Reference content is exhaustive** --- all twelve packages have per-symbol pages following the WIP.md template.
- **Weak spots cluster at the entry points** --- four landing pages render with an H1 and nothing else, and two reference meta-pages still wear stale "Work in Progress" banners despite being substantively complete.
- **Foundational tutorials are missing** --- no Hello World, no Forms primer, no Windows API walkthrough, no Assert-based testing tutorial. The four existing tutorial sets (Arrays, CustomControls, WebView2, CEF) are excellent but presuppose the basics.

---

## Method

850 markdown files total in `docs/`:

| Section | Files |
|---|---:|
| `docs/Reference/` | 708 |
| `docs/Features/` | 57 |
| `docs/IDE/` | 39 |
| `docs/Tutorials/` | 25 |
| `docs/Documentation/` | 13 |
| `docs/Videos/` | 3 |
| `docs/Challenges/` | 3 |
| `docs/Miscellaneous/` | 1 |
| `docs/index.md` | 1 |

**Comprehensive (every file):**
- Link integrity --- `check.bat` against `_site/` and `_site-offline/`.
- Banned-vocabulary grep --- the WIP.md replacement table (`leverage`, `kick off`, `spin up`, `under the hood`, `wire up`, `sensible defaults`, `powerful`, `robust`, `out of the box`).
- Literal em-/en-dash detection via `scripts/convert_em_dash_separators.py`.
- Frontmatter scan for `title` / `nav_order` / `has_children` consistency.
- TODO / WIP / "coming soon" marker grep.

**Sampled (representative reads):**
- `docs/Features/` and `docs/IDE/` --- sub-agents walked every page in these sections but read excerpts rather than full text.
- `docs/Tutorials/` --- sub-agent covered the full set.
- `docs/Reference/` --- meta-pages (Statements, Procedures and Functions, Operators, Categories, Attributes, Compiler Constants, Controls, Glossary, Packages) read in full; **roughly 12 of the 708 leaf pages** spot-checked across packages.

The Reference content's quality assessment is therefore extrapolated from about 2 % of the file count. See [Recommended next step](#recommended-next-step-structured-haiku-sweep) at the bottom for closing that gap.

---

## P0 --- empty / near-empty landing pages

These are the first pages a reader hits when clicking the section name in the sidebar, and they are blank. Every other doc site (just-the-docs, Jekyll defaults) puts the section landing immediately after the sidebar click --- empty landings make the section look unfinished even when the leaf pages are excellent.

| Page | Current | Recommendation |
|---|---|---|
| [docs/Reference/index.md](docs/Reference/index.md) | One H1, no body | Brief landing (~150 words). Explain the split (Statements / Procedures and Functions / Operators / Categories) and link the twelve packages, mirroring the welcome page's package grouping. Reuses prose already on [docs/Reference/Packages.md](docs/Reference/Packages.md). |
| [docs/Tutorials/index.md](docs/Tutorials/index.md) | Empty body | Intro paragraph + four tutorial-set blurbs (Arrays, CustomControls, WebView2, CEF). Each tutorial set already has its own `index.md`; this is just a one-click hub. |
| [docs/Videos/index.md](docs/Videos/index.md) | Empty body | One paragraph + links to the two child pages ([Videos/twinBASIC.md](docs/Videos/twinBASIC.md), [Videos/AccessDevCon.md](docs/Videos/AccessDevCon.md)). |
| [docs/IDE/index.md](docs/IDE/index.md) | One screenshot, no prose | Short orientation paragraph naming the panes (Project Explorer, Editor, Properties, Toolbox, tool windows, debug panes), pointing at the per-pane pages and the [tbForm](docs/IDE/tbForm.md) / [tbReport](docs/IDE/tbReport.md) designers. The current screenshot stays --- it's a useful overview shot. |
| [docs/IDE/AddIns/index.md](docs/IDE/AddIns/index.md) | Just install paths | Add a short overview: what an addin is, where they come from (Sample 10--16 in the New Project dialog), the two install locations *with rationale* (the per-user one in `%appdata%` survives upgrades). Link to [tbIDE package](docs/Reference/tbIDE/index.md) for SDK details. |

---

## P1 --- stale "Work in Progress" banners on completed pages

Both of these now ship comprehensive content but still wear a banner that contradicts what's below them. Banners that lie about the content's status train readers to ignore them, including the cases where they *are* warning about a real gap.

- [docs/Reference/Categories.md:11](docs/Reference/Categories.md) --- `> [!WARNING]` / `> Work in Progress Below` followed by a full categorical index. Remove the banner; if specific category sections are still incomplete, scope a WARNING down to those subsections.
- [docs/Reference/Procedures and Functions.md:11](docs/Reference/Procedures%20and%20Functions.md) --- same pattern. The page lists ~290 entries A--Z; it isn't WIP any more.

---

## P2 --- concrete TODO markers in IDE menu and pane pages

These four pages explicitly render `> TODO:` lines in production output:

- [docs/IDE/Menu/File.md:31](docs/IDE/Menu/File.md) --- `> TODO: Add each Menu item.`
- [docs/IDE/Menu/Help.md:29](docs/IDE/Menu/Help.md) --- `> TODO: Add each Help Menu item.`
- [docs/IDE/Menu/Tools.md:19](docs/IDE/Menu/Tools.md) --- `> TODO: Add each IDE Option item.`
- [docs/IDE/Project Explorer.md:37](docs/IDE/Project%20Explorer.md) --- `> TODO: Add each Menu item.`

Each is a short, finite job --- write one short line per menu item, screenshot-driven. Comparable pages like [docs/IDE/Menu/Format.md](docs/IDE/Menu/Format.md) and [docs/IDE/Menu/Window.md](docs/IDE/Menu/Window.md) show the target shape.

Plus stubs that aren't TODO-marked but are functionally TODOs (screenshot only, no prose; each ~8 lines):

- [docs/IDE/Splash Screen.md](docs/IDE/Splash%20Screen.md)
- [docs/IDE/Webpage.md](docs/IDE/Webpage.md)
- [docs/IDE/Memory.md](docs/IDE/Memory.md)
- [docs/IDE/Variables.md](docs/IDE/Variables.md)
- [docs/IDE/Call Stack.md](docs/IDE/Call%20Stack.md)
- [docs/IDE/Properties.md](docs/IDE/Properties.md)

Slightly larger but still effectively undocumented:

- [docs/IDE/Debug Console.md](docs/IDE/Debug%20Console.md) (14 lines)
- [docs/IDE/Outline.md](docs/IDE/Outline.md) (19 lines)
- [docs/IDE/Open Editors.md](docs/IDE/Open%20Editors.md) (17 lines)
- [docs/IDE/Status Bar.md](docs/IDE/Status%20Bar.md) (32 lines, lists indicators without explaining them)
- [docs/IDE/Package Publishing.md](docs/IDE/Package%20Publishing.md) (12 lines)
- [docs/IDE/Toolbox.md](docs/IDE/Toolbox.md) (16 lines)

These are the most-used IDE surfaces. Two or three sentences each, naming the controls in each pane and what they do, would close the gap with very little effort.

---

## P3 --- small typos and copy-paste duplicates

Cheap to fix:

- [docs/IDE/Menu/Debug.md:20](docs/IDE/Menu/Debug.md) --- `Clear Al Breakpoints` → `Clear All Breakpoints`
- [docs/IDE/Menu/Format.md](docs/IDE/Menu/Format.md) --- `Center In Container (Horizontally)` listed twice (lines 20--21); one should be `(Vertically)`
- [docs/IDE/Menu/Add-Ins.md](docs/IDE/Menu/Add-Ins.md) --- `imlpemented` → `implemented`
- [docs/Videos/AccessDevCon.md:57](docs/Videos/AccessDevCon.md) --- `overwiew` → `overview`; line 74 `usefullness` → `usefulness` (BrE `focussing` is fine)
- [docs/IDE/Open Editors.md:14](docs/IDE/Open%20Editors.md) --- self-referential link `[Editor](Editor)` resolves back to the page itself; should link to [docs/IDE/Editor.md](docs/IDE/Editor.md)

---

## P4 --- style violations relative to [WIP.md](WIP.md)

The replacement table is followed remarkably well. Only one real miss in prose:

- [docs/Features/Project-Configuration/Compiler-Options.md:22](docs/Features/Project-Configuration/Compiler-Options.md) --- `Under the hood, a Boolean is a 2-byte type...` → `Internally, a Boolean is a 2-byte type...`

Borderline:

- [docs/Features/GUI-Components/Windowless.md:89](docs/Features/GUI-Components/Windowless.md) --- `#### What Works Out of the Box` is promoted from prose to a heading; per WIP.md "out of the box" is on the keep-as-is list, so this is acceptable as written.

The prose-style cleanup is essentially done. `convert_em_dash_separators.py` runs clean against the entire `docs/` tree --- the one stray it would touch is in a generated CLI-flag table cell and is debatable. This is a real achievement; the rule was non-trivial to internalise across hundreds of pages.

---

## P5 --- gaps that an index promises and the source doesn't deliver

Pages a reader expects to exist after scanning a sibling index:

- [docs/Features/Packages/index.md](docs/Features/Packages/index.md) has **no** "Topics" list, unlike every other Features sub-index. The page has 5 sibling pages on disk ([Creating a TWINPACK package.md](docs/Features/Packages/Creating%20a%20TWINPACK%20package.md), [Importing a package from TWINSERV.md](docs/Features/Packages/Importing%20a%20package%20from%20TWINSERV.md), [Importing a package from a TWINPACK file.md](docs/Features/Packages/Importing%20a%20package%20from%20a%20TWINPACK%20file.md), [Linked Packages.md](docs/Features/Packages/Linked%20Packages.md), [Updating a package.md](docs/Features/Packages/Updating%20a%20package.md)) but none are surfaced from the index. Add a "Topics" bullet list mirroring the [Standard-Library](docs/Features/Standard-Library/index.md) shape.
- [docs/Features/Advanced/Static-Linking.md:53](docs/Features/Advanced/Static-Linking.md) ends with *"A documentation page will be dedicated to more fully explaining this in the future."* --- either expand the existing section or delete the sentence and let the current content stand.

---

## P6 --- Features stub pages worth one worked example each

The Features section has ~20 leaf pages that name a feature in 15--40 lines without a single runnable `` ```tb `` example. Reference pages are dense and template-driven; Features pages are where readers form intuition. A single concrete snippet on each does more for adoption than another paragraph of prose.

Highest-value candidates:

- [docs/Features/Language/Comments.md](docs/Features/Language/Comments.md) --- block-comment `/* */` is described in text; show it in code with a one-line caveat about interaction with `'`
- [docs/Features/Language/Literals.md](docs/Features/Language/Literals.md) --- show `&B`, `&O`, `&H`, digit grouping, and the `_` separator in one example
- [docs/Features/Language/Type-Inference.md](docs/Features/Language/Type-Inference.md) --- show `Dim x = 1` vs `For Each x In coll` vs property edge cases
- [docs/Features/Language/Loop-Control.md](docs/Features/Language/Loop-Control.md) --- `Continue For` vs `Exit For` side-by-side
- [docs/Features/Language/Operators.md](docs/Features/Language/Operators.md), [Handlers.md](docs/Features/Language/Handlers.md), [Return.md](docs/Features/Language/Return.md), [Inline-Initialization.md](docs/Features/Language/Inline-Initialization.md) --- all name-without-show
- [docs/Features/Compiler-IDE/CodeLens.md](docs/Features/Compiler-IDE/CodeLens.md) (13 lines) --- show the code that the CodeLens bar appears above; otherwise it's just a screenshot
- [docs/Features/Compiler-IDE/Debugging.md](docs/Features/Compiler-IDE/Debugging.md) --- show a `Debug.TracePrint` call
- [docs/Features/GUI-Components/Control-Properties.md](docs/Features/GUI-Components/Control-Properties.md), [UserControl.md](docs/Features/GUI-Components/UserControl.md), [New.md](docs/Features/GUI-Components/New.md) --- properties listed without usage; one tiny snippet per property is plenty
- [docs/Features/Project-Configuration/ActiveX-Registration.md](docs/Features/Project-Configuration/ActiveX-Registration.md) (16 lines), [Compiler-Options.md](docs/Features/Project-Configuration/Compiler-Options.md) (35 lines), [Project-Types.md](docs/Features/Project-Configuration/Project-Types.md) (38 lines) --- show the IDE setting screenshot or `.twinproj` snippet
- [docs/Features/Advanced/Multithreading.md](docs/Features/Advanced/Multithreading.md) (50 lines, one example) --- add a thread-from-class scenario
- [docs/Features/Advanced/Assembly.md](docs/Features/Advanced/Assembly.md) --- note `Emit()` constraints (calling-convention, register clobbering)

---

## P7 --- missing top-line tutorials

The four existing tutorial sets ([Arrays](docs/Tutorials/Arrays.md), [CustomControls](docs/Tutorials/CustomControls/index.md), [WebView2](docs/Tutorials/WebView2/index.md), [CEF](docs/Tutorials/CEF/index.md)) are excellent. The gap is the *foundational* stack a new user expects before any of the advanced material lands.

In priority order:

1. **Hello World / first project** --- the FAQ tells readers to download the zip; the Tutorials index leaves them to figure out the rest. A six-step walkthrough (download → create Standard EXE → form → button → MsgBox → compile → run) would slot ahead of [Arrays](docs/Tutorials/Arrays.md).
2. **Forms basics** --- the only form material today is inside CustomControls (advanced) and tbForm (designer-mechanics). A short tutorial covering standard controls, event handlers, and anchoring would catch every VB6 returnee.
3. **Calling the Windows API** --- the [API-Declarations Features page](docs/Features/Advanced/API-Declarations.md) is good *reference* but doesn't take a reader through an end-to-end `Declare`. Sample: enumerate processes via `EnumProcesses`.
4. **Writing unit tests with Assert** --- the [Assert package](docs/Reference/Assert/index.md) is fully documented but never demonstrated end-to-end. A 50-line tutorial would close the loop.

These four would also serve as content for the empty [docs/Tutorials/index.md](docs/Tutorials/index.md) --- each becomes a bullet on the hub page (P0 above).

---

## P8 --- missing reference meta-pages

Two would be high-value to add, one is borderline:

- **`docs/Reference/Enumerations.md`** --- alphabetical index across all twelve packages. Today every enum is buried under its declaring package; an `Enumerations` page parallel to [Statements.md](docs/Reference/Statements.md) / [Operators.md](docs/Reference/Operators.md) would mirror the pattern that makes [Categories.md](docs/Reference/Categories.md) useful.
- **`docs/Reference/Data-Types.md`** --- the intrinsic types (**Long**, **String**, **Variant**, **LongPtr**, **LongLong**, **Decimal**, **Currency**) currently live as cross-cutting glossary entries and inline mentions in [docs/Features/Language/Data-Types.md](docs/Features/Language/Data-Types.md). A single reference page with range / storage size / suffix / cross-links would fill a real "where do I look this up?" gap.
- **`docs/Reference/twinBASIC-Additions.md`** *(borderline)* --- a curated list of "what does twinBASIC add on top of VBA?" with a one-line summary per addition. The [welcome page](docs/index.md) does this informally; readers coming from VBA would appreciate a dedicated page. Optional; the index page covers most of it.

---

## P9 --- small landing-page wins

- [docs/index.md](docs/index.md) line 14 ("Start with the [FAQ](FAQ)") repeats the same advice in the next paragraph ("Coming from VBA or VB6?"). Consider merging --- the "New" and "Coming from VBx" audiences want the same first read.
- [docs/index.md](docs/index.md) line 78 --- "Videos" link points at `Videos/tB` (the inner page), bypassing the section landing. Switch to `Videos/` once that landing is populated (P0).
- [docs/index.md](docs/index.md) Community section --- third-party guides by Mike Wolfe at @nolongerset are valuable; the wiki link sits above them and is described as "supplements these docs with community contributions." Worth re-checking whether the wiki is still active and whether the link priority reflects that.

---

## P10 --- PDF book broken links (informational)

`book.bat` produces a PDF whose internal links target pages that the book intentionally excludes (IDE sub-pages, Videos sub-pages, the IDE landing). The eight breakages:

```
/Features/Images/fafaloneIDEscreenshot1.png
/Videos/AccessDevCon
/Videos/tB
/tB/IDE
/tB/IDE/AddIns/
/tB/IDE/Project/Editor/Form
/tB/IDE/Project/Editor/Report
/tB/IDE/Project/Settings#option-explicit-on
```

Options: (a) include the missing PDF chapters in [docs/_book.yml](docs/_book.yml), (b) rewrite the source links to text references when the PDF would have lost the target, (c) accept this as an expected gap and document it in [docs/Documentation/PDF-Generation.md](docs/Documentation/PDF-Generation.md). The `--no-fail` flag in [check.bat](check.bat) already tolerates this, so the build is green either way --- but the missing image (first entry) looks like an unintentional miss in the offline-exclude list rather than a deliberate omission.

---

## Suggested ordering for a focused pass

If this is to be tackled as a single batch:

1. Fix the four lying banners and four explicit TODO bullets (P1--P3) --- under an hour.
2. Fill the five landing-page voids (P0) --- drafts in an evening.
3. Expand the ~20 Features stubs with one example each (P6) --- a weekend pass.
4. Add `Enumerations.md` and `Data-Types.md` to Reference (P8) --- half a day each.
5. Write the four missing tutorials (P7) --- a real project; tackle Hello World first to unblock newcomers.

---

## Haiku sweep

P0--P10 above came from spot-checking ~12 of 708 Reference leaf pages (about 2 %). To close that 98 % gap, twelve **Haiku** agents were dispatched in parallel, each auditing one package or module group against a checklist derived from [WIP.md](WIP.md). This section is the methodology record; findings appear in the next section.

Haiku is appropriate for this work because the checks are mechanical (per-page, criterion-driven) rather than evaluative. It is not used for factual correctness of twinBASIC semantics, editorial taste, or anything requiring cross-package judgment.

### Agent batching

Total: 708 leaf pages in `docs/Reference/`, split into 12 parallel batches sized 28--92 files each. Groupings put the largest module (HiddenModule, Constants) on its own agent; smaller modules are bundled by package; mixed-package agents only ever bundle packages with the same `vba_attribution` policy.

| Agent | Targets | Files |
|---|---|---:|
| 1 | `docs/Reference/VBA/HiddenModule/` | 50 |
| 2 | `docs/Reference/VBA/Strings/`, `docs/Reference/VBA/Information/` | 59 |
| 3 | `docs/Reference/VBA/Conversion/`, `docs/Reference/VBA/Interaction/` | 52 |
| 4 | `docs/Reference/VBA/FileSystem/`, `docs/Reference/VBA/DateTime/` | 43 |
| 5 | `docs/Reference/VBA/Constants/`, `Financial/`, `Math/`, `ErrObject/`, `Collection/`, `Compilation/`, `TbExpressionService/` | 80 |
| 6 | `docs/Reference/VBRUN/Constants/` | 87 |
| 7 | `docs/Reference/VBRUN/` excluding `Constants/` | 47 |
| 8 | `docs/Reference/Core/` | 92 |
| 9 | `docs/Reference/CustomControls/` | 46 |
| 10 | `docs/Reference/VB/`, `docs/Reference/WinNativeCommonCtls/` | 64 |
| 11 | `docs/Reference/WebView2/`, `docs/Reference/tbIDE/` | 48 |
| 12 | `docs/Reference/CEF/`, `Assert/`, `WinEventLogLib/`, `WinNamedPipesLib/`, `WinServicesLib/` | 29 |

The 10 root-level meta-pages in `docs/Reference/` (`Statements.md`, `Procedures and Functions.md`, `Operators.md`, `Categories.md`, `Attributes.md`, `Compiler Constants.md`, `Controls.md`, `Glossary.md`, `Packages.md`, `index.md`) are excluded --- they were already read in full for P0--P10.

### Per-package `vba_attribution` policy

Established by majority pattern from the existing corpus (measured 2026-05-29):

| Package | Pages | Have `vba_attribution: true` | Policy passed to agent |
|---|---:|---:|---|
| VBA | 285 | 189 (66 %) | **YES** --- every page should have it; flag pages that don't |
| VBRUN | 134 | 0 (0 %) | **NO** --- no page should have it; flag pages that do |
| Core | 92 | 76 (83 %) | **YES, with exceptions** --- twinBASIC-original constructs (e.g. **Interface**, **CoClass**, **Inherits**, **Implements Via**, attribute syntax) should not have it |
| VB | 36 | 1 (3 %) | **NO** --- flag any page that has it |
| WebView2 | 22 | 0 | **NO** |
| CustomControls | 46 | 0 | **NO** |
| CEF | 6 | 0 | **NO** |
| Assert | 4 | 0 | **NO** |
| WinEventLogLib | 3 | 0 | **NO** |
| WinNamedPipesLib | 5 | 0 | **NO** |
| WinServicesLib | 11 | 0 | **NO** |
| tbIDE | 26 | 0 | **NO** |
| WinNativeCommonCtls | 28 | 0 | **NO** |

VBA's 66 % rate is itself a finding — 96 VBA pages currently lack the attribution that the package's majority pattern (and the WIP.md rule for VBA-Docs-derived content) implies they need. The sweep records these per-page.

### Canonical prompt

Every agent receives the same prompt; only the `{{TARGETS}}` and `{{PACKAGE_CONTEXT}}` placeholders are substituted per batch. All agents are invoked with `model: "haiku"`.

````text
You are auditing twinBASIC reference documentation pages for template and
frontmatter consistency. The canonical template rules are documented in WIP.md
at the repo root.

## Audit scope

Audit every .md file under the path(s) listed below, including nested
subdirectories:

{{TARGETS}}

Use Glob to enumerate files first, then Read each one.

## Package context

{{PACKAGE_CONTEXT}}

## Criteria

For each file, first classify it as a SYMBOL page (documents one statement,
function, sub, property, method, class, interface, CoClass, or enumeration) or
an INDEX page (lists members of a package or module --- usually `index.md`).

Output ONLY failures and notable deviations. Do not output passes.

### F-criteria (all pages)

- F1 frontmatter-required --- YAML frontmatter must include `title:` and
  `permalink:`. Member pages with `parent: <Mod> Module` should also include
  `grand_parent: <Pkg> Package`. Report any missing required field.
- F2 vba-attribution --- Pages should follow the per-package policy stated
  in "Package context" above. Report every page whose `vba_attribution` value
  contradicts that policy.
- F3 title-h1-match --- The frontmatter `title:`, the page's first `# `
  heading, and the page identity (filename without `.md`, or parent folder
  name for an `index.md`) should agree on the symbol name. Suffix words like
  " module", " class", " package", " function" are ignorable. Report only
  genuine mismatches.

### S-criteria (SYMBOL pages only)

- S1 missing-summary --- A one-line prose description must appear directly
  under the H1, before any further heading, Syntax line, table, or list.
  Report if absent.
- S2 missing-example --- There must be an `### Example` (or `## Example`)
  section containing at least one fenced ```tb code block. Exception: pure
  enum-value entries that have no behavioural surface.
- S3 missing-see-also --- There must be a `### See Also` (or `## See Also`)
  section linking to at least one related symbol. Exception: very small
  enum/value pages with no obvious cross-references.
- S4 stub-body --- Outside frontmatter, headings, the Syntax line, parameter
  `:` deflist entries, fenced code blocks, the Example section, and the See
  Also section, there must be at least ~40 words of explanatory prose. Report
  pages where prose is effectively absent (a single-sentence summary doesn't
  satisfy this).

### I-criteria (INDEX pages only)

- I1 empty-index --- Must contain descriptive intro prose AND/OR an explicit
  member listing with links. Report indexes that are just an H1 with no body.

## Output format

Output exactly one findings block delimited by `BEGIN_FINDINGS` /
`END_FINDINGS` lines, followed by exactly one summary line. No other prose,
no headings.

BEGIN_FINDINGS
<relative-path-from-repo-root> | <criterion-id> | <severity> | <note ≤12 words>
...
END_FINDINGS
SUMMARY: Audited N files. M findings: X FAIL / Y NOTE

Where:
- <criterion-id> is one of: F1, F2, F3, S1, S2, S3, S4, I1
- <severity> is FAIL (clearly violates the rule) or NOTE (worth review,
  may be intentional)
- <note> is concrete and actionable, at most 12 words
- Paths use forward slashes from the repo root, e.g.
  docs/Reference/VBA/Math/Abs.md

Do not include PASS rows. Do not produce any prose, commentary, or summaries
outside the findings block and the summary line.
````

### Substituted `{{PACKAGE_CONTEXT}}` per batch

For VBA-only agents (1--5):

```
Package: VBA (Microsoft VBA-Docs-derived runtime library, CC-BY-4.0).
Expected `vba_attribution: true`: YES --- every page in this package should
have `vba_attribution: true` in its frontmatter. Report any page that
lacks it as an F2 failure.
```

For VBRUN-only agents (6, 7):

```
Package: VBRUN (VB6 runtime types and constants; mixed VBA-Docs heritage
but the in-repo convention is to omit attribution).
Expected `vba_attribution: true`: NO --- no page should have
`vba_attribution: true` set. Report any page that does as an F2 failure.
```

For the Core agent (8):

```
Package: Core (language statements and keywords, mostly derived from
VBA-Docs).
Expected `vba_attribution: true`: YES with exceptions --- pages
documenting twinBASIC-original constructs (e.g. Interface, CoClass,
Inherits, Implements Via, attribute syntax, Continue, generics keywords)
should NOT have it. Pages documenting classic VBA statements (Dim,
For-Next, If-Then-Else, Select Case, Do-Loop, Sub, Function, On Error,
etc.) SHOULD have it. Use the page's H1 to decide; mark a deviation as
NOTE rather than FAIL when the call is ambiguous.
```

For agents 9--12 (twinBASIC-original packages):

```
Package: <name> (twinBASIC-original content adapted from .twin sources).
Expected `vba_attribution: true`: NO --- no page should have
`vba_attribution: true` set. Report any page that does as an F2 failure.
```

For the bundled agents (10, 11, 12), the context lists each constituent
package explicitly so the agent knows which policy applies where; in
practice all bundled packages share the **NO** policy, so the rule is
uniform across the agent's file set.

### Execution shape

- Each agent is invoked via the Agent tool with `model: "haiku"` and
  `subagent_type: "general-purpose"`.
- Twelve agents dispatched in parallel in a single message; results
  collected as they return.
- Aggregation: paste all findings blocks together, sort by file path, then
  group by criterion ID for the per-criterion tables in the next section.

Order of magnitude: ~700 pages × ~3K input tokens × Haiku 4.5 pricing →
roughly USD 1--3 for the full sweep, excluding aggregation.

---

## Haiku sweep --- findings

Twelve agents returned 177 raw findings (122 FAIL, 55 NOTE) across ~693 files audited. Triaging against deterministic counter-checks produced **97 reliable findings** worth acting on, the remainder being false positives from prompt-spec drift or agent under-reporting at scale. Both classes are documented below alongside the actionable findings.

### Methodology lessons (prompt v1 → v2 corrections)

Three issues with the canonical prompt or its execution surfaced during aggregation. These should be patched into any future sweep:

1. **`grand_parent` rule was over-prescriptive.** The prompt said *"Member pages with `parent: <Mod> Module` should also include `grand_parent: <Pkg> Package`"*, but actual convention uses `grand_parent` only at the deeper nav levels --- VBRUN/Constants enum pages and CustomControls/`<Control>/<SubObject>` pages use it; VBA module member pages and VBRUN/AmbientProperties pages do not. Of 195 pages in the corpus that use `grand_parent`, 86 are under VBRUN/Constants alone. Agent 7 reported 50 F1 grand_parent failures, all of which are **false positives**. Discarded from the aggregate.
2. **Under-reporting at scale.** When a finding applies to every page in a directory (e.g. 50/50 HiddenModule pages lack `vba_attribution`), Haiku tends to mention the pattern in prose but enumerate only a representative example or two in the findings block. The aggregate substitutes deterministic scans for F2 (vba_attribution policy), which is mechanically checkable from frontmatter alone.
3. **Sporadic false positives on F1.** Agent 3 reported `GetSetting.md` and `SaveSetting.md` as missing `title:` --- both have it correctly. Agent 4 reported `TimerValue.md should be TimeValue.md` --- `TimeValue.md` already exists. These appear to be Haiku reading errors. The deterministic F1 scan confirms zero pages are actually missing required fields.

The pattern: mechanical frontmatter checks → deterministic scan. Judgment-driven prose checks (S1, S2, S3, S4, I1) → trust agent output but spot-verify before acting.

### Per-criterion totals (post-triage)

| Criterion | Description | Confirmed findings | Source |
|---|---|---:|---|
| F1 | Frontmatter required fields | 0 | deterministic scan |
| F2 | `vba_attribution` policy | 1 | deterministic scan + Sonnet verification |
| F3 | Title / H1 / filename mismatch | 8 | agent (3 FAIL, 5 NOTE) |
| S1 | Missing one-line summary | 4 | agent |
| S2 | Missing Example section | ~63 | agent + spot-check |
| S3 | Missing See Also section | ~30 | agent |
| S4 | Stub body | 1 | agent (GetInheritedOwner) |
| I1 | Empty index | 0 | agent |

### F2: `vba_attribution` policy (deterministic + content verification)

The initial deterministic scan flagged 96 VBA pages as missing `vba_attribution: true`, on the assumption that the whole VBA package is VBA-Docs-derived. A follow-up content-comparison sweep (one Sonnet agent against `o:/wc/VBA-Docs/Language/Reference/User-Interface-Help/`) verified that **all 82 of those that are actual symbol pages** (the remaining 14 are organisational `index.md` landings) are tB-original content with no VBA-Docs source page to derive from. The omission of `vba_attribution: true` on these pages is therefore **correct**, not a finding.

Summary of the verification:

| Group | Pages | Verdict | Action |
|---|---:|---|---|
| `VBA/HiddenModule/*` (memory primitives, runtime internals, IGetMessageHook API, `vba*` helpers) | 50 | tB-ORIGINAL-NO-SOURCE | none --- attribution correctly omitted |
| `VBA/Compilation/*` (compile-time intrinsics: `CompilerVersion`, `CurrentSourceFile`, ...) | 7 | tB-ORIGINAL-NO-SOURCE | none |
| `VBA/TbExpressionService/*` (twinBASIC expression compiler API) | 6 | tB-ORIGINAL-NO-SOURCE | none |
| `VBA/Information/*` (RGB_R/G/B, RGBA, RGBA_A, ObjPtr, StrPtr, VarPtr, TranslateColor, IsArrayInitialized, Erl) | 11 | tB-ORIGINAL-NO-SOURCE | none |
| `VBA/Interaction/*` (CType, If, CallByDispId, RaiseEventByName, RaiseEventByName2) | 5 | tB-ORIGINAL-NO-SOURCE | none |
| `VBA/Conversion/CType.md` | 1 | tB-ORIGINAL-NO-SOURCE | none |
| `VBA/Constants/VbArchitecture.md` | 1 | tB-ORIGINAL-NO-SOURCE | none |
| `VBA/ErrObject/{LastHresult, ReturnHResult}.md` | 2 | tB-ORIGINAL-NO-SOURCE | none |
| `*/index.md` (14 landing pages) | 14 | tB-ORIGINAL-NO-SOURCE | none --- indexes never have VBA-Docs equivalents |
| **Total VBA "missing"** | **96** | **all correctly omitted** | **none** |

Verified by spot-check: `Erl`, `ObjPtr`, `StrPtr`, `VarPtr`, `TranslateColor`, `IsArrayInitialized` --- none have a dedicated page anywhere under `o:/wc/VBA-Docs/`. The two VBA-Docs-existent symbols in this region (`RGB-function`, `QBColor-function`) already carry `vba_attribution: true` in the twinBASIC docs.

**The actual F2 finding reduces to one page:**

- [docs/Reference/VB/CheckBox/index.md:6](docs/Reference/VB/CheckBox/index.md) --- carries `vba_attribution: true` despite being twinBASIC-original VB-package content. Should be removed.

**Core: 16 pages omit `vba_attribution`.** Same verification pattern applies --- all are twinBASIC-original keywords or operators and the omission is correct:

```
Alias, AndAlso, Class, CoClass, Continue, Delegate, Event, Handles,
Interface, IsNot, LeftShift, Module, OrElse, Protected, RightShift, SavePicture
```

`SavePicture` is the one ambiguous case --- it *is* a VBA statement and has a dedicated VBA-Docs page (`savepicture-statement.md`). Worth a one-page content comparison to confirm whether the twinBASIC content was rewritten or genuinely derived.

#### Methodology addendum (lesson from the verification)

The initial sweep's "per-package `vba_attribution` policy" was the wrong abstraction. Attribution requirements are **per-page**, driven by content provenance, not package membership. The corrected rule for future audits:

> A page needs `vba_attribution: true` if, and only if, its prose was derived (verbatim or paraphrased) from a Microsoft VBA-Docs source page. Verification requires opening both pages and comparing --- it cannot be done from frontmatter alone, and it cannot be inferred from the package name. Symbol existence in VBA is not sufficient evidence of derivation: many VBA-existent symbols (`Erl`, `ObjPtr`, `VarPtr`, ...) have no dedicated VBA-Docs page, and even where one exists the twinBASIC content may have been written independently.

A future sweep should pair the frontmatter scan with the content-comparison agent, rather than relying on a package-level policy.

### S2: Missing `Example` sections

High-confidence agent findings, organised by package:

**VBA / HiddenModule (10 pages)** --- memory-primitive helpers:
- `FreeMem.md`, `GetMem2.md`, `GetMem4.md`, `GetMem8.md`
- `PutMem1.md`, `PutMem2.md`, `PutMem4.md`, `PutMem8.md`, `PutMemPtr.md`
- `vbaCopyBytesZero.md` (its sibling `vbaCopyBytes.md` has one)
- Also: `GetInheritedOwner.md`, `GetShortcutTextByEnum.md`, `vbaRefVarAry.md`

**VBA / Strings (6 pages)**:
- `Join.md`, `MonthName.md`, `WeekdayName.md`, `FormatDateTime.md`, `StrReverse.md`, `InStrRev.md`

**VBA / Math (1 page)**:
- `Atn.md`

**VBRUN / AmbientProperties (17 pages)** --- per Agent 7, every property page (`BackColor`, `DisplayAsDefault`, `DisplayName`, `Font`, `ForeColor`, `LocaleID`, `MessageReflect`, `Palette`, `RightToLeft`, `ScaleUnits`, `ShowGrabHandles`, `ShowHatching`, `SupportsMnemonics`, `TextAlign`, `UIDead`, `UserMode`, ...) lacks an example. These are read-only ambient properties accessed from inside `UserControl` code --- a one-line example per page would close the gap.

**VBRUN / AsyncProperty (8 pages)** --- `AsyncType`, `BytesMax`, `BytesRead`, `PropertyName`, `Status`, `StatusCode`, `Target`, `Value`. Same shape as AmbientProperties.

**VBRUN / DataObject (3 pages)** --- `DataObjectFiles`, `DataObjectFormat`, `DataObjectFormats` (the three helper classes; the methods themselves are fine).

**tbIDE** --- Agent 11 flagged ~20 pages where code examples exist inline but aren't placed under an `### Example` heading or fenced with ` ```tb `. These are NOTE-level (the code is present, just not formally sectioned).

### S3: Missing `See Also` sections

**VBA**:
- `Interaction/Beep.md`, `Interaction/Command.md`, `Interaction/Nz.md`
- `Information/IsArrayInitialized.md`
- `Math/Round.md`, `Math/Sqr.md`, `Math/Log.md`, `Math/Randomize.md`
- `FileSystem/FileCopy.md`, `FileSystem/ChDrive.md`, `FileSystem/ChDir.md`

**WebView2** --- 4 minor wrapper classes and 10 `wv2…` enums lack cross-references. Lower priority: enum pages are an explicit exception in the criteria but worth a pass to add at least one related-enum link per page.

**tbIDE** --- `Toolbars.md` missing See Also.

### S1: Missing one-line summary

- [docs/Reference/Core/Event.md](docs/Reference/Core/Event.md) --- no summary line under the H1.
- [docs/Reference/VBA/FileSystem/FileCopy.md](docs/Reference/VBA/FileSystem/FileCopy.md) --- summary absent (stub page).
- [docs/Reference/VBA/FileSystem/ChDrive.md](docs/Reference/VBA/FileSystem/ChDrive.md), [docs/Reference/VBA/FileSystem/ChDir.md](docs/Reference/VBA/FileSystem/ChDir.md) --- parameter definition not flagged `*required*` (per-symbol style).

### S4: Stub body

- [docs/Reference/VBA/HiddenModule/GetInheritedOwner.md](docs/Reference/VBA/HiddenModule/GetInheritedOwner.md) --- single confirmed stub. Page ends after the parameter list with no remarks, example, or See Also.

### F3: Title / H1 / filename mismatch

NOTE-level only:

- [docs/Reference/Core/And.md](docs/Reference/Core/And.md) --- title `And`, H1 `And operator` (acceptable disambiguation; harmless).
- [docs/Reference/Core/Comparison-Operators.md](docs/Reference/Core/Comparison-Operators.md) --- title `Comparison`, H1 `Comparison operators` (same).
- [docs/Reference/CustomControls/Framework/Canvas.md](docs/Reference/CustomControls/Framework/Canvas.md) --- title `Canvas type (UDT)`, H1 `Canvas`.
- [docs/Reference/CustomControls/Framework/SerializeInfo.md](docs/Reference/CustomControls/Framework/SerializeInfo.md) --- title `SerializeInfo type (UDT)`, H1 `SerializeInfo`.

(Agent 9's flag of `CustomControls/Enumerations/Customtate.md` as a possible `CustomState` typo was a false positive --- the enum is genuinely named `Customtate` in the CustomControls module source and the documentation correctly reflects that name.)

### I1: Empty index pages

None found in the Reference tree (the empty indexes flagged earlier under P0 are all outside `docs/Reference/`).

### Per-package summary

| Package | Files audited | F2 (verified) | Other (agent) | Most-common gap |
|---|---:|---:|---:|---|
| VBA | ~290 | 0 | ~19 | Missing `Example` sections on memory primitives + a few VBA functions |
| VBRUN | ~135 | 0 | ~28 | Missing `Example` on AmbientProperties / AsyncProperty |
| Core | ~89 | 0 | 11 | Mostly NOTE-level prose-style observations |
| CustomControls | ~47 | 0 | 8 | F3 title mismatches, NOTE-level |
| VB + WNCC | ~64 | 1 | 0 | One CheckBox attribution to remove |
| WebView2 + tbIDE | ~47 | 0 | 36 | Enum pages lack cross-refs; tbIDE code examples not formally sectioned |
| Small bundle | ~21 | 0 | 0 | Clean |

### Priority recommendations (post-verification)

In order of effort-vs-impact:

1. **Mechanical** --- Remove `vba_attribution: true` from `docs/Reference/VB/CheckBox/index.md`. One-line fix.
2. **Investigate (5 min)** --- Compare `docs/Reference/Core/SavePicture.md` against `o:/wc/VBA-Docs/Language/Reference/User-Interface-Help/savepicture-statement.md` to confirm the omission is deliberate. All other Core attribution omissions are confirmed correct (twinBASIC-original keywords).
3. **Documentation (15 min)** --- Update [WIP.md](WIP.md) to state the per-page (not per-package) attribution rule explicitly. The current "vba_attribution: true on VBA-derived pages, omit on twinBASIC-original ones" guidance is right; making it explicit that this is judged from content provenance, not package membership, will prevent the next sweep from re-flagging the 96 verified-correct omissions.
4. **Small content** --- Add one-line `Example` blocks to VBRUN/AmbientProperties (17) and VBRUN/AsyncProperty (8). Each is a single ambient property; one ` ```tb ` snippet per page suffices.
5. **Small content** --- Add `Example` blocks to the 10 HiddenModule memory primitives (`GetMem*`, `PutMem*`, `FreeMem`).
6. **Small content** --- Add missing `See Also` sections on the 11 VBA pages listed under S3.

Items 1--6 together are a 1--2 hour mechanical pass. None require domain expertise beyond what is already in [WIP.md](WIP.md).

### Cost actual

The Haiku sweep ran in ~14 minutes wall-clock (12 parallel agents, slowest ~11 min) consuming approximately 1.18 M total tokens across all agents. The Sonnet verification sweep (one agent, 82 pages) ran in ~4 minutes and consumed ~68K tokens. Aggregation was done in-context. Total real spend across both passes is at the low end of the USD 1--3 estimate, with Sonnet on the verification pass adding negligible cost because it short-circuited on most pages once it found no VBA-Docs equivalent.

---

## Appendix: integrity check baseline (2026-05-29)

```
== [1/3] _site/ ============================================
Checked 755458 occurrences (7685 unique) in 2.718s -- 7685 OK, 0 broken
Integrity: 0 issue(s)

== [2/3] _site-offline/ ====================================
Checked 755458 occurrences (7077 unique) in 2.729s -- 7077 OK, 0 broken, 0 forbidden
Integrity: 0 issue(s)

== [3/3] _site-pdf/book.html ===============================
Checked 11509 occurrences (3542 unique) in 0.144s -- 3534 OK, 8 broken
(eight expected misses --- see P10)
```
