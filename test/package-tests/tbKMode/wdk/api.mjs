// A tbKMode module's declarations, as the package indexer's snapshot records them
// (indexer/snapshots/contributed/tbKMode/api.json, written by `twin-index.mjs sync` through the one
// scanner, parseTwin in scripts/lib/twin-api.mjs). The tools here read nothing of the package's
// source themselves: a shape that scanner misreads is fixed there, once, for every reader.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
let cached = null;

/** The whole snapshot: `{types: [...]}`, each type with its members, fields or values. */
export function snapshot() {
  cached ??= JSON.parse(readFileSync(path.join(repo, "indexer/snapshots/contributed/tbKMode/api.json"), "utf8"));
  return cached;
}

/** The Types and Enums declared inside Module `mod`. */
export function typesOf(mod) {
  return snapshot().types.filter((t) => t.in === mod);
}

/** The members of Module `mod`: its Declares, procedures, Delegates, Consts and variables. */
export function membersOf(mod) {
  const m = snapshot().types.find((t) => t.kind === "module" && t.name === mod);
  if (!m) throw new Error(`the snapshot has no Module ${mod}`);
  return m.members ?? [];
}

/**
 * A member's signatures, one per branch of the #If it is declared under: `{cond, signature}` and
 * whatever else the snapshot writes on the item. A member declared once has its own `cond`, the
 * condition of the #If it is under, or none (null).
 */
export function signaturesOf(member) {
  return member.signature ? [{ cond: member.cond ?? null, signature: member.signature }] : (member.signatures ?? []);
}

/** True for the condition of an #If branch that applies to x86 alone: `Not Win64`, `Win64 = 0`. */
export function x86Only(cond) {
  return /\bNot\s*\(?\s*Win64\b|\bWin64\s*=\s*0\b/i.test(cond ?? "");
}

/**
 * Every Declare of Module `mod`, one entry for each branch of an #If it is declared under, as the
 * snapshot records what it binds: `{name, cond, lib, libConst, entry, cdecl, fastcall, wide,
 * params}`, one of `lib` and `libConst` null. A key every branch has alike is written once, on the
 * member, and one that differs on each branch's item; `cdecl`, `fastcall` and `wide` only when true.
 */
export function declaresOf(mod) {
  return membersOf(mod)
    .filter((m) => m.declare)
    .flatMap((m) =>
      signaturesOf(m).map((s) => {
        const key = (k) => s[k] ?? m[k];
        return {
          name: m.name,
          cond: s.cond,
          lib: key("lib") ?? null,
          libConst: key("libConst") ?? null,
          entry: key("entry"),
          cdecl: key("cdecl") === true,
          fastcall: key("fastcall") === true,
          wide: key("wide") === true,
          params: key("params"),
        };
      }),
    );
}
