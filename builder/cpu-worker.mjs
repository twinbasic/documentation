// Worker harness for the tbdocs build pipeline.  Phase 15: SAB-based task
// metadata (no JS-side taskMeta array), priority-aware claiming, per-chunk
// flush via FIFO _pendingFlush queue, generic payload SAB.
// See PLAN-sab-pull-scheduler.md §Phase 15.

import { promises as fsP } from "node:fs";
import path from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import { packPageText, pageText, readPiece } from "./discover-read.mjs";
import { unpackShared } from "./sab-broadcast.mjs";

// A lane boots in two stages. The first is this module's static imports: the
// scheduler, and what discoverRead needs, which is the first work of a build
// and needs little (discover-read.mjs). A lane is in the pull loop after it,
// and two lanes read the source tree while the others load the rest.
//
// The second stage is everything else, below: the renderer and its plugins,
// the search index, the archive. A lane loads it before its first task that is
// not a discoverRead (loadRest, from the pull loop), and reports it as a
// second boot bar. The names are module-level bindings that loadRest fills, so
// that the handlers read as they would with static imports.
// biome-ignore format: one module per line
let compileLightScss, compileDarkScss, regenerateDot, captureBuildInfo, deflateGroup, writePdf, unpackBookPayload,
  createMarkdownIt, renderPhase, markdownCopy, markdownCopyRel,
  navTreeVersion, renderFullNav, templatePhase, withOnlineNav, withPartialNav,
  deriveSearchEntries, entryKeys, labelKey, packSearchEntries, readSearchEntries,
  addSlice, loadSearchLunr, sliceDocs, sliceVectors, unpackTotals,
  headingsOf, isSymbolPage, computeChunkSeo, pictureSvgOutputs, pngPictures,
  deriveOfflinePage, isWebsiteOnlyLink, websiteOf, normalizeBaseurl;
let _rest = null;
const loadRest = () =>
  (_rest ??= (async () => {
    const start = Date.now();
    ({ compileLightScss, compileDarkScss } = await import("./scss.mjs"));
    ({ regenerateDot } = await import("./dot.mjs"));
    ({ captureBuildInfo } = await import("./build-info.mjs"));
    ({ deflateGroup } = await import("./help-archive-step.mjs"));
    ({ writePdf } = await import("./pdf.mjs"));
    ({ unpackBookPayload } = await import("./book-payload.mjs"));
    ({ createMarkdownIt, renderPhase } = await import("./render.mjs"));
    ({ markdownCopy, markdownCopyRel } = await import("./markdown-copy.mjs"));
    ({ navTreeVersion, renderFullNav, templatePhase, withOnlineNav, withPartialNav } = await import("./template.mjs"));
    ({ deriveSearchEntries, entryKeys, labelKey, packSearchEntries, readSearchEntries } = await import("./search.mjs"));
    ({ addSlice, loadSearchLunr, sliceDocs, sliceVectors, unpackTotals } = await import("./search-index.mjs"));
    ({ headingsOf, isSymbolPage } = await import("./symbols.mjs"));
    ({ computeChunkSeo } = await import("./seo.mjs"));
    ({ pictureSvgOutputs, pngPictures } = await import("./theme-pictures.mjs"));
    ({ deriveOfflinePage, isWebsiteOnlyLink, websiteOf } = await import("./offline-rewrite.mjs"));
    ({ normalizeBaseurl } = await import("./url.mjs"));
    parentPort.postMessage({ coldBoot: { type: "cold2", start, end: Date.now() } });
  })());

import {
  createViews,
  scanAndClaim,
  onTaskDone,
  readTaskMeta,
  HANDLERS,
  READY,
  CLAIMED,
  DONE,
  FAILED,
  F_ON_DEMAND,
  F_RUN_ON_MAIN,
  F_RUN_WHEN_IDLE,
  F_UNIQUE_PER_WORKER,
  MAX_LANES,
} from "./sab-scheduler.mjs";

