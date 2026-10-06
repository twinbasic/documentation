// What the Windows Application log recorded about a program run: above all, the
// record Windows Error Reporting writes for a program that ended on an exception
// it did not handle, an "Application Error" record (event 1000), naming the
// program's path and the exception code.
//
// An exit code does not say it. A VB6 exe that dies of an access violation exits
// with code 0 (scripts/lib/vb6.mjs, 11 at the top), and a program can choose any
// exit code of its own. THE RECORD IS WRITTEN ONLY FOR A PROGRAM STARTED THROUGH
// tb-launch.ps1 (launchOnDesktop): a child Node spawns directly inherits Node's
// error mode, which turns Windows Error Reporting off, and leaves no record.

import { execFileSync } from "node:child_process";

const XML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/**
 * The Application log's records from `provider` with the event id `id`, written at or
 * after `since` (a Date.now() value taken before the program started), oldest first, or
 * none when the log cannot be read.
 *
 * @returns {{time: number, data: string[]}[]}  each record's time and its unnamed data, in order
 */
export function applicationEvents(provider, id, since) {
  const ms = Math.max(0, Date.now() - since) + 5000;
  const query = `*[System[Provider[@Name='${provider}'] and (EventID=${id}) and TimeCreated[timediff(@SystemTime) <= ${ms}]]]`;
  let xml;
  try {
    xml = execFileSync("wevtutil", ["qe", "Application", `/q:${query}`, "/f:xml"], {
      encoding: "utf8",
      windowsHide: true,
    });
  } catch {
    return [];
  }
  const events = [];
  for (const event of xml.split("</Event>")) {
    // The query's window reaches back before `since`, and a caller may run one exe again
    // after a run that did not finish: a record from before this run is another run's.
    const at = /<TimeCreated SystemTime='([^']+)'/.exec(event);
    const time = at ? Date.parse(at[1]) : Number.NaN;
    if (!(time >= since)) continue;
    const data = [...event.matchAll(/<Data>([^<]*)<\/Data>/g)].map((m) =>
      m[1].replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => XML_ENTITIES[e]),
    );
    events.push({ time, data });
  }
  return events;
}

/**
 * The fault that Windows Error Reporting recorded in the Application log for `exe`, a
 * full path, at or after `since`, or null when there is none or the log cannot be read.
 *
 * @returns {{code: string, module: string, offset: string} | null}
 *   the exception code, the faulting module and the offset in it, in hex as the record has them
 */
export function recordedFault(exe, since) {
  const want = exe.toLowerCase();
  // The record's data are unnamed, in a fixed order: the app's name, version and time stamp,
  // the module's name, version and time stamp, the exception code, the offset, the process
  // id, its start time, then the app's path.
  for (const { data } of applicationEvents("Application Error", 1000, since)) {
    if (data[10]?.toLowerCase() === want) return { code: data[6], module: data[3], offset: data[7] };
  }
  return null;
}

/** A fault from recordedFault, as a report says it. */
export const faultText = ({ code, module, offset }) => `exception 0x${code} in ${module} at offset 0x${offset}`;
