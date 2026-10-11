// Unit tests for the package indexer (indexer/lib/): the VB6 preprocessing, the
// reading of a package's files, the api.json model built from them, and the
// differ that compares two api.json files.
//
// The indexer's one stated promise is that a snapshot changes only when the API
// does. Everything here is a case where that fails quietly if a rule stops
// working: a snapshot that depends on the order files were read in, on the locale
// it was sorted in, or on a type character a name was written with; a nested type
// diffed as another type of the same name; a VB6 file named `Unnamed`; a
// package's embedded copy of another package read as its own.
//
// No network, no IDE, no git, and no twinBASIC install: the inputs are hand-made
// sources, small api.json objects, and indexer/sample.twinpack, which the
// repository carries. The scanner underneath, scripts/lib/twin-api.mjs, has its
// own probes in scripts/check_symbol_index.mjs; the indexer's command line is
// covered by scripts/check_cli.mjs.
//
// Runs with a bare `node --test test/indexer.test.mjs`.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { importProject } from "../scripts/impexp.mjs";
import { API_FORMAT, buildApi, qualified, renderApi } from "../indexer/lib/api-model.mjs";
import { compareInstallManifest } from "../indexer/lib/builtin-sync.mjs";
import { auditCoverage, diffApi, flattenSymbols } from "../indexer/lib/differ.mjs";
import { readPackageFiles } from "../indexer/lib/package-files.mjs";
import { apiHeadOf, copyToSnapshots, manifestPath, storeStatus } from "../indexer/lib/store.mjs";
import { CONTAINER_MAP, preprocessVB6 } from "../indexer/lib/vb6-preprocess.mjs";

