// Intent-aware ground truth for bare-name symbol queries.
//
// Rules (from the task): for a bare name, the reader wants ONE of these,
// in priority order:
//   1. TYPE   - if the name is itself a type (class/module/interface/enum/
//               control/object/type/package), that type's page wins over
//               any member of another type that happens to share the name.
//   2. CORE   - if the name is a core language element: a statement,
//               keyword, operator, attribute or directive (these all have
//               package === null, confirmed against tB/symbols.json), OR a
//               function/property/sub/method whose container is itself a
//               *module* (kind 'module'), e.g. VBA's Strings.Left,
//               DateTime.Time$ -- an intrinsic, not a per-control member.
//               NOTE: this deliberately does NOT extend to a *class*'s
//               members (e.g. VBA.Collection.Add): Collection is a class
//               (a type), and Add is an ordinary member of it, same as any
//               control's method -- ambiguity there falls through to (3).
//   3. MEMBER - name exists only as a member (PaintPicture, Caption): any
//               documenting URL counts, as today. No basis to prefer one
//               class over another.
//   4. ENUM   - enum constants (kind 'enumvalue'): the symbol's own `url`
//               already points at the container enum's page, so this is
//               really the same as (3) with a single, unambiguous answer.
//
// Priority when a name has candidates in more than one tier: TYPE beats
// CORE beats ENUM beats MEMBER (matches the task's own ordering; a
// name is a type before it's a language element, e.g. no observed
// conflicts either way in this corpus).

import fs from "node:fs";
import path from "node:path";

const TYPE_KINDS = new Set(["class", "module", "interface", "enum", "control", "object", "type", "package"]);
const CORE_ONLY_KINDS = new Set(["statement", "keyword", "operator", "attribute", "directive"]);
const MODULE_MEMBER_KINDS = new Set(["function", "property", "sub", "method"]);

function normalizeUrl(u) {
  if (!u) return u;
  const hashIdx = u.indexOf("#");
  let pathPart = hashIdx === -1 ? u : u.slice(0, hashIdx);
  const anchor = hashIdx === -1 ? "" : u.slice(hashIdx + 1);
  pathPart = pathPart.replace(/\/index(\.html)?$/i, "");
  pathPart = pathPart.replace(/\/+$/, "");
  if (pathPart === "") pathPart = "/";
  return anchor ? `${pathPart}#${anchor}` : pathPart;
}

export function buildIntentGroundTruth(symbols) {
  // container name (lowercased) -> kind, for every TYPE-kind symbol that is
  // itself a container (class/module/interface/control/enum...).
  const containerKind = new Map();
  for (const s of symbols) {
    if (TYPE_KINDS.has(s.kind)) containerKind.set(s.name.toLowerCase(), s.kind);
  }

  const byName = new Map();
  for (const s of symbols) {
    const k = s.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(s);
  }

  const tierCounts = { type: 0, core: 0, enum: 0, member: 0 };
  const doubtful = [];
  const queries = [];

  for (const [, group] of byName) {
    const typeCands = group.filter((s) => TYPE_KINDS.has(s.kind));
    const coreCands = group.filter((s) => {
      if (CORE_ONLY_KINDS.has(s.kind)) return s.package === null;
      if (MODULE_MEMBER_KINDS.has(s.kind) && s.container) {
        return containerKind.get(s.container.toLowerCase()) === "module";
      }
      return false;
    });
    const enumCands = group.filter((s) => s.kind === "enumvalue");

    let tier, chosen;
    if (typeCands.length) {
      tier = "type"; chosen = typeCands;
      if (coreCands.length || enumCands.length) {
        doubtful.push({ name: group[0].name, tier, reason: "also has core/enum candidates, type wins", group });
      }
    } else if (coreCands.length) {
      tier = "core"; chosen = coreCands;
    } else if (enumCands.length) {
      tier = "enum"; chosen = enumCands;
    } else {
      tier = "member"; chosen = group;
    }
    tierCounts[tier]++;

    // Flag names where a strict tier still leaves >1 *different pages*
    // (ambiguous even within its own tier) -- worth listing as doubtful.
    const distinctUrls = new Set(chosen.map((s) => normalizeUrl(s.url).split("#")[0]));
    if (tier !== "member" && distinctUrls.size > 1) {
      doubtful.push({ name: group[0].name, tier, reason: `${distinctUrls.size} distinct pages within tier ${tier}`, group: chosen });
    }

    queries.push({
      category: "symbol-bare-intent",
      q: group[0].name,
      tier,
      expected: [...new Set(chosen.map((s) => normalizeUrl(s.url)))],
    });
  }

  return { queries, tierCounts, doubtful };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const site = process.argv[2] || "docs/_site";
  const symIdx = JSON.parse(fs.readFileSync(path.join(site, "tB/symbols.json"), "utf8"));
  const { queries, tierCounts, doubtful } = buildIntentGroundTruth(symIdx.symbols);
  console.log("tier counts:", tierCounts, "total names:", queries.length);
  console.log("doubtful (first 30):");
  for (const d of doubtful.slice(0, 30)) {
    console.log(` - ${d.name} [${d.tier}] ${d.reason}`);
  }
  console.log("doubtful total:", doubtful.length);
}
