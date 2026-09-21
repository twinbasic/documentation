#!/usr/bin/env node
// Generate a twinBASIC probe project for Reference/Attributes.md placements.
//
//     node scripts/gen_attribute_probes.mjs <out_dir> [key.md]
//
// `Attributes.md` states an `Applicable to:` line for 52 of its 57 attributes,
// and none of them had been checked against the compiler --- the one that was
// checked turned out to be wrong. twinBASIC cannot compile a project from the
// command line (see Features/Packages/Import-Export-Tool), so this does the
// next best thing: it writes one source file per claimed placement, so a single
// IDE build answers every claim at once.
//
// Every probe is expected to compile. The compiler reports a misplaced
// attribute as `This attribute is not supported in this context`, so a
// diagnostic naming a probe module means that `Applicable to:` line is wrong.
//
// Then pack the tree and open the result in the IDE:
//
//     bin\twinBASIC_win32.exe import AttributeProbes.twinproj <out_dir> --overwrite
//
// Re-run after editing `Attributes.md`; the key cites the line each probe came
// from.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOCS = path.join(REPO, "docs", "Reference", "Attributes.md");

const USAGE = `Generate a twinBASIC probe project for Reference/Attributes.md placements.

    node scripts/gen_attribute_probes.mjs <out_dir> [key.md]

Writes one source file per claimed attribute placement, plus a key naming the
Attributes.md line each probe came from. Every probe is expected to compile; a
diagnostic naming a probe module is a finding.`;

// ----------------------------------------------------------------- parsing
const LINK_BOLD = /\[\*\*([^\]]*)\*\*\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

function clean(s) {
  return s
    .replace(LINK_BOLD, "$1")
    .replace(LINK, "$1")
    .replaceAll("**", "")
    .replaceAll("\\", "")
    .trim();
}

