# Plan: Automated Package Sync and Multi-Format Indexer

## Context

The current indexer (`twin-index.mjs`) reads `.twin` files from a manually-exported
package tree and generates markdown indexes. This works but requires a human to
export packages from the IDE whenever they update. We want to automate the full
pipeline: query TWINSERV for the latest packages, download only what changed,
extract source files from the `.twinpack` binaries, and index everything --
including VB6-format `.bas`, `.cls`, `.frm`, `.dsr`, and `.ctl` files that some
packages contain alongside `.twin` files.

## Module Layout

```
indexer/
  twin-index.mjs              # CLI entry point (refactored)
  lib/
    twinserv-client.mjs        # TWINSERV HTTP API client
    twinpack-parser.mjs        # Binary .twinpack/.twinproj format parser
    sync.mjs                   # TWINSERV download/delete orchestrator
    vb6-preprocess.mjs         # VB6 file preprocessor
    lexer.mjs                  # Lexer + attribute scanner (from twin-index.mjs)
    extractor.mjs              # Declaration extractor (from twin-index.mjs)
    emitter.mjs                # Markdown emitter (from twin-index.mjs)
    github-release.mjs         # GitHub Releases API client
    zip-reader.mjs             # Minimal zip central-directory parser
    builtin-sync.mjs           # Built-in package manifest + extraction
```

Dependency graph (arrows = imports):

```
twin-index.mjs
  --> lib/sync.mjs
        --> lib/twinserv-client.mjs
        --> lib/twinpack-parser.mjs
  --> lib/builtin-sync.mjs
        --> lib/github-release.mjs
        --> lib/zip-reader.mjs
        --> lib/twinpack-parser.mjs
  --> lib/github-release.mjs
  --> lib/vb6-preprocess.mjs
  --> lib/lexer.mjs
  --> lib/extractor.mjs
  --> lib/emitter.mjs
```

No circular dependencies. Leaf modules (`lexer`, `extractor`, `emitter`,
`vb6-preprocess`, `twinpack-parser`, `zip-reader`, `github-release`)
depend only on Node builtins. `zip-reader` uses `node:zlib` for Deflate.

## Directory Structure

```
package-indexes/                 # TWINSERV packages (--out)
  manifest.json                  # Version tracking (which packages are indexed)
  Assert.md                      # Generated markdown indexes
  CustomControlsPackage.md
  ...
  packages/                      # Source files (default on; --dont-save-packages disables)
    Assert/
      Sources/
        Exact.twin
        Permissive.twin
        Strict.twin
    CustomControlsPackage/
      Sources/
        WaynesGrid.twin
    ...

builtin-indexes/                 # Built-in packages (--builtin-out)
  manifest.json                  # Tracks twinBASIC release tag
  VBA.md
  VBRUN.md
  VB.md
  CustomControls.md
  ...
  packages/                      # Source files (same flag controls both)
    VBA/
      Sources/
        _HiddenModule.twin
        ...
    VB/
      Sources/
        ...
```

## Module Interfaces

### lib/twinserv-client.mjs

```js
export async function queryPackages()
// Calls GET /twinbasic/packages/query?auth=
// Returns: { public: PackageInfo[] }
// PackageInfo = { publisher, projectId, versions: VersionInfo[] }
// VersionInfo = { symbol, description, licence, versionMajor, versionMinor,
//                 versionRevision, versionBuild, publishedDate, publishedTime, ... }

export async function downloadPackage(projectId, version)
// Calls GET /twinbasic/packages/download with id + version params
// version = { versionMajor, versionMinor, versionRevision, versionBuild }
// Returns: Buffer (raw .twinpack binary)
```

Dependencies: global `fetch` only. No `node:fs`.

### lib/twinpack-parser.mjs

Binary format reference: [`docs/Features/Packages/TWINPACK file format.md`](../docs/Features/Packages/TWINPACK%20file%20format.md).

```js
export function parseTwinpack(buffer)
// Takes Buffer or Uint8Array. Validates magic 0xEA0BA51C and format version.
// Returns: TwinpackEntry (the root)
//
// TwinpackEntry = {
//   kind: 'file' | 'directory',
//   name: string,
//   revision: number,          // uint64 revision counter (low 16 bits vary in practice)
//   flags: number,             // uint32 bitmask: 0x01=Hidden, 0x02=SuperHidden, 0x04=Virtual
//   category: number,          // 0x03=Sources, 0x07=Packages, etc. — see CATEGORY constants
//   content?: Buffer,          // file content (only for kind='file')
//   children?: TwinpackEntry[] // child entries (only for kind='directory')
// }
```

Dependencies: none (pure computation on bytes). Uses DataView for little-endian
reads. Maintains a position cursor like `parse_tree.ps1`'s `$script:pos`.

### lib/sync.mjs

```js
export async function compareWithManifest(manifestPath)
// 1. Loads manifest from manifestPath (missing/empty → all packages new).
// 2. Queries TWINSERV for all public packages (latest version of each).
// 3. Compares versions; categorises each as added/updated/unchanged/removed.
// Returns: { toDownload, unchanged, removed, manifest }
// toDownload entries carry { id, pkg, version, symbol, reason }.

export async function fetchPackage(projectId, version)
// Downloads a single .twinpack, parses it, returns collectFiles() result.
// Throws on network or parse error (caller handles).

export function versionString(v)
// Returns "major.minor.revision.build" string from a VersionInfo object.
```

