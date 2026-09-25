// The documentation's symbol index: every name the reference documents, and
// the page or heading that documents it. Published as tB/symbols.json for the
// IDE help add-in (WIP.HelpAddin.md, Stage 3), which looks up the name under
// the cursor in it, and a copy of which the add-in carries for when the site
// cannot be reached.
//
// **The entries come from the pages; the packages only annotate them.** A URL
// is a page's `permalink:` exactly as written -- folder-style pages end in `/`,
// single-file ones do not, and VBA's package page is `/tB/Packages/VBA` with
// neither -- or that plus the id the build gave a heading, read from the
// rendered HTML and never computed a second time. What the pages cannot say
// comes from builder/package-api.json, which scripts/build_package_api.mjs
// writes from the packages an install ships: the kind of a member that has a
// page of its own, the values of an enumeration, which type declares a member
// a page documents, and the interface a CoClass's members are declared on. A
// name the pages document and the packages do not declare is still indexed; a
// name the packages declare and no page documents is not, and is reported as
// a gap instead.
//
// How a page is read:
//
//   - Reference/Core/: a statement or operator page names its keywords in its
//     title and first heading -- "Do...Loop", "Lock, Unlock", "& and &=
//     operators". The first word of each form is the statement or operator,
//     the rest keywords of it: Loop, Next, Wend, Then. Attributes.md, which is
//     /tB/Core/Attributes, has one attribute to each `##`.
//   - A package folder: a page is a type's when its title or first heading
//     names a type the package declares ("Strings Module" is Strings, "Len,
//     LenB" is Len and LenB). A page under a type's page in the nav, named
//     for one of the type's members, is that member's. A heading on a type's
//     page is a member's when every name in it is an identifier and one is a
//     member -- or when it sits under Properties, Methods or Events, which is
//     how a member no package declares, such as a Form's Print, is still found.
//   - A member documented on the page of the type that declares it -- Close,
//     on Editor's page -- is found from every type that inherits it:
//     CodeEditor.Close has Editor's URL.
//   - A page filed under one module but declared in another -- VBA's Array,
//     documented under Information and declared in _HiddenModule -- is placed
//     under the type that declares it, when exactly one does.
//   - The `$` form of a function shares its base's page: `Left$` goes where
//     `Left` goes, as Permanent Links promises.
//
// **A page can name what it documents**, with `symbols:` in its frontmatter,
// when its title cannot: `(Default) Module` is `_HiddenModule`, and the
// Comparison operators page documents `=`, `<>` and four more. The list
// replaces the names the title and first heading give; on a Core page its
// first name is the statement or operator and the rest are keywords.

// The package folders the reference has, and the projects each documents. A
// project's name is how code names it, and how hover does -- `in Assert.Exact`
// -- which is not always the folder's.
export const PACKAGE_FOLDERS = [
  { folder: "Reference/Default/VBA", projects: ["VBA"] },
  { folder: "Reference/Default/VBRUN", projects: ["VBRUN"] },
  { folder: "Reference/Default/VB", projects: ["VB"] },
  { folder: "Reference/Built-In/AppGlobalClassObject", projects: ["AppGlobalClassProject"] },
  { folder: "Reference/Built-In/CEF", projects: ["cefPackage"] },
  { folder: "Reference/Built-In/CustomControls", projects: ["CustomControls", "CustomControlsPackage"] },
  { folder: "Reference/Built-In/TwinBasicAssertions", projects: ["Assert"] },
  { folder: "Reference/Built-In/WebView2", projects: ["WebView2Package"] },
  { folder: "Reference/Built-In/WinEventLogLib", projects: ["WinEventLogLib"] },
  { folder: "Reference/Built-In/WinNamedPipesLib", projects: ["WinNamedPipesLib"] },
  { folder: "Reference/Built-In/WinNativeCommonCtls", projects: ["WinNativeCommonCtls"] },
  { folder: "Reference/Built-In/WinServicesLib", projects: ["WinServicesLib"] },
  { folder: "Reference/Built-In/tbIDE", projects: ["tbIDE"] },
];

