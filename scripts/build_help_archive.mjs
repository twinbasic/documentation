#!/usr/bin/env node
// Write the help add-in's documentation archive: the built offline tree as a zip.
//
//     node scripts/build_help_archive.mjs [--src <dir>] [--out <file>]
//
//       --src <dir>    the tree to archive (default docs/_site-offline)
//       --out <file>   the zip to write (default add-in/Resources/HELP/site.zip)
//
// The IDE help add-in serves the documentation offline from this zip, embedded in
// its DLL as the resource HELP/site.zip (a twinBASIC project embeds
// Resources/<TYPE>/<name> as a resource). The reader on the twinBASIC side does no
// inflating of its own, so the format is a contract, and this tool keeps to the
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
// Nothing here trusts what it wrote. After the rename, the file is read back: the
// end record, every central-directory entry and every local header are parsed and
// compared with each other and with the tree, and each deflated entry is inflated
// and compared, with its CRC-32, with the source file's bytes. That always runs.
//
// A stale tree is refused as book.bat refuses one, by running
// scripts/check_tree_fresh.mjs against it, so the archive is never a previous
// build's.
//
// Exit codes: 0 written and verified, 1 the verification found a difference,
// 2 the tool could not do its job (a refused command line, a stale or missing
// tree, a tree too large for a zip without zip64, or a crash).

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import { die, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";

exitOnCrash();

const DEFAULT_SRC = path.join(REPO_ROOT, "docs", "_site-offline");
const DEFAULT_OUT = path.join(REPO_ROOT, "add-in", "Resources", "HELP", "site.zip");

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

const USAGE = `usage: node scripts/build_help_archive.mjs [--src <dir>] [--out <file>] [-h, --help]

Writes the built offline tree as the zip the IDE help add-in embeds, then reads
the zip back and checks every entry against the tree.

  --src <dir>    the tree to archive (default docs/_site-offline)
  --out <file>   the zip to write (default add-in/Resources/HELP/site.zip)

Run build.bat first: a tree older than its sources is refused.

Exit codes:
  0  the archive was written and verified
  1  the verification found a difference
  2  the tool could not do its job: a refused command line, a stale or missing
     tree, a tree too large for a zip without zip64, or a crash`;

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      src: { type: "string", default: DEFAULT_SRC },
      out: { type: "string", default: DEFAULT_OUT },
      help: { type: "boolean", short: "h" },
    },
    stopAt: ["help"],
  }),
);
if (cli.stopped === "help") printHelpAndExit(USAGE);

const srcDir = path.resolve(cli.values.src);
const outFile = path.resolve(cli.values.out);
const display = (p) => (path.relative(REPO_ROOT, p) || ".").split(path.sep).join("/");

/** Runs the freshness gate book.bat runs, on the tree to archive. */
function requireFreshTree() {
  const gate = path.join(REPO_ROOT, "scripts", "check_tree_fresh.mjs");
  const result = spawnSync(process.execPath, [gate, "--tree", srcDir], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) die(2, `build_help_archive: ${display(srcDir)} is stale or missing; run build.bat first.`);
}

/** Every file under `dir`, as { name, file }, `name` relative with forward slashes, in code-unit order. */
function listFiles(dir) {
  const found = [];
  const walk = (d, prefix) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const file = path.join(d, e.name);
      const name = prefix + e.name;
      if (e.isDirectory()) walk(file, `${name}/`);
      else if (e.isFile()) found.push({ name, file });
    }
  };
  walk(dir, "");
  return found.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

const isStoredType = (name) => STORED_EXTENSIONS.has(path.extname(name).toLowerCase());

/** Builds the archive, and returns it with the counts the summary prints. */
function buildArchive(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  let rawBytes = 0;
  let storedBytes = 0;
  for (const { name, file } of files) {
    const nameBytes = Buffer.from(name, "utf8");
    if (nameBytes.length > 0xffff) die(2, `build_help_archive: the name is too long for a zip entry: ${name}`);
    const data = readFileSync(file);
    const crc = zlib.crc32(data);
    let method = 0;
    let body = data;
    if (!isStoredType(name) && data.length > 0) {
      const deflated = zlib.deflateRawSync(data, { level: 9 });
      if (deflated.length < data.length) {
        method = 8;
        body = deflated;
      }
    }
    if (method === 0) storedBytes += body.length;
    rawBytes += data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
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
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    // extra length, comment length, disk number, internal and external attributes: 0
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);

    parts.push(local, nameBytes, body);
    offset += local.length + nameBytes.length + body.length;
    if (offset > MAX_BYTES) die(2, `build_help_archive: the archive passes 4 GB, which needs zip64.`);
  }
  const centralBytes = Buffer.concat(central);
  if (offset + centralBytes.length + 22 > MAX_BYTES)
    die(2, `build_help_archive: the archive passes 4 GB, which needs zip64.`);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return { zip: Buffer.concat([...parts, centralBytes, end]), rawBytes, storedBytes };
}

