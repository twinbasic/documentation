# Static linking claims probe

What the experimental NOTE of the Static Linking page says links and what does not, run again on a
new BETA. `run.mjs` runs each mode for 32-bit and 64-bit builds and compares what it finds with
`expect.json`.

It is outside every gate and CI: it needs Windows and a twinBASIC install (the newest
`twinBASIC_IDE_BETA_<n>` on the Desktop, as `tbrun` finds it). A run of all eight takes a few
minutes. It needs no compiler of C: the objects it links are committed.

## Running it

```sh
node test/static-linking/run.mjs                      # every mode; exit 0 when all are as expect.json says
node test/static-linking/run.mjs --only refused-win64 # one mode
node test/static-linking/run.mjs --update             # write what this build finds into expect.json
```

After a new BETA, run it, and for each difference it lists, change the page, then `--update`. Read
the diff of `expect.json` before committing it: each changed line is a changed claim.
`recheck_callouts.mjs` runs it through the `static <mode>` items of the NOTE's marker.

## The modes

| Mode | What it does | Claim |
|---|---|---|
| `links-<arch>` | `tbrun --exe` of `links/`: code that needs nothing, and code that needs only what `"stdlib"` provides (`memset`, `strcpy`, `memcpy`, `strlen`, `malloc`, `free`), in the IDE and in a built exe | it links code that needs nothing from the C runtime beyond the few functions twinBASIC provides |
| `refused-<arch>` | `tbbuild` of `refused/`, read for its errors: `sprintf`, `qsort`, `sin`, `floor`, `atoi` and C++ `new[]` and `delete[]` | it does not link the rest of the C runtime, or the C++ runtime |
| `sqlite-<arch>` | `tbrun --exe` of the SQLite sample in the install's `projects` folder, which reports through message boxes that tbrun closes and records | the SQLite amalgamation links and works |
| `detours-<arch>` | `package_tests.mjs DetoursLib`, whose project links SlimDetours: no case runs unless it links, and each case detours a function of Windows | SlimDetours links and works |

A sample of DetoursLib would not check the last one: `check_examples.mjs` fails no sample for an
error inside an embedded package, so its compile says nothing about SlimDetours.

## The objects

`c/` holds the sources, and `c/build.cmd 32` and `c/build.cmd 64` write the objects into
`links/Miscellaneous/` and `refused/Miscellaneous/`, with the command line the page gives. They are
built by relative names, so that no path of the machine is written into them: `grep` them for your
user name before committing new ones. `run.mjs` does not use `c/`.
