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

## `--cpu-profile-process`

Added to `measure.mjs`: opens an in-process V8 Profiler via
`node:inspector/promises`, brackets the process phase the same way
`--cpu-profile` brackets render, and writes `process.cpuprofile`
alongside `render.cpuprofile`. Same `.cpuprofile` JSON shape, so the
existing `analyze-profile.mjs` / `find-callers.mjs` /
`find-callees.mjs` work unchanged. See the *Profiling pdf-lib
(process phase): canonical command* section in [the README](../README.md)
for the operational form.

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

## Where this leaves the picture

Cumulative process-phase cost, baseline → after all three shims:

| state                              | process | load | save |
| ---                                | ---     | ---  | ---  |
| original (Slow / 50 defaults)      | ~40 s   | ~36 s| ~4 s |
| + parseSpeed:Fastest               | ~5 s    | ~2 s | ~3 s |
| + fast-deflate                     | ~2.5 s  | ~1.5s| ~1 s |
| + fast-refs                        | ~2.3 s  | ~1.3 s | ~1 s |
| **+ parallel-deflate (this section)** | **~2.0 s** | **~1.3 s** | **~0.7 s** |

The bottom-up after parallel deflate is dominated by pdf-lib's
parser frames -- `PDFDict.entries` (8 %), `decodeName` (8 %), GC
(8 %), `parseRawNumber` (6 %), `PDFRef.of` (5 %, the gen != 0
residue). All load-phase, all O(input bytes), all close to
fundamental pdf-lib work. Further wins in this phase would mean
rewriting pdf-lib's parser.

The pdf-lib roundtrip path is now ~2.0 s of a ~50 s build. The
incremental writer's 0.25 s process phase (see
[01-baseline-and-detach.md](01-baseline-and-detach.md)) is still
strictly faster on process alone, but the pdf-lib path delivers a
15.3 MB output vs incremental's 53 MB, and the ~2 s gap on a 50 s
build doesn't justify the file-size cost for our pipeline.

The strategic note from earlier phases still stands: generate's
~38 s in `page.pdf()` is the remaining lever, and `pageRanges`
sharding is the only knob plausibly large enough to move the
wall-clock total by more than a few seconds.
