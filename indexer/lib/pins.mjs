import { latestVersion, versionString } from "./sync.mjs";

/**
 * Package version pinning. A package the reference documents is pinned at the
 * version its section's `indexed_from:` names, and `sync` keeps it there: it
 * indexes the package at that version whatever is newer, so that indexing
 * everything again (after a change to the scanner) writes each committed
 * snapshot from the version the pages describe. `sync --upgrade` moves the
 * packages it is given (every one, without --package or --packages) to the
 * newest version instead; a package no section documents always follows the
 * newest. The functions here decide which version each package is wanted at,
 * and do nothing else.
 */

/**
 * The pins of the documented packages: a Map from `<group>/<package>` to the
 * version its section's `indexed_from:` names. `documented` is
 * `documentedPackages`'s map; a section with no `indexed_from:` pins nothing.
 */
export function pinsOf(documented) {
  const pins = new Map();
  for (const [key, section] of documented) if (section.indexedFrom) pins.set(key, section.indexedFrom);
  return pins;
}

/**
 * The version a package is wanted at: the newest one when `upgrade` is asked
 * for or the package has no pin, else its pin.
 */
export function wantedVersion({ pin, newest, upgrade }) {
  return upgrade || !pin ? newest : pin;
}

/**
 * Which version of each TWINSERV package `sync` wants. `listing` is the
 * `public` list TWINSERV's query returns, each package with its versions newest
 * first; `pins` is `pinsOf`'s map; `filter` the names --package or --packages
 * gave, or null for every package; `upgrade` is --upgrade.
 *
 * Returns `{ items, unlisted }`. Each item is `{ id, pkg, symbol, publisher,
 * newest, pin, want, version }`: `newest` and `want` are version strings, `pin`
 * the package's pin or null, and `version` TWINSERV's record of the wanted
 * version, null when TWINSERV no longer lists it. `unlisted` are the pinned
 * packages in scope that TWINSERV does not list at all, `{ symbol, pin, want }`,
 * which only the store can still hold.
 */
export function planContributed(listing, { pins, filter = null, upgrade = false }) {
  const items = [];
  const listed = new Set();
  for (const pkg of listing) {
    const latest = latestVersion(pkg);
    const symbol = latest.symbol;
    listed.add(symbol);
    if (filter && !filter.includes(symbol)) continue;
    const newest = versionString(latest);
    const pin = pins.get(`contributed/${symbol}`) ?? null;
    const want = wantedVersion({ pin, newest, upgrade });
    const version = pkg.versions.find((v) => versionString(v) === want) ?? null;
    items.push({ id: pkg.projectId, pkg, symbol, publisher: pkg.publisher, newest, pin, want, version });
  }
  const unlisted = [];
  for (const [key, pin] of pins) {
    const [group, symbol] = key.split("/");
    if (group !== "contributed" || listed.has(symbol)) continue;
    if (filter && !filter.includes(symbol)) continue;
    unlisted.push({ symbol, pin, want: pin });
  }
  return { items, unlisted };
}

/**
 * Which build of each built-in and default package `sync` wants, by its release
 * tag (`beta-x-1042`). `listing` names the packages of the newest build,
 * `newestTag` is its tag, and `groupOf(symbol)` gives a package's group
 * (`default` or `built-in`). A documented package the newest build no longer
 * ships is still wanted at its pin, from the build that had it.
 *
 * Returns `{ group, symbol, newest, pin, want }` for each package in scope,
 * `newest` null for one the newest build lacks.
 */
export function planBuiltin(listing, { newestTag, groupOf, pins, filter = null, upgrade = false }) {
  const items = [];
  const seen = new Set();
  for (const symbol of listing) {
    seen.add(symbol);
    if (filter && !filter.includes(symbol)) continue;
    const group = groupOf(symbol);
    const pin = pins.get(`${group}/${symbol}`) ?? null;
    items.push({ group, symbol, newest: newestTag, pin, want: wantedVersion({ pin, newest: newestTag, upgrade }) });
  }
  for (const [key, pin] of pins) {
    const [group, symbol] = key.split("/");
    if (group === "contributed" || seen.has(symbol)) continue;
    if (filter && !filter.includes(symbol)) continue;
    items.push({ group, symbol, newest: null, pin, want: pin });
  }
  return items;
}

/**
 * The packages kept at a pin while a newer version exists, `{ symbol, pin,
 * newest }`, from the items of `planContributed` or `planBuiltin`.
 */
export function heldBack(items) {
  return items
    .filter((i) => i.pin && i.newest && i.newest !== i.pin && i.want === i.pin)
    .map(({ symbol, pin, newest }) => ({ symbol, pin, newest }));
}

/**
 * The one build the documented default and built-in packages are pinned at, by
 * its release tag, or null when none is pinned. Throws when they are pinned at
 * more than one, naming each build and its packages: `derive` writes one file
 * from one build.
 */
export function pinnedBuild(pins) {
  const builds = new Map();
  for (const [key, tag] of pins) {
    if (key.startsWith("contributed/")) continue;
    if (!builds.has(tag)) builds.set(tag, []);
    builds.get(tag).push(key.split("/")[1]);
  }
  if (builds.size > 1) {
    const each = [...builds].map(([tag, names]) => `${tag} (${names.join(", ")})`).join("; ");
    throw new Error(`the built-in and default sections are pinned at more than one build: ${each}`);
  }
  return builds.size ? [...builds.keys()][0] : null;
}
