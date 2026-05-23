# Chromium-internal approaches to parallel PDF generation

A separate document because none of this is shipped or even partially
implemented. It records the research we did into Chromium-internal
approaches to faster / parallel PDF emission, with honest cost
estimates and the reasons each was rejected. Kept as a reference for
two scenarios:

1. The book grows large enough that the 70 s build becomes a CI
   bottleneck again (3000+ pages, or CI runtime tightens).
2. Someone independently rediscovers the same ideas and wants to know
   why we didn't pursue them.

For the perf work that *did* land (the `--disable-gpu` flag pair, the
memory probes, the GC-pass investigation), see [README.md](README.md).

## What the public APIs don't expose

The shortest version: **Skia's drawing stream and HarfBuzz's shape
results never leave the renderer process via any documented API**.
That's the wall behind every approach below.

What's documented and works from JS / CDP:

- `Range.getClientRects()`, `Element.getBoundingClientRect()` -- per
  line-fragment bounding boxes. Box-level, not glyph-level.
- CDP `DOMSnapshot.captureSnapshot` -- the full layout tree as JSON
  with each text node's `textBoxes[]` (bounds + text-fragment offsets).
  Run-level granularity.
- `CanvasRenderingContext2D.measureText()` -- `TextMetrics` for text
  *about to be drawn*, not text already laid out.
- `document.fonts` (`FontFaceSet`) -- load state, not glyph positions.

What is *not* exposed anywhere:

- The HarfBuzz shaping result -- the character-to-glyph mapping with
  ligatures, contextual substitutions, kerning all applied. Lives in
  Blink's `blink::ShapeResult` / `ShapeResultView` (~50 MB in the
  renderer for our book, visible in the memory-infra dump).
- Per-glyph x-positions (`SkTextBlob`).
- Font binaries / subsets (security/copyright concerns).
- The accessibility structure tree that becomes the tagged-PDF
  structure tree.

What is internally serialized but invisible from outside:

- `cc::PaintRecord` / `SkPicture` -- the renderer's full draw stream,
  containing every `SkTextBlob` with its glyph IDs and positions.
  Serialized for Mojo transfer renderer → PrintCompositor (see below);
  could be intercepted with dynamic instrumentation.
- The tagged-PDF structure tree -- traveled separately through Mojo
  to PrintCompositor; same intercept-by-hook story.

## How the print path actually works

Inside one PDF render (`Page.printToPDF`):

1. **Renderer (where paged.js lives)** -- Blink lays out the document
   via LayoutNG; the paint pass produces a `cc::PaintRecord`
   containing every draw op as `SkPaint` + `SkTextBlob` + `SkPath` +
   `SkImage` plus the accessibility structure tree.
2. **Mojo IPC** -- the `PaintRecord` is serialized (Skia's documented
   `SkPicture` byte format, ~50 MB on our book) and sent over a Mojo
   channel to the PrintCompositor utility process. The structure tree
   travels via a separate Mojo message.
3. **PrintCompositor utility process** (`chrome.exe --type=utility
   --utility-sub-type=printing.mojom.PrintCompositor`) -- deserializes
   the picture into Skia, calls `SkPDFDocument` to emit PDF bytes,
   merges the structure tree on top, returns the PDF bytes via Mojo.
4. **Browser process** -- receives the PDF, forwards over the
   DevTools/CDP channel to puppeteer over a WebSocket.
5. **Node (us)** -- receives the bytes from puppeteer.

Cost shape on the 1651-page book, with the shipped `--disable-gpu`
flag pair:

| stage | typical wall clock | peak memory |
| ----- | ------------------ | ----------- |
| render (Blink layout + paged.js) | ~10 s | renderer ~1.3 GB |
| Mojo transfer renderer → PrintCompositor | <100 ms | (briefly +50 MB browser IPC buffer) |
| PrintCompositor → PDF | ~35 s | utility process ~300-500 MB |
| PDF transfer back | <500 ms | browser process spikes (PDF is in flight) |
| pdf-lib outline + metadata | ~5 s | Node ~100 MB |

