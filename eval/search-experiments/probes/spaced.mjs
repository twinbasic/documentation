// Every qualified symbol written as two words ("Printer Fonts"), ranked with
// the replica under the current EXP; writes {query: rank} to argv[2].
// Also prints the top three for a few probes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const { load, search } = await import(new URL("../../site_search.mjs", import.meta.url));
const site = path.join(ROOT, "docs/_site");
const ctx = load(site);
const sym = JSON.parse(fs.readFileSync(path.join(site, "tB/symbols.json"), "utf8")).symbols;
const norm = (u) => {
  let [p, a] = u.split("#");
  p = p.replace(/\/index(\.html)?$/i, "").replace(/\/+$/, "") || "/";
  return a ? `${p}#${a}` : p;
};
const byPair = new Map();
for (const s of sym) {
  if (!s.container) continue;
  const k = `${s.container} ${s.name}`.toLowerCase();
  if (!byPair.has(k)) byPair.set(k, { q: `${s.container} ${s.name}`, exp: new Set() });
  byPair.get(k).exp.add(norm(s.url));
}
const out = {};
let hit1 = 0;
for (const { q, exp } of byPair.values()) {
  const r = search(ctx, q);
  let rank = null;
  for (let i = 0; i < r.length && i < 50; i++)
    if (exp.has(norm(ctx.docs[r[i].ref].relUrl))) {
      rank = i + 1;
      break;
    }
  out[q] = rank;
  if (rank === 1) hit1++;
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log(`spaced: ${byPair.size} queries, hit@1 ${((100 * hit1) / byPair.size).toFixed(2)}%`);
const probes = [
  "Form events",
  "ListView events",
  "TextBox properties",
  "Printer object",
  "DTPicker format",
  "Slider value",
  "FileListBox Name",
  "Debug Print",
  "Printer Fonts",
  "Printer Font",
  "Collection Item",
  "Fonts property",
  "Item method",
  "File I/O",
  "error handling",
  "With statement",
  "New Functions",
];
for (const p of probes) {
  const r = search(ctx, p)
    .slice(0, 3)
    .map((x) => ctx.docs[x.ref].relUrl);
  console.log(`${p.padEnd(20)} ${r.join("  ")}`);
}
