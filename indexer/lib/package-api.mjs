import { apiSnapshot } from "../../scripts/lib/twin-api.mjs";
import { parsePackageFiles } from "./api-model.mjs";

/**
 * builder/package-api.json: the public API of the packages a twinBASIC build
 * ships, as the package half of the documentation's symbol index. `twin-index
 * derive` writes it from the packages `sync` reads, parsed as buildApi parses
 * them; tbdocs reads it and never writes it, because writing it needs the
 * packages and CI has none.
 *
 * WHAT THE BUILD TAKES FROM IT. The symbol index (builder/symbols.mjs) takes its
 * entries and their URLs from the pages. Four things only the packages know:
 *
 *   - the kind of a member documented on a page of its own -- `Collection.Add`
 *     is a method and `_App.Path` a property, and nothing on either page says so
 *     in a form a build can read;
 *   - the values of an enumeration, which pages list in tables, not headings;
 *   - the interface a CoClass's members are declared on, since that is what the
 *     compiler names a member by: hover says `in VBA._Collection` for
 *     `Collection.Add` and `in tbIDE.IToolWindowsV1` for `ToolWindows.Add`;
 *   - which public symbols have no page, which the build reports.
 *
 * So the file holds every type each package declares, marked when it is not
 * public, with the public members of each that code can reach: a public
 * type's, and those of a non-public type a public one exposes -- `CheckBox`
 * declares almost nothing itself and gets its members from `CheckBoxBaseCtl`,
 * `ButtonBase` and three levels more, and `Clipboard`'s are on a Private
 * Interface. apiSnapshot in scripts/lib/twin-api.mjs says which is which.
 *
 * Unlike an api.json, it keeps the types and members in declaration order:
 * apiSnapshot gives a member the kind of the first declaration of its name.
 */

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The file's text, and what the packages gave to report.
 *
 * @param {object} p
 * @param {number|string|null} p.build  the BETA number the file records
 * @param {{symbol: string, files: {relativePath: string, content: Buffer}[]}[]} p.packages
 *   every package of the build, as the indexer reads them
 * @returns {{text: string, types: number, members: number, problems: object[],
 *   unresolved: string[]}}
 * @throws when packages under one project name declare different APIs
 */
export function derivePackageApi({ build, packages }) {
  const { parsed, exportsOf, problems } = readAll(packages);
  const { packages: model, unresolved } = apiSnapshot(parsed);
  let types = 0;
  let members = 0;
  for (const list of Object.values(model)) {
    types += list.length;
    for (const t of list)
      members += Object.keys(t.members ?? {}).length + (t.values?.length ?? 0) + (t.fields?.length ?? 0);
  }
  return {
    text: serialize({ build, packages: model, exportsOf }),
    types,
    members,
    problems,
    unresolved: [...new Set(unresolved)],
  };
}

// A package is known to code, and to the compiler, by its project name, which
// is not always its folder's: TwinBasicAssertions is `Assert`, all three CEF
// builds are `cefPackage`, and AppGlobalClassObject is `AppGlobalClassProject`.
// Hover says `in Assert.Exact`, so the file is keyed by the project name, and
// the packages each name covers are listed under it as its `exports`. The name
// comes from the Settings file; a package without one is known by its own.
function readAll(packages) {
  const parsed = new Map(); // project name -> types
  const exportsOf = new Map(); // project name -> package names
  const problems = [];
  // By code unit, not localeCompare: the file is committed, and a regeneration
  // on a machine with another locale must not reorder it.
  for (const p of [...packages].sort((a, b) => byCodeUnit(a.symbol, b.symbol))) {
    const { parsed: r, inside } = parsePackageFiles(p.files);
    const project = r.project ?? p.symbol;
    if (parsed.has(project)) {
      // Several packages under one name must declare one API, or the name
      // would stand for two things.
      if (JSON.stringify(strip(parsed.get(project))) !== JSON.stringify(strip(r.types)))
        throw new Error(
          `${p.symbol} and ${exportsOf.get(project).join(", ")} are all '${project}' but declare different APIs`,
        );
    } else {
      parsed.set(project, r.types);
      for (const x of r.problems) problems.push({ pkg: project, ...x, file: inside(x.file) });
    }
    exportsOf.set(project, [...(exportsOf.get(project) ?? []), p.symbol]);
  }
  return { parsed, exportsOf, problems };
}

// A type as the file records it, without where it is or how it is written: two
// builds of one package differ in their line numbers, and the signatures,
// attributes' arguments and descriptions parseTwin reads are not part of the
// API the file keeps.
const strip = (types) =>
  types.map(({ line, members, signature, attrs, description, ...t }) => ({
    ...t,
    members: members.map(({ name, kind, vis, hidden }) => ({ name, kind, vis, hidden })),
  }));

// One type to a line, so that a regeneration against a newer build diffs as the
// types that changed rather than as a rewritten file.
function serialize({ build, packages, exportsOf }) {
  const lines = ["{", `  "build": ${JSON.stringify(build)},`, `  "packages": {`];
  const names = Object.keys(packages);
  names.forEach((pkg, i) => {
    lines.push(`    ${JSON.stringify(pkg)}: {`);
    lines.push(`      "exports": ${JSON.stringify(exportsOf.get(pkg))},`);
    lines.push(`      "types": [`);
    const types = packages[pkg];
    types.forEach((t, j) => {
      lines.push(`        ${JSON.stringify(t)}${j < types.length - 1 ? "," : ""}`);
    });
    lines.push("      ]", `    }${i < names.length - 1 ? "," : ""}`);
  });
  lines.push("  }", "}");
  return `${lines.join("\n")}\n`;
}
