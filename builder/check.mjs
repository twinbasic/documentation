// The link check, folded into the build.
//
// `tbdocs --src docs --check` reaches the same conclusions
// scripts/check_links.mjs does, against the HTML the build already has
// in worker memory rather than against 230 MB read back off disk. The
// two front ends share builder/link-check.mjs; this module is only the
// build-side plumbing:
//
//   deriveTreeRels()  what each output tree receives, from the build's
//                     own records rather than a directory walk.
//   checkChunk()      runs on a worker, inside flush(), on HTML that is
//                     already decoded and in the lane's memory.
//   joinChunks()      merges the chunks on main, settles the fragment
//                     references no single chunk could decide, and runs
//                     the three cross-file checks.
//   formatReport()    the human-readable report and the exit code.
//
// Two properties make replacing the filesystem with an index sound
// rather than merely faster:
//
//   1. prepareDestinations() wipes _site/, _site-offline/ and _site-pdf/
//      before the build writes a byte, so nothing survives from a
//      previous run. An index built from what the build emitted is
//      complete, not an approximation.
//   2. Both CI workflows run the checks immediately after the build, in
//      the same job. There is no build that would start paying for a
//      check it does not already pay for.
//
// What a check task must never do is abort the graph. A broken link
// still produces a valid site you want on disk to look at, so failures
// are collected and reported; only the exit code changes.

import * as path from "node:path";

import {
  extractFromHtml, resolveOccurrences, settleFragments,
  buildTreeIndex, IndexOracle, normalizeBasePath,
  checkSitemap, checkSearch, checkCanonical,
  formatLinkReport, formatIntegrityReport,
} from "./link-check.mjs";
import { posix } from "./check-tree.mjs";

export { deriveTreeRels } from "./check-tree.mjs";
export { normalizeBasePath };

// The three passes, verbatim from check.bat. Fusion must not quietly
// unify them: the online tree has a sitemap and a search index and the
// offline tree has neither, the offline tree is the only one that
// forbids live-site links, and the book pass is informational.
export const FALLBACK_EXTS = ["html"];
export const INDEX_FILES   = ["index.html", "."];

export const TREES = {
  online: {
    suffix: "",
    label:  "_site",
    checkOpts: {
      checkHtml: true, checkA11y: true, checkIds: true,
      checkRemoteAssets: true, checkCanonical: true,
      captureRedirectStub: false,   // the build knows its own stubs
    },
    forbid: null,
    crossFile: { sitemap: true, search: true, canonical: true },
    fallbackExts: FALLBACK_EXTS,
    indexFiles:   INDEX_FILES,
    includeFragments: true,
  },
  offline: {
    suffix: "-offline",
    label:  "_site-offline",
    checkOpts: {
      checkHtml: true, checkA11y: true, checkIds: true,
      checkRemoteAssets: true, checkCanonical: false,
      captureRedirectStub: false,
    },
    // Catches live-site links the offlinify rewrite missed.
    forbid: ["https://docs.twinbasic.com"],
    crossFile: { sitemap: false, search: false, canonical: false },
    fallbackExts: FALLBACK_EXTS,
    indexFiles:   INDEX_FILES,
    includeFragments: true,
  },
  pdf: {
    suffix: "-pdf",
    label:  "_site-pdf",
    checkOpts: null,
    forbid: null,
    crossFile: { sitemap: false, search: false, canonical: false },
    // book.html is one flattened document whose links are almost
    // entirely internal fragments; there is no directory structure to
    // fall back through.
    fallbackExts: [],
    indexFiles:   [],
    includeFragments: true,
    noFail: true,
  },
};

// ── Per-chunk work (worker side) ────────────────────────────────────

