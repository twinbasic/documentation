// Records a child process writes on its stdout among the lines meant for a person, and
// the reading of them in its parent: a record is a line of its own, `@@<kind> <json>`.
// svgshot/redraw.mjs's shards end their output with one (`svgshot-result`); the
// screenshot review tool reads a run's events the same way.

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
