#!/usr/bin/env node
// Build one project twice and compare the two exes.
//
//     node scripts/probe_build_twice.mjs [options]
//
// The defect is the entry of BUGS-TO-REPORT.md whose reproducer is
// bugs/build-writes-compiler-addresses/: two builds of one unchanged project are
// not byte for byte equal, and what differs is more than the PE time stamp and
// checksum. Each exe holds, at the start of its .data section, a block of
// deflate-compressed data: a u32 compressed size, a u32 inflated size of 4,096
// and a raw deflate stream. Inflated, the blocks of two builds differ in two
// values that have the form of heap addresses: 4 bytes each in a win32 exe, the
// low 6 bytes of a 64-bit value in a win64 exe. In a win64 exe the padding after
// the block also holds two stale bytes. In a win32 exe the two compressed
// lengths sometimes fall in different 4-byte steps, which moves everything after
// the block by 4 and changes about 44 bytes of .text.
//
// Each build is made in an IDE of its own (an IDE reused for a second project
// wedges), on one port, from a project staged again before each build into the
// same folders with the same build path, so that no path can be what differs. The
// exe is copied out as soon as the build is done. --vb6 does the same with VB6,
// for the reproducer's vb6/ project, whose exe has no such block, and prints every
// range of the two files that differs outside the time stamp and the checksum.
//
// Exit codes: see USAGE.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import {
  choiceOption,
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  withUsageError,
} from "../lib/cli.mjs";
import { compileProject } from "./lib/tb-build.mjs";
import { TARGETS } from "./lib/tb-ide.mjs";
import { buildNumber, findIde } from "./lib/tb-install.mjs";
import { claimPorts } from "./lib/tb-ports.mjs";
import { laneProjectId, stageProject } from "./lib/tb-project.mjs";
import { finishTidy, startTidy } from "./lib/tb-registry.mjs";
import {
  NO_VB6,
  REPRO_PROJECT,
  decodeAnsi,
  encodeAnsi,
  findVb6,
  hasVisibleComponent,
  make,
  reproFiles,
  reproProblem,
  unattended,
} from "./lib/vb6.mjs";

let tidy = null;
let work = null;
function cleanUp() {
  finishTidy(tidy);
  tidy = null;
  if (work) {
    try {
      rmSync(work, { recursive: true, force: true });
    } catch {
      // a file still held open; the next run on this port empties the folder
    }
    work = null;
  }
}
exitOnCrash(cleanUp);

const DEFAULT_PORT = 9800;

const USAGE = `usage: node scripts/probe_build_twice.mjs [--arch win32|win64] [--ide <twinBASIC.exe>] [--port N] [--timeout S] [--keep-files <dir>] [--vb6] [-h, --help]

Builds the project of bugs/build-writes-compiler-addresses/ twice, each time in
an IDE of its own, and compares the two exes. Outside the PE time stamp and the
checksum, two builds of one unchanged project should be byte for byte equal. They
are not: each exe holds, at the start of .data, a deflate-compressed block (a u32
compressed size, a u32 inflated size and a raw stream) whose decompressed bytes
differ in two values that have the form of heap addresses.

The probe prints the two sizes; the bytes that differ outside the time stamp, the
checksum and the block, by section; the block, found by its header, with the number
of its decompressed bytes that differ and each differing value; and last a summary
line, \`the decompressed startup blocks of two builds differ in <n> bytes, in <k>
ranges (<arch>)\`, or \`the decompressed startup blocks of two builds are equal
(<arch>)\`. A stream that does not inflate to exactly the size its header states is
reported, and ends the probe.

  --arch <a>         win32 or win64, the target to build for (default win32)
  --ide <path>       twinBASIC.exe (default: $TB_IDE, else the newest
                     twinBASIC_IDE_BETA_* on the Desktop)
  --port <n>         DevTools port of the IDE (default ${DEFAULT_PORT}); the first free port from
                     it is used
  --timeout <secs>   give up waiting for a compile, and again for a build (default 180)
  --keep-files <dir> copy the two exes into <dir>, made if it is missing, as
                     <arch>-1.exe and <arch>-2.exe (vb6-1.exe and vb6-2.exe with --vb6)
  --vb6              build the vb6/ project of the reproducer twice with VB6
                     (VB6.EXE: $VB6_EXE, else the standard install folders) in place
                     of the twinBASIC project, and print every range that differs
                     outside the time stamp and the checksum, by section; a VB6 exe
                     has no such block. --arch, --ide and --port do not apply
  -h, --help         print this text and exit

Exit codes:
  0  the compared bytes are equal: the two decompressed blocks, or with --vb6 the
     two files outside the time stamp and the checksum
  1  they differ: the defect is there
  2  the probe could not do its job: a refused command line, no IDE or no VB6, no
     free port, an IDE that did not start, a project that did not compile or
     build, a block that does not inflate to its stated size or is not there, or
     a crash`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

