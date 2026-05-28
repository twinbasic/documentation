// Phase 11 (B1) mermaid preprocessor: regenerates
// `<srcRoot>/assets/images/mmd/*.svg` from the matching `*.mmd` source
// when the SVG is missing or older than its source. Runs as the first
// orchestrator step so the freshly-emitted SVGs land in Phase 1's
// discover sweep naturally; the static-file pass downstream copies them
// to `<destRoot>/assets/images/mmd/` like any other tracked asset.
//
// Idempotent: a second build with no source changes is a no-op (mtime
// check). The `.mmd` is the canonical source; the SVG is a build
// artifact -- editing the .mmd by one character regenerates the SVG on
// the next build.
//
// Drives `puppeteer` + the in-tree `mermaid` package directly. Replaces
// the older `npx mmdc` shell-out that needed `@mermaid-js/mermaid-cli`
// installed in builder/ (along with its own puppeteer-core and a second
// Chrome download). One browser launch covers the whole batch; previously
// every diagram forked a fresh node+chrome via npx.
//
// Failure modes split into two:
//   - SETUP (puppeteer/mermaid not installed, Chrome missing): warn +
//     leave on-disk SVGs intact + return early. The build continues at
//     exit 0 against the previous SVGs -- this is the "dev hasn't run
//     `npm install` yet" path and must not break unrelated work.
//   - CONTENT (one .mmd has a syntax error, one render throws): warn +
//     keep that diagram's old SVG + continue the rest of the batch.
//     The orchestrator (tbdocs.mjs) sets process.exitCode = 1 on the
//     returned `failed` count so a broken diagram surfaces in CI.
//
// Setup recovery: `npm install` at the repo root pulls puppeteer + the
// pinned mermaid; on a fresh machine `npx puppeteer browsers install
// chrome --install-deps` (already in the deploy workflow) lands the
// Chrome binary.
//
// ESM-from-file note: Chromium blocks the `import()` chain that
// mermaid.esm.mjs needs when loaded via file:// (the patched dagre lives
// in a lazily-loaded chunk; the IIFE bundle inlines + minifies past the
// patch). The mermaid-cli authors shipped a request-intercept shim for
// the same reason; we reproduce a stripped-down version mapping ONE root
// (mermaid/dist/) + ONE MIME type (application/javascript) under
// `https://tbdocs-mermaid.invalid`. Without this, lazy chunk loads --
// including the patched dagre that scripts/patch-dagre.mjs edits -- all
// fail with file:// CORS errors.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const MMD_REL_DIR = path.join("assets", "images", "mmd");

// Dummy origin -- the request-intercept handler resolves these back to
// files under `mermaid/dist/`. Must be a non-resolving host so a real
// network fetch never sneaks past the interceptor.
const INTERCEPT_ORIGIN = "https://tbdocs-mermaid.invalid";

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

  // Lazy-load puppeteer + resolve the mermaid dist directory. Either
  // failure is a SETUP problem -- dev hasn't run `npm install`. Warn +
  // bail so unrelated build work still runs against the existing SVGs.
  let puppeteer;
  let mermaidDistDir;
  try {
    puppeteer = (await import("puppeteer")).default;
    mermaidDistDir = path.dirname(
      require_.resolve("mermaid/dist/mermaid.esm.mjs"),
    );
  } catch (err) {
    console.warn(
      `mermaid: skipped batch (${explainLoadFailure(err)}); existing SVGs retained`,
    );
    return { processed: sources.length, regenerated: 0, failed: 0, setupSkipped: true };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
      ],
    });
  } catch (err) {
    console.warn(
      `mermaid: skipped batch (${explainLaunchFailure(err)}); existing SVGs retained`,
    );
    return { processed: sources.length, regenerated: 0, failed: 0, setupSkipped: true };
  }

  // CONTENT failures (one diagram throws) don't abort the batch -- the
  // orchestrator surfaces the `failed` count so every broken diagram
  // produces a warning in one run, and the build's exit code reflects
  // the overall outcome.
  let regenerated = 0;
  let failed = 0;
  try {
    const distReal = await fs.realpath(mermaidDistDir);
    for (const { src, svg } of stale) {
      const ok = await renderOne(browser, src, svg, distReal);
      if (ok) regenerated++;
      else failed++;
    }
  } finally {
    await browser.close().catch(() => {});
  }
  return { processed: sources.length, regenerated, failed };
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
    // SVG missing (or unstattable source -- the renderer will surface it).
    return false;
  }
}

