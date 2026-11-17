// The help add-in's documentation archive: the built offline tree as a zip.
//
//     const stats = await writeHelpArchive({ src, out, skip });   // stats.zip is the archive's bytes
//     const problems = await checkHelpArchive({ src, zip, mayDiffer, skip });
//
// checkHelpArchive reads an archive written earlier against the tree as it is now:
// the same files, and the same size and CRC-32 in each, except in the files named
// in `mayDiffer`. `skip(name)` leaves a file of the tree out of the archive, and
// out of the comparison; pass both functions the same one.
//
// The IDE help add-in serves the documentation offline from this zip, embedded in
// its DLL as the resource HELP/site.zip (a twinBASIC project embeds
// Resources/<TYPE>/<name> as a resource). The reader on the twinBASIC side does no
// inflating of its own, so the format is a contract, and this module keeps to the
// letter of it:
//
//   - one entry per file, no directory entries, names relative to the tree root
//     with forward slashes, UTF-8 with general-purpose flag bit 11 set, sorted by
//     name in code-unit order, so the same tree gives the same bytes;
//   - a fixed DOS date and time (1980-01-01 00:00), version made by and needed 20,
//     no extra fields, no comments, and no data descriptors: the CRC-32 and both
//     sizes are in the local header and in the central directory;
//   - no zip64: more than 65,535 entries, or 4 GB, is refused;
//   - method 0 (stored) for files that are compressed already, method 8 (raw
//     deflate, level 9) for the rest, unless the deflated data is not smaller than
//     the file, in which case it is stored.
//
// lib/zip.mjs deflates everything and is shared with other tools, so this
// writes its own.
//
// ── Units ──
//
// The deflating is split into units, each of which runs on its own, so that the
// build can run them on its lanes (builder/help-archive-step.mjs): a unit is a
// whole file, or one piece of a file larger than PIECE_BYTES. A large file's
// pieces are joined into one deflate stream, as pigz makes one: every piece but
// the last ends with a sync flush, which ends it on a byte boundary without ending
// the stream, and each piece is primed with the 32 KB of the file before it, so
// that a match can reach back across the join as it would in one stream. The
// bytes depend only on PIECE_BYTES, never on how many units ran at once, and are
// within a few bytes of one stream's size. The piece CRC-32s are combined
// (crc32Combine) into the file's.
//
// Nothing here starts a thread or puts work on Node's thread pool: everything is
// synchronous, on the thread that calls it. Parallelism is the caller's, by
// running units on threads of its own (WIP.Build.md, "No task starts a thread").
//
// Nothing here trusts what it wrote. Each unit inflates what it deflated and
// compares it with the bytes it read. The archive is read back after the rename,
// compared byte for byte with what was assembled, and parsed: the end record,
// every central-directory entry and every local header are compared with each
// other and with the tree's list of files.
//
// The module has no side effects at import and never exits the process. A problem
// is an Error thrown by writeArchive and writeHelpArchive:
//
//   - verifyFailed: the file was written and the read-back found differences;
//     `problems` lists them, each naming its entry, and `stats` is what the
//     summary of a successful run would hold;
//   - tooLarge: the tree needs zip64 (more than 65,535 files, a name over 65,535
//     bytes, or 4 GB);
//   - anything else (an unreadable or empty tree, a unit whose deflate does not
//     inflate back, a write that failed) carries its own message.

import { closeSync, fstatSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { constants, crc32, deflateRawSync, inflateRawSync } from "node:zlib";

// Files that are compressed already; deflating them costs time and gains nothing.
const STORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff2",
  ".woff",
  ".mp4",
  ".zip",
  ".pdf",
]);

// A file deflated whole is at most this big; a larger one is deflated in pieces
// of this size. The archive's bytes depend on it: changing it changes them.
export const PIECE_BYTES = 1 << 20;
// What a piece is primed with: deflate's whole window.
const WINDOW = 32768;

const MAX_ENTRIES = 0xffff;
const MAX_BYTES = 0xffffffff;

// 1980-01-01 00:00: day 1 of month 1 of year 0 since 1980, and time 0.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
const VERSION = 20;
const FLAG_UTF8 = 0x0800;

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;

function tooLarge(message) {
  return Object.assign(new Error(message), { tooLarge: true });
}

