// node test/package-tests/tbKMode/wdk/wdkcheck.mjs <Module>
//
// Writes the test fixtures that assert what the WDK's headers say about every Type, Enum member
// and Const of one tbKMode module: Sources/<Fixture>LayoutTests.twin (each structure's size and
// each field's offset, in a 32-bit and a 64-bit build) and Sources/<Fixture>ValueTests.twin (each
// enumeration member's and constant's value). twinBASIC's compiler is the authority on how it lays
// out a Type, so these cases are kept beside the verifier's own check, which works the layout out.
//
// It reads the module's declarations from the API snapshot, indexer/snapshots/contributed/tbKMode/
// api.json, what the WDK says from the verifier's database of the kit that decides (the first in
// verifier/config/wdk.json), and what the names alone cannot say from verifier/config/tbKMode.json
// (see it). It needs no compiler: `verify.mjs wdk` wrote the database. Run from the repository's
// root; then run package-tests.bat tbKMode and read what fails.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { constantsFor, evaluate } from "../verifier/lib/conditions.mjs";
import { cStructure, cValue, fieldAt } from "../verifier/lib/headers.mjs";
import { membersOf, typesOf } from "./api.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const verifier = path.resolve(here, "..", "verifier");
const [mod] = process.argv.slice(2);
if (!mod) {
  console.error("usage: node test/package-tests/tbKMode/wdk/wdkcheck.mjs <Module>");
  process.exit(2);
}
// verifier/config/tbKMode.json, for the whole package:
//   fixtures    { module: the fixtures' prefix }: <fixture>LayoutTests, <fixture>ValueTests
//   ctypes      { twinBASIC type: the C structure it is }, which may reach into one
//               ("FLT_PARAMETERS.Create", a member of a union)
//   fields      { "Type.twinBASICField": "CField" } where the names differ
//   skipType, skipField ("Type.Field"), skipName (an enum member or constant)
//   noSize      types whose size is not compared (variable-length in C: a structure ending in a
//               nested variable-length structure; one ending in an array is found by itself)
//   sizes       { type: { x64, x86 } } to assert instead of C's (a version the package chose)
//   values      { name: value } to assert instead of C's
const cfg = JSON.parse(readFileSync(path.join(verifier, "config", "tbKMode.json"), "utf8"));
const fixture = cfg.fixtures?.[mod];
if (!fixture) {
  console.error(`verifier/config/tbKMode.json names no fixture for ${mod}`);
  process.exit(2);
}
const set = (k) => new Set(cfg[k] ?? []);
const skipType = set("skipType"),
  skipField = set("skipField"),
  skipName = set("skipName"),
  noSize = set("noSize");
const ctypes = cfg.ctypes ?? {},
  fieldMap = cfg.fields ?? {},
  sizes = cfg.sizes ?? {},
  values = cfg.values ?? {};
const kit = JSON.parse(readFileSync(path.join(verifier, "config", "wdk.json"), "utf8")).kits[0].kit;
const db = JSON.parse(readFileSync(path.join(verifier, "db", `wdk-${kit}.json`), "utf8"));

