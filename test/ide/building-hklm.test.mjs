// Register DLLs to HKLM in an IDE that is not elevated, with real clicks: the
// defects queued in BUGS-TO-REPORT.md from the trials for the Building pages
// (their fact sheet's B13 and B12), "The HKLM warning shows twice as a project
// opens, and for a Standard EXE too" and "Delete It And Continue in Clean's
// box builds a new DLL instead of deleting the old one". Three IDEs, one after
// the other: test/ide/probes/building-ax as it is (registering in HKCU), then
// with Register DLLs to HKLM, then test/ide/probes/building-exe with it.
//
// The HKCU build writes the class's registration into HKCU; the Clean after it
// removes it, and the test checks that every key is gone (building-kit.mjs's
// axKeys: the fixture's fixed GUIDs, its ProgID and its type library, which is
// the project's id). The HKLM builds fail to register, since the IDE is not
// elevated, and write nothing; the last test checks that no key of the
// fixture's exists in HKCU or HKLM. Nothing here writes the registry itself.
//
// Each test states what BETA 1010 does. If one fails after an IDE update, the
// IDE has changed: update the matching entry in BUGS-TO-REPORT.md or
// bugs/filed/, and then this file.
//
// Run it with ide-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { scenario } from "../addin/scenario.mjs";
import {
  answer,
  axKeys,
  boxes,
  guard,
  ideSettings,
  J,
  linesAfter,
  pageErrors,
  presentKeys,
  press,
  sleep,
  TEMPLATE_BUILD_PATH,
  variant,
} from "./building-kit.mjs";

const AX = "BuildProbeAx";
const HKLM_BOX =
  "[twinBASIC] WARNING: This project registers itself to the HKEY_LOCAL_MACHINE registry hive which requires ADMIN permissions. The twinBASIC IDE is not currently running elevated, and so the registration of the DLL will fail during the build process. For the build to be successful, please restart the twinBASIC IDE using the 'Run As Administrator' Windows option. {Continue Anyway}";
const UNREGISTER_BOX =
  "[twinBASIC] Build failed: unable to unregister the previous DLL. Continue anyway? {Delete It And Continue/Cancel}";

