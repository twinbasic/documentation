// Remote-asset vendoring: downloads third-party images referenced from
// markdown into a committed location under `<srcRoot>/assets/`, so the
// rendered site never asks a reader's browser to contact a third party.
//
// Two kinds of reference are handled:
//
//   1. YouTube videos, written as a link carrying the `.video` marker:
//
//        [Some title](https://www.youtube.com/watch?v=<id>){: .video }
//
//      The poster frame is fetched to `assets/thumbnails/yt-<id>.jpg`
//      and videoLinkPlugin (render.mjs) turns the link into a thumbnail
//      that links out to the video page. Nothing contacts Google until
//      the reader clicks.
//
//   2. GitHub user-attachment images -- the URL you get from pasting a
//      screenshot into an issue or pull request:
//
//        ![alt](https://github.com/user-attachments/assets/<uuid>)
//
//      Fetched to `assets/attachments/gh-<uuid>.<ext>` and rewritten to
//      that path at render time. No marker needed: an <img> pointing at
//      a user-attachment URL should always be vendored.
//
// Modelled on dot.mjs: a seed task that writes build artifacts INTO the
// source tree, is idempotent (a present file is never re-fetched), and
// hands newly created files to the static-file copy pass via submit().
// The artifacts are committed to git exactly like the generated DOT
// SVGs, which is what makes the CI contract below work.
//
// The CI contract
// ---------------
// A dev build downloads what is missing; CI downloads NOTHING. If CI
// had permission to fetch, an author who wrote the markdown but forgot
// to commit the image would get a green build, and the site would go on
// hotlinking a third party -- the exact failure this module exists to
// prevent. So a missing asset is a hard build error in CI, naming the
// asset and the fix.
//
// `process.env.CI` selects the mode; --fetch-assets / --no-fetch-assets
// override it either way.
//
// Failure modes mirror dot.mjs's split:
//   - OFFLINE (fetching disabled, asset missing): throw. The build
//     cannot produce a correct page and must not paper over it.
//   - FETCH (network refused the asset): warn, record it, and let the
//     orchestrator flip the exit code -- one dead video should not stop
//     a local preview of the other 800 pages.

import { promises as fs } from "node:fs";
import path from "node:path";

export const THUMB_DIR_REL  = "assets/thumbnails";
export const ATTACH_DIR_REL = "assets/attachments";

// `](<url>)` immediately followed by an IAL carrying `.video`. Matching
// the closing paren of a markdown link (rather than the URL alone) keeps
// a bare YouTube URL in prose from being treated as a video card.
const YT_MARKED_RE =
  /\]\(\s*https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})[^)\s]*\s*\)\s*\{:[^}]*\.video\b[^}]*\}/g;

// Any user-attachment URL, in markdown image syntax or a raw <img src>.
const GH_ATTACH_RE =
  /https:\/\/github\.com\/user-attachments\/assets\/([0-9a-fA-F-]{36})/g;

// YouTube publishes several poster sizes and not every video has the
// largest, so fall back in order. 404 on maxresdefault is normal for
// older or low-resolution uploads.
const YT_VARIANTS = ["maxresdefault", "hqdefault", "mqdefault"];

