// Checking a package against the WDK's headers, through the WDK databases (db/wdk-<kit>.json),
// once for each architecture its #If compiles a declaration for:
//
// - each Type against the structure of its name: its size, and each field's offset and size, the
//   Type laid out as twinBASIC lays it out (tblayout.mjs);
// - each Enum member and Const against the value of its name, compared as the package's test cases
//   compare it: as a Long, or as a LongLong when the value needs 64 bits;
// - each Declare against the prototype of its entry point: the number of parameters, how each is
//   passed and its size, and what it returns.
//
// The first kit decides: a difference from it is an error. A later kit's differences that the
// first does not have are notes, and an error a later kit does not have says so.
import { evaluate } from "./conditions.mjs";
import { ARCHES, parseParam } from "./declares.mjs";
import { declareParts } from "./scanner.mjs";
import { envOf, enumValuesOf, layoutOf, packageModel, typeFor, typeInfo, packageValue } from "./tblayout.mjs";

/**
 * What a database pointer kind points to: "s16:_UNICODE_STRING" for p8>s16:_UNICODE_STRING; null
 * for any other kind, and for a pointer to a member (p8), whose target is not recorded.
 */
export function pointee(kind) {
  const m = /^p\d+>(.*)$/.exec(kind ?? "");
  return m ? m[1] : null;
}

/** A database kind's size in bytes, or null: i4 is 4, a4:u2 is 8, s16:_LIST_ENTRY 16, p8>v0 8. */
export function kindSize(kind) {
  const p = /^p(\d+)>/.exec(kind ?? "");
  if (p) return Number(p[1]);
  const m = /^([A-Za-z?])(\d+)(?::(.*))?$/.exec(kind ?? "");
  if (!m) return null;
  if (m[1] === "a") {
    const e = kindSize(m[3]);
    return e === null ? null : Number(m[2]) * e;
  }
  return Number(m[2]);
}

/**
 * A database kind in words: "a 4-byte unsigned integer", "a pointer to struct _LIST_ENTRY",
 * "struct _LIST_ENTRY".
 */
export function kindText(kind) {
  const to = pointee(kind);
  if (to !== null) return to === "v0" ? "a pointer (void *)" : `a pointer to ${kindText(to)}`;
  if (kind === "F") return "a function";
  const incomplete = /^([sU])\?:(.*)$/.exec(kind ?? "");
  if (incomplete) return `${incomplete[1] === "s" ? "struct" : "union"} ${incomplete[2].replaceAll("~", " ")}`;
  const m = /^([A-Za-z?])(\d+)(?::(.*))?$/.exec(kind ?? "");
  if (!m) return kind;
  const n = Number(m[2]);
  const name = (m[3] ?? "").replaceAll("~", " ");
  switch (m[1]) {
    case "i":
      return `a ${n}-byte integer`;
    case "u":
      return `a ${n}-byte unsigned integer`;
    case "f":
      return n === 4 ? "a float" : "a double";
    case "p":
      return "a pointer";
    case "e":
      return `enum ${name}`;
    case "s":
      return `struct ${name}`;
    case "U":
      return `union ${name}`;
    case "a":
      return `an array of ${n} (${kindText(m[3])})`;
    case "v":
      return "void";
    default:
      return kind;
  }
}

const isInteger = (k) => /^[iue]/.test(k);

/**
 * A structure of the database for an arch: `{name, size, fields: [{path, offset, bit, bits, kind}]}`,
 * or null. `name` may reach into one: "FLT_PARAMETERS.Create" is the member Create of
 * FLT_PARAMETERS, its fields' offsets from its own start.
 */
