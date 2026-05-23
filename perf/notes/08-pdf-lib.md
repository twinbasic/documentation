# pdf-lib: profiling the process phase

Wiring `--cpu-profile-process` so the pdf-lib roundtrip becomes visible to the same `analyze-profile.mjs` toolchain we already use on the render phase, then following the bottom-up table -- pako dominates with per-stream init overhead, routing `pako.deflate` through `node:zlib` saves ~1.5 s of process wall (save -58 %).

The render-side investigations (notes [01](01-baseline-and-detach.md)
through [07](07-memory.md)) brought render down from ~104 s to ~8 s
and process from ~40 s to ~5 s. By [`pdf-lib parseSpeed: Fastest`](01-baseline-and-detach.md)
the process phase was a flat ~5 s of `load + setOutline + save`, the
sub-step numbers were the only thing we knew about it, and there was
no bottom-up table to point at: CDP's `Profiler` attaches to Chromium
and the process phase runs in Node, so `--cpu-profile` couldn't see
it.

## `--cpu-profile-process` (and `--heap-profile-process`)

Added to `measure.mjs`: opens an in-process V8 Profiler via
`node:inspector/promises`, brackets the process phase the same way
`--cpu-profile` brackets render, and writes `process.cpuprofile`
alongside `render.cpuprofile`. Same `.cpuprofile` JSON shape, so
the existing `analyze-profile.mjs` / `find-callers.mjs` /
`find-callees.mjs` work unchanged. See the *Profiling pdf-lib
(process phase): canonical command* section in [the README](../README.md)
for the operational form.

The heap counterpart -- `--heap-profile-process` -- arrived later
(once allocation became the obvious next thing to attack: GC was
sitting at the top of every CPU profile in this phase). It shares
the same inspector session, so capturing both in one run is one
flag away. Output is a `.heapprofile`, a tree of
`{ callFrame, selfSize, children }` rooted at `head` -- *not* the
flat `.cpuprofile` shape -- so `analyze-heap-profile.mjs` handles
it instead of the cpu analyzers. See *Profiling pdf-lib heap
allocation (process phase): canonical command* in
[the README](../README.md) for the operational form. The findings
this tool enabled are folded into the per-shim sections below
(decodeName / sizeInBytes / PDFDict.entries / ...) -- each names
which path it came from when the heap profile, not the cpu
profile, was the diagnostic that pointed at the function.

First run on the 1638-page book (`--detach-pages --no-timing
--cpu-profile-process --cpu-sampling 100`), process 4.66 s (load
1.88 s, setOutline 0.01 s, save 2.77 s). Top of the bottom-up table:

```
samples: 8560   duration: 4.68s   us/sample: 547

   self_ms   self_%   function  @  source
   -------   ------   ----------------------------------------------
    645.24   13.85%   (garbage collector)
    460.42    9.88%   longest_match            pako/lib/zlib/deflate.js:231
    428.15    9.19%   deflateInit2             pako/lib/zlib/deflate.js:1327
    374.02    8.03%   PDFRef.of                pdf-lib/.../PDFRef.js:34
    218.73    4.69%   decodeName               pdf-lib/.../PDFName.js:9
    218.73    4.69%   PDFDict.entries          pdf-lib/.../PDFDict.js:22
    182.64    3.92%   deflate_slow             pako/lib/zlib/deflate.js:726
    119.75    2.57%   parseRawNumber           pdf-lib/.../BaseParser.js:33
    114.28    2.45%   DeflateState             pako/lib/zlib/deflate.js:1092
    113.19    2.43%   parseName                pdf-lib/.../PDFObjectParser.js:117
     ... pako rows and parser rows continue down the table ...
```

Adding up pako frames (`longest_match` + `deflateInit2` +
`deflate_slow` + `DeflateState` + `lm_init` + `compress_block` +
`build_tree` + `Deflate.push` + `adler32`) lands at **~1.42 s, ~30 %
of the process phase**. Of that, the *initialization* group
(`deflateInit2` + `DeflateState` + `lm_init`) was **~628 ms** -- so
~44 % of pako's time was spent setting up Deflate state, not
compressing bytes. That number per call doesn't explain itself
unless the call count is high.

## Are we compressing Chrome's already-compressed streams?

Reasonable hypothesis: pdf-lib loads, decompresses Chrome's content
streams, and then re-compresses them on save. That would put Chrome's
~52 MB of content through deflate twice, and explain the heavy
pako time as wasted work.

Walking the code:

- `PDFObjectParser.parseDictOrStream` (`pdf-lib/.../parser/PDFObjectParser.js:171`)
  always ends with `return PDFRawStream.of(dict, contents)`. Every
  stream pdf-lib parses out of the input is a `PDFRawStream` holding
  the verbatim bytes between `stream` / `endstream`. No decompression.
- `PDFRawStream.getContents` (`pdf-lib/.../objects/PDFRawStream.js:22`)
  returns those bytes unchanged.
