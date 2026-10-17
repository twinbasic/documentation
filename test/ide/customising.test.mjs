// Customising the IDE: custom themes and keyboard-shortcut groups, tested against three entries in
// BUGS-TO-REPORT.md:
//
//   "A `Dark.theme` or `Light.theme` in `%APPDATA%\twinBASIC\themes` stops every custom theme from
//   inheriting, and Reload from disk from applying the theme" (bugs/theme-override-breaks-inheritance)
//   "Two themes that inherit from each other freeze the IDE, and choosing one fails with a stack
//   overflow" (bugs/theme-inherit-loop)
//   "A keyboard-shortcut group whose name contains `|` switches other groups on and off"
//   (bugs/keyboard-group-bar-name)
//
// No project is opened: each IDE starts as from its icon, and the New / Open dialog is cancelled.
// The custom theme files go only into the lane's own APPDATA (<work>\appdata\twinBASIC\themes), which
// the IDE reads as its common themes folder.
//
// THE IDE WOULD SAVE ITS OPTIONS IN THE USER'S OWN REGISTRY, HKCU\Software\VB and VBA Program
// Settings\twinBASIC_IDE\IDESettings, whatever its APPDATA is: choosing a theme writes colorTheme, and
// the keyboard dialog and menu write CUSTOM_KEYBOARD_SHORTCUT_GROUPS and
// ACTIVE_KEYBOARD_SHORTCUT_GROUPS. Every IDE the harness starts has --no-save-ide-settings and
// --no-update-recent-files (IDE_FLAGS in scripts/lib/tb-ide.mjs), which guard those. They do not guard
// the Window key or the removals from the recent list, so, as soon as each IDE's page has loaded and
// before anything is chosen, the page's hostAppObject is replaced by a proxy whose
// ChangeWindowSetting and RemoveRecentsList calls do nothing (as shoot_docs.mjs's PAGE_DEFAULTS does
// for the second). Nothing here reaches SaveSetting, so lanes.mjs names no settings for this lane.
//
// The tests share the lane's IDE in order: the first two run in an IDE started with one custom theme,
// AtStart (inherits light); the third starts a new IDE with a Dark.theme beside it; the fourth uses
// whichever IDE is open. Each test states what BETA 1007 does. If one fails after an IDE update, the
// IDE has changed: update the entry in BUGS-TO-REPORT.md, or its report in bugs/filed/, the WARNING on
// docs/IDE/Customising/Themes.md or Keyboard-Shortcuts.md, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { clickAt, pressKey, typeText, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const RED = "rgb(255, 0, 0)";
const GREEN = "rgb(0, 128, 0)";
const LOOP_A = "rgb(1, 1, 1)";
const theme = (inherits, menu) => `inherits: ${inherits};\nMenuBackColor: ${menu};\n`;

// What the page knows of its themes and the colours applied now.
const THEME_STATE_JS = `(() => {
  const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  return {
    colorTheme: liveIDEOptions.colorTheme,
    darkMode: document.body.classList.contains("darkMode"),
    menu: v("--themeMenuBackColor"),
    loaded: customThemes.length,
    expected: customThemesCount,
    errors: window.__errors.slice(),
  };
})()`;

