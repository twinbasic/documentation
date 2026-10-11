// The declarations an exported twinBASIC package makes, read from its .twin
// sources: every Module, Class, Interface, CoClass, Enum and Type, and every
// member each one declares, with its visibility and kind.
//
// It exists for the documentation's symbol index (WIP.HelpAddin.md, Stage 3),
// whose package half is scripts/build_package_api.mjs. The index takes its
// entries from the pages; what it needs from the packages is what only the
// source says -- the kind of a member documented on a page of its own, the
// values of an enumeration, the interface a CoClass's members are declared on
// -- and, as a side effect, which public symbols have no page at all.
//
// **This is a declaration scanner, not a compiler.** It reads each logical line
// once, keeps no expression, and follows no #If: every branch of a conditional
// is read, which is right for this corpus -- the branches it has guard features,
// not alternatives -- and what it cannot place goes to `problems` rather than
// being guessed at. Eleven ways to misread this corpus, the first seven met in the
// BETA 983 packages (scripts/census_attributes.mjs lists six more, about
// attributes):
//
//   1. A Type is not a record only. `Type HDC` in the VB package declares
//      Private Subs with bodies, and a scanner that thinks a Type holds fields
//      reads their `End Sub` as closing nothing -- 1,388 of them.
//   2. `Alias HINSTANCE As LongPtr` is a statement at file level, in CEF. It is
//      kept apart from the types, in `aliases`.
//   3. An `Interface X` line inside a CoClass names one of its interfaces; it
//      has no body and no `End Interface`. `[Default]` marks the one the
//      CoClass's members are declared on, `[Source]` the one its events are.
//   4. `[Hidden]` is not "inaccessible". VBA's `Module [_HiddenModule]` carries
//      it, and its members -- Array, Input, Choose and 89 more -- are globals
//      every project calls. Hidden is recorded, never used to drop a symbol.
//   5. A `$` name is an escaped identifier: `Function [Chr$] Lib ...`. So is a
//      module name, `[_HiddenModule]`, and an enumeration value, `[A4 Portrait]`.
//   6. An Enum can sit inside an Interface (VBA's ITbExpressionService), and a
//      type declared inside a Private module is not public, whatever its own
//      modifier says.
//   7. A declaration can carry its attributes on the same line --
//      `[DispId(-4),Hidden,Restricted] Function _NewEnum() ...` -- or on lines
//      of their own before it, joined by line continuations.
//   8. A field can be named for a keyword. `Function As Long` in a Type of the
//      community package slD3D is a field called Function; read as a procedure
//      it opens a body nothing closes, and the rest of the file -- 6,300 lines,
//      359 types -- is skipped as that body.
//   9. A procedure can share its line with its body and its end: `Function
//      F() As Long: Return 1: End Function`. It opens nothing, or the next
//      multi-line `End Sub` closes it and every declaration between is lost
//      (community ArrayList, whose class loses its members).
//  10. An Enum value can be named for a modifier: `Static = 0`, `ReadOnly = 1`,
//      or `Shared` alone. An Enum value has no modifiers.
//  11. A line that is only `[Name]` in an Enum body is a value, not an attribute
//      list for the next line. It is how an escaped name is written when the
//      value has no `= n`: the `[_]` of the LongPtr shim the VB6-derived
//      community packages carry (92 enums), xCalendar's `[Flat]`, VB's `[A4
//      Portrait]`.
//      BETA 983, 995 and 1005 agree on it, whatever the brackets hold:
//      `[Hidden]`, `[Hidden, Restricted]` and `[Description("x")]` on a line of
//      their own each declare a value of that name and take the next number, and
//      an attribute in front of a value on the same line (`[Hidden] Red = 5`)
//      is refused, TB5182. So an Enum value cannot carry an attribute. The
//      scanner reads the same-line form as an attribute list all the same.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { MODIFIERS } from "./twin-declarations.mjs";

// ------------------------------------------------------------------ lexing

/**
 * The logical lines of a source file: comments removed, the contents of string
 * literals blanked (their quotes kept, so a comma or bracket inside one is
 * never read as syntax), and lines ending in ` _` joined to the next.
 * tb-fences.mjs classifies the documentation's own samples with it too.
 *
 * @returns {{text: string, line: number}[]} `line` is the 1-based line the
 *   logical line starts on
 */
export function logicalLines(src) {
  return logicalLinesRaw(src).map(({ text, line }) => ({ text, line }));
}

/**
 * The same lines, each with `raw` beside `text`: the line as written, string
 * literals intact. The two are the same length and align character for
 * character, so a span found in `text` is cut from `raw` at the same offsets --
 * the way to read what a literal says without letting its contents be mistaken
 * for syntax.
 *
 * @returns {{text: string, raw: string, line: number}[]}
 */
