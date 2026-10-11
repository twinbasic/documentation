const CONTAINER_MAP = {
  '.bas': 'Module',
  '.cls': 'Class',
  '.frm': 'Class',
  '.dsr': 'Class',
  '.ctl': 'Class',
};

function preprocessVB6(fileContent, extension) {
  const lines = fileContent.replace(/^﻿/, '').split(/\r?\n/);
  const ext = extension.toLowerCase();
  const containerKind = CONTAINER_MAP[ext] || 'Class';

  let name = null;
  let i = 0;

  // Skip VERSION line (.cls, .frm, .ctl, .dsr)
  if (ext !== '.bas' && i < lines.length && /^VERSION\s+/i.test(lines[i])) {
    i++;
  }

  // Skip Begin...End block (.cls, .frm, .ctl, .dsr) — depth-tracked for nested controls
  if (ext !== '.bas' && i < lines.length && /^Begin\b/i.test(lines[i].trim())) {
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
    const m = lines[i].match(/^Attribute\s+VB_(\w+)\s*=\s*(.*)/);
    if (!m) break;
    if (m[1] === 'Name') {
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

  if (!name) name = 'Unnamed';

  const content = `${containerKind} ${name}\n${bodyLines.join('\n')}\nEnd ${containerKind}`;

  return { content, lineOffset };
}

export { preprocessVB6, CONTAINER_MAP };