export function cStructure(db, name, arch) {
  const [base, ...rest] = name.split(".");
  const alias = db.aliases[base];
  const tag = db.types[base] ? base : typeof alias === "string" ? alias : alias?.[arch];
  const rec = db.types[tag]?.[arch];
  if (!rec) return null;
  const read = ([path, off, kind]) => {
    const b = typeof off === "string" ? /^b(\d+)\+(\d+)$/.exec(off) : null;
    return b
      ? { path, offset: Math.floor(Number(b[1]) / 8), bit: Number(b[1]), bits: Number(b[2]), kind }
      : { path, offset: off, kind };
  };
  const fields = rec[2].map(read);
  if (!rest.length) return { name: base, size: rec[0], fields };
  const sub = rest.join(".");
  const at = fields.find((f) => f.path === sub && f.bits === undefined);
  if (!at) return null;
  return {
    name,
    size: kindSize(at.kind),
    fields: fields
      .filter((f) => f.path.startsWith(`${sub}.`))
      .map((f) => ({
        ...f,
        path: f.path.slice(sub.length + 1),
        offset: f.offset - at.offset,
        ...(f.bit !== undefined ? { bit: f.bit - 8 * at.offset } : {}),
      })),
  };
}

/**
 * The field at a path of a structure: one the database records under it, or one reached through a
 * member of a named structure type (CreateHandleInformation.GrantedAccess, where
 * CreateHandleInformation is an OB_POST_CREATE_HANDLE_INFORMATION), with its offset from the
 * outer structure. Null when there is none.
 */
export function fieldAt(db, c, path, arch) {
  const direct = c.fields.find((f) => f.path === path);
  if (direct) return direct;
  const parts = path.split(".");
  for (let k = parts.length - 1; k >= 1; k--) {
    const head = parts.slice(0, k).join(".");
    const f = c.fields.find((x) => x.path === head && x.bits === undefined && /^[sU]\d+:/.test(x.kind));
    if (!f) continue;
    const inner = cStructure(db, f.kind.slice(f.kind.indexOf(":") + 1).replaceAll("~", " "), arch);
    const sub = inner && fieldAt(db, inner, parts.slice(k).join("."), arch);
    if (!sub) return null;
    return {
      ...sub,
      path,
      offset: f.offset + sub.offset,
      ...(sub.bit !== undefined ? { bit: sub.bit + 8 * f.offset } : {}),
    };
  }
  return null;
}

/** The structure a Type is checked against: the configuration's name for it, else its own. */
function structureFor(db, t, arch, config) {
  const mapped = config.ctypes?.[t.name];
  if (mapped) return cStructure(db, mapped, arch);
  return cStructure(db, t.name, arch) ?? cStructure(db, `_${t.name}`, arch);
}

/**
 * The C field a twinBASIC field is: the configuration's path for it, else the path of its name,
 * else the one member of a union or nested structure of its name (at its offset, when several).
 */
function fieldFor(db, arch, c, path, offset) {
  const exact = fieldAt(db, c, path, arch) ?? c.fields.find((f) => f.path.toLowerCase() === path.toLowerCase());
  if (exact) return exact;
  const last = path.toLowerCase();
  const cands = c.fields.filter((f) => f.path.toLowerCase().split(".").at(-1) === last);
  if (cands.length <= 1) return cands[0] ?? null;
  return cands.find((f) => f.offset === offset) ?? null;
}

/** A C structure that ends in an array of 0 or 1 element is variable-length. */
function variableLength(c) {
  const top = c.fields.filter((f) => !f.path.includes("."));
  return /^a[01]:/.test(top.at(-1)?.kind ?? "");
}

/** A database value: `{kind, value}`, value a BigInt or, for a string, the string. */
export function cValue(db, name, arch) {
  const rec = db.values[name];
  const s = typeof rec === "string" ? rec : rec?.[arch];
  if (!s) return null;
  const [kind, v] = s.split(" ");
  if (kind === "s") return { kind, value: Buffer.from(v ?? "", "hex").toString("latin1") };
  if (kind === "w") {
    const units = (v ?? "").match(/..../g) ?? [];
    return { kind, value: String.fromCharCode(...units.map((u) => Number.parseInt(u, 16))) };
  }
  if (/^f/.test(kind)) return { kind, value: null };
  return { kind, value: BigInt(v) };
}

