// What scripts/errors.mjs and scripts/check_errors.mjs share: reading the run-time
// error data under errors/, the probe projects generated from it, and the `Common Errors`
// section each page gets from it. The format is written down in WIP.Errors.md.
//
// Every export here does its work when called, never on import.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { parseFrontmatter } from "../../lib/frontmatter.mjs";
import { DOCS_DIR, REPO_ROOT } from "../../lib/repo-paths.mjs";

export const ERRORS_DIR = path.join(REPO_ROOT, "errors");
export const MESSAGES_FILE = "messages.yml";

const ROW_KEYS = new Set(["error", "when", "cases", "vb6", "win64", "bug"]);
const CASE_KEYS = new Set(["expr", "run", "decl", "setup", "only"]);
const PAGE_KEYS = new Set(["rows", "quiet", "none"]);
const FILE_KEYS = new Set(["beta", "win64", "pages"]);

// ------------------------------------------------------------------ the data

/** The data files under `dir`, as names relative to it, sorted; messages.yml is not one. */
export function dataFiles(dir = ERRORS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".yml") && n !== MESSAGES_FILE)
    .sort();
}

/** What Error$(n) gives for a number with no message of its own, in both runtimes. */
export const GENERIC_MESSAGE = "Application-defined or object-defined error";

/**
 * errors/messages.yml read: Map number -> { raised, error }, where `raised` is the
 * Err.Description of the error once raised and `error` what Error$(number) gives.
 * The file gives a number's one message, or `{ raised, error }` where they differ.
 */
export function readMessages(raw, name = MESSAGES_FILE) {
  const messages = new Map();
  const problems = [];
  const text = (v) => typeof v === "string" && v.length > 0;
  for (const [k, v] of Object.entries(raw ?? {})) {
    const pair = v && typeof v === "object" && !Array.isArray(v);
    if (!/^-?\d+$/.test(k) || !(text(v) || (pair && text(v.raised) && text(v.error))))
      problems.push(`${name}: ${k}: not a number and its message, or its raised: and error: messages`);
    else if (pair && Object.keys(v).some((x) => x !== "raised" && x !== "error"))
      problems.push(`${name}: ${k}: only raised: and error:`);
    else if (pair && v.raised === v.error) problems.push(`${name}: ${k}: raised: and error: agree; give one message`);
    else messages.set(Number(k), pair ? { raised: v.raised, error: v.error } : { raised: v, error: v });
  }
  return { messages, problems };
}

/** errors/messages.yml, read by readMessages, or a problem. */
export function loadMessages(dir = ERRORS_DIR) {
  const file = path.join(dir, MESSAGES_FILE);
  if (!existsSync(file)) return { messages: new Map(), problems: [`${MESSAGES_FILE}: missing`] };
  return readMessages(yaml.load(readFileSync(file, "utf8")));
}

const isInt = (v) => Number.isInteger(v);

// A case as the data writes it, a string (an expression) or a mapping, made one shape:
// { expr?, run?, decl: [], setup: [], only? }
function normaliseCase(c, where, problems) {
  if (typeof c === "string") return { expr: c, decl: [], setup: [] };
  if (!c || typeof c !== "object" || Array.isArray(c)) {
    problems.push(`${where}: a case is an expression or a mapping`);
    return null;
  }
  for (const k of Object.keys(c)) if (!CASE_KEYS.has(k)) problems.push(`${where}: unknown key ${k}`);
  if ((c.expr === undefined) === (c.run === undefined)) problems.push(`${where}: give one of expr and run`);
  if (c.only !== undefined && c.only !== "tb") problems.push(`${where}: only: can only be tb`);
  const lines = (v) => (v === undefined ? [] : String(v).replace(/\r/g, "").replace(/\n$/, "").split("\n"));
  return {
    expr: c.expr === undefined ? undefined : String(c.expr),
    run: c.run === undefined ? undefined : lines(c.run),
    decl: lines(c.decl),
    setup: lines(c.setup),
    only: c.only,
  };
}

/**
 * One data file, read and checked. `name` is relative to `dir`.
 * @returns {{name, beta, win64, pages: Array<{page, rows, quiet, none}>, problems: string[]}}
 *   a row is { error, when, vb6?, win64?, bug?, cases }; `page` is relative to docs/
 */
