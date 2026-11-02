// The language of the IDE and the compiler's messages, tested for what docs/IDE/Customising/index.md
// (What changes when you switch, and Language packs) and the FAQ's localization entry say: since
// BETA 1034 the compiler takes the text of each warning and error from the language pack, by a
// string named after its code. en-gb.lang holds the English text of the warnings and of the error
// TB5079, where {0}, {1} ... are the values the compiler fills in; a string named after another
// code replaces that message too, with the compiler's English message as {0}. No pack that ships
// with the IDE has any of these strings. A switch changes no message already shown: the compiler
// uses the new language when it next checks the file, after an edit or a restart of the compiler.
//
// It is also tested against one entry in BUGS-TO-REPORT.md:
//
//   "A language pack's string is cut at a semicolon followed by a space, so TB0022's message ends at
//   *Suspicious array assignment*" (bugs/language-pack-semicolon-cut)
//
// The project in probes/language has one file, Language.twin, with the warning TB0024 (an unused
// local variable, which its Settings makes a warning). The lane types two lines into it that give
// the errors TB5079 (an unrecognised name) and TB5179 (an expression cut short), later one more
// unused variable, and last four lines that give the warning TB0022 (an array assigned to one of
// another type). The pack, zz-zz.lang ("Probe Pack"), goes only into the lane's own APPDATA
// (<work>\appdata\twinBASIC\locale), which the IDE reads as its second locale folder. It inherits
// en-gb and gives the File menu, TB0024, TB5079 and TB5179 texts of its own, the Help menu a text
// with "; " inside its quotes and the View menu one with a ";" and no space after it.
//
// Choosing a language saves the IDE's options. The lane's IDE writes none of its settings
// (--no-save-ide-settings, IDE_FLAGS in scripts/lib/tb-ide.mjs). The page's hostAppObject is
// replaced by a proxy whose ChangeWindowSetting and RemoveRecentsList calls do nothing, the two
// calls the flags do not guard, as customising.test.mjs does. Nothing here reaches SaveSetting, so
// lanes.mjs names no settings for this lane.
//
// The tests share the lane's IDE in order. Each states what BETA 1034 does; the test named "control"
// passes whether or not the defect is fixed. If another fails after an IDE update, the IDE has
// changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the two pages
// above and Compiler-Warnings.md (TB0022), and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import {
  clickAt,
  openFile,
  pressKey,
  restartCompiler,
  setCursor,
  typeText,
  waitFor,
} from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(HERE, "probes", "language");
const FILE = "/LanguageProbe/Sources/Language.twin";
const DIM_LINE = 5; // Dim unused As Long

const PACK_NAME = "Probe Pack";
const BRITISH = "English (British English)";
const PACK = [
  `FriendlyName: "${PACK_NAME}";`,
  "inherits: en-gb;",
  'MenuCaptionFile: "PFILE";',
  "TB0024: \"PROBE unused local '{0}'\";",
  "TB5079: \"PROBE unrecognised symbol '{0}'\";",
  'TB5179: "PROBE TB5179 [{0}]";',
  'MenuCaptionHelp: "PHELP; CUT";',
  'MenuCaptionView: "PVIEW;WHOLE";',
  "",
].join("\r\n");

// TB0022's text in en-gb.lang, which holds a semicolon and a space.
const TB0022_WHOLE = "Suspicious array assignment; subtypes do not match";
const TB0022_CUT = "Suspicious array assignment";

// What the compiler reports for the probe's lines, in English and in the pack. `Debug.Print 1 +`
// gives two errors, TB5179 and a TB5079 for the end of the line.
const ENGLISH = {
  unused: "TB0024: Unused local variable 'unused'",
  spare: "TB0024: Unused local variable 'spare'",
  name: "TB5079: Unrecognized symbol 'noSuchName'",
  eol: "TB5079: Unrecognized symbol '{unexpected end of line}'",
  cut: "TB5179: Unexpected end of expression",
};
const PACKED = {
  unused: "TB0024: PROBE unused local 'unused'",
  spare: "TB0024: PROBE unused local 'spare'",
  name: "TB5079: PROBE unrecognised symbol 'noSuchName'",
  eol: "TB5079: PROBE unrecognised symbol '{unexpected end of line}'",
  cut: "TB5179: PROBE TB5179 [Unexpected end of expression]",
};
const TYPED = ["unused", "name", "eol", "cut"];
const EDITED = ["unused", "spare", "name", "eol", "cut"];
const messages = (table, keys) => keys.map((k) => table[k]);

