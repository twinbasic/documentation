#!/usr/bin/env node
//
// Copyright (c) 2026 TWINBASIC LTD
// SPDX-License-Identifier: MIT
//
// impexp.mjs -- standalone twinproj/twinpack export/import tool.
// No external dependencies; requires Node.js 18+.
//
// The command line is the twinBASIC compiler executable's own. The project
// file always comes first, and the verb says what happens to it: `export`
// takes its source out into a folder, `import` puts a folder's source into it.
// Earlier versions of this script used `import` and `export` the other way
// round.
//
// Usage:
//   node impexp.mjs export <project> <folder> [--overwrite]
//   node impexp.mjs import <project> <folder> [--overwrite]
//   node impexp.mjs settings|licence|changelog|readme <project>
//   node impexp.mjs --self-test
//   node impexp.mjs --help
//
// The exit code says why a command failed, and whether it warned; the usage
// message lists the codes.

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

// Well-known entry names that get a non-default category on import, at any
// depth -- an embedded package's own Sources and Settings carry them too.
// References is intentionally excluded -- it is materialised virtually by
// the IDE, never serialized, and tagging an on-disk folder with category
// 0x01 would confuse the IDE when it opens the project.
const CATEGORY_BY_NAME = {
  Resources: CATEGORY.Resources,
  Sources: CATEGORY.Sources,
  Settings: CATEGORY.Settings,
  ImportedTypeLibraries: CATEGORY.ImportedTypeLibraries,
  Miscellaneous: CATEGORY.Miscellaneous,
  Packages: CATEGORY.Packages,
};

// Extensions of the code files, which the IDE stores with CRLF line endings.
// Import converts LF to CRLF in these, as the compiler executable's own import
// does, so a tree that Git or an editor left with LF line endings still packs
// correctly. Every other file -- resources in particular -- is stored
// byte-for-byte.
const CRLF_EXTENSIONS = ['.twin', '.bas', '.cls'];

// The files at the root of a project that the four printing commands write
// out. The compiler matches these names without regard to case, and only at
// the root.
const DOCUMENTS = {
  settings: 'Settings',
  licence: 'LICENCE.md',
  changelog: 'CHANGELOG.md',
  readme: 'README.md',
};

// The IDE's editor state: open editors, cursor positions, watches. The
// compiler's export leaves it out and so does this one, so the two write the
// same tree. Import packs one if the folder holds it.
const META_NAME = '.meta';

// Git's own folder is never packed and never written. The compiler's import
// packs whatever the folder holds, so a tree at the top of a repository puts
// the whole repository into the project file -- and the next export with
// --overwrite writes it back over the live one.
const GIT_NAME = '.git';

const PROJECT_FILE = /\.(twinproj|twinpack)$/i;

// -------------------------- Parser (binary -> tree) --------------------------

