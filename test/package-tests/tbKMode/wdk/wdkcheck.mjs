// node test/package-tests/tbKMode/wdk/wdkcheck.mjs <Module> [--keep-going]
//
// Asks the WDK's headers about every Type, Enum member and Const of one tbKMode module, and writes
// the test fixtures that assert what they answer: Sources/<Fixture>LayoutTests.twin (each
// structure's size and each field's offset, in a 32-bit and a 64-bit build) and
// Sources/<Fixture>ValueTests.twin (each enumeration member's and constant's value).
//
// It reads the module's declarations from the API snapshot, indexer/snapshots/contributed/tbKMode/
// api.json, and <Module>.json beside this file says what the names alone cannot (see it). It
// generates a C++ program of __if_exists blocks, one line per item, builds it for x64 and x86 with
// the newest Visual Studio and WDK (msvc.mjs), drops each item the compiler refuses and builds
// again, then runs the two programs, which only print. Work files: %TEMP%\tbkmode-wdk\<Module>.
// Run from the repository's root; then run package-tests.bat tbKMode and read what fails.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { membersOf, typesOf } from "./api.mjs";
import { compile, wdkInclude, workDir } from "./msvc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [mod] = process.argv.slice(2);
if (!mod) {
  console.error("usage: node test/package-tests/tbKMode/wdk/wdkcheck.mjs <Module>");
  process.exit(2);
}
const cfgFile = path.join(here, `${mod}.json`);
if (!existsSync(cfgFile)) {
  console.error(`no ${cfgFile}`);
  process.exit(2);
}
// <Module>.json:
//   fixture     the fixtures' prefix: <fixture>LayoutTests, <fixture>ValueTests
//   headers     the headers the program includes (default fltKernel.h, which brings ntifs.h,
//               ntddk.h and wdm.h)
//   ctypes      { twinBASIC type: C++ type expression } for a type C names otherwise, such as
//               "decltype(static_cast<FLT_PARAMETERS*>(nullptr)->Create)" for a member of a union
//   fields      { "Type.twinBASICField": "CField" } where the names differ
//   skipType, skipField ("Type.Field"), skipName (an enum member or constant)
//   noSize      types whose size is not compared (variable-length in C: a structure ending in a
//               nested variable-length structure; one ending in an array is found by itself)
//   sizes       { type: { x64, x86 } } to assert instead of C's (a version the package chose)
//   values      { name: value } to assert instead of C's
const cfg = JSON.parse(readFileSync(cfgFile, "utf8"));
const set = (k) => new Set(cfg[k] ?? []);
const skipType = set("skipType"),
  skipField = set("skipField"),
  skipName = set("skipName"),
  noSize = set("noSize");
const ctypes = cfg.ctypes ?? {},
  fieldMap = cfg.fields ?? {},
  sizes = cfg.sizes ?? {},
  values = cfg.values ?? {};
const fixture = cfg.fixture;