const SAMPLE = path.join(import.meta.dirname, "../indexer/sample.twinpack");
const tmp = mkdtempSync(path.join(tmpdir(), "indexer-test-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const lines = (...l) => l.join("\n");
const file = (relativePath, text) => ({ relativePath, content: Buffer.from(text, "utf-8") });
const names = (list) => list.map((x) => x.name);

// ------------------------------------------------------------ VB6 preprocessing

describe("preprocessVB6", () => {
  test("a .bas file becomes a Module named by its VB_Name, with its Attribute lines gone", () => {
    const r = preprocessVB6(
      lines(
        'Attribute VB_Name = "Strings"',
        "Option Explicit",
        "Public Function Hello$() As String",
        'Attribute Hello.VB_Description = "greets"',
        "End Function",
      ).replaceAll("\n", "\r\n"),
      ".bas",
      "NotThisName",
    );
    assert.equal(r.name, "Strings");
    assert.equal(r.lineOffset, 1);
    assert.equal(
      r.content,
      lines("Module Strings", "Option Explicit", "Public Function Hello$() As String", "End Function", "End Module"),
    );
  });

  test("a .cls file drops its VERSION line, its Begin...End block and its header Attribute lines", () => {
    const r = preprocessVB6(
      lines(
        "VERSION 1.0 CLASS",
        "BEGIN",
        "  MultiUse = -1  'True",
        "END",
        'Attribute VB_Name = "Thing"',
        "Attribute VB_GlobalNameSpace = False",
        "Attribute VB_Exposed = True",
        "Public Value As Long",
      ),
      ".cls",
      "thing_file",
    );
    assert.equal(r.name, "Thing");
    assert.equal(r.lineOffset, 7);
    assert.equal(r.content, lines("Class Thing", "Public Value As Long", "End Class"));
  });

  test("a form's nested Begin...End blocks are skipped by depth", () => {
    const r = preprocessVB6(
      lines(
        "VERSION 5.00",
        "Begin VB.Form Form1",
        '   Caption = "x"',
        "   Begin VB.CommandButton Command1",
        '      Caption = "y"',
        "   End",
        "End",
        'Attribute VB_Name = "Form1"',
        "Private Sub Form_Load()",
        "End Sub",
      ),
      ".frm",
    );
    assert.equal(r.name, "Form1");
    assert.equal(r.content, lines("Class Form1", "Private Sub Form_Load()", "End Sub", "End Class"));
  });

  test("the extension picks the container, in any case: .bas is a Module, the rest are Classes", () => {
    assert.deepEqual(CONTAINER_MAP, {
      ".bas": "Module",
      ".cls": "Class",
      ".frm": "Class",
      ".dsr": "Class",
      ".ctl": "Class",
    });
    for (const [ext, kind] of Object.entries(CONTAINER_MAP)) {
      for (const e of [ext, ext.toUpperCase()]) {
        assert.ok(preprocessVB6('Attribute VB_Name = "N"', e).content.startsWith(`${kind} N\n`), e);
      }
    }
  });

  test("a file with no live VB_Name is named by its file, and by Unnamed only with no file name either", () => {
    // Community NewTabCtl's subclass/mBSSubclass.bas: commented out whole, VB_Name included.
    const commented = lines('\' Attribute VB_Name = "mBSSubclass"', "'Option Explicit", "'Public Sub S()", "'End Sub");
    const r = preprocessVB6(commented, ".bas", "mBSSubclass");
    assert.equal(r.name, "mBSSubclass");
    assert.ok(r.content.startsWith("Module mBSSubclass\n"));
    assert.equal(preprocessVB6(commented, ".bas").name, "Unnamed");
    assert.equal(preprocessVB6("Public X As Long", ".cls", "").name, "Unnamed");
  });

  test("a byte order mark and CRLF line ends do not reach the output or hide the header", () => {
    const r = preprocessVB6(
      `\u{FEFF}${lines("VERSION 1.0 CLASS", 'Attribute VB_Name = "Bom"', "Public A As Long").replaceAll("\n", "\r\n")}`,
      ".cls",
    );
    assert.equal(r.name, "Bom");
    assert.equal(r.content, lines("Class Bom", "Public A As Long", "End Class"));
  });
});

// ------------------------------------------------------------ package files

describe("readPackageFiles", () => {
  test("reads indexer/sample.twinpack: its files, in code-unit order, as Buffers", () => {
    const files = readPackageFiles(readFileSync(SAMPLE));
    const paths = files.map((f) => f.relativePath);
    assert.equal(files.length, 22);
    assert.deepEqual(
      paths,
      [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    );
    assert.ok(files.every((f) => Buffer.isBuffer(f.content)));
    assert.ok(paths.includes("Settings"));
    assert.ok(paths.includes("Sources/WaynesButton.twin"));
    assert.ok(paths.includes("Resources/MANIFEST/#1.xml"));
    assert.equal(paths.filter((p) => /^Sources\/.*\.twin$/.test(p)).length, 9);
    assert.match(files.find((f) => f.relativePath === "Settings").content.toString(), /"project\.name"/);
  });

  test("leaves out whatever is under Packages, and orders by code unit, not by locale", () => {
    const dir = path.join(tmp, "packed-tree");
    const put = (rel, text) => {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), text);
    };
    put("Settings", '{"project.name": "Host"}');
    for (const f of ["Z", "_x", "a", "B"]) put(`Sources/${f}.twin`, `Module ${f.replace("_", "U")}\nEnd Module\n`);
    put("Packages/Dep/Settings", '{"project.name": "Dep"}');
    put("Packages/Dep/Sources/D.twin", "Module D\nEnd Module\n");
    const project = path.join(tmp, "host.twinproj");
    importProject(project, dir);

    const paths = readPackageFiles(readFileSync(project)).map((f) => f.relativePath);
    // Code-unit order puts B and Z before _x before a; a locale compare would not.
    assert.deepEqual(paths, ["Settings", "Sources/B.twin", "Sources/Z.twin", "Sources/_x.twin", "Sources/a.twin"]);
  });
});

// ------------------------------------------------------------ the api.json model

describe("buildApi on a hand-made package", () => {
  const SOURCE = lines(
    "Public Module Zeta",
    "    Public Enum Colours",
    "        Red = 1",
    "        Blue = 2",
    "        Alpha",
    "    End Enum",
    "    Public Type Pt",
    "        Y As Long",
    "        X As Long",
    "        Count&",
    "        Public Sub Reset()",
    "        End Sub",
    "    End Type",
    "    Public Sub b()",
    "    End Sub",
    "    Public Sub B()",
    "    End Sub",
    "    Public Function Command$() As String",
    "    End Function",
    '    Public DeclareWide PtrSafe Function [Chr$] Lib "<strings>" Alias "#4" (ByVal C As Long) As String',
    "    Public Const REAL_EPSILON! = 1",
    "    Private Const Secret As Long = 1",
    "End Module",
    "Public Class Outer",
    "    Public Class Inner",
    "        Public Enum Deep",
    "            One",
    "        End Enum",
    "    End Class",
    "    Public Property Get P() As Long",
    "    End Property",
    "    Public Property Let P(ByVal V As Long)",
    "    End Property",
    "End Class",
    "Private Module Hidden",
    "    Public Enum ForOutside",
    "        K",
    "    End Enum",
    "    Public Class Inside",
    "    End Class",
    "End Module",
  );
  const FILES = [file("Sources/Main.twin", SOURCE), file("Settings", '{"project.name": "Demo"}')];
  const build = (files = FILES) => buildApi({ symbol: "DemoPkg", version: "1.2", files });
  const find = (api, p) => api.types.find((t) => qualified(t) === p);

  test("names the package, its project and its version, in the format the README describes", () => {
    const { api, json, stats } = build();
    assert.equal(API_FORMAT, 2);
    assert.equal(api.format, 2);
    assert.equal(api.package, "DemoPkg");
    assert.equal(api.project, "Demo");
    assert.equal(api.version, "1.2");
    assert.deepEqual(Object.keys(api), ["format", "package", "project", "version", "types", "aliases", "problems"]);
    assert.deepEqual(stats, { files: 1, types: 9, members: 17, aliases: 0, problems: 0 });
    assert.deepEqual(JSON.parse(json), JSON.parse(JSON.stringify(api)));
  });

  test("a package with no Settings file has no project name", () => {
    assert.equal(build([file("Sources/Main.twin", SOURCE)]).api.project, null);
  });

  test("types are in code-unit order of their path, and a nested type says where it is in", () => {
    const { api } = build();
    const paths = api.types.map(qualified);
    assert.deepEqual(paths, [
      "Hidden",
      "Hidden.ForOutside",
      "Hidden.Inside",
      "Outer",
      "Outer.Inner",
      "Outer.Inner.Deep",
      "Zeta",
      "Zeta.Colours",
      "Zeta.Pt",
    ]);
    assert.equal(find(api, "Outer").in, undefined);
    assert.equal(find(api, "Outer.Inner").in, "Outer");
    assert.equal(find(api, "Outer.Inner.Deep").in, "Outer.Inner");
    assert.equal(find(api, "Zeta.Pt").in, "Zeta");
  });

  test("members are in code-unit order of their name, uppercase first, and a property's accessors stay in declaration order", () => {
    const { api } = build();
    assert.deepEqual(names(find(api, "Zeta").members), ["B", "Chr$", "Command", "REAL_EPSILON", "Secret", "b"]);
    assert.deepEqual(
      find(api, "Outer").members.map((m) => m.accessor),
      ["Get", "Let"],
    );
  });

  test("the values of an Enum and the fields of a Type stay in declaration order", () => {
    const { api } = build();
    assert.deepEqual(find(api, "Zeta.Colours").values, [
      { name: "Red", value: "1" },
      { name: "Blue", value: "2" },
      { name: "Alpha" },
    ]);
    assert.deepEqual(names(find(api, "Zeta.Pt").fields), ["Y", "X", "Count"]);
    assert.deepEqual(names(find(api, "Zeta.Pt").members), ["Reset"]);
    assert.equal(find(api, "Zeta.Colours").members, undefined);
  });

  test("a type-declaration character on an unbracketed name is not part of the name; a bracketed one keeps it", () => {
    const { api } = build();
    const zeta = find(api, "Zeta");
    const get = (n) => zeta.members.find((m) => m.name === n);
    assert.equal(get("Command").signature, "Public Function Command$() As String");
    assert.equal(get("REAL_EPSILON").signature, "Public Const REAL_EPSILON! = 1");
    assert.equal(get("Chr$").declare, true);
    assert.equal(
      zeta.members.find((m) => m.name === "Command$"),
      undefined,
    );
    assert.deepEqual(find(api, "Zeta.Pt").fields[2], { name: "Count", vis: "public", signature: "Count&" });
  });

  test("a type is public unless it is Private or in a type that is not, except that an Enum is judged by itself", () => {
    const { api } = build();
    assert.equal(find(api, "Hidden").public, false);
    assert.equal(find(api, "Hidden.Inside").public, false);
    assert.equal(find(api, "Hidden.ForOutside").public, undefined);
    assert.equal(find(api, "Zeta").public, undefined);
    assert.equal(find(api, "Outer.Inner.Deep").public, undefined);
  });

  test("the same files give the same snapshot whatever order they are handed over in", () => {
    // A second file declares a Module of the same name: which comes first is the files' order, by code unit.
    const extra = file("Sources/A/Again.twin", lines("Module Zeta", "    Public Sub O()", "    End Sub", "End Module"));
    const forward = build([...FILES, extra]);
    const backward = build([extra, ...FILES].reverse());
    assert.equal(forward.json, backward.json);
    assert.deepEqual(
      forward.api.types.filter((x) => x.name === "Zeta").map((x) => x.file),
      ["A/Again.twin", "Main.twin"],
    );
    assert.equal(build().json, build().json);
  });

  test("the snapshot is written a type to a few lines and a member, value and field to a line", () => {
    const { json } = build();
    assert.ok(json.endsWith("}\n"));
    assert.equal(json.split("\n").filter((l) => l.includes('"name":"Reset"')).length, 1);
    assert.equal(json.split("\n").filter((l) => l.includes('"name":"Blue"')).length, 1);
    assert.equal(
      renderApi({ format: 2, package: "E", project: null, version: "0", types: [], aliases: [], problems: [] }),
      lines(
        "{",
        '  "format": 2,',
        '  "package": "E",',
        '  "project": null,',
        '  "version": "0",',
        '  "types": [],',
        '  "aliases": [],',
        '  "problems": []',
        "}",
        "",
      ),
    );
  });

  test("a snapshot holds no line numbers except in problems", () => {
    const bad = buildApi({
      symbol: "Bad",
      version: "1",
      files: [file("Sources/Bad.twin", lines("Module M", "End Module", "End Module"))],
    });
    assert.equal(bad.api.problems.length, 1);
    assert.deepEqual(bad.api.problems[0], { file: "Bad.twin", line: 3, why: "End Module does not close what is open" });
    assert.ok(!/"line"/.test(build().json));
  });
});

describe("buildApi on the files of a package", () => {
  const VB6_MODULE = lines(
    'Attribute VB_Name = "Strings"',
    "Public Function Left$(S As String) As String",
    "End Function",
  );
  const VB6_CLASS = lines(
    "VERSION 1.0 CLASS",
    "BEGIN",
    "  MultiUse = -1",
    "END",
    'Attribute VB_Name = "Thing"',
    "Public Value As Long",
  );
  const COMMENTED_OUT = lines('\' Attribute VB_Name = "mBSSubclass"', "'Public Sub S()", "'End Sub");
  const files = [
    file("Settings", '{"project.name": "Mixed"}'),
    file("Sources/Main.twin", lines("Module Main", "    Public Sub Go()", "    End Sub", "End Module")),
    file("Sources/modules/Strings.bas", VB6_MODULE),
    file("Sources/Thing.cls", VB6_CLASS),
    file("Sources/subclass/mBSSubclass.bas", COMMENTED_OUT),
    file("Sources/Form1.tbform", '{"controls": []}'),
    file("Sources/notes.txt", "Module NotCode\nEnd Module\n"),
    file("Miscellaneous/Stray.twin", "Module Stray\nEnd Module\n"),
    file("Packages/Dep/Sources/Dep.twin", "Module Dep\nEnd Module\n"),
  ];

  test("reads .twin files and VB6-format files under Sources/, and nothing else", () => {
    const { api, stats } = buildApi({ symbol: "Mixed", version: "1", files });
    assert.equal(stats.files, 4);
    assert.deepEqual(
      api.types.map((t) => `${t.kind} ${t.name}`),
      ["module Main", "module Strings", "class Thing", "module mBSSubclass"],
    );
    assert.deepEqual(api.problems, []);
  });

  test("a VB6 file is reported under its own path, not the .twin the scanner was given", () => {
    const { api } = buildApi({ symbol: "Mixed", version: "1", files });
    const where = Object.fromEntries(api.types.map((t) => [t.name, t.file]));
    assert.deepEqual(where, {
      Main: "Main.twin",
      Strings: "modules/Strings.bas",
      Thing: "Thing.cls",
      mBSSubclass: "subclass/mBSSubclass.bas",
    });
  });

  test("a VB6 type is named by its VB_Name, else by its file, and its members are read", () => {
    const { api } = buildApi({ symbol: "Mixed", version: "1", files });
    const strings = api.types.find((t) => t.name === "Strings");
    assert.equal(strings.kind, "module");
    assert.deepEqual(names(strings.members), ["Left"]);
    assert.equal(strings.members[0].signature, "Public Function Left$(S As String) As String");
    assert.equal(api.types.find((t) => t.name === "Thing").kind, "class");
    assert.deepEqual(names(api.types.find((t) => t.name === "mBSSubclass").members), []);
    assert.ok(!api.types.some((t) => t.name === "Unnamed"));
  });
});

describe("buildApi on indexer/sample.twinpack", () => {
  const files = readPackageFiles(readFileSync(SAMPLE));
  const { api, json, stats } = buildApi({ symbol: "CustomControlsPackage", version: "0.0.3.0", files });

  test("indexes the package without a problem", () => {
    assert.equal(api.project, "CustomControlsPackage");
    assert.deepEqual(api.problems, []);
    assert.equal(stats.files, 9);
    assert.equal(stats.types, api.types.length);
    assert.ok(stats.members > 400);
  });

  test("lists its types in code-unit order of their path", () => {
    const paths = api.types.map(qualified);
    assert.deepEqual(
      paths,
      [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  });

  test("keeps the nesting of its types: an Enum and a Type inside a Private class", () => {
    const by = (p) => api.types.find((t) => qualified(t) === p);
    assert.equal(by("UDTs").vis, "private");
    assert.equal(by("UDTs.CaretPosition").in, "UDTs");
    assert.equal(by("UDTs.CaretPosition").kind, "enum");
    assert.equal(by("UDTs.MouseEvent").kind, "type");
    assert.equal(by("UDTs.MouseEvent").public, false);
    assert.equal(by("WaynesSlider.SliderDirection").in, "WaynesSlider");
    assert.equal(by("WaynesSlider.SliderDirection").public, undefined);
  });

  test("an Enum's values follow the source", () => {
    const text = files.find((f) => f.relativePath === "Sources/zTemporarySupport.twin").content.toString();
    const block = /Enum SpecialKeyCodes\r?\n([\s\S]*?)End Enum/.exec(text)[1];
    const written = block
      .split(/\r?\n/)
      .map((l) => /^\s*(\w+)/.exec(l)?.[1])
      .filter(Boolean);
    const got = names(api.types.find((t) => qualified(t) === "UDTs.SpecialKeyCodes").values);
    assert.deepEqual(got, written);
    assert.ok(got.length > 1);
  });

  test("is the same snapshot from the same files in any order, and from its own text", () => {
    assert.equal(
      buildApi({ symbol: "CustomControlsPackage", version: "0.0.3.0", files: [...files].reverse() }).json,
      json,
    );
    const back = JSON.parse(json);
    assert.equal(back.format, API_FORMAT);
    const d = diffApi(back, api);
    assert.deepEqual([d.added.length, d.modified.length, d.removed.length], [0, 0, 0]);
    assert.ok(d.unchanged.length > 0);
  });
});

// ------------------------------------------------------------ the differ

// api.json objects small enough to read: a type is `{ name, kind, in?, vis, public?,
// file, signature, members | values | fields }`, a member `{ name, kind, vis,
// signature, declare?, attrs? }`, as buildApi writes them.
const m = (name, kind, signature, extra = {}) => ({ name, kind, vis: "public", signature, ...extra });
const t = (name, kind, body = {}, extra = {}) => ({
  name,
  kind,
  vis: "public",
  file: `${name}.twin`,
  signature: `Public ${kind} ${name}`,
  ...(kind === "enum" ? { values: [] } : { members: [] }),
  ...extra,
  ...body,
});
const apiOf = (...types) => ({ format: 2, package: "P", project: "P", version: "1", types, aliases: [], problems: [] });
const keysOf = (list) => list.map((s) => s.key).sort();

describe("flattenSymbols", () => {
  test("one symbol for each type, and one for each name a type declares", () => {
    const syms = flattenSymbols(
      apiOf(
        t("Widget", "class", {
          members: [
            m("Caption", "property", "Public Property Get Caption() As String", { accessor: "Get" }),
            m("Caption", "property", "Public Property Let Caption(ByVal V As String)", { accessor: "Let" }),
            m("Refresh", "sub", "Public Sub Refresh()"),
            m("Refresh", "sub", "Public Sub Refresh(ByVal Force As Boolean)"),
          ],
        }),
      ),
    );
    assert.deepEqual(
      syms.map((s) => s.key),
      ["Class:Widget", "Widget.Caption.Property", "Widget.Refresh.Sub"],
    );
    assert.equal(
      syms[1].signature,
      "Public Property Get Caption() As String\nPublic Property Let Caption(ByVal V As String)",
    );
    assert.equal(syms[2].signature.split("\n").length, 2);
  });

  test("a name declared as two kinds is two symbols", () => {
    const syms = flattenSymbols(
      apiOf(
        t("Ticker", "class", {
          members: [m("Tick", "event", "Public Event Tick()"), m("Tick", "sub", "Public Sub Tick()")],
        }),
      ),
    );
    assert.deepEqual(
      syms.map((s) => s.key),
      ["Class:Ticker", "Ticker.Tick.Event", "Ticker.Tick.Sub"],
    );
  });

  test("a nested type is keyed by its path, and its container is the type it is in", () => {
    const syms = flattenSymbols(
      apiOf(
        t("Outer", "class"),
        t("Inner", "class", { members: [m("Go", "sub", "Public Sub Go()")] }, { in: "Outer" }),
        t("Deep", "enum", { values: [{ name: "A" }] }, { in: "Outer.Inner" }),
      ),
    );
    assert.deepEqual(
      syms.map((s) => s.key),
      ["Class:Outer", "Class:Outer.Inner", "Outer.Inner.Go.Sub", "Enum:Outer.Inner.Deep"],
    );
    const by = (k) => syms.find((s) => s.key === k);
    assert.equal(by("Class:Outer.Inner").container, "Outer");
    assert.equal(by("Class:Outer").container, null);
    assert.equal(by("Outer.Inner.Go.Sub").container, "Outer.Inner");
    assert.equal(by("Enum:Outer.Inner.Deep").name, "Deep");
  });

  test("a Declare is a Declare, not a Sub or Function; an Enum is a symbol of one", () => {
    const syms = flattenSymbols(
      apiOf(
        t("Win", "module", {
          members: [m("GetDC", "function", 'Declare Function GetDC Lib "user32" () As LongPtr', { declare: true })],
        }),
        t("Mode", "enum", { values: [{ name: "A" }, { name: "B" }] }),
      ),
    );
    assert.deepEqual(
      syms.map((s) => s.kind),
      ["Module", "Declare", "Enum"],
    );
    assert.equal(syms[1].key, "Win.GetDC.Declare");
    assert.equal(
      syms[2].detail,
      JSON.stringify([[{ name: "A" }, { name: "B" }], undefined, undefined, undefined, undefined, undefined]),
    );
  });

  test("two declarations of one type are told apart by a #2 in file order", () => {
    const syms = flattenSymbols(
      apiOf(t("Dup", "class", {}, { file: "a.twin" }), t("Dup", "class", {}, { file: "b.twin" })),
    );
    assert.deepEqual(
      syms.map((s) => s.key),
      ["Class:Dup", "Class:Dup#2"],
    );
  });

  test("a Private member is not public, a Protected one is, and the members of a type that is not public are not listed", () => {
    const syms = flattenSymbols(
      apiOf(
        t("Base", "class", {
          members: [
            m("Open", "sub", "Public Sub Open()"),
            m("Mine", "sub", "Private Sub Mine()", { vis: "private" }),
            m("Pkg", "sub", "Friend Sub Pkg()", { vis: "friend" }),
            m("Kids", "sub", "Protected Sub Kids()", { vis: "protected" }),
          ],
        }),
        t("Closed", "class", { members: [m("X", "sub", "Public Sub X()")] }, { vis: "private", public: false }),
      ),
    );
    const pub = Object.fromEntries(syms.map((s) => [s.key, s.public]));
    assert.deepEqual(pub, {
      "Class:Base": true,
      "Base.Open.Sub": true,
      "Base.Mine.Sub": false,
      "Base.Pkg.Sub": false,
      "Base.Kids.Sub": true,
      "Class:Closed": false,
    });
  });
});

describe("diffApi", () => {
  const baseline = apiOf(
    t("Widget", "class", {
      members: [
        m("Caption", "property", "Public Property Get Caption() As String", { accessor: "Get" }),
        m("Refresh", "sub", "Public Sub Refresh()"),
        m("Gone", "sub", "Public Sub Gone()"),
        m("Mine", "sub", "Private Sub Mine()", { vis: "private" }),
      ],
    }),
    t("Mode", "enum", { values: [{ name: "A" }, { name: "B" }] }),
    t("Old", "class", { members: [m("Run", "sub", "Public Sub Run()")] }),
    t("Same", "class", { members: [m("Keep", "sub", "Public Sub Keep()")] }),
  );
  const current = apiOf(
    t("Widget", "class", {
      members: [
        m("Caption", "property", "Public Property Get Caption() As String", { accessor: "Get" }),
        m("Caption", "property", "Public Property Set Caption(ByVal V As String)", { accessor: "Set" }),
        m("Refresh", "sub", "Public Sub Refresh()", { attrs: [{ name: "Hidden" }] }),
        m("Fresh", "sub", "Public Sub Fresh()"),
        m("Mine", "sub", "Private Sub Mine(ByVal X As Long)", { vis: "private" }),
      ],
    }),
    t("Mode", "enum", { values: [{ name: "A" }, { name: "B" }, { name: "C" }] }),
    t("Brand", "class"),
    t("Same", "class", { members: [m("Keep", "sub", "Public Sub Keep()")] }),
  );
  const d = diffApi(baseline, current);

  test("finds what was added: a member and a type", () => {
    assert.deepEqual(keysOf(d.added), ["Class:Brand", "Widget.Fresh.Sub"]);
  });

  test("finds what was removed: a member, and a type with its members", () => {
    assert.deepEqual(keysOf(d.removed), ["Class:Old", "Old.Run.Sub", "Widget.Gone.Sub"]);
  });

  test("finds what was modified, and says what in: signature, attributes or detail", () => {
    const got = Object.fromEntries(d.modified.map((x) => [x.current.key, x.changes]));
    assert.deepEqual(Object.keys(got).sort(), [
      "Enum:Mode",
      "Widget.Caption.Property",
      "Widget.Mine.Sub",
      "Widget.Refresh.Sub",
    ]);
    assert.deepEqual(got["Enum:Mode"], ["detail"]);
    assert.deepEqual(got["Widget.Mine.Sub"], ["signature"]);
    assert.deepEqual(got["Widget.Refresh.Sub"], ["attributes"]);
    assert.ok(got["Widget.Caption.Property"].includes("signature"));
    const caption = d.modified.find((x) => x.current.key === "Widget.Caption.Property");
    assert.equal(caption.baseline.signature.split("\n").length, 1);
    assert.equal(caption.current.signature.split("\n").length, 2);
  });

  test("lists the rest as unchanged, and every symbol once", () => {
    assert.deepEqual(keysOf(d.unchanged), ["Class:Same", "Class:Widget", "Same.Keep.Sub"]);
    const all = [...d.added, ...d.removed, ...d.modified.map((x) => x.current), ...d.unchanged];
    assert.equal(all.length, new Set(all.map((s) => s.key)).size);
  });

  test("an added accessor changes a property's symbol; it does not add one", () => {
    assert.ok(!d.added.some((s) => s.name === "Caption"));
  });

  test("nested types are keyed by where they are: the same name in two places is two symbols", () => {
    const before = apiOf(
      t("A", "class"),
      t("B", "class"),
      t("Item", "class", {}, { in: "A", signature: "Public Class Item" }),
      t("Item", "class", {}, { in: "B", signature: "Public Class Item" }),
      t("Item", "interface"),
    );
    const after = apiOf(
      t("A", "class"),
      t("B", "class"),
      t("Item", "class", {}, { in: "A", signature: "Public Class Item" }),
      t("Item", "class", {}, { in: "B", signature: "Public Class Item Inherits Base" }),
      t("Item", "interface"),
    );
    const r = diffApi(before, after);
    assert.deepEqual(keysOf(r.modified.map((x) => x.current)), ["Class:B.Item"]);
    assert.deepEqual(keysOf(r.unchanged), ["Class:A", "Class:A.Item", "Class:B", "Interface:Item"]);
    assert.deepEqual([r.added.length, r.removed.length], [0, 0]);
  });

  test("moving a type into another is a removal and an addition", () => {
    const r = diffApi(apiOf(t("Item", "class")), apiOf(t("Item", "class", {}, { in: "Outer" })));
    assert.deepEqual(keysOf(r.removed), ["Class:Item"]);
    assert.deepEqual(keysOf(r.added), ["Class:Outer.Item"]);
  });

  test("a snapshot against itself changes nothing, and one with no types is empty", () => {
    const same = diffApi(baseline, baseline);
    assert.deepEqual([same.added.length, same.modified.length, same.removed.length], [0, 0, 0]);
    assert.equal(same.unchanged.length, flattenSymbols(baseline).length);
    const none = diffApi({}, {});
    assert.deepEqual(none, { added: [], modified: [], removed: [], unchanged: [] });
  });
});

describe("auditCoverage", () => {
  const api = apiOf(
    t("Widget", "class", {
      members: [
        m("Caption", "property", "Public Property Get Caption() As String"),
        m("Refresh", "sub", "Public Sub Refresh()"),
        m("Mine", "sub", "Private Sub Mine()", { vis: "private" }),
      ],
    }),
    t("Inner", "class", { members: [m("Go", "sub", "Public Sub Go()")] }, { in: "Widget" }),
    t("Closed", "class", { members: [m("Hidden", "sub", "Public Sub Hidden()")] }, { vis: "private", public: false }),
  );
  const pages = new Map([
    ["Widget", "Reference/Widget.md"],
    ["Caption", "Reference/Widget/Caption.md"],
    ["Mine", "Reference/Widget/Mine.md"],
    ["Hidden", "Reference/Hidden.md"],
  ]);
  const { documented, undocumented } = auditCoverage(api, pages);

  test("splits the public symbols by whether a page is titled with their name", () => {
    assert.deepEqual(
      documented.map((s) => s.key),
      ["Class:Widget", "Widget.Caption.Property"],
    );
    assert.deepEqual(
      documented.map((s) => s.docPage),
      ["Reference/Widget.md", "Reference/Widget/Caption.md"],
    );
    // In the order of the file: a type's own members come before the types declared in it.
    assert.deepEqual(
      undocumented.map((s) => s.key),
      ["Widget.Refresh.Sub", "Class:Widget.Inner", "Widget.Inner.Go.Sub"],
    );
  });

  test("never lists a Private member or the members of a type that is not public, whatever the pages are titled", () => {
    const all = [...documented, ...undocumented].map((s) => s.key);
    assert.ok(!all.some((k) => /Mine|Closed|Hidden/.test(k)));
  });

  test("with no pages every public symbol is undocumented, and with no types there is nothing to report", () => {
    assert.equal(auditCoverage(api, new Map()).documented.length, 0);
    assert.deepEqual(auditCoverage({}, pages), { documented: [], undocumented: [] });
  });
});

// ----------------------------------------------------------- the store's sync state

// A store folder as `sync` leaves it: sources and an api.json of `version`.
const apiText = (version, over = {}) =>
  renderApi({
    format: API_FORMAT,
    package: "P",
    project: null,
    version,
    types: [],
    aliases: [],
    problems: [],
    ...over,
  });

function putPackage(store, group, symbol, { sources = true, api } = {}) {
  const dir = path.join(store, group, symbol);
  mkdirSync(path.join(dir, "sources"), { recursive: true });
  if (sources) writeFileSync(path.join(dir, "sources", "M.twin"), "Module M\nEnd Module\n");
  else rmSync(path.join(dir, "sources"), { recursive: true });
  if (api !== undefined) writeFileSync(path.join(dir, "api.json"), api);
}

describe("storeStatus", () => {
  const store = mkdtempSync(path.join(tmp, "store-"));
  const status = (symbol, version = "beta-x-1005") => storeStatus(store, "built-in", symbol, version);

  test("a package with its sources and an api.json of the version is current", async () => {
    putPackage(store, "built-in", "Current", { api: apiText("beta-x-1005") });
    assert.equal(await status("Current"), null);
  });

  test("a package the store does not hold, or holds without its sources, is to be read again", async () => {
    assert.equal(await status("Never"), "missing-sources");
    // A store seeded from the committed snapshots has the api.json and no sources.
    putPackage(store, "built-in", "Seeded", { sources: false, api: apiText("beta-x-1005") });
    assert.equal(await status("Seeded"), "missing-sources");
  });

  test("so is one with no api.json, or one in an older format", async () => {
    putPackage(store, "built-in", "NoIndex");
    assert.equal(await status("NoIndex"), "missing-index");
    putPackage(store, "built-in", "Format1", { api: apiText("beta-x-1005").replace('"format": 2', '"format": 1') });
    assert.equal(await status("Format1"), "old-format");
    putPackage(store, "built-in", "Unnumbered", { api: '{\n  "package": "P",\n  "version": "beta-x-1005"\n}\n' });
    assert.equal(await status("Unnumbered"), "old-format");
  });

  test("so is one indexed from another build: the manifest cannot make a stale package current", async () => {
    putPackage(store, "built-in", "Stale", { api: apiText("beta-x-0997") });
    assert.equal(await status("Stale"), "other-build");
    assert.equal(await status("Stale", "beta-x-0997"), null);
  });

  test("the version is read from the header whether the project is named or not, and nowhere else", async () => {
    putPackage(store, "built-in", "Named", { api: apiText("beta-x-1005", { project: "Assert" }) });
    assert.equal(await status("Named"), null);
    // The text "version" inside a type's description is not the package's version.
    const types = [{ name: "T", kind: "class", file: "T.twin", signature: 'Class T "version": "beta-x-1005"' }];
    putPackage(store, "built-in", "Decoy", { api: apiText("beta-x-0997", { types }) });
    assert.equal(await status("Decoy"), "other-build");
  });

  test("apiHeadOf gives the format and the version, and null for a file that is not there", async () => {
    assert.deepEqual(await apiHeadOf(path.join(store, "built-in", "Current", "api.json")), {
      format: API_FORMAT,
      version: "beta-x-1005",
    });
    assert.equal(await apiHeadOf(path.join(store, "built-in", "Never", "api.json")), null);
  });
});

describe("the manifests are in the store, not in the repository", () => {
  test("a manifest is a file inside the store folder, so a clone, which has no store, has none", () => {
    const store = path.join(tmp, "elsewhere", ".packages");
    for (const name of ["built-in", "contributed"]) {
      const rel = path.relative(store, manifestPath(store, name));
      assert.ok(!rel.startsWith("..") && !path.isAbsolute(rel), rel);
    }
  });

  test("with no manifest, the first sync reads every package, whatever the build", async () => {
    const file = manifestPath(path.join(tmp, "never-synced"), "built-in");
    const r = await compareInstallManifest(file, { root: tmp, beta: "1005" });
    assert.equal(r.needsUpdate, true);
    assert.equal(r.tag, "beta-x-1005");
    assert.deepEqual(r.manifest.packages, {});
  });

  test("a manifest of the same build and source is up to date, another build or source is not", async () => {
    const store = mkdtempSync(path.join(tmp, "synced-"));
    const file = manifestPath(store, "built-in");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ source: "install", twinbasicTag: "beta-x-1005", packages: {} }));
    const same = await compareInstallManifest(file, { root: tmp, beta: "1005" });
    assert.equal(same.needsUpdate, false);
    assert.equal((await compareInstallManifest(file, { root: tmp, beta: "997" })).needsUpdate, true);
    writeFileSync(file, JSON.stringify({ source: "release", twinbasicTag: "beta-x-1005", packages: {} }));
    assert.equal((await compareInstallManifest(file, { root: tmp, beta: "1005" })).needsUpdate, true);
  });
});

