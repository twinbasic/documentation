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
 *
 * `Abstract` and `Virtual` are not on it. BETA 1010 reads `Public Abstract Sub
 * Y()` as a Variant variable named Abstract followed by a Sub the parser
 * refuses (TB5182 at `Sub`), whether or not an `End Sub` follows, and refuses
 * `Abstract Class` and `Virtual Class` the same way. A scanner that took them
 * for modifiers would open a body that no source closes.
 *
 * Thirteen more words here are refused the same way (TB5182) in BETA 1010 before
 * a Sub, a Function, a Class and a module-level variable alike: Shared, Partial,
 * Overrides, Overloads, MustOverride, MustInherit, NotInheritable, Iterator,
 * Async, Naked, Unsafe, Extern and Inline. They stay on the list until a
 * source is found that needs them gone: `Overrides` is a clause after a
 * procedure's result type (`Function F() As T Overrides Base.F`), never a
 * modifier before it.
 */
export const MODIFIERS =
  "Public|Private|Friend|Global|Protected|Static|Shared|Partial|Default|ReadOnly|WriteOnly|WithEvents|NotDispatchable|Overridable|Overrides|Overloads|MustOverride|MustInherit|NotInheritable|Iterator|Async|PtrSafe|Naked|CDecl|StdCall|Unsafe|Extern|Inline";

const BLOCK_COMMENT_RE = /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g;

// The line with each block comment in it replaced by a space. Only a comment
// closed on the same line: the census reads its source a line at a time.
export const decomment = (s) => s.replace(BLOCK_COMMENT_RE, " ");

// An identifier holds the ASCII letters, digits and `_` and every character past
// ASCII (BETA 1010 compiles `Café As Long` and `Sub 日本語()`), so a keyword ends
// where the next character is none of them; `\b` would end `Class` before `é`.
const KEYWORD_END = "(?![A-Za-z0-9_\\u0080-\\uFFFF])";

// `Const` is a modifier here, so DECL_RE consumes it and never reports it as a
// kind; declarationKind's own rule for it does.
const DECL_RE = new RegExp(
  `^\\s*(?:(?:${MODIFIERS}|Const)\\s+)*(Class|Module|Interface|CoClass|Enum|Type|Union|Sub|` +
    `Function|Property|Event|DeclareWide|Declare|Implements)${KEYWORD_END}`,
  "i",
);
const TYPE_FIELD_RE = /^\s*[\w\u0080-\uFFFF]+(?:\s*\([^)]*\))?\s+As\s+/i;
const VAR_RE = new RegExp(`^\\s*(?:${MODIFIERS}|Const|Dim)\\s+[\\w\\u0080-\\uFFFF\\[]`, "i");
const NAMED_AS_RE = /^\s*[\w\u0080-\uFFFF]+\s+As\s+/i;
// The white space between its words is ASCII's, `[ \t\f\v]`, because `\s` and the
// identifier class both hold the no-break space and the regex would be ambiguous.
const CONST_RE = new RegExp(`^\\s*(?:[\\w\\u0080-\\uFFFF]+[ \\t\\f\\v]+)*Const${KEYWORD_END}`, "i");

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
  // A field may be named for a keyword: `Type As Long`, `Union(3) As Byte`. In a
  // Type or Union block the field rule is tried before the keywords.
  if ((container === "Type" || container === "Union") && TYPE_FIELD_RE.test(d)) return "TypeMember";
  const m = DECL_RE.exec(d);
  if (m) {
    const k = m[1];
    return k[0].toUpperCase() + k.slice(1).replace(/^eclarewide$/i, "eclareWide");
  }
  if (/^\s*End\s+\w/i.test(d)) return null; // unresolved
  if (container === "Enum" && /^\s*\[?[\w\u0080-\uFFFF]/.test(d)) return "EnumMember";
  // The distinction matters: `Attributes.md` states "constants in a
  // module" and "variables in a Class" as different targets, and [DllExport]
  // is documented on a Const and refused on a variable.
  if (CONST_RE.test(d)) return "Const";
  if (VAR_RE.test(d) || NAMED_AS_RE.test(d)) return "Variable";
  return null;
}
