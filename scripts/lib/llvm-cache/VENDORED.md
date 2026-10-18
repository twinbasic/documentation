# Vendored

`README.md`, `llvm-cache.mjs`, `probe.mjs` and `jobtest.ps1` are copied byte for byte from the
folder `tools/llvm-cache` of the twinBASIC launcher repository (`launcher-re`), at commit
`4a2ecd6` (`4a2ecd6a79d49c47d661ba14904c43bed50ec63f`).

A change is made there and copied over, never made in this copy: copy the four files again
from the new commit, unchanged, and put that commit here. Biome leaves this folder alone
(`biome.jsonc`). The harness uses the library through `scripts/lib/tb-llvm-cache.mjs`.

Git blob ids of the copies, the same as at that commit:

| file | blob |
|---|---|
| `README.md` | `b80371fe6fd6b983710ec7a910bdd414206bcc1e` |
| `jobtest.ps1` | `a3f7d2d7759b9c5d3b0124dc2bf959c54e21566d` |
| `llvm-cache.mjs` | `4ff743566610612e2e33b8cecc8a9dd99f64298d` |
| `probe.mjs` | `10ea7f321570056ece129e0c59480ee66b649cf4` |
