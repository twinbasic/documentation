// The exports of Windows' kernel-mode files, the kernel database (db/kernels.json), from two kinds of
// source:
//
// - symbol: the x64 files themselves, by Windows version. Each is found in Winbindex's index
//   (winbindex.m417z.com, which records each file's hash, timestamp and image size by Windows
//   update), downloaded from the Microsoft symbol server by that timestamp and size, checked against
//   the hash, and reduced to its export table.
// - wdk: the import libraries of a WDK, which name what a driver built with that WDK imports from
//   each file. They are the only source for x86, whose kernels Winbindex does not index; the last
//   WDK with x86 kernel-mode libraries is 10.0.22621. On x86 they also give each routine's decorated
//   symbol, which says its calling convention and the bytes of its arguments.
//
// The database is updated, not rebuilt: what it holds is kept, and only what the config names and
// the database lacks is fetched. `refresh` moves each Windows version to its newest build; a WDK's
// libraries never change, so nothing refetches them but `rebuild`.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { fetchBundlePackage, filesUnder } from "./burn.mjs";
import { importLibrary } from "./importlib.mjs";
import { exportsOf, peHeaders } from "./pe.mjs";

const WINBINDEX = "https://winbindex.m417z.com/data/by_filename_compressed";
const SYMBOLS = "https://msdl.microsoft.com/download/symbols";
const AGENT = { "user-agent": "tbkmode-verifier" };
export const FORMAT = 2;

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
 * The newest amd64 build of a file under one or more Winbindex version names, or null.
 *
 * @returns {{sha256: string, build: string, update: string, timestamp: number, sizeOfImage: number, size: number} | null}
 */
export function newestBuild(index, versions) {
  let best = null;
  for (const [sha256, entry] of Object.entries(index)) {
    const info = entry.fileInfo;
    if (!info?.timestamp || !info.virtualSize || info.machineType !== 0x8664) continue;
    for (const version of [versions].flat()) {
      for (const [update, u] of Object.entries(entry.windowsVersions?.[version] ?? {})) {
        const build = u.updateInfo?.releaseVersion ?? u.windowsVersionInfo?.releaseVersion;
        if (!build) continue;
        if (!best || compareBuilds(build, best.build) > 0)
          best = { sha256, build, update, timestamp: info.timestamp, sizeOfImage: info.virtualSize, size: info.size };
      }
    }
  }
  return best;
}

