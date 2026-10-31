// The screenshot review tool's pages (WIP.ShotReview.md, The pages): the overview, every
// picture of the session as a card in its group, and the detail page of one picture, made of
// the pieces in shot-views.mjs. Each page is whole HTML; a page keeps itself current by
// fetching itself again when the server says over its event stream that something it shows
// has changed. Its actions (a decision, an allowance, the session moved to HEAD) are POSTs of
// JSON to the server, which applies them and says so over the same stream.
//
// Every address the pages link to is made here (hrefs), and the server answers each.

import { anchor, chipHtml, esc, pageHtml, sizeText } from "./shot-views.mjs";
import { FILTERS, GROUPS } from "./shot-review.mjs";
import { pngRule, svgRule } from "./shot-policy.mjs";
import { SURVIVES } from "./shot-queue.mjs";

/** The generator the tool's pages name in their <meta>. */
export const REVIEW_GENERATOR = "scripts/shot_review.mjs";

/** A path with forward slashes as a URL path, each segment encoded. */
export const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

const query = (filter) => (filter && filter !== "all" ? `?filter=${encodeURIComponent(filter)}` : "");

/** The addresses the server answers. */
export const hrefs = {
  overview: (filter) => `/${query(filter)}`,
  picture: (out, filter) => `/picture/${encodePath(out)}${query(filter)}`,
  /** A file as the session's baseline commit has it. */
  head: (out) => `/file/head/${encodePath(out)}`,
  /** A file under docs/ as it is now. */
  docs: (out) => `/file/docs/${encodePath(out)}`,
  /** A file of the stage of the run `n`, `rel` its name in the stage (as a verdict names it). */
  run: (n, rel) => `/file/run/${n}/${encodePath(rel)}`,
  /** The picture the run `n` judged its capture of `out` against. */
  reference: (n, out) => `/file/ref/${n}/${encodePath(out)}`,
  /** The PNG `out` as the run `n`'s layer found it, before its verdict was applied. */
  held: (n, out) => `/file/held/${n}/${encodePath(out)}`,
  /** The difference map of the run `n`'s capture of `out` ("png") or of its SVG ("svg"). */
  map: (n, part, out) => `/map/${n}/${part}/${encodePath(out)}`,
  /** The difference map of a picture changed outside the session's runs, against the baseline's. */
  outsideMap: (out) => `/map/outside/${encodePath(out)}`,
  log: (n) => `/log/${n}`,
  events: "/events",
  /** POST: a review's action on a picture (shot-server.mjs's act). */
  act: (out) => `/api/picture/${encodePath(out)}`,
  /** POST: the session moved to HEAD. */
  moveBaseline: "/api/baseline",
};

const REVIEW_STYLE = `<style>
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:8px 0 16px}
.card{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:8px;margin:0}
.card img{display:block;max-width:100%;max-height:150px;margin:0 auto 6px;border:1px solid var(--line);background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px}
.card h3{font-size:13px;margin:0 0 4px}
.chip{display:inline-block;font-size:12px;line-height:1.5;padding:0 7px;border-radius:9px;border:1px solid var(--line);margin:2px 4px 0 0}
.chip.look{border-color:#c80;color:#c80}.chip.fail{border-color:var(--bar);color:var(--bar)}
.chip.progress{border-style:dashed}.chip.review{border-color:var(--link);color:var(--link)}.chip.change{font-weight:600}
nav.filters a,nav.pager a{margin-right:14px}nav a[aria-current]{font-weight:700;color:var(--fg)}
nav.pager{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 0}nav.pager .where{margin-right:14px;color:var(--mut)}
.notice{border-left:4px solid #c80;padding:4px 10px;margin:8px 0}
.compare .view{display:none}.compare[data-mode=side] .side{display:flex}.compare[data-mode=swipe] .swipe,.compare[data-mode=blink] .blink,.compare[data-mode=map] .mapview{display:block}
.modes{margin-bottom:8px}.modes button{font:inherit;padding:2px 10px}.modes button[aria-pressed=true]{font-weight:700}
.pic,.stack{position:relative;display:inline-block;max-width:100%;vertical-align:top}
.pic img,.stack img{display:block;max-width:100%;height:auto;background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px}
.stack img.top{position:absolute;left:0;top:0}.swipe .stack img.top{clip-path:inset(0 0 0 var(--x,50%))}.blink .stack.old img.top{visibility:hidden}
.swipe input{display:block;width:100%;max-width:600px}
.box{position:absolute;box-sizing:border-box;border:2px solid #0bf;pointer-events:none}.box.fringe{border-style:dashed;opacity:.6}
.ignore{position:absolute;background:#08f3;outline:1px dashed #08f;pointer-events:none}
.loupes{display:flex;flex-wrap:wrap;gap:16px}.loupe figure{margin:0}.loupe .pair{display:flex;gap:4px}
.loupe .crop{border:1px solid var(--line);background-repeat:no-repeat;image-rendering:pixelated}
dl.facts{display:grid;grid-template-columns:max-content 1fr;gap:2px 14px;margin:6px 0}dl.facts dt{color:var(--mut)}dl.facts dd{margin:0}
section.muted{opacity:.55}
.actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}.actions button,form.allow button{font:inherit;padding:3px 12px}
.actions button[aria-pressed=true]{font-weight:700;outline:2px solid var(--link)}
.status{color:var(--mut);font-size:13px}.status.err{color:var(--bar)}
form.allow fieldset{border:1px solid var(--line);border-radius:6px;margin:0 0 10px;padding:6px 10px}
form.allow label{display:inline-block;margin:2px 14px 2px 0}form.allow input[type=number]{width:6em}
form.allow textarea{width:100%;max-width:600px;font:12px var(--mono,monospace)}
.draw{cursor:crosshair;user-select:none}.draw .new{position:absolute;box-sizing:border-box;border:2px dashed #08f;pointer-events:none}
</style>`;

