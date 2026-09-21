// Resolve `new RegExp(...)` constructions to the pattern they build, where
// that can be decided from the source alone.
//
// ------------------------------------------------------------------- why
//
// `check_regex_safety.mjs` reads regex *literals*. A pattern assembled from
// strings is invisible to it, and writing one is not an exotic thing to do --
// the shared-fragment style (`const NUM = ...; new RegExp(`${WRAP}${NUM}`)`)
// is how you avoid repeating a sub-pattern six times. Round 4's own fix pass
// wrote six of them into one gate, and one came back **polynomial degree 3**
// when finally put through recheck by hand. Nothing in the repository would
// have said so: the blind spot was a number in `--census` and nothing more.
//
// So the gate folds what it can. A construction whose arguments reduce to
// constants is checked exactly like a literal; one that does not is listed
// with the reason, which is a better blind spot than a count.
//
// ------------------------------------------------------- what folds, and why
//
// Every rule below preserves the pattern *exactly*, with one stated exception.
//
//   "..." / `...`      string and template literals, concatenated
//   a + b              string concatenation
//   String.raw`...`    the raw text
//   X                  a `const X = <foldable>` declared once in the file
//   X.source/.flags    a `const X = /.../` declared once in the file
//   A.join(sep)        a `const A = ["a","b"]` of string literals
//   c ? a : b          both branches, checked as two patterns
//
// **The exception is an escaping call**, `escapeRegExp(x)` and anything else
// written to the same shape. Its result is a fixed character sequence with no
// regex operator in it, whatever `x` holds, so the construction's *structure*
// is knowable even though its text is not. Those fold to a one-character
// placeholder and are marked `modelled`.
//
// That model has a gap, and it is stated rather than hidden: an escaped splice
// **inside a quantified alternation** could be ambiguous with a sibling branch
// in a way the placeholder is not -- `(${esc}|a)+` is exponential when `esc`
// holds `a` and safe when it holds `x`. A fixed sequence cannot be a quantified
// atom by itself, so this needs the surrounding pattern to quantify a group
// containing it; no construction in the tree does. `--census` marks every
// modelled entry so the question can be asked of the ones that exist.
//
// A binding declared more than once in a file is never resolved: the folder
// has no scope chain, and guessing which declaration is in scope is how an
// analysis quietly starts checking the wrong pattern.

import * as walk from "acorn-walk";

/** Stands in for escaped text: one character, no regex meaning, never empty. */
export const ESCAPED_TEXT_PLACEHOLDER = "x";

/** Ternaries multiply; refuse rather than check a combinatorial pile. */
const MAX_ALTERNATIVES = 8;

const isRegExpCallee = (n) => n?.type === "Identifier" && n.name === "RegExp";

/**
 * `function f(s) { return s.replace(/[...]/g, "\\$&"); }` -- the universal
 * regex escaper. Recognised by shape rather than by name, so the three copies
 * in this tree (`escapeRegExp` twice, `escapeRegExpBook`) and any fourth are
 * all covered without a list to maintain.
 */
function isEscapeHelper(fn) {
  const params = fn?.params ?? [];
  if (params.length !== 1 || params[0].type !== "Identifier") return false;
  const body = fn.body?.type === "BlockStatement" ? fn.body.body : null;
  const expr = body?.length === 1 && body[0].type === "ReturnStatement"
    ? body[0].argument
    : fn.body?.type !== "BlockStatement" ? fn.body : null;
  if (expr?.type !== "CallExpression") return false;
  const callee = expr.callee;
  if (callee?.type !== "MemberExpression" || callee.property?.name !== "replace") return false;
  if (callee.object?.type !== "Identifier" || callee.object.name !== params[0].name) return false;
  const [re, rep] = expr.arguments;
  if (!re?.regex || !re.regex.flags.includes("g")) return false;
  if (!/^\[.*\]$/s.test(re.regex.pattern)) return false;
  return typeof rep?.value === "string" && rep.value.includes("$&") && rep.value.includes("\\");
}

/**
 * Name -> initialiser for every `const` in the file, plus the names that are
 * declared more than once, bound by a loop, or are function parameters.
 *
 * Those three sets exist for the message, not for the decision -- all of them
 * are refused. "`pattern` is a function parameter" tells a reader to go and
 * look at the call sites; "`pattern` is not a const" tells them nothing.
 */
