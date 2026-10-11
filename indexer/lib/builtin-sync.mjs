import { readFile } from 'node:fs/promises';
import { getLatestRelease, downloadRelease } from './github-release.mjs';
import { readZipDirectory, extractFile } from './zip-reader.mjs';
import { parseTwinpack, collectFiles } from './twinpack-parser.mjs';

const FOLDER_RE = /^\.?\{([0-9A-Fa-f-]+)\}_(.+)$/;

async function loadManifest(manifestPath) {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return { syncedAt: null, twinbasicTag: null, publishedAt: null, packages: {} };
  }
}

async function compareBuiltinManifest(manifestPath) {
  const manifest = await loadManifest(manifestPath);
  const release = await getLatestRelease();

  if (manifest.twinbasicTag === release.tag) {
    return { ...release, manifest, needsUpdate: false };
  }
  return { ...release, manifest, needsUpdate: true };
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

    const twinprojBuf = extractFile(zipBuffer, entry);
    const root = parseTwinpack(twinprojBuf);
    const files = collectFiles(root);

    results.push({ guid, symbol, files });
  }

  results.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return results;
}

export { compareBuiltinManifest, extractBuiltinPackages };
