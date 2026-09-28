// tbdocs's command line: the option table, the defaults, and the parse.
//
// parseCommandLine(argv) returns the options runBuild() and runServe() read,
// or throws a CliError whose message is what tbdocs prints before it exits 4.
// The table is lib/cli.mjs's strict one: an unknown option, a positional, a
// boolean given a value and a value flag given none (or one that starts with
// a dash) are all refused. Flags are then applied in the order they were
// given, because --no-check undoes the check flags before it and not the
// ones after.

import { CliError, numberOption, parseCli } from "../lib/cli.mjs";

export const OPTIONS = {
  src: { type: "string" },
  dest: { type: "string" },
  baseurl: { type: "string" },
  url: { type: "string" },
  "dry-run": { type: "boolean" },
  "no-offline": { type: "boolean" },
  "no-pdf": { type: "boolean" },
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
};

// fetchAssets is left out: absent, the build downloads unless $CI is set.
export const DEFAULTS = Object.freeze({
  src: "docs",
  dest: null,
  baseurl: null,
  url: null,
  dryRun: false,
  skipOffline: null,
  skipPdf: null,
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

// A value flag's own complaint names the flag; every other refusal names the
// argument as it was given, `-xy` and `--dry-run=1` whole.
function parse(argv) {
  try {
    return parseCli(argv, { options: OPTIONS });
  } catch (err) {
    if (!(err instanceof CliError) || err.code === "missing-value") throw err;
    throw new CliError(err.code, `Unknown argument: ${err.arg}`, { arg: err.arg });
  }
}

export function parseCommandLine(argv) {
  const args = { ...DEFAULTS };
  for (const t of parse(argv).tokens) {
    if (t.kind !== "option") continue;
    switch (t.key) {
      case "src": args.src = t.value; break;
      case "dest": args.dest = t.value; break;
      case "baseurl": args.baseurl = t.value; break;
      case "url": args.url = t.value; break;
      case "dryRun": args.dryRun = true; break;
      case "noOffline": args.skipOffline = true; break;
      case "noPdf": args.skipPdf = true; break;
      case "tolerateMissingImages": args.tolerateMissingImages = true; break;
      case "fetchAssets": args.fetchAssets = true; break;
      case "noFetchAssets": args.fetchAssets = false; break;
      case "profileOffline": args.profileOffline = true; break;
      case "check": args.check = true; break;
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
      case "serve": args.serve = true; break;
      case "port":
        args.port = numberOption(t.value, {
          option: "--port", integer: true, min: 1, max: 65535,
          message: (raw) => `--port expects a port number from 1 to 65535, got: ${raw}`,
        });
        break;
      case "stallTimeout": {
        // Not numberOption, which refuses blank: --stall-timeout= is 0.
        const secs = Number(t.value);
        if (!Number.isFinite(secs) || secs < 0) {
          throw new CliError("bad-number", `--stall-timeout expects seconds (0 disables), got: ${t.value}`,
            { option: "--stall-timeout", value: t.value });
        }
        args.stallTimeoutMs = secs * 1000;
        break;
      }
    }
  }
  return args;
}