function collectBindings(ast) {
  const consts = new Map();
  const duplicated = new Set();
  const mutable = new Set();
  const loopBound = new Set();
  const params = new Set();
  const escapers = new Set();

  const noteConst = (name, init) => {
    if (consts.has(name)) duplicated.add(name);
    consts.set(name, init);
  };
  const noteParams = (fn) => {
    for (const p of fn.params ?? []) {
      if (p.type === "Identifier") params.add(p.name);
    }
  };

  walk.simple(ast, {
    VariableDeclaration(node) {
      for (const d of node.declarations) {
        if (d.id.type !== "Identifier") continue;
        if (node.kind !== "const") { mutable.add(d.id.name); continue; }
        // A `for (const x of ...)` declarator has no initialiser.
        if (!d.init) { loopBound.add(d.id.name); continue; }
        noteConst(d.id.name, d.init);
        if ((d.init.type === "FunctionExpression" || d.init.type === "ArrowFunctionExpression")
            && isEscapeHelper(d.init)) escapers.add(d.id.name);
      }
    },
    FunctionDeclaration(node) {
      noteParams(node);
      if (node.id?.name && isEscapeHelper(node)) escapers.add(node.id.name);
    },
    FunctionExpression: noteParams,
    ArrowFunctionExpression: noteParams,
  });

  for (const name of [...duplicated, ...mutable, ...loopBound]) consts.delete(name);
  return { consts, duplicated, mutable, loopBound, params, escapers };
}

/** Why a name could not be resolved. */
function whyUnbound(name, ctx) {
  if (ctx.mutable.has(name)) return `\`${name}\` is a \`let\` or \`var\`, so its value is not fixed`;
  if (ctx.duplicated.has(name)) return `\`${name}\` is declared more than once in this file, so which declaration is in scope cannot be decided here`;
  if (ctx.loopBound.has(name)) return `\`${name}\` is bound by a loop, not to a constant`;
  if (ctx.params.has(name)) return `\`${name}\` is a function parameter -- check the call sites`;
  return `\`${name}\` is not a \`const\` in this file (an import or a global)`;
}

/**
 * Fold an expression to the set of strings it can be.
 * @returns {{ok: true, values: string[], modelled: boolean} | {ok: false, reason: string}}
 */
function foldExpr(node, ctx, seen = new Set()) {
  const fail = (reason) => ({ ok: false, reason });
  const plain = (s) => ({ ok: true, values: [s], modelled: false });

  if (!node) return fail("no argument");

  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") return plain(node.value);
      if (node.regex) return fail("a regex literal where a pattern string was expected");
      return fail(`a ${typeof node.value} literal`);

    case "TemplateLiteral": {
      const parts = [];
      for (let i = 0; i < node.quasis.length; i++) {
        parts.push(plain(node.quasis[i].value.cooked ?? node.quasis[i].value.raw));
        if (i < node.expressions.length) {
          const f = foldExpr(node.expressions[i], ctx, seen);
          if (!f.ok) return f;
          parts.push(f);
        }
      }
      return concat(parts);
    }

    case "TaggedTemplateExpression": {
      const tag = node.tag;
      const isRaw = tag?.type === "MemberExpression"
        && tag.object?.type === "Identifier" && tag.object.name === "String"
        && tag.property?.name === "raw";
      if (!isRaw) return fail(`a \`${srcName(tag)}\` tagged template`);
      const parts = [];
      for (let i = 0; i < node.quasi.quasis.length; i++) {
        parts.push(plain(node.quasi.quasis[i].value.raw));
        if (i < node.quasi.expressions.length) {
          const f = foldExpr(node.quasi.expressions[i], ctx, seen);
          if (!f.ok) return f;
          parts.push(f);
        }
      }
      return concat(parts);
    }

    case "BinaryExpression": {
      if (node.operator !== "+") return fail(`a \`${node.operator}\` expression`);
      const l = foldExpr(node.left, ctx, seen);
      if (!l.ok) return l;
      const r = foldExpr(node.right, ctx, seen);
      if (!r.ok) return r;
      return concat([l, r]);
    }

    case "ConditionalExpression": {
      const a = foldExpr(node.consequent, ctx, seen);
      if (!a.ok) return a;
      const b = foldExpr(node.alternate, ctx, seen);
      if (!b.ok) return b;
      const values = [...new Set([...a.values, ...b.values])];
      if (values.length > MAX_ALTERNATIVES) return fail("too many conditional branches to enumerate");
      return { ok: true, values, modelled: a.modelled || b.modelled };
    }

    case "Identifier": {
      if (seen.has(node.name)) return fail(`\`${node.name}\` is defined in terms of itself`);
      if (!ctx.consts.has(node.name)) return fail(whyUnbound(node.name, ctx));
      const init = ctx.consts.get(node.name);
      return foldExpr(init, ctx, new Set([...seen, node.name]));
    }

    case "MemberExpression": {
      const prop = node.property?.name;
      if ((prop === "source" || prop === "flags") && node.object?.type === "Identifier") {
        const init = ctx.consts.get(node.object.name);
        if (init?.regex) return plain(prop === "source" ? init.regex.pattern : init.regex.flags);
        if (!init) return fail(whyUnbound(node.object.name, ctx));
        return fail(`\`${node.object.name}\` is a \`const\`, but not a regex literal`);
      }
      return fail(`\`${srcName(node)}\``);
    }

    case "CallExpression": {
      const callee = node.callee;
      // A.join(sep) over a const array of string literals.
      if (callee?.type === "MemberExpression" && callee.property?.name === "join"
          && callee.object?.type === "Identifier") {
        const arr = ctx.consts.get(callee.object.name);
        if (!arr) return fail(whyUnbound(callee.object.name, ctx));
        if (arr.type !== "ArrayExpression") {
          return fail(`\`${callee.object.name}\` is a \`const\`, but not an array literal`);
        }
        if (!arr.elements.every((e) => e?.type === "Literal" && typeof e.value === "string")) {
          return fail(`\`${callee.object.name}\` holds something other than string literals`);
        }
        const sep = node.arguments.length ? foldExpr(node.arguments[0], ctx, seen) : plain(",");
        if (!sep.ok) return sep;
        const items = arr.elements.map((e) => e.value);
        return {
          ok: true,
          values: sep.values.map((s) => items.join(s)),
          modelled: sep.modelled,
        };
      }
      // An escaping call: unknown text, known to be free of regex operators.
      if (callee?.type === "Identifier" && ctx.escapers.has(callee.name)) {
        return { ok: true, values: [ESCAPED_TEXT_PLACEHOLDER], modelled: true };
      }
      return fail(`a call to \`${srcName(callee)}\``);
    }

    default:
      return fail(`a ${node.type}`);
  }
}

