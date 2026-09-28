// The frame every add-in scenario file is written in: one describe block with
// the file's lane (addinLane in scripts/lib/tb-lane.mjs), skipped when there
// is no lane, and the lane closed after it.
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
// Outside addin-test.bat there is no lane, so the block is skipped and a bare
// `node --test` never starts an IDE.

import { after, describe } from "node:test";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";

/**
 * A describe block with this file's lane.
 *
 * `fn` declares the block's hooks and tests, as a describe callback does, and
 * is given the lane. The lane is closed after the block. A function `fn`
 * returns runs after that, even when closing the lane fails, for whatever else
 * the block opened (panes.test.mjs's page server).
 *
 * @param {string} title
 * @param {(lane: object) => (void | (() => unknown))} fn
 */
export function scenario(title, fn) {
  const lane = addinLane();
  describe(title, { skip: lane ? false : "run it with addin-test.bat" }, () => {
    const cleanup = fn(lane);
    after(async () => {
      try {
        await lane.close();
      } finally {
        await cleanup?.();
      }
    });
  });
}
