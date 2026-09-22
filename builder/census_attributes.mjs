#!/usr/bin/env node
// Census every attribute used by the twinBASIC packages an IDE install ships.
//
//     node builder/census_attributes.mjs [options]
//
//       --ide <path>       twinBASIC install root (default: $TB_IDE, else the
//                          newest %USERPROFILE%/Desktop/twinBASIC_IDE_BETA_*)
//       --src <dir>        census an already-exported tree and do not export
//       --cache <dir>      where exports are kept (default: %TEMP%/tb-census)
//       --refresh          re-export even if the cache already has this build
//       --samples          also census projects/ and addins/, not just packages/
//       --attr <name>      restrict the report to one attribute
//       --json             emit JSON instead of markdown
//       --out <file>       write the report to a file instead of stdout
//       --quiet            suppress progress on stderr
//
// Exit codes: 0 report produced, 2 the harness failed.
//
// ---------------------------------------------------------------- why this
//
// `Reference/Attributes.md` states an `Applicable to:` line per attribute, and
// the only evidence for most of them is what the shipped packages do. That
// evidence was gathered by hand, one attribute at a time, with a grep whose
// blind spots were rediscovered on each pass. This is that sweep, done once,
// over every attribute at once.
//
// **A census is evidence, not applicability.** It says where an attribute IS
// used, never where it MAY be used -- `scripts/gen_attribute_probes.mjs` plus
// `scripts/tbbuild.mjs` answer that, by asking the compiler. The two are
// complementary and the distinction is not pedantic: `[Hidden]` is used on a
// whole CoClass and on Class and Interface members, and the compiler refuses
// it (TB5155) on the Interface lines inside a CoClass body -- a census alone
// would never have found the boundary. `gen_attribute_probes.mjs` records the
// converse trap under [RedirectToStaticImplementation]: a census grouped by
// declaration keyword said "on a Property Get, a Function and a Sub", the
// entry went out saying "procedure in a Class", and the probe returned TB5155
// because every one of those 82 uses is inside an Interface. So this groups by
// ENCLOSING CONSTRUCT as well as by keyword, and reports the pair.
//
// ------------------------------------------------- what the scanner must not do
//
// Six ways a naive sweep of this corpus gets a wrong answer, each measured
// against the BETA 983 packages rather than imagined:
//
//   1. A line matcher misses 292 of 7,604 attribute lines (3.8%), because
//      `[Description("..." & vbCrLf & _` closes several lines later. Those are
//      dropped silently, so the count looks plausible. Hence a character
//      scanner that balances brackets across lines.
//   2. An attribute list is comma-separated -- `[DispId(126), Hidden]` -- and
//      DAO.twin writes most of its Hidden uses that way. Matching `[Hidden]`
//      finds a fraction of them.
//   3. Argument text has to be stripped before splitting on the comma, or
//      `[Description("Returns an array of child controls, given the container")]`
//      contributes an attribute named `given`.
//   4. An escaped identifier is spelled like an attribute: `[_HiddenModule].Foo`,
//      `[_MAX] = 0`. What separates them is the tail -- an attribute is followed
//      by a declaration, an escaped identifier by `.`, `=` or `(`.
//   5. DAO.twin writes declarations as `/* voffset &H00A8*/ Property Get X()`,
//      so an inline block comment has to be removed, not used to skip the line.
//      Skipping cost 14 Interface-member sites, which then read as `End Interface`.
//   6. Attributes are also written inline -- `[Default] Interface X` -- so the
//      declaration is not always on the next line.
//
// One result to read before calling a row impossible: **a twinBASIC `Type` can
// contain `DeclareWide` members.** `CustomControls.twin`'s `Type SerializeInfo`
// holds a dozen, so `Type / DeclareWide` is a real construct and not a stack
// fault. It was assumed to be one here, and the assumption was wrong.
//
// Only TYPE blocks are tracked for the enclosing construct. Procedures are
// deliberately not pushed: an Interface prototype (`Sub Ping()`) has no body and
// no `End Sub`, so tracking procedures unbalances the stack on every interface
// in the corpus. Anything the scanner cannot resolve goes to an `unresolved`
// bucket and is reported -- a census that quietly buckets its own confusion is
// how the wrong answer gets published with a number beside it.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ATTR_DOC = path.join(REPO, "docs", "Reference", "Attributes.md");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };
const die = (code, msg) => { console.error(msg); process.exit(code); };
const log = (...a) => { if (!flag("quiet")) console.error(...a); };