export function logicalLinesRaw(src) {
  const physical = String(src).replace(/^﻿/, "").split(/\r?\n/);
  const out = [];
  let buf = "";
  let rbuf = "";
  let start = 0;
  let inBlock = false; // inside /* ... */, which may span lines
  for (let i = 0; i < physical.length; i++) {
    const s = physical[i];
    let t = "";
    let r = "";
    let inStr = false;
    for (let k = 0; k < s.length; k++) {
      const c = s[k];
      if (inBlock) {
        if (c === "*" && s[k + 1] === "/") {
          inBlock = false;
          k++;
          t += " ";
          r += " ";
        }
        continue;
      }
      if (inStr) {
        if (c === '"' && s[k + 1] === '"') {
          t += "  ";
          r += '""';
          k++;
          continue;
        }
        if (c === '"') inStr = false;
        t += c === '"' ? c : " ";
        r += c;
        continue;
      }
      if (c === '"') {
        inStr = true;
        t += c;
        r += c;
        continue;
      }
      if (c === "/" && s[k + 1] === "*") {
        inBlock = true;
        k++;
        continue;
      }
      if (c === "'") break;
      t += c;
      r += c;
    }
    if (/^\s*Rem(\s|$)/i.test(t)) {
      t = "";
      r = "";
    }
    if (!buf) start = i + 1;
    const cont = /(^|\s)_\s*$/.exec(t);
    if (cont) {
      const at = cont.index + cont[1].length;
      buf += `${t.slice(0, at)} `;
      rbuf += `${r.slice(0, at)} `;
      continue;
    }
    out.push({ text: buf + t, raw: rbuf + r, line: start });
    buf = "";
    rbuf = "";
  }
  if (buf) out.push({ text: buf, raw: rbuf, line: start });
  return out;
}

// `text` with each run of white space outside a string literal made one space
// and the ends trimmed, cut from `raw` so that the literals are as written. `text`
// is the blanked form, in which a quote is always a literal's delimiter.
function collapse(text, raw) {
  let out = "";
  let inStr = false;
  let gap = false;
  for (let k = 0; k < text.length; k++) {
    if (text[k] === '"') inStr = !inStr;
    else if (!inStr && /\s/.test(text[k])) {
      gap = true;
      continue;
    }
    if (gap && out) out += " ";
    gap = false;
    out += raw[k];
  }
  return out;
}

// Where the first statement of a line ends: the first `:` outside brackets that
// is not the start of `:=`. `Function F() As Long: Return 1: End Function` is a
// whole procedure on one line, and its declaration is what comes before the
// colon.
function statementEnd(text) {
  let depth = 0;
  for (let k = 0; k < text.length; k++) {
    const c = text[k];
    if (c === "[") depth++;
    else if (c === "]") depth--;
    else if (c === ":" && depth <= 0 && text[k + 1] !== "=") return k;
  }
  return text.length;
}

// Leading attribute groups, `[A, B(1)] [C]`, split off a logical line, each
// attribute as `{name, args}`: `args` the text between its parentheses as
// written (null when it has none). An escaped identifier used as an expression
// -- `[_HiddenModule].Foo`, `[_MAX] = 0` -- is not an attribute, and ends the run
// where it starts. `open` is true when a bracket is still unclosed at the end of
// the line. `rest` and `restRaw` are what follows, blanked and as written.
//
// In an Enum body (`inEnum`) a group that is the whole declaration, or all of it
// but an `= value`, is a member's name, whatever it holds: `[_]`, `[Flat]`,
// `[Hidden]`, `[A4 Portrait] = 1`, even `[Description("x")]`. A group with a
// declaration after it is an attribute list as anywhere else.
function splitAttributes(text, raw, inEnum = false) {
  const attrs = [];
  let i = 0;
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text[i] !== "[") break;
    let depth = 0;
    let j = i;
    for (; j < text.length; j++) {
      if (text[j] === "[") depth++;
      else if (text[j] === "]" && --depth === 0) break;
    }
    if (j >= text.length) return { attrs, rest: text.slice(i), restRaw: raw.slice(i), open: true };
    const inner = text.slice(i + 1, j);
    const after = text.slice(j + 1).trimStart();
    if (inEnum ? after === "" || after[0] === "=" : !attrs.length && /^[.=(]/.test(after) && !/[(,]/.test(inner)) break;
    attrs.push(...attributeItems(inner, raw.slice(i + 1, j)));
    i = j + 1;
  }
  return { attrs, rest: text.slice(i), restRaw: raw.slice(i), open: false };
}

