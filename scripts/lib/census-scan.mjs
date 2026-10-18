// The attribute census's scanner: the text of one `.twin` file in, the attribute
// sites and the things it could not resolve out. It is a module of its own so
// that scripts/check_twin_parsers.mjs can run the traps below on fixed input;
// scripts/census_attributes.mjs reads the files and builds the report.
//
// ------------------------------------------------- what the scanner must not do
//
// Seven ways a naive sweep of this corpus gets a wrong answer, each measured
// against the shipped packages rather than imagined:
//
//   1. A line matcher misses 292 of 7,604 attribute lines (3.8%), because
//      `[Description("..." & vbCrLf & _` closes several lines later. Those are
//      dropped silently, so the count looks plausible. Hence a character
//      scanner that balances brackets across lines.
//   2. An attribute list is comma-separated -- `[DispId(126), Hidden]` -- and
//      DAO.twin writes most of its Hidden uses that way. Matching `[Hidden]`
//      finds a fraction of them.
//   3. Argument text has to be stripped before splitting on the comma, or
//      `[Description("Returns an array of child controls, given the container")]`
//      contributes an attribute named `given`.
//   4. An escaped identifier is spelled like an attribute: `[_HiddenModule].Foo`,
//      `[_MAX] = 0`. What separates them is the tail -- an attribute is followed
//      by a declaration, an escaped identifier by `.`, `=` or `(`.
//   5. DAO.twin writes declarations as `/* voffset &H00A8*/ Property Get X()`,
//      so an inline block comment has to be removed, not used to skip the line.
//      Skipping the line loses the Interface-member sites, which then read as
//      `End Interface`.
//   6. Attributes are also written inline -- `[Default] Interface X` -- so the
//      declaration is not always on the next line.
//   7. In an Enum body a bracket group alone on its line is a MEMBER, whatever
//      is inside the brackets: `[Hidden]` is the member Hidden, `[Description("x")]`
//      a member of that name. An Enum member has no attribute site of its own
//      (BETA 1010; probes in scripts/check_twin_parsers.mjs).
//
// Only TYPE blocks are tracked for the enclosing construct. Procedures are
// deliberately not pushed: an Interface prototype (`Sub Ping()`) has no body and
// no `End Sub`, so tracking procedures unbalances the stack on every interface
// in the corpus. Anything the scanner cannot resolve goes to an `unresolved`
// bucket and is reported -- a census that quietly buckets its own confusion is
// how the wrong answer gets published with a number beside it.
import { MODIFIERS, declarationKind, decomment } from "./twin-declarations.mjs";

const TYPE_KEYWORDS = ["Class", "Module", "Interface", "CoClass", "Enum", "Type", "Union"];
// The name after the keyword is captured so a FIELD named after a block keyword
// can be rejected. Four UDTs in the packages declare `Type As Long`, and read as
// an opener that never closes it swallowed the rest of the file: one of them put
// 368 Declares inside a phantom `Type`, which is not a construct that exists.
// The name may itself be an escaped identifier: VBA declares `Module
// [_HiddenModule]`, the only one in the corpus, and a bare-identifier pattern
// skipped the open -- so its `End Module` 1,277 lines later popped a block it
// did not own.
const OPEN_RE = new RegExp(
  `^\\s*(?:(?:${MODIFIERS}|Const)\\s+)*(${TYPE_KEYWORDS.join("|")})\\b\\s+([A-Za-z_]\\w*|\\[[^\\]]*\\])`,
  "i",
);
const CLOSE_RE = new RegExp(`^\\s*End\\s+(${TYPE_KEYWORDS.join("|")})\\b`, "i");

// Blank string contents in place, preserving length and quotes, so offsets stay
// valid and no comma or bracket inside a literal is ever read as syntax.
function blankStrings(s) {
  let out = "",
    inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      inStr = !inStr;
      out += c;
      continue;
    }
    if (!inStr && c === "'") {
      out += " ".repeat(s.length - i);
      break;
    }
    out += inStr && c !== "\n" ? " " : c;
  }
  return out;
}

