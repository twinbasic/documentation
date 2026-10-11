import { qualified } from "./api-model.mjs";

/**
 * The symbols of an api.json, flattened for diffing and for the coverage audit:
 * one for each type and one for each name a type declares. A name declared
 * several times in a type -- a property's Get, Let and Set, or overloads -- is
 * one symbol, the way the documentation has one page for it.
 */

// How a kind is written in a report and in a package page's `exclude_kinds:`.
const KIND_NAMES = {
  module: "Module",
  class: "Class",
  interface: "Interface",
  coclass: "CoClass",
  enum: "Enum",
  type: "Type",
  union: "Union",
  sub: "Sub",
  function: "Function",
  property: "Property",
  event: "Event",
  delegate: "Delegate",
  const: "Const",
  field: "Field",
};

// A Declare statement is a Sub or a Function that is also a Declare; reports
// call it a Declare.
const memberKindName = (m) => (m.declare ? "Declare" : (KIND_NAMES[m.kind] ?? m.kind));

/**
 * Whether a member can be reached from outside its type: Public, or Protected
 * for the types that inherit it. Private and Friend are the package's own.
 */
const isReachable = (vis) => vis === "public" || vis === "protected";

/**
 * The declarations a member stands for: itself, or for a member that holds the
 * alternatives of an #If (`signatures`), one for each, as if it were a member of
 * its own. The condition goes in front of the signature, as `#If Win64 Then ...`,
 * so that a change of condition is a change of signature.
 */
const declarationsOf = (m) =>
  m.signatures
    ? m.signatures.map((s) => ({ ...m, ...s, signature: s.cond ? `#If ${s.cond} Then ${s.signature}` : s.signature }))
    : [m];

/**
 * Every symbol of an api.json, in the order the file lists them:
 *
 * ```
 * { key, container, name, kind, isType, vis, public, signature, attributes,
 *   detail, description, file }
 * ```
 *
 * - `key` is what a symbol is identified by across two snapshots: the kind and
 *   the type's name with the types it is declared in (`Interface:Outer.Inner`),
 *   or the type's path, the name and the kind (`Outer.Name.Function`). Two
 *   symbols with one key -- the same type declared in two files -- get `#2` and
 *   so on, in file order.
 * - `container` is the path of the type the symbol is declared in, or null.
 * - `public` is whether documentation should cover it. A type is public unless
 *   api.json says `public: false`; a member only if it is Public or Protected,
 *   and only the members of a public type are listed at all.
 * - `signature` is the declaration; for a name declared more than once, all of
 *   them on lines of their own. A member that holds the alternatives of an `#If`
 *   (`signatures` in api.json) contributes each of them, with its condition in
 *   front: `#If Win64 Then Public Declare ...`.
 * - `attributes` and `detail` are JSON text, compared as text: the attributes,
 *   and for a type what the signature leaves out (the enumeration values, the
 *   fields, the interfaces a CoClass is built on, what a type inherits and
 *   implements).
 */
export function flattenSymbols(api) {
  const symbols = [];
  const seen = new Map();
  const unique = (key) => {
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? key : `${key}#${n}`;
  };

  for (const t of api.types ?? []) {
    const path = qualified(t);
    const isPublic = t.public !== false;
    const kind = KIND_NAMES[t.kind] ?? t.kind;
    symbols.push({
      key: unique(`${kind}:${path}`),
      container: t.in ?? null,
      name: t.name,
      kind,
      isType: true,
      vis: t.vis,
      public: isPublic,
      signature: t.signature,
      attributes: JSON.stringify(t.attrs ?? []),
      detail: JSON.stringify([t.values, t.fields, t.interfaces, t.inherits, t.implements, t.extends]),
      description: t.description ?? null,
      file: t.file,
    });
    // The members of a type that is not public are not part of the package's API.
    if (!isPublic) continue;

    const groups = new Map();
    for (const m of (t.members ?? []).flatMap(declarationsOf)) {
      const id = `${m.name}\u0000${memberKindName(m)}`;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(m);
    }
    for (const group of groups.values()) {
      const first = group[0];
      const kindName = memberKindName(first);
      const reach = group.find((m) => isReachable(m.vis)) ?? first;
      symbols.push({
        key: unique(`${path}.${first.name}.${kindName}`),
        container: path,
        name: first.name,
        kind: kindName,
        isType: false,
        vis: reach.vis,
        public: isReachable(reach.vis),
        signature: group.map((m) => m.signature).join("\n"),
        attributes: JSON.stringify(group.map((m) => m.attrs ?? [])),
        detail: "",
        description: group.find((m) => m.description != null)?.description ?? null,
        file: t.file,
      });
    }
  }
  return symbols;
}

/**
 * What changed between two api.json snapshots of one package: `added` and
 * `removed` symbols, `modified` ones as `{ current, baseline, changes }` with
 * `changes` naming what differs (`signature`, `attributes`, `detail`), and
 * the `unchanged`.
 */
export function diffApi(baseline, current) {
  const baseMap = new Map();
  for (const sym of flattenSymbols(baseline)) baseMap.set(sym.key, sym);

  const curMap = new Map();
  for (const sym of flattenSymbols(current)) curMap.set(sym.key, sym);

  const added = [];
  const modified = [];
  const removed = [];
  const unchanged = [];

  for (const [key, cur] of curMap) {
    const base = baseMap.get(key);
    if (!base) {
      added.push(cur);
      continue;
    }
    const changes = ["signature", "attributes", "detail"].filter((field) => cur[field] !== base[field]);
    if (changes.length) modified.push({ current: cur, baseline: base, changes });
    else unchanged.push(cur);
  }

  for (const [key, base] of baseMap) {
    if (!curMap.has(key)) removed.push(base);
  }

  return { added, modified, removed, unchanged };
}

/**
 * Splits the public symbols of an api.json into those a documentation page
 * already has -- one whose `title:` is the symbol's name, in `docPageMap`,
 * title to file -- and those it has not. Each entry is a symbol of
 * flattenSymbols; a documented one also has `docPage`.
 */
export function auditCoverage(apiJson, docPageMap) {
  const documented = [];
  const undocumented = [];

  for (const sym of flattenSymbols(apiJson)) {
    if (!sym.public) continue;
    const page = docPageMap.get(sym.name);
    if (page) documented.push({ ...sym, docPage: page });
    else undocumented.push(sym);
  }

  return { documented, undocumented };
}
