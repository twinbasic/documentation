import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getLatestRelease } from "./github-release.mjs";
import { readZipDirectory, extractFile } from "./zip-reader.mjs";
import { readPackageFiles } from "./package-files.mjs";

// The folder of a package, in the release zip and in an install alike:
// `{GUID}_<Name>`, with a leading dot on the two the IDE hides.
const FOLDER_RE = /^\.?\{([0-9A-Fa-f-]+)\}_(.+)$/;

// A build is `1005`, or `999a` for a second release the same day.
const BETA_RE = /^(\d+)([a-z]?)$/;

async function loadManifest(manifestPath) {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return { syncedAt: null, twinbasicTag: null, publishedAt: null, packages: {} };
  }
}

// What a manifest written before it recorded its source was read from.
const sourceOf = (manifest) => manifest.source ?? "release";

/** The tag a build is released under: BETA 1005 is `beta-x-1005`, BETA 999a `beta-x-0999a`. */
function tagForBeta(beta) {
  const m = BETA_RE.exec(beta);
  return m ? `beta-x-${m[1].padStart(4, "0")}${m[2]}` : null;
}

/** The build a release tag names, `1005` for `beta-x-1005`, or null for a tag of another form. */
function betaForTag(tag) {
  const m = /^beta-x-0*(\d+[a-z]?)$/.exec(tag ?? "");
  return m ? m[1] : null;
}

/**
 * Which BETA an install is, `1005`, or null. The IDE records it in `ide/build.js`
 * (`var tbVersionInfo = 'twinBASIC IDE BETA 1005';`); the name of the install's
 * folder, `twinBASIC_IDE_BETA_<n>`, is the fallback.
 */
function installBeta(root) {
  try {
    const m = /twinBASIC IDE BETA (\d+[a-z]?)/.exec(readFileSync(path.join(root, "ide", "build.js"), "utf8"));
    if (m) return m[1];
  } catch {
    /* no build.js: an install not unpacked whole */
  }
  const m = /^twinBASIC_IDE_BETA_(\d+[a-z]?)$/i.exec(path.basename(root));
  return m ? m[1] : null;
}

/**
 * Compares the latest GitHub release with the manifest of the last sync. The
 * result is the release (`tag`, `assetUrl`, `publishedAt`), the `manifest`, and
 * whether the packages need reading again: another tag, or a manifest written
 * from another source.
 */
async function compareBuiltinManifest(manifestPath) {
  const manifest = await loadManifest(manifestPath);
  const release = await getLatestRelease();
  const needsUpdate = manifest.twinbasicTag !== release.tag || sourceOf(manifest) !== "release";
  return { ...release, source: "release", beta: betaForTag(release.tag), manifest, needsUpdate };
}

/**
 * The same comparison for a local install, `install` being `{ root, beta }`: the
 * tag is the one the install's BETA is released under, so that the same build
 * gives the same version string from either source.
 */
async function compareInstallManifest(manifestPath, { root, beta }) {
  const manifest = await loadManifest(manifestPath);
  const tag = tagForBeta(beta);
  if (!tag) throw new Error(`not a BETA number: ${beta}`);
  const needsUpdate = manifest.twinbasicTag !== tag || sourceOf(manifest) !== "install";
  return { tag, root, source: "install", beta, publishedAt: null, manifest, needsUpdate };
}

function extractBuiltinPackages(zipBuffer) {
  const dir = readZipDirectory(zipBuffer);

  // Find entries matching packages/<folder>/package.twinproj
  const twinprojEntries = [];
  for (const [name, entry] of dir) {
    const match = name.match(/^packages\/([^/]+)\/package\.twinproj$/);
    if (match) twinprojEntries.push({ folderName: match[1], entry });
  }

  const results = [];
  for (const { folderName, entry } of twinprojEntries) {
    const m = folderName.match(FOLDER_RE);
    if (!m) continue;

    const guid = m[1];
    const symbol = m[2];

    results.push({ guid, symbol, files: readPackageFiles(extractFile(zipBuffer, entry)) });
  }

  results.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return results;
}

/**
 * The packages an install holds, `{ guid, symbol, file }` for each, sorted by
 * name, without reading them. The install's `packages/<folder>/package.twinproj`
 * are the files the release zip holds under the same names.
 */
function listInstalledPackages(root) {
  const packagesDir = path.join(root, "packages");
  const found = [];
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const m = FOLDER_RE.exec(entry.name);
    if (!m) continue;
    const file = path.join(packagesDir, entry.name, "package.twinproj");
    if (existsSync(file)) found.push({ guid: m[1], symbol: m[2], file });
  }
  found.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return found;
}

/** The packages of an install, read: what extractBuiltinPackages returns for the release zip. */
function readInstalledPackages(root) {
  return listInstalledPackages(root).map(({ guid, symbol, file }) => ({
    guid,
    symbol,
    files: readPackageFiles(readFileSync(file)),
  }));
}

export {
  betaForTag,
  compareBuiltinManifest,
  compareInstallManifest,
  extractBuiltinPackages,
  installBeta,
  listInstalledPackages,
  readInstalledPackages,
  tagForBeta,
};