const isStoredType = (name) => STORED_EXTENSIONS.has(path.extname(name).toLowerCase());

/**
 * Every file under `dir` that `skip` keeps, as { name, file, size }, `name`
 * relative with forward slashes, in code-unit order.
 */
export function listFiles(dir, skip = () => false) {
  const found = [];
  const walk = (d, prefix) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const file = path.join(d, e.name);
      const name = prefix + e.name;
      if (e.isDirectory()) walk(file, `${name}/`);
      else if (e.isFile() && !skip(name)) found.push({ name, file });
    }
  };
  walk(dir, "");
  for (const f of found) f.size = statSync(f.file).size;
  return found.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function fstatSize(file) {
  const fd = openSync(file, "r");
  try {
    return fstatSync(fd).size;
  } finally {
    closeSync(fd);
  }
}

/** Refuses a tree a zip without zip64 cannot hold. */
export function checkZipLimits(files) {
  if (files.length > MAX_ENTRIES) {
    throw tooLarge(`${files.length} files is more than a zip without zip64 holds (${MAX_ENTRIES}).`);
  }
  for (const { name } of files) {
    if (Buffer.byteLength(name, "utf8") > 0xffff) throw tooLarge(`the name is too long for a zip entry: ${name}`);
  }
}

// ── Units ──────────────────────────────────────────────────────────────────

/**
 * The units that deflate `files` ({ name, size }): one per file, or one per
 * piece of a file that is deflated and larger than PIECE_BYTES, as
 * { name, size, piece: [index, count] }. Each unit's `cost` is the bytes it
 * deflates; a stored file is only read and checksummed, which costs about a
 * sixteenth as much.
 */
export function planUnits(files) {
  const units = [];
  for (const { name, size } of files) {
    if (isStoredType(name)) {
      units.push({ name, size, cost: Math.ceil(size / 16) });
      continue;
    }
    if (size <= PIECE_BYTES) {
      units.push({ name, size, cost: size });
      continue;
    }
    const count = Math.ceil(size / PIECE_BYTES);
    for (let index = 0; index < count; index++) {
      units.push({ name, size, piece: [index, count], cost: Math.min(PIECE_BYTES, size - index * PIECE_BYTES) });
    }
  }
  return units;
}

/**
 * `units` dealt into at most `groups` lists of about equal cost, the costliest
 * first, each to the list with the least so far. Which unit goes where changes
 * only which thread deflates it, never the archive's bytes.
 */
export function groupUnits(units, groups) {
  const n = Math.max(1, Math.min(groups, units.length));
  const lists = Array.from({ length: n }, () => ({ cost: 0, units: [] }));
  const order = [...units.keys()].sort((a, b) => units[b].cost - units[a].cost || a - b);
  for (const i of order) {
    let least = lists[0];
    for (const l of lists) if (l.cost < least.cost) least = l;
    least.units.push(units[i]);
    least.cost += units[i].cost;
  }
  return lists.map((l) => l.units).filter((l) => l.length > 0);
}

/** Reads `length` bytes of `file` at `position`; throws if the file holds fewer. */
function readRange(file, position, length) {
  const buf = Buffer.allocUnsafe(length);
  const fd = openSync(file, "r");
  try {
    let done = 0;
    while (done < length) {
      const n = readSync(fd, buf, done, length - done, position + done);
      if (n === 0) throw new Error(`${file} is shorter than the archive's plan of it`);
      done += n;
    }
  } finally {
    closeSync(fd);
  }
  return buf;
}

/**
 * Deflates one unit of the tree under `root`, and checks that what it deflated
 * inflates to the bytes it read. Returns { name, crc, size, method, body }, with
 * `piece` as well for a piece; `body` is a Uint8Array of its own, so that it can
 * cross to another thread without the memory around it.
 */
