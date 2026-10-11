---
title: pdf-lib Patches
parent: Library Patches
grand_parent: Documentation Development
nav_order: 2
permalink: /Documentation/Development/Fixes/PDFLib
---

# pdf-lib Patches
{: .no_toc }

The files under `book/lib/fast-*.mjs` are side-effecting ES modules that patch pdf-lib's live exports. `book/lib/parallel-deflate.mjs` patches nothing and exports `parallelSave`, which `render-book.mjs` calls in place of `pdfDoc.save`. `render-book.mjs` imports all of them before any pdf-lib operation runs.

The patches are compatible with each other and idempotent: each `fast-*` module guards its installation with a flag on the patched prototype, class or module. Together they cut the process phase --- parsing Chromium's raw PDF output, adding bookmarks and metadata, and serialising the result --- from ~40 seconds to ~1.6 seconds on a 1,651-page book. pdf-lib is built for general use in browsers and Node, so it favours generality over throughput on one large document.

A patch that needs a pdf-lib class or module by its CommonJS path under `pdf-lib/cjs/` imports it from `book/lib/pdf-lib-internals.mjs`. `pdf-lib` itself resolves to `pdf-lib/cjs/index.js`, so each is the instance the library uses.

The patches are written against pdf-lib 1.17.1, which `package.json` pins exact. Before patching, each one passes `book/lib/shim-targets.mjs` a table:

- the arity and a source fingerprint of each member it overwrites;
- the same for the constructor of each class whose objects it builds without calling it;
- each member it adds, which must be absent.

If a target differs, the patch throws at import, naming itself and each member that differs. A different pdf-lib therefore stops the book instead of changing it. The patch is then re-derived from the new source, or removed.

Each patch must leave the output unchanged. [`check_pdf_shims_equiv.mjs`](../Tools-Toolchain-Tests#check-pdf-shims-equiv), one of `test.bat`'s gates, saves one document with stock pdf-lib and with every patch `render-book.mjs` imports, and compares the two files object by object. It fails if the patches are not the ones the gate lists, or if one never runs that the list does not mark as unreached.

* TOC goes here
{:toc}

## fast-refs-class.mjs

**Problem.** `PDFRef.of(objectNumber, generationNumber)` is the factory for every indirect reference in the PDF. It built instances with `Object.create(PDFRef.prototype)` and individual property writes, which V8 handles as transitions through intermediate hidden classes. The instances came out about twice the size of those built with `new` (~60 bytes each), and nothing pooled them: each call allocated a new instance even for an object number seen before. With ~226 000 unique references on the book, that is ~13.5 MB of excess heap.

**Fix.** Two constructor functions, `_FastRef` (gen=0) and `_FastRefGen` (gen≠0), both with their `prototype` aliased to `PDFRef.prototype`. V8 gives each a stable hidden class from the first instance. `_FastRef` holds only `objectNumber`; `generationNumber` is a prototype default of `0`, so a gen=0 instance needs one inline slot (~16 bytes). Gen=0 instances are cached in a dense `pool0` Array indexed by `objectNumber`. Gen≠0 instances use a `Map` keyed by the string `"N M"` (rare: only the free entry at object 0 in Chromium-emitted PDFs). The hot prototype methods `toString`, `sizeInBytes` and `copyBytesInto` read `objectNumber` and `generationNumber` as plain data properties instead of the `tag` string the original stores on each instance.

## fast-parse-number.mjs

**Problem.** `BaseParser.parseRawNumber` and `BaseParser.parseRawInt` built a number by appending one character at a time to a string (`value += charFromCode(byte)`), then called `Number(value)`. Every numeric token in a PDF takes this path --- object numbers, generation numbers, lengths, coordinates, font sizes --- so the book allocated hundreds of thousands of throwaway strings.

**Fix.** Direct integer accumulators: `n = n * 10 + (byte - 0x30)`, consuming each byte once. `parseRawNumber` also accumulates the digits after the period and divides once, `(integer * scale + fraction) / scale`. Both operands are exact integers, and one division rounds to the double nearest the decimal, as `Number` does. Adding the fraction's quotient to the integer part would round twice and read `2.28` as `2.2800000000000002`. Both implementations fall back to the original when the number has more than 15 digits (the fraction's included) or no digits at all.