const GUARD_JS = `(() => {
  if (window.__guarded) return;
  window.__guarded = true;
  const blocked = new Set(["ChangeWindowSetting", "RemoveRecentsList"]);
  hostAppObject = new Proxy(hostAppObject, {
    get(target, key) {
      if (blocked.has(key)) return async () => undefined;
      return Reflect.get(target, key);
    },
  });
})()`;

// The messages as the code editor has them ("TB0024: ...") and the DIAGNOSTICS panel's rows as
// they read ("TB0024Unused ... [5,13]"), the language chosen and the captions of the File, Help and
// View menus.
const STATE_JS = `(() => {
  const rows = [...(problemsPanel.tree.sectionHeader.parentNode).querySelectorAll(".problemNodeItem")]
    .map((e) => e.innerText.replace(/\\s+/g, " ").trim());
  const markers = monaco.editor.getModelMarkers({}).map((m) => m.message).sort();
  return { language: liveIDEOptions.language, file: rootMenuFile.innerText, help: rootMenuHelp.innerText,
    view: rootMenuView.innerText, rows, markers };
})()`;

// Each pack's codes: the names of its strings that are a diagnostic's code.
const PACK_CODES_JS = `Object.fromEntries(customLanguages.map((l) =>
  [l.fullName, [...l.text.matchAll(/(?:^|\\n)[ \\t]*(TB\\d{4})[ \\t]*:/g)].map((m) => m[1])]))`;

