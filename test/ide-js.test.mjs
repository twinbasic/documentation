// Unit tests for scripts/ide-js/lib.mjs and scripts/ide_js.mjs, the tool that reads, names and
// patches the twinBASIC IDE's minified ide/main.js: the byte-exact round trip, the keys a binding
// is named by, how a name carries to another build (exact, carried, review, lost), the names the
// map refuses, splicing, and a fix patched in as the smallest token edit. The tool's own refusals
// to write into the repository or outside the temp folder are run as a child process.
//
// The "builds" are a few lines written here, minified by hand: one program under two sets of
// local names, and the changes a new build makes to a function. No copy of an IDE's main.js is
// in the repository, and none is needed. Runs with a bare `node --test test/ide-js.test.mjs`: no
// tree, no IDE.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import {
  bindings,
  builtInCommandIds,
  builtInKeymap,
  checkUnit,
  coverage,
  FixError,
  fixShapes,
  keyLabel,
  commandTextProblems,
  keymapTables,
  lineDiff,
  NameError,
  namedUnits,
  pageKeymap,
  parse,
  patchUnits,
  renamedUnitText,
  sealUnit,
  splice,
  unitInfo,
} from "../scripts/ide-js/lib.mjs";

// Build A, and build B: the same program, every local renamed as a minifier would.
const A =
  "var g=2;/*kept*/function show(e,t){var n=e.length;if(t){let r=e+n;return r}return wrap(e)}" +
  "function wrap(e){return'<'+e+'>'+`${e}`}" +
  "class Box{size(e){return e*g}static make(e,{t}){return new Box(e,t)}}\n";
const B =
  "var g=2;/*kept*/function show(o,e){var t=o.length;if(e){let n=o+t;return n}return wrap(o)}" +
  "function wrap(t){return'<'+t+'>'+`${t}`}" +
  "class Box{size(t){return t*g}static make(n,{t:e}){return new Box(n,e)}}\n";
// What a later build can do to show: use a variable once more, drop a parameter, drop the function.
const MORE_REFS = B.replace("let n=o+t;", "let n=o+t+t;");
const ONE_PARAM = B.replace("function show(o,e){var t=o.length;if(e)", "function show(o){var t=o.length;if(t)");
const NO_SHOW = B.replace(/function show.*?return wrap\(o\)\}/, "");

const NAMES = {
  show: { "0#0": "text", "0#1": "flag", "0#2": "len", "0/0#0": "joined" },
  wrap: { "0#0": "s" },
  "Box.size": { "0#0": "count" },
  "Box.static make": { "0#1": "tag" },
};

/** The map sealed against build A, as `name` writes it. */
function mapOnA() {
  const a = parse(A);
  const units = {};
  for (const [unit, names] of Object.entries(NAMES)) units[unit] = sealUnit(a, unit, names, "BETA 1");
  return { format: 1, about: "test", units };
}

describe("the round trip", () => {
  test("the tokens, comments and whitespace between them are every byte of the file", () => {
    const text = `${A}  /* a comment */ var x = /a+/g; // and a line comment\n`;
    const c = coverage(parse(text));
    assert.equal(c.gaps, 0);
    assert.equal(c.overlaps, 0);
    assert.equal(c.exact, true);
  });

  test("a splice with no edits is the input", () => {
    assert.equal(splice(A, 0, A.length, []), A);
  });
});

