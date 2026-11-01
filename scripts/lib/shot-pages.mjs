// The screenshot review tool's pages (WIP.ShotReview.md, The pages): the overview, every
// picture of the session as a card in its group, the detail page of one picture, the runs
// page and the commit page, made of the pieces in shot-views.mjs. Each page is whole HTML; a
// page keeps itself current by fetching itself again when the server says over its event
// stream that something it shows has changed. Its actions (a decision, an allowance, the
// session moved to HEAD, a run started or stopped, the commit) are POSTs of JSON to the server,
// which applies them and says so over the same stream.
//
// Every address the pages link to is made here (hrefs), and the server answers each.

import { allowancesOf, anchor, chipHtml, esc, pageHtml, sizeText } from "./shot-views.mjs";
import { FILTERS, GROUPS } from "./shot-review.mjs";
import { pngRule, svgRule } from "./shot-policy.mjs";
import { SURVIVES } from "./shot-queue.mjs";
import { RUN_KINDS } from "./shot-runs.mjs";

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
  /** The session's runs, and the forms that start one. */
  runs: "/runs",
  /** What a commit of the session takes, and its message. */
  commitPage: "/commit",
  /** POST: the session's own files committed ({message, files}), and the session closed. */
  commit: "/api/commit",
  events: "/events",
  /** POST: a review's action on a picture (shot-server.mjs's act). */
  act: (out) => `/api/picture/${encodePath(out)}`,
  /** POST: the session moved to HEAD ({action: "move"}), or back to the baseline the last move left ({action: "back"}). */
  moveBaseline: "/api/baseline",
  /** POST: a run started (shot-runs.mjs's runOf takes the body). */
  startRun: "/api/runs",
  /** POST: the run `n` stopped or ended ({action: "stop" | "kill"}). */
  runAct: (n) => `/api/run/${n}`,
};

const REVIEW_STYLE = `<style>
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:8px 0 16px}
.card{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:8px;margin:0}
.card img{display:block;max-width:100%;max-height:150px;margin:0 auto 6px;border:1px solid var(--line);background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px}
.card h3{font-size:13px;margin:0 0 4px}
.chip{display:inline-block;font-size:12px;line-height:1.5;padding:0 7px;border-radius:9px;border:1px solid var(--line);margin:2px 4px 0 0}
.chip.look{border-color:#c80;color:#c80}.chip.fail{border-color:var(--bar);color:var(--bar)}span.fail{color:var(--bar)}
.chip.progress{border-style:dashed}.chip.review{border-color:var(--link);color:var(--link)}.chip.change{font-weight:600}
nav.filters a,nav.pager a{margin-right:14px}nav a[aria-current]{font-weight:700;color:var(--fg)}
nav.pager{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 0}nav.pager .where{margin-right:14px;color:var(--mut)}
.notice{border-left:4px solid #c80;padding:4px 10px;margin:8px 0}
.compare .view{display:none}.compare[data-mode=side] .side{display:flex}.compare[data-mode=swipe] .swipe,.compare[data-mode=blink] .blink,.compare[data-mode=map] .mapview{display:block}
.modes{margin-bottom:8px}.modes button{font:inherit;padding:2px 10px}.modes button[aria-pressed=true]{font-weight:700}
.pic,.stack{position:relative;display:inline-block;max-width:100%;vertical-align:top}
.pic img,.stack img{display:block;max-width:100%;height:auto;background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/16px 16px}
.trio .pic img[style]{max-height:none;max-width:min(100%,calc(520px * var(--w) / var(--h)))}
.stack img{background:repeating-conic-gradient(color-mix(in srgb,#888 26.7%,var(--card)) 0 25%,var(--card) 0 50%) 0 0/16px 16px}
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
.card .pick{float:right;font-size:12px;color:var(--mut)}td code{overflow-wrap:anywhere}
.picked{position:sticky;top:0;background:var(--card);z-index:1}.picked button{font:inherit;padding:1px 10px}
form.run{border:1px solid var(--line);border-radius:6px;margin:0 0 12px;padding:6px 12px}form.run h3{margin:4px 0 6px}
form.run label{display:inline-block;max-width:100%;margin:2px 14px 6px 0}form.run input[type=number]{width:5em}
form.run input[type=text]{width:32em;max-width:100%;box-sizing:border-box}form.run button{font:inherit;padding:3px 12px}
article.run{border:1px solid var(--line);border-radius:6px;margin:0 0 12px;padding:6px 12px;overflow-wrap:anywhere}article.run h3{margin:4px 0}
ul.jobs{list-style:none;padding:0;margin:6px 0}ul.jobs li{margin:2px 0}ul.jobs progress,article.run>progress{width:200px;vertical-align:middle;margin-right:8px}
form.commit{margin:0 0 12px}form.commit label{display:block;margin:6px 0 2px}form.commit textarea{width:100%;max-width:900px;box-sizing:border-box;font:inherit}
form.commit button{font:inherit;padding:3px 12px}.status.err{white-space:pre-wrap}ul.left{columns:2 420px;padding-left:18px}
pre.log{max-height:20em;overflow:auto;font-size:12px;border:1px solid var(--line);padding:6px;margin:6px 0;white-space:pre-wrap;overflow-wrap:anywhere}
</style>`;