export function loadDataFile(name, dir = ERRORS_DIR) {
  const problems = [];
  let raw;
  try {
    raw = yaml.load(readFileSync(path.join(dir, name), "utf8"));
  } catch (e) {
    return { name, pages: [], problems: [`${name}: ${e.message.split("\n")[0]}`] };
  }
  return { name, ...readData(raw, name, problems), problems };
}

/** The checking half of loadDataFile, over an already parsed document. */
export function readData(raw, name, problems) {
  if (!raw || typeof raw !== "object") {
    problems.push(`${name}: not a mapping`);
    return { beta: null, win64: false, pages: [] };
  }
  for (const k of Object.keys(raw)) if (!FILE_KEYS.has(k)) problems.push(`${name}: unknown key ${k}`);
  if (!isInt(raw.beta)) problems.push(`${name}: beta: the BETA the data was measured on, a number`);
  const pages = [];
  for (const [page, entry] of Object.entries(raw.pages ?? {})) {
    const at = `${name}: ${page}`;
    if (!page.endsWith(".md") || page.includes("\\"))
      problems.push(`${at}: a page is a path under docs/, with / and .md`);
    if (!entry || typeof entry !== "object") {
      problems.push(`${at}: not a mapping`);
      continue;
    }
    for (const k of Object.keys(entry)) if (!PAGE_KEYS.has(k)) problems.push(`${at}: unknown key ${k}`);
    const rows = [];
    (entry.rows ?? []).forEach((r, i) => {
      const w = `${at}: row ${i + 1}`;
      if (!r || typeof r !== "object") {
        problems.push(`${w}: not a mapping`);
        return;
      }
      for (const k of Object.keys(r)) if (!ROW_KEYS.has(k)) problems.push(`${w}: unknown key ${k}`);
      // error: 0 is a condition where twinBASIC raises nothing and VB6 does: a NOTE, no table row.
      if (!isInt(r.error) || (r.error === 0 && !r.vb6)) {
        problems.push(`${w}: error: a number other than 0, or 0 with a vb6: other than 0`);
      }
      if (typeof r.when !== "string" || !r.when.trim())
        problems.push(`${w}: when: the condition, in the reader's terms`);
      else if (/\||\n/.test(r.when.trim())) problems.push(`${w}: when: one line, without |`);
      if (r.vb6 !== undefined && !isInt(r.vb6)) problems.push(`${w}: vb6: a number`);
      if (r.vb6 !== undefined && r.vb6 === r.error) problems.push(`${w}: vb6: the same as error; leave it out`);
      if (r.vb6 !== undefined && typeof r.bug !== "string") {
        problems.push(`${w}: bug: a row that differs from VB6 names its bugs/ slug, or pending`);
      }
      if (r.bug !== undefined && r.vb6 === undefined) problems.push(`${w}: bug: only on a row with vb6:`);
      if (r.win64 !== undefined && !isInt(r.win64)) problems.push(`${w}: win64: a number`);
      if (!Array.isArray(r.cases) || !r.cases.length) problems.push(`${w}: cases: at least one`);
      const cases = (Array.isArray(r.cases) ? r.cases : [])
        .map((c, j) => normaliseCase(c, `${w} case ${j + 1}`, problems))
        .filter(Boolean);
      rows.push({ error: r.error, when: String(r.when ?? "").trim(), vb6: r.vb6, win64: r.win64, bug: r.bug, cases });
    });
    const quiet = (entry.quiet ?? [])
      .map((c, j) => normaliseCase(c, `${at}: quiet ${j + 1}`, problems))
      .filter(Boolean);
    if (entry.none !== undefined && (typeof entry.none !== "string" || rows.length)) {
      problems.push(`${at}: none: a sentence, on a page without rows`);
    }
    if (!rows.length && !quiet.length) problems.push(`${at}: neither rows nor quiet cases`);
    pages.push({ page, rows, quiet, none: entry.none });
  }
  return { beta: raw.beta ?? null, win64: raw.win64 === true, pages };
}

// ------------------------------------------------------------------ the probes

/**
 * The cases of `files` to run in `runtime` ("tb", "vb6" or "win64"), each with
 * what it expects. Ids are 1-based and stable for one list of files.
 */
