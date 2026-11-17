# tbKMode against the WDK

The tools that write the test cases asserting what Microsoft's WDK says of tbKMode's
declarations, and that find each symbol's Microsoft Learn page. What the WDK's headers say comes
from the verifier's WDK database of the kit that decides (`../verifier/db/wdk-<kit>.json`, the
first kit of `../verifier/config/wdk.json`), which `node verify.mjs wdk` writes once for each kit;
these tools need neither Visual Studio nor the WDK. The verifier's `check` compares the package
with the same databases on its own, and more: these cases are kept because twinBASIC's compiler
is the authority on how it lays out a Type.

The package's declarations come from the indexer's committed snapshot of it, which
`node indexer/twin-index.mjs sync --package tbKMode` writes again for a new version. Run from the
repository's root.

| Tool | Does |
|---|---|
| `wdkcheck.mjs <Module>` | writes `Sources/<fixture>LayoutTests.twin` (each structure's size, each field's offset, 32-bit and 64-bit) and `Sources/<fixture>ValueTests.twin` (each enumeration member's and constant's value), from the WDK database; `../verifier/config/tbKMode.json` says what the names alone cannot, and each module's fixture |
| `learn.mjs [--full] <Module>` | finds Microsoft Learn's page for each Declare, Type, Enum and Delegate, by the DDI reference's URL patterns and then Learn's search, and writes its URL (the reference page's link) and C syntax to `learn/<Module>.json`, which is committed. It looks up only the symbols the file lacks, and drops those the module no longer has; `--full` looks every one up again, to find what Microsoft has added or moved |
| `api.mjs` | a module's declarations, from the package indexer's snapshot (`indexer/snapshots/contributed/tbKMode/api.json`, which the one scanner, `parseTwin`, writes): no tool here reads the package's source itself |

## After a new version of the package, or a new WDK

```
node indexer/twin-index.mjs sync --package tbKMode
node test/package-tests/tbKMode/verifier/verify.mjs check <the package's folder>
node test/package-tests/tbKMode/wdk/wdkcheck.mjs modWDM
node test/package-tests/tbKMode/wdk/wdkcheck.mjs modFltMgr
node test/package-tests/tbKMode/wdk/wdkcheck.mjs modSysInfo
node test/package-tests/tbKMode/wdk/wdkcheck.mjs modImage
node test/package-tests/tbKMode/wdk/learn.mjs modFltMgr
node test/package-tests/tbKMode/wdk/learn.mjs modSysInfo
node test/package-tests/tbKMode/wdk/learn.mjs modDisk ntdddisk mountmgr wdm ntddk ntifs
node test/package-tests/tbKMode/wdk/learn.mjs modImage ntimage wdm ntddk ntifs
package-tests.bat tbKMode
```

A new WDK is added to `../verifier/config/wdk.json` and its database written with
`node test/package-tests/tbKMode/verifier/verify.mjs wdk` (Visual Studio and the kit's SDK
needed); the cases follow the kit that decides, so a later kit changes them only if it is made
the first. After a new version of the package, `learn.mjs` looks up only its new symbols; give it
`--full` now and then, at a new WDK for one, since Microsoft adds and moves pages. A case that
fails anew is a defect of the new version, or an entry of `../verifier/config/tbKMode.json` that
no longer holds; one that passes anew is a fix. The `Sources/*LayoutTests.twin` and
`Sources/*ValueTests.twin` are generated: run the tool again rather than edit them, and the same
goes for `learn/<Module>.json`, in whose diff a link that appears, disappears or moves is a link
to change on the module's page. The other fixtures are written by hand.
