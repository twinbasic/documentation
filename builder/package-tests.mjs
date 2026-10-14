// The contributed packages' test projects, published as downloads. Each package with a test
// project under test/package-tests/<Package>/ (test/package-tests/README.md) gets
// <Package>-tests.twinproj beside its section, in the online tree, at
// <package_tests.dest>/<Package>/<Package>-tests.twinproj, which the section's landing page
// links to. The offline tree holds no copy: its links to the file go to the website, as a link
// to the help add-in's project file does (offline-rewrite.mjs, computeWebsiteUrl).
//
// The project is put together by lib/package-tests.mjs, as scripts/package_tests.mjs puts the
// one it runs together, except that the package itself is not in it: the project keeps its
// reference to the package and has no Packages/ folder, so the IDE resolves the package as a
// linked one, from the reader's %APPDATA%\twinBASIC\packages (the project's description and the
// landing page say how). So the download holds only the documentation's own code, the shared
// Expect.twin and the package's cases and RunAll module, under the repository's licence.
//
// The pack is impexp's own importProject, in process, as for the add-in's project
// (addin-project.mjs). Line ends are LF in the staged files, which impexp packs with CRLF, so a
// Windows and a Linux checkout write the same bytes.

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { downloadName, packageTestNames, templateSettings, testSettings, testSources } from "../lib/package-tests.mjs";
import { importProject } from "../scripts/impexp.mjs";
import { posix } from "./paths.mjs";

/**
 * What _config.yml's package_tests declares, resolved against the source tree, or null when it
 * declares none (the test fixtures' configs do not).
 *
 * @returns {{src: string, templates: string, dest: string} | null}
 */
export function packageTestsOf(config, srcRoot) {
  const e = config?.package_tests;
  if (!e?.src || !e?.templates || !e?.dest) return null;
  return {
    src: path.resolve(srcRoot, String(e.src)),
    templates: path.resolve(srcRoot, String(e.templates)),
    dest: posix(String(e.dest)).replace(/^\/+|\/+$/g, ""),
  };
}

/** The path of each package's download in the online tree. */
export function packageTestRels(cfg) {
  if (!cfg) return [];
  return packageTestNames(cfg.src).map((pkg) => `${cfg.dest}/${pkg}/${downloadName(pkg)}`);
}

/** One package's project file, in memory. */
export async function packPackageTests(cfg, pkg) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "package-tests-"));
  try {
    const stage = path.join(tmp, `${pkg}Tests`);
    await fs.mkdir(path.join(stage, "Sources"), { recursive: true });
    const settings = testSettings(templateSettings(cfg.templates, pkg), pkg);
    await fs.writeFile(path.join(stage, "Settings"), `${JSON.stringify(settings, null, "\t")}\n`, "utf8");
    for (const f of testSources(cfg.src, pkg)) {
      const out = path.join(stage, "Sources", ...f.name.split("/"));
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.writeFile(out, f.text, "utf8");
    }
    const out = path.join(tmp, "project.twinproj");
    importProject(out, stage);
    return await fs.readFile(out);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

/**
 * Pack every package's test project and write it into the online tree.
 *
 * @returns {Promise<{written: {rel: string, bytes: number}[], ms: number}>}
 */
export async function writePackageTests(cfg, root) {
  const t0 = Date.now();
  const written = [];
  for (const pkg of packageTestNames(cfg.src)) {
    const rel = `${cfg.dest}/${pkg}/${downloadName(pkg)}`;
    const bytes = await packPackageTests(cfg, pkg);
    const out = path.join(root, ...rel.split("/"));
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, bytes);
    written.push({ rel, bytes: bytes.length });
  }
  return { written, ms: Date.now() - t0 };
}

/** The build's line for the task's result. */
export function formatPackageTests(r, indent = "") {
  if (!r) return "";
  if (r.failed) return `${indent}package tests: not written: ${r.error}\n`;
  if (!r.written.length) return "";
  const kb = Math.round(r.written.reduce((n, w) => n + w.bytes, 0) / 1024);
  const n = r.written.length;
  return `${indent}package tests: ${n} project${n === 1 ? "" : "s"}, ${kb} KB, in the online tree (${r.ms} ms)\n`;
}
