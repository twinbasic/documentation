// External-link crawler for a deployed site. Starts at a URL,
// recursively GETs every same-origin/same-basepath page, extracts
// links, and verifies each link responds 2xx (HEAD for cross-origin,
// GET for same-origin since we need the HTML anyway).
//
// Usage:
//   node scripts/crawl_check.mjs <start-url> [--concurrency N] [--timeout MS]
//   node scripts/crawl_check.mjs <start-url> --skip-external
//
// Exits 0 if all links are reachable, 1 if any are broken.

import { Parser } from "htmlparser2";

const args = process.argv.slice(2);
let startArg = null;
let concurrency = 10;
let timeoutMs = 15000;
let skipExternal = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--concurrency") concurrency = Number(args[++i]);
  else if (args[i] === "--timeout") timeoutMs = Number(args[++i]);
  else if (args[i] === "--skip-external") skipExternal = true;
  else if (args[i].startsWith("-")) { console.error(`unknown flag: ${args[i]}`); process.exit(2); }
  else if (!startArg) startArg = args[i];
}
if (!startArg) {
  console.error("usage: node scripts/crawl_check.mjs <start-url> [--concurrency N] [--timeout MS] [--skip-external]");
  process.exit(2);
}

const startUrl = new URL(startArg);
const origin = startUrl.origin;
const basePath = startUrl.pathname.endsWith("/") ? startUrl.pathname : startUrl.pathname + "/";

const SKIP_SCHEMES = /^(mailto:|tel:|javascript:|data:|ftp:)/i;
const FRAGMENT_TARGETS = new Map(); // url (no fragment) -> Set of ids found

const crawlQueue = [startUrl.href];
const crawled = new Set();
const linkStatus = new Map();       // url -> { ok, status, error?, redirected? }
const linkSources = new Map();      // url -> Set of source pages
const linkFragments = new Map();    // url (no fragment) -> Set of [fragment, source]

function shouldSkip(href) {
  if (!href) return true;
  if (href.startsWith("#")) return true;
  if (SKIP_SCHEMES.test(href)) return true;
  return false;
}

function splitFragment(url) {
  const i = url.indexOf("#");
  if (i < 0) return [url, null];
  return [url.slice(0, i), url.slice(i + 1)];
}

function isCrawlable(url) {
  return url.origin === origin && url.pathname.startsWith(basePath);
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url) {
  if (linkStatus.has(url)) return linkStatus.get(url);
  let result;
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD" });
    if (res.status === 405 || res.status === 501) {
      res = await fetchWithTimeout(url, { method: "GET" });
    }
    result = {
      ok: res.ok,
      status: res.status,
      redirected: res.redirected ? res.url : null,
    };
  } catch (e) {
    result = { ok: false, status: 0, error: e.name === "AbortError" ? "timeout" : e.message };
  }
  linkStatus.set(url, result);
  return result;
}

function extractFromHtml(html) {
  const links = [];
  const ids = new Set();
  const parser = new Parser({
    onopentag(name, attrs) {
      if (attrs.id) ids.add(attrs.id);
      if (attrs.name && (name === "a" || name === "input")) ids.add(attrs.name);
      if (name === "a" && attrs.href) links.push(attrs.href);
      else if (name === "link" && attrs.href) links.push(attrs.href);
      else if (name === "img" && attrs.src) links.push(attrs.src);
      else if (name === "script" && attrs.src) links.push(attrs.src);
      else if (name === "iframe" && attrs.src) links.push(attrs.src);
    },
  });
  parser.write(html);
  parser.end();
  return { links, ids };
}

async function crawlOne(url) {
  let res;
  try {
    res = await fetchWithTimeout(url, { method: "GET" });
  } catch (e) {
    linkStatus.set(url, { ok: false, status: 0, error: e.name === "AbortError" ? "timeout" : e.message });
    return;
  }
  linkStatus.set(url, {
    ok: res.ok,
    status: res.status,
    redirected: res.redirected ? res.url : null,
  });
  if (!res.ok) return;

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html") && !ct.includes("xhtml")) return;

  let html;
  try { html = await res.text(); } catch { return; }
  const { links, ids } = extractFromHtml(html);

  // Index ids on the final (redirected) URL so fragment links resolve.
  FRAGMENT_TARGETS.set(res.url.split("#")[0], ids);
  FRAGMENT_TARGETS.set(url, ids);

  for (const rawHref of links) {
    if (shouldSkip(rawHref)) continue;
    let abs;
    try { abs = new URL(rawHref, res.url); } catch { continue; }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;

    const [bare, frag] = splitFragment(abs.href);

    if (!linkSources.has(bare)) linkSources.set(bare, new Set());
    linkSources.get(bare).add(url);

    if (frag) {
      if (!linkFragments.has(bare)) linkFragments.set(bare, []);
      linkFragments.get(bare).push({ frag, source: url });
    }

    if (isCrawlable(abs)) {
      if (!crawled.has(bare)) crawlQueue.push(bare);
    }
  }
}