scenario("language", (lane) => {
  let c = null;
  const state = () => c.evaluate(STATE_JS);

  // True when the editor and the panel both hold exactly `messages`.
  const holds = (s, messages) => {
    const want = [...messages].sort();
    if (JSON.stringify(s.markers) !== JSON.stringify(want)) return false;
    // A row is the code, the message and the position: "TB0024Unused local variable 'unused' [5,13]".
    const rows = s.rows.map((r) => r.replace(/ \[\d+,\d+\]$/, "").replace(/^(TB\d{4})/, "$1: ")).sort();
    return JSON.stringify(rows) === JSON.stringify(want);
  };
  const waitForMessages = async (t, what, messages) => {
    const ok = await waitFor(c, async () => holds(await state(), messages), { timeout: 30 * 1000, interval: 300 });
    const s = await state();
    t.diagnostic(`${what}: ${JSON.stringify(s)}`);
    assert.ok(ok, `${what}: the messages are not ${JSON.stringify(messages)}`);
    return s;
  };

  // Window > Language, then the pack named `name`, with the mouse: the submenu opens on a hover.
  async function chooseLanguage(name) {
    const root = await c.evaluate(
      `(() => { const r = rootMenuWindows.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
    );
    await clickAt(c, root.x, root.y);
    await sleep(400);
    const item = await c.evaluate(`(() => {
      const e = [...document.querySelectorAll("#contextMenu > *")].find((x) => x.querySelector(".codicon-globe"));
      const r = e && e.getBoundingClientRect();
      return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    })()`);
    assert.ok(item, "the Window menu has no Language item");
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: item.x, y: item.y });
    const pick = await waitFor(
      c,
      () =>
        c.evaluate(`(() => {
          const e = [...document.querySelectorAll("#contextMenuSUB > *")].find((x) => x.innerText.trim() === ${JSON.stringify(name)});
          const r = e && e.getBoundingClientRect();
          return r && r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
        })()`),
      { timeout: 5 * 1000 },
    );
    assert.ok(pick, `the Language submenu has no item ${name}`);
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: item.x + 40, y: pick.y });
    await clickAt(c, pick.x, pick.y);
    await sleep(500);
  }

  // Types `lines` below line `after`, each on a line of its own, with no completion accepted.
  async function addLines(after, lines) {
    await setCursor(c, after, 1);
    await pressKey(c, "End");
    for (const line of lines) {
      await pressKey(c, "Escape");
      await pressKey(c, "Enter");
      await typeText(c, line);
      await sleep(300);
    }
    await pressKey(c, "Escape");
  }

  before(async () => {
    const locale = path.join(lane.appdataDir(), "twinBASIC", "locale");
    mkdirSync(locale, { recursive: true });
    writeFileSync(path.join(locale, "zz-zz.lang"), PACK);
    c = await lane.open(PROJECT);
    await c.evaluate(GUARD_JS);
    await c.evaluate(`executeIdeCommand("tbProblems_ShowPanel")`);
    await openFile(c, FILE, { line: DIM_LINE, column: 1 });
  });

  test("en-gb.lang names the warnings and the error TB5079, and no pack that ships with the IDE names a code", async (t) => {
    const codes = await c.evaluate(PACK_CODES_JS);
    t.diagnostic(JSON.stringify(codes));
    const british = codes["en-gb.lang"];
    assert.ok(british, "no en-gb.lang");
    assert.ok(british.includes("TB5079"), "en-gb.lang has no TB5079");
    assert.deepEqual(
      british.filter((k) => !/^TB00\d\d$/.test(k)),
      ["TB5079"],
      "en-gb.lang names a code that is neither a warning nor TB5079",
    );
    assert.ok(!british.includes("TB5179"), "en-gb.lang names TB5179");
    const shipped = Object.entries(codes).filter(([f, k]) => f !== "en-gb.lang" && f !== "zz-zz.lang" && k.length);
    assert.deepEqual(shipped, [], "a shipped pack names a code");
  });

  test("in British English the compiler's messages are its own English text", async (t) => {
    await waitForMessages(t, "at start", [ENGLISH.unused]);
    await addLines(DIM_LINE, ["Debug.Print noSuchName", "Debug.Print 1 +"]);
    await waitForMessages(t, "typed", messages(ENGLISH, TYPED));
  });

  test("a switch to a pack changes the IDE's own text at once and no message already shown", async (t) => {
    await chooseLanguage(PACK_NAME);
    const s = await state();
    assert.equal(s.language, "zz-zz");
    assert.equal(s.file, "PFILE");
    await sleep(5000);
    await waitForMessages(t, "five seconds after the switch", messages(ENGLISH, TYPED));
  });

  test("after an edit every message takes the pack's text by its code, {0} the English message for a code en-gb.lang lacks", async (t) => {
    await addLines(DIM_LINE, ["Dim spare As Long"]);
    await waitForMessages(t, "edited", messages(PACKED, EDITED));
  });

  test("a switch back keeps the pack's text, and a restart of the compiler gives the English back", async (t) => {
    await chooseLanguage(BRITISH);
    assert.equal((await state()).file, "File");
    await sleep(5000);
    await waitForMessages(t, "five seconds after the switch", messages(PACKED, EDITED));
    await restartCompiler(c, { project: lane.project });
    await waitForMessages(t, "restarted", messages(ENGLISH, EDITED));
  });

  test("a restart of the compiler under the pack gives the pack's text", async (t) => {
    await chooseLanguage(PACK_NAME);
    await restartCompiler(c, { project: lane.project });
    await waitForMessages(t, "restarted", messages(PACKED, EDITED));
  });

  test("a ';' and a space end a pack's string inside its quotes: the Help menu reads PHELP, and TB0022's message ends at its semicolon", async (t) => {
    const s = await state();
    const read = await c.evaluate(`({
      file: customLanguages.find((l) => l.fullName === "en-gb.lang").text.includes(${JSON.stringify(TB0022_WHOLE)}),
      table: activeLanguageData.TB0022,
    })`);
    t.diagnostic(JSON.stringify({ help: s.help, read }));
    assert.equal(s.help, "PHELP");
    assert.ok(read.file, "en-gb.lang does not hold TB0022's whole text");
    assert.equal(read.table, TB0022_CUT);
    await addLines(DIM_LINE, ["Dim counts() As Long", "Dim small() As Integer", "ReDim small(3)", "counts = small"]);
    const tb0022 = () => state().then((x) => x.markers.find((m) => m.startsWith("TB0022")));
    const shown = await waitFor(c, tb0022, { timeout: 30 * 1000, interval: 300 });
    t.diagnostic(`TB0022's marker: ${JSON.stringify(shown)}`);
    assert.equal(shown, `TB0022: ${TB0022_CUT}`);
  });

  test("control: a ';' with no space after it stays in a pack's string: the View menu reads PVIEW;WHOLE", async () => {
    assert.equal((await state()).view, "PVIEW;WHOLE");
  });
});
