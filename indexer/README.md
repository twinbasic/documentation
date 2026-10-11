# indexer — twinBASIC package documentation pipeline

Downloads twinBASIC packages, extracts their source code, and produces
structured API snapshots (`api.json`) used to maintain the reference
documentation at docs.twinbasic.com.

## Prerequisites

- Node.js 20+
- Git (used by the package store)
- Internet access (fetches from TWINSERV and GitHub Releases)

No `npm install` required — the indexer uses only Node built-ins.

## Quick start (fresh clone)

```sh
# From the repo root:
node indexer/twin-index.mjs sync
```

This does everything on the first run:

1. Creates `indexer/.packages/` as a local git repo (the "store").
2. Downloads all packages from TWINSERV (community) and the latest
   twinBASIC GitHub release (built-in + default).
3. Parses every `.twin` / `.twinproj` source file through the
   lexer and extractor.
4. Generates an `api.json` snapshot per package.
5. Commits sources + snapshots to the store.
6. Copies `api.json` files to `indexer/snapshots/` (committed to
   the docs repo).
7. Updates `indexer/manifests/` (committed; tracks sync state).

Subsequent runs only download what changed.

## Commands

### sync

```sh
node indexer/twin-index.mjs sync [--package <name>] [--packages <a>,<b>]
```

Downloads packages, extracts sources, generates `api.json` snapshots.

| Flag | Effect |
|------|--------|
| `--package VBA` | Sync only VBA. For built-in packages the release zip is still downloaded (unavoidable), but only the named package is processed. |
| `--packages VBA,ArrayListLib` | Sync multiple specific packages. |
| _(no flag)_ | Sync everything. |

**What it writes:**

| Path | Committed? | Contents |
|------|-----------|----------|
| `indexer/.packages/{group}/{pkg}/sources/` | No (gitignored) | Extracted `.twin` source files |
| `indexer/.packages/{group}/{pkg}/api.json` | No (gitignored) | Full API snapshot |
| `indexer/snapshots/{group}/{pkg}/api.json` | Yes | Copy of the above (survives cloning) |
| `indexer/manifests/contributed.json` | Yes | TWINSERV sync state |
| `indexer/manifests/built-in.json` | Yes | GitHub release sync state |

### analyze

```sh
node indexer/twin-index.mjs analyze [--package <name>]
```

Compares the current API snapshots (from `sync`) against the
documented baseline and produces a change report.

Two modes, chosen automatically per package:

- **Update mode** — the package's `index.md` has an `indexed_from`
  field. Diffs the current `.packages/` api.json against the
  last-committed snapshot (`git show HEAD:indexer/snapshots/...`).
  Reports added, modified, and removed public symbols.

- **Audit mode** — no `indexed_from` (new package, or pre-tracking).
  Cross-references every public symbol in `api.json` against existing
  doc pages (matched by `title:` frontmatter). Reports documented vs
  undocumented symbols.

The report is printed to stdout and written to
`indexer/.packages/report.json`.

## Package groups

Every package belongs to one group. The group determines where its
files live in the store, snapshots, and docs.

| Group | Source | Store path | Docs path | Packages |
|-------|--------|-----------|-----------|----------|
| default | GitHub Release | `.packages/default/` | `Reference/Default/` | VBA, VBRUN, VB |
| built-in | GitHub Release | `.packages/built-in/` | `Reference/Built-In/` | Assert, CEF, CustomControls, WebView2, WinEventLogLib, WinNamedPipesLib, WinServicesLib, tbIDE, WinNativeCommonCtls |
| contributed | TWINSERV | `.packages/contributed/` | `Reference/Contributed/` | everything from TWINSERV (32+ packages) |

The three default packages (VBA, VBRUN, VB) are always loaded in every
twinBASIC project. Everything else from the release zip is "built-in."
Everything from TWINSERV is "contributed."

## Pipeline overview

```
sync  -->  analyze  -->  draft  -->  verify  -->  human review
```

1. **sync** — download, extract, generate api.json, commit to store _(done)_
2. **analyze** — diff snapshots, produce change report _(done)_
3. **draft** — Claude workflow fans out agents to write doc pages _(planned — Phase E)_
4. **verify** — build the site, check links _(uses existing builder)_
5. **human review** — developer reviews and commits

Steps 1-2 are implemented. Step 3 will be a Claude Code workflow at
`.claude/workflows/doc-draft.mjs` that reads `report.json` (from
`analyze`) and dispatches agents to create or update doc pages
following the conventions in [`WIP.md`](../WIP.md). Until then, use
the report to drive manual documentation or the `/document-symbol`
skill.

See `PLAN-pipeline.md` for the full design, status, and future phases.

## Directory layout

```
indexer/
  twin-index.mjs              CLI entry point (sync | analyze)
  lib/
    sync.mjs                   TWINSERV manifest comparison + download
    builtin-sync.mjs           GitHub release manifest comparison + extraction
    twinserv-client.mjs        TWINSERV HTTP client
    github-release.mjs         GitHub Releases client
    twinpack-parser.mjs        .twinpack/.twinproj binary parser
    zip-reader.mjs             Minimal ZIP reader (deflate)
    vb6-preprocess.mjs         VB6 -> twinBASIC normalization
    lexer.mjs                  Tokenizer + attribute scanner
    extractor.mjs              Declaration tree builder
    emitter.mjs                Markdown emitter (retained for debug use)
    json-emitter.mjs           api.json emitter
    store.mjs                  .packages/ git repo lifecycle
    differ.mjs                 api.json diff + coverage audit
  manifests/                   (committed) sync state
    built-in.json
    contributed.json
  snapshots/                   (committed) latest api.json per package
    default/
    built-in/
    contributed/
  .packages/                   (gitignored) local git repo with sources
```

## Troubleshooting

**"No packages to analyze. Run sync first."**
The `.packages/` directory is empty. Run `sync` to populate it.

**Sync says "Up to date" but `.packages/` is empty.**
This shouldn't happen — `sync` detects missing store directories and
forces re-download even when the manifest says nothing changed. If it
does happen, delete `indexer/manifests/built-in.json` and
`indexer/manifests/contributed.json` (reset them to stubs), then run
`sync` again.

**Git errors during store operations.**
The store requires `git` on PATH. Verify with `git --version`. The
store uses its own identity (`user.name=indexer`, `user.email=indexer@local`)
so it won't interfere with your global git config.

## Specifications and artifacts

| File | Description |
|------|-------------|
| `TWINSERV-protocol.md` | TWINSERV HTTP API specification. |
| `PLAN-pipeline.md` | Full pipeline design, status, and future phases. |
| `PLAN-auto-sync.md` | Historical: original module layout and interfaces. |
| `query_response.json` | Captured TWINSERV `/query` response (238 KB, 32 packages). |
| `sample.twinpack` | Sample `.twinpack` binary (CustomControlsPackage v0.0.3.0). |
| `parse_tree.ps1` | PowerShell script to dump `.twinproj`/`.twinpack` entry trees. |

The canonical `.twinpack` binary format spec is at
[`docs/Features/Packages/TWINPACK file format.md`](../docs/Features/Packages/TWINPACK%20file%20format.md).
