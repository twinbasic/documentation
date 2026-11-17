// Reading a Windows Installer database (.msi) as data: the compound file it is stored in, its
// string pool and its tables. The WDK's packages store each file in a CAB under its key in the File
// table; the File, Component and Directory tables give the path the file installs to. The package
// is never installed or run.

/** The streams of a compound file (MS-CFB), by name: `Map<name, Buffer>`. Storages are flattened. */
export function readCompoundFile(b) {
  if (b.readUInt32LE(0) !== 0xe011cfd0 || b.readUInt32LE(4) !== 0xe11ab1a1) throw new Error("not a compound file");
  const sectorSize = 1 << b.readUInt16LE(30);
  const miniSectorSize = 1 << b.readUInt16LE(32);
  const dirStart = b.readUInt32LE(48);
  const miniCutoff = b.readUInt32LE(56);
  const miniFatStart = b.readUInt32LE(60);
  const difatStart = b.readUInt32LE(68);
  const sector = (n) => b.subarray(sectorSize * (n + 1), sectorSize * (n + 2));
  const END = 0xfffffffe;
  // The FAT's sectors: 109 in the header, the rest in the DIFAT chain.
  const fatSectors = [];
  for (let i = 0; i < 109; i++) {
    const s = b.readUInt32LE(76 + 4 * i);
    if (s < END - 1) fatSectors.push(s);
  }
  for (let d = difatStart; d < END - 1; ) {
    const sec = sector(d);
    for (let i = 0; i < sectorSize / 4 - 1; i++) {
      const s = sec.readUInt32LE(4 * i);
      if (s < END - 1) fatSectors.push(s);
    }
    d = sec.readUInt32LE(sectorSize - 4);
  }
  const fat = [];
  for (const s of fatSectors) {
    const sec = sector(s);
    for (let i = 0; i < sectorSize / 4; i++) fat.push(sec.readUInt32LE(4 * i));
  }
  const chain = (start, table, read) => {
    const parts = [];
    for (let s = start, n = 0; s < END - 1; s = table[s], n++) {
      if (n > table.length) throw new Error("a sector chain loops");
      parts.push(read(s));
    }
    return Buffer.concat(parts);
  };
  const big = (start) => chain(start, fat, sector);
  const dir = big(dirStart);
  const entries = [];
  for (let off = 0; off + 128 <= dir.length; off += 128) {
    const nameLen = dir.readUInt16LE(off + 64);
    entries.push({
      name: dir.toString("utf16le", off, off + Math.max(0, nameLen - 2)),
      type: dir[off + 66],
      start: dir.readUInt32LE(off + 116),
      size: Number(dir.readBigUInt64LE(off + 120)),
    });
  }
  const root = entries[0];
  const miniStream = big(root.start);
  const miniFat = [];
  if (miniFatStart < END - 1) {
    const mf = big(miniFatStart);
    for (let i = 0; i < mf.length / 4; i++) miniFat.push(mf.readUInt32LE(4 * i));
  }
  const mini = (start) =>
    chain(start, miniFat, (s) => miniStream.subarray(miniSectorSize * s, miniSectorSize * (s + 1)));
  const streams = new Map();
  for (const e of entries) {
    if (e.type !== 2) continue;
    const data = e.size < miniCutoff ? mini(e.start) : big(e.start);
    streams.set(e.name, data.subarray(0, e.size));
  }
  return streams;
}

const MIME = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz._";

/** An MSI stream name decoded: tables are "!Name"... as Windows Installer packs two characters a code. */
export function decodeStreamName(name) {
  let out = "";
  for (const ch of name) {
    const c = ch.codePointAt(0);
    if (c >= 0x3800 && c < 0x4800) out += MIME[(c - 0x3800) & 0x3f] + MIME[((c - 0x3800) >> 6) & 0x3f];
    else if (c >= 0x4800 && c < 0x4840) out += MIME[c - 0x4800];
    else if (c === 0x4840) out += "!";
    else out += ch;
  }
  return out;
}

const STRING = 0x0800;

