import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { API_FORMAT, buildApi } from "./api-model.mjs";
import { indexerFingerprint } from "./fingerprint.mjs";
import { CONTAINER_MAP } from "./vb6-preprocess.mjs";

const execFileP = promisify(execFile);

// The files of a package the store keeps: its `.twin` sources and the VB6-format
// files, which is all the index is built from, and its Settings file for the
// project name.
const SOURCE_EXTS = new Set([".twin", ...Object.keys(CONTAINER_MAP)]);
const FINGERPRINT_FILE = "indexer.json";
const SETTINGS_FILE = "Settings";

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

  // Some of the sources have names of over a hundred characters, which with the
  // store's own path is more than Windows lets git open unless it is told to
  // use long paths. A store made before this was set gets it too.
  if (!needsInit) {
    await git(storePath, "config", "core.longpaths", "true");
    return;
  }

  await fs.mkdir(storePath, { recursive: true });
  await git(storePath, "init");
  await git(storePath, "config", "user.name", "indexer");
  await git(storePath, "config", "user.email", "indexer@local");
  await git(storePath, "config", "core.longpaths", "true");
  // The sources are kept as the packages hold them, whatever the user's git
  // converts line endings to.
  await git(storePath, "config", "core.autocrlf", "false");

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
 * Copies to the snapshots the api.json of each documented package that has none
 * there, when the store holds the version its section was indexed from: a sync
 * run before the section existed brought the store up to date, so no later sync
 * indexes the package and copies it. `documented` is `documentedPackages`'s map.
 * Returns the packages written, as `copyToSnapshots` does.
 */
async function adoptSnapshots(storePath, snapshotsPath, documented) {
  const adopt = [];
  for (const [key, section] of documented) {
    const [group, pkg] = key.split("/");
    if (await fs.stat(path.join(snapshotsPath, group, pkg, "api.json")).catch(() => null)) continue;
    const head = await apiHeadOf(path.join(storePath, group, pkg, "api.json"));
    if (head?.version && head.version === section.indexedFrom) adopt.push({ group, package: pkg });
  }
  return copyToSnapshots(storePath, snapshotsPath, adopt);
}

/**
 * What an api.json declares of itself, `{ format, version, project }`, read from
 * its first bytes (the file is written format, package, project, version, then
 * the types). `format` is 0 when the file declares none, as it did before the
 * format was numbered, and `version` and `project` null when the header is not
 * the current one. Null when the file is not there.
 */
async function apiHeadOf(apiPath) {
  let handle;
  try {
    handle = await fs.open(apiPath);
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(512), 0, 512, 0);
    const head = buffer.toString("utf-8", 0, bytesRead);
    const format = /^\{\s*"format":\s*(\d+)/.exec(head);
    const named =
      /^\{\s*"format":\s*\d+,\s*"package":\s*"[^"]*",\s*"project":\s*(null|"[^"]*"),\s*"version":\s*"([^"]*)"/.exec(
        head,
      );
    return {
      format: format ? Number(format[1]) : 0,
      version: named ? named[2] : null,
      project: named ? JSON.parse(named[1]) : null,
    };
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
  "old-scanner": "Indexed by another version of the scanner",
};

/**
 * Whether a package in the store has to be read again, and why: null when it is
 * complete and current, else one of the keys of STORE_PROBLEMS. It is complete
 * when it holds its sources and an api.json in the format this indexer writes,
 * and current when that api.json is of `version`, the one the source holds now,
 * and was written by the scanner and model this checkout has (the fingerprint
 * beside it, `indexerFingerprint`). The store is the only record of what has been
 * read, so nothing a manifest says can hide a package the store lacks or holds
 * from another build.
 *
 * `old-scanner` is the one problem that needs no new download: the sources are
 * there, and `reindexStored` indexes them again.
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
  if (head.version !== version) return "other-build";
  return (await recordedFingerprint(dir)) === indexerFingerprint() ? null : "old-scanner";
}

/**
 * The packages in the store that `analyze` covers, `{ group, name, apiPath }` in
 * group order (default, built-in, contributed) and then by name, and how many
 * others it leaves out. A package is covered when it has an api.json and either
 * `names` (--package, --packages) lists it, whether or not the reference
 * documents it, or no names are given and the reference has a section for it
 * (`documented`, the keys `<group>/<package>` of `documentedPackages`) or `all`
 * (--all) asks for every one.
 */