- `PDFStreamWriter.computeBufferSize` (`pdf-lib/.../writers/PDFStreamWriter.js:43-46`)
  marks `shouldNotCompress = true` for anything that's `instanceof
  PDFStream` (which includes `PDFRawStream`). Those go out verbatim
  with the original `/Filter` preserved.

`pako.deflate` lives in `PDFFlateStream.computeContents`
(`pdf-lib/.../structures/PDFFlateStream.js:15`); the only subclasses
are `PDFContentStream`, `PDFCrossRefStream`, and `PDFObjectStream`.
None of those are instantiated by the parser. So **Chrome's content
streams ride through as `PDFRawStream` and never see pako**.

Confirmed by instrumenting `pako.deflate` and re-running the save
on the produced book.pdf:

```
deflate calls during save : 4524
bytes fed to deflate      : 24.28 MB
bytes produced            :  4.39 MB
final pdf size            : 16.08 MB
```

The 4,524 deflate calls are pdf-lib's **own** new streams:

- ~4,523 `PDFObjectStream` chunks. `PDFStreamWriter.forContext`
  defaults to `objectsPerStream = 50`; the book has **228,191
  indirect objects**, so pdf-lib packs ~4,564 chunks of 50 each.
- 1 `PDFCrossRefStream` for the xref.

## Wait -- the pdf-lib output is *smaller* than Chrome's. What's going on?

Chrome's raw PDF is 39.3 MB, pdf-lib's final PDF is 16.1 MB. That
23 MB shrink isn't pdf-lib throwing anything away -- it's compressing
something Chrome chose to emit verbatim.

Tallying the 228,191 indirect objects pdf-lib sees by type:

```
130,787  StructElem /S=/NonStruct      (a11y wrapper around content w/o structural role)
 22,193  StructElem /S=/Strong         (bold)
 11,003  Dict /Type=/Annot             (mostly hyperlinks)
 10,054  StructElem /S=/Link
  9,164  StructElem /S=/P              (paragraph)
  8,417  StructElem /S=/Em             (emphasis)
  5,270  StructElem /S=/TD             (table cell)
  4,822  StructElem /S=/Code
  3,392  StructElem /S=/LI             (list item)
  3,040  StructElem /S=/H5
    ... another ~15 k StructElems in long tail (H1-H6, L, TR, Art, ...)
  2,061  PDFRawStream                  (Chrome's content + font + image streams)
  1,651  Dict /Type=/Page
   ... ~3.5 k misc dicts ...
```

**Over 225,000 are tiny `<<...>>` StructElem dicts** -- the
tagged-PDF structure tree, which Chrome emits because we pass
`tagged: true` to `page.pdf()`. Each `StructElem` is something like
`<</Type /StructElem /S /P /P [123 0 R] /K [...] /Pg 5 0 R>>` -- a
few hundred bytes of mostly boilerplate.

Chrome writes them as plain text indirect objects -- 225k × a few
hundred bytes ≈ 28 MB of `<<...>>` source. pdf-lib's
`PDFStreamWriter` packs those 50 at a time into PDFObjectStreams,
each of which is then deflate-compressed. The dict syntax is wildly
repetitive across siblings (`/Type /StructElem` literally appears
225k times), so deflate compresses the packed text ~5.5x. The
24.28 MB of small-dict text fed to deflate above comes out the
other side at 4.39 MB. Add the ~11 MB of `PDFRawStream` bytes that
pass through verbatim, plus a few KB of misc, and the 16.1 MB total
checks out.

The pdf-lib roundtrip's win over Chrome's raw output is **encoding
the same information** in PDF 1.5's compressed-object-streams
feature instead of as plain `<<...>>` text. Skia's PDF writer
chooses not to use that feature.

This also explains the pako profile shape. The workload is *many
small streams* (~4,500 of them at ~5.4 KB input each), which is
exactly where per-stream initialization dominates: the 628 ms in
`deflateInit2` + `DeflateState` + `lm_init` is paid 4,500 times,
while the per-call payload is small enough that the actual
compression work (~755 ms across `longest_match` + `deflate_slow`
+ `compress_block` + `build_tree` + `adler32`) isn't proportionally
larger.

## The shim

PDF `/FlateDecode` (ISO 32000-1 §7.4.4) is the zlib format
(RFC 1950): 2-byte zlib header + raw deflate body (RFC 1951) + 4-byte
Adler-32 trailer. Both `pako.deflate(data)` and Node's
`zlib.deflateSync(data)` produce that format at default level 6.
Verified head-to-head: each compresses to an equivalent-size zlib
stream starting `78 9c`, and either can decompress the other's
output back to the original input bytes.

`docs/lib/fast-deflate.mjs` is a side-effecting import that mutates
the live `pako` exports:

```js
import { deflateSync } from "node:zlib";
import pako from "pako";

if (!pako.__fastDeflateInstalled) {
  const original = pako.deflate;
  pako.deflate = function fastDeflate(data, options) {
    if (options) return original.call(pako, data, options);
    return deflateSync(data);
  };
  pako.__fastDeflateInstalled = true;
}
```

pdf-lib's CJS code reads `require("pako").deflate` at call time
(`pako_1.default.deflate(unencodedContents)` inside
`PDFFlateStream.computeContents`), so mutating the live module
exports propagates without forking pdf-lib. The `options`
fallthrough means any caller that needs pako's non-default
behaviour (dictionaries, raw deflate, custom level) is unaffected;
pdf-lib's only call site passes no options.

Microbenchmark on the harness machine, both unrelated to the book:

```
zlib.deflateSync(50 MB of ASCII)                        112 ms
zlib.deflateSync(book.pdf as input, 16.1 MB)            283 ms
```

For comparison, pako spent ~1.42 s on the book's actual save
workload (~24 MB across 4,524 calls). Same order of magnitude as
the raw-throughput numbers above, but with more per-call overhead
-- which matches what a JS implementation is expected to lose
against C when amortised across many small calls.

`docs/render-book.mjs` imports the shim unconditionally near its
pdf-lib import; production runs through it. `measure.mjs` adds a
`--fast-deflate` flag, opt-in in the harness so paired pre/post
A/Bs are still easy.

## Results

Paired A/B, four interleaved runs (`pre1 post1 pre2 post2`) with
`--detach-pages --no-timing --cpu-profile-process --cpu-sampling
100`, same 1638-page book each:

| metric        | pre1   | pre2   | pre avg | post1  | post2  | post avg | Δ                |
| ------------- | ------ | ------ | ------- | ------ | ------ | -------- | ---------------- |
| **process**   | 4.20 s | 4.27 s | **4.24 s** | 2.79 s | 2.74 s | **2.77 s** | **-1.47 s (-35 %)** |
| ↳ load        | 1.53 s | 1.54 s | 1.54 s  | 1.67 s | 1.61 s | 1.64 s   | +0.10 s (noise; load goes through `pako.inflate`, untouched) |
| ↳ setOutline  | 0.01 s | 0.01 s | 0.01 s  | 0.01 s | 0.01 s | 0.01 s   | unchanged |
| ↳ **save**    | 2.66 s | 2.72 s | **2.69 s** | 1.11 s | 1.12 s | **1.12 s** | **-1.57 s (-58 %)** |
| pdf size      | 16.1 MB | 16.1 MB | 16.1 MB | 16.1 MB | 16.1 MB | 16.1 MB | identical |

Render and generate wall-clock numbers varied ±5 s between runs
(machine load) but the process numbers are tight to ±0.05 s.

Post-fix bottom-up profile, same flags:

```
samples: 5229   duration: 2.82s   us/sample: 540

   self_ms   self_%   function
   -------   ------   --------------------------------------------------
    348.83   12.48%   writeSync                  (Node libuv syscall)
    335.87   12.01%   PDFRef.of                  pdf-lib/.../PDFRef.js:34
    262.44    9.39%   (garbage collector)
    165.24    5.91%   PDFDict.entries
    159.84    5.72%   decodeName
    108.00    3.86%   parseName
    102.60    3.67%   parseRawNumber
     88.56    3.17%   parseRawInt
     72.90    2.61%   PDFName.of
     71.28    2.55%   parseDict
     ... pako rows absent from the table ...
```

Two structural changes worth calling out:

- All pako frames dropped out of the top 20. `writeSync` at 12.48 %
  is libuv's syscall wrapper waiting on zlib's C++ work; that work
  doesn't itself show in the JS-frame bottom-up because it runs off
  the JS thread. The ~349 ms here is the total wait time across all
  ~4,500 calls.
- `(garbage collector)` dropped from 645 ms to 262 ms (-383 ms).
  That matches the per-call allocator pressure from creating a fresh
  `Deflate` instance + `DeflateState` per pako call, now gone.

End-to-end `book.bat` run with the shim:

```
render:   8.5s   (1651 pages)
generate: 37.1s  (raw 39.3 MB)
process:  2.5s
saved:    docs\_pdf\book.pdf  (16.1 MB)
total:    50.1s
```

Process is now under three seconds on the production path. Wall-clock
total ~50 s vs the prior ~70 s baseline. Output PDF byte size
unchanged from the pre-shim build (16.1 MB; standard `/CreationDate`
drift between runs).

## After the shim: what's left

After the shim the bottom-up profile points at the next two
JS-attributable buckets:

- `PDFRef.of` at 336 ms self-time (12 %). The function builds a
  string key `<num> <gen> R` per call and Map-looks it up; the
  string allocation per call is the cost. A drop-in fix would
  replace the `Map<string>` pool with a flat array for the gen=0
  case and a fallback Map for gen ≠ 0. Followed up below.
- `(garbage collector)` at 262 ms (9 %). Tied to `PDFRef.of` and
  the per-object dict allocations in the writer; expected to
  shrink along with the first item.

## `PDFRef.of`: dense-array cache for the gen=0 path

The upstream implementation:

```js
var pool = new Map();
PDFRef.of = function (objectNumber, generationNumber) {
    if (generationNumber === void 0) { generationNumber = 0; }
    var tag = objectNumber + " " + generationNumber + " R";   // alloc
    var instance = pool.get(tag);                              // hash
    if (!instance) {
        instance = new PDFRef(ENFORCER, objectNumber, generationNumber);
        pool.set(tag, instance);
    }
    return instance;
};
```

Per call: build a fresh `<obj> <gen> R` string, hand it to a
`Map<string>` lookup that has to hash it, branch on miss. The
string allocation is the cost we care about -- the dedup pool
itself works correctly, it's just paying for its key on every read.

### Workload shape

Instrumented `PDFRef.of` and re-ran the harness through load + save:

```
total PDFRef.of calls     : 1,231,643
  gen=0 (or undefined)    : 1,010,034  (82 %)
  gen != 0                :   221,608  (18 %)
gen=N value distribution (top, 4523 calls each):
  gen=1, gen=2, ... gen=50: 4523 calls/value
```

The 1.2 M gen=0 calls are what the parser does for every
encountered `N 0 R` reference and every per-object PDFRef
construction. The 221 k gen != 0 calls are pdf-lib's xref-stream
bookkeeping for PDF 1.5+ compressed-object entries: in a
cross-reference stream's type-2 entry, the spec uses the
"generation number" field to store the **index of the object
within its ObjStm**, and pdf-lib feeds that index straight to
`PDFRef.of` (`PDFXRefStreamParser.js:74-80`). 4,523 ObjStms × 50
entries each ≈ the observed 221 k.

So 82 % of calls have generationNumber=0. That's the path worth
optimising.

### The shim

`docs/lib/fast-refs.mjs` is the symmetric side-effecting import to
`fast-deflate`:

```js
import { PDFRef } from "pdf-lib";

if (!PDFRef.__fastPoolInstalled) {
  const original = PDFRef.of;
  const pool0 = [];
  PDFRef.of = function fastOf(objectNumber, generationNumber) {
    if (generationNumber === undefined || generationNumber === 0) {
      const existing = pool0[objectNumber];
      if (existing) return existing;
      const fresh = original.call(PDFRef, objectNumber, 0);
      pool0[objectNumber] = fresh;
      return fresh;
    }
    return original.call(PDFRef, objectNumber, generationNumber);
  };
  PDFRef.__fastPoolInstalled = true;
}
```

Dense-array indexed by `objectNumber` for the gen=0 case -- no
string alloc, no Map hash, just an array read. gen != 0 passes
through to the original (which still allocates the tag and runs
the Map lookup, but that's only 18 % of calls).

The cache is **in front of** the original `PDFRef.of`, not a
replacement: on a miss we call the original to produce the PDFRef
instance, then cache it. That dodges the module-private `ENFORCER`
token the upstream constructor demands. Memory cost is a second
reference per PDFRef on top of the upstream pool's entry -- ~228 k
tiny objects, negligible.

The interning contract is preserved: `PDFRef.of(42) === PDFRef.of(42, 0)`
and both `!== PDFRef.of(42, 1)`, as before.

### Results: profiler-on vs profiler-off matters

First A/B with the process-phase profiler attached (paired,
`--detach-pages --no-timing --cpu-profile-process --cpu-sampling 100
--fast-deflate [--fast-refs]`):

| metric    | pre (no fast-refs) | post (+ fast-refs) | Δ |
| ---       | ---                | ---                | --- |
| process   | 2.94 s             | 2.52 s             | **-0.42 s (-14 %)** |
| ↳ load    | 1.81 s             | 1.42 s             | -0.39 s |
| ↳ save    | 1.12 s             | 1.08 s             | flat |
| `PDFRef.of` self in profile | 336 ms (12 %) | 148 ms (5.9 %) | -188 ms |
| `(garbage collector)` self  | 262 ms (9 %) | 194 ms (7.8 %) | -68 ms |

`PDFRef.of`'s self-time roughly halved, GC pressure dropped, and
the wall-clock saving (390 ms on load) looked like a clean win.

But: paired A/B *without* the profiler attached told a different
story:

| metric    | pre (no fast-refs) | post (+ fast-refs) | Δ |
| ---       | ---                | ---                | --- |
| process   | 2.48 s             | 2.26 s             | **-0.22 s (-9 %)** |
| ↳ load    | 1.51 s             | 1.27 s             | **-0.24 s (-16 %)** |
| ↳ save    | 0.96 s             | 0.98 s             | flat |

**Real wall-clock saving is ~240 ms**, not 390 ms. The remaining
~150 ms of the profiler-on delta was profiler-attribution overhead
that our shim removed by making the hot function shorter -- fewer
samples landing on `PDFRef.of`, less per-sample tax. The profiler
isn't lying about which function is expensive; it's overstating
*how much* that expense will move wall-clock once you fix it.

The diagnostic question to tell these apart: *what's the call
rate?* At 1.2 M calls per load, even a few microseconds of
sampling overhead per call adds up to hundreds of milliseconds in
the profile. Functions called millions of times need a no-profile
A/B as a sanity check before claiming the wall-clock saving the
profile implied. Functions called a few times per page (or once
per render) don't.

Both numbers are real -- the bottom-up profile is the right
*target* for "what's worth fixing," but a no-profile A/B is the
right *measurement* for "how big the win was."

### Production confirmation

`book.bat` with both shims, two consecutive runs:

```
render:   9.1s   (1651 pages)
generate: 37.5s
process:  2.3s
saved:    docs\_pdf\book.pdf  (16.1 MB)
total:    50.7s
```

Process dropped from the prior 2.5 s (with just `fast-deflate`) to
2.3 s. `book.bat` rounds to 0.1 s and is single-run so individual
phase numbers carry some run-to-run jitter, but the harness's
2.48 → 2.26 paired-A/B confirms the ~200 ms move is real.

### What this didn't fix

The post-`fast-refs` bottom-up table:

```
samples: 4668   duration: 2.53s   us/sample: 542

   self_ms   self_%   function                   source
   -------   ------   --------------------------------------------------
    341.17   13.59%   writeSync                  (Node libuv -- zlib's C++ work)
    194.41    7.75%   (garbage collector)
    181.96    7.25%   PDFDict.entries            pdf-lib/.../PDFDict.js:22
    172.21    6.86%   decodeName                 pdf-lib/.../PDFName.js:9
    147.84    5.89%   PDFRef.of                  pdf-lib/.../PDFRef.js:34  (the 18 % gen != 0 residue)
     96.40    3.84%   parseName
     95.31    3.80%   parseRawNumber
     78.52    3.13%   parseDict
     ...
```

`PDFRef.of` is still on the list at 148 ms -- that's the 221 k
gen != 0 calls still going through the upstream string-keyed Map.
Optimising those would require either: (a) a 2D structure keyed by
gen first then objectNumber, or (b) accepting that the in-ObjStm
"index as generation" usage is short-lived bookkeeping (the parser
creates these refs once to populate xref tables, then mostly
re-resolves the actual `N 0 R` form). Neither moves the wall-clock
total enough to justify -- 150 ms of a 50 s build is the noise floor.

Above `PDFRef.of`, the load-phase costs (`decodeName`, `parseName`,
`parseRawNumber`, `parseDict`, etc.) are pdf-lib's actual parser
work. Those are O(input size) and pretty close to fundamental --
shrinking them would mean rewriting the parser.

### What's left on save

After the fast-refs shim the process-phase profile's top
self-time entry was still `writeSync` at ~340 ms / 12 %. The name
is misleading -- not `fs.writeFileSync` writing the output PDF,
but `node:zlib`'s native binding inside `deflateSync`.
`find-callers` attributes the chain:

```
writeSync                 344 ms   (zlib native)
  processChunkSync        node:zlib:399
  zlibBufferSync          node:zlib:165
    PDFFlateStream.computeContents     186 ms   (pdf-lib stream compression)
    fastDeflate (our shim)             130 ms
    syncBufferWrapper                   34 ms
```

So the cost is pure CPU-bound deflate during `pdfDoc.save()`. The
streams being compressed: pdf-lib's `PDFStreamWriter` (the default
when `useObjectStreams: true`) groups every non-stream,
non-encrypted, gen=0 indirect object into `PDFObjectStream` chunks
of 50, deflates each, and writes the result. On the book that's
~4,500 chunks, each a small deflate job, all running serially on
the main thread.

## Parallelising save's deflate on libuv's pool

### Why not just async-deflate inline

pdf-lib's serializer is synchronous at the relevant call sites:
`PDFFlateStream.computeContents`
(`pdf-lib/.../structures/PDFFlateStream.js:13`) is a closure that
returns `pako.deflate(unencodedContents)` inline, called from
`cache.access()` during `sizeInBytes()`. Swapping `deflateSync` →
async `deflate` would mean rewriting the whole save path to await
every stream. The call sites don't expect a promise.

### Why not `useObjectStreams: false`

The one-liner that skips the whole problem. Measured on the book:

| variant | save | process | PDF size |
| --- | --- | --- | --- |
| pdf-lib default (objectsPerStream=50, sync) | 1.01 s | 2.30 s | 16.1 MB |
| `useObjectStreams: false`                   | 0.59 s | 2.17 s | **40.5 MB** |

A 2.5x file-size regression. The whole point of pdf-lib's
roundtrip over Chrome's raw output was to compress those streams.
Not an option.

### What actually worked: parallel pre-deflate + larger chunks

`docs/lib/parallel-deflate.mjs` subclasses pdf-lib's
`PDFStreamWriter` and splits its `computeBufferSize` into three
phases:

1. **Classify** indirect objects into uncompressed (streams,
   encrypt, gen != 0) vs compressed chunks of N. Same logic as
   upstream, no behaviour change.
2. **Instantiate all `PDFObjectStream`s up-front**, snapshot their
   unencoded contents, then `await Promise.all` an async
   `zlib.deflate` per stream. Libuv's thread pool (default 4) runs
   them concurrently. Write each result into the stream's
   `contentsCache.value`.
3. **Size + emit** -- same as upstream, but every `cache.access()`
   is a hit, so save's loop never touches deflate.

The xrefStream is one more `PDFFlateStream` but its contents
depend on the offsets computed in phase 3, so we pre-deflate it
via `node:zlib.deflateSync` right after those offsets are pinned
-- one stream, sync is fine, and pre-populating its cache means
`computeIndirectObjectSize` later is a hit too. The net effect:
every deflate that happens during a save goes through `node:zlib`,
and pdf-lib's pure-JS fallback never runs.

Exposed as `parallelSave(pdfDoc, options)`. Drop-in for
`pdfDoc.save` when `useObjectStreams: true` -- same pre-serialize
hooks (addDefaultPage, updateFieldAppearances, flush),
byte-near-equivalent output (zlib's LZ77 match choices may differ
from pdf-lib's default deflate library at the byte level, but the
wire format is identical).

### First try with default `objectsPerStream=50` was slower

Profile diff (paired `--cpu-profile-process --cpu-sampling 100`):

| metric | serial (default) | parallel @ 50 (4,523 streams) | Δ |
| --- | --- | --- | --- |
| `writeSync` self  | 345 ms | 79 ms | **-266 ms** |
| `write` (native, libuv setup) | <1 ms | 118 ms | **+117 ms** |
| `close` (native, libuv teardown) | <1 ms | 96 ms | **+95 ms** |
| net main-thread zlib + libuv overhead | 346 ms | 293 ms | -53 ms |

The actual deflate work did move off-thread (`writeSync` dropped
sharply), but libuv's per-`uv_work_t` dispatch overhead on 4,523
tiny jobs ate most of the savings. ~50 µs/job × ~4,500 jobs ≈
225 ms of pure dispatch.

### Fix: bigger chunks via `objectsPerStream: 500`

Ten-fold-larger object streams cut the chunk count from ~4,500 to
~450. Same total deflate work, but in ~450 jobs instead of ~4,500
-- libuv overhead drops by ~10x. Side benefit: larger chunks share
a deflate window, so the output PDF is ~5 % smaller (16.1 MB →
15.3 MB).

Profile diff at `objectsPerStream: 500`
(paired `--cpu-profile-process --cpu-sampling 100`):

| metric                                          | serial @ 500 | parallel @ 500 | Δ |
| ---                                             | ---          | ---            | --- |
| `writeSync` self (zlib native, main thread)     | 335 ms       | 33 ms          | **-302 ms** |
| `close` (libuv finalize)                        | 1.7 ms       | 15 ms          | +13 ms |
| `PDFFlateStream.computeContents`                | 20 ms        | 4 ms           | -16 ms |
| **total zlib-related main-thread self-time**    | **360 ms**   | **54 ms**      | **-306 ms (-85 %)** |
| bottom-up: `writeSync` position                 | #1 (8.25 %)  | not in top 12  | gone |

The 306 ms moved off the main thread to libuv's pool, where Node's
V8 profiler doesn't sample it -- the headline "writeSync gone from
the top 12" is the on-CPU-budget that save() pays.

### Wall-clock note

This whole sub-investigation deliberately compared profiles only,
not wall-clock. The dev machine was busy with other work, and
process is a ~2 s phase whose run-to-run jitter on a loaded system
exceeds the expected delta. The profile diff cuts through that:
306 ms of native zlib disappearing from the main-thread budget is
a structural change that's stable across noise. A clean-machine
wall-clock A/B would close the loop, but the optimisation is
shippable on profile evidence alone.

### Wired into production

`render-book.mjs` swaps
`pdfDoc.save({ objectsPerTick: Infinity })` for
`parallelSave(pdfDoc, { objectsPerTick: Infinity, objectsPerStream: 500 })`.
Smoke test on the book:

```
render:   8.6s  (1651 pages)
generate: 39.2s  (raw 39.3 MB)
process:  2.2s
saved:    docs\_pdf\book.pdf  (15.3 MB)
total:    51.9s
```

The 15.3 MB output (down from 16.1 MB) is the chunk-size effect;
the parallel deflate doesn't change byte size, only where the work
runs.

The harness exposes the same via `--parallel-deflate` (which calls
`parallelSave` with the same defaults).

### Retiring `fast-deflate.mjs`

Once `parallelSave` also pre-deflates the xrefStream, pdf-lib's
lazy `cache.populate()` deflate path is **never invoked at
runtime**. Every `PDFObjectStream` is parallel-deflated in phase 2;
the xrefStream is sync-deflated in phase 3. Both go through
`node:zlib`. There's no remaining call site for pdf-lib's pure-JS
fallback during a save.

The `fast-deflate.mjs` shim that used to monkey-patch
`pako.deflate` is therefore redundant -- it was a per-call dispatch
optimisation for a code path we no longer take. Deleted:

- `docs/lib/fast-deflate.mjs` -- removed.
- `import './lib/fast-deflate.mjs'` -- removed from
  `render-book.mjs`.
- `--fast-deflate` -- removed from the `measure.mjs` flag set.

Smoke profile after removal (`--parallel-deflate --fast-refs
--cpu-profile-process`, no fast-deflate import anywhere): 0 frames
matching `pako`, 0 matches for `computeContents`, 0 for
`fastDeflate`. Process phase 2.34 s, output 15.3 MB.

The deletion is purely a cleanup -- profile-equivalent to before
-- but it removes 38 lines of indirection and one transitive
concern.

### Routing inflate through `node:zlib` too

One call site on the load side still went through pdf-lib's pako:
`PDFCrossRefStreamParser` decompresses the xref stream's payload
via `pako.inflate` during `PDFDocument.load`. Cost is tiny -- one
inflate per load, ~3 ms -- but it's the last pdf-lib → pako edge
in the runtime, and the dispatch story for the README is cleaner
when "every zlib call goes through `node:zlib`" is true on both
sides.

`docs/lib/fast-inflate.mjs` is the symmetric counterpart to the
retired `fast-deflate.mjs`:

```js
import { inflateSync } from "node:zlib";
import pako from "pako";

if (!pako.__fastInflateInstalled) {
  const original = pako.inflate;
  pako.inflate = function fastInflate(data, options) {
    if (options) return original.call(pako, data, options);
    return inflateSync(data);
  };
  pako.__fastInflateInstalled = true;
}
```

`render-book.mjs` imports it unconditionally next to `fast-refs`.
No harness flag -- the per-load cost is below the profile noise
floor; this lands for the architectural reason, not a measurable
win.

## `BaseParser.parseRawNumber` + `parseRawInt`: direct-integer accumulators

After `fast-deflate` + `fast-refs` + `parallel-deflate`, the load
side of the bottom-up table shifted onto the parser frames. Two of
them are `BaseParser.parseRawNumber` (called once per numeric
token, twice per `N gen R` indirect reference) and
`BaseParser.parseRawInt` (called twice per indirect-object header
and twice per object inside an `ObjStm`). Between them they fire
hundreds of thousands of times per load on the book.

The upstream implementation
(`pdf-lib/.../parser/BaseParser.js:33`) builds the number as a
string, one character at a time, then converts:

```js
let value = '';
while (!this.bytes.done() && IsDigit[this.bytes.peek()]) {
  value += charFromCode(this.bytes.next());
}
// ... fractional part, sign handling ...
const numberValue = Number(value);
if (!isFinite(numberValue) || numberValue > Number.MAX_SAFE_INTEGER) { ... }
return numberValue;
```

Every call allocates a throwaway string of length 1..N (one `+=`
allocation per digit), then runs `Number(value)` to parse the
string back into a double, then runs guards. The string allocation
+ `Number()` round-trip is the cost we care about.

### The shim

`docs/lib/fast-parse-number.mjs` mutates both
`BaseParser.prototype.parseRawNumber` and
`BaseParser.prototype.parseRawInt` to accumulate the integer
directly (`n = n * 10 + (byte - 0x30)`). The number variant
additionally descends into decimal handling when a period appears.
Both fall back to the original for:

- **More than 15 integer digits** -- direct accumulation could
  exceed `Number.MAX_SAFE_INTEGER` (16 digits) and silently lose
  precision. Upstream's `Number(value)` retains correctly-rounded
  double precision in that range and emits the spec-mandated
  overflow warning, so we rewind and delegate.
- **Empty-digit cases** (e.g. `+`, `.`, bare sign) -- rewind and
  let upstream throw `NumberParsingError` with full diagnostic
  context. Both fallback paths are vanishingly rare on real PDFs.

`BaseParser` isn't re-exported by pdf-lib's index, so we reach it
via the package's CJS internal path through `createRequire`:

```js
const require = createRequire(import.meta.url);
const BaseParser = require('pdf-lib/cjs/core/parser/BaseParser.js').default;
```

Mutating `BaseParser.prototype` propagates to every subclass --
`PDFParser`, `PDFObjectParser`, `PDFObjectStreamParser`,
`PDFXRefStreamParser`. One side-effecting import covers them all.

`render-book.mjs` imports it unconditionally next to `fast-refs`.
No harness flag yet; the win is small per-call but the call rate
is high enough to matter -- to be measured later when the
follow-on work (size-in-bytes / iterator / parseDict shims) makes
the parser side worth quantifying as a group.

## `decodeName`: skip the regex on the 99.999 % no-`#` path

The earlier closing summary above wrote off `decodeName` as "close
to fundamental pdf-lib work." Re-reading the function on a later
pass disproved that.

`pdf-lib/.../objects/PDFName.js:9`:

```js
var decodeName = function (name) {
    return name.replace(/#([\dABCDEF]{2})/g, function (_, hex) {
        return utils_1.charFromHexCode(hex);
    });
};
```

PDF spec (ISO 32000-1 §7.3.5) requires `#XX` hex-escape for any
byte outside the printable-ASCII regular range plus delimiters /
whitespace. `decodeName` reverses that on every `PDFName.of(name)`
call so the pool key is the canonical decoded form, dedup'ing
`/foo#20bar` and `/foo bar` to the same instance.

The catch: the regex has to scan every byte of every name looking
for `#`, even when there is none.

### Workload shape

Instrumented `PDFName.of` on the book, counting calls and how
often the input contains a `#`:

```
PDFName.of calls       : 2,759,635
  raw input has # char : 2 (0.000%)
```

Two. In 2.76 million calls. The other 2,759,633 are regex scans
against strings like `Type`, `S`, `P`, `Pg`, `StructElem`, `Kids`,
`Count`, `Filter`, `FlateDecode` -- ordinary PDF names that need
no escaping. We measured ~214 ms (7 %) of process self-time on
`decodeName` and another ~91 ms on `PDFName.of`'s body that calls
it.

### The shim

`docs/lib/fast-decode-name.mjs` follows the `fast-refs.mjs` shape:
cache in front of `PDFName.of` rather than replacing it. The key
insight is that when `name` has no `#`, the decoded form equals
the raw form, so the raw `name` is already a valid pool key for
pdf-lib's internal dedup pool -- a fast-side `Map<string, PDFName>`
keyed by the raw input returns the same `PDFName` instance pdf-lib
would have produced after a regex scan + pool lookup, without ever
running the regex.

```js
import { PDFName } from "pdf-lib";

if (!PDFName.__fastDecodeNameInstalled) {
  const original = PDFName.of;
  const fastCache = new Map();
  PDFName.of = function fastOf(name) {
    if (name.indexOf("#") === -1) {
      const cached = fastCache.get(name);
      if (cached) return cached;
      const instance = original.call(PDFName, name);
      fastCache.set(name, instance);
      return instance;
    }
    return original.call(PDFName, name);
  };
  PDFName.__fastDecodeNameInstalled = true;
}
```

Names with `#` fall through to the original -- the dual canonical-
form contract is preserved exactly. Static `PDFName.Length`,
`PDFName.FlateDecode`, ... initialisers ran when pdf-lib's module
body executed (before the shim imports), so pdf-lib's pool is
already populated with the canonical instances; the parser then
hits the fast cache on every subsequent reference.

### Results

Paired A/B, four interleaved runs (`pre1 post1 pre2 post2`),
`--detach-pages --no-timing --fast-refs --parallel-deflate
--cpu-profile-process --cpu-sampling 100`, same 1651-page book:

| metric        | pre avg | post avg | Δ                |
| ------------- | ------- | -------- | ---------------- |
| **process**   | **2.74 s** | **2.21 s** | **-0.53 s (-19 %)** |
| ↳ load        | 1.69 s  | 1.40 s   | -0.29 s (-17 %) |
| ↳ setOutline  | 0.01 s  | 0.01 s   | unchanged |
| ↳ save        | 1.04 s  | 0.81 s   | -0.23 s (-22 %) |
| pdf size      | 16.1 MB | 16.1 MB  | byte-identical pairwise (pre1↔post1, pre2↔post2; 31 B intra-pair drift is `/CreationDate`) |

The load drop is what the instrumentation predicted. The save drop
was a surprise -- save doesn't call `PDFName.of` to build outline
metadata in the hot path, so the saving is almost certainly GC
pressure relief from no longer allocating ~2.76 M regex-match
objects during load.

Profile diff (single run each, same flags):

| function | PRE | POST | Δ |
| --- | --- | --- | --- |
| `decodeName`             | 214 ms (7.4 %) | not in top 15 | **-214 ms** |
| `PDFName.of`             |  91 ms (3.1 %) | not in top 15 | **-91 ms** |
| `fastOf` (the shim body) | n/a            |  91 ms (4.1 %) | +91 ms |
| `(garbage collector)`    | 339 ms (11.7 %) | 238 ms (10.8 %) | -101 ms |
| profile duration         | 2.92 s         | 2.22 s | -0.70 s |

The `fastOf` row sits at the same self-time as the old
`PDFName.of` forwarder (~91 ms) -- that's the per-call cost of the
`indexOf` check + `fastCache.get` + return, which all calls now
pay. The 214 ms `decodeName` row is gone entirely (regex never
runs on the fast path), and the GC drop is the allocator relief.

### Production confirmation

Two consecutive `book.bat` runs with all four shims live
(`fast-refs`, `fast-parse-number`, `parallel-deflate`,
`fast-decode-name`):

| metric | run 1 | run 2 |
| --- | --- | --- |
| render   | 8.9 s | 8.3 s |
| generate | 39.3 s | 37.6 s |
| process  | **1.6 s** | **1.6 s** |
| total    | 51.8 s | 50.0 s |

Process is now ~1.6 s on the production path, off the profiler.
The harness numbers above are higher (~2.2 s post-fix) because of
profiler-on attribution overhead at 100 us sampling -- the same
caveat the `PDFRef.of` section flagged. The paired-A/B delta from
the harness (-0.53 s) is the correct measure of the shim's win;
the absolute 1.6 s is the production floor.

### Methodology note

This one almost didn't get found. The earlier "what's left" summary
explicitly wrote `decodeName` off as "close to fundamental" parser
work, on the strength of it living in a single regex line. The
actual investigation took 30 seconds: read the function, ask
"what's the hit rate of that regex on real PDF names?", instrument
with a one-liner counter, find that the answer is 0.0001 %. Worth
re-checking the "fundamental" label on remaining JS-body rows
whenever a small change to the workload might invert it.

## `numberToString`: skip the redundant toString/split on the 100 % no-`e` path

`pdf-lib/.../utils/numbers.js:13` is pdf-lib's `.toString()`
replacement that suppresses exponential notation -- PDF syntax
requires plain decimal in the object body (`1e-7` is invalid), so
every numeric token written into the file goes through:

```js
exports.numberToString = function (num) {
    var numStr = String(num);
    if (Math.abs(num) < 1.0) {
        var e = parseInt(num.toString().split('e-')[1]);
        if (e) { /* expand "1e-7" -> "0.0000001" */ }
    } else {
        var e = parseInt(num.toString().split('+')[1]);
        if (e > 20) { /* expand "1e+21" -> "100...0" */ }
    }
    return numStr;
};
```

`numStr` is computed up front via `String(num)`. Then -- regardless
of whether `numStr` actually contains an `e` -- the function calls
`num.toString()` *again*, allocates a `.split(...)` array, and
runs `parseInt` on the (almost always undefined) result. Pure
overhead on every call where `String(num)` already returned a
plain decimal, which on a real PDF is every call.

### Workload shape

Instrumented `numberToString` on the book, counting fast-path
(`String(num).indexOf('e') === -1`) vs slow-path hits:

```
numberToString calls : 290,231
  String(num) has 'e' : 0 (0.000 %)
```

Zero. Of 290 k calls. `String(num)` returns exponential notation
only when `|num| < 1e-6` or `|num| >= 1e21`, and a PDF's object
refs, generations, byte offsets, content-stream coordinates,
`/Size`, `/Length` etc. never land in either tail. The credit-card
trick guarding the `e` cases is paid 290 k times to handle 0.

### The shim

`docs/lib/fast-number-to-string.mjs` short-circuits the no-`e`
case and delegates the rare exponential cases to the original
implementation unchanged:

```js
const fastNumberToString = function fastNumberToString(num) {
  const numStr = String(num);
  if (numStr.indexOf('e') === -1) return numStr;
  return original(num);
};
numbers.numberToString     = fastNumberToString;
utilsBarrel.numberToString = fastNumberToString;
topBarrel.numberToString   = fastNumberToString;
```

### Wiring gotcha: tslib 1.x value-copy re-exports

pdf-lib ships compiled against `tslib@1.14.1`, whose
`__exportStar` is:

```js
function (m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) exports[p] = m[p];
}
```

A plain value-copy. tslib 2.x replaced this with a live getter
(`Object.defineProperty(o, p, { get: () => m[p] })`), so on modern
compilations a single `numbers.numberToString = fast` patch would
propagate through every re-export automatically. On 1.x it
doesn't.

`PDFNumber`'s call site -- the only consumer of `numberToString`
in pdf-lib's source -- reads from the utils-barrel, not from
`numbers.js` directly:

```js
// PDFNumber.js
var index_1 = require("../../utils/index");
...
_this.stringValue = index_1.numberToString(value);   // <-- captured copy
```

Because `import { PDFDocument } from 'pdf-lib'` runs *before* the
shim's dynamic import, the barrel has already executed
`__exportStar(numbersModule, exports)` and stamped its own copy of
the original function. Mutating `numbers.numberToString`
afterwards is invisible to `PDFNumber`. The first iteration of
this shim looked installed (the standalone test showed the patched
function on the barrel, because that test imported the barrel
*after* the shim) but the harness counter recorded 0 hits on the
patched body -- the upstream function was still hot in the profile
under its original name.

Fix: patch every re-export in the chain that captures by value:
`utils/numbers` (the source), `utils/index` (the barrel
`PDFNumber` reads from), and `cjs/index` (pdf-lib's top-level,
which `__exportStar`s the utils barrel onward to anyone importing
from `'pdf-lib'`). All three get the same `fastNumberToString`
reference.

The `fast-decode-name` / `fast-refs` / `fast-parse-number` shims
don't hit this trap because their targets are class-static methods
(`PDFName.of`, `PDFRef.of`) or `BaseParser.prototype` methods --
all looked up at call time via the class/prototype object, not via
a captured value. `numberToString` is the first free function
we've patched in pdf-lib.

### Results

Paired A/B, two interleaved runs each (`pre1 post1 pre2 post2`),
`--detach-pages --no-timing --fast-refs --parallel-deflate
--fast-decode-name --cpu-profile-process --cpu-sampling 100`,
same 1638-page book:

| metric                                  | pre1   | pre2   | post1  | post2  |
| ---                                     | ---    | ---    | ---    | ---    |
| upstream `numberToString` self-time     | 45 ms  | 51 ms  | 0 ms   | 0 ms   |
| shim `fastNumberToString` self-time     | n/a    | n/a    | 5 ms   | 12 ms  |
| **combined self-time on this function** | **45 ms** | **51 ms** | **5 ms** | **12 ms** |
| slow-path delegations to original       | n/a    | n/a    | 0      | 0      |

The `String(num).indexOf('e') === -1` short-circuit fires on 100 %
of calls; the upstream function is unreachable in practice.
Function-level self-time drops by ~80 % (~40 ms saved on the hot
function), the redundant `num.toString()` + `.split(...)` +
`parseInt(...)` work gone from the trace.

Wall-clock process-phase numbers on this dev machine bounce around
enough run-to-run (~±0.15 s) that the ~40 ms function-level saving
is invisible at the phase total -- both pre and post sit near
2.05 s. The profile-level evidence is the real signal: the cycles
were redundant, they're not being spent any more.

### Methodology note

The first cut of this shim mutated `numbers.numberToString` only,
following the assumption that pdf-lib's re-exports would propagate
the change. The hit counter (`fast=0 slow=0` on a full book run)
caught the mistake before the README evidence was written -- a
shim that *looks* installed but never actually runs would have
shown identical "before" and "after" profile numbers within noise,
indistinguishable from a no-op patch.

Lesson for the next pdf-lib shim of a free function (rather than a
class method): check `tslib.__exportStar`'s shape before assuming
a single-site patch works.

## `sizeInBytes`: stop allocating a base-2 string just to count its bits

A fresh process-phase profile under the post-`fast-decode-name` /
`fast-number-to-string` shipping set (1638-page book, `--fast-refs
--parallel-deflate --fast-decode-name --fast-number-to-string
--cpu-profile-process --cpu-sampling 100`) put process at 1.95 s
and showed an oddly-shaped row in the top-15:

```
   self_ms   self_%   function  @  source
   -------   ------   ----------------------------------------------
    213.02   10.97%   (garbage collector)
    171.60    8.83%   PDFDict.entries          pdf-lib/PDFDict.js:22
    144.16    7.42%   PDFRef.of                pdf-lib/PDFRef.js:34
    ...
     56.48    2.91%   exports.sizeInBytes      pdf-lib/utils/numbers.js:37
```

`sizeInBytes` is a four-line utility:

```js
exports.sizeInBytes = function (n) { return Math.ceil(n.toString(2).length / 8); };
```

It computes how many bytes a non-negative integer takes by
stringifying it as base-2, counting characters, and dividing by 8.
The string is thrown away immediately.

`find-callers.mjs` attributed the 56 ms across two callers, both
inside the xref-stream writer:

| caller | attributed |
| --- | --- |
| `bytesFor` (`utils/numbers.js:49`) -- sizes the `Uint8Array` that gets filled byte-by-byte | 29.6 ms |
| `PDFCrossRefStream.computeMaxEntryByteWidths` (`structures/PDFCrossRefStream.js:66`) -- 3 calls per xref entry to compute the `/W` widths | 26.9 ms |

For a ~50 k-object PDF that's roughly 300 k `n.toString(2)` calls
per save, each allocating a short-lived 1-to-32-char string.
Likely a contributor to the 213 ms GC at the top of the table too.

### The shim

`docs/lib/fast-size-in-bytes.mjs` replaces `utils.sizeInBytes`
with a non-allocating short-circuit ladder:

```js
function fastSizeInBytes(n) {
  if (n < 0x100) return 1;
  if (n < 0x10000) return 2;
  if (n < 0x1000000) return 3;
  if (n < 0x100000000) return 4;
  return 4 + Math.ceil((32 - Math.clz32(Math.floor(n / 0x100000000))) / 8);
}
```

The ladder shape matches the actual value distribution in
`computeEntryTuples`. The xref entry tuples are
`(type, second, third)` where:

- `type` is 0, 1, or 2 (1 byte, always)
- `gen` / `index` are small (1-2 bytes)
- `offset` for uncompressed entries reaches 3-4 bytes on a 16 MB
  PDF
- `nextFreeObjectNumber` for deleted entries is small

So most calls take the very first branch. A `Math.clz32`-based
alternative would be simpler but slower in the common case,
because it always pays for the native call + sub + div + ceil.
The ladder exits in one compare for the dominant case.

Triple-patch shape mirrors `fast-number-to-string.mjs` -- pdf-lib
ships compiled against tslib 1.x whose `__exportStar` value-copies
re-exports rather than installing live getters, so consumers that
read `sizeInBytes` through a barrel (`PDFCrossRefStream` does:
`utils_1.sizeInBytes(...)`) hold a captured reference. Patch the
source module, the utils/index barrel, and the top-level index to
cover every observed call site. `utils.bytesFor` reads
`exports.sizeInBytes` at call time from the same module object we
mutate first, so it picks up the fast path without a separate
patch.

### Results

A/B (2 runs each, `--fast-refs --parallel-deflate
--fast-decode-name --fast-number-to-string --cpu-profile-process
--cpu-sampling 100`, with `--fast-size-in-bytes` the only
difference):

| run | PRE | POST |
| --- | --- | --- |
| 1 | 1.95 s | 1.91 s |
| 2 | 2.01 s | 1.93 s |
| **avg** | **1.98 s** | **1.92 s** |
| save sub-phase avg | 0.80 s | 0.73 s |

**Δ = -60 ms process (-3.0 %).** The save sub-phase carries
-70 ms of that -- exactly where `sizeInBytes` lives (xref writer
fires during save, not load), so the attribution lines up.

Profile self-time, POST run:

- `exports.sizeInBytes` row: 56.48 ms → undetectable. V8 inlined
  the ladder into both callers; `fastSizeInBytes` doesn't appear
  in the profile by name either.
- GC: 213 ms → 201 ms (-12 ms, consistent with no longer
  allocating ~300 k short-lived base-2 strings per save).
- No cost migration to other rows. The surrounding parser /
  writer rows are flat within noise.

PDF byte-equivalent (31-byte `/CreationDate` drift between PRE
and POST -- well inside the standard timestamp band).

### Side finding: the harness flag set wasn't tracking production

While landing this change, the harness flag set was audited
against `render-book.mjs`'s imports. `render-book.mjs` was
importing five `fast-*` shims (`fast-refs`, `fast-inflate`,
`fast-parse-number`, `fast-decode-name`, `fast-number-to-string`),
but `measure.mjs` only exposed three of them as flags
(`--fast-refs`, `--fast-decode-name`, `--fast-number-to-string`).
So the canonical process-profile command was measuring a *subset*
of what production actually runs -- two production shims
(`fast-inflate` and `fast-parse-number`) had been on for
production and silently off for the perf harness.

Wall-clock impact of that gap is small in absolute terms (the two
missing shims target the load sub-phase, which is ~1.2 s out of
the 1.95 s process total), but the bottom-up table in the
canonical command was attributing time to functions that don't
run that way in production. Fixed in the same change: `measure.mjs`
now exposes `--fast-inflate` and `--fast-parse-number`, and the
canonical command in the README lists all five production shims
plus `--fast-size-in-bytes`.

The general lesson: when a new shim lands, audit the harness's
flag set against `render-book.mjs`'s import list. A flag missing
on the harness side silently moves the harness baseline away from
production -- and the divergence accumulates over time.

## `PDFDict.entries`: stop allocating a tuple array per save

A profile of the process phase with every prior shipping shim
applied still showed `PDFDict.entries` at the top of the non-GC
self-time table, ~10 % of process. The function is a one-liner:

```js
PDFDict.prototype.entries = function () {
    return Array.from(this.dict.entries());
};
```

Per call: one `MapIterator` + one outer Array + one fresh
`[key, value]` tuple per entry (allocated by the iterator itself,
then collected by `Array.from` into the outer array). The save
path fires both consumers on every dict -- `sizeInBytes` first to
measure, then `copyBytesInto` to write -- so on the book that's
~100 k `Array.from` calls feeding the GC. `(garbage collector)`
sat at the top of the table too, which is the cost shape the
allocation pattern predicts.

Both consumers immediately destructure the tuples:

```js
var entries = this.entries();
for (var idx = 0, len = entries.length; idx < len; idx++) {
    var _a = entries[idx], key = _a[0], value = _a[1];
    ...
}
```

So nothing actually wants the array-of-tuples shape -- the
upstream code uses it because that's what `entries()` returns,
and the materialised array is dead by the next iteration.

### The shim

`docs/lib/fast-dict-iter.mjs` replaces
`PDFDict.prototype.sizeInBytes` and
`PDFDict.prototype.copyBytesInto` with versions that iterate the
underlying Map in place via `Map.prototype.forEach((value, key),
thisArg)`. The callback's positional `(value, key)` arguments
mean no tuple is ever allocated, and routing per-call state
through `forEach`'s `thisArg` instead of closure capture lets the
callback stay a module-level function reference (no per-call
closure context).

The callbacks are hoisted to module top-level (not closures):

```js
function _sizeInBytesEntry(value, key) {
  this.s += key.sizeInBytes() + value.sizeInBytes() + 2;
}
function _copyBytesIntoEntry(value, key) {
  const buf = this.buf;
  let off = this.off;
  off += key.copyBytesInto(buf, off);
  buf[off++] = CharCodes.Space;
  off += value.copyBytesInto(buf, off);
  buf[off++] = CharCodes.Newline;
  this.off = off;
}
```

Each consumer allocates a single small `ctx` object per call (one
alloc, vs the prior `1 + N` Array allocations) and threads it
through `thisArg`:

```js
PDFDict.prototype.copyBytesInto = function (buffer, offset) {
  // ... write '<<\n' ...
  const ctx = { buf: buffer, off: offset };
  this.dict.forEach(_copyBytesIntoEntry, ctx);
  offset = ctx.off;
  // ... write '>>' ...
};
```

The `PDFDict.prototype.entries` method itself stays untouched --
`clone()` and `toString()` still call it and rely on the
array-of-tuples contract. Those paths fire rarely (clone on
incremental updates, toString in debug output) and don't justify
the contract churn.

### Results

Profile diff, both runs `--detach-pages --no-timing` with every
other shipping shim active, 100 us sampling:

| metric                              | pre        | post       | Δ                  |
| ---                                 | ---        | ---        | ---                |
| `PDFDict.entries` self              | 164.16 ms  | off-list   | **-164 ms (-100 %)** |
| `PDFDict.copyBytesInto` self        | 27.54 ms   | 25.42 ms   | flat               |
| `_copyBytesIntoEntry` (callback)    | n/a        | 23.83 ms   | new                |
| `PDFDict.sizeInBytes` self          | sub-cutoff | 15.89 ms   | n/a                |
| `_sizeInBytesEntry` (callback)      | n/a        | 12.71 ms   | new                |
| **dict-serialisation path subtotal**| **~192 ms (~11 % of process)** | **~78 ms (~5 % of process)** | **~80 ms / -6 pp** |
| `(garbage collector)`               | 201 ms (12 %) | 227 ms (15 %) | +26 ms / +3 pp  |

The 164 ms `entries` self-time is reliably gone. The replacement
work in the four-row split (the two consumers + their named
callbacks) sums to ~78 ms -- about a **6 pp drop** in process
attribution to this code path.

The `(garbage collector)` row going *up* was the surprise. A
first-cut variant of the shim used closures (`forEach((value,
key) => { ... captures `offset` ... })`) and showed the same GC
increase. Hypothesis: the captured-and-mutated `offset` cell was
forcing V8 to heap-allocate a closure context per call. So we
tested the hoisted-callback variant above, which has zero
closure capture. The GC row landed at almost exactly the same
absolute value (~227 ms vs ~271 ms, both ~15 % of process).

So the closure-capture hypothesis was wrong -- V8's escape
analysis was already eliding the `offset` cell. The GC nudge is
either run-to-run load-phase variance (the profile spans load +
setOutline + save, and load dominates) or the per-call `ctx`
object allocation we couldn't avoid without bigger code surgery.
Either way it doesn't reverse the win: the dict-path attributable
time dropped by ~80 ms, and that's real cycles removed.

PDF output is byte-equivalent to the pre-shim build:
`Map.forEach` iterates in insertion order, same as
`Array.from(map.entries())`, so the serialised byte sequence is
identical.

### Lesson: hoist forEach callbacks when state is mutable

The hoisted-callback pattern (callback = module-level function,
state via `forEach`'s `thisArg`) reads as overkill -- a closure
is fewer lines and easier to follow. Two reasons it's still the
right shape here:

1. **Profile attribution.** Named callbacks
   (`_copyBytesIntoEntry`, `_sizeInBytesEntry`) appear in CPU
   profiles under their names. Closures show up as
   `(anonymous) @ file.mjs:55`, which makes future
   profile-reading harder (you have to cross-reference the line
   number every time).
2. **Future-proofing against V8 changes.** Escape analysis can
   handle the closure capture today, but the JIT's heuristics
   shift across Node versions. The hoisted pattern is
   semantically explicit -- no implicit allocation depends on
   the compiler being smart. Same shape that has aged well in
   other hot pdf-lib paths we've patched.

Cost is negligible (six extra lines and two declarations);
upside is the profile reads cleanly and the perf shape is robust
to JIT changes. Worth doing whenever the callback's state
outlives a single iteration.

## `parseDict`: hoist the sentinel `PDFName`s out of the type-dispatch tail

With every other process-phase shim in place, the top of the
bottom-up table looked like:

```
   self_ms   self_%   function  @  source
    194.12   12.49%   (garbage collector)
    127.05    8.18%   PDFRef.of
     86.70    5.58%   PDFObjectParser.parseName
     80.70    5.19%   fastOf                       (fast-decode-name)
     74.70    4.81%   PDFObjectParser.parseDict
     ...
```

`fastOf` -- the cache in front of `PDFName.of` -- shouldn't be
this high. The whole point of `fast-decode-name` is to collapse
`PDFName.of` to a `Map.get` per call. So the question is why so
many calls still hit it.

Reading `PDFObjectParser.parseDict`
(`pdf-lib/.../parser/PDFObjectParser.js:141`) shows the
type-dispatch tail at the bottom:

```js
var Type = dict.get(PDFName.of('Type'));
if (Type === PDFName.of('Catalog')) return PDFCatalog.fromMapWithContext(...);
else if (Type === PDFName.of('Pages')) return PDFPageTree.fromMapWithContext(...);
else if (Type === PDFName.of('Page'))  return PDFPageLeaf.fromMapWithContext(...);
else                                   return PDFDict.fromMapWithContext(...);
```

Four `PDFName.of` calls per dict, **including** the dicts that
have no `/Type` entry at all (resource dicts, font descriptors,
content-stream dicts -- the bulk of what a real PDF contains).
With `fast-decode-name` each call is a `fastCache.get` on a 4-byte
string, which is cheap individually -- but on a 1638-page book
that's tens of thousands of dicts × 4 calls = hundreds of
thousands of cache lookups for the same handful of canonical
`PDFName`s.

### The shim

`docs/lib/fast-parse-dict.mjs` replaces
`PDFObjectParser.prototype.parseDict` with a version that
captures the four sentinel `PDFName`s once at shim-load:

```js
const TypeName    = PDFName.of('Type');
const CatalogName = PDFName.of('Catalog');
const PagesName   = PDFName.of('Pages');
const PageName    = PDFName.of('Page');
```

and references them directly in the type-dispatch tail:

```js
const Type = dict.get(TypeName);
if (Type === CatalogName) return PDFCatalog.fromMapWithContext(dict, this.context);
if (Type === PagesName)   return PDFPageTree.fromMapWithContext(dict, this.context);
if (Type === PageName)    return PDFPageLeaf.fromMapWithContext(dict, this.context);
return PDFDict.fromMapWithContext(dict, this.context);
```

The rest of the function body (the `<< ... >>` parse loop, the
`dict.set` calls, the whitespace skipping) is verbatim. Pool-dedup
guarantees the captured `PDFName`s are `===` to whatever the
parser would have built via the slow `PDFName.of` calls, so the
dispatch identity comparisons work unchanged.

`PDFObjectParser` isn't re-exported from pdf-lib's index, so the
shim reaches in via `pdf-lib/cjs/core/parser/PDFObjectParser.js`
through `createRequire` -- same shape as `fast-parse-number.mjs`
and `fast-dict-iter.mjs`.

### Results

Profile diff, both runs `--detach-pages --no-timing` with every
other shipping shim active, 100 us sampling:

| metric                              | pre        | post       | Δ                  |
| ---                                 | ---        | ---        | ---                |
| `fastOf` self                       | 80.70 ms (5.19 %) | 63.20 ms (4.43 %) | **-17.5 ms (-22 %)** |
| `parseDict` / `fastParseDict` self  | 74.70 ms (4.81 %) | 77.79 ms (5.45 %) | flat (noise)       |
| process wall-clock                  | 1.55 s     | 1.42 s     | -0.13 s (~noise floor) |

The cleanest signal is the `fastOf` drop: removing four
`PDFName.of` calls per dict re-attributes ~17 ms away from the
cache layer. `parseDict`'s own self-time is essentially unchanged
because the four `PDFName.of` calls were already being charged to
`fastOf`, not to `parseDict` (child frames don't roll into parent
self-time). So the optimisation reads as "fastOf got cheaper"
rather than "parseDict got faster," but it's the same removed
work either way.

The 130 ms wall-clock delta is mostly within run-to-run noise on a
1.5 s phase. The mechanism-confirmed ~17 ms via profile
attribution is the honest number.

PDF output is byte-equivalent: same Map iteration order, same
dispatch decisions, same canonical `PDFName` instances.

### Why this is the bottom of the easy wins on parseDict

`fastParseDict` is still in the top 15 (5.45 %), which suggests
more juice in the function. The next-tier targets are all in the
inner loop:

- `!bytes.done() && bytes.peek() !== 0x3E && bytes.peekAhead(1) !== 0x3E`
  -- three method calls per iteration, all reading the underlying
  `Uint8Array`. Inlining would cut method-dispatch overhead but
  requires reaching into `ByteStream`'s internals.
- `dict.set(key, value)` -- Map entry allocation. Could be swapped
  for a plain object via `Object.create(null)`, but
  `PDFDict.fromMapWithContext` and the existing `fast-dict-iter`
  shim both assume a Map, so it's a larger surgery.
- `this.skipWhitespaceAndComments()` -- already on the top-15 list
  in its own right (~32 ms / 2 %). Two-method-call body
  (`skipWhitespace` + `skipComment` loop); inlining at parseDict's
  call site would shed one method-dispatch per loop iteration.

None of these are as clean as the sentinel-hoist patch, and each
is a bigger code change for a smaller individual win. Worth
revisiting if a future optimisation moves the floor and parseDict
becomes a larger relative share.

## `parseObject`: dispatch by first byte, gate the keyword scans

After `fast-parse-dict` shipped, `PDFObjectParser.parseObject` was
the next obvious row in the bottom-up table:

```
   self_ms   self_%   function  @  source
    213.28   13.41%   (garbage collector)
    113.05    7.11%   fastParseDict
     99.12    6.23%   fastOf
     86.87    5.46%   PDFRef.of
     86.32    5.43%   PDFObjectParser.parseName
     81.86    5.15%   PDFObjectParser.parseObject     <-- this row
     ...
```

`parseObject` is the dispatch hub of the PDF object parser. It's
called once per dict value, per array element, and per
indirect-object body -- same call density as `fastParseDict` two
rows above (every dict that fastParseDict builds calls parseObject
N times for its N values).

### What parseObject was doing

The upstream body (`PDFObjectParser.js:36`):

```js
parseObject() {
  this.skipWhitespaceAndComments();
  if (this.matchKeyword(Keywords.true))  return PDFBool.True;
  if (this.matchKeyword(Keywords.false)) return PDFBool.False;
  if (this.matchKeyword(Keywords.null))  return PDFNull;
  const byte = this.bytes.peek();
  if (byte === LessThan && this.bytes.peekAhead(1) === LessThan) return this.parseDictOrStream();
  if (byte === LessThan)          return this.parseHexString();
  if (byte === LeftParen)         return this.parseString();
  if (byte === ForwardSlash)      return this.parseName();
  if (byte === LeftSquareBracket) return this.parseArray();
  if (IsNumeric[byte])            return this.parseNumberOrRef();
  throw new PDFObjectParsingError(this.bytes.position(), byte);
}
```

Three speculative `matchKeyword` calls run on every invocation,
before the dispatch byte is ever peeked. `matchKeyword`
(`BaseParser.js:97`) on a fast-fail mismatch does `bytes.offset()`,
then `bytes.next()` on the first byte of the keyword, comparison,
then `bytes.moveTo(initialOffset)` to restore. Three of those per
`parseObject` call -- multiplied by the hundreds of thousands of
calls per book load -- adds up.

`true` / `false` / `null` are extraordinarily rare in real PDFs.
The bulk of dict values are refs (`N N R`), numbers, names,
sub-dicts, and arrays. Putting the dispatch-byte test *before*
the keyword scans, and only entering `matchKeyword` when the
first byte could plausibly start one of the three keywords,
skips three method calls + a `moveTo` per `parseObject` on the
overwhelming majority of inputs.

### The shim

`docs/lib/fast-parse-object.mjs` replaces
`PDFObjectParser.prototype.parseObject` with:

```js
parseObject() {
  this.skipWhitespaceAndComments();
  const bytes = this.bytes;
  const byte = bytes.peek();
  if (IsNumeric[byte]) return this.parseNumberOrRef();
  if (byte === LessThan) {
    if (bytes.peekAhead(1) === LessThan) return this.parseDictOrStream();
    return this.parseHexString();
  }
  if (byte === ForwardSlash)      return this.parseName();
  if (byte === LeftSquareBracket) return this.parseArray();
  if (byte === LeftParen)         return this.parseString();
  if (byte === t_code && this.matchKeyword(KwTrue))  return PDFBool.True;
  if (byte === f_code && this.matchKeyword(KwFalse)) return PDFBool.False;
  if (byte === n_code && this.matchKeyword(KwNull))  return PDFNull;
  throw new PDFObjectParsingError(bytes.position(), byte);
}
```

Three changes from upstream:

1. Peek the first byte once, up front.
2. Dispatch order reshuffled for dict-value frequency: numbers /
   refs first (`IsNumeric[byte]` is a Uint8Array index, the
   cheapest possible test), then `<<` / `<` (collapsed into one
   `LessThan` branch with the `peekAhead` lookup inside), then
   names, arrays, strings.
3. The three keyword paths are gated -- `byte === t` / `f` / `n`
   guards each `matchKeyword` call, so a non-keyword input never
   pays for the speculative scan + rewind.

Correctness: a value starting with `t`/`f`/`n` that isn't
`true`/`false`/`null` falls through to the same
`PDFObjectParsingError` the upstream code would throw. Dict keys
can't reach parseObject (`parseDict` calls `parseName()` for
keys, parseObject only for values), and names always start with
`/`. Numbers can't start with letters. So the only valid values
that hit the gated keyword branches are the three keywords
themselves.

`PDFObjectParser` isn't re-exported from pdf-lib's index, so the
shim reaches in via `pdf-lib/cjs/core/parser/PDFObjectParser.js`
through `createRequire` -- same shape as `fast-parse-dict.mjs`.

### Results

Profile diff, both runs `--detach-pages --no-timing` with every
other shipping shim active, 100 us sampling:

| metric                                  | pre        | post       | Δ                  |
| ---                                     | ---        | ---        | ---                |
| `parseObject` / `fastParseObject` self  | 81.86 ms (5.15 %) | 40.25 ms (3.07 %) | **-41.6 ms (-51 %)** |
| `fastOf` self                           | 99.12 ms (6.23 %) | 64.18 ms (4.90 %) | -34.9 ms           |
| `fastParseDict` self                    | 113.05 ms (7.11 %) | 65.26 ms (4.98 %) | -47.8 ms           |

The targeted row roughly halves in self-time, as the model
predicts (three `matchKeyword` calls collapsed to first-byte
dispatch). The `fastOf` and `fastParseDict` drops aren't from
this shim doing less work in those frames -- they're profile
attribution shifting around once `parseObject` is no longer
dominating its own children's sampling window (sampled duration
fell from 1.58 s to 1.34 s overall).

Wall-clock is too noisy on this machine to read at this scale --
the mechanism-confirmed ~42 ms via profile attribution is the
honest number.

PDF output is byte-equivalent: same dispatch decisions, same
fallthrough behaviour, same error shape.

## Strip the parse-speed machinery: synchronify the load path

After the eight `--fast-*` patches above had nibbled the process
phase from 7.8 s down to 1.66 s, the next interesting thing in the
profile wasn't *a function* -- it was *function scaffolding*.
Three top-15 rows were the tslib `__awaiter` / `__generator`
machinery that pdf-lib's TypeScript downlevel emits for its
`async`-marked parser methods:

```
   self_ms   self_%   function                                  source
   -------   ------   ----------------------------------------------
     51.66    3.12%   (anonymous)  (parseIndirectObject body)   PDFParser.js:126
     43.05    2.60%   step         (generator runner)           tslib.js:123
     40.90    2.47%   (anonymous)  (parseIndirectObjects body)  PDFParser.js:190
```

Together ~135 ms / ~8 % of process self-time, sitting on top of
the parsing work that's already attributed to the named frames
below them.

### What that scaffolding was for

pdf-lib targets browsers as well as Node. On a browser, locking
the main thread for the seconds it takes to parse a big PDF would
freeze the page, so pdf-lib has a knob -- `parseSpeed`, also
exposed as `objectsPerTick` -- that controls how many indirect
objects the parser processes before yielding to the event loop via
`await waitForTick()`. The default is the cautious
`ParseSpeeds.Slow = 100`. The mechanism is a constructor-installed
predicate (`PDFParser.js:31`):

```js
this.shouldWaitForTick = function () {
  this.parsedObjects += 1;
  return this.parsedObjects % this.objectsPerTick === 0;
};
```

…queried at the bottom of every `parseIndirectObjects` iteration
(`PDFParser.js:215`) and every `parseIntoContext` iteration in
`PDFObjectStreamParser.js:42`, gating an `await waitForTick()`
(= `setImmediate`).

`render-book.mjs` already passed `parseSpeed: ParseSpeeds.Fastest`
to `PDFDocument.load`, which is `objectsPerTick: Infinity`, which
makes `shouldWaitForTick()` return `false` on every call: the
modulo never hits zero, the yield never fires. The
`Fastest`-vs-`Slow` speedup we'd measured years earlier (see
[01-baseline-and-detach.md](01-baseline-and-detach.md))
was precisely removing those yields' wall-clock contribution.

