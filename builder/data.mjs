// Phase 2 data loader: reads `_book.yml` from srcRoot and returns
// `{ book: <parsed YAML> }`, or `{}` when the file is absent.

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export async function loadData(srcRoot) {
  const f = path.join(srcRoot, "_book.yml");
  if (!existsSync(f)) return {};
  return { book: yaml.load(await fs.readFile(f, "utf8")) };
}
