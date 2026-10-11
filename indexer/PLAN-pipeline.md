# Plan: Documentation Maintenance Pipeline

## Context

This repo (`twinBASIC-documentation`) houses the reference
documentation for twinBASIC, a modern BASIC compiler. The site is at
`docs.twinbasic.com`, built with a custom static site generator
(`builder/tbdocs.mjs`) from markdown pages in `docs/`.

The existing indexer (`indexer/twin-index.mjs`) downloads twinBASIC
packages from two sources — TWINSERV (community package registry) and
GitHub Releases (built-in packages bundled with the IDE) — extracts
their source code, parses declarations, and generates markdown index
files. See `indexer/PLAN-auto-sync.md` for the current module layout,
interfaces, and implementation history. This plan supersedes the
directory structure and CLI interface described there; the module
internals (lexer, extractor, twinpack-parser, etc.) remain valid.

Documentation conventions (page format, frontmatter, cross-linking)
are in `WIP.md`. The `document-symbol` skill
(`.claude/commands/document-symbol.md`) describes the per-symbol
workflow.

## Overview

The indexer evolves from a download-and-index tool into a multi-stage
documentation maintenance pipeline. Each stage is an independent
operation the developer runs separately:

```
sync  →  analyze  →  draft  →  verify  →  human review
```

1. **sync** — download packages, extract sources, generate structured
   API snapshots, commit to local package store
2. **analyze** — diff API snapshots against the documented baseline,
   produce a change report
3. **draft** — Claude Workflow fans out agents to write/update doc pages
4. **verify** — build the site, check links, validate formatting
5. **human review** — developer reviews, commits, PRs

## Status

| Phase | Status | Notes |
|---|---|---|
| A — Restructure indexer directory | ✓ Done | Manifests created as stubs (old gitignored dirs left in place) |
| B — JSON emitter + store management | ✓ Done | Includes extractor enhancement (signature/access on all nodes) |
| C — Analyze stage | ✓ Done | `auditCoverage` returns documented/undocumented; mismatched deferred |
| D — Documentation reorganization | ✓ Done | Landing pages created; packages moved into Default/, Built-In/, Contributed/ |
| E — Draft workflow | ✓ Done | `.claude/workflows/doc-draft.mjs` v2: Setup pre-fetches shared context (cached prefix), Triage resolves paths, Draft batches by container (40 KB budget), Index updates pages. Measured ~5× token reduction vs v1. |
| F — Roll out | In progress | 13 packages adopted (6 built-in, 7 contributed). Differ Private-container bug fix landed. Exclusion frontmatter (`exclude_from_docs`, `exclude_kinds`) in use. |

The CLI stages (`sync`, `analyze`) accept `--package <name>` (or
`--packages <a>,<b>`) to limit scope. The draft workflow accepts an
optional package name via `args`.

## Directory Structure

### Indexer (under `indexer/`)

```
indexer/
  twin-index.mjs                 # CLI: sync | analyze subcommands
  lib/
    sync.mjs                     # TWINSERV sync (refactored)
    builtin-sync.mjs             # GitHub release sync (refactored)
    twinserv-client.mjs           # TWINSERV HTTP client
    github-release.mjs            # GitHub Releases client
    twinpack-parser.mjs           # .twinpack/.twinproj binary parser
    zip-reader.mjs                # Minimal ZIP reader
    vb6-preprocess.mjs            # VB6 → tB normalization
    lexer.mjs                     # Tokenizer + attribute scanner
    extractor.mjs                 # Declaration tree builder
    emitter.mjs                   # Markdown emitter (existing)
    json-emitter.mjs              # api.json emitter
    differ.mjs                    # api.json differ
    store.mjs                     # .packages/ git repo management
  manifests/
    built-in.json                 # committed; tracks synced release tag
    contributed.json              # committed; tracks synced TWINSERV versions
  snapshots/                      # committed; latest api.json per package
    default/
      VBA/api.json
      VBRUN/api.json
      VB/api.json
    built-in/
      WebView2/api.json
      CustomControls/api.json
      ...
    contributed/
      ArrayListLib/api.json
      ...
  .packages/                      # .gitignored; local git repo
    default/
      VBA/
        sources/*.twin
        api.json
    built-in/
      WebView2/
        sources/*.twin
        api.json
    contributed/
      ArrayListLib/
        sources/*.twin
        api.json
```

### Draft workflow (under `.claude/workflows/`)

```
.claude/workflows/
  doc-draft.mjs                   # Claude Code workflow: triage → draft → index
```

**Moved from repo root:**
- `builtin-indexes/manifest.json` → `indexer/manifests/built-in.json`
- `package-indexes/manifest.json` → `indexer/manifests/contributed.json`
- `builtin-indexes/` and `package-indexes/` directories removed after migration

### Documentation (under `docs/Reference/`)

```
docs/Reference/
  Core/                           # 92 language keyword pages (unchanged)
  Default/                        # VB, VBA, VBRUN (always loaded)
    VBA/
      index.md                    # indexed_from: beta-x-0983
      DateTime/
        Now.md
      ...
    VBRUN/
      index.md
      ...
    VB/
      index.md
      ...
  Built-In/                       # 9 opt-in bundled packages
    WebView2/
      index.md                    # indexed_from: beta-x-0983
      ...
    CustomControls/
      index.md
      ...
    Assert/
    CEF/
    WinEventLogLib/
    WinNamedPipesLib/
    WinServicesLib/
    tbIDE/
    WinNativeCommonCtls/
  Contributed/                    # TWINSERV community packages
    ArrayListLib/
      index.md                    # indexed_from: 1.3.0
      ...
```