// The attributes inside one pair of brackets: split at the commas outside
// parentheses, each as the name -- its first word -- and what its parentheses
// hold.
function attributeItems(inner, innerRaw) {
  const items = [];
  let depth = 0;
  let from = 0;
  for (let k = 0; k <= inner.length; k++) {
    const c = inner[k];
    if (k < inner.length && c === "(") depth++;
    else if (k < inner.length && c === ")") depth--;
    else if (k === inner.length || (c === "," && depth === 0)) {
      const item = attributeItem(inner.slice(from, k), innerRaw.slice(from, k));
      if (item) items.push(item);
      from = k + 1;
    }
  }
  return items;
}

function attributeItem(text, raw) {
  const lead = text.length - text.trimStart().length;
  const name = /^[^\s(]+/.exec(text.slice(lead))?.[0];
  if (!name) return null;
  const open = lead + name.length;
  const paren = /^\s*\(/.exec(text.slice(open));
  if (!paren) return { name, args: null };
  const from = open + paren[0].length;
  let depth = 1;
  let to = from;
  for (; to < text.length && depth > 0; to++) {
    if (text[to] === "(") depth++;
    else if (text[to] === ")") depth--;
  }
  // `to` is one past the closing parenthesis, or the end when it never closes.
  const end = depth === 0 ? to - 1 : to;
  return { name, args: collapse(text.slice(from, end), raw.slice(from, end)) };
}

// The text a [Description(...)] attribute gives, or null when there is none or
// it is not made of string literals: the literal, the ones joined by `&`, and
// the line-break constants among them as the language defines them. `""` in a
// literal is a quote. A break is written \n whichever of vbCrLf, vbNewLine and
// vbLf the source used.
const STRING_CONSTANTS = new Map([
  ["vbcrlf", "\n"],
  ["vbnewline", "\n"],
  ["vblf", "\n"],
  ["vbcr", "\r"],
  ["vbtab", "\t"],
]);

function descriptionOf(attrs) {
  const args = attrs.find((a) => /^Description$/i.test(a.name))?.args;
  if (args == null) return null;
  let out = "";
  let k = 0;
  const skip = () => {
    while (k < args.length && /\s/.test(args[k])) k++;
  };
  for (;;) {
    skip();
    if (args[k] === '"') {
      for (k++; k < args.length; k++) {
        if (args[k] === '"' && args[k + 1] === '"') {
          out += '"';
          k++;
        } else if (args[k] === '"') break;
        else out += args[k];
      }
      if (k >= args.length) return null; // never closed
      k++;
    } else {
      const word = /^[A-Za-z]+/.exec(args.slice(k))?.[0];
      const value = word ? STRING_CONSTANTS.get(word.toLowerCase()) : undefined;
      if (value === undefined) return null;
      out += value;
      k += word.length;
    }
    skip();
    if (k >= args.length) return out;
    if (args[k] !== "&" && args[k] !== "+") return null;
    k++;
  }
}

// ------------------------------------------------------------------ parsing

const NAME = String.raw`(?:\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*[$%&!#@]?)`;
// `Dim` is read as a modifier too: what follows it is a field, as it is after
// `Public`.
const MODIFIER_RE = new RegExp(String.raw`^\s*(${MODIFIERS}|Dim)\b\s*`, "i");
const TYPE_OPEN = new RegExp(String.raw`^(Module|Class|Interface|CoClass|Enum|Type|Union)\s+(${NAME})(.*)$`, "i");
const TYPE_OR_PROC_END = /^End\s+(Sub|Function|Property|Module|Class|Interface|CoClass|Enum|Type|Union)\b/i;
const DECLARE = new RegExp(
  String.raw`^(?:DeclareWide|Declare)\s+(?:PtrSafe\s+)?(Sub|Function|Property\s+(?:Get|Let|Set))\s+(${NAME})`,
  "i",
);
// `As` is never the name a procedure, event or constant declares: `Function As
// Long` in a Type is a field called Function.
const PROC = new RegExp(String.raw`^(Sub|Function|Property\s+(?:Get|Let|Set))\s+(?!As\b)(${NAME})`, "i");
const EVENT = new RegExp(String.raw`^Event\s+(?!As\b)(${NAME})`, "i");
const DELEGATE = new RegExp(String.raw`^Delegate\s+(Sub|Function)\s+(${NAME})`, "i");
const CONST = /^Const\s+(?!As\b)(.*)$/i;
const ALIAS = new RegExp(String.raw`^Alias\s+(${NAME})\s+As\s+(\S.*)$`, "i");
const LEADING_NAME = new RegExp(String.raw`^\s*(${NAME})`);
const FIELD = new RegExp(String.raw`^\s*(${NAME})\s*(\(|As\b|$)`, "i");
const ENUM_VALUE = new RegExp(String.raw`^(${NAME})\s*(=|$)`);
// A procedure whose body and `End` are on its own line: `Function F() As Long:
// Return 1: End Function`. It opens nothing.
const ONE_LINE_PROC = /:\s*End\s+(?:Sub|Function|Property)\s*$/i;

// Types whose procedures have bodies, and so an `End Sub` to wait for.
const WITH_BODIES = new Set(["module", "class", "type", "union"]);

const unbracket = (name) => name.replace(/^\[(.*)\]$/, "$1");

function kindOf(keyword) {
  const k = keyword.toLowerCase();
  if (k.startsWith("property")) return "property";
  return k; // sub, function
}

/**
 * Every type a source file declares, every member each declares, and every
 * `Alias`.
 *
 * @returns {{types: object[], aliases: object[], problems: {file, line, why}[]}}
 *   Each type is `{kind, name, file, line, vis, hidden, attributes, container,
 *   members, inherits, implements, interfaces, extends, signature, attrs,
 *   description}`; `kind` is module, class, interface, coclass, enum, type or
 *   union, `container` the name of the type it is declared in or null,
 *   `interfaces` a CoClass's `{name, isDefault, isSource}`. Each member is
 *   `{name, kind, vis, hidden, line, signature, attrs, description, returnType,
 *   accessor}` with `kind` sub, function, property, event, delegate, const,
 *   field or enumvalue. An alias is `{kind: "alias", name, target, vis, hidden,
 *   file, line, container, signature, attrs, description}`; it is kept apart
 *   from the types, which are what a package can be asked for by name.
 *
 *   - `attributes` (a type's) is the names of its attributes; `attrs`, on a type
 *     and on a member, is each as `{name, args}`, `args` the text between its
 *     parentheses as written, white space outside strings made single spaces,
 *     or null when it has none.
 *   - `signature` is the declaration as written, on one line, without its
 *     attributes: its modifiers, parameters, return type, and for a Declare its
 *     Lib and Alias; a Const keeps its `= value`, an enumeration value its own,
 *     a type its `Extends`. Of several names declared by one statement
 *     (`Public A, B As Long`), each gets the statement's modifiers before its
 *     own piece. A procedure whose body shares its line stops at the colon.
 *   - `description` is the text of its `[Description(...)]`: a literal, or
 *     literals joined by `&` with the line-break constants (written \n); null
 *     when it has none or is not made of those.
 *   - `returnType` is the type after the parameter list of a Function, a
 *     Property Get or a Delegate Function; `accessor` is Get, Let or Set for a
 *     property procedure. Both are null where they do not apply.
 */
export function parseTwin(src, file = "") {
  const lines = logicalLinesRaw(src);
  const types = [];
  const aliases = [];
  const problems = [];
  const stack = []; // open types, and {proc: true} for a body
  let pending = []; // attributes, as {name, args}, waiting for their declaration

  const openType = () => {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].type) return stack[k].type;
    return null;
  };
  const inBody = () => stack.some((s) => s.proc);

  for (let li = 0; li < lines.length; li++) {
    let { text, raw } = lines[li];
    const { line } = lines[li];
    if (!text.trim() || /^\s*#/.test(text)) continue; // #If, #Region, #Const

    const inEnum = stack[stack.length - 1]?.type?.kind === "enum";
    let split = splitAttributes(text, raw, inEnum);
    while (split.open && li + 1 < lines.length) {
      text += " " + lines[++li].text;
      raw += " " + lines[li].raw;
      split = splitAttributes(text, raw, inEnum);
    }
    pending.push(...split.attrs);
    const rest = split.rest.trim();
    if (!rest) continue;
    const restRaw = split.restRaw.slice(split.rest.length - split.rest.trimStart().length).slice(0, rest.length);
    const attrs = pending;
    const attributes = attrs.map((a) => a.name);
    pending = [];

    const end = TYPE_OR_PROC_END.exec(rest);
    if (end) {
      const k = end[1].toLowerCase();
      const top = stack[stack.length - 1];
      if (k === "sub" || k === "function" || k === "property") {
        if (top?.proc) stack.pop();
        else problems.push({ file, line, why: `End ${end[1]} with no procedure open` });
      } else if (top?.type?.kind === k) {
        stack.pop();
      } else {
        problems.push({ file, line, why: `End ${end[1]} does not close what is open` });
      }
      continue;
    }
    if (inBody()) continue;

    // A modifier word followed by `As` or `(` is the declaration's name, not a
    // modifier: `Public Default As Boolean` on CommandButton, and `Public
    // Public As Boolean` on UserControl. In an Enum, where a value has no
    // modifiers, so is the first word of `Static = 0`, `ReadOnly = 1` or `Shared`.
    const parent = openType();
    let decl = rest;
    let at = 0; // where decl starts in rest
    const modifiers = [];
    for (let m; (m = MODIFIER_RE.exec(decl)); ) {
      const after = decl.slice(m[0].length);
      if ((modifiers.length || parent?.kind === "enum") && /^(As\b|\(|=|$)/i.test(after)) break;
      modifiers.push(m[1].toLowerCase());
      at += m[0].length;
      decl = after;
    }
    const declRaw = restRaw.slice(at);
    const vis = modifiers.includes("private")
      ? "private"
      : modifiers.includes("friend")
        ? "friend"
        : modifiers.includes("protected")
          ? "protected"
          : modifiers.includes("public") || modifiers.includes("global")
            ? "public"
            : null;
    const hidden = attributes.some((a) => /^(Hidden|Restricted)$/i.test(a));

    // The declaration up to a colon, on one line, its strings as written.
    const sig = () => {
      const e = statementEnd(rest);
      return collapse(rest.slice(0, e), restRaw.slice(0, e));
    };
    // The same for one of the names a statement declares, as the text before the
    // list (`from` characters of rest: the modifiers, and `Const`) and the
    // [a, b) piece of the list.
    const pieceSig = (from, [a, b]) => {
      const piece = rest.slice(from + a, from + b);
      const e = statementEnd(piece);
      return collapse(
        rest.slice(0, from) + piece.slice(0, e),
        restRaw.slice(0, from) + restRaw.slice(from + a, from + a + e),
      );
    };
    // What every declaration records beside its name and kind.
    const info = (signature, more) => ({
      signature,
      attrs,
      description: descriptionOf(attrs),
      returnType: null,
      accessor: null,
      ...more,
    });

    const open = TYPE_OPEN.exec(decl);
    if (open && !/^As$/i.test(open[2])) {
      const kind = open[1].toLowerCase();
      const name = unbracket(open[2]);
      if (kind === "interface" && parent?.kind === "coclass") {
        parent.interfaces.push({
          name,
          isDefault: attributes.some((a) => /^Default$/i.test(a)),
          isSource: attributes.some((a) => /^Source$/i.test(a)),
        });
        continue;
      }
      const type = {
        kind,
        name,
        file,
        line,
        vis: vis ?? "public",
        hidden,
        attributes,
        container: parent ? parent.name : null,
        members: [],
        inherits: [],
        implements: [],
        interfaces: [],
        extends: /\bExtends\s+([\w.[\]]+)/i.exec(open[3])?.[1] ?? null,
        signature: sig(),
        attrs,
        description: descriptionOf(attrs),
      };
      types.push(type);
      stack.push({ type });
      continue;
    }

    // `Alias As Long` in a Type is a field called Alias.
    if (/^Alias\s+(?!As\b)/i.test(decl)) {
      const a = ALIAS.exec(decl);
      if (!a) {
        problems.push({ file, line, why: `not an alias: ${rest.slice(0, 60)}` });
        continue;
      }
      const from = decl.length - a[2].length;
      const e = statementEnd(a[2]);
      aliases.push({
        kind: "alias",
        name: unbracket(a[1]),
        target: collapse(a[2].slice(0, e), declRaw.slice(from, from + e)),
        vis: vis ?? "public",
        hidden,
        file,
        line,
        container: parent ? parent.name : null,
        signature: sig(),
        attrs,
        description: descriptionOf(attrs),
      });
      continue;
    }
    if (!parent) {
      if (!/^(Option|Imports|Import\s+Library)\b/i.test(decl))
        problems.push({ file, line, why: `outside any type: ${rest.slice(0, 60)}` });
      continue;
    }

    let m;
    if ((m = /^Inherits\s+(?!As\b)([\w.[\]]+)/i.exec(decl))) {
      parent.inherits.push(m[1]);
      continue;
    }
    if ((m = /^Implements\s+(?!As\b)([\w.[\]]+)/i.exec(decl))) {
      parent.implements.push(m[1]);
      continue;
    }

    if (parent.kind === "enum") {
      // The name is cut from the line as written: an escaped one can hold a string.
      if ((m = ENUM_VALUE.exec(decl)))
        add(parent, declRaw.slice(0, m[1].length), "enumvalue", "public", hidden, line, undefined, info(sig()));
      else problems.push({ file, line, why: `not an enumeration value: ${rest.slice(0, 60)}` });
      continue;
    }
    if ((m = DECLARE.exec(decl))) {
      add(
        parent,
        m[2],
        kindOf(m[1]),
        vis,
        hidden,
        line,
        "private",
        info(sig(), shapeOf(m[1], decl, declRaw, m[0].length)),
      );
      continue;
    }
    if ((m = PROC.exec(decl))) {
      add(
        parent,
        m[2],
        kindOf(m[1]),
        vis,
        hidden,
        line,
        "public",
        info(sig(), shapeOf(m[1], decl, declRaw, m[0].length)),
      );
      if (WITH_BODIES.has(parent.kind) && !modifiers.includes("mustoverride") && !ONE_LINE_PROC.test(rest))
        stack.push({ proc: true });
      continue;
    }
    if ((m = EVENT.exec(decl))) {
      add(parent, m[1], "event", vis, hidden, line, "public", info(sig()));
      continue;
    }
    if ((m = DELEGATE.exec(decl))) {
      add(
        parent,
        m[2],
        "delegate",
        vis,
        hidden,
        line,
        "public",
        info(sig(), shapeOf(m[1], decl, declRaw, m[0].length)),
      );
      continue;
    }
    if ((m = CONST.exec(decl))) {
      const from = at + decl.length - m[1].length;
      for (const range of topLevelPieces(m[1])) {
        const n = LEADING_NAME.exec(m[1].slice(range[0], range[1]));
        if (n) add(parent, n[1], "const", vis, hidden, line, "private", info(pieceSig(from, range)));
      }
      continue;
    }
    if (modifiers.length || parent.kind === "type" || parent.kind === "union") {
      for (const range of topLevelPieces(decl)) {
        const n = FIELD.exec(decl.slice(range[0], range[1]));
        if (n) add(parent, n[1], "field", vis, hidden, line, "private", info(pieceSig(at, range)));
      }
      continue;
    }
    if (/^(Option|Attribute|Events|Def[A-Za-z]+\s)/i.test(decl)) continue;
    problems.push({ file, line, why: `not understood in ${parent.kind} ${parent.name}: ${rest.slice(0, 80)}` });
  }

  for (const s of stack) {
    problems.push({
      file,
      line: s.type?.line ?? 0,
      why: `${s.type ? `${s.type.kind} ${s.type.name}` : "a procedure"} is never closed`,
    });
  }
  return { types, aliases, problems };

  // `fallback` is the visibility a member has with no modifier in a Module or
  // Class: Public for a procedure, Private for a variable, constant or Declare.
  // Everything in an Interface, CoClass, Enum, Type or Union is public.
  function add(type, rawName, kind, vis, hidden, line, fallback, extra) {
    const implicit = ["interface", "coclass", "enum", "type", "union"].includes(type.kind) ? "public" : fallback;
    type.members.push({ name: unbracket(rawName), kind, vis: vis ?? implicit, hidden, line, ...extra });
  }
}

// The pieces of a list at its commas outside parentheses, as [from, to) ranges
// of `s`: `X(1, 2) As Long, Y As Long` is two. A comma with nothing after it
// ends no piece.
function topLevelPieces(s) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let k = 0; k < s.length; k++) {
    if (s[k] === "(") depth++;
    else if (s[k] === ")") depth--;
    else if (s[k] === "," && depth === 0) {
      out.push([from, k]);
      from = k + 1;
    }
  }
  if (s.slice(from).trim()) out.push([from, s.length]);
  return out;
}

