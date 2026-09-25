// The Chromium lifecycle shared by the tools that drive a browser: one launch
// configuration, and a browser that is closed however the tool's work ends.
//
// A tool that exits without closing its browser leaves no Chromium running --
// Puppeteer's own "exit" handler kills it.  It does leave the browser's
// temporary profile behind, a puppeteer_dev_chrome_profile-* folder of about
// 4 MB in the system temp folder.  Puppeteer deletes that folder
// asynchronously, after the browser process has exited, and process.exit()
// ends Node before that code can run.  withBrowser closes the browser in a
// finally, so the folder is deleted on every exit path, including an
// assertion that throws on purpose.

import puppeteer from "puppeteer";

// --no-sandbox: GitHub's ubuntu-24.04 runners carry the AppArmor restriction
// on unprivileged user namespaces, which Chrome's sandbox needs -- without
// this the launch fails in CI.  --disable-dev-shm-usage avoids crashes where
// /dev/shm is small (containers).  Neither touches layout or computed style,
// so a tool sees in CI exactly what it sees locally; book/render-book.mjs
// passes the same pair for the same reason.
const LAUNCH_ARGS = ["--no-sandbox", "--disable-dev-shm-usage"];

export function launchBrowser(opts = {}) {
  return puppeteer.launch({ headless: true, args: LAUNCH_ARGS, ...opts });
}

/** Launch a browser, run fn(browser), and close the browser however fn ends. */
export async function withBrowser(fn, options) {
  const browser = await launchBrowser(options);
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}
