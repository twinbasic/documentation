// P16 and P17 in WIP.HelpAddin.md: the two routes to hover help.
//
// P16, the public API: what polling the cursor and adding a widget cost, and
// how long a widget lives. The WidgetsProbe add-in (probes/widgets) answers F6
// with timings, F7 by adding a widget at the cursor and F8 by removing it.
//
// P17, the page: whether a second Monaco hover provider for "twinbasic", as
// the help add-in would register through the page, adds its text to the IDE's
// own hover, from a synchronous answer and from a promise.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { sleep } from "../../scripts/lib/tb-ide.mjs";
import { consoleMark, linesSince, readConsole } from "../../scripts/lib/tb-ide-console.mjs";
import { openFile, pressKey, setCursor, waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const PROBE = path.join(HERE, "probes", "widgets");
const MAIN = "/AddinHost/Sources/Main.twin";
const HAYSTACK = "/AddinHost/Sources/Haystack.twin";

// The probe's line after a mark that starts with `prefix`, without the tag.
const said = (c, mark, prefix, timeout = 10 * 1000) =>
  waitFor(
    c,
    async (c) =>
      (await linesSince(c, mark)).map((l) => /^\[WidgetsProbe\] (.+)$/.exec(l)?.[1]).find((l) => l?.startsWith(prefix)),
    { timeout },
  );

async function press(c, key, prefix) {
  const mark = await consoleMark(c);
  await pressKey(c, key);
  const line = await said(c, mark, prefix);
  assert.ok(line, `${key}: the probe never said "${prefix}..."`);
  return line;
}

// The add-in widgets in the page: the page's own list, and each host element
// with its text and where it is drawn.
const widgets = (c) =>
  c.evaluate(`(() => {
  const nodes = [...document.querySelectorAll("[id^=addinWidgetId]")];
  return {
    active: Object.keys(activeAddinWidgets).length,
    nodes: nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { text: n.shadowRoot?.textContent ?? "", top: r.top, height: r.height };
    }),
  };
})()`);

// Where a position in the code editor is drawn, in the page's coordinates.
const pointOf = (c, line, column) =>
  c.evaluate(`(() => {
  const p = editor.getScrolledVisiblePosition({ lineNumber: ${line}, column: ${column} });
  const r = editor.getDomNode().getBoundingClientRect();
  return { x: r.left + p.left + 2, y: r.top + p.top + p.height / 2, top: r.top + p.top, height: p.height };
})()`);

// The text of the hover Monaco shows, or null when none shows.
const hoverText = (c) =>
  c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".monaco-hover")]
    .find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 0);
  return h ? h.textContent : null;
})()`);

async function rest(c, line, column) {
  // Away first, so that a hover already shown goes and the next one is new.
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
  await waitFor(c, async (c) => (await hoverText(c)) === null, { timeout: 3000 });
  const p = await pointOf(c, line, column);
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x + 1, y: p.y });
}

// A selector of "*" matches every language less closely than the IDE's own
// "twinbasic", which Monaco is expected to show after the IDE's.
const register = (c, body, selector = "twinbasic") =>
  c.evaluate(`(() => {
  if (window.p17Provider) window.p17Provider.dispose();
  window.p17Provider = monaco.languages.registerHoverProvider(${JSON.stringify(selector)}, { provideHover: ${body} });
  return true;
})()`);

scenario("P16 and P17: hover help through a widget and through the page", (lane) => {
  let c;
  before(async () => {
    await lane.addAddin(PROBE);
    c = await lane.open(HOST);
    assert.ok(
      await waitFor(c, async (c) => ((await readConsole(c)) ?? "").includes("[WidgetsProbe] registered")),
      "the add-in never printed that it had registered its shortcuts",
    );
    await openFile(c, MAIN, { line: 4, column: 18 });
  });

  test("P16: what polling the cursor, reading the text and a widget cost", async () => {
    await setCursor(c, 4, 18);
    const mark = await consoleMark(c);
    await pressKey(c, "F6");
    const cost = await said(c, mark, "cost ", 30 * 1000);
    assert.ok(cost, "the probe never reported its timings");
    console.log(`P16 ${cost}`);
    const ticks = await said(c, mark, "ticks ", 10 * 1000);
    assert.ok(ticks, "a 100 ms AddinTimer did not tick 20 times in 10 s");
    console.log(`P16 ${ticks}`);
    assert.deepEqual((await widgets(c)).nodes, [], "a timed widget was left in the page");
  });

  test("P16: a widget stays when the cursor moves and goes when it is removed", async () => {
    await setCursor(c, 4, 18);
    assert.equal(await press(c, "F7", "added"), "added at 4:18");
    const w = await waitFor(c, async (c) => {
      const w = await widgets(c);
      return w.nodes.length === 1 && w.nodes[0].height > 0 && w;
    });
    assert.ok(w, `no widget drawn: ${JSON.stringify(await widgets(c))}`);
    assert.equal(w.active, 1);
    assert.match(w.nodes[0].text, /Help: probe/);
    const line = await pointOf(c, 4, 18);
    console.log(
      `P16 widget top=${w.nodes[0].top} height=${w.nodes[0].height}; line top=${line.top} height=${line.height}`,
    );
    await setCursor(c, 2, 5);
    await sleep(300);
    assert.equal((await widgets(c)).nodes.length, 1, "moving the cursor removed the widget");
    assert.equal(await press(c, "F8", "remove"), "removed");
    assert.ok(
      await waitFor(c, async (c) => (await widgets(c)).nodes.length === 0, { timeout: 3000 }),
      `the widget is still in the page: ${JSON.stringify(await widgets(c))}`,
    );
  });

  test("P16: switching files removes a widget, and removing it afterwards", async () => {
    await setCursor(c, 4, 18);
    await press(c, "F7", "added");
    assert.ok(await waitFor(c, async (c) => (await widgets(c)).nodes.length === 1));
    await openFile(c, HAYSTACK, { line: 1, column: 1 });
    const after = await waitFor(c, async (c) => {
      const w = await widgets(c);
      return w.nodes.length === 0 && w;
    });
    console.log(`P16 after a file switch: ${JSON.stringify(after || (await widgets(c)))}`);
    const removed = await press(c, "F8", "remove");
    console.log(`P16 Remove after the switch: ${removed}`);
    await openFile(c, MAIN, { line: 4, column: 18 });
  });

  test("P17: a second hover provider adds its text to the IDE's hover", async () => {
    const alone = await (async () => {
      await rest(c, 4, 20);
      return waitFor(c, hoverText, { timeout: 5000 });
    })();
    console.log(`P17 the IDE's hover alone: ${JSON.stringify(alone)}`);
    assert.ok(alone, "the IDE showed no hover on FindTheNeedle");

    await register(c, `() => ({ contents: [{ value: "**Help:** probe sync" }] })`);
    await rest(c, 4, 20);
    const sync = await waitFor(c, async (c) => {
      const t = await hoverText(c);
      return t?.includes("probe sync") && t;
    });
    console.log(`P17 with a synchronous provider: ${JSON.stringify(sync)}`);
    assert.ok(sync, `the provider's text is not in the hover: ${JSON.stringify(await hoverText(c))}`);

    await register(
      c,
      `() => new Promise((r) => setTimeout(() => r({ contents: [{ value: "**Help:** probe later" }] }), 500))`,
    );
    await rest(c, 4, 20);
    const later = await waitFor(c, async (c) => {
      const t = await hoverText(c);
      return t?.includes("probe later") && t;
    });
    console.log(`P17 with a provider answering after 500 ms: ${JSON.stringify(later)}`);
    assert.ok(later, `the promised text is not in the hover: ${JSON.stringify(await hoverText(c))}`);

    await c.evaluate("window.p17Provider.dispose(), true");
    await rest(c, 4, 20);
    const gone = await waitFor(c, hoverText, { timeout: 5000 });
    assert.ok(gone && !gone.includes("probe"), `the disposed provider still answers: ${JSON.stringify(gone)}`);
  });

  test("P17: a provider registered for every language shows after the IDE's", async () => {
    await register(c, `() => ({ contents: [{ value: "**Help:** probe below" }] })`, "*");
    await rest(c, 4, 20);
    const t = await waitFor(c, async (c) => {
      const t = await hoverText(c);
      return t?.includes("probe below") && t;
    });
    console.log(`P17 with a provider for "*": ${JSON.stringify(t)}`);
    assert.ok(t, `the provider's text is not in the hover: ${JSON.stringify(await hoverText(c))}`);
    assert.ok(t.indexOf("FindTheNeedle") < t.indexOf("probe below"), "the provider's text is above the IDE's");
    await c.evaluate("window.p17Provider.dispose(), true");
  });

  test("P17: a click on a link in the hover can be taken before the IDE opens it", async () => {
    await register(c, `() => ({ contents: [{ value: "[Help: probe link](https://docs.twinbasic.com/p17)" }] })`, "*");
    // Record what is opened, and take the click in the capture phase, as the
    // add-in would.
    await c.evaluate(`(() => {
  window.p17Opened = [];
  window.p17Open = window.open;
  window.open = (...a) => { window.p17Opened.push(String(a[0])); return null; };
  window.p17Taken = [];
  window.p17Listener = (e) => {
    const a = e.target.closest && e.target.closest(".monaco-hover a");
    if (!a) return;
    window.p17Taken.push(a.dataset.href || a.getAttribute("href"));
    e.preventDefault();
    e.stopPropagation();
  };
  window.addEventListener("click", window.p17Listener, true);
  return true;
})()`);
    try {
      await rest(c, 4, 20);
      const link = await waitFor(c, (c) =>
        c.evaluate(`(() => {
  const a = [...document.querySelectorAll(".monaco-hover a")].find((a) => a.textContent.includes("probe link"));
  if (!a) return null;
  const r = a.getBoundingClientRect();
  return r.width > 0 && { x: r.left + r.width / 2, y: r.top + r.height / 2, html: a.outerHTML };
})()`),
      );
      assert.ok(link, `no link in the hover: ${JSON.stringify(await hoverText(c))}`);
      console.log(`P17 the link: ${link.html}`);
      const mark = await consoleMark(c);
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: link.x, y: link.y });
      await c.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: link.x,
        y: link.y,
        button: "left",
        clickCount: 1,
      });
      await c.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: link.x,
        y: link.y,
        button: "left",
        clickCount: 1,
      });
      await sleep(1000);
      const r = await c.evaluate("({ taken: window.p17Taken, opened: window.p17Opened })");
      console.log(`P17 after the click: ${JSON.stringify(r)}; console: ${JSON.stringify(await linesSince(c, mark))}`);
      assert.deepEqual(r.taken, ["https://docs.twinbasic.com/p17"]);
      assert.deepEqual(r.opened, []);
    } finally {
      await c.evaluate(`(() => {
  window.removeEventListener("click", window.p17Listener, true);
  window.open = window.p17Open;
  window.p17Provider.dispose();
  return true;
})()`);
    }
  });
});
