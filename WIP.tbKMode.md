# tbKMode --- working notes

The contributed tbKMode package (fafalone, GitHub `fafalone/tbKMode`), documented at
`docs/Reference/Contributed/tbKMode/`. This file holds what its section decided and what is known
about the package beyond its pages; the rules for every contributed package are in
[WIP.Contributed.md](WIP.Contributed.md).

## What the section decided (owner)

- **Experimental**, with no second-agent reproduction (owner waived it): `parent: Experimental
  Packages`, its line in `Experimental.md`, its folder in `_book.yml`'s `left_out:`.
- **No driver is ever loaded, installed, signed or started.** Building one is allowed (the probe
  does), and so is reading a built one. Samples are compiled only (`check_build`), never run.
- **Pages**: the landing page and one per module (modWDM, modFltMgr, modSysInfo, modDisk, modImage,
  modKmOpaque), each `parent: tbKMode Package` at `/tB/Packages/Contributed/tbKMode/<Module>`, the
  verifier's page, `Verifier.md`, and the writer's, `Writer.md`, after it. Tables of two columns (Constants three), rows alphabetical, the
  name cell `**Name**{: #Name }` or `[**Name**](<checked Microsoft URL>){: #Name }`, one-sentence
  descriptions, enum members not listed. modWDM's procedures are `###` sections. An object-type
  function (from 0.3.0.5 it returns the object type itself) is plain prose. modWDM has an `## Aliases`
  table (CBoolean, KIRQL, KPROCESSOR_MODE, POOL_FLAGS), and from 0.3.0.6 modImage has one too
  (IMAGE_LOAD_CONFIG_DIRECTORY, an Alias of the 32-bit or the 64-bit structure, whose two targets the
  writer joins: the snapshot keeps no `#If` of an alias). A name that is a procedure in one build and
  a Declare in the other (InterlockedIncrement, KeAcquireSpinLock, KeQuerySystemTime) is a `###`
  section in `procedures.md` with a syntax for each build.
- **Callouts** are labelled with the package version (`0.3.0.8`) or `timeless`, each backed by
  cases or the probe; the one about twinBASIC itself, under *Building a driver*, is labelled `BETA
  1042` and names its reproducer, `bugs/declare-fastcall-static-binding-32bit`.
- The owner reviewed the 0.3.0.5 pages, the verifier's included (2026-11-17).
- **A page holds every Module of its file** (0.3.0.8): ImageMachineType moved into a Module
  SuppressedWarnings of modImage.twin, under `[IgnoreWarnings(TB0012)]`, so the writer and
  `wdk/api.mjs` take a module's names from every Module whose file is `<Module>.twin`, and
  modImage's page lists it. Its members above `&H7FFF` are Integer literals from 0.3.0.8, the
  16-bit convention, so the `values` of `verifier/config/tbKMode.json` give their negative values.
- **A declaration right for the kit the package was written from is no defect**: modSysInfo follows
  the 10.0.22621 SDK (`POLICY_AUDIT_SUBCATEGORY_COUNT` 59, no `FileFsGuidInformation`), and its cases
  check that kit's values (`wdk/modSysInfo.json`, `values` and `sizes`). From 0.3.0.6 the load
  configuration directories have the fields of the newest kit (`UmaFunctionPointers`), a version the
  package chose: `sizes` asserts them, and modImage says so in prose.
- **The package's conventions are no defects** (owner, 2026-11-22, from fafalone on tbKMode#4,
  2026-11-19): the 16-bit limits are Integers (or SCHAR_MIN a Byte) holding the bits of C's value,
  as the package's USHORT fields are Integers, so `values` asserts -1, -32768 and 128, and modWDM
  says so in prose under Constants; and **SOURCE_FILE** holds ANSI bytes that the driver puts there,
  since kernel mode has no conversion of a String, so the IoAcquireRemoveLock case fills it with
  `StrConv(..., vbFromUnicode)` and the page describes it in prose.
