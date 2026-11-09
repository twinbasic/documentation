// Unit tests for the folders an IDE leaves under %TEMP% (shutdownIde in scripts/lib/tb-ide.mjs):
// its temp folder and WebView2 profile, named for its slot, which shutdownIde removes once the
// IDE has gone.
//
// The folders are tested with no IDE: the handle names a process id that cannot be a process, so
// the IDE is already gone when shutdownIde looks at its folders, as it is after waitForExit.
//
// It also tests checkDefaults (scripts/lib/tb-defaults.mjs), which an IDE's start-up runs, on a
// fake page, and pageHook, which runs in that page: what it answers, what it drops, and that no
// error report leaves a tool's IDE. Those use a stand-in fetch, so that a failure here sends nothing.
//
// Runs with a bare `node --test test/ide-folders.test.mjs`: no tree, no IDE.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { shutdownIde, shutdownIdeAsync } from "../scripts/lib/tb-ide.mjs";
import { removeTreeAsync } from "../scripts/lib/tb-ide-copy.mjs";
import { BLANKED_KEYS, checkDefaults, pageHook } from "../scripts/lib/tb-defaults.mjs";

describe("the defaults hook in a page", () => {
  const saved = { location: globalThis.location, window: globalThis.window, fetch: globalThis.fetch };
  let sent;
  let stored;

  before(() => {
    sent = [];
    stored = [];
    Object.defineProperty(globalThis, "location", { configurable: true, value: { pathname: "/ide/main.htm" } });
    globalThis.window = globalThis;
    globalThis.fetch = async (url) => {
      sent.push(String(url?.url ?? url));
      return new Response("sent");
    };
    pageHook(BLANKED_KEYS);
    globalThis.hostAppObject = {
      GetIDESetting: async (key) => `real ${key}`,
      SaveIDESetting: (key) => stored.push(key),
      ReadFileDataBase64: async (file) => {
        stored.push(`read ${file}`);
        return `real ${file}`;
      },
    };
  });

  after(() => {
    delete globalThis.hostAppObject;
    delete globalThis.__tbDefaults;
    Object.defineProperty(globalThis, "location", { configurable: true, value: saved.location });
    globalThis.window = saved.window;
    globalThis.fetch = saved.fetch;
  });

  test("a tool's IDE answers no to error reporting, not the user's yes", async () => {
    assert.match(await globalThis.hostAppObject.GetIDESetting("ALLOWERRORREPORTINGV3"), /^DISAGREED_/);
  });

  test("an error report is counted and never sent, in any spelling of the address", async () => {
    for (const url of [
      "https://twinbasic.com/notify",
      "https://www.twinbasic.com/notify",
      "HTTPS://TWINBASIC.COM/NOTIFY",
      new Request("https://twinbasic.com/notify", { method: "POST" }),
    ]) {
      assert.equal((await fetch(url, { method: "POST", body: "{}" })).status, 200);
    }
    assert.deepEqual(sent, []);
    assert.equal(window.__tbDefaults.reports, 4);
  });

  test("control: any other request goes through, another page of the same site included", async () => {
    await fetch("https://twinbasic.com/preorder.html");
    await fetch("https://example.com/notify");
    assert.deepEqual(sent, ["https://twinbasic.com/preorder.html", "https://example.com/notify"]);
    assert.equal(window.__tbDefaults.reports, 4);
  });

  test("a key it answers is not saved, and any other is", () => {
    const host = globalThis.hostAppObject;
    host.SaveIDESetting("ALLOWERRORREPORTINGV3", "AGREED_01-JAN-2026");
    host.SaveIDESetting("NEWFRONTPAGE", "{}");
    host.SaveIDESetting("PUBLISHER", "x");
    assert.deepEqual(stored, ["PUBLISHER"]);
  });

  test("the recent-projects list (BETA 1042) is the page's own, and is never written", async () => {
    const host = globalThis.hostAppObject;
    stored.length = 0;
    assert.equal(await host.ReadFileDataBase64("GetRecentsList"), "");
    window.__tbRecents = "C:\\Projects\\Alpha.twinproj?C:\\Projects\\Beta.twinproj";
    assert.equal(await host.ReadFileDataBase64("GetRecentsList"), window.__tbRecents);
    delete window.__tbRecents;
    await host.ReadFileDataBase64("AddRecentsList:C:\\Users\\someone\\a.twinproj");
    await host.ReadFileDataBase64("RemoveRecentsList:C:\\Users\\someone\\a.twinproj");
    assert.deepEqual(stored, []);
    assert.ok(!window.__tbDefaults.keys.some((k) => k.includes("\\")), "a key, never a path, is recorded");
  });

  test("control: any other file is read from the host", async () => {
    stored.length = 0;
    assert.equal(await globalThis.hostAppObject.ReadFileDataBase64("C:\\x.bin"), "real C:\\x.bin");
    assert.deepEqual(stored, ["read C:\\x.bin"]);
  });
});

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
  // `main` is whether main.htm has committed: a reload before then loads about:blank again, and
  // the navigation to main.htm is lost.
  const fakePage = ({ own = false } = {}) => {
    const state = { hooked: false, marked: false, main: true, lost: false, reloads: 0, added: 0 };
    const c = {
      evaluate: async (expression) =>
        expression.includes("readyState")
          ? `${state.main ? "main.htm" : "about:blank"}, complete`
          : { main: state.main, ran: state.main && state.marked },
      send: async (method) => {
        if (method === "Page.addScriptToEvaluateOnNewDocument") {
          state.added++;
          if (own) state.hooked = true;
        }
        if (method === "Page.reload") {
          state.reloads++;
          if (!state.main) state.lost = true;
          state.marked = state.hooked;
        }
        return {};
      },
    };
    // main.htm commits after `ms`, the hook's script run in it when `marked`, unless a reload lost it
    const commit = (ms, marked) =>
      setTimeout(() => {
        if (state.lost) return;
        state.main = true;
        state.marked = marked;
      }, ms);
    return { state, c, commit };
  };

  test("waits for a page still on its way to main.htm, and does not reload one that ran the hook", async () => {
    const { state, c, commit } = fakePage();
    state.main = false;
    commit(200, true);
    await checkDefaults(c, { error: null, ready: Promise.resolve() });
    assert.deepEqual([state.main, state.reloads], [true, 0]);
  });

  test("reloads a page that committed main.htm late without the hook only once it has committed", async () => {
    const { state, c, commit } = fakePage({ own: true });
    state.main = false;
    commit(200, false);
    await checkDefaults(c, { error: null, ready: Promise.resolve() });
    assert.deepEqual([state.lost, state.marked, state.reloads], [false, true, 1]);
  });

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