/** Reads the file back and returns the differences found, each naming its entry. */
function verifyArchive(zipFile, files) {
  const problems = [];
  const zip = readFileSync(zipFile);
  const bad = (name, text) => problems.push(`${name}: ${text}`);

  if (zip.length < 22 || zip.readUInt32LE(zip.length - 22) !== SIG_END) {
    return ["(archive): the end-of-central-directory record is not where it should be"];
  }
  const endAt = zip.length - 22;
  const total = zip.readUInt16LE(endAt + 10);
  const cdSize = zip.readUInt32LE(endAt + 12);
  const cdOffset = zip.readUInt32LE(endAt + 16);
  if (zip.readUInt16LE(endAt + 8) !== total)
    bad("(archive)", "the end record counts entries on this disk and in all differently");
  if (zip.readUInt16LE(endAt + 20) !== 0) bad("(archive)", "the archive has a comment");
  if (total !== files.length) bad("(archive)", `the archive holds ${total} entries, the tree ${files.length} files`);
  if (cdOffset + cdSize !== endAt) bad("(archive)", "the central directory does not end at the end record");

  let at = cdOffset;
  let expectLocal = 0;
  let previous = null;
  for (let i = 0; i < total; i++) {
    if (at + 46 > endAt || zip.readUInt32LE(at) !== SIG_CENTRAL) {
      bad(`(entry ${i})`, "the central-directory record is missing or malformed");
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
      bad(name, `the entry is not the tree's file number ${i + 1}${listed ? ` (${listed.name})` : ""}`);
      continue;
    }
    if (previous !== null && !(previous < name)) bad(name, "the entries are not in name order");
    previous = name;
    if (name.endsWith("/")) bad(name, "the entry is a directory");
    if (flags !== FLAG_UTF8) bad(name, `the flags are 0x${flags.toString(16)}, not 0x800`);
    if (zip.readUInt16LE(rec + 4) !== VERSION) bad(name, "the version made by is not 20");
    if (zip.readUInt16LE(rec + 6) !== VERSION) bad(name, "the version needed is not 20");
    if (extraLen !== 0 || commentLen !== 0) bad(name, "the central record has an extra field or a comment");
    if (zip.readUInt16LE(rec + 12) !== DOS_TIME) bad(name, "the DOS time is not 00:00");
    if (zip.readUInt16LE(rec + 14) !== DOS_DATE) bad(name, "the DOS date is not 1980-01-01");
    if (method !== 0 && method !== 8) bad(name, `the method is ${method}`);
    if (method === 0 && csize !== usize) bad(name, "a stored entry's sizes differ");

    // The local header must agree with the central record.
    if (localAt !== expectLocal)
      bad(name, `the local header is at ${localAt}, not ${expectLocal} where the previous entry ends`);
    if (localAt + 30 > cdOffset || zip.readUInt32LE(localAt) !== SIG_LOCAL) {
      bad(name, "the local header is missing or malformed");
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
    if (lName !== name) bad(name, `the local header names ${lName}`);
    if (lFlags !== flags) bad(name, "the local header's flags differ");
    if (lMethod !== method) bad(name, "the local header's method differs");
    if (lCrc !== crc) bad(name, "the local header's CRC-32 differs");
    if (lCsize !== csize || lUsize !== usize) bad(name, "the local header's sizes differ");
    if (lExtraLen !== 0) bad(name, "the local header has an extra field");
    const dataAt = localAt + 30 + lNameLen + lExtraLen;
    expectLocal = dataAt + csize;
    if (expectLocal > cdOffset) {
      bad(name, "the data runs past the central directory");
      continue;
    }

    // And with the file in the tree.
    const source = readFileSync(listed.file);
    const stored = zip.subarray(dataAt, dataAt + csize);
    let content = null;
    if (method === 0) content = stored;
    else if (method === 8) {
      try {
        content = zlib.inflateRawSync(stored);
      } catch (err) {
        bad(name, `the data does not inflate: ${err.message}`);
        continue;
      }
      if (csize >= source.length) bad(name, "the entry is deflated and not smaller than the file");
    }
    if (content === null) continue;
    if (content.length !== usize) bad(name, `the data is ${content.length} bytes, the record says ${usize}`);
    if (!content.equals(source)) bad(name, "the content differs from the file in the tree");
    if (zlib.crc32(source) !== crc) bad(name, "the CRC-32 differs from the file's");
    if (zlib.crc32(content) !== crc) bad(name, "the CRC-32 differs from the data's");
  }
  if (problems.length === 0 && expectLocal !== cdOffset)
    bad("(archive)", "the entries do not fill the space before the central directory");
  return problems;
}

const started = Date.now();
requireFreshTree();

let files;
try {
  files = listFiles(srcDir);
} catch (err) {
  die(2, `build_help_archive: cannot read ${display(srcDir)}: ${err.message}`);
}
if (files.length === 0) die(2, `build_help_archive: ${display(srcDir)} holds no files.`);
if (files.length > MAX_ENTRIES) {
  die(2, `build_help_archive: ${files.length} files is more than a zip without zip64 holds (${MAX_ENTRIES}).`);
}

const { zip, rawBytes, storedBytes } = buildArchive(files);

mkdirSync(path.dirname(outFile), { recursive: true });
const temp = `${outFile}.${process.pid}.tmp`;
try {
  writeFileSync(temp, zip);
  renameSync(temp, outFile);
} catch (err) {
  rmSync(temp, { force: true });
  throw err;
}

const problems = verifyArchive(outFile, files);
const mb = (n) => (n / 1048576).toFixed(1);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `build_help_archive: ${files.length} entries, ${mb(rawBytes)} MB raw, ${mb(statSync(outFile).size)} MB zip (${mb(storedBytes)} MB stored), ${seconds} s -> ${display(outFile)}`,
);
if (problems.length > 0) {
  console.error(
    `build_help_archive: the archive does not match the tree: ${problems.length} problem${problems.length === 1 ? "" : "s"}`,
  );
  for (const p of problems.slice(0, 50)) console.error(`  ${p}`);
  if (problems.length > 50) console.error(`  ... and ${problems.length - 50} more`);
  process.exit(1);
}
console.log("build_help_archive: verified.");