describe("units and bindings", () => {
  test("a unit is a top-level function or a method of a top-level class", () => {
    assert.deepEqual([...namedUnits(parse(A).ast).keys()], ["show", "wrap", "Box.size", "Box.static make"]);
  });

  test("a binding's key says where it is declared, not what it is called", () => {
    const key = (text) => bindings(parse(text), "show").bindings.map((x) => [x.key, x.def, x.kind, x.refs]);
    assert.deepEqual(key(A), [
      ["0#0", "Parameter", "param0", 3],
      ["0#1", "Parameter", "param1", 1],
      ["0#2", "Variable", "var", 2],
      ["0/0#0", "Variable", "let", 2],
    ]);
    assert.deepEqual(key(B), key(A));
    assert.deepEqual(
      bindings(parse(A), "show").bindings.map((x) => x.name),
      ["e", "t", "n", "r"],
    );
  });

  test("the same code under other local names has the same shape, and changed code another", () => {
    assert.equal(unitInfo(parse(A), "show").shape, unitInfo(parse(B), "show").shape);
    assert.notEqual(unitInfo(parse(A), "show").shape, unitInfo(parse(MORE_REFS), "show").shape);
  });

  test("a destructured parameter is numbered by the parameter it is in", () => {
    const x = bindings(parse(A), "Box.static make").bindings.find((b) => b.name === "t");
    assert.equal(x.kind, "param1");
  });
});

