// The verifier's self-test: its readers of PE files and import libraries, its #If evaluator, its
// Declare check and its driver check, on files and a package written here, and the update of its
// kernel database, which must fetch nothing when the database holds what the config names. No
// network, no install. Run it after changing the verifier (`node --test test/verifier.test.mjs` in its
// folder); it is
// in no gate of the documentation, since a contributed package's tools are run only when that
// package's section is updated.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { constantsFor, evaluate } from "../lib/conditions.mjs";
import { checkDeclares, libFile, parseParam, x86ParamBytes } from "../lib/declares.mjs";
import { importLibrary, x86Decoration } from "../lib/importlib.mjs";
import { checkDriver } from "../lib/imports.mjs";
import { kernelDatabaseText, updateKernelDatabase } from "../lib/kernels.mjs";
import { readPackage } from "../lib/package.mjs";
import { exportsOf, importsOf, peHeaders } from "../lib/pe.mjs";

const VERIFIER = path.join(import.meta.dirname, "..");

// ------------------------------------------------------------------ a PE file written here

/**
 * A minimal PE file: one section at RVA 0x1000 holding an export directory (named exports and
 * ordinal-only ones, from ordinal base 1) and an import directory.
 *
 * @param {{pe64: boolean, exports?: (string | null)[], dllName?: string, imports?: {dll: string, names: (string | number)[]}[]}} o
 *   exports: one entry per ordinal from 1, a name or null for an export by ordinal only;
 *   imports: per DLL, names, or numbers for imports by ordinal
 */
function makePe({ pe64, exports = [], dllName = "test.sys", imports = [] }) {
  const sec = Buffer.alloc(0x1000);
  const RVA = 0x1000;
  let at = 0;
  const put = (buf) => {
    const off = at;
    buf.copy(sec, at);
    at += buf.length;
    at = (at + 7) & ~7;
    return RVA + off;
  };
  const cstr = (s) => Buffer.from(`${s}\0`, "latin1");
  let exportDir = { rva: 0, size: 0 };
  if (exports.length) {
    const dir = at;
    at += 40;
    const nameRva = put(cstr(dllName));
    const functions = Buffer.alloc(4 * exports.length);
    for (let i = 0; i < exports.length; i++) functions.writeUInt32LE(0x1f00 + i, 4 * i);
    const named = exports.map((n, i) => [n, i]).filter(([n]) => n !== null);
    named.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const nameRvas = Buffer.alloc(4 * named.length);
    const ordinals = Buffer.alloc(2 * named.length);
    named.forEach(([n, i], k) => {
      nameRvas.writeUInt32LE(put(cstr(n)), 4 * k);
      ordinals.writeUInt16LE(i, 2 * k);
    });
    const fRva = put(functions);
    const nRva = put(nameRvas);
    const oRva = put(ordinals);
    sec.writeUInt32LE(nameRva, dir + 12);
    sec.writeUInt32LE(1, dir + 16);
    sec.writeUInt32LE(exports.length, dir + 20);
    sec.writeUInt32LE(named.length, dir + 24);
    sec.writeUInt32LE(fRva, dir + 28);
    sec.writeUInt32LE(nRva, dir + 32);
    sec.writeUInt32LE(oRva, dir + 36);
    exportDir = { rva: RVA + dir, size: at - dir };
  }
  let importDir = { rva: 0, size: 0 };
  if (imports.length) {
    const dir = at;
    at += 20 * (imports.length + 1);
    imports.forEach((imp, k) => {
      const width = pe64 ? 8 : 4;
      const thunks = Buffer.alloc(width * (imp.names.length + 1));
      imp.names.forEach((n, j) => {
        if (typeof n === "number") {
          if (pe64) thunks.writeBigUInt64LE((1n << 63n) | BigInt(n), width * j);
          else thunks.writeUInt32LE((0x80000000 | n) >>> 0, width * j);
        } else {
          const hint = put(Buffer.concat([Buffer.alloc(2), cstr(n)]));
          if (pe64) thunks.writeBigUInt64LE(BigInt(hint), width * j);
          else thunks.writeUInt32LE(hint, width * j);
        }
      });
      const tRva = put(thunks);
      const nRva = put(cstr(imp.dll));
      sec.writeUInt32LE(tRva, dir + 20 * k);
      sec.writeUInt32LE(nRva, dir + 20 * k + 12);
      sec.writeUInt32LE(tRva, dir + 20 * k + 16);
    });
    importDir = { rva: RVA + dir, size: 20 * (imports.length + 1) };
  }
  const optSize = pe64 ? 240 : 224;
  const head = Buffer.alloc(0x400);
  head.write("MZ", 0, "latin1");
  head.writeUInt32LE(0x40, 0x3c);
  head.writeUInt32LE(0x4550, 0x40);
  head.writeUInt16LE(pe64 ? 0x8664 : 0x14c, 0x44);
  head.writeUInt16LE(1, 0x46);
  head.writeUInt32LE(0x12345678, 0x48);
  head.writeUInt16LE(optSize, 0x54);
  const opt = 0x58;
  head.writeUInt16LE(pe64 ? 0x20b : 0x10b, opt);
  head.writeUInt32LE(0x2000, opt + 56);
  const dirs = opt + (pe64 ? 112 : 96);
  head.writeUInt32LE(exportDir.rva, dirs);
  head.writeUInt32LE(exportDir.size, dirs + 4);
  head.writeUInt32LE(importDir.rva, dirs + 8);
  head.writeUInt32LE(importDir.size, dirs + 12);
  const s = opt + optSize;
  head.write(".rdata", s, "latin1");
  head.writeUInt32LE(0x1000, s + 8);
  head.writeUInt32LE(RVA, s + 12);
  head.writeUInt32LE(0x1000, s + 16);
  head.writeUInt32LE(0x400, s + 20);
  return Buffer.concat([head, sec]);
}

