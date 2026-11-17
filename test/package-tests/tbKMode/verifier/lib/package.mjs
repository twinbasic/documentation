// Reading a package's sources: every .twin file under a folder (an exported package, whose
// Sources/ folder holds them, a clone of the package's repository, or any folder of .twin files),
// parsed by the shared scanner. A Packages/ folder, which holds copies of other packages, is not
// read.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileConstants } from "./conditions.mjs";
import { parseSources } from "./scanner.mjs";

function twinFiles(dir, out = []) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.toLowerCase() !== "packages" && !e.name.startsWith(".")) twinFiles(p, out);
    } else if (e.name.toLowerCase().endsWith(".twin")) out.push(p);
  }
  return out;
}

/**
 * The parsed package in a folder: the scanner's `{types, aliases, problems}` of all its .twin
 * files, `files`, their paths relative to the folder, and `defines`, each file's #Const lines.
 */
export function readPackage(dir) {
  if (!existsSync(dir)) throw new Error(`no folder ${dir}`);
  const files = twinFiles(dir);
  if (!files.length) throw new Error(`no .twin file under ${dir}`);
  // The scanner reads files whose path starts with Sources/: give each such a path.
  const sources = files.map((f) => ({
    path: `Sources/${path
      .relative(dir, f)
      .replaceAll("\\", "/")
      .replace(/^Sources\//i, "")}`,
    text: readFileSync(f, "utf8"),
  }));
  const settingsFile = path.join(dir, "Settings");
  const parsed = parseSources(sources, existsSync(settingsFile) ? readFileSync(settingsFile, "utf8") : null);
  // Each file's #Const lines, which its #If conditions may name.
  const defines = Object.fromEntries(sources.map((s) => [s.path, fileConstants(s.text)]));
  // The scanner gives a member the condition of the #If around it, but not a Type: a Type defined
  // once for Win64 and once for the rest is two Types of one name.
  const conds = Object.fromEntries(sources.map((s) => [s.path, ifConditions(s.text)]));
  const lines = Object.fromEntries(sources.map((s) => [s.path, s.text.split(/\r?\n/)]));
  for (const t of parsed.types) {
    if (!conds[t.file] || !t.line) continue;
    if (t.cond === undefined) t.cond = conds[t.file][t.line - 1] ?? null;
    // Its attributes' own conditions: [PackingAlignment(4)] may be under #If Win64 = 0, on the
    // lines above the Type among other attributes, #If lines and blank ones.
    t.attrConds = {};
    for (let k = t.line - 2; k >= 0; k--) {
      const l = lines[t.file][k].trim();
      const a = /^\[\s*([A-Za-z_]\w*)/.exec(l);
      if (a) t.attrConds[a[1].toLowerCase()] ??= conds[t.file][k] ?? null;
      else if (l && !/^#(If|ElseIf|Else|End\s*If)\b/i.test(l)) break;
    }
  }
  return { ...parsed, files: sources.map((s) => s.path), defines };
}

/**
 * The #If condition each line of a file is under, as one expression ("(Win64)", "Not (Win64) And
 * (FLT_MGR_WIN8)"), or null: one entry per line.
 */
export function ifConditions(text) {
  const out = [];
  const stack = [];
  const current = () => {
    const parts = stack.flatMap((f) => [...f.not.map((c) => `Not (${c})`), ...(f.cond ? [`(${f.cond})`] : [])]);
    return parts.length ? parts.join(" And ") : null;
  };
  for (const line of String(text).split(/\r?\n/)) {
    const ifm = /^\s*#If\s+(.+?)\s+Then\b/i.exec(line);
    const elif = /^\s*#ElseIf\s+(.+?)\s+Then\b/i.exec(line);
    if (ifm) stack.push({ not: [], cond: ifm[1] });
    else if (elif && stack.length) {
      const f = stack.at(-1);
      if (f.cond) f.not.push(f.cond);
      f.cond = elif[1];
    } else if (/^\s*#Else\b/i.test(line) && stack.length) {
      const f = stack.at(-1);
      if (f.cond) f.not.push(f.cond);
      f.cond = null;
    } else if (/^\s*#End\s*If\b/i.test(line)) stack.pop();
    out.push(current());
  }
  return out;
}
