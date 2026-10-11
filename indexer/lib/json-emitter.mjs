function buildModule(node, file) {
  const children = node.children || [];
  const implementsList = [];
  let inheritsName = node.extends || null;
  const members = [];
  const events = [];

  for (const child of children) {
    switch (child.kind) {
      case 'Implements':
        implementsList.push(child.name);
        break;
      case 'Inherits':
        inheritsName = child.name;
        break;
      case 'Event':
        events.push({
          name: child.name,
          signature: child.signature || `Event ${child.name}`,
          attributes: child.attrs || [],
        });
        break;
      default:
        members.push({
          name: child.name,
          kind: child.kind,
          access: child.access || null,
          signature: child.signature || child.name,
          attributes: child.attrs || [],
          description: child.description || null,
        });
        break;
    }
  }

  members.sort((a, b) => a.name.localeCompare(b.name));
  events.sort((a, b) => a.name.localeCompare(b.name));
  implementsList.sort();

  return {
    name: node.name,
    kind: node.kind,
    file,
    access: node.access || 'Public',
    attributes: node.attrs || [],
    implements: implementsList,
    inherits: inheritsName,
    members,
    events,
  };
}

function buildEnum(node, file) {
  return {
    name: node.name,
    file,
    access: node.access || 'Public',
    members: (node.members || []).map(m => ({
      name: m.name,
      value: m.value ?? null,
    })),
  };
}

function buildType(node, file) {
  const fields = (node.children || [])
    .filter(c => c.kind === 'Field')
    .map(c => ({
      name: c.name,
      signature: c.signature || c.name,
    }));

  return {
    name: node.name,
    file,
    access: node.access || 'Public',
    fields,
  };
}

function emitApiJson(packageName, version, fileResults) {
  const modules = [];
  const enums = [];
  const types = [];

  for (const { relativePath, declarations } of fileResults) {
    for (const node of declarations) {
      switch (node.kind) {
        case 'Module':
        case 'Class':
        case 'Interface':
        case 'CoClass':
          modules.push(buildModule(node, relativePath));
          break;
        case 'Enum':
          enums.push(buildEnum(node, relativePath));
          break;
        case 'Type':
          types.push(buildType(node, relativePath));
          break;
      }
    }
  }

  modules.sort((a, b) => a.name.localeCompare(b.name));
  enums.sort((a, b) => a.name.localeCompare(b.name));
  types.sort((a, b) => a.name.localeCompare(b.name));

  return JSON.stringify({ package: packageName, version, modules, enums, types }, null, 2) + '\n';
}

export { emitApiJson };
