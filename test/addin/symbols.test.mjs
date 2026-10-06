// P5 in WIP.HelpAddin.md, measured rather than read off the IDE's code: what
// the compiler's language service says about the name under the cursor. The
// project in probes/symbols is opened, never built, and each question is put
// the way the IDE's own code puts it (main.js, BETA 983): hover and Go To
// Definition as its Monaco providers ask, over lspSocket, and signature help
// as the code editor's intellisense does (getLiveDebugIntellisenseMonaco).
// Only page script can ask any of them; the add-in API has no such call.
//
// Each test states what BETA 983, 987 and 995 do. If one fails after an IDE update, the
// IDE has changed: update P5 in WIP.HelpAddin.md, and the filed report
// that the last hover test rests on (bugs/filed/, twinbasic/twinbasic#2448), and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { openFile } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "symbols");
const FILE = "/SymbolsProbe/Sources/Symbols.twin";
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Symbols.twin"), "utf8").split(/\r?\n/);

// Where a name is, as LSP counts, 0-based: the first whole `word` from where
// `text` starts, on the first line holding `text`; its middle character.
function at(text, word) {
  const line = SOURCE.findIndex((s) => s.includes(text));
  assert.ok(line >= 0, `no line of Symbols.twin holds ${JSON.stringify(text)}`);
  const re = new RegExp(`\\b${word}\\b`, "g");
  re.lastIndex = SOURCE[line].indexOf(text);
  const i = re.exec(SOURCE[line])?.index;
  assert.ok(i !== undefined, `no ${word} in ${JSON.stringify(text)}`);
  return { line, character: i + Math.floor(word.length / 2) };
}

// One request over the compiler's language socket, and its answer's result.
async function lsp(c, method, params) {
  const m = await c.evaluate(
    `new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), 10000);
    lspSocket.request(${JSON.stringify(method)}, ${JSON.stringify(params)}, (m) => { clearTimeout(timer); resolve(m); });
  })`,
    { awaitPromise: true, timeout: 15000 },
  );
  assert.ok(!m.timedOut, `${method} had no answer`);
  return m.result;
}
const doc = { uri: `twinbasic:${FILE}` };
const hover = async (c, text, word) =>
  (await lsp(c, "textDocument/hover", { textDocument: doc, position: at(text, word) }))?.contents.value ?? null;
const definition = (c, text, word) =>
  lsp(c, "textDocument/definition", { textDocument: doc, position: at(text, word) });

// P15: the names of Described.twin, asked about without opening it, since hover
// takes any file of the project.
const DESCRIBED = readFileSync(path.join(PROJECT, "Sources", "Described.twin"), "utf8").split(/\r?\n/);
function atDescribed(text, word) {
  const line = DESCRIBED.findIndex((s) => s.includes(text));
  assert.ok(line >= 0, `no line of Described.twin holds ${JSON.stringify(text)}`);
  const re = new RegExp(`\\b${word}\\b`, "g");
  re.lastIndex = DESCRIBED[line].indexOf(text);
  const i = re.exec(DESCRIBED[line])?.index;
  assert.ok(i !== undefined, `no ${word} in ${JSON.stringify(text)}`);
  return { line, character: i + Math.floor(word.length / 2) };
}
const hoverDescribed = async (c, text, word) =>
  (
    await lsp(c, "textDocument/hover", {
      textDocument: { uri: "twinbasic:/SymbolsProbe/Sources/Described.twin" },
      position: atDescribed(text, word),
    })
  )?.contents.value ?? null;