describe("copyToSnapshots", () => {
  const store = mkdtempSync(path.join(tmp, "copy-store-"));
  const snapshots = mkdtempSync(path.join(tmp, "copy-snapshots-"));
  const both = [
    { group: "default", package: "A" },
    { group: "built-in", package: "B" },
  ];
  putPackage(store, "default", "A", { api: apiText("beta-x-1005") });
  putPackage(store, "built-in", "B", { api: apiText("beta-x-1005") });
  const snapshot = (group, name) => path.join(snapshots, group, name, "api.json");

  test("copies the api.json of each package it is given, and names them", async () => {
    assert.deepEqual(await copyToSnapshots(store, snapshots, both), both);
    assert.equal(readFileSync(snapshot("built-in", "B"), "utf-8"), apiText("beta-x-1005"));
  });

  test("writes only what differs, and copies nothing it was not given", async () => {
    assert.deepEqual(await copyToSnapshots(store, snapshots, both), []);
    putPackage(store, "built-in", "B", { api: apiText("beta-x-1006") });
    putPackage(store, "default", "C", { api: apiText("beta-x-1006") });
    assert.deepEqual(await copyToSnapshots(store, snapshots, both), [{ group: "built-in", package: "B" }]);
    assert.equal(readFileSync(snapshot("default", "A"), "utf-8"), apiText("beta-x-1005"));
    assert.throws(() => readFileSync(snapshot("default", "C")), { code: "ENOENT" });
  });

  test("skips a package the store has no api.json for", async () => {
    assert.deepEqual(await copyToSnapshots(store, snapshots, [{ group: "built-in", package: "Missing" }]), []);
  });
});
