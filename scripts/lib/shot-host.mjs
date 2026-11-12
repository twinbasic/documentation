// A session's runs as whoever holds the session handles them (WIP.ShotReview.md, One way to take
// pictures, rule 1): the review tool's server (shot-server.mjs), which adds its pages, and a run
// typed in a terminal while no review tool is open (shot-front.mjs). Both start a run with
// startRun, keep each run's events, what they say and its verdicts, apply each verdict through the
// session's applier (shot-verdicts.mjs) as it arrives, and mark the run's end, by this code alone,
// so that a run from a terminal and one from the tool reach the same files under docs/.
//
// One run at a time: a picture's verdicts are applied in the runs' order, which two runs at once
// would not keep, and a clean-up writes under docs/ itself.

import { readEvents, runPaths } from "./shot-session.mjs";
import { runFacts, verdictOfEvent } from "./shot-review.mjs";
import { readVerdicts } from "./shot-stage.mjs";
import { startRun } from "./shot-runs.mjs";

/**
 * What a run of the session under `root` left, `record` its record in the session: its events,
 * what they say (runFacts) and its verdicts, {out => {png, svg}}, as its stage holds them.
 */
export function readRun(root, record) {
  const files = runPaths(root, record.n);
  const events = readEvents(files.events);
  const verdicts = new Map(readVerdicts(files.stage).map((v) => [v.out, { png: v.png, svg: v.svg }]));
  return { events, facts: runFacts(record.tool, events), verdicts };
}

/**
 * The runs of a session and their applying. `session()` and `applier()` give the session and its
 * applier as they are now (a commit replaces both). Called back, each after the host has done its
 * part: `onEvent(record, event)` for each event, `onApplied(out)` once a verdict on `out` is
 * applied, `onLine(record, text, stream)` for each line meant for a person ("stdout" or "stderr"),
 * and `onExit(record)` once a run has ended and every verdict it reported is applied. `command` is
 * the probes' stand-in for the tools (startRun).
 *
 * Returns {runs, load(), start({tool, args}), liveRuns(), live(), enqueue(job), close()}: `runs`
 * the map n => {record, live, handle, stopAsked, events, facts, verdicts}; `load` reads them again
 * from the session; `start` starts a run and returns startRun's handle, and throws while another
 * runs; `live` the handles of the runs that are running; `enqueue` puts a job in the queue the
 * verdicts are applied from; `close` applies what is left at once, and stops the queue.
 */
export function createRunHost({
  session,
  applier,
  onEvent = () => {},
  onApplied = () => {},
  onLine = () => {},
  onExit = () => {},
  command,
}) {
  const runs = new Map();
  const load = () => {
    runs.clear();
    const s = session();
    for (const record of s.data.runs)
      runs.set(record.n, { record, live: false, handle: null, ...readRun(s.root, record) });
  };
  load();

  // A run's verdicts are applied in order, one in each turn of the event loop, so that a server
  // answers between them: a replay reports several pictures a second, each taking 0.1 s or more to
  // apply (its bundle copied into the cache), and applied as their events were read they held
  // every request up for as long as the replay ran. A run that has exited stays live until its
  // verdicts are applied, so that nothing that waits for a run's end (a new run, a commit, Remove)
  // meets one half applied. close() applies what is left at once, then `shut` stops the queue.
  const queue = [];
  let draining = false;
  let shut = false;
  const enqueue = (job) => {
    queue.push(job);
    if (draining) return;
    draining = true;
    setImmediate(drain);
  };
  function drain() {
    const job = shut ? null : queue.shift();
    if (!job) {
      draining = false;
      return;
    }
    try {
      job();
    } finally {
      setImmediate(drain);
    }
  }
  // applied as it arrives: the stage holds the verdict by the time its event is written; one that
  // could not be read is tried again a moment later. A run removed meanwhile is not.
  const applyArrival = (n, out, part) => {
    if (!runs.has(n)) return;
    const a = applier();
    if (a.arrive(n, out, part)) onApplied(out);
    else if (a.errors.has(out))
      setTimeout(() => {
        if (!shut && runs.has(n) && applier().arrive(n, out, part)) onApplied(out);
      }, 500);
  };
  const eventOf = (record, e) => {
    const r = runs.get(record.n);
    r.events.push(e);
    r.facts = runFacts(record.tool, r.events);
    if (e.type === "picture" || e.type === "svg") {
      const [part, value] = verdictOfEvent(e);
      const v = r.verdicts.get(e.out) ?? { png: null, svg: null };
      v[part] = value;
      r.verdicts.set(e.out, v);
      enqueue(() => applyArrival(record.n, e.out, part));
    }
    onEvent(record, e);
  };
  const exitOf = (record) =>
    enqueue(() => {
      const r = runs.get(record.n);
      if (!r) return;
      r.live = false;
      r.handle = null;
      onExit(record);
    });
  const liveRuns = () => [...runs.values()].filter((r) => r.live);
  function start({ tool, args }) {
    const busy = liveRuns()[0];
    if (busy) throw new Error(`run ${busy.record.n} is running: a new run starts once it has ended`);
    const handle = startRun(session(), { tool, args }, { onEvent: eventOf, onExit: exitOf, onLine, command });
    runs.set(handle.run.n, {
      record: handle.run,
      live: true,
      handle,
      stopAsked: false,
      events: [],
      facts: runFacts(tool, []),
      verdicts: new Map(),
    });
    return handle;
  }
  return {
    runs,
    load,
    start,
    liveRuns,
    live: () => liveRuns().map((r) => r.handle),
    enqueue,
    close() {
      while (queue.length) queue.shift()();
      shut = true;
    },
  };
}