// What a procedure declaration says besides its name: Get, Let or Set for a
// property procedure, and the type a Function, Property Get or Delegate Function
// returns. `keyword` is `Sub`, `Function` or `Property Get` as written, and the
// name ends at `nameEnd` in `decl`, the declaration after its modifiers, with
// `declRaw` its twin from logicalLinesRaw.
function shapeOf(keyword, decl, declRaw, nameEnd) {
  const [word, accessor] = keyword.toLowerCase().split(/\s+/);
  const kind = word === "property" ? accessor[0].toUpperCase() + accessor.slice(1) : null;
  const hasResult = word === "function" || kind === "Get";
  return { returnType: hasResult ? returnTypeOf(decl.slice(nameEnd), declRaw.slice(nameEnd)) : null, accessor: kind };
}

// The type after `As` that follows a parameter list, in the text after a
// procedure's name: `(ByVal H As LongPtr) As Long Implements IFoo.Bar` gives
// `Long`. `Lib "..." Alias "..."` and `CDecl` may stand between the name and the
// list, and a generic procedure's `(Of T)` before it. With no list -- `Property
// Get Count As Long` -- the first `As` is it. An `As` before the first
// parenthesis ends the search for a list: the parenthesis is the type's, as in
// `As Collection(Of Long)`.
function returnTypeOf(text, raw) {
  let from = 0;
  let listed = false;
  for (;;) {
    const open = text.indexOf("(", from);
    if (open < 0 || /\bAs\b/i.test(text.slice(from, open))) break;
    let depth = 0;
    let k = open;
    for (; k < text.length; k++) {
      if (text[k] === "(") depth++;
      else if (text[k] === ")" && --depth === 0) break;
    }
    if (k >= text.length) return null;
    listed = true;
    const generic = /^\(\s*Of\b/i.test(text.slice(open));
    from = k + 1;
    if (!generic) break;
  }
  const as = /(?:^|\s)As\s+/i.exec(text.slice(from));
  if (!as || (listed && text.slice(from, from + as.index).trim())) return null;
  const start = from + as.index + as[0].length;
  const type = text.slice(start);
  let end = statementEnd(type);
  const implementsAt = /\sImplements\b/i.exec(type.slice(0, end));
  if (implementsAt) end = implementsAt.index;
  return collapse(type.slice(0, end), raw.slice(start, start + end)) || null;
}

// ----------------------------------------------------------------- packages

/**
 * The project name a package's Settings file gives, `project.name`, or null.
 * It is the name code and the compiler know a package by, which is not always
 * its folder's: TwinBasicAssertions is `Assert`.
 *
 * @param {string | null | undefined} settings  the text of the Settings file
 */
export function projectNameOf(settings) {
  if (typeof settings !== "string") return null;
  try {
    const name = JSON.parse(settings.replace(/^﻿/, ""))["project.name"];
    if (typeof name === "string" && name) return name;
  } catch {
    /* not strict JSON: read it as text below */
  }
  return /"project\.name"\s*:\s*"([^"]+)"/.exec(settings)?.[1] ?? null;
}