export function deflateUnit(root, unit) {
  const file = path.join(root, ...unit.name.split("/"));
  if (!unit.piece) {
    const data = readFileSync(file);
    if (data.length !== unit.size) throw new Error(`${unit.name} changed size while the archive was made`);
    const crc = crc32(data);
    let method = 0;
    let body = data;
    if (!isStoredType(unit.name) && data.length > 0) {
      const deflated = deflateRawSync(data, { level: 9 });
      if (deflated.length < data.length) {
        if (!inflateRawSync(deflated).equals(data)) {
          throw new Error(`${unit.name}: the deflated data does not inflate to the file`);
        }
        method = 8;
        body = deflated;
      }
    }
    return { name: unit.name, crc, size: data.length, method, body: new Uint8Array(body) };
  }

  const [index, count] = unit.piece;
  const start = index * PIECE_BYTES;
  const end = Math.min(unit.size, start + PIECE_BYTES);
  const primed = Math.min(WINDOW, start);
  const read = readRange(file, start - primed, end - start + primed);
  const dictionary = primed > 0 ? read.subarray(0, primed) : undefined;
  const data = read.subarray(primed);
  const last = index === count - 1;
  if (last && fstatSize(file) !== unit.size) throw new Error(`${unit.name} changed size while the archive was made`);
  const flush = last ? constants.Z_FINISH : constants.Z_SYNC_FLUSH;
  const body = deflateRawSync(data, { level: 9, finishFlush: flush, ...(dictionary && { dictionary }) });
  const back = inflateRawSync(body, {
    finishFlush: constants.Z_SYNC_FLUSH,
    ...(dictionary && { dictionary }),
  });
  if (!back.equals(data)) throw new Error(`${unit.name}: piece ${index + 1} of ${count} does not inflate to the file`);
  return {
    name: unit.name,
    piece: index,
    crc: crc32(data),
    size: data.length,
    method: 8,
    body: new Uint8Array(body),
  };
}

// ── CRC-32 of joined pieces ────────────────────────────────────────────────

// zlib's crc32_combine: the CRC-32 of A followed by B, from the CRC-32 of each
// and B's length, by applying B's length of zero bytes to A's CRC as an
// operator over GF(2). Node does not expose zlib's.
function gf2Times(mat, vec) {
  let sum = 0;
  for (let i = 0; vec; vec >>>= 1, i++) if (vec & 1) sum ^= mat[i];
  return sum >>> 0;
}

function gf2Square(square, mat) {
  for (let n = 0; n < 32; n++) square[n] = gf2Times(mat, mat[n]);
}

export function crc32Combine(crc1, crc2, len2) {
  if (len2 <= 0) return crc1 >>> 0;
  const even = new Array(32);
  const odd = new Array(32);
  odd[0] = 0xedb88320; // the CRC-32 polynomial, reflected
  let row = 1;
  for (let n = 1; n < 32; n++) {
    odd[n] = row;
    row <<= 1;
  }
  gf2Square(even, odd); // two zero bits
  gf2Square(odd, even); // four
  let c = crc1 >>> 0;
  let len = len2;
  do {
    gf2Square(even, odd);
    if (len & 1) c = gf2Times(even, c);
    len = Math.floor(len / 2);
    if (len === 0) break;
    gf2Square(odd, even);
    if (len & 1) c = gf2Times(odd, c);
    len = Math.floor(len / 2);
  } while (len !== 0);
  return (c ^ crc2) >>> 0;
}

/**
 * Each file's entry from the units' results: a whole file's as it is, a large
 * file's from its pieces, joined in order with their CRC-32s combined. Throws
 * when a file has no result, or a piece is missing. Returns them in `files` order.
 */
export function collectEntries(files, results) {
  const whole = new Map();
  const pieces = new Map();
  for (const r of results) {
    if (r.piece === undefined) whole.set(r.name, r);
    else {
      if (!pieces.has(r.name)) pieces.set(r.name, []);
      pieces.get(r.name)[r.piece] = r;
    }
  }
  return files.map(({ name, file, size }) => {
    if (whole.has(name)) return whole.get(name);
    const parts = pieces.get(name);
    if (!parts) throw new Error(`${name}: no unit deflated it`);
    const count = Math.ceil(size / PIECE_BYTES);
    let crc = 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      const p = parts[i];
      if (!p) throw new Error(`${name}: piece ${i + 1} of ${count} was never deflated`);
      crc = i === 0 ? p.crc : crc32Combine(crc, p.crc, p.size);
      total += p.size;
    }
    if (parts.length !== count || total !== size) throw new Error(`${name}: its pieces do not add up to the file`);
    const body = Buffer.concat(parts.map((p) => p.body));
    // A file that deflated no smaller is stored, as a whole one would be.
    if (body.length >= size) return { name, crc, size, method: 0, body: readFileSync(file) };
    return { name, crc, size, method: 8, body };
  });
}

