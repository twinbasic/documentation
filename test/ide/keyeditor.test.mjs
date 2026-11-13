// The help add-in's keyboard shortcut editor, add-in/Resources/SCRIPTS/keyeditor.js, in the IDE's
// own Manage Keyboard Shortcuts dialog: a table of every command in place of the IDE's "Keyboard
// editor coming soon" pane, which writes each change into the IDE's text area. WIP.HelpAddin.md,
// Stage 4 item 13.
//
// The script is put into the page as the add-in puts it, with its two markers filled in, but without
// the add-in: the help lane (test/addin/help.test.mjs) builds the add-in and checks that its settings
// box puts the script in and takes it out. This lane needs no add-in, so it tests the editor itself in
// a minute rather than a build. The groups are set in the page, never saved: every IDE the harness
// starts has --no-save-ide-settings, so Save Changes changes the page's copy only.
//
// No project is opened: the IDE starts as from its icon, and the New / Open dialog is cancelled.
// The page's ChangeWindowSetting and RemoveRecentsList, which the flags do not guard, do nothing, as
// in customising.test.mjs. Nothing reaches SaveSetting, so lanes.mjs names no settings.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { pressKey, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const SCRIPTS = path.join(REPO_ROOT, "add-in", "Resources", "SCRIPTS");
const COMMANDS = path.join(REPO_ROOT, "add-in", "Resources", "KEYS", "commands.json");

