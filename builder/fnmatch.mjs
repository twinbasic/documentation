// Path patterns with File.fnmatch(..., FNM_PATHNAME) semantics: `*` does not
// cross `/`, `**` does, `?` is one character that is not `/`. The rule of
// `offline_exclude` and of the help archive's skip list.
//
// A module of its own, importing nothing, because check-tree.mjs needs it on
// the render fan-out's critical path and offline-rewrite.mjs is much larger.

// The pattern as a regular expression's source.
function fnmatchSource(pattern) {
  let re = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$()|[]{}\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return re + "$";
}

export function fnmatchPathname(pattern, str) {
  return new RegExp(fnmatchSource(pattern)).test(str);
}

// A list of patterns, compiled once: a pattern with no wildcard matches only
// itself and goes into a Set, the others are regular expressions. The build
// adds a few hundred literal patterns (the pictures' SVGs, when
// picture_svg.offline is false) and tests every path of a tree against the
// list, more than once: testing each path against each pattern, with a regular
// expression made for every test, was half of `dispatch`.
function compile(patterns) {
  const literals = new Set();
  const wild = [];
  for (const pat of patterns) {
    if (/[*?]/.test(pat)) wild.push(new RegExp(fnmatchSource(pat)));
    else literals.add(pat);
  }
  return { length: patterns.length, literals, wild };
}

// By the list's identity. The length is compared as well, since a list a
// caller appended to is the same array.
const compiled = new WeakMap();

// True when `rel` matches one of `patterns`.
export function matchesAny(rel, patterns) {
  if (!patterns?.length) return false;
  let c = compiled.get(patterns);
  if (!c || c.length !== patterns.length) {
    c = compile(patterns);
    compiled.set(patterns, c);
  }
  if (c.literals.has(rel)) return true;
  for (const re of c.wild) if (re.test(rel)) return true;
  return false;
}
