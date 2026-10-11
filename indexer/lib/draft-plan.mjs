import path from "node:path";
import { flattenSymbols } from "./differ.mjs";

/**
 * The pages `analyze`'s tasks ask for, placed in the reference: for each task
 * of a package's report, the page file to write or change, its parent's title
 * and its permalink, read from the section's own layout rather than from a
 * convention, because the sections do not share one (enumerations in an
 * `Enumerations/` folder in some, beside the classes in others; a class with
 * its members on pages of their own in a folder, or on its one page).
 *
 * Everything here is pure: `twin-index draft` reads the files and calls
 * planPackage, and test/indexer.test.mjs calls it with hand-made sections.
 */

// The kinds of a report that are types. Every other kind is a member of one.
const TYPE_KINDS = new Set(["Module", "Class", "Interface", "CoClass", "Enum", "Type", "Union"]);

// The folder a page's members go in: `X/index.md`, or `X/X.md` in a folder
// with no `index.md` as AppGlobalClassObject's `_App/_App.md` is, keeps its
// members in `X/`; a page of its own (`X.md`) keeps them on the page, and has
// none. `rels` are the paths of the section's pages.
function memberFolder(rel, rels = new Set()) {
  if (rel.endsWith("/index.md")) return rel.slice(0, -"/index.md".length);
  const dir = path.posix.dirname(rel);
  const named = dir !== "." && path.posix.basename(rel, ".md") === path.posix.basename(dir);
  return named && !rels.has(`${dir}/index.md`) ? dir : null;
}

// The folder a type's page sits in: `A/X/index.md` and `A/X.md` are both in
// `A`; the section's root is `.`.
function typeFolder(rel, rels) {
  return path.posix.dirname(memberFolder(rel, rels) ?? rel.slice(0, -".md".length));
}

/**
 * The permalink a section gives the page at `rel` when its permalinks follow
 * its folders: the landing page's, then the path with `.md` dropped, and a
 * folder's own page (`index.md`, or `X/X.md`) as the folder with a trailing
 * slash. `rels` are the paths of the section's pages.
 */
export function permalinkByFolder(landingPermalink, rel, rels = new Set()) {
  const base = landingPermalink.endsWith("/") ? landingPermalink : `${landingPermalink}/`;
  if (rel === "index.md") return base;
  const folder = memberFolder(rel, rels);
  return folder === null ? `${base}${rel.slice(0, -".md".length)}` : `${base}${folder}/`;
}

/**
 * Whether every page of a section that sets a permalink has the one
 * permalinkByFolder gives it. Only then are the permalinks of new pages
 * computed; otherwise each is left to whoever writes the page, from its
 * siblings'.
 */
export function followsFolders(pages, landing) {
  if (!landing?.permalink) return false;
  const rels = new Set(pages.map((p) => p.rel));
  return pages.every((p) => !p.permalink || p.permalink === permalinkByFolder(landing.permalink, p.rel, rels));
}

// Whether most of `flags` are true: null on a tie, and when there are none.
function majority(flags) {
  const yes = flags.filter(Boolean).length;
  const no = flags.length - yes;
  return yes > no ? true : no > yes ? false : null;
}

// The most frequent of `values`, a tie to the first seen; `fallback` when none.
function mostCommon(values, fallback) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = fallback;
  let n = 0;
  for (const [v, c] of counts) {
    if (c > n) {
      best = v;
      n = c;
    }
  }
  return best;
}

/**
 * Plans the pages of one package's report.
 *
 * - `report`: one entry of report.json (`{ package, group, mode, to, tasks }`).
 * - `api`: the package's current api.json, which says what kind of type each
 *   existing page documents.
 * - `pages`: every page of the section, `{ rel, title, parent, permalink }`,
 *   `rel` relative to the section's folder with `/` separators; `index.md` is
 *   the landing page. Empty for a package the reference has no section for.
 * - `sectionDir`, `sourceDir`: the section's folder and the package's sources
 *   in the store, relative to the repository, with `/`.
 * - `newLanding`: for a section with no landing page yet, the `{ title,
 *   parent, permalink }` it is to get, and for a contributed package its
 *   `author`; the returned `landing` then says `new: true`.
 *
 * Returns `{ package, group, mode, version, sectionDir, landing, permalinks,
 * tasks, unplaced, flagged }`. Each of `tasks` names the page `file`
 * (repository-relative); whether it is `new`; whether the symbol goes `inline`,
 * on the one page its type has; the `parent` title; the `permalink` (null for
 * an inline symbol, and when the section's permalinks do not follow its
 * folders); the `containerPage`, which may list its members; a `model` page of
 * the same kind in the section, to follow; and the `source` file to read.
 * `unplaced` are the tasks no page can be found for, such as a member whose
 * type has no page and gets none; `flagged`, the symbols the package no longer
 * declares, with the page that documents each.
 */
