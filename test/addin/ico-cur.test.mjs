// The ICO Designer that ships with BETA 1045 (Sample 25, tbIcoDesignerAddIn.dll) against a
// cursor file. The add-in registers itself as the default designer for .ico and .cur, but its
// reader takes only a file whose header says icon (type 1): a .cur says cursor (type 2). This
// lane puts the install's own DLL into its copy of the install, writes the same 16x16 picture
// as Pic.ico and as Pic.cur into a copy of the host project, opens each the way a double-click
// does, and reads the status line of the designer tab that opens.
//
// Each test states what BETA 1045 does; the .ico one is the control. If the .cur one fails
// after an IDE update, the add-in has changed: update the entry in BUGS-TO-REPORT.md
// (ico-designer-cur-unreadable), the NOTE on docs/IDE/AddIns/IcoEditor.md, and then this file.
//
// Run it with addin-test.bat, which gives it a lane; on its own it is skipped.

import assert from "node:assert/strict";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadedAddins } from "../../scripts/lib/tb-ide-addins.mjs";
import { waitFor } from "../../scripts/lib/tb-operate.mjs";
import { scenario } from "./scenario.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(HERE, "host");

// A 16x16 32-bit picture, all opaque red, as an icon (type 1) or a cursor (type 2, with its
// hotspot at 0,0 where an icon has planes and bit count).
function iconFile(type) {
  const n = 16;
  const xor = n * n * 4;
  const and = n * 4; // rows of 32 bits
  const dib = 40 + xor + and;
  const b = Buffer.alloc(6 + 16 + dib);
  b.writeUInt16LE(0, 0);
  b.writeUInt16LE(type, 2);
  b.writeUInt16LE(1, 4);
  b[6] = n;
  b[7] = n;
  b.writeUInt16LE(type === 1 ? 1 : 0, 10); // planes, or hotspot x
  b.writeUInt16LE(type === 1 ? 32 : 0, 12); // bit count, or hotspot y
  b.writeUInt32LE(dib, 14);
  b.writeUInt32LE(22, 18);
  let p = 22;
  b.writeUInt32LE(40, p);
  b.writeInt32LE(n, p + 4);
  b.writeInt32LE(n * 2, p + 8);
  b.writeUInt16LE(1, p + 12);
  b.writeUInt16LE(32, p + 14);
  b.writeUInt32LE(xor + and, p + 20);
  p += 40;
  for (let i = 0; i < n * n; i++, p += 4) b.writeUInt32LE(0xffff0000, p); // BGRA: red, opaque
  return b;
}

// The status line each designer tab's shadow root shows, one entry per root that has one.
const STATUSES_JS = `(() => {
  const re = /Imported ICO|Unsupported\\/corrupt ICO|New blank icon|Imported non-square/;
  const out = [];
  const walk = (root) => {
    for (const e of root.querySelectorAll("*")) {
      if (!e.shadowRoot) continue;
      const m = re.exec(e.shadowRoot.textContent || "");
      if (m) out.push(m[0]);
      walk(e.shadowRoot);
    }
  };
  walk(document);
  return out;
})()`;

const OPEN_JS = (name) => `(() => {
  const n = fs.tree.resolvePath("twinbasic:/AddinHost/Sources/${name}");
  if (!n) return "no node";
  openEditors.openFile(n, false, false, false);
  return "ok";
})()`;

scenario("ICO Designer and a .cur file", (lane) => {
  let c;

  // Opens a file of the host project as a double-click does, and returns the status line of
  // the designer tab that opened.
  async function openAndRead(name) {
    const before = (await c.evaluate(STATUSES_JS)).length;
    assert.equal(await c.evaluate(OPEN_JS(name)), "ok");
    const list = await waitFor(
      c,
      async () => {
        const l = await c.evaluate(STATUSES_JS);
        return l.length > before ? l : false;
      },
      { timeout: 20 * 1000, interval: 250 },
    );
    assert.ok(list, `no status line from a new designer for ${name}`);
    return list[list.length - 1];
  }

  before(async () => {
    // The install's own DLL, copied into the lane's copy of the install; the install is only read.
    const dll = path.join(path.dirname(lane.ide), "addins", "win32", "tbIcoDesignerAddIn.dll");
    lane.placeAddin(dll);
    const src = path.join(lane.work, "host");
    cpSync(HOST, src, { recursive: true });
    mkdirSync(path.join(src, "Sources"), { recursive: true });
    writeFileSync(path.join(src, "Sources", "Pic.ico"), iconFile(1));
    writeFileSync(path.join(src, "Sources", "Pic.cur"), iconFile(2));
    c = await lane.open(src);
    const loaded = await loadedAddins(c);
    assert.ok(
      loaded.some((a) => a.name === "ICO Editor"),
      `the ICO Designer did not load: ${JSON.stringify(loaded)}`,
    );
  });

  test("control: Pic.ico, a 16x16 icon, opens in the ICO Designer as an imported icon", async () => {
    assert.equal(await openAndRead("Pic.ico"), "Imported ICO");
  });

  test("Pic.cur, the same picture as a cursor, opens in the ICO Designer as an unsupported or corrupt icon", async () => {
    assert.equal(await openAndRead("Pic.cur"), "Unsupported/corrupt ICO");
  });
});