if (workerData?.spawnTime) parentPort.postMessage({ coldBoot: { start: workerData.spawnTime, end: Date.now() } });

const myLane = workerData?.lane ?? 0;

// ── Mutable state set by init / dynamicData messages ────────────────────────

let views = null; // Int32Array views into the scheduling SAB
let ctx = null; // { srcRoot, destRoot, opts, workerCount }

let _payloadSAB = null; // SharedArrayBuffer with packed per-task payloads
let _sharedSAB = null; // SharedArrayBuffer with packed shared payload
let _shared = null; // _sharedSAB decoded, once per lane

// What dispatch broadcast. A task that reads it runs after dispatch, but the
// message is not here by then: this lane may still be inside the pull loop
// that claimed the task, so yield until it lands, as taskData does. A task
// claimed that way threw here.
async function sharedData() {
  while (!_sharedSAB) await new Promise((resolve) => setImmediate(resolve));
  _shared ??= unpackShared(_sharedSAB);
  return _shared;
}

// ── Handler table ───────────────────────────────────────────────────────────

const handlers = {
  // One piece of the source tree (tbdocs.mjs, discoverList): its pages read
  // and their frontmatter parsed, its static files sized. The one handler
  // that runs after the first stage of the boot alone.
  // The pages' text goes back a second time, packed for the render lanes
  // (packPageText): the buffer is shared, not copied.
  async discoverRead(taskIdx) {
    const result = readPiece(ctx.srcRoot, await fanOutPayload(taskIdx));
    return { ...result, text: packPageText(result.pages) };
  },

  async warmInit() {
    const { initHighlighter } = await import("./highlight.mjs");
    await initHighlighter();
    return {};
  },

  async renderEnvInit() {
    const {
      siteData,
      initData,
      linkTablesData,
      staticFilesArr,
      baseurl,
      buildInfo,
      sitePathsArr,
      onlineSitePathsArr,
      skipOffline,
      svgContentsMap,
      checkTrees,
      vendoredVideosObj,
      vendoredImagesObj,
      pictureSizes,
      counts,
      downloads,
      latePages,
    } = await sharedData();

    const { initHighlighter } = await import("./highlight.mjs");
    const highlighter = await initHighlighter();
    const linkTables = reconstructLinkTables(linkTablesData);
    const staticFiles = new Set(staticFilesArr);
    const svgContents = new Map(Object.entries(svgContentsMap ?? {}));
    const vendoredVideos = new Map(Object.entries(vendoredVideosObj ?? {}));
    const vendoredImages = new Map(Object.entries(vendoredImagesObj ?? {}));
    const markdown = createMarkdownIt({
      highlighter,
      linkTables,
      baseurl,
      staticFiles,
      pictureSizes,
      svgContents,
      vendoredVideos,
      vendoredImages,
      counts,
      downloads,
      termPrefixes: siteData.config.search?.term_entries ?? [],
    });
    const site = { ...siteData, markdown, buildInfo };

    let offlineBase = null;
    if (!skipOffline) {
      offlineBase = {
        sitePaths: new Set(sitePathsArr),
        website: websiteOf(siteData.config, new Set(onlineSitePathsArr)),
        baseurl: normalizeBaseurl(baseurl),
      };
    }

    // htmlparser2 costs ~23 ms to import, and a build without --check
    // must not pay it on sixteen lanes. Hence the dynamic import here
    // rather than a static one at module scope.
    if (checkTrees) {
      const { checkChunk, treeIndexFor, normalizeBasePath: normBase, TREES } = await import("./check.mjs");
      _checkChunk = checkChunk;
      _checkEnv = {};
      for (const [which, { rels, baseurl: bu }] of Object.entries(checkTrees)) {
        const root = ctx.destRoot + TREES[which].suffix;
        _checkEnv[which] = {
          root,
          tree: TREES[which],
          basePath: normBase(bu),
          index: treeIndexFor(root, rels),
          ...(which === "offline" && offlineBase ? { forbidExempt: (url) => isWebsiteOnlyLink(url, offlineBase) } : {}),
        };
      }
    }

    // An output that shows the pictures' PNGs (picture_svg) gets the renderer's HTML with
    // each picture's SVG named back as its PNG; the others get it as rendered.
    const svgOutputs = pictureSvgOutputs(siteData.config);
    const asPng = (html) => pngPictures(html, staticFiles, baseurl || "");
    _renderEnv = { site, initData, offlineBase, svgOutputs, asPng, latePages: new Set(latePages ?? []) };
    return {};
  },

  async flush() {
    const items = _pendingFlush.shift() ?? [];
    let written = 0,
      offlineWritten = 0,
      offlineMisses = 0,
      markdownWritten = 0;

    // The check rides along here rather than becoming its own task
    // because this is the one moment both trees' final HTML is already
    // decoded and in this lane's memory. A separate task would have to
    // be handed the strings back, which is the payload cost the whole
    // design exists to avoid.
    let writes = null;
    if (!ctx.opts.dryRun) {
      let next = 0;
      const limit = Math.min(64, items.length || 1);
      // Building the array issues the first `limit` writes before
      // returning -- each async arrow runs synchronously up to its
      // first await -- so constructing it ahead of the check puts the
      // I/O in libuv's threadpool while this thread parses. Measured as
      // a wash, because the lanes are CPU-bound rather than waiting on
      // disk; it is kept because it is the right order and costs
      // nothing.
      const workers = Array.from({ length: limit }, async () => {
        while (next < items.length) {
          const p = items[next++];
          await fsP.writeFile(path.join(ctx.destRoot, p.destPath), p.html, "utf8");
          written++;
          if (p.offlineHtml !== undefined) {
            await fsP.writeFile(path.join(ctx.destRoot + "-offline", p.destPath), p.offlineHtml, "utf8");
            offlineWritten++;
          }
          if (p.markdown) {
            await fsP.writeFile(path.join(ctx.destRoot, p.markdown.rel), p.markdown.text, "utf8");
            markdownWritten++;
          }
          offlineMisses += p.offlineMisses ?? 0;
        }
      });
      writes = Promise.all(workers);
    }

    const check = _checkEnv ? await runChunkCheck(items) : null;
    if (writes) await writes;

    return { written, offlineWritten, offlineMisses, markdownWritten, check };
  },

  async scssLight() {
    const scssLightResult = await compileLightScss(ctx.srcRoot);
    return { scssLightResult };
  },

  async scssDark() {
    const scssDarkResult = await compileDarkScss(ctx.srcRoot);
    return { scssDarkResult };
  },

  async dot() {
    const dotStats = await regenerateDot(ctx.srcRoot);
    return { dotStats };
  },

  async buildInfo() {
    const buildInfo = await captureBuildInfo();
    return { buildInfo };
  },

  // The contributed packages' test projects and published tools, packed in
  // memory (package-tests.mjs) from the package_tests entry that config
  // broadcast. The bytes go back to the main thread, where downloadSizes reads
  // their sizes and packageTests writes them. A failure goes back too, for
  // packageTests to report: it fails the build without stopping it. The
  // module is imported here, by the one lane that packs.
  async packTests() {
    const { packAllPackageTests, packageTestsOf } = await import("./package-tests.mjs");
    const cfg = packageTestsOf({ package_tests: unpackShared(await taskData("packageTests")) }, ctx.srcRoot);
    if (!cfg) return {};
    try {
      return await packAllPackageTests(cfg);
    } catch (err) {
      return { failed: true, error: err.message };
    }
  },

  // One slice of the search index (search-index.mjs, step 1): its entries
  // added to a builder that stays on this lane, for the indexVectors:i pinned
  // here; what it returns goes to indexMerge.
  // The slice's entries are read from the buffers the render lanes packed
  // them into, with what indexSlices decided since beside it in the payload.
  async indexAdd(taskIdx) {
    const plan = await fanOutPayload(taskIdx);
    const { chunks, twins } = await taskData("indexEntries");
    const docs = sliceDocs(plan, (chunk, from, to) => readSearchEntries(chunks[chunk], from, to));
    const { state, added } = addSlice(loadSearchLunr(), docs, twins);
    _indexSlices.set(plan.slice, state);
    return added;
  },

  // The same slice's field vectors (step 3), with the totals indexMerge
  // broadcast; the builder is let go.
  async indexVectors(taskIdx) {
    const { slice } = await fanOutPayload(taskIdx);
    const state = _indexSlices.get(slice);
    if (!state) throw new Error(`search index: slice ${slice} was not added on lane ${myLane}`);
    _indexSlices.delete(slice);
    return sliceVectors(loadSearchLunr(), state, unpackTotals(await taskData("indexTotals"), slice));
  },

  // One group of the help archive's units (help-archive-step.mjs).
  async archiveDeflate(taskIdx) {
    return deflateGroup(await fanOutPayload(taskIdx));
  },

  // The PDF tree, from what bookPayload packed on the main thread. The book
  // itself stays on this lane for checkBook rather than crossing back.
  async writePdf() {
    const book = unpackBookPayload(await taskData("book"));
    _bookCheck = null;
    if (!book) return null;
    const { checkBook, ...counters } = await writePdf(book.pages, book.staticFiles, book.site, ctx.destRoot, {
      tolerateMissingImages: ctx.opts.tolerateMissingImages,
      highlightCss: book.highlightCss,
      check: book.check,
    });
    _bookCheck = checkBook ?? null;
    return counters;
  },

  // The book is one 6.5 MB document with almost entirely internal
  // fragments, written by a different task from a different string.
  // Keeping it its own pass is cheaper than special-casing the chunk
  // path for a single file.
  async checkBook() {
    if (!_bookCheck) return null;
    const { html, rels } = _bookCheck;
    _bookCheck = null;
    const { checkChunk, joinChunks, treeIndexFor, TREES } = await import("./check.mjs");
    const root = ctx.destRoot + TREES.pdf.suffix;
    const env = { root, tree: TREES.pdf, basePath: "", index: treeIndexFor(root, rels) };
    let chunk;
    try {
      chunk = checkChunk([{ destPath: "book.html", html }], env);
    } catch (err) {
      chunk = { error: `book check failed: ${err.message}` };
    }
    return joinChunks([chunk], { root, tree: TREES.pdf, relFiles: ["book.html"] });
  },

  async render(taskIdx) {
    const offset = Atomics.load(views.payloadOffset, taskIdx);
    const length = Atomics.load(views.payloadLength, taskIdx);
    const { pages: chunk, texts } = JSON.parse(new TextDecoder().decode(new Uint8Array(_payloadSAB, offset, length)));
    // A page's text is not in the payload: it is where the lane that read the
    // page packed it (discoverRead), in the buffer discover broadcast.
    for (const [i, p] of chunk.entries()) {
      const at = texts[i];
      if (at) p.rawContent = pageText(await taskData(`pageText:${at[0]}`), at[1], at[2]);
    }

    const env = _renderEnv;

    // A chunk with a late page ran after downloadSizes, which broadcast the
    // packed files' sizes: this lane's parser has them from here on.
    if (chunk.some((p) => env.latePages.has(p.srcRel))) {
      env.site.markdown.downloads = unpackShared(await taskData("downloads"));
    }

    await renderPhase(chunk, env.site);
    computeChunkSeo(chunk, env.site.seoSiteTitle, env.site.config, env.site.markdown);
    await templatePhase(chunk, env.site, env.initData);

    // A page in either tree holds only its part of the nav tree, which each
    // tree's own way fills in (template.mjs: withPartialNav, withOnlineNav).
    env.fullNav ??= renderFullNav(env.site);
    env.navVersion ??= navTreeVersion(env.fullNav);

    if (env.offlineBase) {
      const offlineState = {
        ...env.offlineBase,
        caches: { rawResolution: new Map(), seg: new Map(), result: new Map() },
      };

      const writable = chunk.filter((p) => p.html !== undefined);
      for (const p of writable) {
        const source = env.svgOutputs.offline ? p.html : env.asPng(p.html);
        const offlinePage = { ...p, html: withPartialNav(source, p, env.site, env.fullNav) };
        const { html, misses } = deriveOfflinePage(offlinePage, offlineState);
        p.offlineHtml = html;
        p.offlineMisses = misses;
      }
    }

    // The online page, once the offline one is taken from the HTML as rendered.
    for (const p of chunk) {
      if (p.html === undefined) continue;
      p.html = withOnlineNav(p.html, p, env.site, env.fullNav, env.navVersion);
      if (!env.svgOutputs.online) p.html = env.asPng(p.html);
    }

    // Stash writable pages for the matching flush:i (FIFO; one batch per
    // render:i, drained by exactly one flush:i on the same worker), each with
    // its markdown copy, which goes beside it in the online tree alone.
    const batch = [];
    for (const p of chunk) {
      if (p.html !== undefined) {
        const markdownRel = markdownCopyRel(p);
        let markdown;
        if (markdownRel !== null) {
          try {
            markdown = { rel: markdownRel, text: markdownCopy(p, env.site.markdown) };
          } catch (err) {
            throw new Error(`${p.srcRel}: its markdown copy: ${err.message}`);
          }
        }
        batch.push({
          destPath: p.destPath,
          html: p.html,
          offlineHtml: p.offlineHtml,
          offlineMisses: p.offlineMisses,
          markdown,
        });
      }
    }
    _pendingFlush.push(batch);

    // Per-chunk search entries; consolidated on main during searchEntries.
    // Drop `sourcePage` (workers hold cloned page objects, not master
    // refs) and `i` (chunk-local indices are meaningless; main assigns
    // global indices during consolidation). Beside them go the keys
    // settleLabels compares each by, with its labels: worked out here rather
    // than on the main thread after the last chunk, when every lane waits
    // for it.
    const keyOf = new Map();
    const key = (s) => {
      let k = keyOf.get(s);
      if (k === undefined) keyOf.set(s, (k = labelKey(s)));
      return k;
    };
    const derived = deriveSearchEntries(chunk, env.site);
    const searchKeys = derived.map((e) => entryKeys(e, key));
    const searchEntries = derived.map((e) => ({
      doc: e.doc,
      title: e.title,
      content: e.content,
      url: e.url,
      relUrl: e.relUrl,
      index: e.index,
      index_also: e.index_also,
      indexWritten: e.indexWritten,
    }));

    return {
      pages: chunk.map((p) => ({
        destPath: p.destPath,
        renderedContent: p.renderedContent,
        offlineMisses: p.offlineMisses,
        // For the symbol index, which every lane waits for likewise.
        headings: isSymbolPage(p) && typeof p.renderedContent === "string" ? headingsOf(p.renderedContent) : undefined,
      })),
      searchEntries,
      searchKeys,
      // The same entries for the lanes that build the search index, which
      // read them from here: the main thread never sends them on.
      searchPacked: packSearchEntries(searchEntries),
    };
  },
};