// The module's public Types, Enums and Consts, from the indexer's snapshot (api.mjs). A private
// type cannot be named from the test project.
const ident = (s) => /^[A-Za-z_]\w*$/.test(s);
const types = new Map();
const enums = new Map();
for (const t of typesOf(mod).filter((t) => t.vis === "public")) {
  if (!ident(t.name) || skipType.has(t.name)) continue;
  if (t.kind === "type" && !types.has(t.name)) {
    const fields = new Map();
    for (const f of t.fields ?? [])
      if (ident(f.name) && !fields.has(f.name) && !skipField.has(`${t.name}.${f.name}`))
        fields.set(f.name, /^\w+\s*\(/.test(f.signature));
    types.set(t.name, fields);
  }
  if (t.kind === "enum" && !enums.has(t.name))
    enums.set(t.name, [...new Set((t.values ?? []).map((v) => v.name).filter((n) => ident(n) && !skipName.has(n)))]);
}
// A constant declared under #If is one member with a signature for each branch: kind "const" all
// the same.
const constMembers = membersOf(mod)
  .filter((m) => m.kind === "const" && m.vis === "public")
  .filter((m) => ident(m.name) && !skipName.has(m.name));
const consts = constMembers.map((m) => m.name);
// A constant the package declares as a string (its value a string literal, IMAGE_ARCHIVE_END) is a
// C string macro: the program prints its bytes, and the case compares the strings.
const isString = new Set(
  constMembers
    .filter((m) => [m.signature, ...(m.signatures ?? []).map((s) => s.signature)].some((s) => /=\s*"/.test(s ?? "")))
    .map((m) => m.name),
);

// One line of the program per item, so that a compile error names its item.
const cname = (t) => (ctypes[t] ? `C_${t}` : t);
const items = [];
for (const [t, fields] of types) {
  const ct = cname(t);
  // A type named like one of the headers' macros (GENERAL_LOOKASIDE_LAYOUT is a structure body in
  // wdm.h) would be expanded inside main, and the parse errors would run on into the next lines;
  // such a type has no C counterpart of that name. A mapped type (C_<name>) is our own typedef.
  const typeGuard = ctypes[t] ? [] : [t];
  items.push({
    key: `${t} size`,
    guard: typeGuard,
    code: `__if_exists(${ct}) { printf("${t} size %u\\n", (unsigned)sizeof(${ct})); }`,
  });
  for (const f of fields.keys()) {
    // A mapped C field may be a member of a named member (`Flags.AllFlags`): __if_exists and the
    // macro guard see its first name, offsetof the whole of it.
    const cf = fieldMap[`${t}.${f}`] ?? f;
    const first = cf.split(".")[0];
    // A field named like one of the headers' macros (the package's padding fields are named
    // POINTER_ALIGNMENT) would be expanded; such a field has no C counterpart.
    items.push({
      key: `${t}.${f}`,
      guard: [...typeGuard, first],
      code: `__if_exists(${ct}) { __if_exists(${ct}::${first}) { printf("${t}.${f} %u\\n", (unsigned)offsetof(${ct}, ${cf})); } }`,
    });
  }
}
for (const n of new Set([...[...enums.values()].flat(), ...consts])) items.push({ key: `=${n}`, name: n });

function program(excluded) {
  const head = [
    ...(cfg.headers ?? ["fltKernel.h"]).map((h) => `#include <${h}>`),
    "#include <stdio.h>",
    "#include <stddef.h>",
  ];
  for (const [t, expr] of Object.entries(ctypes)) head.push(`typedef ${expr} C_${t};`);
  head.push("int main() {");
  const lines = [...head];
  const lineOf = new Map();
  for (const it of items) {
    if (excluded.has(it.key)) continue;
    if (it.name && isString.has(it.name)) {
      // A string macro: its bytes in hex after a $, so that a space or a line break in it survives.
      lines.push(`#ifdef ${it.name}`);
      lineOf.set(lines.length + 1, it.key);
      lines.push(
        `{ const char *s = ${it.name}; printf("=${it.name} $"); for (; *s; s++) printf("%02X", (unsigned char)*s); printf("\\n"); }`,
        "#endif",
      );
    } else if (it.name) {
      // A macro is printed by #ifdef; an enumerator, which no #ifdef sees, by __if_exists.
      lines.push(`#ifdef ${it.name}`);
      lineOf.set(lines.length + 1, it.key);
      lines.push(`printf("=${it.name} %lld\\n", (long long)(${it.name}));`, "#else");
      lineOf.set(lines.length + 1, it.key);
      lines.push(`__if_exists(${it.name}) { printf("=${it.name} %lld\\n", (long long)(${it.name})); }`, "#endif");
    } else {
      for (const g of it.guard ?? []) lines.push(`#ifndef ${g}`);
      lineOf.set(lines.length + 1, it.key);
      lines.push(it.code);
      lines.push(...(it.guard ?? []).map(() => "#endif"));
    }
  }
  lines.push("return 0;", "}");
  return { text: `${lines.join("\n")}\n`, lineOf };
}

const dir = workDir(mod);
const excluded = new Set();
function run(arch) {
  for (let round = 0; round < 50; round++) {
    const { text, lineOf } = program(excluded);
    const src = path.join(dir, "check.cpp");
    writeFileSync(src, text);
    const exe = path.join(dir, `check-${arch}.exe`);
    const out = compile(arch, dir, src, exe);
    const bad = new Set();
    for (const m of out.matchAll(/check\.cpp\((\d+)\)\s*:\s*(?:fatal )?error/g))
      if (lineOf.has(Number(m[1]))) bad.add(lineOf.get(Number(m[1])));
    if (!bad.size) {
      if (/\berror\b/.test(out) || !existsSync(exe))
        throw new Error(`${arch}: the program did not build\n${out.slice(0, 3000)}`);
      return new Map(
        execFileSync(exe, { encoding: "utf8" })
          .split(/\r?\n/)
          .filter(Boolean)
          .map((l) => [l.slice(0, l.lastIndexOf(" ")), l.slice(l.lastIndexOf(" ") + 1)]),
      );
    }
    for (const b of bad) excluded.add(b);
  }
  throw new Error(`${arch}: still refused after 50 rounds`);
}
const res = { x64: run("x64"), x86: run("x86") };
for (const arch of ["x64", "x86"])
  writeFileSync(path.join(dir, `c-${arch}.txt`), [...res[arch]].map(([k, v]) => `${k} ${v}`).join("\n"));

// The fixtures.
const pair = (a, b, line) =>
  a === b
    ? `        ${line(a)}\n`
    : `        #If Win64 Then\n            ${line(a)}\n        #Else\n            ${line(b)}\n        #End If\n`;
const known = [...types.keys()].filter((t) => res.x64.has(`${t} size`) && res.x86.has(`${t} size`));
let lay = `[TestFixture]\nModule ${fixture}LayoutTests\n\n    ' Each structure's size and its fields' offsets, against the WDK's headers (${path.basename(wdkInclude())}).\n    ' Generated by wdk/wdkcheck.mjs ${mod}: do not edit, run it again.\n\n    Private Function Off(ByVal base As LongPtr, ByVal field As LongPtr) As Long\n        Off = CLng(field - base)\n    End Function\n`;
for (const t of known) {
  lay += `\n    [TestCase]\n    Public Sub ${t}_Layout()\n        Expect.Begin\n        Dim t As ${t}\n        Dim b As LongPtr = VarPtr(t)\n`;
  // A structure that ends in an array is variable-length in C, its last field declared with one
  // element; a fixed twinBASIC buffer makes it longer by design, so only its offsets are checked.
  const lastIsArray = [...types.get(t).values()].at(-1) === true;
  if (sizes[t]) lay += pair(sizes[t].x64, sizes[t].x86, (v) => `Expect.AreEqual ${v}, LenB(t), "LenB of ${t}"`);
  else if (lastIsArray || noSize.has(t)) lay += "        ' Variable-length in C: its size is not compared.\n";
  else
    lay += pair(
      res.x64.get(`${t} size`),
      res.x86.get(`${t} size`),
      (v) => `Expect.AreEqual ${v}, LenB(t), "LenB of ${t}"`,
    );
  for (const [f, isArray] of types.get(t)) {
    const k = `${t}.${f}`;
    if (!res.x64.has(k) || !res.x86.has(k)) continue;
    const ref = isArray ? `t.${f}(0)` : `t.${f}`;
    lay += pair(
      res.x64.get(k),
      res.x86.get(k),
      (v) => `Expect.AreEqual ${v}, Off(b, VarPtr(${ref})), "offset of ${t}.${f}"`,
    );
  }
  lay += "        Expect.Done\n    End Sub\n";
}
const lit = (v) => {
  const x = BigInt.asIntN(32, BigInt(v));
  return x < 0n ? `&H${(x & 0xffffffffn).toString(16).toUpperCase()}&` : x.toString();
};
// A value that fits neither a signed nor an unsigned 32-bit number.
const wide = (v) => {
  const x = BigInt(v);
  return x < -(2n ** 31n) || x > 2n ** 32n - 1n;
};
// A LongLong literal; a negative one in hex, since -9223372036854775808^ overflows before its sign.
const lit64 = (v) => {
  const x = BigInt.asIntN(64, BigInt(v));
  return x < 0n ? `&H${(x & 0xffffffffffffffffn).toString(16).toUpperCase()}^` : `${x}^`;
};
// A twinBASIC expression for the string the program printed as `$<hex bytes>`: printable runs in
// quotes, any other byte as Chr$(&H..), joined with &.
const strLit = (printed) => {
  const bytes = (printed.slice(1).match(/../g) ?? []).map((h) => Number.parseInt(h, 16));
  const parts = [];
  let run = "";
  for (const b of bytes) {
    if (b >= 0x20 && b < 0x7f) run += b === 0x22 ? '""' : String.fromCharCode(b);
    else {
      if (run) parts.push(`"${run}"`);
      run = "";
      parts.push(`Chr$(&H${b.toString(16).toUpperCase()})`);
    }
  }
  if (run || !parts.length) parts.push(`"${run}"`);
  return parts.join(" & ");
};
let val = `[TestFixture]\nModule ${fixture}ValueTests\n\n    ' Each enumeration member and constant against the WDK's value for it (${path.basename(wdkInclude())}).\n    ' Generated by wdk/wdkcheck.mjs ${mod}: do not edit, run it again.\n`;
const noValue = [];
for (const [g, names] of [...enums, ["Constants", consts]]) {
  const have = names.filter((n) => res.x64.has(`=${n}`) || n in values);
  noValue.push(...names.filter((n) => !have.includes(n)));
  if (!have.length) continue;
  val += `\n    [TestCase]\n    Public Sub ${g}_Values()\n        Expect.Begin\n`;
  // A constant whose value depends on the architecture (SECURITY_DESCRIPTOR_MIN_LENGTH) is
  // checked against the x86 value in a 32-bit build and the x64 value in a 64-bit one. One whose
  // value needs 64 bits (MAXINT64, MININT64) is compared as a LongLong: CLng of it overflows.
  for (const n of have) {
    if (isString.has(n)) {
      const s = (arch) => strLit(res[arch].get(`=${n}`) ?? res.x64.get(`=${n}`));
      val += pair(s("x64"), s("x86"), (v) => `Expect.AreEqual ${v}, ${n}, "${n}"`);
      continue;
    }
    const raw = (arch) => values[n] ?? res[arch].get(`=${n}`) ?? res.x64.get(`=${n}`);
    const isWide = wide(raw("x64")) || wide(raw("x86"));
    // A value that is 64-bit in one build and fits 32 bits in the other (IMAGE_ORDINAL_FLAG:
    // 0x8000000000000000 and 0x80000000) is, in the 32-bit build, the Long of those 32 bits, as
    // lit() reads any 32-bit value.
    const at = (arch) =>
      isWide ? lit64(wide(raw(arch)) ? raw(arch) : BigInt.asIntN(32, BigInt(raw(arch)))) : lit(raw(arch));
    val += pair(at("x64"), at("x86"), (v) => `Expect.AreEqual ${v}, ${isWide ? "CLngLng" : "CLng"}(${n}), "${n}"`);
  }
  val += "        Expect.Done\n    End Sub\n";
}
const sources = path.resolve(here, "..", "Sources");
writeFileSync(path.join(sources, `${fixture}LayoutTests.twin`), `${lay}\nEnd Module\n`.replace(/\n/g, "\r\n"));
writeFileSync(path.join(sources, `${fixture}ValueTests.twin`), `${val}\nEnd Module\n`.replace(/\n/g, "\r\n"));
const unknown = [...types.keys()].filter((t) => !known.includes(t));
writeFileSync(
  path.join(dir, "summary.json"),
  JSON.stringify({ known, unknown, noValue, excluded: [...excluded] }, null, 1),
);
console.log(
  `${mod}: ${known.length} types in the WDK, ${unknown.length} not; ${noValue.length} names with no value; ${excluded.size} items refused`,
);
console.log(`work files and summary.json: ${dir}`);
