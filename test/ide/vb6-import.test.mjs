// The IDE's VB6 import, tested for what it makes of the Attribute lines VB6
// writes: the module attributes (VB_Name, VB_GlobalNameSpace, VB_Creatable,
// VB_PredeclaredId, VB_Exposed, VB_Description, VB_HelpID, VB_Ext_KEY) and the
// member attributes (VB_Description, VB_VarDescription, VB_UserMemId,
// VB_VarUserMemId, VB_MemberFlags, VB_VarMemberFlags, VB_HelpID, VB_VarHelpID,
// VB_ProcData.VB_Invoke_Property / PropertyPut / PropertyPutRef,
// VB_VarProcData), and of a UserControl's PropertyPages list.
//
// The project is probes/vb6-import, an ActiveX DLL written as VB6 writes one:
// a .bas, five .cls, a .frm, a .ctl and a .pag. It is staged in the lane's work
// folder with CRLF line ends, as VB6 writes them, and with the .ctl's binary
// part, ctlAttrs.ctx, written here (ctx below). It is imported as a person does
// it: a double-click on the New / Open Project dialog's Import from VBP...
// tile, with the file the native Open dialog would return stood in
// (standIn), then Continue in New Project Options and Continue Anyway in the
// box that says an ActiveX DLL registers itself in HKEY_LOCAL_MACHINE. The
// imported project is saved with Ctrl+S, the native Save As dialog stood in
// the same way, and the saved .twinproj is unpacked with impexp and read.
//
// The import rewrites no Attribute line. A .bas or .cls file is kept as VB6
// wrote it; a .frm, .ctl or .pag becomes a .twin file whose Class holds the
// module's code, Attribute lines and all, beside a designer file. So what an
// Attribute line does is the compiler's business, and the last tests build the
// project and read the type library the DLL carries. The build cannot register
// anything: the project is opened again with project.dllRegisterAfterBuild
// false, and built into the lane's work folder. The type library is read with
// LoadTypeLibEx and REGKIND_NONE, by a 64-bit PowerShell (typeLibrary), which
// cannot run the 32-bit DLL's code.
//
// Each test states what BETA 1010 does. If one fails after an IDE update, the
// IDE has changed: update the FAQ's VB6-import answer
// (docs/Miscellaneous/FAQs.md), the entry "Some VB6 attribute lines have no
// effect in a built type library" in BUGS-TO-REPORT.md or bugs/filed/, and
// then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildProject } from "../../scripts/lib/tb-ide.mjs";
import { click, pressKey, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { unpackProject } from "../../scripts/lib/tb-project.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, "probes", "vb6-import");
const NAME = "AttrProj";

// ctlAttrs' PropertyPages, as VB6's Connect Property Pages dialog lists them:
// the project's own page, then three of the standard ones.
const PAGES = ["pagAttrs", "StandardColor", "StandardFont", "StandardPicture"];

// A UserControl's PropertyPages list as VB6 keeps it in the .ctx, at the offset
// the .ctl's `PropertyPages = "ctlAttrs.ctx":0000` names: a 4-byte count, then
// each name as a 2-byte length and its ANSI characters. VB6's /make loads a
// control written so; written with a 2-byte count, or with 4-byte lengths, it
// refuses the control ("Property PropertyPages in ctlAttrs could not be set").
function ctx(names) {
  const count = Buffer.alloc(4);
  count.writeUInt32LE(names.length);
  const parts = [count];
  for (const name of names) {
    const length = Buffer.alloc(2);
    length.writeUInt16LE(name.length);
    parts.push(length, Buffer.from(name, "latin1"));
  }
  return Buffer.concat(parts);
}

const crlf = (text) => text.replace(/\r?\n/g, "\r\n");
const fixture = (file) => readFileSync(path.join(FIXTURE, file), "utf8");

// The titles of the modal dialogs showing, top one last.
const modals = (c) =>
  c.evaluate(`[...document.querySelectorAll(".modalDialogContainer")]
    .filter((m) => m.getBoundingClientRect().width)
    .map((m) => m.querySelector(".modalTitleBar")?.innerText.trim() ?? "")`);

// Wait for a dialog whose title contains `title`.
const waitModal = (c, title, timeout = 60 * 1000) =>
  waitFor(c, async () => (await modals(c)).some((t) => t.includes(title)), { timeout, interval: 150 });

// The answer a native dialog would give, stood in for once: the page asks the
// host object for a file name (OpenProjectVBP, SaveProjectAs), and a dialog on
// the private desktop could not be answered. Every other call goes on to the
// real host object, and the first call to `method` puts it back.
const standIn = (c, method, value) =>
  c.evaluate(`(() => {
    const real = hostAppObject;
    hostAppObject = new Proxy(real, {
      get(target, key) {
        if (key === ${JSON.stringify(method)}) {
          return () => {
            hostAppObject = real;
            return Promise.resolve(${JSON.stringify(value)});
          };
        }
        const v = Reflect.get(target, key);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
  })()`);

// The code of a .frm, .ctl or .pag: its lines after the designer block, which
// ends with the first line that is "End" alone.
function vb6Code(text) {
  const lines = text.split(/\r?\n/);
  return lines.slice(lines.indexOf("End") + 1);
}

// A .twin file holding one Class: the attribute lines in front of it, the
// class's name, and its body with the four spaces of indent taken off.
function twinClass(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^Class \w+$/.test(l));
  const end = lines.lastIndexOf("End Class");
  assert.ok(start >= 0 && end > start, `no Class block in:\n${text}`);
  return {
    attributes: lines.slice(0, start),
    name: lines[start].slice("Class ".length),
    body: lines.slice(start + 1, end).map((l) => l.replace(/^ {4}/, "")),
  };
}

