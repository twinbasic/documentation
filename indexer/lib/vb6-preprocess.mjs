const CONTAINER_MAP = {
  ".bas": "Module",
  ".cls": "Class",
  ".frm": "Class",
  ".dsr": "Class",
  ".ctl": "Class",
};

/**
 * A VB6-format file (.bas, .cls, .frm, .ctl, .dsr) rewritten as the twinBASIC
 * source of the one type it holds, for the scanner of scripts/lib/twin-api.mjs:
 * the VERSION line, the Begin...End block of a form or control and the header
 * Attribute lines are dropped, a `Module <name>` or `Class <name>` line goes
 * in front of the body, and the per-member `Attribute Name.VB_...` lines are
 * dropped from the body.
 *
 * The type is named by the header's `Attribute VB_Name`, else by `fileName`, the
 * file's own name without its extension. A file with no such attribute is one
 * VB6 itself would name by its file: community NewTabCtl's subclass/mBSSubclass.bas
 * is commented out whole, `' Attribute VB_Name = "mBSSubclass"` included, and
 * would otherwise be a module called `Unnamed`.
 *
 * @param {string} fileContent
 * @param {string} extension  with its dot, in any case
 * @param {string} [fileName]  the file's name without its extension
 * @returns {{content: string, lineOffset: number, name: string}}
 */
function preprocessVB6(fileContent, extension, fileName) {
  const lines = fileContent.replace(/^﻿/, "").split(/\r?\n/);
  const ext = extension.toLowerCase();
  const containerKind = CONTAINER_MAP[ext] || "Class";

  let name = null;
  let i = 0;

  // Skip VERSION line (.cls, .frm, .ctl, .dsr)
  if (ext !== ".bas" && i < lines.length && /^VERSION\s+/i.test(lines[i])) {
    i++;
  }

  // Skip Begin...End block (.cls, .frm, .ctl, .dsr) — depth-tracked for nested controls
  if (ext !== ".bas" && i < lines.length && /^Begin\b/i.test(lines[i].trim())) {
    let depth = 1;
    i++;
    while (i < lines.length && depth > 0) {
      const trimmed = lines[i].trim();
      if (/^Begin\b/i.test(trimmed)) depth++;
      else if (/^End$/i.test(trimmed)) depth--;
      i++;
    }
  }

  // Skip Attribute VB_* lines, extract VB_Name
  while (i < lines.length) {
    const m = lines[i].match(/^Attribute\s+VB_(\w+)\s*=\s*(.*)/i);
    if (!m) break;
    if (/^Name$/i.test(m[1])) {
      const nm = m[2].match(/"([^"]*)"/);
      if (nm) name = nm[1];
    }
    i++;
  }

  const lineOffset = i;

  // Collect body, stripping per-member Attribute lines
  const bodyLines = [];
  while (i < lines.length) {
    if (/^Attribute\s+\w+\.\w+\s*=/.test(lines[i])) {
      i++;
      continue;
    }
    bodyLines.push(lines[i]);
    i++;
  }

  if (!name) name = fileName || "Unnamed";

  const content = `${containerKind} ${name}\n${bodyLines.join("\n")}\nEnd ${containerKind}`;

  return { content, lineOffset, name };
}

export { preprocessVB6, CONTAINER_MAP };
