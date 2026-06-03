#!/usr/bin/env node
//
// Copyright (c) 2026 TWINBASIC LTD
// SPDX-License-Identifier: MIT
//
// impexp.mjs -- standalone twinpack/twinproj import/export tool.
// No external dependencies; requires Node.js 18+.
//
// Usage:
//   node impexp.mjs import <file.twinproj|.twinpack> [output_dir]
//   node impexp.mjs export <input_dir> <output.twinproj|.twinpack>
//   node impexp.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const MAGIC = 0xEA0BA51C;
const FORMAT_VERSION = 1;

const FLAGS = {
  None: 0x00000000,
  Hidden: 0x00000001,
  SuperHidden: 0x00000002,
  Virtual: 0x00000004,
};

const CATEGORY = {
  Default: 0x00,
  References: 0x01,  // always virtual; never present in serialized files
  Resources: 0x02,
  Sources: 0x03,
  Settings: 0x04,
  ImportedTypeLibraries: 0x05,
  Miscellaneous: 0x06,
  Packages: 0x07,
};

// Well-known entry names that get a non-default category on export.
// References is intentionally excluded -- it is materialised virtually by
// the IDE, never serialized, and tagging an on-disk folder with category
// 0x01 would confuse the IDE on import.
const CATEGORY_BY_NAME = {
  Resources: CATEGORY.Resources,
  Sources: CATEGORY.Sources,
  Settings: CATEGORY.Settings,
  ImportedTypeLibraries: CATEGORY.ImportedTypeLibraries,
  Miscellaneous: CATEGORY.Miscellaneous,
  Packages: CATEGORY.Packages,
};

// -------------------------- Parser (binary -> tree) --------------------------

function parse(buffer) {
  const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const decoder = new TextDecoder('utf-8');
  let pos = 0;
  let entryCount = 0;

  function readU64() { const v = view.getBigUint64(pos, true); pos += 8; return Number(v); }
  function readU32() { const v = view.getUint32(pos, true); pos += 4; return v; }
  function readI16() { const v = view.getInt16(pos, true); pos += 2; return v; }
  function readU8()  { const v = view.getUint8(pos); pos += 1; return v; }
  function readStr() {
    const len = readU32();
    if (len === 0) return '';
    const s = decoder.decode(buf.subarray(pos, pos + len));
    pos += len;
    return s;
  }
  function readBlob() {
    const len = readU32();
    const b = Buffer.from(buf.subarray(pos, pos + len));
    pos += len;
    return b;
  }

  const magic = readU32();
  if (magic !== MAGIC)
    throw new Error(
      `Bad magic: 0x${magic.toString(16).padStart(8, '0').toUpperCase()}, ` +
      `expected 0x${MAGIC.toString(16).padStart(8, '0').toUpperCase()}`);

  function readEntry() {
    // At the root this 2-byte field is the file format version; everywhere
    // else it is the entry kind (1 = file, 2 = directory).
    const kind = readI16();
    entryCount++;
    const isRoot = (entryCount === 1);
    if (isRoot && kind !== FORMAT_VERSION)
      throw new Error(
        `Unsupported file format version: ${kind}, expected ${FORMAT_VERSION}`);

    const name = readStr();
    const revision = readU64();
    const flags = readU32();
    const category = readU8();

    if (kind === 1 && !isRoot) {
      const content = readBlob();
      const revisionCount = readU32();
      const revisions = [];
      for (let i = 0; i < revisionCount; i++) revisions.push(readU32());
      return { kind: 'file', name, revision, flags, category, content, revisions };
    }

    const count = readU32();
    const children = [];
    for (let i = 0; i < count; i++) children.push(readEntry());
    return { kind: 'directory', name, revision, flags, category, children };
  }

  return readEntry();
}

// -------------------------- Serializer (tree -> binary) ----------------------

