// The logic of scripts/sweep_attributes.mjs that needs no IDE: what a probe is,
// what the compiler's rows say about it, how probes are batched, and how the
// answers are laid against Attributes.md.
//
// It is here, and not in the tool, so that scripts/check_attribute_sweep.mjs can
// probe it with fixed inputs. The tool reads its command line and starts IDEs
// as it loads; none of this does either, and none of it holds state of its own:
// what a function needs -- the control's signatures, the batch size, the
// outcomes -- is passed in.

import { parseTargets } from "./attributes-doc.mjs";
import { FIXED_ARGS, GUID_ATTRS, NOT_FAITHFULLY_PROBEABLE, UNSYNTHESISABLE, pad } from "./attribute-probe-kit.mjs";
import { FAMILIES, OPTIONAL_SITES, attributeLine } from "./attribute-sites.mjs";
import { escapeRegExp } from "../../builder/escape.mjs";

// ----------------------------------------------------------------- canaries
export const CONTROL_NAME = "ZzNoSuchAttributeProbe";

// What each canary MUST draw, fixed here rather than read from a build (see 3 in
// sweep_attributes.mjs's header). `unknown` is what an invented name draws;
// recorded from BETA 983 (WIP.Harness.md) and re-checked by the canary-only build
// before every run.
export const CANARY_SPECS = [
  ["clean", "MODULE", '[Description("canary")]'],
  ["context", "COCLASS_INTERFACE", "[Hidden]"],
  ["unknown", "MODULE", `[${CONTROL_NAME}]`],
];
export const EXPECTED_CANARIES = { clean: "ACCEPT", context: "REJECT_CONTEXT", unknown: "REJECT_SYNTAX" };
export const canaryOk = (c) => Object.keys(EXPECTED_CANARIES).every((k) => c[k] === EXPECTED_CANARIES[k]);

// ------------------------------------------------------------- the token table
/**
 * The compiler's token table: one long pipe-separated string in the compiler
 * binary, holding keywords, attributes and object members together. A name in it
 * is a name the compiler KNOWS, not one it accepts as an attribute -- `Debug`
 * and `ExecuteHostCommand` are in it, and neither is one -- so these are
 * candidates, and a candidate is called an attribute only if some site accepts it.
 *
 * @param {string} s  the compiler binary read as latin1 text
 * @returns {{tokens: string[], why: string | null}}
 */
export function parseTokenRun(s) {
  const anchor = s.indexOf("|DllExport|");
  if (anchor < 0) return { tokens: [], why: "the token table's `|DllExport|` anchor is not in the compiler" };
  const ok = /[A-Za-z0-9_|]/;
  let a = anchor;
  let b = anchor;
  while (a > 0 && ok.test(s[a - 1])) a--;
  while (b < s.length && ok.test(s[b])) b++;
  const tokens = s
    .slice(a, b)
    .split("|")
    .filter((t) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(t));
  return { tokens: [...new Set(tokens)], why: null };
}

// ------------------------------------------------------------------- forms
// A form is an argument shape. The documented attributes get every shape,
// because they are also the validation set: whether a shape can change the
// answer about PLACEMENT is read off them (see `formDependence`), which is what
// lets a token-table name be tried bare first without assuming it cannot.
const BOOL_FORMS = [
  ["true", "(True)"],
  ["false", "(False)"],
];
const GUESS_FORMS = [
  ["str", '("probe")'],
  ["int", "(1)"],
];
export const EXTRA_FORMS = [...BOOL_FORMS, ...GUESS_FORMS].map(([k]) => k);

// The compiler allows these once per project (TB5114 on a second), so a batch
// holds one probe of each. PopulateFrom fills an enum with the same two members
// every time, and enum members are project-global, so only its working form
// is held to one.
export const SINGLETON_NAMES = new Set(["RunAfterBuild", "RunBeforeStartupObject"]);
export const singletonKey = (p) => {
  if (p.name === null) return null;
  if (SINGLETON_NAMES.has(p.name)) return p.name;
  if (p.name === "PopulateFrom" && p.form === "fixed") return p.name;
  return null;
};