// A value in hex as twinBASIC writes it: a negative one as the bits of a Long, or of a LongLong.
const hex = (v) => {
  const bits = v < 0n ? (v >= -(2n ** 31n) ? 32 : 64) : 0;
  return `&H${(bits ? BigInt.asUintN(bits, v) : v).toString(16).toUpperCase()}`;
};
const num = (v) => (v >= -9999n && v <= 9999n ? `${v}` : `${v} (${hex(v)})`);

/** A Try routine: ExTryToAcquireFastMutex, KeTryToAcquireSpinLockAtDpcLevel, IoTryQueueWorkItem. */
const TRY_ROUTINE = /^[A-Z][a-z]+Try[A-Z]/;

/** The tag of a structure or union the database records under a name or an alias, or null. */
function tagOf(db, name, arch) {
  if (db.types[name]) return name;
  const alias = db.aliases[name];
  return (typeof alias === "string" ? alias : alias?.[arch]) ?? null;
}

/**
 * What is wrong with passing a parameter ByRef where C takes a pointer to `to` (a database kind),
 * as `{is, rest}` for the message, or null. A ByRef parameter passes its variable's address, so
 * the routine reads or writes the variable as the kind its pointer points to:
 *
 * - against a pointer to a pointer, the variable must be a pointer, not a structure (IoCreateDevice
 *   writes the new device's address over a DEVICE_OBJECT's first bytes);
 * - against a pointer to anything else of a known size, the variable must be at least that large
 *   (a LongPtr where the routine initializes an NPAGED_LOOKASIDE_LIST).
 *
 * `As Any`, a String, a Variant, `void *`, a function, a structure the headers do not define and a
 * variable-length structure match anything; a Type that is the C structure itself is left to the
 * Type's own check.
 */
function byRefMismatch(db, arch, p, to, model, config) {
  if (to === null || to === "v0" || to === "F" || /^[sU]\?:/.test(to)) return null;
  const type = String(p.type);
  if (/^(any|string|variant)$/i.test(type)) return null;
  const tb = typeInfo(type, arch, model);
  if (tb.error || tb.kind === "v") return null;
  const ptr = arch === "x64" ? 8 : 4;
  if (/^p\d+/.test(to)) {
    if (tb.kind === "s")
      return {
        is: `is ${type}, a structure`,
        rest: " there: the pointer the routine reads or writes is the structure's first bytes",
      };
    if (tb.size < ptr)
      return { is: `is ${type}, ${tb.size} bytes`, rest: ` there: the pointer it reads or writes is ${ptr} bytes` };
    return null;
  }
  const ts = kindSize(to);
  if (ts === null || tb.size >= ts) return null;
  if (/^[sU]\d+:/.test(to)) {
    const tag = tagOf(db, to.slice(to.indexOf(":") + 1).replaceAll("~", " "), arch);
    const c = tag && cStructure(db, tag, arch);
    if (c && variableLength(c)) return null;
    if (tb.kind === "s") {
      const own = structureFor(db, { name: tb.type }, arch, config);
      if (own && tagOf(db, own.name, arch) === tag) return null;
    }
  }
  return {
    is: `is ${type}, ${tb.size} bytes`,
    rest: ` (${ts} bytes) there: the routine reads or writes ${ts - tb.size} bytes past the variable`,
  };
}

