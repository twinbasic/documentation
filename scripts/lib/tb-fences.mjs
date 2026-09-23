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
//     ```tb check_build inherits=Form
//     ```tb check_build projname=padleft-tests
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
// ------------------------------------------------------------- the five slots
//
// A fence is a fragment of a program, and which fragment decides what has to be
// generated around it before a compiler will look at it. Two dimensions: what
// container the code sits in, and whether it is declarations or statements.
//
//              declarations / procedures     loose statements
//   Module     module                        sub
//   Class      class                         method
//
//   file       a whole Class / Module / Interface / CoClass -- its own .twin
//
// The slot is inferred, and stated in the markup only when inference is wrong.
// A misinference is self-reporting, because it produces a compile error rather
// than a silent pass -- but the reporter has to name the inferred slot in the
// error, or the author is left debugging code that is correct.
//
// The Class row is inferred from two signals, both language rules rather than
// guesses:
//
//   * `Me`, because TB5025 reads "[Me] cannot be used in standard modules.
//     [Me] is only applicable to class modules";
//   * a top-level `WithEvents` field, which a standard module may not declare
//     at all -- the compiler reports TB5182 on the declaration and then TB5079
//     on every later use of the name.
//
// So a fence carrying either is class code-behind by construction, and one
// carrying neither is left alone.
//
// That inference cannot regress a passing sample. A module- or sub-slot fence
// with either signal is already failing; moving it to the Class row can only
// change which diagnostic it gets, or fix it. A file-slot fence brings its own
// container and is never reclassified.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import MarkdownIt from "markdown-it";

/** The bare flag that opts a fence in to compilation. */
export const MARKER = "check_build";

/** Compile it AND run it, capturing what it prints. `check_run` implies a build. */
export const RUN_MARKER = "check_run";

/**
 * Context for the page's samples that the reader never sees.
 *
 * builder/render.mjs emits nothing for a fence carrying this, so it reaches
 * neither the HTML nor anything downstream of it -- the search index, the
 * offline mirror and the PDF book all read the rendered string. The gate
 * compiles it into every project holding a sample from the same page.
 *
 * It exists so that the declarations a sample assumes -- a class the page
 * describes in prose but never lists, a control instance, an API Declare --
 * can live in the page beside the samples that need them, instead of in a
 * template stage set that is shared by six hundred other pages and specific to
 * one. A hidden fence is the page's own stage set.
 */
export const HIDDEN_MARKER = "hidden";

/** Flags with no value. */
const FLAGS = new Set([MARKER, RUN_MARKER, HIDDEN_MARKER]);

/**
 * Keys that take a value.
 *
 * `project` names the TEMPLATE to build into; `projname` names a GROUP of
 * samples that must be built as one project, which is what a page does when it
 * presents one program in pieces -- a tutorial that defines a function in one
 * fence and tests it in the next three.
 */
const KEYS = new Set([
  "slot", "project", "projname", "id", "expect-error", "inherits", "resource",
]);

/**
 * `resource=<project-relative path>` on a fence in ANY language stages that
 * fence's contents as a file in the generated project, beside the samples that
 * need it. It exists for the compile-time attributes that read a project file:
 * `[PopulateFrom("json", "/Resources/MESSAGETABLE/Strings.json", ...)]` fills an
 * Enum's members from that JSON while compiling, so without the file the whole
 * feature is undocumentable -- and WITH it the compiler checks the member names
 * the JSON produces, which is the claim the page is really making.
 *
 * A resource fence is never compiled and never counts as a sample. It is
 * rendered like any other fence: the reader is supposed to see the file.
 */
export const RESOURCE_KEY = "resource";

/**
 * A resource path, reduced to something that cannot escape the staged project.
 * Returns null for a path that tries.
 */
export function resourcePath(raw) {
  // The UNC and drive-letter tests run BEFORE the leading slashes come off, or
  // `//server/share` passes as the innocent-looking `server/share`.
  const flat = String(raw ?? "").trim().replace(/\\/g, "/");
  if (!flat || /^[A-Za-z]:/.test(flat) || flat.startsWith("//")) return null;
  const parts = [];
  for (const seg of flat.replace(/^\/+/, "").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") return null;                  // no climbing out, ever
    parts.push(seg);
  }
  return parts.length ? parts.join("/") : null;
}

/** The slots, in the order the classifier prefers them. */
export const SLOTS = ["file", "module", "sub", "class", "method"];

/** The slots whose generated container is a Class rather than a Module. */
export const CLASS_SLOTS = new Set(["class", "method"]);