// ── The zip ────────────────────────────────────────────────────────────────

/** Builds the archive from the entries, and returns it with the counts the summary reports. */
function assembleArchive(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  let rawBytes = 0;
  let storedBytes = 0;
  for (const { name, crc, method, body, size } of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    if (method === 0) storedBytes += body.length;
    rawBytes += size;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(SIG_CENTRAL, 0);
    entry.writeUInt16LE(VERSION, 4);
    entry.writeUInt16LE(VERSION, 6);
    entry.writeUInt16LE(FLAG_UTF8, 8);
    entry.writeUInt16LE(method, 10);
    entry.writeUInt16LE(DOS_TIME, 12);
    entry.writeUInt16LE(DOS_DATE, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(size, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    // extra length, comment length, disk number, internal and external attributes: 0
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);

    parts.push(local, nameBytes, body);
    offset += local.length + nameBytes.length + body.length;
    if (offset > MAX_BYTES) throw tooLarge("the archive passes 4 GB, which needs zip64.");
  }
  const centralBytes = Buffer.concat(central);
  if (offset + centralBytes.length + 22 > MAX_BYTES) throw tooLarge("the archive passes 4 GB, which needs zip64.");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return { zip: Buffer.concat([...parts, centralBytes, end]), rawBytes, storedBytes };
}

/**
 * Parses `zip` against the tree's list of files: the end record, every
 * central-directory entry and every local header, with each other and with the
 * list. Returns the differences found, each naming its entry, and each entry's
 * { name, method, crc, csize, usize, dataAt }, in order.
 */
function parseArchive(zip, files) {
  const head = [];
  const tail = [];
  const entries = [];
  const bad = (list, name, text) => list.push(`${name}: ${text}`);

  if (zip.length < 22 || zip.readUInt32LE(zip.length - 22) !== SIG_END) {
    return { problems: ["(archive): the end-of-central-directory record is not where it should be"], entries };
  }
  const endAt = zip.length - 22;
  const total = zip.readUInt16LE(endAt + 10);
  const cdSize = zip.readUInt32LE(endAt + 12);
  const cdOffset = zip.readUInt32LE(endAt + 16);
  if (zip.readUInt16LE(endAt + 8) !== total)
    bad(head, "(archive)", "the end record counts entries on this disk and in all differently");
  if (zip.readUInt16LE(endAt + 20) !== 0) bad(head, "(archive)", "the archive has a comment");
  if (total !== files.length)
    bad(head, "(archive)", `the archive holds ${total} entries, the tree ${files.length} files`);
  if (cdOffset + cdSize !== endAt) bad(head, "(archive)", "the central directory does not end at the end record");

  const mine = [];
  let at = cdOffset;
  let expectLocal = 0;
  let previous = null;
  for (let i = 0; i < total; i++) {
    if (at + 46 > endAt || zip.readUInt32LE(at) !== SIG_CENTRAL) {
      bad(mine, `(entry ${i})`, "the central-directory record is missing or malformed");
      break;
    }
    const rec = at;
    const flags = zip.readUInt16LE(at + 8);
    const method = zip.readUInt16LE(at + 10);
    const crc = zip.readUInt32LE(at + 16);
    const csize = zip.readUInt32LE(at + 20);
    const usize = zip.readUInt32LE(at + 24);
    const nameLen = zip.readUInt16LE(at + 28);
    const extraLen = zip.readUInt16LE(at + 30);
    const commentLen = zip.readUInt16LE(at + 32);
    const localAt = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLen);
    const listed = files[i];
    at += 46 + nameLen + extraLen + commentLen;

    if (!listed || listed.name !== name) {
      bad(mine, name, `the entry is not the tree's file number ${i + 1}${listed ? ` (${listed.name})` : ""}`);
      continue;
    }
    if (previous !== null && !(previous < name)) bad(mine, name, "the entries are not in name order");
    previous = name;
    if (name.endsWith("/")) bad(mine, name, "the entry is a directory");
    if (flags !== FLAG_UTF8) bad(mine, name, `the flags are 0x${flags.toString(16)}, not 0x800`);
    if (zip.readUInt16LE(rec + 4) !== VERSION) bad(mine, name, "the version made by is not 20");
    if (zip.readUInt16LE(rec + 6) !== VERSION) bad(mine, name, "the version needed is not 20");
    if (extraLen !== 0 || commentLen !== 0) bad(mine, name, "the central record has an extra field or a comment");
    if (zip.readUInt16LE(rec + 12) !== DOS_TIME) bad(mine, name, "the DOS time is not 00:00");
    if (zip.readUInt16LE(rec + 14) !== DOS_DATE) bad(mine, name, "the DOS date is not 1980-01-01");
    if (method !== 0 && method !== 8) bad(mine, name, `the method is ${method}`);
    if (method === 0 && csize !== usize) bad(mine, name, "a stored entry's sizes differ");
    if (method === 8 && csize >= usize) bad(mine, name, "the entry is deflated and not smaller than the file");

    // The local header must agree with the central record.
    if (localAt !== expectLocal)
      bad(mine, name, `the local header is at ${localAt}, not ${expectLocal} where the previous entry ends`);
    if (localAt + 30 > cdOffset || zip.readUInt32LE(localAt) !== SIG_LOCAL) {
      bad(mine, name, "the local header is missing or malformed");
      continue;
    }
    const lFlags = zip.readUInt16LE(localAt + 6);
    const lMethod = zip.readUInt16LE(localAt + 8);
    const lCrc = zip.readUInt32LE(localAt + 14);
    const lCsize = zip.readUInt32LE(localAt + 18);
    const lUsize = zip.readUInt32LE(localAt + 22);
    const lNameLen = zip.readUInt16LE(localAt + 26);
    const lExtraLen = zip.readUInt16LE(localAt + 28);
    const lName = zip.toString("utf8", localAt + 30, localAt + 30 + lNameLen);
    if (lName !== name) bad(mine, name, `the local header names ${lName}`);
    if (lFlags !== flags) bad(mine, name, "the local header's flags differ");
    if (lMethod !== method) bad(mine, name, "the local header's method differs");
    if (lCrc !== crc) bad(mine, name, "the local header's CRC-32 differs");
    if (lCsize !== csize || lUsize !== usize) bad(mine, name, "the local header's sizes differ");
    if (lExtraLen !== 0) bad(mine, name, "the local header has an extra field");
    const dataAt = localAt + 30 + lNameLen + lExtraLen;
    expectLocal = dataAt + csize;
    if (expectLocal > cdOffset) {
      bad(mine, name, "the data runs past the central directory");
      continue;
    }
    entries.push({ name, method, crc, csize, usize, dataAt, file: listed.file });
  }

  const problems = [...head, ...mine];
  if (problems.length === 0 && expectLocal !== cdOffset)
    bad(tail, "(archive)", "the entries do not fill the space before the central directory");
  return { problems: [...problems, ...tail], entries };
}

