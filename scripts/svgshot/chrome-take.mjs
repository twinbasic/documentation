// What chromeshot.mjs --take needs round a person taking a picture in their own Chrome: the
// extension kept up to date in a folder of its own, the page opened in the default browser, and
// the capture noticed when the browser saves it. A picture can only be taken by the person
// signed in (WIP.Screenshots.md), so this waits for them, and nothing here touches the browser
// but asking Windows to open an address.
//
// The extension has a folder of its own, and not the checkout's scripts/svgshot, so that Chrome's
// unpacked copy does not go when a worktree does, and any checkout can bring it up to date.

import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { EXTENSION_FOLDER, extensionFiles, WORDS_FILE } from "./extension-files.mjs";

/** The folder the extension is kept in for Chrome to load, under the user's local application data. */
export const DEFAULT_EXTENSION = path.join(
  process.env.LOCALAPPDATA ?? path.join(homedir(), "AppData", "Local"),
  "svgshot",
  "extension",
);

/** The file in the extension's folder that says which picture a run waits for (panel.mjs). */
export const NEXT_FILE = "next.json";

// How often the download folder is looked at, in ms. A person's take is many seconds apart.
const POLL = 400;

// Windows' known folder for downloads, by its id; the value may name an environment variable.
const SHELL_FOLDERS = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders";
const DOWNLOADS_ID = "{374DE290-123F-4565-9164-39C4925E467B}";

/**
 * The folder the extension's captures land in: svgshot in the user's download folder, which need
 * not be under the home folder. A browser told to save elsewhere needs --captures.
 */
export function capturesFolder() {
  const query =
    process.platform === "win32"
      ? spawnSync("reg", ["query", SHELL_FOLDERS, "/v", DOWNLOADS_ID], { encoding: "utf8", windowsHide: true })
      : null;
  const value = query?.status === 0 ? /REG_(?:EXPAND_)?SZ\s+(.+?)\s*$/m.exec(query.stdout)?.[1] : null;
  const downloads = value?.replace(/%([^%]+)%/g, (all, name) => process.env[name] ?? all);
  return path.join(downloads ?? path.join(homedir(), "Downloads"), "svgshot");
}

const sameBytes = (a, b) => existsSync(b) && readFileSync(a).equals(readFileSync(b));

// Whether `folder` is the extension: what is deleted from it must be ours to delete.
function isExtension(folder) {
  try {
    return JSON.parse(readFileSync(path.join(folder, "manifest.json"), "utf8")).name === "svgshot";
  } catch {
    return false;
  }
}

// Every file under `folder`, as paths from it with forward slashes.
function filesUnder(folder, from = folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(folder, e.name);
    return e.isDirectory() ? filesUnder(full, from) : [path.relative(from, full).replace(/\\/g, "/")];
  });
}

/**
 * Brings the extension in the folder `target` up to date from `source`: copies what differs and
 * removes a file it no longer has. The word list goes with it, and stays when the checkout has
 * none, since git keeps none and a checkout's is only there if it was put there. Returns {folder,
 * changed, first}: `changed` the paths written or removed, `first` when Chrome has yet to be
 * shown the folder. Throws when `target` holds something that is not the extension.
 */
export function installExtension(target, { source = EXTENSION_FOLDER } = {}) {
  const busy = existsSync(target) && readdirSync(target).length > 0;
  if (busy && !isExtension(target)) throw new Error(`${target} holds something that is not the extension`);
  const files = extensionFiles(source);
  if (existsSync(path.join(source, WORDS_FILE))) files.push(WORDS_FILE);
  const changed = [];
  for (const file of files) {
    const from = path.join(source, file);
    const to = path.join(target, file);
    if (sameBytes(from, to)) continue;
    mkdirSync(path.dirname(to), { recursive: true });
    copyFileSync(from, to);
    changed.push(file);
  }
  const keep = new Set([...files, WORDS_FILE, NEXT_FILE]);
  for (const file of filesUnder(target).filter((f) => !keep.has(f))) {
    rmSync(path.join(target, file));
    changed.push(file);
  }
  return { folder: target, changed, first: !busy };
}

/** What a person must do about the extension after `installed` (installExtension's), or null. */
export function extensionStep({ folder, changed, first }) {
  if (first) return `In chrome://extensions, with Developer mode on, press Load unpacked and choose ${folder}.`;
  if (changed.length)
    return "The extension changed: press reload on svgshot in chrome://extensions, and reopen its panel.";
  return null;
}

/** Tells the panel of the extension in `folder` which picture to choose, `shot` its name, or null. */
export function tellPanel(folder, shot) {
  writeFileSync(path.join(folder, NEXT_FILE), `${JSON.stringify({ shot })}\n`);
}

/** Opens `url` in the default browser, as `start` does at a prompt, and does not wait for it. */
export function openPage(url) {
  const [command, ...args] =
    process.platform === "win32"
      ? ["rundll32", "url.dll,FileProtocolHandler", url]
      : [process.platform === "darwin" ? "open" : "xdg-open", url];
  spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

/**
 * Why `capture` is no take of `shot`, a line for a person, or null. Each of these is a mistake
 * that a look at the picture finds late: the crop and the marks are the table's, and the site
 * shows the light picture in the dark theme when there is no dark one.
 */
export function takeRefusal(capture, shot) {
  if (capture.area !== "viewport")
    return "a dragged rectangle: take it with Whole viewport, which is trimmed alike each time";
  if (!capture.marked) return "it has no marks: tick Draw the markings";
  const themes = capture.pictures.map((p) => p.theme);
  if (!themes.includes("dark") || !themes.includes("light"))
    return `only the ${themes.join(" and ")} theme: tick both Dark and Light`;
  const home = new URL(shot.url);
  const repository = home.pathname.split("/").slice(0, 3).join("/");
  if (capture.url && !capture.url.startsWith(`${home.origin}${repository}/`))
    return `taken on another repository: this picture is taken on ${home.origin}${repository}`;
  return null;
}

/**
 * Watches `folder` for captures saved from now on: {next(signal)}, whose `next` resolves to the
 * path of a capture that is new or has changed since, the oldest first, or to null when `signal`
 * is aborted. The browser saves a download under another name and renames it, so a capture
 * that shows here is whole.
 */
export function captureWatcher(folder) {
  const seen = new Map();
  const scan = () => {
    if (!existsSync(folder)) return [];
    return readdirSync(folder)
      .filter((name) => name.endsWith(".capture.json.gz"))
      .flatMap((name) => {
        const file = path.join(folder, name);
        try {
          return [{ file, at: statSync(file).mtimeMs }];
        } catch {
          return []; // replaced as it was looked at: the next look finds it
        }
      });
  };
  for (const { file, at } of scan()) seen.set(file, at);
  return {
    async next(signal) {
      while (!signal.aborted) {
        const [fresh] = scan()
          .filter(({ file, at }) => seen.get(file) !== at)
          .sort((a, b) => a.at - b.at);
        if (fresh) {
          seen.set(fresh.file, fresh.at);
          return fresh.file;
        }
        await sleep(POLL, null, { signal }).catch(() => {});
      }
      return null;
    },
  };
}
