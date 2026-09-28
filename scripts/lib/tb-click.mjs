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
  return [target.css, target.text !== undefined ? `with the text ${JSON.stringify(target.text)}` : "",
          target.toolWindow ? `in tool window ${target.toolWindow}` : ""].filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ mouse

/** A real left click at a point: the pointer moves there, presses and releases. */
export async function clickAt(c, x, y, { clickCount = 1 } = {}) {
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) {
    await c.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount });
  }
}

/**
 * Click the centre of a target (see targetJs), as a person would: scrolled into
 * view first, and only if the target is what is actually at that point.
 *
 * Both were learned on Sample 10, whose tool window is taller than it is
 * shown: its eleventh button had a size and a place, but that place was under
 * the window's own bottom edge, and the click went to the window's resize
 * handle and did nothing. The element under the point is found through every
 * shadow root, since a tool window is one.
 *
 * Waits up to `timeout` milliseconds for the target to be there, have a size
 * and be uncovered, because what an add-in adds is drawn a moment after it is
 * in the page's data: a list view that already held Sample 15's results had
 * not yet drawn their rows when a click came under a millisecond later.
 *
 * Throws, naming the target, when it is still not clickable after that: there
 * is no such element, it has no size (it is in a hidden tool window, say), or
 * something else covers its centre.
 *
 * @param {object} [o]
 * @param {number} [o.timeout]     milliseconds to wait (default 5000)
 * @param {number} [o.clickCount]  2 for a double click
 */
export async function click(c, target, { timeout = 5000, clickCount = 1 } = {}) {
  const until = Date.now() + timeout;
  for (;;) {
    const p = await c.evaluate(`(() => {
      const e = ${targetJs(target)};
      if (!e) return { error: "there is no such element" };
      e.scrollIntoView({ block: "center", inline: "center" });
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return { error: "it has no size; is it in a hidden tool window?" };
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      let hit = document.elementFromPoint(x, y);
      while (hit && hit.shadowRoot) {
        const inner = hit.shadowRoot.elementFromPoint(x, y);
        if (!inner || inner === hit) break;
        hit = inner;
      }
      if (hit && (hit === e || e.contains(hit))) return { x, y };
      const what = !hit ? "nothing" : hit.id ? "#" + hit.id
        : hit.tagName.toLowerCase() + (hit.className ? "." + String(hit.className).trim().split(/\\s+/).join(".") : "");
      return { error: "its centre is covered by " + what };
    })()`);
    if (!p.error) return clickAt(c, p.x, p.y, { clickCount });
    if (Date.now() >= until) throw new Error(`cannot click ${named(target)}: ${p.error}`);
    await sleep(100);
  }
}
