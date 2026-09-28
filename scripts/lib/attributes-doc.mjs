// What Reference/Attributes.md documents: each attribute's `Syntax:` line and
// the first `Applicable to:` line after it. census_attributes.mjs reports each
// attribute's documented targets beside its uses, and gen_attribute_probes.mjs
// generates a probe from each target `parseTargets` reads from that line.
//
// A line inside a fence, an indented code block or an HTML block is not read,
// so an example that shows the page's own format is not taken for an
// attribute. The regions come from the site's parser, since the page is the
// site's.

import { createMarkdownIt } from "../../builder/render.mjs";
import { blockRegions } from "../../lib/markdown.mjs";

const LINK_BOLD = /\[\*\*([^\]]*)\*\*\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

/** The text with its links, bold markers and backslashes removed. */
function clean(s) {
  return s
    .replace(LINK_BOLD, "$1")
    .replace(LINK, "$1")
    .replaceAll("**", "")
    .replaceAll("\\", "")
    .trim();
}

let siteMd;

/**
 * Every attribute `src` documents, in page order, as `{ name, syntax, line, app }`:
 * the name a `Syntax: **[Name` line gives, the rest of that line cleaned, its
 * 1-based line number, and the first `Applicable to:` line after it, cleaned,
 * or null. A `Syntax:` line that names no attribute is skipped, so an
 * `Applicable to:` line after it still belongs to the attribute before.
 */
export function parseAttributes(src) {
  siteMd ??= createMarkdownIt({ highlighter: null, linkTables: null, baseurl: "", staticFiles: new Set() });
  // CRLF and a lone CR end a line as LF does, as they do for blockRegions, so
  // the two index the same lines and no line keeps a CR.
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const inRegion = new Uint8Array(lines.length);
  for (const r of blockRegions(src, { md: siteMd })) inRegion.fill(1, r.start, r.end);

  const entries = [];
  let cur = null;
  lines.forEach((line, i) => {
    if (inRegion[i]) return;
    const m = /^Syntax:\s*(.*)$/.exec(line);
    if (m) {
      const name = /^Syntax:\s*\*\*\[(\w+)/.exec(line);
      if (!name) return;
      cur = { name: name[1], syntax: clean(m[1]), line: i + 1, app: null };
      entries.push(cur);
      return;
    }
    const a = /^Applicable to:\s*(.*)$/.exec(line);
    if (a && cur !== null && cur.app === null) cur.app = clean(a[1]);
  });
  return entries;
}

// ----------------------------------------------------------------- targets
// Ordered: the specific phrasings must win over the bare ones.
// Phrasings that must be matched against the WHOLE `Applicable to:` line, before
// it is split on commas and "and". Splitting first turns "variables and
// procedures in a Class" into "variables" -- which falls through to the bare
// `/variable/i` rule and probes a MODULE variable, the opposite of what the line
// says.
//
// Only patterns that themselves span a comma or an "and" belong here, and that
// restriction is load-bearing: a rule general enough to match an ordinary line
// would win before the split and throw the line's other targets away. Trying
// every RULE against the whole string first was the first attempt, and it
// silently reduced "Class, Module, procedure" to Class alone.
const WHOLE_PHRASE_RULES = [
  [/variables?\s+and\s+procedures?\s+in\s+a\s+class/i, ["VAR_CLASS", "PROC_CLASS"]],
  [/function\s+in\s+a\s+module,\s*returning\s+a\s+boolean/i, ["FUNC_MODULE_BOOL"]],
];

const RULES = [
  [/interface\s+in\s+a\s+library/i, ["LIBRARY_INTERFACE"]],
  // Added with the attributes the package census turned up. Each sits before
  // the generic rule it would otherwise fall through to: a "prototype in an
  // Interface" reaches `/procedure/i` and probes a module Sub, and an
  // "Interface declaration within a CoClass" reaches `/^interface\b/i` and
  // probes a free-standing Interface, which is exactly the target the line
  // is distinguishing itself from.
  [/prototype\s+in\s+an\s+interface/i, ["PROC_INTERFACE"]],
  [/interface\s+declaration\s+within\s+a\s+coclass/i, ["COCLASS_INTERFACE"]],
  [/implements\s+statement/i, ["IMPLEMENTS"]],
  [/event\s+declaration\s+in\s+a\s+class/i, ["EVENT_CLASS"]],
  [/(procedure|method)\s+in\s+an\s+interface/i, ["PROC_INTERFACE"]],
  [/procedure\s+in\s+a\s+class\s+or\s+module/i, ["PROC_CLASS", "PROC_MODULE"]],
  [/procedure\s+in\s+a\s+class/i, ["PROC_CLASS"]],
  [/function\s+in\s+a\s+module/i, ["FUNC_MODULE"]],
  [/procedure\s+parameter/i, ["PARAM"]],
  [/variable.*\bin\s+a\s+class/i, ["VAR_CLASS"]],
  [/variable.*\bin\s+a\s+module/i, ["VAR_MODULE"]],
  [/variable/i, ["VAR_MODULE"]],
  [/declare|api\s+declaration/i, ["DECLARE"]],
  [/^type\b/i, ["TYPE"]],
  // An Enum MEMBER is a different target from the Enum, and must win over the
  // bare rule below. It is not ^-anchored because the phrase carries an article
  // where it appears -- "and an Enum member" -- which a ^ rule cannot reach.
  [/enum\s+member/i, ["ENUM_MEMBER"]],
  [/^enum\b/i, ["ENUM"]],
  // "Const", but also "constants in a module." -- \b after "const" fails on
  // the plural, which silently dropped a target until it was noticed.
  [/^const(ant)?s?\b/i, ["CONST"]],
  [/^sub\b/i, ["SUB_MODULE"]],
  [/^function\b/i, ["FUNC_MODULE"]],
  [/^coclass\b/i, ["COCLASS"]],
  [/^class\b/i, ["CLASS"]],
  [/^module\b/i, ["MODULE"]],
  [/^interface\b/i, ["INTERFACE"]],
  [/procedure/i, ["PROC_MODULE"]],
];

// Python's str.strip(".") removes every leading and trailing dot, not one.
const stripDots = (s) => s.replace(/^\.+/, "").replace(/\.+$/, "");

/**
 * The targets an `Applicable to:` line names, as gen_attribute_probes.mjs's
 * renderers know them (`PROC_CLASS`, `VAR_MODULE`, ...), in order and without
 * repeats; empty for a line no rule reads.
 */
export function parseTargets(app) {
  const out = [];
  const whole = stripDots(app.trim()).trim();
  for (const [pattern, targets] of WHOLE_PHRASE_RULES) {
    if (pattern.test(whole)) return [...targets];
  }
  for (const phrase of app.split(/,|\band\b/)) {
    const p = stripDots(phrase.trim()).trim();
    if (!p) continue;
    for (const [pattern, targets] of RULES) {
      if (pattern.test(p)) {
        for (const t of targets) if (!out.includes(t)) out.push(t);
        break;
      }
    }
  }
  return out;
}