// The page's script: the event stream, the page fetched again when something it shows has
// changed, the comparison's modes, and the keys j and k for the next and previous picture.
const REVIEW_SCRIPT = `<script>
(() => {
  let blink = null;
  const setMode = (c, m) => {
    c.dataset.mode = m;
    for (const b of c.querySelectorAll("[data-set]")) b.setAttribute("aria-pressed", String(b.dataset.set === m));
    clearInterval(blink);
    if (m === "blink") { const s = c.querySelector(".blink .stack"); blink = setInterval(() => s.classList.toggle("old"), 600); }
    try { sessionStorage.setItem("shot-review-mode", m); } catch {}
  };
  const init = () => {
    const c = document.querySelector(".compare");
    if (!c) return;
    let m = null;
    try { m = sessionStorage.getItem("shot-review-mode"); } catch {}
    if (m && c.querySelector('[data-set="' + m + '"]')) setMode(c, m);
    for (const b of c.querySelectorAll("[data-set]")) b.onclick = () => setMode(c, b.dataset.set);
    const r = c.querySelector(".swipe input");
    if (r) r.oninput = () => c.style.setProperty("--x", r.value + "%");
  };
  const refresh = async () => {
    const res = await fetch(location.href, { cache: "no-store" });
    if (!res.ok) return;
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const y = scrollY;
    document.body.replaceWith(doc.body);
    init();
    draws();
    scrollTo(0, y);
  };
  let timer = null;
  const live = () => {
    const es = new EventSource(${JSON.stringify(hrefs.events)});
    es.addEventListener("update", (e) => {
      const d = JSON.parse(e.data);
      const me = document.body.dataset.out;
      if (me && !(d.outs || []).includes(me)) return;
      clearTimeout(timer);
      timer = setTimeout(refresh, 400);
    });
  };
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select")) return;
    const rel = { j: "next", k: "prev" }[e.key];
    const a = rel && document.querySelector('a[rel="' + rel + '"]');
    if (a) location.href = a.href;
  });
  // An action: a POST of JSON, its progress and any failure said beside the buttons, the page
  // fetched again once it is applied.
  const say = (from, text, err) => {
    const s = (from.closest("[data-acts]") || document).querySelector(".status");
    if (!s) return;
    s.textContent = text;
    s.classList.toggle("err", !!err);
  };
  const controls = () => document.querySelectorAll("button[data-act], form.allow button");
  const post = async (url, body, from) => {
    say(from, "applying...");
    for (const b of controls()) b.disabled = true;
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || res.statusText);
      await refresh();
    } catch (e) {
      for (const b of controls()) b.disabled = false;
      say(from, e.message, true);
    }
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("button[data-act]");
    if (!b) return;
    e.preventDefault();
    post(b.dataset.url, JSON.parse(b.dataset.act), b);
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest?.("form.allow");
    if (!f) return;
    e.preventDefault();
    const v = (n) => f.elements[n].value.trim();
    const body = e.submitter && e.submitter.value === "defaults"
      ? { action: "allowance", png: {}, svg: {} }
      : {
          action: "allowance",
          png: { levels: v("pngLevels"), share: v("pngShare"), ignore: v("pngIgnore") },
          svg: { levels: v("svgLevels"), share: v("svgShare"), ignore: v("svgIgnore") },
        };
    post(f.getAttribute("action"), body, f);
  });
  // A rectangle drawn on a picture by dragging, in its device pixels, added to its list.
  const draws = () => {
    for (const d of document.querySelectorAll(".draw")) {
      const img = d.querySelector("img");
      const list = document.getElementById(d.dataset.target);
      const W = Number(d.dataset.w);
      const H = Number(d.dataset.h);
      let start = null;
      let box = null;
      const at = (e) => {
        const r = img.getBoundingClientRect();
        const clamp = (v, most) => Math.max(0, Math.min(most, Math.round(v)));
        return [clamp(((e.clientX - r.left) / r.width) * W, W), clamp(((e.clientY - r.top) / r.height) * H, H)];
      };
      const rect = (e) => {
        const [x, y] = at(e);
        return [Math.min(x, start[0]), Math.min(y, start[1]), Math.max(x, start[0]), Math.max(y, start[1])];
      };
      d.onpointerdown = (e) => {
        e.preventDefault();
        start = at(e);
        box = document.createElement("i");
        box.className = "new";
        d.append(box);
        d.setPointerCapture(e.pointerId);
      };
      d.onpointermove = (e) => {
        if (!start) return;
        const [x0, y0, x1, y1] = rect(e);
        Object.assign(box.style, { left: (x0 / W) * 100 + "%", top: (y0 / H) * 100 + "%", width: ((x1 - x0) / W) * 100 + "%", height: ((y1 - y0) / H) * 100 + "%" });
      };
      d.onpointerup = (e) => {
        if (!start) return;
        const r = rect(e);
        start = null;
        if (r[2] - r[0] < 2 || r[3] - r[1] < 2) {
          box.remove();
          return;
        }
        list.value = (list.value.trim() ? list.value.trim() + "\\n" : "") + "[" + r.join(", ") + "]";
      };
    }
  };
  document.addEventListener("DOMContentLoaded", () => { init(); draws(); live(); });
})();
</script>`;

