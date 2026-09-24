// Operating a running twinBASIC IDE the way a person does, and reading what it
// shows: the calls the add-in harness in WIP.HelpAddin.md (Stage 1, item 5)
// writes its scenarios with. Every call takes a connection from attachIde in
// tb-ide.mjs, which records and dismisses the page's javascript dialogs.
//
// Input goes in as real CDP input events, never as element.click() or a
// synthetic DOM event. The IDE's own controls ignore a JavaScript click
// (tbrun learned that on #buildIcon), and an add-in's shortcut is matched on
// the real key-down and key-up pair (main.js, document.onkeyup), so anything
// less than what a keyboard sends would test something the IDE never sees.
//
// Reading, on the other hand, goes straight to the page's own data where the
// view would lie: the DEBUG CONSOLE is a virtual list (readConsole in
// tb-ide.mjs says why), and a tool window lives in a shadow root that
// document.querySelector cannot see into.

import { readConsole, sleep } from "./tb-ide.mjs";

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
function targetJs(target) {
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

/**
 * Where an element is on screen, in the viewport coordinates input events
 * use; null when there is no such element or it has no size, which is what a
 * hidden tool window's elements have.
 */
export async function elementRect(c, target) {
  return c.evaluate(`(() => {
    const e = ${targetJs(target)};
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return r.width && r.height ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  })()`);
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

// ------------------------------------------------------------------ keyboard

// What a US keyboard sends for each key: DOM key, DOM code and Windows virtual
// key code. The IDE names an add-in shortcut's letters from `code` and every
// other key from `key` (WIP.HelpAddin.md, Keyboard shortcuts), so both must
// be what a real keyboard gives.
const NAMED = {
  Enter: ["Enter", 13, "\r"], Tab: ["Tab", 9, "\t"], Backspace: ["Backspace", 8], Escape: ["Escape", 27],
  Delete: ["Delete", 46], Home: ["Home", 36], End: ["End", 35], PageUp: ["PageUp", 33],
  PageDown: ["PageDown", 34], ArrowLeft: ["ArrowLeft", 37], ArrowUp: ["ArrowUp", 38],
  ArrowRight: ["ArrowRight", 39], ArrowDown: ["ArrowDown", 40], Insert: ["Insert", 45],
};
const PUNCTUATION = {   // unshifted, shifted, code, virtual key
  " ": [" ", " ", "Space", 32], "`": ["`", "~", "Backquote", 192], "-": ["-", "_", "Minus", 189],
  "=": ["=", "+", "Equal", 187], "[": ["[", "{", "BracketLeft", 219], "]": ["]", "}", "BracketRight", 221],
  "\\": ["\\", "|", "Backslash", 220], ";": [";", ":", "Semicolon", 186], "'": ["'", "\"", "Quote", 222],
  ",": [",", "<", "Comma", 188], ".": [".", ">", "Period", 190], "/": ["/", "?", "Slash", 191],
};
const DIGIT_SHIFTED = ")!@#$%^&*(";
const MODIFIERS = [   // name, key, code, virtual key, CDP modifier bit; pressed in this order
  ["ctrl", "Control", "ControlLeft", 17, 2], ["shift", "Shift", "ShiftLeft", 16, 8],
  ["alt", "Alt", "AltLeft", 18, 1],
];

// The key a character comes from, and whether it takes Shift.
function keyFor(name) {
  if (NAMED[name]) {
    const [code, vk, text] = NAMED[name];
    return { key: name, code, vk, text, shift: false };
  }
  const f = /^F([1-9]|1[0-2])$/.exec(name);
  if (f) return { key: name, code: name, vk: 111 + Number(f[1]), shift: false };
  if (name.length !== 1) throw new Error(`no such key: ${JSON.stringify(name)}`);
  if (/[a-z]/.test(name)) return { key: name, code: `Key${name.toUpperCase()}`, vk: name.toUpperCase().charCodeAt(0), text: name, shift: false };
  if (/[A-Z]/.test(name)) return { key: name, code: `Key${name}`, vk: name.charCodeAt(0), text: name, shift: true };
  if (/[0-9]/.test(name)) return { key: name, code: `Digit${name}`, vk: name.charCodeAt(0), text: name, shift: false };
  const d = DIGIT_SHIFTED.indexOf(name);
  if (d >= 0) return { key: name, code: `Digit${d}`, vk: 48 + d, text: name, shift: true };
  for (const [plain, shifted, code, vk] of Object.values(PUNCTUATION)) {
    if (name === plain) return { key: name, code, vk, text: name, shift: false };
    if (name === shifted) return { key: name, code, vk, text: name, shift: true };
  }
  throw new Error(`no key on a US keyboard types ${JSON.stringify(name)}`);
}

/**
 * Press and release one key, as a keyboard does: each modifier goes down,
 * then the key goes down and up, then the modifiers come up in reverse. The
 * whole press takes a few milliseconds, well inside the 500 ms the IDE allows
 * between an add-in shortcut's key-down and key-up.
 *
 * @param {string} name     a character ("d", "D", "!"), "F1" to "F12", or a
 *                          named key: Enter, Tab, Backspace, Escape, Delete,
 *                          Home, End, PageUp, PageDown, Insert and the arrows
 * @param {object} [mods]   { ctrl, shift, alt }; Shift is added by itself for a
 *                          character that needs it
 */
export async function pressKey(c, name, { ctrl = false, shift = false, alt = false } = {}) {
  const k = keyFor(name);
  const held = MODIFIERS.filter(([m]) => ({ ctrl, shift: shift || k.shift, alt })[m]);
  let bits = 0;
  for (const [, key, code, vk, bit] of held) {
    bits |= bit;
    await c.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: vk,
                                             nativeVirtualKeyCode: vk, modifiers: bits });
  }
  // A key that types something sends its text with the key-down, which is
  // what makes it appear in an input; Ctrl or Alt held means a command, not text.
  const text = k.text !== undefined && !ctrl && !alt ? k.text : undefined;
  const base = { key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk,
                 modifiers: bits };
  await c.send("Input.dispatchKeyEvent", text !== undefined
    ? { ...base, type: "keyDown", text, unmodifiedText: text }
    : { ...base, type: "rawKeyDown" });
  await c.send("Input.dispatchKeyEvent", { ...base, type: "keyUp" });
  for (const [, key, code, vk, bit] of held.slice().reverse()) {
    bits &= ~bit;
    await c.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk,
                                             nativeVirtualKeyCode: vk, modifiers: bits });
  }
}