/** The fixed argument text for names whose shape is known and non-trivial. */
export function fixedArgs(name, id) {
  if (GUID_ATTRS.has(name)) return `("00000000-0000-0000-0000-${pad(id, 12)}")`;
  if (name === "TypeHint") return "(SweepHintEnum)";
  if (Object.hasOwn(FIXED_ARGS, name)) return FIXED_ARGS[name];
  return null;
}
export const hasFixed = (name) => GUID_ATTRS.has(name) || name === "TypeHint" || Object.hasOwn(FIXED_ARGS, name);

/**
 * The form keys tried for a name in stage 1. A shape known to be required is
 * tried in every mode.
 *
 * @param {{name: string, doc: object | null}} u  a name of the universe
 * @param {"bare" | "smart" | "all"} mode
 */
export function stage1Forms(u, mode) {
  const keys = ["bare"];
  if (hasFixed(u.name)) keys.push("fixed");
  if (mode !== "bare" && (u.doc || mode === "all")) keys.push(...EXTRA_FORMS);
  // One probe per batch means one batch per probe, so a singleton attribute
  // gets two shapes, not six.
  return SINGLETON_NAMES.has(u.name) ? keys.filter((k) => k === "bare" || k === "true") : keys;
}
/** The forms a token-table name gets once some site has recognised it. */
export const stage2Forms = (u) =>
  SINGLETON_NAMES.has(u.name) ? ["true"] : [...(hasFixed(u.name) ? ["fixed"] : []), ...EXTRA_FORMS];

/** The argument text of a form (`""`, `"(True)"`, ...); null for a `fixed` form with no known shape. */
export function argsOf(key, name, id) {
  if (key === "bare") return "";
  if (key === "fixed") return fixedArgs(name, id);
  return [...BOOL_FORMS, ...GUESS_FORMS].find(([k]) => k === key)[1];
}

// ------------------------------------------------------------ classification
/**
 * The compiler's own words for what happened to one probe. An answer is decided
 * from the ERROR rows of the probe's own file, because a probe file holds one
 * attribute and (once the baseline is clean) nothing else that can fail.
 *
 *   ACCEPT          no error at all
 *   ACCEPT_LATER    an error that can only come after the attribute was placed:
 *                   TB5114 (a second [RunAfterBuild]), TB5247 (a form designer
 *                   lookup)
 *   RECOGNISED      an error on the attribute's line that is neither refusal and
 *                   not what the control draws -- the name and place were taken
 *                   and something about its argument was not; or an error row
 *                   in no probe's file that this probe alone provokes
 *   ACCEPT_ERR      an error elsewhere in the file: the attribute took and
 *                   changed what the declaration means, or the error is the
 *                   declaration's own
 *   REJECT_CONTEXT  TB5155, "not supported in this context"
 *   REJECT_SYNTAX   TB5182, "no handler for this symbol", or whatever the
 *                   control draws at this site
 *   CRASH / HUNG    the compiler died or never settled on this probe
 *   HARNESS         the build could not be run at all
 *   INTERFERES      this probe alone changes what the canaries draw
 *
 * Only ACCEPT and ACCEPT_LATER count as accepted. The other two "took" states
 * are shown, and are enough to call a name recognised, but a documented target
 * is not called true on them.
 */
const ACCEPT_LATER_CODES = new Set(["TB5114", "TB5247"]);
export const RANK = {
  ACCEPT: 0,
  ACCEPT_LATER: 1,
  ACCEPT_ERR: 2,
  RECOGNISED: 3,
  REJECT_CONTEXT: 4,
  REJECT_SYNTAX: 5,
  CRASH: 6,
  HUNG: 7,
  HARNESS: 8,
  INTERFERES: 9,
  VOID: 10,
};
export const codeOf = (msg) => /\bTB\d{4}\b/.exec(msg)?.[0] ?? null;
export const firm = (s) => s === "ACCEPT" || s === "ACCEPT_LATER";
export const soft = (s) => s === "ACCEPT_ERR" || s === "RECOGNISED";
export const recognised = (s) => firm(s) || soft(s);
export const refused = (s) => s === "REJECT_CONTEXT" || s === "REJECT_SYNTAX";
export const inconclusive = (s) => ["CRASH", "HUNG", "HARNESS", "INTERFERES", "VOID"].includes(s);
export const isAttr = (p) => p.kind === "attr" || p.kind === "verify";

/**
 * What a diagnostic set says once what is particular to one probe is taken out:
 * the attribute's name as a whole word in any case, and the probe's own
 * generated names (`S000062`, `S000062_U`, `S000062_m`), which differ between
 * the control and the probe though the refusal is the same.
 */
