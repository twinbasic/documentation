// The frame every add-in scenario file is written in: one describe block with
// the file's lane (addinLane in scripts/lib/tb-lane.mjs), skipped when there
// is no lane, and the lane closed by the block's last test.
//
//     scenario("...", (lane) => {
//       let c;
//       before(async () => {
//         await lane.addSample("Sample 15");
//         c = await lane.open(HOST);
//       });
//       test("...", async () => { ...tb-operate.mjs calls on c... });
//     });
//
// The scenario files under test/ide use it too. Outside addin-test.bat and
// ide-test.bat there is no lane, so the block is skipped and a bare
// `node --test` never starts an IDE.

import { after, describe, test } from "node:test";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";

/**
 * A describe block with this file's lane.
 *
 * `fn` declares the block's hooks and tests, as a describe callback does, and
 * is given the lane. The block's last test closes the lane, so a compiler
 * crash or a javascript dialog that the close finds fails the file: a throw
 * from an `after` hook leaves `node --test`'s exit code 0. The `after` hook
 * closes the lane only when that test never ran, as when a `before` hook
 * fails. A function `fn` returns runs after the close, even when the close
 * fails, for whatever else the block opened (panes.test.mjs's page server).
 *
 * @param {string} title
 * @param {(lane: object) => (void | (() => unknown))} fn
 */
export function scenario(title, fn) {
  const lane = addinLane();
  describe(title, { skip: lane ? false : "run it with addin-test.bat or ide-test.bat" }, () => {
    const cleanup = fn(lane);
    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      try {
        await lane.close();
      } finally {
        await cleanup?.();
      }
    };
    test("the lane closes with nothing found", close);
    after(close);
  });
}