const HEAD = `${REVIEW_STYLE}\n${REVIEW_SCRIPT}\n`;

// ---- chips ----------------------------------------------------------------------------

const PNG_STATES = {
  new: "new",
  updated: "updated",
  unchanged: "unchanged",
  noise: "only noise",
  restored: "restored as HEAD has it",
  dark: "the dark picture's pixels",
  once: "taken once: the light file goes",
};

/** What the tool decided about a picture's PNG, as a few words. */
export const pngStateText = (png) => PNG_STATES[png.state] ?? png.state;

/** What the tool decided about a picture's SVG, as a few words. */
export function svgStateText(svg) {
  if (svg.state === "not written") return svg.faithful === false ? "refused" : "none";
  if (svg.state === "removed") return "removed";
  if (svg.state === "unchanged") return "unchanged";
  return `${svg.state}${svg.faithful === null ? "" : ", accepted"}`;
}

/**
 * A button that POSTs `act` (JSON) to `url`, `pressed` true or false for one of a choice, or
 * null. The page's script sends it (REVIEW_SCRIPT).
 */
export const actionButton = (label, url, act, { pressed = null, title = "" } = {}) =>
  `<button type="button" data-url="${esc(url)}" data-act="${esc(JSON.stringify(act))}"${pressed === null ? "" : ` aria-pressed="${pressed}"`}${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</button>`;

/** A row of actions, with the place their progress and failures are said. */
const actionsHtml = (buttons) =>
  `<div class="actions" data-acts>${buttons.join("")}<span class="status" role="status"></span></div>`;

/** The chips of a picture `p` (reviewPictures'): its state, and why it needs a look. */
export function chipsOf(p) {
  const chips = [];
  if (p.outside) chips.push(chipHtml(`changed outside the runs: ${p.outside}`, "change"));
  if (p.progress) chips.push(chipHtml("in progress", "progress"));
  if (p.failed) chips.push(chipHtml("failed", "fail", p.failed.error));
  if (p.retake) chips.push(chipHtml("needs a retake", "fail", p.retake.why));
  if (!p.png && !p.svg && !p.failed && !p.retake && !p.progress && !p.outside)
    chips.push(
      p.skipped
        ? chipHtml("not taken", "fail", `run ${p.skipped} was stopped first`)
        : chipHtml("no verdict", "fail", "the run ended before it reported this picture"),
    );
  if (p.png) {
    const change = p.png.state === "updated" || p.png.state === "new";
    chips.push(
      chipHtml(
        `PNG: ${pngStateText(p.png)}`,
        p.png.by === "decision" ? "review" : change ? "change" : "",
        p.png.by === "decision" ? "as a review decided" : "",
      ),
    );
    if (p.png.look) chips.push(chipHtml(`PNG: ${p.png.look.why}`, "look", p.png.look.text));
  }
  if (p.svg) {
    chips.push(
      chipHtml(
        `SVG: ${svgStateText(p.svg)}`,
        p.svg.by === "decision" ? "review" : "",
        p.svg.why ?? p.svg.measures ?? "",
      ),
    );
    if (p.svg.look) chips.push(chipHtml(`SVG: ${p.svg.look.why}`, "look", p.svg.look.text));
  }
  return chips.join("");
}

// ---- the overview ---------------------------------------------------------------------

/** The thumbnail of a picture `p`: the run's capture when it staged one, else the file under docs/ when `exists`. */
export function thumbOf(p, exists) {
  if (p.png?.capture) return hrefs.run(p.png.run, p.png.capture);
  return exists(p.out) ? hrefs.docs(p.out) : null;
}

const cardOf = (p, filter, exists) => {
  const thumb = thumbOf(p, exists);
  const link = hrefs.picture(p.out, filter);
  return `<article class="card" id="${anchor(p.out)}">
${thumb ? `<a href="${link}"><img src="${thumb}" loading="lazy" alt="${esc(p.out)}"></a>` : ""}<h3><a href="${link}">${esc(p.out)}</a></h3>
<p class="chips">${chipsOf(p)}</p>
</article>`;
};

