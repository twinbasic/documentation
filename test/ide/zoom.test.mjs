// The zoom of the whole IDE, tested for what docs/IDE/Customising/index.md (the Zoom section) and
// IDE-Options.md (IDE Font Size) say: Ctrl+Alt++ and Ctrl+Alt+- run tbIde_IncreaseFontSize and
// tbIde_DecreaseFontSize, which change the IDE Options value fontSize by 1px and save the options
// at once. The IDE sets the size as the page's --ide-fontsize, and the size divided by 13 as
// --generalScaling, which sizes the toolbar's icons (main.htm's 19 elements of class "icon"). The
// codicon glyphs and the page's scroll bars keep their 16px; the scroll bar is reported, not
// asserted. There is no upper limit, the lower one is 8px, and no key resets the size.
//
// No project is opened: the IDE starts as from its icon, and the New / Open dialog is cancelled.
// The page's saveIDEOptions is wrapped to count its calls. It writes nothing: every IDE the
// harness starts has --no-save-ide-settings (IDE_FLAGS in scripts/lib/tb-ide.mjs), and the page
// is answered "no saved value" for its options, so the IDE starts at the default, 13px. Nothing
// here reaches SaveSetting, so lanes.mjs names no settings for this lane.
//
// The keys go in through DevTools, which reaches the page's own key handling, where these
// commands are. Ctrl with the mouse wheel, which the page does not handle, cannot be tested this
// way, so nothing here asserts it.
//
// Each test states what BETA 1034 does. If one fails after an IDE update, the IDE has changed:
// update the Zoom section of docs/IDE/Customising/index.md and IDE Font Size in IDE-Options.md,
// and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { before, test } from "node:test";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { clickAt, pressKey, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "../addin/scenario.mjs";

// The size as the options hold it and as the page applies it, the scaling the page derives from
// it, an icon's size (an element of the IDE's class "icon", sized 16px times --generalScaling; the
// codicon glyphs are a fixed 16px), a scroll bar's width, and the saves.
const STATE_JS = `(() => {
  const root = getComputedStyle(document.documentElement);
  const icon = [...document.querySelectorAll(".icon")].find((e) => e.getBoundingClientRect().height);
  let probe = document.getElementById("__zoomScrollProbe");
  if (!probe) {
    probe = document.createElement("div");
    probe.id = "__zoomScrollProbe";
    probe.style.cssText = "position:absolute;left:-1000px;top:0;width:100px;height:100px;overflow:scroll";
    document.body.appendChild(probe);
  }
  return {
    option: liveIDEOptions.fontSize,
    variable: root.getPropertyValue("--ide-fontsize").trim(),
    scaling: root.getPropertyValue("--generalScaling").trim(),
    body: getComputedStyle(document.body).fontSize,
    icon: icon ? Math.round(icon.getBoundingClientRect().height * 100) / 100 : null,
    scrollbar: probe.offsetWidth - probe.clientWidth,
    saves: window.__saves,
  };
})()`;

// Counts the page's calls of saveIDEOptions, which the font-size commands call through the global.
const SPY_JS = `(() => {
  if (window.__saves !== undefined) return;
  window.__saves = 0;
  const real = saveIDEOptions;
  saveIDEOptions = function (...a) { window.__saves++; return real.apply(this, a); };
})()`;

