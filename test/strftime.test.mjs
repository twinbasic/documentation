// Unit tests for builder/strftime.mjs, the footer's date formatter.
//
// No page sets `last_modified_date`, so no build calls the formatter and
// the build's own output cannot catch a fault in it. These call it directly.
//
// Runs with a bare `node --test test/strftime.test.mjs`: no tree, no build.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatDate } from "../builder/strftime.mjs";

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

describe("formatDate", () => {
  test("the site's last_edit_time_format", () => {
    assert.equal(formatDate(at(2026, 9, 3, 16, 5), "%b %e %Y at %I:%M %p"), "Sep  3 2026 at 04:05 PM");
    assert.equal(formatDate(at(2026, 1, 30, 0, 7), "%b %e %Y at %I:%M %p"), "Jan 30 2026 at 12:07 AM");
  });

  test("%j is the day of the year in three digits", () => {
    assert.equal(formatDate(at(2026, 1, 1), "%j"), "001");
    assert.equal(formatDate(at(2026, 2, 14), "%j"), "045");
    assert.equal(formatDate(at(2026, 12, 31), "%j"), "365");
    assert.equal(formatDate(at(2024, 12, 31), "%j"), "366");
  });

  test("%j does not depend on the time of day", () => {
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 15, 28]) {
        assert.equal(formatDate(at(2026, m, d, 0, 0), "%j"), formatDate(at(2026, m, d, 23, 59), "%j"));
      }
    }
  });

  test("an unknown token throws; a non-date gives an empty string", () => {
    assert.throws(() => formatDate(at(2026, 1, 1), "%Q"), /Unsupported strftime token: %Q/);
    assert.equal(formatDate("not a date", "%Y"), "");
    assert.equal(formatDate(undefined, "%Y"), "");
  });
});