describe("the name map across builds", () => {
  const verdicts = (text, unit = "show") =>
    Object.fromEntries(checkUnit(parse(text), unit, mapOnA().units[unit]).verdicts.map((v) => [v.name, v.verdict]));

  test("sealing records what each named binding is in the build", () => {
    const entry = mapOnA().units.show;
    assert.equal(entry.namedOn, "BETA 1");
    assert.deepEqual(entry.names["0#2"], { name: "len", was: "n", def: "Variable", kind: "var", refs: 2 });
  });

  test("an unchanged unit takes every name exactly, whatever the minifier called them", () => {
    assert.deepEqual(verdicts(B), { text: "exact", flag: "exact", len: "exact", joined: "exact" });
  });

  test("in a changed unit, a binding used as often is carried and one used more is for review", () => {
    assert.deepEqual(verdicts(MORE_REFS), { text: "carried", flag: "carried", len: "review", joined: "carried" });
  });

  test("a key that finds a binding of another kind, or none, loses its name", () => {
    const v = checkUnit(parse(ONE_PARAM), "show", mapOnA().units.show).verdicts;
    assert.deepEqual(
      v.map((x) => [x.name, x.verdict]),
      [
        ["text", "carried"],
        ["flag", "lost"],
        ["len", "lost"],
        ["joined", "carried"],
      ],
    );
    assert.match(v[1].why, /now Variable var t/);
    assert.match(v[2].why, /no binding has that key/);
  });

  test("a unit the build no longer has loses every name", () => {
    assert.deepEqual(verdicts(NO_SHOW), { text: "lost", flag: "lost", len: "lost", joined: "lost" });
  });

  test("the map refuses a name that is not an identifier, is given twice, or hides another", () => {
    const a = parse(A);
    const refused = (unit, names, re) =>
      assert.throws(
        () => sealUnit(a, unit, names, "BETA 1"),
        (e) => e instanceof NameError && re.test(e.message),
      );
    refused("show", { "0#0": "two words" }, /not a name a variable can have/);
    refused("show", { "0#0": "class" }, /not a name a variable can have/);
    refused("show", { "0#0": "text", "0#1": "text" }, /given to both 0#0 and 0#1/);
    refused("show", { "0#0": "wrap" }, /would hide the outer wrap/);
    refused("show", { "0#0": "t" }, /would hide 0#1, which keeps that name/);
    refused("show", { "9#9": "x" }, /no binding 9#9/);
    refused("nothing", {}, /no unit named nothing/);
  });

  test("our names are put in at every place the binding is written, a shorthand keeping its key", () => {
    const b = parse(B);
    const map = mapOnA();
    const names = (unit) => Object.fromEntries(Object.entries(map.units[unit].names).map(([k, n]) => [k, n.name]));
    assert.equal(
      renamedUnitText(b, unitInfo(b, "show"), names("show")),
      "function show(text,flag){var len=text.length;if(flag){let joined=text+len;return joined}return wrap(text)}",
    );
    const a = parse(A);
    assert.equal(
      renamedUnitText(a, unitInfo(a, "Box.static make"), names("Box.static make")),
      "(e,{t: tag}){return new Box(e,tag)}",
    );
  });
});

describe("splicing", () => {
  test("each edit replaces its range and nothing else", () => {
    assert.equal(
      splice("abcdef", 0, 6, [
        [4, 5, "E"],
        [1, 2, "BB"],
      ]),
      "aBBcdEf",
    );
  });

  test("overlapping edits and edits outside the range are refused", () => {
    assert.throws(() =>
      splice("abcdef", 0, 6, [
        [1, 3, "x"],
        [2, 4, "y"],
      ]),
    );
    assert.throws(() => splice("abcdef", 2, 4, [[1, 2, "x"]]));
  });
});

describe("patching", () => {
  // A fix as it is written from the view: our names, prettier's quotes and semicolons.
  const FIX = `function show(text, flag) {
  var len = text.length;
  if (flag) {
    let joined = text + len + 1;
    return joined;
  }
  return wrap(text);
}
function wrap(s) {
  return "<" + s + ">" + \`\${s}\`;
}
class Box {
  size(count) {
    return count * g * 3;
  }
}
`;

  test("a fix becomes the smallest token edit of the build's text, every other byte kept", () => {
    const r = patchUnits(parse(B), parse(FIX), mapOnA());
    assert.deepEqual(
      r.edits.map((e) => [e.unit, e.before, e.after]),
      [
        ["show", "", "+1"],
        ["Box.size", "", "*3"],
      ],
    );
    assert.equal(r.text, B.replace("let n=o+t;", "let n=o+t+1;").replace("return t*g}", "return t*g*3}"));
    assert.deepEqual(r.skipped, []);
  });

  test("a unit the fix leaves as it was gives no edit, though printed with other quotes", () => {
    const r = patchUnits(parse(B), parse('function wrap(s) { return "<" + s + ">" + `${s}`; }'), mapOnA());
    assert.equal(r.edits.length, 0);
    assert.equal(r.text, B);
  });

  test("a fix of a unit the build does not have is refused", () => {
    assert.throws(
      () => patchUnits(parse(NO_SHOW), parse(FIX), mapOnA()),
      (e) => e instanceof FixError && /no unit named show/.test(e.message),
    );
  });

  test("a new variable named like a minified one is refused, since it would change what a name finds", () => {
    const fix = "function show(text, flag) { var len = text.length; var e = 1; return wrap(text + e); }";
    assert.throws(
      () => patchUnits(parse(B), parse(fix), mapOnA()),
      (e) => e instanceof FixError && /one of the build's minified names/.test(e.message),
    );
  });

  test("a name the map does not apply to the build is kept as written, and said", () => {
    const r = patchUnits(parse(MORE_REFS), parse("function show(text, flag) { return 1; }"), mapOnA());
    assert.deepEqual(
      r.skipped.map(([unit, v]) => [unit, v.map((x) => x.name)]),
      [["show", ["len"]]],
    );
  });
});

describe("the fix shape", () => {
  test("a line diff has its context and a header for each run of changes", () => {
    assert.equal(lineDiff("a\nb\nc\n", "a\nB\nc\n"), "@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n");
    assert.equal(lineDiff("a\n", "a\n"), "");
    const many = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
    const d = lineDiff(many, many.replace("l2\n", "x\n").replace("l17\n", "y\n"));
    assert.equal(d.match(/^@@/gm).length, 2);
  });

  test("the unit before and after are printed alike, in our names, and differ only in the fix", async () => {
    const [s] = await fixShapes(
      parse(B),
      parse(
        "function show(text, flag) { var len = text.length; if (flag) { let joined = text + len + 1; return joined; } return wrap(text); }",
      ),
      mapOnA(),
    );
    assert.equal(s.unit, "show");
    assert.deepEqual(s.ours, [
      ["o", "text"],
      ["e", "flag"],
      ["t", "len"],
      ["n", "joined"],
    ]);
    assert.deepEqual(
      s.diff.split("\n").filter((l) => /^[-+]/.test(l)),
      ["-    let joined = text + len;", "+    let joined = text + len + 1;"],
    );
  });
});

describe("the built-in keyboard shortcuts", () => {
  const MAIN =
    'var other={};var builtInKeyboardShortcutGroups={"<DEFAULT>":{caption:"{%Default}",data:{' +
    'tbB_Two:["{KEYDOWN}{KEYDOWNREPEAT}{CTRL}{SHIFT}ARROWLEFT","{KEYDOWN}{SHIFT}{ALT}F8"],' +
    'tbA_One:["F2","{KEYDOWN}{CTRL}{"],tbD_Text:["&","\\\\","*"],tbC_None:[],' +
    'tbE_All:["{ALLEXCEPT}ARROWUP|&"]}}};var ideCommands={tbA_One:{internalAction:()=>{}},tbF_Free:{internalAction:()=>{}},tbC_None:{},tbB_Two:{}};\n';

  test("the group is read in the build's order, with no key too", () => {
    const map = builtInKeymap(parse(MAIN));
    assert.deepEqual(Object.keys(map), ["tbB_Two", "tbA_One", "tbD_Text", "tbC_None", "tbE_All"]);
    assert.deepEqual(map.tbA_One, ["F2", "{KEYDOWN}{CTRL}{"]);
    assert.deepEqual(map.tbD_Text, ["&", "\\", "*"]);
    assert.deepEqual(map.tbC_None, []);
    assert.throws(() => builtInKeymap(parse("var other={};\n")), /no built-in keyboard shortcut group/);
  });

  test("a key string is written by name, its modifiers in the pages' order", () => {
    assert.deepEqual(keyLabel("{KEYDOWN}{KEYDOWNREPEAT}{CTRL}{SHIFT}ARROWLEFT"), {
      keys: "<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Left</kbd>",
      release: false,
    });
    assert.deepEqual(keyLabel("{KEYDOWN}{CTRL}{"), { keys: "<kbd>Ctrl</kbd>+<kbd>{</kbd>", release: false });
    assert.deepEqual(keyLabel("CONTROL"), { keys: "<kbd>Ctrl</kbd>", release: true });
    assert.deepEqual(keyLabel("{KEYDOWN}CANCEL").keys, "<kbd>Break</kbd>");
    assert.deepEqual(keyLabel("{KEYDOWN}\\").keys, "<kbd>&#92;</kbd>");
  });

  test("the build's command ids are read in its order", () => {
    assert.deepEqual(builtInCommandIds(parse(MAIN)), ["tbA_One", "tbF_Free", "tbC_None", "tbB_Two"]);
    assert.throws(() => builtInCommandIds(parse("var other={};\n")), /no ideCommands/);
  });

  const TEXT = { tbA_One: "Does one.", tbB_Two: "Does two | with a bar\nand a break.", tbF_Free: "Does free." };
  const tables = () => {
    const map = builtInKeymap(parse(MAIN));
    return keymapTables(map, builtInCommandIds(parse(MAIN)), TEXT);
  };

  test("a command with a key is on the first table, by name, and says what is odd in words", () => {
    assert.deepEqual(tables().keyed.split("\n"), [
      "| Command | Keys | What it does |",
      "|---|---|---|",
      "| `tbA_One` | <kbd>Ctrl</kbd>+<kbd>{</kbd>; <kbd>F2</kbd>, on release | Does one. |",
      "| `tbB_Two` | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Left</kbd>, <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F8</kbd> | Does two &#124; with a bar and a break. |",
      "| `tbD_Text` | <kbd>&amp;</kbd>, <kbd>&#92;</kbd>, <kbd>&#42;</kbd>, on release |  |",
      "| `tbE_All` | every key its `{ALLEXCEPT}` list does not name, on release |  |",
    ]);
  });

  test("a command with no key is on the second table, listed in the group or not, with an empty cell for no text", () => {
    assert.deepEqual(tables().unkeyed.split("\n"), [
      "| Command | What it does |",
      "|---|---|",
      "| `tbC_None` |  |",
      "| `tbF_Free` | Does free. |",
    ]);
  });

  test("every command is on exactly one table", () => {
    const rows = (table) =>
      table
        .split("\n")
        .slice(2)
        .map((r) => r.split(" | ")[0].slice(3, -1));
    const { keyed, unkeyed } = tables();
    const all = [...rows(keyed), ...rows(unkeyed)];
    assert.deepEqual([...all].sort(), ["tbA_One", "tbB_Two", "tbC_None", "tbD_Text", "tbE_All", "tbF_Free"]);
  });

  test("a command with no description, or a description with no command, is named", () => {
    const ids = ["tbA_One", "tbB_Two", "tbZ_New", "tbY_New"];
    assert.deepEqual(commandTextProblems(ids, { tbA_One: "x", tbB_Two: "", tbOld: "y" }), {
      missing: ["tbY_New", "tbZ_New"],
      extra: ["tbOld"],
    });
    assert.deepEqual(commandTextProblems(["tbA_One"], { tbA_One: "x" }), { missing: [], extra: [] });
  });

  test("a page keeps everything round its tables, in its own line endings", () => {
    const t1 = "| Command | Keys | What it does |\n|---|---|---|\n| `new` | y | z |";
    const t2 = "| Command | What it does |\n|---|---|\n| `other` | w |";
    for (const eol of ["\n", "\r\n"]) {
      const page = [
        "# Keys",
        "",
        "| Command | Keys | What it does |",
        "|---|---|---|",
        "| `old` | x | v |",
        "",
        "## None",
        "",
        "| Command | What it does |",
        "|---|---|",
        "| `gone` | u |",
        "",
        "## See Also",
        "",
      ].join(eol);
      const r = pageKeymap(page, { keyed: t1, unkeyed: t2 });
      assert.equal(r.expected, t1 + "\n\n" + t2);
      assert.equal(r.current.split("\n\n").length, 2);
      assert.equal(r.text, page.replace("`old` | x | v", "`new` | y | z").replace("`gone` | u", "`other` | w"));
      assert.equal(pageKeymap(r.text, { keyed: t1, unkeyed: t2 }).current, r.expected);
    }
    assert.throws(
      () => pageKeymap("# no table\n", { keyed: t1, unkeyed: t2 }),
      /has no \| Command \| Keys \| What it does \| table/,
    );
  });
});

describe("the command line", () => {
  const TOOL = path.join(REPO_ROOT, "scripts", "ide_js.mjs");
  let root;
  let install;
  let map;
  let fix;

  // Child processes run with this process's own Node flags.
  const run = (...args) => {
    try {
      const stdout = execFileSync(process.execPath, [...process.execArgv, TOOL, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { code: 0, stdout, stderr: "" };
    } catch (e) {
      return { code: e.status, stdout: e.stdout, stderr: e.stderr };
    }
  };

  before(() => {
    root = mkdtempSync(path.join(tmpdir(), "ide-js-test-"));
    install = path.join(root, "twinBASIC_IDE_BETA_2");
    mkdirSync(path.join(install, "ide"), { recursive: true });
    writeFileSync(path.join(install, "ide", "main.js"), B);
    writeFileSync(path.join(install, "ide", "build.js"), "var tbVersionInfo = 'twinBASIC IDE BETA 2';");
    writeFileSync(path.join(install, "twinBASIC.exe"), "");
    map = path.join(root, "names.json");
    writeFileSync(map, JSON.stringify(mapOnA()));
    fix = path.join(root, "fix.js");
    writeFileSync(fix, "function show(text, flag) { var len = text.length; return wrap(text + len); }");
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("check says how the map applies, and exits 1 only when a name is lost", () => {
    const r = run("check", "--ide", install, "--map", map);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /^exact {4}show 0#0 e -> o = text$/m);
    assert.match(r.stdout, /BETA 2: \{"exact":7,"carried":0,"review":0,"lost":0\}/);
    const other = path.join(root, "other.js");
    writeFileSync(other, ONE_PARAM);
    assert.equal(run("check", "--ide", other, "--map", map).code, 1);
  });

  test("keymap --check names the commands that have no description, and the descriptions that have no command", () => {
    const keys = path.join(root, "twinBASIC_IDE_BETA_3");
    mkdirSync(path.join(keys, "ide"), { recursive: true });
    writeFileSync(
      path.join(keys, "ide", "main.js"),
      'var builtInKeyboardShortcutGroups={"<DEFAULT>":{data:{tbQ_Keyed:["F2"]}}};var ideCommands={tbQ_Keyed:{},tbQ_Free:{}};\n',
    );
    writeFileSync(path.join(keys, "ide", "build.js"), "var tbVersionInfo = 'twinBASIC IDE BETA 3';");
    writeFileSync(path.join(keys, "twinBASIC.exe"), "");
    const shown = run("keymap", "--ide", keys);
    assert.equal(shown.code, 0, shown.stderr);
    assert.ok(shown.stdout.includes("| `tbQ_Keyed` | <kbd>F2</kbd>, on release |  |"));
    assert.ok(shown.stdout.includes("| `tbQ_Free` |  |"));
    const r = run("keymap", "--check", "--ide", keys);
    assert.equal(r.code, 1);
    assert.match(r.stdout, /no entry for 2 commands of BETA 3: tbQ_Free, tbQ_Keyed\n/);
    assert.match(r.stdout, /entries for commands BETA 3 lacks: tbBuild_Clean, /);
  });

  test("patch writes a main.js under the temp folder, and nothing into the repository", () => {
    const out = path.join(root, "out", "main.js");
    const r = run("patch", fix, "--ide", install, "--map", map, "--out", out);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(readFileSync(out, "utf8"), B.replace("if(e){let n=o+t;return n}return wrap(o)", "return wrap(o+t)"));
    const inRepo = run("patch", fix, "--ide", install, "--map", map, "--out", path.join(REPO_ROOT, "main.js"));
    assert.equal(inRepo.code, 2);
    assert.match(inRepo.stderr, /^refusing --out .*: it is inside the repository\nusage: /);
    assert.equal(
      run("patch", fix, "--ide", install, "--map", map, "--out", path.join(install, "ide", "main.js")).code,
      2,
    );
  });

  test("patch copies an install only into a folder under the temp folder", () => {
    const r = run("patch", fix, "--ide", install, "--map", map, "--copy-to", path.join(REPO_ROOT, "copy"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /^refusing --copy-to .*: it is not under /);
    const ok = run("patch", fix, "--ide", install, "--map", map, "--copy-to", path.join(root, "copy"));
    assert.equal(ok.code, 0, ok.stderr);
    const copied = readFileSync(path.join(root, "copy", "twinBASIC_IDE_BETA_2", "ide", "main.js"), "utf8");
    assert.notEqual(copied, B);
    assert.equal(readFileSync(path.join(install, "ide", "main.js"), "utf8"), B);
  });

  test("a fix that does not apply is a finding, exit 1", () => {
    const missing = path.join(root, "missing.js");
    writeFileSync(missing, "function nowhere() {}");
    const r = run("patch", missing, "--ide", install, "--map", map, "--out", path.join(root, "x.js"));
    assert.equal(r.code, 1);
    assert.equal(r.stderr, "the build has no unit named nowhere\n");
  });
});