export function probeCases(files, runtime, { only } = {}) {
  const out = [];
  let id = 0;
  for (const f of files) {
    for (const p of f.pages) {
      const take = !only || only.test(p.page);
      const push = (c, row, label) => {
        id++;
        if (!take || (runtime === "vb6" && c.only === "tb")) return;
        let expect = row ? row.error : 0;
        if (row && runtime === "vb6" && row.vb6 !== undefined) expect = row.vb6;
        if (row && runtime === "win64" && row.win64 !== undefined) expect = row.win64;
        out.push({ id, file: f.name, page: p.page, label, row, expect, ...c });
      };
      for (const row of p.rows) for (const c of row.cases) push(c, row, c.expr ?? c.run.join(" : "));
      for (const c of p.quiet) push(c, null, c.expr ?? c.run.join(" : "));
    }
  }
  return out;
}

// A case's own procedure. `report` is the name of the procedure that writes a line.
function caseLines(c, report) {
  const ind = (l) => `    ${l}`;
  return [
    `Private Sub C${c.id}()`,
    ind("Dim Result As Variant"),
    ...c.decl.map(ind),
    ind("On Error Resume Next"),
    ...c.setup.map(ind),
    ind(`If Err.Number <> 0 Then ${report} "setup ${c.id} " & Err.Number & " " & Err.Description: Exit Sub`),
    ...(c.expr !== undefined ? [ind(`Result = ${c.expr}`)] : c.run.map(ind)),
    ind(`${report} "case ${c.id} " & Err.Number & " " & Err.Description`),
    "End Sub",
  ];
}

/**
 * The probe module for `cases`: the twinBASIC module (dialect "tb", a .twin file run as
 * an exe by tbrun) or the VB6 one (dialect "vb6", Module1.bas of Probe.vbp). Each case
 * is a Sub of its own, run under On Error Resume Next, that reports
 * `case <id> <Err.Number> <Err.Description>`; Main reports `done` last.
 * @returns {{text: string, spans: Array<{id, from, to}>}} spans are 1-based file lines
 */
export function probeModule(cases, dialect) {
  const head =
    dialect === "tb"
      ? [
          "' Generated by scripts/errors.mjs from errors/*.yml; do not edit.",
          "Module Probe",
          "Private Sub Report(ByVal S As String)",
          "    TbRun.Out S",
          "End Sub",
          "[RunAfterBuild]",
          "Private Sub Built()",
          "    Debug.Cls",
          '    TbRun.Out "ide"',
          "End Sub",
        ]
      : [
          'Attribute VB_Name = "Module1"',
          "' Generated by scripts/errors.mjs from errors/*.yml; do not edit.",
          "Option Explicit",
          "Private Sub Report(ByVal S As String)",
          "    Dim F As Integer",
          "    F = FreeFile",
          '    Open App.Path & "\\out.txt" For Append As #F',
          "    Print #F, S",
          "    Close #F",
          "End Sub",
        ];
  const lines = [...head, "Public Sub Main()", ...cases.map((c) => `    C${c.id}`), '    Report "done"', "End Sub"];
  const spans = [];
  for (const c of cases) {
    const from = lines.length + 1;
    lines.push(...caseLines(c, "Report"));
    spans.push({ id: c.id, from, to: lines.length });
  }
  if (dialect === "tb") lines.push("End Module");
  return { text: `${lines.join("\r\n")}\r\n`, spans };
}

// ------------------------------------------------------------------ the messages

/** The numbers whose message is VB's own: Error$ is defined for these. */
export const VB_NUMBERS = { from: 1, to: 65535 };

/**
 * The probe of the messages, in `dialect` as probeModule's: for every number from 1
 * to 65535 whose Error$ is not GENERIC_MESSAGE, and for each of `others`, a line
 * `msg <n> <Error$(n)> <Err.Number> <Err.Description>`, tab-separated, after
 * `Err.Raise n`. An Error$ that raises is written `!<number>`, and a line break in a
 * description `\n`.
 */
export function messageProbeModule(others, dialect) {
  const one = [
    "Private Sub One(ByVal N As Long, ByVal All As Boolean)",
    "    Dim E As String, D As String",
    "    On Error Resume Next",
    "    E = Error$(N)",
    '    If Err.Number <> 0 Then E = "!" & Err.Number',
    `    If Not All And E = "${GENERIC_MESSAGE}" Then Exit Sub`,
    "    Err.Clear",
    "    Err.Raise N",
    '    D = Replace(Replace(Err.Description, vbCr, ""), vbLf, "\\n")',
    '    Report "msg" & vbTab & N & vbTab & E & vbTab & Err.Number & vbTab & D',
    "    Err.Clear",
    "End Sub",
  ];
  const main = [
    "Public Sub Main()",
    "    Dim N As Long",
    `    For N = ${VB_NUMBERS.from} To ${VB_NUMBERS.to}`,
    "        One N, False",
    "    Next",
    ...others.map((n) => `    One ${n}, True`),
    '    Report "done"',
    "End Sub",
  ];
  const { text } = probeModule([], dialect);
  const lines = text.replace(/\r\n$/, "").split("\r\n");
  const at = lines.indexOf("Public Sub Main()");
  const end = lines.indexOf("End Sub", at);
  lines.splice(at, end - at + 1, ...one, ...main);
  return `${lines.join("\r\n")}\r\n`;
}