**Mechanism.** `BaseParser` is not re-exported from pdf-lib's public index; `pdf-lib-internals.mjs` requires it by the CJS path `pdf-lib/cjs/core/parser/BaseParser.js`. Mutating `BaseParser.prototype` affects all subclasses: `PDFParser`, `PDFObjectParser`, `PDFObjectStreamParser` and `PDFXRefStreamParser`.

## fast-decode-name.mjs

**Problem.** `PDFName.of(name)` ran `decodeName(name)` --- a `.replace(/#([\dABCDEF]{2})/g, ...)` scan for `#XX` hex escapes --- on every call. The book made 2 759 635 calls, and exactly two inputs contained a `#`. The scans cost ~168 ms (7% of process phase self-time).

**Fix.** A parallel `Map<string, PDFName>` keyed by the raw input string. When the input has no `#` (checked with `indexOf`), the decoded form equals the raw form, so the key matches pdf-lib's own pool key. A hit returns the existing `PDFName` with no regex work. A miss calls the original `PDFName.of`, which runs the regex once and returns the canonical instance, and stores the result. Inputs containing `#` skip the cache and keep the original decode behaviour.

## fast-number-to-string.mjs

**Problem.** `numberToString(num)`, which `PDFNumber` and others use to serialise numbers, called `num.toString()` twice: once for `numStr` and again inside the exponential-notation check (`num.toString().split('e-')` etc.). Exponential notation occurs only for `|num| < 1e-6` or `|num| >= 1e21`, which real PDFs do not contain, so the second `toString()`, the `split` and the `parseInt` were wasted on every call.

**Fix.** Compute `numStr = String(num)` once and return it when `numStr.indexOf('e') === -1`. Fall through to the original only when `'e'` is present.

**Mechanism.** pdf-lib is compiled against tslib 1.x, whose `__exportStar` copies export values by value at module evaluation time. By the time `PDFNumber.js`'s `index_1.numberToString(value)` runs, `index_1` holds the original function, so patching only the source module has no effect at the call site. The shim patches three locations: `pdf-lib/cjs/utils/numbers.js` (the source), `pdf-lib/cjs/utils/index.js` (the barrel `PDFNumber` reads from) and `pdf-lib/cjs/index.js` (the public index).

## fast-size-in-bytes.mjs

**Problem.** `utils.sizeInBytes(n)` gives the number of bytes needed to encode an integer in a cross-reference stream field, and computed it as `Math.ceil(n.toString(2).length / 8)`: a binary string built, measured and thrown away. `PDFCrossRefStream.computeMaxEntryByteWidths` calls it three times per xref entry, on ~50 000 entries per book.

**Fix.** A short-circuit ladder that allocates nothing:

```js
if (n < 0x100)       return 1;
if (n < 0x10000)     return 2;
if (n < 0x1000000)   return 3;
if (n < 0x100000000) return 4;
return 4 + Math.ceil((32 - Math.clz32(Math.floor(n / 0x100000000))) / 8);
```

The four-byte case covers all PDFs under 4 GB; the last line handles larger values.

**Mechanism.** The same tslib barrel-copy issue as `fast-number-to-string`, patched in three locations.

## fast-dict-onebuf.mjs

**Problem.** Each `PDFDict` held its entries in a `Map`, which costs ~200 bytes when empty and ~50 bytes per entry. `PDFDocument.load` creates ~260 000 dicts on the book, and as the document grew the Maps repeatedly doubled their hash-table storage and left each old arena to the garbage collector.

**Fix.** One append-only Array (`main`) shared by all `PDFDict` instances for the document's lifetime. Each `PDFDict` holds one integer (`d`) packing a `start` index (23 bits) and an entry-pair `length` (16 bits). `main[start..start+length]` holds alternating keys and values. A mutation that adds an entry either extends the range in place, when the dict is at the array's high-water mark, or first copies the range to the tail (copy-on-write).

`PDFCatalog`, `PDFPageTree` and `PDFPageLeaf` share the same array. Their replaced methods cannot read a dictionary built on a `Map`, so pdf-lib's eight factories for the four classes all build in `main`: `fromMapWithContext` on each, `PDFDict.withContext`, `PDFCatalog.withContextAndPages`, `PDFPageTree.withContext` and `PDFPageLeaf.withContextAndParent`. `PDFPageLeaf`'s `normalized` and `autoNormalizeCTM` booleans are two spare bits of `d` (bits 23 and 24). `PDFObjectParser.parseDict` keeps a per-parser temp array as a recursion-frame stack and appends each completed frame to `main` in one contiguous write.