// The page's script: the event stream, the page fetched again when something it shows has
// changed (the values of a form marked data-keep kept, but a field still at its data-default,
// which takes the new page's), the comparison's modes, the keys j and → for the next picture
// and k and ← for the previous one, and the pictures selected on the overview, which the
// runs page's forms take in place of a pattern (kept in the browser, as a convenience).
const REVIEW_SCRIPT = `<script>
(() => {
  const PICKED = "shot-review-selected";
  const picked = () => {
    try { const v = JSON.parse(localStorage.getItem(PICKED) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
  };
  const showPicked = () => {
    const list = picked();
    for (const c of document.querySelectorAll("input[data-pick]")) c.checked = list.includes(c.dataset.pick);
    for (const bar of document.querySelectorAll(".picked")) {
      bar.hidden = !list.length;
      bar.title = list.join("\\n");
      const n = bar.querySelector(".count");
      if (n) n.textContent = list.length === 1 ? "1 picture selected" : list.length + " pictures selected";
    }
    for (const f of document.querySelectorAll("form.run")) if (f.elements.only) f.elements.only.disabled = list.length > 0;
  };
  const setPicked = (list) => {
    try { localStorage.setItem(PICKED, JSON.stringify(list)); } catch {}
    showPicked();
  };
  document.addEventListener("change", (e) => {
    const c = e.target.closest?.("input[data-pick]");
    if (!c) return;
    const list = picked().filter((o) => o !== c.dataset.pick);
    if (c.checked) list.push(c.dataset.pick);
    setPicked(list);
  });
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
    const kept = [];
    for (const f of document.querySelectorAll("form[data-keep][id]"))
      for (const el of f.elements)
        if (el.name && !(el.dataset.default !== undefined && el.value === el.dataset.default))
          kept.push([f.id, el.name, el.type === "checkbox" ? el.checked : el.value]);
    const a = document.activeElement;
    const focus = a?.form?.id && a.form.hasAttribute("data-keep") ? [a.form.id, a.name] : null;
    document.body.replaceWith(doc.body);
    for (const [id, name, v] of kept) {
      const el = document.getElementById(id)?.elements[name];
      if (!el) continue;
      if (el.type === "checkbox") el.checked = v;
      else el.value = v;
    }
    if (focus) document.getElementById(focus[0])?.elements[focus[1]]?.focus();
    init();
    draws();
    showPicked();
    defaults();
    scrollTo(0, y);
  };
  let timer = null;
  const update = (data) => {
    const d = JSON.parse(data);
    const me = document.body.dataset.out;
    // a picture's page follows its picture, and the runs, which its run buttons wait for
    if (me && !d.runs && !(d.outs || []).includes(me)) return;
    clearTimeout(timer);
    timer = setTimeout(refresh, 400);
  };
  // The event stream: one for every page of the tool in the browser, since the browser opens
  // six connections to the server at most and a stream holds one for as long as it is open.
  // The page that holds the lock holds the stream and passes each update to the others; when
  // it goes, the lock passes to another page. (A shared worker would be simpler, but in some
  // browsers one cannot reach the server.)
  const live = () => {
    const open = (pass) => {
      const es = new EventSource(${JSON.stringify(hrefs.events)});
      es.addEventListener("update", (e) => {
        update(e.data);
        pass?.(e.data);
      });
    };
    if (!navigator.locks || typeof BroadcastChannel !== "function") return open();
    const channel = new BroadcastChannel("shot-review-events");
    channel.onmessage = (e) => update(e.data);
    navigator.locks.request("shot-review-events", () => new Promise(() => open((d) => channel.postMessage(d))));
  };
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select")) return;
    // j and k as in vi and most lists of the web; the arrows for left and right on the keyboard
    const rel = { j: "next", k: "prev", ArrowRight: "next", ArrowLeft: "prev" }[e.key];
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
  const controls = () => document.querySelectorAll("button[data-act], form.allow button, form.run button, form.commit button");
  // A field with a default (the commit's message): its button that puts the default back is
  // enabled once the field differs from it.
  const defaults = () => {
    for (const el of document.querySelectorAll("[data-default]")) {
      const b = el.form?.querySelector("button[data-reset-message]");
      if (b) b.disabled = el.value === el.dataset.default;
    }
  };
  document.addEventListener("input", (e) => {
    if (e.target.matches?.("[data-default]")) defaults();
  });
  // A form may name its own progress text in data-busy (the commit's "committing...").
  const post = async (url, body, from) => {
    say(from, from.closest("[data-busy]")?.dataset.busy || "applying...");
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
    if (e.target.closest?.("button[data-clear-picked]")) return setPicked([]);
    const reset = e.target.closest?.("button[data-reset-message]");
    if (reset) {
      const el = reset.form.querySelector("[data-default]");
      el.value = el.dataset.default;
      defaults();
      return el.focus();
    }
    const b = e.target.closest?.("button[data-act]");
    if (!b) return;
    e.preventDefault();
    if (b.dataset.confirm && !confirm(b.dataset.confirm)) return;
    post(b.dataset.url, JSON.parse(b.dataset.act), b);
  });
  document.addEventListener("submit", (e) => {
    const k = e.target.closest?.("form.commit");
    if (k) {
      e.preventDefault();
      return post(k.getAttribute("action"), { message: k.elements.message.value, files: JSON.parse(k.dataset.files) }, k);
    }
    const r = e.target.closest?.("form.run");
    if (r) {
      e.preventDefault();
      const body = { kind: r.dataset.kind };
      for (const el of r.elements) {
        if (!el.name || el.disabled) continue;
        if (el.type === "checkbox") body[el.name] = el.checked;
        else if (el.value.trim() !== "") body[el.name] = el.value.trim();
      }
      if (r.hasAttribute("data-dry-run")) body.dryRun = true;
      const list = picked();
      if (list.length) body.pictures = list;
      return post(r.getAttribute("action"), body, r);
    }
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
  document.addEventListener("DOMContentLoaded", () => { init(); draws(); showPicked(); defaults(); live(); });
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
 * null; `confirm` a question the page asks first, `disabled` why it cannot be used now (its
 * title), or null. The page's script sends it (REVIEW_SCRIPT).
 */
export const actionButton = (label, url, act, { pressed = null, title = "", confirm = "", disabled = null } = {}) =>
  `<button type="button" data-url="${esc(url)}" data-act="${esc(JSON.stringify(act))}"${pressed === null ? "" : ` aria-pressed="${pressed}"`}${confirm ? ` data-confirm="${esc(confirm)}"` : ""}${disabled ? ` disabled title="${esc(disabled)}"` : title ? ` title="${esc(title)}"` : ""}>${esc(label)}</button>`;

// Why a run cannot be started while `busy` ({n, kind} a run, {commit: true} a commit) is under way, or null.
const busyText = (busy) =>
  busy
    ? busy.commit
      ? "the session is being committed: a new run starts once the commit has ended"
      : `run ${busy.n} is running: a new run starts once it has ended`
    : null;

// That the session is being committed, `committing` {message, at}, as the text of a notice.
const committingNotice = (committing) =>
  `Committing the session: <q>${esc(committing.message)}</q>. Its pictures cannot be changed and no run can start until the commit has ended, which takes a few seconds while the repository's hooks run.`;