/** A message probe's output: Map n -> { error, number, description }, and whether it ended. */
export function readMessageOutput(lines) {
  const seen = new Map();
  for (const l of lines) {
    const p = l.split("\t");
    if (p[0] === "msg" && p.length === 5)
      seen.set(Number(p[1]), { error: p[2], number: Number(p[3]), description: p[4] });
  }
  return { seen, done: lines.includes("done") };
}

/**
 * What is wrong with `messages` (readMessages's) against what the probes saw, one
 * line each. Every number from 1 to 65535 with a message of its own in either
 * runtime must be listed; each listed number's Error$ must be its `error` in both
 * runtimes, and the description of the error raised its `raised`: in both runtimes
 * for a number from 1 to 65535, in twinBASIC only for another (VB6's Err.Raise turns
 * many HRESULTs into its own numbers). `seen` maps a runtime to readMessageOutput's map.
 */
export function compareMessages(messages, seen) {
  const out = [];
  const vbs = (n) => n >= VB_NUMBERS.from && n <= VB_NUMBERS.to;
  for (const [rt, got] of Object.entries(seen)) {
    for (const [n, g] of got) if (vbs(n) && !messages.has(n)) out.push(`${n}: ${rt} has "${g.error}", not listed`);
    for (const [n, m] of messages) {
      const g = got.get(n);
      if (!g) {
        if (vbs(n)) out.push(`${n}: ${rt}'s Error$ is "${GENERIC_MESSAGE}", the list has "${m.error}"`);
        continue;
      }
      if (g.error !== m.error) out.push(`${n}: ${rt}'s Error$ is "${g.error}", the list has "${m.error}"`);
      if (rt !== "vb6" || vbs(n)) {
        if (g.number !== n) out.push(`${n}: ${rt}'s Err.Raise ${n} raised ${g.number}`);
        else if (g.description !== m.raised)
          out.push(`${n}: ${rt}'s description is "${g.description}", the list has "${m.raised}"`);
      }
    }
  }
  return out;
}

/** The id of the case whose procedure holds 1-based `line`, or null. */
export const caseAtLine = (spans, line) => spans.find((s) => line >= s.from && line <= s.to)?.id ?? null;

/**
 * A probe's output lines, read: Map id -> { number, description, setup }, and
 * whether `done` was reached.
 */
export function readProbeOutput(lines) {
  const seen = new Map();
  let done = false;
  for (const l of lines) {
    if (l === "done") done = true;
    const m = /^(case|setup) (\d+) (-?\d+) ?(.*)$/.exec(l);
    if (m) seen.set(Number(m[2]), { number: Number(m[3]), description: m[4], setup: m[1] === "setup" });
  }
  return { seen, done };
}

// ------------------------------------------------------------------ the section