The `measure-pass.mjs` pre-pass counts the `dictSlots` in the raw PDF. `setExpectedDictSlots(n)`, called before `PDFDocument.load`, resizes `main` to that size with `main.length = n`, which avoids V8 growth reallocations during the parse. The resize is in place because replacing the module-level binding would invalidate V8's inline-cache slots in every closure that reads `main` and cause a deoptimisation spike.

## fast-parse-object.mjs

**Problem.** `PDFObjectParser.parseObject` tried three `matchKeyword` calls (`true`, `false`, `null`) before looking at the first byte of the token. Each failed call reads `bytes.offset()`, advances and rewinds with two `bytes.next()` calls, and compares. Those values are rare in real PDFs, so on the book the three calls failed on nearly every invocation, and `parseObject` runs once per dict value, array element and indirect-object body.

**Fix.** Read the first byte and dispatch on it. Digits, sign characters and the period go to `parseNumberOrRef`; `<<` to `parseDictOrStream`; `/` to `parseName`; `[` to `parseArray`; `(` to `parseString`; a lone `<` to `parseHexString`. The `matchKeyword` calls run only when the first byte is `t`, `f` or `n` respectively. The `PDFObjectParsingError` for unrecognised tokens is unchanged.

## fast-parse-name.mjs

**Problem.** `parseName` built a string from the name's bytes one character at a time, then called `PDFName.of(string)` for the canonical instance. 99.7% of calls were for names already pooled (4787 unique names in 1.68 million calls on the book), so nearly every temporary string was wasted.

**Fix.** A byte-hash cache in front of `parseName`. A scan of the name body computes a Java-style hash (`hash = hash * 31 + byte`) while advancing the cursor, allocating no string. The hash is looked up in a `Map`. On a hit, the stored `Uint8Array` key is compared byte by byte with the buffer slice to rule out a collision, and the cached `PDFName` is returned.

On a miss, the string is built in one `String.fromCharCode.apply(null, slice)` call and passed to `PDFName.of` (the string-keyed cache of `fast-decode-name`). The resulting `PDFName` is stored as a new entry.

Both caches converge on the same `PDFName` instance per name. Direct `PDFName.of(string)` calls from other code (`setOutline`, `setMetadata`) have no byte range to hash and go through `fast-decode-name` alone.

## fast-sync-load.mjs

**Problem.** pdf-lib's parser and writer methods are TypeScript `async function`s, compiled to tslib `__awaiter` + `__generator` state machines. In a browser they yield periodically (`objectsPerTick` / `waitForTick()`) to keep the page responsive. In Node with `objectsPerTick: Infinity` (the `parseSpeed: Fastest` configuration) the yield never fires and the whole generator runs in one tick, yet each of the ~50 000 indirect objects still paid the state-machine dispatch.

**Fix.** Seven methods are replaced with plain synchronous equivalents.

Load side:
- `PDFParser.parseDocument`, `parseDocumentSection`, `parseIndirectObjects`, `parseIndirectObject`
- `PDFObjectStreamParser.parseIntoContext`
- `PDFDocument.load` (static factory)

Save side:
- `PDFWriter.serializeToBuffer` (kept `async` because `ParallelStreamWriter.computeBufferSize` is genuinely async via `Promise.all` over libuv)

The writers' own `computeBufferSize` methods are untouched. The book calls neither, since `parallelSave`'s `ParallelStreamWriter` overrides the stream writer's.

`PDFDocument.load` returns a plain `PDFDocument` rather than a Promise. `await PDFDocument.load(...)` at existing call sites still works.

`parseIndirectObjects` also changes how it recovers from garbage between objects in malformed PDFs. Upstream calls `skipJibberish()` after every indirect object, and it tries keyword matches even when the next byte is already a digit (the common case). The rewrite calls `skipJibberish` only when the next byte is not a digit; otherwise the outer `while` loop continues directly.

## fast-indirect-objects.mjs

**Problem.** `PDFContext.indirectObjects` was a `Map<PDFRef, PDFObject>`, and `PDFDocument.load` calls `indirectObjects.set(ref, object)` for every indirect object. The Map went through ~14 doubling steps for the book's ~9 000 indirect objects, discarding each intermediate arena to the garbage collector (~14.5 MB of heap traffic).