// The module's public Types, Enums and Consts, from the indexer's snapshot (api.mjs). A private
// type cannot be named from the test project.
const ident = (s) => /^[A-Za-z_]\w*$/.test(s);
const types = new Map();
const enums = new Map();
for (const t of typesOf(mod).filter((t) => t.vis === "public")) {
  if (!ident(t.name) || skipType.has(t.name)) continue;
  if (t.kind === "type" && !types.has(t.name)) {
    const fields = new Map();
    // A field under an #If that holds in neither build (KUSER_SHARED_DATA's #Else of
    // `(TWINBASIC = 1) Or (Win64 = 1)`) is not in the Type; one that cannot be decided is kept.
    const never = (f) => ["x86", "x64"].every((a) => evaluate(f.cond, constantsFor(a)) === false);
    for (const f of t.fields ?? [])
      if (ident(f.name) && !fields.has(f.name) && !never(f) && !skipField.has(`${t.name}.${f.name}`))
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
// C string macro: the case compares the strings.
const isString = new Set(
  constMembers
    .filter((m) => [m.signature, ...(m.signatures ?? []).map((s) => s.signature)].some((s) => /=\s*"/.test(s ?? "")))
    .map((m) => m.name),
);
// A constant the package declares as a LongLong, for an arch: its value has a LongLong literal
// (&H0000000080000000^, or more than 8 hex digits), or names a constant of the module that is one
// (POOL_FLAG_UNUSED_REQUIRED_BITS). Its case compares it as a LongLong whatever C's value is:
// CLng of POOL_FLAG_REQUIRED_END, 2147483648, overflows.
const constByName = new Map(constMembers.map((m) => [m.name.toLowerCase(), m]));
const branchFor = (m, arch) => {
  const all = m.signature ? [{ cond: m.cond ?? null, signature: m.signature }] : (m.signatures ?? []);
  const x86 = (c) => /\bNot\s*\(?\s*Win64\b|\bWin64\s*=\s*0\b/i.test(c ?? "");
  const x64 = (c) => /\bWin64\b/i.test(c ?? "") && !x86(c);
  return all.find((b) => (arch === "x86" ? !x64(b.cond) : !x86(b.cond))) ?? all[0];
};
function pkgWide(name, arch, seen = new Set()) {
  const m = constByName.get(name.toLowerCase());
  if (!m || seen.has(m)) return false;
  seen.add(m);
  const v = /=\s*(.+)$/.exec(branchFor(m, arch)?.signature ?? "")?.[1] ?? "";
  if (/\bAs\s+LongLong\b/i.test(branchFor(m, arch)?.signature ?? "")) return true;
  if (/&H[0-9A-F]+\^|\b\d+\^|&H0*[1-9A-F][0-9A-F]{8,}\b/i.test(v)) return true;
  return [...v.matchAll(/\b[A-Za-z_]\w*\b/g)].some((t) => pkgWide(t[0], arch, seen));
}

// What the database says, as `<key> <value>` for each arch: "<Type> size", "<Type>.<field>" (an
// offset; a bitfield has none) and "=<name>" (a value; a string as $ and its bytes in hex).
function answers(arch) {
  const res = new Map();
  for (const [t, fields] of types) {
    const c = cStructure(db, ctypes[t] ?? t, arch);
    if (!c) continue;
    res.set(`${t} size`, String(c.size));
    for (const f of fields.keys()) {
      const cf = fieldAt(db, c, fieldMap[`${t}.${f}`] ?? f, arch);
      if (cf && cf.bits === undefined) res.set(`${t}.${f}`, String(cf.offset));
    }
  }
  for (const n of new Set([...[...enums.values()].flat(), ...consts])) {
    const v = cValue(db, n, arch);
    if (!v || v.value === null) continue;
    // A value as a signed 64-bit number, as the cases have always read the headers' values: an
    // unsigned 64-bit maximum (MAXSIZE_T on x64) is -1, and so a Long.
    if (v.kind === "s") res.set(`=${n}`, `$${Buffer.from(v.value, "latin1").toString("hex").toUpperCase()}`);
    else if (typeof v.value === "bigint") res.set(`=${n}`, String(BigInt.asIntN(64, v.value)));
  }
  return res;
}
const res = { x64: answers("x64"), x86: answers("x86") };

// The fixtures.
const pair = (a, b, line) =>
  a === b
    ? `        ${line(a)}\n`
    : `        #If Win64 Then\n            ${line(a)}\n        #Else\n            ${line(b)}\n        #End If\n`;
const known = [...types.keys()].filter((t) => res.x64.has(`${t} size`) && res.x86.has(`${t} size`));
let lay = `[TestFixture]\nModule ${fixture}LayoutTests\n\n    ' Each structure's size and its fields' offsets, against the WDK's headers (${kit}).\n    ' Generated by wdk/wdkcheck.mjs ${mod}: do not edit, run it again.\n\n    Private Function Off(ByVal base As LongPtr, ByVal field As LongPtr) As Long\n        Off = CLng(field - base)\n    End Function\n`;
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
// A twinBASIC expression for a string given as `$<hex bytes>`: printable runs in quotes, any other
// byte as Chr$(&H..), joined with &.
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
let val = `[TestFixture]\nModule ${fixture}ValueTests\n\n    ' Each enumeration member and constant against the WDK's value for it (${kit}).\n    ' Generated by wdk/wdkcheck.mjs ${mod}: do not edit, run it again.\n`;
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
    const isWide = wide(raw("x64")) || wide(raw("x86")) || pkgWide(n, "x64") || pkgWide(n, "x86");
    // A value that is 64-bit in one build and fits 32 bits in the other (IMAGE_ORDINAL_FLAG:
    // 0x8000000000000000 and 0x80000000) is, in the 32-bit build, the Long of those 32 bits, as
    // lit() reads any 32-bit value, unless the package declares it a LongLong there too.
    const at = (arch) =>
      isWide
        ? lit64(wide(raw(arch)) || pkgWide(n, arch) ? raw(arch) : BigInt.asIntN(32, BigInt(raw(arch))))
        : lit(raw(arch));
    val += pair(at("x64"), at("x86"), (v) => `Expect.AreEqual ${v}, ${isWide ? "CLngLng" : "CLng"}(${n}), "${n}"`);
  }
  val += "        Expect.Done\n    End Sub\n";
}
const sources = path.resolve(here, "..", "Sources");
writeFileSync(path.join(sources, `${fixture}LayoutTests.twin`), `${lay}\nEnd Module\n`.replace(/\n/g, "\r\n"));
writeFileSync(path.join(sources, `${fixture}ValueTests.twin`), `${val}\nEnd Module\n`.replace(/\n/g, "\r\n"));
const unknown = [...types.keys()].filter((t) => !known.includes(t));
console.log(
  `${mod}: ${known.length} types in the WDK ${kit}, ${unknown.length} not; ${noValue.length} names with no value`,
);
