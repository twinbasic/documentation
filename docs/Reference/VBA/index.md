---
title: VBA Package
parent: Packages
grand_parent: Reference Section
nav_order: 2
permalink: /tB/Packages/VBA
redirect_from:
  - /tB/Modules
has_toc: false
---

# VBA Package

The VBA built-in package collects the standard runtime library — the modules grouping the standalone procedures (**MsgBox**, **CStr**, **Mid**, **Format**, …), plus a small number of intrinsic classes (**Collection**, **Err**) and twinBASIC's runtime expression engine.

## Classes

- [Collection](../Modules/Collection) -- ordered set of values or object references, accessed by 1-based index or by optional string key
- [ErrObject](../Modules/ErrObject) -- the singleton **Err** object holding information about the most recent run-time error
- [TbExpressionService](../Modules/ExpressionService) -- runtime expression engine — parse and evaluate twinBASIC-syntax expressions supplied as strings

## Modules

- [(Default)](../Modules/HiddenModule) -- unqualified low-level intrinsics — the **GetMem** / **PutMem** family, **AllocMem**, atomic operations, compile-time reflection, codegen and stack-inspection primitives, …
- [Compilation](../Modules/Compilation) -- compile-time intrinsics that record the project, component, procedure, and source file at the call site
- [Constants](../Modules/Constants) -- global character, pointer, and error-base constants reachable without qualification (**vbCrLf**, **vbNullString**, **vbObjectError**, …)
- [Conversion](../Modules/Conversion) -- type coercion (**CBool**, **CDate**, **CType**, …), number ↔ string parsing, base conversion, and **Variant**-with-error construction
- [DateTime](../Modules/DateTime) -- reading the system clock, building **Date** values from components, parsing them out of strings, and shifting them by chosen units
- [FileSystem](../Modules/FileSystem) -- pathname-based and file-number-based operations on files and directories
- [Financial](../Modules/Financial) -- annuity calculations, internal-rate-of-return analysis on variable cash flows, and asset depreciation
- [Information](../Modules/Information) -- **Is…** predicates, **VarType** / **TypeName**, array bounds and construction, raw pointers (**ObjPtr**, **StrPtr**, **VarPtr**), and **RGB** colour helpers
- [Interaction](../Modules/Interaction) -- dialogs (**MsgBox**, **InputBox**), inline conditionals (**Choose**, **Switch**, **IIf**), process launching, registry helpers, environment, and dynamic-dispatch primitives
- [Math](../Modules/Math) -- sign and magnitude, trigonometry, exponentials and logarithms, the square root, rounding, and pseudo-random numbers
- [Strings](../Modules/Strings) -- measuring, searching, slicing, padding, joining, splitting, and formatting **String** values

> [!NOTE]
>
> The modules listed above are used for grouping documentation, they don't always match exactly with the implementation details of the VBA package.
