// Reading the DEBUG CONSOLE of a twinBASIC IDE reached over CDP: all of it,
// what was written since a mark, and what each clear erased. tb-ide.mjs's
// buildProject reads the build log through it.

// Read the DEBUG CONSOLE's BACKING ARRAY, never the pane. `debugConsoleContent`
// is a createListView(), which renders only the rows that fit -- so an
// `.innerText` scrape returned the last ~11 lines of any longer probe and gave
// no sign that it had. `dataNodes` is the complete log: addItem() appends at
// `itemCount` and nothing in main.js ever removes an entry, so the array holds
// every line written since the last clear().
//
// The walk below is the IDE's own `tbDebugConsole_ClipboardCopyAll`, minus the
// clipboard write -- the same borrow tb-ide.mjs's BUILD_STATE_JS makes for the diagnostics
// report. Each entry is `<span class=COLOR><span class=ts>TIME</span>TEXT</span>`,
// so slicing past the first `</span>` drops the timestamp, which is what the
// IDE's own two Copy All variants differ by. Note that the timestamp is always
// present in the data: the pane's "Show Timestamps" option only sets a
// `--timestampsDisplay` CSS variable, so it cannot change what is read here.
//
// Two deliberate departures from the IDE's version:
//
//   * DECODE WITH textContent ON OUR OWN DETACHED NODE, not the IDE's
//     HTMLToTEXT. That helper reads `.innerText` off a shared `hiddenDiv`, and
//     it preserves runs of spaces only because `initMisc()` creates that div
//     with no parent -- an element that is not rendered has innerText ===
//     textContent. Attach it in some future build and every padded value a
//     probe prints starts collapsing silently. Probes measure things like
//     Debug.Print zone widths and Partition's space-padded labels, so that is
//     the one thing this reader must not get wrong.
//   * TOLERATE A MISSING TIMESTAMP SPAN. indexOf returns -1 when there is
//     none, and the IDE's `substr(i + 7)` would then quietly eat six
//     characters of real output. No current addItem() path omits it; the guard
//     costs a comparison and removes a silent-corruption mode.
//
// An entry's text is stored escaped: an add-in's PrintText of "<b>&copy=1"
// is stored as "&lt;b&gt;&amp;copy=1" (measured, BETA 983), so decoding gives
// back exactly what was printed, markup and ampersands included. Except for
// the IDE's own bug (twinbasic/twinbasic#2444): text that continues a line left open
// by `Debug.Print ...;` is escaped twice, so the console shows "&amp;" for
// "&", and so does this reader. It returns what the console shows.
//
// A mark (consoleMark) is checked in the same evaluate as the read, so a
// clear cannot fall between the two. The entry that was last when the mark
// was taken is read again as well, because the IDE can still add to it. All
// output from the compiler's process, a program's Debug.Print and an add-in's
// PrintText alike, goes through debugOutputPartial, which appends to the last
// entry in place while its line is open; output ending in a line break closes
// the line, and so does the IDE's own debugOutputLine, which starts a new
// entry. So what was appended comes first, as a line of its own, and then the
// entries after it. Reading on from the count alone missed that text
// (measured).
const consoleJs = (withTimestamps, from, mark) => `(() => {
  if (typeof debugConsoleContent === "undefined" || !debugConsoleContent ||
      !debugConsoleContent.dataNodes) return null;
  const nodes = debugConsoleContent.dataNodes;
  const mark = ${JSON.stringify(mark ?? null)};
  const start = !mark ? ${from}
    : nodes.length < mark.n || (mark.n > 0 && nodes[0] !== mark.first) ? 0 : mark.n;
  const decode = (html) => {
    const d = document.createElement("div");   // never attached; see above
    d.innerHTML = html;
    return d.textContent;
  };
  const text = (n) => {
    const i = n.indexOf("</span>");
    if (i < 0) return decode(n);
    return decode(${withTimestamps}
      ? n.substr(0, i + 7) + " " + n.substr(i + 7)
      : n.substr(i + 7));
  };
  const lines = nodes.slice(start).map(text);
  // Appended text, if the last entry at the mark has grown since. Closing an
  // open line adds only markup, so an unchanged text adds no line.
  if (mark && "last" in mark && start === mark.n && mark.n > 0 && nodes[mark.n - 1] !== mark.last) {
    const was = mark.last === null ? "" : text(mark.last), now = text(nodes[mark.n - 1]);
    const added = now.startsWith(was) ? now.slice(was.length) : now;
    if (added) lines.unshift(added);
  }
  return lines.join("\\n");
})()`;

