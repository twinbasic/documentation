// Fence extraction, opt-in markup and slot classification for the twinBASIC
// code samples in docs/. Pure text: no IDE, no built tree, no network.
//
// scripts/check_examples.mjs is the only caller; it lives apart because this
// half is the half that can be tested without a Windows box and a compiler.
//
// ---------------------------------------------------------------- the markup
//
// A sample opts in through its fence info string:
//
//     ```tb check_build
//     ```tb check_build slot=module
//     ```tb check_run project=packages
//
// The names say what is asked for, not what has happened to the sample.
//
// The info string is invisible to the site. builder/render.mjs's fence rule is
//
//     const lang = tok.info ? tok.info.trim().split(/\s+/)[0] : "";
//
// so everything after the language token is discarded before the highlighter
// sees it, and maskCodeRegions hides the fence body either way -- which is why
// the marker cannot reach the HTML and cannot perturb check_code_regions.mjs.
// check_examples.mjs asserts all of that on every run rather than trusting it.
//
// No backticks may appear in it: CommonMark forbids them in a backtick fence's
// info string, and maskCodeRegions skips such a fence outright.
//
// ------------------------------------------------------------- the three slots
//
// A fence is a fragment of a program, and which fragment decides what has to be
// generated around it before a compiler will look at it:
//
//   file     a whole Class / Module / Interface / CoClass -- its own .twin
//   module   procedures and module-level declarations -- wrapped in a Module
//   sub      loose statements -- wrapped in a Module and a Private Sub
//
// The slot is inferred, and stated in the markup only when inference is wrong.
// A misinference is self-reporting, because it produces a compile error rather
// than a silent pass -- but the reporter has to name the inferred slot in the
// error, or the author is left debugging code that is correct.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import MarkdownIt from "markdown-it";

/** The bare flag that opts a fence in to compilation. */
export const MARKER = "check_build";

/** Compile it AND run it, capturing what it prints. `check_run` implies a build. */
export const RUN_MARKER = "check_run";

/** Flags with no value. */
const FLAGS = new Set([MARKER, RUN_MARKER]);

/** Keys that take a value. */
const KEYS = new Set(["slot", "project", "id", "expect-error"]);

/** The slots, in the order the classifier prefers them. */
export const SLOTS = ["file", "module", "sub"];

// A bare CommonMark parser, as in check_code_regions.mjs: this asks what the
// SOURCE says, so it must not inherit the site's plugin stack.
const md = new MarkdownIt({ html: true });

// ---------------------------------------------------------------- info string

/**
 * Parse a fence info string into its language, flags and keys.
 *
 * @param {string} info  the raw info string, e.g. `tb checked slot=module`
 * @returns {{lang: string, flags: Set<string>, keys: Map<string,string>, bad: string[]}}
 */
export function parseInfo(info) {
  const parts = (info ?? "").trim().split(/\s+/).filter(Boolean);
  const lang = parts.shift() ?? "";
  const flags = new Set();
  const keys = new Map();
  const bad = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) {
      if (FLAGS.has(part)) flags.add(part);
      else bad.push(part);
      continue;
    }
    const key = part.slice(0, eq), value = part.slice(eq + 1);
    if (!KEYS.has(key)) { bad.push(part); continue; }
    if (key === "slot" && !SLOTS.includes(value)) { bad.push(part); continue; }
    keys.set(key, value);
  }
  if (flags.has(RUN_MARKER)) flags.add(MARKER);
  return { lang, flags, keys, bad };
}

// ----------------------------------------------------------------- collection

/** Every markdown file under `root`, repo-relative, sorted. */
export async function markdownFiles(root) {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  const rels = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const abs = path.join(e.parentPath ?? e.path, e.name);
    const rel = path.relative(root, abs).split(path.sep).join("/");
    if (/^_(site|serve|pdf)/.test(rel)) continue;
    rels.push(rel);
  }
  return rels.sort();
}

