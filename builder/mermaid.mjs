// Phase 11 (B1) mermaid preprocessor: regenerates
// `<srcRoot>/assets/images/mmd/*.svg` from the matching `*.mmd` source
// when the SVG is missing or older than its source. Runs as the first
// orchestrator step so the freshly-emitted SVGs land in Phase 1's
// discover sweep naturally; the static-file pass downstream copies them
// to `<destRoot>/assets/images/mmd/` like any other tracked asset.
//
// Idempotent: a second build with no source changes is a no-op (mtime
// check). The `.mmd` is the canonical source; the SVG is a build
// artifact -- the hand-export workflow (Typora / mermaid live editor)
// the project used pre-B1 is no longer needed. Editing the .mmd by one
// character regenerates the SVG on the next build.
//
// Requires `@mermaid-js/mermaid-cli` at devDependency scope. The
// binary is invoked via `npx --no-install mmdc` with cwd rooted at
// `builder/` so npx searches `builder/node_modules/` for the local
// install. A missing mmdc (e.g. `npm install` not yet run in builder/)
// logs a warning and leaves the existing on-disk SVG untouched -- the
// build continues. Callers that need full B1 behaviour run
// `cd builder && npm install` once.

import { promises as fs, readdirSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILDER_ROOT = path.resolve(__dirname);
const MMD_REL_DIR = path.join("assets", "images", "mmd");

// Windows requires the `.cmd` extension AND `shell: true` when spawning
// the npx shim (otherwise spawn throws EINVAL); POSIX has the bare
// `npx` on PATH and runs without a shell.
const IS_WIN = process.platform === "win32";
const NPX_CMD = IS_WIN ? "npx.cmd" : "npx";

export async function regenerateMermaid(srcRoot) {
  const mmdRoot = path.join(srcRoot, MMD_REL_DIR);
  const sources = await listMermaidSources(mmdRoot);
  if (sources.length === 0) {
    return { processed: 0, regenerated: 0 };
  }

  const stale = [];
  for (const src of sources) {
    const svg = svgFor(src);
    if (!(await isUpToDate(svg, src))) stale.push({ src, svg });
  }
  if (stale.length === 0) {
    return { processed: sources.length, regenerated: 0 };
  }

  let regenerated = 0;
  for (const { src, svg } of stale) {
    const ok = await invokeMmdc(src, svg);
    if (!ok) {
      return { processed: sources.length, regenerated, skipped: true };
    }
    regenerated++;
  }
  return { processed: sources.length, regenerated };
}

async function listMermaidSources(mmdRoot) {
  try {
    const entries = await fs.readdir(mmdRoot);
    return entries
      .filter((n) => n.endsWith(".mmd"))
      .map((n) => path.join(mmdRoot, n));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function svgFor(src) {
  return src.replace(/\.mmd$/, ".svg");
}

async function isUpToDate(svg, src) {
  try {
    const [srcStat, svgStat] = await Promise.all([
      fs.stat(src),
      fs.stat(svg),
    ]);
    return svgStat.mtimeMs >= srcStat.mtimeMs;
  } catch {
    // SVG missing (or unstattable source -- the spawn will surface it).
    return false;
  }
}

// Locate a Chrome binary the top-level puppeteer install already
// landed under `~/.cache/puppeteer/`. The site's PDF render step uses
// `puppeteer` at the repo root (and CI calls `npx puppeteer browsers
// install chrome --install-deps`); mermaid-cli's bundled puppeteer-core
// looks at the same cache. If a binary is present, mmdc reuses it via
// `PUPPETEER_EXECUTABLE_PATH` even when the cached Chrome version
// doesn't exactly match mermaid-cli's preferred version -- saves
// installing a second Chrome.
//
// Layout under <cache>/:
//   chrome/<platform>-<v>/chrome-<platform>/chrome[.exe]
//   chrome-headless-shell/<platform>-<v>/chrome-headless-shell-<platform>/chrome-headless-shell[.exe]
function findCachedChrome() {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR
    || path.join(os.homedir(), ".cache", "puppeteer");
  // chrome-headless-shell is smaller and matches the CI-installed
  // artifact when `chrome-headless-shell` is passed to the installer;
  // chrome is the fuller binary. Try the smaller one first.
  for (const variant of ["chrome-headless-shell", "chrome"]) {
    const variantRoot = path.join(cacheDir, variant);
    let versions = [];
    try {
      versions = readdirSync(variantRoot)
        .filter((v) => /^[a-z0-9_]+-\d/.test(v))
        .sort()
        .reverse();
    } catch { continue; }
    for (const v of versions) {
      const platformDirs = (() => {
        try {
          return readdirSync(path.join(variantRoot, v))
            .filter((n) => n.startsWith(`${variant}-`));
        } catch { return []; }
      })();
      for (const platformDir of platformDirs) {
        const exe = IS_WIN ? `${variant}.exe` : variant;
        const candidate = path.join(variantRoot, v, platformDir, exe);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return null;
}

// Pull the most informative line out of mmdc's stderr -- prefer an
// explicit `Error: ...` line over the trailing stack frame. Covers the
// two failure modes the build is likely to hit: mmdc not installed,
// or Chrome (puppeteer's runtime) not installed.
function explainMmdcFailure(stderr, code) {
  if (/\bcould not (find|determine).*\bmmdc\b|cannot find module.*\bmermaid\b|\bnot installed\b(?!.*Chrome)|\b404\b/i.test(stderr)) {
    return "mmdc not installed; run `cd builder && npm install`";
  }
  if (/Could not find Chrome|puppeteer browsers install/i.test(stderr)) {
    return "Chrome runtime missing; run `npx puppeteer browsers install chrome-headless-shell`";
  }
  const errLine = stderr
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.startsWith("Error:") || /^[A-Z][a-zA-Z]+Error:/.test(s));
  if (errLine) return errLine;
  return `mmdc exited ${code}`;
}

function invokeMmdc(src, svg) {
  return new Promise((resolve) => {
    const args = [
      "--no-install",
      "mmdc",
      "-i", src,
      "-o", svg,
      "-b", "transparent",
    ];
    // On Windows we shell out to cmd.exe so the `.cmd` shim resolves.
    // Wrap any whitespace-bearing path argument in double quotes so
    // cmd.exe parses it as a single token.
    const finalArgs = IS_WIN
      ? args.map((a) => /\s/.test(a) ? `"${a.replace(/"/g, '""')}"` : a)
      : args;
    // Reuse any Chrome the top-level `puppeteer` (used by the PDF
    // render step) already installed -- avoids needing a second Chrome
    // download just for mermaid. mmdc's puppeteer-core may complain
    // about the version, but the API is generally backwards-compatible
    // across a few major Chrome releases.
    const env = { ...process.env };
    if (!env.PUPPETEER_EXECUTABLE_PATH) {
      const chrome = findCachedChrome();
      if (chrome) env.PUPPETEER_EXECUTABLE_PATH = chrome;
    }
    const child = spawn(NPX_CMD, finalArgs, {
      cwd: BUILDER_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      shell: IS_WIN,
      env,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      const why = err.code === "ENOENT"
        ? "npx not found on PATH (install Node.js + npm)"
        : err.message;
      console.warn(
        `mermaid: skipped ${path.basename(src)} (${why}); existing SVG retained`,
      );
      resolve(false);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(true);
        return;
      }
      const detail = explainMmdcFailure(stderr, code);
      console.warn(
        `mermaid: skipped ${path.basename(src)} (${detail}); existing SVG retained`,
      );
      resolve(false);
    });
  });
}
