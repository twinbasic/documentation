// Pages whose remaining byte-level divergence vs Jekyll's _site/ output
// is accepted -- the underlying renderer behaviour is correct, but the
// HTML differs in ways that don't (and shouldn't) reach the reader.
//
// Two buckets:
//
//   * non-tb-highlight -- the divergence sits inside a ```html / ```json
//     / ```sql / ```js / ... fence. Rouge has hand-written per-language
//     lexers; we drive Shiki's TextMate grammars. The two emit
//     different span structures for the same source (Rouge's whitespace
//     tokens, JSON key-label `nl`, HTML DOCTYPE single-`cp` lump, etc.)
//     and the structural mismatch is too deep to bridge without rewriting
//     each grammar. The token CLASSES are still recognised by rouge.css,
//     so any spans we DO emit render fine -- the difference is purely
//     how finely the source is split.
//
//   * tb-highlight-noise -- the divergence sits inside a ```tb fence
//     (or its `vb`/`vba` aliases) and is caused by a Rouge tB-lexer
//     state-machine quirk we'd have to re-create exactly. These are
//     listed with the specific Rouge rule they reflect; they're all
//     visually neutral in the rendered output.
//
// Add a page here only after confirming the divergence is purely
// highlighting (no markdown / structure difference) AND the underlying
// renderer choice is the right one for our pipeline.

export const ACCEPTED_DIVERGENCES = [
  // ---------- non-tb syntax-highlighting -----------------------------
  {
    path: "Reference/Attributes.md",
    category: "non-tb-highlight",
    lang: "json",
    note:
      "Rouge JSON lexer emits per-whitespace `<span class=\"w\">` and " +
      "tags object keys as `nl` (Name::Label). Shiki's JSON grammar " +
      "doesn't carry either: the bare `\"` quote chars and identifier-" +
      "shaped key bodies pass through. Same shape as " +
      "Reference/WinEventLogLib/index.md.",
  },
  {
    path: "Reference/WinEventLogLib/index.md",
    category: "non-tb-highlight",
    lang: "json",
    note:
      "JSON in a ```json fence -- same Rouge `w`/`nl` vs Shiki bare-" +
      "scope difference as Reference/Attributes.md.",
  },
  {
    path: "IDE/Menu/Window.md",
    category: "non-tb-highlight",
    lang: "json",
    note:
      "Three ```json fences inside `<details>`/`<summary markdown=span>` " +
      "blocks documenting the default panel-layout configs. Same Rouge " +
      "`w`/`nl` vs Shiki bare-scope tokenisation difference as " +
      "Reference/Attributes.md.",
  },
  {
    path: "Tutorials/CEF/Driving Monaco.md",
    category: "non-tb-highlight",
    lang: "html",
    note:
      "Rouge HTML lexer collapses `<!DOCTYPE html>` into one " +
      "Comment::Preproc span (`cp`) and merges `<` + tag-name into one " +
      "Name::Tag span (`nt`). Shiki's HTML grammar splits each tag " +
      "into begin-punct + name + attrs + end-punct. Bridging would " +
      "need a per-tag merging pass over the token stream.",
  },
  {
    path: "Tutorials/WebView2/Driving Monaco.md",
    category: "non-tb-highlight",
    lang: "html",
    note:
      "Same HTML-tag tokenisation difference as Tutorials/CEF/Driving Monaco.md.",
  },
  {
    path: "IDE/Project Explorer.md",
    category: "non-tb-highlight",
    lang: "xml",
    note:
      "Rouge XML lexer collapses the `<?xml version=\"...\" ... ?>` " +
      "processing-instruction line into one Comment::Preproc span " +
      "(`cp`) AND merges `<` + tag-name into one Name::Tag span " +
      "(`nt`). Shiki's XML grammar splits each tag into begin-punct + " +
      "name + attrs + end-punct. Same shape as " +
      "Tutorials/CEF/Driving Monaco.md (HTML).",
  },
  {
    path: "Reference/VBA/Interaction/Partition.md",
    category: "non-tb-highlight",
    lang: "sql",
    note:
      "Rouge SQL lexer tokenises `[Freight]` (Microsoft SQL bracket-" +
      "quoted identifier) as Punctuation + Name + Punctuation. Shiki's " +
      "SQL grammar treats the whole bracketed identifier as one " +
      "`text.bracketed` token with no class.",
  },
  {
    path: "Tutorials/WebView2/JavaScript interop.md",
    category: "non-tb-highlight",
    lang: "js",
    note:
      "JS template-literal interpolation (`` `BASIC said ${x} ...` ``). " +
      "Rouge splits the literal into delimiter / content / `${` / " +
      "expression / `}` / content / delimiter; Shiki keeps the whole " +
      "template literal as one string token. Per-language split would " +
      "need a JS-template-literal-aware re-tokeniser.",
  },

  // ---------- tb highlighting noise (Rouge tB lexer quirks) ---------
  // All Rouge tB-lexer divergences are now closed. Earlier entries were
  // removed once the corresponding lexer / grammar / renderer change
  // landed:
  //   * `:dotted` state newline-cascade fix in `docs/_plugins/twinbasic.rb`
  //     closed Reference/Core/On-Error.md, Reference/Core/ReDim.md,
  //     Reference/VB/Screen/index.md.
  //   * `:namespace` / `:dim` / `:funcname` / `:typename` /
  //     `:typename_ext` / `:end` end-of-line pop fix in the same file,
  //     plus the matching `funcname-keyword` `$` terminator in
  //     twinbasic.tmLanguage.json, closed Reference/Core/Option.md.
  //   * `:whitespace` LineContinuation rule extended from `_[ \t]*\n`
  //     to `_[ \t]*\n[ \t]*` (absorbing the next line's indent into
  //     the same Punctuation::LineContinuation token, matching the
  //     `:attrargs` / `:dotted` shape) plus the matching renderer
  //     hook in `builder/highlight.mjs` (next-line whitespace folded
  //     into the open <span class="lc"> run) closed the two
  //     Tutorials/<browser>/Hosting local web assets.md pages.
];

// Set form for O(1) lookup by srcRel.
export const ACCEPTED_DIVERGENCE_PATHS = new Set(
  ACCEPTED_DIVERGENCES.map((d) => d.path),
);
