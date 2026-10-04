#!/usr/bin/env node
// Build and run Visual Basic 6 code, so that what a documented sample prints in
// twinBASIC can be compared with what it prints in VB6.
//
//     node scripts/vb6run.mjs <file | ->
//     node scripts/vb6run.mjs --docs [--only <regex>]
//
// The mechanics -- finding VB6, the Debug.Print rewrite, the generated modules,
// `/make`, running the exe -- are in scripts/lib/vb6.mjs, whose opening comment
// is the list of what had to be learned, and the first line of it is the one
// that matters here: VB6.EXE is started from Node with an argument array and no
// shell, because in a shell `/make` can be rewritten as a path and VB6 answers
// each switch it does not know with a modal box on the user's desktop.
//
// `--docs` reads the documentation's check_run fences with the fence reader,
// selection rules and output comparison check_examples.mjs uses, and builds each
// of them in VB6 as a module of its own in one project.
//
// Exit codes: see USAGE.

import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import {
  CliError,
  die,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  regexOption,
  withUsageError,
} from "../lib/cli.mjs";
import { DOCS_DIR } from "../lib/repo-paths.mjs";
import { expectedOutput, isRunFence, judgeOutput, runFenceProblem, runRefusal } from "./lib/example-run.mjs";
import { joinConcatGroups } from "./lib/example-batches.mjs";
import { HIDDEN_MARKER, classify, collectFences, partOf } from "./lib/tb-fences.mjs";
import {
  FORM1,
  FORM1_NAME,
  NO_VB6,
  USER_MODULE,
  buildBatch,
  declarationsModule,
  declaresMain,
  diedText,
  findVb6,
  makeWorkDir,
  moduleFor,
  runBatch,
  translateTwinFile,
} from "./lib/vb6.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/vb6run.mjs <file | -> [--vb6 <path>] [--timeout <secs>] [--keep] [--json]
       node scripts/vb6run.mjs --docs [--only <regex>] [--vb6 <path>] [--timeout <secs>] [--keep] [--json]
       node scripts/vb6run.mjs -h, --help

Builds and runs Visual Basic 6 code, to compare what a sample prints in VB6 with
what it prints in twinBASIC. VB6.EXE is started without a shell. Nothing may open
a dialog: the sample runs under an error handler the tool generates, the project
is built with Unattended Execution, and a sample that calls MsgBox or InputBox or
contains an End statement is refused without being built.

A sample's Debug.Print statements are rewritten to Print # against a file the
generated Sub Main opens, because Debug.Print writes nothing in a compiled exe.

<file>        a .bas module, or a text file of bare statements; "-" reads the
              statements from standard input. A file that defines Sub Main is a
              whole module (its Sub Main is renamed, and the generated Main calls
              it); any other file is the body of a generated procedure. What the
              sample printed goes to stdout. A VB6 compile error, with its line
              mapped back to the file, and a run-time error, as
              "[vb6] error <n>: <description>", go to stderr.
--docs        build the documentation's check_run fences in VB6 and compare what
              each prints with what its page says twinBASIC prints. The run
              fences of a projname= group are built in a project of its own with
              the group's other fences, each slot=file fence translated into
              VB6 classes (.cls) and modules (.bas); a construct VB6 has no form
              for is left as it is, and VB6 refuses it. A fence that says
              project=form is built with a blank Form1.frm (no Unattended
              Execution, the exe run on a private desktop), and a Declare loses
              PtrSafe and reads LongPtr as Long. Each fence ends as one of:
              same, differs (the lines that differ, page against VB6), not VB6
              (VB6 refuses to compile it, or the files of its group; most
              twinBASIC syntax ends here, and it is informational), error (a
              run-time error, the exe ended during it, or it did not return),
              refused (the sample cannot be run)
--only <re>   with --docs, the pages whose path under docs/ matches this regular
              expression
--vb6 <path>  VB6.EXE (default: $VB6_EXE, else VB98\\VB6.EXE under Program Files
              (x86) or Program Files)
--timeout <s> time limit for each run of the built exe (default 30); the exe is
              ended by its pid when it runs over