function parse(buffer) {
  const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const decoder = new TextDecoder('utf-8');
  let pos = 0;
  let entryCount = 0;

  function need(len) {
    if (pos + len > buf.length) throw new Error('the file ends too soon');
  }
  function readU64() { need(8); const v = view.getBigUint64(pos, true); pos += 8; return Number(v); }
  function readU32() { need(4); const v = view.getUint32(pos, true); pos += 4; return v; }
  function readI16() { need(2); const v = view.getInt16(pos, true); pos += 2; return v; }
  function readU8()  { need(1); const v = view.getUint8(pos); pos += 1; return v; }
  function readBytes(len) { need(len); const b = buf.subarray(pos, pos + len); pos += len; return b; }
  function readStr() {
    const len = readU32();
    return len === 0 ? '' : decoder.decode(readBytes(len));
  }
  function readBlob() { return Buffer.from(readBytes(readU32())); }

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

// -------------------------- Shared helpers ------------------------------------

// A refusal the command line reports as `ERROR:` lines, with nothing written.
// Its reason is one of the EXIT keys below.
class Refusal extends Error {
  constructor(reason, message, details = []) {
    super(message);
    this.reason = reason;
    this.details = details;
  }
}

// The exit code says what happened, so a caller never has to read the output:
// why a run failed, and whether a run that did its work warned. The compiler
// executable exits 0 after every failure it reports, so no script can have
// relied on its exit code, and these cost nothing in compatibility.
const EXIT = { done: 0, failed: 1, usage: 2, exists: 3, missing: 4, invalid: 5, warned: 6 };

function exitCodeFor(outcome) {
  if (outcome instanceof Error) return outcome instanceof Refusal ? EXIT[outcome.reason] : EXIT.failed;
  return outcome.stale?.length || outcome.repeated?.length ? EXIT.warned : EXIT.done;
}

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const count = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

// Paths compare without regard to case on Windows, as the file system does.
function pathKey(p) {
  const full = path.resolve(p);
  return process.platform === 'win32' ? full.toLowerCase() : full;
}

function kindOf(p) {
  try {
    return fs.statSync(p).isDirectory() ? 'folder' : 'file';
  } catch {
    return null;
  }
}

// At most ten, so a refusal over a whole tree stays readable.
function listed(paths) {
  const shown = paths.slice(0, 10);
  if (paths.length > shown.length) shown.push(`... and ${paths.length - shown.length} more`);
  return shown;
}

function readProject(file) {
  let data;
  try {
    data = fs.readFileSync(file);
  } catch (e) {
    if (e.code === 'ENOENT') throw new Refusal('missing', `project file does not exist: ${file}`);
    if (e.code === 'EISDIR') throw new Refusal('invalid', `${file} is a folder, not a project file`);
    throw e;
  }
  try {
    return parse(data);
  } catch (e) {
    throw new Refusal('invalid', `${file} is damaged or is not a project file: ${e.message}`);
  }
}

// Replaces the file only once the new one is complete, so a failed write
// leaves the old project file as it was.
function writeReplacing(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

const HINT_EXPORT = ['export writes the project into the folder.',
  'To write the folder into the project instead, use import.'];
const HINT_IMPORT = ['import replaces the project file with the folder.',
  'To write the project into the folder instead, use export.'];

// -------------------------- Export (binary -> disk) --------------------------

// A name the project holds becomes one component of a path on disk, so it has
// to be exactly one: `..`, `a/b` or `C:x` would put a file outside the folder,
// and Windows drops a trailing dot or space, which turns `.. ` into `..`.
// Nothing the IDE writes breaks these rules.
function isSafeName(name) {
  return name !== '' && !/[\\/:*?"<>|\x00-\x1f]/.test(name) && !/[. ]$/.test(name);
}

function exportProject(projectPath, folder, { overwrite = false } = {}) {
  const root = readProject(projectPath);

  // Everything is checked before anything is written, so a refusal leaves the
  // folder exactly as it was.
  const folders = [], files = [], skipped = [], repeated = [];
  const inProject = new Map();  // lower-case path -> { kind, rel } of its first entry
  (function collect(dir, rel) {
    for (const entry of dir.children) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (!isSafeName(entry.name))
        throw new Refusal('invalid', `the project holds a name that cannot be written safely: ${JSON.stringify(entryRel)}`);
      // A project can hold one name more than once -- the IDE has written
      // both the VB package and one of its own samples that way -- and a
      // folder cannot. The first entry wins, as it does with the compiler's
      // export --overwrite, and a repeated folder merges into the first.
      const first = inProject.get(entryRel.toLowerCase());
      if (first) {
        if (first.kind !== entry.kind)
          throw new Refusal('invalid', `the project holds a file and a folder with the same name: ${entryRel}`);
        if (entry.kind === 'directory') collect(entry, first.rel);
        else if (!repeated.includes(first.rel)) repeated.push(first.rel);
        continue;
      }
      inProject.set(entryRel.toLowerCase(), { kind: entry.kind, rel: entryRel });
      if (entry.name.toLowerCase() === GIT_NAME) skipped.push({ rel: entryRel, why: "Git's own folder" });
      else if (entry.kind === 'directory') { folders.push(entryRel); collect(entry, entryRel); }
      else if (entry.name !== META_NAME) files.push({ rel: entryRel, content: entry.content });
    }
  })(root, '');

  const onDisk = rel => path.join(folder, ...rel.split('/'));
  if (kindOf(folder) === 'file') throw new Refusal('failed', `${folder} is a file, not a folder`);
  const inTheWay = [], existing = [];
  for (const rel of folders) if (kindOf(onDisk(rel)) === 'file') inTheWay.push(onDisk(rel));
  for (const f of files) {
    const k = kindOf(onDisk(f.rel));
    if (k === 'folder') inTheWay.push(onDisk(f.rel));
    else if (k === 'file') existing.push(onDisk(f.rel));
  }
  if (inTheWay.length)
    throw new Refusal('failed', 'the folder has a file where the project has a folder, or the reverse:', listed(inTheWay));
  if (existing.length && !overwrite)
    throw new Refusal('exists',
      `${count(existing.length, 'file')} already ${existing.length === 1 ? 'exists' : 'exist'}, ` +
      'and --overwrite is not set:', [...listed(existing), ...HINT_EXPORT]);

  fs.mkdirSync(folder, { recursive: true });
  for (const rel of folders) fs.mkdirSync(onDisk(rel), { recursive: true });
  for (const f of files) fs.writeFileSync(onDisk(f.rel), f.content);

  // Export never deletes, and the compiler's does not either. A file the
  // project no longer has stays in the folder, and the next import packs it
  // straight back in, so say which ones they are.
  const source = pathKey(projectPath);
  const stale = [];
  (function scan(dir, rel) {
    for (const name of fs.readdirSync(dir).sort(byCodePoint)) {
      if (name.toLowerCase() === GIT_NAME) continue;
      const full = path.join(dir, name);
      const entryRel = rel ? `${rel}/${name}` : name;
      if (kindOf(full) === 'folder') scan(full, entryRel);
      else if (!inProject.has(entryRel.toLowerCase()) && pathKey(full) !== source) stale.push(full);
    }
  })(folder, '');

  return { name: root.name, files: files.length, folders: folders.length, skipped, repeated, stale };
}

// -------------------------- Import (disk -> binary) --------------------------

function categoryFor(name) {
  return Object.hasOwn(CATEGORY_BY_NAME, name) ? CATEGORY_BY_NAME[name] : CATEGORY.Default;
}

function toCrlf(name, content) {
  if (!CRLF_EXTENSIONS.includes(path.extname(name).toLowerCase())) return content;
  return Buffer.from(content.toString('latin1').replace(/\r?\n/g, '\r\n'), 'latin1');
}

// The IDE names the root entry after the project; every project and package
// an installation ships agrees with its own Settings on that. The folder's
// name is the fallback, for a Settings file without one.
function projectNameIn(settingsPath) {
  try {
    let json = fs.readFileSync(settingsPath, 'utf8');
    if (json.charCodeAt(0) === 0xFEFF) json = json.slice(1);  // a byte order mark
    const name = JSON.parse(json)['project.name'];
    return typeof name === 'string' && name ? name : null;
  } catch {
    return null;
  }
}

function buildTree(dirPath, rel, self, skipped) {
  const subdirs = [], files = [];
  for (const name of fs.readdirSync(dirPath).sort(byCodePoint)) {
    const full = path.join(dirPath, name);
    const entryRel = rel ? `${rel}/${name}` : name;
    if (name.toLowerCase() === GIT_NAME) { skipped.push({ rel: entryRel, why: "Git's own folder" }); continue; }
    const st = fs.statSync(full);
    if (st.isDirectory()) subdirs.push(name);
    else if (!st.isFile()) continue;
    else if (pathKey(full) === self) skipped.push({ rel: entryRel, why: 'the project file itself' });
    else files.push(name);
  }

  const children = [];
  for (const d of subdirs) {
    children.push(buildTree(path.join(dirPath, d), rel ? `${rel}/${d}` : d, self, skipped));
  }
  for (const f of files) {
    children.push({
      kind: 'file', name: f,
      revision: 0x0002, flags: FLAGS.None, category: categoryFor(f),
      content: toCrlf(f, fs.readFileSync(path.join(dirPath, f))),
      revisions: [],
    });
  }
  const name = path.basename(dirPath);
  return {
    kind: 'directory', name,
    revision: 0x0000, flags: FLAGS.None, category: categoryFor(name),
    children,
  };
}

function importProject(projectPath, folder, { overwrite = false } = {}) {
  // Everything is checked before the tree is read, so a refusal leaves the
  // project file exactly as it was.
  if (kindOf(folder) !== 'folder') throw new Refusal('missing', `input folder does not exist: ${folder}`, HINT_IMPORT);
  const settings = path.join(folder, 'Settings');
  if (kindOf(settings) !== 'file')
    throw new Refusal('invalid', `${folder} has no Settings file, so it is not the top folder of a project`, HINT_IMPORT);
  const existing = kindOf(projectPath);
  if (existing === 'folder') throw new Refusal('failed', `${projectPath} is a folder, not a project file`);
  if (existing === 'file' && !overwrite)
    throw new Refusal('exists', `${projectPath} already exists, and --overwrite is not set`, HINT_IMPORT);

  const skipped = [];
  const root = buildTree(path.resolve(folder), '', pathKey(projectPath), skipped);
  root.name = projectNameIn(settings) ?? root.name;
  root.category = CATEGORY.Default;
  const buf = serialize(root);
  writeReplacing(projectPath, buf);

  let fileCount = 0, dirCount = 0;
  (function tally(e) {
    for (const c of e.children) {
      if (c.kind === 'file') fileCount++;
      else { dirCount++; tally(c); }
    }
  })(root);
  return { name: root.name, size: buf.length, files: fileCount, folders: dirCount, skipped };
}

// -------------------------- Printing a root document -------------------------

function readDocument(projectPath, verb) {
  const root = readProject(projectPath);
  const want = DOCUMENTS[verb];
  const entry = root.children.find(e => e.kind === 'file' && e.name.toLowerCase() === want.toLowerCase());
  if (!entry) throw new Refusal('missing', `${projectPath} has no ${want}`);
  return entry.content;
}

// -------------------------- Self-test ----------------------------------------

function selfTest() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'impexp-test-'));
  console.log(`Self-test  workdir: ${tmpDir}\n`);

  let passed = 0, failed = 0;
  function test(name, fn) {
    try { fn(); console.log(`  [PASS] ${name}`); passed++; }
    catch (e) { console.log(`  [FAIL] ${name}\n         ${e.message}`); failed++; }
  }
  function eq(a, b, msg) {
    if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
  function refused(fn, pattern, reason) {
    try { fn(); }
    catch (e) {
      if (!(e instanceof Refusal) || !pattern.test(e.message))
        throw new Error(`refused for the wrong reason: ${e.message}`);
      if (e.reason !== reason)
        throw new Error(`refused as ${JSON.stringify(e.reason)}, expected ${JSON.stringify(reason)}: ${e.message}`);
      return;
    }
    throw new Error('was not refused');
  }

  const at = (...p) => path.join(tmpDir, ...p);
  const text = p => fs.readFileSync(p, 'latin1');
  const exists = p => fs.existsSync(p);

  // A small project in the shape the IDE writes.
  const file = (name, content) => ({
    kind: 'file', name, revision: 2, flags: 0, category: categoryFor(name),
    content: Buffer.from(content, 'latin1'), revisions: [],
  });
  const dir = (name, children) => ({
    kind: 'directory', name, revision: 0, flags: 0, category: categoryFor(name), children,
  });
  const SETTINGS = '{\r\n\t"project.name": "Probe"\r\n}\r\n';
  const probe = () => dir('Probe', [
    file('.meta', '{"rootFolder": "/Probe"}'),
    dir('ImportedTypeLibraries', []),
    dir('Miscellaneous', []),
    dir('Packages', []),
    file('README.md', '# Probe\r\n'),
    dir('Resources', [dir('ICON', [file('app.ico', '\x00\x01\r\n\x02\n')])]),
    file('Settings', SETTINGS),
    dir('Sources', [file('Form1.tbform', '{\n}\n'), file('Module1.twin', 'Module Module1\r\nEnd Module\r\n')]),
  ]);
  function write(p, tree) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, serialize(tree));
    return p;
  }
  // Every file of a parsed tree by its path, the root's name left out.
  function contents(tree) {
    const out = new Map();
    (function walk(e, rel) {
      for (const c of e.children) {
        const r = rel ? `${rel}/${c.name}` : c.name;
        if (c.kind === 'file') out.set(r, c.content.toString('latin1'));
        else { out.set(`${r}/`, null); walk(c, r); }
      }
    })(tree, '');
    return out;
  }
  const listing = tree => JSON.stringify([...contents(tree)].sort(([a], [b]) => byCodePoint(a, b)));
  function diskListing(d) {
    const out = [];
    (function walk(p, rel) {
      for (const name of fs.readdirSync(p).sort(byCodePoint)) {
        const full = path.join(p, name), r = rel ? `${rel}/${name}` : name;
        if (fs.statSync(full).isDirectory()) { out.push(`${r}/`); walk(full, r); }
        else out.push(`${r}=${text(full)}`);
      }
    })(d, '');
    return out.join('\n');
  }

  try {
    test('Parse and serialize round-trip in memory', () => {
      const tree = probe();
      tree.children[0].flags = FLAGS.Hidden | FLAGS.Virtual;
      tree.children[0].revisions = [1, 2, 3];
      const back = parse(serialize(tree));
      eq(back.name, 'Probe', 'root name');
      eq(listing(back), listing(tree), 'contents');
      eq(back.children[0].flags, FLAGS.Hidden | FLAGS.Virtual, 'flags');
      eq(back.children[0].revisions.join(), '1,2,3', 'revision list');
    });

    test('Serializing is idempotent', () => {
      const once = serialize(parse(serialize(probe())));
      eq(Buffer.compare(once, serialize(parse(once))), 0, 'second pass differs');
    });

    test('A damaged file is refused', () => {
      const good = serialize(probe());
      const damaged = {
        magic: Buffer.from('not a project file'),
        short: good.subarray(0, good.length - 7),
        empty: Buffer.alloc(0),
      };
      for (const [name, bytes] of Object.entries(damaged)) {
        const p = at('damaged', `${name}.twinproj`);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, bytes);
        refused(() => readProject(p), /damaged or is not a project file/, 'invalid');
      }
    });

    const proj = write(at('Probe.twinproj'), probe());
    const tree = at('tree');

    test('Export writes every file but .meta', () => {
      const r = exportProject(proj, tree);
      eq(text(path.join(tree, 'Settings')), SETTINGS, 'Settings');
      eq(text(path.join(tree, 'Sources', 'Module1.twin')), 'Module Module1\r\nEnd Module\r\n', 'Module1.twin');
      eq(exists(path.join(tree, 'Packages')), true, 'empty folder');
      eq(exists(path.join(tree, '.meta')), false, '.meta');
      eq(`${r.files} ${r.folders} ${r.stale.length}`, '5 6 0', 'files, folders, stale');
    });

    test('Import packs the folder, naming the root from Settings', () => {
      const out = at('Repacked.twinproj');
      importProject(out, tree);
      const back = parse(fs.readFileSync(out));
      eq(back.name, 'Probe', 'root name');
      eq(back.category, CATEGORY.Default, 'root category');
      const expected = probe();
      expected.children.shift();  // .meta
      eq(listing(back), listing(expected), 'contents');
      eq(back.children.find(c => c.name === 'Sources').category, CATEGORY.Sources, 'Sources category');
    });

    test('Import names the root after the folder when Settings has no name', () => {
      const bare = at('bare', 'MyTree');
      fs.mkdirSync(bare, { recursive: true });
      fs.writeFileSync(path.join(bare, 'Settings'), '{}');
      const out = at('bare', 'Bare.twinproj');
      importProject(out, bare);
      eq(parse(fs.readFileSync(out)).name, 'MyTree', 'root name');
    });

    test('Export without --overwrite refuses, and writes nothing', () => {
      fs.rmSync(path.join(tree, 'Settings'));
      fs.writeFileSync(path.join(tree, 'Sources', 'Module1.twin'), 'CHANGED');
      refused(() => exportProject(proj, tree), /already exist/, 'exists');
      eq(exists(path.join(tree, 'Settings')), false, 'Settings written anyway');
      eq(text(path.join(tree, 'Sources', 'Module1.twin')), 'CHANGED', 'Module1.twin');
    });

    test('Export --overwrite replaces files and names the ones the project lacks', () => {
      fs.writeFileSync(path.join(tree, 'Sources', 'Stale.twin'), 'Module Stale\r\nEnd Module\r\n');
      const r = exportProject(proj, tree, { overwrite: true });
      eq(text(path.join(tree, 'Sources', 'Module1.twin')), 'Module Module1\r\nEnd Module\r\n', 'Module1.twin');
      eq(exists(path.join(tree, 'Settings')), true, 'Settings');
      eq(r.stale.join(), path.join(tree, 'Sources', 'Stale.twin'), 'files the project lacks');
      fs.rmSync(path.join(tree, 'Sources', 'Stale.twin'));
    });

    test('Import without --overwrite refuses, and leaves the project alone', () => {
      const before = fs.readFileSync(proj);
      refused(() => importProject(proj, tree), /already exists/, 'exists');
      eq(Buffer.compare(fs.readFileSync(proj), before), 0, 'project file changed');
    });

    test('Import refuses a folder with no Settings file', () => {
      const noSettings = at('nosettings');
      fs.mkdirSync(noSettings);
      fs.writeFileSync(path.join(noSettings, 'Module1.twin'), 'x');
      refused(() => importProject(at('NoSettings.twinproj'), noSettings), /no Settings file/, 'invalid');
      refused(() => importProject(at('Missing.twinproj'), at('missing')), /does not exist/, 'missing');
      eq(exists(at('NoSettings.twinproj')), false, 'a project file was written');
    });

    test('Import skips .git and the project file itself', () => {
      fs.mkdirSync(path.join(tree, '.git'));
      fs.writeFileSync(path.join(tree, '.git', 'HEAD'), 'ref: refs/heads/main\n');
      const inside = path.join(tree, 'Inside.twinproj');
      importProject(inside, tree);
      const r = importProject(inside, tree, { overwrite: true });
      eq(/\.git|Inside/.test(listing(parse(fs.readFileSync(inside)))), false, 'packed anyway');
      eq(r.skipped.map(s => s.rel).join(), '.git,Inside.twinproj', 'skipped');
      fs.rmSync(inside);
      fs.rmSync(path.join(tree, '.git'), { recursive: true });
    });

    test('Export refuses a name that would leave the folder', () => {
      for (const bad of ['..', 'a/b', 'a\\b', 'C:x', 'x.', 'x ', '']) {
        const p = write(at('unsafe', 'Unsafe.twinproj'),
          dir('Unsafe', [file('Settings', '{}'), dir('Sources', [file(bad, 'x')])]));
        refused(() => exportProject(p, at('unsafe', 'out')), /cannot be written safely/, 'invalid');
      }
      eq(exists(at('unsafe', 'out')), false, 'something was written');
    });

    test('Export writes the first of two entries with one name, and says so', () => {
      const p = write(at('twice', 'Twice.twinproj'), dir('Twice', [
        file('Settings', '{}'),
        dir('Sources', [file('A.twin', 'first'), file('a.twin', 'second'), file('B.twin', 'first')]),
        dir('Sources', [file('B.twin', 'second'), file('C.twin', 'merged')]),
      ]));
      const out = at('twice', 'out');
      const r = exportProject(p, out);
      eq(text(path.join(out, 'Sources', 'A.twin')), 'first', 'A.twin');
      eq(text(path.join(out, 'Sources', 'B.twin')), 'first', 'B.twin');
      eq(text(path.join(out, 'Sources', 'C.twin')), 'merged', 'C.twin');
      eq(r.repeated.join(), 'Sources/A.twin,Sources/B.twin', 'names reported');
      const clash = write(at('twice', 'Clash.twinproj'),
        dir('Clash', [file('Settings', '{}'), file('Sources', 'x'), dir('Sources', [])]));
      refused(() => exportProject(clash, at('twice', 'clash')), /a file and a folder with the same name/, 'invalid');
    });

    test('Import converts LF to CRLF in code files only', () => {
      const src = at('eol', 'Eol');
      const files = {
        'Settings': ['{\n}\n', '{\n}\n'],
        'Sources/Lf.twin': ['A\nB\n', 'A\r\nB\r\n'],
        'Sources/Mixed.BAS': ['A\r\nB\nC', 'A\r\nB\r\nC'],
        'Sources/Crlf.cls': ['A\r\nB\r\n', 'A\r\nB\r\n'],
        'Sources/Form.tbform': ['{\n}\n', '{\n}\n'],
        'Resources/RCDATA/data.txt': ['A\nB\n', 'A\nB\n'],
      };
      for (const [rel, [before]] of Object.entries(files)) {
        const p = path.join(src, rel);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, before);
      }
      const out = at('eol', 'Eol.twinproj');
      importProject(out, src);
      const got = contents(parse(fs.readFileSync(out)));
      for (const [rel, [, after]] of Object.entries(files))
        eq(JSON.stringify(got.get(rel)), JSON.stringify(after), rel);
    });

    test('The printing commands read the documents at the root', () => {
      eq(readDocument(proj, 'readme').toString('latin1'), '# Probe\r\n', 'readme');
      eq(readDocument(proj, 'settings').toString('latin1'), SETTINGS, 'settings');
      refused(() => readDocument(proj, 'licence'), /has no LICENCE\.md/, 'missing');
      const lower = write(at('docs', 'Lower.twinproj'),
        dir('Lower', [file('changelog.MD', 'log'), dir('Sources', [file('README.md', 'not at the root')])]));
      eq(readDocument(lower, 'changelog').toString('latin1'), 'log', 'changelog, lower case');
      refused(() => readDocument(lower, 'readme'), /has no README\.md/, 'missing');
    });

    test('A command line in the wrong shape is refused before anything is read', () => {
      const bad = [
        ['export', ['tree/', 'P.twinproj']],
        ['import', ['P.twinproj', 'Q.twinpack']],
        ['import', ['P.twinproj']],
        ['EXPORT', ['P.twinproj', 'tree']],
        ['license', ['P.twinproj']],
        ['settings', ['P.twinproj', 'extra']],
        [undefined, []],
      ];
      for (const [verb, args] of bad)
        eq(commandLineError(verb, args) === null, false, `${verb} ${args.join(' ')}`);
      eq(commandLineError('export', ['P.TWINPACK', 'tree/']), null, 'export P.TWINPACK tree/');
      eq(commandLineError('readme', ['P.twinproj']), null, 'readme P.twinproj');
    });

    test('The exit code says why a command failed, and that it warned', () => {
      eq(Object.values(EXIT).join(), '0,1,2,3,4,5,6', 'the documented codes');
      refused(() => readProject(at('nowhere.twinproj')), /does not exist/, 'missing');
      eq(exitCodeFor(new Refusal('exists', 'x')), EXIT.exists, 'a refusal');
      eq(exitCodeFor(new Error('EACCES')), EXIT.failed, 'any other error');
      eq(exitCodeFor({ stale: ['Sources/Old.twin'], repeated: [] }), EXIT.warned, 'a file the project lacks');
      eq(exitCodeFor({ stale: [], repeated: ['Sources/A.twin'] }), EXIT.warned, 'a repeated name');
      eq(exitCodeFor({ skipped: [{ rel: '.git' }] }), EXIT.done, 'a skipped .git');
    });

    // The documentation repository's own sample, when run from a checkout.
    const samplePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'indexer', 'sample.twinpack');
    if (!fs.existsSync(samplePath)) {
      console.log('  [SKIP] sample.twinpack -- only in a checkout of the documentation repository');
    } else {
      test('Parse sample.twinpack', () => {
        const root = parse(fs.readFileSync(samplePath));
        eq(root.name, 'CustomControlsPackage', 'root name');
        let fc = 0, dc = 0;
        (function cnt(e) { for (const c of e.children) { if (c.kind === 'file') fc++; else { dc++; cnt(c); } } })(root);
        eq(fc, 22, 'file count');
        eq(dc, 7, 'dir count');
      });

      test('sample.twinpack survives export, import and export again', () => {
        const a = at('sample', 'a'), b = at('sample', 'b'), rt = at('sample', 'rt.twinpack');
        exportProject(samplePath, a);
        importProject(rt, a);
        exportProject(rt, b);
        eq(diskListing(b) === diskListing(a), true, 'the two trees differ');
        eq(parse(fs.readFileSync(rt)).name, 'CustomControlsPackage', 'root name');
      });
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`\n${passed}/${passed + failed} tests passed.`);
  return failed > 0 ? 1 : 0;
}

