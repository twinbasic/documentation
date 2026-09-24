#!/usr/bin/env node
// Summarise and audit one evaluator's session.
//
//     node eval/transcript.mjs <case.jsonl> [--calls] [--report]
//
// eval/run_case.mjs writes the session as Claude Code's stream-json output and
// prints this digest at the end of every run. See eval/README.md.
//
// WHY THE AUDIT EXISTS
//
// An evaluator's account of its own channels is not reliable. Of the first two
// evaluators run as isolated processes, one opened with a full-text search of
// the whole corpus for the gate's name --- before a single site search or
// navigation hop --- and then reported that Channel 3 was "not needed"; the
// other found the answer by search and walked the navigation path afterwards,
// to confirm links it already knew. Its hops are real links, but they were not
// found blind. Both reports read as clean.
//
// Rounds 1-7 ran evaluators as subagents, which hand back only their final
// report, so no round before this one could have seen either. The session
// records every call in order, and the order is what the protocol's channels
// are about. The audit reads it back; it does not score anything.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Every event in a stream-json session, in order. */
export function readTranscript(file) {
  const events = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* not an event */ }
  }
  return events;
}

/**
 * The session's setup, its tool calls paired with their results, everything
 * the model wrote, and the final report.
 */
export function summarize(events) {
  const s = { init: null, result: null, calls: [], texts: [], report: "" };
  const byId = new Map();
  for (const e of events) {
    if (e.type === "system" && e.subtype === "init") s.init = e;
    else if (e.type === "result") s.result = e;
    else if (e.type === "assistant") {
      for (const c of e.message?.content ?? []) {
        if (c.type === "text" && c.text.trim()) { s.texts.push(c.text); s.report = c.text; }
        if (c.type !== "tool_use") continue;
        const call = { n: s.calls.length + 1, tool: c.name, input: c.input ?? {}, ok: null, output: "" };
        s.calls.push(call);
        byId.set(c.id, call);
      }
    } else if (e.type === "user" && Array.isArray(e.message?.content)) {
      for (const c of e.message.content) {
        const call = c.type === "tool_result" ? byId.get(c.tool_use_id) : undefined;
        if (!call) continue;
        call.ok = !c.is_error;
        call.output = typeof c.content === "string" ? c.content : JSON.stringify(c.content);
      }
    }
  }
  if (typeof s.result?.result === "string" && s.result.result.trim()) s.report = s.result.result;
  return s;
}