function serialize(root) {
  const chunks = [];
  const encoder = new TextEncoder();

  function writeU64(v) { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); chunks.push(b); }
  function writeU32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v); chunks.push(b); }
  function writeI16(v) { const b = Buffer.alloc(2); b.writeInt16LE(v); chunks.push(b); }
  function writeU8(v)  { chunks.push(Buffer.from([v])); }
  function writeStr(s) {
    const e = encoder.encode(s);
    writeU32(e.length);
    if (e.length) chunks.push(Buffer.from(e));
  }
  function writeBlob(data) {
    writeU32(data.length);
    if (data.length) chunks.push(Buffer.from(data));
  }

  writeU32(MAGIC);
  let isFirst = true;

  function writeEntry(entry) {
    const isRoot = isFirst;
    isFirst = false;

    if (entry.kind === 'file' && !isRoot) {
      writeI16(1);
      writeStr(entry.name);
      writeU64(entry.revision ?? 0x0002);
      writeU32(entry.flags ?? FLAGS.None);
      writeU8(entry.category ?? 0x00);
      writeBlob(entry.content);
      const revs = entry.revisions ?? [];
      writeU32(revs.length);
      for (const r of revs) writeU32(r);
    } else {
      // Root entry writes the format version; non-root directory writes kind=2.
      writeI16(isRoot ? FORMAT_VERSION : 2);
      writeStr(entry.name);
      writeU64(entry.revision ?? 0x0000);
      writeU32(entry.flags ?? FLAGS.None);
      writeU8(entry.category ?? 0x00);
      const children = entry.children ?? [];
      writeU32(children.length);
      for (const child of children) writeEntry(child);
    }
  }

  writeEntry(root);
  return Buffer.concat(chunks);
}

// -------------------------- Import (binary -> disk) --------------------------

function doImport(inputPath, outputDir, { quiet = false } = {}) {
  const root = parse(fs.readFileSync(inputPath));
  if (!outputDir) outputDir = root.name;

  let fileCount = 0, dirCount = 0;

  function extract(entry, parentDir) {
    if (entry.kind === 'file') {
      fs.writeFileSync(path.join(parentDir, entry.name), entry.content);
      fileCount++;
    } else {
      const dir = path.join(parentDir, entry.name);
      fs.mkdirSync(dir, { recursive: true });
      dirCount++;
      for (const child of entry.children) extract(child, dir);
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });
  for (const child of root.children) extract(child, outputDir);
  if (!quiet) console.log(`Imported "${root.name}" -> ${outputDir}/  (${fileCount} files, ${dirCount} directories)`);
  return { name: root.name, fileCount, dirCount };
}

// -------------------------- Export (disk -> binary) --------------------------

function categoryFor(name) {
  return CATEGORY_BY_NAME[name] ?? CATEGORY.Default;
}

function buildTree(dirPath) {
  const name = path.basename(dirPath);
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const subdirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const files   = entries.filter(e => e.isFile()).sort((a, b) => a.name.localeCompare(b.name));

  const children = [];
  for (const d of subdirs) {
    children.push(buildTree(path.join(dirPath, d.name)));
  }
  for (const f of files) {
    children.push({
      kind: 'file', name: f.name,
      revision: 0x0002, flags: FLAGS.None, category: categoryFor(f.name),
      content: fs.readFileSync(path.join(dirPath, f.name)),
      revisions: [],
    });
  }
  return {
    kind: 'directory', name,
    revision: 0x0000, flags: FLAGS.None, category: categoryFor(name),
    children,
  };
}

function doExport(inputDir, outputPath, { quiet = false } = {}) {
  const root = buildTree(path.resolve(inputDir));
  const buf = serialize(root);
  fs.writeFileSync(outputPath, buf);

  let fileCount = 0, dirCount = 0;
  function count(e) {
    if (e.kind === 'file') fileCount++;
    else { dirCount++; for (const c of e.children) count(c); }
  }
  for (const c of root.children) count(c);
  if (!quiet) console.log(`Exported "${root.name}" -> ${outputPath}  (${buf.length} bytes, ${fileCount} files, ${dirCount} directories)`);
  return { name: root.name, size: buf.length, fileCount, dirCount };
}

// -------------------------- Self-test ----------------------------------------

