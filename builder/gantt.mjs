// Inline SVG Gantt chart for the build timeline.
// Replaces the client-side Mermaid renderer — no JS runtime needed.

const COLORS = {
  Seeds:  { light: "#86c7a3", dark: "#3d8b5e" },
  Spine:  { light: "#6eb5d9", dark: "#3c7db0" },
  Render: { light: "#b09cd8", dark: "#8066a8" },
  Write:  { light: "#e8a756", dark: "#c08030" },
  Boot:   { light: "#e57373", dark: "#c62828" },
  Other:  { light: "#bbb",    dark: "#666"    },
};

const SECTION_W = 60;
const SVG_W     = 900;
const CHART_W   = SVG_W - SECTION_W - 20;
const ROW_H     = 20;
const BAR_H     = 14;
const AXIS_H    = 28;
const CHAR_W    = 6.2;
const BAR_PAD   = 4;

export function renderGantt(grouped) {
  const all = [...grouped.values()].flat();
  if (all.length === 0) return "";
  const maxT = Math.max(...all.map(t => t.end));
  if (maxT <= 0) return "";

  // Any task with a lane ran on a worker — pull it into the Workers
  // section, tagged with its original section for bar colour.  Leftover
  // Render tasks (dispatch, prepDest) fold into Spine.
  const seeds = [], spine = [], write = [];
  const laneTasks = [];
  for (const [section, tasks] of grouped) {
    for (const t of tasks) {
      if (t.lane != null) { t._color = section; laneTasks.push(t); }
      else if (section === "Seeds") seeds.push(t);
      else if (section === "Spine" || section === "Render") spine.push(t);
      else if (section === "Write") write.push(t);
    }
  }
  const mainSections = [["Seeds", seeds], ["Spine", spine], ["Write", write]];

  const lanes = new Map();
  for (const t of laneTasks) {
    if (!lanes.has(t.lane)) lanes.set(t.lane, []);
    lanes.get(t.lane).push(t);
  }
  for (const tasks of lanes.values())
    tasks.sort((a, b) => a.workerStart - b.workerStart);
  const sortedLanes = [...lanes.entries()].sort((a, b) => a[0] - b[0]);

  let rows = sortedLanes.length;
  for (const [, tasks] of mainSections) rows += tasks.length;
  const h = AXIS_H + rows * ROW_H + 5;
  const xOf = t => SECTION_W + (t / maxT) * CHART_W;

  const tick = niceInterval(maxT);
  const ticks = [];
  for (let t = 0; t <= maxT + 0.5; t += tick) ticks.push(t);

  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${h}" style="width:100%;max-width:${SVG_W}px">`);
  o.push(`<title>Build task timeline</title>`);

  const css = [
    `.gantt{font-family:system-ui,-apple-system,sans-serif}`,
    `.gl{fill:#333}.gs{fill:#333;font-weight:600}.ga{fill:#666}.gg{stroke:#e0e0e0}`,
    ...Object.entries(COLORS).map(([s, c]) => `.gb-${s.toLowerCase()}{fill:${c.light}}`),
    `html.dark-mode .gl{fill:#e6e1e8}`,
    `html.dark-mode .gs{fill:#e6e1e8}`,
    `html.dark-mode .ga{fill:#959396}`,
    `html.dark-mode .gg{stroke:#44434d}`,
    ...Object.entries(COLORS).map(([s, c]) => `html.dark-mode .gb-${s.toLowerCase()}{fill:${c.dark}}`),
  ];
  o.push(`<style>${css.join("")}</style>`);
  o.push(`<g class="gantt">`);

  for (const t of ticks) {
    const x = rd(xOf(t));
    o.push(`<line x1="${x}" y1="${AXIS_H}" x2="${x}" y2="${h - 5}" class="gg" stroke-width=".5"/>`);
    o.push(`<text x="${x}" y="${AXIS_H - 10}" text-anchor="middle" class="ga" font-size="10">${fmtMs(t)}</text>`);
  }

  let y = AXIS_H;

  // Seeds, Spine (with dispatch / prepDest folded in)
  for (const [section, tasks] of mainSections.slice(0, 2)) {
    if (tasks.length === 0) continue;
    y = renderMainSection(o, section, tasks, y, xOf);
  }

  // Workers — one row per lane, individual task bars
  if (sortedLanes.length > 0) {
    o.push(`<line x1="0" y1="${y}" x2="${SVG_W}" y2="${y}" class="gg" stroke-width=".5"/>`);
    for (let li = 0; li < sortedLanes.length; li++) {
      const [, tasks] = sortedLanes[li];
      const ty = rd(y + ROW_H / 2 + 3.5);
      const by = rd(y + (ROW_H - BAR_H) / 2);
      if (li === 0) o.push(`<text x="4" y="${ty}" class="gs" font-size="12">Workers</text>`);
      const bootBars = [];
      for (const t of tasks) {
        if (t._color === "Boot") { bootBars.push(t); continue; }
        const bx = rd(xOf(t.workerStart));
        const bw = rd(Math.max(xOf(t.workerEnd) - xOf(t.workerStart), 1));
        o.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${BAR_H}" class="gb-${(t._color || "render").toLowerCase()}" rx="2"/>`);
        const lbl = workerLabel(t);
        if (lbl.length * CHAR_W + BAR_PAD * 2 <= bw)
          o.push(`<text x="${rd(bx + BAR_PAD)}" y="${ty}" class="gl" font-size="11">${esc(lbl)}</text>`);
      }
      const bootH = Math.round(BAR_H * 0.75);
      for (const t of bootBars) {
        const bx = rd(xOf(t.workerStart));
        const bw = rd(Math.max(xOf(t.workerEnd) - xOf(t.workerStart), 1));
        o.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bootH}" class="gb-boot" rx="2"/>`);
        const lbl = workerLabel(t);
        if (lbl.length * CHAR_W + BAR_PAD * 2 <= bw)
          o.push(`<text x="${rd(bx + BAR_PAD)}" y="${ty}" class="gl" font-size="11">${esc(lbl)}</text>`);
      }
      y += ROW_H;
    }
  }

  // Write
  for (const [section, tasks] of mainSections.slice(2)) {
    if (tasks.length === 0) continue;
    y = renderMainSection(o, section, tasks, y, xOf);
  }

  o.push(`</g></svg>`);
  return o.join("\n");
}

