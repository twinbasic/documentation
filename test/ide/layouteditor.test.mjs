// The help add-in's panel layout editor, add-in/Resources/SCRIPTS/layouteditor.js, in the IDE's
// own Manage Panel Layouts dialog: a picture of the selected layout in place of its JSON, which
// writes each change into the IDE's text area. WIP.HelpAddin.md, Stage 4 item 14.
//
// The script is put into the page as the add-in puts it, with its marker filled in, but without
// the add-in, as keyeditor.test.mjs does: the help lane (test/addin/help.test.mjs) builds the add-in
// and checks that its settings box puts the script in and takes it out. The layouts are set in the
// page, never saved: every IDE the harness starts has --no-save-ide-settings, so Save Changes
// changes the page's copy only.
//
// No project is opened: the IDE starts as from its icon, and the New / Open dialog is cancelled.
// The page's ChangeWindowSetting and RemoveRecentsList, which the flags do not guard, do nothing.
// Nothing reaches SaveSetting, so lanes.mjs names no settings. LAYOUT_SHOT=<folder> saves a
// picture of the dialog there after the cases that change what it shows.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { pressKey, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

const SCRIPTS = path.join(REPO_ROOT, "add-in", "Resources", "SCRIPTS");
const COMMANDS = path.join(REPO_ROOT, "add-in", "Resources", "KEYS", "commands.json");

// A script as ApplyFix in HelpAddIn.twin makes it, run as the body of a function, as the inline
// handler PageScript wraps it in runs it.
function script(file, on) {
  const js = readFileSync(path.join(SCRIPTS, file), "utf8")
    .replace("$ON$", on ? "true" : "false")
    .replace("$COMMANDS$", () => readFileSync(COMMANDS, "utf8").trim());
  return `(function () {\n${js}\n})()`;
}
const editorScript = (on) => script("layouteditor.js", on);

