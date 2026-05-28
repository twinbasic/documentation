---
title: pdf-lib Patches
parent: Library Patches
grand_parent: Documentation Development
nav_order: 2
permalink: /Documentation/Development/Fixes/PDFLib
---

# pdf-lib Patches
{: .no_toc }

The files under `book/lib/fast-*.mjs` and `book/lib/parallel-deflate.mjs` are side-effecting ES modules that patch pdf-lib's live exports. All are imported at the top of `render-book.mjs` before any pdf-lib operation runs; they are mutually compatible and idempotent (each guards its installation with a flag on the patched prototype or module). Together they reduce the process phase --- parsing Chromium's raw PDF output, adding bookmarks and metadata, and serialising the result --- from ~40 seconds to ~1.6 seconds on the 1651-page book.

The root cause of the need for all these patches is the same: pdf-lib is designed for general-purpose use in both browsers and Node, and optimises for generality rather than throughput on a single large document.

* TOC goes here
{:toc}

## fast-refs-class.mjs

**Problem.** `PDFRef.of(objectNumber, generationNumber)` is the factory for every indirect reference in the PDF. The original factory built instances via `Object.create(PDFRef.prototype)` followed by individual property writes. V8 treats objects built that way as transitioning through intermediate hidden-class maps for each write, producing instances roughly twice as large as those built with `new`. Measured on the book: ~60 bytes per instance via the upstream path. With ~226 000 unique indirect references, that is ~13.5 MB of excess heap. Additionally, there was no pool: each call to `PDFRef.of(N, 0)` allocated a new instance even for previously seen object numbers.

**Fix.** Two constructor functions, `_FastRef` (gen=0) and `_FastRefGen` (gen≠0), both with their `prototype` aliased to `PDFRef.prototype`. V8 assigns each a stable hidden class from the first instance. `_FastRef` carries only `objectNumber`; `generationNumber` is provided as a prototype data-property default of `0`, so gen=0 instances need only one inline slot (~16 bytes per instance, down from ~60). Gen=0 instances are cached in a dense `pool0` Array indexed by `objectNumber`; gen≠0 instances use a `Map` keyed by `"N M"` string (vanishingly rare: only the free entry at object 0 in Chromium-emitted PDFs). The hot prototype methods `toString`, `sizeInBytes`, and `copyBytesInto` are rewritten to read `objectNumber` and `generationNumber` as plain data-property reads rather than going through the original `tag` string stored on each instance.

## fast-inflate.mjs

**Problem.** `PDFCrossRefStreamParser` decompressed the PDF's cross-reference stream with `pako.inflate()`, which is a pure-JavaScript zlib implementation. Node provides `zlib.inflateSync` backed by the native zlib C library, which is substantially faster. The cross-reference stream is compressed exactly once per `PDFDocument.load` call, so the saving is small in absolute wall-clock terms, but this was the last remaining call to pako after `parallel-deflate.mjs` took over the deflate side, and eliminating it brings the runtime pako call count to zero.

**Fix.** Mutates the live `pako` exports object: replaces `pako.inflate` with a wrapper that delegates to `zlib.inflateSync` when called with no options (the only call pattern pdf-lib uses), and falls back to the original `pako.inflate` for any call that passes options. PDF's `/FlateDecode` encoding (RFC 1950 zlib framing) is accepted by both implementations, so the swap is byte-compatible.

**Mechanism.** pdf-lib calls `require("pako")` lazily at the call site rather than capturing the export at import time, so mutating the live `pako.inflate` property on the module's exports object is visible to the call site.

## fast-parse-number.mjs

**Problem.** `BaseParser.parseRawNumber` and `BaseParser.parseRawInt` built numeric values by appending one character at a time to a JavaScript string (`value += charFromCode(byte)`), then called `Number(value)` to convert the string back to a number. Every numeric token in a PDF --- object numbers, generation numbers, byte lengths, coordinates, font sizes, array indices --- flows through one of these paths. Each call allocated a temporary string that was immediately discarded. On the book this fired hundreds of thousands of times.

**Fix.** Direct integer accumulators: `n = n * 10 + (byte - 0x30)`, consuming each byte once. `parseRawNumber` additionally handles the decimal part with a separate accumulator and a `scale` divisor. Both implementations fall back to the original when the integer part would exceed 15 digits (preserving `Number.MAX_SAFE_INTEGER` semantics for pathological inputs) or when the input has no digits at all.

**Mechanism.** `BaseParser` is not re-exported from pdf-lib's public index; it is imported via `createRequire` through the CJS internal path `pdf-lib/cjs/core/parser/BaseParser.js`. Mutating `BaseParser.prototype` affects all subclasses: `PDFParser`, `PDFObjectParser`, `PDFObjectStreamParser`, and `PDFXRefStreamParser`.

