// Self-test for the symbol index: the .twin declaration scanner that
// scripts/build_package_api.mjs runs over the packages, the derivation
// builder/symbols.mjs runs over the pages, and the drift guard
// builder/symbol-baseline.mjs keeps over the URLs the index publishes.
//
//     node scripts/check_symbol_index.mjs
//
// Every probe is a fixture of its own -- a few lines of twinBASIC, a page or
// three, a scratch baseline file -- so none of it needs a build, a tree or a
// twinBASIC install, and nothing here touches builder/symbol-baseline.json.
//
// A build that indexes the reference cleanly says nothing about any of this:
// the site is one input, and the rules that did not fire on it are exactly the
// ones that stopped working unnoticed. So each rule is asserted here against
// the case that made it necessary:
//
//   - the scanner's traps, each met in the BETA 983 packages -- a Type whose
//     Subs have bodies, an Interface line inside a CoClass, `[Hidden]` on a
//     module whose members are global, a `$` name escaped in brackets, an
//     attribute on the declaration's own line, an attribute run spread over
//     continued lines;
//   - the derivation's rules -- a member on a page of its own and under a
//     heading, a member a base type declares found on the base's page, a page
//     filed under the wrong module, a `$` form, `symbols:`, a heading that
//     opens a section and must not be read as a member of the same name, the
//     typographer's ellipsis in a Core heading, and an attribute's `##`;
//   - the drift guard's refusals, which on a healthy tree it never shows.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkSymbolBaseline } from "../builder/symbol-baseline.mjs";
import { deriveSymbolIndex, headingsOf, serializeSymbolIndex } from "../builder/symbols.mjs";
import { GUARDED_SRC } from "../builder/page-baseline.mjs";
import { apiSnapshot, isPublicType, parseTwin } from "./lib/twin-api.mjs";

// A crash is the harness failing, not a finding: exit 2.
process.on("uncaughtException", (err) => { console.error(err); process.exit(2); });

let failures = 0;
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failures++;
}
const show = (x) => JSON.stringify(x);

// ------------------------------------------------------------ the scanner

{
  const { types, problems } = parseTwin([
    "Private Module HDCModule",
    "    Type HDC",
    "        Value As LongPtr",
    "        Private Sub Type_Assignment(ByVal RHS As LongPtr)",
    "            Me.Value = RHS",
    "        End Sub",
    "    End Type",
    "End Module",
  ].join("\n"));
  const hdc = types.find((t) => t.name === "HDC");
  check("a Type's Sub has a body, and its End Sub closes it", problems.length === 0 && hdc?.members.length === 2,
    show({ problems, members: hdc?.members }));
  check("a Type inside a Private module is not public", hdc && !isPublicType(hdc, types));
}

{
  const { types, problems } = parseTwin([
    "Interface _Collection",
    "    [DispId(1)]",
    "    Sub Add(ByRef Item As Variant)",
    "    [DispId(-4),Hidden,Restricted] Function _NewEnum() As stdole.IUnknown",
    "End Interface",
    "[CoClassId(\"A4C4671C-499F-101B-BB78-00AA00383CBB\")]",
    "CoClass Collection",
    "    [Default] Interface _Collection",
    "    [Source] Interface _CollectionEvents",
    "End CoClass",
  ].join("\n"));
  const co = types.find((t) => t.name === "Collection");
  const iface = types.find((t) => t.name === "_Collection");
  check("an Interface line inside a CoClass is not a block", problems.length === 0 && types.length === 2, show(problems));
  check("a CoClass knows its default and source interfaces",
    co?.interfaces.find((i) => i.isDefault)?.name === "_Collection" && co?.interfaces.find((i) => i.isSource)?.name === "_CollectionEvents",
    show(co?.interfaces));
  check("an attribute on the declaration's own line applies to it",
    iface?.members.find((m) => m.name === "_NewEnum")?.hidden === true && iface?.members.find((m) => m.name === "Add")?.hidden === false,
    show(iface?.members));
}

