// Reads a build's times back from its Gantt chart (builder/gantt.mjs's SVG):
// the build writes no timings file, and the chart holds every task's bar.
//
// readChart(svg) returns, in seconds from the build's start:
//   env     the start of the first renderEnvInit bar: a lane may render from here
//   render  { start, end }: the first render bar's start and the last one's end
//   end     the end of the last bar of the chart
//   task(name)  { start, end } of a labelled bar, or null. Every main-thread
//               task has a label; a lane task has one only where its bar is
//               wide enough, so a name here is a main-thread task's.
//
// The reading rests on three things the chart's writer does, which
// test/build-speed.test.mjs holds it to: an axis tick is a <text class="ga">
// whose content is its time, a bar is a <rect> with x and width, and a labelled
// bar's <text class="gl"> follows its <rect> within three lines.

const TICK = /<text x="([\d.]+)"[^>]*class="ga"[^>]*>([\d.]+)<\/text>/g;
const BAR = /<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="14"/;
const BARS = /<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="14"/g;

export function readChart(svg) {
  const ticks = [...svg.matchAll(TICK)].map((m) => ({ x: Number(m[1]), t: Number(m[2]) }));
  if (ticks.length < 2) throw new Error("not a build's Gantt chart: fewer than two axis ticks");
  // Any two ticks give the scale: a long build has none at one second.
  const first = ticks[0];
  const last = ticks.at(-1);
  const perSecond = (last.x - first.x) / (last.t - first.t);
  const x0 = first.x - first.t * perSecond;
  const seconds = (x) => (x - x0) / perSecond;
  const span = (m) => ({ start: seconds(Number(m[1])), end: seconds(Number(m[1]) + Number(m[2])) });

  const ofClass = (cls) => {
    const re = new RegExp(`<rect x="([\\d.]+)" y="[\\d.]+" width="([\\d.]+)"[^>]*class="${cls}"`, "g");
    return [...svg.matchAll(re)].map(span);
  };
  const starts = (list) => (list.length ? Math.min(...list.map((b) => b.start)) : null);
  const ends = (list) => (list.length ? Math.max(...list.map((b) => b.end)) : null);
  const render = ofClass("gb-render");
  const lines = svg.split("\n");

  return {
    env: starts(ofClass("gb-env")),
    render: { start: starts(render), end: ends(render) },
    end: ends([...svg.matchAll(BARS)].map(span)),
    task(name) {
      const at = lines.findIndex((l) => l.includes('class="gl"') && l.includes(`>${name}</text>`));
      for (let i = at - 1; at >= 0 && i >= 0 && i >= at - 3; i--) {
        const m = BAR.exec(lines[i]);
        if (m) return span(m);
      }
      return null;
    },
  };
}

const s = (n) => (n == null ? "?" : n.toFixed(2));

/** One line for a chart: the first render, render's end, the chart's end and the named tasks. */
export function chartLine(chart, tasks = []) {
  const out = [`first render ${s(chart.render.start)}`, `render ends ${s(chart.render.end)}`, `ends ${s(chart.end)}`];
  for (const name of tasks) {
    const bar = chart.task(name);
    out.push(bar ? `${name} ${s(bar.start)} to ${s(bar.end)}` : `${name} ?`);
  }
  return out.join("; ");
}

/** "a to b s" over a list of numbers, or the one value when they agree to the hundredth. */
export function range(list) {
  const known = list.filter((n) => n != null);
  if (known.length === 0) return "?";
  const lo = Math.min(...known).toFixed(2);
  const hi = Math.max(...known).toFixed(2);
  return lo === hi ? `${lo} s` : `${lo} to ${hi} s`;
}
