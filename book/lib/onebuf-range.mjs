// The range machinery the two one-buffer shims share: fast-dict-onebuf for
// PDFDict and its subclasses, fast-array-onebuf for PDFArray. Each shim calls
// onebufRange() once and gets a buffer of its own -- one append-only Array
// holding every slot of every object the shim makes, for the document's
// lifetime -- with the functions that pack an object's range into a Number,
// append to the buffer and copy a range to its tail, and a singleton
// PDFContext. The shims share this code and no state, so either loads
// without the other.
//
// An object holds only `d`, a Number packing its range in the buffer:
//
//   bits 0 .. startBits-1     start: the index of its first slot
//   the next gapBits bits     flags a shim keeps in `d`; every repack
//                             carries them over (zero where unused)
//   the 16 bits above those   length: its number of slots
//
// The value stays well below Number.MAX_SAFE_INTEGER. Past 2^30 it is no
// longer a Smi, and V8 boxes it as a HeapNumber: `d & mask` still reads bits
// 0-30 correctly through Int32 coercion, and writes use arithmetic rather
// than `|`, so the high bits survive.
//
// Only these functions append. A shim reads the buffer directly and may
// overwrite a slot inside an object's range, which never moves another
// object's slots. An object whose range ends at the buffer's high-water mark
// extends in place; any other object has its range copied to the tail first
// (copy-on-write). Each range belongs to one object, so extending at the
// high-water mark never disturbs another. A removal or an insertion always
// copies, since shifting slots in place would corrupt the ranges after it.
//
// One PDFContext per buffer, and so per shim: a second distinct context
// throws. The book's pipeline makes one PDFDocument per process.
//
// Options:
//   name       the shim's name, which starts each error message
//   capacity   the buffer's initial length
//   startBits  the width of the start field
//   gapBits    the number of flag bits between start and length (default 0)
//   construct  (ProtoClass, d) => a new object of that pdf-lib class holding
//              `d`. The dispatch to each class's constructor is the shim's.

const LENGTH_LIMIT = 1 << 16;       // 65 536, exclusive
const LENGTH_MASK = 0xFFFF;

export function onebufRange({ name, capacity, startBits, gapBits = 0, construct }) {
  const START_LIMIT = 2 ** startBits;                 // exclusive
  const START_MASK = START_LIMIT - 1;
  const LENGTH_BASE = 2 ** (startBits + gapBits);     // length multiplier
  const GAP_MASK = LENGTH_BASE - START_LIMIT;

  const slots = new Array(capacity);
  let used = 0;
  let context = null;

  function pack(start, length) {
    if (start  >= START_LIMIT)  throw new Error(`${name}: start ${start} exceeds ${startBits}-bit budget`);
    if (length >= LENGTH_LIMIT) throw new Error(`${name}: length ${length} exceeds 16-bit budget`);
    return start + length * LENGTH_BASE;
  }

  function startOf(d)  { return d & START_MASK; }
  function lengthOf(d) { return Math.floor(d / LENGTH_BASE) & LENGTH_MASK; }

  // Resizes the buffer to `count * slack` in place. A new Array would
  // invalidate V8's inline caches in every closure that reads the buffer,
  // and the deopt and recompile show up as a parse-time allocation spike
  // (~27 MB sampled on the book). Only before the first append.
  function reserve(count, slack = 1.0) {
    if (used > 0) {
      throw new Error(`${name}: the buffer was sized after parse started (${used} slots in use)`);
    }
    slots.length = Math.ceil(count * slack);
  }

  function registerContext(ctx) {
    if (context === null) {
      context = ctx;
    } else if (context !== ctx) {
      throw new Error(`${name}: expected a singleton PDFContext, got a second distinct one.`);
    }
  }

  // Appends `count` slots of `source` from `from` and returns where they
  // start: a parser's finished frame, a new object's values, or a range of
  // the buffer itself, which always lies below the tail it is copied to.
  function append(source, from, count) {
    const at = used;
    for (let i = 0; i < count; i++) slots[at + i] = source[from + i];
    used = at + count;
    return at;
  }

  function view(ProtoClass, start, length, ctx) {
    registerContext(ctx);
    return construct(ProtoClass, pack(start, length));
  }

  function viewOf(ProtoClass, values, ctx) {
    return view(ProtoClass, append(values, 0, values.length), values.length, ctx);
  }

  // The object's `d` once its range ends at the high-water mark: unchanged
  // if it already does, else for a copy of the range at the tail.
  function cow(obj) {
    const d = obj.d;
    const start = startOf(d);
    const length = lengthOf(d);
    if (start + length === used) return d;
    return pack(append(slots, start, length), length) + (d & GAP_MASK);
  }

  function push(obj, value) {
    const d = cow(obj);
    slots[used++] = value;
    obj.d = pack(startOf(d), lengthOf(d) + 1) + (d & GAP_MASK);
  }

  // A dictionary entry: its key and its value.
  function pushPair(obj, key, value) {
    const d = cow(obj);
    slots[used++] = key;
    slots[used++] = value;
    obj.d = pack(startOf(d), lengthOf(d) + 2) + (d & GAP_MASK);
  }

  // Copies the object's range to the tail without its `count` slots from
  // `index`.
  function cut(obj, index, count) {
    const d = obj.d;
    const start = startOf(d);
    const length = lengthOf(d);
    const at = used;
    for (let i = 0; i < length; i++) {
      if (i >= index && i < index + count) continue;
      slots[used++] = slots[start + i];
    }
    obj.d = pack(at, length - count) + (d & GAP_MASK);
  }

  // Copies the object's range to the tail with `value` inserted at `index`.
  function insert(obj, index, value) {
    const d = obj.d;
    const start = startOf(d);
    const length = lengthOf(d);
    const at = used;
    for (let i = 0; i < index; i++) slots[used++] = slots[start + i];
    slots[used++] = value;
    for (let i = index; i < length; i++) slots[used++] = slots[start + i];
    obj.d = pack(at, length + 1) + (d & GAP_MASK);
  }

  // A new object of `ProtoClass` holding a copy of the object's range and
  // none of its flags.
  function clone(obj, ProtoClass, ctx) {
    const d = obj.d;
    const length = lengthOf(d);
    return view(ProtoClass, append(slots, startOf(d), length), length, ctx || context);
  }

  return {
    slots,
    used: () => used,
    reserve,
    startOf,
    lengthOf,
    context: () => context,
    append,
    view,
    viewOf,
    push,
    pushPair,
    cut,
    insert,
    clone,
  };
}
