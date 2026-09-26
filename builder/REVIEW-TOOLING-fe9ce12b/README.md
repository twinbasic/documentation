# Evidence for REVIEW-TOOLING-fe9ce12b.md

The working records behind [the review](../REVIEW-TOOLING-fe9ce12b.md), kept as they were
when it was written. Line numbers in them refer to `fe9ce12b`.

| File | What it is |
|---|---|
| [ledger.md](ledger.md) | The orchestrator's condensed record of every pass's findings (A1–A10, L1–L4), the owner's decisions as they were taken, and the verification status. Where its top sections correct a pass, the correction wins. |
| [V1.md](V1.md) | Verifier V1: the `builder/` findings. |
| [V2.md](V2.md) | Verifier V2: the gates, the link checkers, the accessibility tools, CI and the smaller tools. |
| [V3.md](V3.md) | Verifier V3: the compiler harness, sample compiling, the package API and the book pipeline. |
| [V4.md](V4.md) | Verifier V4: pass L3's findings, and the ruling on the A3-6 conflict. |
| [markdown-inventory.md](markdown-inventory.md) | Every place the tooling processes markdown as text, and what markdown-it can supply. The ledger calls it `INVENTORY.md`. Its claim of section mis-pairing in `staging.md` was **not confirmed**; see the review's "Where the passes were wrong". |

These files cite `scratchpad/...` paths: the session folder where the passes and verifiers
ran small scripts. The scripts were not kept. Some copied repository functions verbatim for
comparison, and would distort `scripts/survey_tooling.mjs`'s clone counts if committed; each
result is described in the file that cites it.
