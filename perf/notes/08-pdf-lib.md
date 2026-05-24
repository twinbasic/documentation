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

## Replace `PDFDict`'s backing `Map` with a flat array

With `fast-dict-iter` and `fast-parse-dict` both shipping, the
process-phase CPU profile read tidy enough that the next move was
to look at the *other* side of the ledger: the sampling heap
profile rather than CPU. The motivating run, captured with the
canonical heap command (`--heap-profile-process --heap-sampling
512`):

```
   self_kb   self_%   function  @  source
  54315.27   34.75%   set                                  (V8 builtin)
  24804.17   15.87%   Map                                  (V8 builtin)
  19488.12   12.47%   PDFObjectParser.parseArray
  16786.41   10.74%   PDFParser.parseIndirectObjectHeader
  15329.21    9.81%   PDFObjectParser.parseNumberOrRef
   9599.45    6.14%   fastParseDict        (fast-parse-dict.mjs)
   9581.25    6.13%   fastOf               (fast-decode-name.mjs)
   ...
```

`set` and `Map` together at ~80 MB -- **half of all process-phase
allocations** -- were the natural place to start.
`find-heap-callers.mjs` attributed them cleanly:

```
$ node find-heap-callers.mjs process.heapprofile set
set: total=53.04 MB
  39107.27 KB   fastParseDict @ fast-parse-dict.mjs:62
   7168.04 KB   PDFParser.parseIndirectObjectHeader
   7168.04 KB   parseIndirectObjectSync @ fast-sync-load.mjs:140
    ...

$ node find-heap-callers.mjs process.heapprofile Map
Map: total=24.22 MB
  24691.51 KB   fastParseDict @ fast-parse-dict.mjs:62
    112.13 KB   buildPdfObjectsForOutline
```

84 % of the combined Map+set traffic was one site, the parser's
per-dict accumulator inside `fastParseDict`:

```js
const dict = new Map();             // 24 MB of Map() constructors here
while (...) {
  const key = this.parseName();
  const value = this.parseObject();
  dict.set(key, value);             // 38 MB of set() entries here
  ...
}
return PDFDict.fromMapWithContext(dict, this.context);
```

One `new Map()` + N `Map.prototype.set` calls per parsed dict,
then the Map gets stored as `PDFDict.dict` and consulted later by
all the `PDFDict` methods. Every Map allocates a header + a
hash-table backing arena + per-entry bucket objects; on the book
that's ~9 k dicts each paying for an arena it doesn't need,
because PDF dicts are **tiny** (typical has <= 10 entries, most
have 2-3) and nothing in pdf-lib's API touches a parsed dict
often enough for the hash to pay back.

The remaining 16 % was `context.assign` populating
`PDFContext.indirectObjects` (a Map<PDFRef, PDFObject>) -- that's
a single Map shared across the load, not addressed here.

### The shape

Replace the Map with a flat alternating array:

```js
// before
this.dict = new Map([[key0, value0], [key1, value1], ...]);
// after
this.dict = [key0, value0, key1, value1, ...];
```

