// What a lane runner's report says (scripts/lib/lane-runner.mjs, behind ide_test.mjs and
// addin_test.mjs): each lane's verdict, and each test's mark within the lane. A lane's report is
// the block from its "--- <name> (<desktop>): <verdict> in <s> s" line to the next lane's, and
// node:test's spec reporter marks a test that passed and one that failed in it.
//
// scripts/bug_repro.mjs judges a lane reproducer by the marks of the tests it names, and
// scripts/recheck_callouts.mjs a `lane` item by its lane's verdict, both from this reading.

/** The spec reporter's marks for a test that passed and one that failed. */
export const PASSED = "\u{2714}";
export const FAILED = "\u{2716}";

// A lane's first line. A lane that got no slot has no desktop in it.
const HEAD_RE = /^--- (\S+)(?: \([^)]*\))?: (passed|FAILED|TIMED OUT)\b/;

/**
 * Each lane's report: its verdict ("passed", "FAILED" or "TIMED OUT") and its lines, the first
 * line included.
 *
 * @param {string} text  the runner's whole output
 * @returns {Map<string, {verdict: string, lines: string[]}>}
 */
export function laneBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = new Map();
  let current = null;
  for (const line of lines) {
    const m = HEAD_RE.exec(line);
    if (m) {
      current = { verdict: m[2], lines: [line] };
      blocks.set(m[1], current);
    } else if (line.startsWith("--- ")) current = null;
    else if (current) current.lines.push(line);
  }
  return blocks;
}

/**
 * A test's mark in a lane's lines: "failed" when any line marks it failed, "passed" when one
 * marks it passed, null when none names it.
 */
export function testMark(lines, test) {
  const found = lines
    .map((l) => l.trimStart())
    .filter((l) => l.startsWith(`${PASSED} ${test} (`) || l.startsWith(`${FAILED} ${test} (`));
  if (!found.length) return null;
  return found.some((l) => l.startsWith(FAILED)) ? "failed" : "passed";
}