## fast-decode-name.mjs

**Problem.** `PDFName.of(name)` called `decodeName(name)` --- a `.replace(/#([\dABCDEF]{2})/g, ...)` regex scan --- unconditionally on every call to decode `#XX` hex-escape sequences. On the book, `PDFName.of` was called 2 759 635 times; exactly two inputs contained a `#`. The regex scanned 2.76 million strings to find two matches, accounting for ~168 ms (7%) of process phase self-time.

**Fix.** A parallel `Map<string, PDFName>` keyed by the raw input string. When the input contains no `#` (checked via `indexOf`), the decoded form equals the raw form, so the map key matches pdf-lib's internal pool key. Cache hits return the deduplicated `PDFName` instance with zero regex work. Cache misses delegate to the original `PDFName.of` (which runs the regex once, returning the canonical instance from pdf-lib's own pool); the result is then stored in the fast cache. Inputs containing `#` bypass the cache entirely, preserving the original decode semantics.

## fast-number-to-string.mjs

**Problem.** `numberToString(num)` --- used by `PDFNumber` and others to serialise numbers to PDF syntax --- always called `num.toString()` twice: once to obtain `numStr` and a second time inside the exponential-notation check (`num.toString().split('e-')` etc.). The exponential-notation case only occurs for `|num| < 1e-6` or `|num| >= 1e21`, neither of which appears in real PDFs. Every call paid the cost of the second `toString()`, the `split`, and a `parseInt` to confirm the exponent check was irrelevant.

**Fix.** Compute `numStr = String(num)` once and check `numStr.indexOf('e') === -1`. Return `numStr` immediately on the common case. Fall through to the original only when `'e'` is present.

**Mechanism.** pdf-lib is compiled against tslib 1.x, whose `__exportStar` copies export values by value rather than by reference at module evaluation time. By the time `PDFNumber.js`'s `index_1.numberToString(value)` executes, `index_1` holds a captured reference to the original function. Patching only the source module is invisible to the call site. The shim patches three locations: `pdf-lib/cjs/utils/numbers.js` (the source), `pdf-lib/cjs/utils/index.js` (the barrel `PDFNumber` reads from), and `pdf-lib/cjs/index.js` (the top-level public index).

## fast-size-in-bytes.mjs

**Problem.** `utils.sizeInBytes(n)` computed how many bytes are required to encode an integer in a PDF cross-reference stream field by calling `Math.ceil(n.toString(2).length / 8)` --- converting to a binary string, measuring its length, and dividing. It was called three times per xref entry (from `PDFCrossRefStream.computeMaxEntryByteWidths`) on ~50 000 entries per book, allocating a temporary binary string on every call.

**Fix.** A non-allocating short-circuit ladder:

```js
if (n < 0x100)       return 1;
if (n < 0x10000)     return 2;
if (n < 0x1000000)   return 3;
if (n < 0x100000000) return 4;
return 4 + Math.ceil((32 - Math.clz32(Math.floor(n / 0x100000000))) / 8);
```

The four-byte case covers all PDFs under 4 GB; the fallback handles larger values without allocating a string.

**Mechanism.** Same tslib barrel-copy issue as `fast-number-to-string`; patched in three locations.

## fast-dict-onebuf.mjs

**Problem.** Each `PDFDict` instance held its key-value pairs in a `Map`. Maps carry ~200 bytes of per-instance overhead when empty and ~50 bytes per entry. On the book, ~260 000 `PDFDict` instances are created during `PDFDocument.load`. As the document grows during parse, the Maps repeatedly doubled their internal hash-table storage and discarded each previous arena to GC.

**Fix.** A single append-only Array (`main`) shared across all `PDFDict` instances for the document's lifetime. Each `PDFDict` carries one encoded integer (`d`) that packs a `start` index (23 bits) and entry-pair `length` count (16 bits) into a single JavaScript number. `main[start..start+length]` holds alternating key and value references. Mutations that add a new entry either extend the dict's range in-place when it is at the array's high-water mark, or copy the range to the tail first (copy-on-write). `PDFCatalog`, `PDFPageTree`, and `PDFPageLeaf` share the same backing array; `PDFPageLeaf`'s `normalized` and `autoNormalizeCTM` booleans are encoded in two spare bits of `d` (bits 23 and 24). `PDFObjectParser.parseDict` uses a per-parser temp array as a recursion-frame stack, committing each completed frame to `main` as a single contiguous append.

The `measure-pass.mjs` pre-pass counts total `dictSlots` in the raw PDF byte stream. Calling `setExpectedDictSlots(n)` before `PDFDocument.load` resizes `main` in-place to the exact required size via `main.length = n`, eliminating V8 growth reallocations during parse. An in-place resize is used rather than replacing the module-level binding; replacing it would invalidate V8's inline-cache slots in every closure that reads `main`, causing a parse-time deoptimisation spike.

