import { readFile } from 'node:fs/promises';
import { queryPackages, downloadPackage } from './twinserv-client.mjs';
import { parseTwinpack, collectFiles } from './twinpack-parser.mjs';

function latestVersion(pkg) {
  return pkg.versions[pkg.versions.length - 1];
}

function versionString(v) {
  return `${v.versionMajor}.${v.versionMinor}.${v.versionRevision}.${v.versionBuild}`;
}

async function loadManifest(manifestPath) {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return { syncedAt: null, packages: {} };
  }
}

async function compareWithManifest(manifestPath) {
  const manifest = await loadManifest(manifestPath);
  const { public: packages } = await queryPackages();

  const toDownload = [];
  const unchanged = [];
  const removed = [];

  const remoteIds = new Set();

  for (const pkg of packages) {
    const latest = latestVersion(pkg);
    const id = pkg.projectId;
    remoteIds.add(id);

    const ver = versionString(latest);
    const cached = manifest.packages[id];

    if (!cached) {
      toDownload.push({ id, pkg, version: latest, symbol: latest.symbol, reason: 'added' });
    } else if (cached.version !== ver) {
      toDownload.push({ id, pkg, version: latest, symbol: latest.symbol, reason: 'updated' });
    } else {
      unchanged.push({ id, pkg, version: latest, symbol: cached.symbol });
    }
  }

  for (const [id, info] of Object.entries(manifest.packages)) {
    if (!remoteIds.has(id)) {
      removed.push({ id, symbol: info.symbol });
      delete manifest.packages[id];
    }
  }

  return { toDownload, unchanged, removed, manifest };
}

async function fetchPackage(projectId, version) {
  const buf = await downloadPackage(projectId, version);
  const root = parseTwinpack(buf);
  return collectFiles(root);
}

export { compareWithManifest, fetchPackage, versionString };
