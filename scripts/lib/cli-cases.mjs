// The recorded cases scripts/check_cli.mjs runs: invocations that stop while
// a tool reads its command line, each with the exit code and the text printed
// on each stream. check_cli.mjs's opening comment says what a case asserts and
// which invocations belong here; this module only builds the list.
//
// CASES is the hand-written table, then the cases generated from HELP_TOOLS
// (--help and -h for every tool), REFUSALS (an unknown flag and an empty value
// for every tool) and BAD_VALUES (a value refused straight after the parse).
// LEAVES_EMPTY holds the cases whose folder must still be empty afterwards.
// A new tool goes into HELP_TOOLS and REFUSALS; building the list throws if
// the two disagree.

import path from "node:path";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";

// biome-ignore format: a table, one entry per line
const CASES = [
  // A command-line error in tbdocs and check_links exits 2, as in every tool,
  // and never reads as a finding, which exits 1. A value flag has no
  // value at the end of the list or before another flag, and --port is a whole
  // number from 1 to 65535. check_links prints its errors on stderr, after
  // "error: ".
  { tool: "builder/tbdocs.mjs", args: ["--port"], exit: 2, stderr: "--port needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--dest", "--no-pdf"], exit: 2, stderr: "--dest needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=0"], exit: 2, stderr: "--port expects a whole number from 1 to 65535, got: 0\n" },
  { tool: "builder/tbdocs.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree", "--root-dir"], exit: 2, stderr: "error: --root-dir needs a value\n" },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree", "--forbid"], exit: 2, stderr: "error: --forbid needs a value\n" },

  // In the four harness tools that check, a value flag with no value, at the end or before another flag,
  // exits 2. tbbuild follows the message with its usage line.
  { tool: "scripts/tbbuild.mjs", args: ["--port"], exit: 2, stderr: /^--port needs a value\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["--timeout", "--keep"], exit: 2, stderr: /^--timeout needs a value\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/check_examples.mjs", args: ["--jobs"], exit: 2, stderr: "check_examples: --jobs needs a value\n" },
  { tool: "scripts/check_examples.mjs", args: ["--port", "--json"], exit: 2, stderr: "check_examples: --port needs a value\n" },
  { tool: "scripts/census_attributes.mjs", args: ["--out"], exit: 2, stderr: "--out needs a value\n" },
  { tool: "scripts/census_attributes.mjs", args: ["--exported", "--json"], exit: 2, stderr: "--exported needs a value\n" },
  { tool: "scripts/census_attributes.mjs", args: ["--src", "x"], exit: 2, stderr: "unknown option: --src\n" },
  { tool: "scripts/build_package_api.mjs", args: ["--out"], exit: 2, stderr: "--out needs a value\n" },
  { tool: "scripts/build_package_api.mjs", args: ["--exported", "--check"], exit: 2, stderr: "--exported needs a value\n" },
  { tool: "scripts/build_package_api.mjs", args: ["--src", "x"], exit: 2, stderr: "unknown option: --src\n" },

  // The a11y and diagram tools. A value flag given
  // nothing, at the end or as "", or followed by another flag, is refused.
  // Each of them answers --help on stdout with exit 0.
  // --theme and --viewport are checked against their lists.
  // check_dot_fit and build_dot_metrics take one flag of their own besides
  // --help and -h, and neither has a case beyond those and the generated ones.
  { tool: "scripts/check_a11y.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_a11y\.mjs / },
  { tool: "scripts/check_a11y.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--root-dir"], exit: 2, stderr: "--root-dir needs a value\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--root-dir", "--theme", "dark"], exit: 2, stderr: "--root-dir needs a value\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--theme", ""], exit: 2, stderr: "--theme needs a non-empty value\n" },
  { tool: "scripts/check_a11y.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/check_a11y.mjs", args: ["--viewport", "huge"], exit: 2, stderr: 'unknown --viewport "huge"; expected one of desktop, mobile or both\n' },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_a11y_fingerprint\.mjs / },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--pages"], exit: 2, stderr: "--pages needs a value\n" },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--out"], exit: 2, stderr: "--out needs a value\n" },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--json", "x"], exit: 2, stderr: "unknown option: --json\n" },
  { tool: "scripts/check_a11y_fingerprint.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_axe_patch_equiv\.mjs / },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_axe_patch_equiv.mjs", args: ["--patch"], exit: 2, stderr: "--patch needs a value\n" },
  { tool: "scripts/check_pdf_shims_equiv.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_pdf_shims_equiv\.mjs\n/ },
  { tool: "scripts/check_pdf_shims_equiv.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_impexp_parity.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_impexp_parity\.mjs\n/ },
  { tool: "scripts/check_impexp_parity.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_tree_fresh\.mjs / },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--source"], exit: 2, stderr: "--source needs a value\n" },
  { tool: "scripts/check_tree_fresh.mjs", args: ["--tree"], exit: 2, stderr: "--tree needs a value\n" },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/pick_a11y_sample\.mjs / },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/pick_a11y_sample.mjs", args: ["--budget"], exit: 2, stderr: "--budget needs a value\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/sweep_a11y\.mjs / },
  { tool: "scripts/sweep_a11y.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--limit"], exit: 2, stderr: "--limit needs a value\n" },
  { tool: "scripts/sweep_a11y.mjs", args: ["--theme", "drak"], exit: 2, stderr: 'unknown --theme "drak"; expected one of light, dark or both\n' },
  { tool: "scripts/sweep_a11y.mjs", args: ["--viewport", "huge"], exit: 2, stderr: 'unknown --viewport "huge"; expected one of desktop, mobile or both\n' },

  // The harness tools. All of them answer --help and -h
  // on stdout with exit 0 before any other check, a number or a missing
  // project included. tbbuild finds its project anywhere in the list.
  // An unknown option, a value flag with no value or an empty one is
  // refused, and tbbuild and tbrun follow the message with their usage.
  // gen_attribute_probes takes one output folder and an optional key file, so
  // only its empty list is a case here.
  { tool: "scripts/tbbuild.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--help"], exit: 0, stdout: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--arch", "win99"], exit: 2, stderr: /^--arch expects win32 or win64, got: win99\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--port", "1.5"], exit: 2, stderr: /^--port expects a whole number from 1 to 65535, got: 1\.5\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--timeout", "abc"], exit: 2, stderr: /^--timeout expects a number greater than 0, got: abc\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--timeout", "-3"], exit: 2, stderr: /^--timeout needs a value\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["x.twinproj", "--port", "0", "--help"], exit: 0, stdout: /^usage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["--bogus", "--keep", "x.twinproj"], exit: 2, stderr: /^unknown option: --bogus\nusage: node scripts\/tbbuild\.mjs / },
  { tool: "scripts/tbbuild.mjs", args: ["--keep", "x.twinproj"], exit: 2, stderr: "no such project: x.twinproj\n" },
  { tool: "scripts/tbrun.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--help"], exit: 0, stdout: /^usage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch", "win99"], exit: 2, stderr: /^--arch expects win32 or win64, got: win99\nusage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["--port", "no-such-dir"], exit: 2, stderr: /^--port expects a whole number from 1 to 65535, got: no-such-dir\nusage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch"], exit: 2, stderr: /^--arch needs a value\nusage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch", ""], exit: 2, stderr: /^--arch needs a non-empty value\nusage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["--bogus", "no-such-dir"], exit: 2, stderr: /^unknown option: --bogus\nusage: node scripts\/tbrun\.mjs / },
  { tool: "scripts/tbrun.mjs", args: ["no-such-dir", "--arch", "win64"], exit: 2, stderr: /^not a directory: .*no-such-dir\ntbrun takes an exported source tree / },
  { tool: "scripts/bug_repro.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/bug_repro\.mjs / },
  { tool: "scripts/bug_repro.mjs", args: ["compile", "--help", "--bogus"], exit: 0, stdout: /^usage: node scripts\/bug_repro\.mjs / },
  { tool: "scripts/vb6run.mjs", args: [], exit: 2, stderr: /^give a file to run, or --docs\nusage: node scripts\/vb6run\.mjs / },
  { tool: "scripts/vb6run.mjs", args: ["x.bas", "--help"], exit: 0, stdout: /^usage: node scripts\/vb6run\.mjs / },
  { tool: "scripts/vb6run.mjs", args: ["--docs", "x.bas"], exit: 2, stderr: /^--docs takes no file\nusage: node scripts\/vb6run\.mjs / },
  { tool: "scripts/vb6run.mjs", args: ["--vb6"], exit: 2, stderr: /^--vb6 needs a value\nusage: node scripts\/vb6run\.mjs / },
  { tool: "scripts/vb6run.mjs", args: ["--docs", "--timeout"], exit: 2, stderr: /^--timeout needs a value\nusage: node scripts\/vb6run\.mjs / },
  { tool: "scripts/vb6run.mjs", args: ["no-such-file.bas"], exit: 2, stderr: "cannot read no-such-file.bas: no such file\n" },
  { tool: "scripts/vb6run.mjs", args: ["--docs", "--vb6", "no-such/VB6.EXE"], exit: 2, stderr: /^no such file: no-such\/VB6\.EXE\nno VB6 found: pass --vb6 / },
  { tool: "scripts/addin_test.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/addin_test\.mjs / },
  { tool: "scripts/addin_test.mjs", args: ["--ide"], exit: 2, stderr: "--ide needs a value\n" },
  { tool: "scripts/addin_test.mjs", args: ["--ide", ""], exit: 2, stderr: "--ide needs a non-empty value\n" },
  { tool: "scripts/addin_test.mjs", args: ["--ide", "no-such.exe"], exit: 2, stderr: /^no twinBASIC IDE found: pass --ide / },
  { tool: "scripts/ide_test.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/ide_test\.mjs / },
  { tool: "scripts/ide_test.mjs", args: ["--ide"], exit: 2, stderr: "--ide needs a value\n" },
  { tool: "scripts/ide_test.mjs", args: ["--ide", ""], exit: 2, stderr: "--ide needs a non-empty value\n" },
  { tool: "scripts/ide_test.mjs", args: ["--ide", "no-such.exe"], exit: 2, stderr: /^no twinBASIC IDE found: pass --ide / },
  { tool: "scripts/check_examples.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_examples\.mjs \[options\]\n/ },
  { tool: "scripts/check_examples.mjs", args: ["--jobs", "0"], exit: 2, stderr: "check_examples: --jobs expects a whole number of at least 1, got: 0\n" },
  { tool: "scripts/check_examples.mjs", args: ["--batch", "1.5"], exit: 2, stderr: "check_examples: --batch expects a whole number of at least 1, got: 1.5\n" },
  { tool: "scripts/check_examples.mjs", args: ["--jobs", "0", "--help"], exit: 0, stdout: /^usage: node scripts\/check_examples\.mjs \[options\]\n/ },
  { tool: "scripts/check_examples.mjs", args: ["--help", "--jobs"], exit: 0, stdout: /^usage: node scripts\/check_examples\.mjs \[options\]\n/ },
  { tool: "scripts/census_attributes.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/census_attributes\.mjs \[options\]\n/ },
  { tool: "scripts/census_attributes.mjs", args: ["--help", "--attr"], exit: 0, stdout: /^usage: node scripts\/census_attributes\.mjs \[options\]\n/ },
  { tool: "scripts/census_attributes.mjs", args: ["--dump-sites"], exit: 2, stderr: "--dump-sites needs a value\n" },
  { tool: "scripts/build_package_api.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/build_package_api\.mjs \[options\]\n/ },
  { tool: "scripts/gen_attribute_probes.mjs", args: [], exit: 2, stderr: /^Generate a twinBASIC probe project for Reference\/Attributes\.md applicability\.\n/ },

  // The gates and link tools. check_links prints its
  // errors on stderr, after "error: ", and exits 2. Every one of them refuses
  // an unknown option, a stray argument, a value given to a flag that takes
  // none, and a value flag with no value, and crawl_check, compare_trees and
  // survey_tooling follow the message with their usage. check_lint prints its
  // name, the message and its usage line. check_regex_safety,
  // check_code_regions, check_gate_lists and convert_em_dash_separators take
  // only flags of their own, and none has a case beyond --help, -h and the
  // generated ones below.
  { tool: "scripts/check_links.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node check_links\.mjs \[options\] <inputs\.\.\.>\n/ },
  { tool: "scripts/check_links.mjs", args: ["no-such-tree"], exit: 2, stderr: "error: --offline is required. Online (network) checking is not implemented by this tool.\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline"], exit: 2, stderr: "error: at least one input file or directory is required\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "--bogus", "no-such-tree"], exit: 2, stderr: "error: unknown option: --bogus\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "-x", "--bogus=1"], exit: 2, stderr: "error: unknown option: -x\n" },
  { tool: "scripts/check_links.mjs", args: ["--offline", "--root-dir", "--forbid"], exit: 2, stderr: "error: --root-dir needs a value\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node scripts\/check_links_diff\.mjs \[options\]\n/ },
  { tool: "scripts/check_links_diff.mjs", args: [], exit: 2, stderr: /^error: --a and --b are both 'script', which compares nothing\.\n/ },
  { tool: "scripts/check_links_diff.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "scripts/check_links_diff.mjs", args: ["--list=1"], exit: 2, stderr: "--list takes no value\n" },
  { tool: "scripts/crawl_check.mjs", args: [], exit: 2, stderr: /^usage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--bogus", "http://127.0.0.1:9/"], exit: 2, stderr: /^unknown option: --bogus\nusage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--timeout", "5", "-x"], exit: 2, stderr: /^unknown option: -x\nusage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--skip-external=1"], exit: 2, stderr: /^--skip-external takes no value\nusage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/crawl_check.mjs", args: ["--concurrency", "--bogus"], exit: 2, stderr: /^--concurrency needs a value\nusage: node scripts\/crawl_check\.mjs <start-url> / },
  { tool: "scripts/check_publish_policy.mjs", args: ["--src"], exit: 2, stderr: "--src needs a value\n" },
  { tool: "scripts/survey_tooling.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--bogus"], exit: 2, stderr: /^unknown option: --bogus\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["stray"], exit: 2, stderr: /^unexpected argument: stray\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--root"], exit: 2, stderr: /^--root needs a value\nusage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/survey_tooling.mjs", args: ["--window", "0"], exit: 2, stderr: /^--window expects a whole number of at least 1, got: 0\nusage: node scripts\/survey_tooling\.mjs / },
  { tool: "scripts/survey_tooling.mjs", args: ["--top", "1.5"], exit: 2, stderr: /^--top expects a whole number of at least 1, got: 1\.5\nusage: node scripts\/survey_tooling\.mjs / },
  { tool: "scripts/survey_tooling.mjs", args: ["--window", "0", "--help"], exit: 0, stdout: /^usage: node scripts\/survey_tooling\.mjs \[--root DIR\] / },
  { tool: "scripts/check_lint.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/check_lint\.mjs \[--staged\]\n/ },
  { tool: "scripts/check_lint.mjs", args: ["--staged", "--staged"], exit: 2, stderr: "check_lint: --staged given more than once\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--staged", "x"], exit: 2, stderr: "check_lint: unexpected argument: x\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--"], exit: 2, stderr: "check_lint: unexpected argument: --\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--staged=1"], exit: 2, stderr: "check_lint: --staged takes no value\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/check_lint.mjs", args: ["--bogus"], exit: 2, stderr: "check_lint: unknown option: --bogus\nusage: node scripts/check_lint.mjs [--staged]\n" },
  { tool: "scripts/compare_trees.mjs", args: ["--help"], exit: 0, stdout: /^usage: node scripts\/compare_trees\.mjs \[--before <ref>\] / },
  { tool: "scripts/compare_trees.mjs", args: ["--bogus"], exit: 2, stderr: /^compare_trees: unknown option: --bogus\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["stray"], exit: 2, stderr: /^compare_trees: unexpected argument: stray\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--before"], exit: 2, stderr: /^compare_trees: --before needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--max", "--keep"], exit: 2, stderr: /^compare_trees: --max needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--max", "1.5"], exit: 2, stderr: /^compare_trees: --max expects a whole number of at least 0, got: 1\.5\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--bogus", "--help"], exit: 2, stderr: /^compare_trees: unknown option: --bogus\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--before", "--", "x"], exit: 2, stderr: /^compare_trees: --before needs a value\n\nusage: node scripts\/compare_trees\.mjs / },
  { tool: "scripts/compare_trees.mjs", args: ["--keep=1"], exit: 2, stderr: /^compare_trees: --keep takes no value\n\nusage: node scripts\/compare_trees\.mjs / },

  // render-book, eval/ and wisdom. In every one of them an
  // unknown option, a value flag with no value and a value given to a boolean
  // are refused at the parse, in the parser's own words, exit 2, and so is an
  // argument beyond those a tool takes (nav_hops and site_search take any
  // number). A search term or a file name that starts with a dash goes after
  // --. build_corpus, nav_hops, run_case, site_search and transcript print
  // their usage on stderr when an argument they need is
  // missing; wisdom does when no command is given, and names an unknown one.
  // Every tool here answers -h and --help on stdout with exit 0, and
  // reads nothing after it. The command in the wisdom cases is never a real
  // one, so that none can start an export. render-book's missing input file is
  // not a usage error, but exits 2 as one does, and so does a --site that holds
  // no search index.
  { tool: "book/render-book.mjs", args: ["--help"], exit: 0, stdout: /^usage: node render-book\.mjs <input\.html> / },
  { tool: "book/render-book.mjs", args: [], exit: 2, stderr: "usage: node render-book.mjs <input.html> -o <output.pdf> [--outline-tags ...] [-t ms] [--additional-script path]...\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "b.html"], exit: 2, stderr: "unexpected argument: b.html\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "-o"], exit: 2, stderr: "-o needs a value\n" },
  { tool: "book/render-book.mjs", args: ["-o", "--bogus", "a.html"], exit: 2, stderr: "-o needs a value\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "-o", "out.pdf", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "-o", "out.pdf", "--outline-tags"], exit: 2, stderr: "--outline-tags needs a value\n" },
  { tool: "book/render-book.mjs", args: ["a.html", "-o", "out.pdf", "-t", "abc"], exit: 2, stderr: "--timeout expects a whole number from 0 to 2147483647, got: abc\n" },
  { tool: "book/render-book.mjs", args: ["-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "eval/build_corpus.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/build_corpus\.mjs --dest <path> / },
  { tool: "eval/build_corpus.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/build_corpus\.mjs --dest <path> / },
  { tool: "eval/build_corpus.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/build_corpus.mjs", args: ["stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "eval/build_corpus.mjs", args: ["--help", "--bogus"], exit: 0, stdout: /^Usage: node eval\/build_corpus\.mjs --dest <path> / },
  { tool: "eval/build_corpus.mjs", args: ["--quiet=1"], exit: 2, stderr: "--quiet takes no value\n" },
  { tool: "eval/build_corpus.mjs", args: ["-hq"], exit: 0, stdout: /^Usage: node eval\/build_corpus\.mjs --dest <path> / },
  { tool: "eval/build_corpus.mjs", args: ["--repo"], exit: 2, stderr: "--repo needs a value\n" },
  { tool: "eval/build_corpus.mjs", args: ["--src", "x"], exit: 2, stderr: "unknown option: --src\n" },
  { tool: "eval/nav_hops.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/nav_hops\.mjs \[--from <page>\] / },
  { tool: "eval/nav_hops.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/nav_hops\.mjs \[--from <page>\] / },
  { tool: "eval/nav_hops.mjs", args: ["--from", "nope.md", "x"], exit: 2, stderr: /^no start page: .*[\\/]nope\.md\n$/ },
  { tool: "eval/nav_hops.mjs", args: ["--repo", "nowhere", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/nav_hops.mjs", args: ["--repo", "nowhere", "--", "--bogus"], exit: 2, stderr: /^no start page: .*[\\/]nowhere[\\/]docs[\\/]index\.md\n$/ },
  { tool: "eval/nav_hops.mjs", args: ["--help=1", "--repo", "nowhere"], exit: 2, stderr: "--help takes no value\n" },
  { tool: "eval/nav_hops.mjs", args: ["--from", "--repo", "x"], exit: 2, stderr: "--from needs a value\n" },
  { tool: "eval/nav_hops.mjs", args: ["--src", "x", "y"], exit: 2, stderr: "unknown option: --src\n" },
  { tool: "eval/nav_hops.mjs", args: ["--", "C:/x"], exit: 2, stderr: "these patterns arrived as Windows paths: C:/x\nGit Bash converted them. Run with MSYS_NO_PATHCONV=1 set, or from another shell.\n" },
  { tool: "eval/nav_hops.mjs", args: ["--repo"], exit: 2, stderr: "--repo needs a value\n" },
  { tool: "eval/nav_hops.mjs", args: ["x", "--from"], exit: 2, stderr: "--from needs a value\n" },
  { tool: "eval/run_case.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/run_case\.mjs --corpus <dir> / },
  { tool: "eval/run_case.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/run_case\.mjs --corpus <dir> / },
  { tool: "eval/run_case.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/run_case.mjs", args: ["stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "eval/run_case.mjs", args: ["--help", "--bogus"], exit: 0, stdout: /^Usage: node eval\/run_case\.mjs --corpus <dir> / },
  { tool: "eval/run_case.mjs", args: ["--prompt-only=1"], exit: 2, stderr: "--prompt-only takes no value\n" },
  { tool: "eval/run_case.mjs", args: ["--corpus"], exit: 2, stderr: "--corpus needs a value\n" },
  { tool: "eval/run_case.mjs", args: ["--smoke", "--corpus", "c", "--site", "s", "--out", "o"], exit: 2, stderr: /^missing: .*[\\/]c[\\/]docs, .*search-data\.json, .*lunr\.min\.js\n$/ },
  { tool: "eval/run_case.mjs", args: ["--smoke", "--corpus", "c", "--site", "s", "--out", "o", "--timeout", "abc"], exit: 2, stderr: "--timeout expects a number greater than 0 and at most 35791, got: abc\n" },
  { tool: "eval/run_case.mjs", args: ["--corpus", "c", "--site", "s", "--out", "o", "--protocol", "repo"], exit: 2, stderr: /^Usage: node eval\/run_case\.mjs --corpus <dir> / },
  { tool: "eval/run_case.mjs", args: ["--corpus", "c", "--site", "s", "--out", "o", "--protocol", "--smoke"], exit: 2, stderr: "--protocol needs a value\n" },
  { tool: "eval/site_search.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/site_search\.mjs "<query>" / },
  { tool: "eval/site_search.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/site_search\.mjs "<query>" / },
  { tool: "eval/site_search.mjs", args: ["--site", "nowhere", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/site_search.mjs", args: ["--site", "nowhere", "--", "--bogus"], exit: 2, stderr: /^missing .*search-data\.json\nRun build\.bat / },
  { tool: "eval/site_search.mjs", args: ["--help=1", "--site", "nowhere"], exit: 2, stderr: "--help takes no value\n" },
  { tool: "eval/site_search.mjs", args: ["--composition", "--site", "nowhere"], exit: 2, stderr: /^missing .*search-data\.json\nRun build\.bat / },
  { tool: "eval/site_search.mjs", args: ["--site"], exit: 2, stderr: "--site needs a value\n" },
  { tool: "eval/search_quality.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/search_quality\.mjs \[--site docs\/_site\] / },
  { tool: "eval/search_quality.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/search_quality.mjs", args: ["stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "eval/search_quality.mjs", args: ["--help", "--bogus"], exit: 0, stdout: /^Usage: node eval\/search_quality\.mjs \[--site docs\/_site\] / },
  { tool: "eval/search_quality.mjs", args: ["--help=1"], exit: 2, stderr: "--help takes no value\n" },
  { tool: "eval/search_quality.mjs", args: ["-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "eval/search_quality.mjs", args: ["--site", "nowhere"], exit: 2, stderr: /^missing .*search-data\.json\nRun build\.bat / },
  { tool: "eval/search_quality.mjs", args: ["--site", "nowhere", "--sample", "abc"], exit: 2, stderr: "--sample expects a whole number of at least 1, got: abc\n" },
  { tool: "eval/search_quality.mjs", args: ["--site", "--help"], exit: 2, stderr: "--site needs a value\n" },
  { tool: "eval/search_quality.mjs", args: ["--site"], exit: 2, stderr: "--site needs a value\n" },
  { tool: "eval/search_quality.mjs", args: ["--site", "nowhere", "--save"], exit: 2, stderr: "--save needs a value\n" },
  { tool: "eval/transcript.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node eval\/transcript\.mjs <case\.jsonl> / },
  { tool: "eval/transcript.mjs", args: ["-h"], exit: 0, stdout: /^Usage: node eval\/transcript\.mjs <case\.jsonl> / },
  { tool: "eval/transcript.mjs", args: [], exit: 2, stderr: /^Usage: node eval\/transcript\.mjs <case\.jsonl> / },
  { tool: "eval/transcript.mjs", args: ["nope.jsonl", "--help"], exit: 0, stdout: /^Usage: node eval\/transcript\.mjs <case\.jsonl> / },
  { tool: "eval/transcript.mjs", args: ["--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/transcript.mjs", args: ["--help=1"], exit: 2, stderr: "--help takes no value\n" },
  { tool: "eval/transcript.mjs", args: ["nope.jsonl"], exit: 2, stderr: /Error: ENOENT: no such file or directory, open '[^']*nope\.jsonl'\r?\n/ },
  { tool: "eval/transcript.mjs", args: ["--bogus", "nope.jsonl"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "eval/transcript.mjs", args: ["-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "eval/transcript.mjs", args: ["--", "-x"], exit: 2, stderr: /Error: ENOENT: no such file or directory, open '(?:[^']*[\\/])?-x'\r?\n/ },
  { tool: "eval/transcript.mjs", args: ["a.jsonl", "b.jsonl"], exit: 2, stderr: "unexpected argument: b.jsonl\n" },
  { tool: "wisdom/wisdom.mjs", args: [], exit: 2, stderr: /^Usage: node wisdom\/wisdom\.mjs <command> \[options\]\n/ },
  { tool: "wisdom/wisdom.mjs", args: ["--help"], exit: 0, stdout: /^Usage: node wisdom\/wisdom\.mjs <command> \[options\]\n/ },
  { tool: "wisdom/wisdom.mjs", args: ["bogus"], exit: 2, stderr: /^unknown command: bogus\nUsage: node wisdom\/wisdom\.mjs <command> \[options\]\n/ },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--guild", "--bogus"], exit: 2, stderr: "--guild needs a value\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--cap"], exit: 2, stderr: "--cap needs a value\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "stray"], exit: 2, stderr: "unexpected argument: stray\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--help"], exit: 0, stdout: /^Usage: node wisdom\/wisdom\.mjs <command> \[options\]\n/ },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--force=1"], exit: 2, stderr: "--force takes no value\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "wisdom/wisdom.mjs", args: ["bogus", "--guild", "x", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },

  // tbdocs, beyond the cases above. Every command-line
  // error exits 2. A value flag refuses a missing value and one that starts
  // with a dash, "--" included; an unknown option is refused as given, as is a
  // positional, and a boolean given a value. Each --port and --stall-timeout
  // is checked where it stands, so a bad one fails even when a later one is
  // good. A --dest the build refuses exits 2 too, after the command line has
  // been read. --baseurl takes an empty value, meaning the site root; the
  // other value flags refuse one.
  { tool: "builder/tbdocs.mjs", args: ["--src"], exit: 2, stderr: "--src needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--url"], exit: 2, stderr: "--url needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--check-findings"], exit: 2, stderr: "--check-findings needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--symbol-gaps", "--serve"], exit: 2, stderr: "--symbol-gaps needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--dest", "--"], exit: 2, stderr: "--dest needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout"], exit: 2, stderr: "--stall-timeout needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout", "-1"], exit: 2, stderr: "--stall-timeout needs a value\n" },
  { tool: "builder/tbdocs.mjs", args: ["foo"], exit: 2, stderr: "unexpected argument: foo\n" },
  { tool: "builder/tbdocs.mjs", args: ["-"], exit: 2, stderr: "unexpected argument: -\n" },
  { tool: "builder/tbdocs.mjs", args: ["-x"], exit: 2, stderr: "unknown option: -x\n" },
  { tool: "builder/tbdocs.mjs", args: ["-xy"], exit: 2, stderr: "unknown option: -xy\n" },
  { tool: "builder/tbdocs.mjs", args: ["-h"], exit: 0, stdout: /^usage: node builder\/tbdocs\.mjs \[options\]\n/ },
  { tool: "builder/tbdocs.mjs", args: ["--help"], exit: 0, stdout: /^usage: node builder\/tbdocs\.mjs \[options\]\n/ },
  { tool: "builder/tbdocs.mjs", args: ["--dry-run=1"], exit: 2, stderr: "--dry-run takes no value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--no-check=1"], exit: 2, stderr: "--no-check takes no value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--no-check", "--bogus"], exit: 2, stderr: "unknown option: --bogus\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port", "abc"], exit: 2, stderr: "--port expects a whole number from 1 to 65535, got: abc\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port="], exit: 2, stderr: "--port needs a non-empty value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout="], exit: 2, stderr: "--stall-timeout needs a non-empty value\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=65536"], exit: 2, stderr: "--port expects a whole number from 1 to 65535, got: 65536\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=1.5"], exit: 2, stderr: "--port expects a whole number from 1 to 65535, got: 1.5\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=80", "--port=0"], exit: 2, stderr: "--port expects a whole number from 1 to 65535, got: 0\n" },
  { tool: "builder/tbdocs.mjs", args: ["--port=abc", "--port=80"], exit: 2, stderr: "--port expects a whole number from 1 to 65535, got: abc\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout=-1"], exit: 2, stderr: "--stall-timeout expects a number of at least 0, got: -1\n" },
  { tool: "builder/tbdocs.mjs", args: ["--stall-timeout=abc"], exit: 2, stderr: "--stall-timeout expects a number of at least 0, got: abc\n" },
  { tool: "builder/tbdocs.mjs", args: ["--src", ".", "--dest", "."], exit: 2,
    stderr: /^refusing --dest (.+): it is or contains the source tree \1, which cleaning it would delete\n$/ },
  { tool: "builder/tbdocs.mjs", args: ["--src=.", "--dest=sub"], exit: 2,
    stderr: /^refusing --dest (.+)[\\/]sub: it is inside the source tree, so a build would read its output back as source, or serve would rebuild on its own writes\. Use a folder directly under \1 whose name starts with _site, _serve, _pdf, or one inside such a folder, or one outside \1\.\n$/ },
];

// Every tool prints its usage on stdout and exits 0 for
// --help and for -h, so each is a case, the two forms alike, unless the table
// above already holds it. The value is the start of the tool's text where that
// is not `usage: node <tool>`: an older text that opens otherwise, or one that
// names the tool without its folder.
// biome-ignore format: a table, one entry per line
const HELP_TOOLS = {
  "builder/tbdocs.mjs": null,
  "book/render-book.mjs": "usage: node render-book.mjs <input.html> ",
  "wisdom/wisdom.mjs": "Usage: node wisdom/wisdom.mjs <command> [options]\n",
  "eval/build_corpus.mjs": "Usage: node eval/build_corpus.mjs ",
  "eval/nav_hops.mjs": "Usage: node eval/nav_hops.mjs ",
  "eval/run_case.mjs": "Usage: node eval/run_case.mjs ",
  "eval/search_quality.mjs": "Usage: node eval/search_quality.mjs ",
  "eval/site_search.mjs": "Usage: node eval/site_search.mjs ",
  "eval/transcript.mjs": "Usage: node eval/transcript.mjs ",
  "scripts/addin_test.mjs": null,
  "scripts/ide_test.mjs": null,
  "scripts/bug_repro.mjs": null,
  "scripts/build_dot_metrics.mjs": null,
  "scripts/build_package_api.mjs": null,
  "scripts/census_attributes.mjs": null,
  "scripts/check_a11y.mjs": null,
  "scripts/check_a11y_fingerprint.mjs": null,
  "scripts/check_axe_patch_equiv.mjs": null,
  "scripts/check_attribute_sweep.mjs": null,
  "scripts/check_book_coverage.mjs": null,
  "scripts/check_ci_workflows.mjs": null,
  "scripts/check_cli.mjs": null,
  "scripts/check_code_regions.mjs": null,
  "scripts/check_dot_fit.mjs": null,
  "scripts/check_examples.mjs": null,
  "scripts/check_gate_lists.mjs": null,
  "scripts/check_impexp_parity.mjs": null,
  "scripts/check_links.mjs": "Usage: node check_links.mjs [options] <inputs...>\n",
  "scripts/check_links_diff.mjs": "Usage: node scripts/check_links_diff.mjs [options]\n",
  "scripts/check_lint.mjs": null,
  "scripts/check_page_baseline.mjs": null,
  "scripts/check_pdf_shims_equiv.mjs": null,
  "scripts/check_publish_policy.mjs": null,
  "scripts/check_regex_safety.mjs": null,
  "scripts/check_symbol_index.mjs": null,
  "scripts/check_tb_registry.mjs": null,
  "scripts/check_tree_fresh.mjs": null,
  "scripts/check_twin_parsers.mjs": null,
  "scripts/compare_trees.mjs": null,
  "scripts/convert_em_dash_separators.mjs": null,
  "scripts/crawl_check.mjs": null,
  "scripts/gen_attribute_probes.mjs": "Generate a twinBASIC probe project for Reference/Attributes.md applicability.\n",
  "scripts/impexp.mjs": "Usage:\n",
  "scripts/pick_a11y_sample.mjs": null,
  "scripts/survey_tooling.mjs": null,
  "scripts/sweep_a11y.mjs": null,
  "scripts/sweep_attributes.mjs": null,
  "scripts/tbbuild.mjs": null,
  "scripts/tbrun.mjs": null,
  "scripts/vb6run.mjs": null,
};
const literal = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
for (const [tool, start] of Object.entries(HELP_TOOLS)) {
  const opening = start ? literal(start) : `${literal(`usage: node ${tool}`)}[ \\n]`;
  for (const flag of ["--help", "-h"]) {
    if (CASES.some((c) => c.tool === tool && c.args.length === 1 && c.args[0] === flag)) continue;
    CASES.push({ tool, args: [flag], exit: 0, stdout: new RegExp(`^${opening}`) });
  }
  if (tool === "scripts/impexp.mjs") continue;
  CASES.find((c) => c.tool === tool && c.args.length === 1 && c.args[0] === "--help").exitCodes = true;
}

// Every tool refuses an unknown flag and an empty value at
// the parse, so each has a case for the first and, where it has a value
// option, for the second: `tool: [option, extras]`, the option given as
// `--option=`. Both exit 2, print the refusal on
// stderr and nothing on stdout. `prefix` is the text a tool puts before its
// message. `args` replaces `--bogus` where the tool must never get further than
// the parse: convert_em_dash_separators would rewrite docs/ but for --check, and
// wisdom needs a command that is not a real one. A case the table above already
// holds, the same tool with the same arguments, is not added again.
// biome-ignore format: a table, one entry per line
const REFUSALS = {
  "builder/tbdocs.mjs": ["src"],
  "book/render-book.mjs": ["output"],
  "wisdom/wisdom.mjs": ["guild", { args: ["bogus", "--bogus"], empty: ["bogus", "--guild="] }],
  "eval/build_corpus.mjs": ["dest"],
  "eval/nav_hops.mjs": ["from"],
  "eval/run_case.mjs": ["corpus"],
  "eval/search_quality.mjs": ["site"],
  "eval/site_search.mjs": ["site"],
  "eval/transcript.mjs": [null],
  "scripts/addin_test.mjs": ["ide"],
  "scripts/ide_test.mjs": ["ide"],
  "scripts/bug_repro.mjs": ["ide"],
  "scripts/build_dot_metrics.mjs": [null],
  "scripts/build_package_api.mjs": ["out"],
  "scripts/census_attributes.mjs": ["out"],
  "scripts/check_a11y.mjs": ["root-dir"],
  "scripts/check_a11y_fingerprint.mjs": ["pages"],
  "scripts/check_axe_patch_equiv.mjs": ["patch"],
  "scripts/check_attribute_sweep.mjs": [null],
  "scripts/check_book_coverage.mjs": [null],
  "scripts/check_ci_workflows.mjs": [null],
  "scripts/check_cli.mjs": [null],
  "scripts/check_code_regions.mjs": [null],
  "scripts/check_dot_fit.mjs": [null],
  "scripts/check_examples.mjs": ["only", { prefix: "check_examples: " }],
  "scripts/check_gate_lists.mjs": [null],
  "scripts/check_impexp_parity.mjs": [null],
  "scripts/check_links.mjs": ["root-dir", { prefix: "error: " }],
  "scripts/check_links_diff.mjs": ["a"],
  "scripts/check_lint.mjs": [null, { prefix: "check_lint: " }],
  "scripts/check_page_baseline.mjs": [null],
  "scripts/check_pdf_shims_equiv.mjs": [null],
  "scripts/check_publish_policy.mjs": ["src"],
  "scripts/check_regex_safety.mjs": [null],
  "scripts/check_symbol_index.mjs": [null],
  "scripts/check_tb_registry.mjs": [null],
  "scripts/check_tree_fresh.mjs": ["tree"],
  "scripts/check_twin_parsers.mjs": [null],
  "scripts/compare_trees.mjs": ["before", { prefix: "compare_trees: " }],
  "scripts/convert_em_dash_separators.mjs": [null, { args: ["--check", "--bogus"] }],
  "scripts/crawl_check.mjs": ["timeout"],
  "scripts/gen_attribute_probes.mjs": [null],
  "scripts/impexp.mjs": [null, { prefix: "ERROR: " }],
  "scripts/pick_a11y_sample.mjs": ["sweep"],
  "scripts/survey_tooling.mjs": ["root"],
  "scripts/sweep_a11y.mjs": ["out"],
  "scripts/sweep_attributes.mjs": ["out"],
  "scripts/tbbuild.mjs": ["ide"],
  "scripts/tbrun.mjs": ["ide"],
  "scripts/vb6run.mjs": ["vb6"],
};
// The cases whose folder must stay empty, as for a help request: a refusal
// starts no IDE or browser and writes nothing, and a tool that read the flag as
// a folder name would create one.
const LEAVES_EMPTY = new Set();
for (const tool of Object.keys(HELP_TOOLS)) {
  if (!(tool in REFUSALS)) throw new Error(`HELP_TOOLS names ${tool}, which REFUSALS does not`);
}
for (const [tool, [option, { exit = 2, prefix = "", args, empty } = {}]] of Object.entries(REFUSALS)) {
  if (!(tool in HELP_TOOLS)) throw new Error(`REFUSALS names ${tool}, which HELP_TOOLS does not`);
  const wanted = [
    { args: args ?? ["--bogus"], stderr: new RegExp(`^${literal(`${prefix}unknown option: --bogus\n`)}`) },
  ];
  if (option)
    wanted.push({
      args: empty ?? [`--${option}=`],
      stderr: new RegExp(`^${literal(`${prefix}--${option} needs a non-empty value\n`)}`),
    });
  for (const w of wanted) {
    const held = CASES.find(
      (c) => c.tool === tool && c.args.length === w.args.length && c.args.every((a, i) => a === w.args[i]),
    );
    if (held) LEAVES_EMPTY.add(held);
    else {
      const made = { tool, args: w.args, exit, stderr: w.stderr };
      CASES.push(made);
      LEAVES_EMPTY.add(made);
    }
  }
}

// A value a tool reads after the parse is checked straight after it: a number,
// a regular expression, a URL, a date, a choice, an option that excludes
// another. Each of these is refused before the tool starts anything, so the
// case leaves its folder empty. `bad` is the message; a tool that prints its
// usage after it is matched by the message and the opening of that usage. The
// value that shows each rule is the one given: a word, 0, a fraction, a value
// past the largest allowed, or `--x=-1`, the form that reaches the check (a
// separate -1 is refused by the parse as a missing value).
const BAD_VALUES = [];
const bad = (tool, args, stderr, exit = 2) => BAD_VALUES.push({ tool, args, exit, stderr });
// The message, then the opening of the tool's usage; `blank` when the tool puts
// an empty line between them.
const thenUsage = (message, tool, blank = false) =>
  new RegExp(`^${literal(message)}\\n${blank ? "\\n" : ""}usage: node ${literal(tool)} `);
const NOT_PORT = (v) => `--port expects a whole number from 1 to 65535, got: ${v}`;
const NOT_COUNT = (option, v) => `${option} expects a whole number of at least 1, got: ${v}`;
const NOT_WHOLE = (option, v) => `${option} expects a whole number of at least 0, got: ${v}`;
const NOT_ABOVE_ZERO = (option, v) => `${option} expects a number greater than 0, got: ${v}`;
const NOT_URL = (option, v) => `${option} expects an absolute http or https URL, got: ${v}`;
const START = "http://127.0.0.1:9/";
const REGEX_REASON = (option, v) =>
  new RegExp(`^${literal(`${option} expects a regular expression, got: ${v} (`)}.+\\)\\n$`);

// tbdocs prints the message alone, check_links after `error: `.
bad("builder/tbdocs.mjs", ["--url", "foo"], NOT_URL("--url", "foo") + "\n");
bad("builder/tbdocs.mjs", ["--url=mailto:x"], NOT_URL("--url", "mailto:x") + "\n");
bad("builder/tbdocs.mjs", ["--stall-timeout", "abc"], "--stall-timeout expects a number of at least 0, got: abc\n");
bad(
  "scripts/check_links.mjs",
  ["--offline", "--oracle", "x", "no-such-tree"],
  "error: --oracle expects fs or index, got: x\n",
);
bad("scripts/check_links.mjs", ["--offline", "--oracle=", "no-such-tree"], "error: --oracle needs a non-empty value\n");

// tbbuild and tbrun follow the message with their usage.
for (const [tool, first] of [
  ["scripts/tbbuild.mjs", "x.twinproj"],
  ["scripts/tbrun.mjs", "no-such-dir"],
]) {
  bad(tool, [first, "--port", "0"], thenUsage(NOT_PORT(0), tool));
  bad(tool, [first, "--port=65536"], thenUsage(NOT_PORT(65536), tool));
  bad(tool, [first, "--port", "abc"], thenUsage(NOT_PORT("abc"), tool));
  bad(tool, [first, "--timeout", "0"], thenUsage(NOT_ABOVE_ZERO("--timeout", 0), tool));
  bad(tool, [first, "--timeout=-1"], thenUsage(NOT_ABOVE_ZERO("--timeout", -1), tool));
  bad(tool, [first, "--arch", "WIN32"], thenUsage("--arch expects win32 or win64, got: WIN32", tool));
  bad(tool, [first, "--show", "--hide"], thenUsage("--show and --hide cannot be given together", tool));
}
bad("scripts/tbrun.mjs", ["no-such-dir", "--quiet=-1"], thenUsage(NOT_WHOLE("--quiet", -1), "scripts/tbrun.mjs"));
bad(
  "scripts/tbrun.mjs",
  ["no-such-dir", "--llvm", "--compiler-options", "+llvm"],
  thenUsage("--llvm and --compiler-options cannot be given together", "scripts/tbrun.mjs"),
);
bad(
  "scripts/tbrun.mjs",
  ["no-such-dir", "--compiler-options="],
  thenUsage("--compiler-options needs a non-empty value", "scripts/tbrun.mjs"),
);

// sweep_attributes reads its values before it looks for an IDE, and follows the
// message with its usage.
{
  const tool = "scripts/sweep_attributes.mjs";
  bad(tool, ["--jobs", "0"], thenUsage(NOT_COUNT("--jobs", 0), tool));
  bad(tool, ["--port", "0"], thenUsage(NOT_PORT(0), tool));
  bad(tool, ["--port=65536"], thenUsage(NOT_PORT(65536), tool));
  bad(tool, ["--port", "65535", "--jobs", "2"], thenUsage("--port 65535 with --jobs 2 runs past port 65535", tool));
  bad(tool, ["--batch-size", "3"], thenUsage("--batch-size expects a whole number of at least 4, got: 3", tool));
  bad(tool, ["--verify=-1"], thenUsage(NOT_WHOLE("--verify", -1), tool));
  bad(tool, ["--timeout", "0"], thenUsage(NOT_ABOVE_ZERO("--timeout", 0), tool));
  bad(tool, ["--forms", "some"], thenUsage("--forms expects bare, smart or all, got: some", tool));
  bad(tool, ["--sites", "NO_SUCH_SITE"], thenUsage("unknown site: NO_SUCH_SITE (--list-sites names them)", tool));
  // The drive root is outside the temp folder however the case is run; a relative name would resolve
  // under it, where the case runs.
  bad(tool, ["--work=/"], new RegExp(`^--work must be under .+, not .+\\nusage: node ${literal(tool)} `));
  bad(tool, ["--show", "--hide"], thenUsage("--show and --hide cannot be given together", tool));
}
bad("scripts/tbrun.mjs", ["no-such-dir", "--quiet", "1.5"], thenUsage(NOT_WHOLE("--quiet", 1.5), "scripts/tbrun.mjs"));

// bug_repro follows the message with its usage. It reads and checks its command
// line before it looks for a reproducer or an IDE, and the reproducers it is
// asked for here do not exist.
{
  const tool = "scripts/bug_repro.mjs";
  const slugMessage = (slug) =>
    `not a valid slug: ${slug} (lowercase letters and digits joined by single hyphens, such as my-bug)`;
  const FILED_MESSAGE = "not a valid slug: filed (it is the folder the filed reproducers are moved to)";
  bad(tool, ["frobnicate"], thenUsage("unknown command: frobnicate", tool));
  bad(tool, ["new"], thenUsage("new needs a slug", tool));
  bad(
    tool,
    ["new", "no-such-bug"],
    thenUsage(`new needs a slug and the entry's title, quoted: new <slug> "<title>"`, tool),
  );
  bad(tool, ["new", "Bad_Slug", "title"], thenUsage(slugMessage("Bad_Slug"), tool));
  bad(tool, ["new", "no-such-bug", " "], thenUsage("the entry's title is empty", tool));
  bad(
    tool,
    ["new", "no-such-bug", "title", "--template", "no-such-template"],
    thenUsage("--template expects console or webview2-form, got: no-such-template", tool),
  );
  bad(tool, ["pack", "no-such-bug", "--template", "console"], thenUsage("--template does not apply to pack", tool));
  bad(tool, ["pack", "-x"], thenUsage("unknown option: -x", tool));
  bad(tool, ["pack", "bad--slug"], thenUsage(slugMessage("bad--slug"), tool));
  bad(tool, ["compile"], thenUsage("compile needs a slug", tool));
  bad(tool, ["compile", "no-such-bug", "other"], thenUsage("unexpected argument: other", tool));
  bad(tool, ["compile", "no-such-bug", "--llvm"], thenUsage("--llvm does not apply to compile", tool));
  bad(tool, ["build", "no-such-bug", "--exe"], thenUsage("--exe does not apply to build", tool));
  bad(tool, ["pack", "no-such-bug", "--port", "9440"], thenUsage("--port does not apply to pack", tool));
  bad(tool, ["verify", "--keep"], thenUsage("--keep does not apply to verify", tool));
  bad(tool, ["verify", "--arch", "win32"], thenUsage("--arch does not apply to verify", tool));
  bad(tool, ["compile", "no-such-bug", "--port", "0"], thenUsage(NOT_PORT(0), tool));
  bad(tool, ["run", "no-such-bug", "--timeout", "0"], thenUsage(NOT_ABOVE_ZERO("--timeout", 0), tool));
  bad(tool, ["run", "no-such-bug", "--arch", "WIN32"], thenUsage("--arch expects win32 or win64, got: WIN32", tool));
  bad(tool, ["verify", "--jobs", "0"], thenUsage(NOT_COUNT("--jobs", 0), tool));
  bad(
    tool,
    ["verify", "--port", "65535", "--jobs", "2"],
    thenUsage("--port 65535 with --jobs 2 runs past port 65535", tool),
  );
  bad(
    tool,
    ["compile", "no-such-bug", "--show", "--hide"],
    thenUsage("--show and --hide cannot be given together", tool),
  );
  bad(tool, ["run", "no-such-bug"], "no such reproducer: bugs/no-such-bug (no src/Settings)\n");
  bad(tool, ["verify", "no-such-bug"], "no such reproducer: bugs/no-such-bug (no src/Settings and no repro.json)\n");
  // The VB6 side of a reproducer: `vb6` builds vb6/ and needs no IDE, and `new --with-vb6` makes it.
  // The refusals come before VB6 is looked for, so none of these needs VB6 or a vb6/ folder.
  bad(tool, ["vb6"], thenUsage("vb6 needs a slug", tool));
  bad(tool, ["vb6", "no-such-bug", "other"], thenUsage("unexpected argument: other", tool));
  bad(tool, ["vb6", "Bad_Slug"], thenUsage(slugMessage("Bad_Slug"), tool));
  bad(tool, ["vb6", "filed"], thenUsage(FILED_MESSAGE, tool));
  bad(tool, ["vb6", "no-such-bug", "--timeout", "0"], thenUsage(NOT_ABOVE_ZERO("--timeout", 0), tool));
  bad(tool, ["vb6", "no-such-bug", "--vb6="], thenUsage("--vb6 needs a non-empty value", tool));
  bad(tool, ["vb6", "no-such-bug", "--llvm"], thenUsage("--llvm does not apply to vb6", tool));
  bad(tool, ["vb6", "no-such-bug", "--ide", "x"], thenUsage("--ide does not apply to vb6", tool));
  bad(tool, ["vb6", "no-such-bug", "--show"], thenUsage("--show does not apply to vb6", tool));
  bad(tool, ["vb6", "no-such-bug", "--with-vb6"], thenUsage("--with-vb6 does not apply to vb6", tool));
  bad(tool, ["pack", "no-such-bug", "--vb6", "x"], thenUsage("--vb6 does not apply to pack", tool));
  bad(tool, ["run", "no-such-bug", "--vb6", "x"], thenUsage("--vb6 does not apply to run", tool));
  bad(tool, ["verify", "--vb6", "x"], thenUsage("--vb6 does not apply to verify", tool));
  bad(tool, ["pack", "no-such-bug", "--with-vb6"], thenUsage("--with-vb6 does not apply to pack", tool));
  bad(tool, ["new", "no-such-bug", "title", "--vb6", "x"], thenUsage("--vb6 does not apply to new", tool));
  bad(tool, ["vb6", "no-such-bug"], "no such reproducer: bugs/no-such-bug (no src/Settings and no repro.json)\n");
  // `file` moves things, so these are the refusals only: every one is decided from the
  // command line or from a reproducer that does not exist, before anything is read or written.
  const fileNeeds = "file needs a slug and an issue number: file <slug> <issue>";
  bad(tool, ["file"], thenUsage(fileNeeds, tool));
  bad(tool, ["file", "no-such-bug"], thenUsage(fileNeeds, tool));
  bad(
    tool,
    ["file", "no-such-bug", "x"],
    thenUsage("the issue number expects a whole number of at least 1, got: x", tool),
  );
  bad(
    tool,
    ["file", "no-such-bug", "0"],
    thenUsage("the issue number expects a whole number of at least 1, got: 0", tool),
  );
  bad(tool, ["file", "no-such-bug", "12", "13"], thenUsage("unexpected argument: 13", tool));
  bad(tool, ["file", "Bad_Slug", "12"], thenUsage(slugMessage("Bad_Slug"), tool));
  bad(tool, ["file", "filed", "12"], thenUsage(FILED_MESSAGE, tool));
  bad(tool, ["new", "filed", "title"], thenUsage(FILED_MESSAGE, tool));
  bad(tool, ["verify", "filed"], thenUsage(FILED_MESSAGE, tool));
  bad(tool, ["file", "--marked", "no-such-bug"], thenUsage("--marked takes no slug or issue", tool));
  bad(
    tool,
    ["file", "--marked", "--existing"],
    thenUsage("--existing does not apply with --marked: an entry's mark says it", tool),
  );
  bad(tool, ["file", "no-such-bug", "12", "--port", "9440"], thenUsage("--port does not apply to file", tool));
  bad(tool, ["compile", "no-such-bug", "--marked"], thenUsage("--marked does not apply to compile", tool));
  bad(tool, ["verify", "--existing"], thenUsage("--existing does not apply to verify", tool));
  bad(tool, ["file", "no-such-bug", "12"], "no such reproducer: bugs/no-such-bug\n");
}

// vb6run reads its command line before it reads its file or looks for VB6, and
// follows the message with its usage.
{
  const tool = "scripts/vb6run.mjs";
  const NOT_SECONDS = (v) => `--timeout expects a number greater than 0 and at most 2147483, got: ${v}`;
  bad(tool, ["x.bas", "--timeout", "0"], thenUsage(NOT_SECONDS(0), tool));
  bad(tool, ["x.bas", "--timeout=-1"], thenUsage(NOT_SECONDS(-1), tool));
  bad(tool, ["x.bas", "--timeout", "abc"], thenUsage(NOT_SECONDS("abc"), tool));
  bad(tool, ["x.bas", "--only", "x"], thenUsage("--only applies to --docs", tool));
  bad(tool, ["--docs", "--only="], thenUsage("--only needs a non-empty value", tool));
  bad(
    tool,
    ["--docs", "--only", "("],
    new RegExp(`^${literal("--only expects a regular expression, got: ( (")}.+\\)\\nusage: node ${literal(tool)} `),
  );
  bad(tool, ["x.bas", "y.bas"], thenUsage("unexpected argument: y.bas", tool));
}

bad("scripts/addin_test.mjs", ["--only", "("], REGEX_REASON("--only", "("));
bad("scripts/addin_test.mjs", ["--port", "0"], NOT_PORT(0) + "\n");
bad("scripts/addin_test.mjs", ["--port=1.5"], NOT_PORT(1.5) + "\n");
bad("scripts/addin_test.mjs", ["--jobs", "0"], NOT_COUNT("--jobs", 0) + "\n");
bad("scripts/addin_test.mjs", ["--jobs=1.5"], NOT_COUNT("--jobs", 1.5) + "\n");
bad(
  "scripts/addin_test.mjs",
  ["--timeout", "0"],
  "--timeout expects a number greater than 0 and at most 2147483, got: 0\n",
);
bad(
  "scripts/addin_test.mjs",
  ["--timeout", "2147484"],
  "--timeout expects a number greater than 0 and at most 2147483, got: 2147484\n",
);
bad("scripts/addin_test.mjs", ["--show", "--hide"], "--show and --hide cannot be given together\n");

bad("scripts/ide_test.mjs", ["--only", "("], REGEX_REASON("--only", "("));
bad("scripts/ide_test.mjs", ["--port", "0"], NOT_PORT(0) + "\n");
bad("scripts/ide_test.mjs", ["--port=1.5"], NOT_PORT(1.5) + "\n");
bad("scripts/ide_test.mjs", ["--jobs", "0"], NOT_COUNT("--jobs", 0) + "\n");
bad("scripts/ide_test.mjs", ["--jobs=1.5"], NOT_COUNT("--jobs", 1.5) + "\n");
bad(
  "scripts/ide_test.mjs",
  ["--timeout", "0"],
  "--timeout expects a number greater than 0 and at most 2147483, got: 0\n",
);
bad(
  "scripts/ide_test.mjs",
  ["--timeout", "2147484"],
  "--timeout expects a number greater than 0 and at most 2147483, got: 2147484\n",
);
bad("scripts/ide_test.mjs", ["--show", "--hide"], "--show and --hide cannot be given together\n");

// check_examples prints "check_examples: " before the message.
{
  const tool = "scripts/check_examples.mjs";
  const say = (message) => `check_examples: ${message}\n`;
  bad(tool, ["--jobs", "abc"], say(NOT_COUNT("--jobs", "abc")));
  bad(tool, ["--batch", "0"], say(NOT_COUNT("--batch", 0)));
  bad(tool, ["--port", "0"], say(NOT_PORT(0)));
  bad(tool, ["--port=65536"], say(NOT_PORT(65536)));
  bad(
    tool,
    ["--only", "("],
    new RegExp(`^check_examples: ${literal("--only expects a regular expression, got: ( (")}.+\\)\\n$`),
  );
  bad(tool, ["--apply"], say("--apply needs --propose"));
  bad(tool, ["--apply", "--census"], say("--apply needs --propose"));
  bad(tool, ["--census", "--propose"], say("--census and --propose cannot be given together"));
  bad(tool, ["--report", "survey.json", "--census"], say("--report and --census cannot be given together"));
  bad(
    tool,
    ["--report", "survey.json", "--census", "--propose"],
    say("--report, --census and --propose cannot be given together"),
  );
  bad(tool, ["--show", "--hide"], say("--show and --hide cannot be given together"));
}

bad(
  "scripts/survey_tooling.mjs",
  ["--window", "abc"],
  thenUsage(NOT_COUNT("--window", "abc"), "scripts/survey_tooling.mjs"),
);
bad("scripts/survey_tooling.mjs", ["--top=-1"], thenUsage(NOT_COUNT("--top", -1), "scripts/survey_tooling.mjs"));
bad(
  "scripts/compare_trees.mjs",
  ["--max=-1"],
  thenUsage(`compare_trees: ${NOT_WHOLE("--max", -1)}`, "scripts/compare_trees.mjs", true),
);
bad(
  "scripts/compare_trees.mjs",
  ["--max", "abc"],
  thenUsage(`compare_trees: ${NOT_WHOLE("--max", "abc")}`, "scripts/compare_trees.mjs", true),
);

{
  const tool = "scripts/crawl_check.mjs";
  bad(tool, ["--concurrency", "0", START], thenUsage(NOT_COUNT("--concurrency", 0), tool));
  bad(tool, ["--concurrency=1.5", START], thenUsage(NOT_COUNT("--concurrency", 1.5), tool));
  bad(
    tool,
    ["--timeout", "0", START],
    thenUsage("--timeout expects a whole number from 1 to 2147483647, got: 0", tool),
  );
  bad(
    tool,
    ["--timeout", "2147483648", START],
    thenUsage("--timeout expects a whole number from 1 to 2147483647, got: 2147483648", tool),
  );
  bad(
    tool,
    ["--timeout", "abc", START],
    thenUsage("--timeout expects a whole number from 1 to 2147483647, got: abc", tool),
  );
  bad(tool, ["foo"], thenUsage(NOT_URL("<start-url>", "foo"), tool));
  bad(tool, ["mailto:x"], thenUsage(NOT_URL("<start-url>", "mailto:x"), tool));
}

bad("scripts/sweep_a11y.mjs", ["--limit", "0"], NOT_COUNT("--limit", 0) + "\n");
bad("scripts/sweep_a11y.mjs", ["--limit=1.5"], NOT_COUNT("--limit", 1.5) + "\n");
bad("scripts/sweep_a11y.mjs", ["--recycle-every", "0"], NOT_COUNT("--recycle-every", 0) + "\n");
bad("scripts/sweep_a11y.mjs", ["--recycle-every", "abc"], NOT_COUNT("--recycle-every", "abc") + "\n");
bad("scripts/pick_a11y_sample.mjs", ["--budget", "0"], NOT_ABOVE_ZERO("--budget", 0) + "\n");
bad("scripts/pick_a11y_sample.mjs", ["--budget=-1"], NOT_ABOVE_ZERO("--budget", -1) + "\n");
bad("scripts/pick_a11y_sample.mjs", ["--check", "--propose"], "--check and --propose cannot be given together\n");
bad("scripts/pick_a11y_sample.mjs", ["--propose", "--census"], "--propose and --census cannot be given together\n");
bad(
  "scripts/pick_a11y_sample.mjs",
  ["--check", "--propose", "--census"],
  "--check, --propose and --census cannot be given together\n",
);
bad("scripts/check_a11y_fingerprint.mjs", ["--baseline", "nope"], /^--baseline expects production, .+, got: nope\n$/);
bad("scripts/check_a11y_fingerprint.mjs", ["--candidate", "nope"], /^--candidate expects production, .+, got: nope\n$/);
bad("scripts/check_a11y_fingerprint.mjs", ["--patches", "nope"], /^--patches expects .+, got: nope\n$/);
bad("scripts/check_a11y_fingerprint.mjs", ["--patches=plain-color-fields,nope"], /^--patches expects .+, got: nope\n$/);
bad("scripts/check_axe_patch_equiv.mjs", ["--patch", "nope"], /^--patch expects .+, got: nope\n$/);
bad("scripts/check_links_diff.mjs", ["--max-lines", "abc"], NOT_WHOLE("--max-lines", "abc") + "\n");
bad("scripts/check_links_diff.mjs", ["--max-lines=-1"], NOT_WHOLE("--max-lines", -1) + "\n");
bad("scripts/check_links_diff.mjs", ["--max-lines=1.5"], NOT_WHOLE("--max-lines", 1.5) + "\n");

const NOT_MS = (v) => `--timeout expects a whole number from 0 to 2147483647, got: ${v}\n`;
bad("book/render-book.mjs", ["a.html", "-o", "out.pdf", "--timeout=-1"], NOT_MS(-1));
bad("book/render-book.mjs", ["a.html", "-o", "out.pdf", "-t", "1.5"], NOT_MS(1.5));
bad("book/render-book.mjs", ["a.html", "-o", "out.pdf", "-t", "2147483648"], NOT_MS(2147483648));

bad("eval/run_case.mjs", ["--timeout", "0"], "--timeout expects a number greater than 0 and at most 35791, got: 0\n");
bad(
  "eval/run_case.mjs",
  ["--timeout", "35792"],
  "--timeout expects a number greater than 0 and at most 35791, got: 35792\n",
);
bad("eval/run_case.mjs", ["--protocol", "x"], "--protocol expects repo or site, got: x\n");
bad("eval/search_quality.mjs", ["--sample", "0"], NOT_COUNT("--sample", 0) + "\n");
bad("eval/search_quality.mjs", ["--worst=-1"], NOT_WHOLE("--worst", -1) + "\n");
bad("eval/search_quality.mjs", ["--worst", "abc"], NOT_WHOLE("--worst", "abc") + "\n");
bad("eval/search_quality.mjs", ["--failures=1.5"], NOT_WHOLE("--failures", 1.5) + "\n");
bad("eval/site_search.mjs", ["--n", "0", "term"], NOT_COUNT("--n", 0) + "\n");
bad("eval/site_search.mjs", ["--n=1.5", "term"], NOT_COUNT("--n", 1.5) + "\n");
bad("eval/site_search.mjs", ["--composition", "term"], "--composition takes no search terms\n");
bad("eval/nav_hops.mjs", ["("], REGEX_REASON("<url-regex>", "("));
bad("eval/nav_hops.mjs", ["Reference", "[a-"], REGEX_REASON("<url-regex>", "[a-"));

// build_corpus empties its --dest before it writes, so it refuses one that is or
// contains the repository root, the folder it runs from or --repo, checked in
// that order. Every one of these stops at the command line. Each --dest is a
// folder that must never be emptied.
{
  const tool = "eval/build_corpus.mjs";
  const refuse = (dest, what) =>
    new RegExp(`^refusing --dest ${dest}: it is or contains ${what}, which cleaning it would delete\\n$`);
  const docs = path.join(REPO_ROOT, "docs");
  bad(tool, ["--dest", REPO_ROOT], refuse(literal(REPO_ROOT), "the repository root"));
  bad(tool, ["--dest", path.dirname(REPO_ROOT)], refuse(literal(path.dirname(REPO_ROOT)), "the repository root"));
  bad(tool, ["--dest", "."], refuse(".+", "the current folder"));
  bad(tool, ["--dest", ".."], refuse(".+", "the current folder"));
  bad(
    tool,
    ["--repo", path.join(docs, "Reference"), "--dest", docs],
    refuse(literal(docs), literal(`--repo ${path.join(docs, "Reference")}`)),
  );
  bad(tool, ["--repo", docs, "--dest", docs], refuse(literal(docs), literal(`--repo ${docs}`)));
}

// wisdom's command in these is never a real one, so that none can start an
// export, except extract, whose modes are refused before it reads a thing.
{
  const tool = "wisdom/wisdom.mjs";
  const since = (v) => `--since expects an ISO 8601 date (YYYY-MM-DD) no earlier than 2015-01-01, got: ${v}\n`;
  bad(tool, ["bogus", "--concurrency", "0"], NOT_COUNT("--concurrency", 0) + "\n");
  bad(tool, ["bogus", "--concurrency=1.5"], NOT_COUNT("--concurrency", 1.5) + "\n");
  bad(tool, ["bogus", "--cap=-1"], NOT_COUNT("--cap", -1) + "\n");
  bad(tool, ["bogus", "--cap", "abc"], NOT_COUNT("--cap", "abc") + "\n");
  bad(tool, ["bogus", "--rate-limit", "0"], NOT_ABOVE_ZERO("--rate-limit", 0) + "\n");
  bad(tool, ["bogus", "--rate-limit", "abc"], NOT_ABOVE_ZERO("--rate-limit", "abc") + "\n");
  bad(tool, ["bogus", "--since", "12"], since("12"));
  bad(tool, ["bogus", "--since", "2024-02-30"], since("2024-02-30"));
  bad(tool, ["bogus", "--since", "2014-12-31"], since("2014-12-31"));
  bad(tool, ["bogus", "--min-confidence", "x"], "--min-confidence expects high, medium or low, got: x\n");
  bad(tool, ["extract", "--all", "--force"], "--all and --force cannot be given together\n");
  bad(tool, ["extract", "--since", "2024-01-01", "--force"], "--since and --force cannot be given together\n");
  bad(
    tool,
    ["extract", "--since", "2024-01-01", "--all", "--force"],
    "--since, --all and --force cannot be given together\n",
  );
}
for (const made of BAD_VALUES) {
  CASES.push(made);
  LEAVES_EMPTY.add(made);
}

export { CASES, LEAVES_EMPTY };
