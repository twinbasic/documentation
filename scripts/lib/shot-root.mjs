// The folder shoot_docs.mjs keeps its projects, builds and packages in, and the name the pictures
// show for it. Nothing writes at a drive's root (WIP.md, "Nothing writes outside the cloned
// repository and the temp folder"), so the real folder is in the checkout, where git ignores it,
// and a path a picture shows is a virtual one: the page's text is rewritten at the capture.
//
//   * Text: the setters of the DOM's text properties and the page's TEXTtoHTML rewrite what they are
//     given, at once, since the IDE measures a console row in the task that writes it, and a path
//     40 characters too long leaves the row a line too tall. A MutationObserver on the document
//     and on each shadow root takes what comes by any other way, and what was there before.
//     rootTextJs installs them.
//   * Text boxes: a value is rewritten just before a capture and just before an SVG is read, and put
//     back after the capture (rootBoxesJs, rootBoxesBackJs), since the page can read a box back
//     and act on what it finds: a path it read from a picture's rewrite would name the folder
//     nothing may write to.
//   * A guard (holdsRoot), as for the Windows user name: a picture whose page, SVG or window
//     still holds the real folder fails.

import path from "node:path";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";

/** The real folder. It stands for a folder at a drive's root, and it is short for that reason. */
export const TOOL_ROOT = path.join(REPO_ROOT, ".claude", "tbshots");

/** The name a picture shows for it. No such folder exists. */
export const SHOWN_ROOT = "C:\\tbshots";

const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What finds `root` in text: in any case, with either slash or a doubled one (a path in JSON)
 * between its parts, and not a longer name that starts with it. A part that starts with a dot may
 * have no slash before it: Markdown reads a backslash before a dot as an escape, and the import
 * log is Markdown. Global, so use it with `replace` or `search`, which ignore its lastIndex.
 *
 * @param {string} root
 * @returns {RegExp}
 */
export const rootPattern = (root) => {
  const parts = root.split(/[\\/]+/).filter(Boolean);
  const body = parts.map((p, i) => (i === 0 ? "" : p.startsWith(".") ? "[\\\\/]*" : "[\\\\/]+") + escaped(p));
  return new RegExp(`${body.join("")}(?![\\w-])`, "gi");
};

/**
 * `text` with each place `pattern` finds shown as `shown`. A function of its own because the page
 * runs this same source.
 *
 * @param {string} text
 * @param {RegExp} pattern  from rootPattern
 * @param {string} shown
 * @returns {string}
 */
export const showRoot = (text, pattern, shown) => text.replace(pattern, () => shown);

/**
 * Whether `text` holds what `pattern` finds, an embedded image's bytes left out.
 *
 * @param {string} text
 * @param {RegExp} pattern  from rootPattern
 * @returns {boolean}
 */
export const holdsRoot = (text, pattern) => text.replace(/;base64,[A-Za-z0-9+/=]+/g, ";base64,").search(pattern) >= 0;

const PAGE_HEAD = (root, shown) => `const pattern = new RegExp(${JSON.stringify(rootPattern(root).source)}, "gi");
  const shown = ${JSON.stringify(shown)};
  const show = ${showRoot};`;

/**
 * Runs in the page: rewrites what the DOM's text setters are given from here on, every text node
 * there is, and any that comes by another way, in the document and each shadow root that has
 * appeared since. Safe to run again.
 *
 * @param {string} root
 * @param {string} shown
 * @returns {string}  the expression
 */
export const rootTextJs = (root, shown) => `(() => {
  ${PAGE_HEAD(root, shown)}
  if (!window.__shotRootSetters) {
    window.__shotRootSetters = true;
    const text = (v) => (typeof v === "string" ? show(v, pattern, shown) : v);
    const setter = (proto, name) => {
      const d = Object.getOwnPropertyDescriptor(proto, name);
      Object.defineProperty(proto, name, {
        ...d,
        set(v) {
          d.set.call(this, text(v));
        },
      });
    };
    setter(Node.prototype, "textContent");
    setter(Node.prototype, "nodeValue");
    setter(CharacterData.prototype, "data");
    setter(HTMLElement.prototype, "innerText");
    setter(Element.prototype, "innerHTML");
    setter(ShadowRoot.prototype, "innerHTML");
    const createTextNode = document.createTextNode;
    document.createTextNode = function (t) {
      return createTextNode.call(this, text(t));
    };
  }
  // The DEBUG CONSOLE's lines go through this on their way to HTML, whose escapes no pattern finds.
  if (typeof window.TEXTtoHTML === "function" && !window.__shotRootHtml) {
    window.__shotRootHtml = true;
    const toHtml = window.TEXTtoHTML;
    window.TEXTtoHTML = function (t, ...rest) {
      return toHtml.call(this, typeof t === "string" ? show(t, pattern, shown) : t, ...rest);
    };
  }
  const fix = (n) => {
    const text = show(n.data, pattern, shown);
    if (text !== n.data) n.data = text;
  };
  const sweep = (top) => {
    const walk = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) fix(n);
  };
  const watched = (window.__shotRootWatched ??= new WeakSet());
  const watch = (top) => {
    if (!watched.has(top)) {
      watched.add(top);
      new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === "characterData") fix(r.target);
          for (const n of r.addedNodes) {
            if (n.nodeType === Node.TEXT_NODE) fix(n);
            else if (n.nodeType === Node.ELEMENT_NODE) sweep(n);
          }
        }
      }).observe(top, { subtree: true, childList: true, characterData: true });
    }
    sweep(top);
    for (const e of top.querySelectorAll("*")) if (e.shadowRoot) watch(e.shadowRoot);
  };
  watch(document);
})()`;

/**
 * Runs in the page: rewrites each text box's value, across the shadow roots, and remembers what it
 * held for rootBoxesBackJs.
 *
 * @param {string} root
 * @param {string} shown
 * @returns {string}  the expression
 */
export const rootBoxesJs = (root, shown) => `(() => {
  ${PAGE_HEAD(root, shown)}
  const held = (window.__shotRootHeld ??= new Map());
  const pass = (top) => {
    for (const e of top.querySelectorAll("input, textarea")) {
      const text = show(e.value, pattern, shown);
      if (text === e.value) continue;
      if (!held.has(e)) held.set(e, e.value);
      e.value = text;
    }
    for (const e of top.querySelectorAll("*")) if (e.shadowRoot) pass(e.shadowRoot);
  };
  pass(document);
})()`;

/** Runs in the page: puts back what rootBoxesJs rewrote. */
export const rootBoxesBackJs = `(() => {
  const held = window.__shotRootHeld;
  if (!held) return;
  for (const [e, value] of held) e.value = value;
  held.clear();
})()`;