// layouts.js as BuildPane puts it in, with the add-in's state in its marker, run with `this` an
// image inside a sink of the test's own: a hidden element whose tbDocsLayout, which the add-in's
// listener would be, keeps each message in window.__layoutMsgs.
const HELP = "ADDIN_tbDocsHelpPane";
function layoutsScript(state) {
  const js = readFileSync(path.join(SCRIPTS, "layouts.js"), "utf8").replace("$STATE$", () => JSON.stringify(state));
  return `(() => {
    let sink = document.getElementById("__layoutsSink");
    if (!sink) {
      sink = document.createElement("div");
      sink.id = "__layoutsSink";
      sink.style.display = "none";
      document.body.appendChild(sink);
      window.__layoutMsgs = [];
      sink.tbDocsLayout = (m) => window.__layoutMsgs.push({ verb: m.verb, layout: m.layout, value: m.value });
    }
    const img = document.createElement("img");
    sink.appendChild(img);
    (function () {\n${js}\n}).call(img);
  })()`;
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

// The layouts the dialog lists after the two built-in ones: Mine, <DEFAULT> with Watches floating;
// No Editor, a toolbar and a toolbox; Elsewhere, <DEFAULT> with a window of an add-in that is not
// loaded; Broken, text that is not JSON.
const DEFAULT_JS = `JSON.parse(builtInPanelLayouts["<DEFAULT>"].layoutData)`;
const LAYOUTS_JS = `(() => {
  const d = ${DEFAULT_JS};
  customPanelLayouts = {
    Mine: { layoutData: JSON.stringify(d), floatingData: JSON.stringify([{ id: "WATCHES", left: 900, top: 120, width: 300, height: 400 }]) },
    "No Editor": {
      layoutData: JSON.stringify({ type: "horizontal", variableSize: true, size: "0%", content: [
        { id: "TOOLBAR", variableSize: false, size: "fit-content" },
        { id: "TOOLBOX", variableSize: true, size: "0%" },
      ] }),
      floatingData: "[]",
    },
    Elsewhere: { layoutData: JSON.stringify(d), floatingData: JSON.stringify([{ id: "ADDIN_NoSuchTool", left: 200, top: 300, width: 320, height: 240 }]) },
    Broken: { layoutData: "{not json", floatingData: "[]" },
    Helped: {
      layoutData: JSON.stringify({ type: "vertical", variableSize: true, size: "0%", content: [
        Object.assign(d, { variableSize: true, size: "0%" }),
        { id: "${HELP}", variableSize: false, size: "25%" },
      ] }),
      floatingData: "[]",
    },
  };
  return true;
})()`;

// What the dialog shows.
const STATE_JS = `(() => {
  const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
  if (!m) return null;
  const area = m.querySelector("textarea.genericMonospaceTextArea");
  const shown = (e) => !!e && e.getBoundingClientRect().height > 0;
  const pic = m.querySelector(".tbLePic");
  return {
    title: (m.querySelector(".modalTitleBar")?.innerText || "").trim(),
    selected: (m.querySelector(".configEditorEntrySelected .configEditorEntryText")?.childNodes[0]?.textContent || "").trim(),
    picture: shown(m.querySelector(".tbLeTop")),
    area: shown(area),
    text: area ? area.value : null,
    banner: shown(m.querySelector(".tbLeBanner")),
    tiles: [...m.querySelectorAll(".tbLeDock .tbLeTile .tbLeNm")].map((e) => e.textContent),
    floats: [...m.querySelectorAll(".tbLeFloat .tbLeFt")].map((e) => e.textContent),
    chips: [...m.querySelectorAll(".tbLeChip")].map((e) => [e.textContent, e.disabled]),
    current: !!m.querySelector('[data-act="current"]'),
    head: (m.querySelector(".tbLeHead")?.textContent || "").trim(),
    status: (m.querySelector(".tbLeStatus")?.textContent || "").trim(),
    marks: [...m.querySelectorAll(".configEditorEntry")].map((e) => [e.querySelector(".configEditorEntryText")?.childNodes[0]?.textContent.trim(), e.querySelector(".tbLeMark")?.title || ""]),
    saveDisabled: document.getElementById("SAVEBTN")?.classList.contains("disabled") ?? null,
    ratio: pic ? pic.getBoundingClientRect().width / pic.getBoundingClientRect().height : null,
  };
})()`;

scenario("the panel layout editor", (lane) => {
  let c = null;
  const state = () => c.evaluate(STATE_JS);
  const parsedText = async () => JSON.parse((await state()).text);
  let shots = 0;
  async function shot(name) {
    const dir = process.env.LAYOUT_SHOT;
    if (!dir) return;
    mkdirSync(dir, { recursive: true });
    const { data } = await c.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(dir, `${String(++shots).padStart(2, "0")}-${name}.png`), Buffer.from(data, "base64"));
  }
  // Clicks the first element `css` finds in the dialog, by its click(), or at a place in it given
  // as fractions of its width and height.
  async function clickIn(css, at = null) {
    const ok = await c.evaluate(`(() => {
      const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
      const e = m && m.querySelector(${JSON.stringify(css)});
      if (!e) return false;
      const at = ${JSON.stringify(at)};
      if (!at) { e.click(); return true; }
      const r = e.getBoundingClientRect();
      e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: r.left + r.width * at[0], clientY: r.top + r.height * at[1] }));
      return true;
    })()`);
    assert.ok(ok, `nothing in the dialog matches ${css}`);
    await sleep(100);
  }
  // A tile of the picture by the panel's id.
  const tile = (id) => `.tbLeDock .tbLeTile[title="${id}"]`;
  async function setValue(css, value) {
    const ok = await c.evaluate(`(() => {
      const e = document.querySelector(${JSON.stringify(css)});
      if (!e) return false;
      e.value = ${JSON.stringify(String(value))};
      e.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    assert.ok(ok, `nothing matches ${css}`);
    await sleep(100);
  }
  async function selectLayout(name) {
    const ok = await c.evaluate(`(() => {
      const e = [...document.querySelectorAll(".configEditorEntry")].find((e) => e.innerText.trim().startsWith(${JSON.stringify(name)}));
      if (!e) return false;
      e.click();
      return true;
    })()`);
    assert.ok(ok, `the dialog lists no layout ${name}`);
    await sleep(200);
  }
  async function openDialog() {
    await c.evaluate("showManagePanelLayouts()");
    assert.ok(
      await waitFor(c, async () => (await state())?.title === "Manage Panel Layouts"),
      "the dialog did not open",
    );
    await sleep(200);
  }
  async function cancelDialog() {
    await c.evaluate(`(() => {
      const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
      const b = m && [...m.querySelectorAll("button, .dialogButton, [class*=Button]")].find((e) => e.textContent.trim() === "Cancel");
      if (b) b.click(); else if (modalDialogs.length) hideModalDialog();
    })()`);
    assert.ok(await waitFor(c, () => c.evaluate("modalDialogs.length === 0")), "the dialog did not close");
  }
  // Drags with the mouse from the middle of `css` by dx, dy CSS pixels.
  async function drag(css, dx, dy) {
    const r = await c.evaluate(`(() => {
      const e = document.querySelector(${JSON.stringify(css)});
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    assert.ok(r, `nothing matches ${css}`);
    const mouse = (type, x, y, buttons) =>
      c.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: "left",
        buttons,
        clickCount: type === "mouseMoved" ? 0 : 1,
      });
    await mouse("mouseMoved", r.x, r.y, 0);
    await mouse("mousePressed", r.x, r.y, 1);
    for (let i = 1; i <= 5; i++) await mouse("mouseMoved", r.x + (dx * i) / 5, r.y + (dy * i) / 5, 1);
    await mouse("mouseReleased", r.x + dx, r.y + dy, 0);
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
    await c.evaluate(LAYOUTS_JS);
    await c.evaluate(editorScript(true));
    assert.equal(
      await c.evaluate("typeof window.tbDocsLayoutEditor"),
      "object",
      "the script did not put the editor in",
    );
  });

  test("a built-in layout opens as a read-only picture at the IDE window's proportions", async () => {
    await openDialog();
    try {
      const s = await state();
      assert.equal(s.selected, "<DEFAULT> (built-in)");
      assert.deepEqual([s.picture, s.area], [true, false], "the picture does not show in place of the text");
      assert.equal(s.banner, true, "no read-only note");
      assert.deepEqual(s.tiles, [
        "Toolbar",
        "Toolbox",
        "Editor",
        "Debug Console",
        "Diagnostics",
        "Call Stack",
        "Variables",
        "Project Explorer",
        "Properties",
      ]);
      assert.ok(
        s.chips.length > 0 && s.chips.every(([, disabled]) => disabled),
        "a built-in layout offers a panel to add",
      );
      assert.equal(s.current, false, "a built-in layout offers the current arrangement");
      assert.match(s.status, /^A built-in layout: read-only\. 9 panels docked, 0 floating, 9 not in this layout\.$/);
      const body = await c.evaluate("document.body.clientWidth / document.body.clientHeight");
      assert.ok(Math.abs(s.ratio - body) < 0.02, `the picture is ${s.ratio}, the IDE window ${body}`);
      // A tile shows its edit box, with nothing to change.
      await clickIn(tile("TOOLBOX"));
      const t = await state();
      assert.match(t.head, /^Toolbox TOOLBOX/);
      assert.equal(
        await c.evaluate(`document.querySelector('[data-act="float"]')`),
        null,
        "a built-in layout can float a panel",
      );
      // JSON shows the IDE's text area, and Picture the picture again.
      await clickIn(`.tbLeFoot [data-view="json"]`);
      let v = await state();
      assert.deepEqual([v.picture, v.area], [false, true], "JSON did not show the text area");
      await clickIn(`.tbLeFoot [data-view="picture"]`);
      v = await state();
      assert.deepEqual([v.picture, v.area], [true, false], "Picture did not show the picture");
      assert.equal(v.saveDisabled, true, "looking at a built-in layout enabled Save Changes");
      await shot("default");
    } finally {
      await cancelDialog();
    }
  });

  test("a panel's size, its place, floating and docked again are written into the layout's text", async () => {
    await openDialog();
    try {
      await selectLayout("Mine");
      let s = await state();
      assert.deepEqual(s.floats, ["Watches"]);
      assert.equal(s.current, true);
      assert.equal(s.saveDisabled, true);
      // The Toolbox's share, then Takes the rest.
      await clickIn(tile("TOOLBOX"));
      assert.equal(await c.evaluate(`document.querySelector('[data-act="pct"]').value`), "13");
      await setValue('[data-act="pct"]', 20);
      let t = await parsedText();
      const toolbox = t.docked.content[1].content[0].content[0].content[0];
      assert.deepEqual(toolbox, { id: "TOOLBOX", variableSize: false, size: "20.0000%" });
      assert.equal((await state()).saveDisabled, false, "the change did not enable Save Changes");
      await clickIn('[data-act="size"][data-v="rest"]');
      t = await parsedText();
      assert.deepEqual(t.docked.content[1].content[0].content[0].content[0], {
        id: "TOOLBOX",
        variableSize: true,
        size: "0%",
      });
      // Move right: the Editor comes first.
      await clickIn('[data-act="move"][data-d="1"]');
      t = await parsedText();
      assert.deepEqual(
        t.docked.content[1].content[0].content[0].content.map((n) => n.id),
        ["EDITOR", "TOOLBOX"],
      );
      // Make it float: out of its group, which the Editor alone replaces, and floating where the
      // IDE floats a panel it shows.
      await clickIn('[data-act="float"]');
      t = await parsedText();
      assert.deepEqual(t.docked.content[1].content[0].content[0], {
        id: "EDITOR",
        variableSize: false,
        size: "73.8657%",
      });
      assert.deepEqual(t.floating.at(-1), { id: "TOOLBOX", left: 100, top: 100, width: 300, height: 500 });
      s = await state();
      assert.match(s.head, /^Toolbox TOOLBOX floating/);
      // Its place, then docked again at the right of the Editor.
      await setValue('[data-act="floatnum"][data-k="left"]', 640);
      assert.equal((await parsedText()).floating.at(-1).left, 640);
      await clickIn('[data-act="dockfloat"]');
      await clickIn(tile("EDITOR"), [0.95, 0.5]);
      t = await parsedText();
      assert.deepEqual(
        t.floating.map((f) => f.id),
        ["WATCHES"],
      );
      const g = t.docked.content[1].content[0].content[0];
      assert.equal(g.type, "vertical", "the Editor and the Toolbox are not side by side");
      assert.deepEqual(
        g.content.map((n) => n.id),
        ["EDITOR", "TOOLBOX"],
      );
      assert.deepEqual([g.variableSize, g.size], [false, "73.8657%"], "the new group did not take the Editor's size");
      await shot("docked-again");
    } finally {
      await cancelDialog();
    }
  });

  test("a panel the layout lacks is docked at the edge of a tile, and a group's direction changes", async () => {
    await openDialog();
    try {
      await selectLayout("Mine");
      // Outline below Properties: the right column is one above another, so it joins it.
      await clickIn('.tbLeChip[data-id="OUTLINE"]');
      await clickIn(tile("PROPERTIES"), [0.5, 0.95]);
      let t = await parsedText();
      const column = t.docked.content[1].content[1];
      assert.deepEqual(
        column.content.map((n) => n.id),
        ["PROJECT EXPLORER", "PROPERTIES", "OUTLINE"],
      );
      assert.ok(!(await state()).chips.some(([name]) => name === "Outline"), "Outline is still offered");
      // The column's members side by side.
      await clickIn('.tbLeDock [data-key="1,1"]');
      assert.match((await state()).head, /^A group of 3 horizontal/);
      await clickIn('[data-act="dir"][data-v="vertical"]');
      t = await parsedText();
      assert.equal(t.docked.content[1].content[1].type, "vertical");
      // Remove takes the panel out, and it is offered again.
      await clickIn(tile("OUTLINE"));
      await clickIn('[data-act="remove"]');
      t = await parsedText();
      assert.deepEqual(
        t.docked.content[1].content[1].content.map((n) => n.id),
        ["PROJECT EXPLORER", "PROPERTIES"],
      );
      assert.ok(
        (await state()).chips.some(([name]) => name === "Outline"),
        "Outline is not offered again",
      );
      // Esc ends a selection, and the dialog stays open.
      await clickIn(tile("PROPERTIES"));
      await c.evaluate(`document.querySelector(${JSON.stringify(tile("PROPERTIES"))}).focus()`);
      await pressKey(c, "Escape");
      await sleep(150);
      const s = await state();
      assert.equal(s?.title, "Manage Panel Layouts", "Esc closed the dialog");
      assert.equal(s.head, "Nothing selected");
    } finally {
      await cancelDialog();
    }
  });

  test("a splitter and a floating panel's title are dragged", async () => {
    await openDialog();
    try {
      await selectLayout("Mine");
      // The splitter after the Toolbox, 13% of its group's width.
      const split = '.tbLeSplit[data-split="1,0,0"][data-i="0"]';
      const width = await c.evaluate(
        `document.querySelector(${JSON.stringify(split)}).parentElement.getBoundingClientRect().width`,
      );
      await drag(split, width * 0.2, 0);
      let t = await parsedText();
      const size = parseFloat(t.docked.content[1].content[0].content[0].content[0].size);
      assert.ok(size > 28 && size < 38, `the Toolbox's share after the drag: ${size}`);
      // Watches by its title.
      const k = await c.evaluate(`document.querySelector(".tbLePic").clientWidth / document.body.clientWidth`);
      await drag(".tbLeFloat .tbLeFt", -100 * k, 50 * k);
      t = await parsedText();
      const w = t.floating[0];
      assert.ok(
        Math.abs(w.left - 800) <= 3 && Math.abs(w.top - 170) <= 3,
        `Watches after the drag: ${w.left}, ${w.top}`,
      );
      await shot("dragged");
    } finally {
      await cancelDialog();
    }
  });

  test("a layout without the Editor is a problem, an add-in that is not loaded is not, and text that is not JSON shows as text", async () => {
    await openDialog();
    try {
      await selectLayout("No Editor");
      let s = await state();
      assert.match(s.status, /1 problem: It has no Editor\.$/);
      const marks = Object.fromEntries(s.marks);
      assert.equal(marks["No Editor"], "it has no Editor");
      assert.equal(marks.Mine, "");
      assert.match(marks.Broken, /not valid JSON/);
      await selectLayout("Elsewhere");
      s = await state();
      assert.deepEqual(s.floats, ["NoSuchTool"]);
      assert.doesNotMatch(s.status, /problem/);
      await clickIn(".tbLeFloat");
      assert.match(
        await c.evaluate(`document.querySelector(".tbLeInsp .tbLeNote").textContent`),
        /No loaded add-in has this window/,
      );
      await shot("addin");
      await selectLayout("Broken");
      s = await state();
      assert.deepEqual([s.picture, s.area], [false, true], "the broken layout is not shown as text");
      assert.match(s.status, /not valid JSON/);
    } finally {
      await cancelDialog();
    }
  });

  test("Use the current arrangement, and Save Changes keeps what the editor wrote", async () => {
    await openDialog();
    await selectLayout("No Editor");
    await clickIn('[data-act="current"]');
    const now = await c.evaluate(`JSON.stringify(getPanelsConfiguration().docked[0])`);
    const t = await parsedText();
    assert.equal(JSON.stringify(t.docked), now, "the layout is not the current arrangement");
    assert.doesNotMatch((await state()).status, /problem/);
    await c.evaluate(`(() => {
      const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
      [...m.querySelectorAll("button, .dialogButton, [class*=Button]")].find((e) => e.textContent.trim() === "Save Changes").click();
    })()`);
    assert.ok(await waitFor(c, () => c.evaluate("modalDialogs.length === 0")), "Save Changes did not close the dialog");
    assert.equal(await c.evaluate(`customPanelLayouts["No Editor"].layoutData`), now);
  });

  // ---- the help add-in's own window, kept for each layout (layouts.js) ----

  const messages = () => c.evaluate("window.__layoutMsgs.splice(0)");
  // What the page is told where the help is now: its window at 300, 120 of the page, 420 by
  // 500, the add-in's pixels given as 96 to the inch, as the page's CSS pixels are.
  const NOW = `({ left: window.screenX + 300, top: window.screenY + 120, width: 420, height: 500 })`;
  async function putLayoutsIn(records = {}) {
    const now = await c.evaluate(NOW);
    await c.evaluate(layoutsScript({ pane: HELP, dpi: 96, now: { detached: true, ...now }, records }));
    await sleep(50);
    await messages();
    return now;
  }
  const helpBox = () =>
    c.evaluate(`(() => {
      const b = document.querySelector(".tbLeInsp .tbLeAddin");
      if (!b) return null;
      return {
        pressed: [...b.querySelectorAll('[data-act="helpwhere"]')].filter((e) => e.getAttribute("aria-pressed") === "true").map((e) => e.textContent),
        place: Object.fromEntries([...b.querySelectorAll('[data-act="helpnum"]')].map((e) => [e.getAttribute("data-k"), Number(e.value)])),
        text: b.textContent,
      };
    })()`);

  test("layouts.js tells the add-in which layout was saved or applied, by its name encoded, after the IDE has", async () => {
    await putLayoutsIn();
    assert.deepEqual(
      await c.evaluate(
        "[typeof setActivePanelLayoutName.tbDocsOriginal, typeof saveCurrentPanelLayoutAs.tbDocsOriginal]",
      ),
      ["function", "function"],
      "the IDE's functions are not wrapped",
    );
    try {
      await c.evaluate(`saveCurrentPanelLayoutAs("A\\\\B (x)")`);
      await sleep(50);
      assert.equal(await c.evaluate(`activePanelLayoutName`), "A\\B (x)");
      await c.evaluate(`setActivePanelLayoutName("<DEFAULT>")`);
      await sleep(50);
      assert.equal(await c.evaluate(`activePanelLayoutName`), "<DEFAULT>");
      assert.deepEqual(await messages(), [
        { verb: "saved", layout: "A%5CB%20%28x%29", value: "" },
        { verb: "applied", layout: "%3CDEFAULT%3E", value: "" },
      ]);
      // Run again, the script wraps the IDE's functions, not its own, and sends each message once.
      await putLayoutsIn();
      assert.equal(await c.evaluate("setActivePanelLayoutName.tbDocsOriginal.tbDocsOriginal"), undefined);
      await c.evaluate(`setActivePanelLayoutName("<DEFAULT>")`);
      await sleep(50);
      assert.deepEqual(await messages(), [{ verb: "applied", layout: "%3CDEFAULT%3E", value: "" }]);
    } finally {
      await c.evaluate(`delete customPanelLayouts["A\\\\B (x)"]`);
    }
  });

  test("the help's panel has the With the Help Add-In box; In its own window is kept at Save Changes, with the layouts kept", async () => {
    const now = await putLayoutsIn();
    await openDialog();
    let saved = false;
    try {
      assert.deepEqual(
        await messages(),
        [{ verb: "ask", layout: "", value: "" }],
        "the dialog did not ask where the help is",
      );
      await selectLayout("Helped");
      assert.equal(
        await c.evaluate(`document.querySelector(".tbLeOwn")`),
        null,
        "a layout with no record draws the window",
      );
      await clickIn(tile(HELP));
      let b = await helpBox();
      assert.ok(b, "the help's panel has no box");
      assert.deepEqual(b.pressed, []);
      assert.match(b.text, /Not chosen for this layout: applying it leaves the help where it is\./);
      await clickIn('[data-act="helpwhere"][data-v="own"]');
      b = await helpBox();
      assert.deepEqual(b.pressed, ["In its own window"]);
      assert.deepEqual(b.place, now, "the window's place is not where it is now");
      assert.equal((await state()).saveDisabled, false, "the choice did not enable Save Changes");
      assert.match(
        await c.evaluate(`document.querySelector(${JSON.stringify(tile(HELP))}).textContent`),
        /in its own window/,
      );
      // The window, drawn where it is on the picture's scale.
      const drawn = await c.evaluate(`(() => {
        const w = document.querySelector(".tbLeOwn"), p = document.querySelector(".tbLePic");
        if (!w) return null;
        const k = p.clientWidth / document.body.clientWidth;
        return { left: w.offsetLeft / k, top: w.offsetTop / k, width: w.offsetWidth / k, text: w.textContent };
      })()`);
      assert.ok(drawn, "the window is not drawn");
      assert.ok(
        Math.abs(drawn.left - 300) < 3 && Math.abs(drawn.top - 120) < 3 && Math.abs(drawn.width - 420) < 3,
        JSON.stringify(drawn),
      );
      assert.match(drawn.text, /^Help: its own window420 × 500at /);
      // Its place, changed in the box.
      await setValue('[data-act="helpnum"][data-k="left"]', now.left + 40);
      assert.equal((await helpBox()).place.left, now.left + 40);
      await shot("help-box");
      await c.evaluate(`(() => {
        const m = [...document.querySelectorAll(".modalDialogContainer")].pop();
        [...m.querySelectorAll("button, .dialogButton, [class*=Button]")].find((e) => e.textContent.trim() === "Save Changes").click();
      })()`);
      saved = await waitFor(c, () => c.evaluate("modalDialogs.length === 0"));
      assert.ok(saved, "Save Changes did not close the dialog");
      await sleep(50);
      // The records first, then the layout the IDE applies again.
      const sent = await messages();
      assert.deepEqual(
        sent.map((m) => m.verb),
        ["records", "applied"],
      );
      assert.deepEqual(sent[0].value.split("\n"), [
        "keep Mine No%20Editor Elsewhere Broken Helped",
        `set Helped 1 ${now.left + 40} ${now.top} 420 500`,
      ]);
    } finally {
      if (!saved) await cancelDialog();
    }
  });

  test("In this panel, for a layout whose help is in its own window, floats the pane where the window was, inside the IDE window", async () => {
    const page = await c.evaluate(`({ x: window.screenX, y: window.screenY, w: document.body.clientWidth })`);
    const own = { detached: true, left: page.x + 200, top: page.y + 150, width: 420, height: 500 };
    await putLayoutsIn({ Helped: own });
    await openDialog();
    try {
      await selectLayout("Helped");
      // A click on the window selects the help's tile.
      await clickIn(".tbLeOwn");
      assert.match((await state()).head, new RegExp(`^${HELP.replace("ADDIN_", "")} ${HELP}`));
      assert.deepEqual((await helpBox()).pressed, ["In its own window"]);
      await clickIn('[data-act="helpwhere"][data-v="panel"]');
      let t = await parsedText();
      assert.equal(JSON.stringify(t.docked).includes(HELP), false, "the pane is still docked");
      assert.deepEqual(t.floating.at(-1), { id: HELP, left: 200, top: 150, width: 420, height: 500 });
      assert.deepEqual((await helpBox()).pressed, ["In this panel"]);
      assert.equal(await c.evaluate(`document.querySelector(".tbLeOwn")`), null, "the window is still drawn");
      await messages();
    } finally {
      await cancelDialog();
    }
    // Cancel keeps nothing; a window off to the right floats the pane at the IDE window's edge.
    await sleep(50);
    assert.deepEqual(await messages(), []);
    await putLayoutsIn({ Helped: { ...own, left: page.x + 5000 } });
    await openDialog();
    try {
      await selectLayout("Helped");
      await clickIn(tile(HELP));
      await clickIn('[data-act="helpwhere"][data-v="panel"]');
      assert.deepEqual((await parsedText()).floating.at(-1), {
        id: HELP,
        left: page.w - 420,
        top: 150,
        width: 420,
        height: 500,
      });
      await shot("help-panel");
    } finally {
      await cancelDialog();
      await c.evaluate("window.tbDocsHelpLayouts.off(); window.tbDocsHelpLayouts = null;");
    }
  });

  test("the keyboard shortcut editor shares the hook; run again, nothing stacks; turned off, the text area comes back", async () => {
    await c.evaluate(script("keyeditor.js", true));
    await c.evaluate(editorScript(true));
    assert.equal(
      await c.evaluate("showConfigEditor.tbDocsOriginal === window.__ideShowConfigEditor"),
      true,
      "a script wrapped another's function",
    );
    assert.deepEqual(await c.evaluate("Object.keys(window.tbDocsConfigEditors.adapters).sort()"), [
      "Manage Keyboard Shortcuts",
      "Manage Panel Layouts",
    ]);
    // The keyboard editor off leaves this one in.
    await c.evaluate(script("keyeditor.js", false));
    await openDialog();
    try {
      assert.equal((await state()).picture, true, "the keyboard editor took the layout editor out");
      await c.evaluate(editorScript(false));
      const s = await state();
      assert.deepEqual([s.picture, s.area], [false, true], `the dialog was not given back: ${JSON.stringify(s)}`);
      assert.equal(await c.evaluate("showConfigEditor === window.__ideShowConfigEditor"), true);
      assert.equal(await c.evaluate("window.tbDocsLayoutEditor"), null);
      assert.equal(await c.evaluate("window.tbDocsConfigEditors"), null);
    } finally {
      await cancelDialog();
    }
    await openDialog();
    try {
      const s = await state();
      assert.deepEqual([s.picture, s.area], [false, true], "the IDE's own dialog did not open");
    } finally {
      await cancelDialog();
    }
    assert.deepEqual(await c.evaluate("window.__errors"), [], "the page had uncaught errors");
  });
});