{
  const { types, problems } = parseTwin([
    "[Hidden]",
    "Module [_HiddenModule]",
    "    [Description(\"Returns \" & vbCrLf & _",
    "                  \"a [bracketed], string\")]",
    "    Public DeclareWide PtrSafe Function [Chr$] Lib \"<strings>\" Alias \"#4\" (ByVal C As Long) As String",
    "    Public DeclareWide PtrSafe Function Array Lib \"<hiddenmodule>\" Alias \"#-30\" (ParamArray A As Variant()) As Variant",
    "    Private Const Secret As Long = 1",
    "    Public Enum Paper",
    "        [A4 Portrait] = 1",
    "        Letter",
    "    End Enum",
    "End Module",
  ].join("\n"));
  const mod = types.find((t) => t.kind === "module");
  check("an escaped module name is read without its brackets", mod?.name === "_HiddenModule", show(mod?.name));
  check("[Hidden] on a module is recorded, and its members are still public",
    mod?.hidden === true && mod.members.filter((m) => m.vis === "public").map((m) => m.name).join() === "Chr$,Array",
    show(mod?.members));
  check("an attribute continued over lines, with brackets and commas in its string, is one attribute",
    problems.length === 0 && mod?.members.length === 3, show({ problems, members: mod?.members }));
  const paper = types.find((t) => t.name === "Paper");
  check("an escaped enumeration value keeps its space", paper?.members.map((m) => m.name).join("|") === "A4 Portrait|Letter",
    show(paper?.members));
}

{
  const { types } = parseTwin([
    "Class CommandButtonBaseCtl",
    "    Public Default As Boolean",
    "    Public Public As Boolean = True",
    "    Public Default Property Get Caption() As String",
    "    End Property",
    "End Class",
  ].join("\n"));
  const names = types[0]?.members.map((m) => `${m.name}:${m.kind}`).join() ?? "";
  check("a field named after a modifier is a field, and a modifier before Property is a modifier",
    names === "Default:field,Public:field,Caption:property", names);
}

{
  const parsed = new Map([["VB", parseTwin([
    "Private Interface _Clipboard Extends stdole.IUnknown",
    "    Function GetText() As String",
    "End Interface",
    "Public CoClass Clipboard",
    "    [Default] Interface _Clipboard",
    "End CoClass",
    "Private Class ButtonBase",
    "    Public Caption As String",
    "End Class",
    "Class CommandButton",
    "    Inherits ButtonBase",
    "End Class",
    "Private Module USER32",
    "    Public DeclareWide PtrSafe Function GetDC Lib \"user32\" (ByVal h As LongPtr) As LongPtr",
    "End Module",
  ].join("\n")).types]]);
  const { packages } = apiSnapshot(parsed);
  const rec = (n) => packages.VB.find((t) => t.name === n);
  check("a private interface a public CoClass is built on keeps its members",
    rec("_Clipboard")?.public === false && rec("_Clipboard")?.members?.GetText === "function", show(rec("_Clipboard")));
  check("a private class a public class inherits keeps its members",
    rec("ButtonBase")?.members?.Caption === "field", show(rec("ButtonBase")));
  check("a private module nothing exposes is kept by name, without its members",
    rec("USER32")?.public === false && rec("USER32")?.members === undefined, show(rec("USER32")));
}

{
  const { problems } = parseTwin([
    "Alias HINSTANCE As LongPtr",
    "Class Widget",
    "    Inherits BaseWidget",
    "    Implements IWidget",
    "    Public Caption As String",
    "    Public Property Get Height() As Long",
    "        #If WIN64 Then",
    "            Return 2",
    "        #Else",
    "            Return 1",
    "        #End If",
    "    End Property",
    "    Event Clicked()",
    "End Class",
  ].join("\n"));
  check("a file-level Alias and a #If inside a body are not problems", problems.length === 0, show(problems));
}

// ------------------------------------------------------------ the pages

const api = {
  build: 983,
  packages: {
    VBA: {
      exports: ["VBA"],
      types: [
        { name: "Strings", kind: "module", members: { Left: "function", "Left$": "function", LeftB: "function", "LeftB$": "function" } },
        { name: "Information", kind: "module", members: { IsArray: "function" } },
        { name: "_HiddenModule", kind: "module", hidden: true, members: { Array: "function" } },
        { name: "_Collection", kind: "interface", members: { Add: "sub", Count: "property" } },
        { name: "Collection", kind: "coclass", default: "_Collection" },
        { name: "Constants", kind: "module" },
        { name: "VbMsgBoxStyle", kind: "enum", in: "Constants", values: ["vbOKOnly", "vbOKCancel"] },
      ],
    },
    tbIDE: {
      exports: ["tbIDE"],
      types: [
        { name: "IEditorV1", kind: "interface", members: { Close: "sub", Path: "property" } },
        { name: "ICodeEditorV1", kind: "interface", extends: "tbIDE.IEditorV1", members: { Text: "property" } },
        { name: "IHtmlElementV1", kind: "interface", members: { Properties: "property", Name: "property" } },
        { name: "Editor", kind: "coclass", default: "IEditorV1" },
        { name: "CodeEditor", kind: "coclass", default: "ICodeEditorV1" },
        { name: "HtmlElement", kind: "coclass", default: "IHtmlElementV1" },
      ],
    },
  },
};

