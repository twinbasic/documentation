// Writes the module pages of the tbKMode section, docs/Reference/Contributed/tbKMode/<Module>.md,
// from what this folder holds for each module and from what the repository already has:
//
// - <Module>/frame.md: the page, with placeholders where the generated parts go;
// - <Module>/names.json: one description for each public name, by section;
// - <Module>/procedures.md (modWDM): one ### section for each procedure with a body;
// - the package's snapshot (indexer/snapshots/contributed/tbKMode/api.json): the module's public
//   names of each kind, a constant's value, an alias's type;
// - ../wdk/learn/<Module>.json: the Microsoft Learn page of a name, which its cell links to;
// - the cases of ../Sources and ../expect.json: the passing cases a table's test marker lists.
//
// A placeholder is on a line of its own, apart from {{cases:...}}:
//
//   {{table:<section>}}   the table of a section of names.json: declares, delegates, types, enums,
//                         variables (Name, Description), consts (Name, Value, Description) or
//                         aliases (Name, Type, Description), its rows in alphabetical order;
//                         {{table:variables typed}} gives the variables a Type column. A constant's
//                         value is its declaration's, one for each build under #If Win64; one under
//                         another #If is given in names.json as [value, description].
//   {{procedures}}        procedures.md's sections, in alphabetical order
//   {{cases:<Fixture> ... -<Case> ...}}
//                         the cases of each fixture that expect.json does not record as failing,
//                         less those named after a `-`, as `Fixture.Case`, separated by commas
//
// A public name with no description yet (one a new version of the package adds) is left off the
// page with a warning; a description of a name the module does not have is an error, and so is a
// failing case of a listed fixture that no literal test marker of the page names (the callout
// that says why it fails).
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const HERE = import.meta.dirname;
const PACKAGE = path.join(HERE, "..");
const ROOT = path.join(PACKAGE, "..", "..", "..");
const DOCS = path.join(ROOT, "docs", "Reference", "Contributed", "tbKMode");
const SNAPSHOT = path.join(ROOT, "indexer", "snapshots", "contributed", "tbKMode", "api.json");

const USAGE = `usage: node writer.mjs [--check] [<Module> ...]

Writes the module pages of the tbKMode section from <Module>/frame.md, <Module>/names.json and the
package's snapshot: every module of this folder, or those named.

  --check     writes nothing: lists each page that differs from what would be written, and exits 1
              if one does
  -h, --help  prints this text

Exit codes: 0 done, 1 a page differs (--check) or a module's sources have an error, 2 the command
line was refused.`;

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const byName = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());

/** The public names of a module by section, with the members the tables need. */
function packageNames(api, module) {
  // The page holds every Module of the module's file: tbKMode 0.3.0.8 declares ImageMachineType in
  // a Module SuppressedWarnings of modImage.twin, to turn a warning off.
  const mods = api.types.filter((t) => t.kind === "module" && t.file === `${module}.twin`);
  const group = new Set(mods.map((t) => t.name));
  const members = mods.flatMap((t) => t.members ?? []).filter((m) => m.vis === "public");
  const unique = (list) => [...new Set(list.map((x) => x.name))];
  const typesOf = (kind) => unique(api.types.filter((t) => group.has(t.in) && t.kind === kind && t.vis === "public"));
  // A name that is a procedure in one build and a Declare in another (modWDM's InterlockedIncrement)
  // is a procedure.
  const procedures = unique(members.filter((m) => !m.declare && (m.kind === "sub" || m.kind === "function")));
  return {
    names: {
      declares: unique(members.filter((m) => m.declare)).filter((n) => !procedures.includes(n)),
      delegates: unique(members.filter((m) => m.kind === "delegate")),
      types: typesOf("type"),
      enums: typesOf("enum"),
      consts: unique(members.filter((m) => m.kind === "const")),
      variables: unique(members.filter((m) => m.kind === "field")),
      aliases: unique((api.aliases ?? []).filter((a) => a.vis === "public" && a.file === `${module}.twin`)),
      procedures,
    },
    members,
    aliases: api.aliases ?? [],
  };
}

// A constant under #If Win64 has a value for each build. One under another condition (a #Const of
// the package's) has the value names.json gives, as [value, description], which must be one of its
// values.
const BUILDS = { Win64: "64-bit", "Not (Win64)": "32-bit" };
const code = (v) => (v.includes("`") ? `\`\` ${v} \`\`` : `\`${v}\``);
function constValue(members, name, given) {
  const declared = (sig) => {
    // Keywords in any case: tbKMode 0.3.0.6 writes `Public const KI_USER_SHARED_DATA as LongPtr`.
    const m = /^Public Const \w+(?: As \w+)? = (.+)$/i.exec(sig);
    if (!m) throw new Error(`${name}: no value in ${sig}`);
    return m[1].trim();
  };
  const m = members.find((x) => x.kind === "const" && x.name === name);
  const values = (m.signatures ?? [m]).map((s) => declared(s.signature));
  if (given !== undefined) {
    if (!values.includes(given)) throw new Error(`${name}: names.json gives ${given}, not one of ${values.join(", ")}`);
    return code(given);
  }
  if (m.signature) return code(values[0]);
  return m.signatures
    .map((s, i) => {
      if (!BUILDS[s.cond]) throw new Error(`${name}: its value depends on ${s.cond}: give it in names.json`);
      return `${code(values[i])} (${BUILDS[s.cond]})`;
    })
    .join(", ");
}