export const signature = (codes, msgs, name) => {
  const nameRe = new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi");
  const clean = (m) => m.replace(/S\d{6}\w*/g, "#").replace(nameRe, "@");
  return `${[...new Set(codes)].sort().join(",")}|${msgs.map(clean).sort().join(";")}`;
};

/**
 * @param {object} probe  { kind, name, site, tag, attr }
 * @param {{severity: string, line: number, message: string}[]} rows  the probe's own file's rows
 * @param {Map<string, string>} controlSigs  site id -> what the unknown name draws there
 * @returns {{state: string, codes: (string|null)[], msgs: string[]}}
 */
export function classify(probe, rows, controlSigs) {
  const errs = rows.filter((r) => r.severity === "ERROR");
  if (!errs.length) return { state: "ACCEPT", codes: [], msgs: [] };
  const codes = errs.map((r) => codeOf(r.message));
  const msgs = [...new Set(errs.map((r) => r.message))];
  const aline = probe.attr === null ? -1 : attributeLine(probe.site, probe.tag);
  // The errors a skeleton draws with no attribute at all (an empty Enum, TB5233)
  // are not the attribute's doing.
  if (codes.every((c) => probe.site.baselineCodes.has(c))) return { state: "ACCEPT", codes: [], msgs: [] };
  let state;
  if (codes.includes("TB5155")) state = "REJECT_CONTEXT";
  else if (codes.includes("TB5182")) state = "REJECT_SYNTAX";
  else if (codes.every((c) => ACCEPT_LATER_CODES.has(c))) state = "ACCEPT_LATER";
  else if (errs.some((r) => r.line === aline)) state = "RECOGNISED";
  else state = "ACCEPT_ERR";
  // Whatever the control draws is a refusal, even where it is not one of the
  // two codes: a name the parser read as something else is not recognised.
  if (isAttr(probe) && !refused(state) && controlSigs.get(probe.site.id) === signature(codes, msgs, probe.name)) {
    state = "REJECT_SYNTAX";
  }
  return { state, codes, msgs };
}

const ROW = /^\{(\w+)\}\s+(\S+)\s+\[(\d+),(\d+)\]:\s*(.*)$/;

/**
 * Sort a build's diagnostic rows into the probe file each belongs to.
 *
 * @param {string[]} rows   tbbuild's rows: `{SEVERITY} path [line,col]: message`
 * @param {Map<string, object>} files  lower-cased file base name -> probe
 * @param {object[]} probes  every probe of the build, so each gets a list even if empty
 * @returns {{byFile: Map<object, object[]>, strays: string[]}} `strays` are the ERROR
 *   rows that belong to no probe's file
 */
export function sortRows(rows, files, probes) {
  const byFile = new Map(probes.map((p) => [p, []]));
  const strays = [];
  for (const row of rows) {
    const m = ROW.exec(row);
    // Only an ERROR is a stray. A row this cannot parse and that is not one is
    // a warning or a note about the project, which changes no answer.
    if (!m) {
      if (/^\{ERROR\}/.test(row)) strays.push(row);
      continue;
    }
    const p = files.get(m[2].split("/").pop().split("\\").pop().toLowerCase());
    if (!p) {
      if (m[1] === "ERROR") strays.push(row);
      continue;
    }
    byFile.get(p).push({ severity: m[1], line: Number(m[3]), col: Number(m[4]), message: m[5] });
  }
  return { byFile, strays };
}

// ---------------------------------------------------------------- batching
// A small deterministic generator, so the same run makes the same batches.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffled, so no batch is one attribute; and at most one probe per singleton
 * key in a batch, because a second would draw TB5114 and read as accepted.
 */
export function makeBatches(probes, batchSize) {
  const rand = rng(1);
  const order = [...probes];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const batches = [];
  for (const p of order) {
    const k = singletonKey(p);
    let b = batches.find((x) => x.list.length < batchSize && (!k || !x.keys.has(k)));
    if (!b) {
      b = { list: [], keys: new Set() };
      batches.push(b);
    }
    b.list.push(p);
    if (k) b.keys.add(k);
  }
  return batches.map((b) => b.list);
}

// ------------------------------------------------------------- aggregation
/**
 * name -> site id -> { state, forms: { key: state } , codes, msgs, pending }
 *
 * @param {Iterable<object>} probes  every probe planned
 * @param {Map<number, {state: string, codes: string[], msgs: string[]}>} outcomeOf  probe id -> outcome
 */