/** An import library of short import objects: [{machine, dll, symbol, nameType, ordinal}]. */
function makeImportLibrary(objects) {
  const parts = [Buffer.from("!<arch>\n", "latin1")];
  for (const o of objects) {
    const strings = Buffer.from(`${o.symbol}\0${o.dll}\0`, "latin1");
    const data = Buffer.alloc(20 + strings.length);
    data.writeUInt16LE(0, 0);
    data.writeUInt16LE(0xffff, 2);
    data.writeUInt16LE(o.machine, 6);
    data.writeUInt32LE(strings.length, 12);
    data.writeUInt16LE(o.ordinal ?? 0, 16);
    const nameTypes = { ordinal: 0, name: 1, noprefix: 2, undecorate: 3 };
    data.writeUInt16LE((nameTypes[o.nameType] << 2) | 0, 18);
    strings.copy(data, 20);
    const header = Buffer.alloc(60, " ");
    header.write(`${o.dll}/`, 0, "latin1");
    header.write(String(data.length), 48, "latin1");
    header.write("`\n", 58, "latin1");
    parts.push(header, data);
    if (data.length & 1) parts.push(Buffer.from("\n"));
  }
  return Buffer.concat(parts);
}

// ------------------------------------------------------------------ the readers

test("pe.mjs reads a PE32+ file's machine, named and ordinal-only exports, and imports", () => {
  const b = makePe({
    pe64: true,
    exports: ["ZwClose", null, "KfRaiseIrql"],
    imports: [{ dll: "ntoskrnl.exe", names: ["ZwClose", 2] }],
  });
  const h = peHeaders(b);
  assert.equal(h.machine, "x64");
  assert.equal(h.timestamp, 0x12345678);
  assert.deepEqual(
    exportsOf(b).map((e) => [e.ordinal, e.name]),
    [
      [1, "ZwClose"],
      [2, null],
      [3, "KfRaiseIrql"],
    ],
  );
  assert.deepEqual(importsOf(b), [{ dll: "ntoskrnl.exe", names: ["ZwClose", "#2"] }]);
});

