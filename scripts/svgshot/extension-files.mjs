// The files that are the Chrome extension (chrome/). The folder scripts/svgshot/ holds it among
// the converter's Node modules, so what it is made of is followed from its manifest and not
// listed: a module added to a page is found, and there is no list to go stale.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The folder that is the extension: its manifest is there. */
export const EXTENSION_FOLDER = path.dirname(fileURLToPath(import.meta.url));

/** The word list the extension masks by, which git ignores (private-list.mjs). */
export const WORDS_FILE = "private.json";

// The modules the module file `file` imports, by the import statements at the start of a line.
function importsOf(file) {
  const text = readFileSync(file, "utf8");
  const named = [...text.matchAll(/^(?:import|export) [^;]*? from "([^"]+)";\r?$/gm)].map((m) => m[1]);
  const closing = [...text.matchAll(/^\} from "([^"]+)";\r?$/gm)].map((m) => m[1]);
  return [...named, ...closing];
}

const manifestOf = (folder) => JSON.parse(readFileSync(path.join(folder, "manifest.json"), "utf8"));

/**
 * Every module an extension page or its worker loads, from what the manifest and the panel name:
 * a Map from each file to the names it imports, as written.
 */
export function extensionModules(folder = EXTENSION_FOLDER) {
  const manifest = manifestOf(folder);
  const panel = path.join(folder, manifest.side_panel.default_path);
  const page = readFileSync(panel, "utf8");
  const scripts = [...page.matchAll(/<script [^>]*src="([^"]+)"/g)].map((m) => path.join(path.dirname(panel), m[1]));
  const seen = new Map();
  const queue = [path.join(folder, manifest.background.service_worker), ...scripts];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    const names = importsOf(file);
    seen.set(file, names);
    for (const name of names) if (name.startsWith(".")) queue.push(path.resolve(path.dirname(file), name));
  }
  return seen;
}

/**
 * The files Chrome needs of the extension in `folder`, sorted, as paths from it with forward
 * slashes: the manifest, the panel's page and style sheets, and every module loaded.
 */
export function extensionFiles(folder = EXTENSION_FOLDER) {
  const manifest = manifestOf(folder);
  const panel = path.join(folder, manifest.side_panel.default_path);
  const sheets = [...readFileSync(panel, "utf8").matchAll(/<link [^>]*href="([^"]+)"/g)].map((m) =>
    path.join(path.dirname(panel), m[1]),
  );
  const files = [path.join(folder, "manifest.json"), panel, ...sheets, ...extensionModules(folder).keys()];
  return [...new Set(files.map((f) => path.relative(folder, f).replace(/\\/g, "/")))].sort();
}
