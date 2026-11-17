// The WDK database (db/wdk-<kit>.json): what one kit's headers declare, for x86 and x64, so that
// `check` can compare a package with it on a machine with neither Visual Studio nor the WDK.
//
// It is written by `verify.mjs wdk` on a machine with Visual Studio, once for each kit: the
// headers are preprocessed (cl /EP), cdecl.mjs reads from that what they name (structures and
// their members, typedefs, enumerations, functions) and from the headers' own text their macros,
// and a generated program asks the
// compiler what each one is: a structure's size and alignment, each member's offset and kind, a
// bitfield's bits, each enumerator's and numeric macro's value, each function's calling convention
// and parameters. The program is built in parts against one precompiled header; a line the compiler
// refuses is dropped and its part built again, so a name cdecl.mjs read wrongly costs nothing. The
// program is a user-mode console program that includes the kernel headers for their types and only
// prints: no driver is built or loaded.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fetchBundlePackage, filesUnder } from "./burn.mjs";
import { memberPaths, readDeclarations, readMacros, tokenize } from "./cdecl.mjs";
import { msiFilePaths, readMsi } from "./msi.mjs";
import { inMsvc, KITS } from "./msvc.mjs";

export const WDK_FORMAT = 2;
export const WDK_ARCHES = ["x86", "x64"];

/**
 * The include folders of a kit: `{km, shared, ucrt}`. `shared` and `ucrt` are the Windows SDK's of
 * the same version, which must be installed. `km` is the installed WDK's, or, for a kit that is not
 * installed and names a `bundle`, its package of headers and libraries, fetched and read as data
 * (never installed): its CABs hold each file under its key in the package's database, which gives
 * the path.
 */
export async function kitIncludes(kit, cache, log = () => {}) {
  const installed = path.join(KITS, "Include", kit.kit);
  const shared = path.join(installed, "shared");
  const ucrt = path.join(installed, "ucrt");
  if (!existsSync(path.join(shared, "ntdef.h")))
    throw new Error(`no ${path.join(shared, "ntdef.h")}: install the Windows SDK ${kit.kit}`);
  const km = path.join(installed, "km");
  if (existsSync(path.join(km, "wdm.h"))) return { km, shared, ucrt };
  if (!kit.bundle) throw new Error(`no ${path.join(km, "wdm.h")}: install the WDK ${kit.kit}, or name its bundle`);
  // The folder `kernels` keeps this package in for its import libraries.
  const work = path.join(cache, `wdk-${kit.version}-x86`);
  const root = path.join(work, "include");
  const marker = path.join(root, "km", "wdm.h");
  if (!existsSync(marker)) {
    log(`WDK ${kit.version} headers`);
    const { dirs, msi } = await fetchBundlePackage(kit.bundle, kit.package, work, (x) => log(`  ${x}`), {
      withMsi: true,
    });
    const paths = msiFilePaths(readMsi(readFileSync(msi)));
    const prefix = `Windows Kits/10/Include/${kit.kit}/`;
    let n = 0;
    for (const f of filesUnder(dirs)) {
      const rel = paths.get(path.basename(f));
      if (!rel?.startsWith(prefix)) continue;
      const to = path.join(root, ...rel.slice(prefix.length).split("/"));
      mkdirSync(path.dirname(to), { recursive: true });
      copyFileSync(f, to);
      n++;
    }
    if (!existsSync(marker)) throw new Error(`the package ${kit.package} has no km/wdm.h for ${kit.kit}`);
    log(`  ${n} headers`);
  }
  return { km: path.join(root, "km"), shared, ucrt };
}

/**
 * The compiler's options for one arch and kit. On x86 a driver is built with /Gz, __stdcall by
 * default, which the headers rely on: most routines are declared with no convention.
 */
function options(arch, inc) {
  const defs = arch === "x64" ? "/D_AMD64_ /D_WIN64" : "/D_X86_ /Gz";
  const incs = [inc.km, inc.shared, inc.ucrt].map((d) => `/I"${d}"`).join(" ");
  return `/nologo /W0 /EHsc /std:c++17 /bigobj ${defs} /D_WIN32_WINNT=0x0A00 ${incs}`;
}

