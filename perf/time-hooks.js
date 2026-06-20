// Wraps chunker.hooks.<name>.hooks tasks with per-task wall-clock
// timers. Each registered handler method (e.g. AtPage.prototype.finalizePage)
// gets its own counter and accumulated time.
//
// Loaded by --time-hooks. Registers a Paged.Handler so we can run in
// the constructor after other handlers have already added themselves.
// We register LAST (since additional-script tags load after the
// bundle, and Paged.registerHandlers appends) so by the time our
// constructor runs, every other handler has registered its hooks.

(() => {
  // (hookName, handlerLabel) -> { totalMs, count }
  const stats = new Map();
  const labelFor = (fn) => {
    // Bound functions: fn.name is typically "bound <methodName>".
    // Strip the "bound " prefix if present.
    let n = (fn && fn.name) || '<anon>';
    if (n.startsWith('bound ')) n = n.slice(6);
    return n || '<anon>';
  };

  function wrapHook(hookName, hook) {
    if (!hook || !Array.isArray(hook.hooks)) return 0;
    const orig = hook.hooks;
    // If multiple tasks share a label (e.g., two handlers both named
    // `finalizePage`), the unmodified key would collide and only the
    // last task's stats would be retained. Disambiguate with a
    // per-label index.
    const seen = new Map();
    hook.hooks = orig.map((task, i) => {
      const label = labelFor(task);
      const seenN = (seen.get(label) || 0) + 1;
      seen.set(label, seenN);
      const key = `${hookName}::${label}` + (seenN > 1 ? `#${seenN}` : '');
      const s = { totalMs: 0, count: 0 };
      stats.set(key, s);
      return function (...args) {
        const t0 = performance.now();
        const r = task.apply(this, args);
        if (r && typeof r.then === 'function') {
          // async-aware: charge end on resolve
          return r.finally(() => {
            s.totalMs += performance.now() - t0;
            s.count++;
          });
        }
        s.totalMs += performance.now() - t0;
        s.count++;
        return r;
      };
    });
    return orig.length;
  }

  class TimeHooksHandler extends Paged.Handler {
    constructor(chunker, polisher, caller) {
      super(chunker, polisher, caller);
      const ctx = { chunker, polisher, caller };
      let wrapped = 0;
      for (const [ctxName, obj] of Object.entries(ctx)) {
        if (!obj || !obj.hooks) continue;
        for (const [hookName, hook] of Object.entries(obj.hooks)) {
          wrapped += wrapHook(`${ctxName}.${hookName}`, hook);
        }
      }
      console.log(`[time-hooks] wrapped ${wrapped} hook tasks across ${stats.size} (hook, handler) pairs`);
    }
    afterRendered(pages) {
      const total = pages.length;
      const rows = [...stats.entries()]
        .map(([key, s]) => ({
          key,
          count: s.count,
          totalMs: s.totalMs,
          perPageMs: total ? s.totalMs / total : 0,
          avgMs: s.count ? s.totalMs / s.count : 0,
        }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.totalMs - a.totalMs);
      console.log(`[time-hooks] hook task time over ${total} pages:`);
      console.log('  hook::handler                                  count  total_ms  per_page_ms  avg_ms');
      console.log('  -------------                                  -----  --------  -----------  ------');
      for (const r of rows) {
        console.log(
          '  ' + r.key.padEnd(45) +
          r.count.toString().padStart(8) +
          r.totalMs.toFixed(1).padStart(10) +
          r.perPageMs.toFixed(3).padStart(13) +
          r.avgMs.toFixed(3).padStart(8)
        );
      }
      window.__hookTimings = rows;
    }
  }
  Paged.registerHandlers(TimeHooksHandler);
  console.log('[time-hooks] handler registered');
})();