function concat(parts) {
  let values = [""];
  let modelled = false;
  for (const p of parts) {
    modelled = modelled || p.modelled;
    const next = [];
    for (const a of values) for (const b of p.values) next.push(a + b);
    if (next.length > MAX_ALTERNATIVES) return { ok: false, reason: "too many alternatives to enumerate" };
    values = [...new Set(next)];
  }
  return { ok: true, values, modelled };
}

/** A readable name for an expression, for the "why not" message. */
function srcName(n) {
  if (!n) return "?";
  if (n.type === "Identifier") return n.name;
  if (n.type === "MemberExpression") return `${srcName(n.object)}.${n.property?.name ?? "[…]"}`;
  if (n.type === "ThisExpression") return "this";
  return n.type;
}

/**
 * Every `new RegExp(...)` / `RegExp(...)` in one parsed file.
 *
 * @param {object} ast   an acorn AST parsed with `locations: true`
 * @param {string} rel   the file's repo-relative path, for the report
 * @returns {{resolved: object[], unresolved: object[]}}
 */
export function foldConstructedRegexes(ast, rel) {
  const ctx = collectBindings(ast);
  const resolved = [];
  const unresolved = [];

  const visit = (node) => {
    if (!isRegExpCallee(node.callee)) return;
    const line = node.loc.start.line;
    const pat = foldExpr(node.arguments[0], ctx);
    if (!pat.ok) {
      unresolved.push({ file: rel, line, reason: pat.reason });
      return;
    }
    // Flags decide how the pattern parses, so an unknown flag string is an
    // unknown regex. Assuming "" would be a second model on top of the first.
    let flags = { ok: true, values: [""], modelled: false };
    if (node.arguments.length > 1) {
      flags = foldExpr(node.arguments[1], ctx);
      if (!flags.ok) {
        unresolved.push({ file: rel, line, reason: `flags: ${flags.reason}` });
        return;
      }
    }
    const combos = [];
    for (const p of pat.values) for (const f of flags.values) combos.push([p, f]);
    if (combos.length > MAX_ALTERNATIVES) {
      unresolved.push({ file: rel, line, reason: "too many pattern/flag combinations to enumerate" });
      return;
    }
    combos.forEach(([pattern, flagStr], i) => {
      resolved.push({
        pattern, flags: flagStr, file: rel, line,
        constructed: true,
        modelled: pat.modelled || flags.modelled,
        // A ternary yields more than one pattern from one call site, and a
        // finding on the second would otherwise look like a finding on a
        // pattern that is not written anywhere.
        variant: i + 1, variants: combos.length,
      });
    });
  };

  walk.simple(ast, { NewExpression: visit, CallExpression: visit });
  return { resolved, unresolved };
}
