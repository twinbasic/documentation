# tbKMode verifier

Checks the tbKMode package, and drivers built with it, against Windows itself. It needs Node.js
and nothing else: no twinBASIC install, no Visual Studio, no WDK. It is to be released as a zip
beside the package's test project; until then it lives here, and every file it needs is in this
folder.

**No driver is loaded, installed, signed or started**: the tool reads files.

## Commands

```sh
node verify.mjs imports MyDriver.sys
node verify.mjs kernels
```

- **`imports <driver.sys> ...`** checks a built driver's import table: it may import from no
  user-mode DLL, since the kernel loads none for a driver, and each routine it imports from
  `ntoskrnl.exe`, `hal.dll` or `fltmgr.sys` must be exported by that file in every Windows version
  of `db/kernels.json`. A routine that some versions lack is named with those versions, such as
  **ExFreePool2**, which Windows 10 does not export. An export with no name, such as
  **ZwCreateUserProcess** (ordinal 2), is checked as `#2`, which is how a driver whose Declare says
  `Alias "#2"` imports it. Only a 64-bit driver's routines are checked: the database has no x86
  kernels. A 32-bit driver is still checked for user-mode DLLs.
- **`kernels [--cache <dir>]`** writes `db/kernels.json`, which the zip ships, so a user never
  needs to run it. It finds each file of `config/kernels.json` in each Windows version there in
  [Winbindex](https://winbindex.m417z.com/)'s index, downloads that build from the Microsoft symbol
  server, checks its SHA-256 against the index, and records its export table. The files are kept
  in the cache (default `%TEMP%\tbkmode-verifier\symbols`), never in this folder: only their
  export tables are recorded. About 65 MB the first time.

Exit codes: 0 done (for `imports`, every driver passed), 1 a driver failed, 2 the command line was
refused or the command could not run.

## The database

`db/kernels.json` holds, for each file, the builds it was read from (Windows version, build number,
update and SHA-256) and each export with the indexes of the builds that have it, one export to a
line. Two things in it come from how the sources work:

- The symbol server keys a file by its PE timestamp and image size, and some builds share both
  (`hal.dll`, a small stub, is built with the same ones again and again). The server then returns
  one of them; a file whose timestamp and size are the key's is taken, its own SHA-256 recorded,
  and the index's in `indexSha256`.
- `absent` names the Windows versions with no build of a file in Winbindex. From Windows 11 24H2
  the HAL is part of the kernel, and Winbindex has no `hal.dll` for those versions; `imports`
  reports them as not checked.

## Planned

- `check`: the package's declarations against a database of the WDK (structure layouts,
  enumeration and constant values, prototypes and calling conventions), shipped with the zip, and
  the layout and value test modules written from it, which today's `../wdk/` tools write with
  Visual Studio and the WDK.
- A self-test with no network, run by the documentation's `test.bat`.
- The zip, and its card on the Downloads page.