// -------------------------- CLI ----------------------------------------------

const USAGE = `Usage:
  impexp export <project> <folder> [--overwrite]   unpack the project file into the folder
  impexp import <project> <folder> [--overwrite]   pack the folder into the project file
  impexp settings <project>                        print the project's Settings
  impexp licence <project>                         print the project's LICENCE.md
  impexp changelog <project>                       print the project's CHANGELOG.md
  impexp readme <project>                          print the project's README.md
  impexp --self-test                               run the built-in tests
  impexp --help                                    print this message

<project> is a .twinproj or .twinpack file. It always comes first, and the
verb says what happens to it: export takes source out, import puts source in.
The commands and their arguments are those of the tB executable,
twinBASIC_win32.exe.

The exit code says what happened, so the output need not be read:
  0  done
  1  failed for another reason, such as a file that could not be written
  2  a mistake in the command line
  3  refused, because a file exists and --overwrite is not set
  4  the project file, the folder or the file to print does not exist
  5  the project file is damaged or is not one, or the folder has no Settings
  6  done, with a warning: the folder holds files the project does not,
     or the project holds one name twice`;

const ARGUMENTS = new Map([
  ['export', ['project', 'folder']],
  ['import', ['project', 'folder']],
  ['settings', ['project']],
  ['licence', ['project']],
  ['changelog', ['project']],
  ['readme', ['project']],
]);