export function aggregate(probes, outcomeOf) {
  const agg = new Map();
  for (const p of probes) {
    if (p.kind !== "attr") continue;
    const o = outcomeOf.get(p.id);
    if (!agg.has(p.name)) agg.set(p.name, new Map());
    const bySite = agg.get(p.name);
    if (!bySite.has(p.site.id))
      bySite.set(p.site.id, { state: "VOID", forms: {}, codes: new Set(), msgs: new Set(), pending: false });
    const cell = bySite.get(p.site.id);
    // A form that was planned and has no answer (the run was cut short) or whose
    // build failed is pending, and a refusal from the other forms cannot stand
    // for it: the form able to pass may be exactly the one never compiled.
    if (!o) {
      if (p.form !== "false") cell.pending = true;
      continue;
    }
    if (inconclusive(o.state) && p.form !== "false") cell.pending = true;
    cell.forms[p.form] = o.state;
    for (const c of o.codes) cell.codes.add(c);
    for (const m of o.msgs) cell.msgs.add(m);
  }
  // The `false` form is never part of the answer: [CompileIf(False)] can remove
  // the declaration before anything is checked, so a clean build of it says
  // nothing about placement -- and if it is the only form that was built, the
  // cell has no answer at all.
  for (const bySite of agg.values()) {
    for (const cell of bySite.values()) {
      const use = Object.keys(cell.forms).filter((k) => k !== "false");
      for (const k of use) if (RANK[cell.forms[k]] < RANK[cell.state]) cell.state = cell.forms[k];
      // Anything short of an acceptance is unsafe to report while a form is
      // missing, not only a refusal: bare RECOGNISED (its argument missing) beside a
      // `fixed` form nobody built would read as "documented target refused".
      if (!use.length) cell.state = "HARNESS";
      else if (!firm(cell.state) && cell.pending) cell.state = "HARNESS";
    }
  }
  return agg;
}

/** Sites where forms disagree about placement: some take the attribute and some refuse the place. */
export function formDependence(agg) {
  const out = [];
  let multi = 0;
  for (const [name, bySite] of agg) {
    for (const [site, cell] of bySite) {
      const states = Object.entries(cell.forms).filter(([k]) => k !== "false");
      if (states.length > 1) multi++;
      const takes = states.filter(([, s]) => recognised(s));
      const refuses = states.filter(([, s]) => refused(s));
      if (takes.length && refuses.length)
        out.push({ name, site, takes: takes.map(([k]) => k), refuses: refuses.map(([k]) => k) });
    }
  }
  return { list: out, multi };
}

// ------------------------------------------------------------- against the page
/**
 * The targets an `Applicable to:` line names. parseTargets reads what the
 * probe generator needs; three phrasings it does not spell out are read here.
 */
export function targetsOf(app) {
  if (!app) return [];
  let t = parseTargets(app);
  if (/implements\b.*\bvia\b/i.test(app)) t = [...t.filter((x) => x !== "IMPLEMENTS"), "IMPLEMENTS_VIA"];
  // A "procedure" with no place named in ITS OWN phrase means every procedure --
  // "Class, Module, procedure" says so, though the words Class and Module appear
  // on the line. A parameter is not one.
  // A place named by a LATER phrase covers the earlier ones: "procedures and
  // constants in a module" puts the procedures in a module too.
  const phrases = app.split(/,|\band\b/);
  const bareProcedure = phrases.some(
    (p, i) =>
      /\b(procedures?|methods?)\b/i.test(p) &&
      !/\b(module|class|interface|prototype|parameter)/i.test(p) &&
      !phrases.slice(i + 1).some((q) => /\bin an?\s+(module|class|interface)\b/i.test(q)),
  );
  if (bareProcedure) t = [...t.filter((x) => x !== "PROC_MODULE"), "PROC_ANY"];
  if (t.includes("PROC_CLASS") && /class\s+or\s+interface/i.test(app) && !t.includes("PROC_INTERFACE"))
    t.push("PROC_INTERFACE");
  return t;
}

