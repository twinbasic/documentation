// Reading an import library (a .lib that links a program to a DLL's exports) from its bytes: the
// archive's short-form import objects, each naming a DLL, the export a program imports from it (by
// name or by ordinal), the program's symbol for it and the machine it is for. On x86 the symbol is
// decorated: `_Name@n` is a __stdcall routine taking n bytes of arguments, `@Name@n` a __fastcall
// one, and `_Name` a __cdecl one or data.
import { MACHINES } from "./pe.mjs";

const NAME_TYPES = ["ordinal", "name", "noprefix", "undecorate", "exportas"];
const TYPES = ["code", "data", "const"];

/** The name a symbol is imported by, for the name types that derive it from the symbol. */
function importName(symbol, nameType) {
  if (nameType === "name") return symbol;
  const bare = symbol.replace(/^[?@_]/, "");
  if (nameType === "noprefix") return bare;
  return bare.replace(/@.*$/, "");
}

/**
 * The import objects of an import library, or null when the bytes are not an archive.
 *
 * @param {Buffer} b
 * @returns {{machine: string, dll: string, symbol: string, name: string | null, ordinal: number | null, type: string}[] | null}
 */
export function importLibrary(b) {
  if (b.length < 8 || b.toString("latin1", 0, 8) !== "!<arch>\n") return null;
  const out = [];
  for (let p = 8; p + 60 <= b.length; ) {
    const size = Number(b.toString("latin1", p + 48, p + 58).trim());
    if (!Number.isFinite(size)) break;
    const d = p + 60;
    if (size >= 20 && b.readUInt16LE(d) === 0 && b.readUInt16LE(d + 2) === 0xffff) {
      const machine = b.readUInt16LE(d + 6);
      const hint = b.readUInt16LE(d + 16);
      const bits = b.readUInt16LE(d + 18);
      const type = TYPES[bits & 3] ?? `type${bits & 3}`;
      const nameType = NAME_TYPES[(bits >> 2) & 7] ?? `name${(bits >> 2) & 7}`;
      const symEnd = b.indexOf(0, d + 20);
      const symbol = b.toString("latin1", d + 20, symEnd);
      const dllEnd = b.indexOf(0, symEnd + 1);
      const dll = b.toString("latin1", symEnd + 1, dllEnd);
      let name = null;
      if (nameType === "exportas") {
        const end = b.indexOf(0, dllEnd + 1);
        name = b.toString("latin1", dllEnd + 1, end);
      } else if (nameType !== "ordinal") name = importName(symbol, nameType);
      out.push({
        machine: MACHINES[machine] ?? `0x${machine.toString(16)}`,
        dll,
        symbol,
        name,
        ordinal: nameType === "ordinal" ? hint : null,
        type,
      });
    }
    p = d + size + (size & 1);
  }
  return out;
}

/**
 * What an x86 decorated symbol says of its routine's calling convention and argument bytes.
 *
 * @returns {{convention: "stdcall" | "fastcall" | "cdecl", argBytes: number | null}}
 */
export function x86Decoration(symbol) {
  let m = /^@[^@]+@(\d+)$/.exec(symbol);
  if (m) return { convention: "fastcall", argBytes: Number(m[1]) };
  m = /^_[^@]+@(\d+)$/.exec(symbol);
  if (m) return { convention: "stdcall", argBytes: Number(m[1]) };
  return { convention: "cdecl", argBytes: null };
}