const { values } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        arch: { type: "string" },
        ide: { type: "string" },
        port: { type: "string" },
        timeout: { type: "string" },
        "keep-files": { type: "string" },
        vb6: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

const { arch, port, timeout } = withUsageError(() => {
  for (const name of ["arch", "ide", "port"]) refuseTogether(values, ["vb6", name]);
  return {
    arch: choiceOption(values.arch ?? TARGETS[0], { option: "--arch", choices: TARGETS }),
    port: numberOption(values.port ?? String(DEFAULT_PORT), { option: "--port", integer: true, min: 1, max: 65535 }),
    timeout: numberOption(values.timeout ?? "180", { option: "--timeout", above: 0 }) * 1000,
  };
}, usageError);
const keepFiles = values.keepFiles ? path.resolve(values.keepFiles) : null;

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPRODUCER = path.join(REPO, "bugs", "build-writes-compiler-addresses");
const SOURCE = path.join(REPRODUCER, "src");
const VB6_SOURCE = path.join(REPRODUCER, "vb6");

/** A fault of the probe's own job, not a finding: it ends the run with exit 2. */
class Fail extends Error {}

// ----------------------------------------------------------------- the files

const thousands = (n) => n.toLocaleString("en-US");
const plural = (n, word) => `${thousands(n)} ${word}${n === 1 ? "" : "s"}`;
const hexOf = (n) => n.toString(16);

/** The bytes as hex, in file order, cut after `max` bytes. */
function bytesHex(buf, start, length, max = 16) {
  const shown = buf.subarray(start, start + Math.min(length, max)).toString("hex");
  return length > max ? `${shown}..(+${length - max})` : shown;
}

/**
 * The ranges [start, end) of bytes in which `a` and `b` differ, over their common
 * length. Two differences with at most `gap` equal bytes between them are one range.
 */
function diffRanges(a, b, gap = 3) {
  const common = Math.min(a.length, b.length);
  const ranges = [];
  let start = -1;
  let last = -1;
  for (let i = 0; i < common; i++) {
    if (a[i] === b[i]) continue;
    if (start >= 0 && i - last - 1 > gap) {
      ranges.push([start, last + 1]);
      start = -1;
    }
    if (start < 0) start = i;
    last = i;
  }
  if (start >= 0) ranges.push([start, last + 1]);
  return ranges;
}

/**
 * The parts of a PE file the comparison needs: where the COFF time stamp and the
 * optional header's checksum are, and the sections' names and raw data.
 *
 * @throws {Fail} when the file is not a PE file
 */
function parsePe(buf, which) {
  const bad = (why) => new Fail(`${which} is not a PE file: ${why}`);
  if (buf.length < 0x40 || buf.readUInt16LE(0) !== 0x5a4d) throw bad("no MZ header");
  const pe = buf.readUInt32LE(0x3c);
  if (pe + 24 > buf.length || buf.readUInt32LE(pe) !== 0x4550) throw bad("no PE signature");
  const file = pe + 4;
  const count = buf.readUInt16LE(file + 2);
  const optional = file + 20;
  const table = optional + buf.readUInt16LE(file + 16);
  if (!count || table + count * 40 > buf.length) throw bad("the section table is missing or cut short");
  const sections = [];
  for (let i = 0; i < count; i++) {
    const at = table + i * 40;
    const raw = buf.readUInt32LE(at + 20);
    sections.push({
      name: buf.toString("latin1", at, at + 8).split("\0")[0],
      raw,
      rawSize: Math.max(0, Math.min(buf.readUInt32LE(at + 16), buf.length - raw)),
    });
  }
  return { plus: buf.readUInt16LE(optional) === 0x20b, stamp: file + 4, checksum: optional + 64, sections };
}

