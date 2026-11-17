// Reading a package's sources: every .twin file under a folder (an exported package, whose
// Sources/ folder holds them, a clone of the package's repository, or any folder of .twin files),
// parsed by the shared scanner. A Packages/ folder, which holds copies of other packages, is not
// read.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
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
 * files, and `files`, their paths relative to the folder.
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
  return { ...parsed, files: sources.map((s) => s.path) };
}