/**
 * Type text into whatever has the focus, one key press per character, so that
 * every key-down and key-up reaches the page --- an add-in listening for
 * "keyup", as Sample 15's search box does, sees each one. Line breaks are
 * pressed as Enter. Only what a US keyboard types: any other character throws.
 */
export async function typeText(c, text, { delay = 0 } = {}) {
  for (const ch of text.replace(/\r\n/g, "\n")) {
    await pressKey(c, ch === "\n" ? "Enter" : ch);
    if (delay) await sleep(delay);
  }
}

// ------------------------------------------------------------------ tool windows

const TOOL_WINDOWS_JS = `(() => {
  if (typeof toolWindowsById === "undefined") return [];
  return Object.entries(toolWindowsById).map(([id, w]) => {
    const host = w.shadowDom && w.shadowDom.host;
    const r = host ? host.getBoundingClientRect() : null;
    return {
      id, title: w.titleElement ? w.titleElement.textContent : null,
      visible: !!(r && r.width && r.height),
      text: w.bodyElement ? w.bodyElement.innerText : "",
    };
  });
})()`;

/**
 * The add-ins' tool windows: `{ id, title, visible, text }` each, where `id`
 * is the one the add-in gave ToolWindows.Add and `text` is the body's text as
 * rendered. A tool window an add-in created but has not shown is in the list,
 * with `visible` false: its elements exist and have no size.
 */
export const toolWindows = (c) => c.evaluate(TOOL_WINDOWS_JS);

/** One tool window by its id, as toolWindows describes it, or null. */
export async function toolWindow(c, id) {
  return (await toolWindows(c)).find((w) => w.id === id) ?? null;
}

// ------------------------------------------------------------------ list views

/**
 * Every item of a list view, from its data rather than its rows: `{ text,
 * html }` each, in order. A list view (an add-in's "listview" element, or the
 * DEBUG CONSOLE) draws only the rows that fit, so reading its rows returns
 * part of a long list and looks complete. The target is the list view's
 * element, `{ toolWindow, css: "#resultsList" }` for Sample 15's results; null
 * when it is not a list view.
 */