// Check one chunk of already-rendered pages against one tree.
//
// `docs` is [{ destPath, html }, ...]; `env` carries the tree root, the
// prebuilt index and the tree's options. Returns a reduction sized by
// the number of *findings*, not by the 793k link occurrences: the
// occurrences never cross a thread boundary, and on a clean build the
// only bulk in the payload is the per-page id sets the join needs to
// settle cross-page fragments.
//
// Fragments pointing into this chunk's own pages are settled here --
// 92 % of fragment references are same-page -- and the rest come back
// as `pending` for joinChunks().
export function checkChunk(docs, env) {
  const { root, index, tree, basePath = "" } = env;
  // The oracle and the two resolution caches live on `env`, which is
  // per worker per tree, not per chunk. A lane checks ~10 chunks of
  // ~6 pages each, and every one of them walks the same nav and footer
  // links; rebuilding the caches per chunk threw that reuse away and
  // cost roughly 3x on this stage.
  env.oracle ??= IndexOracle(index);
  env.caches ??= { resolution: new Map(), path: new Map() };

  const occurrences = [];
  const localIds = new Map();
  const ids = [];
  const integrity = [];
  const canonicals = [];
  const forbidden = [];

  for (const doc of docs) {
    const abs = path.join(root, doc.destPath);
    const r = extractFromHtml(doc.html, tree.includeFragments, tree.forbid, tree.checkOpts);

    const srcDir = path.dirname(abs);
    for (const h of r.links) occurrences.push(abs, srcDir, h);

    if (r.ids) {
      localIds.set(abs, r.ids);
      ids.push([abs, [...r.ids]]);
    }
    if (r.forbidden && r.forbidden.length) {
      for (const f of r.forbidden) forbidden.push(doc.destPath, f.url, f.prefix);
    }
    if (r.htmlErrors?.length || r.a11yErrors?.length || r.dupIds?.length || r.remoteAssets?.length) {
      integrity.push([doc.destPath, {
        htmlErrors: r.htmlErrors, a11yErrors: r.a11yErrors,
        dupIds: r.dupIds, remoteAssets: r.remoteAssets,
      }]);
    }
    if (r.canonicalHref) canonicals.push([doc.destPath, r.canonicalHref]);
  }

  const res = resolveOccurrences(occurrences, env.oracle, {
    rootStr: root, basePath,
    fallbackExts: tree.fallbackExts,
    indexFiles:   tree.indexFiles,
    includeFragments: tree.includeFragments,
    localIds,
    deferFragments: true,
    caches: env.caches,
  });

  // Report sources tree-relative so the payload does not carry the
  // absolute root 793k times over, and so findings compare equal
  // regardless of where the tree lives.
  const broken = [];
  for (let i = 0; i < res.broken.length; i += 3) {
    broken.push(relTo(root, res.broken[i]), res.broken[i + 1], res.broken[i + 2]);
  }

  return {
    files: docs.length,
    occurrences: occurrences.length / 3,
    uniqueLocal: res.uniqueCount,
    broken,
    brokenKeys:  res.brokenKeys,
    forbidden,
    pending:     res.pendingFragments,
    ids, integrity, canonicals,
  };
}

function relTo(root, p) {
  return path.relative(root, p).replaceAll("\\", "/");
}

// ── Join (main thread) ──────────────────────────────────────────────

// Merge the per-chunk reductions, settle the fragment references no
// single chunk could decide, and run the three cross-file checks.
//
// `aux` carries the content the cross-file checks need -- sitemap.xml
// and search-data.json as the build wrote them, not as re-read from
// disk. Checking the string the build emitted is checking the same
// bytes the tree received.
export function joinChunks(chunks, {
  root, tree, basePath = "", relFiles = [], stubRels = null, aux = {},
}) {
  let occurrences = 0, files = 0;
  const broken = [];
  const brokenKeys = new Set();
  const forbiddenBySource = tree.forbid ? new Map() : null;
  const integrityByFile = new Map();
  const canonicalByRel = new Map();
  const idsByTarget = new Map();
  const pending = [];
  const errors = [];

  for (const c of chunks) {
    if (!c) continue;
    if (c.error) { errors.push(c.error); continue; }
    occurrences += c.occurrences;
    files       += c.files;
    for (const x of c.broken)     broken.push(x);
    for (const k of c.brokenKeys) brokenKeys.add(k);
    for (const [k, v] of c.ids)        idsByTarget.set(k, new Set(v));
    for (const [k, v] of c.integrity)  integrityByFile.set(k, v);
    for (const [k, v] of c.canonicals) canonicalByRel.set(k, v);
    for (const p of c.pending) pending.push(p);
    if (forbiddenBySource) {
      for (let i = 0; i < c.forbidden.length; i += 3) {
        const src = c.forbidden[i];
        let list = forbiddenBySource.get(src);
        if (!list) { list = []; forbiddenBySource.set(src, list); }
        list.push({ url: c.forbidden[i + 1], prefix: c.forbidden[i + 2] });
      }
    }
  }

  // Cross-page fragments: 1 457 site-wide, because the chunks settled
  // the other 92 % without leaving their lanes.
  const settled = settleFragments(pending, idsByTarget);
  for (let i = 0; i < settled.broken.length; i += 3) {
    broken.push(relTo(root, settled.broken[i]), settled.broken[i + 1], settled.broken[i + 2]);
  }
  for (const k of settled.brokenKeys) brokenKeys.add(k);

  // Redirect stubs are excluded from all three cross-file checks. The
  // standalone script detects them by sniffing for a meta refresh; the
  // build simply knows which pages it generated as stubs.
  const contentRels = stubRels
    ? relFiles.filter(r => !stubRels.has(r))
    : relFiles;

  let sitemapIssues = null, searchIssues = null, canonicalIssues = null;
  if (tree.crossFile.sitemap && aux.sitemapXml != null) {
    sitemapIssues = checkSitemap(aux.sitemapXml, contentRels, basePath).sort();
  }
  if (tree.crossFile.search && aux.searchJson != null) {
    let data = null;
    try { data = JSON.parse(aux.searchJson); } catch { data = null; }
    if (data) searchIssues = checkSearch(data, contentRels, basePath).sort();
  }
  if (tree.crossFile.canonical) {
    const forCheck = new Map();
    for (const [rel, href] of canonicalByRel) {
      if (stubRels && stubRels.has(rel)) continue;
      forCheck.set(rel, href);
    }
    canonicalIssues = forCheck.size ? checkCanonical(forCheck, basePath).sort() : null;
  }

  return {
    label: tree.label,
    tree,
    noFail: tree.noFail === true,
    files,
    occurrences,
    brokenUnique: brokenKeys.size,
    broken,
    forbiddenBySource,
    integrityByFile,
    sitemapIssues, searchIssues, canonicalIssues,
    errors,
  };
}