// The program's own header: what it prints, and how.
//   S <type> <size> <align>
//   F <type> <path> <offset> <kind>
//   B <type> <path> <first bit> <bits> <kind>
//   T <typedef> <kind>
//   V <name> <kind> <value>        (a string's value is its bytes in hex)
//   P <name> <convention> <return kind> <parameter kinds...> [...]
// A kind is i<n> or u<n> (an integer of n bytes, signed or not), f<n>, p<n>><kind> (a pointer to a
// kind: p8>s16:_UNICODE_STRING, p8>p8>s336:_DEVICE_OBJECT, p8>v0), p<n> (a pointer to a member),
// e<n>:<enum>, s<n>:<struct>, U<n>:<union>, s?:<struct> or U?:<union> (one the headers only name),
// a<count>:<element kind>, F (a function, the kind a pointer to one points to), or v0 (void).
const PRELUDE = String.raw`
#include <stdio.h>
#include <string.h>
#include <stddef.h>
#include <stdint.h>
#include <type_traits>
#include <typeinfo>
static void tb_name(const char* n) {
  const char* s = strchr(n, ' ');
  for (s = s ? s + 1 : n; *s; s++) putchar(*s == ' ' ? '~' : *s);
}
// A type is complete when sizeof can be taken of it: a structure the headers only name
// (struct _EPROCESS) is not, and neither sizeof nor typeid may be asked of it.
template<class T, class = void> struct tb_complete : std::false_type {};
template<class T> struct tb_complete<T, std::void_t<decltype(sizeof(T))>> : std::true_type {};
// The name of an incomplete type, from the signature MSVC gives this function: typeid needs a
// complete one. "void __cdecl tb_tname<struct _EPROCESS>(void)" prints _EPROCESS. The signature is
// read once: each use of __FUNCSIG__ is a string of its own.
template<class T> void tb_tname() {
  const char* f = __FUNCSIG__;
  const char* s = strchr(f, '<') + 1;
  const char* e = strrchr(f, '>');
  const char* sp = strchr(s, ' ');
  if (sp && sp < e) s = sp + 1;
  for (; s < e; s++) putchar(*s == ' ' ? '~' : *s);
}
template<class T> void tb_kind() {
  using U = std::remove_cv_t<T>;
  if constexpr (std::is_void_v<U>) printf("v0");
  else if constexpr (std::is_function_v<U>) printf("F");
  else if constexpr (std::is_array_v<U> && std::extent_v<U> == 0) { printf("a0:"); tb_kind<std::remove_extent_t<U>>(); }
  else if constexpr (!tb_complete<U>::value) { printf(std::is_union_v<U> ? "U?:" : "s?:"); tb_tname<U>(); }
  else if constexpr (std::is_array_v<U>) {
    using E = std::remove_all_extents_t<U>;
    printf("a%u:", (unsigned)(sizeof(U) / sizeof(E)));
    tb_kind<E>();
  }
  else if constexpr (std::is_pointer_v<U>) { printf("p%u>", (unsigned)sizeof(U)); tb_kind<std::remove_pointer_t<U>>(); }
  else if constexpr (std::is_member_pointer_v<U> || std::is_null_pointer_v<U>) printf("p%u", (unsigned)sizeof(U));
  else if constexpr (std::is_floating_point_v<U>) printf("f%u", (unsigned)sizeof(U));
  else if constexpr (std::is_enum_v<U>) { printf("e%u:", (unsigned)sizeof(U)); tb_name(typeid(U).name()); }
  else if constexpr (std::is_integral_v<U>) printf("%c%u", std::is_signed_v<U> ? 'i' : 'u', (unsigned)sizeof(U));
  else if constexpr (std::is_union_v<U>) { printf("U%u:", (unsigned)sizeof(U)); tb_name(typeid(U).name()); }
  else if constexpr (std::is_class_v<U>) { printf("s%u:", (unsigned)sizeof(U)); tb_name(typeid(U).name()); }
  else printf("?%u", (unsigned)sizeof(U));
}
template<class T> void tb_typedef(const char* n) {
  if constexpr (std::is_class_v<T> || std::is_union_v<T> || std::is_enum_v<T>) {
    printf("T %s ", n); tb_kind<T>(); printf("\n");
  }
}
static void tb_bits(const void* p, size_t size, const char* t, const char* path) {
  const unsigned char* b = (const unsigned char*)p;
  long first = -1, last = -1;
  for (size_t i = 0; i < size * 8; i++)
    if (b[i / 8] >> (i % 8) & 1) { if (first < 0) first = (long)i; last = (long)i; }
  printf("B %s %s %ld %ld ", t, path, first, last - first + 1);
}
template<class T> void tb_value(const char* n, const T& v) {
  using U = std::remove_cv_t<T>;
  if constexpr (std::is_array_v<U>) {
    using E = std::remove_cv_t<std::remove_all_extents_t<U>>;
    if constexpr (std::is_same_v<E, char>) {
      printf("V %s s ", n);
      for (const char* s = v; *s; s++) printf("%02X", (unsigned char)*s);
      printf("\n");
    } else if constexpr (std::is_same_v<E, wchar_t>) {
      printf("V %s w ", n);
      for (const wchar_t* s = v; *s; s++) printf("%04X", (unsigned)*s);
      printf("\n");
    }
  }
  else if constexpr (std::is_enum_v<U>) { printf("V %s ", n); tb_kind<U>(); printf(" %lld\n", (long long)v); }
  else if constexpr (std::is_integral_v<U>) {
    printf("V %s ", n); tb_kind<U>();
    if constexpr (std::is_signed_v<U>) printf(" %lld\n", (long long)v); else printf(" %llu\n", (unsigned long long)v);
  }
  else if constexpr (std::is_pointer_v<U>) { printf("V %s ", n); tb_kind<U>(); printf(" %llu\n", (unsigned long long)(uintptr_t)v); }
  else if constexpr (std::is_floating_point_v<U>) { printf("V %s ", n); tb_kind<U>(); printf(" %.17g\n", (double)v); }
}
// A value is a number, an enumerator or a string, and a constant expression: a macro that names a
// function, or reads a variable the kernel exports, is refused on its own line (the assertion is
// outside any template, so each use reports it), never linked. A string is taken as it is.
#define TB_VALUE(N, X) { using tb_T = std::remove_cv_t<std::remove_reference_t<decltype((X))>>; \
  static_assert(std::is_arithmetic_v<tb_T> || std::is_enum_v<tb_T> || std::is_array_v<tb_T>, "not a value"); \
  if constexpr (std::is_array_v<tb_T>) tb_value(N, X); else { constexpr tb_T tb_v = (X); tb_value(N, tb_v); } }
template<class F> struct tb_sig { static void go(const char*) {} };
#define TB_SIG(CC, NAME) \
  template<class R, class... A> struct tb_sig<R CC (A...)> { static void go(const char* n) { \
    printf("P %s " NAME " ", n); tb_kind<R>(); ((printf(" "), tb_kind<A>()), ...); printf("\n"); } };
#define TB_VSIG(CC, NAME) \
  template<class R, class... A> struct tb_sig<R CC (A..., ...)> { static void go(const char* n) { \
    printf("P %s " NAME " ", n); tb_kind<R>(); ((printf(" "), tb_kind<A>()), ...); printf(" ...\n"); } };
#ifdef _M_IX86
TB_SIG(__cdecl, "cdecl") TB_SIG(__stdcall, "stdcall") TB_SIG(__fastcall, "fastcall") TB_VSIG(__cdecl, "cdecl")
#else
TB_SIG(, "x64") TB_VSIG(, "x64")
#endif
`;