// The block is at a 4-byte step of .data. A header is taken for one only when its
// inflated size is a multiple of 1,024 and no more than 1 MB, and the stream inflates.
const MAX_INFLATED = 1 << 20;

/**
 * The startup block of an exe: a u32 compressed size, a u32 inflated size and a raw
 * deflate stream, padded to the pointer size of the target. It is found by its
 * header, at the first 4-byte step of .data where one inflates.
 *
 * @throws {Fail} when there is none, or a stream does not inflate to exactly the size its header states
 */
function findBlock(buf, pe, which) {
  const ptr = pe.plus ? 8 : 4;
  const data = pe.sections.find((s) => s.name === ".data");
  if (!data) throw new Fail(`${which}: the exe has no .data section`);
  const end = data.raw + data.rawSize;
  for (let at = data.raw; at + 12 <= end; at += 4) {
    const stream = buf.readUInt32LE(at);
    const size = buf.readUInt32LE(at + 4);
    if (stream < 16 || size < 1024 || size > MAX_INFLATED || size % 1024 || stream >= size || at + 8 + stream > end) {
      continue;
    }
    let inflated;
    try {
      inflated = zlib.inflateRawSync(buf.subarray(at + 8, at + 8 + stream));
    } catch {
      continue;
    }
    const rel = at - data.raw;
    if (inflated.length !== size) {
      throw new Fail(
        `${which}: the header at .data+0x${hexOf(rel)} says the stream of ${thousands(stream)} bytes inflates to ` +
          `${thousands(size)} bytes, and it inflates to ${thousands(inflated.length)}`,
      );
    }
    const used = 8 + stream;
    return { section: ".data", rel, stream, size, used, padded: Math.ceil(used / ptr) * ptr, data: inflated, at };
  }
  throw new Fail(
    `${which}: no startup block in .data: no u32 compressed size, u32 inflated size and deflate stream ` +
      "that inflates to its stated size",
  );
}

/**
 * Compares two exes outside the COFF time stamp, the optional header's checksum and,
 * when `blocks` is given, the startup block. The blocks are lined up on the ends of
 * their padding, so that what follows a block is compared with what follows the other
 * even when the two are a step apart; the padding is compared on its own, aligned at
 * its end.
 *
 * @returns {{ranges: object[], bySection: Map<string, {bytes: number, ranges: number}>, notes: string[]}}
 */
function compareOutside(A, B, pa, pb, blocks) {
  const masked = (buf, pe) => {
    const copy = Buffer.from(buf);
    copy.fill(0, pe.stamp, pe.stamp + 4);
    copy.fill(0, pe.checksum, pe.checksum + 4);
    return copy;
  };
  const a = masked(A, pa);
  const b = masked(B, pb);
  const notes = [];
  const segments = [];
  const firstRaw = (pe) => Math.min(...pe.sections.filter((s) => s.rawSize).map((s) => s.raw));
  segments.push({ section: "headers", aAt: 0, bAt: 0, aRel: 0, bRel: 0, length: Math.min(firstRaw(pa), firstRaw(pb)) });
  const seg = (sa, sb, aRel, bRel, length, note) =>
    segments.push({ section: sa.name, aAt: sa.raw + aRel, bAt: sb.raw + bRel, aRel, bRel, length, note });
  for (const sa of pa.sections) {
    const sb = pb.sections.find((s) => s.name === sa.name);
    if (!sb) {
      notes.push(`the section ${sa.name} is only in the first build`);
      continue;
    }
    if (sa.rawSize !== sb.rawSize) {
      notes.push(`${sa.name} holds ${thousands(sa.rawSize)} bytes in the first build and ${thousands(sb.rawSize)}`);
    }
    if (blocks && sa.name === blocks.a.section) {
      const [x, y] = [blocks.a, blocks.b];
      const endA = x.rel + x.padded;
      const endB = y.rel + y.padded;
      const pad = Math.min(x.padded - x.used, y.padded - y.used);
      seg(sa, sb, 0, 0, Math.min(x.rel, y.rel));
      seg(sa, sb, endA - pad, endB - pad, pad, "padding after the block");
      seg(sa, sb, endA, endB, Math.min(sa.rawSize - endA, sb.rawSize - endB));
    } else {
      seg(sa, sb, 0, 0, Math.min(sa.rawSize, sb.rawSize));
    }
  }
  for (const sb of pb.sections) {
    if (!pa.sections.some((s) => s.name === sb.name)) notes.push(`the section ${sb.name} is only in the second build`);
  }
  const ranges = [];
  const bySection = new Map();
  for (const g of segments) {
    if (g.length <= 0) continue;
    const one = a.subarray(g.aAt, g.aAt + g.length);
    const two = b.subarray(g.bAt, g.bAt + g.length);
    for (const [start, end] of diffRanges(one, two)) {
      const length = end - start;
      ranges.push({
        section: g.section,
        note: g.note,
        aRel: g.aRel + start,
        bRel: g.bRel + start,
        length,
        first: bytesHex(A, g.aAt + start, length),
        second: bytesHex(B, g.bAt + start, length),
      });
      const total = bySection.get(g.section) ?? { bytes: 0, ranges: 0 };
      total.bytes += length;
      total.ranges++;
      bySection.set(g.section, total);
    }
  }
  return { ranges, bySection, notes };
}

