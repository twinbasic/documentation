// Two throwaway sets, ranked with the replica under the current EXP:
//  titles:   every page's own title, 2+ words, typed as is -> any entry of that page
//  sections: "<page title> <section title>" for one-word section titles that
//            several pages share (Events, Methods, Properties...) -> that section
// Writes {set:{query:rank}} to argv[2].
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const R = fileURLToPath(new URL("../../../", import.meta.url)).replaceAll("\\", "/");
const { load, search } = await import(new URL("../../site_search.mjs", import.meta.url));
const ctx = load(R + "docs/_site");
const docs = Object.values(ctx.docs);
const path = (u) => u.split("#")[0].replace(/\/(index(\.html)?)?$/, "");
const rank = (q, ok) => {
  const r = search(ctx, q);
  for (let i = 0; i < r.length && i < 50; i++) if (ok(ctx.docs[r[i].ref].relUrl)) return i + 1;
  return null;
};
const out = { titles: {}, sections: {} };
const pages = new Map();
for (const d of docs) if (!d.relUrl.includes("#")) pages.set(path(d.relUrl), d.doc);
const seenT = new Map();
for (const [p, t] of pages) {
  if (t.trim().split(/\s+/).length < 2) continue;
  const k = t.toLowerCase();
  if (!seenT.has(k)) seenT.set(k, new Set());
  seenT.get(k).add(p);
}
for (const [, ps] of seenT) {
  const t = [...pages].find(([p]) => ps.has(p))[1];
  out.titles[t] = rank(t, (u) => ps.has(path(u)));
}
const count = new Map();
for (const d of docs)
  if (d.relUrl.includes("#") && /^\w+$/.test(d.title)) count.set(d.title, (count.get(d.title) || 0) + 1);
const generic = new Set([...count].filter(([, n]) => n >= 20).map(([t]) => t));
for (const d of docs) {
  if (!d.relUrl.includes("#") || !generic.has(d.title) || d.names) continue;
  const q = `${d.doc} ${d.title}`;
  if (out.sections[q] !== undefined) continue;
  out.sections[q] = rank(q, (u) => u === d.relUrl);
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
for (const s of ["titles", "sections"]) {
  const v = Object.values(out[s]);
  console.log(
    `${s}: ${v.length}, hit@1 ${((100 * v.filter((x) => x === 1).length) / v.length).toFixed(1)}%, hit@3 ${((100 * v.filter((x) => x && x <= 3).length) / v.length).toFixed(1)}%`,
  );
}
console.log("generic section titles:", [...generic].join(" "));