- **IO_DRIVER_CREATE_CONTEXT.SiloContext stays a NOTE** (owner, 2026-11-22): fafalone answered on #4
  that it is under `#If NTDDI_VERSION >= NTDDI_WIN10_RS1` as in the SDK, but the package defines no
  NTDDI_VERSION and a project's constants do not reach a package, so the field is never compiled;
  the NOTE says why.

## How the pages are written

**The six module pages are written by `test/package-tests/tbKMode/writer/writer.mjs`** (owner,
2026-11-17: generated from sources, documented after the verifier's page, `Writer.md`): each from
its folder's `frame.md`, `names.json` and, for modWDM, `procedures.md`. Edit those, never the
page, then run the writer; `--check` says whether a page differs. Its README says how. The landing
page, `Verifier.md` and `Writer.md` are written by hand. The writer's sources were extracted from
the pages as they were reviewed (2026-11-17); the earlier per-module scripts are deleted. **No
gate runs `writer.mjs --check`** (owner, 2026-11-17): the package is small and the owner alone
maintains its section. It needs only the repository's files, so it can join `test.bat` once others
edit the section.

## The package's tools (test/package-tests/tbKMode/)

Run when the section is updated, never in a gate (test/package-tests/README.md, *Tools of one
package*). Each folder's README says how.

- `wdk/`: writes the layout and value cases from the verifier's WDK database of the deciding kit
  (`wdkcheck.mjs`, configured by `verifier/config/tbKMode.json`), and finds Microsoft Learn's pages
  (`learn.mjs`, committed `learn/<Module>.json`). Needs neither Visual Studio nor the WDK. The cases
  stay beside the verifier's own check because the compiler is the authority on a Type's layout.
- `exe/`: cases run in a built exe against stand-ins built with MSVC (`fake-kernel/`):
  `ntoskrnl.exe`, and for x86 `hal.dll`, which passes each call to the first so that the cases
  read one record. From 0.3.0.6 the package binds its Declares in the exe's import table (its
  Settings turn run-time binding off), so `prepare.mjs` returns them as `beside` and
  `tbrun --beside` copies them into the exe's folder, where the loader finds them before System32;
  a routine the exe imports that a stand-in lacks stops the exe from starting (0xC0000139), so a
  routine a new case reaches is added to the stand-in and its `.def`. A routine called in the wrong
  convention gets an x86 naked stand-in that pops what the defective caller pushed, and a comment
  that says what to change once fixed (none from 0.3.0.8, which declares KfAcquireSpinLock
  FastCall). **A 32-bit exe ends at its first FastCall case** (twinBASIC BETA 1042,
  `bugs/declare-fastcall-static-binding-32bit`): those cases are last in the file and record *no
  result*; the cases that call no FastCall Declare come before them. The first of them,
  KeAcquireSpinLock_PassesTheLock, passes on 0.3.0.8 (two runs): ECX holds the lock's address at the
  call, but the call leaves the stack 4 bytes off, and the next case ends the exe.
- `probe/`: builds small drivers with `tbbuild --build` and judges their import tables with the
  verifier's `checkDriver`; it backs the landing page's warning on the package's own settings.
- `verifier/`: published as `tbKMode-verifier.zip` (its page, `Verifier.md`). `check` checks each
  Declare per arch against `db/kernels.json`, and the whole package against the WDK databases;
  `imports` checks a built driver. The kernel database holds the x64 exports of each Windows version
  from the symbol server (keys from Winbindex) and the x86 exports and decorated symbols of WDK
  10.0.22621's import libraries, read from its installer as data (never run). `kernels` updates it,
  fetching only what it lacks (owner: past WDKs and builds do not change); `--refresh` after a
  Windows update.