// Why a replay of a picture's SVG would draw nothing: the bundle cache has no bundle of it
// (a staged run's bundle goes there only with an SVG the review writes).
const NO_BUNDLE =
  "the bundle cache has no bundle of this picture, so a replay would draw nothing: a retake makes one, and a run's SVG can be accepted on the SVG row";

/**
 * A retake of `out` and a replay of its SVG, as buttons on its page; `bundled` false when the
 * bundle cache has none of it.
 */
const runButtons = (out, busy, { replay = true, bundled = null } = {}) => [
  actionButton(
    "Retake this picture",
    hrefs.startRun,
    { kind: "retake", pictures: [out] },
    { disabled: busyText(busy) },
  ),
  ...(replay
    ? [
        actionButton(
          "Replay its SVG",
          hrefs.startRun,
          { kind: "replay", pictures: [out] },
          { disabled: busyText(busy) ?? (bundled === false ? NO_BUNDLE : null) },
        ),
      ]
    : []),
];

/** A row of actions, with the place their progress and failures are said. */
const actionsHtml = (buttons) =>
  `<div class="actions" data-acts>${buttons.join("")}<span class="status" role="status"></span></div>`;

/**
 * The chips of a picture `p` (reviewPictures'): its state, why it needs a look, and the
 * allowances of `entry`, its entry in the manifest (or null).
 */
export function chipsOf(p, entry = null) {
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
  const allowed = allowancesOf(entry);
  if (allowed.png) chips.push(chipHtml("PNG: allowance", "review", allowed.png));
  if (allowed.svg) chips.push(chipHtml("SVG: allowance", "review", allowed.svg));
  return chips.join("");
}

// ---- the overview ---------------------------------------------------------------------

/** The thumbnail of a picture `p`: the run's capture when it staged one, else the file under docs/ when `exists`. */
export function thumbOf(p, exists) {
  if (p.png?.capture) return hrefs.run(p.png.run, p.png.capture);
  return exists(p.out) ? hrefs.docs(p.out) : null;
}

const cardOf = (p, filter, exists, entry) => {
  const thumb = thumbOf(p, exists);
  const link = hrefs.picture(p.out, filter);
  return `<article class="card" id="${anchor(p.out)}">
<label class="pick"><input type="checkbox" data-pick="${esc(p.out)}" aria-label="Select ${esc(p.out)} for a run"> select</label>
${thumb ? `<a href="${link}"><img src="${thumb}" loading="lazy" alt="${esc(p.out)}"></a>` : ""}<h3><a href="${link}">${esc(p.out)}</a></h3>
<p class="chips">${chipsOf(p, entry(p.out))}</p>
</article>`;
};

const runState = (r) => {
  if (r.live) return r.stopping || r.stopAsked ? "stopping" : "running";
  if (r.interrupted) return "interrupted: the tool closed while it ran";
  if (r.stopped) return `stopped, exit ${r.exit}`;
  return `ended, exit ${r.exit}`;
};

const KIND_TEXT = Object.fromEntries(RUN_KINDS);
const runTitle = (r) => `${KIND_TEXT[r.kind] ?? r.kind}${r.dryRun ? ", a dry run" : ""}`;

