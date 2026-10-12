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
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { importProject } from "../scripts/impexp.mjs";
import { API_FORMAT, buildApi, qualified, renderApi } from "../indexer/lib/api-model.mjs";
import { compareInstallManifest } from "../indexer/lib/builtin-sync.mjs";
import { auditCoverage, diffApi, flattenSymbols } from "../indexer/lib/differ.mjs";
import {
  documentedPackages,
  frontmatterList,
  frontmatterOf,
  frontmatterValue,
  packageNames,
  readSection,
  sectionPages,
} from "../indexer/lib/doc-pages.mjs";
import {
  batchTasks,
  followsFolders,
  newLandingFor,
  PAGES_PER_BATCH,
  permalinkByFolder,
  planPackage,
  sectionModels,
} from "../indexer/lib/draft-plan.mjs";
import { FINGERPRINTED, fingerprintOf, indexerFingerprint } from "../indexer/lib/fingerprint.mjs";
import { derivePackageApi } from "../indexer/lib/package-api.mjs";
import { readPackageFiles } from "../indexer/lib/package-files.mjs";
import {
  adoptSnapshots,
  apiHeadOf,
  copyToSnapshots,
  manifestPath,
  readStoredFiles,
  reindexStored,
  storedPackages,
  storeStatus,
  writeToStore,
} from "../indexer/lib/store.mjs";
import { latestVersion, versionString } from "../indexer/lib/sync.mjs";
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
    assert.equal(API_FORMAT, 3);
    assert.equal(api.format, 3);
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

  test("the forms the scanner once lost are in the snapshot: name lists, #If alternatives, a Declare's visibility, [Hidden(False)]", () => {
    const { api } = buildApi({
      symbol: "Forms",
      version: "1",
      files: [
        file(
          "Sources/Forms.twin",
          lines(
            "Public Class Derived",
            "    Inherits BaseA, BaseB",
            "    Implements IA, IB",
            "    [Hidden(False)]",
            "    Public Sub Shown()",
            "    End Sub",
            "#If VBA7 Then",
            "    Public Property Get hWnd() As LongPtr",
            "#Else",
            "    Public Property Get hWnd() As Long Overrides Base.hWnd",
            "#End If",
            "        Return 0",
            "    End Property",
            "    Public gdiRefCount& = 0",
            "End Class",
            "Public CoClass Pub",
            "    [Default] Interface stdole.IUnknown",
            "End CoClass",
            "Public Module Api",
            '    Declare PtrSafe Function Tick Lib "kernel32" () As Long',
            "End Module",
          ),
        ),
      ],
    });
    const derived = find(api, "Derived");
    const member = (name) => derived.members.filter((m) => m.name === name);
    assert.deepEqual(api.problems, []);
    assert.deepEqual(derived.inherits, ["BaseA", "BaseB"]);
    assert.deepEqual(derived.implements, ["IA", "IB"]);
    assert.equal(member("Shown")[0].hidden, undefined);
    // The two headers of the #If are one member with both signatures.
    assert.equal(member("hWnd").length, 1);
    assert.deepEqual(
      member("hWnd")[0].signatures.map((s) => [s.cond, s.returnType]),
      [
        ["VBA7", "LongPtr"],
        ["Not (VBA7)", "Long"],
      ],
    );
    assert.equal(member("gdiRefCount")[0].kind, "field");
    assert.deepEqual(find(api, "Pub").interfaces, [{ name: "stdole.IUnknown", default: true }]);
    const tick = find(api, "Api").members[0];
    assert.deepEqual([tick.name, tick.vis, tick.declare], ["Tick", "public", true]);
  });

  test("colon-joined declarations, names past ASCII and type characters reach the snapshot", () => {
    const { api } = buildApi({
      symbol: "Forms2",
      version: "1",
      files: [
        file(
          "Sources/Forms2.twin",
          lines(
            "Public Module Gr\u{F6}\u{DF}e",
            "    Private x As Long: Private y As Long",
            "    Public Sub P(): End Sub: Public Sub Q(): End Sub",
            '    Public Function Size%(): Return 1: End Function: Public Function Name$(): Return "a": End Function',
            "    Public Caf\u{E9} As Long: Public Const Pi& = 3",
            "    Public Enum E: A: B = 5: End Enum",
            "End Module",
            "Public Class C: End Class",
          ),
        ),
      ],
    });
    assert.deepEqual(api.problems, []);
    assert.deepEqual(
      api.types.map((t) => t.name),
      ["C", "Gr\u{F6}\u{DF}e", "E"],
    );
    const mod = find(api, "Gr\u{F6}\u{DF}e");
    assert.deepEqual(
      mod.members.map((m) => `${m.name}:${m.kind}:${m.returnType ?? "-"}`),
      [
        "Caf\u{E9}:field:-",
        "Name:function:String",
        "P:sub:-",
        "Pi:const:-",
        "Q:sub:-",
        "Size:function:Integer",
        "x:field:-",
        "y:field:-",
      ],
    );
    assert.equal(mod.members.find((m) => m.name === "Size").signature, "Public Function Size%()");
    assert.deepEqual(find(api, "Gr\u{F6}\u{DF}e.E").values, [{ name: "A" }, { name: "B", value: "5" }]);
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

// ------------------------------------------- builder/package-api.json (derive)

describe("derivePackageApi", () => {
  const sample = readPackageFiles(readFileSync(SAMPLE));
  const derive = (...packages) => derivePackageApi({ build: 997, packages });
  const MINE = lines(
    "Public Class Widget",
    "    Public Property Get Zed() As Long",
    "    End Property",
    "    Public Property Let Zed(v As Long)",
    "    End Property",
    "    Public Sub Apply()",
    "    End Sub",
    "    Private Sub Hidden()",
    "    End Sub",
    "End Class",
    "Public Enum Shade",
    "    Light",
    "    Dark",
    "End Enum",
  );

  test("writes the same bytes whatever order the packages and their files come in", () => {
    const mine = { symbol: "Mine", files: [file("Sources/A.twin", MINE)] };
    const one = derive({ symbol: "CustomControlsPackage", files: sample }, mine);
    const two = derive(mine, { symbol: "CustomControlsPackage", files: [...sample].reverse() });
    assert.equal(one.text, two.text);
    assert.deepEqual(one.problems, []);
    assert.deepEqual(one.unresolved, []);
  });

  test("keeps declaration order, one type to a line, the first declaration of a name giving its kind", () => {
    const { text, types, members } = derive({ symbol: "Mine", files: [file("Sources/A.twin", MINE)] });
    assert.equal(
      text,
      lines(
        "{",
        '  "build": 997,',
        '  "packages": {',
        '    "Mine": {',
        '      "exports": ["Mine"],',
        '      "types": [',
        '        {"name":"Widget","kind":"class","members":{"Zed":"property","Apply":"sub"}},',
        '        {"name":"Shade","kind":"enum","values":["Light","Dark"]}',
        "      ]",
        "    }",
        "  }",
        "}",
        "",
      ),
    );
    assert.deepEqual([types, members], [2, 4]);
  });

  test("keys a package by its project name, and lists every package under one name", () => {
    const { text } = derive({ symbol: "Copy", files: sample }, { symbol: "CustomControlsPackage", files: [...sample] });
    const back = JSON.parse(text);
    assert.deepEqual(Object.keys(back.packages), ["CustomControlsPackage"]);
    assert.deepEqual(back.packages.CustomControlsPackage.exports, ["Copy", "CustomControlsPackage"]);
  });

  test("refuses packages that declare different APIs under one project name", () => {
    const other = [...sample.filter((f) => !/\.twin$/i.test(f.relativePath)), file("Sources/X.twin", MINE)];
    assert.throws(
      () => derive({ symbol: "Copy", files: other }, { symbol: "CustomControlsPackage", files: sample }),
      /are all 'CustomControlsPackage' but declare different APIs/,
    );
  });
});

// ------------------------------------------------- the alternatives of an #If

describe("the alternatives of an #If are one member", () => {
  const build = (...src) => buildApi({ symbol: "Alt", version: "1", files: [file("Sources/Alt.twin", lines(...src))] });
  const members = (api, name) => api.types.find((x) => x.name === "M").members.filter((x) => x.name === name);

  test("two declarations in the branches of one #If are a member with a signature for each, in order", () => {
    const { api, json } = build(
      "Module M",
      '    [Description("Window handle")]',
      "#If VBA7 Then",
      '    Public Declare PtrSafe Function Win Lib "user32" () As LongPtr',
      "#Else",
      '    Public Declare Function Win Lib "user32" () As Long',
      "#End If",
      "End Module",
    );
    assert.deepEqual(api.problems, []);
    // What both have alike, the description from above the #If, is written once.
    assert.deepEqual(members(api, "Win"), [
      {
        name: "Win",
        kind: "function",
        vis: "public",
        declare: true,
        description: "Window handle",
        signatures: [
          {
            cond: "VBA7",
            signature: 'Public Declare PtrSafe Function Win Lib "user32" () As LongPtr',
            returnType: "LongPtr",
          },
          { cond: "Not (VBA7)", signature: 'Public Declare Function Win Lib "user32" () As Long', returnType: "Long" },
        ],
      },
    ]);
    assert.equal(json.split("\n").filter((l) => l.includes('"signatures"')).length, 1);
  });

  test("a declaration under a condition alone, overloads under one condition, and the same name in two #If blocks stay as they are", () => {
    const { api } = build(
      "Module M",
      "#If A Then",
      "    Public Sub One(): End Sub",
      "    Public Sub Two(): End Sub",
      "    Public Sub Two(a): End Sub",
      "#End If",
      "#If B Then",
      "    Public Sub Same(): End Sub",
      "#End If",
      "#If C Then",
      "    Public Sub Same(a): End Sub",
      "#End If",
      "End Module",
    );
    assert.deepEqual(members(api, "One"), [{ name: "One", kind: "sub", vis: "public", signature: "Public Sub One()" }]);
    assert.deepEqual(
      members(api, "Two").map((x) => x.signature),
      ["Public Sub Two()", "Public Sub Two(a)"],
    );
    assert.deepEqual(
      members(api, "Same").map((x) => x.signature),
      ["Public Sub Same()", "Public Sub Same(a)"],
    );
    assert.ok([...members(api, "Two"), ...members(api, "Same")].every((x) => x.signatures === undefined));
  });

  test("a property's Get and Let are alternatives of their own kind: a Get of each branch is one member, a Let of each another", () => {
    const { api } = build(
      "Module M",
      "#If P Then",
      "    Public Property Get Pr() As Long",
      "    End Property",
      "    Public Property Let Pr(v As Long)",
      "    End Property",
      "#Else",
      "    Public Property Get Pr() As Variant",
      "    End Property",
      "    Public Property Let Pr(v As Variant)",
      "    End Property",
      "#End If",
      "End Module",
    );
    assert.deepEqual(
      members(api, "Pr").map((x) => [x.accessor, x.signatures.map((s) => s.cond)]),
      [
        ["Get", ["P", "Not (P)"]],
        ["Let", ["P", "Not (P)"]],
      ],
    );
    assert.deepEqual(
      members(api, "Pr")[0].signatures.map((s) => s.returnType),
      ["Long", "Variant"],
    );
  });

  test("a Declare and a procedure with a body are not alternatives of one another", () => {
    const { api } = build(
      "Module M",
      "#If A Then",
      '    Public Declare PtrSafe Function F Lib "k" () As Long',
      "#Else",
      "    Public Function F() As Long",
      "    End Function",
      "#End If",
      "End Module",
    );
    assert.equal(members(api, "F").length, 2);
    assert.ok(members(api, "F").every((x) => x.signatures === undefined));
  });

  test("a nested #If and an #ElseIf are alternatives of one block; the member is as visible as its most visible, and an item says when it is not", () => {
    const { api } = build(
      "Module M",
      "#If Outer Then",
      "  #If Inner Then",
      "    Public Sub N(): End Sub",
      "  #Else",
      "    Private Sub N(): End Sub",
      "  #End If",
      "#ElseIf Other Then",
      "    Public Sub N(): End Sub",
      "#End If",
      "End Module",
    );
    assert.deepEqual(members(api, "N"), [
      {
        name: "N",
        kind: "sub",
        vis: "public",
        signatures: [
          { cond: "Outer And Inner", signature: "Public Sub N()" },
          { cond: "Outer And Not (Inner)", vis: "private", signature: "Private Sub N()" },
          { cond: "Not (Outer) And Other", signature: "Public Sub N()" },
        ],
      },
    ]);
  });

  test("a member after the #If, and one in a type declared under it, carry no condition of the #If", () => {
    const { api } = build(
      "#If X Then",
      "Class C1",
      "#Else",
      "Class C2",
      "#End If",
      "    Public Sub S(): End Sub",
      "End Class",
    );
    assert.deepEqual(
      api.types.map((x) => [x.name, x.members.map((y) => y.signatures)]),
      [
        ["C1", [undefined]],
        ["C2", [undefined]],
      ],
    );
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
const apiOf = (...types) => ({
  format: API_FORMAT,
  package: "P",
  project: "P",
  version: "1",
  types,
  aliases: [],
  problems: [],
});
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

describe("a member holding the alternatives of an #If", () => {
  // As buildApi writes one: the keys they share on the member, a signature for each.
  const win = (...signatures) => ({
    name: "Win",
    kind: "function",
    vis: "public",
    declare: true,
    description: "The handle.",
    signatures,
  });
  const w64 = { cond: "Win64", signature: 'Public Declare PtrSafe Function Win Lib "u" () As LongLong' };
  const w32 = { cond: "Not (Win64)", signature: 'Public Declare Function Win Lib "u" () As Long' };
  const apiWith = (...members) => apiOf(t("Api", "module", { members }));

  test("is one symbol of the kind of the Declare, with a line for each alternative, its condition in front", () => {
    const syms = flattenSymbols(apiWith(win(w64, w32), m("Plain", "sub", "Public Sub Plain()")));
    assert.deepEqual(
      syms.map((s) => s.key),
      ["Module:Api", "Api.Win.Declare", "Api.Plain.Sub"],
    );
    assert.equal(syms[1].signature, `#If Win64 Then ${w64.signature}\n#If Not (Win64) Then ${w32.signature}`);
    assert.equal(syms[1].description, "The handle.");
    assert.equal(syms[1].public, true);
  });

  test("shares its symbol with a plain declaration of the same name and kind", () => {
    const syms = flattenSymbols(
      apiWith(win(w64, w32), {
        name: "Win",
        kind: "function",
        vis: "public",
        declare: true,
        signature: "Declare Function Win()",
      }),
    );
    assert.deepEqual(
      syms.map((s) => s.key),
      ["Module:Api", "Api.Win.Declare"],
    );
    assert.equal(syms[1].signature.split("\n").length, 3);
  });

  test("the member is reachable when any alternative is", () => {
    const priv = { cond: "Mac", vis: "private", signature: 'Private Declare Function Win Lib "u" () As Long' };
    const open = flattenSymbols(apiWith(win(w64, priv)))[1];
    assert.equal(open.public, true);
    const closed = flattenSymbols(apiWith({ ...win(priv), vis: "private" }))[1];
    assert.equal(closed.public, false);
  });

  test("a change of condition, an added alternative and an edited signature each modify the symbol; the same changes nothing", () => {
    const base = apiWith(win(w64, w32));
    const changes = (current) => {
      const r = diffApi(base, apiWith(...current));
      return [r.added.length, r.removed.length, r.modified.map((x) => x.changes.join()), r.unchanged.length];
    };
    assert.deepEqual(changes([win(w64, w32)]), [0, 0, [], 2]);
    assert.deepEqual(changes([win({ ...w64, cond: "Win64 And VBA7" }, w32)]), [0, 0, ["signature"], 1]);
    assert.deepEqual(
      changes([win(w64, w32, { cond: "Mac", signature: 'Public Declare Function Win Lib "m" () As Long' })]),
      // The alternative has an attribute list of its own, so the attributes differ too.
      [0, 0, ["signature,attributes"], 1],
    );
    assert.deepEqual(changes([win(w64, { ...w32, signature: 'Public Declare Function Win Lib "u" () As Integer' })]), [
      0,
      0,
      ["signature"],
      1,
    ]);
  });

  test("a plain declaration that gains an alternative under an #If is modified, not added or removed", () => {
    const before = apiWith({ name: "Win", kind: "function", vis: "public", declare: true, signature: w64.signature });
    const r = diffApi(before, apiWith(win(w64, w32)));
    assert.deepEqual([r.added.length, r.removed.length, r.modified.length], [0, 0, 1]);
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

describe("latestVersion", () => {
  const v = (symbol, versionMajor, versionMinor, versionRevision, versionBuild) => ({
    symbol,
    versionMajor,
    versionMinor,
    versionRevision,
    versionBuild,
  });

  test("is the first version TWINSERV lists, never the last", () => {
    const pkg = {
      versions: [v("tbFileSysTools", 1, 8, 0, 0), v("tbFileSysTools", 1, 2, 0, 0), v("tbFileSysTools", 1, 1, 1, 0)],
    };
    assert.equal(versionString(latestVersion(pkg)), "1.8.0.0");
  });

  test("even where the first is not the highest number: the server's order decides", () => {
    // forliny's {CA836295-...} as TWINSERV listed it on 2026-10-12.
    const pkg = {
      versions: [
        v("WinReg", 1, 0, 1, 1),
        v("WinReg", 1, 0, 0, 1),
        v("WinSysTray", 1, 0, 2, 0),
        v("WinSysTray", 1, 0, 1, 0),
        v("TbSysTray", 1, 0, 0, 0),
        v("WinReg", 0, 0, 0, 0),
      ],
    };
    const latest = latestVersion(pkg);
    assert.equal(`${latest.symbol} ${versionString(latest)}`, "WinReg 1.0.1.1");
  });
});

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

// `fingerprint` is what the folder records of the code that wrote its api.json: the
// current one, another string, or null for a store from before it was recorded.
function putPackage(store, group, symbol, { sources = true, api, fingerprint = indexerFingerprint() } = {}) {
  const dir = path.join(store, group, symbol);
  mkdirSync(path.join(dir, "sources"), { recursive: true });
  if (sources) writeFileSync(path.join(dir, "sources", "M.twin"), "Module M\nEnd Module\n");
  else rmSync(path.join(dir, "sources"), { recursive: true });
  if (api !== undefined) writeFileSync(path.join(dir, "api.json"), api);
  if (fingerprint !== null) writeFileSync(path.join(dir, "indexer.json"), JSON.stringify({ fingerprint }));
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
    putPackage(store, "built-in", "Format1", {
      api: apiText("beta-x-1005").replace(`"format": ${API_FORMAT}`, '"format": 1'),
    });
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

  test("apiHeadOf gives the format, the version and the project, and null for a file that is not there", async () => {
    assert.deepEqual(await apiHeadOf(path.join(store, "built-in", "Current", "api.json")), {
      format: API_FORMAT,
      version: "beta-x-1005",
      project: null,
    });
    assert.equal((await apiHeadOf(path.join(store, "built-in", "Named", "api.json"))).project, "Assert");
    assert.equal(await apiHeadOf(path.join(store, "built-in", "Never", "api.json")), null);
  });

  test("one indexed by another version of the scanner, or before the version was recorded, is to be indexed again", async () => {
    putPackage(store, "built-in", "Other", { api: apiText("beta-x-1005"), fingerprint: "0".repeat(64) });
    assert.equal(await status("Other"), "old-scanner");
    putPackage(store, "built-in", "Unrecorded", { api: apiText("beta-x-1005"), fingerprint: null });
    assert.equal(await status("Unrecorded"), "old-scanner");
    // Another build is read again whatever the scanner: it needs its sources fetched.
    putPackage(store, "built-in", "OtherBoth", { api: apiText("beta-x-0997"), fingerprint: "0".repeat(64) });
    assert.equal(await status("OtherBoth"), "other-build");
    putPackage(store, "built-in", "Garbled", { api: apiText("beta-x-1005") });
    writeFileSync(path.join(store, "built-in", "Garbled", "indexer.json"), "{ not json");
    assert.equal(await status("Garbled"), "old-scanner");
  });
});

describe("the fingerprint of the scanner and the model", () => {
  test("is the same for the same files, and not for another text or name, whatever the line ends", () => {
    const a = fingerprintOf([{ name: "a.mjs", text: "one\ntwo\n" }]);
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(fingerprintOf([{ name: "a.mjs", text: "one\r\ntwo\r\n" }]), a);
    assert.notEqual(fingerprintOf([{ name: "a.mjs", text: "one\ntwo \n" }]), a);
    assert.notEqual(fingerprintOf([{ name: "b.mjs", text: "one\ntwo\n" }]), a);
    // Where one file ends and the next begins matters.
    assert.notEqual(
      fingerprintOf([
        { name: "a", text: "x" },
        { name: "b", text: "y" },
      ]),
      fingerprintOf([{ name: "a", text: "x\nb\ny" }]),
    );
  });

  test("is read from the code of this checkout, once", () => {
    assert.match(indexerFingerprint(), /^[0-9a-f]{64}$/);
    assert.equal(indexerFingerprint(), indexerFingerprint());
  });

  test("covers every module api-model.mjs imports, directly or through another", () => {
    const seen = new Set();
    const walk = (file) => {
      if (seen.has(file)) return;
      seen.add(file);
      const text = readFileSync(file, "utf-8");
      for (const m of text.matchAll(/^\s*import\b[^;]*?from\s+"(\.[^"]+)"/gm))
        walk(path.resolve(path.dirname(file), m[1]));
    };
    walk(path.resolve(import.meta.dirname, "../indexer/lib/api-model.mjs"));
    const listed = FINGERPRINTED.map((rel) => path.resolve(import.meta.dirname, "../indexer/lib", rel));
    assert.deepEqual([...seen].sort(), listed.sort());
  });
});

describe("a package written to the store, and indexed again from it", () => {
  const SOURCES = [
    file("Settings", '{"project.name": "Demo"}'),
    file("Sources/Main.twin", lines("Public Module Zeta", "    Public Sub Go(): End Sub", "End Module")),
    file("Sources/Sub/Old.bas", lines('Attribute VB_Name = "OldMod"', "Public Sub Legacy()", "End Sub")),
    file("Sources/Form1.tbform", "{}"),
    file("Resources/logo.png", "not a source"),
  ];
  const stored = (dir) => ({
    json: readFileSync(path.join(dir, "api.json"), "utf-8"),
    fingerprint: JSON.parse(readFileSync(path.join(dir, "indexer.json"), "utf-8")).fingerprint,
  });
  const built = buildApi({ symbol: "Demo", version: "beta-x-1005", files: SOURCES });

  test("keeps its sources without Sources/, its Settings, its api.json and the fingerprint, and nothing else", async () => {
    const store = mkdtempSync(path.join(tmp, "written-"));
    await writeToStore(store, "built-in", "Demo", SOURCES, built.json);
    const dir = path.join(store, "built-in", "Demo");
    assert.equal(readFileSync(path.join(dir, "sources", "Main.twin"), "utf-8").startsWith("Public Module Zeta"), true);
    assert.equal(readFileSync(path.join(dir, "sources", "Sub", "Old.bas"), "utf-8").includes("Legacy"), true);
    assert.equal(readFileSync(path.join(dir, "Settings"), "utf-8"), '{"project.name": "Demo"}');
    assert.deepEqual(stored(dir), { json: built.json, fingerprint: indexerFingerprint() });
    assert.deepEqual(readdirSync(path.join(dir, "sources")).sort(), ["Main.twin", "Sub"]);
    assert.equal(await storeStatus(store, "built-in", "Demo", "beta-x-1005"), null);
  });

  test("is indexed again into the api.json the sources were first indexed into, under the same version", async () => {
    const store = mkdtempSync(path.join(tmp, "again-"));
    await writeToStore(store, "built-in", "Demo", SOURCES, built.json);
    const dir = path.join(store, "built-in", "Demo");
    // As a store looks after the scanner changes: another fingerprint and an index of the old kind.
    writeFileSync(path.join(dir, "indexer.json"), JSON.stringify({ fingerprint: "0".repeat(64) }));
    writeFileSync(path.join(dir, "api.json"), built.json.replace('"Go"', '"Stale"'));
    assert.equal(await storeStatus(store, "built-in", "Demo", "beta-x-1005"), "old-scanner");
    const stats = await reindexStored(store, "built-in", "Demo");
    assert.deepEqual(stats, built.stats);
    assert.deepEqual(stored(dir), { json: built.json, fingerprint: indexerFingerprint() });
    assert.equal(await storeStatus(store, "built-in", "Demo", "beta-x-1005"), null);
  });

  test("a store from before Settings were kept gives the project name from its api.json", async () => {
    const store = mkdtempSync(path.join(tmp, "nosettings-"));
    await writeToStore(store, "built-in", "Demo", SOURCES, built.json);
    const dir = path.join(store, "built-in", "Demo");
    rmSync(path.join(dir, "Settings"));
    rmSync(path.join(dir, "indexer.json"));
    assert.equal(await storeStatus(store, "built-in", "Demo", "beta-x-1005"), "old-scanner");
    await reindexStored(store, "built-in", "Demo");
    assert.equal(stored(dir).json, built.json);
    assert.equal(JSON.parse(stored(dir).json).project, "Demo");
  });

  test("a package with no version in its api.json cannot be indexed again", async () => {
    const store = mkdtempSync(path.join(tmp, "noversion-"));
    putPackage(store, "built-in", "Bare", { api: "{}" });
    await assert.rejects(reindexStored(store, "built-in", "Bare"), /no version/);
  });

  test("readStoredFiles gives each source under Sources/ with forward slashes, and the Settings file", async () => {
    const store = mkdtempSync(path.join(tmp, "read-"));
    await writeToStore(store, "built-in", "Demo", SOURCES, built.json);
    const files = await readStoredFiles(path.join(store, "built-in", "Demo"));
    assert.deepEqual(files.map((f) => f.relativePath).sort(), ["Settings", "Sources/Main.twin", "Sources/Sub/Old.bas"]);
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

describe("storedPackages", () => {
  const store = mkdtempSync(path.join(tmp, "scope-"));
  for (const [group, symbol] of [
    ["default", "VBA"],
    ["built-in", "tbIDE"],
    ["built-in", "cefPackage145"],
    ["built-in", "cefPackage49"],
    ["contributed", "ArrayListLib"],
    ["contributed", "NoIndex"],
  ]) {
    putPackage(store, group, symbol, { api: symbol === "NoIndex" ? undefined : apiText("beta-x-1005") });
  }
  writeFileSync(path.join(store, "built-in", "stray.txt"), "not a package");
  // The reference documents VBA, tbIDE and, for the CEF section, only cefPackage145.
  const documented = new Map([
    ["default/VBA", {}],
    ["built-in/tbIDE", {}],
    ["built-in/cefPackage145", {}],
  ]);
  const ids = (r) => r.list.map((p) => `${p.group}/${p.name}`);

  test("by default it takes the packages the reference documents, and counts the rest", async () => {
    const r = await storedPackages(store, { documented });
    assert.deepEqual(ids(r), ["default/VBA", "built-in/cefPackage145", "built-in/tbIDE"]);
    assert.equal(r.skipped, 2);
    assert.equal(r.list[0].apiPath, path.join(store, "default", "VBA", "api.json"));
  });

  test("--all takes every package that has an api.json, documented or not", async () => {
    const r = await storedPackages(store, { documented, all: true });
    assert.deepEqual(ids(r), [
      "default/VBA",
      "built-in/cefPackage145",
      "built-in/cefPackage49",
      "built-in/tbIDE",
      "contributed/ArrayListLib",
    ]);
    assert.equal(r.skipped, 0);
  });

  test("a name takes that package whether or not it is documented, and nothing else", async () => {
    const r = await storedPackages(store, { documented, names: ["cefPackage49", "VBA", "Missing"] });
    assert.deepEqual(ids(r), ["default/VBA", "built-in/cefPackage49"]);
    assert.equal(r.skipped, 0);
    assert.deepEqual(ids(await storedPackages(store, { documented, names: ["ArrayListLib"] })), [
      "contributed/ArrayListLib",
    ]);
  });

  test("a store with no group folders, or with no package the reference documents, has none to take", async () => {
    assert.deepEqual(await storedPackages(path.join(tmp, "no-such-store"), { documented }), { list: [], skipped: 0 });
    assert.deepEqual(await storedPackages(store, { documented: new Map() }), { list: [], skipped: 5 });
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

describe("adoptSnapshots", () => {
  const store = mkdtempSync(path.join(tmp, "adopt-store-"));
  const snapshots = mkdtempSync(path.join(tmp, "adopt-snapshots-"));
  putPackage(store, "contributed", "New", { api: apiText("1.0.5.0") });
  putPackage(store, "contributed", "Newer", { api: apiText("2.0.0.0") });
  putPackage(store, "built-in", "Kept", { api: apiText("beta-x-1005") });
  mkdirSync(path.join(snapshots, "built-in", "Kept"), { recursive: true });
  writeFileSync(path.join(snapshots, "built-in", "Kept", "api.json"), apiText("beta-x-0997"));
  const documented = new Map([
    ["contributed/New", { indexedFrom: "1.0.5.0" }],
    ["contributed/Newer", { indexedFrom: "1.0.0.0" }],
    ["contributed/Unsynced", { indexedFrom: "1.0.0.0" }],
    ["built-in/Kept", { indexedFrom: "beta-x-1005" }],
  ]);

  test("gives a documented package with no snapshot the store's, only at the version its section names", async () => {
    assert.deepEqual(await adoptSnapshots(store, snapshots, documented), [{ group: "contributed", package: "New" }]);
    assert.equal(readFileSync(path.join(snapshots, "contributed", "New", "api.json"), "utf-8"), apiText("1.0.5.0"));
    assert.throws(() => readFileSync(path.join(snapshots, "contributed", "Newer", "api.json")), { code: "ENOENT" });
    // A snapshot there is the baseline, whatever the store holds.
    assert.equal(readFileSync(path.join(snapshots, "built-in", "Kept", "api.json"), "utf-8"), apiText("beta-x-0997"));
  });
});

// ------------------------------------------------------- the reference's package sections

const page = (frontmatter, body = "Text.\n") => `---\n${frontmatter}\n---\n\n# Title\n\n${body}`;

describe("a package page's frontmatter", () => {
  test("is the block between the first two --- lines, with a byte order mark or CRLF line ends", () => {
    assert.equal(frontmatterOf(page("title: A\nnav_order: 1")), "title: A\nnav_order: 1");
    assert.equal(frontmatterOf(`﻿${page("title: A")}`), "title: A");
    assert.equal(frontmatterOf(page("title: A\nnav_order: 1").replaceAll("\n", "\r\n")), "title: A\r\nnav_order: 1");
    assert.equal(frontmatterOf("# No frontmatter\n"), null);
  });

  test("gives a key's value, and not a line of the body that looks like one", () => {
    const text = page("title: A\nindexed_from: beta-x-0997 \n", "indexed_from: beta-x-0001\npackage_name: X\n");
    const block = frontmatterOf(text);
    assert.equal(frontmatterValue(block, "indexed_from"), "beta-x-0997");
    assert.equal(frontmatterValue(block, "package_name"), null);
    assert.equal(frontmatterValue(null, "title"), null);
  });

  test("gives the items of a list key, in order, and an empty list for a key that is not there", () => {
    const block = frontmatterOf(
      page(
        "title: A\nexclude_from_docs:\n  - InternalStuff\n  - EventLogAPIs\nexclude_kinds:\n  - Declare\nindexed_from: x",
      ),
    );
    assert.deepEqual(frontmatterList(block, "exclude_from_docs"), ["InternalStuff", "EventLogAPIs"]);
    assert.deepEqual(frontmatterList(block, "exclude_kinds"), ["Declare"]);
    assert.deepEqual(frontmatterList(block, "redirect_from"), []);
  });

  test("names the packages it documents by package_name, else by its folder", () => {
    assert.deepEqual(packageNames("title: A", "VBA"), ["VBA"]);
    assert.deepEqual(packageNames("package_name: WebView2Package", "WebView2"), ["WebView2Package"]);
    assert.deepEqual(packageNames("package_name: CustomControls, CustomControlsPackage", "CustomControls"), [
      "CustomControls",
      "CustomControlsPackage",
    ]);
    assert.deepEqual(packageNames("package_name:  ", "Folder"), ["Folder"]);
  });

  test("gives a section its folder, packages, indexed_from and exclusions", () => {
    const text = page(
      "title: A\npackage_name: P1, P2\nindexed_from: beta-x-0997\nexclude_from_docs:\n  - Hidden\nexclude_kinds:\n  - Declare",
    );
    const s = readSection("/ref/Built-In/A", "A", text);
    assert.equal(s.dir, "/ref/Built-In/A");
    assert.deepEqual(s.packages, ["P1", "P2"]);
    assert.equal(s.indexedFrom, "beta-x-0997");
    assert.deepEqual([...s.exclusions.containers], ["Hidden"]);
    assert.deepEqual([...s.exclusions.kinds], ["Declare"]);
    assert.equal(readSection("/ref/Default/B", "B", page("title: B")).indexedFrom, null);
  });
});

describe("documentedPackages", () => {
  const ref = mkdtempSync(path.join(tmp, "reference-"));
  const put = (rel, text) => {
    mkdirSync(path.dirname(path.join(ref, rel)), { recursive: true });
    writeFileSync(path.join(ref, rel), text);
  };
  put("Default/VBA/index.md", page("title: VBA Package\nindexed_from: beta-x-0997"));
  put("Default/VBA/Strings/index.md", page("title: Strings\npackage_name: NotAPackage"));
  put("Built-In/WebView2/index.md", page("title: WebView2 Package\npackage_name: WebView2Package"));
  put("Built-In/CustomControls/index.md", page("title: CC\npackage_name: CustomControls, CustomControlsPackage"));
  put("Built-In/NoIndex/Page.md", page("title: Not a section"));
  put("Built-In/stray.md", page("title: A file, not a folder"));
  const found = documentedPackages(ref);

  test("keys each package by its group and name, from the sections of that group's folder", async () => {
    assert.deepEqual(
      [...(await found).keys()],
      ["default/VBA", "built-in/CustomControls", "built-in/CustomControlsPackage", "built-in/WebView2Package"],
    );
  });

  test("a package_name replaces the folder's name, and one section can document several packages", async () => {
    const map = await found;
    assert.equal(map.has("built-in/WebView2"), false);
    assert.equal(map.get("built-in/CustomControls"), map.get("built-in/CustomControlsPackage"));
    assert.equal(map.get("built-in/WebView2Package").dir, path.join(ref, "Built-In", "WebView2"));
  });

  test("only a folder's own index.md makes it a section, and a page deeper down is not one", async () => {
    const map = await found;
    assert.equal(map.has("built-in/NoIndex"), false);
    assert.equal(map.has("default/NotAPackage"), false);
    assert.equal(map.get("default/VBA").indexedFrom, "beta-x-0997");
  });

  test("a reference with none of the group folders documents nothing", async () => {
    assert.equal((await documentedPackages(path.join(tmp, "no-such-reference"))).size, 0);
  });
});

describe("sectionPages", () => {
  test("reads each page's title, parent and permalink, quoted or not, in path order", async () => {
    const dir = mkdtempSync(path.join(tmp, "section-"));
    mkdirSync(path.join(dir, "Widget"));
    writeFileSync(path.join(dir, "index.md"), page('title: "Toy Package"\npermalink: /tB/Toy/'));
    writeFileSync(path.join(dir, "Widget", "index.md"), page("title: Widget\nparent: 'Toy Package'"));
    writeFileSync(path.join(dir, "notes.txt"), "not a page");
    writeFileSync(path.join(dir, "Draft.md"), "no frontmatter");
    assert.deepEqual(await sectionPages(dir), [
      { rel: "Widget/index.md", title: "Widget", parent: "Toy Package", permalink: null },
      { rel: "index.md", title: "Toy Package", parent: null, permalink: "/tB/Toy/" },
    ]);
    assert.deepEqual(await sectionPages(path.join(dir, "missing")), []);
  });
});

describe("planning the pages of a report", () => {
  const member = (name, kind) => ({ name, kind, vis: "public", signature: `Public ${kind} ${name}()` });
  const api = {
    types: [
      {
        name: "Widget",
        kind: "class",
        file: "Widget.twin",
        members: [member("Size", "property"), member("Grow", "sub")],
      },
      { name: "Helpers", kind: "module", file: "Helpers.twin", members: [member("Twice", "function")] },
      { name: "Gadget", kind: "class", file: "Gadget.twin", members: [member("Spin", "sub")] },
      { name: "Shade", kind: "enum", file: "Enums.twin" },
      { name: "Hue", kind: "enum", file: "Enums.twin" },
    ],
  };
  const toy = (rel, title, parent, link) => ({ rel, title, parent, permalink: `/tB/Packages/Toy/${link}` });
  const pages = [
    toy("Enumerations/Shade.md", "Shade", "Enumerations", "Enumerations/Shade"),
    toy("Enumerations/index.md", "Enumerations", "Toy Package", "Enumerations/"),
    toy("Helpers.md", "Helpers", "Toy Package", "Helpers"),
    toy("Widget/Size.md", "Size", "Widget", "Widget/Size"),
    toy("Widget/index.md", "Widget", "Toy Package", "Widget/"),
    toy("index.md", "Toy Package", "Built-In Packages", ""),
  ];
  const task = (action, symbol, kind, module, extra = {}) => ({
    action,
    symbol,
    kind,
    module,
    file: "X.twin",
    ...extra,
  });
  const report = {
    package: "Toy",
    group: "built-in",
    mode: "update",
    to: "beta-x-1005",
    tasks: [
      task("create", "Grow", "Sub", "Widget"),
      task("create", "Twice", "Function", "Helpers"),
      task("create", "Hue", "Enum", "Hue"),
      task("create", "Spin", "Sub", "Gadget"),
      task("create", "Gadget", "Class", "Gadget"),
      task("create", "Lost", "Sub", "Missing"),
      task("update", "Size", "Property", "Widget", { reason: "signature_changed", changes: ["signature"] }),
      task("flag_removal", "Shrink", "Sub", "Widget"),
    ],
  };
  const plan = planPackage({ report, api, pages, sectionDir: "docs/Toy", sourceDir: "store/Toy/sources" });
  const of = (symbol) => plan.tasks.find((t) => t.symbol === symbol);

  test("a member of a type with a folder gets a page in it, beside a model page, and a permalink by folder", () => {
    assert.equal(plan.permalinks, true);
    assert.deepEqual(of("Grow"), {
      action: "create",
      symbol: "Grow",
      kind: "Sub",
      container: "Widget",
      signature: null,
      source: "store/Toy/sources/X.twin",
      file: "docs/Toy/Widget/Grow.md",
      new: true,
      inline: false,
      parent: "Widget",
      permalink: "/tB/Packages/Toy/Widget/Grow",
      containerPage: "docs/Toy/Widget/index.md",
      model: "docs/Toy/Widget/Size.md",
    });
  });

  test("a member of a type on one page goes on that page, with no permalink", () => {
    const t = of("Twice");
    assert.equal(t.file, "docs/Toy/Helpers.md");
    assert.equal(t.inline, true);
    assert.equal(t.new, false);
    assert.equal(t.permalink, null);
  });

  test("a new type goes in the folder its kind is kept in, under that folder's page", () => {
    const t = of("Hue");
    assert.equal(t.file, "docs/Toy/Enumerations/Hue.md");
    assert.equal(t.parent, "Enumerations");
    assert.equal(t.permalink, "/tB/Packages/Toy/Enumerations/Hue");
    assert.equal(t.model, "docs/Toy/Enumerations/Shade.md");
  });

  test("a page of a kind its section has none of takes a model of the same shape from another section", () => {
    const models = sectionModels({ api, pages });
    assert.deepEqual(models.get("Class"), ["Widget/index.md"]);
    assert.deepEqual(models.get("Enum"), ["Enumerations/Shade.md"]);
    assert.deepEqual(models.get("Module"), ["Helpers.md"]);
    assert.deepEqual(models.get("member Property"), ["Widget/Size.md"]);
    assert.equal(models.has("member Sub"), false);

    const fresh = planPackage({
      report: {
        ...report,
        tasks: [
          task("create", "Gadget", "Class", "Gadget"),
          task("create", "Spin", "Sub", "Gadget"),
          task("create", "Hue", "Enum", "Hue"),
        ],
      },
      api,
      pages: [],
      sectionDir: "docs/New",
      sourceDir: "s",
      newLanding: newLandingFor("New", []),
      borrowedModels: [
        { dir: "docs/Flat", models: new Map([["Class", ["Flat.md"]]]) },
        { dir: "docs/Toy", models },
      ],
    });
    const model = (symbol) => fresh.tasks.find((t) => t.symbol === symbol).model;
    // Gadget gets a folder, so Flat.md, a page of its own, is passed over.
    assert.equal(model("Gadget"), "docs/Toy/Widget/index.md");
    assert.equal(model("Hue"), "docs/Toy/Enumerations/Shade.md");
    // No section has a Sub on a page of its own.
    assert.equal(model("Spin"), null);
    // A section's own model comes first.
    assert.equal(of("Hue").model, "docs/Toy/Enumerations/Shade.md");
  });

  test("a new type with new members gets a folder, and its members pages in it", () => {
    assert.equal(of("Gadget").file, "docs/Toy/Gadget/index.md");
    assert.equal(of("Gadget").parent, "Toy Package");
    assert.equal(of("Gadget").permalink, "/tB/Packages/Toy/Gadget/");
    assert.equal(of("Spin").file, "docs/Toy/Gadget/Spin.md");
    assert.equal(of("Spin").parent, "Gadget");
    assert.deepEqual(
      plan.tasks.map((t) => t.symbol),
      ["Hue", "Gadget", "Grow", "Twice", "Spin", "Size"],
    );
  });

  test("a change is to the page that documents the symbol; a member of a type with no page is unplaced", () => {
    assert.equal(of("Size").file, "docs/Toy/Widget/Size.md");
    assert.equal(of("Size").reason, "signature_changed");
    assert.deepEqual(
      plan.unplaced.map((t) => [t.symbol, t.reason]),
      [["Lost", "Missing has no page"]],
    );
    assert.deepEqual(
      plan.flagged.map((t) => [t.symbol, t.file]),
      [["Shrink", null]],
    );
  });

  test("a batch is a type with its new members, or one type's members", () => {
    assert.deepEqual(
      batchTasks(plan).map((b) => [b.container, b.tasks.map((t) => t.symbol)]),
      [
        ["Hue", ["Hue"]],
        ["Gadget", ["Gadget", "Spin"]],
        ["Widget", ["Grow", "Size"]],
        ["Helpers", ["Twice"]],
      ],
    );
  });

  test("a batch holds PAGES_PER_BATCH pages at most, unless they go on one page", () => {
    const many = (container, inline) =>
      Array.from({ length: PAGES_PER_BATCH + 1 }, (_, i) => ({ container, symbol: `M${i}`, inline }));
    const sizes = (tasks) => batchTasks({ tasks }).map((b) => b.tasks.length);
    assert.deepEqual(sizes(many("A", false)), [PAGES_PER_BATCH, 1]);
    assert.deepEqual(sizes(many("B", true)), [PAGES_PER_BATCH + 1]);
  });

  test("permalinks are computed only when every page's follows its folder, X/X.md as a folder's page", () => {
    const at = (rel, permalink) => ({ rel, title: rel, parent: null, permalink });
    const landing = at("index.md", "/tB/X/");
    const app = [landing, at("_App/_App.md", "/tB/X/_App/"), at("_App/Build.md", "/tB/X/_App/Build")];
    assert.equal(followsFolders(app, landing), true);
    // A member named like its folder, beside the folder's index.md, is a page of its own.
    const timer = [landing, at("Timer/index.md", "/tB/X/Timer/"), at("Timer/Timer.md", "/tB/X/Timer/Timer")];
    assert.equal(followsFolders(timer, landing), true);
    assert.equal(followsFolders([landing, at("A.md", "/tB/Modules/A")], landing), false);
    assert.equal(permalinkByFolder("/tB/X", "A/index.md"), "/tB/X/A/");
  });

  test("a section's own habits decide: members on the folder's index.md, by kind, and sub-objects in their owner's folder", () => {
    const sig = (name, kind, as) => ({ name, kind, vis: "public", signature: `Public ${kind} ${name}() As ${as}` });
    const vbApi = {
      types: [
        {
          name: "Grid",
          kind: "class",
          file: "G.twin",
          members: [
            sig("Rows", "property", "Long"),
            sig("Count", "function", "Long"),
            sig("Width", "property", "Long"),
          ],
        },
        { name: "Pane", kind: "class", file: "P.twin", members: [sig("Height", "property", "Long")] },
        { name: "Cells", kind: "class", file: "C.twin", members: [sig("Item", "function", "Cell")] },
        { name: "Cell", kind: "class", file: "C.twin", members: [] },
        { name: "Picker", kind: "class", file: "K.twin", attrs: [{ name: "WindowsControl", args: '"x.png"' }] },
        { name: "Dial", kind: "class", file: "D.twin", attrs: [{ name: "WindowsControl", args: '"y.png"' }] },
      ],
    };
    const at = (rel, title, parent) => ({ rel, title, parent, permalink: null });
    const vbPages = [
      at("index.md", "Kit Package", null),
      // Grid keeps its properties on pages of their own and its functions on its index.md.
      at("Grid/index.md", "Grid", "Kit Package"),
      at("Grid/Rows.md", "Rows", "Grid"),
      at("Grid/Width.md", "Width", "Grid"),
      at("Grid/Cells.md", "Cells", "Grid"),
      // Pane keeps its members on its index.md, as VB's classes do.
      at("Pane/index.md", "Pane", "Kit Package"),
      at("Picker/index.md", "Picker", "Kit Package"),
    ];
    const tasks = [
      task("create", "Height2", "Property", "Pane"),
      task("create", "Total", "Function", "Grid"),
      task("create", "Depth", "Property", "Grid"),
      task("create", "Cell", "Class", "Cell"),
      task("create", "Dial", "Class", "Dial"),
    ];
    vbApi.types[1].members.push(sig("Height2", "property", "Long"));
    vbApi.types[0].members.push(sig("Total", "function", "Long"), sig("Depth", "property", "Long"));
    const vb = planPackage({
      report: { ...report, tasks },
      api: vbApi,
      pages: vbPages,
      sectionDir: "K",
      sourceDir: "s",
    });
    const file = (symbol) => vb.tasks.find((t) => t.symbol === symbol);
    assert.deepEqual([file("Height2").file, file("Height2").inline], ["K/Pane/index.md", true]);
    assert.deepEqual([file("Total").file, file("Total").inline], ["K/Grid/index.md", true]);
    assert.deepEqual([file("Depth").file, file("Depth").model], ["K/Grid/Depth.md", "K/Grid/Rows.md"]);
    // Cells, in Grid's folder, returns Cell: Cell goes beside it.
    assert.deepEqual([file("Cell").file, file("Cell").parent], ["K/Grid/Cell.md", "Grid"]);
    // A control goes as the section's other control does, not as its classes.
    assert.equal(file("Dial").file, "K/Dial/index.md");
  });

  test("a page named Index is named by its kind as well, never Index.md beside a folder's index.md", () => {
    const withIndex = {
      types: [
        { ...api.types[0], members: [...api.types[0].members, member("Index", "property")] },
        ...api.types.slice(1),
      ],
    };
    const indexed = planPackage({
      report: { ...report, tasks: [task("create", "Index", "Property", "Widget")] },
      api: withIndex,
      pages,
      sectionDir: "docs/Toy",
      sourceDir: "s",
    });
    assert.equal(indexed.tasks[0].file, "docs/Toy/Widget/IndexProperty.md");
    assert.equal(indexed.tasks[0].permalink, "/tB/Packages/Toy/Widget/IndexProperty");
  });

  test("a section with no landing page gets one like its group's others", () => {
    const sibling = (folder) => ({
      folder,
      title: `${folder} Package`,
      parent: "Contributed Packages",
      permalink: `/tB/Packages/Contributed/${folder}/`,
    });
    assert.deepEqual(newLandingFor("New", [sibling("A"), sibling("B")]), {
      title: "New Package",
      parent: "Contributed Packages",
      permalink: "/tB/Packages/Contributed/New/",
    });
    const odd = { ...sibling("C"), permalink: "/elsewhere/" };
    assert.equal(newLandingFor("New", [sibling("A"), odd]).permalink, null);
    assert.deepEqual(newLandingFor("New", []), { title: "New Package", parent: null, permalink: null });

    const fresh = planPackage({
      report: { ...report, tasks: [task("create", "Gadget", "Class", "Gadget")] },
      api,
      pages: [],
      sectionDir: "docs/New",
      sourceDir: "s",
      newLanding: { ...newLandingFor("New", [sibling("A")]), author: "Someone" },
    });
    assert.deepEqual(fresh.landing, {
      file: "docs/New/index.md",
      title: "New Package",
      parent: "Contributed Packages",
      permalink: "/tB/Packages/Contributed/New/",
      new: true,
      author: "Someone",
    });
    assert.equal(fresh.tasks[0].file, "docs/New/Gadget.md");
    assert.equal(fresh.tasks[0].parent, "New Package");
    assert.equal(fresh.tasks[0].permalink, "/tB/Packages/Contributed/New/Gadget");
  });
});
