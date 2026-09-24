// P5 in WIP.HelpAddin.md, measured rather than read off the IDE's code: what
// the compiler's language service says about the name under the cursor. The
// project in probes/symbols is opened, never built, and each question is put
// the way the IDE's own code puts it (main.js, BETA 983): hover and Go To
// Definition as its Monaco providers ask, over lspSocket, and signature help
// as the code editor's intellisense does (getLiveDebugIntellisenseMonaco).
// Only page script can ask any of them; the add-in API has no such call.
//
// Each test states what BETA 983 does. If one fails after an IDE update, the
// IDE has changed: update P5 in WIP.HelpAddin.md, and the entry in
// BUGS-TO-REPORT.md that the last hover test rests on, and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { openFile } from "../../scripts/lib/tb-operate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "symbols");
const FILE = "/SymbolsProbe/Sources/Symbols.twin";
const SOURCE = readFileSync(path.join(PROJECT, "Sources", "Symbols.twin"), "utf8").split(/\r?\n/);
const lane = addinLane();

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
  const m = await c.evaluate(`new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), 10000);
    lspSocket.request(${JSON.stringify(method)}, ${JSON.stringify(params)}, (m) => { clearTimeout(timer); resolve(m); });
  })`, { awaitPromise: true, timeout: 15000 });
  assert.ok(!m.timedOut, `${method} had no answer`);
  return m.result;
}
const doc = { uri: `twinbasic:${FILE}` };
const hover = async (c, text, word) =>
  (await lsp(c, "textDocument/hover", { textDocument: doc, position: at(text, word) }))?.contents.value ?? null;
const definition = (c, text, word) => lsp(c, "textDocument/definition", { textDocument: doc, position: at(text, word) });

// The heading a procedure's documentation starts with names where it is
// declared: "## **MsgBox** &nbsp; ... `in VBA.Interaction`".
const declaredIn = (markdown) => /^## \*\*\w+\*\*[^`\r\n]*`in ([\w.]+)`/m.exec(markdown ?? "")?.[1] ?? null;
const firstLine = (markdown) => (markdown ?? "").split(/\r?\n/)[0];

// Signature help for the call whose argument list starts just after `after`
// on the line holding `text`: the request the code editor makes when the
// cursor is there, the character before it being the trigger.
async function signatures(c, text, after) {
  const line = SOURCE.findIndex((s) => s.includes(text));
  const character = SOURCE[line].indexOf(after) + after.length;      // the cursor, 0-based
  const r = await c.evaluate(`new Promise((resolve) => {
    const node = openEditors.selectedEditorNode.fileNode;
    const timer = setTimeout(() => resolve(null), 10000);
    lspSocket.request("textDocument/completion", {
      textDocument: { uri: node.getFullPath(), version: node.ideVersionId },
      position: { line: ${line}, character: ${character} },
      context: { triggerCharacter: ${JSON.stringify(after.at(-1))} },
      origCaretLine: ${line + 1}, origCaretColumn: ${character + 1},
    }, (m) => { clearTimeout(timer); resolve(m.result); });
  })`, { awaitPromise: true, timeout: 15000 });
  assert.ok(r, `no completion answer after ${JSON.stringify(after)}`);
  return r.signatures ?? [];
}

// A package's own source, as the IDE's file system names it. The packages a
// project references are under <Project>/Packages, and each package's own
// references under its Packages again, so VBA is in the tree twice here: as
// the project's, and as tbIDE's. Definition named tbIDE's copy.
const packageFile = (pkg, file) =>
  new RegExp(`^twinbasic:/SymbolsProbe/Packages/(?:[^/]+/Packages/)*${pkg}/Sources/${file}$`);

describe("P5: what the compiler says about the name under the cursor", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c;
  before(async () => {
    c = await lane.open(PROJECT);
    await openFile(c, FILE, { line: 1, column: 1 });
  });
  after(() => lane?.close());

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

  test("hover on a variable gives its declaration, and on Debug.Print and a statement nothing", async () => {
    assert.equal(await hover(c, "c.Add", "c"), "*local variable* Dim c As Collection");
    assert.equal(await hover(c, "Nothing, count", "count"), "*parameter* ByVal count As Long");
    assert.equal(await hover(c, "Debug.Print FindTheNeedle", "Debug"), null);
    assert.equal(await hover(c, "Debug.Print FindTheNeedle", "Print"), null);
    assert.equal(await hover(c, "Dim c As New", "Dim"), null);
    assert.match(await hover(c, "ByVal n As Long", "Long"), /^\*\*Long\*\*/);
  });

  test("hover says a ByVal parameter of String, Variant, Object or a class was made because Option Explicit is off, which it is not", async () => {
    // BUGS-TO-REPORT.md. The project has project.optionExplicit true.
    const NOTE = "***note:*** *this variable was auto-generated due to* ***Option Explicit*** *being Off*";
    const noted = { "Debug.Print h Is": "h", "count, col Is": "col", "Nothing, o Is": "o", "IsEmpty(v)": "v",
                    "Nothing, s,": "s", "Host.ToolWindows": "Host" };
    for (const [text, word] of Object.entries(noted)) {
      const h = await hover(c, text, word);
      assert.match(h, /^\*parameter\* ByVal /, `${word}: ${JSON.stringify(h)}`);
      assert.ok(h.includes(NOTE), `${word} no longer has the note: ${JSON.stringify(h)}`);
    }
    const plain = { "Nothing, count": "count", "Debug.Print n": "n", "Return CStr(k)": "k", "(v), r Is": "r",
                    "s, d Is": "d" };
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
    assert.equal(own.range.start.line, SOURCE.findIndex((s) => s.includes("Function FindTheNeedle")));
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
    const r = await c.evaluate(`new Promise((resolve) => {
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
    })`, { awaitPromise: true, timeout: 15000 });
    assert.ok(r, "no Add among the completions after c.");
    const d = await definition(c, "c.Add", "Add");
    // The same file as the definition's, without "twinbasic:", on the same line.
    assert.equal(`twinbasic:${r.uri}`, d.uri);
    assert.equal(r.line, d.range.start.line);
  });
});
