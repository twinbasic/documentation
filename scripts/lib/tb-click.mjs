// Finding an element in a running twinBASIC IDE's page, and clicking it the
// way a person does. buildProject in tb-ide.mjs and tbrun.mjs press the
// toolbar's Build button with it, and tb-operate.mjs passes it on to the
// add-in scenarios. It is a module of its own because tb-operate.mjs imports
// tb-ide.mjs, so tb-ide.mjs cannot import it from there. Every call takes a
// connection from attachIde in tb-ide.mjs.
//
// A click is a real CDP input event, never element.click(): the IDE's own
// controls ignore a JavaScript click. `#buildIcon`, for one, is a plain DIV
// wired through the IDE's pointer handling.

import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// ------------------------------------------------------------------ finding

// A target is an element id in the main document ("buildIcon",
// "addinButton-<id>"), or an object:
//
//   { css }               the elements a selector finds in the main document
//   { css, toolWindow }   the same inside a tool window, named by the id its
//                         add-in gave ToolWindows.Add
//   ..., text             only those whose text, trimmed, is exactly this
//   ..., last: true       the last of them rather than the first
//
// Of the elements found, the first one on screen is the target, then the first
// at all. A list view keeps rows it drew before (its getCachedDomNode), and
// Sample 15's results held one file's entry twice while showing it once, so
// the first element a selector finds is not always the one a person sees.
// `last` is for stacked dialogs, where the one on top came last.
// The expression evaluates to the element or null.
export function targetJs(target) {
  if (typeof target === "string") return `document.getElementById(${JSON.stringify(target)})`;
  const scope = target.toolWindow
    ? `(() => { const w = typeof toolWindowsById === "undefined" ? null
        : toolWindowsById[${JSON.stringify(target.toolWindow)}];
        return w && w.bodyElement ? w.bodyElement : null; })()`
    : "document";
  return `(() => {
    const scope = ${scope};
    if (!scope) return null;
    let found = [...scope.querySelectorAll(${JSON.stringify(target.css)})];
    const text = ${JSON.stringify(target.text ?? null)};
    if (text !== null) found = found.filter((e) => e.textContent.trim() === text);
    if (${!!target.last}) found.reverse();
    const shown = found.find((e) => { const r = e.getBoundingClientRect(); return r.width && r.height; });
    return shown || found[0] || null;
  })()`;
}

// A target as a message names it.
function named(target) {
  if (typeof target === "string") return `#${target}`;
  return [
    target.css,
    target.text !== undefined ? `with the text ${JSON.stringify(target.text)}` : "",
    target.toolWindow ? `in tool window ${target.toolWindow}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// ------------------------------------------------------------------ mouse

// How a message names an element: its id, or its tag and classes, then the
// start of its text.
const DESCRIBE_JS = `(n) => {
  if (!n || !n.tagName) return "nothing";
  const cls = (n.getAttribute("class") || "").trim();
  const name = n.id ? "#" + n.id : n.tagName.toLowerCase() + (cls ? "." + cls.split(/\\s+/).join(".") : "");
  const text = (n.textContent || "").trim().replace(/\\s+/g, " ");
  return text ? name + " " + JSON.stringify(text.length > 40 ? text.slice(0, 40) + "..." : text) : name;
}`;

// Whether all of an element is on screen: inside the viewport, and inside every
// ancestor that clips what overflows it, through shadow roots.
const SHOWN_JS = `(e) => {
  const r = e.getBoundingClientRect();
  const within = (left, top, width, height) =>
    r.left >= left - 1 && r.top >= top - 1 && r.right <= left + width + 1 && r.bottom <= top + height + 1;
  if (!within(0, 0, innerWidth, innerHeight)) return false;
  for (let a = e.parentElement ?? e.getRootNode().host; a; a = a.parentElement ?? a.getRootNode().host) {
    const s = getComputedStyle(a);
    if (s.display === "contents" || (s.overflowX === "visible" && s.overflowY === "visible")) continue;
    const b = a.getBoundingClientRect();
    if (!within(b.left + a.clientLeft, b.top + a.clientTop, a.clientWidth, a.clientHeight)) return false;
  }
  return true;
}`;

// The page global that holds a click's check on its press, from the call that
// aims to the call that reads where the press landed.
const PRESS = "__tbClickPress";

// Where the page is saved when a click fails: what covers a target is often
// plain in a picture and hard to put in words, and the IDE runs on a private
// desktop nobody can look at.
const PICTURES = path.join(tmpdir(), "tb-click");

/**
 * Save a picture of the page as it is now, for an error to name: a clause
 * naming the file, or "" when the page could not be captured within five
 * seconds. Never throws, so that a failure to capture never hides the failure
 * it was taken for.
 */
export async function pagePicture(c) {
  try {
    const shot = c.send("Page.captureScreenshot", { format: "png" });
    shot.catch(() => {});
    const { data } = await Promise.race([
      shot,
      sleep(5000).then(() => {
        throw new Error("timed out");
      }),
    ]);
    mkdirSync(PICTURES, { recursive: true });
    const file = path.join(PICTURES, `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    return `; the page as it was is in ${file}`;
  } catch {
    return "";
  }
}