## fast-parse-object.mjs

**Problem.** `PDFObjectParser.parseObject` ran three speculative `matchKeyword` calls --- checking for `true`, `false`, and `null` --- before reading the first byte of the current token to dispatch on its type. `matchKeyword` on failure still consumed the `bytes.offset()` read, two `bytes.next()` calls (advance and rewind), and a comparison. `true`/`false`/`null` values are extremely rare in real PDFs; on the book these three calls failed on essentially every invocation of `parseObject`, which was called once per dict value, array element, and indirect-object body.

**Fix.** Read the first byte first, then dispatch by byte value. Digits, sign characters, and period go to `parseNumberOrRef`; `<<` goes to `parseDictOrStream`; `/` goes to `parseName`; `[` goes to `parseArray`; `(` goes to `parseString`; a lone `<` goes to `parseHexString`. The `matchKeyword` calls for `true`/`false`/`null` run only when the first byte is `t`, `f`, or `n` respectively. The `PDFObjectParsingError` for unrecognised tokens is preserved.

## fast-parse-name.mjs

**Problem.** `parseName` built a JavaScript string from the raw bytes of the name body, one character at a time via a cons-chain accumulator, then called `PDFName.of(string)` to retrieve the canonical instance. Each call allocated a temporary string (~8 characters on average), even though 99.7% of calls were to names already in the pool (4787 unique names vs 1.68 million total calls on the book).

**Fix.** A byte-hash cache in front of `parseName`. The name body bytes are scanned to compute a Java-style hash (`hash = hash * 31 + byte`) while simultaneously advancing the byte cursor --- no string is allocated on this path. The hash is looked up in a `Map`; on a hit the stored `Uint8Array` key is compared byte-by-byte against the current buffer slice to confirm equality (handling hash collisions). On a confirmed hit the cached `PDFName` instance is returned with zero string allocation.

On a miss, the name string is built in one `String.fromCharCode.apply(null, slice)` call (not a per-byte cons-chain) and passed to `PDFName.of` (which on this stack is the `fast-decode-name` string-keyed cache). The resulting `PDFName` instance is then stored in the byte-hash cache as a new entry.

Both caches converge on the same `PDFName` instance per logical name. Direct `PDFName.of(string)` calls from non-parser code (e.g., `setOutline`, `setMetadata`) bypass the byte-hash cache and go through `fast-decode-name` directly --- correct, since those call sites don't have a byte range to hash.

## fast-sync-load.mjs

**Problem.** pdf-lib's parser and writer methods are compiled from TypeScript `async function`s to tslib's `__awaiter` + `__generator` state machines. On browsers, these yield periodically via `objectsPerTick` / `waitForTick()` to keep the page responsive. In Node with `objectsPerTick: Infinity` (the `parseSpeed: Fastest` configuration), the yield gate never fires --- the entire generator runs in one tick --- yet every indirect object (~50 000 on the book) still paid the state-machine dispatch overhead for a single `case 0` fall-through.

**Fix.** Eight methods are replaced with plain synchronous equivalents.

Load side:
- `PDFParser.parseDocument`, `parseDocumentSection`, `parseIndirectObjects`, `parseIndirectObject`
- `PDFObjectStreamParser.parseIntoContext`
- `PDFDocument.load` (static factory)

Save side:
- `PDFWriter.serializeToBuffer` (kept `async` because `ParallelStreamWriter.computeBufferSize` is genuinely async via `Promise.all` over libuv)
- `PDFWriter.computeBufferSize` and `PDFStreamWriter.computeBufferSize`

`PDFDocument.load` returns a plain `PDFDocument` value rather than a Promise. `await PDFDocument.load(...)` at existing call sites still works, because `await` on a non-thenable resolves immediately to the value.

An additional optimisation in `parseIndirectObjects`: the upstream implementation called `skipJibberish()` after every indirect object to recover from garbage between objects in malformed PDFs. `skipJibberish` speculatively attempted keyword matches even when the next byte was already a digit (the common case). The sync rewrite short-circuits this: when the next byte is a digit, the outer `while` loop continues directly; `skipJibberish` is called only when the byte is not a digit.

## fast-indirect-objects.mjs

**Problem.** `PDFContext.indirectObjects` was a `Map<PDFRef, PDFObject>`. During `PDFDocument.load`, every indirect object's assignment called `indirectObjects.set(ref, object)`. The Map grew through ~14 doubling steps to accommodate the book's ~9 000 indirect objects, discarding each intermediate backing arena to GC. Profiling attributed ~14.5 MB of heap traffic to these `Map.set` calls.