test("pe.mjs reads a PE32 file's imports, an ordinal import included", () => {
  const b = makePe({ pe64: false, imports: [{ dll: "hal.dll", names: ["KfRaiseIrql", 7] }] });
  assert.equal(peHeaders(b).machine, "x86");
  assert.deepEqual(importsOf(b), [{ dll: "hal.dll", names: ["KfRaiseIrql", "#7"] }]);
});

test("pe.mjs refuses a file that is not a PE file", () => {
  assert.throws(() => peHeaders(Buffer.from("not a PE file at all, not even close")), /not a PE file/);
});

test("importlib.mjs reads short import objects and their name types", () => {
  const lib = makeImportLibrary([
    { machine: 0x14c, dll: "hal.dll", symbol: "@KfRaiseIrql@4", nameType: "undecorate" },
    { machine: 0x14c, dll: "ntoskrnl.exe", symbol: "_ZwCreateUserProcess@44", nameType: "ordinal", ordinal: 2 },
    { machine: 0x14c, dll: "ntoskrnl.exe", symbol: "_DbgPrint", nameType: "noprefix" },
    { machine: 0x8664, dll: "ntoskrnl.exe", symbol: "ZwClose", nameType: "name" },
  ]);
  const objects = importLibrary(lib);
  assert.deepEqual(
    objects.map((o) => [o.machine, o.dll, o.name, o.ordinal]),
    [
      ["x86", "hal.dll", "KfRaiseIrql", null],
      ["x86", "ntoskrnl.exe", null, 2],
      ["x86", "ntoskrnl.exe", "DbgPrint", null],
      ["x64", "ntoskrnl.exe", "ZwClose", null],
    ],
  );
  assert.equal(importLibrary(Buffer.from("MZ not an archive")), null);
});

test("an x86 decorated symbol says the calling convention and the argument bytes", () => {
  assert.deepEqual(x86Decoration("@KfRaiseIrql@4"), { convention: "fastcall", argBytes: 4 });
  assert.deepEqual(x86Decoration("_ZwClose@4"), { convention: "stdcall", argBytes: 4 });
  assert.deepEqual(x86Decoration("_DbgPrint"), { convention: "cdecl", argBytes: null });
});

test("an #If condition is evaluated for each arch, and an unknown constant gives null", () => {
  const x86 = constantsFor("x86");
  const x64 = constantsFor("x64");
  assert.equal(evaluate(null, x86), true);
  assert.equal(evaluate("Win64", x86), false);
  assert.equal(evaluate("Win64", x64), true);
  assert.equal(evaluate("Not (Win64)", x86), true);
  assert.equal(evaluate("Win64 And VBA7", x64), true);
  assert.equal(evaluate("Win32 Or Win64", x86), true);
  assert.equal(evaluate("Win64 = False", x86), true);
  assert.equal(evaluate("DEBUG_BUILD", x64), null);
  assert.equal(evaluate("Win64 And (", x64), null);
});

test("a parameter is read, and its x86 stack size follows its type and how it is passed", () => {
  const known = {
    enums: new Set(["pool_type"]),
    types: new Set(["large_integer"]),
    aliases: new Map([["kirql", "byte"]]),
  };
  const size = (s) => x86ParamBytes(parseParam(s), known);
  assert.deepEqual(parseParam("Optional ByVal Count As Long = 0"), {
    byVal: true,
    optional: true,
    paramArray: false,
    array: false,
    name: "Count",
    type: "Long",
  });
  assert.equal(size("ByVal Handle As LongPtr"), 4);
  assert.equal(size("ByVal Irql As KIRQL"), 4);
  assert.equal(size("ByVal PoolType As POOL_TYPE"), 4);
  assert.equal(size("ByVal Flags As LongLong"), 8);
  assert.equal(size("ByVal v As Variant"), 16);
  assert.equal(size("Interval As LARGE_INTEGER"), 4);
  assert.equal(size("Buffer() As Byte"), 4);
  assert.equal(size("ByVal Interval As LARGE_INTEGER"), null);
  assert.equal(libFile("ntdll"), "ntdll.dll");
  assert.equal(libFile("Fltmgr.sys"), "fltmgr.sys");
});