export const OPEN_MARKER = /^<!--[ \t]*errors:[ \t]*(.*?)[ \t]*-->[ \t]*$/;
export const CLOSE_MARKER = /^<!--[ \t]*\/errors[ \t]*-->[ \t]*$/;
const FENCE = /^[ \t]*(`{3,}|~{3,})/;
const ANCHOR = /^(#{2,6})[ \t]+(Examples?|See Also)[ \t]*$/;

/** The page's lines with the fence state of each: [{text, fenced}]. */
function scan(lines) {
  let fence = null;
  return lines.map((text) => {
    const m = FENCE.exec(text);
    const fenced = fence !== null || Boolean(m);
    if (m) {
      if (fence === null) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length && text.trim() === m[1]) fence = null;
    }
    return { text, fenced };
  });
}

/**
 * The `errors` region of a page: { open, close } as 0-based line indexes (close
 * inclusive), null when there is none, and problems with its markers.
 */
export function findSection(text) {
  const lines = scan(text.split("\n"));
  const problems = [];
  let open = null;
  let found = null;
  lines.forEach(({ text: t, fenced }, i) => {
    if (fenced) return;
    const l = t.replace(/\r$/, "");
    if (OPEN_MARKER.test(l)) {
      if (open !== null || found) problems.push(`line ${i + 1}: a second <!-- errors: --> marker`);
      else open = i;
    } else if (CLOSE_MARKER.test(l)) {
      if (open === null) problems.push(`line ${i + 1}: <!-- /errors --> without its opening marker`);
      else {
        found = { open, close: i };
        open = null;
      }
    }
  });
  if (open !== null) problems.push(`line ${open + 1}: the errors section is not closed with <!-- /errors -->`);
  return { section: found, problems };
}

/** The heading level the page uses for Example and See Also: "##" or "###"; "##" when it has neither. */
export function pageLevel(text) {
  for (const { text: t, fenced } of scan(text.split("\n"))) {
    const m = !fenced && ANCHOR.exec(t.replace(/\r$/, ""));
    if (m) return m[1];
  }
  return "##";
}

/** An error number in decimal and in VB hexadecimal, as a 32-bit Long: -2147467259 (`&H80004005`). */
export const errorNumber = (n) => `${n} (\`&H${(n >>> 0).toString(16).toUpperCase()}\`)`;

const escapeCell = (s) => s.replace(/\|/g, "\\|");

/** The central page of the run-time errors, as a path under docs/, and its permalink. */
export const CENTRAL_PAGE = "Reference/Run-time-Errors.md";
export const CENTRAL_PERMALINK = "/Reference/Run-time-Errors";

/** The anchor of number `n` on the central page: error-5, error--2147467259. */
export const errorAnchor = (n) => `error-${n}`;

/** The link from the page at permalink `from` to the page at permalink `to`, as the site writes it: relative. */
export function relativeLink(from, to) {
  const base = from.endsWith("/") ? from : path.posix.dirname(from);
  const rel = path.posix.relative(base, to.endsWith("/") ? to.slice(0, -1) : to) || ".";
  return to.endsWith("/") && rel !== "." ? `${rel}/` : rel;
}

/** A page's title and permalink, from its front matter; null for either it lacks. */
export function pageMeta(text) {
  let data = {};
  try {
    data = parseFrontmatter(text)?.data ?? {};
  } catch {}
  const s = (v) => (typeof v === "string" && v ? v : null);
  return { title: s(data.title), permalink: s(data.permalink) };
}

/**
 * The section's lines for page entry `p` of data file `name`, or null when the page
 * gets none. `level` is the heading's "##"/"###", `permalink` the page's own: each
 * number links to its row on the central page.
 */
export function renderSection(p, { name, beta, messages, level, permalink }) {
  if (!p.rows.length && p.none === undefined) return null;
  const msg = (n) => messages.get(n)?.raised ?? "?";
  const central = relativeLink(permalink ?? "/", CENTRAL_PERMALINK);
  const num = (n) => `[${errorNumber(n)}](${central}#${errorAnchor(n)})`;
  const out = [
    `<!-- errors: generated from errors/${name} by scripts/errors.mjs write; edit the data, not this section -->`,
    `${level} Common Errors`,
    "",
  ];
  if (p.none !== undefined) out.push(p.none.trim());
  else {
    // Rows that raise the same number share one row, their conditions a line each.
    // A row of error 0 raises nothing in twinBASIC: it has its NOTE and no table row.
    const byError = new Map();
    for (const r of p.rows.filter((x) => x.error !== 0))
      byError.set(r.error, [...(byError.get(r.error) ?? []), escapeCell(r.when)]);
    if (byError.size) out.push("| Error | When |", "|---|---|");
    for (const [n, whens] of byError) out.push(`| ${num(n)}, *${msg(n)}* | ${whens.join("<br>")} |`);
    for (const r of p.rows.filter((x) => x.vb6 !== undefined)) {
      const what =
        r.vb6 === 0
          ? "raises no error"
          : r.error === 0
            ? `raises error ${num(r.vb6)}, *${msg(r.vb6)}*; twinBASIC raises none`
            : `raises error ${num(r.vb6)}, *${msg(r.vb6)}*, instead`;
      if (out.at(-1) !== "") out.push("");
      out.push(`> [!NOTE] BETA ${beta}`, `> When ${r.when}, VB6 ${what}.`);
    }
  }
  out.push("", "<!-- /errors -->");
  return out;
}

/**
 * The page text with its section set to `section` (lines, or null to remove it).
 * A new section goes before the first Example heading, else before See Also, else
 * at the end.
 */
export function spliceSection(text, section) {
  const crlf = text.includes("\r\n");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const { section: at } = findSection(lines.join("\n"));
  if (at) {
    let end = at.close + 1;
    if (!section) while (end < lines.length && lines[end] === "") end++;
    lines.splice(at.open, end - at.open, ...(section ?? []));
  } else if (section) {
    const scanned = scan(lines);
    const find = (re) => scanned.findIndex(({ text: t, fenced }) => !fenced && re.test(t));
    let i = find(/^#{2,6}[ \t]+Examples?[ \t]*$/);
    if (i < 0) i = find(/^#{2,6}[ \t]+See Also[ \t]*$/);
    if (i < 0) {
      while (lines.length && lines[lines.length - 1] === "") lines.pop();
      lines.push("", ...section, "");
    } else lines.splice(i, 0, ...section, "");
  }
  const out = lines.join("\n");
  return crlf ? out.replace(/\n/g, "\r\n") : out;
}

/** The page's path on disk, for `page` relative to docs/. */
export const pagePath = (page, docs = DOCS_DIR) => path.join(docs, ...page.split("/"));

// ------------------------------------------------------------------ the central page

export const INDEX_OPEN = /^<!--[ \t]*errors-index:[ \t]*(.*?)[ \t]*-->[ \t]*$/;
export const INDEX_CLOSE = /^<!--[ \t]*\/errors-index[ \t]*-->[ \t]*$/;

/** VB's own numbers in order, then the others in the order of their hexadecimal. */
const byNumber = (a, b) => ((a > 0) - (b > 0) === 0 ? (a >>> 0) - (b >>> 0) : b - a);

/**
 * The central page's index of the numbers, as lines: one row for each number of
 * `messages`, with its anchor, its message (and Error$'s where it differs) and links
 * to the pages whose tables name it. `pages` maps a page under docs/ to its
 * { title, permalink }.
 */
export function renderIndex(files, messages, pages) {
  const naming = new Map();
  for (const f of files) {
    for (const p of f.pages) {
      for (const r of p.rows) {
        if (!naming.has(r.error)) naming.set(r.error, new Set());
        naming.get(r.error).add(p.page);
      }
    }
  }
  const out = [
    "<!-- errors-index: generated from errors/*.yml by scripts/errors.mjs write; edit the data, not this table -->",
    "",
    "| Error | Message | Listed by |",
    "|---|---|---|",
  ];
  for (const n of [...messages.keys()].sort(byNumber)) {
    const m = messages.get(n);
    const hex = errorNumber(n).slice(String(n).length + 1);
    const message = m.raised === m.error ? `*${m.raised}*` : `*${m.raised}*; **Error** gives *${m.error}*`;
    const links = [...(naming.get(n) ?? [])]
      .map((page) => pages.get(page) ?? { title: page, permalink: null })
      .sort((a, b) => a.title.localeCompare(b.title, "en"))
      .map((p) => (p.permalink ? `[${p.title}](${relativeLink(CENTRAL_PERMALINK, p.permalink)})` : p.title));
    out.push(`| **${n}**{: #${errorAnchor(n)} } ${hex} | ${escapeCell(message)} | ${links.join(", ") || "---"} |`);
  }
  out.push("", "<!-- /errors-index -->");
  return out;
}

/**
 * The central page's text with its index set to `index` (lines), or a problem: the
 * page must hold the two markers, once each and in order, outside a fence.
 * @returns {{text: string|null, problem: string|null}}
 */
export function spliceIndex(text, index) {
  const crlf = text.includes("\r\n");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const at = (re) =>
    scan(lines)
      .map(({ text: t, fenced }, i) => (!fenced && re.test(t) ? i : -1))
      .filter((i) => i >= 0);
  const open = at(INDEX_OPEN);
  const close = at(INDEX_CLOSE);
  if (open.length !== 1 || close.length !== 1 || close[0] < open[0])
    return {
      text: null,
      problem: "the page needs one <!-- errors-index: --> and one <!-- /errors-index -->, in order",
    };
  lines.splice(open[0], close[0] - open[0] + 1, ...index);
  const out = lines.join("\n");
  return { text: crlf ? out.replace(/\n/g, "\r\n") : out, problem: null };
}