/** Stop for a run that is running, and once it has been asked to stop, Kill. */
function stopButtons(r) {
  if (!r.live || r.kind === "cleanup") return [];
  if (!r.stopAsked)
    return [
      actionButton(
        "Stop",
        hrefs.runAct(r.n),
        { action: "stop" },
        { title: "finish the picture in hand, end the IDEs and put the registry back" },
      ),
    ];
  return [
    actionButton(
      "Kill",
      hrefs.runAct(r.n),
      { action: "kill" },
      {
        confirm: `End run ${r.n}'s process at once? Its IDEs are not ended and the registry is not put back.`,
        title: "end its process at once, which skips putting the registry back",
      },
    ),
  ];
}

const runsTableHtml = (runs) =>
  runs.length
    ? `<h2>Runs</h2>
<p><a href="${hrefs.runs}">Runs</a>: start a retake, a replay or a clean-up, stop one, or remove one.</p>
<table>
<tr><th>Run</th><th>Kind</th><th>State</th><th>Pictures</th><th>The same as</th></tr>
${[...runs]
  .reverse()
  .map(
    (r) =>
      `<tr><td>${r.n}</td><td>${esc(runTitle(r))}</td><td>${esc(runState(r))}${stopButtons(r).length ? ` <span data-acts>${stopButtons(r).join("")}<span class="status" role="status"></span></span>` : ""}</td><td>${r.kind === "cleanup" ? "" : `${r.done} of ${r.listed}${failedText(r.failed)}`}</td><td><code>${esc(r.command)}</code> (<a href="${hrefs.log(r.n)}">log</a>)</td></tr>`,
  )
  .join("\n")}
</table>`
    : `<p class="notice">No run yet: start one on the <a href="${hrefs.runs}">runs page</a>, or start the tool with <code>--retake &lt;regex&gt;</code> or <code>--replay &lt;regex&gt;</code>.</p>`;

// That HEAD is now `headNow` (its short hash), not the session's `baseline`, with the button
// that moves the session to it when `canMove`.
const headNotice = (headNow, baseline, canMove) =>
  `HEAD is now ${esc(headNow)}: this session compares with its baseline, ${esc(baseline.short)}, until it is committed or moved.${
    canMove
      ? ` Moving it makes ${esc(headNow)} the baseline; a verdict judged against ${esc(baseline.short)}'s picture goes back to Needs a look.${actionsHtml(
          [actionButton(`Move the session to ${headNow}`, hrefs.moveBaseline, { action: "move" })],
        )}`
      : ""
  }`;

// That the session served is an archived one, `closed` the commit that closed it.
const archivedNotice = (closed) =>
  `An archived session${closed.short ? `, closed by ${esc(closed.short)} (${esc(closed.message ?? "")})` : ""}: nothing in it can be changed. Its pictures under docs are shown as they are now.`;

// The links at the top of the overview and the runs page.
const topNav = (here) =>
  `<nav class="pager">${[
    ["overview", hrefs.overview(), "Overview"],
    ["runs", hrefs.runs, "Runs"],
    ["commit", hrefs.commitPage, "Commit"],
  ]
    .map(([key, href, text]) => `<a href="${href}"${key === here ? ' aria-current="page"' : ""}>${text}</a>`)
    .join("")}</nav>`;

// The bar that says how many pictures are selected for a run, with `more` (HTML) after it.
const pickedBar = (more) =>
  `<div class="picked notice" hidden><span class="count"></span>${more} <button type="button" data-clear-picked>Clear the selection</button></div>`;