--keep        keep the work folder, under the OS temp folder, and print where
--json        print one JSON object instead of text
-h, --help    print this text and exit

Exit codes:
  0  the sample ran; with --docs, no fence differs and none raised an error
  1  a VB6 compile error, a run-time error, a sample during which the exe ended
     (a VB6 exe that dies of a fault can exit with code 0; the fault the
     Application event log records is named when there is one), or a sample that
     did not return; with
     --docs, at least one fence differs or raised an error
  2  the harness could not run: a refused command line, a file that is missing, a
     sample that is refused, no VB6 (give --vb6 or set VB6_EXE), VB6 failing to
     build, or a crash`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };

const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        docs: { type: "boolean", default: false },
        only: { type: "string" },
        vb6: { type: "string" },
        timeout: { type: "string" },
        keep: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      positionals: { min: 0, max: 1 },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

const [file] = positionals;
const { timeoutMs, only } = withUsageError(() => {
  if (values.docs && file !== undefined) throw new CliError("conflict", "--docs takes no file");
  if (!values.docs && file === undefined) throw new CliError("missing-positional", "give a file to run, or --docs");
  if (values.only !== undefined && !values.docs) throw new CliError("inapplicable", "--only applies to --docs");
  return {
    timeoutMs: numberOption(values.timeout ?? "30", { option: "--timeout", above: 0, max: 2147483 }) * 1000,
    only: values.only === undefined ? null : regexOption(values.only, { option: "--only", flags: "i" }),
  };
}, usageError);

// What the input says, read before VB6 is looked for, so a missing file is reported as that.
let source = null;
if (!values.docs) {
  try {
    source = readFileSync(file === "-" ? 0 : file, "utf8").replace(/^﻿/, "");
  } catch (err) {
    die(
      2,
      `cannot read ${file === "-" ? "standard input" : file}: ${err.code === "ENOENT" ? "no such file" : err.message}`,
    );
  }
}

const vb6 = findVb6(values.vb6);
if (!vb6) die(2, values.vb6 ? `no such file: ${values.vb6}\n${NO_VB6}` : NO_VB6);

const work = makeWorkDir();
const cleanup = () => {
  if (values.keep) console.error(`vb6run: work folder kept in ${work}`);
  else rmSync(work, { recursive: true, force: true });
};
const finish = (code) => {
  cleanup();
  process.exit(code);
};
const say = (text = "") => console.log(text);

// ------------------------------------------------------------ a stand-alone sample

async function sample() {
  const problem = runFenceProblem(source);
  if (problem) {
    console.error(`vb6run: refused: the sample ${problem}`);
    finish(2);
  }
  const whole = declaresMain(source);
  const mod = moduleFor(source, { name: USER_MODULE, whole });
  const built = await buildBatch(vb6, work, [mod], { timeoutMs: 120000 });
  const shown = file === "-" ? "<stdin>" : file;
  const result = { file: shown, whole, state: "ran", output: [], error: null };
  if (!built.built) {
    const e = built.refused.get(mod.name) ?? [...built.refused.values()][0];
    const line = e.line === null ? null : Math.max(1, e.line + mod.lineDelta);
    result.state = "compile error";
    result.error = { line, message: e.message };
    if (values.json) say(JSON.stringify(result, null, 2));
    else console.error(`Compile Error in File '${shown}'${line === null ? "" : `, Line ${line}`} : ${e.message}`);
    finish(1);
  }
  const run = await runBatch(work, 1, { timeoutMs });
  const item = run.items[0];
  result.output = item.output;
  let code = 0;
  const died = run.died.get(0);
  if (died) {
    result.state = "crashed";
    result.error = { message: `the sample ${diedText(died)}` };
    code = 1;
  } else if (run.hung.length || !item.began) {
    result.state = item.began ? "did not return" : "not run";
    result.error = { message: `${result.state} (time limit ${timeoutMs / 1000} s)` };
    code = 1;
  } else if (item.error) {
    result.state = "run-time error";
    result.error = item.error;
    code = 1;
  }
  if (values.json) {
    say(JSON.stringify(result, null, 2));
  } else {
    for (const l of item.output) say(l);
    if (item.error) console.error(`[vb6] error ${item.error.number}: ${item.error.description}`);
    else if (code) console.error(`[vb6] ${result.error.message}`);
  }
  finish(code);
}

// ---------------------------------------------------------------------- --docs

// What inherits= makes of a slot, as check_examples.mjs reads it.
const PROMOTE_TO_CLASS = { module: "class", sub: "method" };

async function docs() {
  const all = joinConcatGroups(await collectFences(DOCS_DIR));
  const fences = all.filter((f) => isRunFence(f) && (!only || only.test(f.rel)));
  const results = fences.map((fence) => ({ fence, state: null, detail: [] }));
  const where = (f, line = f.line) => `docs/${f.rel.split(path.sep).join("/")}:${line}`;

  // A line VB6 reported in a component or a sample, as a line of its fence and of the page.
  const locate = (fence, fenceLine) => {
    const page = (fence.concatParts ? partOf(fence.concatParts, fenceLine)?.pageLine : null) ?? fence.line + fenceLine;
    const text = (fence.content.split(/\r?\n/)[fenceLine - 1] ?? "").trim();
    return { page, text: text ? `: ${text}` : "" };
  };
  const notVb6 = (r, fence, e, delta) => {
    r.state = "not VB6";
    if (e.line === null) {
      r.detail.push(e.message);
      return;
    }
    const at = locate(fence, Math.max(1, e.line + delta));
    r.detail.push(`${e.message} (${where(fence, at.page)})${at.text}`);
  };

  // Which fences are built at all. A fence that is in a projname group is built with the group.
  const plain = [];
  const groups = new Map();
  for (const r of results) {
    const f = r.fence;
    const stated = f.keys.get("slot");
    f.base = f.keys.get("inherits") ?? null;
    f.slot = stated ?? classify(f.content).slot;
    if (f.base && f.slot) f.slot = PROMOTE_TO_CLASS[f.slot] ?? f.slot;
    const refusal = runRefusal(f) ?? (f.slot ? null : { message: "its shape could not be inferred" });
    if (refusal) {
      r.state = "refused";
      r.detail.push(refusal.message);
      continue;
    }
    const group = f.keys.get("projname");
    if (!group) {
      plain.push(r);
    } else {
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(r);
    }
  }

  // The samples of a unit are built as modules of one project and run, and each is judged.
  // `project=form` is the twinBASIC `form` template: a real Form1, which VB6 gets as a blank
  // Form1.frm. A project with a form is not built with Unattended Execution, and its exe is run
  // on a private desktop (see vb6.mjs).
  const wantsForm = (fence) => fence.keys.get("project") === "form";
  const formSupport = { name: FORM1_NAME, kind: "frm", text: FORM1 };

  const judge = async (unit, dir, built, { form = false } = {}) => {
    for (const r of unit) {
      const e = built.refused.get(r.module.name);
      if (e) notVb6(r, r.fence, e, r.module.lineDelta);
    }
    const ran = unit.filter((r) => !r.state);
    if (!ran.length) return;
    const run = await runBatch(dir, ran.length, { timeoutMs, desktop: form });
    ran.forEach((r, i) => {
      const item = run.items[i];
      const f = r.fence;
      if (run.died.has(i)) {
        r.state = "error";
        r.detail.push(diedText(run.died.get(i)));
      } else if (run.hung.includes(i)) {
        r.state = "error";
        r.detail.push(`did not return within ${timeoutMs / 1000} s`);
      } else if (!item.began) {
        r.state = "error";
        r.detail.push("was not run: the run ended before it");
      } else if (item.error) {
        r.state = "error";
        r.detail.push(`raised error ${item.error.number}: ${item.error.description}`);
      } else {
        const expected = expectedOutput(f);
        const problems = judgeOutput(expected, item.output);
        r.output = item.output;
        if (!expected.stated) {
          r.state = "ran";
          r.detail.push("the page states no output to compare");
        } else if (problems.length) {
          r.state = "differs";
          for (const p of problems) {
            r.detail.push(p.line ? `${where(f, p.line)}: ${p.message}` : `${p.message}\n${p.detail ?? ""}`.trim());
          }
        } else {
          r.state = "same";
        }
      }
    });
  };

  // The plain samples are one project, and the ones that want a form another, the one with Form1.
  for (const [label, form] of [
    ["plain", false],
    ["plain-form", true],
  ]) {
    const unit = plain.filter((r) => wantsForm(r.fence) === form);
    if (!unit.length) continue;
    unit.forEach((r, i) => {
      r.module = moduleFor(r.fence.content, { name: `tbxM${i}` });
    });
    const dir = path.join(work, label);
    const built = await buildBatch(
      vb6,
      dir,
      unit.map((r) => r.module),
      { timeoutMs: 120000, support: form ? [formSupport] : [] },
    );
    await judge(unit, dir, built, { form });
  }

  // A projname group is one program: the fences of that name, on any page, that are not run fences
  // are its files, built into a project of its own, and the run fences are modules in it. A group
  // is never batched with another, because class and module names collide between groups.
  let n = 0;
  for (const [name, unit] of groups) {
    const dir = path.join(work, `group-${++n}`);
    const support = [];
    let problem = null;
    all
      .filter((f) => f.keys.get("projname") === name && !f.flags.has(HIDDEN_MARKER) && !f.isResource && !isRunFence(f))
      .forEach((f, k) => {
        const slot = f.keys.get("slot") ?? classify(f.content).slot;
        if (slot === "file") {
          for (const c of translateTwinFile(f.content, { topName: `tbxTop${k}` })) support.push({ ...c, fence: f });
        } else if (slot === "module") {
          support.push({ ...declarationsModule(f.content, `tbxTop${k}`), fence: f });
        } else {
          problem ??= `${where(f)} is slot=${slot}, which the group cannot take into VB6`;
        }
      });
    if (problem) {
      for (const r of unit) {
        r.state = "refused";
        r.detail.push(problem);
      }
      continue;
    }
    unit.forEach((r, i) => {
      r.module = moduleFor(r.fence.content, { name: `tbxM${i}` });
    });
    // A group whose run fence says project=form, or any of whose files do, gets Form1.
    const form = all.some((f) => f.keys.get("projname") === name && !f.isResource && wantsForm(f));
    if (form) support.unshift(formSupport);
    const built = await buildBatch(
      vb6,
      dir,
      unit.map((r) => r.module),
      { timeoutMs: 120000, support },
    );
    if (built.supportError) {
      // Nothing in the group can be built: every run fence ends as the error in its files does.
      const { component, line, message } = built.supportError;
      for (const r of unit) notVb6(r, component.fence, { line, message }, component.lineDelta);
      continue;
    }
    await judge(unit, dir, built, { form });
  }

  const STATES = ["same", "differs", "not VB6", "error", "refused", "ran"];
  const counts = Object.fromEntries(STATES.map((s) => [s, results.filter((r) => r.state === s).length]));
  const summary =
    `vb6run: ${results.length} check_run fence(s): ${counts.same} same, ${counts.differs} differs, ` +
    `${counts["not VB6"]} not VB6, ${counts.error} error, ${counts.refused} refused` +
    (counts.ran ? `, ${counts.ran} ran with nothing to compare` : "");
  const bad = counts.differs + counts.error;

  if (values.json) {
    say(
      JSON.stringify(
        {
          summary: counts,
          fences: results.map((r) => ({
            id: r.fence.id,
            page: where(r.fence),
            state: r.state,
            detail: r.detail,
            output: r.output ?? null,
          })),
        },
        null,
        2,
      ),
    );
  } else {
    for (const r of results) {
      say(`${r.state.padEnd(8)}  ${where(r.fence)}  (${r.fence.id})`);
      if (r.state !== "same") for (const d of r.detail) say(`          ${d.split("\n").join("\n          ")}`);
    }
    say();
    say(summary);
  }
  finish(bad ? 1 : 0);
}

try {
  await (values.docs ? docs() : sample());
} catch (err) {
  console.error(`vb6run: ${err.message}`);
  finish(2);
}