// The trailing empty lines of a list of lines, taken off.
function trimEnd(lines) {
  const out = [...lines];
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

// The types of the type library in a file, each with its members, read through
// .NET's ComTypes in PowerShell: LoadTypeLibEx with REGKIND_NONE registers
// nothing. The script goes in with -EncodedCommand, as tb-registry.mjs's does,
// and the file's path in an environment variable.
const TYPELIB_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
public static class TbTypeLibrary {
  [System.Runtime.InteropServices.DllImport("oleaut32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode, PreserveSig = false)]
  static extern ITypeLib LoadTypeLibEx(string file, int regkind);
  static string Q(string s) {
    if (s == null) return "null";
    var b = new StringBuilder("\"");
    foreach (char ch in s) {
      if (ch == '"' || ch == '\\') b.Append('\\').Append(ch);
      else if (ch < ' ') b.AppendFormat("\\u{0:x4}", (int)ch);
      else b.Append(ch);
    }
    return b.Append('"').ToString();
  }
  static string Member(ITypeInfo ti, string kind, int memid, int invkind, int flags) {
    string name, doc, file; int ctx;
    ti.GetDocumentation(memid, out name, out doc, out ctx, out file);
    return "{\"kind\":" + Q(kind) + ",\"name\":" + Q(name) + ",\"memid\":" + memid + ",\"invkind\":" + invkind +
      ",\"flags\":" + flags + ",\"doc\":" + Q(doc) + ",\"helpContext\":" + ctx + "}";
  }
  public static string Read(string path) {
    ITypeLib lib = LoadTypeLibEx(path, 2);
    var types = new List<string>();
    int n = lib.GetTypeInfoCount();
    for (int i = 0; i < n; i++) {
      ITypeInfo ti;
      lib.GetTypeInfo(i, out ti);
      IntPtr pa;
      ti.GetTypeAttr(out pa);
      var ta = (TYPEATTR)System.Runtime.InteropServices.Marshal.PtrToStructure(pa, typeof(TYPEATTR));
      ti.ReleaseTypeAttr(pa);
      var members = new List<string>();
      for (int f = 0; f < ta.cFuncs; f++) {
        IntPtr p;
        ti.GetFuncDesc(f, out p);
        var fd = (FUNCDESC)System.Runtime.InteropServices.Marshal.PtrToStructure(p, typeof(FUNCDESC));
        ti.ReleaseFuncDesc(p);
        members.Add(Member(ti, "func", fd.memid, (int)fd.invkind, fd.wFuncFlags & 0xFFFF));
      }
      for (int v = 0; v < ta.cVars; v++) {
        IntPtr p;
        ti.GetVarDesc(v, out p);
        var vd = (VARDESC)System.Runtime.InteropServices.Marshal.PtrToStructure(p, typeof(VARDESC));
        ti.ReleaseVarDesc(p);
        members.Add(Member(ti, "var", vd.memid, 0, vd.wVarFlags & 0xFFFF));
      }
      string name, doc, file; int ctx;
      ti.GetDocumentation(-1, out name, out doc, out ctx, out file);
      types.Add("{\"name\":" + Q(name) + ",\"typekind\":" + (int)ta.typekind + ",\"flags\":" + ((int)ta.wTypeFlags & 0xFFFF) +
        ",\"doc\":" + Q(doc) + ",\"helpContext\":" + ctx + ",\"members\":[" + string.Join(",", members) + "]}");
    }
    return "[" + string.Join(",", types) + "]";
  }
}
'@
try {
  [Console]::Out.Write([TbTypeLibrary]::Read($env:TB_TYPELIB_FILE))
} catch {
  [Console]::Out.Write((ConvertTo-Json -InputObject ([ordered]@{ error = $_.Exception.Message }) -Compress))
}
`;

function typeLibrary(file) {
  const out = execFileSync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(TYPELIB_SCRIPT, "utf16le").toString("base64")],
    {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, TB_TYPELIB_FILE: file },
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const answer = JSON.parse(out.replace(/^\u{FEFF}/u, ""));
  if (answer.error !== undefined) throw new Error(`reading the type library of ${file}: ${answer.error}`);
  return answer;
}

// TYPEKIND, and the flags the tests look for. VB_MemberFlags is the member's
// FUNCFLAGS in hex: "40" FHIDDEN, "400" FNONBROWSABLE, "200" FUIDEFAULT and "14"
// FBINDABLE | FDISPLAYBIND, as VB6's Procedure Attributes dialog writes them.
const TKIND_DISPATCH = 4;
const TKIND_COCLASS = 5;
const TYPEFLAG = { FAPPOBJECT: 0x1, FCANCREATE: 0x2, FPREDECLID: 0x8 };
const FUNCFLAG = { FHIDDEN: 0x40, FNONBROWSABLE: 0x400 };
const INVOKE_PROPERTYGET = 2;

scenario("VB6 import", (lane) => {
  let c;
  const vbpDir = path.join(lane.work, "vb6", NAME);
  const vbp = path.join(vbpDir, `${NAME}.vbp`);
  const saved = path.join(lane.work, "saved", `${NAME}.twinproj`);
  const unpacked = path.join(lane.work, "unpacked");
  const dll = path.join(lane.work, "out", `${NAME}.dll`);
  let tlb = null; // the built DLL's type library, once the build test has run

  const source = (file) => readFileSync(path.join(unpacked, "Sources", file), "utf8");
  // A coclass, or the dispatch interface VB6 names after it with "_".
  const coclass = (name) => tlb?.find((t) => t.typekind === TKIND_COCLASS && t.name === name);
  const dispatch = (name) => tlb?.find((t) => t.typekind === TKIND_DISPATCH && t.name === `_${name}`);
  function member(cls, name, invkind = null) {
    assert.ok(tlb, "no type library: the build test did not pass");
    const iface = dispatch(cls);
    assert.ok(iface, `the type library has no _${cls}`);
    const m = iface.members.find((m) => m.name === name && (invkind === null || m.invkind === invkind));
    assert.ok(m, `_${cls} has no ${name}`);
    return m;
  }

  before(async () => {
    mkdirSync(vbpDir, { recursive: true });
    mkdirSync(path.dirname(saved), { recursive: true });
    for (const f of readdirSync(FIXTURE)) writeFileSync(path.join(vbpDir, f), crlf(fixture(f)));
    writeFileSync(path.join(vbpDir, "ctlAttrs.ctx"), ctx(PAGES));

    c = await lane.openNoProject();
    assert.ok(await waitModal(c, "New / Open"), "the IDE showed no New / Open Project dialog");
    // The tiles are listed once the IDE has the samples and projects from its host.
    await waitFor(
      c,
      () =>
        c.evaluate(
          `[...document.querySelectorAll(".frontPageListViewItem")].some((e) => e.textContent.trim() === "Import from VBP...")`,
        ),
      { timeout: 30 * 1000 },
    );
    await standIn(c, "OpenProjectVBP", vbp);
    await click(c, { css: ".frontPageListViewItem", text: "Import from VBP..." }, { clickCount: 2 });
    assert.ok(await waitModal(c, "New Project Options"), "the import showed no New Project Options dialog");
    await click(c, "OKBTN");
    assert.ok(
      await waitFor(
        c,
        () =>
          c.evaluate(`[...document.querySelectorAll(".modalDialogContainer")].some((m) =>
            m.getBoundingClientRect().width && /HKEY_LOCAL_MACHINE/.test(m.innerText))`),
        { timeout: 60 * 1000 },
      ),
      "the import of an ActiveX DLL showed no box about HKEY_LOCAL_MACHINE",
    );
    await click(c, { css: ".msgBoxButton", text: "Continue Anyway" });
    const loaded = await waitFor(
      c,
      async () =>
        !(await modals(c)).length &&
        (await c.evaluate(`/OPERATIONAL/.test(compilerStatus.textContent) &&
          !!fs.tree.resolvePath(${JSON.stringify(`twinbasic:/${NAME}/Sources/clsAttrs.cls`)})`)),
      { timeout: 60 * 1000 },
    );
    assert.ok(loaded, "the imported project never showed in Project Explorer");

    await standIn(c, "SaveProjectAs", saved);
    await pressKey(c, "s", { ctrl: true });
    const done = await waitFor(
      c,
      async () =>
        existsSync(saved) && (await c.evaluate(`projectFilePath === ${JSON.stringify(saved)} && !projectIsDirty`)),
      { timeout: 60 * 1000 },
    );
    assert.ok(done, `Ctrl+S did not save the imported project as ${saved}`);
    unpackProject(saved, unpacked);
  });

  test("the import log names each file it imported", () => {
    const log = source("__IMPORT_LOG.md");
    for (const line of [
      "imported module 'modAttrs.bas'",
      "imported class 'clsAttrs.cls'",
      "imported class 'clsGlobal.cls'",
      "imported class 'clsNotCreatable.cls'",
      "imported class 'clsPrivate.cls'",
      "imported class 'clsPlain.cls'",
      "imported form 'frmAttrs.frm'",
      "imported usercontrol 'ctlAttrs.ctl'",
      "imported propertypage 'pagAttrs.pag'",
    ]) {
      assert.ok(log.includes(line), `the log has no "${line}":\n${log}`);
    }
  });

  test("a .bas and a .cls are kept as VB6 wrote them, every Attribute line included", () => {
    const files = readdirSync(FIXTURE).filter((f) => /\.(bas|cls)$/.test(f));
    assert.equal(files.length, 6);
    for (const f of files) assert.equal(source(f), crlf(fixture(f)), `${f} changed`);
  });

  test("a .frm, a .ctl and a .pag become a Class in a .twin file that holds their code, Attribute lines and all", () => {
    for (const f of ["frmAttrs.frm", "ctlAttrs.ctl", "pagAttrs.pag"]) {
      const twin = twinClass(source(`${f}.twin`));
      assert.equal(twin.name, f.split(".")[0]);
      assert.deepEqual(trimEnd(twin.body), trimEnd(vb6Code(fixture(f))), `${f}.twin's Class is not the module's code`);
    }
  });

  test("the attributes in front of the Class are the designer's own, none made from an Attribute line", () => {
    const names = (f) =>
      twinClass(source(`${f}.twin`))
        .attributes.filter((l) => l.trim())
        .map((l) => l.replace(/\(.*$/, ""));
    const ids = ["[FormDesignerId", "[ClassId", "[InterfaceId", "[EventInterfaceId"];
    // A form's VB_PredeclaredId = True stays an Attribute line: no [PredeclaredId].
    assert.deepEqual(names("frmAttrs.frm"), ids);
    assert.deepEqual(names("ctlAttrs.ctl"), [...ids, "[COMControl]"]);
    assert.deepEqual(names("pagAttrs.pag"), ids);
    // Nor anywhere else in the project's sources.
    const made =
      /^\s*\[(Description|DispId|DefaultMember|Enumerator|Hidden|NonBrowsable|PropertyPage|AppObject|COMCreatable)\b/m;
    for (const f of readdirSync(path.join(unpacked, "Sources"))) {
      assert.doesNotMatch(source(f), made, `${f} has a twinBASIC attribute the import wrote`);
    }
  });

  test("a UserControl's PropertyPages list goes into its .tbcontrol designer file", () => {
    const [designer] = JSON.parse(source("ctlAttrs.ctl.tbcontrol"));
    assert.deepEqual(designer.PropertyPages, PAGES);
    assert.ok(existsSync(path.join(unpacked, "Sources", "pagAttrs.pag.tbppage")), "the .pag has no .tbppage");
  });

  test("the imported project compiles with no errors and builds without registering", async () => {
    await lane.closeProject();
    const settingsFile = path.join(unpacked, "Settings");
    const settings = JSON.parse(readFileSync(settingsFile, "utf8"));
    assert.equal(settings["project.buildType"], "ActiveX DLL");
    settings["project.dllRegisterAfterBuild"] = false;
    writeFileSync(settingsFile, JSON.stringify(settings, null, "\t"));
    c = await lane.open(unpacked, { buildPath: dll }); // refuses a project with errors
    const built = await buildProject(c);
    assert.ok(built.ok, `the build failed: ${built.message}\n${built.log.join("\n")}`);
    assert.ok(existsSync(dll), `no ${dll}`);
    tlb = typeLibrary(dll);
  });

  test("VB_Description and VB_VarDescription are the help strings of the class, its members and its events", () => {
    assert.equal(coclass("clsAttrs")?.doc, "A class with every member attribute VB6 writes.");
    assert.equal(member("clsAttrs", "Value", INVOKE_PROPERTYGET).doc, "The default property.");
    assert.equal(member("clsAttrs", "Caption", INVOKE_PROPERTYGET).doc, "A public field with a description.");
    const events = tlb.find((t) => t.name === "__clsAttrs");
    assert.equal(events?.members.find((m) => m.name === "Changed")?.doc, "Raised when Value changes.");
  });

  test("VB_UserMemId and VB_VarUserMemId are the dispatch ids, a field's included", () => {
    assert.equal(member("clsAttrs", "Value", INVOKE_PROPERTYGET).memid, 0);
    assert.equal(member("clsAttrs", "NewEnum").memid, -4);
    assert.equal(member("clsAttrs", "WithId").memid, 7);
    assert.equal(member("clsAttrs", "Caption", INVOKE_PROPERTYGET).memid, 8);
  });

  test('VB_MemberFlags "40", "400" and "440" are hidden, nonbrowsable and both', () => {
    assert.equal(member("clsAttrs", "NewEnum").flags, FUNCFLAG.FHIDDEN);
    assert.equal(member("clsAttrs", "HiddenMethod").flags, FUNCFLAG.FHIDDEN);
    assert.equal(member("clsAttrs", "Unbrowsed").flags, FUNCFLAG.FNONBROWSABLE);
    assert.equal(member("clsAttrs", "HiddenUnbrowsed").flags, FUNCFLAG.FHIDDEN | FUNCFLAG.FNONBROWSABLE);
  });

  test("VB_Exposed, VB_Creatable, VB_GlobalNameSpace and VB_PredeclaredId decide which classes the type library has and how", () => {
    const { FAPPOBJECT, FCANCREATE, FPREDECLID } = TYPEFLAG;
    assert.equal(coclass("clsPlain")?.flags, FCANCREATE);
    assert.equal(coclass("clsNotCreatable")?.flags, 0);
    assert.equal(coclass("clsGlobal")?.flags, FAPPOBJECT | FCANCREATE | FPREDECLID);
    // VB_PredeclaredId = True alone gives the same three flags as [PredeclaredId] does.
    assert.equal(coclass("clsAttrs")?.flags, FAPPOBJECT | FCANCREATE | FPREDECLID);
    for (const name of ["clsPrivate", "frmAttrs", "ctlAttrs", "pagAttrs"]) {
      assert.equal(coclass(name), undefined, `${name}, VB_Exposed = False, is in the type library`);
    }
  });

  // The entry "Some VB6 attribute lines have no effect in a built type library"
  // in BUGS-TO-REPORT.md. Each assertion states the defect; one that fails means
  // that line now has its effect.
  test("VB_HelpID, VB_VarHelpID, VB_VarMemberFlags and VB_MemberFlags other than hidden and nonbrowsable have no effect", () => {
    assert.equal(coclass("clsAttrs")?.helpContext, 0, "VB_HelpID = 2000 on the class");
    assert.equal(member("clsAttrs", "Value", INVOKE_PROPERTYGET).helpContext, 0, "VB_HelpID = 2001");
    assert.equal(member("clsAttrs", "Caption", INVOKE_PROPERTYGET).helpContext, 0, "VB_VarHelpID = 2002");
    assert.equal(member("clsAttrs", "HiddenField", INVOKE_PROPERTYGET).flags, 0, 'VB_VarMemberFlags = "40"');
    assert.equal(member("clsAttrs", "UnbrowsedField", INVOKE_PROPERTYGET).flags, 0, 'VB_VarMemberFlags = "400"');
    assert.equal(member("clsAttrs", "UiDefault").flags, 0, 'VB_MemberFlags = "200"');
    assert.equal(member("clsAttrs", "Bound").flags, 0, 'VB_MemberFlags = "14"');
  });
});
