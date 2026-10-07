// tbdocs's command line: the option table, the defaults, and the parse.
//
// parseCommandLine(argv) returns the options runBuild() and runServe() read,
// or throws a CliError whose message is what tbdocs prints before it exits 2.
// The table is lib/cli.mjs's strict one: an unknown option, a positional, a
// boolean given a value, a value flag given none (or one that starts with a
// dash) and an empty value, except --baseurl's, are all refused. Flags are
// then applied in the order they were given, because --no-check undoes the
// check flags before it and not the ones after. -h and --help end the parse
// where they stand: nothing after them is read, and the options returned say
// only `help`.

import { numberOption, parseCli, urlOption } from "../lib/cli.mjs";

export const OPTIONS = {
  src: { type: "string" },
  dest: { type: "string" },
  baseurl: { type: "string", empty: true },
  url: { type: "string" },
  "dry-run": { type: "boolean" },
  "no-offline": { type: "boolean" },
  "no-pdf": { type: "boolean" },
  "no-help-archive": { type: "boolean" },
  "tolerate-missing-images": { type: "boolean" },
  "fetch-assets": { type: "boolean" },
  "no-fetch-assets": { type: "boolean" },
  "profile-offline": { type: "boolean" },
  check: { type: "boolean" },
  "no-check": { type: "boolean" },
  "check-audit-index": { type: "boolean" },
  "check-findings": { type: "string" },
  "update-page-baseline": { type: "boolean" },
  "update-symbol-baseline": { type: "boolean" },
  "symbol-gaps": { type: "string" },
  serve: { type: "boolean" },
  port: { type: "string" },
  "stall-timeout": { type: "string" },
  help: { type: "boolean", short: "h" },
};

// What -h and --help print. The flags are listed in the order of OPTIONS.
export const USAGE = `usage: node builder/tbdocs.mjs [options]

Builds the documentation site into three trees: the online copy, a file://
browsable copy and the source of the PDF book. Flags are read in the order
given, and a flag that takes a value takes it as the next argument or as
--flag=value.

  --src <path>                 source root (default docs)
  --dest <path>                online-tree destination (default <src>/_site, or
                               <src>/_serve with --serve); the offline tree is
                               <dest>-offline, the PDF tree <dest>-pdf
  --baseurl <prefix>           override _config.yml's baseurl; an empty value is the
                               site root
  --url <origin>               override _config.yml's url
  --dry-run                    build without writing the trees; the check does not
                               run, and a baseline update still writes its file
  --no-offline                 skip the offline tree
  --no-pdf                     skip the PDF tree
  --no-help-archive            do not write the IDE help add-in's archive of the
                               offline tree, add-in/Resources/HELP/site.zip, which
                               a build of the documentation writes as its last step
  --tolerate-missing-images    downgrade a missing book image from an error to a warning
  --fetch-assets               download missing remote assets, even when $CI is set
  --no-fetch-assets            never download; a missing remote asset is an error
  --profile-offline            print per-substep timing for the offline tree
  --check                      run the link and integrity check over the built HTML
  --no-check                   turn off the check flags given before it
  --check-audit-index          implies --check; also diff the derived tree index
                               against the files written
  --check-findings <path>      implies --check; write the findings to a JSON file
  --update-page-baseline       record this build's page and static-file counts as
                               the new baseline
  --update-symbol-baseline     record this build's symbol-index URLs as the new baseline
  --symbol-gaps <path>         write the public symbols no page documents to a JSON file
  --serve                      start the dev server: watch, rebuild, live-reload
  --port <N>                   port for --serve (default 4000)
  --stall-timeout <seconds>    give up when no task completes for this long
                               (default 120; 0 disables)
  -h, --help                   print this text and exit

Exit codes:
  0  nothing to report; with --serve, the server was stopped with Ctrl+C
  1  the build or its check found a problem: a link or integrity failure, a failed
     build step, a fall in the page count, or a symbol-index URL lost
  2  a refused command line (a --dest the build refuses included), a build stopped by
     the stall watchdog, with --serve a failed first build or a port in use, or a crash`;

