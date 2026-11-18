// The inclusive time of named functions in a V8 CPU profile (node --cpu-prof),
// each with what it calls, as a tree.
//
// A profile's samples name the innermost frame; a sample counts under the
// outermost frame on its stack that has one of the names, so a function that
// calls itself is counted once. Times are in microseconds, as the profile's.

import path from "node:path";

const label = (node) => {
  const f = node.callFrame;
  const where = f.url ? `${path.basename(f.url)}:${f.lineNumber + 1}` : "";
  return `${f.functionName || "(anonymous)"} ${where}`.trim();
};

/**
 * @param {object} profile  the parsed .cpuprofile
 * @param {string[]} names  function names to total
 * @param {number} depth    how many levels of callees to keep under each
 * @returns {Map<string, {t: number, kids: Map}>} by name, in `names` order; a
 *   name no sample is under is absent
 */
export function profileTrees(profile, names, depth = 3) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const self = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const id = profile.samples[i];
    self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0));
  }
  const wanted = new Set(names);
  const found = new Map();
  for (const [id, t] of self) {
    const stack = [];
    for (let at = id; at != null; at = parent.get(at)) stack.push(byId.get(at));
    stack.reverse();
    const k = stack.findIndex((n) => wanted.has(n.callFrame.functionName));
    if (k < 0) continue;
    const name = stack[k].callFrame.functionName;
    let node = found.get(name);
    if (!node) found.set(name, (node = { t: 0, kids: new Map() }));
    node.t += t;
    for (let d = k + 1; d < stack.length && d - k <= depth; d++) {
      const l = label(stack[d]);
      let kid = node.kids.get(l);
      if (!kid) node.kids.set(l, (kid = { t: 0, kids: new Map() }));
      kid.t += t;
      node = kid;
    }
  }
  const trees = new Map();
  for (const name of names) if (found.has(name)) trees.set(name, found.get(name));
  return trees;
}

/** The trees as lines, callees by time; a callee under `floorMs` is left out. */
export function formatTrees(trees, names, floorMs = 1.5) {
  const lines = [];
  const print = (name, node, indent) => {
    if (indent && node.t < floorMs * 1000) return;
    lines.push(`${"  ".repeat(indent)}${(node.t / 1000).toFixed(1).padStart(7)} ms  ${name}`);
    for (const [l, kid] of [...node.kids].sort((a, b) => b[1].t - a[1].t)) print(l, kid, indent + 1);
  };
  for (const name of names) {
    if (trees.has(name)) print(name, trees.get(name), 0);
    else lines.push(`      ?      ${name}: no sample is under a function of this name`);
  }
  return lines;
}