**Manifest shape** (persisted as `manifest.json`):

```json
{
  "syncedAt": "2026-06-02T12:00:00Z",
  "packages": {
    "{697A5CBF-...}": {
      "symbol": "CustomControlsPackage",
      "publisher": "WaynePhillipsEA",
      "version": "0.0.3.0",
      "publishedDate": "24-JAN-2022",
      "publishedTime": "09:30:44"
    }
  }
}
```

Version comparison uses the dot-joined string `"major.minor.revision.build"`.
Keyed by projectId GUID so renames of the symbol don't cause spurious
re-downloads.

### lib/vb6-preprocess.mjs

```js
export function preprocessVB6(fileContent, extension)
// Strips VB6 headers and wraps body in a synthetic container.
// Returns: { content: string, lineOffset: number }
//
// extension → container mapping:
//   .bas → Module
//   .cls → Class
//   .frm → Class (form)
//   .dsr → Class (designer)
//   .ctl → Class (user control)
//
// lineOffset = number of original lines consumed before the body starts,
// so the caller can fix up line numbers to refer to the original file.
```

**Preprocessing steps:**

1. Extract `Attribute VB_Name = "name"` → use as container name.
2. Strip format-specific headers:
   - `.cls`: Remove `VERSION 1.0 CLASS` + `BEGIN...END` block + `Attribute VB_*` lines.
   - `.frm`: Remove `VERSION 5.00` + `Begin VB.Form...End` block + `Attribute VB_*` lines.
   - `.ctl`: Remove `VERSION 5.00` + `Begin VB.UserControl...End` block + `Attribute VB_*` lines.
   - `.dsr`: Remove `VERSION 5.00` + `Begin...End` block + `Attribute VB_*` lines.
   - `.bas`: Remove `Attribute VB_*` lines only (no block header).
3. Strip per-member `Attribute member.VB_Description = "text"` lines.
   (Future: convert these to `[Description("text")]` annotations.)
4. Wrap remaining body:
   ```
   <ContainerKind> <VB_Name>
   <body>
   End <ContainerKind>
   ```
5. Return wrapped content + lineOffset.

### lib/lexer.mjs

```js
export function lex(fileContent)
// Returns: { line, text, rawText }[]

export function scanAttributes(rawText)
// Returns: { attrs: string[], description: string|null }

export function isAttributeOnlyLine(text)
// Returns: boolean
```

Processes a file's raw lines into **logical lines** — joined
continuations with strings and comments stripped.

**Character-by-character state machine.** Two states: `CODE` and
`STRING`.

For each physical line, walk character by character:

- **CODE state:**
  - `'` → rest of line is a comment; stop processing this physical line.
  - `"` → enter STRING state.
  - Anything else → accumulate into the code buffer.

- **STRING state:**
  - `""` → escaped quote; skip both characters (stay in STRING).
  - `"` → exit STRING; replace the entire string literal content with
    nothing (emit `""` — empty placeholder so attribute brackets still
    balance, but no keywords can match inside strings).
  - Anything else → skip (consuming string content).

After processing each physical line:

1. The code buffer (with strings replaced by `""`) is the **stripped
   code**.
2. Check if the stripped code matches `\s_\s*$` (underscore preceded by
   whitespace, with optional trailing whitespace): if yes, this is a
   **continuation** — strip the trailing `\s_\s*`, append the next
   physical line, and keep going. An identifier ending in `_` (no
   preceding space) is NOT a continuation.
3. Record the **start line number** (1-based, from the first physical
   line of the logical line).
4. Also accumulate the raw (pre-strip) text of each physical line into
   a `rawText` field — needed for Description extraction.

Output: array of `{ line, text, rawText }` where `line` is the starting
physical line number, `text` is the fully joined stripped logical line,
and `rawText` is the fully joined raw line (with original
strings/comments intact).

Read files with `await fs.readFile(path, 'utf-8')`. If a BOM is
present, strip it (`text.replace(/^﻿/, '')`).

**Edge cases:**

- `_` inside a string literal: already handled — string content is
  stripped before checking for continuation.
- `_` inside a comment (`' note: see foo_`): already handled — comment
  portion is stripped first.
- Attribute blocks `[Attr1] [Attr2]` on separate lines joined by `_`:
  works — the joined logical line will be
  `[Attr1] [Attr2] Public Sub Foo(...)`.
- Multi-line `[Description("long text" & vbCrLf & _` : the string
  content is stripped, `_` continuation is honored, and the joined line
  has `[Description("" & vbCrLf &` which won't falsely match any
  declaration keyword.
- Identifiers ending in `_` (e.g. `Dim foo_`): NOT treated as
  continuations because the `_` is not preceded by whitespace.
- Attribute lines WITHOUT continuation (the common case):
  `[ClassId("...")]` / `[COMCreatable(False)]` / `Class Foo` are three
  separate logical lines. The extractor (not the lexer) handles
  associating attributes with declarations — see "Attribute extraction"
  in extractor below.
