# tbKMode verifier

Checks the tbKMode package, and drivers built with it, against Windows itself and against the
WDK's headers. It needs Node.js 20.11 or later and nothing else: no twinBASIC install, no Visual
Studio, no WDK. The twinBASIC
documentation publishes it as `tbKMode-verifier.zip` beside the package's section, with a page
there, *tbKMode Verifier*; in the documentation's repository it lives in
`test/package-tests/tbKMode/verifier/`, which `publish.json` zips.

**No driver is loaded, installed, signed or started**, and no installer is run: the tool reads
files.

## Commands

```sh
node verify.mjs check path\to\tbKMode
node verify.mjs imports MyDriver.sys
node verify.mjs kernels
node verify.mjs wdk
```

- **`check <package folder>`** checks every Declare of the package's `.twin` files (under the
  folder, a `Packages` folder left out), once for each architecture its `#If` compiles it for.
  Its file must be a kernel-mode file that exports its entry point (its `Alias`, else its name) in
  every build the database holds for that architecture; when another file exports it (on x86,
  `hal.dll` exports **KfRaiseIrql**), or the routine is exported by ordinal only, that is said. On
  x86 its calling convention must be the routine's (`FastCall` for a `__fastcall` routine, `CDecl`
  for a `__cdecl` one, neither for `__stdcall`), and the bytes its parameters take on the stack
  must be those of the routine's decorated symbol, where the parameters' types say them: a
  structure passed `ByVal` does not.

  It also checks the package against the WDK's headers, as the WDK databases record them, once
  for each architecture: each Type against the structure of its name (its size, each field's
  offset, and a field shorter than C's), laid out as twinBASIC lays a Type out; each Enum member
  and Const against the value of its name, as a Long, or as a LongLong when the value needs 64
  bits; and each Declare against the prototype of its entry point (how many parameters, how each
  is passed and its size, what it returns; a `Sub` for a Try routine, whose `BOOLEAN` says whether
  it succeeded, is an error). A parameter passed `ByRef` passes its variable's
  address, so it is compared with what the routine's pointer points to: a structure where the
  routine takes the address of a pointer is an error, and so is a variable smaller than what the
  pointer points to (`As Any`, `void *`, a structure the headers do not define and a
  variable-length one match anything). The first kit `config/wdk.json` names decides: WDK
  10.0.22621, the one tbKMode was written from. A difference from it is an error; a later kit's
  differences are notes, and an error a later kit does not have says so. `config/tbKMode.json`
  says what the names alone cannot: the C name of a Type named otherwise, a field the package
  names otherwise, the names not checked, and the sizes and values the package chose itself.

  Findings are `error` (a driver that calls it does not load, or the call or the data goes
  wrong), `warning` (some Windows versions lack it, or a Function whose routine returns nothing),
  `note` (a later WDK differs) and `unchecked`, listed with `--all`; `--json` prints them as JSON.
- **`imports <driver.sys> ...`** checks a built driver's import table. It may import from no
  user-mode DLL, since the kernel loads none for a driver. Each routine it imports from
  `ntoskrnl.exe`, `hal.dll` or `fltmgr.sys` must be exported by each build of that file the
  database holds for the driver's arch: for a 64-bit driver, each Windows version's file; for a
  32-bit one, the x86 import libraries of WDK 10.0.22621. A routine that some versions lack is
  named with those versions, such as **ExFreePool2**, which Windows 10 does not export. An export
  with no name, such as **ZwCreateUserProcess** (ordinal 2), is checked as `#2`, which is how a
  driver whose Declare says `Alias "#2"` imports it.
- **`kernels`** updates `db/kernels.json`, which the zip ships, so a user never needs to run it.
  It fetches only what `config/kernels.json` names and the database lacks: a run with nothing new
  to fetch touches no network. `--refresh` moves each Windows version to its newest build;
  `--rebuild` starts from an empty database. Downloads are kept in `--cache` (default
  `%TEMP%\tbkmode-verifier`), never in this folder: only the export tables are recorded.
- **`wdk`** writes `db/wdk-<kit>.json` for each kit `config/wdk.json` names that has no database,
  or for every kit with `--rebuild`. The zip ships them, so a user never needs to run it. It needs
  Visual Studio with the C++ tools, the Windows SDK of each kit, and the kit installed or its
  bundle named. Work files go to `--cache` (default `%TEMP%\tbkmode-verifier`).

Exit codes: 0 done (for `check`, no error; for `imports`, every driver passed), 1 a Declare has an
error or a driver failed, 2 the command line was refused or the command could not run.

The package is read by the twinBASIC scanner the documentation's tools share
(`scripts/lib/twin-api.mjs`), which `lib/scanner.mjs` names; the zip carries a copy of it in that
file's place. A declaration it misreads is fixed there.

## Self-test

```sh
node --test test/verifier.test.mjs test/wdk.test.mjs
```

It tests the readers on PE files and an import library written in the test, the Declare check on
a small package against a small database, the driver check, and the committed database: its
layout, and that an update with nothing to fetch fetches nothing and changes nothing. For the WDK
it tests the reader of preprocessed C and that of an MSI database's compound file, #Const in #If,
twinBASIC's layout of a Type, the check against two small WDK databases, and the committed WDK
databases' form. No network, no compiler.
Run it after changing the verifier. It is in no gate of the documentation and not in CI: a
contributed package's tools are run when that package's section is updated, not on every change.

## The kernel database

`db/kernels.json` holds, for each file, the builds it was read from and each export with the
indexes of the builds that have it, one export to a line. A build comes from one of two sources:

- **`symbol`**: an x64 file of one Windows version. `kernels` finds its newest build in
  [Winbindex](https://winbindex.m417z.com/)'s index, downloads it from the Microsoft symbol server
  (about 65 MB for all of them), checks its SHA-256 against the index and records its exports.
- **`wdk`**: what a WDK's import libraries say a file exports on one arch, the only source for x86,
  whose files Winbindex does not index. WDK 10.0.22621 is the last with x86 kernel-mode libraries.
  `kernels` reads its installer, `wdksetup.exe`, as data: the manifest inside it names the package
  of headers and libraries and the CABs it consists of, which are served beside the installer.
  Only those are downloaded (about 28 MB), each checked against the manifest's SHA-1, and expanded
  with Windows' `expand.exe`. For x86 the libraries also give each routine's decorated symbol,
  kept under `symbols`: `@KfRaiseIrql@4` is a `__fastcall` routine taking 4 bytes of arguments,
  `_KeLowerIrql@4` a `__stdcall` one.

What the database holds is kept: a past WDK does not change, and a Windows version's build changes
only with `--refresh`. Three things in it come from how the sources work:

- The symbol server keys a file by its PE timestamp and image size, and some builds share both
  (`hal.dll`, a small stub, is built with the same ones again and again). The server then returns
  one of them; a file whose timestamp and size are the key's is taken, its own SHA-256 recorded,
  and the index's in `indexSha256`.
- `absent` names the Windows versions with no x64 build of a file in Winbindex. From Windows 11
  24H2 the HAL is part of the kernel, and Winbindex has no `hal.dll` for those versions; `imports`
  reports them as not checked.
- On x86 some routines are exported by `hal.dll`, not `ntoskrnl.exe`, such as **KfRaiseIrql**,
  **KeAcquireSpinLock** and **ExAcquireFastMutex**; on x64 the kernel exports them.

## The WDK databases

`db/wdk-<kit>.json` holds what one WDK's headers declare, for x86 and x64, as the Visual C++
compiler reads them (its `comment` says how each entry is written): each structure and union with
its size, alignment and fields (a member of a named member as `name.member`, an anonymous
member's members by name, a bitfield by its bits), the typedef names of structures and
enumerations, each enumeration's members, each enumerator's and numeric or string macro's value,
and each function's convention and the kinds of its parameters and result. A pointer's kind names
what it points to (`p8>s16:_UNICODE_STRING`, `p8>p8>s336:_DEVICE_OBJECT`, `p8>v0`), and a
structure the headers name but do not define has no size (`p8>s?:_EPROCESS`).

`wdk` preprocesses the headers `config/wdk.json` names and reads from that what they declare, and
from the headers themselves their macros (`cl /d1PP` loses the name of a macro whose comment goes
on to the next line). It then writes a program that asks the compiler what each name is: a size,
an offset, a value, a prototype. The program is built in parts against one precompiled header. A
line the compiler refuses is left out, so a name read wrongly costs nothing, and only a constant
expression is a value. The program is a user-mode console program that only prints. On x86 it is
built with `/Gz`, as a driver is: most routines are declared with no convention, and are
`__stdcall`.

WDK 10.0.22621 need not be installed: `wdk` reads its kernel headers from the package of its
bundle that `kernels` reads the import libraries from, with that package's own
database (`package.msi`, about 0.6 MB, checked against the manifest's SHA-1), which names the
file each CAB entry is; `lib/msi.mjs` reads it as data. The kit's `shared` and `ucrt` headers are
the Windows SDK's of the same version, which must be installed.
