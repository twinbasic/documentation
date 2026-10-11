function formatSignature(node) {
  switch (node.kind) {
    case 'Module':
    case 'Class':
    case 'Type':
    case 'CoClass':
      return `${node.kind} ${node.name}`;
    case 'Interface':
      return node.extends ? `Interface ${node.name} Extends ${node.extends}` : `Interface ${node.name}`;
    case 'Enum':
      return `Enum ${node.name}`;
    case 'Declare': {
      let sig = `Declare ${node.subKind} ${node.name}`;
      if (node.returnType) sig += `() As ${node.returnType}`;
      return sig;
    }
    case 'Sub':
    case 'Function': {
      let sig = `${node.kind} ${node.name}`;
      if (node.returnType) sig += `() As ${node.returnType}`;
      return sig;
    }
    case 'Property': {
      let sig = `Property ${node.accessor} ${node.name}`;
      if (node.returnType) sig += `() As ${node.returnType}`;
      return sig;
    }
    case 'Const':
      return `Const ${node.name}`;
    case 'Event':
      return `Event ${node.name}`;
    case 'Implements':
      return `Implements ${node.name}`;
    case 'Inherits':
      return `Inherits ${node.name}`;
    case 'Field':
      return node.withEvents ? `WithEvents ${node.name}` : node.name;
    case 'CoClassInterface':
      return node.signature || `Interface ${node.name}`;
    default:
      return node.name;
  }
}

function emitNode(node, depth, lines) {
  const indent = '  '.repeat(depth);
  let entry = `${indent}- L${node.line}: \`${formatSignature(node)}\``;

  if (node.kind === 'Enum' && node.members) {
    const count = node.members.length;
    const anchor = node.name.toLowerCase();
    entry += ` (${count} member${count !== 1 ? 's' : ''}) — [full listing](#${anchor})`;
  }

  if (node.attrs && node.attrs.length) {
    entry += ` \`[${node.attrs.join(', ')}]\``;
  }
  if (node.description) {
    entry += ` — ${node.description}`;
  }

  lines.push(entry);

  if (node.children) {
    for (const child of node.children) {
      emitNode(child, depth + 1, lines);
    }
  }
}

function emitMarkdown(packageName, fileResults) {
  const lines = [`# ${packageName}`, ''];

  for (const { relativePath, declarations } of fileResults) {
    if (!declarations.length) continue;
    lines.push(`## ${relativePath}`, '');
    for (const decl of declarations) {
      emitNode(decl, 0, lines);
    }
    lines.push('');
  }

  // Enum Details chapter
  const allEnums = [];
  for (const { relativePath, enums } of fileResults) {
    for (const e of enums) {
      allEnums.push({ ...e, file: relativePath });
    }
  }

  if (allEnums.length) {
    lines.push('## Enum Details', '');
    for (const e of allEnums) {
      lines.push(`### ${e.name}`);
      lines.push(`_${e.file}, L${e.line}_`, '');
      lines.push('| Value | Name |');
      lines.push('|-------|------|');
      for (const mem of e.members) {
        lines.push(`| ${mem.value ?? ''} | ${mem.name} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export { formatSignature, emitNode, emitMarkdown };