// fetchAssets is left out: absent, the build downloads unless $CI is set.
export const DEFAULTS = Object.freeze({
  src: "docs",
  dest: null,
  baseurl: null,
  url: null,
  dryRun: false,
  skipOffline: null,
  skipPdf: null,
  skipHelpArchive: false,
  tolerateMissingImages: false,
  profileOffline: false,
  check: false,
  auditIndex: false,
  updatePageBaseline: false,
  updateSymbolBaseline: false,
  symbolGaps: null,
  checkFindings: null,
  serve: false,
  port: 4000,
  // Wall-clock with no task completing before the build gives up and
  // reports what was outstanding. Generous on purpose: the longest
  // single task here is worker cold boot at ~1.6 s, and a loaded CI
  // box is allowed to be an order of magnitude slower than that
  // without being called stalled. 0 disables the watchdog.
  stallTimeoutMs: 120000,
});

export function parseCommandLine(argv) {
  const args = { ...DEFAULTS };
  const cli = parseCli(argv, { options: OPTIONS, stopAt: ["help"] });
  // -h and --help are answered before any value is read, so a bad --port
  // before one does not stop it. `help` is present only then, which keeps the
  // options of every other command line equal to DEFAULTS.
  if (cli.stopped === "help") return { ...args, help: true };
  for (const t of cli.tokens) {
    if (t.kind !== "option") continue;
    switch (t.key) {
      case "src":
        args.src = t.value;
        break;
      case "dest":
        args.dest = t.value;
        break;
      case "baseurl":
        args.baseurl = t.value;
        break;
      case "url":
        urlOption(t.value, { option: "--url" });
        args.url = t.value;
        break;
      case "dryRun":
        args.dryRun = true;
        break;
      case "noOffline":
        args.skipOffline = true;
        break;
      case "noPdf":
        args.skipPdf = true;
        break;
      case "noHelpArchive":
        args.skipHelpArchive = true;
        break;
      case "tolerateMissingImages":
        args.tolerateMissingImages = true;
        break;
      case "fetchAssets":
        args.fetchAssets = true;
        break;
      case "noFetchAssets":
        args.fetchAssets = false;
        break;
      case "profileOffline":
        args.profileOffline = true;
        break;
      case "check":
        args.check = true;
        break;
      case "noCheck":
        // build.bat bakes in --check; this is how to ask for a plain build
        // without editing it. A later --check flag turns it back on.
        args.check = false;
        args.auditIndex = false;
        args.checkFindings = null;
        break;
      case "checkAuditIndex":
        args.check = true;
        args.auditIndex = true;
        break;
      case "checkFindings":
        args.check = true;
        args.checkFindings = t.value;
        break;
      case "updatePageBaseline":
        // Record the current inventory as the drift guard's new baseline,
        // whichever direction it moved. The build only ever raises it on its
        // own; lowering it is a deliberate act, so it takes a deliberate flag.
        args.updatePageBaseline = true;
        break;
      case "updateSymbolBaseline":
        // The same for the URLs tB/symbols.json has published: record the
        // current list whatever left it. See symbol-baseline.mjs.
        args.updateSymbolBaseline = true;
        break;
      case "symbolGaps":
        // Write the public symbols no page documents, as JSON, to a file.
        args.symbolGaps = t.value;
        break;
      case "serve":
        args.serve = true;
        break;
      case "port":
        args.port = numberOption(t.value, { option: "--port", integer: true, min: 1, max: 65535 });
        break;
      case "stallTimeout":
        // Seconds, fractions included; 0 disables the watchdog.
        args.stallTimeoutMs = numberOption(t.value, { option: "--stall-timeout", min: 0 }) * 1000;
        break;
    }
  }
  return args;
}
