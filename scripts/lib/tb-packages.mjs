// The packages an IDE install ships, exported as source trees. Shared by
// scripts/census_attributes.mjs and scripts/build_package_api.mjs, which read
// the same trees for different questions, so that one export -- and one cache
// of it -- answers both.
//
// A package's sources are inside a .twinproj archive under the install's
// `packages\`, one folder per package, named `{GUID}_<Name>`, with a leading
// dot on the two the IDE hides: `.{...}_VBA` and `.{...}_VBRUN`. impexp, run in
// process (tb-project.mjs), unpacks one into `Settings` plus `Sources\`.

import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { unpackProject } from "./tb-project.mjs";

/** The package's name, from its folder: `.{54F9...}_VBA` gives `VBA`. */
export const packageName = (folder) => folder.replace(/^\.?\{[^}]+\}_/, "");

/** Where exports of a build are kept unless the caller says otherwise. */
export const defaultCache = (build) => path.join(os.tmpdir(), "tb-census", `beta-${build ?? "unknown"}`);

/**
 * Export every project under the install's `packages\` -- and, with `samples`,
 * under `projects\` and `addins\` too -- into `cache\<group>\<folder>`. A
 * folder already in the cache is taken as a finished export unless `refresh`
 * is set: a failed export removes its folder, so one left behind is complete.
 * A refresh clears the folder first, as unpackProject refuses one that holds
 * files the project does not.
 *
 * @param {object} o
 * @param {string} o.root      the install root, holding `packages\`
 * @param {string} o.cache
 * @param {boolean} [o.refresh]
 * @param {boolean} [o.samples]
 * @param {(line: string) => void} [o.log]
 * @returns {{projects: {name, folder, group, proj, dir}[], exported: number,
 *   failed: {name, why}[]}} `projects` lists every project found, with the
 *   folder its export is in; a failed one is in `failed` as well
 */
export function exportPackages({ root, cache, refresh = false, samples = false, log = () => {} }) {
  const roots = [path.join(root, "packages")];
  if (samples) {
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
        if (!f.toLowerCase().endsWith(".twinproj")) continue;
        projects.push({
          name: packageName(entry.name),
          folder: entry.name,
          group: path.basename(r),
          proj: path.join(dir, f),
          dir: path.join(cache, path.basename(r), entry.name),
        });
      }
    }
  }
  if (!projects.length) throw new Error(`no .twinproj found under ${roots.join(", ")}`);

  mkdirSync(cache, { recursive: true });
  let exported = 0;
  const failed = [];
  for (const p of projects) {
    if (existsSync(p.dir) && !refresh) continue;
    // The cache's own folder, cleared rather than exported over: unpackProject
    // refuses a folder that holds files the project does not.
    rmSync(p.dir, { recursive: true, force: true });
    try {
      unpackProject(p.proj, p.dir);
      exported++;
    } catch (e) {
      rmSync(p.dir, { recursive: true, force: true });
      const why = e.message.split("\n").join(" | ");
      failed.push({ name: p.name, why });
      log(`  ! export failed: ${p.name} ${why}`);
    }
  }
  log(`  exported ${exported} project(s), ${projects.length} total in cache`);
  return { projects, exported, failed };
}
