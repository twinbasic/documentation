// The words a published picture must not show: the Chrome extension (chrome/) masks them in the
// page before it takes a picture, and chromeshot.mjs and replay.mjs refuse an SVG that holds one.
// Runs in Node and in the extension, so it imports nothing; which words there are on this
// machine is private-list.mjs's.
//
// A word's entry is {find, show}: `find` is searched for in any case, and `show` is what the
// picture says in its place. The list is in scripts/svgshot/private.json, which git ignores.

/**
 * The entries of a private.json's `words` as the tools use them: each checked, the longest
 * first, so that an e-mail address is replaced whole and not by way of the name in it. Throws
 * on an entry with no `find`, or whose `show` holds a word of the list: a mask that left a word
 * in the page would be refused at every capture.
 */
export function wordList(raw) {
  if (!Array.isArray(raw)) throw new Error("`words` is not a list");
  const list = raw.map((w) => {
    if (typeof w?.find !== "string" || !w.find.trim()) throw new Error("a word has no `find`");
    if (typeof w.show !== "string") throw new Error(`the word ${w.find} has no \`show\``);
    return { find: w.find, show: w.show };
  });
  for (const w of list) {
    const held = list.find((o) => w.show.toLowerCase().includes(o.find.toLowerCase()));
    if (held) throw new Error(`the stand-in for ${w.find} holds ${held.find}`);
  }
  return list.toSorted((a, b) => b.find.length - a.find.length);
}

/** `text` without its private words: each replaced by its stand-in, in any case. */
export function maskText(text, list) {
  if (!list.length) return text;
  const lower = text.toLowerCase();
  if (!list.some((w) => lower.includes(w.find.toLowerCase()))) return text;
  let out = text;
  for (const { find, show } of list) {
    const low = find.toLowerCase();
    for (let at = out.toLowerCase().indexOf(low); at >= 0; at = out.toLowerCase().indexOf(low, at + show.length))
      out = out.slice(0, at) + show + out.slice(at + find.length);
  }
  return out;
}

/**
 * The words of `words` (strings) that `text` holds, ignoring case. The search skips base64
 * payloads (fonts, images), in which four given letters turn up by chance often enough to
 * fail runs.
 */
export function heldWords(text, words) {
  const plain = text.replace(/;base64,[A-Za-z0-9+/=]+/g, ";base64,").toLowerCase();
  return words.filter((w) => plain.includes(w.toLowerCase()));
}

/** Whether `svg` holds `user` (the Windows user name), ignoring case and base64 payloads. */
export const holdsUserName = (svg, user) => heldWords(svg, [user]).length > 0;

/**
 * Every string of a bundle's snapshot that can be drawn: what layout holds as text (a run, a
 * pseudo-element's content), a field's value, and an option's text, which a closed <select>
 * draws. Each document's, in the whole of what the snapshot keeps (bundle.mjs's trimSnapshot),
 * which is more than the clip.
 */
export function drawnStrings({ snapshot }) {
  const S = snapshot.strings;
  const out = new Set();
  const add = (i) => {
    if (i >= 0) out.add(S[i]);
  };
  for (const { layout, nodes } of snapshot.documents) {
    for (const i of layout.text) add(i);
    for (const rare of [nodes.inputValue, nodes.textValue]) for (const i of rare?.value ?? []) add(i);
    for (const [n, parent] of nodes.parentIndex.entries())
      if (parent >= 0 && S[nodes.nodeName[parent]] === "OPTION") add(nodes.nodeValue[n]);
  }
  return [...out];
}

/** The words of `words` (strings) that the bundle draws (drawnStrings). */
export const drawnWords = (bundle, words) => heldWords(drawnStrings(bundle).join("\n"), words);

/**
 * `value` (a bundle, or a part of one) with the private words of every string in it replaced,
 * but for the members named in `skip`: what a mask cannot reach and no picture draws, such as a
 * link's address and a <meta> of the page, is then not kept either. A font's bytes are skipped:
 * they are no text.
 */
export function scrubBundle(value, list, skip = new Set(["fontFiles"])) {
  if (typeof value === "string") return maskText(value, list);
  if (Array.isArray(value)) return value.map((v) => scrubBundle(v, list, skip));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, skip.has(k) ? v : scrubBundle(v, list, skip)]));
}