- `#If` / `#End If` / `#Region` / `#End Region` conditional-compilation
  directives: ignored. They don't match any declaration pattern and pass
  through harmlessly.

**Attribute scanning** (`scanAttributes`). For each logical line, scan
`rawText` for all `\[(\w+)(?:\(([^)]*)\))?\]` matches. For each match:

- If the attribute name is `Description`: extract the description text
  from the raw first argument. Multi-line descriptions using
  `& vbCrLf &` won't fully capture — accept the first segment. Store
  in `pendingDescription`.
- If the attribute value is a GUID string (matches
  `"[0-9A-Fa-f-]{36}"`): emit just the name (e.g., `ClassId`). The
  GUID itself isn't useful in the index.
- Otherwise: emit `Name(value)` for short values (e.g.,
  `COMCreatable(False)`, `DispId(0)`) or just `Name` for no-arg
  attributes (e.g., `EventsUseDispInterface`, `Hidden`,
  `ConstantFoldable`).

`isAttributeOnlyLine` returns true when a logical line contains only
attribute brackets (no declaration keyword).

### lib/extractor.mjs

```js
import { scanAttributes, isAttributeOnlyLine } from './lexer.mjs';

export function extract(logicalLines)
// Returns: { declarations: DeclNode[], collectEnums: Function, allEnums: [] }
```

Walks the logical lines and matches declaration patterns using regex.
Maintains a **container stack** to track nesting.

**Containers** (push onto stack):

| Pattern (on stripped logical line) | Kind | Captured |
|---|---|---|
| `(Public\|Private\|Protected)?\s*(Module)\s+(\w+)` | Module | access, name |
| `(Public\|Private\|Protected)?\s*(Class)\s+(\w+)` | Class | access, name |
| `(Public\|Private)?\s*(Interface)\s+(\w+)(\s+Extends\s+(\S+))?` (**suppress when inside CoClass** — see below) | Interface | access, name, base |
| `(Public\|Private)?\s*(Enum)\s+(\w+)` | Enum | access, name |
| `(Public\|Private)?\s*(Type)\s+(\w+)` | Type | access, name |
| `CoClass\s+(\w+)` | CoClass | name |

Each pushed container gets a `children: []` array.

**Container ends** (pop from stack):

| Pattern | Pops |
|---|---|
| `End\s+(Module\|Class\|Interface\|Enum\|Type\|CoClass)` | matching container kind |