const CORE_FOLDER = "Reference/Core/";
const ATTRIBUTES_PAGE = "Reference/Attributes.md";

// Section headings under which every heading names a member, and the kind
// each gives one the packages do not declare.
const MEMBER_SECTIONS = new Map([["properties", "property"], ["methods", "method"], ["events", "event"]]);
// Headings that open a section of members rather than name one. Such a heading
// is never a member's, even when the type has a member of that name -- tbIDE's
// HtmlElement has a Properties property, and its page's `## Properties` is the
// section, not the property.
const SECTION_TITLES = new Set(["properties", "methods", "events", "members", "fields", "constants", "values"]);

// What a title or first heading adds to the name it documents.
const DECORATION = /\s+(?:class|module|interface|coclass|enumeration|enum|type|package|control|object|statement|function|property|method|event|operators?|directives?)$/i;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*[$]?$/;
const DIRECTIVE = /^#[A-Za-z]+$/;
const OPERATOR = /^[-+*/\\^&<>=]+$/;
// The typographer turns "..." into an ellipsis in rendered headings, and the
// frontmatter title keeps the three dots.
const FORM_BREAK = /\.\.\.|…|\s+/;

// ------------------------------------------------------------ rendered HTML

const ID_ATTRIBUTE = /\sid="([^"]*)"/;
const TAG = /<[^>]*>/g;
const ENTITY = /&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi;
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(s) {
  return String(s ?? "").replace(ENTITY, (_, e) => {
    const k = e.toLowerCase();
    if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith("#")) return String.fromCodePoint(parseInt(k.slice(1), 10));
    return NAMED[k];
  });
}

/**
 * The headings of a rendered page, in order: `{level, id, text}`. A scan for
 * `<hN` and its `</hN>`, not one regex over the page: that pattern is cubic in
 * the worst case, and this runs over every reference page.
 */
export function headingsOf(html) {
  const s = String(html ?? "");
  const out = [];
  for (let i = s.indexOf("<h"); i >= 0; i = s.indexOf("<h", i + 2)) {
    const level = s.charCodeAt(i + 2) - 48;
    if (!(level >= 1 && level <= 6) || !/[\s>]/.test(s[i + 3] ?? "")) continue;
    const gt = s.indexOf(">", i);
    const close = gt < 0 ? -1 : s.indexOf(`</h${level}>`, gt);
    if (close < 0) break;
    const text = decode(s.slice(gt + 1, close).replace(TAG, "")).replace(/\s+/g, " ").trim();
    out.push({ level, id: ID_ATTRIBUTE.exec(s.slice(i, gt))?.[1] ?? null, text });
    i = close;
  }
  return out;
}

// ------------------------------------------------------------ the package API

// One project's types, found by name without regard to case, as the language
// finds them. Where two types share a name, the public one is found.
function projectModel(name, project) {
  const types = project?.types ?? [];
  const byName = new Map();
  for (const t of [...types].sort((a, b) => Number(a.public === false) - Number(b.public === false))) {
    const k = t.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, t);
  }
  return { name, types, byName };
}

// Every member a type offers code: its own; a CoClass's default interface's,
// and its source interfaces' as events; a class's bases', however many levels
// up and in whichever package; an interface's base's. Each is `{name, kind,
// from}`, `from` the type that declares it. The first declaration of a name
// wins.
function membersOf(type, model, models, seen = new Set()) {
  const out = new Map();
  if (!type || seen.has(type)) return out;
  seen.add(type);
  const put = (name, kind) => { const k = name.toLowerCase(); if (!out.has(k)) out.set(k, { name, kind, from: type }); };
  for (const [name, kind] of Object.entries(type.members ?? {})) put(name, memberKind(kind, type.kind));
  for (const v of type.values ?? []) put(v, "enumvalue");
  for (const f of type.fields ?? []) put(f, "field");
  const follow = (ref, as) => {
    const target = lookup(ref, model, models);
    if (!target) return;
    for (const [k, m] of membersOf(target, model, models, seen)) if (!out.has(k)) out.set(k, as ? { ...m, kind: as } : m);
  };
  if (type.default) follow(type.default);
  for (const s of type.source ?? []) follow(s, "event");
  for (const b of type.inherits ?? []) follow(b);
  if (type.extends) follow(type.extends);
  return out;
}

