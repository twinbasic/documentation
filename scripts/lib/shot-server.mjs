// The screenshot review tool's server (WIP.ShotReview.md): the pages of one session
// (shot-pages.mjs), the files they show, and the session's runs, whose events reach the pages
// over server-sent events (lib/sse.mjs) as they arrive. It listens on the loopback address
// only and answers a request only when it names the loopback address as its host, since
// its pages and pictures can hold the Windows user name.
//
// It decides nothing and writes nothing under docs/: the verdicts are the runs' (shot-policy.mjs,
// in shoot_docs.mjs and replay.mjs), read from their stages and events, and the model of what
// the pages show is shot-review.mjs's. The one thing it writes is the session (shot-session.mjs):
// its runs, and the queue's place.

import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { DOCS_DIR } from "../../lib/repo-paths.mjs";
import { createSseChannel } from "../../lib/sse.mjs";
import { decodePng } from "./png.mjs";
import { svgOf } from "./shot-apply.mjs";
import { shareOff, strengthPicture } from "./shot-change.mjs";
import { detailHtml, hrefs, overviewHtml } from "./shot-pages.mjs";
import { pngRule, pngSize, svgRule } from "./shot-policy.mjs";
import {
  FILTERS,
  filterPictures,
  isOverridden,
  neighbours,
  reviewPictures,
  runFacts,
  verdictOfEvent,
} from "./shot-review.mjs";
import { startRun } from "./shot-runs.mjs";
import { commandOf, readEvents, runPaths } from "./shot-session.mjs";
import { readStrength, readVerdicts } from "./shot-stage.mjs";

const TYPES = { ".png": "image/png", ".svg": "image/svg+xml" };

// A picture's or an SVG's path under docs/, as a URL gives it: forward slashes, no empty or
// parent segment.
const isDocsPath = (p) =>
  /^[^\\]+\.(png|svg)$/i.test(p) && !p.startsWith("/") && !p.split("/").some((s) => s === "" || s === "..");

const readIf = (file) => (existsSync(file) && statSync(file).isFile() ? readFileSync(file) : null);

const sizeOf = (png) => {
  try {
    const { w, h } = pngSize(png);
    return [w, h];
  } catch {
    return null;
  }
};

// The most difference maps kept drawn: drawing one decodes a picture of up to 4.5 M pixels.
const MAPS_KEPT = 16;

/**
 * The server of the session `session` (openSession): `revision` the baseline as openRevision
 * gives it, `manifest()` the manifest as it is now (openManifest), `docsRoot` the pictures'
 * folder, `headNow` HEAD's short hash when it is no longer the baseline, `newestIde` the
 * newest install's build, `onLine(run, line)` called for each line of a run meant for a
 * person, and `command` the probes' stand-in for the tools a run starts (startRun). Returns {server, listen(port, host), start({tool, args}), live(), stopAll(),
 * close(), model()}: `listen` resolves to the port it listens on; `start` starts a run, and
 * returns startRun's handle; `live` the handles of the runs that are running.
 */
