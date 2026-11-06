// Takes a picture of a tab: what scripts/shoot_docs.mjs --svg does in the IDE's page, in the
// browser the person is signed in to. The capture code is capture.mjs's and the annotation
// layer annotate.mjs's; the connection is conn.mjs's. The page is made ready first (laid out
// at 1x, drawn at 2x, its animations off, its private words masked), and is put back afterwards.

import { annotate, resolveAnchors, unannotate } from "../annotate.mjs";
import { collectBundle, QUIET_CSS } from "../capture.mjs";
import { drawnWords, heldWords, scrubBundle } from "../private-words.mjs";
import { attachDebugger } from "./conn.mjs";
import {
  imagesIn,
  maskPage,
  pageTheme,
  pickArea,
  quietPage,
  scrolled,
  settled,
  showImages,
  shownArea,
  undoPage,
  windowSize,
} from "./page.mjs";

/** Device pixels to the CSS pixel in every picture, as shoot_docs.mjs's SCALE. */
export const SCALE = 2;

/** What shows in place of a picture of the person: a grey head and shoulders. */
export const AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' " +
  "fill='%238b949e'/%3E%3Ccircle cx='20' cy='15' r='8' fill='%23fff'/%3E%3Cpath d='M5 40c0-11 7-16 15-16s15 5 15 " +
  "16z' fill='%23fff'/%3E%3C/svg%3E";

/**
 * How to lay a tab's page out at 1x and draw it at SCALE, from what the window says of itself
 * before anything is changed: `dpr`, `width` and `height` as windowSize gives them, and `zoom`,
 * the tab's zoom. `pageWidth` is the width to lay the page out at, in CSS px, or null for the
 * width it has.
 *
 * The converter takes a snapshot's boxes as CSS px, and a page is laid out at 1x only when the
 * display's scale times the tab's zoom is 1: at 150% a snapshot's boxes are 1.5 times the CSS
 * px, however the emulated scale is set (a page 1280 wide gave boxes 1920 wide, measured in
 * Chrome 148). So the tab's zoom is set to 1 over the display's scale, which also changes what
 * the emulated size means: an emulated width of w is w/zoom CSS px, and the page's scale is the
 * emulated one times the zoom.
 *
 * The page keeps the size in CSS px it has, so the picture of the whole window shows what the
 * window showed. On a display at 150% that is two thirds of the tab while the picture is taken,
 * in the tab's top left corner. The override's `scale` would fill the tab, and is left out:
 * Chrome keeps the view its emulated size and draws the page larger inside it, so that it cuts
 * off the right and the bottom of what the person is to drag over.
 *
 * Returns {display, zoom, metrics}: the display's scale, the tab's zoom to set and the
 * parameters of Emulation.setDeviceMetricsOverride.
 */
export function layoutPlan({ dpr, zoom, width, height, pageWidth = null }) {
  const display = dpr / zoom;
  return {
    display,
    zoom: 1 / display,
    metrics: {
      width: Math.round((pageWidth ?? width) / display),
      height: Math.round(height / display),
      deviceScaleFactor: SCALE * display,
      mobile: false,
    },
  };
}

