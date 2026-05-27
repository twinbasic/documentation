// Phase 2 data loader: read every `_data/*.yml` file under srcRoot into
// a `site.data` object. Mirrors Jekyll's site-wide data injection: each
// file's basename becomes the key, the parsed YAML the value.
//
// See builder/PLAN-9.md §5.2. Pulls the existing book.yml load out of
// book.mjs into a generic loader so any future `_data/*.yml` file
// (e.g. `_data/contributors.yml`) lands in `site.data.contributors`
// without per-file plumbing.

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import yaml from "js-yaml";

export async function loadData(srcRoot) {
  const dataDir = path.join(srcRoot, "_data");
  if (!existsSync(dataDir)) return {};
  const files = await fg("*.yml", { cwd: dataDir, absolute: true });
  const out = {};
  for (const f of files) {
    const key = path.basename(f, ".yml");
    out[key] = yaml.load(await fs.readFile(f, "utf8"));
  }
  return out;
}