async function parseAttributes(file) {
  // Python reads in text mode, so universal-newline translation has already
  // collapsed CRLF before the split. Match that, or every line carries a
  // trailing CR into the generated key.
  const lines = (await fs.readFile(file, "utf8")).replace(/\r\n?/g, "\n").split("\n");
  const entries = [];
  let cur = null;

  lines.forEach((line, i) => {
    const m = /^Syntax:\s*(.*)$/.exec(line);
    if (m) {
      const name = /^Syntax:\s*\*\*\[(\w+)/.exec(line);
      // A `Syntax:` line that names no attribute leaves `cur` alone, exactly as
      // the Python `continue` did -- the line cannot also be `Applicable to:`.
      if (!name) return;
      cur = { name: name[1], syntax: clean(m[1]), line: i + 1, app: null };
      entries.push(cur);
      return;
    }
    const m2 = /^Applicable to:\s*(.*)$/.exec(line);
    if (m2 && cur !== null && cur.app === null) cur.app = clean(m2[1]);
  });

  return entries;
}

// --------------------------------------------------------------- arguments
// An attribute with a mandatory argument needs a value that is itself valid, or
// the compiler reports the argument instead of the placement. GUIDs are unique
// per probe so two probes can never collide on one id.
const GUID_ATTRS = new Set([
  "ClassId", "CoClassId", "InterfaceId", "EventInterfaceId",
  "EnumId", "FormDesignerId",
]);
const FIXED_ARGS = {
  Description: '("attribute placement probe")',
  DispId: "(1000)",
  IdeButton: '("probe")',
  PackingAlignment: "(4)",
  CompileIf: "(True)",
};
// Arguments that cannot be synthesised without something else being true.
// FormDesignerId earned its place the hard way: probed on a Class it reached
// TB5247 `unable to find matching form designer JSON`, which is the compiler
// accepting the placement and then failing a lookup. That confirms the
// documented placement and tells us nothing further, so it is not worth a probe.
const UNSYNTHESISABLE = {
  CoClassCustomConstructor: "needs a fully qualified path to an existing factory method",
  CustomControl: "needs an image file present in the project",
  PopulateFrom: "needs a .json resource plus three field names",
  IgnoreWarnings: "needs a valid TBnnnn warning code; the codes are not documented",
  CompilerOptions: "the option string vocabulary is not documented",
  FormDesignerId: "needs a form designer JSON to match; probing it reached TB5247, " +
    "which already confirms the documented placement on a Class",
};

// Attributes the compiler allows only once per project, so their second and
// later placements cannot share a project with the first. TB5114 for
// [RunAfterBuild].
const SINGLETON = {
  RunAfterBuild: "the compiler allows only one [RunAfterBuild] per project",
};

// Placements a page's own worked example uses but its `Applicable to:` line does
// not name. Expected to compile for the same reason: the page says so.
//
// The DllExport entry was the case this existed for: the line said "variables",
// the example used a Public Const, and probing both settled it -- the variable
// is rejected (TB5155), the Const compiles. The line now says "constants", so
// the ordinary target parser covers it and no extra probe is needed.
const EXTRA_PROBES = [];

const pad = (n, width) => String(n).padStart(width, "0");

function attrText(name, idx) {
  if (GUID_ATTRS.has(name)) return `[${name}("00000000-0000-0000-0000-${pad(idx, 12)}")]`;
  if (Object.hasOwn(FIXED_ARGS, name)) return `[${name}${FIXED_ARGS[name]}]`;
  if (name === "TypeHint") return `[TypeHint(ProbeHintEnum${pad(idx, 3)})]`;
  return `[${name}]`;
}

// ----------------------------------------------------------------- targets
// Ordered: the specific phrasings must win over the bare ones.
const RULES = [
  [/interface\s+in\s+a\s+library/i, ["LIBRARY_INTERFACE"]],
  [/(procedure|method)\s+in\s+an\s+interface/i, ["PROC_INTERFACE"]],
  [/procedure\s+in\s+a\s+class\s+or\s+module/i, ["PROC_CLASS", "PROC_MODULE"]],
  [/procedure\s+in\s+a\s+class/i, ["PROC_CLASS"]],
  [/function\s+in\s+a\s+module/i, ["FUNC_MODULE"]],
  [/procedure\s+parameter/i, ["PARAM"]],
  [/variable.*\bin\s+a\s+class/i, ["VAR_CLASS"]],
  [/variable.*\bin\s+a\s+module/i, ["VAR_MODULE"]],
  [/variable/i, ["VAR_MODULE"]],
  [/declare|api\s+declaration/i, ["DECLARE"]],
  [/^type\b/i, ["TYPE"]],
  [/^enum\b/i, ["ENUM"]],
  // "Const", but also "constants in a module." -- \b after "const" fails on
  // the plural, which silently dropped a target until it was noticed.
  [/^const(ant)?s?\b/i, ["CONST"]],
  [/^sub\b/i, ["SUB_MODULE"]],
  [/^function\b/i, ["FUNC_MODULE"]],
  [/^coclass\b/i, ["COCLASS"]],
  [/^class\b/i, ["CLASS"]],
  [/^module\b/i, ["MODULE"]],
  [/^interface\b/i, ["INTERFACE"]],
  [/procedure/i, ["PROC_MODULE"]],
];

// Python's str.strip(".") removes every leading and trailing dot, not one.
const stripDots = (s) => s.replace(/^\.+/, "").replace(/\.+$/, "");

function parseTargets(app) {
  const out = [];
  for (const phrase of app.split(/,|\band\b/)) {
    const p = stripDots(phrase.trim()).trim();
    if (!p) continue;
    for (const [pattern, targets] of RULES) {
      if (pattern.test(p)) {
        for (const t of targets) if (!out.includes(t)) out.push(t);
        break;
      }
    }
  }
  return out;
}

// --------------------------------------------------------------- renderers
// Returns the body of a .twin file placing `attr` at `target`.
//
// Enum names are made unique per probe. A Public Enum's name and its members
// are project-global, so two probes both declaring `ProbeEnum` collide with
// TB5000 `duplicate definition in the current scope` -- which reads like a
// finding and is not one. Module Subs named `Probe` do NOT collide, so the
// uniqueness is needed for enums only.
function render(target, tag, attr, needsHintEnum, idx) {
  const hint = needsHintEnum
    ? `\n    Public Enum ProbeHintEnum${pad(idx, 3)}\n` +
      `        ProbeHintValue${pad(idx, 3)} = 1\n    End Enum\n`
    : "";

  switch (target) {
    case "MODULE":
      return `${attr}\nPublic Module ${tag}\nEnd Module\n`;
    case "CLASS":
      return `${attr}\nPublic Class ${tag}\nEnd Class\n`;
    case "INTERFACE":
      return `${attr}\nPublic Interface ${tag}\n    Sub Ping()\nEnd Interface\n`;
    case "COCLASS":
      return `Public Interface ${tag}_Iface\n    Sub Ping()\nEnd Interface\n\n` +
        `${attr}\nPublic CoClass ${tag}\n    Interface ${tag}_Iface\nEnd CoClass\n`;
    case "PROC_MODULE":
    case "SUB_MODULE":
      return `Public Module ${tag}\n${hint}    ${attr}\n    Public Sub Probe()\n    End Sub\n` +
        "End Module\n";
    case "FUNC_MODULE":
      return `Public Module ${tag}\n${hint}    ${attr}\n    Public Function Probe() As Long\n` +
        "    End Function\nEnd Module\n";
    case "PROC_CLASS":
      return `Public Class ${tag}\n${hint}    ${attr}\n    Public Sub Probe()\n    End Sub\n` +
        "End Class\n";
    case "PROC_INTERFACE":
      return `Public Interface ${tag}\n${hint}    ${attr}\n    Sub Probe()\nEnd Interface\n`;
    case "DECLARE":
      return `Public Module ${tag}\n    ${attr}\n    Public Declare Function Probe Lib ` +
        '"kernel32" Alias "GetTickCount" () As Long\nEnd Module\n';
    case "TYPE":
      return `Public Module ${tag}\n    ${attr}\n    Public Type ProbeUdt\n` +
        "        Field1 As Long\n    End Type\nEnd Module\n";
    case "ENUM":
      return `Public Module ${tag}\n    ${attr}\n    Public Enum ProbeEnum${pad(idx, 3)}\n` +
        `        ProbeValue${pad(idx, 3)} = 1\n    End Enum\nEnd Module\n`;
    case "CONST":
      return `Public Module ${tag}\n${hint}    ${attr}\n    Public Const ProbeConst As Long = 1\n` +
        "End Module\n";
    case "VAR_CLASS":
      return `Public Class ${tag}\n${hint}    ${attr}\n    Public ProbeVar As Long\nEnd Class\n`;
    case "VAR_MODULE":
      return `Public Module ${tag}\n${hint}    ${attr}\n    Public ProbeVar As Long\nEnd Module\n`;
    case "PARAM":
      return `Public Module ${tag}\n${hint}    Public Sub Probe(${attr} ByVal Value As Long)\n` +
        "    End Sub\nEnd Module\n";
    default:
      return null;
  }
}

const HUMAN = {
  MODULE: "on a Module", CLASS: "on a Class", INTERFACE: "on an Interface",
  COCLASS: "on a CoClass", PROC_MODULE: "on a Sub in a Module",
  SUB_MODULE: "on a Sub in a Module", FUNC_MODULE: "on a Function in a Module",
  PROC_CLASS: "on a Sub in a Class",
  PROC_INTERFACE: "on a prototype in an Interface",
  DECLARE: "on a Declare", TYPE: "on a Type (UDT)", ENUM: "on an Enum",
  CONST: "on a Const", VAR_CLASS: "on a variable in a Class",
  VAR_MODULE: "on a variable in a Module", PARAM: "on a procedure parameter",
  LIBRARY_INTERFACE: "on an Interface in a Library",
};

// Built as an object and serialised, rather than held as a literal blob, so the
// backslashes in the paths are escaped by JSON.stringify rather than by hand.
// Tab indent and key order match what the IDE writes.
const SETTINGS_OBJ = {
  "configuration.inherits": "Defaults",
  "project.appTitle": "Attribute placement probes",
  "project.buildPath": "${SourcePath}\\Build\\${ProjectName}_${Architecture}.${FileExtension}",
  "project.buildType": "Standard EXE",
  "project.description": "Generated from docs/Reference/Attributes.md. Every module is expected to compile; a diagnostic is a finding.",
  "project.exportPathIsV2": true,
  "project.id": "{A77B1BE0-0000-4000-8000-000000000001}",
  "project.name": "AttributeProbes",
  "project.optionExplicit": true,
  "project.references": [
    {
      id: "{00020430-0000-0000-C000-000000000046}",
      lcid: 0,
      name: "OLE Automation",
      path32: "C:\\Windows\\SysWOW64\\stdole2.tlb",
      path64: "C:\\Windows\\System32\\stdole2.tlb",
      symbolId: "stdole",
      versionMajor: 2,
      versionMinor: 0,
    },
    {
      hasBeenSplit: true,
      id: "{F50B82D0-DCAB-43FE-9631-11959D4A4728}",
      isCompilerPackage: true,
      licence: "MIT",
      name: "[COMPILER PACKAGE] twinBASIC - VB Compatibility Package (Forms)",
      path32: "",
      path64: "",
      publisher: "TWINBASIC-COMPILER",
      symbolId: "VB",
      versionBuild: 0,
      versionMajor: 0,
      versionMinor: 0,
      versionRevision: 31,
    },
  ],
  "project.settingsVersion": 1,
  "project.startupObject": "Sub Main",
  "project.warnings": { errors: [], hints: [], ignored: [], info: [], warnings: [] },
  "runtime.useUnicodeStandardLibrary": true,
};
const SETTINGS = JSON.stringify(SETTINGS_OBJ, null, "\t") + "\n";

// The .twin sources are written CRLF; the Settings blob and the key are written
// exactly as composed.
const writeCrlf = (file, text) => fs.writeFile(file, text.replace(/\n/g, "\r\n"), "utf8");
const writeRaw = (file, text) => fs.writeFile(file, text, "utf8");

const MAIN_TWIN = "' Startup object for the probe project. Does nothing.\n\n" +
  "Module ProbeMain\n    Public Sub Main()\n    End Sub\nEnd Module\n";

async function main(argv) {
  if (argv.length < 1) {
    console.log(USAGE);
    return 2;
  }
  const out = argv[0];
  // The key must land OUTSIDE the tree: anything inside it gets packed into the
  // .twinproj and shows up as a stray file in the project.
  const keyPath = argv[1] ?? path.join(path.dirname(path.resolve(out)), "probe-key.md");
  const srcDir = path.join(out, "Sources");
  const overflowSrc = path.join(out + "-2", "Sources");
  await fs.mkdir(srcDir, { recursive: true });

  const entries = await parseAttributes(DOCS);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const probes = [];
  const overflow = [];
  const skipped = [];
  const noApp = [];
  let idx = 0;

  // Write one probe. Returns the tag, or null if it could not be built.
  async function emit(e, target, note, seenSingleton) {
    idx += 1;
    const tag = `P${pad(idx, 3)}_${e.name}_${target}`;
    const body = render(target, tag, attrText(e.name, idx), e.name === "TypeHint", idx);
    if (body === null) {
      skipped.push([e, `no skeleton for target ${target}`]);
      idx -= 1;
      return null;
    }
    const why = note ? `' ${note}\n` : "";
    const header = `' ${tag} -- [${e.name}] ${HUMAN[target]}\n` +
      `' Attributes.md:${e.line} -- "Applicable to: ${e.app}"\n${why}` +
      "' Expected: compiles clean.\n\n";
    const targetDir = seenSingleton ? overflowSrc : srcDir;
    await writeCrlf(path.join(targetDir, tag + ".twin"), header + body);
    (seenSingleton ? overflow : probes).push([tag, e, target]);
    return tag;
  }

  const singletonUsed = new Set();
  for (const e of entries) {
    if (!e.app) {
      noApp.push(e);
      continue;
    }
    if (Object.hasOwn(UNSYNTHESISABLE, e.name)) {
      skipped.push([e, UNSYNTHESISABLE[e.name]]);
      continue;
    }
    for (const target of parseTargets(e.app)) {
      if (target === "LIBRARY_INTERFACE") {
        skipped.push([e, "the Library declaration has no reference page in docs/"]);
        continue;
      }
      let second = false;
      if (Object.hasOwn(SINGLETON, e.name)) {
        if (singletonUsed.has(e.name)) {
          second = true;
          await fs.mkdir(overflowSrc, { recursive: true });
        }
        singletonUsed.add(e.name);
      }
      await emit(e, target, second ? SINGLETON[e.name] : null, second);
    }
  }

  for (const [name, target, note] of EXTRA_PROBES) {
    const e = byName.get(name);
    if (e) await emit(e, target, note, false);
  }

  await writeCrlf(path.join(srcDir, "_ProbeMain.twin"), MAIN_TWIN);
  await writeRaw(path.join(out, "Settings"), SETTINGS);
  if (overflow.length) {
    await writeCrlf(path.join(overflowSrc, "_ProbeMain.twin"), MAIN_TWIN);
    await writeRaw(
      path.join(out + "-2", "Settings"),
      SETTINGS.replaceAll("AttributeProbes", "AttributeProbes2")
        .replaceAll("000000000001", "000000000002"),
    );
  }

  const distinct = new Set(probes.map((p) => p[1].name));
  const k = [];
  k.push("# Attribute placement probes -- key\n\n");
  k.push("Generated from `docs/Reference/Attributes.md` by " +
    `\`scripts/gen_attribute_probes.mjs\`. ${probes.length} probes over ` +
    `${distinct.size} attributes.\n\n`);
  k.push("**Every probe is expected to compile.** Each applies one attribute at one " +
    "placement `Attributes.md` says is legal, in its own source file. A clean " +
    "build means all of those claims hold.\n\n");
  k.push("A diagnostic naming a probe module is a finding. The one to look for is " +
    "`This attribute is not supported in this context`, which says the " +
    "`Applicable to:` line is wrong. Any other diagnostic more likely means the " +
    "probe itself is malformed.\n\n");
  k.push("| Probe | Attribute | Placement | Attributes.md |\n|---|---|---|---|\n");
  for (const [tag, e, target] of probes) {
    k.push(`| \`${tag}\` | \`[${e.name}]\` | ${HUMAN[target]} | line ${e.line} |\n`);
  }
  k.push("\n## Expected diagnostics that are not findings\n\n");
  k.push("- `[COMControl]` on an Interface draws two TB0013 recommendations, to " +
    "specify `[InterfaceId()]` and `[EventInterfaceId()]`. They are advice about " +
    "stable COM ids, not a placement failure, and the probe deliberately omits " +
    "both rather than risk testing two attributes at once.\n");
  if (overflow.length) {
    k.push("\n## Second project\n\n");
    k.push("These placements cannot share a project with the ones above, so they " +
      "are packed separately as `AttributeProbes2`. Build it the same way.\n\n");
    k.push("| Probe | Attribute | Placement | Why separate |\n|---|---|---|---|\n");
    for (const [tag, e, target] of overflow) {
      k.push(`| \`${tag}\` | \`[${e.name}]\` | ${HUMAN[target]} | ${SINGLETON[e.name]} |\n`);
    }
  }
  if (skipped.length) {
    k.push("\n## Not probed\n\n");
    for (const [e, why] of skipped) k.push(`- **\`[${e.name}]\`** (line ${e.line}) -- ${why}\n`);
  }
  if (noApp.length) {
    k.push("\n## No `Applicable to:` line in the documentation\n\n");
    k.push("These entries state no placement at all, so there is nothing to verify " +
      "and nothing for a reader to rely on:\n\n");
    for (const e of noApp) k.push(`- **\`[${e.name}]\`** (line ${e.line})\n`);
  }
  await writeRaw(keyPath, k.join(""));

  console.log(`probes written : ${probes.length}`);
  console.log(`attributes     : ${distinct.size}`);
  console.log(`not probed     : ${skipped.length}`);
  console.log(`no Applicable  : ${noApp.length}`);
  console.log(`key            : ${keyPath}`);
  return 0;
}

process.exit(await main(process.argv.slice(2)));
