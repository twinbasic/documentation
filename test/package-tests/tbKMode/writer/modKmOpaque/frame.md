---
title: modKmOpaque
parent: tbKMode Package
permalink: /tB/Packages/Contributed/tbKMode/modKmOpaque
has_toc: false
---

# modKmOpaque module
{: .no_toc }

Offsets of fields inside kernel structures that Windows keeps opaque.

An opaque structure, such as [**EPROCESS**](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/eprocess), has no documented layout: drivers receive a pointer to it and pass that pointer to the kernel's routines, which read its fields. This module holds the offset of one field, **Token**, as the package's author found it for several versions of Windows.

<!-- test: none -- a fact of Windows: the layout of an opaque structure is not documented -->
> [!WARNING] timeless
> Microsoft documents no offset inside an opaque structure, and its layout changes between versions of Windows, updates included. An offset is right only for the builds it was found on, and a driver that reads or writes through it on any other build corrupts kernel memory. The documented routines read the field on every build: for a process's token, [**PsReferencePrimaryToken**](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-psreferenceprimarytoken), which the package does not declare.

## Constants

The Windows versions are those the package's description of each constant gives. None is declared with a type, so each is an **Integer**.

{{table:consts}}

## See Also

- [modWDM](modWDM) module -- the documented routines a driver calls
- [EPROCESS](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/eprocess) -- Microsoft's page on the opaque process structure