The 35 s `SkPDF` step is single-threaded Skia walking the layout tree
and emitting PDF objects per the SkPDF design (see "Memory: where the
renderer's 1.9 GB goes" in README.md for the per-allocator breakdown
of that growth).

## Chromium's binary boundary

`chrome.dll` is a single ~283 MB blob containing essentially all of
Chromium: Blink, V8, Skia, Mojo, services, PrintCompositor,
everything. The launcher `chrome.exe` is a 4 MB shim that loads
`chrome.dll` and calls `ChromeMain`.

A PE export-table dump (see `perf/probe-idle-browser.mjs` for the
measurement that surfaced this) shows **chrome.dll exports exactly
six functions**:

```
ChromeMain                                       # main entry point
CrashForExceptionInNonABICompliantCodeRange      # crash helper
GetHandleVerifier                                # sandbox handle check
IsSandboxedProcess                               # sandbox query
RelaunchChromeBrowserWithNewCommandLineIfNeeded  # relauncher
sqlite3_dbdata_init                              # accidental third-party leak
```

Out of probably millions of internal C++ functions, six are reachable
from outside via `LoadLibrary` + `GetProcAddress`. PrintCompositor,
Mojo, Skia, Blink, V8 -- none are exported. The binary is opaque by
design; Chromium isn't built as a library for third-party embedders.

**CEF** (Chromium Embedded Framework, which the docs ship a reference
for in `docs/Reference/CEF/`) exists exactly because of this gap.
CEF is a deliberately-stable C/C++ API wrapper on top of Chromium
internals, with a single stable ABI per major version. The CEF
maintainers do the work of (a) building Chromium with the right
configs, (b) exposing necessary internals through a stable wrapper,
and (c) keeping the wrapper compatible across Chromium upgrades.

## Idle process tree baseline

Measured by [probe-idle-browser.mjs](probe-idle-browser.mjs) -- a
fresh puppeteer.launch + about:blank only, no work:

| process | private |
| ------- | ------- |
| browser (the parent) | 40-46 MB |
| renderer (initial about:blank target) | 20-23 MB |
| gpu-process (stub, post `--disable-gpu`) | 15-16 MB |
| utility:network.mojom.NetworkService | 17 MB |
| utility:storage.mojom.StorageService | 11 MB |
| crashpad-handler x 2 | 2 MB each |
| **total tree** | **~125-180 MB** |

The "browser process at 1,113 MB" figure in earlier memory probes was
specific to the PDF-transit phase -- the browser process buffers the
41 MB PDF + the tagged structure tree as they flow from PrintCompositor
to the browser to puppeteer's CDP channel. It is not the steady-state
cost.

## Approach A: patch and upstream a Chromium flag

The highest-leverage candidate: a CDP/flag-level change that either
skips PrintCompositor for single-renderer documents or adds streaming
output. Concrete entry points for research:

- Skia source: <https://skia.googlesource.com/skia/+/refs/heads/main/src/pdf/>
  -- commit log against the Skia revision pinned in our Chromium
  build.
- Skia Gerrit reviews-in-flight: <https://skia-review.googlesource.com/>
  filtered by `src/pdf/`.
- Chromium printing tree: `chromium/src/printing/`,
  `components/printing/`, `chrome/browser/printing/`.
- crbug.com: searches like `component:Internals>Printing performance`
  or `component:Internals>Skia>PDF`.
- Dev mailing lists: `chromium-dev@chromium.org`,
  `skia-discuss@googlegroups.com` (Google Groups archives).

Plausibly upstreamable patches:

1. `Page.printToPDF({ singleRenderer: true })` -- skip PrintCompositor
   when the document doesn't span multiple frames. Saves ~450 MB
   peak + ~5-10 s in our pipeline.
2. CDP method that emits the renderer's `SkPicture` directly. Unlocks
   external pipelines.
3. Streaming `Page.printToPDF` output. Lets us overlap `process`
   (pdf-lib outline / metadata) with `generate`.