/**
 * Writes the entries (collectEntries' result, in the order of `files`) as the
 * help archive `out`, reads it back and checks it.
 *
 * @param {object} o
 * @param {string} o.out  the zip to write, an absolute path; written under a
 *                        temporary name and renamed, so a reader never sees half of it
 * @param {{name: string}[]} o.files  the tree's files, in name order
 * @param {object[]} o.entries  one per file, in the same order
 * @returns {Promise<{entries: number, rawBytes: number, zipBytes: number, storedBytes: number, zip: Buffer}>}
 * @throws {Error} as the header describes
 */
export async function writeArchive({ out, files, entries }) {
  checkZipLimits(files);
  const { zip, rawBytes, storedBytes } = assembleArchive(entries);

  await mkdir(path.dirname(out), { recursive: true });
  const temp = `${out}.${process.pid}.tmp`;
  try {
    await writeFile(temp, zip);
    await rename(temp, out);
  } catch (err) {
    await rm(temp, { force: true });
    throw err;
  }

  const back = await readFile(out);
  const problems = back.equals(zip) ? [] : ["(archive): the file read back is not what was written"];
  problems.push(...parseArchive(back, files).problems);
  const stats = { entries: files.length, rawBytes, zipBytes: back.length, storedBytes };
  if (problems.length > 0) {
    throw Object.assign(new Error(`the archive does not match the tree: ${problems.length} problem(s)`), {
      verifyFailed: true,
      problems,
      stats,
    });
  }
  return { ...stats, zip };
}