**Fix.** A dense Array `_objArr` on each `PDFContext`, indexed by `objectNumber` for gen=0 references (nearly all of them in Chromium-emitted PDFs). Gen≠0 references use the original `indirectObjects` Map. `assign`, `lookup`, `lookupMaybe`, `delete`, `getObjectRef` and `enumerateIndirectObjects` consult `_objArr` first. `enumerateIndirectObjects` no longer sorts its result, because dense-array iteration is already in ascending `objectNumber` order.

## fast-pdfnumber-pool.mjs

**Problem.** `PDFNumber.of(value)` allocated a new `PDFNumber` on every call, and the constructor called `numberToString(value)` for a `stringValue` field, allocating a second object. PDFs repeat a small set of numbers constantly: page indices, `/MediaBox` dimensions (612, 792, 595, 842), font sizes, bit widths. On the book, ~15 MB of heap went to `PDFNumber.of` calls.

**Fix.** A dense Array `intPool` indexed by `value` for non-negative integers in `[0, 16384)`, and a `Map` for floats, negatives and larger integers. `PDFNumber` is immutable (`numberValue` and `stringValue` are set in the constructor), so sharing instances is safe. Heap attributed to `PDFNumber.of` falls from ~15 MB to ~0.8 MB.

## fast-array-onebuf.mjs

**Problem.** Each `PDFArray` allocated `this.array = []` in its constructor. On the book that was ~19 MB of heap, in short-lived Arrays that V8 reallocated repeatedly as they grew.

**Fix.** The strategy of `fast-dict-onebuf`, applied to `PDFArray`: one append-only Array (`arrayMain`) shared by all instances. Each `PDFArray` holds one integer (`d`) packing `start` (24 bits) and `length` (16 bits). `arrayMain[start..start+length]` holds the elements as plain references, with no encoding to decode on reads. `PDFObjectParser.parseArray` keeps a per-parser `_arrayTemp` stack and appends each completed frame to `arrayMain` in one contiguous write. Mutations are copy-on-write, as in `fast-dict-onebuf`.

Both shims take the shared logic from `book/lib/onebuf-range.mjs`: packing and reading `d`, appending to the buffer, copying a range to its end, and checking that only one `PDFContext` is used. Each shim passes its own bit layout and constructors and gets its own buffer and context, so either works without the other.

`setExpectedArraySlots(n)` from `measure-pass.mjs` resizes `arrayMain` in place before the parse, for the same reason as `setExpectedDictSlots`.

## parallel-deflate.mjs

**Problem.** `PDFDocument.save({ useObjectStreams: true })` ran `PDFStreamWriter.computeBufferSize` synchronously. For each `PDFObjectStream` it created the stream and then called `computeIndirectObjectSize`, whose `sizeInBytes()` fills the stream's content cache by running zlib deflate on the main thread. The book has ~450 object streams of 50 objects each, and these sequential deflates took ~30% of save-phase wall time.

**Fix.** `ParallelStreamWriter`, a `PDFStreamWriter` subclass, splits the buffer-sizing pass into three phases:

1. **Classify** --- as upstream: divide the objects into uncompressed (PDF streams, encrypted refs, gen≠0) and compressed chunks.
2. **Parallel deflate** --- create all `PDFObjectStream` instances, then `await Promise.all(streams.map(s => deflateAsync(s.getUnencodedContents())))`. The deflates run on libuv's thread pool (4 threads by default) and write directly into each stream's `contentsCache.value`, so the size pass finds only cache hits.
3. **Size and emit** --- as upstream; every `computeIndirectObjectSize` call is a cache hit.

The cross-reference stream's contents depend on byte offsets fixed in phase 3, so it is deflated with `deflateSync` right after those offsets are set. It is a single stream.

`parallelSave(pdfDoc, opts)` is the public entry point and replaces `pdfDoc.save({ useObjectStreams: true })`. Production uses `{ objectsPerStream: 500 }`, ten times pdf-lib's default of 50. Larger object streams give the compressor a wider window over repeated strings (PDF names, object types, coordinate patterns) and produce ~5% smaller output.

`UV_THREADPOOL_SIZE` (default 4) bounds the deflate concurrency. On a machine with more than four cores, set `process.env.UV_THREADPOOL_SIZE = '8'` before any libuv work starts to shorten phase 2.

## See Also

- [Paged.js Patches](PagedJS) -- patches to the vendored paged.js bundle.
- [PDF Generation](../PDF-Generation) -- how these shims fit into the three-phase render pipeline and the overall data flow.
