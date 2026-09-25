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
// being guessed at. Seven ways to misread this corpus, each met in the BETA 983
// packages (scripts/census_attributes.mjs lists six more, about attributes):
//
//   1. A Type is not a record only. `Type HDC` in the VB package declares
//      Private Subs with bodies, and a scanner that thinks a Type holds fields
//      reads their `End Sub` as closing nothing -- 1,388 of them.
//   2. `Alias HINSTANCE As LongPtr` is a statement at file level, in CEF.
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

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// ------------------------------------------------------------------ lexing

/**
 * The logical lines of a source file: comments removed, the contents of string
 * literals blanked (their quotes kept, so a comma or bracket inside one is
 * never read as syntax), and lines ending in ` _` joined to the next.
 *
 * @returns {{text: string, line: number}[]} `line` is the 1-based line the
 *   logical line starts on
 */
export function logicalLines(src) {
  const raw = String(src).replace(/^﻿/, "").split(/\r?\n/);
  const out = [];
  let buf = "";
  let start = 0;
  let inBlock = false;          // inside /* ... */, which may span lines
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    let t = "";
    let inStr = false;
    for (let k = 0; k < s.length; k++) {
      const c = s[k];
      if (inBlock) {
        if (c === "*" && s[k + 1] === "/") { inBlock = false; k++; t += " "; }
        continue;
      }
      if (inStr) {
        if (c === '"' && s[k + 1] === '"') { t += "  "; k++; continue; }
        if (c === '"') inStr = false;
        t += c === '"' ? c : " ";
        continue;
      }
      if (c === '"') { inStr = true; t += c; continue; }
      if (c === "/" && s[k + 1] === "*") { inBlock = true; k++; continue; }
      if (c === "'") break;
      t += c;
    }
    if (/^\s*Rem(\s|$)/i.test(t)) t = "";
    if (!buf) start = i + 1;
    if (/(^|\s)_\s*$/.test(t)) { buf += t.replace(/_\s*$/, " "); continue; }
    out.push({ text: buf + t, line: start });
    buf = "";
  }
  if (buf) out.push({ text: buf, line: start });
  return out;
}

