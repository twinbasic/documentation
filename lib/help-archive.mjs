// The help add-in's documentation archive: the built offline tree as a zip.
//
//     const stats = await writeHelpArchive({ src, out });
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
// scripts/lib/zip.mjs deflates everything and is shared with other tools, so this
// writes its own.
//
// The files are deflated, and later inflated for the check, a few at a time on
// Node's thread pool. The bytes written do not depend on that: the entries are
// assembled in name order, each from its own file.
//
// Nothing here trusts what it wrote. After the rename, the file is read back: the
// end record, every central-directory entry and every local header are parsed and
// compared with each other and with the tree, and each entry is inflated, when it
// is deflated, and compared, with its CRC-32, with the source file's bytes. That
// always runs.
//
// The module has no side effects at import and never exits the process. A problem
// is an Error thrown by writeHelpArchive:
//
//   - verifyFailed: the file was written and the read-back found differences;
//     `problems` lists them, each naming its entry, and `stats` is what the
//     summary of a successful run would hold;
//   - tooLarge: the tree needs zip64 (more than 65,535 files, a name over 65,535
//     bytes, or 4 GB);
//   - anything else (an unreadable or empty tree, a write that failed) carries
//     the system's own message.

import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";

const deflateRaw = promisify(zlib.deflateRaw);
const inflateRaw = promisify(zlib.inflateRaw);

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

/** Runs `task(item, index)` over `items`, at most `limit` at a time, and returns the results in order. */
async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
  return results;
}

/** Every file under `dir`, as { name, file }, `name` relative with forward slashes, in code-unit order. */
async function listFiles(dir) {
  const found = [];
  const walk = async (d, prefix) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const file = path.join(d, e.name);
      const name = prefix + e.name;
      if (e.isDirectory()) await walk(file, `${name}/`);
      else if (e.isFile()) found.push({ name, file });
    }
  };
  await walk(dir, "");
  return found.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

const isStoredType = (name) => STORED_EXTENSIONS.has(path.extname(name).toLowerCase());

/** Reads and, where it pays, deflates one file: what its entry needs apart from the headers. */
async function prepareEntry({ name, file }) {
  const data = await readFile(file);
  const crc = zlib.crc32(data);
  let method = 0;
  let body = data;
  if (!isStoredType(name) && data.length > 0) {
    const deflated = await deflateRaw(data, { level: 9 });
    if (deflated.length < data.length) {
      method = 8;
      body = deflated;
    }
  }
  return { crc, method, body, size: data.length };
}

/** Builds the archive from the prepared entries, and returns it with the counts the summary reports. */
function assembleArchive(files, prepared) {
  const parts = [];
  const central = [];
  let offset = 0;
  let rawBytes = 0;
  let storedBytes = 0;
  files.forEach(({ name }, i) => {
    const { crc, method, body, size } = prepared[i];
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
  });
  const centralBytes = Buffer.concat(central);
  if (offset + centralBytes.length + 22 > MAX_BYTES) throw tooLarge("the archive passes 4 GB, which needs zip64.");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return { zip: Buffer.concat([...parts, centralBytes, end]), rawBytes, storedBytes };
}

/**
 * Reads the file back and returns the differences found, each naming its entry,
 * and the size of the file.
 */
async function verifyArchive(zipFile, files, limit) {
  const zip = await readFile(zipFile);
  const head = [];
  const tail = [];
  const bad = (list, name, text) => list.push(`${name}: ${text}`);

  if (zip.length < 22 || zip.readUInt32LE(zip.length - 22) !== SIG_END) {
    return {
      problems: ["(archive): the end-of-central-directory record is not where it should be"],
      zipBytes: zip.length,
    };
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

  // One list of problems per entry, kept in entry order; the content checks of the
  // entries run afterwards, in parallel, and fill their own entry's list.
  const perEntry = [];
  const contentChecks = [];
  let at = cdOffset;
  let expectLocal = 0;
  let previous = null;
  for (let i = 0; i < total; i++) {
    const mine = [];
    perEntry.push(mine);
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

    // And with the file in the tree; this part reads and inflates, so it is deferred.
    const stored = zip.subarray(dataAt, dataAt + csize);
    contentChecks.push(async () => {
      const source = await readFile(listed.file);
      let content = null;
      if (method === 0) content = stored;
      else if (method === 8) {
        try {
          content = await inflateRaw(stored);
        } catch (err) {
          bad(mine, name, `the data does not inflate: ${err.message}`);
          return;
        }
        if (csize >= source.length) bad(mine, name, "the entry is deflated and not smaller than the file");
      }
      if (content === null) return;
      if (content.length !== usize) bad(mine, name, `the data is ${content.length} bytes, the record says ${usize}`);
      if (!content.equals(source)) bad(mine, name, "the content differs from the file in the tree");
      if (zlib.crc32(source) !== crc) bad(mine, name, "the CRC-32 differs from the file's");
      if (zlib.crc32(content) !== crc) bad(mine, name, "the CRC-32 differs from the data's");
    });
  }
  await mapLimit(contentChecks, limit, (check) => check());

  const problems = [...head, ...perEntry.flat()];
  if (problems.length === 0 && expectLocal !== cdOffset)
    bad(tail, "(archive)", "the entries do not fill the space before the central directory");
  return { problems: [...problems, ...tail], zipBytes: zip.length };
}

/**
 * Writes `src` as the help archive `out`, reads it back and checks it.
 *
 * @param {object} o
 * @param {string} o.src  the tree to archive, an absolute path
 * @param {string} o.out  the zip to write, an absolute path; written under a
 *                        temporary name and renamed, so a reader never sees half of it
 * @returns {Promise<{entries: number, rawBytes: number, zipBytes: number, storedBytes: number, ms: number}>}
 * @throws {Error} as the header describes: `verifyFailed` (with `problems` and
 *                 `stats`), `tooLarge`, or the system's error
 */
export async function writeHelpArchive({ src, out }) {
  const started = Date.now();
  const limit = os.availableParallelism();

  let files;
  try {
    files = await listFiles(src);
  } catch (err) {
    throw new Error(`cannot read ${src}: ${err.message}`, { cause: err });
  }
  if (files.length === 0) throw new Error(`${src} holds no files.`);
  if (files.length > MAX_ENTRIES) {
    throw tooLarge(`${files.length} files is more than a zip without zip64 holds (${MAX_ENTRIES}).`);
  }
  for (const { name } of files) {
    if (Buffer.byteLength(name, "utf8") > 0xffff) throw tooLarge(`the name is too long for a zip entry: ${name}`);
  }

  const prepared = await mapLimit(files, limit, prepareEntry);
  const { zip, rawBytes, storedBytes } = assembleArchive(files, prepared);

  await mkdir(path.dirname(out), { recursive: true });
  const temp = `${out}.${process.pid}.tmp`;
  try {
    await writeFile(temp, zip);
    await rename(temp, out);
  } catch (err) {
    await rm(temp, { force: true });
    throw err;
  }

  const { problems, zipBytes } = await verifyArchive(out, files, limit);
  const stats = { entries: files.length, rawBytes, zipBytes, storedBytes, ms: Date.now() - started };
  if (problems.length > 0) {
    throw Object.assign(new Error(`the archive does not match the tree: ${problems.length} problem(s)`), {
      verifyFailed: true,
      problems,
      stats,
    });
  }
  return stats;
}