const runState = (r) => {
  if (r.live) return r.stopping ? "stopping" : "running";
  if (r.interrupted) return "interrupted: the tool closed while it ran";
  if (r.stopped) return `stopped, exit ${r.exit}`;
  return `ended, exit ${r.exit}`;
};

const runsHtml = (runs) =>
  runs.length
    ? `<h2>Runs</h2>
<table>
<tr><th>Run</th><th>State</th><th>Pictures</th><th>The same as</th></tr>
${[...runs]
  .reverse()
  .map(
    (r) =>
      `<tr><td>${r.n}</td><td>${esc(runState(r))}</td><td>${r.done} of ${r.listed}</td><td><code>${esc(r.command)}</code> (<a href="${hrefs.log(r.n)}">log</a>)</td></tr>`,
  )
  .join("\n")}
</table>`
    : `<p class="notice">No run yet. Start the tool with <code>--retake &lt;regex&gt;</code> or <code>--replay &lt;regex&gt;</code> to start one.</p>`;

/**
 * The overview: `groups` reviewPictures' groups, with only the pictures the filter shows;
 * `filter` its key; `counts` how many pictures each filter shows ({all, look, overridden,
 * nosvg}); `runs` [{n, command, live, stopping, interrupted, stopped, exit, done, listed}],
 * oldest first; `baseline` the session's ({hash, short, build, moved}); `headNow` HEAD's short
 * hash when it is no longer the baseline, else null, and `canMove` whether the session can be
 * moved to it; `newestIde` the newest install's build, or null; `resume` {index, total, out}
 * for the queue's place, or null; `exists(path)` whether a file is under docs/.
 */
export function overviewHtml({
  groups,
  filter,
  counts,
  runs,
  baseline,
  headNow,
  canMove = false,
  newestIde,
  resume,
  exists,
}) {
  const shown = groups.filter((g) => g.pictures.length);
  const filters = FILTERS.map(
    ([key, label]) =>
      `<a href="${hrefs.overview(key)}"${key === filter ? ' aria-current="page"' : ""}>${esc(label)} (${counts[key] ?? 0})</a>`,
  ).join("");
  const resumeLink = resume
    ? `<p><a href="${hrefs.picture(resume.out, "look")}">Resume at ${resume.index + 1} of ${resume.total}</a> in Needs a look</p>`
    : "";
  const notices = [];
  if (headNow)
    notices.push(
      `HEAD is now ${esc(headNow)}: this session compares with its baseline, ${esc(baseline.short)}, until it is committed or moved.${
        canMove
          ? ` Moving it makes ${esc(headNow)} the baseline; a verdict judged against ${esc(baseline.short)}'s picture goes back to Needs a look.${actionsHtml(
              [actionButton(`Move the session to ${headNow}`, hrefs.moveBaseline, { action: "move" })],
            )}`
          : ""
      }`,
    );
  if (baseline.moved)
    notices.push(
      `The session was moved to ${esc(baseline.short)} from ${esc(baseline.moved.from)} on ${esc(baseline.moved.at)}.`,
    );
  if (newestIde && baseline.build && newestIde > baseline.build)
    notices.push(`BETA ${newestIde} found: the baseline's pictures were taken on BETA ${baseline.build} at newest.`);
  const group = (g) => {
    const cards = `<div class="cards">
${g.pictures.map((p) => cardOf(p, filter, exists)).join("\n")}
</div>`;
    const heading = `${esc(g.title)} (${g.pictures.length})`;
    return g.key === "unchanged"
      ? `<details id="g-${g.key}"><summary><h2 style="display:inline">${heading}</h2></summary>
${cards}
</details>`
      : `<h2 id="g-${g.key}">${heading}</h2>
${cards}`;
  };
  return pageHtml({
    generator: REVIEW_GENERATOR,
    title: "Screenshot review",
    head: HEAD,
    intro: `Every picture this session's runs took or drew, against the baseline ${esc(baseline.short)}${baseline.build ? ` (its pictures taken on BETA ${baseline.build} at newest)` : ""}, and every other picture under docs that differs from it. Each verdict is applied under docs as it arrives, and again when a review decides otherwise.`,
    summary: shown.map((g) => [g.title, g.pictures.length]),
    contents: shown.map((g) => `<li><a href="#g-${g.key}">${esc(g.title)}</a> (${g.pictures.length})</li>`).join("\n"),
    body: `${notices.map((n) => `<div class="notice">${n}</div>`).join("\n")}
<nav class="filters">${filters}</nav>
${resumeLink}${runsHtml(runs)}
${shown.length ? shown.map(group).join("\n") : "<p>No picture.</p>"}`,
  });
}

// ---- the detail page ------------------------------------------------------------------

const pct = (n) => `${+(n * 100).toFixed(3)}%`;