/**
 * Parse the .twin sources of a package held in memory, in the order given: those
 * of `files` whose path is under `Sources/` and ends in `.twin`, the paths
 * relative to the package's root and written with `/`. `settings` is the text of
 * its Settings file, which gives `project`.
 *
 * @param {{path: string, text: string}[]} files
 * @param {string | null} [settings]
 * @returns {{project: string | null, types: object[], aliases: object[],
 *   problems: object[]}}  parseTwin's, of every file together
 */
export function parseSources(files, settings = null) {
  const types = [];
  const aliases = [];
  const problems = [];
  for (const f of files) {
    if (!/^Sources\//i.test(f.path) || !/\.twin$/i.test(f.path)) continue;
    const r = parseTwin(f.text, f.path);
    types.push(...r.types);
    aliases.push(...r.aliases);
    problems.push(...r.problems);
  }
  return { project: projectNameOf(settings), types, aliases, problems };
}

/**
 * Parse every .twin file of an exported package, whose tree is `Settings` plus
 * `Sources/`, as parseSources does. The export's own `Packages/` folder, which
 * holds copies of the packages this one references, is not read.
 */
export function parsePackage(dir) {
  const files = twinFiles(path.join(dir, "Sources")).map((file) => ({
    path: path.relative(dir, file).replaceAll("\\", "/"),
    text: readFileSync(file, "utf8"),
  }));
  let settings = null;
  try {
    settings = readFileSync(path.join(dir, "Settings"), "utf8");
  } catch {
    /* no Settings: an export that is not a project */
  }
  return parseSources(files, settings);
}

function twinFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) twinFiles(p, out);
    else if (e.name.toLowerCase().endsWith(".twin")) out.push(p);
  }
  return out;
}

