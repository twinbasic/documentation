// P13 in WIP.HelpAddin.md, measured: does the IDE's HTTP server serve a file
// placed under its install's ide\ folder? That is the one way to show pages
// inside the IDE with no network that keeps them on a real origin, since a
// page served from http://localhost cannot frame a file:// URL.
//
// The files go in the lane's copy of the install, never the real one, before
// its IDE starts. The IDE's page is http://localhost:<port>/<passkey>/main.htm
// with <base href="/<passkey>/">, served by bin\twinBASIC_win32.exe --ide=<pid>,
// so a relative URL is a path below the ide folder. The page fetches each file
// the way a frame's src would be resolved.
//
// Each test states what BETA 983 does. If one fails after an IDE update, the
// IDE has changed: update P13 and "Offline" in WIP.HelpAddin.md, and then this
// file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { addinLane } from "../../scripts/lib/tb-lane.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");
const lane = addinLane();

// ------------------------------------------------------------------ the files

// Every byte value, so that a server that treated a file as text would show.
const BYTES = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 7 + (i >> 8)) & 255));
const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="style.css"><script src="script.js"></script></head>
<body><h1>${title}</h1>${body}</body></html>`;
// The kinds of file the offline site is made of, with a name holding a space
// as three of its pages have, and a file the size of its search index.
const FILES = {
  "p13/page.html": page("P13 page", "<p>dashes — –, arrow →, times ×, han 中</p>"),
  "p13/deep/two/page.html": page("P13 deep page", "<p>two folders down</p>"),
  "p13/Form Designer.html": page("P13 spaced name", "<p>a space in the name</p>"),
  "p13/page.htm": page("P13 htm", "<p>.htm</p>"),
  "p13/style.css": "body { color: rgb(255, 0, 0); }\n",
  "p13/script.js": "window.__p13 = \"script ran\";\n",
  "p13/module.mjs": "export const p13 = 1;\n",
  "p13/data.json": "{\"p13\": true}\n",
  "p13/image.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"4\" height=\"4\"><rect width=\"4\" height=\"4\"/></svg>\n",
  "p13/notes.txt": "plain text\n",
  "p13/image.png": BYTES, "p13/image.jpg": BYTES, "p13/image.gif": BYTES, "p13/font.woff2": BYTES,
  "p13/big.js": `// ${"x".repeat(4 * 1024 * 1024)}\n`,
};
const sha = (b) => createHash("sha256").update(b).digest("hex");
const url = (rel) => rel.split("/").map(encodeURIComponent).join("/");

// Fetch from the IDE's page, relative to its base URL: status, content type
// and a hash of the body.
const fetchFromPage = (c, rel) => c.evaluate(`(async () => {
  const u = new URL(${JSON.stringify(rel)}, document.baseURI);
  const r = await fetch(u, { cache: "no-store" });
  const b = new Uint8Array(await r.arrayBuffer());
  const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", b)),
                       (x) => x.toString(16).padStart(2, "0")).join("");
  return { href: u.href, status: r.status, type: r.headers.get("content-type"), sha: h };
})()`, { awaitPromise: true, timeout: 30000 });

// ------------------------------------------------------------------ the tests

describe("P13: files placed under the install's ide folder", { skip: lane ? false : "run it with addin-test.bat" }, () => {
  let c, ideDir;
  before(async () => {
    ideDir = path.join(path.dirname(lane.copy()), "ide");
    const rel = path.relative(lane.work, ideDir);
    assert.ok(rel && !rel.startsWith("..") && !path.isAbsolute(rel), `${ideDir} is not in the lane's own copy`);
    for (const [name, body] of Object.entries(FILES)) {
      const p = path.join(ideDir, ...name.split("/"));
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, body);
    }
    c = await lane.open(HOST);
  });
  after(() => lane?.close());

  test("every file is served below the page's base URL, byte for byte", async () => {
    assert.match(await c.evaluate("document.baseURI"), /^http:\/\/localhost:\d+\/%7B[0-9A-F-]{36}%7D\/$/i);
    for (const [name, body] of Object.entries(FILES)) {
      const r = await fetchFromPage(c, url(name));
      assert.equal(r.status, 200, `${name}: ${JSON.stringify(r)}`);
      assert.equal(r.sha, sha(Buffer.from(body)), `${name} came back changed`);
    }
  });

  test("a file written after the IDE started is served too", async () => {
    const body = page("P13 late", "<p>written after the IDE started</p>");
    writeFileSync(path.join(ideDir, "p13", "late.html"), body);
    const r = await fetchFromPage(c, "p13/late.html");
    assert.equal(r.status, 200);
    assert.equal(r.sha, sha(Buffer.from(body)));
  });

  test("the content type follows the extension, and six of the site's kinds get none", async () => {
    const types = {};
    for (const name of Object.keys(FILES)) types[path.extname(name)] = (await fetchFromPage(c, url(name))).type;
    assert.deepEqual(types, {
      ".htm": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".gif": "image/gif",
      ".html": null, ".mjs": null, ".json": null, ".txt": null, ".jpg": null, ".woff2": null,
    });
  });

  test("a query string makes a request a 404; a fragment does not", async () => {
    assert.equal((await fetchFromPage(c, "p13/page.html?theme=dark")).status, 404);
    assert.equal((await fetchFromPage(c, "p13/page.html#theme=dark")).status, 200);
  });

  test("a folder is not a page, and nothing is served without the passkey", async () => {
    assert.equal((await fetchFromPage(c, "p13/")).status, 404);
    assert.equal((await fetchFromPage(c, "p13/deep")).status, 404);
    assert.equal((await fetchFromPage(c, "/p13/page.html")).status, 404);
    assert.equal((await fetchFromPage(c, "/main.htm")).status, 404);
  });

  test("a frame given a relative src shows the page on the IDE's own origin, where its script reaches the IDE's globals", async () => {
    // An add-in's iframe is in the same document, inside a tool window's
    // shadow root, and resolves a relative src against the same base URL.
    await c.evaluate(`(() => { const f = document.createElement("iframe"); f.id = "p13frame";
      f.style.cssText = "position:fixed;left:0;top:0;width:400px;height:300px;z-index:99999";
      f.src = "p13/page.html"; document.body.appendChild(f); })()`);
    try {
      assert.ok(await waitFor(c, (c) => c.evaluate(`(() => { const d = document.getElementById("p13frame").contentDocument;
        return !!d && d.readyState === "complete" && d.title === "P13 page"; })()`)), "the frame did not load the page");
      const r = await c.evaluate(`(() => { const w = document.getElementById("p13frame").contentWindow;
        return { href: w.location.href, base: document.baseURI, color: w.getComputedStyle(w.document.body).color,
                 script: w.__p13, reach: typeof w.parent.openEditors }; })()`);
      assert.equal(r.href, `${r.base}p13/page.html`);
      assert.equal(r.color, "rgb(255, 0, 0)", "the page's stylesheet did not apply");
      assert.equal(r.script, "script ran", "the page's script did not run");
      assert.equal(r.reach, "object", "the framed page could not reach the IDE page's globals");
    } finally {
      await c.evaluate(`document.getElementById("p13frame")?.remove()`);
    }
  });
});
