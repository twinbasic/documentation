// node test/package-tests/tbKMode/wdk/learn.mjs [--full] <Module> [header ...]
//
// By default it looks up only the symbols that learn/<Module>.json does not have yet: an entry
// already there, with a page or with none, has been checked and is kept as it is, and an entry for a
// symbol the module no longer declares is dropped. --full looks every symbol up again.
//
// Finds Microsoft Learn's page for every Declare, Type, Enum and Delegate of one tbKMode module,
// trying the DDI reference's URL patterns under each header named (default fltkernel wdm ntifs
// ntddk), then Learn's search for a page elsewhere, and keeps each page's URL and its C syntax block
// in learn/<Module>.json beside it. A symbol with no page has url null. The file is committed: its
// URLs are the links of the module's reference page and its syntax is what declares.mjs compares
// with, so neither needs the network, and a new run shows by its diff what Microsoft moved.
// Microsoft's descriptions are not kept.
// A few requests a second; a module of 200 symbols takes several minutes.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { declaresOf, membersOf, typesOf, x86Only } from "./api.mjs";

const args = process.argv.slice(2);
const full = args.includes("--full");
const unknown = args.filter((a) => a.startsWith("--") && a !== "--full");
const [mod, ...headers] = args.filter((a) => !a.startsWith("--"));
if (!mod || unknown.length) {
  if (unknown.length) console.error(`unknown option: ${unknown.join(" ")}`);
  console.error("usage: node test/package-tests/tbKMode/wdk/learn.mjs [--full] <Module> [header ...]");
  process.exit(2);
}
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "learn", `${mod}.json`);
const key = (it) => `${it.kind} ${it.name}`;
const known = new Map(!full && existsSync(out) ? JSON.parse(readFileSync(out, "utf8")).map((it) => [key(it), it]) : []);
const hs = headers.length ? headers : ["fltkernel", "wdm", "ntifs", "ntddk"];
// The module's public Declares, Types, Enums and Delegates, from the indexer's snapshot (api.mjs).
const items = [];
const add = (kind, names) => {
  for (const name of names) if (!items.some((i) => i.kind === kind && i.name === name)) items.push({ kind, name });
};
const members = membersOf(mod).filter((m) => m.vis === "public");
const types = typesOf(mod).filter((t) => t.vis === "public");
add(
  "Declare",
  members.filter((m) => m.declare).map((m) => m.name),
);
// A Declare binds its Alias, the routine whose page it links: CopyMemory is RtlMoveMemory's. The
// entry is kept with the item only where it differs from the name, and is looked up first, then
// the name (ObDereferenceObject's ObfDereferenceObject has no page of its own). An #If branch for
// x86 alone gives way to the other: InterlockedPopEntrySList's x64 entry is the one looked up.
const entries = new Map();
for (const d of declaresOf(mod)) if (!entries.has(d.name) || x86Only(entries.get(d.name).cond)) entries.set(d.name, d);
for (const it of items)
  if (it.kind === "Declare" && entries.get(it.name)?.entry !== it.name) it.entry = entries.get(it.name)?.entry;
const lookupNames = (it) => [...new Set([it.entry, it.name].filter(Boolean))];
add(
  "Type",
  types.filter((t) => t.kind === "type").map((t) => t.name),
);
add(
  "Enum",
  types.filter((t) => t.kind === "enum").map((t) => t.name),
);
add(
  "Delegate",
  members.filter((m) => m.kind === "delegate").map((m) => m.name),
);

const base = "https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi";
function candidates(kind, name) {
  const n = name.toLowerCase();
  if (kind === "Declare") return hs.map((h) => `${base}/${h}/nf-${h}-${n}`);
  if (kind === "Type") return hs.flatMap((h) => [`${base}/${h}/ns-${h}-_${n}`, `${base}/${h}/ns-${h}-${n}`]);
  if (kind === "Enum") return hs.flatMap((h) => [`${base}/${h}/ne-${h}-_${n}`, `${base}/${h}/ne-${h}-${n}`]);
  return hs.flatMap((h) => [`${base}/${h}/nc-${h}-p${n}`, `${base}/${h}/nc-${h}-${n}`]);
}
const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
function syntaxOf(html) {
  const i = html.search(/<h2[^>]*id="syntax"/i);
  if (i < 0) return null;
  const m = /<code[^>]*>([\s\S]*?)<\/code>/i.exec(html.slice(i));
  return m ? decode(m[1].replace(/<[^>]+>/g, "")).trim() : null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A request that fails on the network (Learn resets a connection now and then) is tried again,
// four times at most, waiting longer each time; the fourth failure ends the run.
async function get(url) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, { redirect: "follow" });
    } catch (e) {
      if (i === 4) throw e;
      await sleep(2000 * i);
    }
  }
}

// A page outside the DDI reference (the Win32 docs keep ZwQueryInformationProcess under procthread,
// ZwQuerySystemInformation under sysinfo, the winternl.h structures under api/winternl) is found
// through Learn's own search: the first result whose title names the symbol itself, such as
// "ZwQueryInformationProcess function - Win32 apps" or "_FILE_ALL_INFORMATION (ntifs.h)", in the
// symbol's own case (VBA's "CurDir function" is not CURDIR), among the Windows and driver docs. A
// title that only mentions it, and every other part of Learn, are passed over.
async function searched(name) {
  await sleep(250);
  const q = new URL("https://learn.microsoft.com/api/search");
  q.searchParams.set("search", name);
  q.searchParams.set("locale", "en-us");
  q.searchParams.set("$top", "10");
  const r = await get(q);
  if (r.status !== 200) return [];
  const { results = [] } = await r.json();
  return results
    .filter((x) => /^https:\/\/learn\.microsoft\.com\/en-us\/(windows|windows-hardware)\//.test(x.url))
    .filter(
      (x) =>
        x.title
          .split(/ - | \| /)[0]
          .trim()
          .split(/\s+/)[0]
          .replace(/^_/, "") === name,
    )
    .map((x) => x.url);
}

let looked = 0;
for (const [i, it] of items.entries()) {
  // Kept as it is unless the Declare now binds another entry point than the one it was looked up by.
  if (known.has(key(it)) && known.get(key(it)).entry === it.entry) {
    items[i] = known.get(key(it));
    continue;
  }
  looked++;
  const tried = new Set();
  const passes = lookupNames(it).flatMap((n) => [() => candidates(it.kind, n), () => searched(n)]);
  for (const pass of passes) {
    for (const url of await pass()) {
      if (tried.has(url)) continue;
      tried.add(url);
      await sleep(250);
      const r = await get(url);
      if (r.status !== 200) continue;
      const html = await r.text();
      it.url = r.url.split("?")[0];
      it.syntax = syntaxOf(html);
      break;
    }
    if (it.url) break;
  }
  it.url ??= null;
  console.log(
    `${it.url ? "ok" : "--"}  ${it.kind} ${it.name}${it.entry ? ` (${it.entry})` : ""}${it.url && !it.url.includes("/ddi/") ? `  ${it.url}` : ""}`,
  );
}
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(items, null, 1)}\n`);
const dropped = [...known.keys()].filter((k) => !items.some((it) => key(it) === k));
console.log(
  `${items.filter((i) => i.url).length} of ${items.length} found; ${looked} looked up${full ? " (--full)" : `, ${items.length - looked} kept`}${dropped.length ? `, dropped: ${dropped.join(", ")}` : ""}: ${out}`,
);