/**
 * The slots whose body is generated inside a procedure.
 *
 * What these have in common is that nothing they declare reaches container
 * scope, so two such samples can never collide however they are batched.
 */
export const BODY_SLOTS = new Set(["sub", "method"]);

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
  // Both imply a build: a hidden fence that is not compiled is text nobody can
  // read and nothing checks.
  if (flags.has(RUN_MARKER) || flags.has(HIDDEN_MARKER)) flags.add(MARKER);
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
    let ordinal = 0, resources = 0;
    const walk = (tokens) => {
      for (const t of tokens) {
        if (t.type === "fence") {
          const parsed = parseInfo(t.info);
          // A resource fence is collected whatever language it is written in --
          // the JSON a [PopulateFrom] enum reads is a ```json block, and it is
          // the file that matters rather than the highlighting. It counts on its
          // own series, so adding one to a page does not renumber the samples
          // below it and silently rename every generated module.
          const isResource = parsed.keys.has(RESOURCE_KEY);
          if (parsed.lang === "tb" || isResource) {
            const n = isResource ? (resources += 1) : (ordinal += 1);
            out.push({
              rel, ordinal: n, isResource,
              id: parsed.keys.get("id") ?? `${rel}#${isResource ? "r" : ""}${n}`,
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
// ...and the two of those that a standard module may not have at all.
const CLASS_ONLY = rx("(?:Implements|Inherits)\\b");
const WITHEVENTS = rx("WithEvents\\b");
// An access modifier at the head of a line, which only a container may hold.
// Checked after the openers above, so `Public Sub`, `Public Enum` and
// `Public Declare` have already been claimed by the rules that know them.
const ACCESS_DECL = /^(?:Public|Private|Friend|Global)\s+/i;
// The VB6 default-type statements, which are module-level only. The list is the
// full set the compiler accepts, not the ones this corpus happens to use.
const DEFTYPE =
  /^Def(?:Bool|Byte|Cur|Date|Dbl|Dec|Int|LngLng|LngPtr|Lng|Obj|Sng|Str|Var)\s+[A-Z]/i;
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
// `Public Function Foo` and `Public Const Answer`, and two different Enums may
// each have a member called `Red`; two Enums with the SAME name are TB5000
// `duplicate definition in the current scope`. So only type-level names can
// collide, and a rule that also tracked procedures would split batches -- each
// costing a whole IDE startup -- for nothing.
//
// `Type` and `Structure` are in the set for a reason that took a real failure
// to see, and it is NOT that two Types collide with each other -- they do not,
// which is what an earlier measurement established and why they were left out.
// It is that a module-scoped `Type Foo` and a project-scoped `CoClass Foo` are
// both in scope inside that module, so a reference to `Foo` there is TB5137
// `'Foo' is ambiguous`. Features/Language/Pointers.md#1 declares the Type and
// Features/Language/Interfaces-CoClasses.md#5 the CoClass; they compiled apart
// for as long as nothing put them in one project. A collision rule has to cover
// the names a sample can be made ambiguous BY, not only the ones two samples
// would duplicate.
const COLLIDES = /^(?:Class|Module|Interface|CoClass|Library|Namespace|Enum|Type|Structure)$/i;
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
 * Does this fence use `Me`, and so have to be generated into a Class?
 *
 * Strings are blanked as well as comments, which logicalLines does not do: this
 * corpus prints the word. `Debug.Print "Use Me instead"` is prose inside a
 * literal, and treating it as code would wrap an ordinary module sample in a
 * Class for nothing.
 *
 * A `Me` preceded by a dot is somebody's member, not the keyword.
 */
export function usesMe(src) {
  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    let s = "", inStr = false;
    for (const ch of raw) {
      if (ch === '"') { inStr = !inStr; s += " "; continue; }
      if (inStr) { s += " "; continue; }
      if (ch === "'") break;
      s += ch;
    }
    if (/(?:^|[^.\w])Me\b/i.test(s)) return true;
  }
  return false;
}

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
  // An elision is the one fragment marker the docs use deliberately, and the
  // VBA-derived pages inherited Microsoft's SPACED form -- `. . .` on a line of
  // its own, in ReDim, Deftype and On-Error. Read as code that was three
  // separate dot operators, which is how those pages came to be proposed as
  // markable and to fail with "Expected a symbol following the dot operator" on
  // a line that is not code at all. The line must be nothing but dots and
  // spaces, so a `.Value = 1` inside a With block is untouched.
  if (/(^|\n)[ \t]*\.[ \t]*\.[ \t.]*(\n|$)/.test(content) ||
      /(^|\n)[ \t]*…[ \t]*(\n|$)/.test(content)) {
    return { slot: null, reason: "elided with ...", names: [] };
  }

  const stack = [];                 // open blocks, innermost last
  const inner = [];                 // open statement blocks at fence top level
  const names = [];
  let sawContainer = false, sawProc = false, sawModuleOnly = false, sawLoose = false;
  let sawWithEvents = false, sawClassOnly = false;

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
      // A top-level WithEvents field is the second signal that a fence is
      // class code-behind, and it is a language rule rather than a guess in
      // the same way `Me` is: WithEvents is not legal in a standard module, so
      // generating one into a Module makes the compiler report TB5182 on the
      // declaration and then TB5079 on every later use of the name -- four
      // diagnostics for one wrong container, none of them naming the cause.
      if (top && WITHEVENTS.test(text)) sawWithEvents = true;
      // `Implements` and `Inherits` are the third signal, and the same kind of
      // rule: neither is legal in a standard module, so a fence opening with
      // one is class code-behind whatever else it contains. TbExpressionService/
      // Bind.md is the shape -- an ITbCustomBinder implementation shown as the
      // body of the class, with no `Me` in it and no WithEvents field.
      if (top && CLASS_ONLY.test(text)) sawClassOnly = true;
      if (top) sawModuleOnly = true;
      continue;
    }
    // An access modifier is not a statement. `Public NumberOfEmployees As
    // Integer` is a field declaration, and no procedure body may contain one
    // -- so a fence opening with it belongs in a Module, not in a generated
    // Sub, where the compiler reports `Unrecognized symbol 'Public'` against a
    // line that is perfectly correct.
    //
    // Eight fences were classified as loose statements this way, including
    // Reference/Core/Public.md and Reference/Core/Private.md -- the reference
    // pages for the two keywords. `Static` is deliberately not in the list: it
    // IS legal inside a procedure.
    if (ACCESS_DECL.test(text)) {
      if (top) sawModuleOnly = true;
      continue;
    }
    // ...and neither is a Deftype. `DefInt A-Z` sets the default type for a
    // whole module and is legal nowhere else, so reading it as a statement put
    // Reference/Core/Deftype.md's own samples in a generated Sub, where the
    // compiler answered `Unrecognized symbol 'DefInt'` -- which reads as "this
    // language has no Deftype" and is not what it means. At module scope the
    // same line compiles, asked directly.
    if (DEFTYPE.test(text)) {
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
  // `Me` or a top-level WithEvents picks the Class row of the table at the
  // top of this file.
  const inClass = sawWithEvents || sawClassOnly || usesMe(content);
  if (sawProc || sawModuleOnly) return { slot: inClass ? "class" : "module", names };
  return { slot: inClass ? "method" : "sub", names };
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
export function wrapFence(fence, slot, name, base = null) {
  const header = `' ${fence.rel}:${fence.line}  (${fence.id})`;
  const body = fence.content.replace(/\n+$/, "");
  if (slot === "file") {
    return { text: `${header}\n${body}\n`, offset: 1 };
  }
  // A `base` is what a Me.<member> resolves against. Without one the wrapper is
  // a bare Class, `Me` is legal and `Me.Caption` is not -- which turns TB5025
  // into TB5027 and is no better. Measured; see WIP.ExamplesBuild.md.
  const isClass = CLASS_SLOTS.has(slot);
  const container = isClass ? "Class" : "Module";
  // A generated Class is a wrapper and is never COM-created. Without the
  // attribute, a sample whose only constructor takes arguments -- tbIDE's
  // `Public Sub New(ByVal Host As Host)` is the shape -- fails with
  // `TB5135 error generating implicit default constructor ... (for COM
  // exposure)`, which is a diagnostic about the fiction rather than about the
  // sample. The compiler names this attribute as one of the three remedies.
  const lines = [];
  if (isClass) lines.push("[COMCreatable(False)]");
  lines.push(`${container} ${name}`);
  if (base && isClass) lines.push(`    Inherits ${base}`);
  const open = lines.join("\n");
  const extra = lines.length - 1;
  if (slot === "module" || slot === "class") {
    return { text: `${header}\n${open}\n${body}\nEnd ${container}\n`, offset: 2 + extra };
  }
  return {
    text: `${header}\n${open}\n    Private Sub tbxBody()\n${body}\n    End Sub\nEnd ${container}\n`,
    offset: 3 + extra,
  };
}