const h = (level, text, id = null) => ({ level, text, id });
const page = (src, url, title, parent, headings, extra = {}) => ({ src, url, title, parent, headings, ...extra });
const pages = [
  page("Reference/Default/VBA/index.md", "/tB/Packages/VBA", "VBA Package", undefined, [h(1, "VBA Package")]),
  page("Reference/Default/VBA/Strings/index.md", "/tB/Modules/Strings/", "Strings Module", "VBA Package", [h(1, "Strings module")]),
  page("Reference/Default/VBA/Strings/Left.md", "/tB/Modules/Strings/Left", "Left", "Strings Module", [h(1, "Left, LeftB")]),
  page("Reference/Default/VBA/Information/index.md", "/tB/Modules/Information/", "Information Module", "VBA Package", [h(1, "Information module")]),
  page("Reference/Default/VBA/Information/Array.md", "/tB/Modules/Information/Array", "Array", "Information Module", [h(1, "Array")]),
  page("Reference/Default/VBA/HiddenModule/index.md", "/tB/Modules/HiddenModule/", "(Default) Module", "VBA Package",
    [h(1, "(Default) module")], { symbols: ["_HiddenModule"] }),
  page("Reference/Default/VBA/Collection/index.md", "/tB/Modules/Collection/", "Collection", "VBA Package", [h(1, "Collection")]),
  page("Reference/Default/VBA/Collection/Add.md", "/tB/Modules/Collection/Add", "Add", "Collection", [h(1, "Add")]),
  page("Reference/Default/VBA/Constants/VbMsgBoxStyle.md", "/tB/Modules/Constants/VbMsgBoxStyle", "VbMsgBoxStyle", "Constants Module",
    [h(1, "VbMsgBoxStyle")]),
  page("Reference/Default/VBA/Debug.md", "/tB/Modules/Debug", "Debug", "VBA Package",
    [h(1, "Debug", "debug"), h(2, "Debug.Print", "debugprint"), h(2, "See Also", "see-also")]),
  page("Reference/Built-In/tbIDE/index.md", "/tB/Packages/tbIDE/", "tbIDE Package", "Built-In Packages", [h(1, "tbIDE Package")]),
  page("Reference/Built-In/tbIDE/Editor.md", "/tB/Packages/tbIDE/Editor", "Editor", "tbIDE Package",
    [h(1, "Editor class", "editor-class"), h(2, "Methods", "methods"), h(3, "Close", "close"), h(2, "Properties", "properties"), h(3, "Path", "path")]),
  page("Reference/Built-In/tbIDE/CodeEditor.md", "/tB/Packages/tbIDE/CodeEditor", "CodeEditor", "tbIDE Package",
    [h(1, "CodeEditor class", "codeeditor-class"), h(2, "Properties", "properties"), h(3, "Text", "text"),
      h(3, "Undeclared", "undeclared"), h(4, "Example", "example"), h(3, "Example", "example-1")]),
  page("Reference/Built-In/tbIDE/HtmlElement.md", "/tB/Packages/tbIDE/HtmlElement", "HtmlElement", "tbIDE Package",
    [h(1, "HtmlElement class", "htmlelement-class"), h(2, "Name", "name"), h(2, "Properties", "properties"),
      h(3, "Name", "name-1"), h(3, "Properties", "properties-1")]),
  page("Reference/Core/Do-Loop.md", "/tB/Core/Do-Loop", "Do...Loop", "Statements", [h(1, "Do…Loop")]),
  page("Reference/Core/If-Then-Else.md", "/tB/Core/If-Then-Else", "If", "Statements", [h(1, "If…Then…Else")]),
  page("Reference/Core/Comparison-Operators.md", "/tB/Core/Comparison-Operators", "Comparison", "Operators",
    [h(1, "Comparison operators")], { symbols: ["=", "<>"] }),
  page("Reference/Core/Concat.md", "/tB/Core/Concat", "&, &=", "Operators", [h(1, "& and &= operators")]),
  page("Reference/Attributes.md", "/tB/Core/Attributes", "Attributes", "Reference Section",
    [h(1, "Attributes", "attributes"), h(2, "AppObject (optional Bool)", "appobject")]),
  page("Reference/Default/VBA/Guide.md", "/Reference/Guide", "Guide", "VBA Package", [h(1, "Guide")]),
];

