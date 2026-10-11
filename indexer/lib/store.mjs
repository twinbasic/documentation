import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { API_FORMAT } from "./api-model.mjs";

const execFileP = promisify(execFile);

async function git(cwd, ...args) {
  const { stdout } = await execFileP("git", args, { cwd });
  return stdout.trim();
}

/**
 * Where a sync-state file lives: in the store, beside the sources it describes.
 * The store is not committed, so a fresh clone has no sync state either, and its
 * first sync reads every package.
 */
function manifestPath(storePath, name) {
  return path.join(storePath, "manifests", `${name}.json`);
}

async function ensureStore(storePath, snapshotsPath) {
  let needsInit = false;
  try {
    await fs.access(path.join(storePath, ".git"));
  } catch {
    needsInit = true;
  }

  if (!needsInit) return;

  await fs.mkdir(storePath, { recursive: true });
  await git(storePath, "init");
  await git(storePath, "config", "user.name", "indexer");
  await git(storePath, "config", "user.email", "indexer@local");

  let seeded = false;
  try {
    const groups = await fs.readdir(snapshotsPath);
    for (const group of groups) {
      const groupDir = path.join(snapshotsPath, group);
      const stat = await fs.stat(groupDir);
      if (!stat.isDirectory()) continue;
      const packages = await fs.readdir(groupDir);
      for (const pkg of packages) {
        const apiSrc = path.join(groupDir, pkg, "api.json");
        try {
          await fs.access(apiSrc);
          const dest = path.join(storePath, group, pkg, "api.json");
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(apiSrc, dest);
          seeded = true;
        } catch {
          /* no api.json for this package */
        }
      }
    }
  } catch {
    /* no snapshots directory yet */
  }

  if (seeded) {
    await git(storePath, "add", "-A");
    await git(storePath, "commit", "-m", "baseline: seeded from docs repo snapshots");
  }
}

async function commitStore(storePath, message) {
  await git(storePath, "add", "-A");
  const status = await git(storePath, "status", "--porcelain");
  if (!status) return false;
  await git(storePath, "commit", "-m", message);
  return true;
}

/**
 * Copies the api.json of each of `packages`, `{ group, package }`, from the
 * store to the committed snapshots. A file is written only when its bytes
 * differ. Returns the packages it wrote.
 */
async function copyToSnapshots(storePath, snapshotsPath, packages) {
  const written = [];
  for (const { group, package: pkg } of packages) {
    const src = path.join(storePath, group, pkg, "api.json");
    const dest = path.join(snapshotsPath, group, pkg, "api.json");
    let content;
    try {
      content = await fs.readFile(src);
    } catch {
      continue; /* api.json not present in store */
    }
    const old = await fs.readFile(dest).catch(() => null);
    if (old?.equals(content)) continue;
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content);
    written.push({ group, package: pkg });
  }
  return written;
}

/**
 * What an api.json declares of itself, `{ format, version }`, read from its
 * first bytes (the file is written format, package, project, version, then the
 * types). `format` is 0 when the file declares none, as it did before the
 * format was numbered, and `version` null when the header is not the current
 * one. Null when the file is not there.
 */
async function apiHeadOf(apiPath) {
  let handle;
  try {
    handle = await fs.open(apiPath);
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(512), 0, 512, 0);
    const head = buffer.toString("utf-8", 0, bytesRead);
    const format = /^\{\s*"format":\s*(\d+)/.exec(head);
    const version =
      /^\{\s*"format":\s*\d+,\s*"package":\s*"[^"]*",\s*"project":\s*(?:null|"[^"]*"),\s*"version":\s*"([^"]*)"/.exec(
        head,
      );
    return { format: format ? Number(format[1]) : 0, version: version ? version[1] : null };
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}

// What a store problem is called in what `sync` prints.
const STORE_PROBLEMS = {
  "missing-sources": "Missing sources",
  "missing-index": "Missing api.json",
  "old-format": "Index written by an older indexer",
  "other-build": "Indexed from another build",
};

/**
 * Whether a package in the store has to be read again, and why: null when it is
 * complete and current, else one of the keys of STORE_PROBLEMS. It is complete
 * when it holds its sources and an api.json in the format this indexer writes,
 * and current when that api.json is of `version`, the one the source holds now.
 * The store is the only record of what has been read, so nothing a manifest
 * says can hide a package the store lacks or holds from another build.
 */
async function storeStatus(storePath, group, symbol, version) {
  const dir = path.join(storePath, group, symbol);
  try {
    await fs.access(path.join(dir, "sources"));
  } catch {
    return "missing-sources";
  }
  const head = await apiHeadOf(path.join(dir, "api.json"));
  if (!head) return "missing-index";
  if (head.format !== API_FORMAT) return "old-format";
  return head.version === version ? null : "other-build";
}

export { STORE_PROBLEMS, apiHeadOf, commitStore, copyToSnapshots, ensureStore, manifestPath, storeStatus };
