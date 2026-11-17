// The exports of Windows' kernel-mode files, by Windows version: the files are found in Winbindex's
// index (winbindex.m417z.com, which records each file's hash, timestamp and image size by Windows
// update), downloaded from the Microsoft symbol server by that timestamp and size, checked against
// the hash, and reduced to their export tables. Only the export tables are kept in the database;
// the files stay in the download cache.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { exportsOf, peHeaders } from "./pe.mjs";

const WINBINDEX = "https://winbindex.m417z.com/data/by_filename_compressed";
const SYMBOLS = "https://msdl.microsoft.com/download/symbols";
const AGENT = { "user-agent": "tbkmode-verifier" };

/** Compares two dotted build numbers, such as 19045.6396 and 19045.7850. */
function compareBuilds(a, b) {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** Winbindex's index of one file name: `{sha256: {fileInfo, windowsVersions}}`. */
export async function winbindexIndex(file) {
  const res = await fetch(`${WINBINDEX}/${file}.json.gz`, { headers: AGENT });
  if (!res.ok) throw new Error(`Winbindex has no index of ${file} (HTTP ${res.status})`);
  return JSON.parse(gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8"));
}

/**
 * The newest amd64 build of a file in one Windows version of a Winbindex index, or null.
 *
 * @returns {{sha256: string, build: string, update: string, timestamp: number, sizeOfImage: number, size: number} | null}
 */
export function newestBuild(index, version) {
  let best = null;
  for (const [sha256, entry] of Object.entries(index)) {
    const info = entry.fileInfo;
    if (!info?.timestamp || !info.virtualSize || info.machineType !== 0x8664) continue;
    for (const [update, u] of Object.entries(entry.windowsVersions?.[version] ?? {})) {
      const build = u.updateInfo?.releaseVersion ?? u.windowsVersionInfo?.releaseVersion;
      if (!build) continue;
      if (!best || compareBuilds(build, best.build) > 0)
        best = { sha256, build, update, timestamp: info.timestamp, sizeOfImage: info.virtualSize, size: info.size };
    }
  }
  return best;
}

/** The symbol server's URL of a file by its PE timestamp and image size. */
export function symbolServerUrl(file, timestamp, sizeOfImage) {
  const key = `${timestamp.toString(16).toUpperCase().padStart(8, "0")}${sizeOfImage.toString(16).toUpperCase()}`;
  return `${SYMBOLS}/${file}/${key}/${file}`;
}

/**
 * A file from the cache, or else downloaded from the symbol server: `{bytes, sha256}`. The cache
 * holds each file under the hash the index gives.
 *
 * The symbol server keys a file by its PE timestamp and image size only, so two builds that share
 * both share one key, and the server returns one of them: hal.dll, a small stub since Windows 10, is
 * built with the same timestamp and size again and again. A file whose hash is not the index's is
 * taken when its timestamp and size are the key's, and its own hash is returned with `shared: true`.
 */
export async function fetchFile(cache, file, build, log = () => {}) {
  const target = path.join(cache, build.sha256);
  if (existsSync(target)) {
    const bytes = readFileSync(target);
    return { bytes, sha256: sha256(bytes), shared: sha256(bytes) !== build.sha256 };
  }
  const url = symbolServerUrl(file, build.timestamp, build.sizeOfImage);
  log(`download ${url} (${(build.size / 1048576).toFixed(1)} MB)`);
  const res = await fetch(url, { headers: AGENT });
  if (!res.ok) throw new Error(`the symbol server has no ${file} ${build.build} (HTTP ${res.status}, ${url})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const got = sha256(bytes);
  if (got !== build.sha256) {
    const h = peHeaders(bytes);
    if (h.timestamp !== build.timestamp || h.sizeOfImage !== build.sizeOfImage)
      throw new Error(
        `${file} ${build.build}: SHA-256 ${got}, the index says ${build.sha256}, and its timestamp and size are not the key's`,
      );
    log(`another build with the same key: SHA-256 ${got}`);
  }
  mkdirSync(cache, { recursive: true });
  writeFileSync(`${target}.part`, bytes);
  renameSync(`${target}.part`, target);
  return { bytes, sha256: got, shared: got !== build.sha256 };
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Names first, in code-unit order, then the ordinal-only exports ("#n") by number. */
function byExportKey(a, b) {
  const x = a.startsWith("#");
  const y = b.startsWith("#");
  if (x !== y) return x ? 1 : -1;
  if (x) return Number(a.slice(1)) - Number(b.slice(1));
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Builds the kernel database from a config (config/kernels.json): for each file, the build of each
 * Windows version and the export table of each, merged into one map from export to the builds that
 * have it. An export by ordinal only is recorded as "#<ordinal>". Deterministic: the same builds
 * give the same bytes.
 */
export async function buildKernelDatabase(config, { cache, log = () => {} }) {
  const files = {};
  for (const file of config.files) {
    log(`index ${file}`);
    const index = await winbindexIndex(file);
    const builds = [];
    const absent = [];
    const exports = new Map();
    for (const w of config.windows) {
      const labels = [w.winbindex].flat();
      const build = labels
        .map((l) => newestBuild(index, l))
        .filter(Boolean)
        .reduce((a, b) => (!a || compareBuilds(b.build, a.build) > 0 ? b : a), null);
      if (!build) {
        log(`  ${w.name}: no amd64 build of ${file} in Winbindex`);
        absent.push(w.name);
        continue;
      }
      const { bytes, sha256: got, shared } = await fetchFile(cache, file, build, (m) => log(`  ${m}`));
      const h = peHeaders(bytes);
      if (h.machine !== "x64") throw new Error(`${file} ${build.build} is ${h.machine}, not x64`);
      const id = builds.length;
      const record = { windows: w.name, build: build.build, update: build.update, sha256: got };
      if (shared) record.indexSha256 = build.sha256;
      builds.push(record);
      for (const e of exportsOf(bytes)) {
        const key = e.name ?? `#${e.ordinal}`;
        if (!exports.has(key)) exports.set(key, []);
        exports.get(key).push(id);
      }
      log(`  ${w.name}: ${build.build} (${build.update})`);
    }
    const sorted = {};
    for (const k of [...exports.keys()].sort(byExportKey)) sorted[k] = exports.get(k);
    files[file] = { arch: "x64", builds, absent, exports: sorted };
  }
  return {
    format: 1,
    comment:
      "The exports of Windows' kernel-mode files, from the Microsoft symbol server (keys from Winbindex). Each export lists the indexes of the builds that have it; '#n' is an export by ordinal n with no name. `absent` names the Windows versions for which Winbindex has no build of the file. `indexSha256` is the hash Winbindex gives a build whose key the symbol server answers with another build's file.",
    files,
  };
}
