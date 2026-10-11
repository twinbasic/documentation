const ATTR_SKIP = new Set(['UseGetLastError', 'MustBeQualified']);

function lex(fileContent) {
  const raw = fileContent.replace(/^﻿/, '');
  const physicalLines = raw.split(/\r?\n/);
  const result = [];

  let i = 0;
  while (i < physicalLines.length) {
    const startLine = i + 1; // 1-based
    let joinedCode = '';
    let joinedRaw = '';

    for (;;) {
      const physLine = physicalLines[i] ?? '';
      i++;

      // character-by-character strip
      let code = '';
      let inString = false;
      for (let c = 0; c < physLine.length; c++) {
        const ch = physLine[c];
        if (inString) {
          if (ch === '"') {
            if (physLine[c + 1] === '"') {
              c++; // escaped quote — skip both
            } else {
              inString = false;
              code += '""'; // placeholder
            }
          }
          // else skip string content
        } else {
          if (ch === "'") break; // rest is comment
          if (ch === '"') {
            inString = true;
          } else {
            code += ch;
          }
        }
      }

      joinedCode += code;
      joinedRaw += (joinedRaw ? '\n' : '') + physLine;

      // check continuation: _ preceded by whitespace at end of stripped code
      const contMatch = joinedCode.match(/\s_\s*$/);
      if (contMatch) {
        joinedCode = joinedCode.slice(0, contMatch.index) + ' ';
        if (i >= physicalLines.length) break;
        // continue to next physical line
      } else {
        break;
      }
    }

    const trimmed = joinedCode.trim();
    if (trimmed) {
      result.push({ line: startLine, text: trimmed, rawText: joinedRaw });
    }
  }

  return result;
}

function scanAttributes(rawText) {
  const attrs = [];
  let description = null;

  // find each [...] block (may contain comma-separated attributes)
  const bracketRe = /\[([^\]]+)\]/g;
  let bm;
  while ((bm = bracketRe.exec(rawText)) !== null) {
    const inner = bm[1];
    // split by commas, but not commas inside parentheses
    const parts = [];
    let depth = 0, start = 0;
    for (let c = 0; c < inner.length; c++) {
      if (inner[c] === '(') depth++;
      else if (inner[c] === ')') depth--;
      else if (inner[c] === ',' && depth === 0) {
        parts.push(inner.slice(start, c).trim());
        start = c + 1;
      }
    }
    parts.push(inner.slice(start).trim());

    for (const part of parts) {
      const am = part.match(/^(\w+)(?:\((.+)\))?$/);
      if (!am) continue;
      const name = am[1];
      const value = am[2]?.trim() ?? null;
      if (ATTR_SKIP.has(name)) continue;
      if (name === 'Description') {
        if (value) {
          const strMatch = value.match(/"([^"]*)"/);
          if (strMatch && strMatch[1]) description = strMatch[1];
        }
        continue;
      }
      if (value && /^"[0-9A-Fa-f-]{36}"$/.test(value)) {
        attrs.push(name);
      } else if (value !== null) {
        attrs.push(`${name}(${value})`);
      } else {
        attrs.push(name);
      }
    }
  }
  return { attrs, description };
}

function isAttributeOnlyLine(text) {
  // after stripping all [...] blocks, only whitespace remains
  return /^\s*(\[[^\]]*\]\s*,?\s*)+\s*$/.test(text);
}

export { lex, scanAttributes, isAttributeOnlyLine, ATTR_SKIP };