// What is wrong with the command line, or null. Strict on purpose: the project
// file has to be named as one and the folder must not be, so arguments given
// in the wrong order -- the order this script took before it adopted the
// compiler's verbs -- stop here instead of reaching the disk.
function commandLineError(verb, args) {
  if (verb === undefined) return 'no command given';
  if (!ARGUMENTS.has(verb)) return `unknown command: ${verb}`;
  const want = ARGUMENTS.get(verb);
  if (args.length !== want.length) return `${verb} takes ${want.map(w => `<${w}>`).join(' ')}`;
  const [project, folder] = args;
  if (!PROJECT_FILE.test(project))
    return `not a .twinproj or .twinpack file: ${project}` +
      (folder === undefined ? '' : ' -- the project file comes first');
  if (folder !== undefined && PROJECT_FILE.test(folder.replace(/[\\/]+$/, '')))
    return `${folder} names a project file, not a folder -- the folder comes second`;
  return null;
}

function printError(e) {
  console.error(`  ERROR: ${e.message}`);
  for (const line of e.details ?? []) console.error(`         ${line}`);
}

function usageError(message) {
  console.error(`ERROR: ${message}\n\n${USAGE}`);
  return EXIT.usage;
}

function main(argv) {
  const opts = { overwrite: false };
  const words = [];
  let help = false, runSelfTest = false;
  for (const a of argv) {
    if (a === '--overwrite') opts.overwrite = true;
    else if (a === '--self-test') runSelfTest = true;
    else if (a === '--help' || a === '-h') help = true;
    else if (/^-./.test(a)) return usageError(`unknown option: ${a}`);
    else words.push(a);
  }
  if (help) { console.log(USAGE); return 0; }
  if (runSelfTest) return words.length ? usageError('--self-test takes no other arguments') : selfTest();

  const [verb, ...args] = words;
  const problem = commandLineError(verb, args);
  if (problem) return usageError(problem);
  const [project, folder] = args;

  if (verb === 'export' || verb === 'import') {
    // The progress lines follow the compiler's, down to the last one: a
    // script that tests for `... DONE` works with either.
    console.log(verb === 'export'
      ? `exporting from "${project}" to "${folder}"...`
      : `importing into "${project}" from "${folder}"...`);
    try {
      const r = verb === 'export'
        ? exportProject(project, folder, opts)
        : importProject(project, folder, opts);
      for (const s of r.skipped) console.log(`  skipped ${s.rel} (${s.why})`);
      console.log(`  ${count(r.files, 'file')}, ${count(r.folders, 'folder')}` +
        (r.size === undefined ? '' : `, ${r.size} bytes`));
      if (r.repeated?.length) {
        console.error(`  WARNING: ${count(r.repeated.length, 'name')} ${r.repeated.length === 1 ? 'occurs' : 'occur'} ` +
          'more than once in the project, and a folder holds one of each, so only the first was written:');
        for (const line of listed(r.repeated)) console.error(`           ${line}`);
      }
      if (r.stale?.length) {
        const one = r.stale.length === 1;
        console.error(`  WARNING: ${count(r.stale.length, 'file')} in the folder ${one ? 'is' : 'are'} ` +
          `not in the project, and import would pack ${one ? 'it' : 'them'} back in:`);
        for (const line of listed(r.stale)) console.error(`           ${line}`);
      }
      console.log('... DONE');
      return exitCodeFor(r);
    } catch (e) {
      printError(e);
      console.log('... FAILED');
      return exitCodeFor(e);
    }
  }

  try {
    process.stdout.write(readDocument(project, verb));
    return EXIT.done;
  } catch (e) {
    printError(e);
    return exitCodeFor(e);
  }
}

process.exitCode = main(process.argv.slice(2));
