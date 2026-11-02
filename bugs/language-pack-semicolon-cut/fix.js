// Fix for language-pack-semicolon-cut: a ";" followed by a space or a tab ends a language pack's
// value only outside its quotes, so a string with "; " in it is read whole. A ";" that ends its
// line ends the value as before, quotes or not, and the next value starts outside quotes, so the
// shipped packs that leave a quote unclosed before an end-of-line ";" read as they do now.
// Written on BETA 1034; the local names are ours (scripts/ide-js/names.json), not twinBASIC's.
// Applied with `node scripts/ide_js.mjs patch bugs/language-pack-semicolon-cut/fix.js --copy-to <dir>`.
function applyLanguagePack(packName) {
  if (packName === undefined) packName = "en-gb";
  var pack = customLanguages.find((language) => language.name.toLowerCase() == packName.toLowerCase());
  if (!pack) {
    if (packName !== "en-gb") {
      applyLanguagePack("en-gb");
    }
    return;
  }
  if (pack.inheritsFrom) {
    applyLanguagePack(pack.inheritsFrom);
  } else {
    if (packName !== "en-gb") {
      applyLanguagePack("en-gb");
    }
  }
  if (pack && pack.text) {
    var packText = pack.text + "\r\n";
    packText = packText.replace(/\/\*[\s\S]*?\*\//g, "");
    var entries = [];
    var entryStart = 0;
    var inQuotes = false;
    var lineEnd = /[ \t]*\r?\n/y;
    for (let index = 0; index < packText.length; index++) {
      const character = packText[index];
      if (character === '"') {
        inQuotes = !inQuotes;
      } else if (character === ";") {
        lineEnd.lastIndex = index + 1;
        const next = packText[index + 1];
        if (lineEnd.test(packText) || (!inQuotes && (next === " " || next === "\t"))) {
          entries.push(packText.slice(entryStart, index));
          entryStart = index + 1;
          inQuotes = false;
        }
      }
    }
    entries.push(packText.slice(entryStart));
    entries.forEach((entry) => {
      let colon = entry.indexOf(":");
      if (colon !== -1) {
        var key = entry.slice(0, colon).trim();
        var value = entry.slice(colon + 1);
        key = key.replace(/^[ \t]+/, "");
        activeLanguageData[key] = parseQuotedString2(value);
      }
    });
  }
}
