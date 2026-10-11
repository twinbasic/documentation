import path from "node:path";
import { parseSources } from "../../scripts/lib/twin-api.mjs";
import { MODIFIERS } from "../../scripts/lib/twin-declarations.mjs";
import { CONTAINER_MAP, preprocessVB6 } from "./vb6-preprocess.mjs";

/**
 * The api.json a package is indexed into, built from what
 * `scripts/lib/twin-api.mjs` reads out of its sources. The schema is described
 * in indexer/README.md; this is the code that writes it.
 *
 * Every list is in code-unit order, with two exceptions: the values of an
 * enumeration and the fields of a Type or Union stay in declaration order,
 * because that order is part of what they mean. Line numbers are left out, so
 * that a snapshot changes only when the API does.
 */

/** Changes whenever the shape of api.json does; the first number in the file. */
export const API_FORMAT = 2;

const SOURCES = /^Sources\//i;
const VB6_EXTS = new Set(Object.keys(CONTAINER_MAP));
const MODIFIER_WORD = new RegExp(`^(?:${MODIFIERS})$`, "i");

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** A type's name with the types it is declared in: `Outer.Inner`. */
export const qualified = (t) => (t.in ? `${t.in}.${t.name}` : t.name);

/**
 * The source files of a package that are indexed, in the form
 * `parseSources` takes. A `.twin` file is read as it is. A VB6-format file goes
 * through preprocessVB6 first and is handed over as `<path>.twin`, because
 * parseSources reads nothing else; `fileOf` maps that path back to the file's
 * own, relative to `Sources/`. The `.tbform`, `.tbcontrol` and `.tbppage` files
 * are JSON designer files with no declarations in them, and are skipped, as is
 * everything outside `Sources/`.
 */
function sourceInputs(files) {
  const inputs = [];
  const fileOf = new Map();
  let settings = null;
  for (const { relativePath, content } of files) {
    if (relativePath.toLowerCase() === "settings") {
      settings = content.toString("utf-8");
      continue;
    }
    if (!SOURCES.test(relativePath)) continue;
    const ext = path.extname(relativePath).toLowerCase();
    const inside = relativePath.slice("Sources/".length);
    if (ext === ".twin") {
      inputs.push({ path: relativePath, text: content.toString("utf-8") });
      fileOf.set(relativePath, inside);
    } else if (VB6_EXTS.has(ext)) {
      const { content: text } = preprocessVB6(
        content.toString("utf-8"),
        ext,
        path.basename(relativePath, path.extname(relativePath)),
      );
      inputs.push({ path: `${relativePath}.twin`, text });
      fileOf.set(`${relativePath}.twin`, inside);
    }
  }
  return { inputs, fileOf, settings };
}

/** The text after the `=` of an enumeration value's declaration, or null. */
function enumValueOf(signature) {
  let depth = 0;
  let quoted = false;
  for (let k = 0; k < signature.length; k++) {
    const c = signature[k];
    if (c === '"') quoted = !quoted;
    else if (quoted) continue;
    else if (c === "[") depth++;
    else if (c === "]") depth--;
    else if (c === "=" && depth <= 0) return signature.slice(k + 1).trim() || null;
  }
  return null;
}

/** Whether a procedure's declaration is a `Declare` statement: Declare after nothing but modifiers. */
function isDeclare(signature) {
  for (const word of signature.split(/\s+/)) {
    if (/^Declare(?:Wide)?$/i.test(word)) return true;
    if (!MODIFIER_WORD.test(word)) return false;
  }
  return false;
}

