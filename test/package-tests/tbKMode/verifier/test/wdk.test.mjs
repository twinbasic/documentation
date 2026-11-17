// The self-test of the verifier's WDK parts: reading preprocessed headers (cdecl.mjs) and an MSI
// database's compound file (msi.mjs), #Const and comparisons in #If (conditions.mjs), twinBASIC's
// layout of a Type (tblayout.mjs), the check against a WDK database (headers.mjs), and the committed
// databases' form. No compiler, no network: `wdk`, which writes the databases with Visual Studio, is
// tested by its output. Run with verifier.test.mjs (see README.md).
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { memberPaths, readDeclarations, readMacros, tokenize } from "../lib/cdecl.mjs";
import { constantsFor, evaluate, fileConstants } from "../lib/conditions.mjs";
import { checkHeaders, kindSize } from "../lib/headers.mjs";
import { decodeStreamName, msiFilePaths, readCompoundFile } from "../lib/msi.mjs";
import { readPackage } from "../lib/package.mjs";
import { evalExpr, layoutOf, packageModel } from "../lib/tblayout.mjs";
import { wdkDatabaseText } from "../lib/wdkdb.mjs";

const VERIFIER = path.join(import.meta.dirname, "..");

function withPackage(source, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "tbkmode-verifier-test-"));
  try {
    writeFileSync(path.join(dir, "modTest.twin"), source, "utf8");
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ cdecl.mjs

const PREPROCESSED = `#define A 0x10 // for the documentation
#define F(x) ((x)+1)
#define LONGER \\
   (A + 1)
#undef GONE
typedef struct _S {
  int a;
  union { short b; long c; };
  struct { char d; } e;
  unsigned f : 3;
  wchar_t g[(4 * sizeof(wchar_t)) / sizeof(wchar_t)];
  void (__stdcall *cb)(int);
} S, *PS;
typedef struct { int x; } T;
enum _E { E1 = 1, E2 };
typedef enum _E E;
extern "C" {
__declspec(dllimport) long __stdcall Fn(int *p, char c);
__forceinline int Inl(void) { return 1; }
}
typedef long (__stdcall *PFN)(int);
typedef unsigned long ULONG;
`;

test("cdecl.mjs reads macros, without their comments, and keeps directives out of the tokens", () => {
  const m = readMacros(PREPROCESSED);
  assert.equal(m.objects.get("A"), "0x10");
  assert.equal(m.objects.get("LONGER"), "(A + 1)");
  assert.ok(m.functions.has("F"));
  const toks = tokenize(PREPROCESSED);
  assert.ok(!toks.includes("define") && !toks.includes("LONGER"));
});

test("cdecl.mjs reads structures, their members as paths, enums, typedefs and functions", () => {
  const d = readDeclarations(tokenize(PREPROCESSED));
  const s = d.structs.find((x) => x.name === "_S");
  assert.deepEqual(
    memberPaths(s.members).map((p) => `${p.path}${p.bits ? ":" : ""}${p.array ? "[]" : ""}`),
    ["a", "b", "c", "e", "e.d", "f:", "g[]", "cb"],
  );
  assert.ok(d.structs.some((x) => x.name === "T" && x.tag === null));
  assert.equal(d.aliases.get("S"), "_S");
  assert.equal(d.aliases.get("E"), "_E");
  assert.ok(!d.aliases.has("PS"));
  assert.ok(d.typedefs.has("ULONG"));
  assert.deepEqual(d.enums.find((e) => e.tag === "_E").names, ["E1", "E2"]);
  assert.deepEqual(d.functions.get("Fn"), { import: true, inline: false });
  assert.deepEqual(d.functions.get("Inl"), { import: false, inline: true });
  assert.ok(!d.functions.has("PFN"));
});

// ------------------------------------------------------------------ msi.mjs

/** A compound file of one stream of 4096 bytes, so that it is in the FAT, not the mini stream. */
function makeCompoundFile(name, data) {
  const END = 0xfffffffe;
  const b = Buffer.alloc(512 * 11);
  b.writeUInt32LE(0xe011cfd0, 0);
  b.writeUInt32LE(0xe11ab1a1, 4);
  b.writeUInt16LE(0x3e, 24);
  b.writeUInt16LE(3, 26);
  b.writeUInt16LE(0xfffe, 28);
  b.writeUInt16LE(9, 30);
  b.writeUInt16LE(6, 32);
  b.writeUInt32LE(1, 44);
  b.writeUInt32LE(1, 48);
  b.writeUInt32LE(4096, 56);
  b.writeUInt32LE(END, 60);
  b.writeUInt32LE(END, 68);
  for (let i = 0; i < 109; i++) b.writeUInt32LE(i === 0 ? 0 : 0xffffffff, 76 + 4 * i);
  const sector = (n) => 512 * (n + 1);
  // FAT: sector 0 the FAT, 1 the directory, 2..9 the stream.
  const fat = [0xfffffffd, END, 3, 4, 5, 6, 7, 8, 9, END];
  for (let i = 0; i < 128; i++) b.writeUInt32LE(fat[i] ?? 0xffffffff, sector(0) + 4 * i);
  const entry = (k, n, type, start, size, child) => {
    const off = sector(1) + 128 * k;
    b.write(n, off, "utf16le");
    b.writeUInt16LE(2 * (n.length + 1), off + 64);
    b[off + 66] = type;
    b.writeUInt32LE(0xffffffff, off + 68);
    b.writeUInt32LE(0xffffffff, off + 72);
    b.writeUInt32LE(child, off + 76);
    b.writeUInt32LE(start, off + 116);
    b.writeBigUInt64LE(BigInt(size), off + 120);
  };
  entry(0, "Root Entry", 5, END, 0, 1);
  entry(1, name, 2, 2, data.length, 0xffffffff);
  data.copy(b, sector(2));
  return b;
}

test("msi.mjs reads a compound file's streams and decodes an MSI stream name", () => {
  const data = Buffer.alloc(4096, 0x41);
  data.write("first", 0);
  // "!File" as Windows Installer packs it: the table mark, then "Fi" and "le" two to a character.
  const MIME = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz._";
  const pair = (a, b) => String.fromCharCode(0x3800 + MIME.indexOf(a) + (MIME.indexOf(b) << 6));
  const encoded = `${String.fromCharCode(0x4840)}${pair("F", "i")}${pair("l", "e")}`;
  assert.equal(decodeStreamName(encoded), "!File");
  const streams = readCompoundFile(makeCompoundFile(encoded, data));
  assert.equal(streams.get(encoded).toString("latin1", 0, 5), "first");
  assert.equal(streams.get(encoded).length, 4096);
});

test("msi.mjs gives each file of the File table the path its Component's Directory names", () => {
  const tables = {
    Directory: [
      { Directory: "TARGETDIR", Directory_Parent: null, DefaultDir: "SourceDir" },
      { Directory: "kits", Directory_Parent: "TARGETDIR", DefaultDir: "WINDOW~1|Windows Kits" },
      { Directory: "inc", Directory_Parent: "kits", DefaultDir: "Include" },
      { Directory: "same", Directory_Parent: "inc", DefaultDir: "." },
    ],
    Component: [
      { Component: "c1", Directory_: "inc" },
      { Component: "c2", Directory_: "same" },
    ],
    File: [
      { File: "fil1", Component_: "c1", FileName: "wdm.h" },
      { File: "fil2", Component_: "c2", FileName: "NTIFS~1.H|ntifs.h" },
    ],
  };
  const paths = msiFilePaths({ table: (n) => tables[n] });
  assert.equal(paths.get("fil1"), "Windows Kits/Include/wdm.h");
  assert.equal(paths.get("fil2"), "Windows Kits/Include/ntifs.h");
});

// ------------------------------------------------------------------ conditions.mjs

test("an #If condition names a file's #Const constants, compares them, and an undefined one is Empty", () => {
  const defines = fileConstants(
    "#Const NTDDI_WIN10 = &H0A000000\r\n'#Const FLT_MGR_WIN8 = 1\r\n#Const NTDDI_VERSION = NTDDI_WIN10 + 1\r\n",
  );
  assert.deepEqual(
    defines.map((d) => d.name),
    ["NTDDI_WIN10", "NTDDI_VERSION"],
  );
  const c = constantsFor("x64", defines);
  assert.equal(evaluate("NTDDI_VERSION >= NTDDI_WIN10", c), true);
  assert.equal(evaluate("NTDDI_VERSION < NTDDI_WIN10", c), false);
  assert.equal(evaluate("FLT_MGR_WIN8", c), false);
  assert.equal(evaluate("Win64 = 0", c), false);
  assert.equal(evaluate("FLT_MGR_WIN8", constantsFor("x64")), null);
});

// ------------------------------------------------------------------ tblayout.mjs

const LAYOUT = `Module modTest
#Const FLAG = 0
Public Const N As Long = 3
Public Enum E
    A = 2
    B
End Enum
#If Win64 Then
Public Type P
    x As LongLong
End Type
#Else
Public Type P
    x As Long
End Type
#End If
#If Win64 = 0 Then
[PackingAlignment(2)]
#End If
Public Type Q
    a As Byte
    b As Long
    c(N) As Integer
    d(0 To B - 1) As Byte
    #If FLAG Then
    e As Long
    #End If
    f As P
    s As String * 3
    g(LenB(Of Long)) As Byte
End Type
End Module
`;

test("a Type is laid out per arch: its #If, its Type's #If, packing under #If, bounds and sizes", () => {
  withPackage(LAYOUT, (dir) => {
    const model = packageModel(readPackage(dir));
    const at = (arch) => {
      const l = layoutOf("Q", arch, model);
      assert.equal(l.error, undefined, l.error);
      return [l.size, ...l.fields.map((f) => `${f.name}@${f.offset}+${f.size}`)].join(" ");
    };
    assert.equal(at("x86"), "34 a@0+1 b@2+4 c@6+8 d@14+3 f@18+4 s@22+6 g@28+5");
    assert.equal(at("x64"), "48 a@0+1 b@4+4 c@8+8 d@16+3 f@24+8 s@32+6 g@38+5");
  });
});

test("a twinBASIC literal is as wide as its type", () => {
  const model = { consts: new Map(), aliases: new Map(), types: new Map(), enums: new Map(), pointers: new Set() };
  assert.equal(evalExpr("&HFFFF", "x86", model), -1n);
  assert.equal(evalExpr("&HFFFF&", "x86", model), 65535n);
  assert.equal(evalExpr("&H80000000", "x86", model), -2147483648n);
  assert.equal(evalExpr("&HFFFFFFFFFFFFFFFF^", "x86", model), -1n);
  assert.equal(evalExpr("(1 << 4) + 2 * 3", "x86", model), 22n);
  // A shift keeps its left operand's width: an Integer shifted by 24 is 0.
  assert.equal(evalExpr("(&Hff << 24)", "x86", model), 0n);
  assert.equal(evalExpr("(&Hff& << 24)", "x86", model), -16777216n);
});

// ------------------------------------------------------------------ headers.mjs

const CHECKED = `Module modTest
Public Type S
    a As Long
    b As LongPtr
    c As Integer
End Type
Public Const K As Long = 5
Public Const STR As String = "ab"
Public Declare PtrSafe Function Fn Lib "ntoskrnl.exe" (ByVal x As Long, y As Long) As Long
Public Declare PtrSafe Sub Gn Lib "ntoskrnl.exe" (ByVal p As LongPtr)
Public Declare PtrSafe Function Hn Lib "ntoskrnl.exe" () As Long
End Module
`;

function smallWdk(k) {
  return {
    types: {
      _S: {
        x86: [
          12,
          4,
          [
            ["a", 0, "u4"],
            ["b", 4, "p4"],
            ["c", 8, "u4"],
          ],
        ],
        x64: [
          24,
          8,
          [
            ["a", 0, "u4"],
            ["b", 8, "p8"],
            ["c", 16, "u2"],
          ],
        ],
      },
    },
    aliases: { S: "_S" },
    enums: {},
    values: { K: `i4 ${k}`, STR: "s 6162" },
    functions: {
      Fn: { x86: "stdcall i4 u4 u4", x64: "x64 i4 u4 p8" },
      Gn: { x86: "stdcall v0 p4", x64: "x64 v0 p8" },
      Hn: { x86: "stdcall u1", x64: "x64 u1" },
    },
    macros: [],
  };
}

test("the header check compares layouts, values and prototypes, the first kit deciding", () => {
  const findings = withPackage(CHECKED, (dir) =>
    checkHeaders(readPackage(dir), [
      { kit: "first", db: smallWdk(5) },
      { kit: "second", db: smallWdk(6) },
    ]),
  );
  const got = findings
    .filter((f) => f.severity !== "unchecked")
    .map((f) => `${f.name} ${f.arch} ${f.severity}: ${f.message}`)
    .sort();
  assert.deepEqual(got, [
    "Fn x86 error: parameter 2 (y) is passed ByRef, an address; the WDK's Fn takes a 4-byte unsigned integer there",
    "Hn x64 error: it returns Long, 4 bytes; the WDK's Hn returns a 1-byte unsigned integer: the bytes past the first 1 are not set",
    "Hn x86 error: it returns Long, 4 bytes; the WDK's Hn returns a 1-byte unsigned integer: the bytes past the first 1 are not set",
    "K x64 note: the WDK second: K is 5, the WDK's 6",
    "K x86 note: the WDK second: K is 5, the WDK's 6",
    "S x86 error: c takes 2 bytes, the WDK's S.c (a 4-byte unsigned integer) 4",
  ]);
});

test("a database kind gives its size", () => {
  assert.equal(kindSize("i4"), 4);
  assert.equal(kindSize("a4:u2"), 8);
  assert.equal(kindSize("s16:_LIST_ENTRY"), 16);
  assert.equal(kindSize("a0:s8:_X"), 0);
});

// ------------------------------------------------------------------ the committed databases

test("each kit config/wdk.json names has a committed database, written as wdkDatabaseText writes it", () => {
  const config = JSON.parse(readFileSync(path.join(VERIFIER, "config", "wdk.json"), "utf8"));
  for (const k of config.kits) {
    const text = readFileSync(path.join(VERIFIER, "db", `wdk-${k.kit}.json`), "utf8").replace(/\r\n/g, "\n");
    const db = JSON.parse(text);
    assert.equal(db.kit, k.kit);
    assert.equal(wdkDatabaseText(db), text);
    // A structure every kit has, on both arches.
    assert.equal(db.aliases.IRP, "_IRP");
    assert.deepEqual([db.types._IRP.x86[0], db.types._IRP.x64[0]], [112, 208]);
  }
});