/** The symbol server's URL of a file by its PE timestamp and image size. */
export function symbolServerUrl(file, timestamp, sizeOfImage) {
  const key = `${timestamp.toString(16).toUpperCase().padStart(8, "0")}${sizeOfImage.toString(16).toUpperCase()}`;
  return `${SYMBOLS}/${file}/${key}/${file}`;
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * A file from the cache, or else downloaded from the symbol server: `{bytes, sha256, shared}`. The
 * cache holds each file under the hash the index gives.
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

/** Names first, in code-unit order, then the ordinal-only exports ("#n") by number. */
function byExportKey(a, b) {
  const x = a.startsWith("#");
  const y = b.startsWith("#");
  if (x !== y) return x ? 1 : -1;
  if (x) return Number(a.slice(1)) - Number(b.slice(1));
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The database as a working model: per file, its builds, each with the Set of its export keys, the
 * versions found absent, and the x86 decorated symbols.
 */
function decode(db) {
  const model = new Map();
  for (const [file, f] of Object.entries(db?.files ?? {})) {
    const builds = f.builds.map((b) => ({ ...b, exports: new Set() }));
    for (const [key, ids] of Object.entries(f.exports)) for (const id of ids) builds[id].exports.add(key);
    model.set(file, { builds, absent: [...(f.absent ?? [])], symbols: { ...(f.symbols ?? {}) } });
  }
  return model;
}

/** Back from the working model to the database: builds in a stable order, exports sorted. */
function encode(model, files) {
  const order = (b) => (b.source === "symbol" ? `0 ${b.arch} ${b.order ?? 0}` : `1 ${b.arch} ${b.wdk}`);
  const out = {};
  for (const file of files) {
    const m = model.get(file);
    if (!m) continue;
    const builds = [...m.builds].sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
    const exports = new Map();
    builds.forEach((b, id) => {
      for (const key of b.exports) {
        if (!exports.has(key)) exports.set(key, []);
        exports.get(key).push(id);
      }
    });
    const sorted = {};
    for (const k of [...exports.keys()].sort(byExportKey)) sorted[k] = exports.get(k);
    const symbols = {};
    for (const k of Object.keys(m.symbols).sort(byExportKey)) symbols[k] = m.symbols[k];
    out[file] = {
      builds: builds.map(({ exports: _, order: __, ...rest }) => rest),
      absent: m.absent,
      exports: sorted,
      symbols,
    };
  }
  return {
    format: FORMAT,
    comment:
      "The exports of Windows' kernel-mode files. A build of source 'symbol' is an x64 file of one Windows version from the Microsoft symbol server (keys from Winbindex); one of source 'wdk' is what that WDK's import libraries say the file exports, for its arch (the only source for x86). Each export lists the indexes of the builds that have it; '#n' is an export by ordinal n with no name. `absent` names the x64 Windows versions with no build of the file in Winbindex. `indexSha256` is the hash Winbindex gives a build whose key the symbol server answers with another build's file. `symbols` holds the x86 decorated symbol of each export the WDK's libraries name: '@Name@n' is __fastcall, '_Name@n' __stdcall, n the bytes of the arguments.",
    files: out,
  };
}

/**
 * Updates the kernel database (`db`, or null for none) to what the config names, and returns it.
 *
 * @param {object} config  config/kernels.json
 * @param {object | null} db
 * @param {{cache: string, refresh?: boolean, log?: (m: string) => void}} o
 */
export async function updateKernelDatabase(config, db, { cache, refresh = false, log = () => {} }) {
  if (db && db.format !== FORMAT) {
    log(`the database is format ${db.format}, this tool writes ${FORMAT}: rebuilt`);
    db = null;
  }
  const model = decode(db);
  const names = new Set(config.windows.map((w) => w.name));
  for (const file of config.files) {
    if (!model.has(file)) model.set(file, { builds: [], absent: [], symbols: {} });
    const m = model.get(file);
    // Versions the config no longer names go.
    m.builds = m.builds.filter((b) => b.source !== "symbol" || names.has(b.windows));
    m.absent = m.absent.filter((n) => names.has(n));
    const todo = config.windows.filter(
      (w) =>
        refresh || (!m.absent.includes(w.name) && !m.builds.some((b) => b.source === "symbol" && b.windows === w.name)),
    );
    if (!todo.length) continue;
    log(`index ${file}`);
    const index = await winbindexIndex(file);
    for (const w of todo) {
      const order = config.windows.indexOf(w);
      const found = newestBuild(index, w.winbindex);
      const held = m.builds.findIndex((b) => b.source === "symbol" && b.windows === w.name);
      if (!found) {
        log(`  ${w.name}: no amd64 build of ${file} in Winbindex`);
        if (held >= 0) m.builds.splice(held, 1);
        if (!m.absent.includes(w.name)) m.absent.push(w.name);
        continue;
      }
      m.absent = m.absent.filter((n) => n !== w.name);
      if (held >= 0 && m.builds[held].build === found.build && m.builds[held].update === found.update) {
        log(`  ${w.name}: ${found.build} (${found.update}), held`);
        continue;
      }
      const {
        bytes,
        sha256: got,
        shared,
      } = await fetchFile(path.join(cache, "symbols"), file, found, (x) => log(`  ${x}`));
      const h = peHeaders(bytes);
      if (h.machine !== "x64") throw new Error(`${file} ${found.build} is ${h.machine}, not x64`);
      const record = {
        source: "symbol",
        arch: "x64",
        windows: w.name,
        build: found.build,
        update: found.update,
        sha256: got,
      };
      if (shared) record.indexSha256 = found.sha256;
      record.exports = new Set(exportsOf(bytes).map((e) => e.name ?? `#${e.ordinal}`));
      record.order = order;
      if (held >= 0) m.builds.splice(held, 1, record);
      else m.builds.push(record);
      log(`  ${w.name}: ${found.build} (${found.update})`);
    }
    m.absent.sort(
      (a, b) => config.windows.findIndex((w) => w.name === a) - config.windows.findIndex((w) => w.name === b),
    );
  }
  for (const m of model.values())
    for (const b of m.builds)
      if (b.source === "symbol") b.order = config.windows.findIndex((w) => w.name === b.windows);

  for (const lib of config.wdkLibraries ?? []) {
    const have = config.files.every((file) =>
      model.get(file).builds.some((b) => b.source === "wdk" && b.wdk === lib.wdk && b.arch === lib.arch),
    );
    if (have) continue;
    log(`WDK ${lib.wdk} ${lib.arch} import libraries`);
    const { version, dirs } = await fetchBundlePackage(
      lib.bundle,
      lib.package,
      path.join(cache, `wdk-${lib.wdk}-${lib.arch}`),
      (x) => log(`  ${x}`),
    );
    if (version && !version.endsWith(lib.wdk.split(".").slice(2).join(".")))
      log(`  the package's version is ${version}`);
    const byFile = new Map(config.files.map((f) => [f, { exports: new Set(), symbols: {} }]));
    for (const f of filesUnder(dirs)) {
      const objects = importLibrary(readFileSync(f));
      if (!objects) continue;
      for (const o of objects) {
        if (o.machine !== lib.arch) continue;
        const entry = byFile.get(o.dll.toLowerCase());
        if (!entry) continue;
        const key = o.name ?? `#${o.ordinal}`;
        entry.exports.add(key);
        if (lib.arch === "x86" && o.type === "code") entry.symbols[key] = o.symbol;
      }
    }
    for (const [file, entry] of byFile) {
      const m = model.get(file);
      m.builds = m.builds.filter((b) => !(b.source === "wdk" && b.wdk === lib.wdk && b.arch === lib.arch));
      if (!entry.exports.size) {
        log(`  ${file}: no ${lib.arch} import library`);
        continue;
      }
      m.builds.push({ source: "wdk", arch: lib.arch, wdk: lib.wdk, exports: entry.exports });
      if (lib.arch === "x86") Object.assign(m.symbols, entry.symbols);
      log(`  ${file}: ${entry.exports.size} exports`);
    }
  }
  return encode(model, config.files);
}

/** The database as JSON with one export to a line, so that a new build reads as a short diff. */
export function kernelDatabaseText(db) {
  const lines = ["{", `"format": ${db.format},`, `"comment": ${JSON.stringify(db.comment)},`, '"files": {'];
  const files = Object.entries(db.files);
  files.forEach(([file, f], i) => {
    lines.push(`${JSON.stringify(file)}: {`, '"builds": [');
    lines.push(f.builds.map((b) => JSON.stringify(b)).join(",\n"));
    lines.push("],", `"absent": ${JSON.stringify(f.absent)},`, '"exports": {');
    lines.push(
      Object.entries(f.exports)
        .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(",\n"),
    );
    lines.push("},", '"symbols": {');
    lines.push(
      Object.entries(f.symbols)
        .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(",\n"),
    );
    lines.push("}", i < files.length - 1 ? "}," : "}");
  });
  lines.push("}", "}", "");
  return lines.join("\n");
}

/** A build's name in a message: its Windows version, or its WDK's libraries. */
export function buildLabel(b) {
  return b.source === "symbol" ? b.windows : `the ${b.arch} libraries of WDK ${b.wdk}`;
}