/**
 * Every `tb` fence under `root`.
 *
 * `line` is the 1-based source line of the opening fence, so the first line of
 * `content` is at `line + 1` -- which is what makes a diagnostic's generated
 * line number convertible back to a line in the page.
 *
 * The id defaults to `<rel>#<ordinal>` over the page's tb fences. Ordinal
 * rather than line number on purpose: a fence's ordinal survives an edit
 * anywhere above it, and the id is what a report and a pinned finding are
 * keyed to.
 */
export async function collectFences(root) {
  const out = [];
  for (const rel of await markdownFiles(root)) {
    const src = await fs.readFile(path.join(root, rel), "utf8");
    let ordinal = 0;
    const walk = (tokens) => {
      for (const t of tokens) {
        if (t.type === "fence") {
          const parsed = parseInfo(t.info);
          if (parsed.lang === "tb") {
            ordinal += 1;
            out.push({
              rel, ordinal,
              id: parsed.keys.get("id") ?? `${rel}#${ordinal}`,
              line: t.map ? t.map[0] + 1 : 0,
              info: t.info.trim(),
              content: t.content,
              ...parsed,
            });
          }
        }
        if (t.children) walk(t.children);
      }
    };
    walk(md.parse(src, {}));
  }
  return out;
}

// ----------------------------------------------------------------- classifier

// Modifiers that may precede a declaration keyword. A modifier this list does
// not know makes the keyword after it invisible, which is the silent
// misclassification builder/census_attributes.mjs records paying for
// (`NotDispatchable`, there).
// The vocabulary is measured, not guessed: `Overridable` has 32 uses across the
// shipped packages and 3 in docs/, and leaving it out cost three fences, which
// came back as "End Function closing Class" -- a missed opener always surfaces
// as a mismatch somewhere later, never where it happened.
const MODS = "(?:Public|Private|Friend|Global|Protected|Static|Shared|Partial|" +
  "NotDispatchable|Overridable|Overrides|Overloads|Virtual|Abstract|Default|" +
  "Iterator|Async|MustOverride|MustInherit|NotInheritable|Optional|PtrSafe|Naked|" +
  "CDecl|StdCall|Unsafe|Extern|Inline)";
const rx = (body) => new RegExp("^(?:" + MODS + "\\s+)*" + body, "i");