const CONTENT_TYPE_EXT = new Map([
  ["image/png",  "png"],
  ["image/jpeg", "jpg"],
  ["image/gif",  "gif"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

// Collect every referenced video id and attachment uuid from the raw
// markdown discover already read, so this costs no extra file I/O.
export function scanSources(pages) {
  const videoIds = new Set();
  const attachmentIds = new Set();
  for (const page of pages) {
    const raw = page?.rawContent;
    if (!raw) continue;
    if (raw.includes("youtu")) {
      for (const m of raw.matchAll(YT_MARKED_RE)) videoIds.add(m[1]);
    }
    if (raw.includes("user-attachments")) {
      for (const m of raw.matchAll(GH_ATTACH_RE)) attachmentIds.add(m[1].toLowerCase());
    }
  }
  return { videoIds, attachmentIds };
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function fetchToFile(url, destPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return { ok: false, status: res.status };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) return { ok: false, status: "empty body" };
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buf);
  return { ok: true, size: buf.length, contentType: res.headers.get("content-type") };
}

async function fetchYouTubeThumb(videoId, destPath) {
  let lastStatus = null;
  for (const variant of YT_VARIANTS) {
    const url = `https://img.youtube.com/vi/${videoId}/${variant}.jpg`;
    const r = await fetchToFile(url, destPath);
    if (r.ok) return { ok: true, variant, size: r.size };
    lastStatus = r.status;
  }
  return { ok: false, status: lastStatus };
}

async function fetchAttachment(uuid, dirAbs) {
  const url = `https://github.com/user-attachments/assets/${uuid}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return { ok: false, status: res.status };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) return { ok: false, status: "empty body" };
  // The URL carries no extension; the served content-type decides it.
  const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = CONTENT_TYPE_EXT.get(ct);
  if (!ext) return { ok: false, status: `unsupported content-type ${ct || "(none)"}` };
  const destPath = path.join(dirAbs, `gh-${uuid}.${ext}`);
  await fs.mkdir(dirAbs, { recursive: true });
  await fs.writeFile(destPath, buf);
  return { ok: true, ext, destPath, size: buf.length };
}

// ---------------------------------------------------------------------------
// Existing-file lookup
// ---------------------------------------------------------------------------

async function listDir(dirAbs) {
  try {
    return await fs.readdir(dirAbs);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

// Returns:
//   videos      Map<videoId, urlPath>       -- for videoLinkPlugin
//   images      Map<uuid,    urlPath>       -- for remoteImagePlugin
//   files       staticFile[]                -- newly created, for submit()
//   fetched     number                      -- how many downloads happened
//   failed      number                      -- fetch failures (exit code)
export async function vendorAssets(srcRoot, pages, opts = {}) {
  const { baseurl = "", allowFetch = true } = opts;
  const { videoIds, attachmentIds } = scanSources(pages);

  const videos = new Map();
  const images = new Map();
  const files  = [];
  let fetched = 0;
  let failed  = 0;
  const missing = [];

  const urlPath = (rel) => `${baseurl}/${rel}`;

  const thumbDirAbs  = path.join(srcRoot, THUMB_DIR_REL);
  const attachDirAbs = path.join(srcRoot, ATTACH_DIR_REL);

  const record = async (destPath, rel) => {
    const stat = await fs.stat(destPath);
    files.push({ srcPath: destPath, srcRel: rel, destRel: rel, size: stat.size });
  };

  // ── YouTube poster frames ────────────────────────────────────────────
  if (videoIds.size > 0) {
    const present = new Set(await listDir(thumbDirAbs));
    for (const id of videoIds) {
      const name = `yt-${id}.jpg`;
      const rel  = `${THUMB_DIR_REL}/${name}`;
      if (present.has(name)) {
        videos.set(id, urlPath(rel));
        continue;
      }
      if (!allowFetch) {
        missing.push({ kind: "video", id, rel });
        continue;
      }
      const destPath = path.join(thumbDirAbs, name);
      const r = await fetchYouTubeThumb(id, destPath);
      if (!r.ok) {
        console.warn(`vendor-assets: could not fetch a thumbnail for video ${id} (${r.status})`);
        failed++;
        continue;
      }
      videos.set(id, urlPath(rel));
      await record(destPath, rel);
      fetched++;
      console.log(`vendor-assets: fetched ${rel} (${r.variant}, ${(r.size / 1024).toFixed(0)} KB)`);
    }
  }

  // ── GitHub user-attachment images ────────────────────────────────────
  if (attachmentIds.size > 0) {
    // Extension is decided by the served content-type, so match on stem.
    const present = new Map();
    for (const name of await listDir(attachDirAbs)) {
      const m = /^gh-([0-9a-f-]{36})\.[a-z0-9]+$/i.exec(name);
      if (m) present.set(m[1].toLowerCase(), name);
    }
    for (const uuid of attachmentIds) {
      const existing = present.get(uuid);
      if (existing) {
        images.set(uuid, urlPath(`${ATTACH_DIR_REL}/${existing}`));
        continue;
      }
      if (!allowFetch) {
        missing.push({ kind: "attachment", id: uuid, rel: `${ATTACH_DIR_REL}/gh-${uuid}.<ext>` });
        continue;
      }
      const r = await fetchAttachment(uuid, attachDirAbs);
      if (!r.ok) {
        console.warn(`vendor-assets: could not fetch attachment ${uuid} (${r.status})`);
        failed++;
        continue;
      }
      const rel = `${ATTACH_DIR_REL}/gh-${uuid}.${r.ext}`;
      images.set(uuid, urlPath(rel));
      await record(r.destPath, rel);
      fetched++;
      console.log(`vendor-assets: fetched ${rel} (${(r.size / 1024).toFixed(0)} KB)`);
    }
  }

  // Offline mode with something missing is fatal -- see the CI contract
  // in the header. The message has to be actionable: the whole point is
  // that a human runs a local build and commits the result.
  if (missing.length > 0) {
    const lines = missing.map((m) => `  ${m.rel}  (${m.kind} ${m.id})`).join("\n");
    throw new Error(
      `vendor-assets: ${missing.length} remote asset(s) are referenced but not committed, ` +
      `and fetching is disabled (CI mode):\n${lines}\n` +
      `Run a local build to download them, then commit the files under ` +
      `docs/${THUMB_DIR_REL}/ and docs/${ATTACH_DIR_REL}/.`,
    );
  }

  return { videos, images, files, fetched, failed };
}
