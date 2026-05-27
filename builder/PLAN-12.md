## PLAN-12: Phase 12 — `--serve` watch + serve mode

Adds a long-lived `--serve` mode to tbdocs that does, in one process,
what Jekyll's `bundle exec jekyll serve` did: an HTTP server bound to
`_site/`, a recursive watcher on the source tree, a debounced rebuild
on changes, and a browser auto-reload via SSE. Closes the
[PLAN-10 §7.D4 / §7.D11](PLAN-10.md) deferrals that explicitly routed
watch-mode out of the cutover.

Phase 12 has one job: **collapse the current two-step `build.bat` →
external static server pattern into a single `tbdocs --serve`
invocation that watches, rebuilds, and live-reloads**. Once landed,
[docs/serve.bat](../docs/serve.bat) becomes a one-line shim over
`node ..\builder\tbdocs.mjs --src . --serve` and the standalone
[docs/serve.mjs](../docs/serve.mjs) static server retires.

What Phase 12 does NOT do:

- Change the default build output. `node builder/tbdocs.mjs` with no
  `--serve` flag produces byte-identical `_site/` / `_site-offline/`
  / `_site-pdf/` to the pre-Phase-12 state.
- Add an incremental rebuild path. Every change triggers a full
  rebuild (online tree only -- offline + PDF skip; see [§7.D2](#71-decision-record)).
  Incremental Phase 3 / Phase 4 is out of scope; the current ~2 s
  online build is fast enough that incremental adds complexity
  without changing the developer's perception.
- Touch the GitHub Pages deploy workflow. Serve mode is dev-local
  only; CI continues to invoke `node builder/tbdocs.mjs` once.
- Introduce a new dependency. The watcher uses `node:fs/promises`
  `watch(..., { recursive: true })`, supported on all three
  platforms in Node 22+ (the version floor declared in
  [builder/README.md](README.md)). See [§7.D6](#71-decision-record)
  for the chokidar-vs-`fs.watch` decision.
- Inject SSE into the offline or PDF trees. The reload script is
  injected at serve time by [builder/serve.mjs](serve.mjs), never
  written to disk. `_site/` on the filesystem stays byte-identical
  to a non-serve build.

Target wall-clock impact: irrelevant for one-shot builds (the
serve path is gated behind `--serve`). For the serve loop: ~2 s
rebuild on full save, ~50 ms SSE round-trip from rebuild
completion to browser reload.

## Status: shipped

---

## 1. Inputs

The Phase 11 end-state at HEAD: tbdocs is the canonical build path,
`check.bat` is the regression gate, the seven-module orchestrator
is stable, and [docs/serve.bat](../docs/serve.bat) does a one-shot
build then hands off to the standalone [docs/serve.mjs](../docs/serve.mjs)
static server.

Specifically required:

- `cd docs && build.bat && check.bat` clean on the production tree.
- Node 22+ available locally (the `fs.watch` recursive guarantee).
  Already the documented floor in [builder/README.md](README.md).
- Port 4000 free on the dev machine. If not, the user passes
  `--port <N>`; see [§5.3](#53-serving-the-built-tree) for the
  EADDRINUSE handling.

Not required:

- No source-tree changes. Phase 12 operates inside `builder/` plus
  a one-line change to [docs/serve.bat](../docs/serve.bat) and a
  small set of doc updates.
- No `accepted-divergences.mjs` (deleted in Phase 10), no per-phase
  verify harness (the integrity checker covers regression).

---

## 2. Outputs

Phase 12's primary output is a new module and a CLI flag:

- **New module** `builder/serve.mjs` (~220 lines). Owns the HTTP
  server, the watcher, the debounce + single-flight rebuild queue,
  the SSE endpoint, and the HTML inject middleware.
- **Refactor** in `builder/tbdocs.mjs`: extract the body of `main()`
  into `export async function runBuild(opts)` so `serve.mjs` can
  invoke it on each change.
- **New CLI flags**: `--serve` (start the serve loop), `--port <N>`
  (HTTP port, default 4000).
- **Rename** `--serving` → `--tolerate-missing-images`. The old name
  was misleading (it does NOT mean "run in serve mode"; it means
  "tolerate missing images in the PDF pass"). The new name is what
  the flag actually does. See [§5.5](#55-rename---serving-----tolerate-missing-images)
  and [§7.D5](#71-decision-record).

Retired:

- [docs/serve.mjs](../docs/serve.mjs) -- folded into
  [builder/serve.mjs](serve.mjs).
- The two-line shape of [docs/serve.bat](../docs/serve.bat)
  collapses to a one-line `--serve` invocation.

Build output (`_site/`, `_site-offline/`, `_site-pdf/`) on a
non-`--serve` invocation is byte-identical to the pre-Phase-12 state.

---

## 3. Module split

```
builder/
  serve.mjs                 ~220 lines. NEW. HTTP server + watcher +
                             rebuild queue + SSE endpoint + HTML
                             reload-script injection middleware.
                             Exports runServe(opts).
  tbdocs.mjs                +25 / -15 net. Extract main()'s body into
                             runBuild(opts); parseArgs gains --serve
                             and --port; --serving renamed to
                             --tolerate-missing-images. main() becomes
                             a dispatcher: if opts.serve, runServe;
                             else runBuild + exit.
  pdf.mjs                   -2 / +2. Rename the destructured option
                             from { serving } to { tolerateMissingImages }
                             and the local variable in
                             reportMissingImages.
  README.md                 +20. New "Serve mode" subsection in the
                             flags table; rename note.
  PLAN.md                   +25. Phase 12 row in the Build Phases
                             table; updated architecture diagram
                             (serve.mjs added).
  FUTURE-WORK.md            +5 / -10. Close §D4 and §D11 from PLAN-10's
                             decision record (no-watch-mode); cite
                             this plan as the resolution.
  PLAN-12.md                NEW. This file.

docs/
  serve.bat                 Rewrite to one line: `node ..\builder\
                             tbdocs.mjs --src . --serve`.
  serve.mjs                 DELETE. Logic lifted into builder/serve.mjs.

  Documentation/Builder.md  +15. New paragraph documenting the
                             --serve mode behaviour (one-paragraph
                             tour for the end-user audience).

WIP.md                      ~3 lines changed. The "serve.bat" line
                             in the Build / preview section updates
                             to reflect the new single-process flow.
```

Estimated total churn: ~290 lines added across all files (most of it
in `serve.mjs` itself), ~30 removed (deletion of `docs/serve.mjs`),
plus the doc batch.

---

## 4. Implementation order

Four batches; each one a single git commit, each independently
revertable. Batches 1 and 2 can land in either order; batch 3
depends on both; batch 4 depends on batch 3.

| Batch | Substeps | Suggested model | Verifies by |
|---|---|---|---|
| 1 | [§5.5](#55-rename---serving-----tolerate-missing-images) -- rename `--serving` → `--tolerate-missing-images` across `tbdocs.mjs`, `pdf.mjs`, `README.md`, `PLAN.md`, `WIP.md` (the "Build pipeline" section), and `FUTURE-WORK.md` (the §D notes that mention the old name) | **Haiku 4.5** | `check.bat` clean; `node tbdocs.mjs --tolerate-missing-images` accepted; `--serving` errors with the parseArgs "Unknown argument" message |
| 2 | [§5.1](#51-extract-runbuildopts) -- factor `main()` body into `export async function runBuild(opts)`; keep `main()` as the CLI dispatcher; verify the top-level `main().catch(...)` does not fire on import | **Sonnet 4.6** | Default `node tbdocs.mjs` byte-identical to pre-batch output; one `import { runBuild } from "./tbdocs.mjs"` smoke test in a scratch script confirms `runBuild` is importable without firing `main()` |
| 3 | [§5.2](#52-write-buildersservemjs) + [§5.3](#53-serving-the-built-tree) + [§5.4](#54-watcher--debounce--rebuild-queue) + [§5.6](#56-sse-live-reload) -- write `builder/serve.mjs` end-to-end (HTTP server, watcher, rebuild queue, SSE endpoint, inject middleware); add `--serve` + `--port` to `parseArgs`; wire `runServe` into `main()` | **Opus 4.7** | Manual: `node tbdocs.mjs --src docs --serve`; edit a `.md` file; confirm rebuild fires within 1 s of save, browser reloads automatically; Ctrl+C cleanly exits |
| 4 | [§5.7](#57-retire-docsservemjs--rewrite-servebat) + [§5.8](#58-documentation) -- one-line `docs/serve.bat`; delete `docs/serve.mjs`; update `README.md` (flags table + Serve-mode subsection), `PLAN.md` (architecture diagram + Phase 12 row), `FUTURE-WORK.md` (close D4 / D11 routing), `WIP.md` (Build / preview section), `docs/Documentation/Builder.md` (end-user paragraph on serve mode) | **Sonnet 4.6** | `check.bat` clean; `docs/serve.bat` invocation reproduces the batch-3 manual smoke |

### 4.1. Model-selection rationale

The four batches sit at different complexity tiers; matching the
model to the tier keeps cost and turn-around proportional to the
work:

- **Haiku 4.5 (batch 1)**: pure mechanical sweep across known files.
  No design judgement, no novel code. The candidate strings are
  greppable; the replacement is symmetric (`--serving` → `--tolerate-missing-images`
  in CLI position, `serving` → `tolerateMissingImages` in destructure
  position).
- **Sonnet 4.6 (batches 2, 4)**: well-scoped refactor (batch 2) and
  prose / doc-table work (batch 4). Both have one or two subtleties
  -- the import-time-side-effect risk in batch 2 ([§7.D1](#71-decision-record))
  and the WIP.md plain-English conventions in batch 4 -- but neither
  needs the cross-file architectural judgement Opus brings. The
  prose batch in particular should follow the [WIP.md "Plain-English
  prose" section](../WIP.md) verbatim (Sonnet handles this house
  style cleanly).
- **Opus 4.7 (batch 3)**: novel concurrency design. Has to get
  right: the single-flight rebuild queue ([§5.4](#54-watcher--debounce--rebuild-queue)),
  the SSE keepalive + reload semantics ([§5.6](#56-sse-live-reload)),
  the HTML-inject middleware boundary ([§5.6.2](#562-html-inject-middleware)),
  and the Ctrl-C lifecycle that has to close the HTTP server,
  abort the watcher, and drain the SSE clients. This is the one
  batch where a subtle bug (e.g. a debounce that doesn't collapse
  bursty saves, an SSE client that hangs the shutdown) is hard to
  spot in review without running the code.

The mapping is intentionally conservative: any batch can move up a
tier (Sonnet → Opus, Haiku → Sonnet) at the executor's discretion
without re-planning. Moving DOWN a tier on batch 3 risks the
concurrency bugs above; the executor should not skip Opus for the
serve module.

### 4.2. Commit policy

One git commit per batch. Each commit must:

- Build clean (`build.bat`).
- Pass the integrity check (`check.bat`).
- Reproduce the listed manual smoke (where applicable).

The pre-commit hooks and ESLint config already in place stay
enforced. **No `--no-verify` allowed**, including on the doc batch
(batch 4) -- the WIP.md edits go through the same kramdown / link
checks as every other doc commit.

---

## 5. Per-substep specifications

### 5.1. Extract `runBuild(opts)`

**Source**: this plan, batch 2.

**Current shape** ([tbdocs.mjs:98-241](tbdocs.mjs:98)):

```js
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { src, dest, dryRun, serving, profileOffline } = opts;
  // ... ~140 lines of build orchestration ...
  return { pages, staticFiles, site, destRoot };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Target shape**:

```js
export async function runBuild(opts) {
  const { src, dest, dryRun, tolerateMissingImages, profileOffline } = opts;
  // ... ~140 lines of build orchestration (unchanged body) ...
  return { pages, staticFiles, site, destRoot };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.serve) {
    const { runServe } = await import("./serve.mjs");
    await runServe(opts);
    return;
  }
  await runBuild(opts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Subtlety** (the reason this batch gets Sonnet, not Haiku): the
top-level `main().catch(...)` fires unconditionally when the module
is imported. After Phase 12, `serve.mjs` imports `runBuild` from
`tbdocs.mjs`. If the import order ever puts `serve.mjs`'s import
of `runBuild` BEFORE `tbdocs.mjs`'s own top-level invocation
resolves, the build kicks off twice -- once from the user's CLI
entry, once from the import.

Two safe paths:

1. **Conditional top-level** (preferred): wrap the top-level
   `main().catch(...)` in a check that confirms `tbdocs.mjs` is
   the entry module:

   ```js
   import { fileURLToPath } from "node:url";
   const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
   if (isEntry) {
     main().catch((err) => {
       console.error(err);
       process.exit(1);
     });
   }
   ```

   This is the Node-22 idiom for "fire on direct invocation, no-op
   on import". Standard, no new dep.

2. **Lazy import** (fallback): the `await import("./serve.mjs")`
   above already lazy-loads `serve.mjs`. But the inverse direction
   -- `serve.mjs` calling `runBuild` -- is the actual risk. Use
   the entry-check from path 1; don't rely on lazy import.

**Verification**: write a one-line scratch script `node -e 'import("./builder/tbdocs.mjs").then(m => console.log(typeof m.runBuild))'`. Expected output: `function`, and **no build runs**. If a build kicks off (you see `Phase 1+2+...` log lines), the entry check is broken.

### 5.2. Write `builder/serve.mjs`

**Source**: this plan, batch 3.

**Module shape**:

```js
// Phase 12 SERVE: long-lived dev server with watcher + rebuild queue +
// SSE live-reload. See builder/PLAN-12.md for the full spec.
//
// One entry point: runServe(opts). Composes:
//   §A  HTTP server (lifted from docs/serve.mjs)
//   §B  HTML inject middleware (SSE client script)
//   §C  SSE endpoint (/_tbdocs/reload)
//   §D  Watcher loop (node:fs/promises watch, recursive)
//   §E  Rebuild queue (single-flight + one-pending-slot, debounced)
//   §F  Lifecycle (SIGINT → close server + abort watcher + drain SSE)

import { createServer } from "node:http";
import { readFile, stat, watch } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runBuild } from "./tbdocs.mjs";

export async function runServe(opts) {
  // ... see §5.3 - §5.6 below for the implementation
}
```

Total length budget: ~220 lines. Sections A and B lift verbatim
from [docs/serve.mjs](../docs/serve.mjs) (the MIME map, the
`resolveFile` candidates, the 404 / 500 paths). Sections C-F are
new.

### 5.3. Serving the built tree

**§A**: lift the entire body of [docs/serve.mjs](../docs/serve.mjs)
into a `function createStaticHandler(destRoot)` factory. The
factory captures `ROOT` (= `destRoot`) and `MIME` and returns a
`(req, res) => Promise<void>` handler. **The only changes from
the current `docs/serve.mjs`**:

1. `ROOT` is no longer the hardcoded `path.resolve(__dirname, "_site")`;
   it's the `destRoot` argument the factory was called with. Caller
   (`runServe`) passes `path.resolve(opts.src ?? "docs", opts.dest ?? "_site")`.
2. The `log` function moves to module scope (shared with the SSE
   endpoint's connection / disconnection logs).
3. The handler returns the response data buffer **before sending**,
   so the inject middleware (§B) can splice into it.

**Initial-build path**: `runServe(opts)` calls `await runBuild(opts)`
first. If `runBuild` throws, log the error and `process.exit(1)`.
Don't start the server; the user has no `_site/` to serve.

**`--port` handling**: read `opts.port ?? 4000`. On `server.listen`
EADDRINUSE error, print:

```
serve: port <N> already in use. Pass --port <other> to choose another, or stop the process bound to <N>.
```

and `process.exit(1)`. Don't try to fall back to a random port --
that would silently move the server somewhere the user wasn't
expecting.

### 5.4. Watcher + debounce + rebuild queue

**§D-E**: the watcher loop and the rebuild queue are the load-
bearing pieces of the serve module. Both ship in `serve.mjs`; both
need to compose cleanly.

**Watcher**:

```js
const ac = new AbortController();
const watcher = watch(srcRoot, { recursive: true, signal: ac.signal });

(async () => {
  try {
    for await (const event of watcher) {
      if (!shouldRebuild(event.filename)) continue;
      schedule();
    }
  } catch (err) {
    if (err.name !== "AbortError") throw err;
  }
})();
```

The `for await` loop drives the rebuild scheduler. On `AbortError`
(Ctrl+C path) the loop exits cleanly.

**Filter** (`shouldRebuild`):

```js
const IGNORED_PREFIXES = ["_site", "_site-offline", "_site-pdf", "_pdf", "node_modules", ".git"];
const IGNORED_BASENAME_RE = /^\.|~$|\.tmp$|\.swp$|^4913$/;   // dotfiles, vim swap, vim/editor 4913 probe

function shouldRebuild(filename) {
  if (!filename) return false;
  const segs = filename.split(/[/\\]/);
  if (IGNORED_PREFIXES.includes(segs[0])) return false;
  if (IGNORED_BASENAME_RE.test(segs.at(-1) ?? "")) return false;
  return true;
}
```

The filter is intentionally permissive on file extensions -- any
file that gets through the prefix / basename rules triggers a
rebuild. The expensive bit is the rebuild itself (~2 s); the
discovery walk that picks up the change costs ~100 ms whether the
file was `.md` or `.png`.

**Debounce + single-flight queue**:

```js
let running = false;
let pending = false;
let debounceTimer = null;

function schedule() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fire, 300);
}

async function fire() {
  if (running) { pending = true; return; }
  running = true;
  try {
    await runBuild({ ...opts, skipOffline: true, skipPdf: true });
    notifyReload();
  } catch (err) {
    console.error("rebuild failed:", err.message);
    // Don't notifyReload on failure; the prior good _site/ keeps serving.
  } finally {
    running = false;
    if (pending) { pending = false; schedule(); }
  }
}
```

**Why single-flight + one-pending-slot, not a queue**: if 50 events
fire during a 2-second rebuild (bursty editor save, `git checkout`,
build artefact churn), we want exactly one follow-up rebuild after
the current one finishes, not 50. The single boolean `pending` flag
collapses the burst correctly.

**Why 300 ms debounce**: editors fire 2-5 events per save (write,
rename, attrib). A 300 ms quiet window captures the whole burst
without making the user feel the rebuild lag. Tested ranges in
similar tools (Vite, esbuild's serve mode) hover at 100-500 ms;
300 ms is the middle.

### 5.5. Rename `--serving` → `--tolerate-missing-images`

**Source**: this plan, batch 1.

**Files touched** (grep for `serving` in builder/ + docs/ + WIP.md):

- `builder/tbdocs.mjs`: `args.serving` → `args.tolerateMissingImages`;
  the `case "--serving"` parseArgs branch becomes `case "--tolerate-missing-images"`;
  the destructure in `main()` (now `runBuild`) updates correspondingly.
- `builder/pdf.mjs`: the `{ serving = false }` destructure on
  `writePdf` becomes `{ tolerateMissingImages = false }`; the local
  variable in `reportMissingImages` renames; the comment at
  [pdf.mjs:200-204](pdf.mjs:200) updates.
- `builder/README.md`: the flags table entry for `--serving` updates.
- `builder/PLAN.md`: the §Phase-9 paragraph mentioning `--serving`
  updates.
- `builder/FUTURE-WORK.md`: the §B14 entry (PLAN-9 cross-reference)
  updates to the new name; keep the entry's historical reference
  to the original `--serving` flag intact (it's a historical note,
  not a current API claim).
- `WIP.md`: the "Build / preview" section's per-flag table
  (currently mentions `--no-pdf`, etc.) gets the rename if the
  flag's listed -- check line 438 area for the full inventory.

**Watch-out**: the rename touches some PLAN-N.md files that are
historical record. PLAN-8 §6 and §D6 reference `serving` as the
internal parameter name to `writePdf`; the rename of the **CLI flag**
does not change the **function parameter name** unless we also
rename the parameter, which the batch should do (the parameter
name `serving` is misleading for the same reason the CLI flag was).

[PLAN-9.md](PLAN-9.md) §5.6 ("B14 -- `--serving` flag") is historical
record of the original PR; do not edit. Phase 12 is the supersedence
record.

### 5.6. SSE live reload

**§B-C**: the SSE endpoint and the HTML inject middleware compose
to give the browser an auto-reload signal after every successful
rebuild.

#### 5.6.1. SSE endpoint

```js
const sseClients = new Set();

function sseHandler(req, res) {
  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-store");
  res.setHeader("connection", "keep-alive");
  res.write(": connected\n\n");
  sseClients.add(res);

  const keepalive = setInterval(() => {
    try { res.write(": keepalive\n\n"); } catch {}
  }, 30000);

  req.on("close", () => {
    clearInterval(keepalive);
    sseClients.delete(res);
  });
}

function notifyReload() {
  for (const res of sseClients) {
    try { res.write("event: reload\ndata: 1\n\n"); } catch {}
  }
}
```

The keepalive (30 s `: ` SSE comment line) prevents intermediaries
from closing the connection on idle. Not strictly needed for
localhost, but it's three lines of insurance and matches what
every SSE library does by default.

Route: `/_tbdocs/reload`. The `_tbdocs` prefix puts the endpoint
in a namespace that can't collide with a content path (no doc
page has a permalink starting with `/_`; the discover module
excludes `_*` directories from the source tree).

#### 5.6.2. HTML inject middleware

The static handler reads the file with `readFile()` and returns
the bytes. For HTML responses (extension `.html`), splice a
reload script before `</body>`:

```js
const RELOAD_SCRIPT = `<script>(()=>{const es=new EventSource('/_tbdocs/reload');es.addEventListener('reload',()=>location.reload());})();</script>`;

function injectReloadScript(html) {
  const idx = html.lastIndexOf("</body>");
  if (idx === -1) return html;
  return html.slice(0, idx) + RELOAD_SCRIPT + html.slice(idx);
}
```

The inject happens at serve time, in the request handler -- the
file on disk stays byte-identical to a non-serve build (see
[§7.D4](#71-decision-record)).

**Skip the inject** for two cases:

1. **`book.html`** -- the PDF source. SSE has no value here and the
   inject would change the byte stream pagedjs-cli consumes (the
   browser SSE script is inert under pagedjs but the inject's
   `</body>` rewrite is one extra opportunity for a render
   surprise).
2. **Any HTML that doesn't have `</body>`** -- the function above
   no-ops by returning `html` unchanged. This protects against
   weird HTML (e.g. fragment snippets, the SSE endpoint's own
   response which isn't HTML anyway).

#### 5.6.3. Lifecycle

The rebuild → notify sequence:

```
[file change]
    ↓ (debounce 300 ms)
schedule() → fire()
    ↓
runBuild(opts) with skipOffline + skipPdf
    ↓ (~2 s)
notifyReload() iterates sseClients → res.write("event: reload\n...")
    ↓
[browser receives reload event → location.reload()]
    ↓
[browser re-requests page → inject middleware adds the script back]
```

The "inject middleware adds the script back" step is the load-
bearing piece: the SSE EventSource the browser opens IS the
EventSource that the inject middleware writes into the new
response. Every page request gets a fresh connection; the prior
connection is closed by the reload itself (the browser fires
`unload` → the SSE socket closes → `req.on("close")` removes it
from `sseClients`).

### 5.7. Retire `docs/serve.mjs` + rewrite `serve.bat`

**Source**: this plan, batch 4.

**[docs/serve.mjs](../docs/serve.mjs)**: delete. The HTTP server
logic lives in [builder/serve.mjs](serve.mjs) §A.

**[docs/serve.bat](../docs/serve.bat)**: collapses from the current
three-line form to a one-line:

```bat
@pushd "%~dp0"
node ..\builder\tbdocs.mjs --src . --serve %*
@popd
```

The `%*` lets the user pass `--port 4001` or any other flag through.

### 5.8. Documentation

**Source**: this plan, batch 4.

Five files. Each gets a small, targeted edit; no rewrites.

#### 5.8.1. `builder/README.md`

In the flags table (currently 8 rows):

- Replace the `--serving` row with `--tolerate-missing-images`.
- Add two new rows: `--serve` and `--port`.

Add a new short subsection between "Quickstart" and "Documentation":

```markdown
## Serve mode

`tbdocs --serve` starts a long-lived dev process: HTTP server on
port 4000 (override with `--port`), recursive watcher on the
source tree, debounced rebuild on changes, and SSE-driven browser
auto-reload. The offline and PDF passes are skipped each rebuild
(restore them with a non-`--serve` invocation).

    cd builder && node tbdocs.mjs --src ../docs --serve

Or via the docs wrapper: `docs/serve.bat`.

Ctrl+C exits cleanly (closes the server, aborts the watcher,
drains SSE clients).
```

#### 5.8.2. `builder/PLAN.md`

Two edits:

1. **Status section**: add a "**Phase 12** ([PLAN-12.md](PLAN-12.md))
   ships `--serve` watch-and-reload mode..." paragraph at the bottom
   of the status block (after the existing Phase 11 paragraph).
2. **Build Phases table**: add a row at the bottom:

   ```
   Phase 12: SERVE          (n/a)    Long-lived watcher + HTTP server + SSE live-reload      [planned]
   ```

   `(n/a)` because Phase 12 doesn't add to the one-shot build time
   path; it's a separate lifecycle.

3. **Architecture diagram**: add a `serve.mjs` line in the
   `builder/` tree listing.

#### 5.8.3. `WIP.md`

The "Build / preview" subsection has one line that needs updating:

```
- `serve.bat` — `build.bat` followed by `npx http-server _site -p 4000`. No live-reload; iterating is `<Ctrl-C>` then re-run.
```

becomes:

```
- `serve.bat` — runs `tbdocs --serve`: initial build, then a long-lived process with watcher, debounced rebuilds, and SSE-driven browser auto-reload. Ctrl+C to stop.
```

No other WIP.md edits needed.

#### 5.8.4. `docs/Documentation/Builder.md`

End-user-facing one-paragraph addition in the existing serve-mode
context. Follow the plain-English-prose conventions in
[WIP.md](../WIP.md) (no "spin up", no "kick off"; use "start",
"begin").

#### 5.8.5. `builder/FUTURE-WORK.md`

Close out the no-watch-mode notes from PLAN-10's decision record
(§7.D4, §7.D11) -- they're cited from the FUTURE-WORK file.
Mark the entries "shipped in Phase 12" with a cross-reference to
this file.

---

## 6. Shared helpers

### 6.1. `parseArgs` extension

[tbdocs.mjs:36-81](tbdocs.mjs:36) currently parses 9 flags. Phase 12
adds two (`--serve`, `--port`) and renames one (`--serving` →
`--tolerate-missing-images`). The hand-rolled switch stays under 50
lines after the additions; no `args.mjs` factor needed.

Order in `--help` output: ordered by phase the flag affects
(`--src`, `--dest`, `--baseurl`, `--url`, `--dry-run`,
`--profile-offline`, `--no-offline`, `--no-pdf`,
`--tolerate-missing-images`, `--serve`, `--port`). `--serve` lands
near the end because it's a mode-switching flag (not a
phase-specific tweak).

### 6.2. Entry-module check

The Node-22 idiom for "fire on direct invocation, no-op on import"
(per [§5.1](#51-extract-runbuildopts)):

```js
import { fileURLToPath } from "node:url";
const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntry) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

Standard. No new dep. Compatible with both `node builder/tbdocs.mjs`
direct invocation and `import { runBuild } from "./tbdocs.mjs"`
import.

---

## 7. Design decisions and assumptions

### 7.1. Decision record

| ID | Decision | Why |
|---|---|---|
| D1 | `serve.mjs` imports `runBuild` from `tbdocs.mjs`, not the other way around | Reverse direction would couple every build to the watcher module. The current direction keeps `tbdocs.mjs` standalone-runnable and `serve.mjs` purely additive. The entry-module check ([§6.2](#62-entry-module-check)) keeps `tbdocs.mjs` import-safe. |
| D2 | `--serve` mode skips offline + PDF passes unconditionally | Per the design questionnaire selection. The offline tree is a build artefact for the static-host deploy (URL-rewritten); the dev server doesn't need it. The PDF tree is for the offline book; same. Rebuilding both on every save would push the rebuild from ~2 s to ~3.5 s for no developer benefit. |
| D3 | SSE, not WebSocket, for live reload | SSE is one-way (server → client), which is exactly what live-reload needs. WebSocket would carry an unused upstream channel. SSE is also a one-liner on the client (`new EventSource(url)`); WebSocket needs handshake handling. No dep either way. |
| D4 | The reload script is injected at serve time, not build time | Build-time inject would put a development-only script in the deployed `_site/`. Serve-time inject keeps `_site/` on disk byte-identical to a non-serve build. The CI deploy path is unaffected. |
| D5 | `--serving` is renamed to `--tolerate-missing-images` (not aliased) | The old name suggested "this is the serve-mode flag", but it's actually a PDF-strictness flag. The new name says what it does. Aliasing the old name would keep the confusion alive. Per the design questionnaire, the user chose the rename over auto-implying from `--serve`. |
| D6 | Watcher uses `node:fs/promises.watch(..., { recursive: true })`, not chokidar | Node 22's recursive `fs.watch` works on all three platforms; no new dep. If Linux ever proves flaky in practice, swap chokidar in as a single-module change -- the watcher boundary is a 10-line stretch in `serve.mjs §D`. |
| D7 | Failed rebuilds don't notify SSE | A rebuild failure leaves the previous `_site/` in place; the browser already shows that content. Notifying reload would tell the browser to re-fetch the same bytes (or, worse, reload mid-page-state-edit). The console error is the signal. The next successful rebuild fires the reload as normal. |
| D8 | `--serve` does NOT auto-imply `--tolerate-missing-images` | Per [§D5](#71-decision-record) the flags are independent. Because `--serve` skips the PDF pass ([§D2](#71-decision-record)), the missing-image check doesn't fire either way -- the flags don't intersect in default serve mode. If a future `--serve --no-skip-pdf` mode lands, the user passes `--tolerate-missing-images` explicitly. |
| D9 | Rebuild on ANY file under the source tree (except the ignore list), not just `.md` / `.html` | Theme assets (CSS, JS), images, mermaid sources, `_config.yml`, `_data/*.yml` all affect build output. The rebuild cost is the same regardless of which file changed (full Phase 1-6 walk). A per-extension allow-list would force the dev to remember which extensions trigger rebuild; a deny-list ([§5.4](#54-watcher--debounce--rebuild-queue) `IGNORED_PREFIXES`) is simpler. |
| D10 | Single-flight rebuild queue, not a job queue | A queue would let 50 saves stack 50 rebuilds. The single-flight + one-pending-slot pattern collapses bursts correctly and is ~10 lines. |
| D11 | Initial-build failure exits the process before the server binds | If `_site/` doesn't exist, the server has nothing to serve. Letting the user iterate against a broken build (server up, blank pages) is worse than a clear error. After the first successful build, subsequent failures keep the server up serving the prior good tree -- the dev can navigate to a different page that still works. |
| D12 | EADDRINUSE prints a clear message and exits 1 (no random-port fallback) | A silent port move would surprise the user. The `--port <N>` flag is the explicit escape. |
| D13 | Watch root is `srcRoot` (= `docs/`), not the repo root | `builder/` edits, `WIP.md` edits, etc. don't affect the rendered site. Watching the repo root would fire rebuilds on irrelevant edits. The build-pipeline edge case (a `builder/*.mjs` edit) is rare enough that re-running `serve.bat` is acceptable. |
| D14 | The rename batch (batch 1) touches `pdf.mjs`'s internal parameter name AND the CLI flag name | Keeping the parameter name `serving` would leave the same misleading name one level deeper in the code. The CLI rename is the user-visible change; the parameter rename is the internal-consistency follow-through. Both land in the same commit. |

### 7.2. Why no Phase 12 verify harness

Phase 12 adds a developer-facing lifecycle (the watcher + server)
but does not change the build output. The integrity check
(`check.bat`) covers the build side; the serve side is a manual
smoke ([§9.2](#92-manual-smoke)).

If a Phase 12 regression surfaces later (e.g. a watcher event
that's missed on a specific platform), add a small smoke script
under `builder/_smoke_serve.mjs` then; don't pre-build one.

### 7.3. Scope guardrails

The line between Phase 12 and "future serve-mode work" is the
following criterion:

1. Does the change affect the build output of a non-`--serve`
   invocation? If yes → it's not Phase 12; it's a Phase 11-style
   parity update (or a new phase).
2. Does the change require a new dependency? If yes → reconsider.
   Phase 12's no-new-dep discipline is what keeps the dev surface
   small.
3. Does the change touch the CI deploy workflow? If yes → it's not
   Phase 12 (serve mode is dev-local only).

Out-of-scope (deferred for "future serve-mode work" if requested):

- Incremental rebuilds (touch one `.md`, re-render only that page).
  Would require a dependency graph (which pages reference which
  other pages, which include which static assets). Out of scope.
- Browser-side state preservation across reloads. Vite's HMR
  protocol does this; SSE-driven full-reload doesn't.
- Auto-open browser on serve start (`xdg-open` / `open` /
  `start http://localhost:4000/`). Three platforms × three
  launcher commands; the user can copy-paste the URL. Skip
  unless asked.
- Multi-port mode (offline tree on `:4001`, PDF on `:4002`). The
  serve-mode focus is the online tree; the offline tree is a
  deploy artefact, not a dev iteration target.

---

## 8. What's NOT in Phase 12

These are explicitly out of scope. Listed so the implementer
doesn't get tempted.

### 8.1. Out by design

- **Incremental rebuilds**. Phase 12 does a full rebuild on every
  change. The ~2 s rebuild + ~50 ms SSE round-trip is the iteration
  loop. If iteration ever feels slow enough to justify incremental,
  it'll be a phase of its own (the dependency graph is the hard
  part).
- **HMR-style state preservation**. SSE-driven `location.reload()`
  loses page state. For a docs site this is fine.
- **Auto-open browser**. The user knows where `http://localhost:4000/`
  is.
- **Touch the GitHub Pages workflow**. Dev-only.

### 8.2. Out of phase

- **The `--tolerate-missing-images` semantics change**. Phase 12
  renames the flag; the behaviour stays the same (warn instead of
  throw on missing images in Phase 8). If the throw-vs-warn line
  ever moves, that's a Phase 8 follow-up, not Phase 12.
- **Watcher on `builder/` source for self-iteration**. The dev
  iterating on the builder itself re-runs `serve.bat`; the watcher
  watches `docs/` only ([§7.D13](#71-decision-record)).

### 8.3. Dropped

- **WebSocket live-reload**. SSE wins on every axis for one-way
  reload signals ([§7.D3](#71-decision-record)).

---

## 9. Verification

### 9.1. Acceptance checklist for "Phase 12 is done"

1. `check.bat` clean on the production tree after all four batches
   land.
2. `node builder/tbdocs.mjs` (no flag) produces byte-identical
   `_site/` / `_site-offline/` / `_site-pdf/` to the pre-Phase-12
   state. Verify with `diff -rq` against a pre-batch-1 snapshot of
   the three trees.
3. `node builder/tbdocs.mjs --tolerate-missing-images` accepted;
   `--serving` errors with the parseArgs "Unknown argument" message.
4. `node builder/tbdocs.mjs --src docs --serve` starts the server.
   Output includes:
   - `Phase 1+2+...` build lines (initial build).
   - `Serving <destRoot> at http://localhost:4000/`.
   - `Watching <srcRoot> for changes.`
5. Browser loads `http://localhost:4000/` and renders normally.
   Browser dev-tools network tab shows an open
   `EventSource /_tbdocs/reload` connection (`text/event-stream`,
   pending state).
6. Edit `docs/index.md` (add a paragraph). Within 1 s of save:
   - Console shows a build line (`Phase 1+2+...` summary).
   - Browser auto-reloads (no manual refresh).
   - The new paragraph appears on the page.
7. Edit `docs/_config.yml` (e.g. tweak the title). Same: rebuild
   fires, reload fires.
8. Save a `.md` file with broken markdown (intentional). The
   rebuild fails; console shows the error; the server stays up;
   the browser does NOT reload (still shows the prior good page).
9. Fix the broken file. The next rebuild succeeds; the browser
   reloads.
10. `Ctrl+C` exits cleanly. The process terminates within ~100 ms;
    the SSE connections close (browser sees a network-tab
    "cancelled" state).
11. With port 4000 already bound, `node builder/tbdocs.mjs --serve`
    prints the EADDRINUSE message and exits 1.
12. `node builder/tbdocs.mjs --serve --port 4001` binds 4001
    instead.
13. `docs/serve.bat` invocation reproduces the manual smoke at
    `node builder/tbdocs.mjs --src docs --serve`.

### 9.2. Manual smoke

| Step | Confirms |
|---|---|
| `cd docs && build.bat && check.bat` | Default build + integrity check still clean. |
| `cd docs && serve.bat` | Serve mode boots; initial build prints; server binds. |
| (in browser) Open `http://localhost:4000/` | Page renders; SSE connection in network tab. |
| Edit a `.md` file; save | Rebuild fires within 1 s; browser auto-reloads. |
| `<Ctrl+C>` in the serve.bat terminal | Process exits cleanly; SSE connections close. |
| `node builder/tbdocs.mjs` (no flag) | One-shot build, exits 0, byte-identical output. |
| `node builder/tbdocs.mjs --tolerate-missing-images` | Accepted; renamed flag works. |
| `node builder/tbdocs.mjs --serving` | Errors with "Unknown argument: --serving". |

---

## 10. Dependencies

None added. Phase 12 uses the existing dep set
([builder/package.json](package.json)) plus Node 22 stdlib:

- `node:http` for the server (already used in `docs/serve.mjs`).
- `node:fs/promises` `watch` for the recursive watcher (Node 22
  stdlib).
- `node:url` `fileURLToPath` for the entry-module check.

No chokidar, no ws, no nodemon, no eventsource library.

---

## 11. File layout after Phase 12

```
<repo root>/
  builder/
    serve.mjs                  (new -- §5.2; ~220 lines)
    tbdocs.mjs                 (refactored -- runBuild export, --serve,
                                 --port, --tolerate-missing-images
                                 rename; net +25 lines)
    pdf.mjs                    (-2 / +2 -- parameter rename)
    README.md                  (+20 -- Serve mode subsection, flag
                                 table updates)
    PLAN.md                    (+25 -- Phase 12 status paragraph and
                                 Build Phases row, architecture
                                 diagram update)
    PLAN-1.md ... PLAN-11.md   (unchanged)
    PLAN-12.md                 (this file)
    FUTURE-WORK.md             (close D4 / D11 routing)
  docs/
    serve.bat                  (rewrite to one-line `--serve` shim)
    serve.mjs                  (DELETED -- folded into builder/serve.mjs)
    Documentation/
      Builder.md               (+15 -- end-user serve-mode paragraph)
  WIP.md                       (3 lines changed -- Build / preview
                                 section's serve.bat row)
```

---

## 12. What "done" Phase 12 enables

Phase 12 doesn't unlock new pipeline capability -- the build output
is unchanged. What changes:

- **Dev iteration loop**: edit `.md` → save → see the result in the
  browser in ~2 s. No manual `<Ctrl+C>` + re-run.
- **One process, not two**: `serve.bat` is a single long-lived
  Node process. No external `http-server` package, no two-terminal
  workflow.
- **Single source of truth for the dev server**: the static-server
  logic lives in `builder/serve.mjs` alongside the rest of the
  build pipeline. The `docs/serve.mjs` standalone copy retires.
- **Closed PLAN-10 deferrals**: [§7.D4](PLAN-10.md) and
  [§7.D11](PLAN-10.md) close out with the resolution recorded in
  this file.
- **Clearer flag naming**: `--tolerate-missing-images` says what
  it does. The old `--serving` confused readers into thinking it
  was the serve-mode flag (which is now actually `--serve`).

After Phase 12 lands, the obvious next-step candidates (incremental
rebuilds, HMR-style state preservation) stay deferred unless the
~2 s rebuild ever feels slow enough to justify them. The serve
loop is the iteration boundary; the rebuild is the cost.
