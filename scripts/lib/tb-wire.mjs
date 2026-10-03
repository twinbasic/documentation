// The IDE page's compiles, followed through CDP's Network domain. Used by
// attachIde and waitForCompile in tb-ide.mjs.

export function watchCompiles(c) {
  let gen = 0;
  let cur = null;
  let seq = 0;
  let expected = [];
  let waiters = [];
  const socks = new Set();
  const wake = () => {
    const w = waiters;
    waiters = [];
    for (const f of w) f();
  };
  const complete = (uris) => cur && cur.gen === gen && uris.length > 0 && uris.every((u) => cur.done.has(u));
  const take = (o, id) => {
    if (o.event === "compilationStarted") {
      socks.add(id);
      cur = { seq: ++seq, gen, done: new Map() };
    } else if (o.method === "textDocument/publishDiagnostics" && cur && o.params?.uri) {
      socks.add(id);
      const p = o.params;
      const was = complete(expected);
      cur.done.set(p.uri, { n: [p.errorCount, p.warningCount, p.hintCount, p.infoCount].map(Number), at: Date.now() });
      if (!was && complete(expected)) wake();
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
      return { seq: cur.seq, counts, at: Math.max(...uris.map((u) => cur.done.get(u).at)) };
    },
    changed(ms) {
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
