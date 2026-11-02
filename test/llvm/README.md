# LLVM claims probe

What the documentation says code compiled with LLVM does, run again on a new BETA. `src/` is a
project whose `Claims` module prints one line, `key: value`, for each claim; `run.mjs` runs it with
`tbrun --exe` in four modes, 32-bit and 64-bit, each with LLVM off and on for the whole project
(**Compiler Options (DEBUG)** and **(BUILD)**, as `tbrun --llvm` sets them), and compares every line
of the IDE run and of the built exe with `expect.json`. `gra64/` is a 64-bit build that must fail.

It is outside every gate and CI: it needs Windows, a twinBASIC install (the newest
`twinBASIC_IDE_BETA_<n>` on the Desktop, as `tbrun` finds it) and a licence that allows LLVM
(Professional or Ultimate). A run of all five takes about two minutes.

The callouts on these pages that describe defects have reproducers of their own under `bugs/`,
which `bug_repro.mjs verify` runs; this probe holds the rest of what the pages say, and some details
of those defects that the reproducers do not check.

## Running it

```sh
node test/llvm/run.mjs                 # every mode; exit 0 when all print what expect.json says
node test/llvm/run.mjs --only win64    # one mode
node test/llvm/run.mjs --update        # write what this build prints into expect.json
```

After a new BETA, run it, and for each difference it lists, change the page that states the claim
(below), then `--update`. Read the diff of `expect.json` before committing it: each changed line is
a changed claim. `expect.json`'s `beta` names the build its lines are from.

A value in `expect.json` written `/.../` is a regular expression, for a value that changes from one
run to the next: the IDE run's `for-step-llvm`, whose loop variable ends anywhere from 28 to millions.
`--update` keeps such a pattern while the new value still matches it.

## The keys and the pages

How each procedure was compiled is read three ways, since no one way works in every mode: `assert`
says whether `Debug.Assert` evaluated its condition (only in an IDE run of code compiled without
LLVM), `return address` whether **InternalGetReturnAddress** returned 0 (under LLVM; 32-bit only),
and `overflow error` the error of a **Double** multiplication that overflows.

| Key | Claim | Page |
|---|---|---|
| `default` | the project's own options apply | `docs/LLVM/Getting-Started.md`, *LLVM in twinBASIC* |
| `llvm`, `llvm-comma`, `llvm-space`, `llvm-comma-space` | `+llvm` turns LLVM on, the flags separated by commas, spaces, or both | `docs/LLVM/Getting-Started.md`, *Per-procedure LLVM options*; `docs/Reference/Attributes.md`, CompilerOptions |
| `optimize-only`, `optimize-size-only`, `cpu-only` | the other flags do not turn LLVM on, and the attribute replaces the project's options | the same |
| `empty` | `[CompilerOptions("")]` turns LLVM off, under LLVM for the whole project too | the same |
| `llvm-sse`, `llvm-sse2`, `all-cpu` | a CPU flag keeps LLVM on; the long sample compiles and runs; SSE2 changes the overflow | the same, and the **Double** WARNING under *Language support* |
| `assert-false-llvm-went-on`, `assert` in each line | **Debug.Assert** does not stop and does not evaluate its condition under LLVM, nor in a built exe | `docs/LLVM/Getting-Started.md`, *Language support*; `docs/Reference/Default/VBA/Debug.md` |
| `return address` in each line (32-bit) | **InternalGetReturnAddress** is not 0 without LLVM, in an IDE run and an exe, and 0 under LLVM | `docs/Reference/Default/VBA/HiddenModule/AddClassInstanceFlag.md` |
| mode `gra64` | a 64-bit build cannot generate code for a call to **InternalGetReturnAddress** | the same, its NOTE |
| `unroll-llvm` | **UnrollLoop** does not change what the loop does | `docs/Reference/Default/VBA/Compilation/UnrollLoop.md`; the LLVM page, *Unrolling a loop* |
| `double-llvm`, `double-llvm-sse2`, `double-llvm-checks`, `double-plain` | each operation's error, and what the variable holds after it (`kept`: its old value); **FloatingPointErrorChecks(True)** changes nothing | the **Double** WARNING under *Language support*; `docs/Reference/Data-Types/Double.md` |
| `single-llvm`, `single-plain` | the same for **Single**: under LLVM a **Single** division that overflows raises 6, and without LLVM an addition, subtraction, multiplication or division whose result is a **Single** raises nothing | `docs/Reference/Core/Divide.md`, `docs/Reference/Data-Types/Single.md`, `docs/Reference/Operators.md` |
| `for-step-llvm`, `for-step-plain` | a `For` loop whose **Step** is a `ByVal` parameter, with a later `ByRef ... As Boolean`, runs once with a wrong step: the count of passes, and the loop variable after it | the For...Next WARNING under *Language support*; `docs/Reference/Core/For-Next.md` |

`single-plain`'s `/0` (no error, infinity) is not stated on any page yet: VB6 raises error 11 there.