function lookup(ref, model, models) {
  const dot = ref.lastIndexOf(".");
  if (dot < 0) return model.byName.get(ref.toLowerCase()) ?? null;
  return models.get(ref.slice(0, dot))?.byName.get(ref.slice(dot + 1).toLowerCase()) ?? null;
}

function memberKind(kind, container) {
  const inModule = container === "module";
  switch (kind) {
    case "sub": return inModule ? "sub" : "method";
    case "function": return inModule ? "function" : "method";
    case "field": return inModule ? "variable" : container === "class" ? "property" : "field";
    case "const": return "constant";
    default: return kind;               // property, event, delegate, enumvalue
  }
}

function typeKind(type) {
  if (type.control) return "control";
  if (type.kind === "coclass") return "class";
  if (type.kind === "union") return "type";
  return type.kind;                     // module, class, interface, enum, type
}

// ------------------------------------------------------------------ pages

const cleanName = (s) => decode(s).trim().replace(DECORATION, "").trim();

// The names a page says it documents: its `symbols:` if it has them, else its
// title and the comma-separated names of its first heading.
function pageNames(page) {
  if (page.symbols?.length) return page.symbols.map(String);
  const names = [cleanName(page.title)];
  const h1 = page.headings.find((h) => h.level === 1);
  if (h1) for (const part of h1.text.split(/,\s*/)) names.push(cleanName(part));
  return [...new Set(names.filter(Boolean))];
}

// --------------------------------------------------------------------- main

/**
 * @param {object} o
 * @param {{src: string, url: string, title: string, parent?: string,
 *   symbols?: string[], headings: {level, id, text}[]}[]} o.pages
 *   every page, `src` relative to the source root and `url` its permalink;
 *   only those under /tB/ are read
 * @param {object} o.api  builder/package-api.json, parsed
 * @returns {{symbols: object[], interfaces: object, packages: object,
 *   gaps: object[], unplaced: object[]}} `gaps` are public members and types
 *   no page documents, `unplaced` the package pages that gave no entry
 */
export function deriveSymbolIndex({ pages, api }) {
  const models = new Map(Object.entries(api?.packages ?? {}).map(([n, p]) => [n, projectModel(n, p)]));
  const symbols = [];
  const seen = new Set();
  const add = (e) => {
    const key = [e.name.toLowerCase(), e.package ?? "", (e.container ?? "").toLowerCase(), e.kind, e.url].join("\0");
    if (seen.has(key)) return;
    seen.add(key);
    symbols.push(e);
  };
  const tbPages = pages.filter((p) => String(p.url).startsWith("/tB/"));

  // ---- the language
  for (const page of tbPages) {
    if (page.src === ATTRIBUTES_PAGE) {
      for (const h of page.headings) {
        const name = /^[A-Za-z_]\w*/.exec(h.text)?.[0];
        if (h.level === 2 && h.id && name) add(entry(name, null, null, "attribute", `${page.url}#${h.id}`));
      }
    } else if (page.src.startsWith(CORE_FOLDER)) {
      const isOperator = /^operators$/i.test(page.parent ?? "");
      for (const form of languageForms(page, isOperator)) {
        form.forEach((name, i) => {
          const kind = DIRECTIVE.test(name) ? "directive" : i > 0 ? "keyword" : isOperator ? "operator" : "statement";
          add(entry(name, null, null, kind, page.url));
        });
      }
    }
  }

  // ---- the packages
  const gaps = [];
  const unplaced = [];
  const interfaces = {};
  const packages = {};
  for (const { folder, projects } of PACKAGE_FOLDERS) {
    const inFolder = tbPages.filter((p) => p.src.startsWith(folder + "/"));
    if (!inFolder.length) continue;
    const label = packageLabel(inFolder, folder);
    for (const pr of projects) packages[pr] = label;
    const used = placeFolder({ folder, projects, pages: inFolder, models, add, gaps, interfaces });
    for (const p of inFolder) {
      if (used.has(p) || isSectionPage(p, folder)) continue;
      unplaced.push({ package: label, url: p.url, title: p.title });
    }
  }

  // By code unit, not localeCompare, whose order depends on the machine's
  // locale: two builds of one tree must write one file.
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  symbols.sort((a, b) => cmp(a.url, b.url) || cmp(a.name, b.name) || cmp(a.kind, b.kind) ||
    cmp(String(a.package), String(b.package)) || cmp(String(a.container), String(b.container)));
  return { symbols, interfaces, packages, gaps, unplaced };
}