/**
 * The overview: `groups` reviewPictures' groups, with only the pictures the filter shows;
 * `filter` its key; `counts` how many pictures each filter shows ({all, look, overridden,
 * nosvg}); `runs` [{n, kind, dryRun, command, live, stopping, stopAsked, interrupted, stopped,
 * exit, done, listed}], oldest first (the server's runRow); `baseline` the session's ({hash, short, build, moved}); `headNow` HEAD's short
 * hash when it is no longer the baseline, else null, and `canMove` whether the session can be
 * moved to it; `newestIde` the newest install's build, or null; `resume` {index, total, out}
 * for the queue's place, or null; `exists(path)` whether a file is under docs/; `entry(out)` a
 * picture's entry in the manifest, or null; `archived` the commit that closed the session
 * ({short, message}) when it is an archived one, else null; `committing` the commit under way
 * ({message, at}), or null.
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
  entry = () => null,
  archived = null,
  committing = null,
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
  if (archived) notices.push(archivedNotice(archived));
  if (committing) notices.push(`${committingNotice(committing)} <a href="${hrefs.commitPage}">The commit page</a>.`);
  if (headNow) notices.push(headNotice(headNow, baseline, canMove));
  if (baseline.moved)
    notices.push(
      `The session was moved to ${esc(baseline.short)} from ${esc(baseline.moved.from)} on ${esc(baseline.moved.at)}.${
        canMove && !archived
          ? ` Moving it back changes no file: the verdicts are compared with ${esc(baseline.moved.from)}'s pictures again.${actionsHtml(
              [actionButton(`Move back to ${baseline.moved.from}`, hrefs.moveBaseline, { action: "back" })],
            )}`
          : ""
      }`,
    );
  if (newestIde && baseline.build && newestIde > baseline.build)
    notices.push(`BETA ${newestIde} found: the baseline's pictures were taken on BETA ${baseline.build} at newest.`);
  const group = (g) => {
    const cards = `<div class="cards">
${g.pictures.map((p) => cardOf(p, filter, exists, entry)).join("\n")}
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
    body: `${topNav("overview")}
${notices.map((n) => `<div class="notice">${n}</div>`).join("\n")}
${pickedBar(`: <a href="${hrefs.runs}">start a run of them</a>.`)}
<nav class="filters">${filters}</nav>
${resumeLink}${runsTableHtml(runs)}
${shown.length ? shown.map(group).join("\n") : "<p>No picture.</p>"}`,
  });
}

// ---- the detail page ------------------------------------------------------------------

const pct = (n) => `${+(n * 100).toFixed(3)}%`;

// A box over a picture of `size` ([w, h] device pixels) at the rectangle {x0, y0, x1, y1}, in percent.
const boxStyle = (r, [w, h]) =>
  `left:${(r.x0 / w) * 100}%;top:${(r.y0 / h) * 100}%;width:${((r.x1 - r.x0) / w) * 100}%;height:${((r.y1 - r.y0) / h) * 100}%`;

/** A picture at half its size in device pixels (the pictures are 2x), with `overlay` (HTML) over it. */
// A picture shown at half its pixel size, its shape kept: --w and --h let a row of them cap the
// height by capping the width (.trio .pic img), since a height capped alone squashes a picture
// whose width its attribute sets.
const picHtml = (src, size, alt, overlay = "") => {
  if (!size) return `<span class="pic"><img src="${src}" alt="${esc(alt)}">${overlay}</span>`;
  const [w, h] = size.map((v) => Math.round(v / 2));
  return `<span class="pic"><img src="${src}" alt="${esc(alt)}" width="${w}" height="${h}" style="--w:${w};--h:${h}">${overlay}</span>`;
};

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
  return `<nav class="pager"><a href="${hrefs.overview(filter)}#${anchor(p.out)}">Overview</a><a href="${hrefs.runs}">Runs</a><a href="${hrefs.commitPage}">Commit</a>${
    prev ? `<a rel="prev" href="${hrefs.picture(prev.out, filter)}">Previous (k, ←)</a>` : ""
  }<span class="where">${place.index + 1} of ${place.total} · ${esc(filter === "all" ? groupTitle : filterLabel)}</span>${
    next ? `<a rel="next" href="${hrefs.picture(next.out, filter)}">Next (j, →)</a>` : ""
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
export function outsideHtml({ p, filter, place, prev, next, files, map, baseline, busy = null }) {
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
${p.outside === "deleted" ? "" : actionsHtml(runButtons(p.out, busy, { replay: false }))}
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
 * `error` why the last application of its verdicts failed, or null; `busy` the run that is
 * running ({n, kind}), or null; `bundled` false when the bundle cache has no bundle of it.
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
  busy = null,
  bundled = null,
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
    // a capture that is HEAD's picture byte for byte: keeping and taking write the same file
    const same = png.state === "unchanged" && png.against === "revision";
    const choice = same
      ? `<p>The capture is HEAD's picture byte for byte: there is nothing to keep or take.</p>${decided ? actionsHtml([actionButton("Back to the rule", act, { action: "png", keep: null })]) : ""}`
      : files.capture && png.state !== "failed" && png.state !== "once"
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
      // a failed capture's verdict has neither
      !png.regions
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
    // An SVG that stays with its PNG can be accepted in place of the file's; refusing it would
    // refuse this one, not the file's, and change nothing.
    const choice = svg.svg
      ? actionsHtml([
          actionButton(
            stays ? "Accept this SVG in place of the file's" : "Accept the SVG",
            act,
            { action: "svg", accept: true },
            { pressed: accepted === true },
          ),
          ...(stays
            ? []
            : [actionButton("No SVG", act, { action: "svg", accept: false }, { pressed: accepted === false })]),
          ...(accepted === null ? [] : [actionButton("Back to the bar", act, { action: "svg", accept: null })]),
        ])
      : "";
    svgRow = `<section${restored ? ' class="muted"' : ""}>
<h2>SVG: ${esc(svgStateText(svg))}</h2>
${restored ? "<p>The PNG goes back to HEAD's, and its SVG goes back with it.</p>" : ""}${stays ? `<p>The file's SVG stays as it is (${esc(svg.why)}). This one was judged all the same, and is written as judged if a review takes the capture or accepts it.</p>` : ""}${svg.look ? `<p class="notice">Needs a look: ${esc(svg.look.text)}.</p>` : ""}${restored ? "" : choice}${factsHtml(
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
  const footer = `${
    judged
      ? `<section>