/**
 * Whether a type can be named from outside its package: declared Public (or
 * with no modifier), and not inside a type that is not.
 */
export function isPublicType(type, types) {
  for (let t = type; t; ) {
    if (t.vis !== "public") return false;
    if (!t.container) return true;
    t = types.find((x) => x.name === t.container && x.file === t.file && x !== t) ?? null;
  }
  return true;
}

// ----------------------------------------------------------- the snapshot

// Attributes that make a class a control a form can hold.
const CONTROL_ATTRIBUTES = /^(WindowsControl|CustomControl|COMControl)$/i;
// Interfaces every COM interface extends; naming them adds nothing.
const ROOT_INTERFACES = /^(stdole\.)?(IUnknown|IDispatch)$/i;

// A type named in `Inherits`, `Extends` or a CoClass's interface list: in the
// package written before the dot, else in the naming type's own package, else
// in any package that has one of the kind wanted.
function resolver(parsed) {
  return (ref, fromPkg, kinds) => {
    const clean = ref.replace(/[[\]]/g, "");
    const dot = clean.lastIndexOf(".");
    const name = dot < 0 ? clean : clean.slice(dot + 1);
    const want = (t) => t.name.toLowerCase() === name.toLowerCase() && kinds.includes(t.kind);
    const order =
      dot < 0
        ? [fromPkg, ...[...parsed.keys()].filter((k) => k !== fromPkg)]
        : [...parsed.keys()].filter((k) => k.toLowerCase() === clean.slice(0, dot).toLowerCase());
    for (const pkg of order) {
      const t = parsed.get(pkg)?.find(want);
      if (t) return { pkg, type: t };
    }
    return null;
  };
}

