// One-off: list every node in a .cpuprofile whose functionName matches
// the given regex, with self-time and source location. Helpful for
// "is this frame in the profile at all, and what's it called?"

import { readFileSync } from 'node:fs';

const [profilePath, pattern] = process.argv.slice(2);
if (!profilePath || !pattern) {
  console.error('usage: node grep-profile.mjs <profile> <regex>');
  process.exit(2);
}

const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
const usPerSample = (profile.endTime - profile.startTime) / profile.samples.length;
const re = new RegExp(pattern);

const rows = [];
for (const n of profile.nodes) {
  const fn = n.callFrame?.functionName || '';
  if (!re.test(fn)) continue;
  const ms = (n.hitCount || 0) * usPerSample / 1000;
  rows.push({
    ms,
    fn,
    url: (n.callFrame?.url || '').replace(/^file:\/\/\//, '') || '(native)',
    line: (n.callFrame?.lineNumber ?? -1) + 1,
    hits: n.hitCount || 0,
  });
}
rows.sort((a, b) => b.ms - a.ms);

let total = 0;
for (const r of rows) {
  total += r.ms;
  console.log(`  ${r.ms.toFixed(2).padStart(8)} ms   ${r.fn}  @  ${r.url}:${r.line}  hits=${r.hits}`);
}
console.log(`  -------- ${total.toFixed(2)} ms total across ${rows.length} matching nodes`);