But removing the *yields* didn't remove the **scaffolding**. Even
with `objectsPerTick: Infinity`, every call to
`parseIndirectObject` still:

1. Allocates a Promise (the `__awaiter` return).
2. Allocates a generator object (the inner `__generator` return).
3. Allocates an activation record (the closed-over `_a` state).
4. Enters the tslib `step` runner, which calls the generator
   body, which enters `switch (_a.label) { case 0: ... }`, runs
   all the synchronous work, falls through to `return [2 /*return*/, ref]`,
   which `step` unpacks and resolves the Promise with.
5. The caller `await`s that Promise (one microtask hop).

For ~50 k indirect objects on the book that's 50 k of each.
Roughly ~135 ms of attributed self-time (the three rows above)
plus an unknowable but non-trivial fraction of the 240 ms GC row
(Promise + generator + activation are all short-lived heap
allocations).

The same shape applies to `parseIndirectObjects` (which calls
`parseIndirectObject`), `parseDocumentSection` (which calls
`parseIndirectObjects`), `parseDocument` (which calls
`parseDocumentSection`), and `PDFDocument.load` (which calls
`parseDocument`). Five `async` wrappers around code that, on the
hot path, runs synchronously.

### Why bother on the ObjStm branch too

`parseIndirectObject` *does* have one genuinely-await-ing branch
at `PDFParser.js:142`: if the parsed object is an object stream
(PDF 1.5 §7.5.7, type `ObjStm`), it dispatches to
`PDFObjectStreamParser.parseIntoContext()`, which itself is
`async`. But `parseIntoContext`'s only `await` is the same kind
of conditionally-gated `waitForTick` -- and `shouldWaitForTick`
is passed in from the parent parser, so it's still `() => false`
under our config. The whole sub-stream walk is already morally
synchronous; just no upstream code path ever constructs a parser
without `shouldWaitForTick`.

