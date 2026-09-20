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
// Image validation
// ---------------------------------------------------------------------------
//
// An HTTP 200 is not proof the body is the image it claims to be: a
// captive portal answers every request with its own HTML login page, and
// YouTube answers a poster-size request it has no art for with a 120x90
// grey placeholder instead of a 404. Both look like a successful fetch to
// `res.ok`, so the body itself has to be checked before it is trusted
// enough to write to disk.

// Deliberately low: this floor only needs to catch a near-empty or
// truncated body before it reaches the magic-byte check below. Even a
// tiny real JPEG (the 120x90 YouTube placeholder included) has to clear
// it and be rejected by the dimension check instead, on its own terms.
const MIN_IMAGE_BYTES = 100;

// JPEG opens with the SOI marker FF D8 FF (the third byte begins the next
// marker, so it doubles as part of the signature here). PNG opens with a
// fixed 8-byte signature.
function detectImageFormat(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "png";
  }
  return null;
}

// A JPEG file is a sequence of FF <marker> <len hi> <len lo> <payload>
// segments (a few markers carry no length at all). Pixel dimensions live
// nowhere but the Start-Of-Frame segment's payload, so this steps through
// segments until it finds one and reads straight out of it. Returns null
// for anything it cannot make sense of rather than guessing.
function jpegDimensions(buf) {
  let offset = 2; // buf[0..2] is the FFD8FF signature already checked by detectImageFormat
  while (offset + 1 < buf.length) {
    if (buf[offset] !== 0xff) return null; // not aligned on a marker

    // Any number of extra 0xFF fill bytes can precede the real marker byte.
    let markerOffset = offset + 1;
    while (buf[markerOffset] === 0xff) markerOffset++;
    const marker = buf[markerOffset];
    offset = markerOffset + 1;

    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue; // SOI / TEM / RSTn -- none of these carry a length field
    }
    if (marker === 0xd9 || marker === 0xda) {
      return null; // EOI or scan data reached with no SOF seen first
    }
    if (offset + 2 > buf.length) return null;
    const len = buf.readUInt16BE(offset);
    if (len < 2) return null; // malformed segment length; stop rather than loop forever

    // SOF0-SOF15 carry the dimensions, except three codes in that range
    // that are reserved for other markers (DHT, JPG, DAC).
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      // Payload is 1 byte precision, then height, then width, both
      // big-endian, starting right after the 2-byte length field.
      if (offset + 7 > buf.length) return null;
      return { height: buf.readUInt16BE(offset + 3), width: buf.readUInt16BE(offset + 5) };
    }
    offset += len; // skip to the next segment; len includes the length field itself
  }
  return null;
}

