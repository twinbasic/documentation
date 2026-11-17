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
  function (0.3.0.5 returns the object type itself) is plain prose. modWDM has an `## Aliases` table
  (CBoolean, KIRQL, KPROCESSOR_MODE); modImage's aliases are commented out in the package.
- **Callouts** are labelled with the package version (`0.3.0.5`) or `timeless`, each backed by
  cases or the probe.
- The owner reviewed the 0.3.0.5 pages, the verifier's included (2026-11-17).
- **A declaration right for the kit the package was written from is no defect**: modSysInfo follows
  the 10.0.22621 SDK (`POLICY_AUDIT_SUBCATEGORY_COUNT` 59, no `FileFsGuidInformation`), and its cases
  check that kit's values (`wdk/modSysInfo.json`, `values` and `sizes`).

## How the pages are written

**The six module pages are written by `test/package-tests/tbKMode/writer/writer.mjs`** (owner,
2026-11-17: generated from sources, documented after the verifier's page, `Writer.md`): each from
its folder's `frame.md`, `names.json` and, for modWDM, `procedures.md`. Edit those, never the
page, then run the writer; `--check` says whether a page differs. Its README says how. The landing
page, `Verifier.md` and `Writer.md` are written by hand. The writer's sources were extracted from
the pages as they were reviewed (2026-11-17), so the earlier per-module scripts of the gitignored
`.claude/tbkmode-parts/` are retired.

## The package's tools (test/package-tests/tbKMode/)

Run when the section is updated, never in a gate (test/package-tests/README.md, *Tools of one
package*). Each folder's README says how.

- `wdk/`: writes the layout and value cases from the verifier's WDK database of the deciding kit
  (`wdkcheck.mjs`, configured by `verifier/config/tbKMode.json`), and finds Microsoft Learn's pages
  (`learn.mjs`, committed `learn/<Module>.json`). Needs neither Visual Studio nor the WDK. The cases
  stay beside the verifier's own check because the compiler is the authority on a Type's layout.
- `exe/`: cases run in a built exe against a stand-in `ntoskrnl.exe` built with MSVC
  (`fake-kernel/`). A routine a new exe case calls is added to the stand-in and its `.def`. A
  routine called in the wrong convention gets an x86 naked stand-in that pops what the defective
  caller pushed; its comment says what to change once fixed.
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
a reader of `#If` blocks takes `#End\s*If`.

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
(2026-11-17), from `tbkmode-issue-3.md` and `tbkmode-issue-4.md`.

## Leads, not on the pages

In [WIP.BugHunt.md](WIP.BugHunt.md#tbkmode): the 16-bit limits (perhaps no defect) and
`SE_SELF_RELATIVE` `&H8000&` against the Integer `Control` field. Omissions, not defects: newer
members missing from `IMAGE_DEBUG_EX_CH` and `ImageMachineType`, `SYMBOLIC_LINK_SET`; optional
pointers declared `ByRef` (the `ByVal vbNullPtr` paragraph covers them).
