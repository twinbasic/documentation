// The gate on builder/publish-policy.mjs's gate.
//
// A build that passes says only "nothing in docs/ is currently refused",
// which is also what an allowlist widened until it refuses nothing says.
// The interesting assertion is the other one -- that the types worth
// refusing are still refused -- and a build over a clean tree can never
// make it. So it is made here, against named probes.
//
// No browser, no built tree, ~40 ms. Runs before everything else in
// check.bat for that reason.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import { discover } from "../builder/discover.mjs";
import {
  publishPolicyFor, unpublishableSourceFiles, unpublishableTreePaths,
  SOURCE_EXTENSIONS, BUILD_EXTENSIONS,
} from "../builder/publish-policy.mjs";

const SRC = process.argv.includes("--src")
  ? process.argv[process.argv.indexOf("--src") + 1]
  : "docs";

// Each probe names why refusing it matters. A probe that starts passing
// is the allowlist having been widened -- deliberately or not -- and the
// failure should say which line of publish-policy.mjs to look at.
const MUST_REFUSE = [
  ["Reference/NOTES.md",          "markdown with no frontmatter is served as raw markdown (the AppGlobalClassObject bug)"],
  ["Reference/Core/Dim.md.bak",   "editor backup of a real page"],
  ["Features/sample.twin",        "twinBASIC source dropped beside a page it illustrates"],
  ["Features/secrets.json",       "credentials file"],
  ["assets/deploy.pem",           "private key"],
  ["Tutorials/draft.docx",        "working document"],
  ["IDE/build.log",               "build log"],
  ["Thumbs.db",                   "Windows shell cache, created without being asked"],
  ["desktop.ini",                 "Windows folder metadata, created without being asked"],
  ["archive.zip",                 "bulk attachment"],
  ["setup.exe",                   "executable"],
  ["LICENSE",                     "extensionless file that is not the CNAME marker"],
  [".env",                        "dotfile carrying secrets"],
];

// Passing these matters as much as refusing the others: a policy that
// refuses everything also reports a clean sweep over a tree it rejected.
const MUST_ALLOW = [
  ["Reference/Core/Dim.html",     "a rendered page"],
  ["assets/images/x.png",         "an image"],
  ["assets/images/X.PNG",         "an image, shouting -- the extension test is case-insensitive"],
  ["assets/fonts/inter.woff2",    "a webfont"],
  ["assets/fonts/Inter-LICENSE.txt", "the licence beside it"],
  ["CNAME",                       "GitHub Pages' custom-domain marker"],
];

let failures = 0;
const fail = (msg) => { failures++; console.error(`  FAIL  ${msg}`); };

// ── 1. The real source tree is clean ────────────────────────────────
const config = yaml.load(await fs.readFile(path.join(SRC, "_config.yml"), "utf8"));
const policy = publishPolicyFor(config);
const { staticFiles } = await discover(SRC, config.exclude ?? []);
for (const entry of config.bundle_extra ?? []) {
  staticFiles.push({ srcPath: path.resolve(SRC, entry.src), destRel: entry.dest });
}
const live = unpublishableSourceFiles(staticFiles, policy);
if (live.length) {
  for (const f of live) fail(`${SRC}/${f.rel} -- ${f.why}`);
} else {
  console.log(`  ok    ${staticFiles.length} static files under ${SRC}/ are all publishable types`);
}

// ── 2. The probes ───────────────────────────────────────────────────
const asSource = (rels) => rels.map(r => ({ destRel: r, srcPath: `${SRC}/${r}` }));

const refused = new Set(
  unpublishableSourceFiles(asSource(MUST_REFUSE.map(p => p[0])), policy).map(f => f.rel),
);
for (const [rel, why] of MUST_REFUSE) {
  if (!refused.has(rel)) fail(`${rel} is now publishable, but should not be: ${why}`);
}
if (refused.size === MUST_REFUSE.length) {
  console.log(`  ok    ${MUST_REFUSE.length} probe types still refused at source`);
}

const allowed = unpublishableSourceFiles(asSource(MUST_ALLOW.map(p => p[0])), policy);
for (const f of allowed) {
  const why = MUST_ALLOW.find(p => p[0] === f.rel)?.[1];
  fail(`${f.rel} is refused, but should publish (${why}): ${f.why}`);
}
if (!allowed.length) console.log(`  ok    ${MUST_ALLOW.length} legitimate types still publish`);

// ── 3. bundle_extra is exempt by PATH, not by extension ─────────────
// docs/_config.yml declares Features/Packages/downloads/impexp.{mjs,py}
// with both ends spelled out. That is what makes them shippable; the
// same extension anywhere else must still fail, or declaring one entry
// would quietly bless a whole type.
for (const entry of config.bundle_extra ?? []) {
  const dest = String(entry.dest);
  const ext = dest.slice(dest.lastIndexOf("."));
  if (unpublishableSourceFiles(asSource([dest]), policy).length) {
    fail(`declared bundle_extra ${dest} is refused`);
  }
  const elsewhere = `Reference/stray${ext}`;
  if (!unpublishableSourceFiles(asSource([elsewhere]), policy).length) {
    fail(`${ext} publishes anywhere, not just at the declared ${dest}`);
  }
}
if (!failures) console.log(`  ok    bundle_extra exemptions are path-scoped`);

// ── 4. The two surfaces stay distinct ───────────────────────────────
// BUILD_EXTENSIONS exists so the build can emit sitemap.xml and
// search-data.json without blessing a stray docs/secrets.json. Folding
// the two sets together would pass every other assertion here.
for (const ext of BUILD_EXTENSIONS) {
  if (SOURCE_EXTENSIONS.has(ext)) {
    fail(`${ext} is in both SOURCE_EXTENSIONS and BUILD_EXTENSIONS -- ` +
         `the source surface no longer refuses it`);
  }
  const probe = [`Reference/probe${ext}`];
  if (!unpublishableSourceFiles(asSource(probe), policy).length) {
    fail(`${ext} publishes from source, not just from the build`);
  }
  if (unpublishableTreePaths(probe, policy).length) {
    fail(`${ext} is refused in a tree, but the build emits it`);
  }
}
if (!failures) console.log(`  ok    build-only types (${[...BUILD_EXTENSIONS].join(", ")}) are refused at source`);

if (failures) {
  console.error(`\ncheck_publish_policy: ${failures} failure(s). ` +
                `See builder/publish-policy.mjs.`);
  process.exit(1);
}
console.log("check_publish_policy: ok");