export function createReviewServer({
  session,
  revision,
  manifest,
  docsRoot = DOCS_DIR,
  headNow = null,
  newestIde = null,
  onLine,
  command,
}) {
  const sse = createSseChannel();
  // run n -> {record, live, handle, events, facts, verdicts}
  const runs = new Map();
  for (const record of session.data.runs) {
    const files = runPaths(session.root, record.n);
    const events = readEvents(files.events);
    const verdicts = new Map(readVerdicts(files.stage).map((v) => [v.out, { png: v.png, svg: v.svg }]));
    runs.set(record.n, { record, live: false, handle: null, events, facts: runFacts(record.tool, events), verdicts });
  }
  const stageFile = (n, rel) => path.join(runPaths(session.root, n).stage, rel);
  const exists = (rel) => existsSync(path.join(docsRoot, rel));
  const entry = (out) => manifest().entry(out);

  // How much a changed picture changed, which orders the Changed group: a PNG's share of
  // pixels beyond its noise levels, from its strength map; an SVG's share off its PNG.
  const measures = new Map();
  const measure = (p) => {
    const key = `${p.png?.run}:${p.svg?.run}:${p.out}`;
    if (!measures.has(key)) {
      let m = p.svg?.share ?? p.svg?.stats?.pct96 ?? 0;
      if (p.png?.state === "updated" && p.png.strength) {
        const rule = pngRule(entry(p.out));
        try {
          m = shareOff(readStrength(stageFile(p.png.run, p.png.strength)), {
            level: rule.levels + 1,
            rects: rule.rects,
          });
        } catch {}
      }
      measures.set(key, m);
    }
    return measures.get(key);
  };
  const model = () =>
    reviewPictures(
      [...runs.values()].map((r) => ({
        n: r.record.n,
        tool: r.record.tool,
        live: r.live,
        facts: r.facts,
        verdicts: r.verdicts,
      })),
      { exists, measure },
    );
  const filterOptions = { overridden: (out) => isOverridden(entry(out)), exists };

  // ---- runs ----
  const listedOf = (r) => r.facts.listed;
  const onEvent = (record, e) => {
    const r = runs.get(record.n);
    r.events.push(e);
    r.facts = runFacts(record.tool, r.events);
    if (e.type === "picture" || e.type === "svg") {
      const [part, value] = verdictOfEvent(e);
      const v = r.verdicts.get(e.out) ?? { png: null, svg: null };
      v[part] = value;
      r.verdicts.set(e.out, v);
    }
    if (e.out) sse.send("update", { outs: [e.out] });
    else sse.send("update", { outs: e.type === "run" || e.type === "summary" ? listedOf(r) : [], runs: true });
  };
  const onExit = (record) => {
    const r = runs.get(record.n);
    r.live = false;
    r.handle = null;
    sse.send("update", { outs: listedOf(r), runs: true });
  };
  function start({ tool, args }) {
    const handle = startRun(session, { tool, args }, { onEvent, onExit, onLine, command });
    runs.set(handle.run.n, {
      record: handle.run,
      live: true,
      handle,
      events: [],
      facts: runFacts(tool, []),
      verdicts: new Map(),
    });
    sse.send("update", { outs: [], runs: true });
    return handle;
  }
  const live = () => [...runs.values()].filter((r) => r.live).map((r) => r.handle);

  // A run's summary line for the overview.
  const runRow = (r) => {
    const owed = r.record.tool === "replay" ? "svg" : "png";
    const done = r.facts.listed.filter(
      (out) => r.verdicts.get(out)?.[owed] || r.facts.failed.has(out) || r.facts.skipped.has(out),
    ).length;
    return {
      ...r.record,
      command: commandOf(r.record),
      live: r.live,
      stopping: r.facts.stopping,
      done,
      listed: r.facts.listed.length,
    };
  };

  // ---- the files the pages show ----
  const verdictOf = (n, out) => runs.get(n)?.verdicts.get(out) ?? null;
  // The picture the run `n` judged its capture of `out` against.
  function referenceBytes(n, out) {
    const against = verdictOf(n, out)?.png?.against;
    if (against === "revision") return revision.bytes(out);
    if (against === "disk") return readIf(path.join(docsRoot, out));
    if (against === "dark") {
      const dark = out.replace(/\.light\.png$/i, ".png");
      const staged = verdictOf(n, dark)?.png?.capture;
      return staged ? readIf(stageFile(n, staged)) : readIf(path.join(docsRoot, dark));
    }
    return null;
  }
  // The PNG the run `n` compared its SVG of `out` with: its capture, else the file.
  function svgPngBytes(n, out) {
    const capture = verdictOf(n, out)?.png?.capture;
    return capture ? readIf(stageFile(n, capture)) : readIf(path.join(docsRoot, out));
  }
  const maps = new Map();
  function mapBytes(n, part, out) {
    const key = `${n}/${part}/${out}`;
    if (maps.has(key)) return maps.get(key);
    const v = verdictOf(n, out)?.[part];
    if (!v?.strength) return null;
    const base = part === "png" ? readIf(stageFile(n, v.capture)) : svgPngBytes(n, out);
    if (!base) return null;
    const bytes = strengthPicture(readStrength(stageFile(n, v.strength)), decodePng(base));
    maps.set(key, bytes);
    if (maps.size > MAPS_KEPT) maps.delete(maps.keys().next().value);
    return bytes;
  }

  // ---- the pages ----
  function overview(filter) {
    const m = model();
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, filterPictures(m.pictures, k, filterOptions).length]));
    const shown = new Set(filterPictures(m.pictures, filter, filterOptions).map((p) => p.out));
    const look = filterPictures(m.pictures, "look", filterOptions);
    const at = Math.max(
      0,
      look.findIndex((p) => p.out === session.data.place),
    );
    return overviewHtml({
      groups: m.groups.map((g) => ({ ...g, pictures: g.pictures.filter((p) => shown.has(p.out)) })),
      filter,
      counts,
      runs: [...runs.values()].map(runRow),
      baseline: session.data.baseline,
      headNow,
      newestIde,
      resume: look.length ? { index: at, total: look.length, out: look[at].out } : null,
      exists,
    });
  }
  function detail(out, wanted) {
    const m = model();
    const p = m.pictures.find((q) => q.out === out);
    if (!p) return null;
    let filter = wanted;
    let list = filterPictures(m.pictures, filter, filterOptions);
    let place = neighbours(list, out);
    if (place.index < 0) {
      filter = "all";
      list = m.pictures;
      place = neighbours(list, out);
    }
    if (filter === "look") session.setPlace(out);
    const file = (src, bytes) => (bytes ? { src, size: sizeOf(bytes) } : null);
    const n = p.png?.run;
    const files = {
      head: file(hrefs.head(out), revision.bytes(out)),
      capture: p.png?.capture ? file(hrefs.run(n, p.png.capture), readIf(stageFile(n, p.png.capture))) : null,
      reference: p.png?.against ? file(hrefs.reference(n, out), referenceBytes(n, out)) : null,
      svgPng: null,
      svg: null,
    };
    if (p.svg) {
      const s = p.svg.run;
      const capture = verdictOf(s, out)?.png?.capture;
      files.svgPng = capture
        ? file(hrefs.run(s, capture), readIf(stageFile(s, capture)))
        : file(hrefs.docs(out), readIf(path.join(docsRoot, out)));
      if (p.svg.svg) files.svg = { src: hrefs.run(s, p.svg.svg), size: null };
      else if (exists(svgOf(out))) files.svg = { src: hrefs.docs(svgOf(out)), size: null };
    }
    const e = entry(out);
    return detailHtml({
      p,
      filter,
      place: { index: place.index, total: list.length },
      prev: place.prev,
      next: place.next,
      files,
      maps: {
        png: p.png?.strength ? hrefs.map(n, "png", out) : null,
        svg: p.svg?.strength ? hrefs.map(p.svg.run, "svg", out) : null,
      },
      rules: { png: pngRule(e), svg: svgRule(e) },
      build: e?.build ?? null,
      baseline: session.data.baseline,
    });
  }

  // ---- answering ----
  let port = null;
  const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);
  const hostAllowed = (host) => {
    const m = /^(.+):(\d+)$/.exec(host ?? "");
    return !!m && LOOPBACK.has(m[1].toLowerCase()) && Number(m[2]) === port;
  };
  const send = (res, status, type, body, headers = {}) => {
    res.writeHead(status, {
      "content-type": type,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
      ...headers,
    });
    res.end(body);
  };
  const notFound = (res, what = "not found") => send(res, 404, "text/plain; charset=utf-8", `${what}\n`);
  const sendFile = (req, res, name, bytes) => {
    if (!bytes) return notFound(res);
    const type = TYPES[path.extname(name).toLowerCase()];
    if (!type) return notFound(res);
    send(res, 200, type, req.method === "HEAD" ? undefined : bytes, {
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:",
    });
  };
  const page = (req, res, html) => send(res, 200, "text/html; charset=utf-8", req.method === "HEAD" ? undefined : html);

  function handle(req, res) {
    if (!hostAllowed(req.headers.host)) return send(res, 403, "text/plain", "only the loopback address is answered\n");
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "text/plain", "read-only\n");
    const url = new URL(req.url, "http://127.0.0.1");
    let segs;
    try {
      segs = url.pathname.split("/").slice(1).map(decodeURIComponent);
    } catch {
      return notFound(res);
    }
    const filter = FILTERS.some(([k]) => k === url.searchParams.get("filter")) ? url.searchParams.get("filter") : "all";
    const [first, ...rest] = segs;
    if (url.pathname === "/") return page(req, res, overview(filter));
    if (url.pathname === hrefs.events) return sse.handle(req, res);
    if (first === "picture") {
      const out = rest.join("/");
      const html = isDocsPath(out) ? detail(out, filter) : null;
      return html ? page(req, res, html) : notFound(res, `${out} is not a picture of this session`);
    }
    if (first === "log") {
      const n = Number(rest[0]);
      const log = runs.has(n) ? readIf(runPaths(session.root, n).log) : null;
      return log ? send(res, 200, "text/plain; charset=utf-8", log) : notFound(res);
    }
    if (first === "api" && rest[0] === "state" && rest.length === 1) {
      const m = model();
      return send(
        res,
        200,
        "application/json",
        JSON.stringify({ baseline: session.data.baseline, runs: [...runs.values()].map(runRow), pictures: m.pictures }),
      );
    }
    if (first === "file") {
      const [kind, ...more] = rest;
      if (kind === "head" || kind === "docs") {
        const out = more.join("/");
        if (!isDocsPath(out)) return notFound(res);
        return sendFile(req, res, out, kind === "head" ? revision.bytes(out) : readIf(path.join(docsRoot, out)));
      }
      const n = Number(more[0]);
      const rel = more.slice(1).join("/");
      if (!runs.has(n) || !rel || rel.split("/").some((s) => s === "" || s === ".." || s.includes("\\")))
        return notFound(res);
      if (kind === "run") return sendFile(req, res, rel, readIf(stageFile(n, rel)));
      if (kind === "ref" && isDocsPath(rel)) return sendFile(req, res, rel, referenceBytes(n, rel));
      return notFound(res);
    }
    if (first === "map") {
      const [nText, part, ...more] = rest;
      const out = more.join("/");
      if (!runs.has(Number(nText)) || (part !== "png" && part !== "svg") || !isDocsPath(out)) return notFound(res);
      let bytes;
      try {
        bytes = mapBytes(Number(nText), part, out);
      } catch (e) {
        return send(res, 500, "text/plain; charset=utf-8", `the map could not be drawn: ${e.message}\n`);
      }
      return sendFile(req, res, "map.png", bytes);
    }
    return notFound(res);
  }

  const server = createServer((req, res) => {
    try {
      handle(req, res);
    } catch (e) {
      if (!res.headersSent) send(res, 500, "text/plain; charset=utf-8", `${e.stack ?? e}\n`);
      else res.end();
    }
  });
  return {
    server,
    listen(wanted = 0, host = "127.0.0.1") {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(wanted, host, () => {
          server.off("error", reject);
          port = server.address().port;
          resolve(port);
        });
      });
    },
    start,
    live,
    model,
    close() {
      sse.close();
      const closed = new Promise((resolve) => server.close(() => resolve()));
      server.closeAllConnections();
      return closed;
    },
  };
}
