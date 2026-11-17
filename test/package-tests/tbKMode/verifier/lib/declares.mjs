// Checking a package's Declares against the kernel database (db/kernels.json), once for each
// architecture a Declare is compiled for (its `#If` condition decides):
//
// - the file it names must be a kernel-mode file, and must export its entry point (its Alias, else
//   its name) in every build the database holds for that architecture;
// - on x86, its calling convention must be the routine's, which the routine's decorated symbol in
//   the WDK's import library says: `@Name@n` is __fastcall (the Declare says FastCall), `_Name@n`
//   __stdcall (neither FastCall nor CDecl), `_Name` __cdecl (CDecl);
// - on x86, the bytes its parameters take on the stack must be the n of that symbol, where the
//   parameters' types say it.
import { evaluate, constantsFor } from "./conditions.mjs";
import { buildLabel } from "./kernels.mjs";
import { x86Decoration } from "./importlib.mjs";
import { declareParts } from "./scanner.mjs";

export const ARCHES = ["x86", "x64"];

/** A Lib name as the loader takes it: lower case, with ".dll" when it has no extension. */
export function libFile(lib) {
  const f = lib.toLowerCase();
  return /\.[a-z0-9]+$/.test(f) ? f : `${f}.dll`;
}

/**
 * One parameter of a Declare, as written: `[Optional] [ByVal | ByRef | ParamArray] name[()] [As
 * type] [= default]`.
 */