/**
 * The record builder/package-api.json keeps of each package's types, from
 * parsed packages keyed by project name.
 *
 * Every type a package declares is kept, public or not. Which ones code outside
 * the package can reach is not decidable from the source alone, and the pages
 * document both kinds: CEF's CefLogSeverity is a Public Enum inside a Private
 * Module, CustomControls' Borders is a Private Class that code reaches through
 * a control's Borders property, CheckBox's members are declared on a Private
 * Class it inherits from, and VB's Clipboard is a Public CoClass whose members
 * are declared on a Private Interface. So each is marked, not dropped: `public:
 * false` on one declared Private, or declared inside a Private type -- except
 * an Enum, which the corpus declares inside Private modules for public use.
 *
 * A type that is not public keeps its members only when a public type exposes
 * them: a class a public class inherits from, an interface a public CoClass is
 * built on, and the interfaces those extend. The rest -- the Win32
 * declarations the VB and CEF packages wrap in Private modules, mostly -- would
 * double the file for members no page documents; a page about one still finds
 * it by name.
 *
 * @param {Map<string, object[]>} parsed  project name -> parseTwin's types
 * @returns {{packages: Object<string, object[]>, unresolved: string[]}}
 */
export function apiSnapshot(parsed) {
  const resolve = resolver(parsed);
  const out = {};
  const unresolved = [];

  const isPublicIn = (t, types) => (t.kind === "enum" ? t.vis === "public" : isPublicType(t, types));
  const exposed = new Set();
  const queue = [];
  for (const [pkg, types] of parsed) {
    for (const t of types)
      if (["class", "coclass", "interface"].includes(t.kind) && isPublicIn(t, types)) queue.push({ pkg, t });
  }
  const expose = (hit) => {
    if (hit && !exposed.has(hit.type)) {
      exposed.add(hit.type);
      queue.push({ pkg: hit.pkg, t: hit.type });
    }
  };
  while (queue.length) {
    const { pkg, t } = queue.shift();
    for (const ref of t.inherits) expose(resolve(ref, pkg, ["class"]));
    for (const i of t.interfaces) expose(resolve(i.name, pkg, ["interface"]));
    if (t.extends && !ROOT_INTERFACES.test(t.extends)) expose(resolve(t.extends, pkg, ["interface"]));
  }

  for (const [pkg, types] of parsed) {
    const list = [];
    for (const t of types) {
      const isPublic = isPublicIn(t, types);
      const rec = { name: t.name, kind: t.kind };
      if (t.container) rec.in = t.container;
      if (!isPublic) rec.public = false;
      if (t.hidden) rec.hidden = true;
      if (t.kind === "class" && t.attributes.some((a) => CONTROL_ATTRIBUTES.test(a))) rec.control = true;
      if (t.kind === "coclass") {
        const def = t.interfaces.find((i) => i.isDefault);
        if (def) rec.default = def.name;
        const src = t.interfaces.filter((i) => i.isSource).map((i) => i.name);
        if (src.length) rec.source = src;
        const other = t.interfaces.filter((i) => !i.isDefault && !i.isSource).map((i) => i.name);
        if (other.length) rec.interfaces = other;
      }
      const qualify = (ref, kinds) => {
        const hit = resolve(ref, pkg, kinds);
        if (!hit) {
          unresolved.push(`${pkg}.${t.name}: ${ref}`);
          return ref.replace(/[[\]]/g, "");
        }
        return `${hit.pkg}.${hit.type.name}`;
      };
      if (t.inherits.length) rec.inherits = t.inherits.map((b) => qualify(b, ["class"]));
      if (t.extends && !ROOT_INTERFACES.test(t.extends)) rec.extends = qualify(t.extends, ["interface"]);
      if (!isPublic && !exposed.has(t)) {
        list.push(rec);
        continue;
      }

      const members = t.members.filter((m) => m.vis === "public");
      if (t.kind === "enum") {
        rec.values = unique(members.map((m) => m.name));
      } else if (t.kind === "type" || t.kind === "union") {
        const fields = unique(members.filter((m) => m.kind === "field").map((m) => m.name));
        if (fields.length) rec.fields = fields;
        const methods = members.filter((m) => m.kind !== "field");
        if (methods.length) rec.members = kinds(methods);
      } else if (members.length) {
        rec.members = kinds(members);
      }
      const hidden = unique(members.filter((m) => m.hidden).map((m) => m.name));
      if (hidden.length) rec.hiddenMembers = hidden;
      list.push(rec);
    }
    if (list.length) out[pkg] = list;
  }
  return { packages: out, unresolved };
}

function unique(names) {
  const seen = new Set();
  return names.filter((n) => {
    const k = n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// {name: kind}, the first declaration of a name deciding its kind -- a
// Property Get and its Let are one property, and two overloads of LBound one
// function.
function kinds(members) {
  const out = {};
  const seen = new Set();
  for (const m of members) {
    const k = m.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out[m.name] = m.kind;
  }
  return out;
}
