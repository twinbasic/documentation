// Reading hover help's two places in the IDE's page: the add-in widgets in
// the code editor, and the hover Monaco shows under the mouse.

import { waitFor } from "../../scripts/lib/tb-operate.mjs";

/**
 * The add-in widgets in the page: the page's own count of them, and each
 * one's text and where it is drawn, with the centre of its first link.
 */
export const widgets = (c) =>
  c.evaluate(`(() => {
  const nodes = [...document.querySelectorAll("[id^=addinWidgetId]")];
  return {
    active: Object.keys(activeAddinWidgets).length,
    nodes: nodes.map((n) => {
      const r = n.getBoundingClientRect();
      const a = n.shadowRoot?.querySelector("a")?.getBoundingClientRect();
      return {
        text: [...(n.shadowRoot?.children ?? [])]
          .filter((e) => e.tagName !== "STYLE")
          .map((e) => e.textContent)
          .join(""),
        top: r.top,
        height: r.height,
        link: a ? { x: a.left + a.width / 2, y: a.top + a.height / 2 } : null,
      };
    }),
  };
})()`);

/** Where a position in the code editor is drawn, in the page's coordinates. */
export const pointOf = (c, line, column) =>
  c.evaluate(`(() => {
  const p = editor.getScrolledVisiblePosition({ lineNumber: ${Number(line)}, column: ${Number(column)} });
  const r = editor.getDomNode().getBoundingClientRect();
  return { x: r.left + p.left + 2, y: r.top + p.top + p.height / 2, top: r.top + p.top, height: p.height };
})()`);

/** The text of the hover Monaco shows, or null when none shows. */
export const hoverText = (c) =>
  c.evaluate(`(() => {
  const h = [...document.querySelectorAll(".monaco-hover")]
    .find((e) => !e.classList.contains("hidden") && e.getBoundingClientRect().height > 0);
  return h ? h.textContent : null;
})()`);

/**
 * The centre of the link in the shown hover whose text includes `text`, or
 * null, scrolled into view first: a long hover scrolls, and a link at its end
 * can be outside what shows. `top` says whether the link itself is what is
 * at its centre, which a click needs.
 */
export const hoverLink = (c, text) =>
  c.evaluate(`(() => {
  const a = [...document.querySelectorAll(".monaco-hover a")]
    .find((a) => a.textContent.includes(${JSON.stringify(text)}));
  if (!a) return null;
  a.scrollIntoView({ block: "nearest" });
  const r = a.getBoundingClientRect();
  if (!r.width) return null;
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const at = document.elementFromPoint(x, y);
  return { x, y, top: at === a || a.contains(at), at: at ? at.tagName + "." + at.className : null, html: a.outerHTML };
})()`);

/**
 * Move the mouse to the page's corner and wait for a hover to go: one left
 * open covers what is under it, the toolbar's buttons included.
 */
export async function mouseAway(c) {
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
  await waitFor(c, async (c) => (await hoverText(c)) === null, { timeout: 3000 });
}

/**
 * Rest the mouse on a position in the code editor. It goes to the page's
 * corner first, so that a hover already shown goes and the next one is new;
 * Monaco shows the hover after the IDE's delay, a second.
 */
export async function restMouse(c, line, column) {
  await mouseAway(c);
  const p = await pointOf(c, line, column);
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x + 1, y: p.y });
}