// A box over a picture of `size` ([w, h] device pixels) at the rectangle {x0, y0, x1, y1}, in percent.
const boxStyle = (r, [w, h]) =>
  `left:${(r.x0 / w) * 100}%;top:${(r.y0 / h) * 100}%;width:${((r.x1 - r.x0) / w) * 100}%;height:${((r.y1 - r.y0) / h) * 100}%`;

/** A picture at half its size in device pixels (the pictures are 2x), with `overlay` (HTML) over it. */
const picHtml = (src, size, alt, overlay = "") =>
  `<span class="pic"><img src="${src}" alt="${esc(alt)}"${size ? ` width="${Math.round(size[0] / 2)}" height="${Math.round(size[1] / 2)}"` : ""}>${overlay}</span>`;

const figureHtml = (src, size, caption, overlay = "") =>
  `<figure>${picHtml(src, size, caption, overlay)}<figcaption>${esc(caption)}</figcaption></figure>`;

/** The boxes of `regions` and the rectangles left out (`rects`) over a picture of `size`. */
function overlayOf(regions, rects, size) {
  if (!size) return "";
  const boxes = (regions ?? []).map(
    (r) =>
      `<i class="box${r.core >= SURVIVES ? "" : " fringe"}" style="${boxStyle(r, size)}" title="${r.pixels} px changed, ${r.core} px of core"></i>`,
  );
  const ignored = (rects ?? []).map((r) => `<i class="ignore" style="${boxStyle(r, size)}" title="left out"></i>`);
  return [...boxes, ...ignored].join("");
}

// How much a loupe enlarges: up to 4 times the picture's device pixels, at most 360 by 240 CSS px.
const LOUPE_PAD = 6;
const zoomOf = (w, h) => Math.max(0.5, Math.min(4, 360 / w, 240 / h));

/**
 * A loupe for each region of `regions` that survives (or the first four when none does): the
 * region cropped and enlarged from the picture `before` and the picture `after` ({src,
 * label}), both of `size`.
 */
export function loupesHtml(regions, size, before, after) {
  if (!regions?.length || !size) return "";
  const kept = regions.filter((r) => r.core >= SURVIVES);
  const list = (kept.length ? kept : regions.slice(0, 4)).slice(0, 12);
  const [W, H] = size;
  const crop = (src, r, label) => {
    const x0 = Math.max(0, r.x0 - LOUPE_PAD);
    const y0 = Math.max(0, r.y0 - LOUPE_PAD);
    const x1 = Math.min(W, r.x1 + LOUPE_PAD);
    const y1 = Math.min(H, r.y1 + LOUPE_PAD);
    const z = zoomOf(x1 - x0, y1 - y0);
    const px = (n) => `${+(n * z).toFixed(2)}px`;
    return `<span class="crop" role="img" aria-label="${esc(label)}" style="width:${px(x1 - x0)};height:${px(y1 - y0)};background-image:url('${src}');background-size:${px(W)} ${px(H)};background-position:${px(-x0)} ${px(-y0)}"></span>`;
  };
  return `<div class="loupes">
${list
  .map(
    (r) =>
      `<figure class="loupe"><div class="pair">${crop(before.src, r, before.label)}${crop(after.src, r, after.label)}</div><figcaption>${esc(before.label)} | ${esc(after.label)}: ${r.x1 - r.x0} x ${r.y1 - r.y0} px at ${r.x0}, ${r.y0}; ${r.pixels} px changed, ${r.core} px of core${r.core >= SURVIVES ? "" : " (a fringe)"}</figcaption></figure>`,
  )
  .join("\n")}
</div>`;
}

const factsHtml = (facts) =>
  `<dl class="facts">${facts
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
    .join("")}</dl>`;

const rectsText = (rects) =>
  rects.length ? rects.map((r) => `[${r.x0}, ${r.y0}, ${r.x1}, ${r.y1}]`).join(", ") : "none";

const AGAINST = { revision: "HEAD", disk: "the file", dark: "the dark picture" };

// The pager of a picture's page: the overview, its neighbours in the list it was opened from,
// and its place there.
function pagerHtml({ p, filter, place, prev, next }) {
  const filterLabel = (FILTERS.find(([k]) => k === filter) ?? FILTERS[0])[1];
  const groupTitle = (GROUPS.find(([k]) => k === p.group) ?? [null, p.group])[1];
  return `<nav class="pager"><a href="${hrefs.overview(filter)}#${anchor(p.out)}">Overview</a>${
    prev ? `<a rel="prev" href="${hrefs.picture(prev.out, filter)}">Previous (k)</a>` : ""
  }<span class="where">${place.index + 1} of ${place.total} · ${esc(filter === "all" ? groupTitle : filterLabel)}</span>${
    next ? `<a rel="next" href="${hrefs.picture(next.out, filter)}">Next (j)</a>` : ""
  }</nav>`;
}

const written = (state) => state === "new" || state === "updated";

