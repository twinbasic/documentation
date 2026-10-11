import path from 'node:path';

const MAGIC = 0xEA0BA51C;
const FORMAT_VERSION = 1;

const CATEGORY = {
  Default: 0x00,
  References: 0x01,
  Resources: 0x02,
  Sources: 0x03,
  Settings: 0x04,
  ImportedTypeLibraries: 0x05,
  Miscellaneous: 0x06,
  Packages: 0x07,
};

function parseTwinpack(buffer) {
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

  const magic = readU32();
  if (magic !== MAGIC) {
    throw new Error(
      `Invalid twinpack magic: 0x${magic.toString(16).toUpperCase().padStart(8, '0')}, ` +
      `expected 0x${MAGIC.toString(16).toUpperCase().padStart(8, '0')}`
    );
  }

  function readEntry() {
    // At the root this 2-byte field is the file format version; everywhere
    // else it is the entry kind (1 = file, 2 = directory).
    const kind = readI16();
    const isRoot = (entryCount === 0);
    entryCount++;

    if (isRoot && kind !== FORMAT_VERSION)
      throw new Error(`Unsupported file format version: ${kind}, expected ${FORMAT_VERSION}`);

    const name = readStr();
    const revision = readU64();
    const flags = readU32();
    const category = readU8();

    if (kind === 1 && !isRoot) {
      const contentLen = readU32();
      const content = Buffer.from(buf.subarray(pos, pos + contentLen));
      pos += contentLen;
      const revisionCount = readU32();
      pos += revisionCount * 4;
      return { kind: 'file', name, revision, flags, category, content };
    }

    const count = readU32();
    const children = [];
    for (let i = 0; i < count; i++) children.push(readEntry());
    return { kind: 'directory', name, revision, flags, category, children };
  }

  return readEntry();
}

function collectFiles(rootEntry) {
  const files = [];

  function walk(entry, prefix) {
    if (entry.category === CATEGORY.Packages) return;

    if (entry.kind === 'file') {
      files.push({ relativePath: prefix + entry.name, content: entry.content });
      return;
    }

    const dir = prefix + entry.name + '/';
    for (const child of entry.children) walk(child, dir);
  }

  for (const child of rootEntry.children) walk(child, '');

  files.sort((a, b) => {
    const dirA = path.dirname(a.relativePath);
    const dirB = path.dirname(b.relativePath);
    if (dirA !== dirB) return dirA.localeCompare(dirB);
    return path.basename(a.relativePath).localeCompare(path.basename(b.relativePath));
  });

  return files;
}

export { parseTwinpack, collectFiles };