/**
 * Writes `src` as the help archive `out`, every unit on this thread, reads it
 * back and checks it. The build does the same on its lanes
 * (builder/help-archive-step.mjs).
 *
 * @param {object} o
 * @param {string} o.src  the tree to archive, an absolute path
 * @param {string} o.out  the zip to write, an absolute path
 * @param {(name: string) => boolean} [o.skip]  true for a file (relative, forward
 *                        slashes) the archive leaves out
 * @returns {Promise<{entries: number, rawBytes: number, zipBytes: number, storedBytes: number, ms: number, zip: Buffer}>}
 * @throws {Error} as the header describes: `verifyFailed` (with `problems` and
 *                 `stats`), `tooLarge`, or the system's error
 */
export async function writeHelpArchive({ src, out, skip }) {
  const started = Date.now();
  let files;
  try {
    files = listFiles(src, skip);
  } catch (err) {
    throw new Error(`cannot read ${src}: ${err.message}`, { cause: err });
  }
  if (files.length === 0) throw new Error(`${src} holds no files.`);
  checkZipLimits(files);
  const results = planUnits(files).map((unit) => deflateUnit(src, unit));
  const written = await writeArchive({ out, files, entries: collectEntries(files, results) });
  return { ...written, ms: Date.now() - started };
}

/**
 * Checks an archive written earlier against the tree as it is now: the same
 * file names, and the same size and CRC-32 in each file, except in the named
 * files, which may differ in content. It reads the archive and the tree and
 * writes nothing.
 *
 * @param {object} o
 * @param {string} o.src        the tree, an absolute path
 * @param {string} o.zip        the archive, an absolute path
 * @param {string[]} [o.mayDiffer]  names (relative, forward slashes) allowed to differ in content
 * @param {(name: string) => boolean} [o.skip]  the files the archive leaves out, as writeHelpArchive was given
 * @returns {Promise<string[]>} the differences found, each naming its entry; empty when none
 */
export async function checkHelpArchive({ src, zip, mayDiffer = [], skip }) {
  const files = listFiles(src, skip);
  const inTree = new Set(files.map((f) => f.name));
  const bytes = await readFile(zip);
  const names = archiveNames(bytes);
  if (names === null) return ["(archive): the end-of-central-directory record is not where it should be"];
  const inZip = new Set(names);
  const problems = [];
  for (const name of inTree) if (!inZip.has(name)) problems.push(`${name}: in the tree, not in the archive`);
  for (const name of inZip) if (!inTree.has(name)) problems.push(`${name}: in the archive, not in the tree`);
  if (problems.length > 0) return problems;

  const parsed = parseArchive(bytes, files);
  const differs = new Set(mayDiffer);
  // The reads overlap, which is file I/O on Node's thread pool; the CRC-32s are
  // taken here, on this thread, as each file arrives.
  const changed = new Set();
  const compared = parsed.entries.filter((e) => !differs.has(e.name));
  await readEach(
    compared.map((e) => e.file),
    READS_AT_ONCE,
    (source, i) => {
      const e = compared[i];
      if (source.length !== e.usize || crc32(source) !== e.crc) changed.add(e.name);
    },
  );
  for (const e of compared) {
    if (changed.has(e.name)) parsed.problems.push(`${e.name}: the content differs from the file in the tree`);
  }
  return parsed.problems;
}

const READS_AT_ONCE = 32;

/** Reads `files`, at most `limit` at a time, and calls `each(bytes, index)` for each as it arrives. */
async function readEach(files, limit, each) {
  let next = 0;
  const lane = async () => {
    while (next < files.length) {
      const i = next++;
      each(await readFile(files[i]), i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, files.length)) }, lane));
}

/** The entry names in an archive's central directory, or null when it has no end record. */
function archiveNames(zip) {
  if (zip.length < 22 || zip.readUInt32LE(zip.length - 22) !== SIG_END) return null;
  const endAt = zip.length - 22;
  const total = zip.readUInt16LE(endAt + 10);
  const names = [];
  let at = zip.readUInt32LE(endAt + 16);
  for (let i = 0; i < total && at + 46 <= endAt && zip.readUInt32LE(at) === SIG_CENTRAL; i++) {
    const nameLen = zip.readUInt16LE(at + 28);
    names.push(zip.toString("utf8", at + 46, at + 46 + nameLen));
    at += 46 + nameLen + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
  }
  return names;
}
