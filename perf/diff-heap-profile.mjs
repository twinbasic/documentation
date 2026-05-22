import { readFileSync } from 'node:fs';

function loadByFn(p) {
  const profile = JSON.parse(readFileSync(p, 'utf8'));
  const byKey = new Map();
  let total = 0;
  const walk = (n) => {
    const cf = n.callFrame || {};
    const fn = cf.functionName || '(anonymous)';
    const line = cf.lineNumber != null ? cf.lineNumber + 1 : '?';
    const url = (cf.url || '').replace(/^file:\/\/\//, '');
    const tail = url ? url.split(/[\\/]/).pop() : '';
    const key = tail ? fn + ' @ ' + tail + ':' + line : fn;
    byKey.set(key, (byKey.get(key) || 0) + (n.selfSize || 0));
    total += n.selfSize || 0;
    for (const c of n.children || []) walk(c);
  };
  walk(profile.head);
  return { byKey, total, samples: profile.samples ? profile.samples.length : 0 };
}

const [prePath, postPath] = process.argv.slice(2);
const pre = loadByFn(prePath);
const post = loadByFn(postPath);
const keys = new Set([...pre.byKey.keys(), ...post.byKey.keys()]);
const rows = [];
for (const k of keys) {
  const preB = pre.byKey.get(k) || 0;
  const postB = post.byKey.get(k) || 0;
  rows.push({ k, pre: preB, post: postB, delta: postB - preB });
}

const fmtB = b => {
  const a = Math.abs(b);
  if (a >= 1024 * 1024) return (b / 1024 / 1024).toFixed(2) + ' MB';
  if (a >= 1024) return (b / 1024).toFixed(1) + ' KB';
  return b + ' B';
};
const pad = (s, w) => s.padStart(w);

console.log('pre  samples=' + pre.samples + ', total=' + fmtB(pre.total));
console.log('post samples=' + post.samples + ', total=' + fmtB(post.total));
console.log('total delta : ' + fmtB(post.total - pre.total));
console.log();
console.log('top 20 by |delta|:');
console.log('       PRE           POST            Δ        function');
console.log('   ----------    ----------    ----------    ------------------------');
rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
for (const r of rows.slice(0, 20)) {
  const sign = r.delta > 0 ? '+' : '';
  console.log('   ' + pad(fmtB(r.pre), 10) + '    ' + pad(fmtB(r.post), 10) + '    ' + pad(sign + fmtB(r.delta), 10) + '    ' + r.k);
}