/** A variable's type: `Public X As String = "Z:"` is String. */
function variableType(members, name) {
  const m = members.find((x) => x.kind === "field" && x.name === name);
  const t = /\bAs (\w+)/.exec(m.signature ?? m.signatures?.[0]?.signature ?? "")?.[1];
  if (!t) throw new Error(`${name}: no type in its declaration`);
  return t;
}

/** The page of one module: `{page, warnings}`; throws on an error in its sources. */
function modulePage(module, api, expect) {
  const dir = path.join(HERE, module);
  const frame = read(path.join(dir, "frame.md"));
  const descriptions = JSON.parse(read(path.join(dir, "names.json")));
  const { names, members, aliases } = packageNames(api, module);
  const warnings = [];
  const errors = [];

  const learnFile = path.join(PACKAGE, "wdk", "learn", `${module}.json`);
  const learn = new Map(
    existsSync(learnFile)
      ? JSON.parse(read(learnFile))
          .filter((x) => x.url)
          .map((x) => [x.name, x.url])
      : [],
  );
  const cell = (n) => (learn.get(n) ? `[**${n}**](${learn.get(n)}){: #${n} }` : `**${n}**{: #${n} }`);

  // Each section's descriptions against the module's names of that kind.
  const described = (section) => {
    const d = descriptions[section] ?? {};
    const want = names[section];
    if (!want) throw new Error(`${module}: names.json has no section ${section} of the package's`);
    for (const n of Object.keys(d).filter((x) => !want.includes(x)))
      errors.push(`names.json ${section}: ${n} is not a public name of ${module}`);
    for (const [n, entry] of Object.entries(d)) {
      const text = section === "consts" && Array.isArray(entry) ? entry[1] : entry;
      if (typeof text !== "string" || !text.trim()) errors.push(`names.json ${section}: ${n} is empty`);
      else if (/\n/.test(text)) errors.push(`names.json ${section}: ${n} has a line break, which ends its row`);
    }
    const missing = want.filter((n) => !(n in d));
    if (missing.length) warnings.push(`${section}: no description yet for ${missing.join(" ")}`);
    return Object.keys(d)
      .filter((n) => want.includes(n))
      .sort(byName);
  };

  const typed = (list, d, typeOf) => [
    "| Name | Type | Description |",
    "|------|------|-------------|",
    ...list.map((n) => `| **${n}**{: #${n} } | **${typeOf(n)}** | ${d[n]} |`),
  ];
  const tables = {
    consts: (list, d) => [
      "| Name | Value | Description |",
      "|------|-------|-------------|",
      ...list.map((n) => {
        const [given, text] = Array.isArray(d[n]) ? d[n] : [undefined, d[n]];
        return `| **${n}**{: #${n} } | ${constValue(members, n, given).replace(/\|/g, "\\|")} | ${text} |`;
      }),
    ],
    // An alias declared once for each build (modImage's IMAGE_LOAD_CONFIG_DIRECTORY) has each of its
    // targets: the snapshot keeps no #If of an alias, so its description says which build has which.
    aliases: (list, d) =>
      typed(list, d, (n) => [...new Set(aliases.filter((a) => a.name === n).map((a) => a.target))].join("** or **")),
  };
  // `typed`: the Type column a variables table has (modDisk's).
  const table = (section, option) => {
    const list = described(section);
    const d = descriptions[section];
    if (option === "typed" && section === "variables")
      return typed(list, d, (n) => variableType(members, n)).join("\n");
    if (option) throw new Error(`${module}: {{table:${section} ${option}}} is no table`);
    const rows = tables[section]
      ? tables[section](list, d)
      : ["| Name | Description |", "|------|-------------|", ...list.map((n) => `| ${cell(n)} | ${d[n]} |`)];
    return rows.join("\n");
  };

  // The procedures: procedures.md's ### sections, each with its anchor line.
  const procedures = () => {
    const text = read(path.join(dir, "procedures.md")).trim();
    if (!text.startsWith("### ")) errors.push("procedures.md has text before its first section");
    const sections = new Map();
    for (const s of text.split(/^(?=### )/m).map((x) => x.trim())) {
      const n = /^### (\S+)\s*\n/.exec(s)?.[1];
      if (!n) {
        errors.push(`procedures.md: a section heading is not one name: ${s.split("\n")[0]}`);
        continue;
      }
      if (sections.has(n)) errors.push(`procedures.md: ${n} is given twice`);
      if (!names.procedures.includes(n)) errors.push(`procedures.md: ${n} is not a procedure of ${module}`);
      if (!s.includes(`\n{: #${n} }\n`)) errors.push(`procedures.md: ${n} lacks its anchor line {: #${n} }`);
      sections.set(n, s);
    }
    const missing = names.procedures.filter((n) => !sections.has(n));
    if (missing.length) warnings.push(`procedures: no section yet for ${missing.join(" ")}`);
    return [...sections.keys()]
      .sort(byName)
      .map((n) => sections.get(n))
      .join("\n\n");
  };

  // The passing cases of fixtures; the failing ones must each be named by a literal marker.
  const listed = new Set();
  const cases = (spec) => {
    const words = spec.trim().split(/\s+/);
    const skip = words.filter((w) => w.startsWith("-")).map((w) => w.slice(1));
    const out = [];
    for (const f of words.filter((w) => !w.startsWith("-"))) {
      listed.add(f);
      const file = path.join(PACKAGE, "Sources", `${f}.twin`);
      if (!existsSync(file)) throw new Error(`${module}: {{cases:${spec}}} names ${f}, which is no fixture`);
      for (const m of read(file).matchAll(/Public Sub (\w+)\(\)/g)) {
        const c = `${f}.${m[1]}`;
        if (!(c in expect) && !skip.includes(m[1])) out.push(c);
      }
    }
    return out.join(", ");
  };

  let page = frame;
  for (const m of frame.matchAll(/^\{\{(\w+)(?::(\w+)(?: (\w+))?)?\}\}$/gm)) {
    const [line, what, section, option] = m;
    let block;
    if (what === "table" && section) block = table(section, option);
    else if (what === "procedures" && !section) block = procedures();
    else throw new Error(`${module}: frame.md has an unknown placeholder ${line}`);
    page = page.replace(line, () => block);
  }
  page = page.replace(/\{\{cases:([^}]*)\}\}/g, (_, spec) => cases(spec));
  const left = page.match(/\{\{(?!tbdocs:)[^}]*\}\}/g);
  if (left) errors.push(`placeholders left: ${left.join(" ")}`);

  // Every public kind of name the module has is on its page.
  for (const [section, list] of Object.entries(names)) {
    const placeholder = section === "procedures" ? "{{procedures}}" : `{{table:${section}}}`;
    const re =
      section === "procedures" ? /^\{\{procedures\}\}$/m : new RegExp(`^\\{\\{table:${section}( \\w+)?\\}\\}$`, "m");
    if (list.length && !re.test(frame))
      warnings.push(`${section}: ${list.length} public names, and the frame has no ${placeholder}`);
  }

  // A failing case of a listed fixture is named by a literal marker of the frame or the procedures.
  const literal = frame + (existsSync(path.join(dir, "procedures.md")) ? read(path.join(dir, "procedures.md")) : "");
  const marked = new Set(
    [...literal.matchAll(/<!-- test: ([^>]*?) -->/g)].flatMap((m) =>
      m[1].includes("{{") ? [] : m[1].split(",").map((s) => s.trim()),
    ),
  );
  for (const c of Object.keys(expect))
    if (listed.has(c.split(".")[0]) && !marked.has(c))
      errors.push(`${c} fails (expect.json), and no test marker names it`);

  if (errors.length) throw new Error(`${module}:\n  ${errors.join("\n  ")}`);
  return { page, warnings };
}

