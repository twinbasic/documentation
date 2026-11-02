// Records a child process writes on its stdout among the lines meant for a person, and
// the reading of them in its parent: a record is a line of its own, `@@<kind> <json>`.
// svgshot/redraw.mjs's shards end their output with one (`svgshot-result`); the
// screenshot review tool reads a run's events the same way (`shot-event`, --events). The
// other way, a parent stops a child with a line on its stdin (STOP_LINE).

/** The line that carries `value` as a record of `kind`. */
export const recordLine = (kind, value) => `@@${kind} ${JSON.stringify(value)}`;

/** Writes `value` as a record of `kind`, on a line of its own on stdout. */
export const writeRecord = (kind, value) => console.log(recordLine(kind, value));

/**
 * The record a line holds, as {kind, value}, when it is one of `kinds`; else null (a
 * line meant for a person). A record whose JSON does not parse throws.
 */
export function parseRecord(line, kinds) {
  const m = /^@@([\w-]+) /.exec(line);
  if (!m || !kinds.includes(m[1])) return null;
  return { kind: m[1], value: JSON.parse(line.slice(m[0].length)) };
}

/**
 * Reads `stream` (a child's stdout) line by line, each without its line ending:
 * `onRecord(kind, value)` for a record of one of `kinds`, `onLine(line)` for any other.
 * A last line with no line ending is read when the stream ends.
 */
export function readRecords(stream, kinds, { onRecord, onLine }) {
  let rest = "";
  const take = (line) => {
    const text = line.replace(/\r$/, "");
    const record = parseRecord(text, kinds);
    if (record) onRecord(record.kind, record.value);
    else onLine(text);
  };
  stream.on("data", (d) => {
    const lines = (rest + d).split("\n");
    rest = lines.pop();
    for (const line of lines) take(line);
  });
  stream.on("end", () => {
    if (rest) take(rest);
    rest = "";
  });
}

/**
 * The line a parent writes on a child's stdin to stop it: the child takes nothing further,
 * finishes what it has in hand, and ends as it would at its normal end.
 */
export const STOP_LINE = "stop";

/**
 * Calls `fn` once, when a line STOP_LINE arrives on `stream` (this process's stdin, as a
 * rule). Any other line is ignored. Returns a function that stops listening.
 */
export function onStop(stream, fn) {
  let rest = "";
  let done = false;
  const data = (d) => {
    const lines = (rest + d).split("\n");
    rest = lines.pop();
    if (done || !lines.some((line) => line.replace(/\r$/, "").trim() === STOP_LINE)) return;
    done = true;
    fn();
  };
  stream.on("data", data);
  return () => stream.off("data", data);
}

/** Asks the child process `child`, started with a piped stdin, to stop (onStop). */
export function sendStop(child) {
  if (child.stdin?.writable) child.stdin.write(`${STOP_LINE}\n`);
}