const ID = /[A-Za-z_]\w*/g;

/** A macro's body that may be a value: not empty, its brackets balanced, no statement or declaration. */
function maybeValue(body) {
  if (
    !body ||
    /[{};#]|\b(?:__declspec|__pragma|_Pragma|typedef|struct|union|enum|static|extern|inline|__inline|__forceinline|return|__asm|__if_exists|__if_not_exists|do|while|for|if|goto)\b/.test(
      body,
    )
  )
    return false;
  let d = 0;
  for (const c of body) {
    if (c === "(") d++;
    else if (c === ")" && --d < 0) return false;
  }
  return d === 0;
}

/**
 * The program's items for one arch: `[{key, code}]`, each one line of C++ (with the lines that
 * hide a macro of the same name as a name it uses).
 */
function programItems(decls, macros) {
  const isMacro = (n) => macros.objects.has(n) || macros.functions.has(n);
  const guarded = (code, keep) => {
    const hide = [...new Set(code.replace(/"[^"]*"/g, "").match(ID) ?? [])].filter((n) => n !== keep && isMacro(n));
    return [
      ...hide.flatMap((n) => [`#pragma push_macro("${n}")`, `#undef ${n}`]),
      code,
      ...hide.reverse().map((n) => `#pragma pop_macro("${n}")`),
    ];
  };
  const items = [];
  for (const s of decls.structs) {
    // A tagged structure by its tag, elaborated, so that a function of the same name does not hide it.
    const ct = s.tag ? `${s.kind} ${s.tag}` : s.name;
    items.push({
      key: `S ${s.name}`,
      lines: guarded(`printf("S ${s.name} %u %u\\n", (unsigned)sizeof(${ct}), (unsigned)alignof(${ct}));`),
    });
    for (const p of memberPaths(s.members)) {
      const type = `decltype(((${ct}*)nullptr)->${p.cpath})`;
      const code = p.bits
        ? `{ static ${ct} t_; memset(&t_, 0, sizeof t_); t_.${p.cpath} = (${type})~0ull; tb_bits(&t_, sizeof t_, "${s.name}", "${p.path}"); tb_kind<${type}>(); printf("\\n"); }`
        : `{ printf("F ${s.name} ${p.path} %u ", (unsigned)offsetof(${ct}, ${p.cpath})); tb_kind<${type}>(); printf("\\n"); }`;
      items.push({ key: `F ${s.name} ${p.path}`, lines: guarded(code) });
    }
  }
  for (const t of decls.typedefs) items.push({ key: `T ${t}`, lines: guarded(`tb_typedef<${t}>("${t}");`) });
  const valueNames = new Set();
  for (const e of decls.enums) for (const n of e.names) valueNames.add(n);
  for (const [n, body] of macros.objects) if (maybeValue(body)) valueNames.add(n);
  for (const n of valueNames) {
    // A macro is printed by #ifdef, an enumerator, which no #ifdef sees, by __if_exists. A name
    // may be both: an enumerator that a header also #defines on a branch it does not take
    // (NonPagedPool).
    const lines = [
      `#ifdef ${n}`,
      `TB_VALUE("${n}", ${n})`,
      "#else",
      `__if_exists(${n}) { TB_VALUE("${n}", ${n}) }`,
      "#endif",
    ];
    items.push({ key: `V ${n}`, lines });
  }
  for (const n of decls.functions.keys())
    items.push({ key: `P ${n}`, lines: guarded(`__if_exists(${n}) { tb_sig<decltype(${n})>::go("${n}"); }`) });
  return items;
}

/**
 * Builds the program from its items in parts and runs it; returns its output and the items the
 * compiler refused. Each part is a function of its own file, compiled against the precompiled
 * header; a part with errors loses the items its error lines name and is compiled again.
 */
function runProgram(arch, inc, headers, items, dir, log) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const opts = options(arch, inc);
  writeFileSync(path.join(dir, "probe.h"), `${headers.map((h) => `#include <${h}>`).join("\n")}\n${PRELUDE}`);
  writeFileSync(path.join(dir, "pch.cpp"), '#include "probe.h"\n');
  const pch = inMsvc(arch, dir, `cl ${opts} /c /Yc"probe.h" /Fp"probe.pch" pch.cpp`);
  if (!pch.ok) throw new Error(`${arch}: the headers do not compile\n${pch.output.slice(0, 3000)}`);
  // A refused item costs the compiler about five errors, and it stops at 100: small parts keep
  // each round's refusals under that.
  const PART = 100;
  const parts = [];
  for (let i = 0; i < items.length; i += PART) parts.push(items.slice(i, i + PART));
  const refused = [];
  const lineMaps = [];
  const writePart = (k) => {
    const lines = ['#include "probe.h"', `void tb_part${k}() {`];
    const map = new Map();
    for (const it of parts[k]) {
      for (const l of it.lines) {
        map.set(lines.length + 1, it.key);
        lines.push(l);
      }
    }
    lines.push("}");
    writeFileSync(path.join(dir, `part${k}.cpp`), `${lines.join("\n")}\n`);
    lineMaps[k] = map;
  };
  let dirty = parts.map((_, k) => k);
  for (const k of dirty) writePart(k);
  for (let round = 1; dirty.length; round++) {
    if (round > 30) throw new Error(`${arch}: parts still refused after 30 rounds`);
    // cl /MP compiles the parts at once; the command line is kept short with a response file.
    writeFileSync(path.join(dir, "parts.rsp"), dirty.map((k) => `part${k}.cpp`).join("\n"));
    const r = inMsvc(arch, dir, `cl ${opts} /MP /c /Yu"probe.h" /Fp"probe.pch" @parts.rsp`);
    const bad = new Map();
    for (const m of r.output.matchAll(/part(\d+)\.cpp\((\d+)\)/g)) {
      const k = Number(m[1]);
      const key = lineMaps[k]?.get(Number(m[2]));
      if (key === undefined) continue;
      if (!bad.has(k)) bad.set(k, new Set());
      bad.get(k).add(key);
    }
    // An error inside probe.h's templates is reported against probe.h, with a note naming the
    // part's line: with /W0 a part is named only for an error, so a part named is a part refused.
    const failed = [...bad.keys()];
    if (!r.ok && !failed.length)
      throw new Error(`${arch}: the parts did not compile, and no error names a line\n${r.output.slice(0, 3000)}`);
    for (const k of failed) {
      const keys = bad.get(k) ?? new Set();
      refused.push(...keys);
      parts[k] = parts[k].filter((it) => !keys.has(it.key));
      writePart(k);
    }
    log(
      `  ${arch} round ${round}: ${dirty.length} parts, ${failed.length} refused ${[...bad.values()].reduce((n, s) => n + s.size, 0)} items`,
    );
    dirty = failed;
  }
  writeFileSync(
    path.join(dir, "main.cpp"),
    `${parts.map((_, k) => `void tb_part${k}();`).join("\n")}\nint __cdecl main() {\n${parts.map((_, k) => `  tb_part${k}();`).join("\n")}\n  return 0;\n}\n`,
  );
  const objs = parts.map((_, k) => `part${k}.obj`).join("\n");
  writeFileSync(path.join(dir, "link.rsp"), `main.cpp\npch.obj\n${objs}`);
  const link = inMsvc(arch, dir, `cl ${opts} /Fe"probe.exe" @link.rsp`);
  if (!link.ok || !existsSync(path.join(dir, "probe.exe")))
    throw new Error(`${arch}: the program did not link\n${link.output.slice(0, 3000)}`);
  const output = execFileSync(path.join(dir, "probe.exe"), { encoding: "latin1", maxBuffer: 1 << 30 });
  return { output, refused };
}

/** One arch's database part: what the program printed, read into objects. */
function readOutput(output) {
  const types = new Map();
  const typedefs = new Map();
  const values = new Map();
  const functions = new Map();
  const typeOf = (n) => {
    if (!types.has(n)) types.set(n, { size: null, align: null, fields: [] });
    return types.get(n);
  };
  for (const line of output.split(/\r?\n/)) {
    const w = line.split(" ");
    switch (w[0]) {
      case "S": {
        const t = typeOf(w[1]);
        t.size = Number(w[2]);
        t.align = Number(w[3]);
        break;
      }
      case "F":
        typeOf(w[1]).fields.push([w[2], Number(w[3]), w[4]]);
        break;
      case "B":
        typeOf(w[1]).fields.push([w[2], `b${w[3]}+${w[4]}`, w[5]]);
        break;
      case "T":
        typedefs.set(w[1], w[2]);
        break;
      case "V":
        values.set(w[1], `${w[2]} ${w[3]}`);
        break;
      case "P":
        functions.set(w[1], w.slice(2).join(" "));
        break;
    }
  }
  return { types, typedefs, values, functions };
}

/**
 * The database of one kit: for each arch, its headers preprocessed, read, and asked of the
 * compiler. `work` is a folder for the work files, which are kept for reading.
 */
export async function buildKitDatabase(kit, headers, { cache, work, log = () => {} }) {
  const inc = await kitIncludes(kit, cache, log);
  const perArch = {};
  const decls = {};
  const macroNames = new Set();
  for (const arch of WDK_ARCHES) {
    const dir = path.join(work, kit.kit, arch);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "pp.cpp"), `${headers.map((h) => `#include <${h}>`).join("\n")}\n`);
    const pp = inMsvc(arch, dir, `cl ${options(arch, inc)} /EP /showIncludes pp.cpp > pp.txt 2> includes.txt`);
    if (!pp.ok) throw new Error(`${arch}: the headers do not preprocess\n${pp.output.slice(0, 3000)}`);
    const text = readFileSync(path.join(dir, "pp.txt"), "latin1");
    // The macros, from the #define lines of every header the program includes, which
    // /showIncludes lists: cl /d1PP, which keeps the definitions in its output, loses the name of
    // one whose comment goes on to the next line. A name defined only on a branch the headers do
    // not take is found too; the program's #ifdef leaves it out.
    const included = [
      ...new Set(
        readFileSync(path.join(dir, "includes.txt"), "latin1")
          .split(/\r?\n/)
          .map((l) => /([A-Za-z]:\\[^\r\n]*?\.(?:h|hpp|inl))\s*$/i.exec(l)?.[1])
          .filter(Boolean),
      ),
    ];
    if (!included.length) throw new Error(`${arch}: /showIncludes listed no header`);
    const macros = readMacros(included.map((f) => readFileSync(f, "latin1")).join("\n"), { union: true });
    const d = readDeclarations(tokenize(text));
    decls[arch] = d;
    for (const n of macros.functions) macroNames.add(n);
    log(
      `${kit.kit} ${arch}: ${d.structs.length} structures, ${d.enums.length} enumerations, ${d.functions.size} functions, ${macros.objects.size} macros`,
    );
    const items = programItems(d, macros);
    const { output, refused } = runProgram(arch, inc, headers, items, path.join(dir, "probe"), log);
    writeFileSync(path.join(dir, "refused.txt"), `${refused.join("\n")}\n`);
    perArch[arch] = readOutput(output);
    // A macro that renames a function (ExInterlockedAddUlong is ExfInterlockedAddUlong on x86):
    // `=<function>`.
    const fns = perArch[arch].functions;
    for (const [n, body] of macros.objects)
      if (!fns.has(n) && /^[A-Za-z_]\w*$/.test(body) && fns.has(body) && !fns.get(body).startsWith("="))
        fns.set(n, `=${body}`);
    log(`${kit.kit} ${arch}: ${items.length} items, ${refused.length} refused`);
  }
  return encodeKit(kit, headers, perArch, decls, macroNames);
}

/** The arches' records of one name: one value when they agree, else one for each arch. */
function merged(get) {
  const v = Object.fromEntries(WDK_ARCHES.map((a) => [a, get(a)]).filter(([, x]) => x !== undefined));
  const vals = Object.values(v);
  if (!vals.length) return undefined;
  if (vals.length === WDK_ARCHES.length && vals.every((x) => JSON.stringify(x) === JSON.stringify(vals[0])))
    return vals[0];
  return v;
}

const sorted = (it) => [...new Set(it)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

function encodeKit(kit, headers, perArch, decls, macroNames) {
  const types = {};
  for (const n of sorted(WDK_ARCHES.flatMap((a) => [...perArch[a].types.keys()]))) {
    types[n] = Object.fromEntries(
      WDK_ARCHES.filter((a) => perArch[a].types.get(n)?.size != null).map((a) => {
        const t = perArch[a].types.get(n);
        return [a, [t.size, t.align, t.fields]];
      }),
    );
  }
  // A typedef that names a structure, union or enumeration by its tag, from the headers' text,
  // and those the compiler named; one for each arch where they differ (IMAGE_OPTIONAL_HEADER is
  // the 32-bit structure on x86 and IMAGE_OPTIONAL_HEADER64 on x64).
  const aliasOf = Object.fromEntries(WDK_ARCHES.map((a) => [a, new Map()]));
  for (const a of WDK_ARCHES) {
    for (const [n, kind] of perArch[a].typedefs) aliasOf[a].set(n, kind.slice(kind.indexOf(":") + 1));
    for (const [n, tag] of decls[a].aliases) if (!aliasOf[a].has(n)) aliasOf[a].set(n, tag);
  }
  const aliases = {};
  for (const n of sorted(WDK_ARCHES.flatMap((a) => [...aliasOf[a].keys()])))
    aliases[n] = merged((a) => aliasOf[a].get(n));
  const enums = {};
  for (const a of WDK_ARCHES) for (const e of decls[a].enums) if (e.tag) enums[e.tag] ??= e.names;
  const values = {};
  for (const n of sorted(WDK_ARCHES.flatMap((a) => [...perArch[a].values.keys()])))
    values[n] = merged((a) => perArch[a].values.get(n));
  const functions = {};
  for (const n of sorted(WDK_ARCHES.flatMap((a) => [...perArch[a].functions.keys()]))) {
    const flags = WDK_ARCHES.map((a) => decls[a].functions.get(n)).find(Boolean) ?? {};
    functions[n] = {
      ...(flags.import ? { import: true } : {}),
      ...(flags.inline ? { inline: true } : {}),
      ...Object.fromEntries(WDK_ARCHES.map((a) => [a, perArch[a].functions.get(n)]).filter(([, x]) => x)),
    };
  }
  return {
    format: WDK_FORMAT,
    comment: WDK_COMMENT,
    kit: kit.kit,
    ...(kit.version ? { version: kit.version } : {}),
    headers,
    types: Object.fromEntries(
      Object.keys(types)
        .sort()
        .map((k) => [k, types[k]]),
    ),
    aliases,
    enums: Object.fromEntries(
      Object.keys(enums)
        .sort()
        .map((k) => [k, enums[k]]),
    ),
    values,
    functions,
    macros: sorted(macroNames),
  };
}

const WDK_COMMENT =
  "What one WDK's headers declare, for x86 and x64, as the Visual C++ compiler reads them (written by verify.mjs wdk). `types`: each structure and union by its tag (or typedef name, for one with no tag), for each arch [size, alignment, fields]; a field is [path, offset, kind], a member of a named member as `name.member`, an anonymous member's members by name; a bitfield's offset is `b<first bit>+<bits>`. A kind is i<n> or u<n> (an integer of n bytes, signed or not), f<n> (floating point), p<n>><kind> (a pointer of n bytes to that kind: p8>s16:_UNICODE_STRING, p8>p8>s336:_DEVICE_OBJECT, p8>v0), p<n> (a pointer to a member), e<n>:<enum>, s<n>:<struct>, U<n>:<union>, s?:<struct> or U?:<union> (one the headers name but do not define), a<count>:<element kind>, F (a function), v0 (void); a name's spaces are written ~. `aliases`: typedef names of structures, unions and enumerations, to their tags, one for both arches or one for each. `enums`: each enumeration's members. `values`: each enumerator and numeric or string macro, `<kind> <value>` (a string's bytes in hex, `s` for char and `w` for wchar_t), one value for both arches or one for each. `functions`: each function's convention and kinds, return first (`x64` on x64, where there is one convention; `...` a variable argument list), `import` when the headers declare it dllimport, `inline` when they define it. `macros`: the function-like macros, which have no value.";

/** The database as JSON with one entry to a line, so that a change reads as a short diff. */
export function wdkDatabaseText(db) {
  const out = ["{"];
  const head = ["format", "comment", "kit", "version", "headers"].filter((k) => k in db);
  for (const k of head) out.push(`${JSON.stringify(k)}: ${JSON.stringify(db[k])},`);
  const sections = ["types", "aliases", "enums", "values", "functions"];
  for (const s of sections) {
    const entries = Object.entries(db[s]);
    out.push(`${JSON.stringify(s)}: {`);
    entries.forEach(([k, v], i) => {
      if (s === "types") {
        const arches = Object.entries(v);
        out.push(`${JSON.stringify(k)}: {`);
        for (const [j, [a, x]] of arches.entries())
          out.push(`  ${JSON.stringify(a)}: ${JSON.stringify(x)}${j < arches.length - 1 ? "," : ""}`);
        out.push(`}${i < entries.length - 1 ? "," : ""}`);
      } else out.push(`${JSON.stringify(k)}: ${JSON.stringify(v)}${i < entries.length - 1 ? "," : ""}`);
    });
    out.push("},");
  }
  out.push(`"macros": ${JSON.stringify(db.macros)}`);
  out.push("}");
  return `${out.join("\n")}\n`;
}
