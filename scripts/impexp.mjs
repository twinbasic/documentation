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

const DIR_MARK2 = {
  Resources: 0x02, Sources: 0x03, ImportedTypeLibraries: 0x05,
  Miscellaneous: 0x06, Packages: 0x07,
};

// -------------------------- Parser (binary -> tree) --------------------------

function parse(buffer) {
  const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const decoder = new TextDecoder('utf-8');
  let pos = 0;
  let entryCount = 0;

  function readU32() { const v = view.getUint32(pos, true); pos += 4; return v; }
  function readU16() { const v = view.getUint16(pos, true); pos += 2; return v; }
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
    const kind = readI16();
    const name = readStr();
    const mark1 = readU16();
    pos += 10;  // reserved padding -- always zeros
    const mark2 = readU8();
    entryCount++;

    if (kind === 1 && entryCount > 1) {
      const content = readBlob();
      const revisionCount = readU32();
      const revisions = [];
      for (let i = 0; i < revisionCount; i++) revisions.push(readU32());
      return { kind: 'file', name, mark1, mark2, content, revisions };
    }

    const count = readU32();
    const children = [];
    for (let i = 0; i < count; i++) children.push(readEntry());
    return { kind: 'directory', name, mark1, mark2, children };
  }

  return readEntry();
}

// -------------------------- Serializer (tree -> binary) ----------------------

function serialize(root) {
  const chunks = [];
  const encoder = new TextEncoder();

  function writeU32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v); chunks.push(b); }
  function writeI16(v) { const b = Buffer.alloc(2); b.writeInt16LE(v); chunks.push(b); }
  function writeU16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v); chunks.push(b); }
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
      writeU16(entry.mark1 ?? 0x0002);
      chunks.push(Buffer.alloc(10));
      writeU8(entry.mark2 ?? 0x00);
      writeBlob(entry.content);
      const revs = entry.revisions ?? [];
      writeU32(revs.length);
      for (const r of revs) writeU32(r);
    } else {
      writeI16(isRoot ? 1 : 2);
      writeStr(entry.name);
      writeU16(entry.mark1 ?? 0x0000);
      chunks.push(Buffer.alloc(10));
      writeU8(entry.mark2 ?? 0x00);
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

function mark2For(name, isDir) {
  if (isDir) return DIR_MARK2[name] ?? 0x00;
  return name === 'Settings' ? 0x04 : 0x00;
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
      mark1: 0x0002, mark2: mark2For(f.name, false),
      content: fs.readFileSync(path.join(dirPath, f.name)),
      revisions: [],
    });
  }
  return {
    kind: 'directory', name,
    mark1: 0x0000, mark2: mark2For(name, true),
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
      const tree = { kind: 'directory', name: 'Empty', mark1: 0, mark2: 0, children: [] };
      const rt = parse(serialize(tree));
      eq(rt.name, 'Empty', 'name');
      eq(rt.children.length, 0, 'children');
    });

    test('Single-file project round-trip', () => {
      const content = Buffer.from('Hello twinBASIC');
      const tree = {
        kind: 'directory', name: 'Mini', mark1: 0, mark2: 0,
        children: [{ kind: 'file', name: 'test.twin', mark1: 2, mark2: 0, content, revisions: [] }],
      };
      const rt = parse(serialize(tree));
      eq(rt.children.length, 1, 'children');
      eq(rt.children[0].name, 'test.twin', 'filename');
      if (!Buffer.from(rt.children[0].content).equals(content))
        throw new Error('content mismatch');
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