function renderMainSection(o, section, tasks, y, xOf) {
  o.push(`<line x1="0" y1="${y}" x2="${SVG_W}" y2="${y}" class="gg" stroke-width=".5"/>`);
  const cls = `gb-${section.toLowerCase()}`;
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const bx = rd(xOf(t.start));
    const bw = rd(Math.max(xOf(t.end) - xOf(t.start), 1));
    const by = rd(y + (ROW_H - BAR_H) / 2);
    const ty = rd(y + ROW_H / 2 + 3.5);
    if (i === 0) o.push(`<text x="4" y="${ty}" class="gs" font-size="12">${esc(section)}</text>`);
    o.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${BAR_H}" class="${cls}" rx="2"/>`);
    const lbl = taskLabel(t);
    const textW = lbl.length * CHAR_W;
    if (textW + BAR_PAD * 2 <= bw) {
      o.push(`<text x="${rd(bx + BAR_PAD)}" y="${ty}" class="gl" font-size="11">${esc(lbl)}</text>`);
    } else if (bx + bw + 4 + textW <= SVG_W) {
      o.push(`<text x="${rd(bx + bw + 4)}" y="${ty}" class="gl" font-size="11">${esc(lbl)}</text>`);
    } else {
      o.push(`<text x="${rd(bx - 4)}" y="${ty}" text-anchor="end" class="gl" font-size="11">${esc(lbl)}</text>`);
    }
    y += ROW_H;
  }
  return y;
}

function niceInterval(max) {
  for (const c of [100, 200, 250, 500, 1000, 2000, 2500, 5000])
    if (max / c <= 10) return c;
  return Math.ceil(max / 10000) * 1000;
}

function fmtMs(ms) {
  return `${Math.floor(ms / 1000)}.${String(ms % 1000).padStart(3, "0")}`;
}

function taskLabel(t) {
  let s = t.id.replace(":", " ");
  if (t.workerStart != null) {
    const d = t.end - t.start;
    if (d > 0) {
      const a = Math.round((t.workerStart - t.start) / d * 100);
      const b = Math.round((t.workerEnd - t.workerStart) / d * 100);
      s += ` (${a}%+${b}%)`;
    }
  }
  return s;
}

function workerLabel(t) {
  return t.id.replace(/:.*/, "").replace(/ w\d+$/, "");
}

function rd(n) { return Math.round(n * 10) / 10; }
function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
