---
title: tbKMode Verifier
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/Verifier
has_toc: false
---

# tbKMode Verifier
{: .no_toc }

Checks the tbKMode package's declarations, and drivers built with it, against the Windows kernel and the WDK's headers.

The verifier is a Node.js program, published beside this section as <a href="tbKMode-verifier.zip" download>tbKMode-verifier.zip</a> ({{tbdocs:size:tB/Packages/Contributed/tbKMode/tbKMode-verifier.zip}}). It needs Node.js 20.11 or later and nothing else: no twinBASIC install, no Visual Studio and no WDK. It reads files only. It loads, installs and starts no driver, and runs no installer.

* TOC
{:toc}

## What it checks

`check` reads every `.twin` file of the package and checks each **Declare**, once for each architecture its `#If` block compiles it for, 32-bit (x86) and 64-bit (x64):

- The file the Declare names must be a kernel-mode file, `ntoskrnl.exe`, `hal.dll` or `fltmgr.sys`, and must export the routine (the `Alias`, else the Declare's name) in every Windows version the verifier knows for that architecture. A routine that some versions lack is named with those versions. A routine that another file exports, as `hal.dll` exports **KfRaiseIrql** on x86, and one exported by ordinal only, as **ZwCreateUserProcess** is, are named with the fix.
- A Declare that names a user-mode DLL, such as `ntdll`, is an error: the kernel loads no user-mode DLL for a driver.
- On x86, the calling convention must be the routine's: `FastCall` for a `__fastcall` routine, `CDecl` for a `__cdecl` one, and neither for a `__stdcall` one.
- On x86, the bytes the parameters take on the stack must be the bytes the routine takes. A parameter passed `ByRef`, an array and a pointer take 4; a **LongLong**, **Double** or **Currency** passed `ByVal` takes 8. A structure passed `ByVal` is not sized, and its Declare is listed as not checked.
- On both architectures, the Declare must match the routine's prototype in the WDK's headers: the same number of parameters, each passed as the routine takes it (`ByRef` where it takes a pointer, `ByVal` where it takes a value) and of its size, and a result no wider than the routine returns. A `Sub` may leave the routine's result unread, but not that of a Try routine (**ExTryToAcquireFastMutex**), a `BOOLEAN`, `LOGICAL` or `ULONG` that says whether the routine acquired what it tried to. A parameter passed `ByRef` passes its variable's address, so the variable must be what the routine's pointer points to: not a structure where the routine takes the address of a pointer, and no smaller than what the pointer points to. A parameter `As Any`, and one where the routine takes a `void *`, matches anything.

`check` also compares the package's other declarations with the WDK's headers, once for each architecture:

- Each **Type** against the structure of its name: its size, each field's offset, and a field shorter than the structure's. The Type is laid out as twinBASIC lays it out, its `#If` blocks and its [**PackingAlignment**](../../../Core/Attributes#packingalignment) included.
- Each **Enum** member and **Const** against the value of its name, as a **Long**, or as a **LongLong** when the value needs 64 bits.

WDK 10.0.22621, the kit the package was written from, decides: a difference from it is an error. The newer WDK the verifier also knows adds a `note` where it differs, such as an enumeration that has gained a member, and an error says so when the newer kit agrees with the package. The verifier's `config/tbKMode.json` says what the names alone cannot: the C structure of a Type named otherwise, a field the package names otherwise, the names not compared, and the sizes and values the package chose itself.

`imports` reads the import table of a built driver. A driver may import from no user-mode DLL, and each routine it imports from a kernel-mode file must be exported by that file in every Windows version the verifier knows for the driver's architecture. A driver that imports a user-mode DLL does not load; see the warning under [Building a driver](.#building-a-driver).

## Running it

Extract the zip, then run the verifier from its folder, `tbKMode-verifier`:

```sh
node verify.mjs check path\to\tbKMode
node verify.mjs imports path\to\MyDriver.sys
```

The folder given to `check` is any folder that holds the package's `.twin` files: a clone of the package's repository, or a package exported with [impexp](../../../../Features/Packages/Import-Export-Tool). `check` prints each declaration with its findings, by module: `error` for a driver that does not load, or a call or a structure that goes wrong; `warning` for a routine that some Windows versions lack, or a **Function** whose routine returns nothing; `note` for a difference in the newer WDK. `--all` also lists what could not be checked, and `--json` prints the findings as JSON. Both commands exit with 0 when they find no error, 1 when they find one, and 2 when they cannot run.

The verifier reads the package with a copy of the twinBASIC scanner that the twinBASIC documentation's tools share. Its `README.md` describes each command and its options in full, and `node --test test/verifier.test.mjs test/wdk.test.mjs` runs its own tests.

## Where its knowledge comes from

The zip carries a database of what each kernel-mode file exports, `db/kernels.json`, made from two sources:

- **64-bit**: the files themselves, one build of each for each Windows version the database names, from Windows 10 22H2 to the newest Windows 11. Each is downloaded from the Microsoft symbol server, found through the [Winbindex](https://winbindex.m417z.com/) index and checked against the hash the index gives.
- **32-bit**: the x86 import libraries of WDK 10.0.22621, the last WDK with x86 kernel-mode libraries. They name the exports of the kernel that WDK was made for. Their decorated symbols also give each routine's calling convention and the bytes of its arguments: `@KfRaiseIrql@4` is a `__fastcall` routine taking 4 bytes, `_KeLowerIrql@4` a `__stdcall` one.

`node verify.mjs kernels` updates the database: it downloads only what the database lacks, so a database that is up to date needs no network. `--refresh` moves each Windows version to its newest build. Only the export tables are kept in the database, never the files.

The zip also carries a database of each WDK the verifier knows, `db/wdk-<kit>.json`: each structure's size and fields, each enumeration member's and macro's value, and each routine's prototype, for x86 and x64, as the Visual C++ compiler reads the kit's headers. `node verify.mjs wdk` writes them, once for each kit; it needs Visual Studio with the C++ tools, so a user of the verifier never runs it. WDK 10.0.22621 need not be installed: its headers are read from its installer's package of headers and libraries, which is read as data and never run.

## See Also

- [tbKMode](.) package -- building a driver, and the package's test cases
- [modWDM](modWDM) module -- the declarations of routines, and their defects
