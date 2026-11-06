// Takes a public page through the Chrome extension (chrome/), in a Chrome of its own, with no
// person there: what proves the extension still loads and works after a change to it or to
// capture.mjs. It presses the panel's buttons and drags over the page as a person would, and
// leaves a capture file for chromeshot.mjs.
//
// Puppeteer's Chrome for Testing: a branded Chrome ignores --load-extension since Chrome 137.
// It runs on a private desktop with a fresh profile, so it is signed in to nothing, and its
// downloads go to a folder of the run's. The extension is a copy of this folder, since its
// private.json is the run's own (--mask) and the owner's is never read.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../../lib/cli.mjs";
import { connect } from "../lib/tb-cdp.mjs";
import { captureWindow, desktopWindows, launchOnDesktop, leaseSlot, postWindowMessage } from "../lib/tb-ide.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/chrome_try.mjs --url <address> --capture-dir <dir> [--out <path> | --shot <name>] [--drag x,y,x,y | --os-drag x,y,x,y] [--scroll N] [--width N] [--scale N] [--mask find=show]... [--window <png>] [-h, --help]

Loads the Chrome extension unpacked into a Chrome of its own, on a private desktop
with a fresh profile, opens <address>, presses the side panel's Whole viewport
button (or, with --drag, Drag a rectangle), and copies the capture file it saves
into <dir>. Needs the network, and tbbroker for the desktop. It signs in to
nothing; a page that needs a sign-in shows what it shows anyone.

  --url <address>     the page to take
  --capture-dir <dir> where the capture file goes, for chromeshot.mjs
  --out <path>        the picture's path under docs/ (default try/page.png)
  --shot <name>       take one of the panel's pictures, with its markings
  --drag x,y,x,y      drag from the first point to the second, in window CSS px
  --os-drag x,y,x,y   the same with Windows' own mouse messages, posted to Chrome's
                      window, in its client area's device pixels: what a person's
                      mouse does, where --drag is a DevTools event
  --scroll N          scroll the page N CSS px down first
  --width N           the panel's page width, in CSS px
  --scale N           the display's scale (default 1; 1.5 is a display at 150%)
  --mask find=show    a private word and its stand-in; may be given again
  --window <png>      also write a picture of the Chrome window as the page is
                      taken, side panel and all
  -h, --help          print this text and exit

