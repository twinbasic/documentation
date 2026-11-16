import { diffApi } from "./differ.mjs";
import { latestVersion, versionString } from "./sync.mjs";

/**
 * `sync --query`: what has changed upstream, against what the documentation is
 * pinned at, without reading anything into the store. The functions here decide
 * and compare; twin-index.mjs reads the sources and prints.
 */

/**
 * The state of each TWINSERV package against its baseline: the pin of a
 * documented package, else the version the store holds. `listing` is TWINSERV's
 * `public` list, `pins` is `pinsOf`'s map, `stored` a Map from each contributed
 * package the store holds to its version, `filter` the names --package or
 * --packages gave, or null.
 *
 * Returns rows `{ symbol, documented, base, newest, published, state }`, sorted
 * by name: `state` is `newer` (TWINSERV's newest is not the baseline), `same`,
 * `new` (no baseline: neither documented nor in the store) or `gone` (documented
 * or stored, and TWINSERV no longer lists it; `newest` and `published` null).
 */
export function queryContributed(listing, { pins, stored, filter = null }) {
  const rows = [];
  const listed = new Set();
  for (const pkg of listing) {
    const latest = latestVersion(pkg);
    const symbol = latest.symbol;
    listed.add(symbol);
    if (filter && !filter.includes(symbol)) continue;
    const newest = versionString(latest);
    const pin = pins.get(`contributed/${symbol}`) ?? null;
    const base = pin ?? stored.get(symbol) ?? null;
    const state = base === null ? "new" : base === newest ? "same" : "newer";
    rows.push({ symbol, documented: pin !== null, base, newest, published: latest.publishedDate ?? null, state });
  }
  const known = new Set([...stored.keys()]);
  for (const key of pins.keys()) if (key.startsWith("contributed/")) known.add(key.split("/")[1]);
  for (const symbol of known) {
    if (listed.has(symbol) || (filter && !filter.includes(symbol))) continue;
    const pin = pins.get(`contributed/${symbol}`) ?? null;
    rows.push({
      symbol,
      documented: pin !== null,
      base: pin ?? stored.get(symbol),
      newest: null,
      published: null,
      state: "gone",
    });
  }
  return rows.sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));
}

/**
 * How a built-in package of the newest build differs from its baseline build,
 * by content, since the package itself has no version. `baselineFiles` and
 * `newestFiles` are `keptFiles` maps (null when the baseline's sources are not to
 * be had); `baselineApi` and `newestApi` parsed api.json objects (null likewise).
 *
 * Returns `{ sources, api }`: `sources` is `same`, `changed` or null when it
 * cannot be told; `api` is the public symbols `{ added, removed, modified }`, as
 * `analyze` counts them, or null.
 */
export function compareBuilds({ baselineFiles, newestFiles, baselineApi, newestApi }) {
  let sources = null;
  if (baselineFiles && newestFiles) {
    sources =
      baselineFiles.size === newestFiles.size &&
      [...newestFiles].every(([rel, content]) => baselineFiles.get(rel)?.equals(content))
        ? "same"
        : "changed";
  }
  let api = null;
  if (baselineApi && newestApi) {
    const diff = diffApi(baselineApi, newestApi);
    api = {
      added: diff.added.filter((s) => s.public).length,
      removed: diff.removed.filter((s) => s.public).length,
      modified: diff.modified.filter((m) => m.current.public || m.baseline.public).length,
    };
  }
  return { sources, api };
}

/** What `sync --query` prints of a `compareBuilds` result. */
export function describeComparison({ sources, api }) {
  const apiChanged = api && api.added + api.removed + api.modified > 0;
  if (apiChanged) {
    const parts = [];
    if (api.added) parts.push(`${api.added} added`);
    if (api.removed) parts.push(`${api.removed} removed`);
    if (api.modified) parts.push(`${api.modified} changed`);
    return `public API changed: ${parts.join(", ")}`;
  }
  if (sources === "same") return "same sources";
  if (sources === "changed") return api ? "sources changed, public API the same" : "sources changed";
  return api
    ? "public API the same (no stored sources to compare)"
    : "cannot be compared: no stored sources or snapshot";
}