// What the file holds once a PNG verdict is applied, as a few words.
const HOLDS = {
  new: "the new capture",
  updated: "the new capture",
  unchanged: "the picture it held, which the capture equals",
  noise: "the picture it held: the capture is within noise of it",
  restored: "HEAD's picture",
  dark: "nothing: the page shows the dark picture",
  once: "nothing: the picture is taken once",
};

/**
 * The page of a picture changed outside the session's runs (reviewPictures' `outside`): the
 * baseline's picture against the file, and no verdict. `files` {head, docs}, each {src, size}
 * or null; `map` the difference map's address, or null; the rest as detailHtml's.
 */
export function outsideHtml({ p, filter, place, prev, next, files, map, baseline }) {
  const size = files.docs?.size ?? files.head?.size ?? null;
  const figs = [];
  if (files.head) figs.push(figureHtml(files.head.src, files.head.size, `HEAD (${baseline.short})`));
  if (files.docs) figs.push(figureHtml(files.docs.src, files.docs.size, "The file"));
  if (map)
    figs.push(
      figureHtml(
        map,
        size,
        "Difference (yellow: 1 grey level, shading to red at 128 or more; cyan and magenta: only in one)",
      ),
    );
  const body = `${pagerHtml({ p, filter, place, prev, next })}
<p class="meta">${esc(sizeText(size))}; ${chipsOf(p)}</p>
<p class="notice">No run of this session reported this picture: its file is ${esc(p.outside)} against the baseline, ${esc(baseline.short)} (a retake from a terminal, or an edit). It has no verdict to override; a retake of it through this tool judges it.</p>
<div class="trio">${figs.join("\n")}</div>`;
  return pageHtml({
    generator: REVIEW_GENERATOR,
    title: p.out,
    head: HEAD,
    intro: "Changed outside the session's runs.",
    body,
  }).replace("<body>", `<body data-out="${esc(p.out)}">`);
}

/**
 * The allowances of a picture, as a form: the PNG's noise rule and the SVG's bar, each with its
 * rectangles left out, which are drawn on `pngPic` and `svgPic` ({src, size}) by dragging.
 * Empty fields are the defaults, which the placeholders show.
 */
function allowanceHtml(url, entry, pngPic, svgPic) {
  const dp = pngRule(null);
  const ds = svgRule(null);
  const noise = entry?.png?.noise ?? {};
  const bar = entry?.svg?.bar ?? {};
  const rectLines = (list) => (list ?? []).map((r) => `[${r.join(", ")}]`).join("\n");
  const toRects = (list) => (list ?? []).map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 }));
  const drawOn = (pic, id, rects) =>
    pic?.size
      ? `<p class="meta">Drag on the picture to add a rectangle.</p><span class="pic draw" data-target="${id}" data-w="${pic.size[0]}" data-h="${pic.size[1]}"><img src="${pic.src}" alt="Where a rectangle is drawn" width="${Math.round(pic.size[0] / 2)}" height="${Math.round(pic.size[1] / 2)}" draggable="false">${overlayOf(null, toRects(rects), pic.size)}</span>`
      : "";
  const field = (name, label, value, placeholder, attrs) =>
    `<label>${esc(label)} <input type="number" name="${name}" value="${value ?? ""}" placeholder="${placeholder}" ${attrs}></label>`;
  return `<section>
<h2>Allowances</h2>
<p>An allowance changes the rule for this picture alone, in this theme, until it is removed; the picture is judged again with it at once. Empty is the default.</p>
<form class="allow" action="${esc(url)}" data-acts>
<fieldset><legend>PNG: the noise rule</legend>
${field("pngLevels", "Levels", noise.levels, dp.levels, 'min="0" max="255" step="1"')}${field("pngShare", "Share (%)", noise.share, +(dp.share * 100).toFixed(4), 'min="0" max="100" step="any"')}
<label for="png-ignore">Rectangles left out, [x0, y0, x1, y1] in device pixels</label>
<textarea id="png-ignore" name="pngIgnore" rows="3">${esc(rectLines(entry?.png?.ignore))}</textarea>
${drawOn(pngPic, "png-ignore", entry?.png?.ignore)}
</fieldset>
<fieldset><legend>SVG: the bar</legend>
${field("svgLevels", "Levels", bar.levels, ds.levels, 'min="1" max="255" step="1"')}${field("svgShare", "Share (%)", bar.share, ds.share, 'min="0" max="100" step="any"')}
<label for="svg-ignore">Rectangles left out, [x0, y0, x1, y1] in device pixels</label>
<textarea id="svg-ignore" name="svgIgnore" rows="3">${esc(rectLines(entry?.svg?.ignore))}</textarea>
${drawOn(svgPic, "svg-ignore", entry?.svg?.ignore)}
</fieldset>
<button type="submit" value="apply">Apply the allowances</button> <button type="submit" value="defaults">Back to the defaults</button> <span class="status" role="status"></span>
</form>
</section>`;
}