**Rejected because** the gains overestimated what they'd buy us. The
generate phase is ~35 s with the shipped flag pair, peak memory is
~2.4 GB. Saving ~450 MB of PrintCompositor or shaving 5-10 s of
generate isn't worth the upstreaming overhead (RFC, review cycles,
Chromium release cadence, plus carrying a patch until the upstream
lands).

## Approach B: port SkPDF to JS

Skia's PDF backend (`src/pdf/` in Skia, ~30 k LOC of C++) consumes an
`SkCanvas` draw stream and emits PDF bytes. Porting it to JS is a
real project but the work it does isn't where the time goes -- Skia
is well-optimized. **The hard problem is not Skia. It's getting
Blink's draw stream out to feed into the port.**

CanvasKit (`canvaskit-wasm` on npm) is Skia compiled to WASM and
includes `SkDocument::MakePDFDocument`. In principle: load an
`SkPicture` into CanvasKit, replay it into the PDF document's canvas,
serialize. The same input problem still applies -- the `SkPicture`
isn't accessible from JS land without a Chromium-side intervention.
CanvasKit's PDF surface is also materially less battle-tested than
native SkPDF and lacks the tagged-PDF API.

**Rejected because** the port alone doesn't unblock anything and the
real bottleneck (data extraction) is identical to approaches C-E.

## Approach C: Frida + Mojo emulation in Node

Architecture:

1. Frida-hook the renderer process, intercept `SkPicture::serialize`
   to capture the serialized picture bytes during `Page.printToPDF`.
2. Slice the picture by page bounds using `SkBBoxHierarchy` /
   `SkPicture::playback` with a clipping canvas.
3. Spawn N PrintCompositor utility processes from Node, talking to
   each over Mojo to send a sub-picture and receive a PDF slice.
4. Concatenate slices with raw-byte xref rewriting.

The blocker is step 3. Mojo has three sub-layers:

- **Transport** -- Win32 named pipes. One end inherited by the child
  via the `PROC_THREAD_ATTRIBUTE_HANDLE_LIST` Win32 attribute,
  command-line arg `--mojo-platform-channel-handle=<N>`.
- **Wire protocol** -- framed messages with version headers,
  attachment references, multiplexed message pipes.
- **Bindings** -- `.mojom` interface files (e.g.,
  `components/services/print_compositor/public/mojom/print_compositor.mojom`)
  compiled to marshaling stubs.

The handshake the browser-process normally does to bring up a
PrintCompositor utility:

1. Spawn the child with the `--type` / `--utility-sub-type` args plus
   the inheritable pipe handle.
2. Send the Mojo "invitation" message containing the primordial
   message pipe handle.
3. Once the child has resolved the invitation, send a binding request
   for the named `printing.mojom.PrintCompositor` attachment.
4. Call methods on the resulting remote (e.g.,
   `PrepareForDocumentToPdf`, `CompositePage`, `FinishDocumentToPdf`),
   each method being a structured Mojo message with mojom-encoded
   payload and shared-memory regions for the large blobs.

Implementing all of this in Node, against unstable Chromium internal
interfaces, is the cost:

| component | effort |
| --------- | ------ |
| Win32 process spawn with inherited handles (Win32 FFI) | 1 week |
| Named pipe + cross-process handle transfer | 1 week |
| Mojo channel framing (read/write headers, multiplex) | 2-3 weeks |
| Mojo invitation protocol | 1-2 weeks |
| `.mojom` parser + JS codegen, or hand-written stubs | 2-3 weeks |
| Shared-memory region encoding | 1 week |
| PrintCompositor-specific marshaling | 1-2 weeks |
| Tagged-PDF tree capture + slicing | 2-3 weeks |
| SkPicture slicing by page bounds | 1-2 weeks |
| Integration + Chromium-version drift debugging | 3-4 weeks |
| **total** | **15-22 weeks** |

Plus ongoing maintenance every Chromium upgrade -- internal
interfaces have no stability guarantees because they're build-time
contracts between Chromium components.

**Rejected because** the engineering cost dwarfs the wall-clock
savings, and the maintenance is permanent.