// ----------------------------------------------------------------- printing

const MAX_ROWS = 80;

function rangeLine(r) {
  const where = `${r.section}+0x${hexOf(r.aRel)}`.padEnd(16);
  const size = `${String(r.length).padStart(3)} byte${r.length === 1 ? " " : "s"}`;
  const moved = r.bRel === r.aRel ? "" : ` (second build: +0x${hexOf(r.bRel)})`;
  const note = r.note ? ` (${r.note})` : "";
  return `${where} ${size}  ${r.first} / ${r.second}${moved}${note}`;
}

/** Prints what differs outside the stamp, the checksum and any block; returns the byte and range counts. */
function printOutside({ ranges, bySection, notes }, outside) {
  for (const note of notes) console.log(`note: ${note}`);
  const bytes = [...bySection.values()].reduce((n, s) => n + s.bytes, 0);
  if (!ranges.length) {
    console.log(`outside ${outside}: no byte differs`);
    return { bytes, count: 0 };
  }
  const verb = bytes === 1 ? "differs" : "differ";
  console.log(`outside ${outside}: ${plural(bytes, "byte")} ${verb}, in ${plural(ranges.length, "range")}`);
  for (const [section, total] of bySection) {
    console.log(`  ${section}: ${plural(total.bytes, "byte")} in ${plural(total.ranges, "range")}`);
    for (const r of ranges.filter((x) => x.section === section).slice(0, MAX_ROWS)) console.log(`    ${rangeLine(r)}`);
    if (total.ranges > MAX_ROWS) console.log(`    ... ${total.ranges - MAX_ROWS} more`);
  }
  return { bytes, count: ranges.length };
}

/** The bytes [start, end) of `buf` read as a little-endian integer, in hex, padded to `width` digits. */
function littleEndian(buf, start, end, width) {
  const hex = Buffer.from(buf.subarray(start, end)).reverse().toString("hex");
  return `0x${BigInt(`0x${hex}`).toString(16).padStart(width, "0")}`;
}

/** The two stamps and checksums, which the linker sets and the comparison leaves out. */
function printHeaderFields(A, B, pa, pb) {
  const word = (buf, at) => buf.readUInt32LE(at);
  const differ = (at1, at2) => [0, 1, 2, 3].filter((i) => A[at1 + i] !== B[at2 + i]).length;
  const s = [word(A, pa.stamp), word(B, pb.stamp)];
  const c = [word(A, pa.checksum), word(B, pb.checksum)];
  const when = (t) => new Date(t * 1000).toISOString().replace(".000Z", "Z");
  console.log(
    `PE time stamp: 0x${hexOf(s[0])} (${when(s[0])}) and 0x${hexOf(s[1])} (${when(s[1])}), ` +
      `${differ(pa.stamp, pb.stamp)} of 4 bytes differ`,
  );
  console.log(
    `PE checksum: 0x${hexOf(c[0])} and 0x${hexOf(c[1])}, ${differ(pa.checksum, pb.checksum)} of 4 bytes differ`,
  );
}

/**
 * Compares the two files and prints what differs. Returns the exit code: 1 when the
 * decompressed blocks (with `vb6`, the files outside the stamp and the checksum) differ.
 */