/**
 * The detail page of one picture: `p` reviewPictures' picture; `filter` the filter it was
 * opened from, `place` {index, total, group} its place in that filter's list, `prev` and
 * `next` its neighbours there (pictures, or null); `files` {head, reference, capture, svgPng,
 * svg}, each {src, size} or null, and `maps` {png, svg}, each an address or null; `rules`
 * {png: pngRule, svg: svgRule} of its entry in the manifest, `entry` that entry (or null),
 * `build` the build the manifest records for its file, or null; `baseline` the session's;
 * `error` why the last application of its verdicts failed, or null.
 */
export function detailHtml({
  p,
  filter,
  place,
  prev,
  next,
  files,
  maps,
  rules,
  entry = null,
  build,
  baseline,
  error = null,
}) {
  const groupTitle = (GROUPS.find(([k]) => k === p.group) ?? [null, p.group])[1];
  const nav = pagerHtml({ p, filter, place, prev, next });
  const act = hrefs.act(p.out);
  const png = p.png;
  const svg = p.svg;
  const size = files.capture?.size ?? files.head?.size ?? null;
  const theme = /\.light\.png$/i.test(p.out) ? "light" : "dark";

  // The comparison: the picture judged against (or HEAD's), the capture, and the map.
  const before = files.reference ?? files.head;
  const beforeLabel = files.reference ? (AGAINST[png?.against] ?? "before") : `HEAD (${baseline.short})`;
  let compare = "";
  if (files.capture) {
    const side = [];
    if (files.head) side.push(figureHtml(files.head.src, files.head.size, `HEAD (${baseline.short})`));
    if (files.reference && png?.against !== "revision")
      side.push(figureHtml(files.reference.src, files.reference.size, AGAINST[png.against] ?? "judged against"));
    side.push(figureHtml(files.capture.src, files.capture.size, `New capture, run ${png.run}`));
    const stack = (cls) =>
      before
        ? `<div class="view ${cls}"><span class="stack"><img src="${before.src}" alt="${esc(beforeLabel)}"${before.size ? ` width="${Math.round(before.size[0] / 2)}"` : ""}><img class="top" src="${files.capture.src}" alt="New capture"></span>${cls === "swipe" ? `<input type="range" min="0" max="100" value="50" aria-label="Where the new capture starts">` : ""}<p class="meta">${esc(beforeLabel)} ${cls === "swipe" ? "on the left, the new capture on the right" : "and the new capture, in turn"}</p></div>`
        : "";
    const overlay = overlayOf(png.regions, rules.png.rects, size);
    compare = `<section class="compare" data-mode="side">
<div class="modes">${[
      ["side", "Side by side"],
      ["swipe", "Swipe"],
      ["blink", "Blink"],
      ["map", "Difference map"],
    ]
      .filter(([m]) => before || m === "side")
      .filter(([m]) => maps.png || m !== "map")
      .map(([m, label]) => `<button type="button" data-set="${m}" aria-pressed="${m === "side"}">${label}</button>`)
      .join("")}</div>
<div class="view side trio">${side.join("\n")}</div>
${stack("swipe")}
${stack("blink")}
${maps.png ? `<div class="view mapview">${figureHtml(maps.png, size, `Difference against ${beforeLabel} (yellow: 1 grey level, shading to red at 128 or more); boxes: the regions of change, dashed where nothing survives the erosion`, overlay)}</div>` : ""}
</section>`;
  } else if (files.head)
    compare = `<div class="trio">${figureHtml(files.head.src, files.head.size, `HEAD (${baseline.short})`)}</div>`;

  // The PNG row.
  let pngRow = "";
  if (png) {
    const rule = rules.png;
    const decided = png.by === "decision" ? (written(png.state) ? "new" : "old") : null;
    const choice =
      files.capture && png.state !== "failed" && png.state !== "once"
        ? actionsHtml([
            actionButton("Keep the old picture", act, { action: "png", keep: "old" }, { pressed: decided === "old" }),
            actionButton("Take the new capture", act, { action: "png", keep: "new" }, { pressed: decided === "new" }),
            ...(decided ? [actionButton("Back to the rule", act, { action: "png", keep: null })] : []),
          ])
        : "";
    pngRow = `<section>
<h2>PNG: ${esc(pngStateText(png))}</h2>
${png.look ? `<p class="notice">Needs a look: ${esc(png.look.text)}.</p>` : ""}${HOLDS[png.state] ? `<p>The file holds ${esc(HOLDS[png.state])}.</p>` : ""}${choice}${factsHtml(
  [
    ["Decided by", png.by === "decision" ? "a review's decision about these bytes" : "the rule"],
    ["Earlier decision", png.earlier ? esc(`a review kept the ${png.earlier} picture of other bytes`) : null],
    ["Judged against", png.against ? esc(AGAINST[png.against] ?? png.against) : "nothing: a new picture"],
    [
      "Regions of change",
      png.regionCount === null
        ? "not measured"
        : `${png.regionCount}, ${png.regions.filter((r) => r.core >= SURVIVES).length} surviving the erosion`,
    ],
    ["Taken on", png.build ? `BETA ${png.build}` : null],
    ["The file's build", build ? `BETA ${build}` : "unknown"],
    ["Noise levels", `${rule.levels}`],
    ["Noise share", pct(rule.share)],
    ["Left out", esc(rectsText(rule.rects))],
  ],
)}
${files.capture && before ? loupesHtml(png.regions, size, { src: before.src, label: beforeLabel }, { src: files.capture.src, label: "new" }) : ""}
</section>`;
  }

  // The SVG row.
  let svgRow = "";
  if (svg) {
    const rule = rules.svg;
    const svgSize = files.svgPng?.size ?? size;
    const restored = png?.state === "restored";
    const figs = [];
    if (files.svgPng) figs.push(figureHtml(files.svgPng.src, files.svgPng.size, "The PNG it is compared with"));
    if (files.svg) figs.push(figureHtml(files.svg.src, svgSize, "The SVG"));
    if (maps.svg)
      figs.push(
        figureHtml(
          maps.svg,
          svgSize,
          `Where the SVG is off the PNG; boxes: the regions at ${rule.levels} levels or more`,
          overlayOf(svg.regions, rule.rects, svgSize),
        ),
      );
    const accepted = svg.by === "decision" ? svg.faithful : null;
    const stays = !restored && svg.state === "unchanged" && svg.why && svg.faithful !== null;
    const choice = svg.svg
      ? actionsHtml([
          actionButton("Accept the SVG", act, { action: "svg", accept: true }, { pressed: accepted === true }),
          actionButton("No SVG", act, { action: "svg", accept: false }, { pressed: accepted === false }),
          ...(accepted === null ? [] : [actionButton("Back to the bar", act, { action: "svg", accept: null })]),
        ])
      : "";
    svgRow = `<section${restored ? ' class="muted"' : ""}>
<h2>SVG: ${esc(svgStateText(svg))}</h2>
${restored ? "<p>The PNG goes back to HEAD's, and its SVG goes back with it.</p>" : ""}${stays ? `<p>The SVG stays as it is (${esc(svg.why)}): it was judged all the same, and is written as judged if a review takes the capture.</p>` : ""}${svg.look ? `<p class="notice">Needs a look: ${esc(svg.look.text)}.</p>` : ""}${restored ? "" : choice}${factsHtml(
  [
    ["Run", `${svg.run}`],
    ["Decided by", svg.by === "decision" ? "a review's decision about these bytes" : svg.by ? "the rule" : null],
    [
      "Earlier decision",
      svg.earlier === null || svg.earlier === undefined
        ? null
        : `a review ${svg.earlier ? "accepted" : "refused"} an SVG of other bytes`,
    ],
    ["Why", svg.why ? esc(svg.why) : null],
    ["Off the PNG", svg.measures ? esc(svg.measures) : null],
    ["Share counted", svg.share === null ? null : `${svg.share}%`],
    ["Bar", `${rule.share}% of the pixels at ${rule.levels} levels or more`],
    ["Left out", esc(rectsText(rule.rects))],
  ],
)}
<div class="trio">${figs.join("\n")}</div>
${files.svgPng && files.svg ? loupesHtml(svg.regions, svgSize, { src: files.svgPng.src, label: "PNG" }, { src: files.svg.src, label: "SVG" }) : ""}
</section>`;
  }

  const notes = [];
  if (p.progress) notes.push("A run is taking or drawing this picture now.");
  if (p.failed) notes.push(`Run ${p.failed.run} failed on it: ${esc(p.failed.error)}`);
  if (p.retake) notes.push(`Run ${p.retake.run} could not draw it again: ${esc(p.retake.why)}`);
  if (p.skipped && !png && !svg) notes.push(`Run ${p.skipped} was stopped before it took this picture.`);
  if (error) notes.push(`Its verdict could not be applied: ${esc(error)}. Judge it again to try again.`);
  const judged = png || svg;
  const footer = judged
    ? `<section>
<h2>Judge again</h2>
<p>Judging again puts the picture back as each run found it and applies each run's verdict again, judged with the manifest as it is now and against the session's baseline, ${esc(baseline.short)}.</p>
${actionsHtml([
  actionButton("Judge it again", act, { action: "judge" }),
  actionButton("Back to the tool's verdicts", act, { action: "rule" }, { title: "remove this picture's decisions" }),
])}
</section>`
    : "";
  const svgPic = files.svgPng ?? null;
  const body = `${nav}
<p class="meta">${theme} theme, ${esc(sizeText(size))}; ${chipsOf(p)}</p>
${notes.map((n) => `<p class="notice">${n}</p>`).join("\n")}
${compare}
${pngRow}
${svgRow}
${judged ? allowanceHtml(act, entry, files.capture, svgPic) : ""}
${footer}`;
  return pageHtml({
    generator: REVIEW_GENERATOR,
    title: p.out,
    head: HEAD,
    intro: `In the group ${esc(groupTitle)}.`,
    body,
  }).replace("<body>", `<body data-out="${esc(p.out)}">`);
}
