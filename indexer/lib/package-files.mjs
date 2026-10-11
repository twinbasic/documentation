import { CATEGORY, parseProject } from "../../scripts/impexp.mjs";

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The files of a package held as a `.twinpack` or `.twinproj` file, read by the
 * parser `scripts/impexp.mjs` unpacks projects with: `{ relativePath, content }`
 * for each, the path relative to the package's root and written with `/`, the
 * content a Buffer, in code-unit order of the path.
 *
 * Whatever sits under a Packages folder is left out: it is a copy of a package
 * this one references, which has its own entry in the store.
 *
 * @param {Uint8Array} bytes
 */
export function readPackageFiles(bytes) {
  const files = [];
  const walk = (entries, prefix) => {
    for (const entry of entries) {
      if (entry.category === CATEGORY.Packages) continue;
      if (entry.kind === "file") files.push({ relativePath: prefix + entry.name, content: entry.content });
      else walk(entry.children, `${prefix}${entry.name}/`);
    }
  };
  walk(parseProject(bytes).children, "");
  files.sort((a, b) => byCodeUnit(a.relativePath, b.relativePath));
  return files;
}