export function parseParam(text) {
  let t = text.trim();
  const out = { byVal: false, optional: false, paramArray: false, array: false, name: "", type: null };
  for (;;) {
    const m = /^(Optional|ByVal|ByRef|ParamArray)\s+/i.exec(t);
    if (!m) break;
    const w = m[1].toLowerCase();
    if (w === "byval") out.byVal = true;
    else if (w === "optional") out.optional = true;
    else if (w === "paramarray") out.paramArray = true;
    t = t.slice(m[0].length);
  }
  const m = /^\[?([A-Za-z_][A-Za-z0-9_]*)\]?([%&!#@$^]?)\s*(\(\s*\))?\s*(?:As\s+([A-Za-z_][A-Za-z0-9_.]*))?/i.exec(t);
  if (!m) return null;
  out.name = m[1];
  out.array = Boolean(m[3]);
  const chars = {
    "%": "Integer",
    "&": "Long",
    "!": "Single",
    "#": "Double",
    "@": "Currency",
    $: "String",
    "^": "LongLong",
  };
  out.type = m[4] ?? (m[2] ? chars[m[2]] : "Variant");
  return out;
}

const X86_BYVAL_BYTES = {
  byte: 4,
  boolean: 4,
  integer: 4,
  long: 4,
  single: 4,
  longptr: 4,
  string: 4,
  object: 4,
  any: 4,
  double: 8,
  currency: 8,
  date: 8,
  longlong: 8,
  variant: 16,
  decimal: 16,
};

/**
 * The bytes a parameter takes on an x86 stack, or null when its type does not say (a structure
 * passed ByVal, or a type the package does not declare).
 *
 * @param {object} p  parseParam's
 * @param {{enums: Set<string>, aliases: Map<string, string>, types: Set<string>}} known
 */
export function x86ParamBytes(p, known) {
  if (!p.byVal || p.array || p.paramArray) return 4;
  let type = p.type.replace(/^.*\./, "").toLowerCase();
  for (let n = 0; known.aliases.has(type) && n < 8; n++) type = known.aliases.get(type);
  if (type in X86_BYVAL_BYTES) return X86_BYVAL_BYTES[type];
  if (known.enums.has(type)) return 4;
  return null;
}

/** The names the package declares, in lower case, for sizing parameters. */
export function knownTypes(parsed) {
  const enums = new Set();
  const types = new Set();
  const aliases = new Map(parsed.aliases.map((a) => [a.name.toLowerCase(), String(a.target).toLowerCase()]));
  for (const t of parsed.types) {
    if (t.kind === "enum") enums.add(t.name.toLowerCase());
    else if (t.kind === "type") types.add(t.name.toLowerCase());
    // A delegate is the address of a procedure: pointer-sized.
    for (const m of t.members ?? []) if (m.kind === "delegate") aliases.set(m.name.toLowerCase(), "longptr");
  }
  return { enums, types, aliases };
}

/** Where in the database an entry point is exported for an arch: [{file, ids}]. */
function exporters(db, entry, arch) {
  const out = [];
  for (const [file, k] of Object.entries(db.files)) {
    const ids = (k.exports[entry] ?? []).filter((i) => k.builds[i].arch === arch);
    if (ids.length) out.push({ file, ids });
  }
  return out;
}

/** An export by ordinal only whose decorated x86 symbol names the routine: "#n", or null. */
function ordinalFor(db, file, entry) {
  const k = db.files[file];
  for (const [key, symbol] of Object.entries(k?.symbols ?? {}))
    if (key.startsWith("#") && symbol.replace(/^[_@]/, "").replace(/@\d+$/, "") === entry) return key;
  return null;
}

/**
 * The findings for every Declare of a parsed package: [{module, name, line, arch, severity,
 * message}], severity "error" (a driver that calls it does not load, or the call goes wrong),
 * "warning" (it loads on some Windows versions only) or "unchecked".
 */
export function checkDeclares(parsed, db) {
  const known = knownTypes(parsed);
  const findings = [];
  for (const mod of parsed.types.filter((t) => t.kind === "module")) {
    for (const member of mod.members ?? []) {
      const d = declareParts(member.signature ?? "");
      if (!d) continue;
      const at = { module: mod.name, name: member.name, line: member.line };
      for (const arch of ARCHES) {
        const add = (severity, message) => findings.push({ ...at, arch, severity, message });
        const applies = evaluate(member.cond, constantsFor(arch));
        if (applies === false) continue;
        if (applies === null) {
          add("unchecked", `its #If condition, ${member.cond}, names a constant this tool does not know`);
          continue;
        }
        if (!d.lib) {
          add("unchecked", `its library is the constant ${d.libConst}`);
          continue;
        }
        const file = libFile(d.lib);
        const kernel = db.files[file];
        if (!kernel) {
          if (/\.(sys|exe)$/.test(file)) add("unchecked", `${d.lib} is not in the kernel database`);
          else add("error", `it names ${d.lib}, a user-mode DLL, which the kernel does not load for a driver`);
          continue;
        }
        const ids = kernel.builds.map((b, i) => (b.arch === arch ? i : -1)).filter((i) => i >= 0);
        if (!ids.length) {
          add("unchecked", `the kernel database has no ${arch} build of ${file}`);
          continue;
        }
        const entry = d.entry;
        const have = new Set(kernel.exports[entry] ?? []);
        const missing = ids.filter((i) => !have.has(i));
        let symbolFile = file;
        if (missing.length === ids.length) {
          const elsewhere = exporters(db, entry, arch).filter((e) => e.file !== file);
          // The x86 libraries name what an export by ordinal only is; the same ordinal with no
          // name in every build of this arch is taken for the same routine.
          const ordinal = ordinalFor(db, file, entry);
          const unnamed = ordinal && ids.every((i) => (kernel.exports[ordinal] ?? []).includes(i));
          if (elsewhere.length) {
            add("error", `${file} does not export ${entry}; ${elsewhere.map((e) => e.file).join(" and ")} does`);
            symbolFile = elsewhere[0].file;
          } else if (unnamed) {
            add(
              "error",
              `${file} exports ${entry} with no name, as ordinal ${ordinal.slice(1)}: the Declare needs Alias "${ordinal}"`,
            );
          } else {
            add("error", `${file} does not export ${entry}`);
            continue;
          }
        } else if (missing.length) {
          add(
            "warning",
            `${file} of ${missing.map((i) => buildLabel(kernel.builds[i])).join(", ")} does not export ${entry}`,
          );
        }
        if (arch !== "x86") continue;
        let symbol = db.files[symbolFile]?.symbols?.[entry];
        if (!symbol) {
          const ord = ordinalFor(db, symbolFile, entry);
          if (ord) symbol = db.files[symbolFile].symbols[ord];
        }
        if (!symbol) {
          add("unchecked", `the x86 libraries give no symbol for ${entry}, so its calling convention is not checked`);
          continue;
        }
        const { convention, argBytes } = x86Decoration(symbol);
        const declared = d.fastcall ? "fastcall" : d.cdecl ? "cdecl" : "stdcall";
        if (declared !== convention)
          add(
            "error",
            `the routine is __${convention} (${symbol}), the Declare ${
              declared === "stdcall"
                ? "has neither FastCall nor CDecl"
                : `says ${declared === "fastcall" ? "FastCall" : "CDecl"}`
            }`,
          );
        if (argBytes === null) continue;
        const params = d.params.map(parseParam);
        if (params.some((p) => p === null)) {
          add("unchecked", "a parameter could not be read, so its argument bytes are not checked");
          continue;
        }
        const sizes = params.map((p) => x86ParamBytes(p, known));
        if (sizes.some((s) => s === null)) {
          const which = params.filter((_, i) => sizes[i] === null).map((p) => `${p.name} As ${p.type}`);
          add(
            "unchecked",
            `the x86 size of ${which.join(", ")} passed ByVal is not known, so the argument bytes are not checked`,
          );
          continue;
        }
        const total = sizes.reduce((a, b) => a + b, 0);
        if (total !== argBytes)
          add(
            "error",
            `its parameters take ${total} bytes on the x86 stack, the routine takes ${argBytes} (${symbol})`,
          );
      }
    }
  }
  return findings;
}