let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: { check: { type: "boolean" }, help: { type: "boolean", short: "h" } },
  });
} catch (e) {
  console.error(`writer: ${e.message}\n${USAGE}`);
  process.exit(2);
}
if (parsed.values.help) {
  console.log(USAGE);
  process.exit(0);
}
const all = readdirSync(HERE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(HERE, d.name, "frame.md")))
  .map((d) => d.name);
const unknown = parsed.positionals.filter((m) => !all.includes(m));
if (unknown.length) {
  console.error(`writer: no module ${unknown.join(", ")} here (${all.join(", ")})\n${USAGE}`);
  process.exit(2);
}
const api = JSON.parse(read(SNAPSHOT));
const expect = JSON.parse(read(path.join(PACKAGE, "expect.json"))).cases ?? {};
let failed = false;
for (const module of parsed.positionals.length ? parsed.positionals : all) {
  let result;
  try {
    result = modulePage(module, api, expect);
  } catch (e) {
    console.error(e.message);
    failed = true;
    continue;
  }
  for (const w of result.warnings) console.warn(`${module}: ${w}`);
  const out = path.join(DOCS, `${module}.md`);
  const now = existsSync(out) ? read(out) : null;
  if (parsed.values.check) {
    if (now !== result.page) {
      console.log(`${module}: docs/Reference/Contributed/tbKMode/${module}.md differs`);
      failed = true;
    }
  } else if (now !== result.page) {
    writeFileSync(out, result.page);
    console.log(`wrote docs/Reference/Contributed/tbKMode/${module}.md`);
  }
}
process.exitCode = failed ? 1 : 0;
