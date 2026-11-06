// Which of a web font's @font-face rules draws a run of text: what capture.mjs asks when it
// keeps a font's files and fonts.mjs when it gives each character to a face. Runs in Node and
// in the Chrome extension (chrome/), so it imports nothing.

/**
 * The code point ranges of a `unicode-range` descriptor, as [from, to] pairs:
 * "U+0-FF, U+131, U+4??". A descriptor that is empty, or has a token that is no
 * range, is every code point: an invalid descriptor is ignored, and its initial
 * value is U+0-10FFFF.
 */
export function parseUnicodeRange(text) {
  const all = [[0, 0x10ffff]];
  if (!text?.trim()) return all;
  const out = [];
  for (const token of text.split(",")) {
    const m = /^\s*u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?\s*$/i.exec(token);
    if (!m || (m[2] !== undefined && m[1].includes("?"))) return all;
    if (m[1].includes("?"))
      out.push([Number.parseInt(m[1].replace(/\?/g, "0"), 16), Number.parseInt(m[1].replace(/\?/g, "f"), 16)]);
    else out.push([Number.parseInt(m[1], 16), Number.parseInt(m[2] ?? m[1], 16)]);
  }
  return out;
}

/**
 * Of the @font-face rules of one family and one style and weight, `rules` in
 * the order the page declares them ({range, ...}, `range` the rule's
 * unicode-range text), the ones a browser may draw `text` with: for each
 * character, every rule whose range holds it. A browser tries them from the last
 * declared, and a file with no glyph for the character passes it to the rule
 * before (CSS Fonts 4, the composite face): the IDE declares codicon twice, its
 * own codicon.ttf and then Monaco's, which has no coffee cup, and Chromium draws
 * the cup from the IDE's. A character no rule holds is drawn in the next family
 * of the list, which is not a web font. Later rules come first, so that a
 * character both files have goes to the later, as PictureFonts.css gives it to
 * the first face that has it.
 */
export function webRulesFor(rules, text) {
  const ranges = rules.map((r) => parseUnicodeRange(r.range));
  const chosen = new Set();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    for (let i = rules.length - 1; i >= 0; i--) {
      if (ranges[i].some(([from, to]) => cp >= from && cp <= to)) chosen.add(i);
    }
  }
  return [...chosen].sort((a, b) => b - a).map((i) => rules[i]);
}