export async function listViewItems(c, target) {
  return c.evaluate(`(() => {
    const e = ${targetJs(target)};
    const lv = e && e.listview;
    if (!lv || !Array.isArray(lv.dataNodes)) return null;
    const d = document.createElement("div");      // never attached, so text is not re-laid out
    return lv.dataNodes.slice(0, lv.itemCount).map((html) => {
      d.innerHTML = html;
      return { text: d.textContent, html };
    });
  })()`);
}

// ------------------------------------------------------------------ message boxes

// Host.ShowMessageBox is drawn in the page, not by Windows: a
// .modalDialogContainer holding a .modalTitleBar (the title, then a close
// button), a .simpleMsgBox with the message, and a .msgBoxButton per button.
const MESSAGE_BOXES_JS = `(() => [...document.querySelectorAll(".modalDialogContainer")]
  .filter((m) => { const r = m.getBoundingClientRect(); return r.width && r.height; })
  .map((m) => {
    const bar = m.querySelector(".modalTitleBar");
    const body = m.querySelector(".simpleMsgBox");
    return {
      title: bar ? [...bar.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent)
        .join("").trim() : null,
      text: body ? body.innerText : m.innerText,
      buttons: [...m.querySelectorAll(".msgBoxButton")].map((b) => b.textContent.trim()),
    };
  }))()`;

/**
 * The message boxes open in the IDE, the one on top last: `{ title, text,
 * buttons }` each. An add-in's Host.ShowMessageBox is one, and so are the
 * IDE's own modal dialogs, whose `text` is then the whole dialog's.
 */
export const messageBoxes = (c) => c.evaluate(MESSAGE_BOXES_JS);

/** Click a button of the message box on top, by its caption. */
export const answerMessageBox = (c, caption) =>
  click(c, { css: ".modalDialogContainer .msgBoxButton", text: caption, last: true });

/**
 * The notifications showing now, as their text. Host.ShowNotification draws
 * one in a box of the page's own, one of three fixed ones, #msgBox1 to
 * #msgBox3, each with its text in a .msgBoxText.
 */
export const notifications = (c) => c.evaluate(`[...document.querySelectorAll(".msgBoxText")]
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height; })
  .map((e) => e.innerText)`);

// ------------------------------------------------------------------ side effects

/**
 * The URLs the add-ins asked to open, in order. Under the harness an add-in
 * starts no browser: ADDIN_TEST_ENV (tb-ide.mjs) is set, and the add-in prints
 * `open <url>` to the DEBUG CONSOLE instead. A URL holds no white space, so a
 * line that only begins with the word is not taken for one.
 *
 * @param {object} [o]
 * @param {object} [o.since]  a mark from consoleMark in tb-ide.mjs: only what
 *                            was printed after it
 */
export async function openedUrls(c, { since = null } = {}) {
  const text = await readConsole(c, { since });
  return (text ?? "").split("\n").map((l) => /^open (\S+)$/.exec(l.trim())).filter(Boolean)
    .map((m) => m[1]);
}

// ------------------------------------------------------------------ the code editor

// The IDE has one Monaco code editor, window.editor, and gives it the model of
// whichever file's tab is selected; openEditors.selectedEditorNode is that
// tab, and its name is the file's path in the project.
// monaco.editor.getEditors() is no substitute: it also returns the editors
// add-ins create.
const EDITOR_JS = `(() => {
  const ed = typeof editor === "undefined" ? null : editor;
  const m = ed && ed.getModel ? ed.getModel() : null;
  if (!m) return null;
  const tab = typeof openEditors === "undefined" ? null : openEditors.selectedEditorNode;
  const p = ed.getPosition(), s = ed.getSelection();
  return {
    file: tab && tab.type === "CodeEditor" ? tab.name : null,
    line: p.lineNumber, column: p.column,
    selection: { startLine: s.startLineNumber, startColumn: s.startColumn,
                 endLine: s.endLineNumber, endColumn: s.endColumn },
    selectedText: m.getValueInRange(s), lineText: m.getLineContent(p.lineNumber),
    lines: m.getLineCount(), focused: ed.hasTextFocus(),
  };
})()`;

/**
 * Where the code editor stands: `{ file, line, column, selection, selectedText,
 * lineText, lines, focused }`, lines and columns counted from 1 as the IDE
 * shows them, `file` the path in the project ("/<Project>/Sources/<file>") or
 * null when no code file's tab is selected. Null when there is no editor.
 */
export const editorState = (c) => c.evaluate(EDITOR_JS);

/** The whole text of the file in the code editor. */
export const editorText = (c) => c.evaluate(
  "typeof editor !== 'undefined' && editor.getModel() ? editor.getModel().getValue() : null");