// Where a probe of this attribute tests the documented claim. RedirectToStatic-
// Implementation names a Sub, so only a Sub prototype can match its signature.
// Enumerator needs a member returning IUnknown or a Variant, which the two
// object-returning sites now provide.
export const FAITHFUL_SITES = {
  RedirectToStaticImplementation: new Set(["PROC_INTERFACE"]),
  Enumerator: new Set(["FUNC_CLASS_OBJECT", "FUNC_INTERFACE_OBJECT"]),
};
// A prototype in an Interface is not a procedure definition, so `procedures`
// does not owe one.
export const optionalFor = (target, site) =>
  OPTIONAL_SITES.has(site) || (target === "PROC_ANY" && /_INTERFACE/.test(site));

/**
 * One documented attribute laid against what the compiler did with it.
 *
 * @param {{name: string, doc: {app: string | null} | null}} u
 * @param {Map<string, {state: string}>} bySite  site id -> aggregated cell
 */
export function compare(u, bySite) {
  const doc = u.doc;
  if (!doc) return null;
  const why = FAITHFUL_SITES[u.name] ? null : (UNSYNTHESISABLE[u.name] ?? NOT_FAITHFULLY_PROBEABLE[u.name]);
  if (why) return { unfaithful: why };
  const targets = targetsOf(doc.app);
  const faithful = FAITHFUL_SITES[u.name];
  const firmAt = new Set([...bySite].filter(([, c]) => firm(c.state)).map(([s]) => s));
  const softAt = new Set([...bySite].filter(([, c]) => soft(c.state)).map(([s]) => s));
  const covered = new Set();
  const missing = [];
  const partial = [];
  const untestable = [];
  // A line that is there and yields no target -- "Library" -- has been read as
  // saying nothing, which is not the same as agreeing.
  if (doc.app && !targets.length) untestable.push(`\`${doc.app}\`: no target this tool can read`);
  for (const t of targets) {
    const fam = FAMILIES[t];
    if (!fam) {
      untestable.push(`\`${t}\`: no site in the matrix can be written for it`);
      continue;
    }
    for (const s of fam) covered.add(s);
    const live = fam.filter(
      (s) => bySite.has(s) && !inconclusive(bySite.get(s).state) && (!faithful || faithful.has(s)),
    );
    if (!live.length) {
      untestable.push(`\`${t}\`: every site for it was voided, left out, or inconclusive`);
      continue;
    }
    const yes = live.filter((s) => firmAt.has(s));
    const required = live.filter((s) => !optionalFor(t, s));
    if (!yes.length) {
      missing.push({ target: t, sites: live, soft: live.filter((s) => softAt.has(s)) });
    } else {
      // A family whose sites are all optional (an Enum member, inline or on its
      // own line) is true if any one takes the attribute.
      const no = required.filter((s) => !firmAt.has(s));
      if (no.length) partial.push({ target: t, yes, no });
    }
  }
  const extra = [...firmAt].filter((s) => !covered.has(s));
  const extraSoft = [...softAt].filter((s) => !covered.has(s));
  return { targets, missing, partial, untestable, extra, extraSoft, hasLine: !!doc.app };
}

// ------------------------------------------------------------ the preflight
/**
 * What the preflight's baselines and controls say about each site.
 *
 * @param {object[]} baselines  a probe per site with no attribute
 * @param {object[]} controls   a probe per site with the unknown name
 * @param {Map<number, {state: string, codes: string[], msgs: string[]}>} outcomeOf
 * @returns {{voidSites: Map<string, string>, controlState: Map<string, object>, controlSig: Map<string, string>}}
 *   `voidSites` maps a site id to why it cannot be trusted; `controlSig` is what the
 *   unknown name draws there, for `classify`.
 */
export function judgePreflight(baselines, controls, outcomeOf) {
  const voidSites = new Map();
  const controlState = new Map();
  const controlSig = new Map();
  for (const p of baselines) {
    const o = outcomeOf.get(p.id);
    // classify already reads a baseline that draws only the site's own declared
    // codes as ACCEPT, so anything else -- a crash, a hang, a build that could
    // not run -- voids the site. (Those carry no codes, so a test on the codes
    // alone would pass them.)
    if (o.state !== "ACCEPT")
      voidSites.set(
        p.site.id,
        `its baseline, with no attribute, does not build clean: ${o.state} ${o.msgs.join("; ")}`,
      );
  }
  for (const p of controls) {
    const o = outcomeOf.get(p.id);
    controlState.set(p.site.id, o);
    controlSig.set(p.site.id, signature(o.codes, o.msgs, CONTROL_NAME));
    // A site whose control compiles cannot tell an attribute from something else:
    // an Enum body takes ANY own-line `[...]`, `[ClassId("guid")]` included, as
    // measured on BETA 987. It is voided rather than read.
    if (!voidSites.has(p.site.id) && (firm(o.state) || inconclusive(o.state))) {
      voidSites.set(
        p.site.id,
        `an attribute that does not exist ${inconclusive(o.state) ? `could not be judged (${o.state})` : `was accepted here (${o.state})`}`,
      );
    }
  }
  return { voidSites, controlState, controlSig };
}