**Landing pages** (virtual index pages):
- `docs/Reference/Default.md` — parent for VB, VBA, VBRUN
- `docs/Reference/Built-In.md` — parent for the other 9
- `docs/Reference/Contributed.md` — parent for TWINSERV packages

Existing permalinks are preserved via the `permalink:` frontmatter
field. Navigation hierarchy is updated via `parent:` / `grand_parent:`.

## Package Group Classification

Every package belongs to exactly one group. The group determines its
docs directory, snapshot directory, and store directory.

| Group | Source | Docs path | Packages |
|---|---|---|---|
| default | GitHub Release | `Reference/Default/` | VB, VBA, VBRUN |
| built-in | GitHub Release | `Reference/Built-In/` | Assert, CEF, CustomControls, WebView2, WinEventLogLib, WinNamedPipesLib, WinServicesLib, tbIDE, WinNativeCommonCtls |
| contributed | TWINSERV | `Reference/Contributed/` | everything from TWINSERV (32+ packages) |

**Default vs built-in**: all come from the same GitHub release zip, but
the three default packages (VB, VBA, VBRUN) are always loaded in every
twinBASIC project. The distinction is documentation-organizational, not
technical. Define the default list as a constant:

```js
const DEFAULT_PACKAGES = ['VBA', 'VBRUN', 'VB'];
```

Everything else from the release zip is "built-in." Everything from
TWINSERV is "contributed." New built-in packages may appear in future
releases; they default to the built-in group unless added to the
constant.

The group is used when:
- Choosing the store subdirectory (`indexer/.packages/{group}/{pkg}/`)
- Choosing the snapshots subdirectory (`indexer/snapshots/{group}/{pkg}/`)
- Locating existing doc pages (`docs/Reference/{Group}/{pkg}/`)
- Determining `indexed_from` format (beta tag vs version string)

## Version Tracking

### `package_name` frontmatter

When the documentation directory name differs from the internal package
name (the `symbol` in the manifest), the package's `index.md` carries a
`package_name` field so the analyze stage can locate existing docs:

```yaml
---
title: Assert Package
package_name: TwinBasicAssertions
parent: Built-In Packages
---
```

The field is a comma-separated list when multiple packages share one
docs directory (e.g., the three CEF runtime versions):

```yaml
package_name: cefPackage49, cefPackage109, cefPackage145
```

When omitted, the analyzer falls back to matching the docs directory
name against the package name directly. Only add this field when the
names diverge.

Current mappings:

| Docs directory | `package_name` |
|---|---|
| `Built-In/Assert` | `TwinBasicAssertions` |
| `Built-In/WebView2` | `WebView2Package` |
| `Built-In/CEF` | `cefPackage49, cefPackage109, cefPackage145` |

### `indexed_from` frontmatter

Each package's `index.md` carries an `indexed_from` field recording what
version the documentation was last updated from:

```yaml
# Default/Built-In package
---
title: WebView2 Package
parent: Built-In Packages
indexed_from: beta-x-0983
---
```

```yaml
# Contributed package
---
title: ArrayListLib Package
parent: Contributed Packages
indexed_from: 1.3.0
---
```

- **Default + Built-In packages**: the twinBASIC release tag (e.g.,
  `beta-x-0983`)
- **Contributed packages**: the TWINSERV version string (e.g., `1.3.0`).
  TWINSERV's `/query` endpoint returns ALL published versions per
  package (not just the latest), so specific historical versions can be
  downloaded if needed.
- **Absent field**: means "pre-tracking" — the package has never been
  through the pipeline. The analyze stage treats this as a full audit.

Tracking is package-level only. Individual member pages do not carry
`indexed_from`.

### `exclude_from_docs` and `exclude_kinds` frontmatter

Many packages expose Public symbols that are internal implementation
details — WinAPI `Declare` wrappers, private helper modules declared
Public for cross-module access, etc. Two optional frontmatter fields
in a package's `index.md` control which symbols the analyze stage
filters out before generating the change report:

```yaml
---
title: WinEventLogLib Package
exclude_from_docs:
  - EventLogHelperPrivate
  - EventLogAPIs
exclude_kinds:
  - Declare
---
```

**`exclude_from_docs`** — a YAML list of container names (modules,
classes, interfaces). Excluding a container also excludes all its
members and events. Members cannot be excluded individually (a Public
member on a documented container should be documented).

**`exclude_kinds`** — a YAML list of declaration kinds (`Declare`,
`Const`, `Field`, etc.). Any symbol whose kind matches is excluded
regardless of which container it belongs to. Most useful for `Declare`
(WinAPI wrappers) across an entire package.

A symbol is excluded if **either** condition matches — its container
name appears in `exclude_from_docs`, OR its kind appears in
`exclude_kinds`.

The filtering applies in both analyze modes:
- **Audit mode**: excluded symbols are omitted from the undocumented
  list, so the draft workflow never creates pages for them.