if (flag("help")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8")
    .split("\n").filter((l) => l.startsWith("//")).slice(1, 18).map((l) => l.slice(3)).join("\n"));
  process.exit(0);
}

// ------------------------------------------------------------- the install
// An install path contains a username, so it is never hardcoded -- the same
// rule tbbuild.mjs follows, and for the same reason.
function findInstall() {
  const given = opt("ide", process.env.TB_IDE);
  if (given) {
    // Accept either the install root or the IDE exe inside it.
    const root = /\.exe$/i.test(given) ? path.dirname(given) : given;
    if (existsSync(path.join(root, "packages"))) return root;
    if (existsSync(path.join(path.dirname(root), "packages"))) return path.dirname(root);
    die(2, `no packages/ under ${root} -- pass the install root with --ide`);
  }
  const home = process.env.USERPROFILE || os.homedir();
  const desktop = path.join(home, "Desktop");
  if (!existsSync(desktop)) die(2, "no Desktop to search; pass --ide or set TB_IDE");
  const betas = readdirSync(desktop)
    .map((n) => /^twinBASIC_IDE_BETA_(\d+)$/.exec(n))
    .filter(Boolean)
    .map((m) => ({ n: Number(m[1]), dir: path.join(desktop, m[0]) }))
    .filter((b) => existsSync(path.join(b.dir, "packages")))
    .sort((a, b) => b.n - a.n);
  if (!betas.length) die(2, "no twinBASIC_IDE_BETA_* with a packages/ folder on the Desktop; pass --ide");
  return betas[0].dir;
}

const buildNumberOf = (root) => (/_BETA_(\d+)$/.exec(root)?.[1]) ?? "unknown";

// ------------------------------------------------------------- the export
// The .twin sources live inside .twinproj archives; `export` unpacks one.
// Two traps, both from WIP.md and both still live: the output folder must
// already exist (only one level is created), and stdin has to be detached or
// the executable consumes the caller's and later iterations never run.
function exportAll(root, cacheDir, includeSamples) {
  const exe = path.join(root, "bin", "twinBASIC_win32.exe");
  if (!existsSync(exe)) die(2, `no compiler at ${exe}`);

  const roots = [path.join(root, "packages")];
  if (includeSamples) {
    for (const d of ["projects", "addins"]) {
      const p = path.join(root, d);
      if (existsSync(p)) roots.push(p);
    }
  }

  const projects = [];
  for (const r of roots) {
    for (const entry of readdirSync(r, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(r, entry.name);
      for (const f of readdirSync(dir)) {
        if (f.toLowerCase().endsWith(".twinproj")) {
          projects.push({ proj: path.join(dir, f), name: entry.name, group: path.basename(r) });
        }
      }
    }
  }
  if (!projects.length) die(2, `no .twinproj found under ${roots.join(", ")}`);

  mkdirSync(cacheDir, { recursive: true });
  let exported = 0;
  for (const p of projects) {
    const out = path.join(cacheDir, p.group, p.name);
    if (existsSync(out) && !flag("refresh")) continue;
    mkdirSync(out, { recursive: true });
    try {
      execFileSync(exe, ["export", p.proj, out + path.sep, "--overwrite"],
        { stdio: ["ignore", "ignore", "ignore"] });
      exported++;
    } catch {
      log(`  ! export failed: ${p.name}`);
    }
  }
  log(`  exported ${exported} project(s), ${projects.length} total in cache`);
  return projects.map((p) => ({ ...p, dir: path.join(cacheDir, p.group, p.name) }));
}

// ------------------------------------------------------------- the scanner
const TYPE_KEYWORDS = ["Class", "Module", "Interface", "CoClass", "Enum", "Type", "Union"];
const MODS = "(?:Public|Private|Friend|Global|Protected|Static|ReadOnly|WriteOnly|Default|" +
  // NotDispatchable is here because the corpus uses it and nothing else would
  // say so: a modifier this list does not know stops the block being pushed at
  // all, and the mismatched `End Class` then pops somebody else's block. Swept
  // for empirically -- Private, Public, Protected and NotDispatchable are the
  // only words that precede a block keyword in BETA 983.
  "Shared|Overrides|Virtual|Const|WithEvents|Partial|MustOverride|NotInheritable|" +
  "NotDispatchable)";
// The name after the keyword is captured so a FIELD named after a block keyword
// can be rejected. Four UDTs in the packages declare `Type As Long`, and read as
// an opener that never closes it swallowed the rest of the file: one of them put
// 368 Declares inside a phantom `Type`, which is not a construct that exists.
// The name may itself be an escaped identifier: VBA declares `Module
// [_HiddenModule]`, the only one in the corpus, and a bare-identifier pattern
// skipped the open -- so its `End Module` 1,277 lines later popped a block it
// did not own.
const OPEN_RE = new RegExp(
  `^\\s*(?:${MODS}\\s+)*(${TYPE_KEYWORDS.join("|")})\\b\\s+([A-Za-z_]\\w*|\\[[^\\]]*\\])`, "i");
const CLOSE_RE = new RegExp(`^\\s*End\\s+(${TYPE_KEYWORDS.join("|")})\\b`, "i");
const DECL_RE = new RegExp(
  `^\\s*(?:${MODS}\\s+)*(Class|Module|Interface|CoClass|Enum|Type|Union|Sub|Function|` +
  `Property|Event|DeclareWide|Declare|Implements)\\b`, "i");
const VAR_RE = new RegExp(`^\\s*(?:${MODS}|Dim)\\s+[\\w\\[]`, "i");
const BLOCK_COMMENT_RE = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g;

const decomment = (s) => s.replace(BLOCK_COMMENT_RE, " ");

// Blank string contents in place, preserving length and quotes, so offsets stay
// valid and no comma or bracket inside a literal is ever read as syntax.
function blankStrings(s) {
  let out = "", inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { inStr = !inStr; out += c; continue; }
    if (!inStr && c === "'") { out += " ".repeat(s.length - i); break; }
    out += inStr && c !== "\n" ? " " : c;
  }
  return out;
}