- The WDK databases, `verifier/db/wdk-<kit>.json`, one for each kit of `verifier/config/wdk.json`,
  written by `verify.mjs wdk` with Visual Studio: every structure's layout, value and prototype of
  the headers, x86 and x64. **Kits (owner, 2026-11-17): 10.0.22621 and the newest, 22621
  deciding**: a difference from it is an error, the newest's differences are notes. 22621's kernel
  headers come from its bundle's headers-and-libraries package (its MSI names the CAB entries); its
  SDK must be installed. `check` lays each Type out as twinBASIC does (`lib/tblayout.mjs`), a model
  that agreed with every layout check of the compiled cases (3764, BETA 1042), and its findings
  reproduce every failing layout and value check of `expect.json`. A pointer's kind names what it
  points to (database format 2), so `check` compares a `ByRef` parameter with it: a structure where
  C takes the address of a pointer (IoCreateDevice, SeLocateProcessImageName), or a variable
  smaller than the pointee (ExInitializeNPagedLookasideList), is an error. It cannot find
  CmCallbackReleaseKeyObjectIDEx: a `ByRef UNICODE_STRING` is a `PCUNICODE_STRING`, and the defect
  is that the Get routine gives a pointer. A `Sub` is accepted for a routine that returns a result,
  except a Try routine's (owner, 2026-11-17): its `BOOLEAN`, `LOGICAL` or `ULONG` says whether it
  succeeded (ExTryToAcquireFastMutex).

Lessons: a case's failure message holds no address and no list longer than 100 characters; a
compile case's record holds its line number, so new ones go at the end of a file. A field or type
named like a WDK macro breaks the generated C++ unless guarded (the WDK program hides such macros
with push_macro). Never pin `NTDDI_VERSION`. A layout case compares offsets and sizes only; the
verifier's check also compares field sizes. The source closes one `#If` with `#endif` (no space), so
a reader of `#If` blocks takes `#End\s*If`. The compiler's constants are numbers, 1 and 0, not
Booleans: `#If Win64 = 1` holds in a 64-bit build and `(TWINBASIC = 1) Or (Win64 = 1)` in both (BETA
1042), so `conditions.mjs` gives them 1 and 0, and reads the scanner's `Not (x)`, its form of an
`#Else`, as logical; wdkcheck leaves out a field whose `#If` holds in neither build. A constant the
package declares as a LongLong is compared as one (POOL_FLAG_REQUIRED_END, `&H0000000080000000^`):
CLng of it overflows.

From writing the WDK databases: on x86 the headers need `/Gz` (most routines have no convention in
their declaration); `cl /d1PP` loses the name of a `#define` whose comment runs on to the next line,
so macro names come from the included headers' text (`/showIncludes`); MSVC accepts a dllimport
function's address as `constexpr`, so a value must be asserted arithmetic, an enum or an array; a
`static_assert` inside a template reports once per instantiation, so a refusal belongs on the
item's own line; a part of 100 items keeps the compiler under its 100 errors. A twinBASIC Type is
laid out like C (natural alignment, LongLong 8 on x86 too); the scanner gives a Type no `#If`
condition and its attributes no arguments' conditions, so `readPackage` reads both from the text,
and each file's `#Const` (an undefined constant is Empty).

## Upstream

Issues for fafalone's repository are drafted in the main checkout's `.claude/drafts/`; the owner
posts them. #1 (modFltMgr, modDisk) and #2 (modSysInfo) were answered by 0.3.0.5 (comment for #2:
`tbkmode-issue-2-comment.md`). #3 (the package's Settings) and #4 (the declarations of modWDM and modImage) are filed
(2026-11-17), from `tbkmode-issue-3.md` and `tbkmode-issue-4.md`. 0.3.0.6 answered #3 (its Settings
set the five) and most of #4; fafalone's replies on #2 and #4 decided the conventions above. The
reply to #4 on 0.3.0.6 is drafted in `tbkmode-issue-4-comment.md`. 0.3.0.8 fixed every item of
its list (1-12); what is left is IO_DRIVER_CREATE_CONTEXT.SiloContext, KUSER_SHARED_DATA (fine as it
is) and the names shared with VBA.

## Leads, not on the pages

In [WIP.BugHunt.md](WIP.BugHunt.md#tbkmode): `SE_SELF_RELATIVE` `&H8000&` against the Integer
`Control` field. Omissions, not defects: newer
members missing from `IMAGE_DEBUG_EX_CH` and `ImageMachineType`, `SYMBOLIC_LINK_SET`; optional
pointers declared `ByRef` (the `ByVal vbNullPtr` paragraph covers them).