- **Update mode**: excluded symbols are omitted from the added /
  modified / removed lists.

The report summary includes an `excluded` count so the developer can
see how many symbols were filtered.

Implementation: the `readExclusions()` helper in `twin-index.mjs`
parses both fields from the index.md frontmatter. The exclusion
predicate is passed to `auditCoverage()` and applied to `diffApi()`
results in `analyzeUpdate()`.

### Committed snapshots (`indexer/snapshots/`)

The `api.json` files under `indexer/snapshots/` are committed to the
docs repo. They represent the latest synced state of each package and
survive cloning. Updated by the sync stage but not auto-committed — the
developer commits them (typically alongside documentation changes).

### Manifests (`indexer/manifests/`)

The manifest files track what the indexer last downloaded from TWINSERV
and GitHub. They are committed to the docs repo so the indexer knows
where it left off across machines.

## Package Store (`indexer/.packages/`)

A `.gitignored` directory that is its own local git repo. Contains
extracted source files and `api.json` snapshots for every synced package.

### Automatic lifecycle management

The store module (`lib/store.mjs`) handles all git operations
transparently. No manual setup required.

**Initialization** (on first sync or fresh clone):

```
if .packages/ does not exist:
  mkdir .packages/
  git init .packages/
  configure: user.name="indexer", user.email="indexer@local"
  if indexer/snapshots/ has api.json files:
    copy snapshots/**/*.json → .packages/ (matching directory structure)
    git add -A
    git commit "baseline: seeded from docs repo snapshots"
```

**After sync:**

```
(sources and api.json written to .packages/)
git add -A
git commit "sync: WebView2 beta-x-0980→0983, ArrayListLib 1.2.0→1.3.0"
copy .packages/**/api.json → indexer/snapshots/ (for docs repo)
```

The structured commit message includes package names and version
transitions for easy `git log` review.

**Fresh clone recovery:**

1. Developer clones the docs repo — `indexer/snapshots/` is present,
   `indexer/.packages/` is absent.
2. Developer runs `sync` — store initializes from committed snapshots
   (first commit), then downloads current packages (second commit).
3. Ready to `analyze` immediately.

## api.json Schema

The structured API surface for each package. Includes all members
(public and private) with normalized signatures. Designed for clean,
stable diffs.

```json
{
  "package": "WebView2",
  "version": "beta-x-0983",
  "modules": [
    {
      "name": "WebView2",
      "kind": "Class",
      "file": "Classes/WebView2.twin",
      "access": "Public",
      "attributes": ["ClassId", "InterfaceId"],
      "implements": ["IWebView2"],
      "inherits": null,
      "members": [
        {
          "name": "Navigate",
          "kind": "Sub",
          "access": "Public",
          "signature": "Public Sub Navigate(url As String)",
          "attributes": [],
          "description": "Navigates to the specified URL."
        },
        {
          "name": "Source",
          "kind": "Property",
          "access": "Public",
          "signature": "Public Property Get Source() As String",
          "attributes": [],
          "description": "Returns the current URL."
        },
        {
          "name": "m_handle",
          "kind": "Field",
          "access": "Private",
          "signature": "Private m_handle As LongPtr",
          "attributes": [],
          "description": null
        }
      ],
      "events": [
        {
          "name": "NavigationCompleted",
          "signature": "Public Event NavigationCompleted(sender As WebView2, e As NavigationCompletedEventArgs)",
          "attributes": []
        }
      ]
    }
  ],
  "enums": [
    {
      "name": "wv2PermissionKind",
      "file": "Classes/WebView2.twin",
      "access": "Public",
      "members": [
        { "name": "wv2PermUnknown", "value": "0" },
        { "name": "wv2PermMicrophone", "value": "1" }
      ]
    }
  ],
  "types": [
    {
      "name": "NavigationCompletedEventArgs",
      "file": "Types/Events.twin",
      "access": "Public",
      "fields": [
        {
          "name": "IsSuccess",
          "signature": "Public IsSuccess As Boolean"
        }
      ]
    }
  ]
}
```

### Normalization rules (for stable diffs)

- Keyword casing: `Public Sub`, `Private Function`, `As String`
  (VB-canonical casing)