function compareBuilds([fileA, fileB], { vb6 }) {
  const A = readFileSync(fileA);
  const B = readFileSync(fileB);
  const pa = parsePe(A, "the first build");
  const pb = parsePe(B, "the second build");
  const ptr = pa.plus ? 8 : 4;
  const layout = (pe) => pe.sections.map((s) => `${s.name}:${s.rawSize}`).join(" ");
  console.log(
    `sizes: ${thousands(A.length)} and ${thousands(B.length)} bytes (${A.length === B.length ? "equal" : "different"}); ` +
      `sections ${layout(pa) === layout(pb) ? "the same in both" : `differ: ${layout(pa)} | ${layout(pb)}`}`,
  );
  printHeaderFields(A, B, pa, pb);

  if (vb6) {
    const outside = printOutside(compareOutside(A, B, pa, pb, null), "the time stamp and the checksum");
    console.log("a VB6 exe has no deflate-compressed startup block");
    console.log(
      outside.bytes
        ? `the two VB6 builds differ in ${plural(outside.bytes, "byte")} outside the time stamp and the checksum, in ${plural(outside.count, "range")}`
        : "the two VB6 builds are equal outside the time stamp and the checksum",
    );
    return outside.bytes ? 1 : 0;
  }

  const ba = findBlock(A, pa, "the first build");
  const bb = findBlock(B, pb, "the second build");
  const where = (x) => `${x.section}+0x${hexOf(x.rel)}`;
  console.log(
    `startup block: ${where(ba)} in the first build, ${where(bb)} in the second; stream ${thousands(ba.stream)} and ` +
      `${thousands(bb.stream)} bytes, padded to ${thousands(ba.padded)} and ${thousands(bb.padded)}; ` +
      `inflates to ${thousands(ba.size)} and ${thousands(bb.size)} bytes`,
  );
  const common = Math.min(ba.stream, bb.stream);
  const streams = [A.subarray(ba.at + 8, ba.at + 8 + common), B.subarray(bb.at + 8, bb.at + 8 + common)];
  console.log(
    `compressed stream: ${thousands(streams[0].reduce((n, v, i) => n + (v === streams[1][i] ? 0 : 1), 0))} of ` +
      `${thousands(common)} common bytes differ`,
  );
  printOutside(compareOutside(A, B, pa, pb, { a: ba, b: bb }), "the time stamp, the checksum and the block");

  const sizeGap = Math.abs(ba.size - bb.size);
  const ranges = diffRanges(ba.data, bb.data);
  const bytes = ranges.reduce((n, [s, e]) => n + (e - s), 0) + sizeGap;
  console.log(
    `decompressed block: ${thousands(bytes)} of ${thousands(Math.max(ba.size, bb.size))} bytes differ, ` +
      `in ${plural(ranges.length, "range")}`,
  );
  if (sizeGap) console.log(`  the two blocks are ${thousands(sizeGap)} bytes apart in size`);
  for (const [start, end] of ranges) {
    // The values sit at 4-byte steps in both targets, so a range that fits in one pointer-sized
    // value from the step at or before it is printed as that whole value: a byte that is the same
    // in both builds, at either end, still belongs to the number.
    const from = start - (start % 4);
    const whole = end <= from + ptr && from + ptr <= Math.min(ba.size, bb.size);
    const [first, last] = whole ? [from, from + ptr] : [start, end];
    const one = littleEndian(ba.data, first, last, whole ? ptr * 2 : 0);
    const two = littleEndian(bb.data, first, last, whole ? ptr * 2 : 0);
    console.log(
      `  +0x${hexOf(first).padStart(3, "0")} ${String(end - start).padStart(2)} bytes  ${one} / ${two}` +
        `  (${bytesHex(ba.data, start, end - start)} / ${bytesHex(bb.data, start, end - start)})`,
    );
  }
  console.log(
    bytes
      ? `the decompressed startup blocks of two builds differ in ${plural(bytes, "byte")}, in ${plural(ranges.length, "range")} (${arch})`
      : `the decompressed startup blocks of two builds are equal (${arch})`,
  );
  return bytes ? 1 : 0;
}

// ----------------------------------------------------------------- the builds