// The name a member is known by. A type-declaration character on a name written
// without brackets is not part of the name: `Public Function Command$()` is
// `Command`, and `Const REAL_EPSILON! = 1` is `REAL_EPSILON`. A name written in
// brackets keeps it, as VBA's `Function [Chr$]` does.
function declaredName(name, signature) {
  if (!/[$%&!#@]$/.test(name) || signature.includes(`[${name}]`)) return name;
  return name.slice(0, -1);
}

// An attribute as {name, args}; `args` is left out when it has no parentheses.
const attrRecord = (a) => (a.args === null ? { name: a.name } : { name: a.name, args: a.args });

/**
 * What every declaration records besides its name, in the order api.json writes
 * them. A Description attribute whose text was read is `description`, and is not
 * repeated among the `attrs`.
 */
function common(rec, d) {
  if (d.hidden) rec.hidden = true;
  const attrs = d.description == null ? d.attrs : d.attrs.filter((a) => !/^Description$/i.test(a.name));
  if (attrs.length) rec.attrs = attrs.map(attrRecord);
  if (d.description != null) rec.description = d.description;
  return rec;
}

function memberRecord(m) {
  const rec = { name: declaredName(m.name, m.signature), kind: m.kind, vis: m.vis };
  if (isDeclare(m.signature)) rec.declare = true;
  rec.signature = m.signature;
  if (m.returnType != null) rec.returnType = m.returnType;
  if (m.accessor != null) rec.accessor = m.accessor;
  return common(rec, m);
}

function valueRecord(m) {
  const rec = { name: m.name };
  const value = enumValueOf(m.signature);
  if (value !== null) rec.value = value;
  return common(rec, m);
}

function fieldRecord(m) {
  return common({ name: declaredName(m.name, m.signature), vis: m.vis, signature: m.signature }, m);
}

// The index in `types` of the type each is declared in, or -1: the nearest type
// of that name before it in its file.
function parentsOf(types) {
  return types.map((t, i) => {
    if (!t.container) return -1;
    const want = t.container.toLowerCase();
    for (let j = i - 1; j >= 0 && types[j].file === t.file; j--) {
      if (types[j].name.toLowerCase() === want) return j;
    }
    return -1;
  });
}

const inline = JSON.stringify;

// A list with one item to a line, each written by `each`; an empty one is `[]`.
function listing(items, pad, each) {
  if (!items.length) return "[]";
  return `[\n${items.map((item) => `${pad}  ${each(item)}`).join(",\n")}\n${pad}]`;
}

/**
 * The text of an api.json: JSON, laid out so that a snapshot is small and a
 * change to one member changes one line of it. The document and each type are
 * written a key to a line, each member, value, field, alias and problem on a
 * line of its own, and everything below those on the same line.
 */
export function renderApi(api) {
  const type = (t, pad) => {
    const keys = Object.entries(t).map(([k, v]) => {
      const text = ["members", "values", "fields"].includes(k) ? listing(v, `${pad}  `, inline) : inline(v);
      return `${pad}  ${inline(k)}: ${text}`;
    });
    return `{\n${keys.join(",\n")}\n${pad}}`;
  };
  const head = ["format", "package", "project", "version"].map((k) => `  ${inline(k)}: ${inline(api[k])}`);
  return `{\n${[
    ...head,
    `  "types": ${listing(api.types, "  ", (t) => type(t, "    "))}`,
    `  "aliases": ${listing(api.aliases, "  ", inline)}`,
    `  "problems": ${listing(api.problems, "  ", inline)}`,
  ].join(",\n")}\n}\n`;
}

/**
 * The api.json of a package, as an object and as the text written to disk.
 *
 * @param {object} p
 * @param {string} p.symbol  the package's name in the store
 * @param {string} p.version  the version string
 * @param {{relativePath: string, content: Buffer}[]} p.files  every file of
 *   the package, the paths relative to its root
 * @returns {{api: object, json: string, stats: {files: number, types: number,
 *   members: number, aliases: number, problems: number}}}
 */
export function buildApi({ symbol, version, files }) {
  const { inputs, fileOf, settings } = sourceInputs(
    [...files].sort((a, b) => byCodeUnit(a.relativePath, b.relativePath)),
  );
  const parsed = parseSources(inputs, settings);
  const inside = (file) => fileOf.get(file) ?? file;

  const parents = parentsOf(parsed.types);
  const inPath = [];
  const reachable = [];
  const records = parsed.types.map((t, i) => {
    const p = parents[i];
    inPath[i] = p < 0 ? null : `${inPath[p] ? `${inPath[p]}.` : ""}${parsed.types[p].name}`;
    reachable[i] = t.vis === "public" && (p < 0 || reachable[p]);
    // An Enum is public for its own modifier alone: the corpus declares them in
    // Private modules for public use.
    const isPublic = t.kind === "enum" ? t.vis === "public" : reachable[i];

    const rec = { name: t.name, kind: t.kind };
    if (inPath[i]) rec.in = inPath[i];
    rec.vis = t.vis;
    if (!isPublic) rec.public = false;
    rec.file = inside(t.file);
    rec.signature = t.signature;
    if (t.extends) rec.extends = t.extends;
    if (t.inherits.length) rec.inherits = t.inherits;
    if (t.implements.length) rec.implements = t.implements;
    if (t.interfaces.length) {
      rec.interfaces = t.interfaces.map((x) => {
        const o = { name: x.name };
        if (x.isDefault) o.default = true;
        if (x.isSource) o.source = true;
        return o;
      });
    }
    common(rec, t);

    // Stable sorts: members of one name stay in declaration order.
    const sorted = (list, map) =>
      list
        .map((m, order) => ({ m, order }))
        .sort((a, b) => byCodeUnit(a.m.name, b.m.name) || byCodeUnit(a.m.kind, b.m.kind) || a.order - b.order)
        .map(({ m }) => map(m));
    if (t.kind === "enum") {
      rec.values = t.members.map(valueRecord);
    } else if (t.kind === "type" || t.kind === "union") {
      rec.fields = t.members.filter((m) => m.kind === "field").map(fieldRecord);
      rec.members = sorted(
        t.members.filter((m) => m.kind !== "field"),
        memberRecord,
      );
    } else {
      rec.members = sorted(t.members, memberRecord);
    }
    return rec;
  });

  const types = records
    .map((rec, order) => ({ rec, order }))
    .sort(
      (a, b) =>
        byCodeUnit(qualified(a.rec), qualified(b.rec)) ||
        byCodeUnit(a.rec.kind, b.rec.kind) ||
        byCodeUnit(a.rec.file, b.rec.file) ||
        a.order - b.order,
    )
    .map(({ rec }) => rec);

  const aliases = parsed.aliases
    .map((a, order) => ({ a, order }))
    .sort(
      (x, y) => byCodeUnit(x.a.name, y.a.name) || byCodeUnit(inside(x.a.file), inside(y.a.file)) || x.order - y.order,
    )
    .map(({ a }) => {
      const rec = { name: a.name, target: a.target, vis: a.vis };
      if (a.container) rec.in = a.container;
      rec.file = inside(a.file);
      rec.signature = a.signature;
      return common(rec, a);
    });

  const problems = parsed.problems
    .map((p) => ({ file: inside(p.file), line: p.line, why: p.why }))
    .sort((a, b) => byCodeUnit(a.file, b.file) || a.line - b.line || byCodeUnit(a.why, b.why));

  const api = {
    format: API_FORMAT,
    package: symbol,
    project: parsed.project,
    version,
    types,
    aliases,
    problems,
  };
  const stats = {
    files: inputs.length,
    types: types.length,
    members: types.reduce(
      (n, t) => n + (t.members?.length ?? 0) + (t.values?.length ?? 0) + (t.fields?.length ?? 0),
      0,
    ),
    aliases: aliases.length,
    problems: problems.length,
  };
  return { api, json: renderApi(api), stats };
}