- Whitespace: single spaces, no trailing, normalized parameter lists
- Access modifiers: always explicit (`Public` even when it's the default)
- Default types: `As Variant` included when the source omits the type
- Sorted: top-level arrays (modules, enums, types) sorted by name;
  members sorted by name within each container
- No line numbers: they change with implementation edits that don't
  affect the API surface

Normalization is incremental — start with what the extractor already
captures, improve as edge cases surface. The JSON emitter applies
whatever normalization is in place.

## Stage 1: sync

```
node indexer/twin-index.mjs sync [--package <name>] [--packages <a>,<b>]
```

### What changes from the current indexer

| Current behavior | New behavior |
|---|---|
| Writes sources to `package-indexes/packages/` | Writes to `indexer/.packages/` |
| Generates markdown indexes (`.md`) | Generates `api.json`; markdown indexes no longer produced (`emitter.mjs` retained for optional/debug use) |
| Stores manifests in output directories | Stores in `indexer/manifests/` |
| No git integration | Auto-manages `.packages/` git repo |
| No snapshots | Copies api.json to `indexer/snapshots/` |
| `--dont-save-packages` flag | Sources always saved (they're the primary artifact) |
| `--out`, `--builtin-out` flags | Removed; paths derived from store/snapshots layout |

### `--package` filter behavior

For contributed packages, `--package ArrayListLib` downloads only that
one package from TWINSERV.

For default/built-in packages, all come from a single release zip.
`--package VBA` still downloads the entire zip (unavoidable) but only
processes and commits VBA. Other packages from the same zip are
discarded. If multiple built-in packages are specified, the zip is
downloaded once and the requested packages are extracted.

### Module changes

**`lib/extractor.mjs`** (enhanced):

The extractor now captures `signature` and `access` on every
declaration node. The `consumeAttrs(node, rawSig)` helper sets both
from the stripped declaration text (`rawSig` = `stripped` with
whitespace normalized). CoClassInterface nodes get their signature
from the original `text` (preserves `[Default]`/`[Source]` markers).
The old `Declare` node's hand-built `signature` field is replaced by
the full `rawSig` from the source line.

**`lib/json-emitter.mjs`**:

```js
export function emitApiJson(packageName, version, fileResults)
// Takes the same fileResults as emitMarkdown.
// Returns: string (deterministic JSON, sorted keys)
```

Produces api.json from the extractor's declaration tree. Applies
signature normalization. Output is deterministic: sorted keys, sorted
arrays, consistent formatting.

**`lib/store.mjs`**:

```js
export async function ensureStore(storePath, snapshotsPath)
// Initializes .packages/ git repo if absent.
// Seeds from snapshots if available.

export async function commitStore(storePath, message)
// git add -A && git commit in the store repo.
// No-ops if nothing changed (no empty commits).

export async function copyToSnapshots(storePath, snapshotsPath, groups)
// Copies api.json files from .packages/ to indexer/snapshots/.
// groups: array of {group, package} to copy (from the current sync).
// Only copies packages that were actually synced, not the entire store.
```

Git operations use `child_process.execFile('git', ...)` — no git
library dependency.

Note: `findCommitForVersion` is NOT needed. The analyze stage compares
the current `.packages/` api.json against the committed snapshot in
`indexer/snapshots/` — the snapshot IS the baseline. The `.packages/`
git history is useful for developer review (`git log`) but not queried
programmatically.

**`twin-index.mjs`** — new `sync` subcommand:

```
1. ensureStore()
2. compareWithManifest() / compareBuiltinManifest()
3. Download changed packages
4. For each: extract sources, run through lex → extract
5. Generate api.json via json-emitter
6. Write sources + api.json to .packages/
7. commitStore() with structured message
8. copyToSnapshots()
9. Write updated manifests
10. Print summary
```

## Stage 2: analyze

```
node indexer/twin-index.mjs analyze [--package <name>]
```

### Two modes

**Update mode** (package has `indexed_from` in frontmatter):

1. Read the current `api.json` from `indexer/.packages/{group}/<pkg>/`
2. Read the baseline `api.json` from the **last-committed** snapshot.
   Since sync updates the snapshot working tree, use
   `git show HEAD:indexer/snapshots/{group}/{pkg}/api.json` to get the
   committed version (the one that corresponds to the current docs).
   If `indexed_from` matches the baseline's `version` field, proceed.
   If they disagree (shouldn't happen in normal flow), warn and fall
   back to pre-tracking mode. If the snapshot doesn't exist at HEAD
   (new package, first sync), use pre-tracking mode.
3. Diff the two: added, modified, removed symbols

**Pre-tracking mode** (package has no `indexed_from`, or is brand new):

1. Read the current `api.json` from `indexer/.packages/{group}/<pkg>/`
2. Scan `docs/Reference/{Default,Built-In,Contributed}/<pkg>/` for
   existing doc pages
3. Cross-reference: which public symbols have pages, which don't, which
   pages have stale signatures

### Symbol → doc page mapping

The analyze stage needs to match API symbols to existing documentation
pages. Strategy:

1. Scan all `.md` files under the package's docs directory.
2. Read the `title:` frontmatter field from each page.
3. Build a map: `title → file path`.
4. Match each public symbol name against this map.

This handles renamed files and non-obvious paths. For container symbols
(classes, modules), also check for `index.md` inside a directory named
after the symbol.

### Module changes

**`lib/differ.mjs`**:

```js
export function diffApi(baseline, current)
// Takes two parsed api.json objects.
// Returns: {
//   added: Symbol[],       // in current but not baseline
//   modified: Symbol[],    // in both but signature/attributes changed
//   removed: Symbol[],     // in baseline but not current
//   unchanged: Symbol[]    // identical in both
// }
// Comparison is by (module.name, member.name, member.kind) tuple.
// Only public symbols generate tasks. Private symbols and the
// members/events of Private containers are filtered out.

export function auditCoverage(apiJson, docPageMap)
// Takes a parsed api.json and a Map<title, filePath> of existing doc pages.
// Returns: {
//   documented: Symbol[],       // have pages
//   undocumented: Symbol[],     // missing pages
// }
// Skips Private containers entirely (and their members/events) — these
// are implementation details that should not surface in coverage.
// Note: mismatched detection (pages with stale signatures) is deferred —
// it requires parsing signatures from doc page content, which is
// format-dependent. For now, audit reports documented vs undocumented.
```

### Change report output

```json
{
  "package": "WebView2",
  "group": "built-in",
  "mode": "update",
  "from": "beta-x-0980",
  "to": "beta-x-0983",
  "tasks": [
    {
      "action": "create",
      "module": "WebView2",
      "symbol": "NavigateWithOptions",
      "kind": "Sub",
      "signature": "Public Sub NavigateWithOptions(url As String, options As NavigateOptions)",
      "file": "Classes/WebView2.twin"
    },
    {
      "action": "update",
      "module": "WebView2",
      "symbol": "Navigate",
      "kind": "Sub",
      "reason": "signature_changed",
      "old_signature": "Public Sub Navigate(url As String)",
      "new_signature": "Public Sub Navigate(url As String, Optional headers As String = \"\")",
      "file": "Classes/WebView2.twin",
      "doc_page": "docs/Reference/Built-In/WebView2/Navigate.md"
    },
    {
      "action": "flag_removal",
      "module": "WebView2",
      "symbol": "OldMethod",
      "kind": "Sub",
      "doc_page": "docs/Reference/Built-In/WebView2/OldMethod.md"
    }
  ],
  "summary": {
    "total_public": 50,
    "documented": 47,
    "to_create": 2,
    "to_update": 1,
    "to_remove": 0,
    "flagged": 1
  }
}
```

The change report is printed to stdout as a human-readable summary.
The full JSON — an **array** of per-package report objects — is
written to `indexer/.packages/report.json` (not committed to the
store repo — transient working file). The draft workflow reads this
file as its input.

If `--package` is used, the array contains only that package's report.
Without it, the array covers all packages with api.json files in the
store.

## Stage 3: draft (Claude Workflow)

`.claude/workflows/doc-draft.mjs` — a Claude Code workflow that reads
a change report and dispatches agents to write documentation.

### Workflow structure (v2)

```
Phase 1 — Setup  [Haiku]
  Single agent reads WIP.md (extracts page-template, prose,
  conventions, and don'ts sections) and the canonical example
  page for each kind. Returns structured content used to build
  a SHARED PREFIX inlined into every draft agent's prompt.

Phase 2 — Triage  [Haiku]
  Single agent reads the change report and resolves paths:
    - groupDir, version, sourcePath, targetPath
    - signature copied verbatim from the report (incl. null)
    - existingPagePath/reason/old/newSignature for updates
  No filesystem exploration. flag_removal tasks separated.

Phase 3 — Draft (container-batched fan-out)  [Sonnet]
  parallel(batches.map(b => agent(sharedPrefix + batchPrompt(b))))
  Tasks are grouped by (package, container, sourcePath) — every
  member of a container shares one source file, so one agent
  reads it once and writes N pages. Containers with more than
  ~118 members are split into chunks.
  Each agent's prompt has:
    - SHARED PREFIX (identical bytes across all draft agents in
      the run → cached by the model after the first call):
        * WIP.md excerpt
        * Canonical example pages by kind (1 each, deduped)
    - BATCH-SPECIFIC:
        * Package / container / source path
        * Symbol list with target paths and signatures
  Agent reads source ONCE + index ONCE, then writes N pages.

Phase 4 — Index updates  [Sonnet]
  One agent per package updates the package index.md (including
  indexed_from). Cross-reference index updates (Statements.md,
  Procedures and Functions.md) deferred to manual pass.
```

### Model selection

Every `agent()` call specifies an explicit `model:` — the default
(inherited parent model) is never used.

| Phase | Model | Rationale |
|---|---|---|
| Setup | Haiku | Mechanical: read files, extract sections, return content. No reasoning. |
| Triage | Haiku | Mechanical: read JSON, apply deterministic path rules, return structured output. |
| Draft | Sonnet | Creative: read source code, follow conventions, write quality documentation prose. |
| Index | Sonnet | Semi-creative: read source for accurate one-line descriptions, edit existing pages while preserving structure. |

Opus is not used — the draft task is convention-following (imitate
example pages), not open-ended reasoning.

### Token economy

The v2 design exists because the v1 (one agent per symbol) wasted
~95% of its tokens on context the agent had to re-fetch every time.
Per the wf_8085e568 measurements, a v1 draft agent paid:

| Cost | v1 per-agent |
|---|---|
| WIP.md read | ~14 K tokens |
| 2 example pages | ~3 K tokens |
| Package index | ~1 K tokens |
| Source file | ~5 K tokens |
| Filesystem exploration (Glob/LS) | ~2 K tokens |
| **Total input** | **~25 K tokens** |
| Output (one page) | ~1 K tokens |

The v2 design attacks all three sources of waste:

1. **Pre-inline shared context** — Setup phase fetches WIP.md
   excerpt + example pages once. The result is embedded as a
   byte-identical SHARED PREFIX at the front of every draft
   prompt, so the prompt cache hits on the next ~50 K bytes.
2. **Drop filesystem exploration** — Triage resolves the
   `targetPath` deterministically from path rules; the draft
   agent is told to trust it and not Glob/LS.
3. **Batch by container** — Members of the same container share
   one source file. One batched agent reads it once and writes
   N pages; the per-symbol task entry in the prompt is ~165 bytes.

Measured on Generics (44 symbols, 8 containers):

| Metric | v1 | v2 |
|---|---|---|
| Draft agents | 44 | 8 |
| Total agents | 46 | 11 |
| Tokens | ~2.4 M (est.) | 456 K |
| Tokens / symbol | ~54 K | ~10 K |

### Batching

`buildBatches(tasks)` groups tasks by `(package, module, sourcePath)`
then chunks each group to fit a per-agent input budget.

```
BATCH_BUDGET_BYTES   = 40 * 1024
FIXED_OVERHEAD       =  4 * 1024  (batch instructions header)
ASSUMED_SOURCE_SIZE  = 10 * 1024  (the .twin file the agent reads)
TASK_ENTRY_ESTIMATE  = 220        (measured p90; avg 165, p99 290)

budget       = BATCH_BUDGET_BYTES − FIXED_OVERHEAD − ASSUMED_SOURCE_SIZE
maxPerBatch  = max(5, floor(budget / TASK_ENTRY_ESTIMATE)) ≈ 118
```

Containers with ≤ ~118 members fit in one batch. Larger containers
(e.g., VBComDlg.CommonDialog with ~150 members) are split into
sequential chunks of up to `maxPerBatch`.

The SHARED PREFIX (~50 KB) is NOT included in the budget — it sits
outside the per-batch envelope because cache hits make subsequent
agents see it as effectively free.

### Implementation details

**Setup agent** returns `{ wipExcerpt, examplePages }`. The workflow
formats this into a SHARED PREFIX string that is concatenated to
the front of every draft prompt. Identical bytes across agents →
prompt cache hits.

**Triage agent** returns structured output (JSON Schema) with an
enriched flat task list. `signature` is required (nullable) so the
draft agent always knows the symbol's signature. `flag_removal`
tasks go to a separate `flagged` list.

**Draft agents** receive the shared prefix + batch-specific prompt.
The batch-specific prompt lists the source file path, package index
path, and the N target paths. The agent uses Read TWICE (source +
index) and Write/Edit N times. It is explicitly told NOT to read
WIP.md or examples, and NOT to use Glob/LS.

**Kind → example page mapping** (one canonical page per kind,
shared across the SHARED PREFIX):

| Kind(s) | Example page |
|---|---|
| Sub, Function, Declare | `Default/VBA/Interaction/AppActivate.md` |
| Property, Field, CoClassInterface | `Default/VBRUN/AmbientProperties/BackColor.md` |
| Const, Enum | `Built-In/CustomControls/Enumerations/WindowState.md` |
| Event | `Default/VB/CheckBox/index.md` |
| Class, Interface, CoClass | `Built-In/WinEventLogLib/EventLog.md` |
| Module | `Built-In/TwinBasicAssertions/Exact.md` |
| Type | `Default/VBRUN/PropertyBag/index.md` |

**Index agents** run in parallel (one per affected package). Each
reads the current `index.md`, adds alphabetically-sorted bullet
entries for new symbols, and sets `indexed_from` to the new version.

**Package filter**: the workflow accepts an optional `args` string. If
set, the triage agent processes only the named package from the
report.

## Stage 4: verify

```
node builder/tbdocs.mjs --src docs --dest docs/_site
```

After drafting, the developer (or a workflow agent) builds the site to
catch:
- Broken cross-reference links
- Invalid frontmatter (missing parent, bad permalink)
- Formatting issues

This stage uses the existing builder and does not require new code.

## Package Adoption Flow

When a package enters the pipeline for the first time (whether it has
existing docs or not), there is a one-time "adoption" process.

### Adopting a built-in package with existing docs

Example: VBA (has extensive docs, written before the pipeline existed).

1. `node indexer/twin-index.mjs sync` — populates `.packages/default/VBA/`
2. `node indexer/twin-index.mjs analyze --package VBA` — sees no
   `indexed_from` → full audit mode. Compares api.json against pages
   in `docs/Reference/Default/VBA/`. Reports: documented, undocumented.
3. Run the `doc-draft` workflow (with `args: "VBA"`) — agents fill gaps.
4. Developer reviews, adds `indexed_from: beta-x-0983` to index.md.
5. If a `WIP-VBA.md` exists: extract user-relevant architectural
   notes into the package's index.md, then delete the WIP file.

### Adopting a new contributed package

Example: ArrayListLib (no existing docs).

1. `node indexer/twin-index.mjs sync --package ArrayListLib` —
   downloads, extracts, generates api.json.
2. `node indexer/twin-index.mjs analyze --package ArrayListLib` — no
   docs at all → full scaffold report listing every public symbol.
3. Run the `doc-draft` workflow (with `args: "ArrayListLib"`) — agents
   scaffold the entire package:
   - `Contributed/ArrayListLib/index.md` with overview + `indexed_from`
   - Per-module/class pages with members
   - Enum detail pages
4. Developer reviews, commits.

### Subsequent updates

Example: ArrayListLib 1.3.0 → 1.4.0.

1. `node indexer/twin-index.mjs sync` — downloads new version,
   commits to `.packages/`, copies api.json to `snapshots/`.
2. `node indexer/twin-index.mjs analyze --package ArrayListLib` —
   diffs api.json (1.3.0 baseline from committed snapshot vs 1.4.0
   current in `.packages/`). Reports: 2 added, 1 modified.
3. Run the `doc-draft` workflow (with `args: "ArrayListLib"`) — agents
   update only affected pages, update `indexed_from: 1.4.0`.
4. Developer reviews, commits (doc changes + updated snapshot +
   updated `indexed_from`).

## WIP-<package>.md Orientation Files

These files contain architectural context about each package (threading
models, composition patterns, framework splits, etc.). They are used
**once** during package adoption:

- The draft workflow reads the orientation file (if present) when
  creating the initial package documentation.
- User-relevant architectural documentation is incorporated into the
  package's `index.md` overview section.
- Process-specific notes (file lists, download instructions, etc.) are
  discarded.
- After adoption, the `WIP-<package>.md` file is deleted.

Packages without orientation files are adopted without this step — the
agents read the source code directly.

## Migration Steps

### Phase A: Restructure indexer directory — ✓ Done

1. ✓ Create `indexer/manifests/` directory.
2. ✓ Created `indexer/manifests/built-in.json` and `contributed.json`
   as stubs (`syncedAt: null`). Old gitignored directories
   (`builtin-indexes/`, `package-indexes/`) are not in the repo;
   first sync populates the new manifests from remote state.
3. ✓ (See 2 — stubs created directly; no files to move from git.)
4. Old directories are gitignored and were never committed. Code no
   longer references them. `.gitignore` entries kept as safety net.
5. ✓ Added `indexer/.packages/` to `.gitignore`.
6. ✓ Created `indexer/snapshots/{default,built-in,contributed}/` with
   `.gitkeep` files.
7. ✓ Manifest paths updated in `twin-index.mjs` (the refactored CLI).
   `sync.mjs` and `builtin-sync.mjs` accept paths as parameters —
   unchanged.

### Phase B: JSON emitter + store management — ✓ Done

8. ✓ Implemented `lib/json-emitter.mjs`. Also enhanced
   `lib/extractor.mjs` to capture `signature` (normalized stripped
   text) and `access` (Public/Private/etc.) on all declaration nodes.
9. ✓ Implemented `lib/store.mjs`.
10. ✓ Refactored `twin-index.mjs` into `sync` subcommand. Old CLI
    flags removed. Added fresh-clone recovery: both contributed and
    built-in sync paths detect unchanged packages with missing store
    directories and force re-download.

**Verification:** Run `node indexer/twin-index.mjs sync`. Confirm:
- `indexer/.packages/` is created as a git repo with one or two
  commits (seed + sync).
- `indexer/snapshots/` contains api.json files for all packages.
- `indexer/manifests/` is updated.
- Run again immediately — no new commit (nothing changed).

### Phase C: Analyze stage — ✓ Done

11. ✓ Implemented `lib/differ.mjs`. `diffApi` compares flattened
    symbol maps by `(container.name.kind)` key. `auditCoverage`
    returns `{documented, undocumented}` — the `mismatched` return
    (pages with stale signatures) is deferred since it requires
    parsing signatures from markdown page content.
12. ✓ Added `analyze` subcommand. Supports update mode (diff against
    `git show HEAD:indexer/snapshots/...`) and audit/pre-tracking
    mode. `findPackageDocsDir()` tries the grouped layout first
    (`Reference/{Group}/{Package}/`), falls back to the flat layout
    (`Reference/{Package}/`) as a safety net.
13. Test end-to-end after first sync.

**Verification:** Run `sync`, then `analyze --package Assert` (small
package, has existing docs). Confirm the change report correctly
identifies documented vs undocumented symbols.

### Phase D: Documentation reorganization — ✓ Done

14. ✓ Created landing pages: `Default.md`, `Built-In.md`,
    `Contributed.md` under `docs/Reference/`.
15. ✓ Moved all 12 package directories into grouped subdirectories
    (`Default/`, `Built-In/`). Created empty `Contributed/`.
16. ✓ Updated `parent:` frontmatter in all 12 package index.md files
    (`Packages` → `Default Packages` / `Built-In Packages`). No pages
    used `grand_parent: Packages` so no child pages needed changes.
    All `permalink` and `redirect_from` values preserved.
17. ✓ Updated `Packages.md` to reference the three landing pages.
18. Build verification deferred to Phase F roll-out.

### Phase E: Draft workflow — ✓ Done

19. ✓ Wrote `.claude/workflows/doc-draft.mjs`. Three-phase workflow:
    Triage (Haiku) reads report, resolves paths → Draft (Sonnet)
    pipeline fans out one agent per symbol → Index (Sonnet) updates
    package index pages. Accepts optional `args` string to filter by
    package name.
20. Test with one small package (e.g., Assert) end-to-end.

### Phase F: Roll out — In progress

21. ✓ First full sync: 32 contributed + 16 built-in packages synced,
    snapshots generated, store repo committed.
22. ✓ Added `package_name` frontmatter field for packages whose docs
    directory name differs from the internal package name. See
    `package_name` section above. Mappings: Assert → TwinBasicAssertions,
    WebView2 → WebView2Package, CEF → cefPackage49/109/145.
23. ✓ Fixed `auditCoverage` to include container-level (module/class)
    coverage checks — previously only checked members.
24. ✓ Updated `findPackageDocsDir` to scan `package_name` frontmatter
    as a fallback when the docs directory name doesn't match.
25. ✓ Fixed `writeToStore` to strip `Sources/` prefix so source file
    paths match the `file` fields in api.json. Fixed missing-sources
    detection to check for `sources/` subdir (not just the package dir)
    so snapshot-seeded stores correctly trigger re-download.
26. ✓ Added missing `EXAMPLES_BY_KIND` entries to the draft workflow:
    Declare, Const, Field, Interface, CoClass, CoClassInterface.
27. ✓ Fixed `buildDraftPrompt` to construct full repo-root-relative
    target paths (`docs/Reference/{group}/{package}/{target}`) instead
    of using the triage agent's package-relative `targetPath` directly.
    First test run confirmed agents wrote to the repo root without this.
28. ✓ First adoption: WinEventLogLib — triage + draft + index ran end
    to end. Draft agents correctly detected inline-documented members
    and skipped redundant standalone pages.
29. ✓ First contributed-package adoptions (no existing docs):
    TwinTimerPackage, TBMANLIB_ListBoxHScroll, TBMANLIB_RES, VBA_JSON,
    WinReg, FileProps. Confirmed page creation works from scratch.
30. ✓ Found and fixed `parent:` mismatch in v1 prompts — agents had
    been appending a kind suffix (`parent: JsonConverter Module`)
    while the container page's title was the bare name. Build
    surfaced this as nav-orphan errors. Prompt tightened to require
    `parent` match the container's exact `title:` value.
31. ✓ Found and fixed triage doubled-path bug — Haiku occasionally
    returned `targetPath` already prefixed with `docs/Reference/...`,
    causing files to land at e.g. `FileProps/docs/Reference/.../X.md`.
    Triage prompt now says "MUST be relative" with explicit
    right/wrong examples.
32. ✓ Found and fixed `differ.mjs` Private-container leak — members
    and events of Private modules/interfaces were being flattened as
    public symbols. Both `flattenSymbols()` and `auditCoverage()`
    now skip a container's members/events when the container itself
    is Private. Result: WinNamedPipesLib report dropped from 163 to
    43 "to create" tasks.
33. ✓ Added `exclude_from_docs` and `exclude_kinds` frontmatter on
    package `index.md` for Public-but-internal containers (e.g.,
    `EventLogHelperPrivate`, `InternalStuff`) and unwanted symbol
    kinds (e.g., `Declare`). See the frontmatter section above.
34. ✓ Swept the 7 pre-fix adoptions for junk pages. FileProps had a
    nested `FilePropertyExplorer_Helper/` folder (Private class) —
    removed and added to `exclude_from_docs`. Other six were clean.
35. ✓ Built-in batch adoption: CustomControls, TwinBasicAssertions,
    AppGlobalClassObject, WinServicesLib, WinNamedPipesLib drafted
    end to end (201 pages, build verified).
36. ✓ Draft workflow v2: rewrote `doc-draft.mjs` to add a Setup
    phase (pre-fetch shared context), inline the shared context as
    a cacheable prompt prefix, drop filesystem exploration, and
    batch tasks by container with a 40 KB per-batch input budget.
    Measured on Generics: ~80% token reduction, ~5× cheaper per
    symbol.
37. ✓ Measured `TASK_ENTRY_ESTIMATE` from real prompts (avg 165,
    p90 214, p99 290 bytes). Lowered from 500 → 220, raising
    `maxTasksPerBatch` from 52 to ~118. Triage schema updated to
    require `signature` (nullable) so draft agents always see it.
38. Adopt remaining built-in packages: tbIDE, WebView2Package,
    CustomControlsPackage, CEF (use `--package cefPackage145` to
    avoid the 3× duplication), WinNativeCommonCtls.
39. Continue adopting contributed packages. Defer the largest
    (`tbShellLib` ~22 K symbols, `WinRT` ~16 K symbols) until a
    scoping strategy is in place.
40. Adopt the Default packages (VB, VBA, VBRUN) — these have
    extensive existing docs, expect update-mode runs with care.

## Parser Improvements (incremental)

The current extractor captures declarations but signatures are not
fully normalized. Improvements to pursue as edge cases surface:

- Explicit default types (`As Variant` when omitted in source)
- Consistent `ByRef`/`ByVal` (tB defaults to `ByRef`; make it explicit)
- Optional parameter defaults in normalized form
- Generic type parameters (`Of T`) in consistent format
- `WithEvents` field signatures

These don't block the pipeline — the JSON emitter normalizes what it
can, and the differ compares what's there. Better normalization reduces
false-positive "modified" reports.

## Known Limitations

- **API internals in audit results**: resolved — the
  `exclude_from_docs` and `exclude_kinds` frontmatter fields let
  packages opt out internal containers and symbol kinds from the
  analyze report. See the frontmatter section above.

- **Inline-documented members**: packages that document all members on
  the container page (e.g., Assert puts 15 functions on `Exact.md`)
  report those members as "undocumented" because no standalone page
  exists. The audit is technically correct — there is no page titled
  `AreEqual` — but the content is present on the parent page. The
  developer should not run the draft workflow for these packages; just
  add `indexed_from` after manual review.

- **CEF version duplication**: the three CEF packages
  (`cefPackage49/109/145`) have identical API surfaces. Running a full
  analyze produces three redundant reports. Use `--package cefPackage145`
  to analyze only the recommended version.