// IHDR is required to be the first chunk, right after the 8-byte PNG
// signature, so its fields can be read directly with no need to step
// through a chunk list the way the JPEG segments above do: 4 bytes
// length, 4 bytes type, then width and height, both big-endian 4-byte
// fields.
function pngDimensions(buf) {
  if (buf.length < 24 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function imageDimensions(buf, format) {
  if (format === "jpeg") return jpegDimensions(buf);
  if (format === "png") return pngDimensions(buf);
  return null;
}

// The one check every accepted image body has to pass, regardless of
// which caller below is fetching it: a real image content type, a body
// past a plausible size floor, and bytes that actually start with a
// JPEG or PNG signature.
function validateImageBody(buf, contentType) {
  const ct = (contentType || "").split(";")[0].trim().toLowerCase();
  if (!ct.startsWith("image/")) {
    return { ok: false, reason: `unexpected content-type ${ct || "(none)"}` };
  }
  if (buf.length < MIN_IMAGE_BYTES) {
    return { ok: false, reason: `body too small to be a real image (${buf.length} bytes)` };
  }
  const format = detectImageFormat(buf);
  if (!format) {
    return { ok: false, reason: "body is not a JPEG or PNG (magic bytes did not match)" };
  }
  return { ok: true, format };
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

// Downloads `url`, validates the body as a real image, and only then
// writes it to `destPath` -- via a temp file renamed into place, so a
// body that fails validation, or a process that dies mid-write, never
// leaves anything sitting at the final name. That matters because
// `present.has(name)` below treats any file already at destPath as
// fetched and done, and will not try again.
//
// `rejectBody`, when given, runs after the generic image checks pass and
// can still reject on other grounds (see the YouTube placeholder check
// below); it returns a reason string to reject, or null to accept.
async function fetchToFile(url, destPath, { rejectBody } = {}) {
  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (err) {
    // DNS failure, TLS error, connection reset, proxy refusal, ... -- the
    // network can fail before there is even a status code to look at.
    return { ok: false, status: `network error (${err.message})` };
  }
  if (!res.ok) return { ok: false, status: res.status };

  let buf;
  try {
    buf = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    return { ok: false, status: `network error (${err.message})` };
  }

  const check = validateImageBody(buf, res.headers.get("content-type"));
  if (!check.ok) return { ok: false, status: check.reason };
  if (rejectBody) {
    const reason = rejectBody(buf, check.format);
    if (reason) return { ok: false, status: reason };
  }

  const tmpPath = `${destPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(tmpPath, buf);
  await fs.rename(tmpPath, destPath);
  return { ok: true, size: buf.length, contentType: res.headers.get("content-type") };
}

// YouTube answers a poster-size request it has no real art for with a
// 120x90 grey "no thumbnail" image and a normal HTTP 200, rather than a
// 404 the way a missing file normally would. That exact geometry is the
// tell, so reject it here and let the variant loop below fall through to
// the next size instead of writing the placeholder and treating the
// video as done forever.
function rejectPlaceholder(buf, format) {
  const dims = imageDimensions(buf, format);
  if (dims && dims.width === 120 && dims.height === 90) {
    return "120x90 placeholder (no thumbnail at this size)";
  }
  return null;
}

async function fetchYouTubeThumb(videoId, destPath) {
  let lastStatus = null;
  for (const variant of YT_VARIANTS) {
    const url = `https://img.youtube.com/vi/${videoId}/${variant}.jpg`;
    const r = await fetchToFile(url, destPath, { rejectBody: rejectPlaceholder });
    if (r.ok) return { ok: true, variant, size: r.size };
    lastStatus = r.status;
  }
  return { ok: false, status: lastStatus };
}

async function fetchAttachment(uuid, dirAbs) {
  const url = `https://github.com/user-attachments/assets/${uuid}`;
  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (err) {
    return { ok: false, status: `network error (${err.message})` };
  }
  if (!res.ok) return { ok: false, status: res.status };

  let buf;
  try {
    buf = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    return { ok: false, status: `network error (${err.message})` };
  }
  if (buf.length < MIN_IMAGE_BYTES) {
    return { ok: false, status: `body too small to be a real image (${buf.length} bytes)` };
  }
  // The URL carries no extension; the served content-type decides it.
  const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = CONTENT_TYPE_EXT.get(ct);
  if (!ext) return { ok: false, status: `unsupported content-type ${ct || "(none)"}` };

  // Cross-check the two formats this module can read a signature for --
  // a captive portal or an error page served under a spoofed image
  // content-type still will not start with real JPEG or PNG bytes.
  if (ext === "jpg" || ext === "png") {
    const expected = ext === "jpg" ? "jpeg" : "png";
    if (detectImageFormat(buf) !== expected) {
      return { ok: false, status: `content-type said ${ct} but the body is not a ${expected} (bad magic bytes)` };
    }
  }

  const destPath = path.join(dirAbs, `gh-${uuid}.${ext}`);
  const tmpPath = `${destPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.mkdir(dirAbs, { recursive: true });
  await fs.writeFile(tmpPath, buf);
  await fs.rename(tmpPath, destPath);
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