// ------------------------------------------------------------------ the checks, on a small database

/** A kernel database written here: two x64 builds and the x86 libraries. */
function smallDatabase() {
  return {
    format: 2,
    comment: "",
    files: {
      "ntoskrnl.exe": {
        builds: [
          { source: "symbol", arch: "x64", windows: "Windows 10 22H2" },
          { source: "symbol", arch: "x64", windows: "Windows 11 23H2" },
          { source: "wdk", arch: "x86", wdk: "10.0.22621.5193" },
        ],
        absent: [],
        exports: {
          ExFreePool2: [1, 2],
          InterlockedIncrement: [2],
          ObCloseHandle: [0, 1, 2],
          ZwClose: [0, 1, 2],
          "#2": [0, 1, 2],
        },
        symbols: {
          ExFreePool2: "_ExFreePool2@16",
          InterlockedIncrement: "@InterlockedIncrement@4",
          ObCloseHandle: "_ObCloseHandle@8",
          ZwClose: "_ZwClose@4",
          "#2": "_ZwCreateUserProcess@44",
        },
      },
      "hal.dll": {
        builds: [
          { source: "symbol", arch: "x64", windows: "Windows 10 22H2" },
          { source: "wdk", arch: "x86", wdk: "10.0.22621.5193" },
        ],
        absent: ["Windows 11 23H2"],
        exports: { KfRaiseIrql: [1] },
        symbols: { KfRaiseIrql: "@KfRaiseIrql@4" },
      },
    },
  };
}

const PACKAGE = `Module modTest
    Public Declare PtrSafe Function ZwClose Lib "ntoskrnl.exe" (ByVal Handle As LongPtr) As Long
    Public Declare PtrSafe Function ObCloseHandle FastCall Lib "ntoskrnl.exe" (ByVal Handle As LongPtr, ByVal Mode As Byte) As Long
    Public Declare PtrSafe Sub ExFreePool2 Lib "ntoskrnl.exe" (ByVal P As LongPtr, ByVal Tag As Long, ByVal Ext As LongPtr)
    Public Declare PtrSafe Function KfRaiseIrql FastCall Lib "ntoskrnl.exe" (ByVal NewIrql As Byte) As Byte
    Public Declare PtrSafe Function ZwCreateUserProcess Lib "ntoskrnl.exe" (ByRef a As LongPtr) As Long
    Public Declare PtrSafe Function RtlUniform Lib "ntoskrnl.exe" (Seed As Long) As Long
    Public Declare PtrSafe Function RtlDuplicateUnicodeString Lib "ntdll" (ByVal Flags As Long) As Long
#If Win64 = False Then
    Public Declare PtrSafe Function InterlockedIncrement Lib "ntoskrnl.exe" (Addend As Long) As Long
#End If
End Module
`;