/**
 * Compare a rebuilt probe with its first answer.
 *
 * A rebuild that came back inconclusive (its build failed, hung or crashed) says
 * nothing about whether the first answer was stable, so it is counted apart and
 * is not a mismatch: a flaky lane must not read as an unreliable compiler.
 *
 * @param {object[]} first  the probes first answered
 * @param {object[]} again  the same probes, rebuilt as new probes in the same order
 * @param {Map<number, {state: string}>} got  the rebuild's outcomes, by the new probe's id
 * @param {Map<number, {state: string}>} outcomeOf  the first outcomes, by the first probe's id
 */
export function verifyMismatches(first, again, got, outcomeOf) {
  const bad = [];
  let unjudged = 0;
  again.forEach((q, i) => {
    const before = outcomeOf.get(first[i].id).state;
    const after = got.get(q.id)?.state;
    if (after === undefined || inconclusive(after)) {
      unjudged++;
      return;
    }
    if (before !== after) bad.push({ probe: first[i].attr, site: first[i].site.id, first: before, second: after });
  });
  return { bad, unjudged };
}

// ------------------------------------------------------------------ the runner
// Caps on the ways halving could otherwise cost thousands of builds. A hang is a
// 180-second build, and one real hang costs about ten of them to isolate, so the
// builds are not what is capped: a top-level hang first rebuilds the canaries
// alone (a compile that hangs beside nothing is the IDE, not a probe), and the
// probes that end up HUNG are what the cap counts.
export const MAX_HUNG_PROBES = 12;
export const MAX_STRAY_PROBES = 40;
export const MAX_HARNESS_FAILURES = 12;
export const MAX_INTERFERING_PROBES = 25;

/**
 * The isolating runner: `runSet(probes, lane)` builds a set and returns each probe's
 * outcome, halving whatever goes wrong until one probe is to blame. The IDE is behind
 * `buildOnce`, which is what a test replaces.
 *
 * @param {object} o
 * @param {(probes: object[], lane: object) => Promise<object>} o.buildOnce  one build of the
 *   probes plus the canaries: `{kind: "ok", byFile, strays, canaries}`, `{kind: "crash", named}`,
 *   `{kind: "hung"}` or `{kind: "harness", why}`
 * @param {Map<string, string>} o.controlSig  what the unknown name draws at each site, read by classify
 * @param {(line: string) => void} [o.say]  progress
 * @returns {{runSet: Function, stats: object}}
 */
