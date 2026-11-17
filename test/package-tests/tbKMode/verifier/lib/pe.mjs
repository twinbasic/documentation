// Reading a PE file (an .exe, .dll or .sys) from its bytes: its machine, its exports and its imports.
// Nothing is mapped or loaded; the sections are found by their raw offsets.

/** The machine types this tool knows, by their IMAGE_FILE_MACHINE_ value. */
export const MACHINES = { 0x14c: "x86", 0x8664: "x64", 0xaa64: "arm64" };

/**
 * Parses the headers of a PE file.
 *
 * @param {Buffer} b  the file's bytes
 * @returns {{machine: string, pe64: boolean, timestamp: number, sizeOfImage: number, at: (rva: number) => number, dir: (i: number) => {rva: number, size: number}}}
 */
export function peHeaders(b) {
  if (b.length < 0x40 || b.readUInt16LE(0) !== 0x5a4d) throw new Error("not a PE file: no MZ header");
  const nt = b.readUInt32LE(0x3c);
  if (nt + 24 > b.length || b.readUInt32LE(nt) !== 0x4550) throw new Error("not a PE file: no PE header");
  const opt = nt + 24;
  const magic = b.readUInt16LE(opt);
  if (magic !== 0x10b && magic !== 0x20b) throw new Error(`unknown optional header magic ${magic.toString(16)}`);
  const pe64 = magic === 0x20b;
  const sections = [];
  const optSize = b.readUInt16LE(nt + 20);
  for (let i = 0; i < b.readUInt16LE(nt + 6); i++) {
    const s = opt + optSize + 40 * i;
    sections.push({
      va: b.readUInt32LE(s + 12),
      size: Math.max(b.readUInt32LE(s + 8), b.readUInt32LE(s + 16)),
      raw: b.readUInt32LE(s + 20),
    });
  }
  const at = (rva) => {
    const s = sections.find((x) => rva >= x.va && rva < x.va + x.size);
    if (!s) throw new Error(`RVA 0x${rva.toString(16)} is in no section`);
    return rva - s.va + s.raw;
  };
  const dirs = opt + (pe64 ? 112 : 96);
  const dir = (i) => ({ rva: b.readUInt32LE(dirs + 8 * i), size: b.readUInt32LE(dirs + 8 * i + 4) });
  const machineCode = b.readUInt16LE(nt + 4);
  return {
    machine: MACHINES[machineCode] ?? `0x${machineCode.toString(16)}`,
    pe64,
    timestamp: b.readUInt32LE(nt + 8),
    sizeOfImage: b.readUInt32LE(opt + 56),
    at,
    dir,
  };
}

const cstr = (b, off) => b.toString("latin1", off, b.indexOf(0, off));

/**
 * The exports of a PE file: each with its ordinal, its name (null for an export by ordinal only)
 * and, for a forwarder, the "dll.routine" it forwards to.
 *
 * @param {Buffer} b
 * @returns {{ordinal: number, name: string | null, forward: string | null, rva: number}[]}
 */
export function exportsOf(b) {
  const h = peHeaders(b);
  const d = h.dir(0);
  if (!d.rva) return [];
  const e = h.at(d.rva);
  const base = b.readUInt32LE(e + 16);
  const count = b.readUInt32LE(e + 20);
  const nameCount = b.readUInt32LE(e + 24);
  const functions = h.at(b.readUInt32LE(e + 28));
  const names = nameCount ? h.at(b.readUInt32LE(e + 32)) : 0;
  const ordinals = nameCount ? h.at(b.readUInt32LE(e + 36)) : 0;
  const nameOf = new Map();
  for (let i = 0; i < nameCount; i++) {
    const index = b.readUInt16LE(ordinals + 2 * i);
    if (!nameOf.has(index)) nameOf.set(index, cstr(b, h.at(b.readUInt32LE(names + 4 * i))));
  }
  const out = [];
  for (let i = 0; i < count; i++) {
    const rva = b.readUInt32LE(functions + 4 * i);
    if (!rva) continue;
    const forward = rva >= d.rva && rva < d.rva + d.size ? cstr(b, h.at(rva)) : null;
    out.push({ ordinal: base + i, name: nameOf.get(i) ?? null, forward, rva });
  }
  return out;
}

/**
 * The imports of a PE file, by DLL: each routine by name, or "#n" for one imported by ordinal.
 *
 * @param {Buffer} b
 * @returns {{dll: string, names: string[]}[]}
 */
export function importsOf(b) {
  const h = peHeaders(b);
  const d = h.dir(1);
  const out = [];
  if (!d.rva) return out;
  for (let p = h.at(d.rva); b.readUInt32LE(p + 12) !== 0; p += 20) {
    const dll = cstr(b, h.at(b.readUInt32LE(p + 12)));
    const names = [];
    const thunks = b.readUInt32LE(p) || b.readUInt32LE(p + 16);
    for (let t = h.at(thunks); ; t += h.pe64 ? 8 : 4) {
      const v = h.pe64 ? b.readBigUInt64LE(t) : BigInt(b.readUInt32LE(t));
      if (v === 0n) break;
      const byOrdinal = h.pe64 ? v >> 63n === 1n : v >> 31n === 1n;
      names.push(byOrdinal ? `#${Number(v & 0xffffn)}` : cstr(b, h.at(Number(v & 0x7fffffffn)) + 2));
    }
    out.push({ dll, names });
  }
  return out;
}