function withPackage(source, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "tbkmode-verifier-test-"));
  try {
    writeFileSync(path.join(dir, "modTest.twin"), source, "utf8");
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("check reports each Declare's export, convention and argument bytes, per arch", () => {
  const findings = withPackage(PACKAGE, (dir) => checkDeclares(readPackage(dir), smallDatabase()));
  const got = (name) =>
    findings
      .filter((f) => f.name === name)
      .map((f) => `${f.arch} ${f.severity}: ${f.message}`)
      .sort();
  assert.deepEqual(got("ZwClose"), []);
  assert.deepEqual(got("ObCloseHandle"), [
    "x86 error: the routine is __stdcall (_ObCloseHandle@8), the Declare says FastCall",
  ]);
  assert.deepEqual(got("ExFreePool2"), [
    "x64 warning: ntoskrnl.exe of Windows 10 22H2 does not export ExFreePool2",
    "x86 error: its parameters take 12 bytes on the x86 stack, the routine takes 16 (_ExFreePool2@16)",
  ]);
  // hal.dll exports it on x86 only, in this database.
  assert.deepEqual(got("KfRaiseIrql"), [
    "x64 error: ntoskrnl.exe does not export KfRaiseIrql",
    "x86 error: ntoskrnl.exe does not export KfRaiseIrql; hal.dll does",
  ]);
  assert.deepEqual(got("ZwCreateUserProcess"), [
    'x64 error: ntoskrnl.exe exports ZwCreateUserProcess with no name, as ordinal 2: the Declare needs Alias "#2"',
    "x86 error: its parameters take 4 bytes on the x86 stack, the routine takes 44 (_ZwCreateUserProcess@44)",
    'x86 error: ntoskrnl.exe exports ZwCreateUserProcess with no name, as ordinal 2: the Declare needs Alias "#2"',
  ]);
  assert.deepEqual(got("RtlUniform"), [
    "x64 error: ntoskrnl.exe does not export RtlUniform",
    "x86 error: ntoskrnl.exe does not export RtlUniform",
  ]);
  assert.deepEqual(got("RtlDuplicateUnicodeString"), [
    "x64 error: it names ntdll, a user-mode DLL, which the kernel does not load for a driver",
    "x86 error: it names ntdll, a user-mode DLL, which the kernel does not load for a driver",
  ]);
  // Compiled for x86 only, by its #If.
  assert.deepEqual(got("InterlockedIncrement"), [
    "x86 error: the routine is __fastcall (@InterlockedIncrement@4), the Declare has neither FastCall nor CDecl",
  ]);
});

test("a driver's imports are judged per arch: user-mode DLLs, exports some builds lack, and absent builds", () => {
  const db = smallDatabase();
  const x64 = checkDriver(
    makePe({
      pe64: true,
      imports: [
        { dll: "ntoskrnl.exe", names: ["ZwClose", "ExFreePool2", 2] },
        { dll: "hal.dll", names: ["KfRaiseIrql"] },
      ],
    }),
    db,
  );
  assert.equal(x64.pass, false);
  assert.deepEqual(x64.problems, [
    "ntoskrnl.exe of Windows 10 22H2 exports no ExFreePool2",
    "hal.dll exports no KfRaiseIrql",
  ]);
  assert.deepEqual(x64.unchecked, ["hal.dll: the database has no build of Windows 11 23H2"]);
  const x86 = checkDriver(
    makePe({
      pe64: false,
      imports: [
        { dll: "USER32.dll", names: ["MessageBoxW"] },
        { dll: "hal.dll", names: ["KfRaiseIrql"] },
      ],
    }),
    db,
  );
  assert.deepEqual(x86.problems, ["imports from USER32.dll, which the kernel does not load for a driver: MessageBoxW"]);
  const fine = checkDriver(makePe({ pe64: true, imports: [{ dll: "ntoskrnl.exe", names: ["ZwClose", 2] }] }), db);
  assert.equal(fine.pass, true);
});

// ------------------------------------------------------------------ the committed database

test("the committed database is written as kernelDatabaseText writes it, and parses to itself", () => {
  const text = readFileSync(path.join(VERIFIER, "db", "kernels.json"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(kernelDatabaseText(JSON.parse(text)), text);
});

test("updating a database that holds what the config names fetches nothing and changes nothing", async () => {
  const config = JSON.parse(readFileSync(path.join(VERIFIER, "config", "kernels.json"), "utf8"));
  const text = readFileSync(path.join(VERIFIER, "db", "kernels.json"), "utf8").replace(/\r\n/g, "\n");
  const saved = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("the update fetched");
  };
  try {
    const db = await updateKernelDatabase(config, JSON.parse(text), {
      cache: path.join(tmpdir(), "tbkmode-verifier-none"),
    });
    assert.equal(kernelDatabaseText(db), text);
  } finally {
    globalThis.fetch = saved;
  }
});
