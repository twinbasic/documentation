// Per-call timing for the detach-pages.js removeChild path.
//
// Wraps detach-pages.js's removeChild call so we can see whether the
// cost is roughly flat per call (some Blink-internal fixed overhead) or
// scales with the page's descendant count (LayoutObject teardown).
//
// Loaded as an --additional-script AFTER detach-pages.js so the
// instrumentation can monkey-patch the prototype that detach-pages.js
// uses. Records per-call ns + descendant count + first-quarter /
// last-quarter buckets. Dump at afterRendered through the [instrument]
// prefix so the harness pipes it to stdout.

(() => {
  const origRemoveChild = Node.prototype.removeChild;
  const samples = [];   // { ns, descendants, isPage }
  let totalNs = 0;
  let pageDetachCount = 0;
  let otherCount = 0;

  Node.prototype.removeChild = function (child) {
    // count descendants quickly — only meaningful on Element children
    let descendants = 0;
    let isPage = false;
    if (child && child.nodeType === 1) {
      // Element.children.length is just direct kids; we want a count
      // estimate of the subtree, but a full walk would skew the timing.
      // Use childElementCount as a cheap proxy plus a textContent length
      // bucket so we can correlate with size.
      descendants = child.getElementsByTagName ? child.getElementsByTagName('*').length : 0;
      isPage = child.classList && child.classList.contains('pagedjs_page');
    }
    const t0 = performance.now();
    const r = origRemoveChild.call(this, child);
    const ns = (performance.now() - t0) * 1e6;
    totalNs += ns;
    if (isPage) {
      pageDetachCount++;
      samples.push({ ns, descendants });
    } else {
      otherCount++;
    }
    return r;
  };

  class DetachInstrument extends Paged.Handler {
    afterRendered(pages) {
      const total = pages.length;
      const pageSamples = samples.slice();
      pageSamples.sort((a, b) => a.ns - b.ns);
      const median = pageSamples.length ? pageSamples[Math.floor(pageSamples.length / 2)].ns : 0;
      const p90 = pageSamples.length ? pageSamples[Math.floor(pageSamples.length * 0.9)].ns : 0;
      const p99 = pageSamples.length ? pageSamples[Math.floor(pageSamples.length * 0.99)].ns : 0;
      const sumDesc = pageSamples.reduce((s, x) => s + x.descendants, 0);
      const sumNs = pageSamples.reduce((s, x) => s + x.ns, 0);

      console.log(`[instrument] removeChild wrapper: ${pageDetachCount} page detaches, ${otherCount} other`);
      console.log(`[instrument] total removeChild wall: ${(totalNs / 1e6).toFixed(1)} ms`);
      console.log(`[instrument] page-detach total:     ${(sumNs / 1e6).toFixed(1)} ms`);
      console.log(`[instrument] page-detach avg:       ${(sumNs / pageDetachCount / 1e6).toFixed(3)} ms/call`);
      console.log(`[instrument] page-detach median:    ${(median / 1e6).toFixed(3)} ms/call`);
      console.log(`[instrument] page-detach p90:       ${(p90 / 1e6).toFixed(3)} ms/call`);
      console.log(`[instrument] page-detach p99:       ${(p99 / 1e6).toFixed(3)} ms/call`);
      console.log(`[instrument] avg descendants/page:  ${(sumDesc / pageDetachCount).toFixed(1)}`);

      // Bucket by descendant count to see proportionality.
      const buckets = [
        { lo: 0,   hi: 100,   n: 0, ns: 0, desc: 0 },
        { lo: 100, hi: 200,   n: 0, ns: 0, desc: 0 },
        { lo: 200, hi: 400,   n: 0, ns: 0, desc: 0 },
        { lo: 400, hi: 800,   n: 0, ns: 0, desc: 0 },
        { lo: 800, hi: 1600,  n: 0, ns: 0, desc: 0 },
        { lo: 1600,hi: Infinity, n: 0, ns: 0, desc: 0 },
      ];
      for (const s of pageSamples) {
        const b = buckets.find(bk => s.descendants >= bk.lo && s.descendants < bk.hi);
        if (b) { b.n++; b.ns += s.ns; b.desc += s.descendants; }
      }
      console.log(`[instrument] removeChild cost by descendant-count bucket:`);
      console.log(`[instrument]   desc-range  count  total_ms  avg_ms  avg_desc  ms_per_desc`);
      for (const b of buckets) {
        if (!b.n) continue;
        const avgMs = b.ns / b.n / 1e6;
        const avgDesc = b.desc / b.n;
        const msPerDesc = avgDesc > 0 ? (avgMs / avgDesc) * 1000 : 0;
        const range = b.hi === Infinity ? `${b.lo}+` : `${b.lo}-${b.hi}`;
        console.log(
          `[instrument]   ${range.padEnd(10)} ${String(b.n).padStart(6)} ${avgMs.toFixed(3).padStart(8)} ${(b.ns/1e6).toFixed(1).padStart(8)} ${avgDesc.toFixed(0).padStart(10)} ${msPerDesc.toFixed(2).padStart(13)}`
        );
      }

      // Restore so afterRendered's own removeChild (when re-appending) isn't double-charged.
      Node.prototype.removeChild = origRemoveChild;
    }
  }
  Paged.registerHandlers(DetachInstrument);
  console.log('[instrument] removeChild wrapper installed');
})();