const r = deriveSymbolIndex({ pages, api });
const find = (name, container) => r.symbols.filter((s) => s.name === name && (container === undefined || s.container === container));
const urlOf = (name, container) => find(name, container).map((s) => s.url);

check("a module is its page's by the title, less 'Module'", urlOf("Strings", null).join() === "/tB/Modules/Strings/");
check("a member with a page of its own under the module's page", urlOf("Left", "Strings").join() === "/tB/Modules/Strings/Left");
check("a name in the first heading's list shares the page", urlOf("LeftB", "Strings").join() === "/tB/Modules/Strings/Left");
check("a $ form goes where its base went", urlOf("Left$", "Strings").join() === "/tB/Modules/Strings/Left" &&
  urlOf("LeftB$", "Strings").join() === "/tB/Modules/Strings/Left", show(find("LeftB$")));
check("a page filed under one module and declared in another is the declarer's",
  find("Array").length === 1 && find("Array")[0].container === "_HiddenModule" && find("Array")[0].url === "/tB/Modules/Information/Array",
  show(find("Array")));
check("symbols: names a page's subject when its title cannot", urlOf("_HiddenModule", null).join() === "/tB/Modules/HiddenModule/",
  show(find("_HiddenModule")));
check("a CoClass's member on its own page, by the default interface",
  find("Add", "Collection")[0]?.url === "/tB/Modules/Collection/Add" && find("Add", "Collection")[0]?.kind === "method",
  show(find("Add")));
check("an enumeration's values are on its page, not under a heading",
  urlOf("vbOKOnly", "VbMsgBoxStyle").join() === "/tB/Modules/Constants/VbMsgBoxStyle" && find("vbOKOnly")[0]?.kind === "enumvalue");
check("an inherited member is found on the page of the type that declares it",
  urlOf("Close", "CodeEditor").join() === "/tB/Packages/tbIDE/Editor#close", show(find("Close")));
check("a heading under Properties is a member whatever the package declares",
  find("Undeclared", "CodeEditor")[0]?.kind === "property", show(find("Undeclared")));
check("an Example heading among members, at their level or under one, is not a member",
  !find("Example").length, show(find("Example")));
check("a section heading is never taken for a member of the same name",
  urlOf("Properties", "HtmlElement").join() === "/tB/Packages/tbIDE/HtmlElement#properties-1", show(find("Properties")));
check("a member's heading under Properties wins over a prose section of the same name above it",
  urlOf("Name", "HtmlElement").join() === "/tB/Packages/tbIDE/HtmlElement#name-1", show(find("Name")));
check("a page no package declares, with Name.Member headings, is an object's",
  find("Debug")[0]?.kind === "object" && urlOf("Print", "Debug").join() === "/tB/Modules/Debug#debugprint", show(find("Print")));
check("a statement's other words are its keywords, through the typographer's ellipsis",
  find("Loop")[0]?.kind === "keyword" && find("Do")[0]?.kind === "statement" &&
  find("Else")[0]?.url === "/tB/Core/If-Then-Else", show(r.symbols.filter((s) => s.package === null)));
check("an operator page's symbols: are each an operator",
  find("<>")[0]?.kind === "operator" && find("=")[0]?.kind === "operator", show(find("<>")));
check("an operator page's title gives its operators", find("&=")[0]?.kind === "operator", show(find("&=")));
check("an attribute is its ## heading's, by the id the build gave it",
  urlOf("AppObject").join() === "/tB/Core/Attributes#appobject", show(find("AppObject")));
check("a CoClass's default interface maps to it",
  r.interfaces["tbIDE.ICodeEditorV1"] === "tbIDE.CodeEditor" && r.interfaces["VBA._Collection"] === "VBA.Collection",
  show(r.interfaces));