(Aside: Chrome's `SkPDF` writer doesn't emit ObjStm at all -- it
writes every indirect object at its own xref offset and uses the
classic xref table. So on our pipeline the ObjStm branch of
`parseIndirectObject` doesn't even fire. But pdf-lib loads have
to work generically; the patch handles the branch correctly.)

### The shim

`docs/lib/fast-sync-load.mjs` replaces six prototype methods with
synchronous twins:

```
PDFParser.prototype.parseDocument
PDFParser.prototype.parseDocumentSection
PDFParser.prototype.parseIndirectObjects
PDFParser.prototype.parseIndirectObject
PDFObjectStreamParser.prototype.parseIntoContext
PDFDocument.load   (static)
```

The bodies are line-by-line ports of the upstream `case`-blocks --
same loop, same `parseObject` / `context.assign` / `parseHeader` /
`maybeParseCrossRefSection` / `maybeParseTrailerDict` /
`maybeParseTrailer` / `skipJibberish` calls in the same order --
with three changes:

1. No `__awaiter` / `__generator` wrapper. The function returns
   directly.
2. No `shouldWaitForTick` check, no `waitForTick` yield.
3. The three `PDFName.of(...)` calls in `parseIndirectObject`'s
   type-dispatch tail (`'Type'`, `'ObjStm'`, `'XRef'`) are hoisted
   to module-level constants -- same trick as
   [`fast-parse-dict.mjs`](#parsedict-hoist-the-sentinel-pdfnames-out-of-the-type-dispatch-tail),
   since pool-dedup makes the `PDFName` instances reference-stable.

The patches have to land together: each method awaits the next
one down, so desugaring any one in isolation still leaves a
Promise chain dangling.

`PDFDocument.load`'s signature is preserved -- still callable as
`await PDFDocument.load(bytes)`. `await` on a non-Promise resolves
to the value immediately, so existing call sites need no change.
The `parseSpeed` option is now silently ignored (no yield gate
left to tune).

The shim's correctness depends on the upstream pdf-lib source
being structurally what the line-by-line port assumed. `pdf-lib`
1.17.1 (Hopding's last release, abandoned) is byte-stable on npm
and that's what we ship against; `package.json` is updated in
this change to pin to `1.17.1` exact (was `^1.17.1`), similarly
for `puppeteer` `25.0.4`, so a stray `npm update` can't silently
swap upstream from under the shim.

### Results

Paired process-phase profiles, same harness config except
`--fast-sync-load`:

| metric                                  | PRE       | POST      | Δ                |
| ---                                     | ---       | ---       | ---              |
| **process wall-clock**                  | **1.66 s** | **1.30 s** | **-0.36 s (-22 %)** |
| ↳ load                                  | 1.09 s    | 0.81 s    | -0.28 s (-26 %)  |
| ↳ save                                  | 0.56 s    | 0.48 s    | -0.08 s (noise; writer not touched) |
| GC self-time                            | 240 ms    | 187 ms    | -53 ms (-22 %)   |
| `(anonymous) @ PDFParser.js:126`        | 51.66 ms  | gone      | -51.66 ms        |
| `step @ tslib.js:123`                   | 43.05 ms  | gone      | -43.05 ms        |
| `(anonymous) @ PDFParser.js:190`        | 40.90 ms  | gone      | -40.90 ms        |
| **scaffolding total**                   | **~135 ms** | **0**   | **-135 ms (eliminated)** |

The wall-clock delta is larger than the sum of the eliminated
rows because the GC win is real time too: the per-object Promise
+ generator + activation allocations weren't free in V8's
internals either, just not attributed to any named frame.

Output PDF: byte-count identical (16,077,319 bytes both runs);
MD5 differs only because Chrome's `page.pdf()` embeds a fresh
`/CreationDate` + `/ModDate` per run (same ±27-byte timestamp
jitter `docs/book.bat` output has always had).

### Extending to the save side

The shim covers the writers too, by symmetry. Three more methods:

```
PDFWriter.prototype.serializeToBuffer
PDFWriter.prototype.computeBufferSize
PDFStreamWriter.prototype.computeBufferSize
```

Only `serializeToBuffer` actually runs on our pipeline --
`ParallelStreamWriter extends PDFStreamWriter` overrides
`computeBufferSize` with its own three-phase parallel-deflate
version (genuinely async because of `await Promise.all(deflated)`
over libuv's thread pool, which we keep). But the inherited
`serializeToBuffer` still had a dead `shouldWaitForTick` gate in
its main loop. Same shape as the load side: per-object dispatch,
no actual yield because `objectsPerTick` is effectively `Infinity`,
but every iteration pays the generator-machine + Promise cost.

`serializeToBuffer` stays `async` (it has to `await
this.computeBufferSize()`, which is the genuinely-async override).
The change is: drop the `__awaiter` / `__generator` wrapper, use
ES `async function` with one real `await`, strip the
`shouldWaitForTick` gate. `computeBufferSize` on both base and
stream writers becomes fully synchronous (their only async
ingredient was the same dead yield).

Measured wins on the writer side: **none reliably above noise**.
The save phase dropped from 0.56 s before the load-side patches
to 0.48 s after, and the writer patches don't move it further
(0.50 s in the post-extension profile, within the run-to-run
band). No writer frame ever broke into the top 15 in the first
place -- the overhead was real but distributed across
unattributed scaffolding and `(program)` time, not big enough to
register individually.

The reason to ship it anyway is structural, not performance: with
load patched, the only remaining
`shouldWaitForTick` / `waitForTick` references in our hot path
were on the save side, and leaving them would defeat the "rip out
the machinery" intent. With the save patches landed, neither
phase routes through tslib `__awaiter` scaffolding except where
there's a legitimate `await` underneath.

### Dropping the flags

The companion change is to drop the `parseSpeed` / `objectsPerTick`
options from all our call sites, since with the shim in effect
neither does anything:

- `docs/render-book.mjs` drops `parseSpeed: ParseSpeeds.Fastest`
  from `PDFDocument.load` and `objectsPerTick: Infinity` from
  `parallelSave`. The `ParseSpeeds` import goes with them.
- `docs/lib/parallel-deflate.mjs` drops `objectsPerTick` from
  `parallelSave`'s public options object and from
  `ParallelStreamWriter`'s constructor parameters. `PDFWriter`'s
  base constructor still takes `objectsPerTick` as positional
  arg 2 -- vestigial after `fast-sync-load`, but we pass
  `Infinity` explicitly to make the constructor chain happy.
- `perf/measure.mjs` removes the same options from
  `PDFDocument.load`, `parallelSave`, and `pdfDoc.save`.

`perf/profile-roundtrip.mjs` keeps its `parseSpeed` /
`objectsPerTick` knob comparison -- that file's whole purpose is
to A/B pdf-lib's defaults against `Fastest`, and it runs against
vanilla pdf-lib without the shim by design.

## `@cantoo/pdf-lib`: not a drop-in replacement

Spot-checked the maintained fork (`@cantoo/pdf-lib` 2.6.5) as an
alternative to Hopding's abandoned `pdf-lib` 1.17.1. Source-diff:
the four hot paths our shims address (`PDFRef.of`'s string-keyed
pool, `decodeName`'s unconditional regex, `parseRawInt` /
`parseRawNumber`'s per-byte string concat,
`PDFFlateStream.computeContents`'s synchronous pako call) are
byte-identical to upstream. Paired A/B on the book confirmed:
cantoo without shims runs the process phase in ~150 s vs our ~1.5 s
with shims, and has its own footguns (silent compression-disable
on PDF < 1.5, separate save-path pathology with `useObjectStreams:
true` that wasn't chased). Not a drop-in replacement; staying on
Hopding + shims.

## Where this leaves the picture

Cumulative process-phase cost, baseline → after the shims to date:

| state                                | process | load | save |
| ---                                  | ---     | ---  | ---  |
| original (Slow / 50 defaults)        | ~40 s   | ~36 s| ~4 s |
| + parseSpeed:Fastest                 | ~5 s    | ~2 s | ~3 s |
| + fast-deflate                       | ~2.5 s  | ~1.5s| ~1 s |
| + fast-refs                          | ~2.3 s  | ~1.3 s | ~1 s |
| + parallel-deflate                   | ~2.0 s  | ~1.3 s | ~0.7 s |
| + fast-decode-name + fast-number-to-string | ~1.6 s  | ~1.0 s | ~0.6 s |
| + fast-size-in-bytes                 | ~1.5 s  | ~1.0 s | ~0.5 s |
| + fast-dict-iter                     | ~1.4 s  | ~1.0 s | ~0.4 s |
| + fast-parse-dict                    | ~1.4 s  | ~1.0 s | ~0.4 s |
| + fast-parse-object                  | ~1.4 s  | ~1.0 s | ~0.4 s |
| **+ fast-sync-load (this section)**  | **~1.3 s** | **~0.8 s** | **~0.5 s** |

The bottom-up after the latest pair is what's left of pdf-lib's
genuine parser work: `PDFDict.entries`, `PDFObjectParser.parseName`,
`PDFObjectParser.parseDict`, GC, with no remaining JS-body row
sitting on "regex scanning for something that's never there" or
"redundant `toString` round-trip" shape. The `fastOf` row at
~91 ms is a real floor for any cache-in-front approach: the
`indexOf` + `Map.get` cost ~33 ns per call across 2.76 M calls.

The pdf-lib roundtrip path is now ~1.6 s on production
(profiler-off; the harness reports ~2.0-2.2 s with profiler-on
attribution overhead). The incremental writer's 0.25 s process
phase (see [01-baseline-and-detach.md](01-baseline-and-detach.md))
is still strictly faster on process alone, but the pdf-lib path
delivers a 15.3 MB output vs incremental's 53 MB, and the ~1.4 s
gap on a 50 s build doesn't justify the file-size cost for our
pipeline.

The strategic note from earlier phases still stands: generate's
~38 s in `page.pdf()` is the remaining lever, and `pageRanges`
sharding is the only knob plausibly large enough to move the
wall-clock total by more than a few seconds.
