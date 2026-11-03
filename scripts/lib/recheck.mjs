// What scripts/recheck_callouts.mjs reads and decides, apart from what it runs: the check each
// marker item stands for, the reading of each tool's report into a status per check, a callout's
// verdict from the statuses of its items, and the relabelling of a callout's first line. None of
// it needs an IDE; scripts/check_callout_evidence.mjs probes it.
//
// A check's status is one of:
//   holds      the evidence still says what the callout says: the bug reproduces, the lane
//              passes, the sample prints what the page says, the data agrees, the case is as
//              documented
//   changed    it no longer does: the callout is to be read again, and fixed or removed
//   hand       nothing runs it (`none`, a manual reproducer, a package's probe/ scenario)
//   error      it could not be run, or its report could not be read
//   skipped    its kind was not asked for (--kinds)

import { kindOf } from "./test-markers.mjs";

/** A check's key: one per thing run, which several callouts may share. */
export function checkKey(item, pkg) {
  const kind = kindOf(item);
  if (kind === "case" || kind === "compile") return `package ${pkg}`;
  if (kind === "probe") return `probe ${pkg}:${item.probe}`;
  if (kind === "none") return "none";
  return `${kind} ${item[kind]}`;
}

/** The kind of a check's key, as --kinds names it. */
export const keyKind = (key) => key.split(" ")[0];

/** The kinds a run can be limited to; `none` and a package's probe are never run. */
export const RUN_KINDS = ["bug", "lane", "sample", "errors", "llvm", "static", "package"];

// `bug_repro.mjs verify`'s line for a reproducer.
const VERIFY_RE =
  /^([a-z0-9-]+)(?: \(filed[^)]*\))?: (reproduces|NO LONGER REPRODUCES|manual|harness failed)(?: -- (.*))?$/;
const VERIFY_STATUS = {
  reproduces: "holds",
  "NO LONGER REPRODUCES": "changed",
  manual: "hand",
  "harness failed": "error",
};

/**
 * The status of each reproducer `bug_repro.mjs verify` reported.
 *
 * @returns {Map<string, {status: string, detail: string}>}
 */
export function readVerify(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = VERIFY_RE.exec(line.trim());
    if (m) out.set(m[1], { status: VERIFY_STATUS[m[2]], detail: m[2] + (m[3] ? ` -- ${m[3]}` : "") });
  }
  return out;
}

/**
 * The status of a sample from `check_examples.mjs --json`'s report: it holds when each of its
 * runs passed with no finding, its win64 copy's included when it asks for one.
 *
 * @param {{findings: object[], ids?: {passed: string[], unrun: string[]}}} report
 * @param {string[]} runIds  the ids the sample is judged under: its own, `<id>@win64`, or both
 */
export function sampleStatus(report, runIds) {
  if (!report?.ids) return { status: "error", detail: "check_examples wrote no ids" };
  const found = report.findings.filter((f) => runIds.includes(f.id));
  if (found.length) return { status: "changed", detail: found.map((f) => `${f.id}: ${f.message}`).join("; ") };
  const missing = runIds.filter((r) => !report.ids.passed.includes(r));
  if (missing.length) return { status: "error", detail: `not built: ${missing.join(", ")}` };
  const unrun = runIds.filter((r) => report.ids.unrun.includes(r));
  if (unrun.length) return { status: "error", detail: `built and not run: ${unrun.join(", ")}` };
  return { status: "holds", detail: runIds.length > 1 ? `${runIds.length} runs` : "" };
}

/**
 * The status of the cases of one package from `package_tests.mjs --json`'s report: a case holds
 * when it is as documented on every architecture it ran on.
 *
 * @returns {(name: string) => {status: string, detail: string}}
 */
export function packageCases(report, pkg) {
  const entry = report?.packages?.find((p) => p.package === pkg);
  return (name) => {
    if (!entry) return { status: "error", detail: `package_tests reported nothing for ${pkg}` };
    const runs = entry.cases.filter((c) => c.name === name);
    if (!runs.length) return { status: "error", detail: `package_tests reported nothing for ${name}` };
    const off = runs.filter((c) => c.verdict !== "documented");
    return off.length
      ? { status: "changed", detail: off.map((c) => `${c.arch} ${c.verdict}`).join(", ") }
      : { status: "holds", detail: "" };
  };
}

/** A callout's verdict from the statuses of its items: the worst of them. */
export function verdictOf(statuses) {
  for (const s of ["changed", "error", "skipped", "hand"]) if (statuses.includes(s)) return s;
  return statuses.length ? "holds" : "error";
}

// A callout's first line with a BETA label, not `since BETA`.
const LABEL_RE = /^([ \t]*>[ \t]*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\n]*?)(?<!since )\bBETA (\d+)\b/;

/**
 * A callout's first line with its build moved to `build`, or null when the line is not a callout
 * labelled BETA <n>. The rest of the label, a package version, stays.
 */
export function relabelLine(line, build) {
  return LABEL_RE.test(line) ? line.replace(LABEL_RE, `$1BETA ${build}`) : null;
}