function entry(name, pkg, container, kind, url) {
  return { name, package: pkg, container, kind, url };
}

// The forms a Core page documents, each a list of words whose first is the
// statement's own: "On...GoTo, On...GoSub" is [On, GoTo] and [On, GoSub]. A
// statement's words are identifiers and directives; an operator page's may
// be operators too.
function languageForms(page, isOperator) {
  const keep = (w) => IDENTIFIER.test(w) || DIRECTIVE.test(w) || (isOperator && OPERATOR.test(w));
  // `symbols:` on an operator page lists operators, each its own form; on a
  // statement page, the statement and then its keywords.
  if (page.symbols?.length) return isOperator ? page.symbols.map((s) => [String(s)]) : [page.symbols.map(String)];
  const forms = [];
  const h1 = page.headings.find((h) => h.level === 1)?.text;
  for (const text of [page.title, h1]) {
    for (const part of decode(text).split(/,\s*|\s+and\s+/)) {
      const words = cleanName(part).split(FORM_BREAK).filter(keep);
      if (words.length) forms.push(words);
    }
  }
  return forms;
}

// The package's name as its own page gives it: "Assert Package" is Assert.
function packageLabel(pages, folder) {
  const index = pages.find((p) => p.src === `${folder}/index.md`);
  return cleanName(index?.title ?? folder.split("/").pop());
}

// A folder's landing page -- CustomControls' Styles, WebView2's Enumerations --
// is a list of other pages, not a symbol's.
function isSectionPage(page, folder) {
  return /\/index\.md$/.test(page.src) && page.src !== `${folder}/index.md` &&
    cleanName(page.title) === page.src.split("/").slice(-2)[0];
}

// Place a folder's projects on its pages -- CustomControls' folder documents
// two. Returns the pages that gave at least one entry.
function placeFolder({ folder, projects, pages, models, add, gaps, interfaces }) {
  const names = new Map(pages.map((p) => [p, pageNames(p).map((n) => n.toLowerCase())]));
  const used = new Set();
  const folderIndex = pages.find((p) => p.src === `${folder}/index.md`);
  const typePages = new Set();

  // Each project's types on the pages naming them, before any member is
  // placed: a page that is one project's type is no other type's member.
  const states = projects.map((pr) => {
    const model = models.get(pr) ?? projectModel(pr, null);
    if (folderIndex) { add(entry(pr, pr, null, "package", folderIndex.url)); used.add(folderIndex); }
    const typePage = findTypePages(model, pages, names, folderIndex);
    for (const p of typePage.values()) typePages.add(p);
    const state = { pr, model, typePage, members: new Map(), urls: new Map() };
    state.put = (t, name, url, kind) => {
      const k = name.toLowerCase();
      if (!state.members.has(t)) { state.members.set(t, membersOf(t, model, models)); state.urls.set(t, new Map()); }
      const u = state.urls.get(t);
      if (u.has(k)) return;
      u.set(k, url);
      const m = state.members.get(t).get(k);
      add(entry(m?.name ?? name, pr, t.name, kind ?? m?.kind ?? "member", url));
    };
    return state;
  });

  for (const s of states) placeOwnPages(s, { pages, names, typePages, models, add, used, interfaces });
  for (const s of states) placeInherited(s);
  placeByDeclarer(states, { pages, names, typePages, used });
  placeObjects(states[0], { pages, typePages, folderIndex, add, used });
  for (const s of states) placeDollarForms(s);
  for (const s of states) collectGaps(s, gaps);
  return used;
}