async function workerPool(items, fn, n) {
  let i = 0;
  const workers = [];
  for (let k = 0; k < n; k++) {
    workers.push((async () => {
      while (i < items.length) {
        const idx = i++;
        await fn(items[idx]);
      }
    })());
  }
  await Promise.all(workers);
}

async function main() {
  const t0 = Date.now();
  process.stderr.write(`Crawling ${startUrl.href}\n`);
  process.stderr.write(`  origin=${origin}  basePath=${basePath}  concurrency=${concurrency}\n\n`);

  // Phase 1: BFS crawl same-origin pages.
  while (crawlQueue.length > 0) {
    const batch = [];
    while (crawlQueue.length > 0 && batch.length < concurrency * 4) {
      const u = crawlQueue.shift();
      if (crawled.has(u)) continue;
      crawled.add(u);
      batch.push(u);
    }
    if (batch.length === 0) continue;
    process.stderr.write(`  [crawl] ${crawled.size} pages discovered, processing batch of ${batch.length}...\n`);
    await workerPool(batch, crawlOne, concurrency);
  }

  // Phase 2: check every external link that hasn't been visited.
  const toCheck = [];
  for (const url of linkSources.keys()) {
    if (linkStatus.has(url)) continue;
    if (skipExternal && new URL(url).origin !== origin) continue;
    toCheck.push(url);
  }
  if (toCheck.length > 0) {
    process.stderr.write(`\n  [check] ${toCheck.length} external links to verify...\n`);
    await workerPool(toCheck, checkUrl, concurrency);
  }

  // Report.
  const broken = [];
  const fragmentMisses = [];
  for (const [url, status] of linkStatus) {
    if (!status.ok) {
      const sources = [...(linkSources.get(url) || [])];
      broken.push({ url, status, sources });
    }
  }
  for (const [bare, frags] of linkFragments) {
    const ids = FRAGMENT_TARGETS.get(bare);
    if (!ids) continue; // not crawled (external) -- skip fragment check
    const seen = new Set();
    for (const { frag, source } of frags) {
      if (ids.has(frag)) continue;
      const key = `${bare}#${frag}<-${source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fragmentMisses.push({ url: bare, frag, source });
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(``);
  console.log(`Crawl complete in ${elapsed}s:`);
  console.log(`  Pages crawled:    ${crawled.size}`);
  console.log(`  Unique links:     ${linkSources.size}`);
  console.log(`  Status checks:    ${linkStatus.size}`);
  console.log(`  Broken links:     ${broken.length}`);
  console.log(`  Missing anchors:  ${fragmentMisses.length}`);

  if (broken.length > 0) {
    broken.sort((a, b) => a.url.localeCompare(b.url));
    console.log(`\nBroken links:`);
    for (const b of broken) {
      const tag = b.status.error ? `ERR  ${b.status.error}` : `${b.status.status}`;
      console.log(`  [${tag}] ${b.url}`);
      const srcs = b.sources.slice().sort();
      for (const s of srcs.slice(0, 5)) console.log(`         on: ${s}`);
      if (srcs.length > 5) console.log(`         ... and ${srcs.length - 5} more`);
    }
  }

  if (fragmentMisses.length > 0) {
    fragmentMisses.sort((a, b) => (a.url + a.frag).localeCompare(b.url + b.frag));
    console.log(`\nMissing fragments:`);
    for (const f of fragmentMisses) {
      console.log(`  ${f.url}#${f.frag}`);
      console.log(`         on: ${f.source}`);
    }
  }

  process.exit((broken.length > 0 || fragmentMisses.length > 0) ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
