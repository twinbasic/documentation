// The side panel: which picture, then Whole viewport or Drag a rectangle. A side panel stays open
// while the person sets the page up, and a click in the page does not close it, as it would a
// popup; it is also a page, which can hand the browser a Blob to save, as a service worker cannot.

import { wordList } from "../private-words.mjs";
import { saveCapture, takePicture } from "./take.mjs";
import { SHOTS } from "./shots.mjs";

const $ = (id) => document.getElementById(id);
const OTHER = "other";

function log(line) {
  $("log").textContent += `${line}\n`;
  $("log").scrollTop = $("log").scrollHeight;
}

// The private words, from scripts/svgshot/private.json, which is inside the extension's folder
// and which git ignores. No capture is taken without them.
async function loadWords() {
  try {
    const response = await fetch(chrome.runtime.getURL("private.json"));
    return wordList((await response.json()).words);
  } catch (e) {
    $("words").textContent =
      `No private words: ${e.message}. Copy private.example.json to private.json and fill it in.`;
    $("words").classList.add("wrong");
    return null;
  }
}

const shotOf = () => SHOTS.find((s) => s.name === $("shot").value) ?? null;

function showShot() {
  const shot = shotOf();
  $("shows").textContent = shot?.shows ?? "";
  $("path").hidden = !!shot;
  $("marked").hidden = !shot;
  try {
    localStorage.setItem("shot", $("shot").value);
  } catch {
    // The choice is only a convenience.
  }
}

function setBusy(busy) {
  for (const id of ["viewport", "drag", "shot", "path", "width"]) $(id).disabled = busy;
  $("cancel").hidden = !busy;
}

let running = null;

async function take(area, list) {
  const shot = shotOf();
  const out = shot?.out ?? $("path").value.trim().replace(/\\/g, "/");
  if (!/^[^/].*\.png$/i.test(out)) {
    log("Name the picture: its path under docs/, ending in .png");
    return;
  }
  const themes = ["dark", "light"].filter((t) => $(t).checked);
  if (!themes.length) {
    log("Choose a theme");
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const width = Number($("width").value);
  running = new AbortController();
  setBusy(true);
  $("log").textContent = "";
  log(`${out}: ${area === "drag" ? "drag over the page" : "the whole window"}`);
  try {
    const capture = await takePicture({
      tabId: tab.id,
      out,
      area,
      themes,
      list,
      marks: shot && $("marks").checked ? shot.marks : [],
      pageWidth: width > 0 ? width : null,
      log,
      signal: running.signal,
    });
    if (!capture) {
      log("cancelled");
      return;
    }
    await saveCapture(capture);
    log("saved under the download folder, in svgshot");
    $("preview").src = `data:image/png;base64,${capture.pictures[0].png}`;
    $("preview").hidden = false;
  } catch (e) {
    log(`FAILED: ${e.message}`);
  } finally {
    running = null;
    setBusy(false);
  }
}

for (const shot of SHOTS) $("shot").add(new Option(shot.name, shot.name));
$("shot").add(new Option("Another picture", OTHER));
try {
  const kept = localStorage.getItem("shot");
  if (kept) $("shot").value = kept;
} catch {
  // As in showShot.
}
$("shot").addEventListener("change", showShot);
showShot();

const list = await loadWords();
if (list) {
  $("words").textContent = `${list.length} private word${list.length === 1 ? "" : "s"} masked.`;
  $("viewport").disabled = false;
  $("drag").disabled = false;
  $("viewport").addEventListener("click", () => take("viewport", list));
  $("drag").addEventListener("click", () => take("drag", list));
  $("cancel").addEventListener("click", () => running?.abort());
}