<h2>Judge again</h2>
<p>Judging again puts the picture back as each run found it and applies each run's verdict again, judged with the manifest as it is now and against the session's baseline, ${esc(baseline.short)}.</p>
${actionsHtml([
  actionButton("Judge it again", act, { action: "judge" }),
  actionButton("Back to the tool's verdicts", act, { action: "rule" }, { title: "remove this picture's decisions" }),
])}
</section>`
      : ""
  }
<section>
<h2>Runs of this picture</h2>
<p>A retake takes it again (in both themes, a program's window once), with its SVG, against the baseline, ${esc(baseline.short)}; a replay draws its SVG again from its bundle. Other options are on the <a href="${hrefs.runs}">runs page</a>.</p>
${actionsHtml(runButtons(p.out, busy, { bundled }))}
</section>`;
  const svgPic = files.svgPng ?? null;
  const body = `${nav}
<p class="meta">${theme} theme, ${esc(sizeText(size))}; ${chipsOf(p, entry)}</p>
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

// ---- the runs page --------------------------------------------------------------------

// A time a session records (ISO, UTC) as the local date and time, to the second.
const whenText = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const two = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
};

// How far a run is: a bar for each job of a retake, one for a replay.
// How many pictures failed, after a count of those done: nothing for none.
const failedText = (failed) => (failed ? `, <span class="fail">${failed} failed</span>` : "");

function progressHtml(r) {
  if (r.kind === "cleanup" || !r.listed) return "";
  // a failed picture counts as done, so how many failed is said beside the count
  const bar = (done, total, failed) =>
    `<progress max="${total}" value="${done}"></progress>${done} of ${total}${failedText(failed)}`;
  if (!r.jobs.length) return `<p>${bar(r.done, r.listed, r.failed)}</p>`;
  const state = (j) => {
    if (j.state === "failed") return `: failed: ${esc(j.error ?? "no reason given")}`;
    return j.state === "waiting" ? ", waiting" : j.state === "done" ? ", done" : "";
  };
  return `<ul class="jobs">${r.jobs
    .map(
      (j) =>
        `<li><code>${esc(j.name)}</code> ${bar(j.done, j.pictures, j.state === "failed" ? 0 : j.failed)}${state(j)}</li>`,
    )
    .join("")}</ul>`;
}

// Remove for a run that has ended: its layers undone under docs/, then its record and folder.
function removeButton(r, busy) {
  if (r.live) return [];
  const { pictures, later } = r.removal ?? { pictures: 0, later: 0 };
  const confirm =
    r.kind === "cleanup"
      ? `Remove run ${r.n}, a clean-up, from the session? What it put back stays as it is.`
      : `Remove run ${r.n}? Every picture it changed goes back to how it was before it ran${
          later
            ? `, and the ${later} of its ${pictures} pictures a later run took too are judged again from that run's capture`
            : ""
        }. Its captures and files are deleted. This cannot be undone.`;
  return [
    actionButton(
      "Remove",
      hrefs.runAct(r.n),
      { action: "remove" },
      {
        confirm,
        disabled: busy?.commit
          ? "the session is being committed"
          : busy?.kind === "cleanup"
            ? `run ${busy.n}, a clean-up, is putting pictures back`
            : null,
        title: "undo what it did under docs and delete it, as if it had not run",
      },
    ),
  ];
}

// Retake what failed, for a retake that has ended with pictures it failed on: a new retake of
// exactly those, with the run's --svg and IDE. They have no verdict of the failed run, so the
// new run's are their only ones.
function retakeFailedButton(r, busy) {
  const f = r.failedRetake;
  if (!f) return [];
  const n = f.pictures.length;
  return [
    actionButton(
      `Retake what failed (${n})`,
      hrefs.startRun,
      { kind: "retake", pictures: f.pictures, svg: f.svg, ...(f.ide ? { ide: f.ide } : {}) },
      {
        disabled: f.missing ? `the IDE run ${r.n} used, ${f.missing}, is no longer found` : busyText(busy),
        title: `a new retake of the ${n === 1 ? "picture" : `${n} pictures`} run ${r.n} failed on${
          f.ide ? `, on BETA ${f.ide}` : ""
        }:\n${f.pictures.join("\n")}`,
      },
    ),
  ];
}

/** A run of the session as the runs page shows it: `r` the server's runRow, with `log`. */
function runArticle(r, { newestCleanup, busy }) {
  const times = [`started ${whenText(r.started)}`, r.ended ? `ended ${whenText(r.ended)}` : null].filter(Boolean);
  const buttons = [...stopButtons(r), ...retakeFailedButton(r, busy), ...removeButton(r, busy)];
  if (r.kind === "cleanup" && r.dryRun && !r.live && r.exit === 0 && r.n === newestCleanup)
    buttons.push(
      actionButton(
        "Put them back",
        hrefs.startRun,
        { kind: "cleanup", ...(r.only ? { only: r.only } : {}) },
        { disabled: busyText(busy), title: "the same clean-up, not a dry run" },
      ),
    );
  const note =
    r.live && r.stopAsked && r.kind !== "cleanup"
      ? "<p>Stopping: it finishes the picture in hand, ends its IDEs and puts the registry back. Kill ends its process at once, which skips that.</p>"
      : "";
  return `<article class="run" id="run-${r.n}">