## Approach D: Frida + CanvasKit-WASM in workers

Avoids Mojo by using Skia directly. Architecture:

1. Frida-hook to capture the SkPicture bytes (same as C).
2. Slice the picture by page bounds (same as C).
3. Spawn N Node `worker_threads`, each loads CanvasKit-WASM,
   deserializes its sub-picture, calls `SkDocument::MakePDFDocument`,
   emits a sub-PDF.
4. Concatenate.

Cost is smaller than approach C because no Mojo plumbing, but two
issues:

- **CanvasKit's PDF surface diverges from native SkPDF.** Font
  subsetting, image encoding, color-space handling have known gaps
  and quirks. Plan on 1-2 weeks of debugging diverging output before
  matching native SkPDF closely enough for production.
- **Tagged PDF is missing.** CanvasKit's `SkDocument` doesn't expose
  Skia's tagging API; the structure tree would have to be applied
  separately, derived from the DOM in our own code. Probably 2-4
  weeks to rebuild.

Total: **6-10 weeks**, with output-fidelity risk.

**Rejected because** of the tagged-PDF gap (accessibility is
non-negotiable) and the divergence risk against the production
Chromium SkPDF baseline.

## Approach E: helper binary linking Chromium components

Architecture: build a small DLL/EXE that statically links against
`//mojo/core/embedder`, `//components/services/print_compositor`,
and `//cc/paint`. The helper exports C-style functions Node calls
via FFI:

- `helper_init()` -- start a Mojo node, set up the embedder.
- `helper_emit_pdf(skp_bytes, ax_tree_bytes, page_range, out_pdf*)` --
  spawn or reuse a PrintCompositor, send the inputs, return the PDF.

GN file is short:

```gn
shared_library("printcomp_helper") {
  sources = [ "helper.cc" ]
  deps = [
    "//mojo/core/embedder",
    "//components/services/print_compositor",
    "//cc/paint",
    "//base",
  ]
}
```

The helper does all the Mojo plumbing using Chromium's own Mojo
library, so we avoid reimplementing Mojo in Node. Node handles
SkPicture slicing (a pure data problem) and PDF concatenation.

### Checkout and build cost (corrected)

The "Chromium build is 50 GB and 6 hours" rule of thumb refers to
the full-history `fetch chromium`. For a single-purpose helper,
with `gclient sync --no-history --shallow` and targeted GN builds:

| step | estimate |
| ---- | -------- |
| depot_tools install + Visual Studio Build Tools + Win SDK 10 (if not already set up) | half day, one-time |
| Shallow `gclient sync` for selected DEPS | 30-90 min |
| Disk footprint after shallow sync | ~20-30 GB (not 50) |
| First `ninja printcomp_helper` with `is_debug=false symbol_level=1` | 30-90 min (~1500-2500 TUs vs ~50,000 for full Chromium) |
| Incremental rebuild (touched `helper.cc`) | 5-15 min |
| Output DLL size | ~80-150 MB (statically-linked Skia, base, mojo, abseil, icu) |
| Per-Chromium-upgrade re-sync + rebuild | 1 hour if interfaces stable, up to a day if a signature changed |

So the **initial commitment is more like a Saturday afternoon than a
quarter** -- the 6-12 weeks figure from approach C drops to **4-6
weeks for the full pipeline** (helper + Frida extraction + SkPicture
slicing + AX tree slicing + Node orchestration + PDF concat).

### A potentially smaller variant: Skia-only helper

If tagged PDF were acceptable to drop, the helper could skip
`//components/services/print_compositor` and link only against
`//third_party/skia`. The build shrinks to ~800-1200 TUs, ~20-40 min
first build, helper DLL ~30-50 MB. The PDF emit path becomes a direct
`SkDocument::MakePDF` call.

**Rejected because** tagged PDF is non-negotiable. Documented here
because it's the simplest viable Chromium-internal architecture if
the accessibility requirement ever changes.

### Why approach E was still rejected

The 4-6 week full-project estimate is a fair cost for the gains:

- Render once, extract SkPicture (~10 s).
- Kill the original Chromium (frees ~1.4 GB renderer).
- Run N PrintCompositor helpers in parallel (~11 s wall clock for N=4
  at ~45/4 s each).
- Concat (~3 s).
- **End-to-end: ~26 s vs current ~70 s, peak ~2 GB.**

Actual 41 s wall-clock save with comparable peak memory. Worth doing
if the engineering budget exists.

What pushes it off the table for now:

1. **Maintenance against Chromium version churn.** Mojo's
   `printing.mojom.PrintCompositor` interface signature changes
   between Chromium milestones. We'd be re-syncing + rebuilding +
   retesting on every Puppeteer Chromium bump (every few months).
2. **CI build pipeline complexity.** Helper.dll has to be pre-built
   and shipped as a release artifact -- can't be built fresh in
   GitHub Actions every PR because the sync + build is ~45-90 min on
   a CI-class machine.
3. **The savings aren't urgent.** A 70 s build is fine on CI. A
   ~26 s build would be nicer, but the 44 s difference doesn't change
   any developer workflow we have.

If item 3 changes (book grows past ~3000 pages, or CI gains a hard
runtime cap), approach E becomes the right answer.

## Cost summary

| approach | engineering | tagged PDF | output fidelity | binary | maintenance |
| -------- | ----------- | ---------- | --------------- | ------ | ----------- |
| A (upstream patch) | weeks-months of RFC + review | works | identical | none (official) | none after merge |
| B (port SkPDF alone) | doesn't unblock | n/a | n/a | n/a | n/a |
| C (Frida + Mojo in Node) | 15-22 weeks | works | identical | small | high (Mojo internals) |
| D (Frida + CanvasKit workers) | 6-10 weeks | requires rebuild | divergence risk | medium | medium |
| E (helper binary) | 4-6 weeks | works | identical | 80-150 MB | per Chromium upgrade |
| E-slim (Skia-only helper) | 3-4 weeks | broken | divergence on tags | 30-50 MB | per Chromium upgrade |

## What would change the calculus

- **Book grows past ~3000 pages.** Generate time scales roughly
  linearly in Skia; at 3000 pages the single-process pipeline is
  ~70-90 s generate alone, ~100-120 s total. Approach E pays off.
- **CI runner downsized.** If peak memory has to stay under ~1.5 GB,
  any current single-Chromium path is in trouble; approach E with
  the renderer killed mid-pipeline is the only fit.
- **Chromium ships streaming `Page.printToPDF`.** A long-standing
  feature request that would let us overlap `generate` and
  `process`. If it lands upstream, our pipeline benefits without any
  patch work and approach E loses its remaining edge.
- **CEF adds tagged-PDF support.** Currently a gap; if filled, the
  helper-binary architecture could route through CEF's stable API
  instead of raw Chromium internals, collapsing the maintenance cost.

## Tooling notes for future investigators

If you do come back to this:

- [perf/probe-idle-browser.mjs](probe-idle-browser.mjs) gives the
  idle baseline (~125-180 MB tree) and was the data behind the
  corrected memory math here.
- [perf/probe-memory.mjs](probe-memory.mjs) + sample-mem.ps1 gives
  the working pipeline's per-process tree at peak.
- [perf/probe-renderer-mem.mjs](probe-renderer-mem.mjs) +
  analyze-mem-trace.mjs gives the per-allocator breakdown inside the
  renderer via memory-infra dumps.
- [perf/diff-blink-classes.mjs](diff-blink-classes.mjs) compares
  Blink object class counts between two memory-infra dumps -- useful
  for verifying that a code change is or isn't affecting layout-state
  count.
- [perf/analyze-heap-snapshot.mjs](analyze-heap-snapshot.mjs) parses
  V8 heap snapshots from the `--heap-snapshot` extension to
  probe-renderer-mem.mjs.

For exploring Chromium internals: <https://source.chromium.org>
(searches and cross-refs the source). The `printing/` and
`components/services/print_compositor/` directories are the entry
points to the print pipeline.