// How long the IDE may still put the cursor back where it last revealed a
// line, in milliseconds. Opening a file at a place calls revealLineInEditor,
// and whenever the compiler's decorations for the document arrive less than
// 700 ms after the last such call, parseDocumentDecorations calls it again:
// the cursor goes back to that place, and the 700 ms start over (main.js,
// BETA 983). Every edit brings new decorations. Measured: with Haystack.twin
// opened at 4:9, the cursor moved to 3:1 and "xyz" typed a key every 150 ms,
// "x" went in at 3:1 and "y" and "z" both at 4:9, as "zy". A time the IDE has
// cleared (undefined) never matches, and neither does its starting 0.
const REVEAL_LEFT_JS = `typeof revealedLineTime !== "number" || !revealedLineTime ? 0
  : Math.max(0, 700 - (performance.now() - revealedLineTime))`;

/**
 * Wait until the IDE can no longer put the cursor back where it last opened a
 * file (REVEAL_LEFT_JS says why): 700 ms after its last reveal. openFile,
 * setCursor and select wait for it themselves; call it before typing into the
 * code editor after anything else that opens a file at a place, such as an
 * add-in's Editors.Open. Returns false when reveals were still going on after
 * `timeout` milliseconds.
 */
export async function afterReveal(c, { timeout = 10 * 1000 } = {}) {
  const until = Date.now() + timeout;
  for (;;) {
    const left = await c.evaluate(REVEAL_LEFT_JS);
    if (!left) return true;
    if (Date.now() >= until) return false;
    await sleep(left + 50);
  }
}

/**
 * Open a file of the project in the code editor, with the cursor at a place,
 * the way the IDE's own Find in Files results do it. The path is the file's in
 * the project, "/<Project>/Sources/<file>", with or without "twinbasic:" in
 * front. Throws when the project has no such file.
 *
 * Returns once the cursor is at that place for good. A file not open yet is
 * read from the compiler first, and the IDE calls openFile's eighth argument
 * once it has been; then the IDE may still put the cursor back there for 700 ms
 * (afterReveal), which would undo a setCursor made in the meantime.
 */
export async function openFile(c, file, { line = 1, column = 1 } = {}) {
  const uri = file.startsWith("twinbasic:") ? file : `twinbasic:${file}`;
  const r = await c.evaluate(`new Promise((resolve) => {
    const node = fs.tree.resolvePath(${JSON.stringify(uri)});
    if (!node) return resolve("missing");
    setTimeout(() => resolve("timeout"), 10000);
    openEditors.openFile(node, false, false, false, ${Number(line)}, ${Number(column)}, undefined,
                         () => resolve("open"));
  })`, { awaitPromise: true });
  if (r === "missing") throw new Error(`the project has no file ${file}`);
  if (r !== "open") throw new Error(`the IDE did not report ${file} open within 10 s`);
  await afterReveal(c);
}

/**
 * Put the code editor's cursor at a line and column, and give it the focus.
 * Waits for afterReveal first, so that the IDE cannot put it back.
 */
export async function setCursor(c, line, column) {
  await afterReveal(c);
  await c.evaluate(`(() => {
    const p = { lineNumber: ${Number(line)}, column: ${Number(column)} };
    editor.setPosition(p);
    editor.revealPositionInCenter(p);
    editor.focus();
  })()`);
}

/**
 * Select a range in the code editor and give it the focus; the cursor ends at
 * the range's end. Waits for afterReveal first, as setCursor does.
 */
export async function select(c, { startLine, startColumn, endLine, endColumn }) {
  await afterReveal(c);
  await c.evaluate(`(() => {
    editor.setSelection({ startLineNumber: ${Number(startLine)}, startColumn: ${Number(startColumn)},
                          endLineNumber: ${Number(endLine)}, endColumn: ${Number(endColumn)} });
    editor.revealLineInCenter(${Number(endLine)});
    editor.focus();
  })()`);
}

// ------------------------------------------------------------------ waiting

/**
 * Wait until a condition over the page holds: `check` is called with the
 * connection until it returns something truthy, which is returned. Null when
 * the time runs out.
 */
export async function waitFor(c, check, { timeout = 10 * 1000, interval = 200 } = {}) {
  const until = Date.now() + timeout;
  for (;;) {
    const v = await check(c);
    if (v) return v;
    if (Date.now() >= until) return null;
    await sleep(interval);
  }
}