<h3>Run ${r.n}: ${esc(runTitle(r))}, ${esc(runState(r))}</h3>
<p class="meta">${esc(times.join("; "))}</p>
<p>The same as <code>${esc(r.command)}</code> (<a href="${hrefs.log(r.n)}">the whole log</a>)</p>
${progressHtml(r)}${note}${buttons.length ? actionsHtml(buttons) : ""}${r.log?.length ? `<pre class="log">${esc(r.log.join("\n"))}</pre>` : ""}
</article>`;
}

/**
 * The runs page: the session's `runs` (the server's runRow, each with `log`, the lines of its
 * log to show, or null), oldest first; `baseline` the session's; `ides` the builds of the
 * installs a retake can use, newest first; `busy` the run that is running ({n, kind}), the commit
 * under way ({commit: true, message, at}), or null.
 * A form for each kind of run, whose pictures are a pattern or those selected on the overview.
 */
export function runsHtml({ runs, baseline, ides, busy }) {
  const disabled = busy ? ` disabled title="${esc(busyText(busy))}"` : "";
  const onlyField = `<label>Pictures (<code>--only</code>) <input type="text" name="only" size="40" placeholder="every picture" spellcheck="false"></label>`;
  const jobsField = (placeholder) =>
    `<label>Jobs <input type="number" name="jobs" min="1" max="16" step="1" placeholder="${esc(placeholder)}"></label>`;
  const newer = (b) => baseline.build && b > baseline.build;
  const ideField = ides.length
    ? `<label>IDE <select name="ide">${ides
        .map(
          (b, i) =>
            `<option value="${b}"${i === 0 ? " selected" : ""}>BETA ${b}${newer(b) ? `: newer than the baseline's BETA ${baseline.build}` : ""}</option>`,
        )
        .join("")}</select></label>`
    : `<p class="meta">No install was found on the Desktop, so the retake uses <code>TB_IDE</code>.</p>`;
  const form = (kind, title, fields, submit, about, extra = "") =>
    `<form class="run" id="start-${kind}" data-kind="${kind}" data-keep${extra} action="${hrefs.startRun}" data-acts>
<h3>${esc(title)}</h3>
<p class="meta">${about}</p>
${fields.join("\n")}
<p><button type="submit"${disabled}>${esc(submit)}</button> <span class="status" role="status"></span></p>
</form>`;
  const forms = [
    form(
      "retake",
      "Retake",
      [
        ideField,
        onlyField,
        `<label><input type="checkbox" name="svg" checked> SVG too (<code>--svg</code>)</label>`,
        jobsField("6"),
      ],
      "Start the retake",
      `<code>shoot_docs.mjs</code>: takes the pictures again in IDEs on private desktops, each compared with the baseline, ${esc(baseline.short)}.`,
    ),
    form(
      "replay",
      "Replay",
      [
        onlyField,
        `<label><input type="checkbox" name="recheck"> Compare every SVG (<code>--recheck</code>)</label>`,
        jobsField("half the processors"),
      ],
      "Start the replay",
      "<code>replay.mjs</code>: draws the SVGs again from their bundles, with the converter as it is now. No IDE.",
    ),
    form(
      "cleanup",
      "Clean-up",
      [onlyField],
      "List what it would put back",
      `<code>shoot_docs.mjs --cleanup</code>: puts back every picture under docs that differs from the baseline, ${esc(baseline.short)}, only by a capture's noise. Its list comes first (<code>--dry-run</code>), with a button that puts them back.`,
      " data-dry-run",
    ),
  ];
  const newestCleanup = [...runs].reverse().find((r) => r.kind === "cleanup")?.n ?? null;
  const list = [...runs].reverse().map((r) => runArticle(r, { newestCleanup, busy }));
  const body = `${topNav("runs")}
${
  busy?.commit
    ? `<p class="notice">${committingNotice(busy)}</p>`
    : busy
      ? `<p class="notice">Run ${busy.n}, a ${esc((KIND_TEXT[busy.kind] ?? busy.kind).toLowerCase())}, is running: a new run starts once it has ended.</p>`
      : ""
}
${pickedBar(": a run started here takes them in place of a pattern.")}
<h2>A new run</h2>
<p>One run at a time. Each verdict is applied under docs as it arrives.</p>
${forms.join("\n")}
<h2>The session's runs</h2>
${list.length ? list.join("\n") : "<p>No run yet.</p>"}`;
  return pageHtml({
    generator: REVIEW_GENERATOR,
    title: "Screenshot review: runs",
    head: HEAD,
    intro: `The runs of the session of ${esc(baseline.short)}, newest first, and the forms that start one.`,
    body,
  });
}

// ---- the commit page ------------------------------------------------------------------

// The most of the working tree's other changes the commit page lists.
const LEFT_OUT_SHOWN = 200;

/**
 * The commit page: `plan` and `message` the server's commitState (shot-review.mjs's commitPlan
 * and commitMessage), or `error` why git could not be read, or neither for an archived session;
 * `baseline` the session's;
 * `refusal` why it cannot be committed now, or null; `headNow` and `canMove` as the overview's;
 * `lastCommit` the commit that closed the session before this one ({short, message, archive}),
 * or null; `archived` the archived sessions (listArchived's), newest first; `committing` the
 * commit under way ({message, at}), or null: then `plan` and `message` are the ones it commits,
 * and the page shows it in progress, as it does when fetched again or opened in another tab.
 */