/** A real left click at a point: the pointer moves there, presses and releases. */
export async function clickAt(c, x, y, { clickCount = 1 } = {}) {
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) {
    await c.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount });
  }
}

/**
 * Click the centre of a target (see targetJs), as a person would: scrolled into
 * view first if any of it is hidden, only if the target is what is actually at
 * that point, and checked where the press lands.
 *
 * The first two were learned on Sample 10, whose tool window is taller than it
 * is shown: its eleventh button had a size and a place, but that place was
 * under the window's own bottom edge, and the click went to the window's
 * resize handle and did nothing. The element under the point is found through
 * every shadow root, since a tool window is one. A target in full view is not
 * scrolled, because centring it scrolls whatever holds it: in the code editor,
 * a click on the error panel scrolled the code. When something covers the
 * centre of a target in full view, it is scrolled to the centre and tried again.
 *
 * Waits up to `timeout` milliseconds for the target to be there, have a size
 * and be uncovered, because what an add-in adds is drawn a moment after it is
 * in the page's data: a list view that already held Sample 15's results had
 * not yet drawn their rows when a click came under a millisecond later.
 *
 * The press is checked because the page can change between the call that aims
 * and the press. The IDE's error panel goes on moving after it is drawn in an
 * editor the debugger has just opened, and a press aimed at its Stop landed on
 * the panel's header: the run went on, and the click looked ignored. So the
 * call that aims also installs a one-shot listener on the window, in the
 * capture phase, which records the element the press lands on before the
 * page's own handlers on it can run. The press is on target when it lands in
 * the target, or in what the target's selector finds by then, in case the page
 * drew the target again. The release is not checked: a control may act on the
 * press and close before it.
 *
 * Throws, naming the target, when it is still not clickable after that: there
 * is no such element, it has no size (it is in a hidden tool window, say), or
 * something else covers its centre. Throws, naming what was pressed instead,
 * when the press missed. A press the listener never saw, because a listener of
 * the page's own on the window stopped it first, is not reported.
 *
 * @param {object} [o]
 * @param {number} [o.timeout]     milliseconds to wait (default 5000)
 * @param {number} [o.clickCount]  2 for a double click
 */
export async function click(c, target, { timeout = 5000, clickCount = 1 } = {}) {
  const until = Date.now() + timeout;
  for (;;) {
    const p = await c.evaluate(`(() => {
      const describe = ${DESCRIBE_JS};
      const shown = ${SHOWN_JS};
      const find = () => ${targetJs(target)};
      const e = find();
      if (!e) return { error: "there is no such element" };
      // The target's centre, if it is the target that is there.
      const aim = () => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return { error: "it has no size; is it in a hidden tool window?" };
        const x = r.x + r.width / 2, y = r.y + r.height / 2;
        let hit = document.elementFromPoint(x, y);
        while (hit && hit.shadowRoot) {
          const inner = hit.shadowRoot.elementFromPoint(x, y);
          if (!inner || inner === hit) break;
          hit = inner;
        }
        return hit && (hit === e || e.contains(hit)) ? { x, y } : { error: "its centre is covered by " + describe(hit) };
      };
      let at = shown(e) ? aim() : null;
      if (!at || at.error) {
        e.scrollIntoView({ block: "center", inline: "center" });
        at = aim();
      }
      if (at.error) return at;
      window.${PRESS}?.stop();
      const check = { landed: null };
      const on = (ev) => {
        check.stop();
        const path = ev.composedPath();
        let hit = path.includes(e);
        if (!hit) {
          try {
            const now = find();
            hit = !!now && path.includes(now);
          } catch {}
        }
        check.landed = { hit, what: describe(path[0]) };
      };
      check.stop = () => window.removeEventListener("pointerdown", on, true);
      window.addEventListener("pointerdown", on, true);
      window.${PRESS} = check;
      return at;
    })()`);
    if (!p.error) {
      await clickAt(c, p.x, p.y, { clickCount });
      const landed = await c.evaluate(`(() => {
        const check = window.${PRESS};
        if (!check) return null;
        check.stop();
        delete window.${PRESS};
        return check.landed;
      })()`);
      if (landed && !landed.hit) {
        throw new Error(
          `cannot click ${named(target)}: the press landed on ${landed.what}; ` +
            "the target moved, or something covered it, between aiming and pressing" +
            (await pagePicture(c)),
        );
      }
      return;
    }
    if (Date.now() >= until) throw new Error(`cannot click ${named(target)}: ${p.error}${await pagePicture(c)}`);
    await sleep(100);
  }
}