export function planPackage({ report, api, pages, sectionDir, sourceDir, newLanding = null }) {
  const landing =
    pages.find((p) => p.rel === "index.md") ?? (newLanding ? { rel: "index.md", new: true, ...newLanding } : null);
  const permalinks = followsFolders(pages, landing);
  const inSection = (rel) => `${sectionDir}/${rel}`;
  const titleOf = new Map(pages.map((p) => [p.rel, p.title]));
  // The pages there are, and those planned so far.
  const rels = new Set(pages.map((p) => p.rel));
  const folderOf = (rel) => memberFolder(rel, rels);
  const byTitle = new Map();
  for (const p of pages) {
    if (p.rel === "index.md") continue;
    if (!byTitle.has(p.title)) byTitle.set(p.title, []);
    byTitle.get(p.title).push(p);
  }
  // A symbol's page: the one titled with its name whose parent is its type's
  // page; for a type of the package's own, the first so titled.
  const pageOf = (name, host, isTopType) => {
    const found = byTitle.get(name) ?? [];
    return found.find((p) => host && p.parent === host.title) ?? (isTopType ? found[0] : null) ?? null;
  };

  // The page of each type that has one, by the type's path; for each kind of
  // type, the folders the section keeps it in, and whether each is a folder of
  // its own (`X/index.md`) or one page (`X.md`); and a page of each kind. A
  // control (a class marked [WindowsControl] or [CustomControl]) is a kind of
  // its own: the sections lay their controls out apart from their classes.
  const typePages = new Map();
  const kindFolders = new Map();
  const kindStyles = new Map();
  const kindPages = new Map();
  const symbols = flattenSymbols(api ?? {});
  const types = symbols
    .filter((s) => s.isType)
    .map((s) => ({ ...s, path: s.container ? `${s.container}.${s.name}` : s.name }));
  const controls = new Set(
    types
      .filter((t) => JSON.parse(t.attributes).some((a) => a.name === "WindowsControl" || a.name === "CustomControl"))
      .map((t) => t.path),
  );
  const kindKey = (kind, typePath) => (controls.has(typePath) ? `${kind} control` : kind);
  const add = (map, key, value) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  };
  for (const t of types) {
    const page = t.container ? pageOf(t.name, typePages.get(t.container), false) : pageOf(t.name, landing, true);
    if (!page) continue;
    typePages.set(t.path, page);
    const key = kindKey(t.kind, t.path);
    if (!kindPages.has(key)) kindPages.set(key, page.rel);
    if (t.container) continue;
    add(kindFolders, key, typeFolder(page.rel, rels));
    add(kindStyles, key, folderOf(page.rel) !== null);
  }
  const anyFolder = mostCommon([...kindFolders.values()].flat(), ".");
  // A control with no other control to go by goes as the classes do.
  const byKind = (map, kind, typePath) => map.get(kindKey(kind, typePath)) ?? map.get(kind);
  const folderFor = (kind, typePath) => mostCommon(byKind(kindFolders, kind, typePath) ?? [], anyFolder);
  const modelFor = (kind, typePath) => kindPages.get(kindKey(kind, typePath)) ?? kindPages.get(kind) ?? null;
  // Whether a new type of a kind gets a folder: as most of the section's types
  // of that kind have, else most of its types; null when it has none.
  const folderStyle = (kind, typePath) =>
    majority(byKind(kindStyles, kind, typePath) ?? []) ?? majority([...kindStyles.values()].flat());
  const containerOf = (task) =>
    TYPE_KINDS.has(task.kind) ? (task.module === task.symbol ? null : task.module) : task.module;
  const common = (task) => ({
    action: task.action,
    symbol: task.symbol,
    kind: task.kind,
    container: containerOf(task),
    signature: task.signature ?? null,
    source: task.file ? `${sourceDir}/${task.file}` : null,
  });
  const created = report.tasks.filter((t) => t.action === "create");
  const hasNewMembers = (typePath) => created.some((t) => !TYPE_KINDS.has(t.kind) && t.module === typePath);
  const isCreated = (typePath, name) => created.some((t) => t.module === typePath && t.symbol === name);
  // The members a type already had, each with the page of its own it has, or
  // null when it is on its type's page or on none.
  const knownMembers = (typePath, host) =>
    symbols
      .filter((s) => !s.isType && s.public && s.container === typePath && !isCreated(typePath, s.name))
      .map((s) => ({ kind: s.kind, page: pageOf(s.name, host, false) }));
  // Whether the section gives members pages of their own: as most members of
  // the types it keeps in folders have. VB's keep theirs on the folder's index.md.
  const membersOnPages =
    majority(
      [...typePages]
        .filter(([, page]) => folderOf(page.rel) !== null)
        .flatMap(([typePath, page]) => knownMembers(typePath, page).map((m) => m.page !== null)),
    ) ?? true;
  // The folder a type's page keeps the pages of its members of `kind` in, or
  // null when they go on the type's page: as most of its members of that kind
  // are, else most of its members, else as the section does. The model is a
  // page of one of them.
  const memberPlace = (host, typePath, kind) => {
    const folder = folderOf(host.rel);
    if (folder === null) return { folder: null, model: null };
    const known = knownMembers(typePath, host);
    const same = known.filter((m) => m.kind === kind);
    const onPages = majority((same.length ? same : known).map((m) => m.page !== null)) ?? membersOnPages;
    const model = (same.find((m) => m.page) ?? known.find((m) => m.page))?.page.rel ?? null;
    return { folder: onPages ? folder : null, model };
  };
  // The type that keeps a new type in its folder, as ListView keeps ListItem:
  // the one type with a folder of its own, or whose page is in a folder, among
  // the documented types whose members return the new type (`As ListItem`),
  // and only when that folder keeps another type's page already: a class
  // returned by another is more often a page of its own (Printers returns
  // Printer). The folder and the title of its page; null when there is no
  // such type, or several.
  const keepsTypes = (folder) => [...typePages.values()].some((p) => typeFolder(p.rel, rels) === folder);
  const returns = (signature, name) => {
    const words = (signature ?? "").split(/\W+/);
    return words.some((w, i) => w === "As" && [1, 2].some((j) => words[i + j] === name));
  };
  const ownerOf = (name) => {
    const owners = new Map();
    for (const s of symbols) {
      if (s.isType || !s.container || s.container === name || !returns(s.signature, name)) continue;
      const page = typePages.get(s.container);
      const folder = page && (folderOf(page.rel) ?? (page.rel.includes("/") ? path.posix.dirname(page.rel) : null));
      if (folder && keepsTypes(folder)) owners.set(folder, page);
    }
    if (owners.size !== 1) return null;
    const [[folder, page]] = owners;
    return { folder, title: (folderOf(page.rel) === folder ? page.title : titleOf.get(`${folder}/index.md`)) ?? null };
  };
  // Whether the types directly in a folder mostly have folders of their own.
  const styleIn = (folder) =>
    majority(
      [...typePages.values()].filter((p) => typeFolder(p.rel, rels) === folder).map((p) => folderOf(p.rel) !== null),
    );

  const tasks = [];
  const unplaced = [];
  const flagged = [];

  // The types first, the package's own before the nested, so that a member
  // finds the page its new type gets.
  const order = (t) => (TYPE_KINDS.has(t.kind) ? (containerOf(t) ? 1 : 0) : 2);
  for (const task of [...created].sort((a, b) => order(a) - order(b))) {
    const container = containerOf(task);
    const isType = TYPE_KINDS.has(task.kind);
    const ownPath = isType ? (container ? `${container}.${task.symbol}` : task.symbol) : null;
    const host = container ? (typePages.get(container) ?? null) : null;
    let rel = null;
    let parent = null;
    let inline = false;
    let model = null;
    // A type with a folder of its own: as the section keeps its kind, else when
    // it has new members to put in it.
    const ownFolder = isType && (folderStyle(task.kind, ownPath) ?? hasNewMembers(ownPath));
    const place = host && !isType ? memberPlace(host, container, task.kind) : null;
    const folder = host ? (isType ? folderOf(host.rel) : place.folder) : null;
    const owner = isType && !container ? ownerOf(task.symbol) : null;
    // A page of its own named Index would be written as Index.html, which on
    // Windows is the folder's index.html: Fmt's StringFormatSpecifier.Index is
    // IndexProperty.md.
    const name = task.symbol.toLowerCase() === "index" ? `${task.symbol}${task.kind}` : task.symbol;
    if (owner) {
      // Kept in its owner's folder, with a folder of its own as the types there have.
      const own = styleIn(owner.folder) ?? false;
      rel = own ? `${owner.folder}/${task.symbol}/index.md` : `${owner.folder}/${name}.md`;
      parent = owner.title ?? landing?.title ?? null;
      model = modelFor(task.kind, ownPath);
    } else if (!container) {
      const kindFolder = folderFor(task.kind, ownPath);
      const stem = kindFolder === "." ? task.symbol : `${kindFolder}/${task.symbol}`;
      rel = ownFolder ? `${stem}/index.md` : `${kindFolder === "." ? name : `${kindFolder}/${name}`}.md`;
      parent = (kindFolder !== "." && titleOf.get(`${kindFolder}/index.md`)) || landing?.title || null;
      model = modelFor(task.kind, ownPath);
    } else if (folder !== null) {
      rel = ownFolder ? `${folder}/${task.symbol}/index.md` : `${folder}/${name}.md`;
      parent = host.title;
      model = isType ? modelFor(task.kind, ownPath) : place.model;
    } else if (host) {
      rel = host.rel;
      parent = host.parent;
      inline = true;
    }
    if (!rel) {
      unplaced.push({ ...common(task), reason: `${container} has no page` });
      continue;
    }
    if (isType) typePages.set(ownPath, { rel, title: task.symbol, parent });
    rels.add(rel);
    tasks.push({
      ...common(task),
      file: inSection(rel),
      new: !inline,
      inline,
      parent,
      permalink: permalinks && !inline ? permalinkByFolder(landing.permalink, rel, rels) : null,
      containerPage: host ? inSection(host.rel) : null,
      model: model && model !== rel ? inSection(model) : null,
    });
  }

  // A change or a removal is to the page the symbol has, or, for a member of a
  // type on one page, to that page.
  const existingPage = (task) => {
    const container = containerOf(task);
    const host = container ? (typePages.get(container) ?? null) : null;
    const page = pageOf(task.symbol, host, !container);
    if (page) return { file: inSection(page.rel), inline: false };
    if (host && memberPlace(host, container, task.kind).folder === null)
      return { file: inSection(host.rel), inline: true };
    return { file: null, inline: false };
  };
  for (const task of report.tasks) {
    if (task.action === "update") {
      const { file, inline } = existingPage(task);
      if (!file) {
        unplaced.push({ ...common(task), reason: "no page documents it" });
        continue;
      }
      tasks.push({
        ...common(task),
        file,
        new: false,
        inline,
        reason: task.reason ?? null,
        changes: task.changes ?? [],
        old_signature: task.old_signature ?? null,
        new_signature: task.new_signature ?? null,
      });
    } else if (task.action === "flag_removal") {
      flagged.push({ ...common(task), file: existingPage(task).file });
    }
  }

  return {
    package: report.package,
    group: report.group,
    mode: report.mode,
    version: report.to,
    sectionDir,
    landing: landing
      ? {
          file: inSection("index.md"),
          title: landing.title,
          parent: landing.parent ?? null,
          permalink: landing.permalink ?? null,
          new: !!landing.new,
          author: landing.author ?? null,
        }
      : null,
    permalinks,
    tasks,
    unplaced,
    flagged,
  };
}