// Leading attribute groups, `[A, B(1)] [C]`, split off a logical line. An
// escaped identifier used as an expression -- `[_HiddenModule].Foo`,
// `[_MAX] = 0` -- is not an attribute, and ends the run where it starts.
// `open` is true when a bracket is still unclosed at the end of the line.
function splitAttributes(text) {
  const names = [];
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
    if (j >= text.length) return { names, rest: text.slice(i), open: true };
    const inner = text.slice(i + 1, j);
    const after = text.slice(j + 1).trimStart();
    if (!names.length && /^[.=(]/.test(after) && !/[(,]/.test(inner)) break;
    names.push(...attributeNames(inner));
    i = j + 1;
  }
  return { names, rest: text.slice(i), open: false };
}

function attributeNames(inner) {
  let s = inner;
  for (let prev = null; prev !== s;) { prev = s; s = s.replace(/\([^()]*\)/g, ""); }
  return s.split(",").map((x) => x.trim().split(/\s/)[0]).filter(Boolean);
}

// ------------------------------------------------------------------ parsing

const NAME = String.raw`(?:\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*[$%&!#@]?)`;
const MODIFIERS = new RegExp(String.raw`^\s*(Public|Private|Friend|Protected|Global|Static|Shared|` +
  String.raw`Overrides|Overridable|Virtual|MustOverride|NotInheritable|NotDispatchable|Partial|` +
  String.raw`Default|ReadOnly|WriteOnly|WithEvents|Dim|Iterator)\b\s*`, "i");
const TYPE_OPEN = new RegExp(String.raw`^(Module|Class|Interface|CoClass|Enum|Type|Union)\s+(${NAME})(.*)$`, "i");
const TYPE_OR_PROC_END = /^End\s+(Sub|Function|Property|Module|Class|Interface|CoClass|Enum|Type|Union)\b/i;
const DECLARE = new RegExp(String.raw`^(?:DeclareWide|Declare)\s+(?:PtrSafe\s+)?(Sub|Function|Property\s+(?:Get|Let|Set))\s+(${NAME})`, "i");
const PROC = new RegExp(String.raw`^(Sub|Function|Property\s+(?:Get|Let|Set))\s+(${NAME})`, "i");
const EVENT = new RegExp(String.raw`^Event\s+(${NAME})`, "i");
const DELEGATE = new RegExp(String.raw`^Delegate\s+(?:Sub|Function)\s+(${NAME})`, "i");
const LEADING_NAME = new RegExp(String.raw`^\s*(${NAME})`);
const FIELD = new RegExp(String.raw`^\s*(${NAME})\s*(\(|As\b|$)`, "i");
const ENUM_VALUE = new RegExp(String.raw`^(${NAME})\s*(=|$)`);

// Types whose procedures have bodies, and so an `End Sub` to wait for.
const WITH_BODIES = new Set(["module", "class", "type", "union"]);

const unbracket = (name) => name.replace(/^\[(.*)\]$/, "$1");

function kindOf(keyword) {
  const k = keyword.toLowerCase();
  if (k.startsWith("property")) return "property";
  return k;                     // sub, function
}

/**
 * Every type a source file declares, and every member each declares.
 *
 * @returns {{types: object[], problems: {file, line, why}[]}}
 *   Each type is `{kind, name, file, line, vis, hidden, attributes, container,
 *   members, inherits, implements, interfaces, extends}`; `kind` is module,
 *   class, interface, coclass, enum, type or union, `container` the name of the
 *   type it is declared in or null, `interfaces` a CoClass's
 *   `{name, isDefault, isSource}`. Each member is `{name, kind, vis, hidden,
 *   line}` with `kind` sub, function, property, event, delegate, const, field
 *   or enumvalue.
 */
export function parseTwin(src, file = "") {
  const lines = logicalLines(src);
  const types = [];
  const problems = [];
  const stack = [];             // open types, and {proc: true} for a body
  let pending = [];             // attributes waiting for their declaration

  const openType = () => {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].type) return stack[k].type;
    return null;
  };
  const inBody = () => stack.some((s) => s.proc);

  for (let li = 0; li < lines.length; li++) {
    let { text } = lines[li];
    const { line } = lines[li];
    if (!text.trim() || /^\s*#/.test(text)) continue;       // #If, #Region, #Const

    let split = splitAttributes(text);
    while (split.open && li + 1 < lines.length) {
      text += " " + lines[++li].text;
      split = splitAttributes(text);
    }
    pending.push(...split.names);
    const rest = split.rest.trim();
    if (!rest) continue;
    const attributes = pending;
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
    // Public As Boolean` on UserControl.
    let decl = rest;
    const modifiers = [];
    for (let m; (m = MODIFIERS.exec(decl));) {
      const after = decl.slice(m[0].length);
      if (modifiers.length && /^(As\b|\(|=|$)/i.test(after)) break;
      modifiers.push(m[1].toLowerCase());
      decl = after;
    }
    const vis = modifiers.includes("private") ? "private"
      : modifiers.includes("friend") ? "friend"
      : modifiers.includes("protected") ? "protected"
      : modifiers.includes("public") || modifiers.includes("global") ? "public" : null;
    const hidden = attributes.some((a) => /^(Hidden|Restricted)$/i.test(a));
    const parent = openType();

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
        kind, name, file, line,
        vis: vis ?? "public", hidden, attributes,
        container: parent ? parent.name : null,
        members: [], inherits: [], implements: [], interfaces: [],
        extends: /\bExtends\s+([\w.[\]]+)/i.exec(open[3])?.[1] ?? null,
      };
      types.push(type);
      stack.push({ type });
      continue;
    }

    if (/^Alias\s/i.test(decl)) continue;                  // Alias X As Y
    if (!parent) {
      if (!/^(Option|Imports)\b/i.test(decl)) problems.push({ file, line, why: `outside any type: ${rest.slice(0, 60)}` });
      continue;
    }

    let m;
    if ((m = /^Inherits\s+([\w.[\]]+)/i.exec(decl))) { parent.inherits.push(m[1]); continue; }
    if ((m = /^Implements\s+([\w.[\]]+)/i.exec(decl))) { parent.implements.push(m[1]); continue; }

    if (parent.kind === "enum") {
      if ((m = ENUM_VALUE.exec(decl))) add(parent, m[1], "enumvalue", "public", hidden, line);
      else problems.push({ file, line, why: `not an enumeration value: ${rest.slice(0, 60)}` });
      continue;
    }
    if ((m = DECLARE.exec(decl))) { add(parent, m[2], kindOf(m[1]), vis, hidden, line, "private"); continue; }
    if ((m = PROC.exec(decl))) {
      add(parent, m[2], kindOf(m[1]), vis, hidden, line, "public");
      if (WITH_BODIES.has(parent.kind) && !modifiers.includes("mustoverride")) stack.push({ proc: true });
      continue;
    }
    if ((m = EVENT.exec(decl))) { add(parent, m[1], "event", vis, hidden, line, "public"); continue; }
    if ((m = DELEGATE.exec(decl))) { add(parent, m[1], "delegate", vis, hidden, line, "public"); continue; }
    if ((m = /^Const\s+(.*)$/i.exec(decl))) {
      for (const piece of splitTopLevel(m[1])) {
        const n = LEADING_NAME.exec(piece);
        if (n) add(parent, n[1], "const", vis, hidden, line, "private");
      }
      continue;
    }
    if (modifiers.length || parent.kind === "type" || parent.kind === "union") {
      for (const piece of splitTopLevel(decl)) {
        const n = FIELD.exec(piece);
        if (n) add(parent, n[1], "field", vis, hidden, line, "private");
      }
      continue;
    }
    if (/^(Option|Attribute|Events|Def[A-Za-z]+\s)/i.test(decl)) continue;
    problems.push({ file, line, why: `not understood in ${parent.kind} ${parent.name}: ${rest.slice(0, 80)}` });
  }

  for (const s of stack) {
    problems.push({ file, line: s.type?.line ?? 0, why: `${s.type ? `${s.type.kind} ${s.type.name}` : "a procedure"} is never closed` });
  }
  return { types, problems };

  // `fallback` is the visibility a member has with no modifier in a Module or
  // Class: Public for a procedure, Private for a variable, constant or Declare.
  // Everything in an Interface, CoClass, Enum, Type or Union is public.
  function add(type, rawName, kind, vis, hidden, line, fallback) {
    const implicit = ["interface", "coclass", "enum", "type", "union"].includes(type.kind) ? "public" : fallback;
    type.members.push({ name: unbracket(rawName), kind, vis: vis ?? implicit, hidden, line });
  }
}

