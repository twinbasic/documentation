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
// The pack is impexp's own packFiles, in memory, as for the add-in's project
// (addin-project.mjs). Line ends are LF in the files, which impexp packs with CRLF, so a
// Windows and a Linux checkout write the same bytes.

//
// A package's published tool (a folder of the package's with a publish.json, packageTools in
// lib/package-tests.mjs; test/package-tests/README.md, "Tools of one package") is zipped beside
// the test project, as <dest>/<Package>/<zip>, its files under one folder: every file of the tool's
// folder but publish.json, `rewrite` replacing a file's text, and `vendor` adding files from
// outside the folder (a path relative to the tool's folder), so that the zip needs nothing else.
// Text files are written with LF and every entry with one fixed time, so the same files give the
// same zip on any checkout.

import { readdirSync, readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  downloadName,
  packageTestNames,
  packageTools,
  resourceFiles,
  TOOL_MANIFEST,
  templateSettings,
  testSettings,
  testSources,
} from "../lib/package-tests.mjs";
import { zipFiles } from "../lib/zip.mjs";
import { packFiles } from "../scripts/impexp.mjs";
import { posix } from "./paths.mjs";

// Every entry's time: a fixed one, so the zip's bytes follow its files alone.
const ZIP_TIME = new Date(2000, 0, 1, 0, 0, 0);

/** A file's bytes as published: a text file (no NUL byte) with LF line ends. */
function published(bytes) {
  return bytes.includes(0) ? bytes : Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
}

/** One published tool's zip, in memory. */
export function packPackageTool({ dir, manifest }) {
  const files = new Map();
  const walk = (d, rel) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else if (r !== TOOL_MANIFEST) files.set(r, published(readFileSync(path.join(d, e.name))));
    }
  };
  walk(dir, "");
  for (const [rel, text] of Object.entries(manifest.rewrite ?? {})) {
    if (!files.has(rel)) throw new Error(`${dir}: ${TOOL_MANIFEST} rewrites ${rel}, which the folder does not hold`);
    files.set(rel, Buffer.from(text, "utf8"));
  }
  for (const { from, to } of manifest.vendor ?? []) files.set(to, published(readFileSync(path.resolve(dir, from))));
  const names = [...files.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return zipFiles(names.map((n) => ({ name: `${manifest.folder}/${n}`, data: files.get(n), mtime: ZIP_TIME })));
}

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

/** The path of each package's download in the online tree: test projects, then tools. */
export function packageTestRels(cfg) {
  if (!cfg) return [];
  return [
    ...packageTestNames(cfg.src).map((pkg) => `${cfg.dest}/${pkg}/${downloadName(pkg)}`),
    ...packageTools(cfg.src).map((t) => `${cfg.dest}/${t.pkg}/${t.manifest.zip}`),
  ];
}

/** One package's project file, in memory. */
export async function packPackageTests(cfg, pkg) {
  const settings = testSettings(templateSettings(cfg.templates, pkg), pkg);
  const files = [{ rel: "Settings", bytes: Buffer.from(`${JSON.stringify(settings, null, "\t")}\n`, "utf8") }];
  for (const f of testSources(cfg.src, pkg))
    files.push({ rel: `Sources/${f.name}`, bytes: Buffer.from(f.text, "utf8") });
  for (const r of resourceFiles(cfg.src, pkg)) files.push({ rel: `Resources/${r.name}`, bytes: r.bytes });
  return packFiles(files, `${pkg}Tests`).bytes;
}

/**
 * Pack every package's test project, in memory. The build does this before any page renders, so
 * that a page can state a download's size ({{tbdocs:size:...}}, counts.mjs), and the
 * packageTests task writes these same bytes.
 *
 * @returns {Promise<{packed: {pkg: string, rel: string, bytes: Buffer, kind: "tests" | "tool"}[], ms: number}>}
 */
export async function packAllPackageTests(cfg) {
  const t0 = Date.now();
  const packed = [];
  for (const pkg of packageTestNames(cfg.src)) {
    const rel = `${cfg.dest}/${pkg}/${downloadName(pkg)}`;
    packed.push({ pkg, rel, bytes: await packPackageTests(cfg, pkg), kind: "tests" });
  }
  for (const tool of packageTools(cfg.src)) {
    const rel = `${cfg.dest}/${tool.pkg}/${tool.manifest.zip}`;
    packed.push({ pkg: tool.pkg, rel, bytes: packPackageTool(tool), kind: "tool" });
  }
  return { packed, ms: Date.now() - t0 };
}

/**
 * Write what packAllPackageTests packed into the online tree.
 *
 * @returns {Promise<{written: {rel: string, bytes: number}[], ms: number}>}
 */
export async function writePackageTests({ packed, ms: packMs }, root) {
  const t0 = Date.now();
  const written = [];
  for (const { rel, bytes } of packed) {
    const out = path.join(root, ...rel.split("/"));
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, bytes);
    written.push({ rel, bytes: bytes.length });
  }
  return { written, ms: packMs + Date.now() - t0 };
}

/** The build's line for the task's result. */
export function formatPackageTests(r, indent = "") {
  if (!r) return "";
  if (r.failed) return `${indent}package tests: not written: ${r.error}\n`;
  if (!r.written.length) return "";
  const kb = Math.round(r.written.reduce((n, w) => n + w.bytes, 0) / 1024);
  const tools = r.written.filter((w) => w.rel.endsWith(".zip")).length;
  const n = r.written.length - tools;
  const also = tools ? ` and ${tools} tool${tools === 1 ? "" : "s"}` : "";
  return `${indent}package tests: ${n} project${n === 1 ? "" : "s"}${also}, ${kb} KB, in the online tree (${r.ms} ms)\n`;
}
