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

## What this didn't fix

After the shim the bottom-up profile points at the next two
JS-attributable buckets:

- `PDFRef.of` at 336 ms self-time (12 %). The function builds a
  string key `<num> <gen> R` per call and Map-looks it up; the
  string allocation per call is the cost. A drop-in fix would
  replace the `Map<string>` pool with a flat array for the gen=0
  case (the overwhelming majority) and a fallback Map for gen ≠ 0.
  Estimated ~300 ms saved.
- `(garbage collector)` at 262 ms (9 %). Tied to `PDFRef.of` and
  the per-object dict allocations in the writer; would likely
  shrink along with the first item.

Neither moves the wall-clock total meaningfully on its own --
process is now 2.77 s of a ~50 s build -- so they're left in place
unless or until they become the bottleneck.

The strategic note from earlier phases still stands: `pageRanges`
sharding of generate is the only remaining knob with a profile
target large enough to move total wall-clock by more than a few
seconds.
