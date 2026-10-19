// The IDE page's compiles, followed through CDP's Network domain. Used by
// attachIde and waitForCompile in tb-ide.mjs.

export function watchCompiles(c) {
  let gen = 0;
  let cur = null;
  let seq = 0;
  let expected = [];
  let waiters = [];
  // A wake that came while nobody was waiting -- waitForCompile reading a
  // sample -- is kept for the next changed(), which then returns at once.
  let pending = false;
  // The last few compiles, for tb-timings.mjs (`compiles`).
  const history = [];
  const socks = new Set();
  const wake = () => {
    const w = waiters;
    waiters = [];
    if (!w.length) pending = true;
    for (const f of w) f();
  };
  const complete = (uris) => cur && cur.gen === gen && uris.length > 0 && uris.every((u) => cur.done.has(u));
  const take = (o, id) => {
    if (o.event === "compilationStarted") {
      socks.add(id);
      cur = { seq: ++seq, gen, done: new Map(), started: Date.now() };
      history.push(cur);
      if (history.length > 10) history.shift();
    } else if (o.method === "textDocument/publishDiagnostics" && cur && o.params?.uri) {
      socks.add(id);
      const p = o.params;
      const was = complete(expected);
      cur.done.set(p.uri, { n: [p.errorCount, p.warningCount, p.hintCount, p.infoCount].map(Number), at: Date.now() });
      // Wake for the compile completing, and for a file the waiter does not
      // know of. Before the page's tree has its files, `expected` is empty and
      // nothing could complete it: a compile that ended then woke no one, and
      // the wait took it only on the next 1 Hz sample, 0.94 s later (median).
      if (!was && (complete(expected) || !expected.includes(p.uri))) wake();
    }
  };
  c.on((m) => {
    const p = m.params;
    if (m.method === "Network.webSocketCreated") {
      if (/\/(root|fs|language|debugger)$/.test(p?.url ?? "")) {
        socks.add(p.requestId);
        gen++;
      }
    } else if (m.method === "Network.webSocketClosed") {
      if (socks.delete(p?.requestId)) gen++;
    } else if (m.method === "Network.webSocketFrameReceived") {
      const r = p?.response;
      if (r?.payloadData) for (const o of objects(r)) take(o, p.requestId);
    }
  });
  return {
    expect(uris) {
      expected = Array.isArray(uris) ? uris : [];
    },
    mark() {
      return { seq: cur?.seq ?? 0, done: complete(expected) };
    },
    check(uris) {
      if (!Array.isArray(uris) || !complete(uris)) return null;
      const counts = [0, 0, 0, 0];
      for (const { n } of cur.done.values()) for (let k = 0; k < 4; k++) counts[k] += n[k] || 0;
      // `started` is when the compile's compilationStarted arrived (tb-timings.mjs).
      return { seq: cur.seq, counts, at: Math.max(...uris.map((u) => cur.done.get(u).at)), started: cur.started };
    },
    // The last few compiles as the wire saw them, oldest first, for
    // tb-timings.mjs: when each started, when its last file's diagnostics
    // arrived, and how many files had them.
    compiles() {
      return history.map((h) => {
        const ats = [...h.done.values()].map((d) => d.at);
        return { seq: h.seq, started: h.started, ended: ats.length ? Math.max(...ats) : null, files: ats.length };
      });
    },
    // When the current compile's latest diagnostics arrived, or null.
    lastAt() {
      if (!cur || cur.gen !== gen || !cur.done.size) return null;
      return Math.max(...[...cur.done.values()].map((d) => d.at));
    },
    changed(ms) {
      if (pending) {
        pending = false;
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const done = () => {
          clearTimeout(t);
          waiters = waiters.filter((f) => f !== done);
          resolve();
        };
        const t = setTimeout(done, ms);
        waiters.push(done);
      });
    },
  };
}

function objects(r) {
  const b = r.opcode === 2 ? Buffer.from(r.payloadData, "base64") : Buffer.from(r.payloadData, "utf8");
  try {
    if (b.length > 8 && b.readUInt32LE(0) === 0xffeaeaea) {
      const out = [];
      for (let i = 4; i + 4 <= b.length; ) {
        const n = b.readInt32LE(i);
        out.push(JSON.parse(b.toString("utf8", i + 4, i + 4 + n)));
        i += 4 + n;
      }
      return out;
    }
    return b[0] === 0x7b ? [JSON.parse(b.toString("utf8"))] : [];
  } catch {
    return [];
  }
}