One allocation per dict (the array; the entries are stored inline
in the array's backing store, no per-entry boxes). Lookups become
linear scans:

```js
function indexOfKey(arr, key) {
  for (let i = 0, len = arr.length; i < len; i += 2) {
    if (arr[i] === key) return i;
  }
  return -1;
}
```

For 5-entry dicts (the dominant size class), a 5-iteration linear
scan with strict-equality comparison beats `Map.prototype.get`
(which has to hash the key, then walk a hash-bucket chain) on
every V8 microbench checked. The crossover is somewhere around
20-30 entries; PDF dicts almost never get there.

### Compatibility

`PDFDict`'s public method surface is
`.keys / .values / .entries / .set / .get / .has / .delete /
.lookup / .lookupMaybe / .asMap / .clone / .toString /
.sizeInBytes / .copyBytesInto / .uniqueKey`. Grepping the rest of
pdf-lib confirmed every consumer goes through that surface --
`viewerPrefs.dict.set(...)`, `widgetAnnot.dict.get(...)`,
`xrefStream.dict.set(...)`, etc. all call `PDFDict.prototype.set`/
`.get`, which we re-implement against the array. Nobody in the
codebase touches `dict.dict` expecting Map-specific iterators.
The single direct-Map use, `asMap()`, still returns a fresh
`new Map(...)` for any caller that wants one.

The seam factories that take a `Map` argument
(`fromMapWithContext`, `withContextAndPages`, `PDFPageLeaf.clone`'s
`new Map()` initializer) get small wrappers that convert at the
boundary. They're called a handful of times per document --
catalog + page tree + page leaves -- so the conversion is free
relative to the parser's ~9 k dicts.

### Subsumes two earlier shims

The two existing dict-shape shims are no longer useful in front of
the array shape:

- `fast-dict-iter` patched `PDFDict.sizeInBytes` and `copyBytesInto`
  to call `this.dict.forEach((value, key) => ...)` instead of
  `Array.from(this.dict.entries())`. With `this.dict` as a flat
  array, both methods become `for (let i = 0; i < arr.length; i += 2)`
  -- no `forEach`, no `thisArg` context object, no callback
  allocation.
- `fast-parse-dict` patched `parseDict` to hoist the
  Type/Catalog/Pages/Page sentinel `PDFName.of` calls into
  module-level constants. The new `parseDict` (in
  `fast-dict-array.mjs`) keeps the hoisted constants and also
  accumulates into the flat array directly. The Type-sentinel
  dispatch becomes a short linear scan over the array; PDF
  convention places `/Type` at index 0 or 2, so it's effectively
  O(1) per dict.

`fast-dict-array.mjs` carries both behaviours inline. The two
older shims stay in the tree as opt-in flags on `measure.mjs`
(useful for A/B against the `Map` shape) but are mutually
exclusive with `--fast-dict-array` (the harness errors if you
combine them).

### Measured wins

Heap profile (paired `--heap-profile-process --heap-sampling 512`,
same canonical command otherwise):

| Allocator        | Map shape (before) | Array shape (after) | Delta   |
|------------------|-------------------:|--------------------:|--------:|
| `set` builtin    |          54.3 MB   |             14.8 MB | -73 %   |
| `Map` builtin    |          24.8 MB   |    < 1 MB (off top) | -96 %   |
| `push` builtin   |              -     |              2.8 MB | +2.8 MB |
| Total sampled    |         152.6 MB   |            140.1 MB | -8 %    |

The total-allocation drop is smaller than the Map+set drop
because the sampling profiler reattributes the array contents
(`PDFObject` references that used to sit inside Map bucket
allocations) to the `fastParseDictArray` frame that allocates the
array -- the allocations are still there, just attributed
differently. The **real** win is the absence of Map header +
hash-table arena per dict, which the profile shows by the `Map`
row collapsing.

CPU profile (paired `--cpu-profile-process --cpu-sampling 100`):

| Row                                | Before  | After   |
|------------------------------------|--------:|--------:|
| `(garbage collector)`              | 213 ms  | 170 ms  |
| `fastParseDict` / `fastParseDictArray` | 113 ms  |  40 ms  |
| `PDFDict.copyBytesInto` + `_copyBytesIntoEntry` | 60 ms |  26 ms  |

Wall-clock (paired no-profile, 4 runs each, mean process phase):

| Shape        | Process (mean) | Range          |
|--------------|---------------:|----------------|
| Map (before) |        1.180 s | 1.15 - 1.20 s  |
| Array (after)|        1.132 s | 1.11 - 1.15 s  |

**~48 ms saved on the 1.18 s process phase (~4 %).** The
profile-time delta is bigger than the wall-clock delta because
the CPU profiler's sampling overhead falls disproportionately on
hot allocator paths -- a familiar caveat. The honest signal is
the no-profile A/B.

The output PDF is structurally identical (1651 pages, 1773
outline nodes, same title / creator metadata), within the build's
intrinsic timestamp/random-ID noise (the build is
non-deterministic between runs anyway -- two consecutive no-shim
runs differ by ~30 bytes too).

`docs/render-book.mjs` swaps `./lib/fast-dict-iter.mjs` +
`./lib/fast-parse-dict.mjs` for the single
`./lib/fast-dict-array.mjs` import. The two older shims stay in
the tree for A/B; the harness rejects combining them with
`--fast-dict-array`.

## Replace `PDFContext.indirectObjects` with a dense array

With `fast-dict-array` shipping, the per-dict `new Map()` +
`Map.prototype.set` traffic was gone -- but the heap profile
still showed ~14.5 MB of `set` self-size. `find-heap-callers`
localized it cleanly to one remaining site, attributed to two
V8-inlined parent frames:

```
$ node find-heap-callers.mjs <post-dict-array>.heapprofile set
set: total=14.49 MB
  7168.04 KB   PDFParser.parseIndirectObjectHeader
  7168.04 KB   parseIndirectObjectSync @ fast-sync-load.mjs:140
```

Both rows are the same logical call: `this.indirectObjects.set(ref, object)`
inside `PDFContext.assign` (`pdf-lib/.../PDFContext.js:34`), fired
once per indirect object during load. On the book that's ~9 k
entries; V8's Map grows the underlying hash table through ~14
doubling steps to fit them (4 -> 8 -> ... -> 16384), discarding
each intermediate arena. The 14 MB total is final arena + bucket
allocations + all the discarded growth arenas.

`PDFRef`s are overwhelmingly gen=0 (rare gen!=0 cases come from
revisions / incremental updates). `fast-refs` already uses a
dense array indexed by `objectNumber` for the **key** side --
`PDFRef.of`'s gen=0 pool. The same trick applies on the **value**
side for `indirectObjects`: dense array keyed by `objectNumber`.

### The shim

`docs/lib/fast-indirect-objects.mjs` patches
`PDFContext.prototype.assign / lookup / lookupMaybe / delete /
getObjectRef / enumerateIndirectObjects` to consult an auxiliary
`this._objArr` (dense array indexed by `objectNumber`) for gen=0
`PDFRef`s first, falling back to the original Map for gen!=0.
Lazy init on first `assign` -- no constructor patching needed.
The original Map sits at `this.indirectObjects` unchanged; gen=0
entries skip it entirely.

```js
PDFContext.prototype.assign = function (ref, object) {
  if (ref.generationNumber === 0) {
    if (!this._objArr) this._objArr = [];
    this._objArr[ref.objectNumber] = object;     // dense store, no Map
  } else {
    this.indirectObjects.set(ref, object);       // gen!=0 fallback
  }
  if (ref.objectNumber > this.largestObjectNumber) {
    this.largestObjectNumber = ref.objectNumber;
  }
};
```

`lookup` / `lookupMaybe` resolve the ref the same way then run
the original type-check tail verbatim. `delete` nulls the slot
(not splices -- subsequent objectNumbers retain their slots).
`getObjectRef` linear-scans the dense array first, then the Map.
The interesting one is `enumerateIndirectObjects`: dense-array
iteration is already in ascending objectNumber order, so when
the gen!=0 Map is empty (the parsed-PDF common case) the method
returns without sorting -- the upstream
`Array.from(this.indirectObjects.entries()).sort(byAscendingObjectNumber)`
becomes a single linear pass with no `Array.from` materialization
and no sort.

### Measured wins

CPU profile (paired `--cpu-profile-process --cpu-sampling 100`,
fast-dict-array baseline vs + fast-indirect-objects):

| Row                     | Pre (ms) | Post (ms) | Note               |
|-------------------------|---------:|----------:|--------------------|
| (garbage collector)     |   162.50 |    176.83 | within noise       |
| **PDFContext.assign**   | **41.83**| **out of top 15** | **drops off**  |
| PDFRef.of               |   124.42 |    118.24 | within noise       |
| Total profile duration  |  1.21 s  |   1.14 s  | -70 ms             |

The headline is `PDFContext.assign` exiting the top 15.
Everything else moves within the sample-count noise band.

Heap profile (paired `--heap-profile-process --heap-sampling 512`):

| Allocator         | Pre (KB)  | Post (KB) | Delta                |
|-------------------|----------:|----------:|---------------------:|
| `set` builtin     | 14 840.20 |  7 674.41 | -7 166 KB (-48 %)    |
| Total sampled     | 140.15 MB |  135.00 MB| -5.15 MB (-3.7 %)    |

The remaining 7 MB of `set` is **not** `PDFContext.assign`
anymore -- `find-heap-callers` on the post profile shows it's the
upstream `PDFRef.of`'s `pool.set(tag, instance)` on cache miss.
Even with `fast-refs`'s dense-array short-circuit on the LOOKUP
side, the first time each unique objectNumber is encountered the
shim calls through to the original `PDFRef.of`, which constructs
the `PDFRef` AND populates the upstream `Map<string, PDFRef>`
pool. That's the next target.

## Skip `PDFRef` `pool.set` on the gen=0 miss path

With `fast-indirect-objects` shipping, the heap profile showed
one last hot `set` source: the upstream `PDFRef.of`'s own pool
(`pdf-lib/.../objects/PDFRef.js:34`):

```js
PDFRef.of = function (objectNumber, generationNumber) {
    ...
    var tag = objectNumber + " " + generationNumber + " R";
    var instance = pool.get(tag);
    if (!instance) {
        instance = new PDFRef(ENFORCER, objectNumber, generationNumber);
        pool.set(tag, instance);                  // ← 7 MB of set on the book
    }
    return instance;
};
```

`fast-refs` already short-circuited the LOOKUP side with a dense
array indexed by `objectNumber`. But on a gen=0 cache miss (~9 k
unique objectNumbers per book), the shim was calling
`original.call(PDFRef, objectNumber, 0)`, which dutifully built
the tag string, looked it up in the upstream Map, missed,
allocated a new `PDFRef`, AND populated the upstream pool --
redundantly, since the dense array `pool0` is the authoritative
cache from now on.

Each `pool.set` over the load grew the Map's hash table through
~14 doubling steps (4 -> 8 -> ... -> 16384), discarding each
intermediate arena. Total: ~7 MB of `set` self-size in the heap
profile, plus the matching ~93 ms of `PDFRef.of` CPU self-time
(the function body that does the set is hot enough that V8
charges all that growth to `PDFRef.of`'s frame).

### The upgrade

Replace the original-delegation on the gen=0 miss path with
direct construction:

```js
PDFRef.of = function fastOf(objectNumber, generationNumber) {
  if (generationNumber === undefined || generationNumber === 0) {
    const existing = pool0[objectNumber];
    if (existing) return existing;
    const fresh = Object.create(PDFRef.prototype);
    fresh.objectNumber = objectNumber;
    fresh.generationNumber = 0;
    fresh.tag = objectNumber + ' 0 R';
    pool0[objectNumber] = fresh;
    return fresh;
  }
  return original.call(PDFRef, objectNumber, generationNumber);
};
```

Safety: `PDFRef`'s super class (`PDFObject`) has a no-op
constructor (`pdf-lib/.../PDFObject.js:5`) so skipping
`_super.call(this)` is fine. The only instance fields the
prototype methods read are `objectNumber`, `generationNumber`,
and `tag` (used by `toString` / `sizeInBytes` / `copyBytesInto`);
direct field init covers them. The `ENFORCER` check exists to
make `PDFRef.of` the single legitimate factory -- we already are
that factory, so bypassing it doesn't violate any invariant.

gen!=0 keeps the original delegation (rare on freshly-parsed
PDFs; its `Map.set` traffic is negligible at gen!=0 volume).

### Measured wins

CPU profile (paired `--cpu-profile-process --cpu-sampling 100`,
fast-indirect-objects baseline vs + this upgrade):

| Row                  | Pre (ms) | Post (ms) | Note                       |
|----------------------|---------:|----------:|----------------------------|
| (garbage collector)  |   176.83 |    166.71 | -10 ms                     |
| **PDFRef.of**        | **118.24** | **out of top 15** | **drops off (~93 ms saved)** |
| fastOf @ fast-refs   |        - |     25.19 | new row (was inside `PDFRef.of`) |
| Total profile        |  1.14 s  |   1.03 s  | -110 ms (-9.6 %)           |

Heap profile (paired `--heap-profile-process --heap-sampling 512`):

| Allocator         | Pre (KB)  | Post (KB) | Delta                |
|-------------------|----------:|----------:|---------------------:|
| `set` builtin     |  7 674.41 |    504.77 | **-7 170 KB (-93 %)** |
| fastOf @ fast-refs|  9 367.39 |  7 734.79 | -1 633 KB             |
| Total sampled     | 135.00 MB | 123.11 MB | -11.89 MB (-8.8 %)    |

The residual 504 KB of `set` is `fastCache.set` in `PDFName`
interning (~448 KB) plus a sliver of `__awaiter` machinery in
`PDFDocument`; both are static-size and harmless. There is no
longer any materially-hot `Map.prototype.set` in the process-phase
heap profile.

The edit is local to `docs/lib/fast-refs.mjs`; no production
import change needed since `fast-refs` was already wired up.

## Pool `PDFNumber` instances by value

With every `Map.set` in the load path either eliminated or
reduced to its irreducible floor (`PDFName` fastCache, ~0.5 MB),
the next-largest bucket in the heap profile was
`parseNumberOrRef` at 15 MB -- mostly inlined `new PDFNumber(value)`
from the parser's number branch:

```js
function PDFNumber(value) {
  var _this = _super.call(this) || this;
  _this.numberValue = value;
  _this.stringValue = numberToString(value);     // alloc per instance
  return _this;
}
PDFNumber.of = function (value) { return new PDFNumber(value); };
```

No pool. Every `PDFNumber.of(N)` returns a fresh instance, even
for the same `N`. PDFs reuse a handful of integer values
*constantly*: the book has 1 651 page entries (each contributing
`/MediaBox` dimensions like 612, 792, integer indices, `/Count`,
`/N` totals), plus content-stream numeric literals, font sizes,
and bit widths. Hundreds of thousands of `PDFNumber.of` calls
against maybe a few thousand unique values.

A `PDFNumber` is also conceptually immutable: `numberValue` and
`stringValue` are written once in the constructor and never
mutated. Pooling by value is therefore safe.

### Could we just store a raw `number`?

In principle yes. `PDFNumber` exists structurally to satisfy
pdf-lib's polymorphic dispatch on every dict / array value
(`value.copyBytesInto(buffer, offset)`, `value.sizeInBytes()`,
`value.asNumber()`). Replacing it with a primitive would
require:

- Type-branching in `PDFDict.copyBytesInto` /
  `PDFArray.copyBytesInto` / `sizeInBytes`: `typeof === 'number'`
  fast-path that writes the number's string form directly.
- Updating ~53 consumer sites in pdf-lib's API code (everything
  that does `lookup(name, PDFNumber).asNumber()` or
  `value instanceof PDFNumber`) to handle bare numbers.
- A V8 deopt risk: the serializer's previously-monomorphic
  `.copyBytesInto` call site becomes polymorphic across two
  representations.

That's a much bigger surgery for a similar magnitude of win,
because pooling already collapses every repeated-value
allocation to a single shared instance. So we ship the pool
first; if a post-pool heap profile still showed `PDFNumber` as a
top allocator, stripping would have been worth the API surgery.
It doesn't.

### The shim

`docs/lib/fast-pdfnumber-pool.mjs` installs the cache. Same
shape as `fast-refs`: dense array indexed by `value` for
non-negative integers in `[0, 16384)` (covers every observed
integer value in the book by a wide margin), Map fallback for
floats, negatives, and out-of-range integers. Map's
`SameValueZero` handles `NaN` / `-0` correctly, no special-casing
needed.

```js
PDFNumber.of = function fastNumberOf(value) {
  if (value >= 0 && value < POOL_SIZE && (value | 0) === value) {
    let pn = intPool[value];
    if (pn !== undefined) return pn;
    pn = original.call(PDFNumber, value);
    intPool[value] = pn;
    return pn;
  }
  let pn = otherPool.get(value);
  if (pn !== undefined) return pn;
  pn = original.call(PDFNumber, value);
  otherPool.set(value, pn);
  return pn;
};
```

### Measured wins

Heap profile (paired `--heap-profile-process --heap-sampling 512`,
fast-refs upgrade baseline vs + pool):

| Allocator                | Pre (KB)  | Post (KB)            | Delta                |
|--------------------------|----------:|---------------------:|---------------------:|
| **parseNumberOrRef**     | 15 388.73 | **out of top 10**    | **-15+ MB**          |
| `String` builtin         |  1 202.23 | out of top 10        | -                    |
| `PDFNumber.of` (pool miss)|        - |               818.92 | new, ~unique count   |
| Total sampled            | 123.11 MB |            107.21 MB | **-15.9 MB (-13 %)** |

`parseNumberOrRef`'s row collapsed off the top 10. The new
`PDFNumber.of` row at 0.8 MB is the floor -- one `PDFNumber` per
unique value across the whole load. The `String` builtin row
(`stringValue` allocations) also collapsed because they're now
allocated once per unique value, not once per use site.

CPU profile (same paired methodology): GC self-time effectively
flat (166.71 ms -> 165.54 ms), total profile duration within
sample-count noise (1.03 s -> 1.09 s). Pool cost per call is a
branch + array index, which V8 inlines into the hot
`parseNumberOrRef` path. CPU is a wash; the win is pure heap.

### A companion analyzer: `find-heap-callees.mjs`

Adding this shim also surfaced the question "what's
`fastParseDictArray` actually allocating at its 58 MB self-row?".
`find-heap-callers` answers "who calls X?"; the inverse --
"what does X allocate?" -- needed a new tool. `find-heap-callees.mjs`
walks the `.heapprofile` tree and lists a target frame's direct
children with their (self + subtree) byte totals.

Used here, it cracked open the `fastParseDictArray` row: most of
the 58 MB was recursive `parseDict` invocations across nesting
levels, not a single allocator. That's intrinsic to the document
structure (page-tree dicts contain Kids arrays of Page dicts that
contain Resources dicts...), not something a shim can shrink.
The tool stays for future investigations.

## Pre-size `parseDict`'s backing array

After `fast-pdfnumber-pool` shipped, `fastParseDictArray` was
53 % of the residual heap profile (~58 MB self-size). Three
components in that frame:

```js
const arr = [];                                  // (1) array alloc + cap-4 FixedArray
while (...) {
  arr.push(key, value);                          // (2) growth via doubling
}
return new PDFDict(arr, this.context);           // (3) PDFDict instance
```

Without per-call counts, the 58 MB could plausibly be 10 k huge
dicts or 300 k tiny ones. So we instrumented
(`perf/instrument-parsedict.mjs`), which wraps the shim's
`parseDict` to count invocations and size-distribution on exit.
The book's workload:

```
total calls       : 260 967
total entries     : 1 170 264
avg entries/dict  : 4.48
max entries/dict  : 4 353
max recursion     : 3
entries-per-dict histogram:
     1 :     822
     2 :  22 551
     3 :  13 372
     4 :  73 936    (28 %)
     5 : 135 438    (52 %)   <-- median
     6 :     231
     7 :  12 458
     8 :   1 644
     9..31:  ~530
   32+ :       2
```

**80 % of dicts have exactly 4 or 5 entries; 96 % have <= 7. Max
recursion only 3 deep.** That maps cleanly onto V8's array
growth behavior: a 5-entry dict's `arr.push(key, value)` chain
grows the backing FixedArray from cap 4 -> 8 -> 16, discarding
the two intermediate stores as garbage:

| Dict entries | Push slots | Growth path | FixedArray bytes (incl. discards) |
|-------------:|-----------:|-------------|----------------------------------:|
|  4 (28 %)    |   8        | 4 -> 8      | 64 + 96 = 160 B                   |
|  5 (52 %)    |  10        | 4 -> 8 -> 16 | 64 + 96 + 152 = 312 B           |
|  7 (5 %)     |  14        | 4 -> 8 -> 16 | 312 B                             |
|  2 (9 %)     |   4        | 4           | 64 B                              |

Weighted average ~220 B of FixedArray throughput per dict.
Across 261 k dicts: ~57 MB -- matching the observed 58 MB
self-row almost exactly. **~85 % of the row is growth garbage
from not pre-sizing.**

### The fix

Allocate the accumulator at the median size up front and use
direct indexing with a `len` counter; fall back to push only for
the rare overflow case.

```js
// Pre-sized permanent backing array (not a scratch buffer --
// the array is what we hand to PDFDict, just with capacity set
// to the median dict size up front to skip the growth chain).
const INITIAL_SLOTS = 10;   // median = 5 entries = 10 push slots
const arr = new Array(INITIAL_SLOTS);
let len = 0;
while (...) {
  const key = this.parseName();
  const value = this.parseObject();
  if (len < INITIAL_SLOTS) {
    arr[len]     = key;
    arr[len + 1] = value;
  } else {
    arr.length = len;
    arr.push(key, value);   // rare: 7+ entry dicts grow from 10
  }
  len += 2;
}
arr.length = len;            // trim hole tail
```

### Picking `INITIAL_SLOTS`

`INITIAL_SLOTS = 16` was the first try (covers 4-7 entry dicts
without growth -- 96 % of cases). It saved only ~5.6 MB instead
of an estimated ~22 MB. The reason: `new Array(16)` allocates a
176-byte FixedArray *for every dict*, including the 9 % of
2-entry dicts that previously needed only 64 bytes. The cap-16
baseline is itself ~46 MB across 261 k calls.

`INITIAL_SLOTS = 10` is exact-fit for the 52 % dominant 5-entry
case (no growth, no waste), small waste for 2/3/4-entry dicts
(4-6 unused slots), and one growth for the 5 % at 7 entries
plus the ~2 % above that. Best balance for this workload.

### Measured wins

Heap profile (paired `--heap-profile-process --heap-sampling 512`,
post-fast-pdfnumber-pool baseline vs + `INITIAL_SLOTS = 10`):

| Allocator                | Pre (KB)   | Post (KB)  | Delta              |
|--------------------------|-----------:|-----------:|-------------------:|
| **fastParseDictArray**   |  58 203.30 |  43 817.77 | **-14.4 MB (-25 %)** |
| `push` builtin           |   2 843.44 |   1 621.62 | -1.2 MB            |
| Total sampled            | 107.21 MB  |  92.13 MB  | **-15.1 MB (-14 %)** |

Two-step path through `INITIAL_SLOTS`:

| Step                        | Total sampled | fastParseDictArray |
|-----------------------------|--------------:|-------------------:|
| No pre-size                 |     107.21 MB |          58.20 MB  |
| `INITIAL_SLOTS = 16`        |     101.61 MB |          55.03 MB  |
| `INITIAL_SLOTS = 10`        |  **92.13 MB** |       **43.82 MB** |

### What about a true scratch buffer?

The "escalation" alternative was a single long-lived backing
array on the parser instance, append-then-slice per dict. That
would actually be a scratch buffer -- reused across calls,
sliced off into a fresh `PDFDict` storage per dict. It would
eliminate the per-call `new Array(10)` allocation. But the slice
result is still a fresh per-dict allocation, sized exactly --
which for the median 5-entry case is ~104 B (same as cap-10).
The only net savings would be on small dicts (1-3 entries)
where the slice is smaller than 10 slots; that's maybe ~2-3 MB
across 36 k small dicts. Not worth the recursion-safe
length-pointer save/restore plumbing.

The edit is local to `docs/lib/fast-dict-array.mjs`; no
production import change needed since `fast-dict-array` was
already wired up. The `--instrument-parsedict` flag stays on
`measure.mjs` for future dict-workload investigations.

## View-based PDFDict (explored, didn't ship)

After fast-dict-array pre-sized its per-dict accumulator to median
size, the `fastParseDictArray` row was still 43.8 MB on the heap
profile (48 % of total) -- mostly the irreducible floor of "one
`new Array(10)` + one PDFDict instance per parsed dict, 261 k
times". The natural next move: stop allocating per-dict storage at
all, share one backing array across many dicts via a `(buf, start,
end)` view.

Prototyped as `fast-dict-view.mjs`. Each PDFDict carried a `(buf,
start, end)` window into a parser-wide per-depth shared array,
append-only across all dicts at that depth. The win on heap was
only ~2.5 MB -- the fatter PDFDict instance (5 fields vs 2) ate
back most of the buffer-sharing saving. Subsequently superseded
by the one-buffer approach below, which packs the entire dict
storage into a single mainBuf and shrinks the PDFDict instance
back down. The view-based shim doesn't ship; the notes here are
preserved as the thinking that led to one-buffer.

### Why "not scratch"

The earlier comment about "scratch buffer" was wrong vocabulary.
A scratch buffer is a temporary workspace -- you write, use, and
discard. Nothing here qualifies: every parsed entry lives until
the PDFDocument is dropped. What we actually want is a *shared
backing array* where each PDFDict claims a contiguous range,
written once and kept. The buffer is append-only; slots are never
rewritten.

### The recursion gotcha

A naive single shared buffer breaks under parseDict recursion. If
outer parseDict appends entries to `buf` while parsing a value
that recurses into inner parseDict, inner's entries get
interleaved into outer's range. Outer's view would wrongly
include inner's entries:

```
outer parseDict starts at len=0
  outer parses keyA, valueA       -> buf[0,1], len=2
  outer parses keyB, value=<<...>> -> calls inner parseDict
    inner appends 3 entries        -> buf[2..7], len=8
    inner returns view {start:2, end:8}
  outer wants to write keyB,valueB at buf[8,9] -> len=10
  outer parses keyC,valueC         -> buf[10,11], len=12
outer's range: {start:0, end:12}  ← includes inner's entries!
```

Fix: **one buffer per parseDict-recursion-depth**, not one shared
globally. Instrumentation
([perf/instrument-parsedict.mjs](../instrument-parsedict.mjs))
showed max parseDict depth = 3 on the book, so 3-4 buffers per
parser. Each buffer is append-only across all dicts at that depth.
Inner recursion writes to a different buffer than outer, so
outer's range stays contiguous.

### Copy-on-write for mutations

Shared buffers are correct as long as nobody mutates the entries.
But `pdfDoc.catalog.set(PDFName.of('Outlines'), outlineRef)` does
happen in our pipeline (during setOutline). The shim added a COW
hook to `PDFDict.prototype.set` and `.delete`: first mutation
copies the (start..end) range into a private array, swaps the
view to point at that copy with `_dictOwned = true`. Subsequent
mutations on that dict operate in place. Other dicts sharing the
original buffer are unaffected.

### Pre-sizing the per-depth buffers

Without pre-sizing the per-depth buffers, V8 doubles their
backing FixedArray from cap 0 up to (depth 0 case) ~2.1M slots --
~20 doublings, with each old arena becoming garbage. That growth
garbage alone was 6.5 MB of the regression observed when first
prototyping.

Instrumented to measure the final per-depth lengths on a book
parse:

```
=== fast-dict-view: depth stats ===
parser instances seen: 1
  depth 0: total 2 155 544 slots, max-per-parser 2 155 544 slots
  depth 1: total   158 260 slots, max-per-parser   158 260 slots
  depth 2: total    26 724 slots, max-per-parser    26 724 slots
```

Hardcoded the caps + 10 slack in the shim's `DEPTH_BUF_CAPS`,
sized to skip all growth on the book. For other workloads the
buffers grow naturally from these starting sizes;
oversizing-by-2x doesn't hurt much because there's only one
buffer per depth per parser.

### Bug-hunt: the depth-reset gotcha

The first version of the shim used `if (!this._dictDepth)` to
lazy-init the per-parser buffer stack. `!this._dictDepth` is true
when `_dictDepth = 0` -- which is exactly the state at the *end*
of every top-level parseDict call (the depth counter was just
decremented back to zero). The buffers were getting reset between
every top-level dict; each one was effectively allocating fresh.

Fix: `if (this._dictBufs === undefined)` -- explicit
undefined-on-construction check. Easy to spot in retrospect, less
easy to spot when looking at a regression that doesn't make
sense.

### Why the win is "only" 2.5 MB

Even with perfect pre-sized buffers and the bug fix, fast-dict-view
beats fast-dict-array by only ~2.5 MB on heap. The expected
saving was bigger -- one shared buffer should beat 261 k separate
ones by a lot.

The reason: the PDFDict *instance* in fast-dict-view is itself
larger. Where fast-dict-array stores `{dict, context}` (2 named
slots, ~32 B per instance with V8's inline-properties packing),
fast-dict-view stores `{_dictBuf, _dictStart, _dictEnd, _dictOwned,
context}` (5 named slots, ~96 B per instance). Across 261 k
dicts that's ~16 MB of extra per-instance storage that offsets
most of the buffer-sharing win:

| Per-dict allocation | fast-dict-array (INITIAL_SLOTS=10) | fast-dict-view (pre-sized) |
|---------------------|-----------------------------------:|----------------------------:|
| Backing storage     | 104 B per-dict `new Array(10)`     | ~16 B share of shared buf   |
| PDFDict instance    | ~32 B (inlined constructor)        | ~96 B (Object.create + 5 fields) |
| **Total / dict**    |                          **~136 B**|                  **~112 B** |

The buffer sharing saves ~88 B per dict on storage, but the
fatter PDFDict instance eats ~64 B back. Net ~24 B per dict =
~6 MB structural win, of which ~2.5 MB shows in the heap profile
after V8 internal overhead variance.

### Measured wins

Heap profile (paired `--heap-profile-process --heap-sampling 512`,
fast-dict-array baseline vs + fast-dict-view):

| Allocator                          | Pre (KB)  | Post (KB) | Delta          |
|------------------------------------|----------:|----------:|---------------:|
| `fastParseDictArray` / `*View`     |  43 817.77 |  40 955.37 | -2.86 MB       |
| Total sampled                      |  92.13 MB  |  89.68 MB  | **-2.45 MB**   |

Modest. The takeaway is structural: a view-based shape is the
right direction, but the PDFDict instance shape itself is now
the dominant per-dict cost -- so the next prototype needs to
shrink the instance too. That's the one-buffer + packed-pointer
work in the following sections.

## Single-double PDFDict (explored, didn't ship)

fast-dict-view's win was capped by the PDFDict instance footprint:
5 named slots (`_dictBuf`, `_dictStart`, `_dictEnd`, `_dictOwned`,
`context`) at ~96 B per instance. Across 261 k dicts that's ~25 MB
of per-dict object header.

The instance shape is what was costing us. Most of those fields are
small: `start` fits in 22 bits, `length` in 14 bits, `bufIdx` in
~15 bits (counting setOutline's owned dicts), `owned` is 1 bit. The
fields that *can't* obviously be made small are the `buf` and
`context` *references* -- but `buf` already gets reference-by-index
in fast-dict-view's design (via `_buffers[bufIdx]`), and `context`
is a *singleton* in our pipeline.

Prototyped as `fast-dict-double.mjs`. The idea: pack the whole
instance state into one 53-bit Number stored as PDFDict's single
`d` field, and treat the PDFContext as a module-level singleton.
Heap dropped 90 MB → 84 MB (-6 MB / -7 %); GC self-time
166.7 ms → 128.8 ms (-23 %). Promising, but the next move --
also packing the entries into one shared buffer -- gives a
cleaner overall shape and made fast-dict-double an opt-in
stepping stone rather than a shipping target. The shim doesn't
ship; the notes here document the design.

### One PDFContext per process

PDFContexts are created by `PDFParser.forBytesWithOptions` inside
`PDFDocument.load`. In our pipeline `PDFDocument.load` is called
exactly once per build (in `docs/render-book.mjs`), so exactly one
PDFContext exists during the process phase. The shim stashed that
one PDFContext in a module-level `_singletonContext` variable; the
`PDFDict.prototype.context` getter just returned it. Any second
distinct context would throw -- intentional bailout for workloads
this shim isn't a fit for (e.g. merging two PDFs in one process).

### 53-bit packed layout

That leaves everything else fitting in one Number:

```
bits  0-21: start   (22 bits, max 4 M slots; depth-0 hits 2.16 M)
bits 22-35: length  (14 bits, max 16 384 slots; max observed 8 706)
bits 36-50: bufIdx  (15 bits, max 32 768 buffers; book uses ~1 800
                    once setOutline creates per-outline-node
                    owned dicts via the factory)
bit  51   : owned flag
bit  52   : spare
```

Stored as a single `d` field on each PDFDict instance. Reads use a
mix of bitwise (for fields entirely below bit 32) and arithmetic
(for fields straddling or above 32, since JS bitwise ops cast to
int32):

```js
function _start(d)  { return d & MASK_22; }                  // bitwise
function _length(d) { return Math.floor(d / POW_22) & MASK_14; }
function _bufIdx(d) { return Math.floor(d / POW_36) & MASK_15; }
function _owned(d)  { return Math.floor(d / POW_51) & 1; }
```

Writes:

```js
function pack(start, length, bufIdx, owned) {
  if (start  >= MAX_START)  throw new Error('start overflow');
  if (length >= MAX_LENGTH) throw new Error('length overflow');
  if (bufIdx >= MAX_BUFIDX) throw new Error('bufIdx overflow');
  return start + length * POW_22 + bufIdx * POW_36 + (owned ? POW_51 : 0);
}
```

Overflow guards: if any field exceeds its budget, the shim throws
with a clear message. The budgets are sized 2-5x the book's
observed workload, so this is a guardrail for surprise inputs
rather than a hot path.

### V8 representation

A property whose values consistently fall outside Smi range (which
`d` does, since `bufIdx * 2**36` immediately exceeds 2^31) gets
stored either inline as DoubleField (8 B inline double) or via
TaggedField (8 B pointer + ~16-24 B HeapNumber). Empirically the
heap drop was consistent with most instances using DoubleField:
the `fastParseDictView` row's combined self+`_makeFromView` self
dropped from 40.96 MB to 35.34 MB (an extra ~5 MB beyond what
plain buffer-sharing achieved).

### Subclasses

PDFCatalog and PDFPageTree add no instance fields beyond `d`.
PDFPageLeaf still needs `normalized` and `autoNormalizeCTM` as
separate slots; that's ~1.6 k page leaves out of 261 k total dicts
on the book, a small fraction.

### Measured wins

Heap profile (paired `--heap-profile-process --heap-sampling 512`,
fast-dict-view baseline vs + fast-dict-double):

| Allocator                          | Pre (KB)  | Post (KB) | Delta             |
|------------------------------------|----------:|----------:|------------------:|
| `fastParseDictView` / `*Double`    |  40 955.37 |  18 913.63 | -22.0 MB         |
| `_makeFromView` (separate child row)|    773.09 |  16 429.68 | +15.7 MB         |
| Combined (fastParse* + _makeFromView)| 41 728.46 |  35 343.31 | **-6.4 MB**      |
| Total sampled                      |  89.68 MB |  83.68 MB | **-6.0 MB (-7 %)** |

(`_makeFromView` shows up as a bigger separate row because V8
de-inlined it slightly differently for fast-dict-double, but the
combined "PDFDict construction overhead" dropped ~6 MB.)

CPU profile (paired `--cpu-profile-process --cpu-sampling 100`):

| Row                          | Pre (ms) | Post (ms) | Delta                |
|------------------------------|---------:|----------:|---------------------:|
| (garbage collector)          |   166.71 |    128.81 | **-37.9 ms (-23 %)** |
| `fastParseDictView` / `*Double` |    28.95 |     44.36 | +15.4 ms (incl COW + pack/unpack) |
| Total profile duration       |   1.03 s |    0.97 s | -60 ms (-6 %)        |

The GC self-time drop is the headline: less heap allocation
directly translates to less GC work. The fastParseDict* row went
up a bit (more arithmetic in unpack), but the saving on GC and
elsewhere comfortably outweighs it.

### Cumulative arc

Starting from the original Map-backed PDFDict:

| State                            | Total sampled | Change vs prior |
|----------------------------------|--------------:|----------------:|
| Map-backed (pre-fast-dict-array) |   152 MB      | -               |
| fast-dict-array (INITIAL_SLOTS=10)|    92 MB     | -60 MB          |
| fast-dict-view (shared buffers)  |    90 MB      | -2 MB           |
| **fast-dict-double**             |    **84 MB**  | **-6 MB**       |

**-45 % cumulative reduction in process-phase heap traffic.**

### Caveats

- **Single context assumption.** If you load a second PDFDocument
  in the same process the shim throws. For our build pipeline this
  is fine; for general pdf-lib use a multi-context variant would
  need an array + small ctxIdx field.
- **Bit budgets.** Sized for the book and similar PDFs. A PDF with
  a top-level dict count exceeding 4 M entries (very large book or
  pathological generator) would trip the start budget; a PDF with
  a single dict larger than 8 192 entries would trip length;
  setOutline producing more than 32 k owned dicts would trip
  bufIdx. All three are deliberate guards rather than expected
  failures.
- **Arithmetic in hot path.** Each read of a high-bit field is one
  `Math.floor(d / 2**n) & mask`. V8 optimizes division by
  powers-of-2 well, but it's not free. The 23 % GC drop is the
  empirical confirmation that the heap savings outweigh the
  unpack cost.

The next prototype (one-buffer PDFDict) keeps the
"packed-into-Number" idea but moves the entries themselves into
a single per-parser mainBuf, which folds the bufIdx field away
and lets a tighter bit layout track the (mainBuf-relative) start
+ length directly. That's what ends up shipping.

## One-buffer PDFDict

After the fast-dict-double prototype, the heap picture showed
~1 780 backing arrays in flight: 3 per-depth parser buffers,
~1 773 owned buffers created by setOutline's factory calls (one
per outline node), plus a few during save. Each owned buffer
has Array-header overhead; each parser-buffer needed its own
slot in the `_buffers` registry. And `bufIdx` in the packed
value had to be wide enough to address all of them -- 15 bits.

Using **one buffer** for every committed PDFDict entry across the
whole document would:

- drop ~1 780 Array headers to 1
- drop `bufIdx` from the packed value entirely (always 0)
- keep all dict data in contiguous memory (better cache behavior)

This is what ships as
[fast-dict-onebuf.mjs](../../docs/lib/fast-dict-onebuf.mjs). It
takes the place of fast-dict-array on the production import in
`render-book.mjs`. Earlier dict-shape shims (fast-dict-array,
fast-dict-iter, fast-parse-dict) stay in the tree as A/B
baselines; the harness mutex rejects combining them.

### The recursion gotcha (again)

A single shared buffer breaks naive parseDict recursion exactly
like it did when the view-based prototype first hit the same
question: inner recursion writes into the middle of outer's
entries, breaking outer's contiguous range.

The fix is a **two-area split**:

- `main` -- one long-lived buffer for committed entries. Append-only.
- `temp` -- small per-parser working area for active parseDict
  frames. Reused across all parseDict calls on the parser.

```
parseDict invocation (at any recursion depth):
  frameStart = temp.length
  while (parsing) {
    key   = parseName()
    value = parseObject()      // may recurse; temp grows then pops
    temp.push(key, value)       // ON TOP of anything recursion left
  }
  // Commit this frame to main in one contiguous append
  start = main.length
  for entry in temp[frameStart..temp.length]:
    main.push(entry)
  // Pop our frame off temp
  temp.length = frameStart
  return PDFDict with view (start, length)
```

Outer's entries stay parked in `temp[frameStart..]` while inner
recurses. Inner appends ON TOP of outer, commits its frame to
`main` in one append, and pops its frame off `temp`. Outer's
frame is intact at the top of `temp` again; outer continues
pushing. When outer commits, its entries are contiguous in `temp`
and commit contiguously to `main`. Outer's and inner's ranges in
`main` are at distinct, non-overlapping offsets.

`temp` is tiny -- max recursion depth × max single-dict size = a
couple dozen slots peak on the book.

### Mutations

The shared (parser-created) range is read-only after parse. The
ownership flag in `d` distinguishes shared from owned dicts:

- **`set` with existing key**: in-place replace at `main[start +
  i + 1]`. Safe for both shared and owned; no shifts.
- **`set` with new key, dict at main's high-water mark**: just
  `main.push(key, value)` and extend the range by 2. Common for
  owned dicts that have just been created and are being filled
  with `.set` calls (the outline construction pattern).
- **`set` with new key, dict not at high-water mark**: COW. Copy
  the range to `main`'s tail, append new pair, update encoded
  value. Happens when other dicts were created between this dict's
  creation and the `.set` call.
- **`delete`**: always COW (shifting slots in `main` would corrupt
  other dicts that point into the affected region).

For setOutline's pattern -- create outline dict, recurse to build
children, then call `.set(Prev/Next/First/Last/Count)` on it --
the first `.set` after the recursion COWs the dict to the tail.
Subsequent `.set`s on the same dict extend in place. Net: ~one
COW per outline dict, ~5 entry copies each = ~9 k pair copies
total. Negligible.

### Bit layout

With `bufIdx` gone, the packed value shrinks:

```
bits  0-23: start  (24 bits, max 16 M slots in main)
bits 24-37: length (14 bits, max 16 384 slots; max observed 8 706)
bit  38   : owned flag
bits 39-52: spare (14 bits)
```

37 bits used. Still above Smi range (so V8 stores `d` as a
DoubleField or HeapNumber), but with plenty of headroom and a
much cleaner layout.

### Measured wins

Heap profile (paired `--heap-profile-process --heap-sampling 512`,
fast-dict-double baseline vs + fast-dict-onebuf):

| Allocator                          | Pre (KB)  | Post (KB) | Delta             |
|------------------------------------|----------:|----------:|------------------:|
| `fastParseDictDouble` / `*OneBuf`  |  18 913.63 |       — (out of top 10) | **-18.9 MB**   |
| `_makeFromView` / `_makeFromRange` |  16 429.68 |  16 613.10 | flat              |
| PDFObjectParser.parseArray         |  19 502.52 |  19 512.08 | flat              |
| Total sampled                      |  83.68 MB |  65.55 MB | **-18.1 MB (-22 %)** |

The dominant change: `fastParseDictDouble` had 18.9 MB of self-
attributed allocations (the 3 parser per-depth buffers' growth +
the per-dict array creation in factory paths). With fast-dict-
onebuf, those are gone entirely -- everything appends to `main`,
which is allocated once.

CPU profile (same paired methodology, with the wall-clock-is-noisy
caveat):

| Row                              | Pre (ms) | Post (ms) | Delta              |
|----------------------------------|---------:|----------:|-------------------:|
| (garbage collector)              |   128.81 |    151.05 | +22.2 ms           |
| `fastParseDictDouble` / `*OneBuf` |    44.36 |     53.44 | +9.1 ms            |
| Total profile duration           |   0.97 s |    1.05 s | +80 ms (~8 %, within machine noise) |

GC self-time bumped up a bit. The `main` buffer is one giant
~19 MB live object now; V8's mark phase scans it every cycle even
though we're allocating less new garbage. Heap throughput went
down 22 %, but live-heap mark cost went up modestly. On this
machine wall-clock isn't a reliable signal anyway; the heap
reduction is the headline.

### Cumulative arc

| State                            | Total sampled | Change vs prior |
|----------------------------------|--------------:|----------------:|
| Map-backed (pre-fast-dict-array) |   152 MB      | -               |
| fast-dict-array                  |    92 MB      | -60 MB          |
| fast-dict-view  (explored)       |    90 MB      | -2 MB           |
| fast-dict-double (explored)      |    84 MB      | -6 MB           |
| **fast-dict-onebuf**             |    **66 MB**  | **-18 MB**      |

**-57 % cumulative reduction since the start of this PDFDict
storage-shape work.** Staging's chain skips the two intermediate
shims and goes from fast-dict-array straight to fast-dict-onebuf;
the heap drop on that direct hop is 92 → 66 MB (-28 %).

### Caveats

- **Single context.** Same singleton-PDFContext assumption that
  fast-dict-double introduced: throws if a second PDFContext is
  constructed in the process. Fine for our build pipeline (one
  `PDFDocument.load` per build); a general-purpose variant would
  need an array + small ctxIdx field.
- **Single 24-bit start budget.** If `main` exceeds 16 M slots
  (8 M entries) the next pack() throws. The book's `main` peaks
  at ~2.4 M slots; 6x headroom.
- **COW on delete.** Always. Cheap for small dicts; could be slow
  for huge dicts with frequent deletes. Not a pattern we see.
- **Live `main` is bigger than the prior approach's transient
  allocations.** GC mark phase pays for that. The tradeoff -- less
  *allocation* (heap throughput) but slightly more *live* (mark
  cost) -- shows in the modestly higher GC time. Profile both
  signals when evaluating.

### Shipped

`docs/render-book.mjs` imports
[`./lib/fast-dict-onebuf.mjs`](../../docs/lib/fast-dict-onebuf.mjs)
in place of the prior `./lib/fast-dict-array.mjs`. fast-dict-array
stays in the tree as an A/B baseline; the `--fast-dict-onebuf`
mutex in `measure.mjs` rejects combining either with the other
dict-shape shims.

## Two-pass measure-allocate-work: Phase 0 viability gate

After fast-dict-onebuf, GC self-time settled at ~150 ms / 15 % of
the process phase. V8-flag knobs (`--max-semi-space-size`,
`--max-old-space-size`, `--no-incremental-marking`,
`--gc-interval=-1`) didn't move it -- mark cost is dominated by
walking the live set, not by allocation rate. The remaining
attack surface is **shrink the live set V8 has to mark**, ideally
by representing dict slots as Numbers (a Float64Array mainBuf)
rather than Object references.

That option needs an encoding scheme for every value type that
can live in a dict slot. Names, refs, numbers, and nested dicts
are already pooled or naturally Number-encodable. PDFArray,
PDFString, and PDFHexString are not pooled today, so they'd need
a side `Object[]` fallback -- which V8 still marks. The fallback
would shrink mark cost in proportion to how many slots are
pooled, but not eliminate it.

The cleaner version sidesteps the encoding-headroom question
entirely by **measuring before allocating**:

1. **Measure pass** -- walk the bytes as a state machine, no
   PDFObject instantiation. Produce only counts and small
   interning tables (Map<name, id>, dense ref array).
2. **Allocate pass** -- every pool sized exactly: mainBuf as
   `Float64Array(exact_slot_count)`, name/ref/number pools as
   exact-sized arrays, string buffer as one exact-sized
   `Uint8Array`. No growth, no slack.
3. **Work pass** -- re-parse, this time encoding each value as a
   pool-index Number into mainBuf. Every pool's size is known so
   the encoding scheme is trivial (3 bits of type tag + N bits
   of pool index, all fitting comfortably in 53 bits). All of
   mainBuf is Float64; V8 marks nothing in it.

The catch: a second parse is more CPU. Today's load is ~1.2 s on
the 39 MB Chrome input; if measure-pass were 600 ms we'd regress
on CPU even if GC dropped to zero. Phase 0 is a viability gate:
implement the no-allocate measure pass, time it, decide whether
the architecture is worth the engineering surface.

### The walker

[`perf/phase0-measure.mjs`](../phase0-measure.mjs) is a
no-allocate byte walker that recognises the PDF grammar:
indirect-object headers, dicts (`<< ... >>`), arrays
(`[ ... ]`), names (`/foo`), strings (`(...)`), hex strings
(`<...>`), numbers (integer and real, with or without a leading
integer part), refs (`X Y R`), streams (detected as `dict`
followed by `stream` keyword), and ObjStms (detected via
`/Type /ObjStm` and inflated to recurse).

Allocation discipline:

- No string concat anywhere. Names, numbers, and strings are
  skipped by advancing the byte cursor without keeping bytes.
- Counters and per-frame dict captures live on typed-array
  stacks (`Int32Array`, `Uint8Array`), depth-indexed to a max
  of 64 (observed max recursion is 4).
- ObjStm offset arrays are reusable `Int32Array(512)` instances,
  grown on demand. The inflate destination is a fresh Buffer
  per ObjStm (Chrome's raw output has zero ObjStms anyway; book.pdf
  has 453 of them after pdf-lib's save bundles them).
- Per-dict capture stack stores `/Length`, `/Type` (matched
  against `ObjStm`), `/N`, `/First` -- enough to detect streams
  and seek through them without a fallback scan in the common case.
  Key disambiguation is inline byte comparison against the four
  known stream-related names; everything else falls through to
  unconditional name-body skip.

### Two corners worth remembering

- **PDF reals can omit the integer part.** `.251` is a valid
  number; the first cut required `>= 1` integer digit and threw
  on `<</CA .251 ...>>` (Chrome emits `/CA` and `/ca` alpha
  values this way). Fix: accept `[sign?][digits?][. [digits?]]?`
  with the constraint that at least one digit (int OR frac)
  appears. pdf-lib's `parseRawNumber` handles this natively;
  custom byte walkers have to remember.
- **fast-dict-onebuf is singleton-context.** A second
  `PDFDocument.load` in the same process throws. The Phase 0
  comparison runs measure-pass N times (independent) but the
  pdf-lib load only once.

### Measured cost

Input: `perf/raw.pdf` (39.3 MB, Chrome's raw output for the book,
saved via the new `--dump-raw-pdf` flag below).

| Pass                           | Time              | Notes                                |
|--------------------------------|------------------:|--------------------------------------|
| Measure pass (min of 5)        |          **135 ms** | runs were 135 / 143 / 147 / 152 / 156 |
| `PDFDocument.load` (1 run)     |         **1238 ms** | production shim set imported         |
| **ratio measure / load**       |        **0.109**  | ~9x cheaper                          |

Throughput cross-check: book.pdf is 15.3 MB but the measure pass
inflates 23.2 MB of ObjStm content, so effective bytes walked is
~38.5 MB. raw.pdf walks 39.3 MB. Both clock ~290 MB/sec; the
work-per-byte is consistent across two very different physical
layouts.

### What the counts unlock

Per-run summary (raw.pdf, last run):

```
  indirect objects:  226 417
  dicts:             260 966   slots: 2 340 522   max single: 8 706
  arrays:             81 191   slots:   495 639   max single: 25 308
  refs (appearances):       749 779
  names (appearances):    1 679 151
  numbers (appearances):    284 104
  strings (literal/hex):    7 375 / 0
  streams:                    2 061   ~11 MB content
  objstms:                        0
  max recursion depth:            4
```

Direct consequences for Phase 1+:

- `mainBuf` would be `Float64Array(2 340 522 + slack)` -- a hard
  upper bound, no growth ever.
- Array-side mainBuf would be `Float64Array(495 639 + slack)`.
- Recursion stack peaks at 4; no need to overallocate the temp.
- Single largest dict is 8 706 slots, single largest array is
  25 308 slots -- both well below the 14-bit length field
  fast-dict-onebuf already uses.

Three caveats on the counts:

- **Appearance counts, not unique.** 1.68 M name appearances
  resolve to a few thousand unique strings after interning. The
  measure pass needs an interning Map<string, id> for names
  (and similar for refs) to produce the *unique* pool sizes
  needed for exact allocation. That's a Phase 1 addition --
  cheap to add, will slightly raise measure-pass cost.
- **Counts are physical-layout-independent.** raw.pdf has
  226 k flat indirect objects and zero ObjStms; book.pdf has
  2.5 k indirect objects of which 453 are ObjStms bundling 226 k
  dicts. The *dict* count is identical (~261 k) either way.
  This is the right invariant: pool sizing tracks the logical
  document, not Chrome's vs pdf-lib's packing decision.
- **Stream-length capture is fast-path-only.** When `/Length`
  is a direct integer (the common case) we seek by it. When it's
  a ref (`/Length 5 0 R`) we fall back to scanning for
  `endstream`. We don't currently count fallbacks; would need to
  add a counter if it ever looks like a non-trivial fraction.

### Decision

Architecture cleared. Measure-pass at ~11 % of load leaves
plenty of headroom: even if the work pass came out at 80 % of
current load (~990 ms) we'd land at 135 + 990 = 1 125 ms vs the
current 1 238 ms -- net win on CPU before any GC reduction. The
Float64Array mainBuf in the work pass should compound on top of
that.

### Wiring

- **[`perf/measure.mjs`](../measure.mjs)** gains a `--dump-raw-pdf
  <path>` flag. When set, the harness writes the raw Chrome
  output (the input to pdf-lib's load) to the given path right
  after `page.pdf()` returns. Used once to capture the canonical
  input; not part of any routine run.
- **`perf/raw.pdf`** (gitignored) is the canonical 39.3 MB
  Chrome-output PDF, captured with the production shim set and
  the new flag. The reference input for measure / heap-profile
  investigations going forward.
- **[`perf/phase0-measure.mjs`](../phase0-measure.mjs)** is the
  prototype walker. Takes a PDF path and `--runs N`, runs the
  measure pass N times, then runs `PDFDocument.load` once
  (singleton-context), prints counts and the measure / load
  ratio. Defaults to the most recent `perf/results/*/book.pdf`
  if no path is given.

Run it via:

```
node perf/phase0-measure.mjs perf/raw.pdf --runs 5
```

The prototype is measurement-only -- it doesn't ship in any
production path. Phase 1 (next section) wires the measure-pass
into production by using the dict-slot count to pre-size
fast-dict-onebuf's mainBuf in place.

## Phase 1: pre-size mainBuf via measure-pass

The narrow first step of the two-pass architecture. Productionises
Phase 0's walker, exposes a `setExpectedDictSlots()` hook on
fast-dict-onebuf, and wires the two together. Replaces
`new Array(MAIN_INITIAL_CAP = 2_400_000)` with
`new Array(measuredDictSlots)` -- exact, no slack, no V8 growth.

This is plumbing, not a perf win. The mainBuf savings are
trivial (~60 K slots of slack on a 2.34 M-slot backing store)
and the measure pass itself costs ~60 ms inline. Net cost on
the book is ~40 ms (the measure-pass time minus run-to-run
noise on load). What Phase 1 buys is **landing the two-pass
pipeline byte-identical** so a future Phase 2 (Float64Array
mainBuf) can convert the storage type without re-doing the
plumbing.

### The shim

- [`docs/lib/measure-pass.mjs`](../../docs/lib/measure-pass.mjs)
  -- a direct port of the Phase 0 `Measurer` class as a
  production library. Exports the class and a
  `measure(bytes) -> counts` convenience wrapper. No
  dependencies on any `fast-*` shim or on pdf-lib itself; it's
  a stand-alone byte walker.
- [`docs/lib/fast-dict-onebuf.mjs`](../../docs/lib/fast-dict-onebuf.mjs)
  -- gains `setExpectedDictSlots(slots, slack = 1.0)`. Resizes
  the module-level `main` in place via
  `main.length = ceil(slots * slack)`. Throws if called after
  `mainLen > 0` (i.e. after any dict has been committed). Used
  by the measure-pass wiring; harmless to ignore.
- [`perf/measure.mjs`](../measure.mjs) `--measure-pass` --
  runs the walker on rawPdf, calls
  `setExpectedDictSlots(counts.dictSlots)`, then proceeds to
  `PDFDocument.load`. Mutex-checked against `--incremental`,
  `--render-only`, and the (required) `--fast-dict-onebuf`.

### A V8 IC-invalidation gotcha (worth the diversion)

First implementation reassigned the module binding:

```js
let main = new Array(MAIN_INITIAL_CAP);  // module load
// ...
export function setExpectedDictSlots(slots) {
  main = new Array(slots);                // setter
}
```

JS closures see the current binding value -- the reassignment
*works correctly* in the language sense, and structural validation
passes. But the heap profile showed `_appendEntries` jumping from
below-threshold (~430 KB) to **27 MB / 29 %** of total samples,
with sampled heap going **65 → 92 MB (+27 MB)**.

Hypothesis trail:
- First guess: HOLEY_SMI_ELEMENTS → HOLEY_ELEMENTS transition on
  first Object-pointer write, reallocating the ~18 MB backing
  store. Pre-filling with `arr.fill(null)` to force the transition
  at allocation time -- *no change*.
- Second guess: V8's inline caches in `_appendEntries`,
  `PDFDict.prototype.get`, etc. specialised for the original
  `main` object (its hidden class, element kind, address).
  Rebinding `main` to a fresh Array makes the IC slots stale;
  every call deopts, recompiles, and accumulates allocation
  overhead attributed to the running frame.

Fix: keep the same Array identity, just resize.

```js
const main = new Array(MAIN_INITIAL_CAP);  // module load, back to const
export function setExpectedDictSlots(slots) {
  main.length = slots;                     // in-place resize
}
```

That collapses the regression to noise (+0.14 MB heap, ~0 ms
CPU). Lesson: **never rebind a module-level value that hot
closures specialise against, even if the language semantics
allow it.** Mutate in place.

### Validation: byte-identical output

Two full-pipeline runs through the production shim set, one
with `--measure-pass` and one without. Both produce a 1 651-page,
1 773-outline-node, "twinBASIC Documentation"-titled PDF; bytes
differ by 31 due to Chrome's per-run rawPdf timestamps, which
propagate through `pdfDoc.save`. Structural identity confirmed.

| Field                | baseline           | with measure-pass  |
|----------------------|--------------------|--------------------|
| pages                | 1 651              | 1 651              |
| outline nodes        | 1 773              | 1 773              |
| title                | "twinBASIC Documentation" | "twinBASIC Documentation" |
| bytes                | 16 077 319         | 16 077 288         |

### Measured cost (after the in-place-resize fix)

Paired runs, production shim set, on the book (39 MB rawPdf):

| Phase             | Without measure-pass | With measure-pass | Delta |
|-------------------|---------------------:|------------------:|------:|
| measure-pass      | -                    | 60 ms             | +60   |
| load              | 520 ms               | 500 ms            | -20   |
| save              | 420 ms               | 420 ms            |   0   |
| **process total** | **950 ms**           | **990 ms**        | **+40** |

The 60 ms inline-measure number is faster than the 135 ms
standalone Phase 0 number, almost certainly because rawPdf is
still hot in CPU caches from `page.pdf()`. Standalone phase0-
measure.mjs reads it cold from disk into a Buffer first.

The -20 ms on load is within run-to-run noise on this machine.
The honest summary: Phase 1 adds the cost of the measure pass
itself (~60 ms) and not much else.

### Measured heap

Paired heap-profile runs (`--heap-profile-process --heap-sampling
512`), top frames:

| Frame                                | Baseline (KB) | With measure (KB) | Delta |
|--------------------------------------|--------------:|------------------:|------:|
| `PDFObjectParser.parseArray`         |     19 583.67 |         19 435.74 | flat  |
| `_makeFromRange`                     |     16 510.94 |         16 657.94 | flat  |
| `parseIndirectObjectHeader`          |     13 510.65 |         13 558.62 | flat  |
| `fastOf`                             |      7 695.92 |          7 817.85 | flat  |
| `parseIndirectObjectSync`            |      2 101.19 |          2 102.32 | flat  |
| `_appendEntries` (post-fix)          |          ~430 |              ~430 | flat  |
| **total sampled**                    |  **65.27 MB** |      **65.41 MB** | **+0.14 MB** |

Flat as expected. Phase 1 doesn't change what gets allocated --
only the initial capacity of the backing Array, which is a
one-time module-load-time cost that the process-phase profile
doesn't see.

### Caveats

- **Requires --fast-dict-onebuf.** The only shim that consumes
  `setExpectedDictSlots` so far. The mutex check enforces this.
- **Singleton context inherited.** Phase 1 doesn't loosen
  fast-dict-onebuf's "one PDFContext per process" constraint --
  same throw-on-second-load behaviour.
- **Pre-sizing assumes the measure and load see the same bytes.**
  Always true for our pipeline (rawPdf is computed once, both
  measure and load read it). Would break if the bytes mutated
  between measure and load -- not a pattern we have.
- **Counts are appearances, not unique.** Phase 1 only needs
  dict-slot count, which is an appearance count (every slot is
  one). Any later phase 2+ pool sizing would need unique counts
  and would add interning to the walker.

### Where this lands

`--measure-pass` ships behind a harness flag at first, then gets
wired into [`docs/render-book.mjs`](../../docs/render-book.mjs)'s
production import chain in a subsequent commit (the "enable
Phase 1 measure-pass in production" change). The decision to
ship it was bounded: it's the smallest of the four Phases we
evaluated and the only one whose tradeoff is acceptable for
production. Phase 2 is a net regression on its own; Phase 3 /
3β recover most of it for a ~7 MB heap win that doesn't justify
the CPU cost. Phase 1's bound on mainBuf isn't material on its
own (~60 K slots out of 2.4 M of slack), but it lays the
plumbing for any future shape change to ship without re-doing
the wiring.

[`docs/lib/measure-pass.mjs`](../../docs/lib/measure-pass.mjs)
ships as a library (the production home of the walker).
`perf/phase0-measure.mjs` is left alone -- it's the historical
record of the viability gate, intentionally self-contained even
though it now duplicates the walker.

## Dropping the owned bit (post-Phase-1 cleanup)

The One-buffer PDFDict layout above carried an `owned` flag at
bit 38, distinguishing parser-created ("shared") ranges from
factory-created ("owned") ones. Its only behavioural effect was
gating the `set` append path: a dict was allowed to extend in
place at the high-water mark only if `owned`.

Re-reading the safety argument: each parseDict commits a
contiguous frame to main and mainLen advances past it. No two
PDFDict instances share slots. So if a dict's range satisfies
`start + length === mainLen`, nothing past mainLen is initialised
and the slots are free to claim -- *regardless* of whether the
range came from the parser or a factory call. The owned/shared
distinction doesn't correspond to anything the safety check
needs.

Dropping it:

- `pack(start, length)` -- third arg gone, no OR-in of `POW_38`.
- `_owned`, `POW_38` -- deleted.
- `_cow` -- collapses to one branch (was two identical-except-
  for-the-HWM-early-return paths).
- `set` -- the gating condition simplifies from
  `!_owned(d0) || start0 + length0 !== mainLen` to just
  `start0 + length0 !== mainLen`.
- `_makeFromRange(ProtoClass, start, length, ctx)` -- owned param
  gone; `_ownedFromArray` renamed `_makeFromAppend` for accuracy.
- Bit 38 is now spare; spare grows from 14 to 15 bits.

Net behavioural change: shared dicts that still abut the HWM at
first `set` now extend in place instead of COWing, saving ~5-10
slot copies per such mutation. Tiny win, but in the right
direction.

Validated byte-identical on both the no-measure-pass path and
the `--measure-pass` path; structural diff (1 651 pages, 1 773
outline nodes, matching titles) holds. Heap is flat as expected
-- this is a code simplification, not an allocation-pattern
change.

## Slot-type histogram for mainBuf

The next attack surface on GC self-time -- the ~150 ms left after
fast-dict-onebuf -- is converting `main` from `Array` (Object
references that V8 must mark) to `Float64Array` (Number slots
that V8 ignores during mark). That only works if every slot
value can be encoded as a Number, or pooled into a side table
where the marker count is small.

To scope that work, [`perf/instrument-slot-types.mjs`](../instrument-slot-types.mjs)
walks `main[0..mainLen)` after setOutline and classifies each
slot by PDFObject subtype. The instrumentation hangs off two new
exports on fast-dict-onebuf (the `main` Array itself and a
`getMainLen()` getter) and runs behind a new
`--instrument-slot-types` flag on `measure.mjs` that requires
`--fast-dict-onebuf` and skips the incremental / render-only
paths.

Distribution on the book (production shim set + `--measure-pass`,
total slots = 2 358 630, keys = 1 179 315, values = 1 179 315):

```
type           keys      key%       values    value%   total%
-----------------------------------------------------------------
PDFName        1179315   100.00%    493256    41.83%   70.91%
PDFRef               0     0.00%    435217    36.90%   18.45%
PDFNumber            0     0.00%    162325    13.76%    6.88%
PDFArray             0     0.00%     79468     6.74%    3.37%
PDFDict              0     0.00%      5660     0.48%    0.24%
PDFHexString         0     0.00%      1776     0.15%    0.08%
PDFString            0     0.00%      1601     0.14%    0.07%
PDFBool.True         0     0.00%        12     0.00%   0.0005%
PDFBool.False        0     0.00%         0     0.00%        0
PDFNull              0     0.00%         0     0.00%        0
```

Key findings:

1. **Keys are 100 % PDFName** -- the even/odd invariant the
   parser maintains holds. Encoding keys as the name's pool
   index is unambiguous.
2. **Four big pools (Name, Ref, Number, Dict) cover 96.4 % of
   all slots.** Encoding them directly as Numbers in a
   Float64 mainBuf collapses ~96 % of slot-mark traversals.
3. **Side-pool fallback for unpooled types (Array, String,
   HexString) is ~3.5 %** -- ~82 800 slots that V8 would
   still mark via the side `Object[]`, vs ~2.34 M today.
4. **Nested PDFDicts as slot values are only 5 660** -- most
   dicts are referenced via PDFRef rather than embedded inline.
5. **Bool / Null / RawStream in dict slots are essentially zero**
   -- tag-only encoding (a few reserved sentinel Numbers)
   covers them.

Classification cost: 39 ms (single pass over 2.36 M slots).

This shape is informative even though it doesn't itself ship a
change. The subsequent Phase 2 / Phase 3 prototypes (next two
sections) use these numbers to predict their wins; both turn out
not to ship for reasons documented there.

## Phase 2: Float64Array mainBuf + encoded slots (explored, didn't ship)

The next architectural step from Phase 1. `main` becomes a
`Float64Array`; every entry (key and value alike) is encoded as
a 4-bit type tag + 49-bit pool id / payload packed into a single
Float64. The hypothesis was that V8 would stop marking the 2.34 M
Object-ref slots in `main` during GC, dropping mark-phase cost.

Prototyped as `fast-dict-encoded.mjs`. Outcome: **wash.** The
slot-mark-cost win is real (mainBuf's 2.34 M Object-ref slots →
Float64 slots → V8 marks zero of them) but the cost wasn't large
enough to matter -- pointer-array marks are fast in V8. The
encoding overhead (per-slot encode at parse, per-slot decode at
save) roughly cancels the savings; heap goes up ~3 MB from the
new pool Maps (numberByValue, stringByValue, hexByValue,
refGnByKey). The code was kept in faraday as opt-in (foundation
for Phase 3) but is not pulled into staging; the design rationale
below is the takeaway worth preserving.

### Encoding scheme

```
Float64 slot (within Number.MAX_SAFE_INTEGER = 2^53 - 1):
  bits 49-52  : type tag (4 bits, 16 possible, 11 used)
  bits  0-48  : payload (49 bits)

Tags:
  0   PDFNull       (payload = 0)
  1   PDFBool.False (payload = 0)
  2   PDFBool.True  (payload = 0)
  3   PDFName       (payload = name pool id)
  4   PDFRef gen=0  (payload = objectNumber)
  5   PDFRef gen!=0 (payload = side pool id)
  6   PDFNumber     (payload = number pool id)
  7   PDFDict       (payload = packed (start, length) -- the
                    existing 38-bit fast-dict-onebuf encoding)
  8   PDFArray      (payload = array pool id)
  9   PDFString     (payload = string pool id, value-dedup)
  10  PDFHexString  (payload = hex pool id, value-dedup)
  11-15  reserved
```

### Pool subsumption

The shim absorbs three existing pool shims under one umbrella:

- `PDFRef.of` -- patched to assign `_encId` to each instance;
  gen=0 uses `objectNumber` as id (dense `refByObjNum[]`); gen!=0
  uses a sequential side-pool. Would subsume **`--fast-refs`**.
- `PDFNumber.of` -- patched to assign `_encId`; value-dedup via
  `numberByValue` Map + parallel `numberById[]`. Would subsume
  **`--fast-pdfnumber-pool`**.
- `PDFName.of` -- pdf-lib already pools by string; extended
  with `_encId` assignment + `nameById[]` for decode.
- `PDFArray`, `PDFString`, `PDFHexString` -- new pools (none
  existed). `PDFArray` is mutable so no value-dedup, just
  sequential id. Strings/HexStrings are immutable so dedup by
  `value`.

Mutually exclusive with `--fast-dict-onebuf`, `--fast-refs`,
`--fast-pdfnumber-pool`, and the older dict-shape shims.

### A trap worth recording: eager dictByPayload caching

The first cut of `_makeFromRange` registered every parse-created
PDFDict in a `dictByPayload` Map so `decodeValue(TAG_DICT)` would
return the same instance. That writes 261 k Map entries during
parse -- `set @ (no url):0` shot to **15.4 MB / 29 %** of the
heap profile, and total sampled heap went 65 → 92 MB (+27 MB).

The fix is the same kind of insight as the lazy materialization
pattern that surfaced earlier: top-level dicts (226 k) live in
`PDFContext.indirectObjects` and are never decoded via
`TAG_DICT` (their entries are in main, but they themselves
aren't slot values). Only nested dicts (~5 660) are accessed via
`TAG_DICT` decode. Caching them lazily on first access caps
`dictByPayload` at ~5 660 entries (~360 KB) and collapses the
regression. Same shape of bug as the IC-invalidation gotcha in
Phase 1: a plausible-looking eager cache landed an enormous heap
regression that only made sense once you saw which population
was actually being decoded vs only being written.

### Mixed measured result

| Metric | Phase 1 | Phase 2 | Delta |
|---|---:|---:|---:|
| Process wall (clean run) | 1.16 s | 1.18 s | ~+20 ms (noise) |
| GC self-time (CPU profile) | 151 ms | 149 ms | ~0 ms |
| GC total (`--trace-gc` full process) | 190 ms | 159 ms | -31 ms |
| Mark-Compact events | 8 | 10 | +2 |
| Scavenge events | 26 | 26 | 0 |
| Heap allocation sampled | 65.4 MB | 68.5 MB | **+3 MB** |
| Live mainBuf slots V8 marks | ~2.34 M | ~0 (Float64Array) | -100 % |
| Structural output | byte-identical | byte-identical | -- |

**Phase 2 is a wash.** The encoding overhead roughly cancels the
mark-phase savings, and the new pool Maps cost more than the
slot-mark reduction is worth.

The first CPU profile of P2 showed +39 ms GC and +130 ms wall,
but reruns landed it back near Phase 1. The original numbers were
single-run noise (slow Scavenge cluster on a busy machine).

### Why faraday kept it as opt-in, and why staging doesn't

Two reasons faraday left it in tree:

1. **Pool ID infrastructure is reusable.** Phase 3 (PDFArray
   storage refactor) uses the same encoding scheme, same pools,
   same `encodeValue` / `decodeValue` -- it piggybacks on
   Phase 2 for free.
2. **Validates the architecture.** Float64Array mainBuf works,
   byte-identical, no correctness issues. If a future workload
   stresses mainBuf mark cost more, Phase 2 would be ready.

Phase 3 also doesn't ship (next section), so the dependency
chain doesn't earn its keep on staging. Dropping Phase 2's code
keeps the production import chain narrow; the design notes here
are the part worth preserving.

## Phase 3: PDFArray storage refactor (explored, didn't ship)

Phase 2's `fast-dict-encoded.mjs` grew a sibling structure for
PDFArray. Each PDFArray instance becomes a view into a shared
`arrayBuf` Float64Array, with `this.d` packing `(start, length)`
-- same shape as PDFDict in Phase 2, with one more length bit
(max single array is 25 308 elements vs max single dict 8 706
slots). Per-instance `this.array = []` allocation goes away.

Same opt-in story as Phase 2 (and same don't-ship verdict on
staging): heap win is real but the CPU regression at save time
dominates.

### The mechanism

| | PDFDict (Phase 2) | PDFArray (Phase 3) |
|---|---|---|
| Backing buffer | `main` Float64Array | `arrayBuf` Float64Array |
| Per-instance | `this.d` = packed `(start, length)` | same |
| Bit budget | 24 + 14 = 38 bits | 24 + 15 = 39 bits |
| Slot encoding | 4-bit tag + 49-bit payload | same scheme |
| Lazy cache | `dictByPayload` | `arrayByPayload` |
| Parser temp | `_dictTemp` (Float64Array) | `_arrayTemp` (Float64Array) |
| TAG_ARRAY slot | was `OFF_ARRAY + arrayId` | now `OFF_ARRAY + arr.d` |

Phase 2's `_assignArrayId` and `arrayById[]` pool are gone -- the
view-payload encoding makes them obsolete. Phase 2's encoding
scheme for TAG_ARRAY changes from a pool-id payload to the
direct `(start, length)` payload that mirrors TAG_DICT.

### Mutation paths

`PDFArray.prototype` methods rewritten:

- `size` -- reads length from `this.d`
- `push` -- extend in place at HWM, else COW (same pattern as
  PDFDict.set's append case)
- `get(i)` / `set(i, v)` -- decode/encode at `arrayBuf[start + i]`
- `insert(i, v)` / `remove(i)` -- always COW (would corrupt
  neighbouring arrays' ranges otherwise)
- `indexOf` -- compare encoded payloads, no decode needed
- `asArray` / `clone` / `toString` / `sizeInBytes` /
  `copyBytesInto` -- decode each element

`PDFArray.withContext` bypasses the inherited constructor's
`this.array = []` allocation by `Object.create`-ing the
instance and setting `this.d` directly.

### parseArray patch

Same temp-then-commit pattern as parseDict. Each parser instance
gets its own `_arrayTemp` Float64Array; parseArray pushes
encoded elements onto temp, commits the frame to `arrayBuf` in
one contiguous `arrayBuf.set(...)`, pops temp back. Recursion
across dicts and arrays is fine because `_dictTemp` and
`_arrayTemp` are separate.

### Measured result: heap win + CPU regression

Combined Phase 2+3 vs Phase 1 baseline (paired, production set):

| Metric | Phase 1 baseline | Phase 2+3 | Delta |
|---|---:|---:|---:|
| Heap sampled | 65.4 MB | **57.8 MB** | **-7.6 MB (-12 %)** |
| `parseArray` self-attribution | 19.6 MB | ~0 (out of top 10) | **-19.6 MB**, replaced by arrayBuf-mediated writes |
| `_makeFromRange` | 16.5 MB | 14.3 MB | -2.2 MB |
| GC self-time (CPU profile) | 149 ms | 144 ms | -5 ms (flat) |
| Process duration | 1.09 s | 1.45 s | **+360 ms (+33 %)** |
| Structural output | byte-identical | byte-identical | -- |

The heap win is what we hoped for: PDFArrays stop allocating
per-instance `[]` backing arrays (79 k of them), and parseArray
stops attribution because writes go to the shared `arrayBuf`.

The CPU regression is the killer. The cost comes from per-slot
decode during save -- `PDFDict.copyBytesInto` and
`PDFArray.copyBytesInto` together iterate ~3 M slots, calling
`decodeValue` once per slot. `decodeValue` is a 10-case switch
plus a pool lookup; V8 doesn't inline it across the prototype
boundary. ~100 ns per call × 3 M = ~300 ms. GC didn't move
much. The slot-mark savings from Float64Array `arrayBuf` are
real, but as with Phase 2 they're small relative to total mark
cost. V8 marks pointer arrays fast.

### Why faraday kept it as opt-in, and why staging doesn't

Phase 3 validates the architecture for both data structures
(Float64Array storage works for dicts AND arrays, byte-identical,
no correctness issues) and the heap win is real (-7.6 MB / -12 %
is not nothing). It also sets up an obvious follow-up:
hand-inline the common decode cases at the hot copyBytesInto /
sizeInBytes call sites. That's Phase 3β below -- which recovers
much of the 300 ms but the net win still doesn't justify the
engineering surface for our pipeline, so the whole encoded
architecture stays off staging.

### Caveats / known limitations

- Direct `new PDFArray(context)` (rather than the
  `PDFArray.withContext` factory) would leave `this.d` undefined
  and methods would misbehave. pdf-lib's parser and our
  setOutline go through the factory, but a hypothetical caller
  using `new` would need the factory or a defensive init guard.
- `PDFArray.scalePDFNumbers` (in pdf-lib's PDFArray; not
  rewritten here) goes through `get`/`set` and so would work
  transparently via the encoded path. Not exercised in the book
  build.
- PDFArrays nested in PDFArrays via `TAG_ARRAY` decode lazily,
  same pattern as nested dicts; `arrayByPayload` caps at the
  number of distinct nested-array payloads (small).

## Phase 3β: hand-inline decodeValue at the save hot path (explored, didn't ship)

The Phase 3 CPU regression was almost entirely per-slot decode
during save -- `PDFDict.copyBytesInto`, `PDFDict.sizeInBytes`,
`PDFArray.copyBytesInto`, `PDFArray.sizeInBytes` together
iterate ~3 M slots, each calling `decodeValue` (10-case switch
+ pool lookup). V8 doesn't inline the function across the
prototype-method boundary; ~100 ns × 3 M ≈ +300 ms.

Phase 3β hand-inlines `decodeValue`'s switch into all four hot
methods. The switch body is copy-pasted verbatim into each
loop, giving V8 a monomorphic `.copyBytesInto` /
`.sizeInBytes` call site per case branch.

### Measured

| Frame | P1 baseline | P3 (pre-inline) | **P3β** | β vs P1 |
|---|---:|---:|---:|---:|
| `(garbage collector)` | 149 ms | 144 ms | **130 ms** | **-19 ms (win)** |
| `PDFObjectParser.parseName` | 87 ms | 106 ms | **70 ms** | **-17 ms (win)** |
| `fastParseDict*` | 40 ms | 59 ms | 63 ms | +23 ms (encode at parse) |
| `PDFDict.copyBytesInto` | 27 ms | 57 ms | **49 ms** | +22 ms |
| `PDFDict.sizeInBytes` | (<top15) | (<top15) | 33 ms | new |
| Heap sampled | 65.4 MB | 57.8 MB | **58.0 MB** | **-7.4 MB (win)** |
| Structural | byte-identical | byte-identical | byte-identical | -- |

The wins (GC -19 ms, parseName -17 ms) are real. parseName's
drop is surprising but consistent across reruns -- the
inlined switch made some call sites monomorphic that weren't
before, and V8 re-optimized parseName as a downstream effect.

The losses (encode-at-parse +23 ms, copyBytesInto +22 ms,
sizeInBytes +33 ms) come from the inlined 11-case switch
itself. Each iteration in the hot loop pays for the tag
dispatch.

### Architectural conclusion (Phase 2 + 3 + β closeout)

Float64Array encoded storage **does work** -- byte-identical
output, mainBuf and arrayBuf mark cost goes to zero, ~7.4 MB
heap saved, GC drops ~20 ms. But it doesn't pull its weight
on this workload because:

1. **V8 marks pointer arrays fast.** mainBuf's 2.34 M
   Object[] slots cost ~10-20 ms of mark time, not the 100+ ms
   we assumed. The slot-mark savings are real but small.
2. **The encoding scheme adds per-slot work that exceeds the
   savings.** Encode at parse + decode at save = ~50 ms net
   loss in the hot loops, even with hand-inlining.
3. **The original polymorphic `main[i].copyBytesInto()` was
   actually fine.** V8's megamorphic IC handled it well.
   Replacing with explicit switch + monomorphic per-case
   dispatch *helps slightly* in GC and parseName but
   *hurts in dict hot paths*.

The work isn't wasted -- the design notes here quantify *why*
this approach isn't the right lever, and the pool ID
infrastructure could be reused if a future optimization needs
cross-type instance lookup. If a future workload stresses
mainBuf mark cost more (much larger documents, more aggressive
GC pressure, or a different V8 version) the encoded path is a
known-correct starting point.

Production stays on:

- `--fast-dict-onebuf` (Object[] mainBuf with packed view)
- `--fast-refs`, `--fast-pdfnumber-pool` (the pool shims that
  fast-dict-encoded would have subsumed)
- All other shipped `--fast-*` shims unchanged

The next move on the same theme is the much narrower
"one-buffer for PDFArray" -- skip the encoded scheme entirely
and just mirror fast-dict-onebuf's shape onto PDFArray, keeping
the Object[] storage and inheriting the same low-overhead
view-with-packed-payload trick. That's the fast-array-onebuf
section below; it does ship.

## One-buffer PDFArray

Mirror of fast-dict-onebuf's strategy applied to PDFArray. Every
committed element lives in a single append-only `arrayMain` JS
Array, kept for the document's lifetime. Each PDFArray instance
is a view via packed `(start, length)` in `d`. Per-instance
`this.array = []` allocation goes away; ~79 k PDFArrays stop
allocating per-instance backing arrays + grow doublings.

Storage is a plain heterogeneous JS Array -- slots hold the
original PDFObject references, reads are `arrayMain[start + i]`
with no decode. This is the explored-but-didn't-ship Phase 3
shape (PDFArray as a view into a shared backing) minus the
Float64Array encoding: Phase 3 paid ~300 ms of `decodeValue`
dispatch on save's `copyBytesInto` (~3 M slots × 10-case switch
+ pool lookup). The plain-reference shape skips that entirely
and is what makes fast-array-onebuf cheap to ship.

### Parser temp + commit

Per-parser `_arrayTemp` + length cursor as a recursion stack,
parallel to fast-dict-onebuf's `_dictTemp`. Each `parseArray`
invocation pushes onto temp, commits its frame to `arrayMain`
in one contiguous append, and pops temp back. Dict and array
temps are independent so cross-recursion is fine.

### Mutations

- `set(i, v)` -- in-place replace at `arrayMain[start + i]`.
  Safe for any array; no shifts.
- `push(v)` -- in-place extend at HWM (`arrayMain.push(v)` +
  length += 1) when `start + length === arrayMain.length`;
  COW otherwise.
- `insert(i, v)` / `remove(i)` -- always COW. Shifting slots
  in `arrayMain` would corrupt other arrays' ranges.

Same at-HWM safety logic as fast-dict-onebuf; no owned bit
needed (`start + length === arrayMain.length` is sufficient).

### Bit layout

```
bits  0-23: start  (24 bits, max 16 M slots)
bits 24-39: length (16 bits, max 65 536 elements; max observed
                    ~25 k on the book)
```

40 bits used, well within `Number.MAX_SAFE_INTEGER`. One more
length bit than fast-dict-onebuf's 14-bit dict length, because
arrays can be larger than dicts on this workload.

### Singleton context (duplicated)

Same singleton-PDFContext assumption as fast-dict-onebuf, but
the ~10 lines of context-stash machinery are duplicated rather
than shared, so each shim stays independently injectable. A
caller can opt into one without the other; both are independent
side-effecting imports.

### Production wiring

- [`docs/render-book.mjs`](../../docs/render-book.mjs) -- imports
  `setExpectedArraySlots` alongside `setExpectedDictSlots`, calls
  both after `measureRawPdf` returns and before `PDFDocument.load`.
- [`perf/measure.mjs`](../measure.mjs) -- adds `--fast-array-onebuf`
  flag. Composes with `--fast-dict-onebuf`; `--measure-pass` also
  drives `setExpectedArraySlots` when the array shim is on.
- The harness's `--fast-array-onebuf` is opt-in alongside the
  production path, the same arrangement as `--fast-dict-onebuf`.

### Measured wins

Heap impact (process phase, 512 B sampling, paired runs vs the
Phase 1 baseline that was the immediate predecessor of this
shim):

| Allocator                | P1 baseline | + fast-array-onebuf | Delta              |
|--------------------------|------------:|--------------------:|-------------------:|
| `parseArray`             |    19.6 MB  |             ~0 (off top 15) | **-19.6 MB**  |
| new shim row (PDFArray wrappers) | -   |             4.2 MB   | +4.2 MB           |
| Total sampled            |    65.6 MB  |            **51.9 MB**       | **-13.7 MB (-21 %)** |

CPU impact (process wall, pinned 0x5500 / High, no profiler,
3 paired runs each side):

| State            | median | mean   |
|------------------|-------:|-------:|
| P1 only          | 1.07 s | 1.09 s |
| P1 + this shim   | 1.02 s | 1.01 s |

Mean shifts +0.08 s -- this shim slightly faster, well within
noise on this machine.

The CPU regression that showed up under
`--cpu-profile-process` (paired with the encoded-storage
prototype) was profiler-induced noise; the sampler's per-allocation
bookkeeping interacts badly with this shape. Gone once we pin
CPU and drop the sampler. Worth remembering: when the only
signal saying "this is slower" is the profiler, run the same
code without the profiler before accepting the verdict.

### Cumulative arc (final)

Heap, starting from the original Map-backed PDFDict:

| State                             | Total sampled | Change vs prior |
|-----------------------------------|--------------:|----------------:|
| Map-backed (pre-fast-dict-array)  |   152 MB      | -               |
| fast-dict-array                   |    92 MB      | -60 MB          |
| fast-dict-onebuf                  |    66 MB      | -26 MB          |
| **fast-array-onebuf**             |    **52 MB**  | **-14 MB**      |

**-66 % cumulative reduction in process-phase heap traffic.**
The final state of this storage-shape work. The endpoint of
the dict + array allocator refactors that this notes file has
been chasing for the last ~22 sections.

## Drop the per-instance `PDFRef.tag` string

With `fast-array-onebuf` shipping, the process-phase sampling heap
profile flipped to `PDFParser.parseIndirectObjectHeader` at 13.7 MB
/ 25 % of total. Attribution chain (via
`perf/find-heap-callers.mjs`):

```
parseIndirectObjectHeader  → skipJibberish (14.2 MB)
  → matchIndirectObjectHeader (try/catch wrapper)
    → parseIndirectObjectHeader → fastOf
```

`skipJibberish` runs after every successful indirect object parse
and speculatively calls `matchIndirectObjectHeader` to detect the
next `N M obj` header. On valid PDFs the speculation always
succeeds, so `fastOf` fires once per indirect-object boundary,
populating the dense-array cache; the subsequent "real"
`parseIndirectObject` is then a cache hit. V8 inlines `fastOf` at
this call site (small + hot from speculation) so the attribution
lands on the caller -- 13.7 MB of which was the tag-string churn
(`objectNumber + ' 0 R'`): V8 builds 1-2 intermediate concat
strings + the final ~25-35 B tag, ~150 k times.

### Upstream

`PDFRef` (`pdf-lib/.../objects/PDFRef.js`) caches the
`<obj> <gen> R` string on each instance:

```js
function PDFRef(objectNumber, generationNumber) {
  var _this = this;
  ...
  _this.tag = objectNumber + ' ' + generationNumber + ' R';
}
```

so that `toString` / `sizeInBytes` / `copyBytesInto` can read it
back -- the three prototype methods are then trivial (`this.tag`,
`this.tag.length`, `copyStringIntoBuffer(this.tag, ...)`). The
earlier `fast-refs` shim already constructs the gen=0 PDFRef via
`Object.create(PDFRef.prototype)` + manual field init, so it
populated `tag` itself to preserve those reads.

### The shim

Drop the field entirely. The three prototype methods compute their
results from `objectNumber` / `generationNumber` directly:

- `copyBytesInto`: writes digits straight into the output buffer
  via a no-allocation `_writeUint` helper
  (divide-and-write-backwards into the caller's buffer). No
  `copyStringIntoBuffer` call.
- `sizeInBytes`: returns `_digitCount(obj) + _digitCount(gen) + 3`
  (the trailing 3 covers " " + " R"). `_digitCount` is a ladder
  catching the common small-number cases without arithmetic.
- `toString`: builds on demand. Debug-only path, no caching needed.

Both gen=0 (no tag set; `fastOf` skips the upstream constructor)
and gen!=0 (tag set by upstream's constructor but our overrides
ignore it) work. The gen!=0 path's tag string is
allocated-then-wasted (~18 % of refs × ~50 K instances × ~30 B
= ~1 MB), bounded enough not to be worth patching the upstream
constructor for.

### Measured heap

Process phase, 512 B sampling, paired runs vs the
`fast-array-onebuf` baseline:

| Allocator                       | Pre (MB) | Post (MB) | Delta              |
|---------------------------------|---------:|----------:|-------------------:|
| `parseIndirectObjectHeader`     |    13.7  |     9.3   | **-4.3 MB**        |
| `fastOf` (refs)                 |     7.7  |     4.8   | **-2.9 MB**        |
| Total sampled                   |    51.9  |    45.2   | **-6.7 MB (-13 %)** |

The `parseArray` row was already collapsed by `fast-array-onebuf`,
so this round attacks the next-largest remaining attribution. The
residual 9.3 MB at `parseIndirectObjectHeader` and 4.8 MB at
`fastOf` are the `PDFRef` instances themselves (`Object.create` +
`objectNumber` + `generationNumber` fields, ~32-48 B × ~150 k)
plus V8 inlining leakage from the `fastOf` speculation call site.
Hard floor without dropping per-PDFRef wrappers entirely (which
the class-shape round below picks up).

### Measured CPU

Pinned 0x5500 / High, no profiler, 4 runs each side:

| State    |  median  |   mean   |
|----------|---------:|---------:|
| with-tag | 1.045 s  | 1.045 s  |
| tagless  | 1.030 s  | 1.030 s  |
| Δ        | ~15 ms tagless faster (in the noise but trending) |

### Validation

Output PDF is byte-identical to baseline modulo `/CreationDate`
+ `/ModDate` timestamps -- verified by inflating + diffing all
453 ObjStm streams. The change is local to
[`docs/lib/fast-refs.mjs`](../../docs/lib/fast-refs.mjs); no
production import or flag change needed since `--fast-refs` was
already wired up.

## `skipJibberish` digit-byte fast path

The same `find-heap-callers.mjs` chain that surfaced the `PDFRef.tag`
churn (previous section) named another redundancy worth chasing on
the CPU side:

```
parseIndirectObjectHeader  → skipJibberish (14.2 MB)
  → matchIndirectObjectHeader (try/catch wrapper)
    → parseIndirectObjectHeader → fastOf
```

`skipJibberish` runs after every successful indirect object parse
and exists only to recover from invalid PDFs that wedge garbage
between indirect objects. Its hot path fires ~150 k times per load
on the book, each call speculatively running:

1. `matchKeyword('xref' / 'trailer' / 'startxref')` -- all fail on a
   digit byte.
2. `matchIndirectObjectHeader` -- a `try` / `catch` around
   `parseIndirectObjectHeader` → `parseRawInt` × 2 →
   `matchKeyword('obj')` → `fastOf` round-trip. The speculation
   succeeds every time on a valid PDF, the cursor rewinds, and the
   outer `while`'s `IsDigit` check confirms what the speculation
   already proved.

### Where the speculation lives

`PDFParser.parseDocument`'s inner loop already calls
`skipWhitespaceAndComments` between indirect objects. Patch a
single-byte peek in front of `skipJibberish`:

```js
if (!this.bytes.done() && IsDigit[this.bytes.peek()]) continue;
this.skipJibberish();
```

When the next byte is a digit (start of the next `N M obj` header
on every valid PDF), `continue` skips straight to the next
`parseIndirectObject`. Anything else (`xref` / `trailer` /
`startxref` keyword starts, or real jibberish between indirect-object
sections) falls through to `skipJibberish` unchanged.

The once-per-section `skipJibberish` in `parseDocumentSection`
(after `maybeParseTrailer`) is unaffected -- it handles boundaries
between PDF revisions / EOF where stray bytes are spec-legal.

### Measured CPU

Pinned 0x5500 / High, no profiler, 4 paired runs:

| State                | median  | mean    |
|----------------------|--------:|--------:|
| without fast path    | 1.07 s  | 1.053 s |
| with fast path       | 0.995 s | 0.985 s |
| Δ                    | ~67 ms faster (mean), ~6 % of process phase |

Phase breakdown isolates the win to load (mean 0.518 → 0.455 s,
-62 ms); save is flat as expected -- the fast path is load-side
only.

### Heap

Unchanged (0 MB delta). The `PDFRef` instances the speculation
allocated were already attribution-shifted to the real
`parseIndirectObject`'s cache miss, not new allocations. The
fast-path skips the speculation's `try` / `catch` + dispatch
overhead, not its allocation tail.

### Validation

Output PDF byte-identical to the pre-patch baseline (verified by
inflating + diffing all 453 ObjStm streams modulo `/CreationDate`
+ `/ModDate` timestamps). The change is local to
[`docs/lib/fast-sync-load.mjs`](../../docs/lib/fast-sync-load.mjs);
no production import or flag change needed since `--fast-sync-load`
was already wired up.

## Class-constructor `PDFRef` shape

The `Object.create + writes` trick the original `fast-refs` shim uses
to skip the upstream `ENFORCER` check and `pool.set` (see [Skip
`PDFRef` `pool.set` on the gen=0 miss path](#skip-pdfref-poolset-on-the-gen0-miss-path)
above) carries an unexpected per-instance cost: V8 transitions the
hidden class through one intermediate map per property write and
routes the result through the slow-property path. On the book a
fast-refs-built PDFRef sits at ~60 B/instance vs PDFName's ~31 B
(built via `new PDFName(...)` -- a real constructor with a stable
hidden class from the first instance).

### The shim

Plain function used as a constructor, both fields set in one shot:

```js
function _FastRef(objectNumber, generationNumber) {
  this.objectNumber = objectNumber;
  this.generationNumber = generationNumber;
}
_FastRef.prototype = PDFRef.prototype;

PDFRef.of = function fastClassOf(objectNumber, generationNumber) {
  if (generationNumber === undefined || generationNumber === 0) {
    const existing = pool0[objectNumber];
    if (existing) return existing;
    const fresh = new _FastRef(objectNumber, 0);
    pool0[objectNumber] = fresh;
    return fresh;
  }
  return original.call(PDFRef, objectNumber, generationNumber);
};
```

Aliasing `_FastRef.prototype = PDFRef.prototype` keeps
`instanceof PDFRef` satisfied AND means method dispatch resolves
on the shared prototype (no extra proto-chain hop). gen != 0 still
falls back to the upstream `PDFRef.of` Map-based pool (rare on
freshly-parsed PDFs).

Same `toString` / `sizeInBytes` / `copyBytesInto` prototype
overrides as the tag-drop section above -- the constructor produces
gen=0 PDFRefs with no `tag` field at all, and the gen!=0 upstream
fallback still sets `tag` but our overrides ignore it.

### Measured heap

Paired heap profile (`--fast-refs` vs `--fast-refs-class`, with the
rest of the production shim set on):

| Allocator                       | Pre        | Post       | Delta                  |
|---------------------------------|-----------:|-----------:|-----------------------:|
| Total sampled                   |  45.26 MB  |  41.39 MB  | **-3.87 MB (-8.5 %)**  |
| `fastOf` / `fastClassOf` row    |   4 696 KB |   3 435 KB | -1 261 KB              |
| `create` (builtin)              |   3 379 KB |   2 627 KB | -752 KB                |
| `parseIndirectObjectHeader` row |   9 115 KB |   7 435 KB | -1 680 KB              |

Per-PDFRef savings work out to ~16 B/instance × 226 k unique refs
= ~3.7 MB, close to the measured 3.87 MB total. Not the full
30 B-to-PDFName-floor (PDFRef carries 2 fields vs PDFName's 1),
but a clean win and the construction-style change applies
symmetrically to the other `Object.create`-built shapes
(`fast-dict-onebuf._makeFromRange`,
`fast-array-onebuf._makeFromRange`) for the next round.

### Measured CPU

Paired wall-clock and profile (`--cpu-profile-process`):

| Row                        | Pre      | Post     | Delta              |
|----------------------------|---------:|---------:|-------------------:|
| Process wall-clock         | 1.13 s   | 0.99 s   | **-140 ms (-12 %)** |
| load                       | 0.52 s   | 0.47 s   | -50 ms              |
| save                       | 0.51 s   | 0.44 s   | -70 ms              |
| `fastOf` (PDFRef) self-time| 28 ms    | out of top 15 | drops off      |

GC self-time barely moved (87 ms → 82 ms), consistent with the
allocation-rate drop being modest relative to mark-cost -- the live
`fast-dict-onebuf` mainBuf still dominates the GC bill.

### Wiring

- [`docs/lib/fast-refs-class.mjs`](../../docs/lib/fast-refs-class.mjs)
  -- new shim. Same `_writeUint` / `_digitCount` helpers as
  `fast-refs`; same prototype overrides; only the construction style
  differs.
- [`docs/render-book.mjs`](../../docs/render-book.mjs) -- swaps
  `import './lib/fast-refs.mjs'` for `import './lib/fast-refs-class.mjs'`.
  Production runs through the new shim.
- [`perf/measure.mjs`](../measure.mjs) -- adds the
  `--fast-refs-class` flag with a mutex check against `--fast-refs`
  (both shim `PDFRef.of`; loading both silently would not be
  obvious if it broke something).

`fast-refs.mjs` stays in the tree as an A/B baseline -- the
construction style is the whole point of the comparison, so being
able to flip back to the older shape with a flag is worth the
20 lines of duplication.

## Class-constructor `PDFDict` shape

The same shape change `fast-refs-class` applied to PDFRef (above),
now applied to the four PDFDict subclasses fast-dict-onebuf
constructs: `PDFDict`, `PDFCatalog`, `PDFPageTree`, `PDFPageLeaf`.

### Where fast-dict-onebuf was paying the same V8 tax

`_makeFromRange` and the COW path inside `set` both build the
wrapper instance via `Object.create(ProtoClass.prototype) + pd.d
= ...` (plus `pd.normalized = false` / `pd.autoNormalizeCTM = true`
for the PageLeaf case). On the book that's 260 k+ wrapper
instances per load -- the dominant remaining heap row even after
all the prior storage-shape work, with `_makeFromRange (dict)`
showing 16.5 MB on the post-`fast-refs-class` profile.

### The shim

One plain-function constructor per subclass with the field
assignments in the body. Aliasing each one's prototype to the
upstream prototype keeps `instanceof` and method dispatch
unchanged.

```js
function _FastDict(d) { this.d = d; }
_FastDict.prototype = PDFDict.prototype;

function _FastCatalog(d) { this.d = d; }
_FastCatalog.prototype = PDFCatalog.prototype;

function _FastPageTree(d) { this.d = d; }
_FastPageTree.prototype = PDFPageTree.prototype;

function _FastPageLeaf(d) {
  this.d = d;
  this.normalized = false;
  this.autoNormalizeCTM = true;
}
_FastPageLeaf.prototype = PDFPageLeaf.prototype;

function _makeFromRange(ProtoClass, start, length, ctx) {
  _registerContext(ctx);
  const d = pack(start, length);
  if (ProtoClass === PDFDict)      return new _FastDict(d);
  if (ProtoClass === PDFPageLeaf)  return new _FastPageLeaf(d);
  if (ProtoClass === PDFCatalog)   return new _FastCatalog(d);
  if (ProtoClass === PDFPageTree)  return new _FastPageTree(d);
  // Defensive fallback for any unknown subclass.
  const pd = Object.create(ProtoClass.prototype);
  pd.d = d;
  return pd;
}
```

PageLeaf carries the extra `normalized` / `autoNormalizeCTM`
fields -- they're assigned in the constructor body so V8 still sees
a fixed shape per subclass. The COW path in `set` is updated in
the same way (`return new _FastDict(pack(newStart, length))`).
Unknown PDFDict subclasses fall back to the original Object.create
path; nothing in our pipeline hits it (defensive only).

### Measured heap

Paired profile, `fast-refs-class` baseline vs + this change:

| Allocator                       | Pre        | Post       | Delta              |
|---------------------------------|-----------:|-----------:|-------------------:|
| Total sampled                   |  41.39 MB  |  35.41 MB  | **-5.98 MB (-14.4 %)** |
| `_makeFromRange` (dict)         |  16 484 KB |  11 404 KB | -5 080 KB          |
| `create` (builtin)              |   2 627 KB |     921 KB | -1 706 KB          |
| `_FastDict` (new row)           |     —      |     621 KB | +621 KB            |

Per-PDFDict saving: ~20 B/instance × 260 k = ~5.2 MB. Matches the
`_makeFromRange` delta + the builtin's drop minus the new
constructor-frame attribution.

**Cumulative since `fast-refs-class`**: total sampled 45.26 MB →
35.41 MB = **-9.85 MB (-22 %)** over two shape-change commits.
Bringing the cumulative heap reduction since the Map-backed
baseline to ~77 % (152 MB → 35.4 MB).

### Measured CPU

Roughly flat -- process wall-clock 0.99 s → 1.03 s under cpu
profile, within noise. GC self-time +18 ms (82 → 101 ms),
consistent with the existing `fast-dict-onebuf` trade-off
documented in the README: the dominant GC cost on this workload
is the live `mainBuf` scan, not allocation rate, so cutting
allocation doesn't move single-shot mark time. The
allocation-rate reduction still matters for sustained-load
memory pressure even when it doesn't show on a one-shot
wall-clock.

### Validation

Output PDF byte-identical modulo `/CreationDate` + `/ModDate`
timestamps -- only the JS object shape used to wrap the parsed
dict range changed, not any content path. The change is local to
[`docs/lib/fast-dict-onebuf.mjs`](../../docs/lib/fast-dict-onebuf.mjs);
no production import or flag change needed since
`--fast-dict-onebuf` was already wired up.

## Class-constructor `PDFArray` shape

The same shape change applied to PDFArray's factory paths. PDFArray
has no subclasses in pdf-lib (unlike PDFDict), so a single
`_FastArray` constructor covers both `_makeFromRange` and the COW
path inside `set`:

```js
function _FastArray(d) { this.d = d; }
_FastArray.prototype = PDFArray.prototype;

function _makeFromRange(start, length, ctx) {
  _registerContext(ctx);
  return new _FastArray(pack(start, length));
}
```

### Measured heap

Paired profile, prior commit's dict-class baseline vs + this
change:

| Allocator                       | Pre        | Post       | Delta              |
|---------------------------------|-----------:|-----------:|-------------------:|
| Total sampled                   |  35.41 MB  |  33.68 MB  | **-1.73 MB (-4.9 %)** |
| `fastParseArrayOneBuf` row      |   4 372 KB |   3 334 KB | -1 038 KB          |
| `create` (builtin)              |     921 KB | out of top 15 | -921 KB        |

Per-PDFArray saving: ~22 B/instance × ~80 k = ~1.7 MB. Matches the
row delta + builtin drop.

### Measured CPU -- the unexpected GC win

| Row                | Pre       | Post     | Delta              |
|--------------------|----------:|---------:|-------------------:|
| Process wall-clock | 1.03 s    | 0.90 s   | **-130 ms (-13 %)** |
| GC self-time       | 100.9 ms  | 58.7 ms  | **-42 ms (-42 %)**  |

A surprising GC + wall-clock win for the smallest of the three
heap drops. The likely reason is that with all three shape changes
in place, V8 sees fully monomorphic call sites for PDFRef /
PDFDict / PDFArray construction *and* method dispatch -- before
the array change there was still one slow-property shape in the
mix dragging IC perf. Confirmed by the cumulative process arc:

| State                                  | process  | GC     |
|----------------------------------------|---------:|-------:|
| baseline (fast-refs)                   | 1.13 s   | 87 ms  |
| + fast-refs-class                      | 0.99 s   | 82 ms  |
| + fast-dict-onebuf class shape         | 1.03 s   | 101 ms |
| + fast-array-onebuf class shape        | **0.90 s** | **59 ms** |

The dict-only state had a slight CPU regression (+40 ms vs
fast-refs-class) that the array change undid and then some.
Argues strongly for shipping the full combo, not just the two
big-heap-row ones.

### Cumulative across the three shape-change commits

Baseline (`fast-refs`) → all-three (`fast-array-onebuf class
shape`):

| Metric              | Pre        | Post       | Delta                |
|---------------------|-----------:|-----------:|---------------------:|
| Process wall-clock  | 1.13 s     | 0.90 s     | **-230 ms (-20 %)**  |
| Total sampled heap  | 45.26 MB   | 33.68 MB   | **-11.58 MB (-25.6 %)** |
| GC self-time        | 87 ms      | 59 ms      | **-32 %**            |

Cumulative process-phase heap reduction since the Map-backed
PDFDict baseline now stands at **~78 %** (152 MB → 33.7 MB).

### Validation

Output PDF byte-identical modulo `/CreationDate` + `/ModDate`
timestamps. The change is local to
[`docs/lib/fast-array-onebuf.mjs`](../../docs/lib/fast-array-onebuf.mjs);
no production import or flag change needed since
`--fast-array-onebuf` was already wired up.

## Class-constructor round: closing the picture

Recap of the three commits that just landed (PDFRef, PDFDict,
PDFArray wrapper-shape changes): same attack, same constructor +
prototype-aliasing trick. The per-instance numbers, before vs
after, in one table:

| Wrapper       | Before | After | Saved/inst | Count   | Total saved |
|---------------|-------:|------:|-----------:|--------:|------------:|
| PDFRef        |  ~60 B | ~44 B |     ~16 B  | 226 k   |   ~3.7 MB   |
| PDFDict       |  ~64 B | ~44 B |     ~20 B  | 260 k   |   ~5.2 MB   |
| PDFArray      |  ~54 B | ~32 B |     ~22 B  |  80 k   |   ~1.7 MB   |

PDFRef stops at ~44 B because it carries 2 fields (`objectNumber`,
`generationNumber`); PDFDict / PDFArray stop at ~32-44 B with 1
field (the packed `d`). PDFPageLeaf carries 3 fields (d,
normalized, autoNormalizeCTM) so it's slightly higher, but the
constructor body still gives V8 the stable shape -- the 1 651
PDFPageLeaf instances are a small tail.

### Investigation aside: `parseIndirectObjectHeader` was a labelling artifact

The hypothesis chain that led to the constructor-shape attack:

1. Start: heap profile shows `parseIndirectObjectHeader` at 9.1 MB
   self-attribution. Looks like a parser hot spot worth attacking.
2. Hand-inline the entire function body (whitespace skip +
   `parseRawInt` × 2 + `matchKeyword` + `PDFRef.of`) into a single
   no-call body. Heap row barely moved (9.2 MB), CPU unchanged --
   the row wasn't the call overhead.
3. Disable V8 inlining with `node --no-turbo-inlining`. Heap row
   collapses (9.2 MB → out of top 20). `fastOf` row jumps from
   4.7 MB to 13.8 MB. Total sampled unchanged.

Diagnosis: V8 inlines small hot leaf functions (like `fastOf`,
when called from a hot caller) and attributes their allocations
to the inliner's frame. The `parseIndirectObjectHeader` row name
was misleading; the actual allocation source was the PDFRef
instances being constructed downstream. Attacking the right thing
(the wrapper shape) made the row drop too.

The hand-inlined attempt (`fast-pioh.mjs`) was deleted after
proving the negative; the call-counting instrumentation lives in
[`perf/instrument-pioh.mjs`](../instrument-pioh.mjs). Both kept
around in the writeup as the path to the right answer rather than
the answer itself.

### Caveats

- **Singleton subclass set.** `fast-dict-onebuf` dispatches by
  `ProtoClass === PDFDict | PDFCatalog | PDFPageTree |
  PDFPageLeaf` to pick the right constructor. Any new PDFDict
  subclass added in user code falls back to the original
  `Object.create` path (defensive; nothing in our pipeline
  triggers it). If the upstream PDFDict hierarchy grows, the
  dispatch chain needs a new entry.
- **Shared prototype.** `_FastRef.prototype = PDFRef.prototype`
  means a `new _FastRef(...)` instance is indistinguishable from
  a `new PDFRef(...)` instance via `instanceof` and method
  dispatch. No code in our pipeline cares about constructor
  identity (`obj.constructor === PDFRef` -- absent in pdf-lib +
  our shims).
- **Method dispatch stays polymorphic for gen != 0 PDFRefs.** The
  `--fast-refs-class` shim only routes gen=0 through the
  `_FastRef` constructor; gen != 0 falls back to upstream
  `PDFRef.of` which uses its own Map-based pool and
  `new PDFRef(...)`. Both shapes share `PDFRef.prototype` so
  methods dispatch uniformly; V8 may see 2 maps but the path is
  rare (~18 % of refs).

### Where this leaves heap

After the three commits, the top-5 heap rows are:

| # | Self KB | Frame                                                              |
|--:|--------:|--------------------------------------------------------------------|
| 1 | 11 474  | `_makeFromRange` (PDFDict) -- 260 k × ~44 B floor                  |
| 2 |  7 450  | `parseIndirectObjectHeader` -- V8 attribution of the next row      |
| 3 |  3 411  | `fastClassOf` (PDFRef) -- 226 k × ~44 B floor                      |
| 4 |  3 334  | `fastParseArrayOneBuf` (PDFArray) -- 80 k × ~32 B floor            |
| 5 |  2 098  | `parseIndirectObjectSync` -- per-call attribution residual         |

The big rows are now at the per-instance floor for V8 objects
with 1-2 inline fields. Further heap reduction requires either:

1. **Eliminate the wrapper entirely** -- PDFRef / PDFDict /
   PDFArray become bare packed Numbers, every consumer rewritten
   to call free functions instead of methods. Biggest remaining
   win (~11 MB on PDFDict alone), largest engineering surface.
2. **Smaller targeted shrinks** -- PDFNumber drops eager
   `stringValue` cache, etc. Each at ~hundreds of KB,
   accumulating slowly.

Neither has been started; this section closes the per-instance
constructor-shape round.

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
| + fast-sync-load                     | ~1.3 s  | ~0.8 s | ~0.5 s |
| + fast-dict-array                    | ~1.1 s  | ~0.7 s | ~0.4 s |
| + fast-indirect-objects              | ~1.1 s  | ~0.7 s | ~0.4 s |
| + fast-refs miss bypass              | ~1.0 s  | ~0.6 s | ~0.4 s |
| + fast-pdfnumber-pool                | ~1.0 s  | ~0.6 s | ~0.4 s |
| + parseDict pre-sized array          | ~1.0 s  | ~0.6 s | ~0.4 s |
| + fast-dict-onebuf                   | ~1.0 s  | ~0.6 s | ~0.4 s |
| + measure-pass Phase 1               | ~1.0 s  | ~0.7 s | ~0.4 s |
| + fast-array-onebuf                  | ~1.0 s  | ~0.7 s | ~0.4 s |
| + fast-refs tag drop                 | ~1.0 s  | ~0.7 s | ~0.4 s |
| + skipJibberish digit fast-path      | ~0.95 s | ~0.6 s | ~0.4 s |
| + fast-refs-class                    | ~0.9 s  | ~0.55 s | ~0.4 s |
| + fast-dict-onebuf class shape       | ~0.9 s  | ~0.55 s | ~0.4 s |
| **+ fast-array-onebuf class shape (this section)** | **~0.8 s** | **~0.5 s** | **~0.35 s** |

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