**Fix.** An auxiliary dense Array `_objArr` on each `PDFContext`, indexed by `objectNumber` for gen=0 references (the overwhelmingly common case on Chromium-emitted PDFs). Gen≠0 references use the original `indirectObjects` Map as a fallback. The methods `assign`, `lookup`, `lookupMaybe`, `delete`, `getObjectRef`, and `enumerateIndirectObjects` all consult `_objArr` first. As a side benefit, `enumerateIndirectObjects` no longer needs to sort the result: dense-array iteration is already in ascending `objectNumber` order.

## fast-pdfnumber-pool.mjs

**Problem.** `PDFNumber.of(value)` allocated a new `PDFNumber` instance on every call. The `PDFNumber` constructor also called `numberToString(value)` to compute a `stringValue` field, allocating a second object. PDFs are dense with repeated numeric values --- page indices, `/MediaBox` dimensions (612, 792, 595, 842), font sizes, bit widths. On the book, ~15 MB of heap was attributed to `PDFNumber.of` calls against a small set of unique values.

**Fix.** A dense Array `intPool` indexed by `value` for non-negative integers in `[0, 16384)` (covers all observed integer values on the book by a wide margin). A `Map` fallback covers floats, negatives, and out-of-range integers. `PDFNumber` instances are immutable (`numberValue` and `stringValue` are set in the constructor and never changed), so sharing cached instances is safe. Heap attributed to `PDFNumber.of` drops from ~15 MB to ~0.8 MB on the book.

## fast-array-onebuf.mjs

**Problem.** Each `PDFArray` instance allocated a per-instance `this.array = []` in its constructor. On the book, these per-instance allocations contributed ~19 MB of heap. Each `this.array` was a short-lived Array grown on demand, causing V8 to perform repeated backing-store reallocations for small arrays.

**Fix.** The same one-buffer strategy as `fast-dict-onebuf`, applied to `PDFArray`. A single append-only Array (`arrayMain`) shared across all `PDFArray` instances. Each `PDFArray` carries one encoded integer (`d`) packing `start` (24 bits) and `length` (16 bits). `arrayMain[start..start+length]` holds array elements as plain JavaScript references --- no encoding, no decode step on reads. `PDFObjectParser.parseArray` uses a per-parser `_arrayTemp` stack, committing each completed frame to `arrayMain` in one contiguous append. Mutations follow the same copy-on-write logic as `fast-dict-onebuf`.

`setExpectedArraySlots(n)` from `measure-pass.mjs` resizes `arrayMain` in-place before parse for the same reason as `setExpectedDictSlots`: in-place resize preserves V8's inline-cache slots.

## parallel-deflate.mjs

**Problem.** `PDFDocument.save({ useObjectStreams: true })` drove `PDFStreamWriter.computeBufferSize` synchronously. This method created each `PDFObjectStream`, then immediately called `computeIndirectObjectSize` on it. `sizeInBytes()` on a `PDFObjectStream` lazy-populates its content cache by running zlib deflate on the stream's unencoded content --- synchronously on the Node.js main thread. On the book (~450 object streams, each grouping 50 objects), these sequential deflate calls accounted for ~30% of save phase wall time.

**Fix.** `ParallelStreamWriter`, a `PDFStreamWriter` subclass, splits the buffer-sizing pass into three phases:

1. **Classify** --- same partition logic as upstream: objects are divided into uncompressed (PDF streams, encrypted refs, gen≠0) and compressed chunks.
2. **Parallel deflate** --- all `PDFObjectStream` instances are created up-front, then `await Promise.all(streams.map(s => deflateAsync(s.getUnencodedContents())))` is called. Each deflate runs on libuv's thread pool (4 threads by default). Results are written directly into each stream's `contentsCache.value` so that the subsequent size pass finds only cache hits.
3. **Size and emit** --- same as upstream; every `computeIndirectObjectSize` call is a cache hit.

The cross-reference stream's contents depend on byte offsets fixed in phase 3, so it is deflated synchronously via `deflateSync` immediately after those offsets are pinned. This is one stream; the main thread overhead is negligible.

`parallelSave(pdfDoc, opts)` is the public entry point, replacing `pdfDoc.save({ useObjectStreams: true })`. The production configuration uses `{ objectsPerStream: 500 }` --- ten times the pdf-lib default of 50. Larger object streams give the deflate compressor a wider window over similar repeated strings (PDF names, object types, coordinate patterns), producing ~5% smaller output than the default grouping.

`UV_THREADPOOL_SIZE` (default 4) bounds the deflate concurrency. Setting it higher via `process.env.UV_THREADPOOL_SIZE = '8'` before any libuv work fires can reduce phase 2 wall time on machines with more than four CPU cores.

## See Also

- [Paged.js Patches](PagedJS) -- patches to the vendored paged.js bundle.
- [PDF Generation](../PDF-Generation) -- how these shims fit into the three-phase render pipeline and the overall data flow.