function selfTest() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const samplePath = path.join(scriptDir, '..', 'indexer', 'sample.twinpack');
  if (!fs.existsSync(samplePath)) {
    console.error(`Sample not found: ${samplePath}\n(requires indexer/sample.twinpack from the repository)`);
    process.exit(1);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'impexp-test-'));
  console.log(`Self-test  workdir: ${tmpDir}\n`);

  let passed = 0, failed = 0;
  function test(name, fn) {
    try { fn(); console.log(`  [PASS] ${name}`); passed++; }
    catch (e) { console.log(`  [FAIL] ${name}\n         ${e.message}`); failed++; }
  }
  function eq(a, b, msg) {
    if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`);
  }

  function treeFiles(entry, prefix) {
    if (entry.kind === 'file') return [{ p: prefix + entry.name, d: entry.content }];
    const out = [];
    for (const c of entry.children) out.push(...treeFiles(c, prefix + entry.name + '/'));
    return out.sort((a, b) => a.p.localeCompare(b.p));
  }

  function diskFiles(dir, prefix) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isDirectory()) out.push(...diskFiles(path.join(dir, e.name), prefix + e.name + '/'));
      else out.push({ p: prefix + e.name, d: fs.readFileSync(path.join(dir, e.name)) });
    }
    return out;
  }

  try {
    const sampleBuf = fs.readFileSync(samplePath);
    let root;

    test('Parse sample.twinpack', () => {
      root = parse(sampleBuf);
      eq(root.name, 'CustomControlsPackage', 'root name');
      let fc = 0, dc = 0;
      function cnt(e) { if (e.kind === 'file') fc++; else { dc++; for (const c of e.children) cnt(c); } }
      for (const c of root.children) cnt(c);
      eq(fc, 22, 'file count');
      eq(dc, 7, 'dir count');
    });

    test('In-memory round-trip (parse -> serialize -> re-parse)', () => {
      const buf2 = serialize(root);
      const root2 = parse(buf2);
      const f1 = treeFiles(root, ''), f2 = treeFiles(root2, '');
      eq(f1.length, f2.length, 'file count');
      for (let i = 0; i < f1.length; i++) {
        eq(f1[i].p, f2[i].p, `path[${i}]`);
        if (!Buffer.from(f1[i].d).equals(Buffer.from(f2[i].d)))
          throw new Error(`content mismatch: ${f1[i].p}`);
      }
    });

    test('Serializer idempotence (double round-trip)', () => {
      const once = serialize(parse(sampleBuf));
      const twice = serialize(parse(once));
      if (!once.equals(twice)) throw new Error(`${once.length} vs ${twice.length} bytes`);
    });

    test('Disk round-trip (import -> export -> re-import)', () => {
      const dir1 = path.join(tmpDir, 'import1');
      const rtFile = path.join(tmpDir, 'roundtrip.twinpack');
      const dir2 = path.join(tmpDir, 'import2');
      doImport(samplePath, dir1, { quiet: true });
      doExport(dir1, rtFile, { quiet: true });
      doImport(rtFile, dir2, { quiet: true });
      const a = diskFiles(dir1, ''), b = diskFiles(dir2, '');
      eq(a.length, b.length, 'file count');
      for (let i = 0; i < a.length; i++) {
        eq(a[i].p, b[i].p, `path[${i}]`);
        if (!a[i].d.equals(b[i].d)) throw new Error(`content mismatch: ${a[i].p}`);
      }
    });

    test('Empty project round-trip', () => {
      const tree = { kind: 'directory', name: 'Empty', revision: 0, flags: 0, category: 0, children: [] };
      const rt = parse(serialize(tree));
      eq(rt.name, 'Empty', 'name');
      eq(rt.children.length, 0, 'children');
    });

    test('Single-file project round-trip', () => {
      const content = Buffer.from('Hello twinBASIC');
      const tree = {
        kind: 'directory', name: 'Mini', revision: 0, flags: 0, category: 0,
        children: [{ kind: 'file', name: 'test.twin', revision: 2, flags: 0, category: 0, content, revisions: [] }],
      };
      const rt = parse(serialize(tree));
      eq(rt.children.length, 1, 'children');
      eq(rt.children[0].name, 'test.twin', 'filename');
      if (!Buffer.from(rt.children[0].content).equals(content))
        throw new Error('content mismatch');
    });

    test('Flags field preserved on round-trip', () => {
      const tree = {
        kind: 'directory', name: 'WithFlags', revision: 0, flags: FLAGS.Hidden, category: 0,
        children: [{
          kind: 'file', name: 'h.twin',
          revision: 2, flags: FLAGS.Hidden | FLAGS.Virtual, category: 0,
          content: Buffer.from('x'), revisions: [],
        }],
      };
      const rt = parse(serialize(tree));
      eq(rt.flags, FLAGS.Hidden, 'root flags');
      eq(rt.children[0].flags, FLAGS.Hidden | FLAGS.Virtual, 'file flags');
    });

    test('Bad magic rejected', () => {
      try { parse(Buffer.from('not a twinpack!!')); throw new Error('should have thrown'); }
      catch (e) { if (!e.message.includes('Bad magic')) throw e; }
    });

  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`\n${passed}/${passed + failed} tests passed.`);
  if (failed > 0) process.exit(1);
}

// -------------------------- CLI ----------------------------------------------

const USAGE = `Usage:
  impexp import <file.twinproj|.twinpack> [output_dir]
  impexp export <input_dir> <output.twinproj|.twinpack>
  impexp --self-test`;

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === '--self-test')                      selfTest();
else if (cmd === 'import' && rest.length >= 1)  doImport(rest[0], rest[1]);
else if (cmd === 'export' && rest.length >= 2)  doExport(rest[0], rest[1]);
else { console.error(USAGE); process.exit(1); }