// Reverse handler table: HANDLERS maps name → integer, handlerById maps
// integer → function.  Built once at module load.
const handlerById = [];
for (const [name, id] of Object.entries(HANDLERS)) handlerById[id] = handlers[name];

let _renderEnv = null;
let _pendingFlush = [];
let _taskData = new Map(); // key → SAB a main-thread task broadcast (broadcastTaskData)
let _bookCheck = null; // writePdf's book for checkBook, which is pinned to the same lane

let _indexSlices = new Map(); // search index slice -> its builder, from indexAdd for indexVectors

// The data a main-thread predecessor broadcast for this task. The message
// is queued before the predecessor is marked done, but this lane may still
// be inside the pull loop that claimed the task, so yield until it lands.
async function taskData(key) {
  while (!_taskData.has(key)) await new Promise((resolve) => setImmediate(resolve));
  return _taskData.get(key);
}

// A fan-out piece's payload (fan-out.mjs): its fan-out's SharedArrayBuffer is
// broadcast as `fan:<base>:<count>`, and the scheduling SAB holds where in it
// each piece's JSON is. Waits for the broadcast as taskData does.
const FAN_KEY = /^fan:(\d+):(\d+)$/;
async function fanOutPayload(taskIdx) {
  for (;;) {
    for (const [key, sab] of _taskData) {
      const m = FAN_KEY.exec(key);
      if (!m || taskIdx < Number(m[1]) || taskIdx >= Number(m[1]) + Number(m[2])) continue;
      const offset = Atomics.load(views.payloadOffset, taskIdx);
      const length = Atomics.load(views.payloadLength, taskIdx);
      return JSON.parse(new TextDecoder().decode(new Uint8Array(sab, offset, length)));
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
}
let _checkEnv = null; // set by renderEnvInit when --check is on
let _checkChunk = null; // builder/check.mjs's checkChunk, imported with it

// One chunk of pages, checked against every tree it was written to.
//
// A failing check must never take the build's output down with it, so
// everything here is inside a try: a broken link still produces a valid
// site you want on disk to inspect. The error comes back as a finding
// and checkReport decides what to do with it.
async function runChunkCheck(items) {
  const out = {};
  for (const [which, env] of Object.entries(_checkEnv)) {
    // Asserted rather than filtered. The offline pass runs for every
    // page in the lane, so a page without offlineHtml means the rewrite
    // did not happen -- and dropping it here would shrink the chunk
    // quietly, checking fewer pages and still reporting a pass.
    const docs =
      which === "offline"
        ? items.map((p) => {
            if (p.offlineHtml === undefined) {
              throw new Error(
                `${p.destPath} reached the offline check with no offlineHtml; ` +
                  `the chunk would have covered fewer pages than the lane holds`,
              );
            }
            return { destPath: p.destPath, html: p.offlineHtml };
          })
        : items.map((p) => ({ destPath: p.destPath, html: p.html }));
    try {
      out[which] = _checkChunk(docs, env);
    } catch (err) {
      out[which] = { error: `${which} chunk check failed: ${err.message}` };
    }
  }
  return out;
}

// ── Message handler (init, dynamicData, taskData) ───────────────────────────

parentPort.on("message", (msg) => {
  if (msg.init) {
    views = createViews(msg.sab);
    ctx = msg.ctx;
    _payloadSAB = null;
    _sharedSAB = null;
    _shared = null;
    _renderEnv = null;
    _checkEnv = null;
    _pendingFlush = [];
    _taskData = new Map();
    _bookCheck = null;
    _indexSlices = new Map();
    pullLoop();
    return;
  }
  if (msg.dynamicData) {
    _payloadSAB = msg.payloadSAB;
    _sharedSAB = msg.sharedSAB;
    _shared = null;
    return;
  }
  if (msg.taskData) {
    _taskData.set(msg.taskData, msg.sab);
    return;
  }
});

// ── Idle-task scan (speculative warmup) ─────────────────────────────────────

function findIdleTask(views, lane) {
  const count = Atomics.load(views.taskCount, 0);
  let bestIdx = -1;
  let bestPri = Infinity;
  for (let i = 0; i < count; i++) {
    if (!(Atomics.load(views.flags, i) & F_RUN_WHEN_IDLE)) continue;
    const meta = readTaskMeta(views, i);
    const pri = meta.idlePriority;
    if (pri >= bestPri) continue;
    if (Atomics.load(views.flags, i) & F_UNIQUE_PER_WORKER) {
      if (Atomics.load(views.perWorkerDone, i * MAX_LANES + lane) !== 0) continue;
      let skip = false;
      for (const predIdx of meta.expectedDeps) {
        if (Atomics.load(views.status, predIdx) !== DONE) {
          skip = true;
          break;
        }
      }
      if (skip) continue;
      for (const depIdx of meta.perWorkerDeps) {
        if (Atomics.load(views.perWorkerDone, depIdx * MAX_LANES + lane) === 0) {
          skip = true;
          break;
        }
      }
      if (skip) continue;
      bestIdx = i;
      bestPri = pri;
    } else {
      if (Atomics.load(views.status, i) !== READY) continue;
      bestIdx = i;
      bestPri = pri;
    }
  }
  // For non-unique_per_worker tasks, CAS-claim at the end.
  if (bestIdx !== -1 && !(Atomics.load(views.flags, bestIdx) & F_UNIQUE_PER_WORKER)) {
    if (Atomics.compareExchange(views.status, bestIdx, READY, CLAIMED) !== READY) return -1;
  }
  return bestIdx;
}

// ── Pull loop ───────────────────────────────────────────────────────────────

// Runs a per-worker task on this lane, marks it done for the lane, and
// reports its timing and output. Returns false once a throw has been
// reported, and the caller then ends the pull loop.
async function runPerWorkerTask(taskIdx, meta) {
  await loadRest();
  const t0 = Date.now();
  let output;
  try {
    output = await handlerById[meta.handlerIdx]();
  } catch (err) {
    parentPort.postMessage({ taskFailed: taskIdx, message: err.message, stack: err.stack });
    return false;
  }
  const t1 = Date.now();
  Atomics.store(views.perWorkerDone, taskIdx * MAX_LANES + myLane, 1);
  parentPort.postMessage({
    perWorkerTiming: true,
    taskIdx,
    timing: { start: t0, end: t1 },
    lane: myLane,
    output,
  });
  return true;
}

async function pullLoop() {
  while (true) {
    if (Atomics.load(views.buildDone, 0) !== 0) return;

    let taskIdx = scanAndClaim(views, myLane);

    if (taskIdx === -1) {
      // Speculative: run idle-eligible tasks before sleeping.
      const idleTask = findIdleTask(views, myLane);
      if (idleTask !== -1) {
        if (!(await runPerWorkerTask(idleTask, readTaskMeta(views, idleTask)))) return;
        continue;
      }

      const gen = Atomics.load(views.notify, 0);
      // Double-check after reading gen (race: a task may have become
      // READY between the failed scan and this load).
      taskIdx = scanAndClaim(views, myLane);
      if (taskIdx === -1) {
        Atomics.wait(views.notify, 0, gen, 50);
        continue;
      }
    }

    // ── Per-worker deps (unique_per_worker) ──
    const meta = readTaskMeta(views, taskIdx);
    let unsatisfied = null;
    for (const depIdx of meta.perWorkerDeps) {
      if (Atomics.load(views.perWorkerDone, depIdx * MAX_LANES + myLane) === 0) {
        unsatisfied = depIdx;
        break;
      }
    }

    if (unsatisfied !== null) {
      const depFlags = Atomics.load(views.flags, unsatisfied);

      if (depFlags & F_ON_DEMAND && !(depFlags & F_RUN_ON_MAIN)) {
        const depMeta = readTaskMeta(views, unsatisfied);

        // Check the dep's own perWorkerDeps (e.g. renderEnvInit → warmInit).
        let nestedUnsatisfied = null;
        for (const nestedIdx of depMeta.perWorkerDeps) {
          if (Atomics.load(views.perWorkerDone, nestedIdx * MAX_LANES + myLane) === 0) {
            nestedUnsatisfied = nestedIdx;
            break;
          }
        }

        if (nestedUnsatisfied !== null) {
          const nestedFlags = Atomics.load(views.flags, nestedUnsatisfied);
          if (nestedFlags & F_ON_DEMAND && !(nestedFlags & F_RUN_ON_MAIN)) {
            Atomics.store(views.status, taskIdx, READY);
            Atomics.add(views.notify, 0, 1);
            Atomics.notify(views.notify, 0, 1);

            if (!(await runPerWorkerTask(nestedUnsatisfied, readTaskMeta(views, nestedUnsatisfied)))) return;
            continue;
          }
          Atomics.store(views.status, taskIdx, READY);
          Atomics.add(views.notify, 0, 1);
          Atomics.notify(views.notify, 0, 1);
          continue;
        }

        // Check preconditions (expected predecessors on the dep).
        let precondFailed = false;
        for (const predIdx of depMeta.expectedDeps) {
          if (Atomics.load(views.status, predIdx) !== DONE) {
            precondFailed = true;
            break;
          }
        }
        if (precondFailed) {
          Atomics.store(views.status, taskIdx, READY);
          Atomics.add(views.notify, 0, 1);
          Atomics.notify(views.notify, 0, 1);
          continue;
        }

        // All dep's deps satisfied. Release original task, execute the dep.
        Atomics.store(views.status, taskIdx, READY);
        Atomics.add(views.notify, 0, 1);
        Atomics.notify(views.notify, 0, 1);

        if (!(await runPerWorkerTask(unsatisfied, depMeta))) return;
        continue;
      }

      // Other unsatisfied dep types: release and re-scan.
      Atomics.store(views.status, taskIdx, READY);
      Atomics.add(views.notify, 0, 1);
      Atomics.notify(views.notify, 0, 1);
      continue;
    }

    // ── Execute task ──
    const handler = handlerById[meta.handlerIdx];
    if (!handler) {
      parentPort.postMessage({ taskFailed: taskIdx, message: `unknown handlerIdx: ${meta.handlerIdx}`, stack: "" });
      return;
    }

    if (meta.handlerIdx !== HANDLERS.discoverRead) await loadRest();
    const t0 = Date.now();
    let result;
    try {
      result = await handler(taskIdx);
    } catch (err) {
      parentPort.postMessage({ taskFailed: taskIdx, message: err.message, stack: err.stack });
      Atomics.store(views.status, taskIdx, FAILED);
      return;
    }
    const t1 = Date.now();

    // Post the output BEFORE the SAB update, so the result is at least
    // QUEUED on the main thread before any successor's dep count drops.
    //
    // That is an ordering of the two operations, NOT a guarantee that
    // the merge has happened: the message still has to be delivered and
    // the matching submit() still has to run. A successor can reach a
    // dep count of zero with the result sitting unread in the main
    // thread's queue -- which is exactly how renderJoin lost pages from
    // the search index. What closes that window is the barrier's
    // `expected` list (see registerBarrier in tbdocs.mjs), not this
    // ordering.
    parentPort.postMessage({
      done: taskIdx,
      output: result,
      timing: { start: t0, end: t1 },
      lane: myLane,
    });

    const { readyCount, wakeMain } = onTaskDone(views, taskIdx, myLane);
    if (readyCount > 0) {
      Atomics.add(views.notify, 0, 1);
      Atomics.notify(views.notify, 0, readyCount);
    }
    if (wakeMain) {
      parentPort.postMessage({ mainTaskReady: true });
    }
  }
}

function reconstructLinkTables({ byPath, byUrl, byRedirect, byShortcut }) {
  const make = (entries) => new Map(entries.map(([k, pl, md]) => [k, { permalink: pl, markdownUrl: md }]));
  return { byPath: make(byPath), byUrl: make(byUrl), byRedirect: make(byRedirect), byShortcut: make(byShortcut) };
}
