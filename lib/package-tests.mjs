// The documentation's package test projects, test/package-tests/<Package>/: what goes into each
// one. Two users: scripts/package_tests.mjs, which runs them with the package embedded, and the
// build's packageTests task (builder/package-tests.mjs), which publishes each one without the
// package's code as <Package>-tests.twinproj beside the package's section, for a reader or the
// package's author to open with the package linked, and run. test/package-tests/README.md says
// how a project is laid out.
//
// A project is three things put together: the Settings of the package's sample template
// (test/example-projects/contributed-<Package>/Settings), which names the version the section
// documents; the shared Expect.twin; and the package folder's own Sources/, its [TestFixture]
// modules and the RunAll module generated from them; and its Resources/, when the cases need
// resources in the project (TBMANLIB_RES reads them).
//
// A compile case that expects an error is a compile error of its project, and the compiler runs
// no [TestCase] in a project with errors. So those cases are a second project, the package
// folder's compile/, which holds compile cases only and is never published.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const EXPECT_FILE = "Expect.twin";
export const RUNALL_FILE = "RunAll.twin";
export const EXPECT_JSON = "expect.json";
export const COMPILE_DIR = "compile";
export const RESOURCES_DIR = "Resources";

/** The file name of a package's published test project. */
export const downloadName = (pkg) => `${pkg}-tests.twinproj`;

// The Assert package is a compiler package, part of every install. Expect.Done ends a failed
// case with Assert.Strict.Fail when a runner runs one case at a time.
const ASSERT_REFERENCE = {
  id: "{9847A10D-8987-44B2-8B87-EA77DEF7F1D9}",
  isCompilerPackage: true,
  licence: "MIT",
  name: "[COMPILER PACKAGE] Assert",
  path32: "",
  path64: "",
  publisher: "TWINBASIC-COMPILER",
  symbolId: "Assert",
  versionBuild: 0,
  versionMajor: 0,
  versionMinor: 0,
  versionRevision: 24,
};

const isEmbedded = (r) => /^\/Packages\/[^/\\]+$/.test(typeof r.path32 === "string" ? r.path32 : "");

/** The packages that have a test project under `root`, sorted. */
export function packageTestNames(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(root, d.name, "Sources")))
    .map((d) => d.name)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The template's Settings, parsed. */
export function templateSettings(templatesDir, pkg) {
  const file = path.join(templatesDir, `contributed-${pkg}`, "Settings");
  if (!existsSync(file)) throw new Error(`no sample template for ${pkg}: ${file} is missing`);
  return JSON.parse(readFileSync(file, "utf8"));
}

/** The version of the package that the template references, as a.b.c.d. */
export function packageVersion(settings, pkg) {
  const r = (settings["project.references"] ?? []).find((x) => isEmbedded(x) && x.symbolId === pkg);
  if (!r) throw new Error(`the ${pkg} template references no embedded package named ${pkg}`);
  return [r.versionMajor, r.versionMinor, r.versionRevision, r.versionBuild].map(Number).join(".");
}

/**
 * The test project's Settings. The reference to the package is the template's, which names the
 * package by its project id. With the package's tree in the project's Packages/ folder it is
 * embedded (the runner puts it there); without it the IDE resolves it as a linked package, from
 * the .twinpack in %APPDATA%\twinBASIC\packages with that project id, once the compiler has
 * (re)started. The published project has no Packages/ folder, so it carries none of the
 * package's code. The IDE reads the version from that file, not from the reference.
 *
 * @param {object} template  the template's Settings
 * @param {string} pkg
 */
export function testSettings(template, pkg) {
  const version = packageVersion(template, pkg);
  const s = structuredClone(template);
  const refs = [...(s["project.references"] ?? [])];
  if (!refs.some((r) => r.symbolId === "Assert")) refs.push({ ...ASSERT_REFERENCE });
  s["project.references"] = refs;
  const name = `${pkg.replace(/\W/g, "")}Tests`;
  s["project.name"] = name;
  s["project.appTitle"] = name;
  s["project.id"] = guidFor(pkg);
  s["project.description"] =
    `The test cases of the twinBASIC documentation for the ${pkg} package, version ${version}, ` +
    `which the project references as a linked package: put ${pkg}'s .twinpack of that version in ` +
    `%APPDATA%\\twinBASIC\\packages and restart the compiler, then run Sub Main.`;
  s["project.buildPath"] = "${SourcePath}\\Build\\${ProjectName}_${Architecture}.${FileExtension}";
  s["project.startupObject"] = "Sub Main";
  return s;
}

/**
 * The project's source files: Expect.twin, then the package folder's Sources/ in name order,
 * each with LF line ends.
 *
 * @returns {{name: string, text: string}[]}  `name` is the path under Sources/
 */
export function testSources(root, pkg) {
  return [
    { name: EXPECT_FILE, text: lf(readFileSync(path.join(root, EXPECT_FILE), "utf8")) },
    ...filesUnder(path.join(root, pkg, "Sources")),
  ];
}

/**
 * The compile project's source files: the package folder's compile/ in name order, each with LF
 * line ends; none when the folder is absent.
 *
 * @returns {{name: string, text: string}[]}  `name` is the path under compile/
 */
export function compileSources(root, pkg) {
  const dir = path.join(root, pkg, COMPILE_DIR);
  return existsSync(dir) ? filesUnder(dir) : [];
}

/**
 * The project's resources: the package folder's Resources/ (`<TYPE>/<NAME>`, as an exported
 * project keeps them) in name order, byte for byte; none when the folder is absent.
 *
 * @returns {{name: string, bytes: Buffer}[]}  `name` is the path under Resources/
 */
export function resourceFiles(root, pkg) {
  const dir = path.join(root, pkg, RESOURCES_DIR);
  if (!existsSync(dir)) return [];
  return filesUnder(dir, (file) => readFileSync(file)).map((f) => ({ name: f.name, bytes: f.text }));
}

const lf = (t) => t.replace(/\r\n?/g, "\n");

function filesUnder(dir, read = (file) => lf(readFileSync(file, "utf8"))) {
  const files = [];
  const walk = (rel) => {
    for (const e of readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(r);
      else if (statSync(path.join(dir, r)).isFile()) files.push({ name: r, text: read(path.join(dir, r)) });
    }
  };
  walk("");
  return files;
}

/** The package's expect.json, parsed, or an empty one. */
export function readExpect(root, pkg) {
  const file = path.join(root, pkg, EXPECT_JSON);
  if (!existsSync(file)) return { cases: {} };
  return JSON.parse(readFileSync(file, "utf8"));
}

// A project id of its own for each package, the same on every machine.
function guidFor(pkg) {
  const h = createHash("sha256").update(`twinBASIC documentation package tests: ${pkg}`).digest("hex");
  return `{${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-9${h.slice(17, 20)}-${h.slice(20, 32)}}`.toUpperCase();
}
