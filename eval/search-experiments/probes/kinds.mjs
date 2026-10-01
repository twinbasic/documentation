// Every symbol written as its name and its kind ("MaxHeight property",
// "Continue statement"), for the kinds the client counts as kind words,
// ranked with the replica under the current EXP; writes {query: rank} to
// argv[2]. A query counts any symbol of that name and kind, and any section
// of a page that documents one (as intent-3 counts them).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const { load, search, KIND_WORDS } = await import(new URL("../../site_search.mjs", import.meta.url));
const site = path.join(ROOT, "docs/_site");
const ctx = load(site);
const sym = JSON.parse(fs.readFileSync(path.join(site, "tB/symbols.json"), "utf8")).symbols;
const norm = (u) => {
  let [p, a] = u.split("#");
  p = p.replace(/\/index(\.html)?$/i, "").replace(/\/+$/, "") || "/";
  return a ? `${p}#${a}` : p;
};
const byQuery = new Map();
for (const s of sym) {
  if (!KIND_WORDS.includes(s.kind) || !/\w/.test(s.name)) continue;
  const q = `${s.name} ${s.kind}`;
  if (!byQuery.has(q)) byQuery.set(q, new Set());
  byQuery.get(q).add(norm(s.url));
}
const counts = (exp, url) => exp.has(url) || [...exp].some((e) => !e.includes("#") && url.startsWith(`${e}#`));
const out = {};
const byKind = {};
for (const [q, exp] of byQuery) {
  const r = search(ctx, q);
  let rank = null;
  for (let i = 0; i < r.length && i < 50; i++)
    if (counts(exp, norm(ctx.docs[r[i].ref].relUrl))) {
      rank = i + 1;
      break;
    }
  out[q] = rank;
  const k = (byKind[q.split(" ").pop()] ||= { n: 0, hit1: 0, top10: 0, none: 0 });
  k.n++;
  if (rank === 1) k.hit1++;
  if (rank && rank <= 10) k.top10++;
  if (!rank) k.none++;
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
const all = Object.values(byKind).reduce(
  (a, k) => ({ n: a.n + k.n, hit1: a.hit1 + k.hit1, top10: a.top10 + k.top10, none: a.none + k.none }),
  { n: 0, hit1: 0, top10: 0, none: 0 },
);
console.log(
  `kinds: ${all.n} queries, hit@1 ${((100 * all.hit1) / all.n).toFixed(2)}%, top 10 ${((100 * all.top10) / all.n).toFixed(2)}%, not in the top 50 ${all.none}`,
);
console.table(byKind);