const SHELL_SEARCH = /(^|[\s;&|(])(grep|rg|findstr|select-string)\b/i;
const RECURSIVE = /\s-[a-zA-Z]*[rR]|--recursive/;

/**
 * What a call was, in the protocol's terms. A search for a permalink is the
 * sanctioned way to open a search result, and a search inside one page is a
 * reader's find-in-page, so neither is full-text search. Any other search is,
 * whether or not it was refused. (Read-only commands inside the working
 * directory are not refused, so a shell grep can run.)
 */
export function classify(call) {
  const cmd = String(call.input.command ?? "");
  switch (call.tool) {
    case "Bash":
      if (cmd.includes("site-search")) return "search";
      if (!SHELL_SEARCH.test(cmd)) return "shell";
      if (/permalink/i.test(cmd)) return "permalink";
      return !RECURSIVE.test(cmd) && /\.md\b/i.test(cmd) ? "find" : "fulltext";
    case "Grep":
      if (/permalink/i.test(String(call.input.pattern ?? ""))) return "permalink";
      return /\.md$/i.test(String(call.input.path ?? "")) ? "find" : "fulltext";
    case "Read": return "read";
    case "Glob": return "list";
    default: return "other";
  }
}

const LETTER = {
  search: "S", fulltext: "F", permalink: "P", find: "I", read: "R", list: "L", shell: "X", other: "O",
};

/** True when a line of the report says Channel 3 went unused. */
function claimsChannel3Unused(report) {
  for (const line of report.split("\n")) {
    if (!/channel 3/i.test(line)) continue;
    if (/\b(not needed|not used|not required|unnecessary|none|skipped|no)\b/i.test(line)) return true;
  }
  return false;
}

/**
 * How many queries one search call ran. An evaluator can chain several in one
 * command --- round 8's UC-58 ran four in a single call --- and a timeline of one
 * letter per call then reads as one search.
 */
const queriesIn = (call) => (String(call.input.command ?? "").match(/site-search/g) ?? []).length;

/** The facts about channel order the report cannot be trusted to state. */
export function audit(s) {
  const kinds = s.calls.map(classify);
  const firstSearch = kinds.indexOf("search");
  const fulltext = s.calls.filter((_, i) => kinds[i] === "fulltext");
  const early = fulltext.filter((c) => firstSearch < 0 || c.n - 1 < firstSearch);
  const searchCalls = s.calls.filter((_, i) => kinds[i] === "search");
  const queries = searchCalls.reduce((n, c) => n + queriesIn(c), 0);
  const flags = [];
  if (firstSearch < 0) flags.push("no site search at all: Channel 1 was not run");
  if (early.length) flags.push(`${early.length} full-text search(es) before the first site search`);
  if (fulltext.length && claimsChannel3Unused(s.report)) {
    flags.push(`the report says Channel 3 was not used, and the session has ${fulltext.length} full-text search(es)`);
  }
  const timeline = kinds.map((k, i) => {
    const letter = s.calls[i].ok === false ? LETTER[k].toLowerCase() : LETTER[k];
    const n = k === "search" ? queriesIn(s.calls[i]) : 1;
    return n > 1 ? `${letter}${n}` : letter;
  }).join(" ");
  return {
    kinds, firstSearch: firstSearch < 0 ? null : firstSearch + 1, fulltext, early, flags, timeline,
    queries, searchCalls: searchCalls.length,
  };
}

const brief = (call) => {
  const i = call.input;
  const what = i.command ?? i.file_path ?? i.pattern ?? JSON.stringify(i);
  return `${call.tool} ${String(what).replace(/\s+/g, " ")}${i.path ? `  [in ${i.path}]` : ""}`;
};

/** The digest run_case.mjs prints after every run. */
export function printDigest(s, { calls = false, report = false } = {}) {
  const a = audit(s);
  const i = s.init ?? {};
  const r = s.result ?? {};
  const refused = s.calls.filter((c) => c.ok === false).length;
  console.log(`model ${i.model ?? "?"} -- Claude Code ${i.claude_code_version ?? "?"} -- ${i.permissionMode ?? "?"} -- tools ${(i.tools ?? []).join(",")}`);
  console.log(`cwd   ${i.cwd ?? "?"}`);
  console.log(`${r.num_turns ?? "?"} turns -- ${Math.round((r.duration_ms ?? 0) / 1000)} s -- ` +
    `$${(r.total_cost_usd ?? 0).toFixed(3)} -- ${s.calls.length} calls, ${refused} refused or failed`);
  console.log(`\ntimeline  ${a.timeline || "(no calls)"}`);
  console.log("          S site search  F full-text search  P permalink lookup  I find in one page");
  console.log("          R read  L listing  X other shell  (lower case: refused or failed)");
  console.log("          a number after a letter: that many queries in the one call");
  console.log(`\nfirst site search: ${a.firstSearch ? `call ${a.firstSearch}` : "none"}`);
  console.log(`site searches: ${a.queries} quer${a.queries === 1 ? "y" : "ies"} in ${a.searchCalls} call(s)`);
  console.log(`full-text searches: ${a.fulltext.length}`);
  for (const c of a.fulltext) console.log(`  #${c.n} ${brief(c).slice(0, 160)}`);
  for (const f of a.flags) console.log(`FLAG  ${f}`);
  if (calls) {
    console.log("\ncalls");
    for (const c of s.calls) {
      console.log(`  #${String(c.n).padEnd(3)} ${c.ok === false ? "REFUSED " : ""}${brief(c).slice(0, 200)}`);
    }
  }
  if (report) console.log(`\n${s.report}`);
  return a;
}

function main(argv) {
  const file = argv.find((a) => !a.startsWith("--"));
  if (!file || argv.includes("--help") || argv.includes("-h")) {
    console.log(
      "Usage: node eval/transcript.mjs <case.jsonl> [--calls] [--report]\n\n" +
      "Summarises an evaluator's session and audits the order of its channels.\n" +
      "See eval/README.md."
    );
    process.exit(file ? 0 : 1);
  }
  printDigest(summarize(readTranscript(file)), {
    calls: argv.includes("--calls"),
    report: argv.includes("--report"),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