// ── Reporting ───────────────────────────────────────────────────────

// Render one tree's result. Returns { text, linksFailed, integrityFailed }.
// Nothing here throws: a failing check reports, it does not take the
// build's output down with it.
export function formatReport(r) {
  const out = [];

  for (const e of r.errors) out.push(`  ERROR  ${e}\n`);

  // The script prints bare walk paths; prefix the tree so a fused run
  // covering three trees says which one each finding came from.
  const linkReport = formatLinkReport(r.broken, r.forbiddenBySource);
  if (linkReport) out.push(prefixPaths(linkReport, r.label));

  const integrity = formatIntegrityReport(r.integrityByFile);
  if (integrity.text) out.push(prefixPaths(integrity.text, r.label));

  let integrityCount = integrity.count;
  for (const issues of [r.sitemapIssues, r.searchIssues, r.canonicalIssues]) {
    if (!issues || !issues.length) continue;
    out.push("\n" + issues.map(i => `${r.label}/${i}`).join("\n") + "\n");
    integrityCount += issues.length;
  }

  let forbiddenCount = 0;
  if (r.forbiddenBySource) {
    for (const hits of r.forbiddenBySource.values()) forbiddenCount += hits.length;
  }

  const linksFailed     = r.broken.length > 0 || forbiddenCount > 0;
  const integrityFailed = integrityCount > 0;

  const forbidNote = r.forbiddenBySource ? `, ${forbiddenCount} forbidden` : "";
  const failNote   = r.noFail && (linksFailed || integrityFailed) ? "  (informational)" : "";
  out.push(
    `  ${r.label.padEnd(14)} ${String(r.occurrences).padStart(7)} occurrences -- ` +
    `${r.brokenUnique} broken${forbidNote}, ${integrityCount} integrity${failNote}\n`
  );

  return {
    text: out.join(""),
    linksFailed:     r.noFail ? false : linksFailed,
    integrityFailed: r.noFail ? false : integrityFailed,
  };
}

// Both reporters start a path at column 0 and indent everything else
// -- the link report's per-source group headers, the integrity
// report's one-line findings -- so prefixing every line that begins
// with a non-space qualifies exactly the paths and nothing else.
// Blank lines have no non-space to match.
function prefixPaths(text, label) {
  return text.replace(/^(?=\S)/gm, `${label}/`);
}

// ── Structured findings ─────────────────────────────────────────────