// Each type's page: the page naming it. A nested type prefers a page under its
// container's, which is how VBRUN's Constants enumerations are laid out, and a
// public type is placed before a private one of the same name. A CoClass with
// no page of its own is documented on its default interface's:
// AppGlobalClassObject's App is on _App.
function findTypePages(model, pages, names, folderIndex) {
  const typePage = new Map();
  const byPublic = [...model.types].sort((a, b) => Number(a.public === false) - Number(b.public === false));
  for (const t of byPublic) {
    const hits = pages.filter((p) => p !== folderIndex && names.get(p).includes(t.name.toLowerCase()));
    if (!hits.length) continue;
    const under = t.in ? hits.filter((p) => cleanName(p.parent).toLowerCase() === t.in.toLowerCase()) : [];
    typePage.set(t, (under.length ? under : hits)[0]);
  }
  for (const t of model.types) {
    if (t.kind !== "coclass" || typePage.has(t) || !t.default) continue;
    const iface = model.byName.get(t.default.toLowerCase());
    if (iface && typePage.has(iface)) typePage.set(t, typePage.get(iface));
  }
  return typePage;
}

// What each type's own page documents: members with a page of their own under
// the type's page in the nav, members with a heading on it, and what it lists
// in a table rather than under a heading -- an enumeration's values, a Type's
// fields, a module's constants.
function placeOwnPages(s, { pages, names, typePages, models, add, used, interfaces }) {
  const { pr, model, typePage, put } = s;
  for (const [t, page] of typePage) {
    used.add(page);
    add(entry(t.name, pr, t.in ?? null, typeKind(t), page.url));
    if (t.kind === "coclass" && t.default) interfaces[`${pr}.${t.default}`] = `${pr}.${t.name}`;
    if (!s.members.has(t)) { s.members.set(t, membersOf(t, model, models)); s.urls.set(t, new Map()); }
    const ms = s.members.get(t);

    const title = cleanName(page.title).toLowerCase();
    for (const child of pages) {
      if (child === page || typePages.has(child) || cleanName(child.parent).toLowerCase() !== title) continue;
      for (const n of names.get(child)) if (ms.has(n)) { put(t, n, child.url); used.add(child); }
    }
    placeHeadings(page, t.name, (name, url, kind) => {
      if (ms.has(name.toLowerCase())) put(t, name, url);
      else if (kind) put(t, name, url, kind);
    });
    for (const m of ms.values()) {
      if (m.kind === "enumvalue" || m.kind === "field" || (m.kind === "constant" && t.kind === "module")) put(t, m.name, page.url);
    }
  }
}

// An inherited member documented on the page of the type that declares it --
// or of the CoClass whose default interface declares it -- has that URL from
// every type that inherits it.
function placeInherited(s) {
  const { model, typePage, members, urls, put } = s;
  const declaredOn = (declarer, k) => {
    for (const [t, u] of urls) {
      const viaDefault = t.kind === "coclass" && t.default && model.byName.get(t.default.toLowerCase()) === declarer;
      if (u.has(k) && (t === declarer || viaDefault)) return u.get(k);
    }
    return null;
  };
  for (const t of typePage.keys()) {
    for (const [k, m] of members.get(t)) {
      if (urls.get(t).has(k) || m.from === t) continue;
      const url = declaredOn(m.from, k);
      if (url) put(t, m.name, url);
    }
  }
}

// A page no type claimed, named for a member exactly one type declares, is
// that member's -- VBA's Array, filed under Information and declared in
// _HiddenModule, and TbExpressionService's Bind, declared on ITbCustomBinder.
function placeByDeclarer(states, { pages, names, typePages, used }) {
  const declarers = new Map();
  for (const s of states) {
    for (const t of s.model.types) {
      const own = [...Object.keys(t.members ?? {}), ...(t.values ?? []), ...(t.fields ?? [])];
      for (const n of own) {
        const k = n.toLowerCase();
        if (!declarers.has(k)) declarers.set(k, []);
        declarers.get(k).push({ s, t });
      }
    }
  }
  for (const p of pages) {
    if (used.has(p) || typePages.has(p)) continue;
    for (const n of names.get(p)) {
      const ds = declarers.get(n) ?? [];
      if (ds.length !== 1) continue;
      ds[0].s.put(ds[0].t, n, p.url);
      used.add(p);
    }
  }
}