export function createRunner({ buildOnce, controlSig, say = () => {} }) {
  const stats = {
    builds: 0,
    splits: 0,
    crashes: [],
    hung: [],
    strays: [],
    strayProbes: 0,
    canaryFails: 0,
    harness: [],
    interferes: [],
    comboCrashes: [],
    cutShort: null,
  };

  /**
   * Build a set of probes and return their outcomes, isolating anything that goes
   * wrong by halving. A build is believed only if its canaries drew what this file
   * records and it holds no error row that belongs to no probe.
   *
   * @returns {Promise<Map<number, {state:string, codes:string[], msgs:string[]}>>}
   */
  async function runSet(probes, lane, depth = 0) {
    stats.builds++;
    const r = await buildOnce(probes, lane);
    const out = new Map();
    if (r.kind === "harness") {
      stats.harness.push(`${probes.length} probe(s): ${r.why}`);
      for (const p of probes) out.set(p.id, { state: "HARNESS", codes: [], msgs: [r.why] });
      // A failure to run is a failure for the subtree's bookkeeping too: it is not a
      // cause that "neither half reproduces".
      out.failures = 1;
      if (stats.harness.length > MAX_HARNESS_FAILURES) {
        throw new Error(`more than ${MAX_HARNESS_FAILURES} builds could not be run; the last: ${r.why}`);
      }
      return out;
    }
    if (r.kind === "hung" && depth === 0) {
      stats.builds++;
      const alone = await buildOnce([], lane);
      if (alone.kind !== "ok") {
        throw new Error(
          "the compile never settles even with only the canaries in it, so the IDE or the harness is unwell rather than any probe",
        );
      }
    }
    // Every error row that belongs to no probe: the preflight has already refused
    // a template that draws any of its own, so none is expected.
    const newStrays = r.kind === "ok" ? r.strays : [];
    const canariesFine = r.kind === "ok" && canaryOk(r.canaries);
    if (r.kind === "ok" && canariesFine && !newStrays.length) {
      for (const [p, rows] of r.byFile) out.set(p.id, classify(p, rows, controlSig));
      return out;
    }
    const why =
      r.kind === "ok"
        ? !canariesFine
          ? `canaries drew ${JSON.stringify(r.canaries)}, expected ${JSON.stringify(EXPECTED_CANARIES)}`
          : `${newStrays.length} error row(s) belong to no probe`
        : r.kind === "crash"
          ? "the compiler crashed"
          : "the compile never settled";
    if (r.kind === "ok" && !canariesFine) stats.canaryFails++;
    // Counted per subtree, in `out.failures`, because the lanes run at once and a
    // shared counter would credit one lane's isolation to another's batch.
    out.failures = 1;
    if (probes.length === 1) {
      const p = probes[0];
      if (r.kind === "crash") {
        stats.crashes.push(p);
        out.set(p.id, { state: "CRASH", codes: [], msgs: [] });
        return out;
      }
      if (r.kind === "hung") {
        stats.hung.push(p);
        out.set(p.id, { state: "HUNG", codes: [], msgs: [] });
        if (stats.hung.length > MAX_HUNG_PROBES) throw new Error(`more than ${MAX_HUNG_PROBES} probes never settle`);
        return out;
      }
      if (!canariesFine) {
        stats.interferes.push(p);
        out.set(p.id, { state: "INTERFERES", codes: [], msgs: [why] });
        if (stats.interferes.length > MAX_INTERFERING_PROBES) {
          throw new Error(
            `more than ${MAX_INTERFERING_PROBES} probes each disturb the canaries beside nothing else; the canaries are not a usable check on this compiler`,
          );
        }
        return out;
      }
      // The only thing wrong is an error row in no probe's file: this probe caused
      // it, so the attribute was taken and something it names did not resolve.
      const o = classify(p, r.byFile.get(p), controlSig);
      stats.strays.push(...newStrays.map((s) => `${p.attr} at ${p.site.id}: ${s}`));
      if (++stats.strayProbes > MAX_STRAY_PROBES) {
        throw new Error(
          `more than ${MAX_STRAY_PROBES} probes each draw an error row belonging to no probe; ` +
            "the template project probably draws it in every build",
        );
      }
      out.set(p.id, o.state === "ACCEPT" ? { state: "RECOGNISED", codes: [], msgs: newStrays } : o);
      return out;
    }
    // Take the probe the compiler says it died parsing out first: two builds
    // where halving would need two per level.
    let parts;
    const named = r.kind === "crash" ? probes.filter((p) => r.named.has(p.id)) : [];
    if (named.length && named.length < probes.length) {
      parts = [named, probes.filter((p) => !named.includes(p))];
    } else {
      const half = Math.ceil(probes.length / 2);
      parts = [probes.slice(0, half), probes.slice(half)];
    }
    stats.splits++;
    say(`  ${why} in ${probes.length} probes: splitting`);
    const halves = [];
    for (const part of parts) halves.push(await runSet(part, lane, depth + 1));
    for (const h of halves) for (const [k, v] of h) out.set(k, v);
    const below = halves.reduce((n, h) => n + (h.failures ?? 0), 0);
    out.failures = 1 + below;
    // A cause that needs several probes at once leaves both halves clean, and
    // their answers are still good. What is lost is the cause itself -- for a
    // crash, the compiler bug -- so it is named here rather than dropped.
    if (below === 0) {
      stats.comboCrashes.push(
        `${why} in a batch of ${probes.length} probes (${probes[0].tag}..${probes.at(-1).tag}) ` +
          "that neither half reproduces; it needs several probes together",
      );
    }
    return out;
  }

  return { runSet, stats };
}