// A capture's width and height, from the PNG's header in its base64 text.
export function pngSizeOf(base64) {
  const bytes = Uint8Array.from(atob(base64.slice(0, 32)), (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  return [view.getUint32(16), view.getUint32(20)];
}

// The smallest box of whole CSS px that holds both.
function union(a, b) {
  const x = Math.floor(Math.min(a.x, b.x));
  const y = Math.floor(Math.min(a.y, b.y));
  const right = Math.ceil(Math.max(a.x + a.width, b.x + b.width));
  const bottom = Math.ceil(Math.max(a.y + a.height, b.y + b.height));
  return { x, y, width: right - x, height: bottom - y };
}

// Runs `fn` of page.mjs in the page with `arg`, awaiting what it returns.
const inPage = (conn, fn, arg, options = {}) =>
  conn.evaluate(`(${fn})(${JSON.stringify(arg ?? null)})`, { awaitPromise: true, ...options });

// Waits until the window's height stops changing: the bar that says the tab is being
// debugged comes up a moment after the attach, and takes its height from the tab.
async function barIsUp(conn) {
  let last = null;
  for (let i = 0; i < 15; i++) {
    const { height } = await inPage(conn, windowSize);
    if (height === last && i >= 3) return;
    last = height;
    await new Promise((r) => setTimeout(r, 100));
  }
}

// The worlds of the page's frames of the same process, each of which gets the mask: a frame's
// text is a document of its own (capture.mjs draws it too). One of another process is not
// reached, and the converter reports it as not drawn.
async function frameWorlds(conn) {
  const worlds = [];
  const { frameTree } = await conn.send("Page.getFrameTree");
  const visit = async (node) => {
    for (const child of node.childFrames ?? []) {
      try {
        const { executionContextId } = await conn.send("Page.createIsolatedWorld", {
          frameId: child.frame.id,
          worldName: "svgshot",
        });
        worlds.push(executionContextId);
      } catch {
        // A frame of another process, or one that has gone.
      }
      await visit(child);
    }
  };
  await visit(frameTree);
  return worlds;
}

// Runs `fn` of page.mjs in the world `contextId`.
async function inWorld(conn, contextId, fn, arg) {
  const r = await conn.send("Runtime.evaluate", {
    expression: `(${fn})(${JSON.stringify(arg ?? null)})`,
    contextId,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "a frame's script failed");
  return r.result.value;
}

// Each image that shows in `view` is put in the page as a data: URL, read from what the page
// has loaded, which no Content-Security-Policy or missing CORS header can refuse. Returns how
// many could not be read, which the SVG then lacks.
async function freezeImages(conn, view) {
  const urls = await inPage(conn, imagesIn, { view });
  if (!urls.length) return 0;
  const { frameTree } = await conn.send("Page.getResourceTree");
  const types = new Map((frameTree.resources ?? []).map((r) => [r.url, r.mimeType]));
  const files = {};
  let missed = 0;
  for (const url of urls) {
    try {
      const { content, base64Encoded } = await conn.send("Page.getResourceContent", {
        frameId: frameTree.frame.id,
        url,
      });
      const type = types.get(url) ?? "image/png";
      files[url] = base64Encoded
        ? `data:${type};base64,${content}`
        : `data:${type};charset=utf-8,${encodeURIComponent(content)}`;
    } catch {
      missed++;
    }
  }
  await inPage(conn, showImages, { files });
  return missed;
}

// A capture of `clip` (document CSS px), which is given in the emulated size's units: captured
// until two in a row agree, since a capture is not byte-stable (shoot_docs.mjs's capture). Chrome
// rounds the size to whole units, so that at 150% a picture's size goes up in steps of 1.5 CSS
// px: 980 is 653.3 units, 653 of them, 979.5. The caller takes the size from the PNG, as
// shoot_docs.mjs does of a clip half a pixel past a whole one.
async function capturePng(conn, clip, display) {
  const params = {
    format: "png",
    clip: {
      x: clip.x / display,
      y: clip.y / display,
      width: clip.width / display,
      height: clip.height / display,
      scale: 1,
    },
  };
  let last = null;
  for (let i = 0; i < 6; i++) {
    const { data } = await conn.send("Page.captureScreenshot", params);
    if (data === last) return data;
    last = data;
  }
  return last;
}

// The primitives of a shot's mark at `on`: a ring round it and its label in a badge beside it.
const markPrimitives = (mark, on) => [
  { type: "ring", on },
  { type: "badge", n: mark.n, on, side: mark.side ?? "left" },
];

// Draws the marks of a shot, each anchored as the table says or, where the page has no such
// thing, where `pick` is told. Returns the drawn layer's box in window CSS px, or null.
async function drawMarks(conn, marks, { pick, log }) {
  const primitives = [];
  for (const mark of marks) {
    let on = mark.on;
    const found = await resolveAnchors(conn, { on }).catch((e) => {
      log(`mark ${mark.n}: ${e.message}`);
      return null;
    });
    if (!found) {
      const rect = await pick(`Mark ${mark.n}: click or drag over ${mark.what}. Esc leaves it out.`);
      if (!rect) {
        log(`mark ${mark.n} left out`);
        continue;
      }
      on = { rect };
    }
    primitives.push(...markPrimitives(mark, on));
  }
  return primitives.length ? (await annotate(conn, primitives)).box : null;
}

/**
 * Takes the tab `tabId`: the picture `out` (its path under docs/, the dark picture's), in each
 * theme of `themes`, of the whole window (`area` "viewport") or of the rectangle dragged over
 * it (`area` "drag"). `list` is the private words (private-words.mjs's wordList), `marks` the
 * shot's markings, `pageWidth` as layoutPlan's, `log(line)` is told what happens, and `signal`
 * (an AbortSignal) cancels a drag. Returns the capture to save, or null when it was cancelled.
 * Throws, leaving the page as it was, when a private word still shows.
 */
export async function takePicture({ tabId, out, area, themes, list, marks = [], pageWidth = null, log, signal }) {
  const conn = await attachDebugger(tabId);
  const after = [];
  const worlds = [];
  const finds = list.map((w) => w.find);
  const mask = async () => {
    const arg = { list, avatar: AVATAR };
    const counts = [await inPage(conn, maskPage, arg)];
    for (const world of worlds) counts.push(await inWorld(conn, world, maskPage, arg));
    return counts.reduce((sum, c) => sum + c.text + c.value + c.attribute + c.avatar, 0);
  };
  const pick = async (hint) => {
    log(hint);
    const cancel = () => conn.evaluate("window.__svgshot?.cancelPick?.()").catch(() => {});
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      return await inPage(conn, pickArea, { hint }, { timeout: 15 * 60 * 1000 });
    } finally {
      signal?.removeEventListener("abort", cancel);
    }
  };
  try {
    await conn.send("Page.enable");
    await barIsUp(conn);
    const [seen, was] = [await inPage(conn, windowSize), await chrome.tabs.getZoom(tabId)];
    const plan = layoutPlan({ ...seen, zoom: was, pageWidth });
    after.push(async () => {
      await conn.send("Emulation.clearDeviceMetricsOverride");
      await chrome.tabs.setZoom(tabId, was);
      await chrome.tabs.setZoomSettings(tabId, { scope: "per-origin" });
    });
    await chrome.tabs.setZoomSettings(tabId, { mode: "automatic", scope: "per-tab" });
    await chrome.tabs.setZoom(tabId, plan.zoom);
    await conn.send("Emulation.setDeviceMetricsOverride", plan.metrics);
    await conn.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    after.push(() => conn.send("Emulation.setFocusEmulationEnabled", { enabled: false }));
    after.push(() => conn.send("Emulation.setEmulatedMedia", { media: "", features: [] }));
    after.push(() => inPage(conn, undoPage));
    worlds.push(...(await frameWorlds(conn)));
    for (const world of worlds) after.push(() => inWorld(conn, world, undoPage));
    await inPage(conn, quietPage, { css: QUIET_CSS });
    await inPage(conn, settled);
    log(await conn.evaluate("location.href"));
    log(`display at ${Math.round(plan.display * 100)}%, tab zoom ${(plan.zoom * 100).toFixed(1)}%`);
    log(`masked ${await mask()} places`);

    // Where the picture is, in document CSS px.
    let clip = await inPage(conn, shownArea);
    if (area === "drag") {
      const rect = await pick("Drag over the picture's area, or click an element. Esc cancels.");
      if (!rect) return null;
      const { x, y } = await inPage(conn, scrolled);
      clip = { ...rect, x: rect.x + x, y: rect.y + y };
    }
    if (marks.length) {
      const box = await drawMarks(conn, marks, { pick, log });
      after.push(() => unannotate(conn));
      if (box && area === "drag") {
        const { x, y } = await inPage(conn, scrolled);
        clip = union(clip, { ...box, x: box.x + x, y: box.y + y });
      }
    }
    // Nothing the pointer rests on shows its hover look from here on.
    await inPage(conn, quietPage, { css: "*{pointer-events:none !important}" });
    await conn.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });

    const pictures = [];
    for (const theme of themes) {
      await conn.send("Emulation.setEmulatedMedia", {
        media: "",
        features: [{ name: "prefers-color-scheme", value: theme }],
      });
      await inPage(conn, pageTheme, { theme });
      await inPage(conn, settled);
      const missed = await freezeImages(conn, clip);
      if (missed) log(`${theme}: ${missed} image${missed > 1 ? "s" : ""} could not be read, and the SVG lacks them`);
      // A page can draw a word again at any moment: a capture counts only when the mask
      // found nothing new right after it, so that the word was not in the picture either.
      let png = null;
      for (let i = 0; i < 4 && !png; i++) {
        await mask();
        await inPage(conn, settled);
        const shot = await capturePng(conn, clip, plan.display);
        if (!(await mask())) png = shot;
      }
      if (!png) throw new Error(`the page keeps drawing a private word while the ${theme} picture is taken`);
      const [width, height] = pngSizeOf(png);
      const view = { ...clip, width: width / SCALE, height: height / SCALE };
      const bundle = await collectBundle(conn, view);
      const shown = await inPage(conn, windowSize);
      const box = bundle.snapshot.documents[0].layout.bounds[0];
      if (Math.abs(box[2] - shown.width) > 1 || Math.abs(shown.dpr - SCALE) > 0.01)
        throw new Error(`the page is laid out ${box[2]} wide in a window ${shown.width} wide, at ${shown.dpr}x`);
      const held = drawnWords(bundle, finds);
      if (held.length) throw new Error(`the ${theme} picture shows a private word: ${held.join(", ")}`);
      const clean = scrubBundle(bundle, list);
      const left = heldWords(JSON.stringify(clean), finds);
      if (left.length) throw new Error(`the ${theme} bundle still holds a private word: ${left.join(", ")}`);
      pictures.push({ theme, png, bundle: clean });
      log(`${theme}: ${width}x${height} px`);
    }
    const url = await conn.evaluate("location.href");
    return { format: 1, out, url: scrubBundle(url, list), taken: new Date().toISOString(), pictures };
  } finally {
    for (const step of after.toReversed()) {
      try {
        await step();
      } catch (e) {
        log(`while putting the page back: ${e.message}`);
      }
    }
    await conn.detach();
  }
}

/** A capture as gzipped JSON, the file saveCapture saves and chromeshot.mjs reads. */
export async function captureBlob(capture) {
  const stream = new Blob([JSON.stringify(capture)]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream, { headers: { "content-type": "application/gzip" } }).blob();
}

/** The file a capture of `out` is saved as, under the browser's download folder. */
export const captureName = (out) => `svgshot/${out.replace(/[\\/]/g, "__").replace(/\.png$/i, "")}.capture.json.gz`;

/** Saves `capture` to the browser's download folder, and resolves to the download's id. */
export async function saveCapture(capture) {
  const url = URL.createObjectURL(await captureBlob(capture));
  const id = await chrome.downloads.download({
    url,
    filename: captureName(capture.out),
    conflictAction: "overwrite",
    saveAs: false,
  });
  return new Promise((resolve, reject) => {
    const done = (delta) => {
      if (delta.id !== id || !delta.state || delta.state.current === "in_progress") return;
      chrome.downloads.onChanged.removeListener(done);
      URL.revokeObjectURL(url);
      if (delta.state.current === "complete") resolve(id);
      else reject(new Error("the browser did not save the capture"));
    };
    chrome.downloads.onChanged.addListener(done);
  });
}
