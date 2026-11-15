# tbKMode against the WDK

The tools that check tbKMode's declarations against Microsoft's WDK, and write the test cases
that assert what the WDK says. Nothing here loads, installs or starts a driver: each C++ program
is a user-mode console program that includes the kernel headers for their types and only prints.

Needs Visual Studio with the C++ tools and the WDK (the newest of each is found by itself). The
package's declarations come from the indexer's committed snapshot of it, which
`node indexer/twin-index.mjs sync --package tbKMode` writes again for a new version.
Run from the repository's root. Work files go to `%TEMP%\tbkmode-wdk\<Module>`.

| Tool | Does |
|---|---|
| `wdkcheck.mjs <Module>` | writes `Sources/<fixture>LayoutTests.twin` (each structure's size, each field's offset, 32-bit and 64-bit) and `Sources/<fixture>ValueTests.twin` (each enumeration member's and constant's value), from what the WDK's headers say; `<Module>.json` beside it says what the names alone cannot |
| `learn.mjs [--full] <Module>` | finds Microsoft Learn's page for each Declare, Type, Enum and Delegate, by the DDI reference's URL patterns and then Learn's search, and writes its URL (the reference page's link) and C syntax to `learn/<Module>.json`, which is committed. It looks up only the symbols the file lacks, and drops those the module no longer has; `--full` looks every one up again, to find what Microsoft has added or moved |
| `declares.mjs <Module>` | each Declare's name against the exports of its `Lib`, and its parameter count against the C prototype in `learn/<Module>.json` |
| `api.mjs` | a module's declarations, from the package indexer's snapshot (`indexer/snapshots/contributed/tbKMode/api.json`, which the one scanner, `parseTwin`, writes): no tool here reads the package's source itself |
| `msvc.mjs` | finding the compiler and the WDK |

## After a new version of the package, or a new WDK

```
node indexer/twin-index.mjs sync --package tbKMode
node test/package-tests/tbKMode/wdk/wdkcheck.mjs modFltMgr
node test/package-tests/tbKMode/wdk/wdkcheck.mjs modSysInfo
node test/package-tests/tbKMode/wdk/learn.mjs modFltMgr
node test/package-tests/tbKMode/wdk/learn.mjs modSysInfo
node test/package-tests/tbKMode/wdk/learn.mjs modDisk ntdddisk mountmgr wdm ntddk ntifs
node test/package-tests/tbKMode/wdk/learn.mjs modImage ntimage wdm ntddk ntifs
node test/package-tests/tbKMode/wdk/declares.mjs modFltMgr
node test/package-tests/tbKMode/wdk/declares.mjs modSysInfo
package-tests.bat tbKMode
```

and the same for each module that has a `<Module>.json`. After a new version of the package,
`learn.mjs` looks up only its new symbols; give it `--full` now and then, at a new WDK for one, since
Microsoft adds and moves pages. A case that fails anew is a defect of the
new version, or an entry of `<Module>.json` that no longer holds; one that passes anew is a fix.
The `Sources/*LayoutTests.twin` and `Sources/*ValueTests.twin` are generated: run the tool again
rather than edit them, and the same goes for `learn/<Module>.json`, in whose diff a link that
appears, disappears or moves is a link to change on the module's page. The other fixtures are
written by hand.
