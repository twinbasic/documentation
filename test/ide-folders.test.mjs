// Unit tests for the folders an IDE leaves under %TEMP% (shutdownIde in scripts/lib/tb-ide.mjs):
// its temp folder and WebView2 profile, named for its slot, which shutdownIde removes once the
// IDE has gone.
//
// The folders are tested with no IDE: the handle names a process id that cannot be a process, so
// the IDE is already gone when shutdownIde looks at its folders, as it is after waitForExit.
//
// It also tests checkDefaults (scripts/lib/tb-defaults.mjs), which an IDE's start-up runs, on a
// fake page.
//
// Runs with a bare `node --test test/ide-folders.test.mjs`: no tree, no IDE.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { shutdownIde, shutdownIdeAsync } from "../scripts/lib/tb-ide.mjs";
import { removeTreeAsync } from "../scripts/lib/tb-ide-copy.mjs";
import { checkDefaults } from "../scripts/lib/tb-defaults.mjs";

describe("the folders an IDE leaves", () => {
  // Windows process ids are multiples of four, so this is never a process, and
  // a taskkill of it ends nothing.
  const NO_PROCESS = 2147483647;
  let root;

  before(() => {
    root = mkdtempSync(path.join(tmpdir(), "tb-ide-folders-"));
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  // A folder the way an IDE leaves it: nested, with files.
  function made(name) {
    const dir = path.join(root, name);
    mkdirSync(path.join(dir, "EBWebView", "Default"), { recursive: true });
    writeFileSync(path.join(dir, "EBWebView", "Default", "History"), "x");
    writeFileSync(path.join(dir, "Local State"), "x");
    return dir;
  }

  test("shutdownIde removes the IDE's folders once it is gone, and no other", () => {
    const [temp, profile, other] = [made("a-tmp"), made("a-wv2"), made("a-other")];
    shutdownIde({ pid: NO_PROCESS, launcher: null, folders: [temp, profile] });
    assert.equal(existsSync(temp), false);
    assert.equal(existsSync(profile), false);
    assert.equal(existsSync(other), true);
  });

  test("shutdownIdeAsync does the same", async () => {
    const [temp, profile, other] = [made("b-tmp"), made("b-wv2"), made("b-other")];
    await shutdownIdeAsync({ pid: NO_PROCESS, launcher: null, folders: [temp, profile] });
    assert.equal(existsSync(temp), false);
    assert.equal(existsSync(profile), false);
    assert.equal(existsSync(other), true);
  });

  test("a folder that is not there, a handle without folders and no handle are accepted", async () => {
    const gone = [path.join(root, "never-made")];
    shutdownIde({ pid: NO_PROCESS, launcher: null, folders: gone });
    await shutdownIdeAsync({ pid: NO_PROCESS, launcher: null, folders: gone });
    shutdownIde({ pid: NO_PROCESS, launcher: null });
    await shutdownIdeAsync({ pid: NO_PROCESS, launcher: null });
    shutdownIde(null);
    await shutdownIdeAsync(null);
  });

  test("removeTreeAsync removes a tree, and a folder that is not there", async () => {
    const dir = made("c");
    await removeTreeAsync(dir);
    assert.equal(existsSync(dir), false);
    await removeTreeAsync(dir);
  });
});

describe("the check that an IDE runs with the default settings (checkDefaults)", () => {
  // A page that runs the hook's script only when it loads after the hook has attached, as the
  // IDE's main.htm does: a reload before then loads it unhooked again.
  // `own` is whether a script the check adds on its own connection runs at the next document.
  const fakePage = ({ own = false } = {}) => {
    const state = { hooked: false, marked: false, reloads: 0, added: 0 };
    const c = {
      evaluate: async (expression) => (expression.includes("readyState") ? "main.htm, complete" : state.marked),
      send: async (method) => {
        if (method === "Page.addScriptToEvaluateOnNewDocument") {
          state.added++;
          if (own) state.hooked = true;
        }
        if (method === "Page.reload") {
          state.reloads++;
          state.marked = state.hooked;
        }
        return {};
      },
    };
    return { state, c };
  };

  test("waits for a hook still on its way before it reloads the page", async () => {
    const { state, c } = fakePage();
    const hook = {
      error: null,
      ready: new Promise((r) =>
        setTimeout(() => {
          state.hooked = true;
          r();
        }, 200),
      ),
    };
    await checkDefaults(c, hook);
    assert.deepEqual([state.marked, state.reloads], [true, 1]);
  });

  test("does not reload a page the hook reached before its document committed", async () => {
    const { state, c } = fakePage();
    state.marked = true;
    await checkDefaults(c, { error: null, ready: Promise.resolve() });
    assert.equal(state.reloads, 0);
  });

  test("adds the script on its own connection before the reload, so a page the hook's session missed is hooked", async () => {
    const { state, c } = fakePage({ own: true });
    await checkDefaults(c, { error: null, ready: Promise.resolve() });
    assert.deepEqual([state.marked, state.added, state.reloads], [true, 1, 1]);
  });

  test("says what the page, the check and the hook did when the page is still not hooked", async () => {
    const { c } = fakePage();
    await assert.rejects(
      checkDefaults(c, {
        error: null,
        failures: [],
        trace: ["0.4 s connected", "0.5 s ready"],
        ready: Promise.resolve(),
      }),
      (e) =>
        /its page ran no hook, even after a reload/.test(e.message) &&
        /the page is main\.htm, complete/.test(e.message) &&
        /the script added to the page/.test(e.message) &&
        /the hook: 0\.4 s connected, 0\.5 s ready/.test(e.message),
    );
  });

  test("says why when the hook could not be installed", async () => {
    const { c } = fakePage();
    await assert.rejects(
      checkDefaults(c, {
        error: new Error("the IDE wrote no DevToolsActivePort in a minute"),
        ready: Promise.resolve(),
      }),
      /the IDE's settings were not made the defaults: the IDE wrote no DevToolsActivePort in a minute/,
    );
  });
});