// Read the run of attribute groups starting at lines[i], which may span lines.
// Returns null when the line does not open one.
function readAttrRun(lines, i) {
  const startsWithBracket = (s) => decomment(s).trimStart().startsWith("[");
  if (!startsWithBracket(lines[i] ?? "")) return null;

  const groups = [];
  let line = i, col = decomment(lines[line]).length - decomment(lines[line]).trimStart().length;
  let text = decomment(lines[line]);

  for (;;) {
    while (col < text.length && /\s/.test(text[col])) col++;
    if (text[col] !== "[") break;

    let depth = 0, inStr = false, closed = false;
    const group = [];
    scan: for (;;) {
      while (col < text.length) {
        const c = text[col];
        if (inStr) { if (c === '"') inStr = false; }
        else if (c === '"') inStr = true;
        else if (c === "[") depth++;
        else if (c === "]") { depth--; if (depth === 0) { col++; closed = true; break scan; } }
        group.push(c);
        col++;
      }
      // Unclosed on this line: continue onto the next. This is the 3.8% case.
      line++;
      if (line >= lines.length) break scan;
      text = decomment(lines[line]);
      col = 0;
      group.push(" ");
    }
    if (!closed) return null;
    groups.push(group.join("").replace(/^\[/, ""));
    // Another group may follow immediately, on the next line, or past a blank
    // or comment line. Skipping comments matters: VBA/Strings.twin writes
    //     [PreserveSig(False), ...]
    //     ' Function to return the position of ...
    //     [Description("..." & vbCrLf & _
    // and stopping at the comment made the second group read as the
    // declaration, which is how 142 sites landed in the unresolved bucket.
    let probeLine = line, probeText = text, probeCol = col;
    for (;;) {
      // Scan the COMMENT-STRIPPED text. WebView2.twin opens with
      //     [WindowsControl("...")]  ' [WindowsControl("...png")]
      // and a raw scan stops on that comment, so the [ClassId] group below it
      // was read as the declaration instead of joining the run.
      const probeCode = blankStrings(probeText);
      while (probeCol < probeCode.length && /\s/.test(probeCode[probeCol])) probeCol++;
      if (probeCol < probeCode.length) break;
      let k = probeLine + 1;
      while (k < lines.length) {
        const t = decomment(lines[k]);
        if (!blankStrings(t).trim()) { k++; continue; }   // blank, or a ' comment
        break;
      }
      if (k >= lines.length) break;
      const nxt = decomment(lines[k]);
      if (!nxt.trimStart().startsWith("[")) break;
      probeLine = k; probeText = nxt; probeCol = 0;
    }
    if (probeText[probeCol] !== "[") break;
    line = probeLine; text = probeText; col = probeCol;
  }

  return { groups, endLine: line, rest: text.slice(col) };
}

// Split a group's text into attribute names. Arguments are removed first, or a
// comma inside them splits the list in the wrong place.
function attrNames(group) {
  const flat = blankStrings(group).replace(/\([^()]*\)/g, "()");
  const names = [];
  for (const piece of flat.split(",")) {
    const m = /^\s*([A-Za-z_]\w*)\s*(\(\))?\s*$/.exec(piece);
    if (m) names.push({ name: m[1], hasArgs: Boolean(m[2]) });
    else if (piece.trim()) names.push({ name: null, raw: piece.trim() });
  }
  return names;
}

function classify(decl, container) {
  const d = decomment(decl);
  const m = DECL_RE.exec(d);
  if (m) {
    const k = m[1];
    return k[0].toUpperCase() + k.slice(1).replace(/^eclarewide$/i, "eclareWide");
  }
  if (/^\s*End\s+\w/i.test(d)) return null;              // unresolved
  if (container === "Enum" && /^\s*\[?\w/.test(d)) return "EnumMember";
  if (container === "Type" || container === "Union") {
    if (/^\s*\w+\s+As\s+/i.test(d)) return "TypeMember";
  }
  // `Const` is in MODS, so DECL_RE consumes it as a modifier and never reports
  // it as a kind. The distinction is load-bearing: `Attributes.md` states
  // "constants in a module" and "variables in a Class" as different targets,
  // and [DllExport] is documented on a Const and refused on a variable.
  if (/^\s*(?:\w+\s+)*Const\b/i.test(d)) return "Const";
  if (VAR_RE.test(d) || /^\s*\w+\s+As\s+/i.test(d)) return "Variable";
  return null;
}

function scanFile(file, pkg) {
  const raw = readFileSync(file, "utf8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/);
  const sites = [], problems = [];
  const stack = [];

  for (let i = 0; i < lines.length; i++) {
    const run = readAttrRun(lines, i);

    if (run) {
      const tail = blankStrings(decomment(run.rest)).trim();
      // An escaped identifier, not an attribute: [_HiddenModule].Foo, [_MAX] = 0.
      const isExpression = /^[.=(]/.test(tail) || (run.groups.length === 1 && /^[-+*/&<>]/.test(tail));
      if (!isExpression) {
        // What follows the closing ] is the declaration only if it is CODE. A
        // trailing line comment is common -- `[DLLStackCheck(False), ...]   '
        // NOTE: PreserveSig(FALSE) here` -- and taking it as the declaration
        // put the comment text in the report and lost the real target.
        // blankStrings erases a ' comment, so a blank result means "no code".
        let decl = blankStrings(decomment(run.rest)).trim() ? decomment(run.rest) : null;
        let declLine = run.endLine;
        if (!decl) {
          let j = run.endLine + 1;
          while (j < lines.length) {
            const t = decomment(lines[j]);
            if (!blankStrings(t).trim()) { j++; continue; }
            // A conditional-compilation or #Region directive can sit between an
            // attribute and what it decorates -- DTPicker.twin puts
            // `#If FEATURE_OLEDRAGDROP Then` there.
            if (/^\s*#/.test(t)) { j++; continue; }
            break;
          }
          decl = decomment(lines[j] ?? "");
          declLine = j;
        }
        const container = stack.at(-1)?.kind ?? "(file)";
        const kind = classify(decl, container);
        const names = run.groups.flatMap(attrNames);
        for (const n of names) {
          // An Enum member may BE an escaped identifier -- Report.twin declares
          // `[ ]`, `[A4 Portrait]`, `[Letter Landscape]` as member names. Those
          // are the member, not an attribute on it, and a name with a space (or
          // none at all) is what tells them apart.
          //
          // The residual ambiguity is stated rather than hidden: inside an Enum
          // a bare `[Hidden]` is a valid attribute AND a valid escaped
          // identifier, and nothing local decides which. This treats it as the
          // attribute, which is right for every case in BETA 983.
          if (!n.name && container === "Enum") continue;
          if (!n.name) { problems.push({ file, pkg, line: i + 1, why: "unparsed attribute text", text: n.raw }); continue; }
          sites.push({
            attr: n.name, hasArgs: n.hasArgs, pkg, file, line: i + 1,
            container, kind: kind ?? "UNRESOLVED",
            decl: decl.trim().slice(0, 100),
            inProject: stack.map((s) => s.kind).join(">"),
          });
          if (!kind) problems.push({ file, pkg, line: i + 1, why: "declaration not classified", text: decl.trim().slice(0, 100) });
        }
      }
      if (run.endLine > i) { i = run.endLine; continue; }
    }

    // Block tracking runs on the code AFTER any attributes on this line, so an
    // inline "[Default] Interface X" still opens its block.
    const body = run && run.endLine === i ? run.rest : lines[i];
    const code = blankStrings(decomment(body));
    if (CLOSE_RE.test(code)) {
      const k = CLOSE_RE.exec(code)[1];
      if (!stack.length) problems.push({ file, pkg, line: i + 1, why: `End ${k} with nothing open` });
      else stack.pop();
      continue;
    }
    const o = OPEN_RE.exec(code);
    if (o && !/^as$/i.test(o[2])) {
      const kind = o[1][0].toUpperCase() + o[1].slice(1).toLowerCase();
      // An `Interface X` line inside a CoClass names one of the CoClass's
      // interfaces; it has no body and no `End Interface`. Pushed as a block it
      // ate the `End CoClass` that followed, leaving every CoClass in the
      // corpus reported as unclosed -- 31 files.
      const insideCoClass = stack.at(-1)?.kind === "Coclass";
      if (!(kind === "Interface" && insideCoClass)) {
        stack.push({ kind, line: i + 1 });
      }
    }
  }

  if (stack.length) {
    problems.push({ file, pkg, line: stack[0].line, why: `unclosed ${stack.map((s) => s.kind).join(">")} at end of file` });
  }
  return { sites, problems };
}

// ------------------------------------------------------ documented attributes
function documentedAttributes() {
  if (!existsSync(ATTR_DOC)) return null;
  const out = new Map();
  const lines = readFileSync(ATTR_DOC, "utf8").replace(/\r\n?/g, "\n").split("\n");
  let cur = null;
  lines.forEach((line, i) => {
    const m = /^Syntax:\s*\*\*\[(\w+)/.exec(line);
    if (m) { cur = { name: m[1], line: i + 1, app: null }; out.set(m[1], cur); return; }
    const a = /^Applicable to:\s*(.*)$/.exec(line);
    if (a && cur && cur.app === null) {
      cur.app = a[1].replace(/\[\*\*([^\]]*)\*\*\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replaceAll("**", "").replaceAll("\\", "").trim();
    }
  });
  return out;
}

// ------------------------------------------------------------------- report
const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : "0.0");

function buildReport(sites, problems, files, projects, meta) {
  const byAttr = new Map();
  for (const s of sites) {
    if (!byAttr.has(s.attr)) byAttr.set(s.attr, []);
    byAttr.get(s.attr).push(s);
  }
  const doc = documentedAttributes();

  const rows = [...byAttr.entries()].map(([attr, ss]) => {
    const targets = new Map();
    for (const s of ss) {
      const k = `${s.container} / ${s.kind}`;
      targets.set(k, (targets.get(k) ?? 0) + 1);
    }
    const pkgs = [...new Set(ss.map((s) => s.pkg))].sort();
    return {
      attr, uses: ss.length, packages: pkgs,
      withArgs: ss.filter((s) => s.hasArgs).length,
      targets: [...targets.entries()].sort((a, b) => b[1] - a[1]),
      documented: doc ? doc.has(attr) : null,
      applicableTo: doc?.get(attr)?.app ?? null,
      unresolved: ss.filter((s) => s.kind === "UNRESOLVED").length,
    };
  }).sort((a, b) => b.uses - a.uses || a.attr.localeCompare(b.attr));

  const usedNames = new Set(byAttr.keys());
  const undocumented = doc ? rows.filter((r) => !r.documented).map((r) => r.attr) : [];
  const unused = doc ? [...doc.keys()].filter((n) => !usedNames.has(n)).sort() : [];

  return { meta, rows, undocumented, unused, problems, files, projects, sites: sites.length };
}

function renderMarkdown(rep) {
  const L = [];
  L.push(`# twinBASIC attribute census`);
  L.push("");
  L.push(`Generated ${rep.meta.when} against **${rep.meta.install}** (BETA ${rep.meta.build}).`);
  L.push("");
  L.push(`| | |`);
  L.push(`|---|---|`);
  L.push(`| projects scanned | ${rep.projects} |`);
  L.push(`| \`.twin\` files | ${rep.files} |`);
  L.push(`| attribute sites | ${rep.sites} |`);
  L.push(`| distinct attributes | ${rep.rows.length} |`);
  if (rep.meta.documentedCount != null) {
    L.push(`| documented in \`Attributes.md\` | ${rep.meta.documentedCount} |`);
  }
  L.push(`| unresolved declarations | ${rep.problems.filter((p) => p.why === "declaration not classified").length} |`);
  L.push("");
  L.push(`> A census says where an attribute **is** used, never where it **may** be used.`);
  L.push(`> Use \`scripts/gen_attribute_probes.mjs\` with \`scripts/tbbuild.mjs\` for applicability.`);
  L.push("");

  L.push(`## Attributes by use`);
  L.push("");
  L.push(`| Attribute | Uses | Pkgs | Documented | Where it is used (enclosing construct / declaration) |`);
  L.push(`|---|---:|---:|:---:|---|`);
  for (const r of rep.rows) {
    const where = r.targets.map(([k, n]) => `${k} ×${n}`).join("<br>");
    const docMark = r.documented === null ? "--" : r.documented ? "yes" : "**no**";
    L.push(`| \`${r.attr}\` | ${r.uses} | ${r.packages.length} | ${docMark} | ${where} |`);
  }
  L.push("");

  if (rep.undocumented.length) {
    L.push(`## Used but not in \`Attributes.md\` (${rep.undocumented.length})`);
    L.push("");
    L.push(`Each is an attribute the shipped packages use and the reference does not mention.`);
    L.push("");
    for (const a of rep.undocumented) {
      const r = rep.rows.find((x) => x.attr === a);
      L.push(`- \`${a}\` --- ${r.uses} use(s) in ${r.packages.join(", ")}`);
    }
    L.push("");
  }

  if (rep.unused.length) {
    L.push(`## Documented but unused in the packages (${rep.unused.length})`);
    L.push("");
    L.push(`Not a defect: an attribute can be real, documented and simply not used by any`);
    L.push(`shipped package. It does mean the census offers no evidence for its \`Applicable to:\``);
    L.push(`line, so a probe is the only check available.`);
    L.push("");
    L.push(rep.unused.map((a) => `\`${a}\``).join(", "));
    L.push("");
  }

  const byWhy = new Map();
  for (const p of rep.problems) {
    if (!byWhy.has(p.why)) byWhy.set(p.why, []);
    byWhy.get(p.why).push(p);
  }
  L.push(`## What the scanner could not resolve (${rep.problems.length})`);
  L.push("");
  if (!rep.problems.length) {
    L.push(`Nothing. Every attribute site resolved to a declaration, and every type block closed.`);
  } else {
    L.push(`Reported rather than bucketed silently: a census that hides its own confusion`);
    L.push(`publishes a wrong number with no way to notice.`);
    L.push("");
    for (const [why, ps] of [...byWhy.entries()].sort((a, b) => b[1].length - a[1].length)) {
      L.push(`### ${why} (${ps.length})`);
      L.push("");
      for (const p of ps.slice(0, 25)) {
        L.push(`- \`${p.pkg}\` ${path.basename(p.file)}:${p.line}${p.text ? ` --- \`${p.text.replace(/`/g, "'")}\`` : ""}`);
      }
      if (ps.length > 25) L.push(`- ... and ${ps.length - 25} more`);
      L.push("");
    }
  }
  return L.join("\n") + "\n";
}

function renderAttrDetail(rep, attr) {
  const r = rep.rows.find((x) => x.attr.toLowerCase() === attr.toLowerCase());
  if (!r) return `No use of \`${attr}\` in the scanned packages.\n`;
  const L = [];
  L.push(`# \`[${r.attr}]\` --- census`);
  L.push("");
  L.push(`${r.uses} use(s) across ${r.packages.length} package(s): ${r.packages.join(", ")}.`);
  if (r.applicableTo) L.push(`\n\`Attributes.md\` says: **Applicable to:** ${r.applicableTo}`);
  L.push("");
  L.push(`| Enclosing construct | Declaration it decorates | Uses |`);
  L.push(`|---|---|---:|`);
  for (const [k, n] of r.targets) {
    const [c, kind] = k.split(" / ");
    L.push(`| ${c} | ${kind} | ${n} |`);
  }
  L.push("");
  L.push(`> Evidence only. The compiler decides applicability -- see \`gen_attribute_probes.mjs\`.`);
  return L.join("\n") + "\n";
}

// --------------------------------------------------------------------- main
function collectTwinFiles(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectTwinFiles(p, out);
    else if (e.name.toLowerCase().endsWith(".twin")) out.push(p);
  }
  return out;
}

function main() {
  let projects, install = null, build = "n/a";
  const srcDir = opt("src");

  if (srcDir) {
    if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) die(2, `not a directory: ${srcDir}`);
    install = srcDir;
    projects = readdirSync(srcDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((e) => {
        const g = path.join(srcDir, e.name);
        const inner = readdirSync(g, { withFileTypes: true }).filter((x) => x.isDirectory());
        return inner.length
          ? inner.map((x) => ({ name: x.name, dir: path.join(g, x.name) }))
          : [{ name: e.name, dir: g }];
      });
    if (!projects.length) projects = [{ name: path.basename(srcDir), dir: srcDir }];
  } else {
    install = findInstall();
    build = buildNumberOf(install);
    log(`install : ${install}`);
    const cache = opt("cache", path.join(os.tmpdir(), "tb-census", `beta-${build}`));
    log(`cache   : ${cache}`);
    projects = exportAll(install, cache, flag("samples"));
  }

  const allSites = [], allProblems = [];
  let fileCount = 0;
  for (const p of projects) {
    const pkg = p.name.replace(/^\.?\{[^}]+\}_/, "");
    for (const f of collectTwinFiles(p.dir)) {
      fileCount++;
      try {
        const { sites, problems } = scanFile(f, pkg);
        allSites.push(...sites);
        allProblems.push(...problems);
      } catch (e) {
        allProblems.push({ file: f, pkg, line: 0, why: "scanner threw", text: String(e.message) });
      }
    }
  }
  log(`scanned : ${fileCount} .twin files, ${allSites.length} attribute sites`);

  const doc = documentedAttributes();
  const rep = buildReport(allSites, allProblems, fileCount, projects.length, {
    when: new Date().toISOString().slice(0, 10),
    install, build,
    documentedCount: doc ? doc.size : null,
  });

  const attr = opt("attr");
  const text = flag("json")
    ? JSON.stringify(attr ? rep.rows.find((r) => r.attr.toLowerCase() === attr.toLowerCase()) ?? null : rep, null, 2) + "\n"
    : attr ? renderAttrDetail(rep, attr) : renderMarkdown(rep);

  // Every raw site, for answering "which file produced this row?" -- the
  // question every surprising number in the report turns into.
  const dump = opt("dump-sites");
  if (dump) {
    writeFileSync(dump, JSON.stringify(attr
      ? allSites.filter((s) => s.attr.toLowerCase() === attr.toLowerCase())
      : allSites, null, 1), "utf8");
    log(`sites   : ${dump}`);
  }

  const out = opt("out");
  if (out) { writeFileSync(out, text, "utf8"); log(`report  : ${out}`); }
  else process.stdout.write(text);
}

main();