// Blocks every call that writes the user's registry, records the page's uncaught errors, and keeps a
// heartbeat that measures the longest time the page did not run.
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
  window.__maxGap = 0;
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    window.__maxGap = Math.max(window.__maxGap, now - last);
    last = now;
  }, 50);
})()`;

scenario("customising the IDE", (lane) => {
  let c = null;
  const common = path.join(lane.appdata, "twinBASIC", "themes");
  const writeTheme = (name, text) => {
    mkdirSync(common, { recursive: true });
    writeFileSync(path.join(common, `${name}.theme`), text, "utf8");
  };

  // A new IDE with no project, its New / Open dialog cancelled and its page guarded.
  async function startIde() {
    if (lane.run) await lane.closeProject();
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
    await clickModalButton("Cancel");
    assert.deepEqual(await modalTitles(), [], "the New / Open dialog did not close");
    return c;
  }

  const modalTitles = () =>
    c.evaluate(
      `[...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width).map((m) => (m.querySelector(".modalTitleBar")?.innerText || "").trim())`,
    );

  // Clicks the button of the top modal dialog that reads `caption`.
  async function clickModalButton(caption) {
    const at = await c.evaluate(`(() => {
      const ms = [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width);
      const m = ms[ms.length - 1];
      if (!m) return null;
      const b = [...m.querySelectorAll("button, .dialogButton, .msgBoxButton, [class*=Button]")]
        .find((e) => e.textContent.trim() === ${JSON.stringify(caption)} && e.getBoundingClientRect().width);
      if (!b) return null;
      const q = b.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(at, `no button "${caption}" in the top dialog`);
    await clickAt(c, at.x, at.y);
    await sleep(600);
  }

  // The Window > Theme list, as its items read: a ticked one starts "[x] ".
  async function themeMenu() {
    await c.evaluate(`executeIdeCommand("tbThemes_ShowList")`);
    await sleep(600);
    const items = await c.evaluate(
      `[...document.querySelectorAll("#contextMenu > *")].map((e) => (e.querySelector(".codicon-check") ? "[x] " : "") + e.innerText.trim()).filter((t) => t)`,
    );
    await c.evaluate(`hideContextMenu()`);
    await sleep(200);
    return items;
  }

  // Clicks the item of the Window > Theme list that is `label` or starts "`label` (".
  async function chooseTheme(label) {
    await c.evaluate(`executeIdeCommand("tbThemes_ShowList")`);
    await sleep(600);
    const at = await c.evaluate(`(() => {
      const l = ${JSON.stringify(label)};
      const it = [...document.querySelectorAll("#contextMenu > *")].find((e) => { const t = e.innerText.trim(); return t === l || t.startsWith(l + " ("); });
      if (!it) return null;
      const q = it.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(at, `the theme list has no item ${label}`);
    await clickAt(c, at.x, at.y);
    await sleep(800);
    await c.evaluate(`try { hideContextMenu() } catch {}`);
  }

  const themeState = () => c.evaluate(THEME_STATE_JS);

  // Waits until the page has read AtStart.theme again with `colour` in it.
  const waitForAtStartText = (colour) =>
    waitFor(
      c,
      () => c.evaluate(`customThemes.some((t) => t.name === "AtStart" && t.text.includes(${JSON.stringify(colour)}))`),
      { timeout: 20 * 1000 },
    );

  test("without a Dark.theme of its own, a custom theme inherits Light and Reload from disk applies an edit", async () => {
    writeTheme("AtStart", theme("light", RED));
    await startIde();
    const menu = await themeMenu();
    assert.ok(menu.includes("AtStart (Light)"), `AtStart is not listed as AtStart (Light): ${JSON.stringify(menu)}`);
    assert.ok(menu.includes("Classic (Light)"), `Classic is not listed as Classic (Light): ${JSON.stringify(menu)}`);
    await chooseTheme("AtStart");
    let s = await themeState();
    assert.equal(s.darkMode, false, `AtStart did not give the light base: ${JSON.stringify(s)}`);
    assert.equal(s.menu, RED, `AtStart's menu colour is not applied: ${JSON.stringify(s)}`);
    writeTheme("AtStart", theme("light", GREEN));
    await chooseTheme("Reload from disk");
    assert.ok(await waitForAtStartText(GREEN), "Reload from disk did not read AtStart.theme again");
    s = await themeState();
    for (let i = 0; i < 25 && s.menu !== GREEN; i++) {
      await sleep(200);
      s = await themeState();
    }
    assert.equal(s.menu, GREEN, `Reload from disk did not apply the edit: ${JSON.stringify(s)}`);
  });

  test("two themes that inherit each other freeze the page, and choosing one fails with a stack overflow", async (t) => {
    if (!lane.run) await startIde();
    writeTheme("LoopA", theme("LoopB", LOOP_A));
    writeTheme("LoopB", theme("LoopA", "rgb(2, 2, 2)"));
    await c.evaluate(`window.__maxGap = 0; window.__errors.length = 0`);
    await chooseTheme("Reload from disk");
    const read = await waitFor(
      c,
      () => c.evaluate(`customThemes.length === customThemesCount && customThemes.some((t) => t.name === "LoopB")`),
      { timeout: 60 * 1000, interval: 500 },
    );
    assert.ok(read, "Reload from disk never read LoopA.theme and LoopB.theme");
    await sleep(500);
    const gap = Math.round(await c.evaluate("window.__maxGap"));
    t.diagnostic(`the page did not run for ${gap} ms`);
    assert.ok(gap >= 2000, `the page never stopped for 2 s: its longest pause was ${gap} ms`);
    const menu = await themeMenu();
    assert.ok(menu.includes("LoopB (undefined)"), `LoopB is not listed as LoopB (undefined): ${JSON.stringify(menu)}`);
    const loopA = menu.find((m) => m.replace("[x] ", "").startsWith("LoopA ("));
    assert.ok(loopA, `LoopA is not listed: ${JSON.stringify(menu)}`);
    await c.evaluate(`window.__errors.length = 0`);
    await chooseTheme("LoopA");
    const s = await themeState();
    t.diagnostic(`after choosing LoopA: ${JSON.stringify(s)}`);
    assert.equal(s.colorTheme, "LoopA", `choosing LoopA did not select it: ${JSON.stringify(s)}`);
    assert.notEqual(s.menu, LOOP_A, `LoopA's menu colour was applied: ${JSON.stringify(s)}`);
    assert.ok(
      s.errors.some((e) => /Maximum call stack size exceeded/.test(e)),
      `choosing LoopA raised no stack overflow: ${JSON.stringify(s.errors)}`,
    );
  });

  test("a Dark.theme in the APPDATA themes folder unlinks every custom theme, and Reload from disk stops applying", async (t) => {
    rmSync(path.join(common, "LoopA.theme"), { force: true });
    rmSync(path.join(common, "LoopB.theme"), { force: true });
    writeTheme("AtStart", theme("light", RED));
    writeTheme("Dark", theme("light", "rgb(13, 14, 15)"));
    await startIde();
    const menu = await themeMenu();
    t.diagnostic(`the theme list: ${JSON.stringify(menu)}`);
    assert.ok(
      menu.includes("AtStart (undefined)"),
      `AtStart is not listed as AtStart (undefined): ${JSON.stringify(menu)}`,
    );
    assert.ok(
      menu.includes("Classic (undefined)"),
      `Classic is not listed as Classic (undefined): ${JSON.stringify(menu)}`,
    );
    await chooseTheme("AtStart");
    let s = await themeState();
    assert.equal(s.darkMode, true, `AtStart, which inherits light, did not give the dark base: ${JSON.stringify(s)}`);
    assert.equal(s.menu, RED, `AtStart's own menu colour is not applied: ${JSON.stringify(s)}`);
    assert.equal(
      s.loaded,
      s.expected - 1,
      `the page did not count one theme more than it loaded: ${JSON.stringify(s)}`,
    );
    writeTheme("AtStart", theme("light", GREEN));
    await chooseTheme("Reload from disk");
    assert.ok(await waitForAtStartText(GREEN), "Reload from disk did not read AtStart.theme again");
    await sleep(2000);
    s = await themeState();
    assert.equal(s.menu, RED, `Reload from disk applied the edit: ${JSON.stringify(s)}`);
  });

  test("a group named A|B switches B on with it, and toggling B twice switches both off", async (t) => {
    if (!lane.run) await startIde();
    // The user's own groups, which the IDE read from the registry, are set aside in the page.
    await c.evaluate(
      `customKeyboardShortcutGroups = {}; activeKeyboardShortcutGroupNames = ""; syncActiveKeyboardShortcuts()`,
    );

    // Manage Keyboard Shortcuts, Add New..., the name, Enter, Save Changes.
    async function addGroup(name) {
      await c.evaluate(`executeIdeCommand("tbKeyboardShortcuts_ShowManageKeyboardShortcuts")`);
      await sleep(800);
      assert.deepEqual(
        await modalTitles(),
        ["Manage Keyboard Shortcuts"],
        "the Manage Keyboard Shortcuts dialog did not open",
      );
      await clickModalButton("Add New...");
      const box = await c.evaluate(`(() => {
        const i = document.querySelector(".configEditorEntryNew");
        if (!i) return null;
        i.focus();
        return document.activeElement === i;
      })()`);
      assert.ok(box, "Add New... showed no name box");
      await typeText(c, name);
      await pressKey(c, "Enter");
      await sleep(500);
      await clickModalButton("Save Changes");
      assert.deepEqual(await modalTitles(), [], "Save Changes did not close the dialog");
    }

    const keyState = () =>
      c.evaluate(`({
        groups: Object.keys(customKeyboardShortcutGroups),
        active: activeKeyboardShortcutGroupNames,
        ticked: getCustomKeyboardShortcutMenuOptions().filter((o) => o.name).map((o) => (o.codicon === "check" ? "[x] " : "") + o.name.replace(/^.* \\d+\\. /, "")),
      })`);

    await addGroup("A|B");
    await addGroup("B");
    let s = await keyState();
    t.diagnostic(`both added: ${JSON.stringify(s)}`);
    assert.deepEqual(s.groups, ["A|B", "B"], `the groups are not A|B and B: ${JSON.stringify(s)}`);
    assert.equal(s.active, "|A|B||B|", `both groups are not on: ${JSON.stringify(s)}`);
    assert.deepEqual(s.ticked, ["[x] A|B", "[x] B"], `both groups are not ticked: ${JSON.stringify(s)}`);

    // B is the second custom group: Window > Keyboard Shortcuts > Custom 2. B runs this command.
    await c.evaluate(`executeIdeCommand("tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom2")`);
    await sleep(500);
    s = await keyState();
    t.diagnostic(`B clicked once: ${JSON.stringify(s)}`);
    assert.equal(s.active, "|A|B|", `the first click on B did not leave |A|B|: ${JSON.stringify(s)}`);
    assert.deepEqual(
      s.ticked,
      ["[x] A|B", "[x] B"],
      `B is not still ticked after the first click: ${JSON.stringify(s)}`,
    );

    await c.evaluate(`executeIdeCommand("tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom2")`);
    await sleep(500);
    s = await keyState();
    t.diagnostic(`B clicked twice: ${JSON.stringify(s)}`);
    assert.equal(s.active, "|A", `the second click on B did not leave |A: ${JSON.stringify(s)}`);
    assert.deepEqual(s.ticked, ["A|B", "B"], `A|B and B are not both off: ${JSON.stringify(s)}`);
  });
});
