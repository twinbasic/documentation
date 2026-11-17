// Reading a WiX Burn bundle, the kind of installer the WDK's wdksetup.exe is, as data: its manifest
// names every package and the files each consists of, and those files are served beside the
// bundle. One package is fetched, its files checked against the manifest's SHA-1, and its CABs
// expanded with Windows' expand.exe. The bundle itself is never run.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const AGENT = { "user-agent": "tbkmode-verifier" };

/** The containers of a Burn bundle, from its .wixburn section: the first is the UX container. */
function containers(b) {
  const nt = b.readUInt32LE(0x3c);
  const optSize = b.readUInt16LE(nt + 20);
  for (let i = 0; i < b.readUInt16LE(nt + 6); i++) {
    const s = nt + 24 + optSize + 40 * i;
    if (b.toString("latin1", s, s + 8).replace(/\0+$/, "") !== ".wixburn") continue;
    const sec = b.readUInt32LE(s + 20);
    if (b.readUInt32LE(sec) !== 0x00f14300) throw new Error("the .wixburn section has another magic number");
    let off = b.readUInt32LE(sec + 24);
    const out = [];
    for (let c = 0; c < b.readUInt32LE(sec + 44); c++) {
      const size = b.readUInt32LE(sec + 48 + 4 * c);
      out.push(b.subarray(off, off + size));
      off += size;
    }
    return out;
  }
  throw new Error("not a Burn bundle: no .wixburn section");
}

/** Expands a CAB into a folder with Windows' expand.exe (tar.exe refuses some of the WDK's). */
function expandCab(cab, dir) {
  mkdirSync(dir, { recursive: true });
  const exe = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "expand.exe");
  execFileSync(exe, ["-F:*", cab, dir], { stdio: "ignore" });
}

async function download(url) {
  const res = await fetch(url, { headers: AGENT });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return { bytes: Buffer.from(await res.arrayBuffer()), url: res.url };
}

/**
 * Fetches one package of a Burn bundle into `work`, and returns `{version, dirs, msi}`: the folders
 * its CABs were expanded into, and with `withMsi` the package's own database (`package.msi`), which
 * says what each file in them is. What is already in `work` with the right hash is not fetched
 * again.
 *
 * @param {string} bundleUrl  the bundle's URL (a go.microsoft.com link is followed)
 * @param {string} packageId  the MsiPackage Id in the bundle's manifest
 * @param {string} work       a folder of the cache
 */
export async function fetchBundlePackage(bundleUrl, packageId, work, log = () => {}, { withMsi = false } = {}) {
  mkdirSync(work, { recursive: true });
  const bundleFile = path.join(work, "bundle.exe");
  const urlFile = path.join(work, "bundle.url");
  let base;
  if (existsSync(bundleFile) && existsSync(urlFile)) base = readFileSync(urlFile, "utf8");
  else {
    log(`download ${bundleUrl}`);
    const { bytes, url } = await download(bundleUrl);
    writeFileSync(bundleFile, bytes);
    base = url.slice(0, url.lastIndexOf("/"));
    writeFileSync(urlFile, base);
  }
  const ux = path.join(work, "ux");
  if (!existsSync(path.join(ux, "0"))) {
    writeFileSync(path.join(work, "ux.cab"), containers(readFileSync(bundleFile))[0]);
    expandCab(path.join(work, "ux.cab"), ux);
  }
  const manifest = readFileSync(path.join(ux, "0"), "utf8");
  const start = manifest.indexOf(`<MsiPackage Id="${packageId}"`);
  if (start < 0) throw new Error(`the bundle has no package ${packageId}`);
  const pkg = manifest.slice(start, manifest.indexOf("</MsiPackage>", start));
  const version = /\sVersion="([^"]*)"/.exec(pkg)?.[1];
  const payloads = new Map();
  for (const m of manifest.matchAll(/<Payload\s[^>]*>/g)) payloads.set(/\sId="([^"]*)"/.exec(m[0])?.[1], m[0]);
  const dirs = [];
  let msi = null;
  for (const [, ref] of pkg.matchAll(/PayloadRef Id="([^"]*)"/g)) {
    const p = payloads.get(ref);
    const attr = (n) => new RegExp(`\\s${n}="([^"]*)"`).exec(p)?.[1];
    const rel = attr("FilePath").replaceAll("\\", "/");
    const isMsi = rel.endsWith(".msi");
    if (!rel.endsWith(".cab") && !(isMsi && withMsi)) continue;
    // The package's own database, which names the files its CABs hold by key.
    const target = path.join(work, isMsi ? "package.msi" : path.basename(rel));
    const sha1 = (b) => createHash("sha1").update(b).digest("hex").toUpperCase();
    if (!existsSync(target) || sha1(readFileSync(target)) !== attr("Hash")) {
      const url = `${base}/${rel.split("/").map(encodeURIComponent).join("/")}`;
      log(`download ${url} (${(Number(attr("FileSize")) / 1048576).toFixed(1)} MB)`);
      const { bytes } = await download(url);
      if (sha1(bytes) !== attr("Hash"))
        throw new Error(`${rel}: SHA-1 ${sha1(bytes)}, the manifest says ${attr("Hash")}`);
      writeFileSync(`${target}.part`, bytes);
      renameSync(`${target}.part`, target);
    }
    if (isMsi) {
      msi = target;
      continue;
    }
    const dir = target.replace(/\.cab$/, "");
    if (!existsSync(dir) || !readdirSync(dir).length) expandCab(target, dir);
    dirs.push(dir);
  }
  return { version, dirs, msi };
}

/** Every file under the folders, recursively. */
export function filesUnder(dirs) {
  const walk = (d) =>
    readdirSync(d).flatMap((f) =>
      statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)],
    );
  return dirs.flatMap(walk);
}