async function buildTwinBasic() {
  const ide = findIde(values.ide);
  if (!ide || !existsSync(ide)) {
    throw new Fail(
      (ide ? `no twinBASIC IDE at ${ide}: ` : "no twinBASIC IDE found: ") +
        "pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
    );
  }
  if (!existsSync(path.join(SOURCE, "Settings"))) throw new Fail(`the reproducer's source is missing: ${SOURCE}`);
  let lanePort;
  try {
    [lanePort] = await claimPorts(1, { from: port });
  } catch (e) {
    throw new Fail(e.message);
  }
  work = path.join(tmpdir(), "tbprobe-build-twice", String(lanePort));
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  tidy = startTidy({ prefixes: [work] });
  const copies = keepFiles ?? path.join(work, "copies");
  mkdirSync(copies, { recursive: true });
  console.log(
    `BETA ${buildNumber(ide) ?? "?"}, ${arch}: two builds of bugs/build-writes-compiler-addresses, ` +
      `each in an IDE of its own on port ${lanePort}`,
  );

  const files = [];
  for (let n = 1; n <= 2; n++) {
    const project = path.join(work, "probe.twinproj");
    const out = path.join(work, "out");
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    stageProject({
      src: SOURCE,
      stage: path.join(work, "stage"),
      project,
      settings: {
        "project.buildPath": path.join(out, "${ProjectName}_${Architecture}.${FileExtension}"),
        "project.id": laneProjectId(6, lanePort),
      },
    });
    const r = await compileProject({
      project,
      ide,
      port: lanePort,
      arch,
      timeout,
      buildTimeout: timeout,
      build: true,
    });
    if (r.code !== 0 || !r.built || !existsSync(r.built)) {
      const why = [r.message, ...r.rows, ...r.buildLog.slice(-8)].filter(Boolean).join("\n");
      throw new Fail(`build ${n} made no exe (exit ${r.code}):\n${why}`);
    }
    const copy = path.join(copies, `${arch}-${n}${path.extname(r.built)}`);
    copyFileSync(r.built, copy);
    files.push(copy);
    console.log(`build ${n}: ${thousands(readFileSync(copy).length)} bytes`);
  }
  return compareBuilds(files, { vb6: false });
}

async function buildVb6() {
  const exe = findVb6(undefined);
  if (!exe) throw new Fail(NO_VB6);
  const folder = `${path.relative(REPO, VB6_SOURCE).split(path.sep).join("/")}/`;
  if (!existsSync(VB6_SOURCE)) throw new Fail(`the reproducer has no ${folder} folder`);
  const why = reproProblem(VB6_SOURCE);
  if (why) throw new Fail(`${folder} ${why}`);
  work = mkdtempSync(path.join(tmpdir(), "tbprobe-build-twice-vb6-"));
  const copies = keepFiles ?? path.join(work, "copies");
  mkdirSync(copies, { recursive: true });
  console.log(`VB6: two builds of ${folder}, both in one folder`);

  // Both builds are made in the same folder, as the twinBASIC ones are: VB6 stores the
  // project's folder in the exe, so two folders would be a difference of their own.
  const dir = path.join(work, "build");
  const files = [];
  for (let n = 1; n <= 2; n++) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const name of reproFiles(VB6_SOURCE).sources) copyFileSync(path.join(VB6_SOURCE, name), path.join(dir, name));
    // As `bug_repro vb6` builds it: with Unattended Execution, unless the project has a form.
    const vbp = path.join(dir, `${REPRO_PROJECT}.vbp`);
    const text = decodeAnsi(readFileSync(vbp));
    writeFileSync(vbp, encodeAnsi(unattended(text, !hasVisibleComponent(text))));
    const made = await make(exe, dir, { project: REPRO_PROJECT });
    if (made.timedOut || made.error) {
      throw new Fail(`VB6 did not finish building${made.error ? `: ${made.error}` : " in time"}\n${made.log}`);
    }
    if (!made.built) throw new Fail(`VB6 did not build the project:\n${made.log.trim()}`);
    const copy = path.join(copies, `vb6-${n}.exe`);
    copyFileSync(path.join(dir, `${REPRO_PROJECT}.exe`), copy);
    files.push(copy);
    console.log(`build ${n}: ${thousands(readFileSync(copy).length)} bytes`);
  }
  return compareBuilds(files, { vb6: true });
}

// ----------------------------------------------------------------- the run

let code;
try {
  code = values.vb6 ? await buildVb6() : await buildTwinBasic();
} catch (e) {
  if (!(e instanceof Fail)) throw e;
  cleanUp();
  die(2, e.message);
}
cleanUp();
process.exit(code);