Exit codes:
  0  the capture file was saved
  1  the panel reported a failure
  2  the tool could not run: a refused command line, or no Chrome`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      url: { type: "string" },
      "capture-dir": { type: "string" },
      out: { type: "string" },
      shot: { type: "string" },
      drag: { type: "string" },
      "os-drag": { type: "string" },
      scroll: { type: "string" },
      width: { type: "string" },
      scale: { type: "string" },
      mask: { type: "string", multiple: true },
      window: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
const refused = (text) => {
  console.error(`chrome_try: ${text}`);
  process.exit(2);
};
if (!values.url) refused("--url names the page to take");
if (!values.captureDir) refused("--capture-dir names where the capture goes");
const number = (name, min, integer = true) =>
  values[name] === undefined
    ? null
    : withUsageError(() => numberOption(values[name], { option: `--${name}`, integer, min, max: 100000 }));
const [scale, scroll, width] = [number("scale", 0.5, false) ?? 1, number("scroll", 0) ?? 0, number("width", 320)];
const drag = (values.drag ?? values.osDrag)?.split(",").map(Number);
if (drag && (drag.length !== 4 || drag.some((n) => !Number.isFinite(n)))) refused("--drag takes four numbers");
const words = (values.mask ?? []).map((m) => {
  const at = m.indexOf("=");
  if (at < 1) refused(`--mask takes find=show, not ${m}`);
  return { find: m.slice(0, at), show: m.slice(at + 1) };
});
const out = values.out ?? "try/page.png";
const exe = await puppeteer.executablePath();
if (!existsSync(exe)) refused(`no Chrome at ${exe}: run npm install`);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(what, get, { timeout = 30000, every = 100 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    const got = await get().catch(() => null);
    if (got) return got;
    if (Date.now() > end) throw new Error(`${what} did not happen in ${timeout / 1000} s`);
    await pause(every);
  }
}

const work = mkdtempSync(path.join(tmpdir(), "svgshot-try-"));
const [extension, profile, downloads] = ["extension", "profile", "downloads"].map((n) => path.join(work, n));
const here = path.dirname(fileURLToPath(import.meta.url));
cpSync(here, extension, { recursive: true, filter: (f) => path.basename(f) !== "private.json" });
writeFileSync(path.join(extension, "private.json"), JSON.stringify({ words }));
mkdirSync(path.join(profile, "Default"), { recursive: true });
mkdirSync(downloads);
writeFileSync(
  path.join(profile, "Default", "Preferences"),
  JSON.stringify({ download: { default_directory: downloads, prompt_for_download: false } }),
);

const slot = await leaseSlot({ tag: "chrome_try" });
const chrome = await launchOnDesktop({
  exe,
  desktop: slot.desktop,
  env: process.env,
  args: [
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    `--force-device-scale-factor=${scale}`,
    "--window-size=1500,1000",
    // a window on a desktop nobody sees counts as hidden, and Chrome then draws no frames
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    `--load-extension=${extension}`,
    `--disable-extensions-except=${extension}`,
    "about:blank",
  ],
});

let exitCode = 2;
try {
  const portFile = path.join(profile, "DevToolsActivePort");
  const port = await until("Chrome's start", async () => Number(readFileSync(portFile, "utf8").split(/\r?\n/)[0]));
  const targets = async () => (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const worker = await until("the extension's start", async () =>
    (await targets()).find((t) => t.type === "service_worker" && t.url.endsWith("/chrome/background.mjs")),
  );
  // A tab of its own, known by its id: the targets Chrome lists at its start are not all tabs.
  const newTab = async () => (await fetch(`http://127.0.0.1:${port}/json/new`, { method: "PUT" })).json();
  const pageTarget = await newTab();
  const page = await connect(pageTarget.webSocketDebuggerUrl, { timeout: 60000 });
  await page.send("Page.navigate", { url: values.url });
  await until(
    "the page's load",
    () => page.evaluate('location.href !== "about:blank" && document.readyState === "complete"'),
    { timeout: 60000 },
  );
  if (scroll) await page.evaluate(`scrollTo(0, ${scroll})`);

  // The side panel opens on a person's gesture: a real click, in a page of the extension,
  // stands for the toolbar button, which no tool can press.
  const id = new URL(worker.url).host;
  const opener = await newTab();
  const open = await connect(opener.webSocketDebuggerUrl);
  await open.send("Page.navigate", { url: `chrome-extension://${id}/chrome/panel.html` });
  await until("the opener's load", () =>
    open.evaluate('location.protocol === "chrome-extension:" && document.readyState === "complete"'),
  );
  // chrome.sidePanel.open takes the gesture only in the click's own turn, so nothing is awaited there.
  await open.evaluate(
    `(async () => {
      const { windowId } = await chrome.tabs.getCurrent();
      document.addEventListener("click", () => chrome.sidePanel.open({ windowId }), { once: true });
    })()`,
    { awaitPromise: true },
  );
  for (const type of ["mousePressed", "mouseReleased"])
    await open.send("Input.dispatchMouseEvent", { type, x: 300, y: 300, button: "left", clickCount: 1 });
  const panelTarget = await until(
    "the side panel's opening",
    async () =>
      (await targets()).find(
        (t) => t.url.endsWith("/chrome/panel.html") && t.id !== opener.id && t.type !== "service_worker",
      ),
    { timeout: 15000 },
  );
  await fetch(`http://127.0.0.1:${port}/json/close/${opener.id}`);
  open.close();
  await fetch(`http://127.0.0.1:${port}/json/activate/${pageTarget.id}`);
  const panel = await connect(panelTarget.webSocketDebuggerUrl, { timeout: 120000 });
  await until("the panel's load", () => panel.evaluate(`!document.getElementById("viewport").disabled`));
  console.log(await panel.evaluate(`document.getElementById("words").textContent`));

  // What the capture must leave as it found it.
  const asFound = `JSON.stringify({
    text: document.body.innerText,
    images: [...document.images].map((i) => i.getAttribute("src")),
    mode: document.documentElement.dataset.colorMode,
    scale: devicePixelRatio,
    width: innerWidth,
    sheets: document.adoptedStyleSheets.length,
    left: typeof window.__svgshot,
  })`;
  await page.evaluate("document.fonts.ready", { awaitPromise: true });
  // The tab takes its size from the window only once it is the one showing.
  let size = null;
  await until("the tab's size", async () => {
    const was = size;
    size = await page.evaluate("innerWidth");
    await pause(300);
    return size === was;
  });
  const before = await page.evaluate(asFound);
  await panel.evaluate(`(() => {
    const $ = (id) => document.getElementById(id);
    $("shot").value = ${JSON.stringify(values.shot ?? "other")};
    $("shot").dispatchEvent(new Event("change"));
    $("path").value = ${JSON.stringify(out)};
    $("width").value = ${JSON.stringify(width ?? "")};
    $(${JSON.stringify(drag ? "drag" : "viewport")}).click();
  })()`);
  const logged = () => panel.evaluate(`document.getElementById("log").textContent`);
  if (values.window) {
    await pause(1500);
    const windows = await desktopWindows(slot.desktop);
    const top = windows.find((w) => w.visible && w.class === "Chrome_WidgetWin_1" && w.title);
    if (top) await captureWindow(slot.desktop, top.hwnd, values.window);
  }
  if (drag) {
    await until("the drag's start", async () => (await logged()).includes("masked"));
    await pause(300);
    const [x0, y0, x1, y1] = drag;
    const mid = [(x0 + x1) / 2, (y0 + y1) / 2];
    if (values.osDrag) {
      const windows = await desktopWindows(slot.desktop);
      const { hwnd } = windows.find((w) => w.visible && w.class === "Chrome_WidgetWin_1" && w.title);
      const post = (msg, down, x, y) => postWindowMessage(slot.desktop, hwnd, msg, down, (y << 16) | x);
      const [MOVE, DOWN, UP] = [0x200, 0x201, 0x202];
      await post(MOVE, 0, x0, y0);
      await post(DOWN, 1, x0, y0);
      await post(MOVE, 1, mid[0], mid[1]);
      await post(MOVE, 1, x1, y1);
      await post(UP, 0, x1, y1);
    } else {
      const mouse = (type, x, y, extra = {}) => page.send("Input.dispatchMouseEvent", { type, x, y, ...extra });
      await mouse("mouseMoved", x0, y0);
      await mouse("mousePressed", x0, y0, { button: "left", clickCount: 1 });
      await mouse("mouseMoved", mid[0], mid[1], { button: "left", buttons: 1 });
      await mouse("mouseMoved", x1, y1, { button: "left", buttons: 1 });
      await mouse("mouseReleased", x1, y1, { button: "left", clickCount: 1 });
    }
  }
  // A marking the page has no anchor for asks to be pointed at, and none is here to do so.
  const log = await until(
    "the capture",
    async () => {
      const text = await logged();
      if (/saved under|FAILED|cancelled/.test(text)) return text;
      if (/^Mark .*: click or drag/m.test(text)) {
        console.log(text.trimEnd());
        await panel.evaluate(`document.getElementById("cancel").click()`);
        await pause(500);
      }
      return null;
    },
    { timeout: 120000 },
  );
  console.log(log.trimEnd());
  if (log.includes("saved under")) {
    const folder = path.join(downloads, "svgshot");
    await until("the file's arrival", async () => readdirSync(folder).some((f) => f.endsWith(".capture.json.gz")));
    mkdirSync(values.captureDir, { recursive: true });
    for (const f of readdirSync(folder)) {
      cpSync(path.join(folder, f), path.join(values.captureDir, f));
      console.log(`${path.join(values.captureDir, f)}`);
    }
    exitCode = 0;
  } else exitCode = 1;
  // The panel leaves its busy state once the page is put back.
  await until("the panel's end", () => panel.evaluate(`document.getElementById("cancel").hidden`));
  const after = await page.evaluate(asFound);
  if (after !== before) {
    const [a, b] = [JSON.parse(before), JSON.parse(after)];
    for (const k of Object.keys(a))
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.error(`chrome_try: ${k} is not as it was found`);
    exitCode = 1;
  } else console.log("the page is as it was found");
  page.close();
  panel.close();
} finally {
  try {
    execFileSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    // It has gone already.
  }
  await slot.release();
  await chrome.exited;
  // Chrome's last processes can hold the profile for some seconds after the taskkill.
  for (let i = 0; existsSync(work); i++) {
    try {
      rmSync(work, { recursive: true, force: true });
    } catch (e) {
      if (i === 40) console.error(`chrome_try: could not remove ${work}: ${e.message}`);
      if (i === 40) break;
      await pause(250);
    }
  }
}
process.exit(exitCode);