async function storedPackages(storePath, { documented, names = null, all = false }) {
  const list = [];
  let skipped = 0;
  for (const group of ["default", "built-in", "contributed"]) {
    const groupDir = path.join(storePath, group);
    let packages;
    try {
      packages = (await fs.readdir(groupDir)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    } catch {
      continue; /* the group has no folder */
    }
    for (const name of packages) {
      if (names && !names.includes(name)) continue;
      const apiPath = path.join(groupDir, name, "api.json");
      try {
        if (!(await fs.stat(path.join(groupDir, name))).isDirectory()) continue;
        await fs.access(apiPath);
      } catch {
        continue; /* not a package folder, or no api.json for it */
      }
      if (!names && !all && !documented.has(`${group}/${name}`)) skipped++;
      else list.push({ group, name, apiPath });
    }
  }
  return { list, skipped };
}

/** The fingerprint a package's folder in the store records, or null when it records none. */
async function recordedFingerprint(dir) {
  try {
    const { fingerprint } = JSON.parse(await fs.readFile(path.join(dir, FINGERPRINT_FILE), "utf-8"));
    return typeof fingerprint === "string" ? fingerprint : null;
  } catch {
    return null;
  }
}

/**
 * Writes a package into the store: its sources, as the package holds them with
 * the `Sources/` of their paths left off, its Settings file, `apiJson` as its
 * api.json, and the fingerprint of the code that wrote that.
 *
 * @param {{relativePath: string, content: Buffer}[]} rawFiles  every file of the package
 */
async function writeToStore(storePath, group, symbol, rawFiles, apiJson) {
  const pkgDir = path.join(storePath, group, symbol);
  const sourcesDir = path.join(pkgDir, "sources");
  await fs.rm(sourcesDir, { recursive: true, force: true });
  await fs.rm(path.join(pkgDir, SETTINGS_FILE), { force: true });
  for (const f of rawFiles) {
    if (f.relativePath.toLowerCase() === SETTINGS_FILE.toLowerCase()) {
      await fs.mkdir(pkgDir, { recursive: true });
      await fs.writeFile(path.join(pkgDir, SETTINGS_FILE), f.content);
      continue;
    }
    if (!SOURCE_EXTS.has(path.extname(f.relativePath).toLowerCase())) continue;
    let rel = f.relativePath;
    if (rel.startsWith("Sources/")) rel = rel.slice("Sources/".length);
    const dest = path.join(sourcesDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, f.content);
  }
  await writeIndex(pkgDir, apiJson);
}

async function writeIndex(pkgDir, apiJson) {
  await fs.mkdir(pkgDir, { recursive: true });
  await fs.writeFile(path.join(pkgDir, "api.json"), apiJson, "utf-8");
  await fs.writeFile(
    path.join(pkgDir, FINGERPRINT_FILE),
    `${JSON.stringify({ fingerprint: indexerFingerprint() }, null, 2)}\n`,
  );
}

/**
 * The files of a package as the store holds them, in the form `buildApi` takes:
 * each source under `Sources/`, and the Settings file. A store written before it
 * kept Settings has none; the project name its api.json records is put into one
 * (`project.name` is all `buildApi` reads of it).
 */
async function readStoredFiles(dir, project = null) {
  const files = [];
  const walk = async (sub) => {
    for (const entry of await fs.readdir(path.join(dir, "sources", sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(rel);
      else files.push({ relativePath: `Sources/${rel}`, content: await fs.readFile(path.join(dir, "sources", rel)) });
    }
  };
  await walk("");
  try {
    files.push({ relativePath: SETTINGS_FILE, content: await fs.readFile(path.join(dir, SETTINGS_FILE)) });
  } catch {
    if (project)
      files.push({ relativePath: SETTINGS_FILE, content: Buffer.from(JSON.stringify({ "project.name": project })) });
  }
  return files;
}

/**
 * Indexes a package again from the sources the store holds, in place: no
 * download, and the version its api.json has. Returns `buildApi`'s `stats`.
 */
async function reindexStored(storePath, group, symbol) {
  const dir = path.join(storePath, group, symbol);
  const apiPath = path.join(dir, "api.json");
  const head = await apiHeadOf(apiPath);
  if (!head?.version) throw new Error(`${symbol}: its api.json has no version to index again under`);
  const files = await readStoredFiles(dir, head.project);
  const { json, stats } = buildApi({ symbol, version: head.version, files });
  await writeIndex(dir, json);
  return stats;
}

export {
  STORE_PROBLEMS,
  adoptSnapshots,
  apiHeadOf,
  commitStore,
  copyToSnapshots,
  ensureStore,
  manifestPath,
  recordedFingerprint,
  reindexStored,
  readStoredFiles,
  storedPackages,
  storeStatus,
  writeToStore,
};