/** One kit's findings: [{module, name, line, arch, severity, key, message}]. */
function findingsFor(parsed, model, db, config) {
  const out = [];
  const skipType = new Set(config.skipType ?? []);
  const skipField = new Set(config.skipField ?? []);
  const skipName = new Set(config.skipName ?? []);
  const noSize = new Set(config.noSize ?? []);
  const fieldMap = config.fields ?? {};
  const sizes = config.sizes ?? {};
  const values = config.values ?? {};

  // Types.
  for (const t of parsed.types.filter((x) => x.kind === "type" && x.vis === "public")) {
    if (skipType.has(t.name)) continue;
    for (const arch of ARCHES) {
      if (typeFor(t.name, arch, model) !== t) continue;
      const add = (severity, key, message) =>
        out.push({ module: t.container, name: t.name, line: t.line, arch, severity, key, message });
      const c = structureFor(db, t, arch, config);
      if (!c) {
        add("unchecked", `type:${t.name}`, `the WDK has no structure ${config.ctypes?.[t.name] ?? t.name}`);
        continue;
      }
      const l = layoutOf(t.name, arch, model);
      if (l.error) {
        add("unchecked", `type:${t.name}`, `its layout is not known: ${l.error}`);
        continue;
      }
      // A C structure that ends in an array of one element is variable-length: a longer buffer in
      // the package is by design, so its size is not compared.
      const expected = sizes[t.name]?.[arch] ?? (noSize.has(t.name) || variableLength(c) ? null : c.size);
      if (expected != null && l.size !== expected)
        add("error", `size:${t.name}`, `it is ${l.size} bytes, the WDK's ${c.name} ${expected}`);
      for (const [i, f] of l.fields.entries()) {
        if (skipField.has(`${t.name}.${f.name}`)) continue;
        const cf = fieldFor(db, arch, c, fieldMap[`${t.name}.${f.name}`] ?? f.name, f.offset);
        if (!cf) {
          add("unchecked", `field:${t.name}.${f.name}`, `the WDK's ${c.name} has no field ${f.name}`);
          continue;
        }
        if (cf.bits !== undefined) {
          add("unchecked", `field:${t.name}.${f.name}`, `the WDK's ${c.name}.${cf.path} is a bitfield`);
          continue;
        }
        if (cf.offset !== f.offset)
          add(
            "error",
            `offset:${t.name}.${f.name}`,
            `${f.name} is at offset ${f.offset}, the WDK's ${c.name}.${cf.path} at ${cf.offset}`,
          );
        const cs = kindSize(cf.kind);
        // A field shorter than C's cuts it off, unless the next field starts inside it (the
        // package splits it in two). A longer one takes in padding or the C fields after it,
        // which the package may merge into one; where it runs past the structure, the Type's size
        // says so. The last field of a variable-length structure is longer by design.
        const next = l.fields[i + 1];
        const split = next && next.offset < f.offset + (cs ?? 0);
        const last = i === l.fields.length - 1 && (/^a[01]:/.test(cf.kind) || noSize.has(t.name));
        if (!last && !split && cs !== null && f.size < cs)
          add(
            "error",
            `fieldsize:${t.name}.${f.name}`,
            `${f.name} takes ${f.size} bytes, the WDK's ${c.name}.${cf.path} (${kindText(cf.kind)}) ${cs}`,
          );
      }
    }
  }

  // Enum members and constants.
  const checkValue = (module, name, line, arch, applies) => {
    if (skipName.has(name)) return;
    const add = (severity, message) => out.push({ module, name, line, arch, severity, key: `value:${name}`, message });
    if (!applies) return;
    const tb = packageValue(name, arch, model);
    if (tb === null) {
      add("unchecked", `the value of ${name} could not be evaluated`);
      return;
    }
    const c =
      name in values
        ? { kind: "config", value: typeof values[name] === "string" ? values[name] : BigInt(values[name]) }
        : cValue(db, name, arch);
    if (!c) {
      add("unchecked", `the WDK has no value ${name}`);
      return;
    }
    if (c.value === null) {
      add("unchecked", `the WDK's ${name} is not an integer`);
      return;
    }
    if (typeof c.value === "string" || typeof tb === "string") {
      if (c.value !== tb) add("error", `${name} is ${JSON.stringify(tb)}, the WDK's ${JSON.stringify(c.value)}`);
      return;
    }
    // As the test cases compare: a value that needs 64 bits as a LongLong, any other as a Long.
    const wide = c.value < -(2n ** 31n) || c.value > 2n ** 32n - 1n;
    const want = BigInt.asIntN(wide ? 64 : 32, c.value);
    if (want !== tb) add("error", `${name} is ${num(tb)}, the WDK's ${num(c.value)}`);
  };
  for (const e of parsed.types.filter((x) => x.kind === "enum" && x.vis === "public"))
    for (const v of enumValuesOf(e))
      for (const arch of ARCHES)
        checkValue(
          e.container,
          `${v.name}`,
          v.line,
          arch,
          typeFor(e.name, arch, model) === e || !typeFor(e.name, arch, model),
        );
  for (const m of parsed.types.filter((x) => x.kind === "module")) {
    const seen = new Set();
    for (const c of (m.members ?? []).filter((x) => x.kind === "const" && x.vis === "public")) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      for (const arch of ARCHES) {
        // A constant under #If is checked on the arch one of its branches is compiled for.
        const branches = m.members.filter((x) => x.kind === "const" && x.name === c.name);
        const applies = branches.some((b) => evaluate(b.cond, envOf(model, arch, m.file)) === true);
        checkValue(m.name, c.name, c.line, arch, applies);
      }
    }
  }

  // Declares.
  for (const m of parsed.types.filter((x) => x.kind === "module")) {
    for (const member of m.members ?? []) {
      const d = declareParts(member.signature ?? "");
      if (!d) continue;
      for (const arch of ARCHES) {
        const add = (severity, key, message) =>
          out.push({ module: m.name, name: member.name, line: member.line, arch, severity, key, message });
        const applies = evaluate(member.cond, envOf(model, arch, m.file));
        if (applies !== true) continue;
        const entry = d.entry.startsWith("#") ? d.name : d.entry;
        let sig = db.functions[entry]?.[arch];
        let shown = entry;
        if (sig?.startsWith("=")) {
          shown = sig.slice(1);
          add(
            "unchecked",
            `macro:${member.name}`,
            `the WDK's ${entry} is a macro for ${shown}, which this Declare does not call`,
          );
          sig = db.functions[shown]?.[arch];
        }
        if (!sig) {
          add(
            "unchecked",
            `proto:${member.name}`,
            db.macros?.includes(entry)
              ? `the WDK declares ${entry} as a macro, with no prototype`
              : `the WDK has no prototype of ${entry}`,
          );
          continue;
        }
        const words = sig.split(" ");
        const ret = words[1];
        let cparams = words.slice(2);
        const variadic = cparams.at(-1) === "...";
        if (variadic) cparams = cparams.slice(0, -1);
        const params = d.params.filter((p) => p.trim()).map(parseParam);
        if (params.some((p) => p === null)) {
          add("unchecked", `proto:${member.name}`, "a parameter could not be read");
          continue;
        }
        const fixed = params.filter((p) => !p.paramArray);
        if (variadic ? fixed.length < cparams.length : fixed.length !== cparams.length)
          add(
            "error",
            `count:${member.name}`,
            `it takes ${fixed.length} parameters, the WDK's ${shown} ${cparams.length}${variadic ? " and more" : ""}`,
          );
        const ptr = arch === "x64" ? 8 : 4;
        for (let i = 0; i < Math.min(fixed.length, cparams.length); i++) {
          const p = fixed[i];
          const ck = cparams[i];
          const cs = kindSize(ck);
          const what = `parameter ${i + 1} (${p.name})`;
          const say = (message) => add("error", `param:${member.name}:${i}`, `${what} ${message}`);
          if (!p.byVal || p.array) {
            const structByAddress = /^[sU]/.test(ck) && arch === "x64" && ![1, 2, 4, 8].includes(cs);
            if (ck[0] !== "p" && !structByAddress)
              say(`is passed ByRef, an address; the WDK's ${shown} takes ${kindText(ck)} there`);
            else if (!p.array) {
              const m = byRefMismatch(db, arch, p, pointee(ck), model, config);
              if (m) say(`${m.is}; the WDK's ${shown} takes ${kindText(ck)}${m.rest}`);
            }
            continue;
          }
          const tb = typeInfo(p.type, arch, model);
          if (tb.error) {
            add("unchecked", `param:${member.name}:${i}`, `${what}: ${tb.error}`);
            continue;
          }
          if (ck[0] === "p") {
            if (tb.size !== ptr) say(`is ${p.type}, ${tb.size} bytes; the WDK's ${shown} takes a pointer there`);
          } else if (isInteger(ck)) {
            if (tb.kind === "f") say(`is ${p.type}; the WDK's ${shown} takes ${kindText(ck)} there`);
            else if ((cs === 8 || tb.size === 8) && cs !== tb.size)
              say(`is ${p.type}, ${tb.size} bytes; the WDK's ${shown} takes ${kindText(ck)} there`);
          } else if (ck[0] === "f") {
            if (tb.kind !== "f" || tb.size !== cs) say(`is ${p.type}; the WDK's ${shown} takes ${kindText(ck)} there`);
          } else if (/^[sU]/.test(ck) && tb.size !== cs)
            say(`is ${p.type}, ${tb.size} bytes; the WDK's ${shown} takes ${kindText(ck)}, ${cs} bytes`);
        }
        const isSub = member.kind === "sub";
        // A Sub may leave a result unread, except where the result is the point of the call: a
        // Try routine's result (a BOOLEAN, a LOGICAL or a ULONG) says whether it acquired what it
        // tried to (owner).
        if (isSub && /^[iu]\d/.test(ret) && TRY_ROUTINE.test(shown))
          add(
            "error",
            `return:${member.name}`,
            `it is a Sub, and the WDK's ${shown} returns whether it succeeded (${kindText(ret)}): the caller cannot tell`,
          );
        if (isSub || !member.returnType) continue;
        if (ret === "v0") {
          add("warning", `return:${member.name}`, `it is a Function, and the WDK's ${shown} returns nothing`);
          continue;
        }
        const tb = typeInfo(member.returnType, arch, model);
        if (tb.error) continue;
        const cs = kindSize(ret);
        const floatMismatch = (tb.kind === "f") !== (ret[0] === "f");
        if (floatMismatch || (cs !== null && tb.size > cs) || (ret[0] === "p" && tb.size !== ptr))
          add(
            "error",
            `return:${member.name}`,
            `it returns ${member.returnType}, ${tb.size} bytes; the WDK's ${shown} returns ${kindText(ret)}${
              !floatMismatch && cs !== null && tb.size > cs ? `: the bytes past the first ${cs} are not set` : ""
            }`,
          );
      }
    }
  }
  return out;
}

