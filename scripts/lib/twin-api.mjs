// The declarations an exported twinBASIC package makes, read from its .twin
// sources: every Module, Class, Interface, CoClass, Enum and Type, and every
// member each one declares, with its visibility and kind.
//
// It exists for the documentation's symbol index (WIP.HelpAddin.md, Stage 3),
// whose package half `indexer/twin-index.mjs derive` writes. The index takes its
// entries from the pages; what it needs from the packages is what only the
// source says -- the kind of a member documented on a page of its own, the
// values of an enumeration, the interface a CoClass's members are declared on
// -- and, as a side effect, which public symbols have no page at all.
//
// **This is a declaration scanner, not a compiler.** It reads each logical line
// once, keeps no expression, and evaluates no #If: every branch of a conditional
// is read, each as an alternative that starts from the block structure the #If
// found (`branch`, below), and what it cannot place goes to `problems` rather than
// being guessed at. Eighteen ways to misread this corpus, the first seven met in the
// shipped packages (scripts/census_attributes.mjs lists six more, about
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
//      BETA 1005 reads it so, whatever the brackets hold:
//      `[Hidden]`, `[Hidden, Restricted]` and `[Description("x")]` on a line of
//      their own each declare a value of that name and take the next number, and
//      an attribute in front of a value on the same line (`[Hidden] Red = 5`)
//      is refused, TB5182. So an Enum value cannot carry an attribute. The
//      scanner reads the same-line form as an attribute list all the same.
//  12. The branches of an #If are alternatives. Two procedure headers that
//      share one body (`#If VBA7 Then Public Property Get hWnd() As LongPtr
//      #Else Public Property Get hWnd() As Long #End If`, then one body) are two
//      procedures, not a procedure and part of its body: read in sequence the
//      second was lost, 425 members of the 54 indexed packages, and an `End Sub` in
//      each branch was "End Sub with no procedure open". An attribute before the
//      #If belongs to the declaration in every branch.
//  13. A Type's fields are bare, so a modifier's name is a field's: `Default As
//      Long`, `Static As Long`. A line that starts with `[` in a Type is an
//      attribute list, whatever follows it; `[Class] As Long` is not a field.
//      BETA 1005 also compiles a variable with an initialiser and no `As`
//      (`Public n& = 0`, `Dim p = 5`) in a Module and a Class.
//  14. `Inherits A, B` and `Implements A, B` list several types, `Implements`
//      may name `WithEvents T`, a CoClass's `Interface` line may be qualified
//      (`stdole.IUnknown`), and `[Hidden(False)]` hides nothing.
//  15. `Function F() As T Overrides Base.F` has a result type of T; the clause
//      after it (`Implements`, `Overrides` or `Handles`) is not part of it.
//  16. A colon joins statements, and every one is a declaration of its own:
//      `Private x As Long: Private y As Long`, `Sub P(): End Sub: Sub Q(): End
//      Sub`, `Class C: End Class`, `Enum E: A: B: End Enum`, `G = 1: H = 2`. The
//      scanner reads each as a line (`statements`). BETA 1005 compiles them all.
//  17. An identifier holds every character past ASCII, a no-break space and an
//      emoji included: `Größe`, `Café`, `日本語`. `\b` is no boundary for it, so
//      `Publicé` is a name and not the modifier `Public`; WORD_END is.
//  18. A type-declaration character ends a name and gives its type: `Function
//      Size%()` returns an Integer, `Public n&` is a Long, `FLL^` a LongLong. It
//      is not part of the name, except in brackets (`Function [Chr$]`).

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
// is the blanked form, in which a quote is always a literal's delimiter. White
// space is ASCII's: a space past ASCII is part of an identifier (see WORD_END).
function collapse(text, raw) {
  let out = "";
  let inStr = false;
  let gap = false;
  for (let k = 0; k < text.length; k++) {
    if (text[k] === '"') inStr = !inStr;
    else if (!inStr && " \t\v\f".includes(text[k])) {
      gap = true;
      continue;
    }
    if (gap && out) out += " ";
    gap = false;
    out += raw[k];
  }
  return out;
}