// The heading a procedure's documentation starts with names where it is
// declared: "## **MsgBox** &nbsp; ... `in VBA.Interaction`".
const declaredIn = (markdown) => /^## \*\*\w+\$?\*\*[^`\r\n]*`in ([\w.]+)`/m.exec(markdown ?? "")?.[1] ?? null;
const firstLine = (markdown) => (markdown ?? "").split(/\r?\n/)[0];
// The first "`in ...`" anywhere, whatever comes before it.
const whereIn = (markdown) => /`in ([^`\r\n]+)`/.exec(markdown ?? "")?.[1] ?? null;

// Signature help for the call whose argument list starts just after `after`
// on the line holding `text`: the request the code editor makes when the
// cursor is there, the character before it being the trigger.
async function signatures(c, text, after) {
  const line = SOURCE.findIndex((s) => s.includes(text));
  const character = SOURCE[line].indexOf(after) + after.length; // the cursor, 0-based
  const r = await c.evaluate(
    `new Promise((resolve) => {
    const node = openEditors.selectedEditorNode.fileNode;
    const timer = setTimeout(() => resolve(null), 10000);
    lspSocket.request("textDocument/completion", {
      textDocument: { uri: node.getFullPath(), version: node.ideVersionId },
      position: { line: ${line}, character: ${character} },
      context: { triggerCharacter: ${JSON.stringify(after.at(-1))} },
      origCaretLine: ${line + 1}, origCaretColumn: ${character + 1},
    }, (m) => { clearTimeout(timer); resolve(m.result); });
  })`,
    { awaitPromise: true, timeout: 15000 },
  );
  assert.ok(r, `no completion answer after ${JSON.stringify(after)}`);
  return r.signatures ?? [];
}

// A package's own source, as the IDE's file system names it. The packages a
// project references are under <Project>/Packages, and each package's own
// references under its Packages again, so VBA is in the tree twice here: as
// the project's, and as tbIDE's. Definition named tbIDE's copy.
const packageFile = (pkg, file) =>
  new RegExp(`^twinbasic:/SymbolsProbe/Packages/(?:[^/]+/Packages/)*${pkg}/Sources/${file}$`);

scenario("P5: what the compiler says about the name under the cursor", (lane) => {
  let c;
  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: 1, column: 1 });
  });

  test("hover on a procedure names its kind, and the package and module or interface it is declared in", async () => {
    const cases = [
      ['MsgBox "hello"', "MsgBox", "Function MsgBox (", "VBA.Interaction"],
      ["Return CStr(k)", "CStr", "Function CStr (", "VBA.Conversion"],
      ["c.Add", "Add", "Sub Add (", "VBA._Collection"],
      ["Host.ToolWindows", "ToolWindows", "Property Get ToolWindows (", "tbIDE.IHostV1"],
      ["ToolWindows.Add", "Add", "Function Add (", "tbIDE.IToolWindowsV1"],
      ["Debug.Print FindTheNeedle", "FindTheNeedle", "Function FindTheNeedle (", "SymbolsProbe.Symbols"],
    ];
    for (const [text, word, kind, where] of cases) {
      const h = await hover(c, text, word);
      assert.ok(firstLine(h).startsWith(kind), `${word} in ${text}: ${JSON.stringify(h)}`);
      assert.equal(declaredIn(h), where, `${word} in ${text}: ${JSON.stringify(h)}`);
    }
  });

  test("hover on a class names its package and its default interface, which is what its members are named by", async () => {
    const collection = await hover(c, "New Collection", "Collection");
    assert.match(collection, /^\*class\* \*\*Collection\*\* [^\r\n]*`in package VBA`/);
    assert.match(collection, /\*\[default\]\* VBA\._Collection\b/);
    const toolWindow = await hover(c, "As ToolWindow", "ToolWindow");
    assert.match(toolWindow, /^\*class\* \*\*ToolWindow\*\* [^\r\n]*`in package tbIDE`/);
    assert.match(toolWindow, /\*\[default\]\* tbIDE\.IToolWindowV1\b/);
  });

  test("hover on an enumeration, its value and a constant names where each is declared in forms of their own", async () => {
    // The add-in's Declared.ReadHover reads these forms.
    const cases = [
      ["Debug.Print vbOKOnly", "vbOKOnly", "*enum-value* **vbOKOnly** ", "VBA.Constants.VbMsgBoxStyle"],
      ["Dim t As VbMsgBoxStyle", "VbMsgBoxStyle", "*enum* **VbMsgBoxStyle** ", "component VBA.Constants"],
      ["vbCrLf, Err", "vbCrLf", "*constant* **vbCrLf As String** ", "VBA.Constants"],
    ];
    for (const [text, word, start, where] of cases) {
      const h = await hover(c, text, word);
      assert.ok(firstLine(h).startsWith(start), `${word}: ${JSON.stringify(h)}`);
      assert.equal(whereIn(h), where, `${word}: ${JSON.stringify(h)}`);
    }
  });

  test("hover can name the procedure behind a member, or an interface the class's default one inherits", async () => {
    // Err.Number is VBA's hidden GetErrNumber (and, in the help lane's host,
    // App.Path VB's GetAppPath); a PropertyBag's ReadProperty is on the
    // interface PropertyBag_VB5, which the index's interfaces map lacks. A
    // member inside With names its interface as c2.Add would.
    const cases = [
      ["Err.Number", "Number", "Function GetErrNumber (", "VBA._HiddenModule"],
      ["pb.ReadProperty", "ReadProperty", "Function ReadProperty (", "VBRUN.PropertyBag_VB5"],
      [".Add 2", "Add", "Sub Add (", "VBA._Collection"],
      ['Left$("abc"', "Left", "Function Left$ (", "VBA.Strings"],
    ];
    for (const [text, word, kind, where] of cases) {
      const h = await hover(c, text, word);
      assert.ok(firstLine(h).startsWith(kind), `${word} in ${text}: ${JSON.stringify(h)}`);
      assert.equal(declaredIn(h), where, `${word} in ${text}: ${JSON.stringify(h)}`);
    }
  });

  test("hover on a variable gives its declaration, and on Debug.Print and a statement nothing", async () => {
    assert.equal(await hover(c, "c.Add", "c"), "*local variable* Dim c As Collection");
    assert.equal(await hover(c, "Nothing, count", "count"), "*parameter* ByVal count As Long");
    // BETA 983 gives no hover here, and BETA 987 and 995 one whose text is empty.
    const nothing = [
      ["Debug.Print FindTheNeedle", "Debug"],
      ["Debug.Print FindTheNeedle", "Print"],
      ["Dim c As New", "Dim"],
    ];
    for (const [text, word] of nothing) {
      const h = await hover(c, text, word);
      assert.ok(h === null || h === "", `${word} in ${text}: ${JSON.stringify(h)}`);
    }
    assert.match(await hover(c, "ByVal n As Long", "Long"), /^\*\*Long\*\*/);
  });

  test("hover on a declared parameter or variable says nothing about Option Explicit", async () => {
    // The project has project.optionExplicit true. BETA 995 and earlier said a
    // ByVal parameter of String, Variant, Object or a class was auto-generated
    // because Option Explicit is off (twinbasic/twinbasic#2448, fixed in 997).
    const byVal = {
      "Debug.Print h Is": "h",
      "count, col Is": "col",
      "Nothing, o Is": "o",
      "IsEmpty(v)": "v",
      "Nothing, s,": "s",
      "Host.ToolWindows": "Host",
    };
    for (const [text, word] of Object.entries(byVal)) {
      const h = await hover(c, text, word);
      assert.match(h, /^\*parameter\* ByVal /, `${word}: ${JSON.stringify(h)}`);
      assert.ok(!h.includes("Option Explicit"), `${word}: ${JSON.stringify(h)}`);
    }
    const plain = {
      "Nothing, count": "count",
      "Debug.Print n": "n",
      "Return CStr(k)": "k",
      "(v), r Is": "r",
      "s, d Is": "d",
    };
    for (const [text, word] of Object.entries(plain)) {
      const h = await hover(c, text, word);
      assert.ok(!h.includes("Option Explicit"), `${word}: ${JSON.stringify(h)}`);
    }
  });

  test("Go To Definition of a package's symbol is its declaration in the package's own source, which the IDE opens", async () => {
    const cases = [
      ['MsgBox "hello"', "MsgBox", packageFile("VBA", "Interaction\\.twin")],
      ["New Collection", "Collection", packageFile("VBA", "Collection\\.twin")],
      ["c.Add", "Add", packageFile("VBA", "Collection\\.twin")],
      ["Host.ToolWindows", "ToolWindows", packageFile("tbIDE", "Host\\.twin")],
      ["ToolWindows.Add", "Add", packageFile("tbIDE", "ToolWindows\\.twin")],
    ];
    for (const [text, word, file] of cases) {
      const d = await definition(c, text, word);
      assert.match(d?.uri ?? "", file, `${word} in ${text}: ${JSON.stringify(d)}`);
      assert.equal(await c.evaluate(`!!fs.tree.resolvePath(${JSON.stringify(d.uri)})`), true, `${d.uri} does not open`);
    }
    const own = await definition(c, "Debug.Print FindTheNeedle", "FindTheNeedle");
    assert.equal(own.uri, `twinbasic:${FILE}`);
    assert.equal(
      own.range.start.line,
      SOURCE.findIndex((s) => s.includes("Function FindTheNeedle")),
    );
    assert.equal(await definition(c, "Debug.Print FindTheNeedle", "Print"), null);
  });

  test("signature help's documentation starts with the same heading", async () => {
    const cases = [
      ['MsgBox "hello"', "MsgBox ", "Function MsgBox(", "VBA.Interaction"],
      ["c.Add 1", "c.Add ", "Sub Add(", "VBA._Collection"],
      ["ToolWindows.Add(", "ToolWindows.Add(", "Function Add(", "tbIDE.IToolWindowsV1"],
      ["FindTheNeedle(3)", "FindTheNeedle(", "Function FindTheNeedle(", "SymbolsProbe.Symbols"],
    ];
    for (const [text, after, label, where] of cases) {
      const [s] = await signatures(c, text, after);
      assert.ok(s?.label.startsWith(label), `after ${JSON.stringify(after)}: ${JSON.stringify(s)}`);
      assert.equal(declaredIn(s.doc), where, `after ${JSON.stringify(after)}: ${JSON.stringify(s.doc)}`);
    }
  });

  test("a completion's details give the file and line of its declaration, as Go To Definition does", async () => {
    const line = SOURCE.findIndex((s) => s.includes("c.Add 1"));
    const character = SOURCE[line].indexOf("c.") + 2;
    const r = await c.evaluate(
      `new Promise((resolve) => {
      const node = openEditors.selectedEditorNode.fileNode;
      lspSocket.request("textDocument/completion", {
        textDocument: { uri: node.getFullPath(), version: node.ideVersionId },
        position: { line: ${line}, character: ${character} }, context: { triggerCharacter: "." },
        origCaretLine: ${line + 1}, origCaretColumn: ${character + 1},
      }, (m) => {
        const item = (m.result?.items ?? []).find((x) => x.l === "Add");
        if (!item) return resolve(null);
        lspSocket.request("textDocument/lazyCompletion", { lazyRequestId: m.result.lazyRequestId,
          requests: [{ x: 0, i: item.i }] }, (z) => resolve(z.results?.[0] ?? null));
      });
    })`,
      { awaitPromise: true, timeout: 15000 },
    );
    assert.ok(r, "no Add among the completions after c.");
    const d = await definition(c, "c.Add", "Add");
    // The same file as the definition's, without "twinbasic:", on the same line.
    assert.equal(`twinbasic:${r.uri}`, d.uri);
    assert.equal(r.line, d.range.start.line);
  });

  // P15. The help add-in shows this text for a name the documentation has no
  // page for (ReadSummary in add-in/Sources/Declared.twin).
  test("hover gives a name's [Description] after where it is declared, whatever kind of name it is", async () => {
    const cases = [
      ["Debug.Print AddTwo", "AddTwo", "SymbolsProbe.Described", "Adds two numbers and returns the sum."],
      ["AddTwo(1, 2), WidgetCount", "WidgetCount", "SymbolsProbe.Described", "The number of widgets."],
      ["WidgetCount, Counter", "Counter", "SymbolsProbe.Described", "The module's counter."],
      ["Debug.Print Shade.Light", "Shade", "component SymbolsProbe.Described", "A colour."],
      ["Dim p As Point", "Point", "component SymbolsProbe.Described", "A point."],
      ["Dim w As New Widget", "Widget", "library SymbolsProbe", "A widget class."],
      ["w.Resize", "Resize", "SymbolsProbe._Widget", "Changes the widget's size."],
      ["Module Described", "Described", "library SymbolsProbe", "A module that holds the probe's procedures."],
    ];
    for (const [text, word, where, description] of cases) {
      const h = await hoverDescribed(c, text, word);
      assert.equal(whereIn(h), where, `${word} in ${text}: ${JSON.stringify(h)}`);
      const after = h.slice(h.indexOf(`\`in ${where}\``));
      assert.ok(after.includes(description), `${word} in ${text}: ${JSON.stringify(h)}`);
    }
  });

  test("hover gives a type library's help string as a [Description]", async () => {
    const h = await hoverDescribed(c, "d.Add", "Add");
    assert.equal(declaredIn(h), "Scripting.IDictionary", JSON.stringify(h));
    assert.match(h, /`in Scripting\.IDictionary`\s+Add a new key and item to the dictionary\.$/, JSON.stringify(h));
  });

  test("hover on a procedure with no [Description] gives the IDE's tip in its place", async () => {
    const h = await hoverDescribed(c, "Counter, NoDescription", "NoDescription");
    assert.equal(declaredIn(h), "SymbolsProbe.Described", JSON.stringify(h));
    assert.match(h, /\n\*no further info available\. .*\[Description\(""\)\].*\*$/, JSON.stringify(h));
  });

  test("hover on a procedure's own name where it is declared gives code-generation details instead", async () => {
    const h = await hoverDescribed(c, "Public Function AddTwo", "AddTwo");
    assert.match(h, /TB-DEBUG CODEGEN SIZE/, JSON.stringify(h));
    assert.equal(whereIn(h), null, JSON.stringify(h));
  });

  // Not a defect (twinbasic/twinbasic#2465): inside an Enum, a [Description(...)]
  // line is a member named by a bracketed identifier, as VB6 allows, not an attribute.
  test("a [Description(...)] line in an enumeration is a member of its own, and the next member has no description", async () => {
    const shade = await hoverDescribed(c, "Debug.Print Shade.Light", "Shade");
    assert.match(shade, /\n - Description\("The light one\."\)/, JSON.stringify(shade));
    const light = await hoverDescribed(c, "Shade.Light, p.X", "Light");
    assert.equal(whereIn(light), "SymbolsProbe.Described.Shade", JSON.stringify(light));
    assert.ok(!light.includes("The light one."), JSON.stringify(light));
  });
});