// The script as ApplyFix in HelpAddIn.twin makes it, run as the body of a function, as the inline
// handler PageScript wraps it in runs it.
function editorScript(on) {
  const js = readFileSync(path.join(SCRIPTS, "keyeditor.js"), "utf8")
    .replace("$ON$", on ? "true" : "false")
    .replace("$COMMANDS$", () => readFileSync(COMMANDS, "utf8").trim());
  return `(function () {\n${js}\n})()`;
}

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
  window.__errors = [];
  window.addEventListener("error", (e) => window.__errors.push(String(e.message)));
  window.__ideShowConfigEditor = showConfigEditor;
})()`;

// The groups the dialog shows: Mine and Later switched on, Off not, and Broken not valid JSON.
const MINE = {
  tbMisc_NoSuchCommand: ["{KEYDOWN}{CTRL}Q"],
  tbEditor_ClipboardCut: ["{KEYDOWN}{CTRL}X"],
  "+tbEditor_ToggleWordWrap": ["{KEYDOWN}{CTRL}{SHIFT}Y"],
  tbDebug_Stop: ["{CTRL}{SHIFT}F5"],
  // Ctrl+A, which the built-in group gives this command and others: kept, it is no conflict.
  tbEditor_SelectAll: ["{KEYDOWN}{CTRL}A"],
};
const LATER = { tbEditor_ClipboardCut: ["{KEYDOWN}{SHIFT}DELETE"] };
const OFF = { tbBuild_Start: ["{KEYDOWN}{CTRL}D"] };
const GROUPS_JS = `(() => {
  customKeyboardShortcutGroups = {
    Mine: { data: ${JSON.stringify(JSON.stringify(MINE))} },
    Later: { data: ${JSON.stringify(JSON.stringify(LATER))} },
    Off: { data: ${JSON.stringify(JSON.stringify(OFF))} },
    Broken: { data: "{not json" },
  };
  activeKeyboardShortcutGroupNames = "|Mine||Later||Broken|";
  syncActiveKeyboardShortcuts();
  return true;
})()`;

// What the dialog shows: its pane, the table's rows, the status line, the text area and Save.
const STATE_JS = `(() => {
  const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
  if (!m) return null;
  const area = m.querySelector(".keyboardEditorGroup textarea");
  const top = m.querySelector(".tbKeTop");
  const shown = (e) => !!e && e.getBoundingClientRect().height > 0;
  return {
    title: (m.querySelector(".modalTitleBar")?.innerText || "").trim(),
    header: (m.querySelector(".configEditorInfoHeader")?.innerText || "").trim(),
    selected: (m.querySelector(".configEditorEntrySelected")?.innerText || "").trim(),
    table: shown(top),
    area: shown(area),
    label: shown(m.querySelector(".jsonSwitchLabel")),
    text: area ? area.value : null,
    rows: m.querySelectorAll(".tbKeRow[data-cmd]").length,
    stray: [...m.querySelectorAll(".tbKeStray .tbKeCmd")].map((e) => e.textContent),
    notes: [...m.querySelectorAll(".tbKeList > .tbKeNote")].map((e) => e.textContent),
    status: (m.querySelector(".tbKeStatus")?.textContent || "").trim(),
    filters: [...m.querySelectorAll(".tbKeChip")].map((e) => e.textContent),
    saveDisabled: document.getElementById("SAVEBTN")?.classList.contains("disabled") ?? null,
    editor: m.querySelector(".tbKeEditor")?.getAttribute("data-cmd") ?? null,
    message: (m.querySelector(".tbKeEditor .tbKeError[role=alert]")?.textContent || "").trim(),
  };
})()`;

// A row of the table: its chips, each with its text and classes, and the note of a later group.
const rowJs = (cmd) => `(() => {
  const r = document.querySelector('.tbKeRow[data-cmd="${cmd}"]');
  if (!r) return null;
  return {
    chips: [...r.querySelectorAll(":scope > .tbKeKeys .tbKeKey")].map((k) => ({
      text: k.textContent.trim(),
      cls: [...k.classList].filter((x) => x !== "tbKeKey").sort().join(" "),
      title: k.title,
    })),
    later: (r.querySelector(".tbKeLater")?.textContent || "").trim(),
    changed: r.classList.contains("tbKeChanged"),
    desc: (r.querySelector(".tbKeDesc")?.textContent || "").trim(),
  };
})()`;

scenario("the keyboard shortcut editor", (lane) => {
  let c = null;
  const state = () => c.evaluate(STATE_JS);
  const row = (cmd) => c.evaluate(rowJs(cmd));
  const parsedText = async () => JSON.parse((await state()).text);
  // Clicks the first element `css` finds in the dialog, by its onclick.
  async function clickIn(css) {
    const ok = await c.evaluate(`(() => {
      const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
      const e = m && m.querySelector(${JSON.stringify(css)});
      if (!e) return false;
      e.click();
      return true;
    })()`);
    assert.ok(ok, `nothing in the dialog matches ${css}`);
    await sleep(100);
  }
  async function selectGroup(name) {
    const ok = await c.evaluate(`(() => {
      const e = [...document.querySelectorAll(".configEditorEntry")].find((e) => e.innerText.trim().startsWith(${JSON.stringify(name)}));
      if (!e) return false;
      e.click();
      return true;
    })()`);
    assert.ok(ok, `the dialog lists no group ${name}`);
    await sleep(150);
  }
  async function openDialog() {
    await c.evaluate(`executeIdeCommand("tbKeyboardShortcuts_ShowManageKeyboardShortcuts")`);
    assert.ok(
      await waitFor(c, async () => (await state())?.title === "Manage Keyboard Shortcuts"),
      "the dialog did not open",
    );
  }
  async function cancelDialog() {
    await c.evaluate(`(() => {
      const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
      const b = m && [...m.querySelectorAll("button, .dialogButton, [class*=Button]")].find((e) => e.textContent.trim() === "Cancel");
      if (b) b.click(); else if (modalDialogs.length) hideModalDialog();
    })()`);
    assert.ok(await waitFor(c, () => c.evaluate("modalDialogs.length === 0")), "the dialog did not close");
  }
  // Opens the editor of a command's row, and the capture of a key, and presses the key.
  async function addKey(cmd, key, mods) {
    if ((await state()).editor !== cmd) await clickIn(`.tbKeRow[data-cmd="${cmd}"] .tbKeCmd`);
    assert.equal((await state()).editor, cmd, `the editor of ${cmd} did not open`);
    await clickIn(`.tbKeEditor [data-act="capture"][data-kind="key"]`);
    assert.ok(
      await waitFor(c, () => c.evaluate(`document.activeElement?.classList.contains("tbKeCapture") === true`)),
      "the capture box has not got the focus",
    );
    await pressKey(c, key, mods);
    await sleep(150);
  }

  before(async () => {
    c = await lane.openNoProject();
    const ready = await waitFor(
      c,
      () =>
        c.evaluate(
          `(() => { try { return typeof liveIDEOptions === "object" && [...document.querySelectorAll(".modalTitleBar")].some((b) => b.innerText.includes("New / Open")); } catch { return false; } })()`,
        ),
      { timeout: 90 * 1000, interval: 250 },
    );
    assert.ok(ready, "the IDE showed no New / Open dialog");
    await sleep(1500);
    await c.evaluate(GUARD_JS);
    await cancelDialog();
    assert.equal(await c.evaluate("g_DontSaveIdeSettings"), true, "the IDE would save its settings");
    await c.evaluate(GROUPS_JS);
    await c.evaluate(editorScript(true));
    assert.equal(await c.evaluate("typeof window.tbDocsKeyEditor"), "object", "the script did not put the editor in");
  });

  test("the built-in group opens as a read-only table of every command, with its keys and descriptions", async () => {
    await openDialog();
    try {
      const s = await state();
      assert.equal(s.selected, "<DEFAULT> (built-in group)");
      assert.equal(s.table, true, "the table does not show");
      assert.equal(s.area, false, "the IDE's text area shows beside the table");
      assert.equal(s.label, false, "the IDE's Edit as JSON box shows");
      assert.ok(s.header.endsWith("Ask on discord for further help!"), `the header: ${JSON.stringify(s.header)}`);
      assert.doesNotMatch(s.header, /ps\.\s+in future/, "the header still promises an editor");
      const commands = await c.evaluate("Object.keys(ideCommands).length");
      assert.equal(s.rows, commands, "the table does not have a row for every command");
      assert.ok(
        s.notes.some((n) => n.includes("read-only")),
        `no read-only note: ${JSON.stringify(s.notes)}`,
      );
      assert.ok(!s.filters.some((f) => f.startsWith("Changed here")), "the built-in group has a Changed here filter");
      const copy = await row("tbEditor_ClipboardCopy");
      assert.deepEqual(
        copy.chips.map((k) => k.text),
        ["Ctrl+C", "Ctrl+Insert"],
      );
      assert.ok(copy.desc.startsWith("Copies the selection"), `the description: ${copy.desc}`);
      // A row of the built-in group opens nothing.
      await clickIn(`.tbKeRow[data-cmd="tbEditor_ClipboardCopy"] .tbKeCmd`);
      assert.equal((await state()).editor, null, "a row of the built-in group opened an editor");
      // JSON shows the IDE's text area, and Table the table again.
      await clickIn(`.tbKeFoot [data-view="json"]`);
      let v = await state();
      assert.deepEqual([v.table, v.area], [false, true], "JSON did not show the text area");
      await clickIn(`.tbKeFoot [data-view="table"]`);
      v = await state();
      assert.deepEqual([v.table, v.area], [true, false], "Table did not show the table");
      assert.equal(v.saveDisabled, true, "looking at the built-in group enabled Save Changes");
    } finally {
      await cancelDialog();
    }
  });

  test("a group's rows show the keys of earlier groups, its own, what it removes, and a later group's change", async () => {
    await openDialog();
    try {
      await selectGroup("Mine");
      const s = await state();
      assert.equal(s.table, true);
      assert.deepEqual(s.stray, ["tbMisc_NoSuchCommand"], "the entry for no command is not listed apart");
      const cut = await row("tbEditor_ClipboardCut");
      assert.deepEqual(
        cut.chips.map((k) => [k.text, k.cls]),
        [
          ["Shift+Delete", "tbKeGone"],
          ["Ctrl+X", "tbKeMine"],
        ],
      );
      assert.equal(cut.changed, true);
      assert.equal(cut.later, "Later changes this again");
      const wrap = await row("tbEditor_ToggleWordWrap");
      assert.deepEqual(
        wrap.chips.map((k) => [k.text, k.cls]),
        [
          ["Alt+Z", ""],
          ["Ctrl+Shift+Y", "tbKeMine"],
        ],
      );
      // A key bound for its release with Ctrl held never runs.
      const stop = await row("tbDebug_Stop");
      assert.equal(stop.chips.length, 1);
      assert.match(stop.chips[0].cls, /tbKeDead/);
      assert.match(stop.chips[0].title, /never runs with Ctrl or Alt/);
      // The built-in group gives Ctrl+A to this command and to others: the group keeping it adds
      // no conflict.
      const selectAll = await row("tbEditor_SelectAll");
      assert.deepEqual(
        selectAll.chips.map((k) => [k.text, k.cls]),
        [["Ctrl+A", "tbKeMine"]],
      );
      assert.equal(
        await c.evaluate(
          `Object.entries(builtInKeyboardShortcutGroups["<DEFAULT>"].data).filter(([n, v]) => n !== "tbEditor_SelectAll" && v.includes("{KEYDOWN}{CTRL}A")).length > 0`,
        ),
        true,
        "the built-in group gives Ctrl+A to no other command, so the case tests nothing",
      );
      assert.ok(
        s.filters.some((f) => f.startsWith("Changed here 4")),
        `the filters: ${JSON.stringify(s.filters)}`,
      );
      assert.match(s.status, /^5 entries, 1 command with a problem/);
    } finally {
      await cancelDialog();
    }
  });

  test("a key pressed in the editor is written into the group's text, and a key another command has is a conflict", async () => {
    await openDialog();
    try {
      await selectGroup("Mine");
      assert.equal((await state()).saveDisabled, true);
      await addKey("tbEditor_ToggleWordWrap", "d", { ctrl: true });
      const text = await parsedText();
      assert.deepEqual(text["+tbEditor_ToggleWordWrap"], ["{KEYDOWN}{CTRL}{SHIFT}Y", "{KEYDOWN}{CTRL}D"]);
      assert.deepEqual(Object.keys(text), Object.keys(MINE), "the entries are not in their order");
      assert.equal((await state()).saveDisabled, false, "the change did not enable Save Changes");
      // Ctrl+D is tbEditor_AddSelectionToNextFindMatch's in the built-in group: both rows show it.
      const wrap = await row("tbEditor_ToggleWordWrap");
      const d = wrap.chips.find((k) => k.text === "Ctrl+D");
      assert.match(d.cls, /tbKeClash/);
      assert.match(d.title, /tbEditor_AddSelectionToNextFindMatch \(<DEFAULT>\)/);
      const other = await row("tbEditor_AddSelectionToNextFindMatch");
      assert.match(other.chips.find((k) => k.text === "Ctrl+D").cls, /tbKeClash/);
      // The group Off is not switched on, so its Ctrl+D on tbBuild_Start is no conflict.
      assert.doesNotMatch(d.title, /tbBuild_Start/);
      // Find a key lists the commands of the key pressed.
      await clickIn(".tbKeKeyFind");
      await pressKey(c, "d", { ctrl: true });
      await sleep(150);
      const listed = await c.evaluate(
        `[...document.querySelectorAll(".tbKeRow[data-cmd]")].map((r) => r.getAttribute("data-cmd")).sort()`,
      );
      assert.deepEqual(listed, ["tbEditor_AddSelectionToNextFindMatch", "tbEditor_ToggleWordWrap"]);
      await clickIn(".tbKeKeyFind");
      assert.equal((await state()).rows > 400, true, "Find a key did not clear");
    } finally {
      await cancelDialog();
    }
  });

  test("the editor replaces, removes and resets a command's keys, and changes when a key runs", async () => {
    await openDialog();
    try {
      await selectGroup("Mine");
      await addKey("tbEditor_ClipboardCopy", "k", { ctrl: true, shift: true });
      let t = await parsedText();
      assert.deepEqual(t["+tbEditor_ClipboardCopy"], ["{KEYDOWN}{CTRL}{SHIFT}K"], "a new entry keeps the earlier keys");
      await clickIn(`.tbKeEditor [data-act="mode"][data-mode="replace"]`);
      t = await parsedText();
      assert.deepEqual(t.tbEditor_ClipboardCopy, ["{KEYDOWN}{CTRL}{SHIFT}K"]);
      assert.equal("+tbEditor_ClipboardCopy" in t, false);
      const copy = await row("tbEditor_ClipboardCopy");
      assert.deepEqual(
        copy.chips.map((k) => [k.text, k.cls.replace(" tbKeClash", "").replace("tbKeClash ", "")]),
        [
          ["Ctrl+C", "tbKeGone"],
          ["Ctrl+Insert", "tbKeGone"],
          ["Ctrl+Shift+K", "tbKeMine"],
        ],
      );
      // When it runs: released is refused with Ctrl held, repeating is written.
      const options = await c.evaluate(
        `[...document.querySelector(".tbKeEditor select.tbKeTiming").options].map((o) => [o.value, o.disabled])`,
      );
      assert.deepEqual(options, [
        ["down", false],
        ["repeat", false],
        ["release", true],
      ]);
      await c.evaluate(`(() => {
        const s = document.querySelector(".tbKeEditor select.tbKeTiming");
        s.value = "repeat";
        s.dispatchEvent(new Event("change", { bubbles: true }));
      })()`);
      await sleep(100);
      assert.deepEqual((await parsedText()).tbEditor_ClipboardCopy, ["{KEYDOWN}{KEYDOWNREPEAT}{CTRL}{SHIFT}K"]);
      await clickIn(`.tbKeEditor [data-act="nokeys"]`);
      assert.deepEqual((await parsedText()).tbEditor_ClipboardCopy, []);
      assert.deepEqual(
        (await row("tbEditor_ClipboardCopy")).chips.map((k) => k.cls),
        ["tbKeGone", "tbKeGone"],
      );
      await clickIn(`.tbKeEditor [data-act="reset"]`);
      t = await parsedText();
      assert.equal("tbEditor_ClipboardCopy" in t, false, "Reset left the entry");
      assert.deepEqual(Object.keys(t), Object.keys(MINE));
      // An entry for no command goes with its Remove button.
      await clickIn(`.tbKeStray [data-act="strayremove"]`);
      assert.equal("tbMisc_NoSuchCommand" in (await parsedText()), false);
    } finally {
      await cancelDialog();
    }
  });

  test("a key with an argument, and a key the IDE has no name for", async () => {
    await openDialog();
    try {
      await selectGroup("Mine");
      await clickIn(`.tbKeRow[data-cmd="tbDebugConsole_ExecuteCode"] .tbKeCmd`);
      await c.evaluate(`document.querySelector('.tbKeEditor [data-act="argdraft"]').focus()`);
      await typeText(c, "? 'a'");
      await clickIn(`.tbKeEditor [data-act="capture"][data-kind="arg"]:not([data-name])`);
      await pressKey(c, "j", { ctrl: true, shift: true });
      await sleep(150);
      const t = await parsedText();
      assert.deepEqual(t["tbDebugConsole_ExecuteCode('? \\'a\\'')"], ["{KEYDOWN}{CTRL}{SHIFT}J"]);
      const chip = (await row("tbDebugConsole_ExecuteCode")).chips[0];
      assert.equal(chip.text, "Ctrl+Shift+J ('? 'a'')");
      // A semicolon has no name in the IDE's key table.
      await clickIn(`.tbKeEditor [data-act="capture"][data-kind="key"]`);
      await pressKey(c, ";", { ctrl: true });
      await sleep(150);
      assert.match((await state()).message, /no name for ;/);
      assert.deepEqual(Object.keys(await parsedText()), Object.keys(t), "the refused key changed the text");
    } finally {
      await cancelDialog();
    }
  });

  test("Esc and Enter in the table leave the dialog open, and Ctrl+F goes to the search box", async () => {
    await openDialog();
    try {
      await selectGroup("Mine");
      await c.evaluate(`document.querySelector(".tbKeSearch").focus()`);
      await typeText(c, "wordwrap");
      await pressKey(c, "Enter");
      await sleep(200);
      assert.equal((await state())?.title, "Manage Keyboard Shortcuts", "Enter closed the dialog");
      const found = await c.evaluate(
        `[...document.querySelectorAll(".tbKeRow[data-cmd]")].map((r) => r.getAttribute("data-cmd"))`,
      );
      assert.ok(
        found.includes("tbEditor_ToggleWordWrap") && found.length < 10,
        `the search found ${JSON.stringify(found)}`,
      );
      await clickIn(`.tbKeRow[data-cmd="tbEditor_ToggleWordWrap"] .tbKeCmd`);
      await c.evaluate(`document.querySelector('.tbKeRow[data-cmd="tbEditor_ToggleWordWrap"]').focus()`);
      await pressKey(c, "Escape");
      await sleep(150);
      let s = await state();
      assert.equal(s?.title, "Manage Keyboard Shortcuts", "Esc closed the dialog");
      assert.equal(s.editor, null, "Esc did not close the command's editor");
      await pressKey(c, "Escape");
      await pressKey(c, "Escape");
      await sleep(150);
      s = await state();
      assert.equal(s?.title, "Manage Keyboard Shortcuts", "Esc closed the dialog");
      assert.ok(s.rows > 400, "Esc did not clear the search");
      await c.evaluate(`document.querySelector('.tbKeRow[data-cmd="tbEditor_ToggleWordWrap"]')?.focus()`);
      await pressKey(c, "f", { ctrl: true });
      assert.equal(await c.evaluate(`document.activeElement?.classList.contains("tbKeSearch")`), true);
    } finally {
      await cancelDialog();
    }
  });

  test("a group that is not valid JSON shows as text, and a group that is off says so", async () => {
    await openDialog();
    try {
      await selectGroup("Broken");
      let s = await state();
      assert.deepEqual([s.table, s.area], [false, true], "the broken group is not shown as text");
      assert.match(s.status, /not valid JSON/);
      await selectGroup("Off");
      s = await state();
      assert.equal(s.table, true);
      assert.match(s.status, /Off: switch it on/);
    } finally {
      await cancelDialog();
    }
  });

  test("Save Changes keeps what the table wrote, and the IDE applies it", async () => {
    await openDialog();
    await selectGroup("Mine");
    await addKey("tbEditor_ToggleWordWrap", "u", { ctrl: true, alt: true });
    await c.evaluate(`(() => {
      const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
      [...m.querySelectorAll("button, .dialogButton, [class*=Button]")].find((e) => e.textContent.trim() === "Save Changes").click();
    })()`);
    assert.ok(await waitFor(c, () => c.evaluate("modalDialogs.length === 0")), "Save Changes did not close the dialog");
    const saved = JSON.parse(await c.evaluate("customKeyboardShortcutGroups.Mine.data"));
    assert.deepEqual(saved["+tbEditor_ToggleWordWrap"], ["{KEYDOWN}{CTRL}{SHIFT}Y", "{KEYDOWN}{CTRL}{ALT}U"]);
    const bound = await c.evaluate(`activeKeyBindings.tbEditor_ToggleWordWrap.map((b) => b.key)`);
    assert.ok(bound.includes("{KEYDOWN}{CTRL}{ALT}U"), `the IDE did not apply the key: ${JSON.stringify(bound)}`);
  });

  test("run again, the script does not stack; turned off with the dialog open, it gives the text area back", async () => {
    await c.evaluate(editorScript(true));
    assert.equal(
      await c.evaluate("showConfigEditor.tbDocsOriginal === window.__ideShowConfigEditor"),
      true,
      "the second run wrapped the first run's function",
    );
    await openDialog();
    try {
      assert.equal((await state()).table, true);
      assert.doesNotMatch((await state()).header, /ps\.\s+in future/);
      await c.evaluate(editorScript(false));
      const s = await state();
      assert.deepEqual(
        [s.table, s.area, s.label],
        [false, true, true],
        `the dialog was not given back: ${JSON.stringify(s)}`,
      );
      assert.match(s.header, /ps\.\s+in future we'll have a proper editor/, "the header's last line did not come back");
      assert.equal(await c.evaluate("showConfigEditor === window.__ideShowConfigEditor"), true);
      assert.equal(await c.evaluate("window.tbDocsKeyEditor"), null);
    } finally {
      await cancelDialog();
    }
    await openDialog();
    try {
      const s = await state();
      assert.deepEqual([s.table, s.label], [false, true], "the IDE's own dialog did not open");
      assert.match(
        s.header,
        /ps\.\s+in future we'll have a proper editor/,
        "the stock dialog lost its header's last line",
      );
    } finally {
      await cancelDialog();
    }
    assert.deepEqual(await c.evaluate("window.__errors"), [], "the page had uncaught errors");
  });
});