// The statements of a logical line, each as `{text, raw}`: the line cut at every `:`
// outside brackets and parentheses that does not begin `:=` (a named argument). The
// compiler reads `Private x As Long: Private y As Long`, `Const A = 1: Const B = 2`,
// `Sub P(): End Sub: Sub Q(): End Sub`, `Class A: Inherits B`, `Class C: End Class`,
// `G = 1: H = 2` and `Enum E: A: B: End Enum` as the lines they stand for (BETA
// 1005), and `Done: End Sub` closes the procedure: a label is a statement of its
// own. The contents of strings are blanked in `text`, so a colon inside one is
// never seen.
function statements(text, raw) {
  const out = [];
  let depth = 0;
  let from = 0;
  const cut = (to) => {
    if (text.slice(from, to).trim()) out.push({ text: text.slice(from, to), raw: raw.slice(from, to) });
    from = to + 1;
  };
  for (let k = 0; k < text.length; k++) {
    const c = text[k];
    if (c === "[" || c === "(") depth++;
    else if ((c === "]" || c === ")") && depth > 0) depth--;
    else if (c === ":" && depth === 0 && text[k + 1] !== "=") cut(k);
  }
  cut(text.length);
  return out;
}

// Where the first statement of a text ends: the first `:` outside brackets that is
// not the start of `:=`. A line is cut into statements before it is read, so this
// finds a colon only in a text cut from the middle of one.
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
//
// In a Type or Union body (`inType`) a group is always an attribute list: BETA
// 1005 reads `[Class] As Long` as the attribute `Class` and a field called `As`,
// `[Plain](3) As Long` the same, and a group on a line of its own as the
// attributes of the next field (or of nothing, when `End Type` follows). It is
// never a field's name: a field named for a keyword is written bare, as
// `Default As Long` and `Static As Long` are.
function splitAttributes(text, raw, inEnum = false, inType = false) {
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
    if (inEnum) {
      if (after === "" || after[0] === "=") break;
    } else if (!inType && !attrs.length && /^[.=(]/.test(after) && !/[(,]/.test(inner)) break;
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

// Whether an optional-Bool attribute (`[Hidden]`, `[Restricted(False)]`, ...) is
// switched on: bare, or with an argument that is not the literal False (or 0).
const attributeOn = (a) => a.args == null || !/^(?:False|0)$/i.test(a.args.trim());

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

// An identifier is made of the ASCII letters, digits and `_`, and of every
// character past ASCII: BETA 1005 compiles `Größe`, `Café`, `日本語`, `x²`, `a−1`,
// an emoji, and a no-break space inside a name, all as part of it. Only the first
// character is more restricted, and only for a digit. So the classes below end at
// U+FFFF, which takes a character outside the BMP as its two surrogates; and a
// word boundary is spelt out, because `\b` treats a letter past ASCII as a
// non-word character: `Publicé` is not the modifier `Public`.
const WORD_END = String.raw`(?![A-Za-z0-9_\u0080-\uFFFF])`;
const WORD_START = String.raw`(?<![A-Za-z0-9_\u0080-\uFFFF])`;
// A name written without brackets may end in a type-declaration character, which
// gives the type of what it names (`Function Size%()`, `Public n&`, `Const S$ =`).
const NAME = String.raw`(?:\[[^\]]+\]|[A-Za-z_\u0080-\uFFFF][A-Za-z0-9_\u0080-\uFFFF]*[$%&!#@^]?)`;
// `Dim` is read as a modifier too: what follows it is a field, as it is after
// `Public`.
const MODIFIER_RE = new RegExp(String.raw`^\s*(${MODIFIERS}|Dim)${WORD_END}\s*`, "i");
const TYPE_OPEN = new RegExp(String.raw`^(Module|Class|Interface|CoClass|Enum|Type|Union)\s+(${NAME})(.*)$`, "i");
const TYPE_OR_PROC_END = new RegExp(
  String.raw`^End\s+(Sub|Function|Property|Module|Class|Interface|CoClass|Enum|Type|Union)${WORD_END}`,
  "i",
);
const DECLARE = new RegExp(
  String.raw`^(?:DeclareWide|Declare)\s+(?:PtrSafe\s+)?(Sub|Function|Property\s+(?:Get|Let|Set))\s+(${NAME})`,
  "i",
);
// `As` is never the name a procedure, event or constant declares: `Function As
// Long` in a Type is a field called Function.
const PROC = new RegExp(String.raw`^(Sub|Function|Property\s+(?:Get|Let|Set))\s+(?!As${WORD_END})(${NAME})`, "i");
const EVENT = new RegExp(String.raw`^Event\s+(?!As${WORD_END})(${NAME})`, "i");
const DELEGATE = new RegExp(String.raw`^Delegate\s+(Sub|Function)\s+(${NAME})`, "i");
const CONST = new RegExp(String.raw`^Const\s+(?!As${WORD_END})(.*)$`, "i");
const ALIAS = new RegExp(String.raw`^Alias\s+(${NAME})\s+As\s+(\S.*)$`, "i");
const LEADING_NAME = new RegExp(String.raw`^\s*(${NAME})`);
// A name that may be qualified by a package or a type, `stdole.IUnknown`, with
// no type-declaration character: what `Inherits`, `Implements` and a CoClass's
// `Interface` lines name.
const QNAME = String.raw`(?:\[[^\]]+\]|[A-Za-z_\u0080-\uFFFF][A-Za-z0-9_\u0080-\uFFFF]*)(?:\.(?:\[[^\]]+\]|[A-Za-z_\u0080-\uFFFF][A-Za-z0-9_\u0080-\uFFFF]*))*`;
const LISTED_NAME = new RegExp(String.raw`^\s*(?:WithEvents\s+)?(${QNAME})`, "i");
const COCLASS_INTERFACE = new RegExp(String.raw`^Interface\s+(${QNAME})`, "i");
// A field is a name, then a dimension list, `As`, an initialiser (`Public n& = 0`,
// `Dim p = 5`: legal in a Module and a Class, a Variant with the warning TB0003
// unless a suffix gives the type; a Type takes no initialiser), or nothing
// (`Public r`, a Variant).
const FIELD = new RegExp(String.raw`^\s*(${NAME})\s*(\(|As${WORD_END}|=|$)`, "i");
const ENUM_VALUE = new RegExp(String.raw`^(${NAME})\s*(=|$)`);
// A line of conditional compilation that bears on block structure; #Const,
// #Region and the rest are skipped.
const CONDITIONAL = new RegExp(String.raw`^\s*#\s*(ElseIf|Else|End\s*If|If)${WORD_END}`, "i");
// What follows a modifier word that makes it the declaration's own name.
const AFTER_MODIFIER_NAME = new RegExp(String.raw`^(As${WORD_END}|\(|=|$)`, "i");
const EXTENDS = new RegExp(String.raw`${WORD_START}Extends\s+([A-Za-z0-9_.[\]\u0080-\uFFFF]+)`, "i");
// `Alias As Long` in a Type is a field called Alias.
const ALIAS_STATEMENT = new RegExp(String.raw`^Alias\s+(?!As${WORD_END})`, "i");
const FILE_LEVEL = new RegExp(String.raw`^(Option|Imports|Import\s+Library)${WORD_END}`, "i");
const BASE_LIST = new RegExp(String.raw`^(Inherits|Implements)\s+(?!As${WORD_END})`, "i");
const AS_WORD = new RegExp(String.raw`${WORD_START}As${WORD_END}`, "i");
const GENERIC_LIST = new RegExp(String.raw`^\(\s*Of${WORD_END}`, "i");
// The clauses that may follow a result type: `Implements IFoo.F`, `Overrides Base.F`
// and `Handles Form.Load`.
const BINDING_CLAUSE = new RegExp(String.raw`\s(?:Implements|Overrides|Handles)${WORD_END}`, "i");

// Types whose procedures have bodies, and so an `End Sub` to wait for.
const WITH_BODIES = new Set(["module", "class", "type", "union"]);

const unbracket = (name) => name.replace(/^\[(.*)\]$/, "$1");

// The type a name's closing character gives: `Function Size%()` returns an Integer.
// BETA 1005 accepts these seven on a function, a Property Get, a delegate, a Declare,
// a variable, a field and a constant; on a Sub, a Property Let or Set and an Event it
// refuses one (TB5204), and with an `As` clause as well (TB5171). A name in brackets
// takes the character as part of itself, as VBA's `Function [Chr$]` does.
const TYPE_CHAR_TYPES = {
  "%": "Integer",
  "&": "Long",
  "!": "Single",
  "#": "Double",
  "@": "Currency",
  $: "String",
  "^": "LongLong",
};
// The condition an `#If Cond Then` or `#ElseIf Cond Then` line gives, as written with
// white space made single spaces; null for the other lines of an #If, and for one with no
// condition.
function conditionOfLine(text, raw) {
  const m = IF_LINE.exec(text);
  if (!m) return null;
  const cond = collapse(text.slice(m[0].length), raw.slice(m[0].length)).replace(THEN_END, "");
  return cond || null;
}
const IF_LINE = new RegExp(String.raw`^\s*#\s*(?:ElseIf|If)${WORD_END}\s*`, "i");
const THEN_END = new RegExp(String.raw`(?:^|\s)Then$`, "i");

// What must hold for a declaration in the branch the open #If blocks are in, outermost
// first: a block's own condition, and the negation of the branches before it, so that
// the branches of `#If Win64 Then ... #Else ... #End If` are `Win64` and `Not (Win64)`,
// and an #ElseIf after `A` is `Not (A) And B`. A condition that is not one plain name,
// `Not (x)` or `(...)` is put in parentheses where it joins another.
function conditionOf(blocks) {
  const plain = (c) => /^(?:[\w.\u0080-\uFFFF]+|Not \([^()]*\))$/.test(c);
  const wrap = (c) => (plain(c) ? c : `(${c})`);
  const parts = blocks.map((f) => {
    const now = f.exprs.length - 1;
    const all = [
      ...f.exprs
        .slice(0, now)
        .filter((e) => e != null)
        .map((e) => `Not (${e})`),
      ...(f.exprs[now] == null ? [] : [f.exprs[now]]),
    ];
    return all.length > 1 ? all.map(wrap).join(" And ") : (all[0] ?? "");
  });
  return parts.length > 1 ? parts.map(wrap).join(" And ") : parts[0];
}

const typeCharOf = (rawName) => (rawName[0] === "[" ? null : (TYPE_CHAR_TYPES[rawName.at(-1)] ?? null));

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
 *   `interfaces` a CoClass's `{name, isDefault, isSource}`, the name qualified
 *   as written (`stdole.IUnknown`), `inherits` and `implements` the names an
 *   `Inherits` or `Implements` statement lists, one statement perhaps several,
 *   and `hidden` true for a `[Hidden]` or `[Restricted]` not switched off with
 *   `(False)`. Each alternative header of an #If is a type of its own, and gets
 *   a copy of every member that follows. Each member is
 *   `{name, kind, vis, hidden, line, signature, attrs, description, returnType,
 *   accessor, cond, ifLine}` with `kind` sub, function, property, event,
 *   delegate, const, field or enumvalue; `cond` is the condition of the #If
 *   branch it is declared in (`Win64`, `Not (Win64)`, `Not (A) And B`, an outer
 *   block's and an inner's joined by And) among the blocks opened since its type
 *   was, and `ifLine` the line of the outermost of them, which names the block
 *   whose branches are alternatives; both are null for a member under no #If. An alias is `{kind: "alias", name, target, vis, hidden,
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
 *     own piece. A statement ends at a colon outside brackets and parentheses.
 *   - `description` is the text of its `[Description(...)]`: a literal, or
 *     literals joined by `&` with the line-break constants (written \n); null
 *     when it has none or is not made of those.
 *   - `returnType` is the type after the parameter list of a Function, a
 *     Property Get or a Delegate Function, else the type the name's closing
 *     type-declaration character gives (`Function Size%()` is Integer), which is
 *     then left off the name; `accessor` is Get, Let or Set for a property
 *     procedure. Both are null where they do not apply.
 */
export function parseTwin(src, file = "") {
  const lines = logicalLinesRaw(src);
  const types = [];
  const aliases = [];
  const problems = [];
  // Open types, and {proc: true} for a body. A type that is one of several
  // alternatives of an #If (see `branch`) is {type, alts}: what follows is
  // declared in each.
  const stack = [];
  let pending = []; // attributes, as {name, args}, waiting for their declaration
  const frames = []; // open #If blocks: where each began, and where each branch ended

  const openEntry = () => {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].type) return stack[k];
    return null;
  };
  const inBody = () => stack.some((s) => s.proc);

  // The same block structure: as deep, a procedure body where the other has one,
  // a type of the same kind where the other has one.
  const sameShape = (a, b) =>
    a.length === b.length && a.every((e, i) => (e.proc ? !!b[i].proc : !b[i].proc && e.type.kind === b[i].type.kind));

  // An #If, #ElseIf, #Else or #End If. Every branch is read, each from where the
  // #If found the block structure, so that two headers sharing a body, or an `End
  // Sub` in each branch, are what they are in the branch that is compiled. When
  // the branches end alike, what follows belongs to every alternative they left
  // open; when they end differently, the first branch's end is taken and the
  // difference reported.
  // `expr` is the condition the line gives (null for #Else and #End If): each
  // frame keeps those of its branches so far, which is how a member knows under
  // what it is declared (`conditionOf`).
  const branch = (word, line, expr) => {
    const w = word.toLowerCase().replace(/\s+/g, "");
    if (w === "if") {
      frames.push({ base: stack.slice(), pending: pending.slice(), ends: [], attrs: [], line, exprs: [expr] });
      return;
    }
    const f = frames[frames.length - 1];
    if (!f) {
      problems.push({ file, line, why: `#${word} with no #If open` });
      return;
    }
    f.ends.push(stack.slice());
    f.attrs.push(pending);
    if (w !== "endif") {
      f.exprs.push(expr);
      stack.splice(0, stack.length, ...f.base);
      pending = f.pending.slice();
      return;
    }
    frames.pop();
    // The attributes still waiting are those that any branch left waiting: an
    // `[InterfaceId(A)]` in one branch and an `[InterfaceId(B)]` in the other both
    // go to the declaration that follows.
    pending = [...new Set(f.attrs.flat())];
    const [first, ...others] = f.ends;
    if (!others.every((e) => sameShape(e, first))) {
      problems.push({ file, line, why: `the branches of the #If on line ${f.line} leave different blocks open` });
      stack.splice(0, stack.length, ...first);
      return;
    }
    stack.splice(
      0,
      stack.length,
      ...first.map((entry, k) => {
        if (entry.proc) return entry;
        const alts = [];
        for (const e of f.ends)
          for (const t of [e[k].type, ...(e[k].alts ?? [])]) if (t !== entry.type && !alts.includes(t)) alts.push(t);
        return alts.length ? { ...entry, alts } : entry;
      }),
    );
  };

  // A logical line holds several statements when they are joined by colons
  // (`Private x As Long: Private y As Long`, `Enum E: A: B: End Enum`), and each is
  // read as a line of its own. The ones of the current line still to come wait here.
  let queue = [];
  let queueLine = 0;
  for (let li = 0; li < lines.length || queue.length; ) {
    if (!queue.length) {
      const logical = lines[li++];
      const conditional = CONDITIONAL.exec(logical.text);
      if (conditional) {
        branch(conditional[1], logical.line, conditionOfLine(logical.text, logical.raw));
        continue;
      }
      if (!logical.text.trim() || /^\s*#/.test(logical.text)) continue; // #Region, #Const
      queue = statements(logical.text, logical.raw);
      queueLine = logical.line;
      continue;
    }
    let { text, raw } = queue.shift();
    const line = queueLine;

    const openKind = stack[stack.length - 1]?.type?.kind;
    const inEnum = openKind === "enum";
    const inType = openKind === "type" || openKind === "union";
    let split = splitAttributes(text, raw, inEnum, inType);
    if (split.open && !queue.length && li < lines.length) {
      // An attribute list that goes on over the next lines. Once closed, what the
      // joined text holds after it may be statements of their own.
      while (split.open && li < lines.length) {
        text += " " + lines[li].text;
        raw += " " + lines[li++].raw;
        split = splitAttributes(text, raw, inEnum, inType);
      }
      [{ text, raw }, ...queue] = statements(text, raw);
      split = splitAttributes(text, raw, inEnum, inType);
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
    // modifiers, so is the first word of `Static = 0`, `ReadOnly = 1` or `Shared`;
    // and so it is in a Type or Union, where a field is bare: `Default As Long`,
    // `Static As Long`, `Shared As Long` and `Global As Long` are fields (tbShellLib's
    // slD3D has one of them).
    const entry = openEntry();
    const parent = entry?.type ?? null;
    const bareNames = parent?.kind === "enum" || parent?.kind === "type" || parent?.kind === "union";
    let decl = rest;
    let at = 0; // where decl starts in rest
    const modifiers = [];
    for (let m; (m = MODIFIER_RE.exec(decl)); ) {
      const after = decl.slice(m[0].length);
      if ((modifiers.length || bareNames) && AFTER_MODIFIER_NAME.test(after)) break;
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
    const hidden = attrs.some((a) => /^(Hidden|Restricted)$/i.test(a.name) && attributeOn(a));

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
        // The name keeps its qualifier: `[Default] Interface stdole.IUnknown`.
        const named = COCLASS_INTERFACE.exec(decl)?.[1] ?? open[2];
        const item = {
          name: named.replace(/\[([^\]]*)\]/g, "$1"),
          isDefault: attributes.some((a) => /^Default$/i.test(a)),
          isSource: attributes.some((a) => /^Source$/i.test(a)),
        };
        for (const t of [parent, ...(entry.alts ?? [])]) t.interfaces.push({ ...item });
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
        extends: EXTENDS.exec(open[3])?.[1] ?? null,
        signature: sig(),
        attrs,
        description: descriptionOf(attrs),
      };
      types.push(type);
      stack.push({ type, outer: new Set(frames) });
      continue;
    }

    // `Alias As Long` in a Type is a field called Alias.
    if (ALIAS_STATEMENT.test(decl)) {
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
      if (!FILE_LEVEL.test(decl)) problems.push({ file, line, why: `outside any type: ${rest.slice(0, 60)}` });
      continue;
    }

    let m;
    // `Inherits A, B` and `Implements A, B` name every type they list. An
    // `Implements` item may be `WithEvents T` or end in `Via member = New T(...)`,
    // and neither is part of the name.
    if ((m = BASE_LIST.exec(decl))) {
      const list = decl.slice(m[0].length);
      const names = topLevelPieces(list.slice(0, statementEnd(list)))
        .map(([a, b]) => LISTED_NAME.exec(list.slice(a, b))?.[1])
        .filter(Boolean);
      const key = m[1].toLowerCase() === "inherits" ? "inherits" : "implements";
      for (const t of [parent, ...(entry.alts ?? [])]) t[key].push(...names);
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
      // Public with no modifier, in a Module and in a Type: another module calls
      // it. A Class takes only a Private Declare (TB5227), so what it has with no
      // modifier is an error, never a Private member.
      add(
        parent,
        m[2],
        kindOf(m[1]),
        vis,
        hidden,
        line,
        "public",
        info(sig(), shapeOf(m[1], decl, declRaw, m[0].length, m[2])),
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
        info(sig(), shapeOf(m[1], decl, declRaw, m[0].length, m[2])),
      );
      if (WITH_BODIES.has(parent.kind) && !modifiers.includes("mustoverride")) stack.push({ proc: true });
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
        info(sig(), shapeOf(m[1], decl, declRaw, m[0].length, m[2])),
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
      let found = 0;
      for (const range of topLevelPieces(decl)) {
        const n = FIELD.exec(decl.slice(range[0], range[1]));
        if (n) {
          add(parent, n[1], "field", vis, hidden, line, "private", info(pieceSig(at, range)));
          found++;
        }
      }
      // `[Class] As Long` in a Type: the compiler reads the bracket as an attribute
      // and `As` as a field name, and refuses it (TB5182). Not a field, and not
      // something to lose without a word.
      if (!found) problems.push({ file, line, why: `no field in ${parent.kind} ${parent.name}: ${rest.slice(0, 80)}` });
      continue;
    }
    if (/^(Option|Attribute|Events|Def[A-Za-z]+\s)/i.test(decl)) continue;
    problems.push({ file, line, why: `not understood in ${parent.kind} ${parent.name}: ${rest.slice(0, 80)}` });
  }

  for (const f of frames) problems.push({ file, line: f.line, why: "this #If is never closed" });
  for (const s of stack) {
    problems.push({
      file,
      line: s.type?.line ?? 0,
      why: `${s.type ? `${s.type.kind} ${s.type.name}` : "a procedure"} is never closed`,
    });
  }
  return { types, aliases, problems };

  // `fallback` is the visibility a member has with no modifier in a Module or
  // Class: Public for a procedure or a Declare, Private for a variable or a
  // constant. Everything in an Interface, CoClass, Enum, Type or Union is
  // public. A member of an alternative type (see `branch`) is added to each.
  function add(type, rawName, kind, vis, hidden, line, fallback, extra) {
    const implicit = ["interface", "coclass", "enum", "type", "union"].includes(type.kind) ? "public" : fallback;
    // A type-declaration character is part of a name written without brackets only as
    // a hint to its type; an enumeration value has none.
    const name = kind !== "enumvalue" && typeCharOf(rawName) ? rawName.slice(0, -1) : unbracket(rawName);
    // The #If blocks this member is declared in, those opened since its type was:
    // under what it exists, and which block it is one alternative of.
    const entry = stack.findLast((s) => s.type === type);
    const within = frames.filter((f) => !entry?.outer?.has(f));
    const member = {
      name,
      kind,
      vis: vis ?? implicit,
      hidden,
      line,
      ...extra,
      cond: within.length ? conditionOf(within) : null,
      ifLine: within[0]?.line ?? null,
    };
    type.members.push(member);
    for (const alt of entry?.alts ?? []) alt.members.push({ ...member });
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
function shapeOf(keyword, decl, declRaw, nameEnd, rawName) {
  const [word, accessor] = keyword.toLowerCase().split(/\s+/);
  const kind = word === "property" ? accessor[0].toUpperCase() + accessor.slice(1) : null;
  const hasResult = word === "function" || kind === "Get";
  // The type is the `As` clause's, else the one the name's last character gives.
  const returnType = hasResult
    ? (returnTypeOf(decl.slice(nameEnd), declRaw.slice(nameEnd)) ?? typeCharOf(rawName))
    : null;
  return { returnType, accessor: kind };
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
    if (open < 0 || AS_WORD.test(text.slice(from, open))) break;
    let depth = 0;
    let k = open;
    for (; k < text.length; k++) {
      if (text[k] === "(") depth++;
      else if (text[k] === ")" && --depth === 0) break;
    }
    if (k >= text.length) return null;
    listed = true;
    const generic = GENERIC_LIST.test(text.slice(open));
    from = k + 1;
    if (!generic) break;
  }
  const as = /(?:^|\s)As\s+/i.exec(text.slice(from));
  if (!as || (listed && text.slice(from, from + as.index).trim())) return null;
  const start = from + as.index + as[0].length;
  const type = text.slice(start);
  let end = statementEnd(type);
  // The binding clauses that may follow the type are not part of it: `Implements
  // IFoo.F`, `Overrides Base.F` and `Handles Form.Load`.
  const clauseAt = BINDING_CLAUSE.exec(type.slice(0, end));
  if (clauseAt) end = clauseAt.index;
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
