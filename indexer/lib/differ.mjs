function flattenSymbols(apiJson) {
  const symbols = [];

  for (const mod of apiJson.modules || []) {
    symbols.push({
      container: null,
      name: mod.name,
      kind: mod.kind,
      access: mod.access,
      signature: null,
      file: mod.file,
      key: `${mod.kind}:${mod.name}`,
    });

    // Skip members/events of Private containers — they are not
    // part of the package's public API surface.
    if (mod.access === 'Private') continue;

    for (const mem of mod.members || []) {
      symbols.push({
        container: mod.name,
        name: mem.name,
        kind: mem.kind,
        access: mem.access,
        signature: mem.signature,
        description: mem.description,
        attributes: mem.attributes,
        file: mod.file,
        key: `${mod.name}.${mem.name}.${mem.kind}`,
      });
    }

    for (const evt of mod.events || []) {
      symbols.push({
        container: mod.name,
        name: evt.name,
        kind: 'Event',
        access: 'Public',
        signature: evt.signature,
        file: mod.file,
        key: `${mod.name}.${evt.name}.Event`,
      });
    }
  }

  for (const e of apiJson.enums || []) {
    symbols.push({
      container: null,
      name: e.name,
      kind: 'Enum',
      access: e.access,
      signature: null,
      file: e.file,
      key: `Enum:${e.name}`,
    });
  }

  for (const t of apiJson.types || []) {
    symbols.push({
      container: null,
      name: t.name,
      kind: 'Type',
      access: t.access,
      signature: null,
      file: t.file,
      key: `Type:${t.name}`,
    });
  }

  return symbols;
}

function diffApi(baseline, current) {
  const baseMap = new Map();
  for (const sym of flattenSymbols(baseline)) {
    baseMap.set(sym.key, sym);
  }

  const curMap = new Map();
  for (const sym of flattenSymbols(current)) {
    curMap.set(sym.key, sym);
  }

  const added = [];
  const modified = [];
  const removed = [];
  const unchanged = [];

  for (const [key, cur] of curMap) {
    const base = baseMap.get(key);
    if (!base) {
      added.push(cur);
    } else if (
      cur.signature !== base.signature ||
      JSON.stringify(cur.attributes) !== JSON.stringify(base.attributes)
    ) {
      modified.push({ current: cur, baseline: base });
    } else {
      unchanged.push(cur);
    }
  }

  for (const [key, base] of baseMap) {
    if (!curMap.has(key)) {
      removed.push(base);
    }
  }

  return { added, modified, removed, unchanged };
}

function auditCoverage(apiJson, docPageMap) {
  const documented = [];
  const undocumented = [];

  for (const mod of apiJson.modules || []) {
    if (mod.access === 'Private') continue;

    const page = docPageMap.get(mod.name);
    if (page) {
      documented.push({ name: mod.name, kind: mod.kind, access: mod.access, container: null, file: mod.file, docPage: page });
    } else {
      undocumented.push({ name: mod.name, kind: mod.kind, access: mod.access, container: null, file: mod.file });
    }

    for (const mem of mod.members || []) {
      if (mem.access === 'Private') continue;
      const page = docPageMap.get(mem.name);
      if (page) {
        documented.push({ ...mem, container: mod.name, file: mod.file, docPage: page });
      } else {
        undocumented.push({ ...mem, container: mod.name, file: mod.file });
      }
    }

    for (const evt of mod.events || []) {
      const page = docPageMap.get(evt.name);
      if (page) {
        documented.push({ name: evt.name, kind: 'Event', access: 'Public', container: mod.name, file: mod.file, docPage: page });
      } else {
        undocumented.push({ name: evt.name, kind: 'Event', access: 'Public', container: mod.name, file: mod.file });
      }
    }
  }

  for (const e of apiJson.enums || []) {
    if (e.access === 'Private') continue;
    const page = docPageMap.get(e.name);
    if (page) {
      documented.push({ name: e.name, kind: 'Enum', access: e.access, container: null, file: e.file, docPage: page });
    } else {
      undocumented.push({ name: e.name, kind: 'Enum', access: e.access, container: null, file: e.file });
    }
  }

  for (const t of apiJson.types || []) {
    if (t.access === 'Private') continue;
    const page = docPageMap.get(t.name);
    if (page) {
      documented.push({ name: t.name, kind: 'Type', access: t.access, container: null, file: t.file, docPage: page });
    } else {
      undocumented.push({ name: t.name, kind: 'Type', access: t.access, container: null, file: t.file });
    }
  }

  return { documented, undocumented };
}

export { diffApi, auditCoverage };