// Every opener demands a NAME after the keyword. Without that guard a UDT field
// called `Type As Long` -- four of them in the shipped packages -- reads as an
// opener that never closes, and swallows the rest of the file; one such field
// put 368 Declares inside a phantom Type when builder/census_attributes.mjs
// made the same mistake.
const NAMED = "\\s+(?!As\\b)[A-Za-z_\\[]";
const CONTAINER_OPEN = rx("(?:Class|Module|Interface|CoClass|Library|Namespace)" + NAMED);
const BLOCK_DECL = rx("(?:Enum|Type|Structure)" + NAMED);
const PROC_OPEN = rx("(?:Sub|Function|Property\\s+(?:Get|Let|Set)|Operator|Constructor|Destructor)\\b");
const DECLARE = rx("(?:Declare|DeclareWide)\\b");
const MODULE_ONLY = rx("(?:Event|Delegate|Implements|Inherits|Import|Extends)\\b");
const WITHEVENTS = rx("WithEvents\\b");
const OPTION_RE = /^Option\s+/i;
const ATTRIBUTE_RE = /^\[[A-Za-z_]/;
const DIMLIKE = rx("(?:Dim|Const|ReDim)\\b");
const DIRECTIVE_RE = /^#/;
const END_RE = /^End\s+(Sub|Function|Property|Class|Module|Interface|CoClass|Library|Namespace|Enum|Type|Structure|Operator|Constructor|Destructor)\b/i;
// A whole procedure on one line: `Sub MySub(Of T)(a As T): End Sub`, which
// Features/Language/Generics.md writes five times. Without this the opener is
// pushed and never popped, and the fence reads as an unclosed fragment.
const SELF_CLOSING_RE = /:\s*End\s+(?:Sub|Function|Property|Operator)\s*$/i;
const KIND_RE = /\b(Class|Module|Interface|CoClass|Library|Namespace|Enum|Type|Structure|Sub|Function|Property|Operator|Constructor|Destructor)\b/i;
// A declared name, for the collision check the batcher makes -- and the set of
// kinds it applies to is measured rather than assumed, because guessing it
// wide is expensive. Two generated modules in one project may each declare
// `Public Function Foo`, `Public Type Rec` and `Public Const Answer`, and two
// different Enums may each have a member called `Red`; two Enums with the SAME
// name are TB5000 `duplicate definition in the current scope`. So only
// type-level names can collide, and a rule that also tracked procedures would
// split batches -- each costing a whole IDE startup -- for nothing.
const COLLIDES = /^(?:Class|Module|Interface|CoClass|Library|Namespace|Enum)$/i;
const NAME_RE = /\b(?:Class|Module|Interface|CoClass|Library|Namespace|Enum|Type|Structure)\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?/i;

// Statement blocks, which have to balance for a statement run to be wrappable.
const INNER_OPEN = [
  [/^If\b.*\bThen\s*$/i, "If"],
  [/^For\b/i, "For"],
  [/^Do\b/i, "Do"],
  [/^While\b/i, "While"],
  [/^With\b/i, "With"],
  [/^Select\s+Case\b/i, "Select"],
  [/^Try\b/i, "Try"],
];
const INNER_CLOSE = [
  [/^End\s+If\b/i, "If"], [/^Next\b/i, "For"], [/^Loop\b/i, "Do"],
  [/^Wend\b/i, "While"], [/^End\s+While\b/i, "While"], [/^End\s+With\b/i, "With"],
  [/^End\s+Select\b/i, "Select"], [/^End\s+Try\b/i, "Try"],
];

/**
 * Logical source lines: comments stripped, continuations joined, blanks dropped.
 *
 * The comment strip is quote-aware because this corpus is full of samples whose
 * strings contain apostrophes and whose `[Description("...")]` arguments contain
 * whole sentences.
 */
function logicalLines(src) {
  const raw = src.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let acc = "", accAt = 0;
  raw.forEach((line, i) => {
    let s = "", inStr = false;
    for (const ch of line) {
      if (ch === '"') { inStr = !inStr; s += ch; continue; }
      if (!inStr && ch === "'") break;
      s += ch;
    }
    const blank = !s.trim();
    if (!blank && /\s_\s*$/.test(s)) {
      if (!acc) accAt = i;
      acc += s.replace(/\s_\s*$/, " ");
      return;
    }
    if (acc) { out.push({ text: (acc + s).trim(), at: accAt }); acc = ""; return; }
    if (blank) return;
    out.push({ text: s.trim(), at: i });
  });
  if (acc) out.push({ text: acc.trim(), at: accAt });
  return out;
}

const kindOf = (text) => (KIND_RE.exec(text)?.[1] ?? "?").toLowerCase();

/**
 * Which slot a fence's content belongs in, or why it belongs in none.
 *
 * @returns {{slot: string|null, reason?: string, names: string[]}}
 *   `slot` is null for a fragment -- an elision, an unbalanced block, an `End`
 *   with no opener. `names` are the top-level names the fence would export if
 *   it were generated, which is what the batcher packs around.
 */
export function classify(content) {
  const lines = logicalLines(content);
  if (!lines.length) return { slot: null, reason: "empty", names: [] };
  // An elision is the one fragment marker the docs use deliberately.
  if (/(^|\n)[ \t]*(\.\.\.|…)[ \t]*(\n|$)/.test(content)) {
    return { slot: null, reason: "elided with ...", names: [] };
  }

  const stack = [];                 // open blocks, innermost last
  const inner = [];                 // open statement blocks at fence top level
  const names = [];
  let sawContainer = false, sawProc = false, sawModuleOnly = false, sawLoose = false;

  for (const { text } of lines) {
    if (DIRECTIVE_RE.test(text)) continue;          // #If / #End If / #Const

    const end = END_RE.exec(text);
    if (end) {
      const kind = end[1].toLowerCase();
      if (!stack.length) return { slot: null, reason: `${text} with no opener`, names };
      const open = stack[stack.length - 1];
      const matches = open === kind ||
        (open === "property" && kind === "property") ||
        (["constructor", "destructor"].includes(open) && kind === "sub");
      if (!matches) return { slot: null, reason: `End ${kind} closing ${open}`, names };
      stack.pop();
      continue;
    }

    const open = stack[stack.length - 1];
    // Only a container holds declarations of its own. Inside an Interface or a
    // CoClass a procedure line is a PROTOTYPE with no body, so pushing it as a
    // block eats the End Interface after it -- seven fences here are that
    // shape, and census_attributes.mjs lost 31 package files to the same thing.
    //
    // A Type IS a container in twinBASIC, unlike VBA: a UDT may declare
    // Type_Initialize, Type_Assignment and Type_Conversion procedures, which is
    // what Features/Language/UDTs.md is about. An Enum may not.
    const inContainer = open === undefined ||
      ["class", "module", "library", "namespace", "type", "structure"].includes(open);
    if (!inContainer) continue;

    if (ATTRIBUTE_RE.test(text)) continue;          // decorates what follows
    const selfClosing = SELF_CLOSING_RE.test(text);
    const top = stack.length === 0;

    if (CONTAINER_OPEN.test(text)) {
      if (top) { sawContainer = true; pushName(names, text); }
      stack.push(kindOf(text));
      continue;
    }
    if (DECLARE.test(text)) {                        // before PROC_OPEN: a
      if (top) sawModuleOnly = true;                 // Declare names a
      continue;                                      // Function or a Sub but
    }                                                // opens no block
    if (BLOCK_DECL.test(text)) {
      if (top) { sawModuleOnly = true; pushName(names, text); }
      if (!selfClosing) stack.push(kindOf(text));
      continue;
    }
    if (PROC_OPEN.test(text)) {
      if (top) sawProc = true;
      if (!selfClosing) stack.push(kindOf(text));
      continue;
    }
    if (MODULE_ONLY.test(text) || WITHEVENTS.test(text) || OPTION_RE.test(text)) {
      if (top) sawModuleOnly = true;
      continue;
    }
    if (!top) continue;                              // body of a block we own

    if (DIMLIKE.test(text)) { sawLoose = true; continue; }  // legal in both slots

    for (const [re, kind] of INNER_CLOSE) {
      if (!re.test(text)) continue;
      if (inner.pop() !== kind) return { slot: null, reason: `unbalanced ${text}`, names };
      break;
    }
    for (const [re, kind] of INNER_OPEN) {
      if (re.test(text)) { inner.push(kind); break; }
    }
    sawLoose = true;
  }

  if (stack.length) return { slot: null, reason: `unclosed ${stack.join(", ")}`, names };
  if (inner.length) return { slot: null, reason: `unclosed ${inner.join(", ")}`, names };
  if (sawContainer && !sawProc && !sawModuleOnly && !sawLoose) return { slot: "file", names };
  if (sawContainer) return { slot: "file", reason: "mixed with loose code", names };
  if (sawProc || sawModuleOnly) return { slot: "module", names };
  return { slot: "sub", names };
}

function pushName(names, text) {
  const m = NAME_RE.exec(text);
  if (m && COLLIDES.test(kindOf(text))) names.push(m[1]);
}

// ------------------------------------------------------------------ generation

/** A stable module name for a fence. Traceable without a lookup table. */
export function moduleName(id) {
  return "tbx_" + createHash("sha1").update(id).digest("hex").slice(0, 10);
}

/**
 * The .twin source for one fence, plus the offset that converts a diagnostic's
 * line number back to a line in the page:
 *
 *     pageLine = fence.line + generatedLine - offset
 *
 * Everything generated is Private, because two samples in one project must not
 * see each other's names: eleven pages declare a `MyString`.
 */
export function wrapFence(fence, slot, name) {
  const header = `' ${fence.rel}:${fence.line}  (${fence.id})`;
  const body = fence.content.replace(/\n+$/, "");
  if (slot === "file") {
    return { text: `${header}\n${body}\n`, offset: 1 };
  }
  if (slot === "module") {
    return { text: `${header}\nModule ${name}\n${body}\nEnd Module\n`, offset: 2 };
  }
  return {
    text: `${header}\nModule ${name}\n    Private Sub tbxBody()\n${body}\n    End Sub\nEnd Module\n`,
    offset: 3,
  };
}