/**
 * The findings for a parsed package against the WDK databases, the first of `kits` deciding:
 * [{module, name, line, arch, severity, message}], severity "error", "warning", "note" (a later
 * kit differs) or "unchecked".
 *
 * @param {object} parsed  readPackage's
 * @param {{kit: string, db: object}[]} kits
 * @param {object} config  config/tbKMode.json's: ctypes, fields, skipType, skipField, skipName, noSize, sizes, values
 */
export function checkHeaders(parsed, kits, config = {}) {
  const model = packageModel(parsed);
  const per = kits.map((k) => findingsFor(parsed, model, k.db, config));
  const id = (f) => `${f.arch}\0${f.key}`;
  const flagged = (list) => new Set(list.filter((f) => f.severity === "error" || f.severity === "warning").map(id));
  const checked = (list) => new Set(list.filter((f) => f.severity === "unchecked").map(id));
  const out = per[0].map((f) => ({ ...f }));
  for (let k = 1; k < kits.length; k++) {
    const theirs = flagged(per[k]);
    const notChecked = checked(per[k]);
    for (const f of out)
      if ((f.severity === "error" || f.severity === "warning") && !theirs.has(id(f)) && !notChecked.has(id(f)))
        f.message += ` (the WDK ${kits[k].kit} agrees with the package)`;
    const ours = flagged(per[0]);
    for (const f of per[k])
      if ((f.severity === "error" || f.severity === "warning") && !ours.has(id(f)))
        out.push({ ...f, severity: "note", message: `the WDK ${kits[k].kit}: ${f.message}` });
  }
  return out.map(({ key, ...f }) => f);
}