function splitTopLevel(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const c of s) {
    if (c === "(") depth++;
    else if (c === ")") depth--;
    if (c === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// ----------------------------------------------------------------- packages

/**
 * Parse every .twin file of an exported package, whose tree is `Settings` plus
 * `Sources/`. The export's own `Packages/` folder, which holds copies of the
 * packages this one references, is not read.
 */
export function parsePackage(dir) {
  const types = [];
  const problems = [];
  for (const file of twinFiles(path.join(dir, "Sources"))) {
    const rel = path.relative(dir, file).replaceAll("\\", "/");
    const r = parseTwin(readFileSync(file, "utf8"), rel);
    types.push(...r.types);
    problems.push(...r.problems);
  }
  return { types, problems };
}

function twinFiles(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
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
  for (let t = type; t;) {
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
    const order = dot < 0 ? [fromPkg, ...[...parsed.keys()].filter((k) => k !== fromPkg)]
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
    for (const t of types) if (["class", "coclass", "interface"].includes(t.kind) && isPublicIn(t, types)) queue.push({ pkg, t });
  }
  const expose = (hit) => {
    if (hit && !exposed.has(hit.type)) { exposed.add(hit.type); queue.push({ pkg: hit.pkg, t: hit.type }); }
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
        if (!hit) { unresolved.push(`${pkg}.${t.name}: ${ref}`); return ref.replace(/[[\]]/g, ""); }
        return `${hit.pkg}.${hit.type.name}`;
      };
      if (t.inherits.length) rec.inherits = t.inherits.map((b) => qualify(b, ["class"]));
      if (t.extends && !ROOT_INTERFACES.test(t.extends)) rec.extends = qualify(t.extends, ["interface"]);
      if (!isPublic && !exposed.has(t)) { list.push(rec); continue; }

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
  return names.filter((n) => { const k = n.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
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