// A page no package declares anything for, whose headings name members of it,
// is an object's -- VBA's Debug, with `## Debug.Print` and three more.
function placeObjects(s, { pages, typePages, folderIndex, add, used }) {
  for (const p of pages) {
    if (used.has(p) || typePages.has(p) || p === folderIndex) continue;
    const own = cleanName(p.title);
    if (!IDENTIFIER.test(own)) continue;
    const found = [];
    placeHeadings(p, own, (name, url, kind, qualified) => { if (qualified || kind) found.push([name, url, kind]); });
    if (!found.length) continue;
    add(entry(own, s.pr, null, "object", p.url));
    for (const [name, url, kind] of found) add(entry(name, s.pr, own, kind ?? "member", url));
    used.add(p);
  }
}

// A `$` form goes where its base went: Left$ to Left, LeftB$ to LeftB.
function placeDollarForms(s) {
  for (const [t, u] of s.urls) {
    for (const [k, m] of s.members.get(t)) {
      const base = k.endsWith("$") ? u.get(k.slice(0, -1)) : null;
      if (base) s.put(t, m.name, base);
    }
  }
}

// Declared, public, and on no page. A class a documented class inherits from
// is not one -- WinNativeCommonCtls' DTPickerBaseCtl is documented as DTPicker,
// and its members are counted there.
function collectGaps(s, gaps) {
  const { pr, model, typePage, members, urls } = s;
  for (const [t, page] of typePage) {
    for (const [k, m] of members.get(t)) {
      if (!urls.get(t).has(k) && !isInternal(m)) gaps.push({ package: pr, container: t.name, name: m.name, kind: m.kind, page: page.url });
    }
  }
  const bases = new Set();
  const walk = (t) => {
    for (const ref of t.inherits ?? []) {
      const b = lookup(ref, model, new Map([[pr, model]]));
      if (b && !bases.has(b)) { bases.add(b); walk(b); }
    }
  };
  for (const t of typePage.keys()) walk(t);
  for (const t of model.types) {
    if (t.public === false || t.hidden || typePage.has(t) || bases.has(t) || t.kind === "interface") continue;
    gaps.push({ package: pr, container: t.in ?? null, name: t.name, kind: typeKind(t), page: null });
  }
}

// Headings pages put among members that are prose, not members: an interface's
// `### Example` under its `## Methods`, a property's `#### Example`.
const PROSE_HEADINGS = new Set(["example", "examples", "remarks", "syntax", "notes", "usage", "parameters", "returns"]);

// Call `found(name, url, kind, qualified)` for each heading on `page` that can
// name a member of `typeName`: every part of it an identifier, or written
// `typeName.Member`. `kind` is the section's for a heading one level under
// Properties, Methods or Events that is not one of PROSE_HEADINGS, and null
// otherwise -- a declared member is found by its name whatever `kind` says, and
// `kind` is what lets an undeclared one be found at all.
//
// Headings one level under a section of members come first, then the rest, so
// a member takes the heading under Properties over a prose section of the same
// name: VB's Screen page has `## Fonts`, about fonts, above the Fonts
// property's `### Fonts`.
function placeHeadings(page, typeName, found) {
  const prefix = `${typeName.toLowerCase()}.`;
  const inSections = [];
  const elsewhere = [];
  let section = null;
  let inMembers = false;
  for (const h of page.headings) {
    if (h.level === 1) { section = null; inMembers = false; continue; }
    const text = h.text.toLowerCase();
    if (h.level === 2) { section = MEMBER_SECTIONS.get(text) ?? null; inMembers = SECTION_TITLES.has(text); }
    if (!h.id || (h.level === 2 && SECTION_TITLES.has(text))) continue;
    const parts = h.text.split(/,\s*/).map((x) => x.trim());
    const qualified = parts.every((x) => x.toLowerCase().startsWith(prefix));
    const bare = qualified ? parts.map((x) => x.slice(prefix.length)) : parts;
    if (!bare.every((x) => IDENTIFIER.test(x))) continue;
    const memberLevel = inMembers && h.level === 3 && !PROSE_HEADINGS.has(text);
    const kind = memberLevel ? section : null;
    for (const x of bare) (memberLevel ? inSections : elsewhere).push([x, `${page.url}#${h.id}`, kind, qualified]);
  }
  for (const args of [...inSections, ...elsewhere]) found(...args);
}

