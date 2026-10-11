import { scanAttributes, isAttributeOnlyLine } from './lexer.mjs';

function extract(logicalLines) {
  const roots = [];
  const containerStack = [];
  const allEnums = [];
  let inProcedure = false;

  let pendingAttrs = [];
  let pendingDescription = null;

  function currentContainer() {
    return containerStack.length > 0 ? containerStack[containerStack.length - 1] : null;
  }
  function addChild(node) {
    const parent = currentContainer();
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function consumeAttrs(node, sig) {
    if (pendingAttrs.length) node.attrs = [...pendingAttrs];
    if (pendingDescription) node.description = pendingDescription;
    pendingAttrs = [];
    pendingDescription = null;
    if (sig !== undefined) {
      node.signature = sig;
      const am = sig.match(/^(Public|Private|Protected|Friend)\b/i);
      node.access = am ? am[1] : null;
    }
  }

  for (const { line, text, rawText } of logicalLines) {
    let m;

    // scan attributes from rawText for this line
    const lineAttrInfo = scanAttributes(rawText);

    // check if this is an attribute-only line
    if (isAttributeOnlyLine(text)) {
      pendingAttrs.push(...lineAttrInfo.attrs);
      if (lineAttrInfo.description) pendingDescription = lineAttrInfo.description;
      continue;
    }

    // inline attributes: if line has attrs AND a declaration, merge them in
    if (lineAttrInfo.attrs.length || lineAttrInfo.description) {
      pendingAttrs.push(...lineAttrInfo.attrs);
      if (lineAttrInfo.description) pendingDescription = lineAttrInfo.description;
    }

    // strip leading attribute brackets from text for pattern matching
    const stripped = text.replace(/^\s*(\[[^\]]*\]\s*,?\s*)*/, '').trim();
    const rawSig = stripped.replace(/\s+/g, ' ');

    // Priority 1: Container ends
    if ((m = stripped.match(/^End\s+(Module|Class|Interface|Enum|Type|CoClass)\b/i))) {
      const kind = m[1];
      if (/^(Sub|Function|Property)$/i.test(kind)) {
        // shouldn't happen here but safety
      } else {
        // pop matching container
        for (let s = containerStack.length - 1; s >= 0; s--) {
          if (containerStack[s].kind.toLowerCase() === kind.toLowerCase()) {
            containerStack.splice(s, 1);
            break;
          }
        }
      }
      pendingAttrs = [];
      pendingDescription = null;
      continue;
    }

    // Priority 2: CoClass interface references (only inside CoClass)
    // match against original text (not stripped) since [Default]/[Source] are the key markers
    const cur = currentContainer();
    if (cur && cur.kind === 'CoClass') {
      if ((m = text.match(/(Default|Source).*Interface\s+(\w+)/i))) {
        const refText = text.replace(/^\s*/, '').replace(/\s+/g, ' ');
        const node = { kind: 'CoClassInterface', name: m[2], line, signature: refText, access: null, children: [] };
        pendingAttrs = [];
        pendingDescription = null;
        addChild(node);
        continue;
      }
    }

    // Priority 3: Container starts (Interface suppressed inside CoClass)
    if ((m = stripped.match(/^(?:Public|Private|Protected)?\s*Module\s+(\w+)/i))) {
      const node = { kind: 'Module', name: m[1], line, children: [] };
      consumeAttrs(node, rawSig);
      addChild(node);
      containerStack.push(node);
      continue;
    }
    if ((m = stripped.match(/^(?:Public|Private|Protected)?\s*Class\s+(\w+)/i))) {
      const node = { kind: 'Class', name: m[1], line, children: [] };
      consumeAttrs(node, rawSig);
      addChild(node);
      containerStack.push(node);
      continue;
    }
    if (!(cur && cur.kind === 'CoClass') &&
        (m = stripped.match(/^(?:Public|Private)?\s*Interface\s+(\w+)(?:\s+Extends\s+(\S+))?/i))) {
      const node = { kind: 'Interface', name: m[1], line, extends: m[2] || null, children: [] };
      consumeAttrs(node, rawSig);
      addChild(node);
      containerStack.push(node);
      continue;
    }
    if ((m = stripped.match(/^(?:Public|Private)?\s*Enum\s+(\w+)/i))) {
      const node = { kind: 'Enum', name: m[1], line, children: [], members: [] };
      consumeAttrs(node, rawSig);
      addChild(node);
      containerStack.push(node);
      continue;
    }
    if ((m = stripped.match(/^(?:Public|Private)?\s*Type\s+(\w+)/i))) {
      const node = { kind: 'Type', name: m[1], line, children: [] };
      consumeAttrs(node, rawSig);
      addChild(node);
      containerStack.push(node);
      continue;
    }
    if ((m = stripped.match(/^CoClass\s+(\w+)/i))) {
      const node = { kind: 'CoClass', name: m[1], line, children: [] };
      consumeAttrs(node, rawSig);
      addChild(node);
      containerStack.push(node);
      continue;
    }

    // Priority 4: Procedure ends
    if ((m = stripped.match(/^End\s+(Sub|Function|Property)\b/i))) {
      inProcedure = false;
      pendingAttrs = [];
      pendingDescription = null;
      continue;
    }

    // If inside a procedure body, only look for nested Type/Enum (already handled above)
    if (inProcedure) {
      pendingAttrs = [];
      pendingDescription = null;
      continue;
    }

    // Priority 5: Declare
    if ((m = stripped.match(/^(?:Public\s+|Private\s+|Protected\s+|Friend\s+)?Declare(?:Wide)?\s+(?:PtrSafe\s+)?(Sub|Function)\s+(\w+)\s+Lib\s+"([^"]*)"/i))) {
      const subOrFunc = m[1];
      const name = m[2];
      const lib = m[3];
      let returnType = null;
      if (/function/i.test(subOrFunc)) {
        const rtm = stripped.match(/\)\s+As\s+(\w[\w.]*(?:\(Of\s+[^)]+\))?)/i);
        if (rtm) returnType = rtm[1];
      }
      const node = { kind: 'Declare', subKind: subOrFunc, name, line, lib, returnType };
      consumeAttrs(node, rawSig);
      addChild(node);
      continue;
    }

    // Priority 6: Const
    if ((m = stripped.match(/^(?:Public|Private)?\s*Const\s+(\w+)/i))) {
      const node = { kind: 'Const', name: m[1], line };
      consumeAttrs(node, rawSig);
      addChild(node);
      continue;
    }

    // Priority 7: Event
    if ((m = stripped.match(/^(?:Public|Private|Protected)?\s*Event\s+(\w+)/i))) {
      const node = { kind: 'Event', name: m[1], line };
      consumeAttrs(node, rawSig);
      addChild(node);
      continue;
    }

    // Priority 8: Sub/Function
    if ((m = stripped.match(/^(?:Public|Private|Protected|Friend)?\s*(?:Static\s+)?(Sub|Function)\s+(\w+)/i))) {
      const subOrFunc = m[1];
      const name = m[2];
      let returnType = null;
      if (/function/i.test(subOrFunc)) {
        const rtm = stripped.match(/\)\s+As\s+(\w[\w.]*(?:\(Of\s+[^)]+\))?)/i);
        if (rtm) returnType = rtm[1];
      }
      const node = { kind: subOrFunc, name, line, returnType };
      consumeAttrs(node, rawSig);
      addChild(node);
      // interface/type members are bodyless signatures — don't enter procedure mode
      if (!(cur && (cur.kind === 'Interface' || cur.kind === 'Type'))) {
        inProcedure = true;
      }
      continue;
    }

    // Priority 9: Property
    if ((m = stripped.match(/^(?:Public|Private|Protected|Friend)?\s*Property\s+(Get|Let|Set)\s+(\w+)/i))) {
      const accessor = m[1];
      const name = m[2];
      let returnType = null;
      if (/get/i.test(accessor)) {
        const rtm = stripped.match(/\)\s+As\s+(\w[\w.]*(?:\(Of\s+[^)]+\))?)/i);
        if (rtm) returnType = rtm[1];
      }
      const node = { kind: 'Property', accessor, name, line, returnType };
      consumeAttrs(node, rawSig);
      addChild(node);
      if (!(cur && (cur.kind === 'Interface' || cur.kind === 'Type'))) {
        inProcedure = true;
      }
      continue;
    }

    // Priority 10: Implements / Inherits
    if ((m = stripped.match(/^Implements\s+(\S+)/i))) {
      const node = { kind: 'Implements', name: m[1], line };
      consumeAttrs(node, rawSig);
      addChild(node);
      continue;
    }
    if ((m = stripped.match(/^Inherits\s+(\S+)/i))) {
      const node = { kind: 'Inherits', name: m[1], line };
      consumeAttrs(node, rawSig);
      addChild(node);
      continue;
    }

    // Priority 11: Enum members (only inside Enum)
    if (cur && cur.kind === 'Enum') {
      if ((m = stripped.match(/^(\w+)\s*(?:=\s*(.+))?$/))) {
        cur.members.push({ name: m[1], value: m[2]?.trim() ?? null });
        pendingAttrs = [];
        pendingDescription = null;
        continue;
      }
    }

    // Priority 12: Fields (only inside Class/Type, not in procedure)
    if (cur && (cur.kind === 'Class' || cur.kind === 'Type')) {
      if ((m = stripped.match(/^(Public|Protected)\s+(WithEvents\s+)?(\w+)\s+As\s+/i))) {
        const withEvents = !!m[2];
        const name = m[3];
        // skip if name is a keyword that would have been caught above
        const node = { kind: 'Field', name, line, withEvents };
        consumeAttrs(node, rawSig);
        addChild(node);
        continue;
      }
    }

    // non-matching, non-blank line → clear pending attrs
    if (stripped) {
      pendingAttrs = [];
      pendingDescription = null;
    }
  }

  // collect all enums from the tree
  function collectEnums(nodes, filePath) {
    for (const node of nodes) {
      if (node.kind === 'Enum' && node.members) {
        allEnums.push({ name: node.name, line: node.line, members: node.members, file: filePath });
      }
      if (node.children) collectEnums(node.children, filePath);
    }
  }

  return { declarations: roots, collectEnums, allEnums };
}

export { extract };