// Read the run of attribute groups starting at lines[i], which may span lines.
// Returns null when the line does not open one.
function readAttrRun(lines, i) {
  const startsWithBracket = (s) => decomment(s).trimStart().startsWith("[");
  if (!startsWithBracket(lines[i] ?? "")) return null;

  const groups = [];
  let line = i,
    col = decomment(lines[line]).length - decomment(lines[line]).trimStart().length;
  let text = decomment(lines[line]);

  for (;;) {
    while (col < text.length && /\s/.test(text[col])) col++;
    if (text[col] !== "[") break;

    let depth = 0,
      inStr = false,
      closed = false;
    const group = [];
    scan: for (;;) {
      while (col < text.length) {
        const c = text[col];
        if (inStr) {
          if (c === '"') inStr = false;
        } else if (c === '"') inStr = true;
        else if (c === "[") depth++;
        else if (c === "]") {
          depth--;
          if (depth === 0) {
            col++;
            closed = true;
            break scan;
          }
        }
        group.push(c);
        col++;
      }
      // Unclosed on this line: continue onto the next. This is the 3.8% case.
      line++;
      if (line >= lines.length) break scan;
      text = decomment(lines[line]);
      col = 0;
      group.push(" ");
    }
    if (!closed) return null;
    groups.push(group.join("").replace(/^\[/, ""));
    // Another group may follow immediately, on the next line, or past a blank
    // or comment line. Skipping comments matters: VBA/Strings.twin writes
    //     [PreserveSig(False), ...]
    //     ' Function to return the position of ...
    //     [Description("..." & vbCrLf & _
    // and stopping at the comment made the second group read as the
    // declaration, which is how 142 sites landed in the unresolved bucket.
    let probeLine = line,
      probeText = text,
      probeCol = col;
    for (;;) {
      // Scan the COMMENT-STRIPPED text. WebView2.twin opens with
      //     [WindowsControl("...")]  ' [WindowsControl("...png")]
      // and a raw scan stops on that comment, so the [ClassId] group below it
      // was read as the declaration instead of joining the run.
      const probeCode = blankStrings(probeText);
      while (probeCol < probeCode.length && /\s/.test(probeCode[probeCol])) probeCol++;
      if (probeCol < probeCode.length) break;
      let k = probeLine + 1;
      while (k < lines.length) {
        const t = decomment(lines[k]);
        if (!blankStrings(t).trim()) {
          k++;
          continue;
        } // blank, or a ' comment
        break;
      }
      if (k >= lines.length) break;
      const nxt = decomment(lines[k]);
      if (!nxt.trimStart().startsWith("[")) break;
      probeLine = k;
      probeText = nxt;
      probeCol = 0;
    }
    if (probeText[probeCol] !== "[") break;
    line = probeLine;
    text = probeText;
    col = probeCol;
  }

  return { groups, endLine: line, rest: text.slice(col) };
}

// Split a group's text into attribute names. Arguments are removed first, or a
// comma inside them splits the list in the wrong place.
function attrNames(group) {
  const flat = blankStrings(group).replace(/\([^()]*\)/g, "()");
  const names = [];
  for (const piece of flat.split(",")) {
    const m = /^\s*([A-Za-z_]\w*)\s*(\(\))?\s*$/.exec(piece);
    if (m) names.push({ name: m[1], hasArgs: Boolean(m[2]) });
    else if (piece.trim()) names.push({ name: null, raw: piece.trim() });
  }
  return names;
}

/**
 * Scan the text of one `.twin` file. `file` and `pkg` are only copied into the
 * records. Returns `{ sites, problems }`: a site is one attribute on one
 * declaration, a problem is something the scanner could not resolve.
 */
export function scanText(text, file, pkg) {
  const raw = text.replace(/^\u{FEFF}/u, "");
  const lines = raw.split(/\r?\n/);
  const sites = [],
    problems = [];
  const stack = [];

  for (let i = 0; i < lines.length; i++) {
    const run = readAttrRun(lines, i);

    if (run) {
      const tail = blankStrings(decomment(run.rest)).trim();
      const container = stack.at(-1)?.kind ?? "(file)";
      // An escaped identifier, not an attribute: [_HiddenModule].Foo, [_MAX] = 0.
      const isExpression = /^[.=(]/.test(tail) || (run.groups.length === 1 && /^[-+*/&<>]/.test(tail));
      // An Enum body has no attribute site: a bracket group alone on its line is
      // a member (`[Hidden]` is the member Hidden, `[Description("x")]` one of
      // that name), and with code after it the line is refused (TB5182). So no
      // attribute is recorded for a group with nothing after it, which is also
      // how Report.twin's `[A4 Portrait]` and VBCCR's `[_]` are written.
      const isEnumMember = container === "Enum" && !tail;
      if (!isExpression && !isEnumMember) {
        // What follows the closing ] is the declaration only if it is CODE. A
        // trailing line comment is common -- `[DLLStackCheck(False), ...]   '
        // NOTE: PreserveSig(FALSE) here` -- and taking it as the declaration
        // put the comment text in the report and lost the real target.
        // blankStrings erases a ' comment, so a blank result means "no code".
        let decl = blankStrings(decomment(run.rest)).trim() ? decomment(run.rest) : null;
        if (!decl) {
          let j = run.endLine + 1;
          while (j < lines.length) {
            const t = decomment(lines[j]);
            if (!blankStrings(t).trim()) {
              j++;
              continue;
            }
            // A conditional-compilation or #Region directive can sit between an
            // attribute and what it decorates -- DTPicker.twin puts
            // `#If FEATURE_OLEDRAGDROP Then` there.
            if (/^\s*#/.test(t)) {
              j++;
              continue;
            }
            break;
          }
          decl = decomment(lines[j] ?? "");
        }
        const kind = declarationKind(decl, container);
        const names = run.groups.flatMap(attrNames);
        for (const n of names) {
          // An Enum member may BE an escaped identifier even with code after
          // it -- a name with a space (or none at all) is what tells it from an
          // attribute. It is the member, not an attribute on it.
          if (!n.name && container === "Enum") continue;
          if (!n.name) {
            problems.push({ file, pkg, line: i + 1, why: "unparsed attribute text", text: n.raw });
            continue;
          }
          sites.push({
            attr: n.name,
            hasArgs: n.hasArgs,
            pkg,
            file,
            line: i + 1,
            container,
            kind: kind ?? "UNRESOLVED",
            decl: decl.trim().slice(0, 100),
            inProject: stack.map((s) => s.kind).join(">"),
          });
          if (!kind)
            problems.push({
              file,
              pkg,
              line: i + 1,
              why: "declaration not classified",
              text: decl.trim().slice(0, 100),
            });
        }
      }
      if (run.endLine > i) {
        i = run.endLine;
        continue;
      }
    }

    // Block tracking runs on the code AFTER any attributes on this line, so an
    // inline "[Default] Interface X" still opens its block.
    const body = run && run.endLine === i ? run.rest : lines[i];
    const code = blankStrings(decomment(body));
    if (CLOSE_RE.test(code)) {
      const k = CLOSE_RE.exec(code)[1];
      if (!stack.length) problems.push({ file, pkg, line: i + 1, why: `End ${k} with nothing open` });
      else stack.pop();
      continue;
    }
    const o = OPEN_RE.exec(code);
    if (o && !/^as$/i.test(o[2])) {
      const kind = o[1][0].toUpperCase() + o[1].slice(1).toLowerCase();
      // An `Interface X` line inside a CoClass names one of the CoClass's
      // interfaces; it has no body and no `End Interface`. Pushed as a block it
      // ate the `End CoClass` that followed, leaving every CoClass in the
      // corpus reported as unclosed -- 31 files.
      const insideCoClass = stack.at(-1)?.kind === "Coclass";
      if (!(kind === "Interface" && insideCoClass)) {
        stack.push({ kind, line: i + 1 });
      }
    }
  }

  if (stack.length) {
    problems.push({
      file,
      pkg,
      line: stack[0].line,
      why: `unclosed ${stack.map((s) => s.kind).join(">")} at end of file`,
    });
  }
  return { sites, problems };
}