export function commitHtml({
  plan,
  message,
  error,
  baseline,
  refusal,
  headNow,
  canMove = false,
  lastCommit = null,
  archived = [],
  committing = null,
}) {
  const notices = [];
  if (lastCommit)
    notices.push(
      `Committed ${esc(lastCommit.short)}: ${esc(lastCommit.message)}. The session it closed is archived as <code>${esc(lastCommit.archive)}</code>, and this is the next one, whose baseline is ${esc(baseline.short)}.`,
    );
  if (committing) notices.push(committingNotice(committing));
  else if (headNow) notices.push(headNotice(headNow, baseline, canMove));
  else if (refusal) notices.push(esc(refusal));
  const sections = [];
  if (error) sections.push(`<p class="notice">git could not be read: ${esc(error)}</p>`);
  // (no plan: an archived session, whose commit holds what it changed)
  else if (plan && !plan.files.length) sections.push("<p>The session has changed nothing to commit.</p>");
  else if (plan) {
    const c = plan.counts;
    const by = [
      c.svgByAllowance ? `${c.svgByAllowance} by allowance` : null,
      c.svgByReview ? `${c.svgByReview} by review` : null,
    ].filter(Boolean);
    const rows = [
      ["PNGs changed by the tool's verdict", `${c.changed}${c.created ? ` (${c.created} new)` : ""}`],
      ["PNGs taken by review, against it", c.taken],
      ["PNGs kept at HEAD by review, against it", c.kept],
      ["Light pictures removed", c.dropped],
      ["SVGs written", `${c.svgWritten}${by.length ? ` (${by.join(", ")})` : ""}`],
      ["SVGs removed", c.svgRemoved],
      ["The manifest", c.manifest ? "changed" : "unchanged"],
    ];
    const fileRow = (f) =>
      `<tr><td><code>${f.out ? `<a href="${hrefs.picture(f.out)}">${esc(f.path)}</a>` : esc(f.path)}</code></td><td>${esc(f.status)}</td><td>${esc(f.why)}</td></tr>`;
    const files = JSON.stringify(plan.files.map((f) => f.path));
    const disabled = refusal ? ` disabled title="${esc(refusal)}"` : "";
    sections.push(`<h2>What the session changed</h2>
<table>
${rows.map(([what, n]) => `<tr><th>${esc(what)}</th><td>${esc(String(n))}</td></tr>`).join("\n")}
</table>
<form class="commit" id="commit" data-keep data-busy="committing..." action="${hrefs.commit}" data-files="${esc(files)}" data-acts>
<h2>The commit</h2>
<p class="meta">Commits the ${plan.files.length === 1 ? "file below" : `${plan.files.length} files below`} and nothing else: a file git does not track yet is added first, and one removed is committed as a deletion. The repository's hooks run. Committing closes the session: it is archived, and the next one's baseline is the new commit.</p>
<label for="commit-message">Message</label>
<textarea name="message" id="commit-message" rows="3" spellcheck="true" data-default="${esc(message ?? "")}"${committing ? " readonly" : ""}>${esc(message ?? "")}</textarea>
<p><button type="submit"${disabled}>Commit ${plan.files.length === 1 ? "1 file" : `${plan.files.length} files`}</button> <button type="button" data-reset-message disabled>Back to the default message</button> <span class="status" role="status">${committing ? "committing..." : ""}</span></p>
</form>
<h2>The files (${plan.files.length})</h2>
<table>
<tr><th>File</th><th>In the working tree</th><th>What the session did</th></tr>
${plan.files.map(fileRow).join("\n")}
</table>`);
  }
  if (plan?.leftOut.length) {
    const shown = plan.leftOut.slice(0, LEFT_OUT_SHOWN);
    const more = plan.leftOut.length - shown.length;
    sections.push(`<h2>Left out (${plan.leftOut.length})</h2>
<p>The working tree's other changes, which the commit does not take: pictures changed outside the session's runs among them.</p>
<ul class="left">${shown.map((c) => `<li><code>${esc(c.path)}</code> ${esc(c.status)}</li>`).join("")}${more ? `<li>and ${more} more</li>` : ""}</ul>`);
  }
  if (archived.length)
    sections.push(`<h2>Archived sessions (${archived.length})</h2>
<p>Each opens again, read-only, on another port while this one is open:</p>
<table>
<tr><th>Closed by</th><th>Baseline</th><th>Runs</th><th>Opened by</th></tr>
${archived
  .map(
    (a) =>
      `<tr><td>${a.closed ? `${esc(a.closed.short)}, ${esc(whenText(a.closed.at))}: ${esc(a.closed.message)}` : ""}</td><td>${esc(a.baseline.short)}</td><td>${a.runs}</td><td><code>node scripts/shot_review.mjs --archived ${esc(a.id)} --port 4181</code></td></tr>`,
  )
  .join("\n")}
</table>`);
  return pageHtml({
    generator: REVIEW_GENERATOR,
    title: "Screenshot review: commit",
    head: HEAD,
    intro: `What a commit of the session of ${esc(baseline.short)} takes: the pictures and SVGs its runs reported that git reports changed, and the manifest.`,
    body: `${topNav("commit")}
${notices.map((n) => `<div class="notice">${n}</div>`).join("\n")}
${sections.join("\n")}`,
  });
}