/**
 * The landing page a new section is to get, from the landing pages of the
 * other sections of its group, `[{ folder, title, parent, permalink }]`: its
 * title `<package> Package` when theirs are named so, their most frequent
 * parent, and a permalink beside theirs when theirs end in their folder's name.
 */
export function newLandingFor(name, siblings) {
  const named = siblings.every((s) => s.title === `${s.folder} Package`);
  const prefixes = siblings.map((s) =>
    s.permalink?.endsWith(`/${s.folder}/`) ? s.permalink.slice(0, -(s.folder.length + 1)) : null,
  );
  const prefix = prefixes.length && prefixes.every((p) => p && p === prefixes[0]) ? prefixes[0] : null;
  return {
    title: named ? `${name} Package` : name,
    parent: mostCommon(siblings.map((s) => s.parent).filter(Boolean), null),
    permalink: prefix ? `${prefix}${name}/` : null,
  };
}

// The most pages one agent of the workflow writes.
export const PAGES_PER_BATCH = 12;

/**
 * Splits a package's planned tasks into the batches the workflow gives one
 * agent each: a type with its new members, or the members of one type, in
 * `PAGES_PER_BATCH` at most. A type's symbols that go on its one page stay in
 * one batch however many they are, so that no two agents edit one file.
 * Returns `[{ container, tasks }]` in the order the plan lists them.
 */
export function batchTasks(plan) {
  const groups = new Map();
  for (const t of plan.tasks) {
    const key = t.container ?? t.symbol;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const batches = [];
  for (const [container, tasks] of groups) {
    const size = tasks.some((t) => t.inline) ? tasks.length : PAGES_PER_BATCH;
    for (let i = 0; i < tasks.length; i += size) batches.push({ container, tasks: tasks.slice(i, i + size) });
  }
  return batches;
}