/**
 * The DEBUG CONSOLE as text, one line per entry; null when this IDE has no
 * `debugConsoleContent.dataNodes` to read.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {object} [o]
 * @param {boolean} [o.timestamps]    keep each entry's timestamp column
 * @param {number} [o.from]           start at this entry instead of the first
 * @param {object} [o.since]          a mark from consoleMark: only what was
 *                                    written after it --- text appended to the
 *                                    entry that was last then, and the entries
 *                                    after it --- or every entry if the
 *                                    console was cleared since. Wins over `from`.
 */
export const readConsole = (c, { timestamps = false, from = 0, since = null } = {}) =>
  c.evaluate(consoleJs(timestamps, Number(from), since));

// Where the console stands: how many entries it holds, and its first and last
// entries as stored, timestamp and all. Nothing removes an entry but a clear,
// so entries read later from index `n` on are new -- unless the first entry
// has changed or the count has fallen, which means the console was cleared in
// between and all of it is new. The last entry is kept because the IDE may
// still append to it (consoleJs says when).
const CONSOLE_MARK_JS = `(() => {
  const d = typeof debugConsoleContent === "undefined" || !debugConsoleContent
    ? null : debugConsoleContent.dataNodes;
  return d ? { n: d.length, first: d.length ? d[0] : null,
               last: d.length ? d[d.length - 1] : null } : null;
})()`;

/**
 * Where the DEBUG CONSOLE stands now, so that `readConsole(c, { since })` can
 * later return only what was written after it. Null when this IDE has no
 * console to read.
 */
export const consoleMark = (c) => c.evaluate(CONSOLE_MARK_JS);

/**
 * The DEBUG CONSOLE's lines since a mark, each trimmed: readConsole's text,
 * split. A console that is empty, or that this IDE does not have, gives one
 * empty line.
 *
 * @param {object} c                  a tb-cdp connection
 * @param {object | null} [mark]      a mark from consoleMark; null reads every line
 * @param {object} [o]
 * @param {string} [o.prefix]         only the lines that start with this, without it
 * @returns {Promise<string[]>}
 */
export async function linesSince(c, mark = null, { prefix } = {}) {
  const lines = ((await readConsole(c, { since: mark })) ?? "").split("\n").map((l) => l.trim());
  return prefix === undefined ? lines : lines.filter((l) => l.startsWith(prefix)).map((l) => l.slice(prefix.length));
}

// What each clear erased. The page's global clearDebugConsole() empties the
// console, and BETA 983's main.js calls it by name from the compiler's
// event_clearDebugConsole, which a program's Debug.Cls raises, from the pane's
// Clear command, and on closing the project. So a wrapper assigned to that
// global sees each of those clears, and reads the console as readConsole does,
// without timestamps, before letting it go. A page is wrapped once: a second
// call finds the record already there and leaves it alone.
const KEEP_CLEARS_JS = `(() => {
  if (typeof clearDebugConsole !== "function") return false;
  if (!Array.isArray(window.__tbKeptClears)) {
    const clear = clearDebugConsole;
    window.__tbKeptClears = [];
    clearDebugConsole = function () {
      window.__tbKeptClears.push(${consoleJs(false, 0, null)} ?? "");
      return clear.apply(this, arguments);
    };
  }
  return true;
})()`;

/**
 * Keep what each later clear of the DEBUG CONSOLE erases, for keptClears.
 * False when this IDE has no global `clearDebugConsole()` to wrap.
 */
export const keepClears = (c) => c.evaluate(KEEP_CLEARS_JS);

/**
 * What each clear since keepClears erased, oldest first: one string per clear,
 * one line per entry, as readConsole returns them. Null when this page keeps
 * no such record.
 */
export const keptClears = (c) => c.evaluate(`Array.isArray(window.__tbKeptClears) ? window.__tbKeptClears : null`);