**Members** (append to current container's children):

| Pattern | Kind | Captured |
|---|---|---|
| `(Public\|Private\|Protected\|Friend)?\s*(Static\s+)?(Sub\|Function)\s+(\w+)` | Sub/Function | access, name |
| `(Public\|Private\|Protected\|Friend)?\s*Property\s+(Get\|Let\|Set)\s+(\w+)` | Property | access, get/let/set, name |
| `Declare(Wide)?\s+(PtrSafe\s+)?(Sub\|Function)\s+(\w+)\s+Lib\s+"([^"]*)"` | Declare | sub/func, name, lib |
| `(Public\|Private)?\s*Const\s+(\w+)` | Const | access, name |
| `(Public\|Private\|Protected)?\s*Event\s+(\w+)` | Event | access, name |
| `Implements\s+(\S+)` | Implements | interface name |
| `Inherits\s+(\S+)` | Inherits | base class |
| `(Public\|Protected)\s+(WithEvents\s+)?(\w+)\s+As\s+` (only inside Class/Type, not inside Sub/Function/Property) | Field | access, name (flag WithEvents if present) |

Private fields are **skipped** — they're implementation details. Only
Public and Protected fields are indexed.

**Enum members.** Inside an `Enum` container, lines like
`MemberName = value` or just `MemberName` are enum members. Match:
`(\w+)\s*(=\s*(.+))?` when the current container is Enum.

Enum members are **collected but not shown inline** in the main listing.
Instead:

- The main listing shows a collapsed count with a cross-reference
  anchor:
  ```
  - L200: `Enum wv2PermissionKind` (15 members) — [full listing](#wv2permissionkind)
  ```
- A **supplementary chapter** at the end of the file
  (`## Enum Details`) gives the full member listings, one H3 per enum:
  ```
  ## Enum Details

  ### wv2PermissionKind
  _Classes/WebView2.twin, L200_

  | Value | Name |
  |-------|------|
  | 0 | wv2PermissionKindUnknownPermission |
  | 1 | wv2PermissionKindMicrophone |
  ...
  ```

**CoClass body handling.** CoClass blocks contain interface *references*,
not interface declarations:

```
[CoClassId("E7F3D923-...")] CoClass CustomControlTimer
    [Default] Interface _CustomControlTimer
    [Default, Source] Interface _CustomControlTimerEvents
End CoClass
```

These `[Default] Interface X` / `[Default, Source] Interface Y` lines
must NOT be matched as Interface container starts — doing so would push
a phantom container that never gets popped, corrupting the stack for the
rest of the file.

**Rule:** When the current container is a CoClass, suppress the
Interface container-start pattern. Instead, match
`(Default|Source).*Interface\s+(\w+)` as a CoClass member annotation
(kind: `CoClassInterface`, capturing the interface name and the
Default/Source role). These appear as children of the CoClass in the
index:

```
- L162: `CoClass CustomControlTimer`
  - L163: `[Default] Interface _CustomControlTimer`
  - L164: `[Default, Source] Interface _CustomControlTimerEvents`
```

**What NOT to extract:**

- Local variables inside Sub/Function/Property bodies — the extractor
  skips member-pattern matching when inside a procedure body (track
  procedure depth separately from container depth).
- `Dim` / `ReDim` statements (local variables).
- Assignment statements, control flow, etc.

**Procedure body tracking.** When we enter a Sub/Function/Property
Get/Let/Set, set a "in procedure" flag. While this flag is set, skip
member extraction (only look for `End Sub` / `End Function` /
`End Property` to clear the flag). This prevents local `Const` or `Dim`
from being indexed.

Exception: nested Type/Enum declarations inside a procedure (rare but
legal) should still be extracted — if we see a container-start pattern
while in a procedure, push it and handle normally.

**Pattern matching priority.** The extractor checks patterns in this
order (first match wins), to prevent the field catch-all from stealing
keyword declarations:

1. Container ends (`End Module`, `End Class`, ...)
2. CoClass interface references (`[Default] Interface X` — only when
   inside a CoClass)
3. Container starts (Module, Class, Interface — **suppressed inside
   CoClass**, Enum, Type, CoClass)
4. Procedure ends (`End Sub`, `End Function`, `End Property`)
5. Declare statements (`Declare` or `DeclareWide`, with optional
   `PtrSafe`)
6. Const declarations
7. Event declarations
8. Sub / Function declarations
9. Property declarations
10. Implements / Inherits
11. Enum members (only when inside an Enum container)
12. Fields — with optional `WithEvents` (only when inside a Class/Type
    and NOT inside a procedure) — **last**, as catch-all

**Attribute extraction.** Attribute lines like `[COMCreatable(False)]`
or `[Description("...")]` typically appear as **separate logical lines**
before the declaration (no `_` continuation joining them):

```
[ClassId("66CF1252-...")]
[InterfaceId("A7CDEA84-...")]
[COMCreatable(False)]
[EventsUseDispInterface]
[ComImport(True)]
Class ListViewBaseCtl
```

The extractor maintains two pending accumulators:

- `pendingAttrs: string[]` — attribute names (with short values where
  meaningful)
- `pendingDescription: string | null` — extracted Description text

Attachment rules:

1. If a logical line contains only attribute brackets (no declaration
   keyword), append to `pendingAttrs` / `pendingDescription` and
   continue.
2. If a logical line contains both attributes AND a declaration (joined
   by `_`), extract attributes from that line too, then attach all
   pending + inline attributes to the declaration.
3. When a declaration is matched, consume and clear both `pendingAttrs`
   and `pendingDescription`.
4. If a non-attribute, non-blank, non-declaration line appears, clear
   both accumulators.

Output in the index:

```
- L44: `Class ListViewBaseCtl` `[COMCreatable(False), ComImport, EventsUseDispInterface]` — optional description
- L16: `Declare Sub Succeed` `[DebugOnly, PreserveSig(False)]`
- L102: `Property Get Source() As String` — Returns the current URL
```

Attribute names are shown in a backtick-wrapped `[...]` block after the
signature. Omit the block when there are no notable attributes. Skip
these noise attributes that appear on nearly every Declare:
`UseGetLastError(False)`, `MustBeQualified(True)` — configure a
skip-list in the emitter.

**Return type extraction.** For Function and Property Get declarations,
extract the return type from the stripped logical line using a post-match
scan for `\)\s+As\s+(\w[\w.]*(?:\(Of\s+[^)]+\))?)` after the parameter
list. Include it in the signature:

```
- L102: `Property Get Source() As String`
- L55: `Function Item(Index) As Variant`
```

### lib/emitter.mjs

```js
export function emitMarkdown(packageName, fileResults)
// fileResults = [{ relativePath, declarations, enums }]
// Returns: string (markdown)

export function formatSignature(node)
export function emitNode(node, depth, lines)
```

For each package:

1. Source files sorted by subdirectory path (alphabetical), then
   filename.
2. Emit `# <PackageName>` as H1.
3. For each source file, emit `## <relative-path>` as H2 (e.g.,
   `## Classes/WebView2.twin`, `## Exact.twin`).
4. Walk the declaration tree depth-first, emitting nested markdown
   bullets:
   - Indent level = container nesting depth.
   - Format:
     `- L<line>: \`<kind> <name>[<qualifiers>]\`` with optional
     ` — <description>`.
   - For Enum containers: append ` (<N> members)` count and a markdown
     link `[full listing](#<anchor>)` pointing to the supplementary
     chapter.
5. After all source files, emit `## Enum Details` supplementary chapter:
   - One H3 per enum (across all source files in the package), anchored
     by enum name.
   - Under each H3: source file + line reference, then a table of
     `| Value | Name |` rows.

**Output format example** (small package):

```markdown
# Assert

## Exact.twin

- L12: `Module Exact`
  - L16: `Declare Sub Succeed` `[DebugOnly]`
  - L20: `Declare Sub Fail` `[DebugOnly]`
  - L28: `Declare Sub AreEqual` `[DebugOnly]`
  - L32: `Declare Sub AreNotEqual` `[DebugOnly]`
```

**Output format example** (package with enums):

```markdown
# WinServicesLib

## Constants.twin

- L1: `Module Constants`
  - L6: `Const SC_MANAGER_CONNECT`
  - L92: `Enum SC_STATUS_TYPE` (2 members) — [full listing](#sc_status_type)

## Interfaces.twin

- L1: `Interface ITbService` `[InterfaceId]` — Implement this interface to create a Windows service
  - L5: `Sub ServiceMain`
  - L6: `Sub ChangeState`

...

## Enum Details

### SC_STATUS_TYPE
_Constants.twin, L92_

| Value | Name |
|-------|------|
| 0 | SC_STATUS_PROCESS_INFO |
```

Nested bullets show containment (members inside their
Module/Class/Interface/Type/Enum/CoClass). Each line shows the
**physical line number** in the original file (the line where the
declaration keyword appears, even if the declaration spans continuation
lines) and a short signature: kind + name + key qualifiers (return type
for functions, `Extends` for interfaces).

### twin-index.mjs (refactored CLI)

```
node indexer/twin-index.mjs                           # sync + index (default)
node indexer/twin-index.mjs --out <dir>                # TWINSERV output directory
node indexer/twin-index.mjs --builtin-out <dir>        # built-in package output directory
node indexer/twin-index.mjs --dont-save-packages       # skip writing source files
```

Defaults:
- TWINSERV output: `./package-indexes/`
- Built-in output: `./builtin-indexes/`
- Source files saved by default to `<out>/packages/<symbol>/`; `--dont-save-packages` disables for both TWINSERV and built-in outputs

**Indexing loop:**

1. Source files are filtered by extension (`.twin`, `.bas`, `.cls`, `.frm`,
   `.dsr`, `.ctl`). Files under `Packages/` subtrees are excluded by the
   twinpack parser (`collectFiles` skips category=0x07 (Packages)).
2. Non-`.twin` files go through `preprocessVB6()` before `lex()`.
3. Line numbers adjusted by `lineOffset` from the preprocessor.

## Implementation Phases

### Phase 1: Extract existing code into lib/ modules

Move `lex`, `scanAttributes`, `isAttributeOnlyLine` → `lib/lexer.mjs`.
Move `extract` → `lib/extractor.mjs` (imports from lexer).
Move `emitMarkdown`, `formatSignature`, `emitNode` → `lib/emitter.mjs`.
Refactor `twin-index.mjs` to import from lib/.

**Verification:** Run against existing `../tb-export/AllPackages/Packages`.
Diff output against current `package-indexes/*.md` — must be byte-identical.

### Phase 2: Twinpack binary parser

Create `lib/twinpack-parser.mjs`. Port logic from `parse_tree.ps1` (34 lines of
PowerShell → similar-sized JS with DataView helpers). Binary format is
documented in
[`docs/Features/Packages/TWINPACK file format.md`](../docs/Features/Packages/TWINPACK%20file%20format.md).

**Verification:** Parse `indexer/sample.twinpack`. Verify root name is
`CustomControlsPackage`, Sources/ contains `WaynesGrid.twin`, content is valid
UTF-8 twinBASIC source.

### Phase 3: TWINSERV client

Create `lib/twinserv-client.mjs`. Two functions wrapping `fetch()`.

**Verification:** Call `queryPackages()`, verify response has `public` array
with ~32 entries. Call `downloadPackage()` for CustomControlsPackage, verify
first 4 bytes are the magic number.

### Phase 4: Sync orchestrator

Create `lib/sync.mjs`. Implements manifest-based diffing + extraction.

**Verification:** Run sync with fresh cache dir. All ~32 packages downloaded.
Run again immediately — zero downloads (all cached). Delete one package dir,
run again — only that one re-downloaded.

### Phase 5: VB6 preprocessor

Create `lib/vb6-preprocess.mjs`. Pure string transformation.

**Verification:** Test with hand-crafted `.bas` and `.cls` samples. Verify
output parses correctly through lex → extract and produces the expected
Module/Class container structure.

### Phase 6: Integration

Wire everything into `twin-index.mjs`:
- Add `--sync-only`, `--no-sync` flags
- Replace `globTwin` with `globSources` (multi-extension, excludes Packages/)
- Add VB6 preprocessing branch in the file-processing loop
- Default mode: sync then index

**Verification:** Run `node indexer/twin-index.mjs` end-to-end. Should sync
from TWINSERV, extract all packages, index `.twin` + VB6 files, and produce
markdown in `package-indexes/`. Spot-check a few packages against expected
structure.

### Phase 7: Direct package-to-parser pipeline

Phases 1–6 round-trip through the filesystem: `extractTree` writes parsed
twinpack content to disk, then `globSources` + `readFile` reads it back.
Phase 7 eliminates this — the twinpack parser feeds results directly to the
language parser in memory. The manifest file is retained as the sole record
of which package versions are currently indexed, enabling incremental
updates without scanning `.md` output files.

**Manifest rules:**

- Missing or empty manifest → treat every package as new (download all).
- Manifest entry exists with matching version string → skip (unchanged).
- Manifest entry missing for a remote package, or version mismatch →
  download, parse, and re-index.
- Manifest entry has no corresponding remote package → package was removed
  from TWINSERV; delete its `.md` and drop the entry.
- Failed download/parse → retain old manifest entry (if any) so the next
  run retries.

The manifest moves from `packages/manifest.json` to the output directory
(default `./package-indexes/manifest.json`) since the `packages/` extraction
tree is no longer used in default mode.

**`lib/twinpack-parser.mjs`** — add `collectFiles(rootEntry)`:

```js
collectFiles(rootEntry)
// Walks TwinpackEntry tree. Skips category=0x07 (Packages) subtrees.
// Returns: [{ relativePath: string, content: Buffer }]
// Paths are relative to root (e.g. "Sources/WaynesGrid.twin").
// Sorted by relativePath for deterministic output.
```

Iterates `rootEntry.children` (root name is the package name, not a path
component). Recursive helper accumulates `prefix + name + '/'` for
directories and `prefix + name` for files. Sort the result to match
`globSources` order: group by directory (`path.dirname`), then by filename
(`path.basename`) within each group, both via `localeCompare`.

**`lib/sync.mjs`** — replace `syncPackages` with `fetchUpdatedSources`:

```js
fetchUpdatedSources(manifestPath, { concurrency = 4 })
// 1. Queries TWINSERV for all public packages (latest version of each).
// 2. Loads manifest from manifestPath (missing/empty file → all packages new).
// 3. Compares: manifest entry with matching version → unchanged;
//    missing entry or version mismatch → download + parse in memory.
// 4. For downloads: downloadPackage → parseTwinpack → collectFiles.
// 5. Detects removed: manifest entries whose projectId is not on TWINSERV.
// Returns: {
//   toIndex:    [{ symbol, projectId, reason: 'added'|'updated',
//                  versionInfo, files: [{ relativePath, content }] }],
//   unchanged:  [string],            // symbols skipped (already indexed)
//   removed:    [{ id, symbol }],    // in manifest but gone from TWINSERV
//   failed:     [{ symbol, error }], // download/parse errors
//   manifest:   object               // updated manifest, ready to persist
// }
```

The returned `manifest` carries forward unchanged entries, adds/replaces
entries for successfully fetched packages, omits removed packages, and
preserves old entries for failed packages (so they retry next run). The
caller writes the manifest to disk after indexing succeeds.

Remove `extractTree`, `dirExists`, and `rm`/`mkdir`/`access` imports.
Keep `latestVersion`, `versionString`. Adjust `loadManifest` to take a
file path instead of a directory. Retain `readFile` from `node:fs/promises`
for manifest loading.

**`twin-index.mjs`** — restructure into two code paths:

Default mode (in-memory):
1. Call `fetchUpdatedSources(manifestPath)`.
2. For each package in `toIndex`: filter files by `SOURCE_EXTS`, strip
   `Sources/` prefix, convert `Buffer` → string, run through `indexFiles`
   helper (VB6 preprocess → lex → extract → collectEnums).
3. `emitMarkdown` → write `.md` to output dir.
4. For each entry in `removed`: delete `<symbol>.md` from output dir.
5. Write updated manifest to `manifestPath`.
6. Log summary: added, updated, removed, unchanged, failed counts.

Extract `countDecls` to module level (currently inline at line 126). Add
shared `indexFiles(files)` helper:

```js
indexFiles(files)
// files: [{ relativePath: string, content: string }]
// For each file: check VB6_EXTS on path.extname(relativePath);
//   if VB6, preprocessVB6(content, ext) first.
//   Then lex(content) → extract(logicalLines) → collectEnums(declarations, relativePath).
// Returns: {
//   fileResults: [{ relativePath, declarations, enums: allEnums }],
//   declCount: number   // total across all files (via countDecls)
// }
```

**Verification:** Parse `indexer/sample.twinpack` with `collectFiles`, verify
it returns `Sources/WaynesGrid.twin` and no Packages/ entries. Run the full
pipeline with `node indexer/twin-index.mjs --out ./test-output/` and diff
output against the phase-6 baseline — must be byte-identical. Run a second
time with no TWINSERV changes — zero downloads, unchanged count matches
package count, manifest and `.md` files unmodified.

### Phase 8: Phased progress output, replace legacy mode with --dont-save-packages

Phase 7's `fetchUpdatedSources` did everything in one call — the user saw
nothing until the entire sync + download + parse cycle finished. Phase 8
splits the work into three visually distinct CLI phases so each step logs
as it happens. It also removes the `--no-sync` legacy disk-reading mode.
Packages are saved to `<out>/packages/` by default as a side effect of
the normal in-memory pipeline; `--dont-save-packages` disables this.

**`lib/sync.mjs`** — replace `fetchUpdatedSources` with two functions:

```js
compareWithManifest(manifestPath)
// 1. Loads manifest.
// 2. Queries TWINSERV for all public packages.
// 3. Compares versions; categorises each as added/updated/unchanged/removed.
// Returns: { toDownload, unchanged, removed, manifest }
// toDownload entries carry { id, pkg, version, symbol, reason }.

fetchPackage(projectId, version)
// Downloads a single .twinpack, parses it, returns collectFiles() result.
// Throws on network or parse error (caller handles).
```

Export `versionString` so the CLI can build manifest entries.

**`twin-index.mjs`** — three logged phases:

1. **Fetching package index** — call `compareWithManifest`. Print the
   add/update/remove/unchanged summary. Early-exit with "Up to date." if
   nothing changed.
2. **Fetching packages** — iterate `toDownload` sequentially. Log each
   symbol as it completes. On error, log the failure and continue. Build
   manifest entries for successful fetches.
3. **Indexing packages** — iterate fetched packages, run through
   `indexFiles` → `emitMarkdown` → write `.md`. Log per-package file and
   declaration counts. Unless `--dont-save-packages`, also write each
   package's files to `<out>/packages/<symbol>/`. Handle removals
   (delete `.md` and, unless `--dont-save-packages`, the package
   directory). Write manifest.

Remove `--no-sync`, `legacyDiskMode`, `packagesRoot`, and `globSources`.

**Verification:** Fresh run (no manifest) prints all three phases with
32 packages listed under each. Second run prints only "Fetching package
index..." + "Up to date." with zero downloads. Default mode writes
source trees under `<out>/packages/`.

### Phase 9: Index built-in packages from twinBASIC GitHub releases

twinBASIC ships built-in packages inside every release — VBA, VBRUN,
VB, CustomControls, WebView2, and others. These are `.twinproj` files in
the `packages/` directory of the release zip, using the same binary
format as `.twinpack` files (magic `0xEA0BA51C`, format version 1).
Phase 9 adds a parallel pipeline that checks GitHub for new twinBASIC
releases, downloads the release zip when the version changes, extracts
built-in packages, and indexes them through the same lex → extract →
emit chain as TWINSERV packages.

**Key decisions:**

- Index all built-in packages (16 as of BETA 983), including the
  dot-prefixed core runtime packages (`.{GUID}_VBA`, `.{GUID}_VBRUN`).
- Output to a separate directory (default `./builtin-indexes/`), not
  mixed with TWINSERV package indexes.
- Track the full GitHub release tag (e.g. `beta-x-0983`) in the
  built-in manifest. When the tag changes, re-download and re-index all
  built-in packages.
- Overlapping packages (ones that exist both as built-in and on
  TWINSERV) are indexed independently — both versions get their own
  `.md` files in their respective output directories.

**Release structure** (observed in BETA 983):

```
twinBASIC_IDE_BETA_983.zip
  └─ packages/
       ├─ .{54F90FBF-...}_VBA/package.twinproj
       ├─ .{8BEB50D8-...}_VBRUN/package.twinproj
       ├─ {F50B82D0-...}_VB/package.twinproj
       ├─ {EA18E2B1-...}_CustomControls/package.twinproj
       └─ ... (16 total)
```

Each folder name follows the pattern `[.]{GUID}_SymbolName`. The dot
prefix on VBA and VBRUN indicates core runtime packages but does not
change processing. Each folder contains exactly one `package.twinproj`.

**`lib/zip-reader.mjs`** (new) — Minimal zip central-directory parser,
no npm dependencies (uses `node:zlib` for Deflate):

```js
readZipDirectory(buffer)
// Parses ONLY the zip central directory — file metadata, not contents.
// No file data is read or decompressed at this stage.
// 1. Locate the End of Central Directory record (scan backward for
//    signature 0x06054b50).
// 2. Read the central directory: for each entry, extract the file name,
//    compressed size, uncompressed size, compression method, and the
//    offset to the local file header.
// 3. Return a Map<string, ZipEntry> keyed by file path.
//
// Returns: Map<string, { name, compressedSize, uncompressedSize,
//            compressionMethod, localHeaderOffset }>

extractFile(buffer, entry)
// Extract a single file from the zip buffer given a ZipEntry.
// Called selectively — only for the specific entries the caller needs.
// 1. Seek to localHeaderOffset, read the local file header to get the
//    actual data offset (header is 30 bytes + variable-length fields).
// 2. Read the compressed data.
// 3. If compression method 8 (Deflate), inflate with zlib.inflateRawSync.
//    If method 0 (Stored), return as-is.
// Returns: Buffer
```

Only methods 0 (Stored) and 8 (Deflate) are supported — these cover
all zip files produced by standard tools. The module uses `node:zlib`
for decompression. The two-step design (directory scan, then selective
extract) means we never decompress the IDE binaries, addins, or
anything else in the ~28 MB zip — only the `.twinproj` files we need.

**`lib/github-release.mjs`** (new) — GitHub release fetching:

```js
getLatestRelease()
// GET https://api.github.com/repos/twinbasic/twinbasic/releases
// (all releases are pre-releases, so /releases/latest returns 404).
// Returns the first entry: { tag, assetUrl, publishedAt }.
// Throws on network error or unexpected response shape.
//
// Returns: { tag: 'beta-x-0983',
//            assetUrl: 'https://github.com/.../twinBASIC_IDE_BETA_983.zip',
//            publishedAt: '2026-05-29T...' }

downloadRelease(assetUrl)
// Downloads the release zip. Follows redirects (GitHub assets redirect
// to a CDN). Returns the full zip as a Buffer.
// Throws on network error or non-2xx status.
//
// Returns: Buffer
```

Uses `fetch()` — the GitHub API is public, no auth required for
read-only access to public releases. Unauthenticated requests are
rate-limited to 60/hour, which is fine since we make at most one
request per run.

**`lib/builtin-sync.mjs`** (new) — Built-in package sync logic:

```js
compareBuiltinManifest(manifestPath)
// 1. Load manifest (same shape: { syncedAt, twinbasicTag, packages: {} }).
// 2. Call getLatestRelease() to get the current tag.
// 3. If manifest.twinbasicTag matches the current tag, return early:
//    all packages are unchanged.
// 4. Otherwise, return { tag, assetUrl, publishedAt } so the caller
//    can download.
//
// Returns: { tag, assetUrl, publishedAt, manifest,
//            needsUpdate: boolean }

extractBuiltinPackages(zipBuffer)
// 1. readZipDirectory(zipBuffer) to scan the central directory.
//    This reads only file metadata — no contents are decompressed.
// 2. Filter the directory for entries matching
//    packages/<folder>/package.twinproj. Everything else in the zip
//    (IDE binaries, addins, themes, etc.) is ignored entirely.
// 3. For each matching entry only:
//    a. extractFile() to decompress the .twinproj Buffer.
//    b. parseTwinpack() + collectFiles() (existing pipeline).
//    c. Parse the folder name to extract GUID and symbol.
// 4. Return an array of { guid, symbol, files } — same shape as
//    TWINSERV fetchPackage results, ready for indexFiles().
//
// folder name pattern: /^\.?\{([0-9A-F-]+)\}_(.+)$/i
//
// Returns: [{ guid: '54F90FBF-...', symbol: 'VBA',
//             files: [{ relativePath, content }] }, ...]
```

**`twin-index.mjs`** — Extend with built-in package pipeline:

New CLI option:

```
--builtin-out <dir>   Output directory for built-in packages
                      (default: ./builtin-indexes/)
```

`twin-index.mjs` imports `downloadRelease` directly from
`github-release.mjs` (not through `builtin-sync.mjs`) so the download
step is visible in the CLI's phase logging.

The built-in pipeline lives in an `indexBuiltinPackages()` async
function. It runs after the TWINSERV sync regardless of whether
TWINSERV had changes (both the normal path and the "Up to date."
early-return path call it). Same three-phase structure:

1. **Checking twinBASIC release** — call `compareBuiltinManifest`.
   Print the current release tag. If `needsUpdate` is false, print
   "Built-in packages up to date (beta-x-XXXX)." and skip.

2. **Downloading release** — call `downloadRelease(assetUrl)`, then
   `extractBuiltinPackages(zipBuffer)`. Print the count of extracted
   packages.

3. **Indexing built-in packages** — iterate extracted packages through
   `indexFiles` → `emitMarkdown` → write `.md` to `builtinOutDir`.
   Log per-package file and declaration counts. If `savePackages`,
   write source files to `<builtinOutDir>/packages/<symbol>/`. Write
   the built-in manifest with the new tag:
   ```json
   {
     "syncedAt": "...",
     "twinbasicTag": "beta-x-0983",
     "publishedAt": "2026-05-29T...",
     "packages": {
       "54F90FBF-5CDC-41D6-AEC2-983DEF203B07": { "symbol": "VBA" },
       "F50B82D0-DCAB-43FE-9631-11959D4A4728": { "symbol": "VB" },
       ...
     }
   }
   ```

The `--dont-save-packages` flag applies to both TWINSERV and built-in
packages — a single `savePackages` boolean controls both pipelines.

**Missing-folder check for built-ins:** When `savePackages` is true,
after `compareBuiltinManifest` returns `needsUpdate: false` (tag
matches), scan `<builtinOutDir>/packages/` and check that a folder
exists for every package listed in the manifest. If any folder is
missing, override `needsUpdate` to `true` — this forces a full
re-download of the release zip because all built-in packages come from
a single zip (unlike TWINSERV packages, which can be fetched
individually). This matches the behaviour already implemented for
TWINSERV packages in `twin-index.mjs`, where unchanged packages with
missing source folders are promoted to `toDownload`.

**Verification:**

1. Fresh run (no built-in manifest): prints "Checking twinBASIC
   release..." with tag, downloads the release, extracts and indexes
   all 16 built-in packages, writes `.md` files and manifest to
   `./builtin-indexes/`.
2. Second run (same tag): prints "Built-in packages up to date
   (beta-x-0983)." with no download.
3. Delete one package's folder under `builtin-indexes/packages/`,
   run again with `savePackages` on: the missing-folder check detects
   the gap and forces a full re-download despite the tag being
   unchanged. All built-in packages are re-extracted and re-indexed.
4. Verify `.md` output for a known package (e.g. VBA) contains
   expected declarations.
5. `--dont-save-packages`: no `packages/` subdirectory written under
   `builtin-indexes/`, and the missing-folder check is skipped.
6. `--builtin-out ./my-builtins/`: output lands in the specified
   directory.