// Wires up the intercept, navigates to a bare data:HTML page, dynamic-
// imports mermaid.esm.mjs via the intercept origin, runs mermaid.render
// against the diagram source, and writes the serialised SVG out.
async function renderOne(browser, srcPath, svgPath, mermaidDistReal) {
  const definition = await fs.readFile(srcPath, "utf8");
  const page = await browser.newPage();
  let pageErr = null;
  try {
    await page.setRequestInterception(true);
    page.on("request", (req) => interceptRequest(req, mermaidDistReal));
    page.on("pageerror", (err) => { pageErr = err; });

    // data:HTML carries the container div mermaid.render writes into.
    // The page origin is "data:" -- cross-origin from the intercept
    // origin -- so the intercept serves CORS-permissive responses.
    await page.goto(
      "data:text/html;charset=utf-8," + encodeURIComponent(
        "<!doctype html><html><body><div id=\"container\"></div></body></html>",
      ),
    );

    const mermaidEsmUrl = `${INTERCEPT_ORIGIN}/mermaid.esm.mjs`;
    const svgXml = await page.evaluate(
      async ({ definition, mermaidEsmUrl }) => {
        const { default: mermaid } = await import(mermaidEsmUrl);
        mermaid.initialize({ startOnLoad: false });
        const container = document.getElementById("container");
        // svgId `my-svg` matches mermaid-cli's default so the diff
        // against pre-existing SVGs is just whatever the renderer
        // actually changed (id is referenced by every `#my-svg ...`
        // CSS rule mermaid scopes into the <style> element).
        const { svg: svgText } = await mermaid.render(
          "my-svg",
          definition,
          container,
        );
        // mermaid.render returns the SVG markup as a string; round-trip
        // through the DOM so XMLSerializer normalises HTML voids
        // (<br> → <br/>) the way the mmdc CLI does.
        container.innerHTML = svgText;
        const svgEl = container.querySelector("svg");
        // Explicit transparent background matches mermaid-cli's
        // `-b transparent` mode; SVG defaults to transparent so this
        // is cosmetic, but it keeps the inline style attribute byte-
        // compatible with the historical committed SVGs.
        svgEl.style.backgroundColor = "transparent";
        return new XMLSerializer().serializeToString(svgEl);
      },
      { definition, mermaidEsmUrl },
    );

    await fs.writeFile(svgPath, svgXml, "utf8");
    return true;
  } catch (err) {
    const why = pageErr ? pageErr.message : err.message;
    console.warn(
      `mermaid: skipped ${path.basename(srcPath)} (${why}); existing SVG retained`,
    );
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

// Map `https://tbdocs-mermaid.invalid/<rel>` to <mermaidDistReal>/<rel>.
// Confined to the mermaid dist directory to keep this from being a
// general file-read shim if a request URL is ever attacker-controlled
// (it isn't in this codebase, but the cost of pinning the root is
// zero). Everything else is let through unchanged -- mermaid does not
// fetch external resources for our flowchart-only diagrams, so this
// branch is exercised only by paranoid Chromium-internal requests.
async function interceptRequest(req, mermaidDistReal) {
  const url = req.url();
  if (!url.startsWith(INTERCEPT_ORIGIN + "/")) {
    return req.continue();
  }
  try {
    const rel = decodeURIComponent(
      url.slice(INTERCEPT_ORIGIN.length + 1).split("?")[0].split("#")[0],
    );
    const target = path.join(mermaidDistReal, rel);
    const real = await fs.realpath(target);
    if (real !== mermaidDistReal && !real.startsWith(mermaidDistReal + path.sep)) {
      return req.abort();
    }
    const body = await fs.readFile(real);
    return req.respond({
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      contentType: "application/javascript",
      body,
    });
  } catch {
    return req.abort();
  }
}

function explainLoadFailure(err) {
  const msg = err?.message ?? String(err);
  if (/cannot find module ['"]puppeteer['"]|cannot find package ['"]puppeteer['"]/i.test(msg)) {
    return "puppeteer not installed; run `cd builder && npm install`";
  }
  if (/cannot find module ['"]mermaid|cannot find package ['"]mermaid/i.test(msg)) {
    return "mermaid not installed; run `cd builder && npm install`";
  }
  return msg;
}

function explainLaunchFailure(err) {
  const msg = err?.message ?? String(err);
  if (/Could not find Chrome|browsers install chrome/i.test(msg)) {
    return "Chrome runtime missing; run `npx puppeteer browsers install chrome-headless-shell`";
  }
  return msg;
}
