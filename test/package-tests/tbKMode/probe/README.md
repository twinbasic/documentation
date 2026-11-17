# tbKMode probe

What a driver built with the contributed package tbKMode imports: the probe builds small drivers,
each calling one part of the package, and prints the import table of each built file. The landing
page's warning about the package's own settings (`docs/Reference/Contributed/tbKMode/index.md`,
*Building a driver*) names its scenarios. **No driver is loaded, installed, signed or started**:
the import table is read from the file.

It is outside every gate and CI: it needs Windows, a twinBASIC install (the newest
`twinBASIC_IDE_BETA_<n>` on the Desktop, as `tbbuild` finds it) and the package in the indexer's
store (`node indexer/twin-index.mjs sync`). Run it again when the section's `indexed_from` moves
to a new version of the package.

## Running it

```sh
node test/package-tests/tbKMode/probe/probe.mjs
node test/package-tests/tbKMode/probe/probe.mjs --package-settings suggested
```

Each scenario is built in both architectures (`--arch` names one), about 15 s a build. A line
`PASS <id> <arch>` means the driver imports from `ntoskrnl.exe` and `HAL.dll` only, which is all
the kernel resolves for a driver; `FAIL` means it imports from another DLL as well, and cannot
load. The DLLs and routines follow each line. Exit 0 every driver passed, 1 one failed, 2 the
probe could not run.

Each driver is the `contributed-tbKMode` sample template with a driver's settings
(`DRIVER_SETTINGS` in `probe.mjs`: Native Subsystem, `DriverEntry` as the entry point, Runtime
Binding Of DLL Declares off, relocations kept, and the three Disable ... Checks), the package
embedded from the store, and `src/<id>.twin` as its one module, built with `tbbuild --build`.
`--package-settings suggested` adds to the package's own `Settings` the five a driver's code needs
(`SUGGESTED_PACKAGE_SETTINGS`), the change the package's author was asked for.

## The scenarios

| id | The driver calls |
|---|---|
| `declares` | `ZwClose`, a Declare of the package: the control |
| `interlocked` | `InterlockedIncrement`, a procedure of the package in a 64-bit build and a Declare in a 32-bit one |
| `stack` | `IoGetNextIrpStackLocation` and `IoSkipCurrentIrpStackLocation`, procedures of the package that call no routine of the kernel |
| `copied` | the same two procedures copied into the driver's own module under other names |
| `ordinal` | `ZwCreateUserProcess` through a Declare of the driver's own with `Alias "#2"`, which the 64-bit kernel exports with no name; the driver imports `#2` |

The twinBASIC compiler compiles a package's code with the package's own settings, not the
project's. In 0.3.0.5 the package's `Settings` set none of a driver's, so its procedures are
compiled as user-mode code: on BETA 1042, `interlocked` (64-bit) and `stack` fail with the
published settings, and every scenario passes with the suggested ones.