// Members no page is expected to document: constructors and destructors, and
// hidden names.
function isInternal(m) {
  if (/^(New|Class_Initialize|Class_Terminate)$/i.test(m.name) || m.name.startsWith("_")) return true;
  return (m.from?.hiddenMembers ?? []).some((h) => h.toLowerCase() === m.name.toLowerCase());
}

// ------------------------------------------------------------------- output

// Bumped when an entry's fields change meaning, so that an add-in holding an
// index it does not understand can tell.
export const SYMBOL_INDEX_FORMAT = 1;
export const SYMBOL_INDEX_REL = "tB/symbols.json";

/**
 * The build's pages as deriveSymbolIndex reads them: those under /tB/, with the
 * headings of their rendered HTML.
 */
export function symbolPages(pages) {
  return pages
    .filter((p) => String(p.permalink ?? "").startsWith("/tB/") && typeof p.renderedContent === "string")
    .map((p) => {
      const fm = p.frontmatter ?? {};
      return {
        src: p.srcRel, url: p.permalink, title: fm.title, parent: fm.parent,
        symbols: fm.symbols == null ? null : [].concat(fm.symbols).map(String),
        excludeFromDocs: fm.exclude_from_docs == null ? null : [].concat(fm.exclude_from_docs).map(String),
        headings: headingsOf(p.renderedContent),
      };
    });
}

/**
 * The published file: its header, then one entry to a line, so a person can
 * read it and a diff of two builds shows the entries that changed.
 */
export function serializeSymbolIndex({ symbols, interfaces, packages }, api) {
  const head = {
    format: SYMBOL_INDEX_FORMAT,
    api: api?.build ?? null,
    packages,
    interfaces,
  };
  const lines = ["{"];
  for (const [k, v] of Object.entries(head)) lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  lines.push(`  "symbols": [`);
  symbols.forEach((s, i) => lines.push(`    ${JSON.stringify(s)}${i < symbols.length - 1 ? "," : ""}`));
  lines.push("  ]", "}");
  return lines.join("\n") + "\n";
}

/**
 * The gaps a maintainer would act on: public members and types no page
 * documents, less what a package's index page lists under
 * `exclude_from_docs:` -- deliberately undocumented modules and classes, and
 * the types inside them -- and types declared inside a type that is not public.
 */
export function reportableGaps(result, pages, api) {
  const excluded = new Map();                      // project -> Set of lowercased names
  for (const { folder, projects } of PACKAGE_FOLDERS) {
    const index = pages.find((p) => p.src === `${folder}/index.md`);
    const names = new Set((index?.excludeFromDocs ?? []).map((n) => n.toLowerCase()));
    for (const pr of projects) excluded.set(pr, names);
  }
  const typeOf = (pr, name) => (api?.packages?.[pr]?.types ?? []).find((t) => t.name.toLowerCase() === String(name).toLowerCase());
  return result.gaps.filter((g) => {
    const skip = excluded.get(g.package) ?? new Set();
    if (skip.has(String(g.container ?? "").toLowerCase()) || (!g.container && skip.has(g.name.toLowerCase()))) return false;
    if (g.page === null && g.container) {
      const container = typeOf(g.package, g.container);
      if (container?.public === false || skip.has(String(container?.in ?? "").toLowerCase())) return false;
    }
    return true;
  });
}