check("only /tB/ pages are read", !r.symbols.some((s) => !s.url.startsWith("/tB/")) && !find("Guide").length);
check("a declared member no page documents is a gap, not an entry",
  r.gaps.some((g) => g.container === "Collection" && g.name === "Count") && !find("Count").length, show(r.gaps));

{
  const text = serializeSymbolIndex(r, api);
  const back = JSON.parse(text);
  check("the published file parses, and names its format and API build",
    back.format === 1 && back.api === 983 && back.symbols.length === r.symbols.length);
  const lines = text.split("\n");
  const body = lines.slice(lines.indexOf('  "symbols": [') + 1, lines.lastIndexOf("  ]"));
  const parsed = body.map((l) => { try { return JSON.parse(l.trim().replace(/,$/, "")); } catch { return null; } });
  check("the published file has one entry to a line",
    body.length === r.symbols.length && parsed.every((e, i) => e?.url === r.symbols[i].url), `${body.length} entry lines`);
}

{
  const got = headingsOf('<header><h1 class="x" id="a"> <a href="#a"><svg></svg></a> A &amp; B </h1></header><hr>' +
    '<h3 id="c">C <code>D</code></h3><h2>no id</h2>');
  check("headings are read with their ids and text, and <header> and <hr> are not headings",
    show(got) === show([{ level: 1, id: "a", text: "A & B" }, { level: 3, id: "c", text: "C D" }, { level: 2, id: null, text: "no id" }]),
    show(got));
}

// ------------------------------------------------------------ the drift guard

async function withBaseline(initial, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "tb-symbolbaseline-"));
  const file = path.join(dir, "symbol-baseline.json");
  try {
    if (initial) await writeFile(file, JSON.stringify({ src: GUARDED_SRC, urls: initial }), "utf8");
    return await fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
const urlsIn = async (file) => JSON.parse(await readFile(file, "utf8")).urls;
const BASE = ["/tB/Modules/Strings/Left", "/tB/Packages/tbIDE/ToolWindows#add"];

await withBaseline(BASE, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: ["/tB/Modules/Strings/Left", "/tB/Packages/tbIDE/ToolWindows#add-method"], write: true, file });
  check("a reworded heading's lost anchor fails, and is named",
    out.failed && out.text.includes("ToolWindows#add") && (await urlsIn(file)).length === 2, out.text.trim());
});
await withBaseline(BASE, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: [...BASE, "/tB/Core/Dim"], write: true, file });
  check("a new URL is accepted and recorded", !out.failed && (await urlsIn(file)).includes("/tB/Core/Dim"), out.text.trim());
});
await withBaseline(BASE, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: [...BASE, "/tB/Core/Dim"], write: false, file });
  check("a new URL with write:false leaves the file alone", !out.failed && (await urlsIn(file)).length === 2, out.text.trim());
});
await withBaseline(BASE, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: BASE, write: true, file });
  check("an unchanged index says nothing", !out.failed && out.text === "", show(out.text));
});
await withBaseline(BASE, async (file) => {
  await checkSymbolBaseline({ src: GUARDED_SRC, urls: BASE.slice(0, 1), write: false, force: true, file });
  check("--update-symbol-baseline records a removal on request", (await urlsIn(file)).length === 1);
});
await withBaseline(BASE, async (file) => {
  const out = await checkSymbolBaseline({ src: "test/fixtures/check-src", urls: [], write: true, file });
  check("a foreign source root is ignored, not measured", !out.failed && out.text === "" && (await urlsIn(file)).length === 2);
});
await withBaseline(null, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: BASE, write: false, file });
  check("a missing list fails where the build may not write (CI)", out.failed && out.text.includes("missing"), out.text.trim());
});
await withBaseline(null, async (file) => {
  const out = await checkSymbolBaseline({ src: GUARDED_SRC, urls: BASE, write: true, file });
  check("a missing list is created where it may write", !out.failed && (await urlsIn(file)).length === 2, out.text.trim());
});

// ------------------------------------------------------------ report

for (const { name, ok, detail } of results) {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok && detail) console.log(`       ${detail}`);
}
console.log(failures
  ? `check_symbol_index: ${failures} of ${results.length} probes failed`
  : `check_symbol_index: ${results.length} probes, all pass`);
process.exit(failures ? 1 : 0);
