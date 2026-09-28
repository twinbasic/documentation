// What a line of twinBASIC source declares, for the three scanners that read
// it: scripts/census_attributes.mjs, scripts/lib/twin-api.mjs and
// scripts/lib/tb-fences.mjs. scripts/check_twin_parsers.mjs probes it.
//
// **A modifier the list does not know makes the keyword after it invisible.**
// The line is read as something else and nothing says so: a missed opener
// surfaces as a mismatch somewhere later, never where it happened. A missing
// `NotDispatchable` let an `End Class` pop somebody else's block in the
// census, and a missing `Overridable` came back from tb-fences.mjs as "End
// Function closing Class". So the three scanners share one list.

/**
 * The words twinBASIC allows before a declaration keyword, as regex
 * alternatives. `Dim` and `Const` are not among them: each opens a declaration
 * of its own, and a scanner that reads one as a modifier adds it itself.
 *
 * One literal rather than a concatenation: scripts/check_regex_safety.mjs
 * reads an imported `const` only when its initialiser is a literal, and three
 * files build their patterns from this one.
 */
export const MODIFIERS = "Public|Private|Friend|Global|Protected|Static|Shared|Partial|Default|ReadOnly|WriteOnly|WithEvents|NotDispatchable|Overridable|Overrides|Overloads|Virtual|Abstract|MustOverride|MustInherit|NotInheritable|Iterator|Async|PtrSafe|Naked|CDecl|StdCall|Unsafe|Extern|Inline";

const BLOCK_COMMENT_RE = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g;

// The line with each block comment in it replaced by a space. Only a comment
// closed on the same line: the census reads its source a line at a time.
export const decomment = (s) => s.replace(BLOCK_COMMENT_RE, " ");

// `Const` is a modifier here, so DECL_RE consumes it and never reports it as a
// kind; declarationKind's own rule for it does.
const DECL_RE = new RegExp(
  `^\\s*(?:(?:${MODIFIERS}|Const)\\s+)*(Class|Module|Interface|CoClass|Enum|Type|Union|Sub|` +
  `Function|Property|Event|DeclareWide|Declare|Implements)\\b`, "i");
const VAR_RE = new RegExp(`^\\s*(?:${MODIFIERS}|Const|Dim)\\s+[\\w\\[]`, "i");

/**
 * What the declaration an attribute decorates is, as the census counts it:
 * the keyword as written with its first letter capitalised (`Sub`, `CoClass`;
 * `DeclareWide` in any case), `EnumMember`, `TypeMember`, `Const`, `Variable`,
 * or null for a line it cannot place.
 *
 * @param {string} decl  the declaration's line, after its attributes
 * @param {string} container  the enclosing block's kind as the census tracks
 *   it -- "Enum", "Type", "Union" -- or anything else outside those
 */
export function declarationKind(decl, container) {
  const d = decomment(decl);
  const m = DECL_RE.exec(d);
  if (m) {
    const k = m[1];
    return k[0].toUpperCase() + k.slice(1).replace(/^eclarewide$/i, "eclareWide");
  }
  if (/^\s*End\s+\w/i.test(d)) return null;              // unresolved
  if (container === "Enum" && /^\s*\[?\w/.test(d)) return "EnumMember";
  if (container === "Type" || container === "Union") {
    if (/^\s*\w+\s+As\s+/i.test(d)) return "TypeMember";
  }
  // The distinction matters: `Attributes.md` states "constants in a
  // module" and "variables in a Class" as different targets, and [DllExport]
  // is documented on a Const and refused on a variable.
  if (/^\s*(?:\w+\s+)*Const\b/i.test(d)) return "Const";
  if (VAR_RE.test(d) || /^\s*\w+\s+As\s+/i.test(d)) return "Variable";
  return null;
}