// The same conclusions, in the shape scripts/check_links.mjs's
// `structured` mode emits, so scripts/check_links_diff.mjs can diff the
// two implementations category by category. This is the whole gate:
// check.bat going green proves nothing about whether the fused pass
// still looks at everything the standalone script does.
//
// `unique` is deliberately null. The script's "N unique" counts entries
// deduped across the whole tree; the build resolves in 160 chunks and
// reconstructing a global figure would mean shipping every unique
// target key back from every chunk -- hundreds of thousands of strings
// for a number that appears in a summary line and is not a finding.
// The harness skips a count either side reports as null.
export function findingsFor(r) {
  const on = r.tree.checkOpts ?? {};
  const gate = (enabled, a) => (enabled ? a.sort() : null);

  const brokenOut = [];
  for (let i = 0; i < r.broken.length; i += 3) {
    brokenOut.push(`${r.broken[i]}\t${r.broken[i + 1]}\t${r.broken[i + 2]}`);
  }

  const forbiddenOut = [];
  if (r.forbiddenBySource) {
    for (const [src, hits] of r.forbiddenBySource) {
      for (const h of hits) forbiddenOut.push(`${posix(src)}\t${h.url}\t${h.prefix}`);
    }
  }

  const html = [], a11y = [], dupIds = [], remoteAssets = [];
  for (const [src, rec] of r.integrityByFile) {
    const s = posix(src);
    for (const e of rec.htmlErrors ?? []) html.push(`${s}: html-${e.type}: <${e.tag}>`);
    for (const e of rec.a11yErrors ?? []) {
      if (e.type === "img-missing-alt")   a11y.push(`${s}: a11y-img-missing-alt: src=${e.src}`);
      else if (e.type === "empty-anchor") a11y.push(`${s}: a11y-empty-anchor`);
      else if (e.type === "empty-href")   a11y.push(`${s}: a11y-empty-href: <${e.tag}>`);
    }
    for (const e of rec.dupIds ?? []) dupIds.push(`${s}: duplicate-id: '${e.id}' appears ${e.count} times`);
    for (const e of rec.remoteAssets ?? []) remoteAssets.push(`${s}: remote-asset: <${e.tag} src="${e.src}">`);
  }

  const crossFileCount =
    (r.sitemapIssues?.length ?? 0) + (r.searchIssues?.length ?? 0) + (r.canonicalIssues?.length ?? 0);
  const integrityCount =
    html.length + a11y.length + dupIds.length + remoteAssets.length + crossFileCount;

  let forbiddenCount = 0;
  if (r.forbiddenBySource) {
    for (const hits of r.forbiddenBySource.values()) forbiddenCount += hits.length;
  }

  return {
    broken:       brokenOut.sort(),
    forbidden:    gate(r.tree.forbid !== null, forbiddenOut),
    html:         gate(on.checkHtml, html),
    a11y:         gate(on.checkA11y, a11y),
    dupIds:       gate(on.checkIds, dupIds),
    remoteAssets: gate(on.checkRemoteAssets, remoteAssets),
    sitemap:      r.sitemapIssues,
    search:       r.searchIssues,
    canonical:    r.canonicalIssues,
    counts: {
      files: r.files,
      occurrences: r.occurrences,
      unique: null,
      brokenUnique: r.brokenUnique,
      forbidden: forbiddenCount,
      integrity: integrityCount,
    },
    // Raw, before --no-fail is applied: the book pass reports its ten
    // broken links as failures here even though it never fails a build.
    linksFailed:     r.broken.length > 0 || forbiddenCount > 0,
    integrityFailed: integrityCount > 0,
  };
}

// ── Index audit (development aid) ───────────────────────────────────

// Diff the derived index against the tree on disk. An entry missing
// from the index turns a working link into a reported break, which is
// loud; a spurious entry masks a real break, which is silent. Only the
// second needs a dedicated check, and this is it.
export async function auditIndex(root, rels) {
  const { promises: fsP } = await import("node:fs");
  const onDisk = new Set();
  let entries;
  try {
    entries = await fsP.readdir(root, { recursive: true, withFileTypes: true });
  } catch { return { missing: [], spurious: [], unreadable: true }; }
  for (const e of entries) {
    if (!e.isFile()) continue;
    const abs = path.join(e.parentPath || root, e.name);
    onDisk.add(path.relative(root, abs).replaceAll("\\", "/"));
  }
  const derived = new Set(rels.map(posix));
  return {
    missing:  [...onDisk].filter(r => !derived.has(r)).sort(),
    spurious: [...derived].filter(r => !onDisk.has(r)).sort(),
    unreadable: false,
  };
}

// Build a tree index the same way both sides do, so callers do not have
// to remember that the root string's shape is load-bearing.
export function treeIndexFor(root, rels) {
  return buildTreeIndex(root, rels);
}