scenario("Building: Register DLLs to HKLM", (lane) => {
  let c, keys;
  const dll = (folder) => path.join(folder, "Build", `${AX}_win32.dll`);

  // Open a project, answering each HKLM warning with Continue Anyway as it
  // shows: the project's load waits for it. The boxes shown, each counted once:
  // a box still on screen just after its click is marked in the page as seen.
  async function openAnswering(src, folder) {
    const answered = [];
    let done = false;
    const opening = lane.open(src, { folder, buildPath: TEMPLATE_BUILD_PATH }).finally(() => {
      done = true;
    });
    const answering = (async () => {
      for (let quietAfter = 0; !done || quietAfter < 10; ) {
        const cc = lane.c;
        if (cc) {
          try {
            const { fresh, showing } = await cc.evaluate(`(() => {
              const ms = [...document.querySelectorAll(".modalDialogContainer")].filter((m) => m.getBoundingClientRect().width && m.innerText.includes("HKEY_LOCAL_MACHINE"));
              const fresh = ms.filter((m) => !m.__seen);
              for (const m of fresh) m.__seen = true;
              return { fresh: fresh.length, showing: ms.length };
            })()`);
            if (fresh) {
              const b = (await boxes(cc)).find((x) => x.includes("HKEY_LOCAL_MACHINE"));
              for (let i = 0; i < fresh; i++) answered.push(b);
            }
            if (showing) {
              await answer(cc, "Continue Anyway");
              quietAfter = 0;
              continue;
            }
          } catch {}
        }
        if (done) quietAfter++;
        await sleep(300);
      }
    })();
    c = await opening;
    await answering;
    await guard(c);
    return answered;
  }

  before(async () => {
    const folder = path.join(lane.work, "ax");
    c = await lane.open(variant("building-ax", path.join(lane.work, "src-ax")), {
      folder,
      buildPath: TEMPLATE_BUILD_PATH,
    });
    await guard(c);
    keys = axKeys((await ideSettings(c, AX))["project.id"]);
  });

  test("control: an ActiveX DLL registered in HKCU opens with no box, and Clean after its build deletes it and its registration", async () => {
    const folder = path.join(lane.work, "ax");
    assert.deepEqual(await boxes(c), []);
    assert.deepEqual(presentKeys(keys), [], "the fixture's keys exist before its build");
    const b = await press(c, "build");
    let cleaned = false;
    try {
      assert.ok(
        b.lines.some((l) =>
          /^\[REGISTER\] type-library registration completed\.\s+DllRegisterServer\(\) returned OK$/.test(l),
        ),
        J(b.lines),
      );
      assert.ok(existsSync(dll(folder)));
      assert.ok(presentKeys(keys).length > 0, "the build registered nothing");
      const r = await press(c, "clean");
      cleaned = true;
      assert.ok(
        r.lines.some((l) =>
          /^\[UNREGISTER\] previous type-library deregistration completed\.\s+DllUnregisterServer\(\) returned OK$/.test(
            l,
          ),
        ),
        J(r.lines),
      );
      assert.ok(r.lines.includes("[BUILD-CLEAN] build cleanup completed."), J(r.lines));
      assert.deepEqual(r.boxes, []);
    } finally {
      if (!cleaned) await press(c, "clean");
    }
    assert.equal(existsSync(dll(folder)), false);
    assert.deepEqual(presentKeys(keys), [], "Clean left the registration");
  });

  test("an ActiveX DLL with Register DLLs to HKLM shows the HKLM warning twice as it opens", async () => {
    await lane.closeProject();
    const src = variant("building-ax", path.join(lane.work, "src-ax-hklm"), {
      "project.dllRegisterLocalMachine": true,
    });
    const answered = await openAnswering(src, path.join(lane.work, "ax-hklm"));
    assert.deepEqual(answered, [HKLM_BOX, HKLM_BOX]);
    assert.deepEqual(await boxes(c), []);
  });

  test("control: at Build, Delete It And Continue in the box of a failed deregistration builds the DLL again", async () => {
    const folder = path.join(lane.work, "ax-hklm");
    const first = await press(c, "build");
    assert.ok(
      first.lines.some((l) =>
        /^\[REGISTER\] type-library registration FAILED\.\s+DllRegisterServer\(\) returned -2147220992$/.test(l),
      ),
      J(first.lines),
    );
    assert.equal(first.lines.at(-1), "[BUILD] failed");
    assert.ok(existsSync(dll(folder)));
    const second = await press(c, "build");
    assert.deepEqual(second.boxes, [UNREGISTER_BOX]);
    assert.ok(
      second.lines.some((l) =>
        /^\[UNREGISTER\] type-library deregistration FAILED\.\s+DllUnregisterServer\(\) returned -2147220991$/.test(l),
      ),
      J(second.lines),
    );
    const before = statSync(dll(folder)).mtimeMs;
    await answer(c, "Delete It And Continue");
    const lines = await linesAfter(c, second);
    assert.ok(lines.includes(`[LINKER] SUCCESS created output file '${dll(folder)}'`), J(lines));
    assert.ok(statSync(dll(folder)).mtimeMs > before, "the DLL was not written again");
    assert.deepEqual(presentKeys(keys), []);
  });

  test("Clean shows the same box, and its Delete It And Continue builds a new DLL instead of deleting the old one", async () => {
    const folder = path.join(lane.work, "ax-hklm");
    const r = await press(c, "clean");
    assert.deepEqual(r.boxes, [UNREGISTER_BOX]);
    const before = statSync(dll(folder)).mtimeMs;
    await answer(c, "Delete It And Continue");
    const lines = await linesAfter(c, r);
    assert.ok(lines.includes("[BUILD] Starting..."), J(lines));
    assert.ok(lines.includes(`[LINKER] SUCCESS created output file '${dll(folder)}'`), J(lines));
    assert.ok(!lines.some((l) => l.startsWith("[BUILD-CLEAN]")), J(lines));
    assert.ok(existsSync(dll(folder)), "the DLL was deleted");
    assert.ok(statSync(dll(folder)).mtimeMs > before, "the DLL was not written again");
    assert.deepEqual(presentKeys(keys), []);
    assert.deepEqual(await pageErrors(c), []);
  });

  test("a Standard EXE with Register DLLs to HKLM shows the HKLM warning too, twice as it opens", async () => {
    await lane.closeProject();
    const src = variant("building-exe", path.join(lane.work, "src-exe-hklm"), {
      "project.dllRegisterLocalMachine": true,
    });
    const answered = await openAnswering(src, path.join(lane.work, "exe-hklm"));
    assert.deepEqual(answered, [HKLM_BOX, HKLM_BOX]);
    assert.deepEqual(await boxes(c), []);
  });

  test("no registration of the fixture's is left in HKCU or HKLM", () => {
    assert.deepEqual(presentKeys(keys), []);
  });
});