/**
 * The tables of an MSI database: `{ table(name) }` returns its rows as objects keyed by column
 * name, strings as strings and integers as numbers (null for a null cell).
 */
export function readMsi(bytes) {
  const raw = readCompoundFile(bytes);
  const streams = new Map([...raw].map(([k, v]) => [decodeStreamName(k), v]));
  const pool = streams.get("!_StringPool");
  const data = streams.get("!_StringData");
  if (!pool || !data) throw new Error("not an MSI database: no string pool");
  const head = pool.readUInt32LE(0);
  const refSize = head & 0x80000000 ? 3 : 2;
  const codepage = head & 0xffff;
  const decoder = new TextDecoder(codepage === 65001 ? "utf-8" : `windows-${codepage || 1252}`);
  const strings = [null];
  for (let off = 4, at = 0; off + 4 <= pool.length; off += 4) {
    let len = pool.readUInt16LE(off);
    const refs = pool.readUInt16LE(off + 2);
    if (len === 0 && refs !== 0) {
      off += 4;
      len = (refs << 16) | pool.readUInt16LE(off);
    }
    strings.push(decoder.decode(data.subarray(at, at + len)));
    at += len;
  }
  const readTable = (name, columns) => {
    const s = streams.get(`!${name}`);
    if (!s) return [];
    const width = (c) => (c.type & STRING ? refSize : (c.type & 0xff) <= 2 ? 2 : 4);
    const rowSize = columns.reduce((n, c) => n + width(c), 0);
    const rows = s.length / rowSize;
    const out = Array.from({ length: rows }, () => ({}));
    let off = 0;
    for (const c of columns) {
      const w = width(c);
      for (let r = 0; r < rows; r++, off += w) {
        const v = w === 2 ? s.readUInt16LE(off) : w === 3 ? s.readUIntLE(off, 3) : s.readUInt32LE(off);
        out[r][c.name] = c.type & STRING ? strings[v] : v === 0 ? null : w === 2 ? v - 0x8000 : (v - 0x80000000) | 0;
      }
    }
    return out;
  };
  const columns = readTable("_Columns", [
    { name: "Table", type: STRING },
    { name: "Number", type: 2 },
    { name: "Name", type: STRING },
    { name: "Type", type: 2 },
  ]);
  const schema = new Map();
  for (const c of columns) {
    if (!schema.has(c.Table)) schema.set(c.Table, []);
    schema.get(c.Table)[c.Number - 1] = { name: c.Name, type: c.Type };
  }
  return {
    tables: [...schema.keys()],
    table(name) {
      const cols = schema.get(name);
      if (!cols) throw new Error(`the database has no table ${name}`);
      return readTable(name, cols);
    },
  };
}

/** The long name of a "short|long" file or directory name. */
const longName = (n) => (n.includes("|") ? n.slice(n.indexOf("|") + 1) : n);

/**
 * Each file of an MSI database with the path it installs to, relative to the install's root:
 * `Map<file key, path with forward slashes>`.
 */
export function msiFilePaths(db) {
  const dirs = new Map(db.table("Directory").map((d) => [d.Directory, d]));
  const memo = new Map();
  const dirPath = (id) => {
    if (memo.has(id)) return memo.get(id);
    const d = dirs.get(id);
    let p = "";
    if (d) {
      // DefaultDir is "target:source"; a target of "." is the parent itself.
      const target = longName(d.DefaultDir.split(":")[0]);
      const parent = d.Directory_Parent && d.Directory_Parent !== id ? dirPath(d.Directory_Parent) : "";
      p = target === "." || id === "TARGETDIR" ? parent : parent ? `${parent}/${target}` : target;
    }
    memo.set(id, p);
    return p;
  };
  const comps = new Map(db.table("Component").map((c) => [c.Component, c]));
  const out = new Map();
  for (const f of db.table("File")) {
    const c = comps.get(f.Component_);
    const base = c ? dirPath(c.Directory_) : "";
    out.set(f.File, base ? `${base}/${longName(f.FileName)}` : longName(f.FileName));
  }
  return out;
}