scenario("zoom", (lane) => {
  let c = null;
  const state = () => c.evaluate(STATE_JS);
  const ctrlAlt = { ctrl: true, alt: true };

  // The numeric keypad's + or -, with Ctrl and Alt held, as the keyboard sends it.
  async function pressKeypad(which) {
    const k = which === "+" ? { key: "+", code: "NumpadAdd", vk: 107 } : { key: "-", code: "NumpadSubtract", vk: 109 };
    const mod = (type, key, code, vk, modifiers) =>
      c.send("Input.dispatchKeyEvent", {
        type,
        key,
        code,
        windowsVirtualKeyCode: vk,
        nativeVirtualKeyCode: vk,
        modifiers,
      });
    await mod("rawKeyDown", "Control", "ControlLeft", 17, 2);
    await mod("rawKeyDown", "Alt", "AltLeft", 18, 3);
    await mod("rawKeyDown", k.key, k.code, k.vk, 3);
    await mod("keyUp", k.key, k.code, k.vk, 3);
    await mod("keyUp", "Alt", "AltLeft", 18, 2);
    await mod("keyUp", "Control", "ControlLeft", 17, 0);
  }
  // A key press, then the state once the page has applied it.
  async function after(press) {
    await press();
    await sleep(300);
    return state();
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
    const cancel = await c.evaluate(`(() => {
      const ms = [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width);
      const b = ms.length && [...ms.at(-1).querySelectorAll("button, .dialogButton, .msgBoxButton, [class*=Button]")]
        .find((e) => e.textContent.trim() === "Cancel" && e.getBoundingClientRect().width);
      if (!b) return null;
      const q = b.getBoundingClientRect();
      return { x: q.x + q.width / 2, y: q.y + q.height / 2 };
    })()`);
    assert.ok(cancel, "the New / Open dialog has no Cancel button");
    await clickAt(c, cancel.x, cancel.y);
    await sleep(800);
    await c.evaluate(SPY_JS);
  });

  test("the IDE starts at the default IDE Font Size, 13px, and applies it to the page", async (t) => {
    const s = await state();
    t.diagnostic(JSON.stringify(s));
    assert.equal(s.option, "13px");
    assert.equal(s.variable, "13px");
    assert.equal(s.body, "13px");
  });

  test("Ctrl+Alt++ makes the IDE 1px bigger, the toolbar's icons with its text, and saves the options", async (t) => {
    const s0 = await state();
    const s1 = await after(() => pressKey(c, "+", ctrlAlt));
    t.diagnostic(JSON.stringify({ s0, s1 }));
    assert.equal(s1.option, "14px");
    assert.equal(s1.variable, "14px");
    assert.equal(s1.body, "14px");
    assert.equal(Number(s1.scaling), 14 / 13, `--generalScaling is ${s1.scaling}`);
    assert.ok(s0.icon && s1.icon > s0.icon, `an icon did not grow: ${s0.icon} then ${s1.icon}`);
    assert.equal(s1.saves, s0.saves + 1, "the options were not saved once");
  });

  test("the numeric keypad's + and - do the same with Ctrl+Alt", async (t) => {
    const s1 = await after(() => pressKeypad("+"));
    const s2 = await after(() => pressKeypad("-"));
    t.diagnostic(JSON.stringify({ s1, s2 }));
    assert.equal(s1.option, "15px");
    assert.equal(s2.option, "14px");
  });

  test("Ctrl+Alt+- makes the IDE 1px smaller, down to 8px, and a press at 8px saves nothing", async (t) => {
    let s = await state();
    for (let i = 0; i < 6; i++) s = await after(() => pressKey(c, "-", ctrlAlt));
    assert.equal(s.option, "8px");
    assert.equal(s.variable, "8px");
    const below = await after(() => pressKey(c, "-", ctrlAlt));
    t.diagnostic(JSON.stringify({ at8: s, below }));
    assert.equal(below.option, "8px");
    assert.equal(below.saves, s.saves, "a press at 8px saved the options");
  });

  test("Ctrl+Alt++ has no upper limit: the size passes 30px, the top of the IDE Options list", async (t) => {
    let s = await state();
    for (let i = 0; i < 23; i++) s = await after(() => pressKey(c, "+", ctrlAlt));
    t.diagnostic(JSON.stringify(s));
    assert.equal(s.option, "31px");
    assert.equal(s.variable, "31px");
  });

  test("Ctrl+Alt+0 does not reset the size", async (t) => {
    const s0 = await state();
    const s1 = await after(() => pressKey(c, "0", ctrlAlt));
    t.diagnostic(JSON.stringify({ s0, s1 }));
    assert.equal(s1.option, s0.option);
    assert.equal(s1.saves, s0.saves, "Ctrl+Alt+0 saved the options");
  });
});
