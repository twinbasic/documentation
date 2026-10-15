---
title: AutoCompleteLib Package
parent: Contributed Packages
has_toc: false
indexed_from: 1.0.3.0
permalink: /tB/Packages/Contributed/AutoCompleteLib/
---

# AutoCompleteLib Package
{: .no_toc }

**Author:** Krool. **Version:** 1.0.3.0

The **AutoCompleteLib** contributed package provides Windows shell auto-complete behavior for text-input controls. The package references the **AutoCompleteGuids** package, which holds the GUID and interface definitions the class uses.

## Classes

- [AutoComplete](AutoComplete) -- attaches Windows shell auto-complete behaviour to a text-input control's window handle.

## Enumerations

- [Enumerations](Enumerations/) -- the three enumerations of the **AutoComplete** class: its options, its file-system options and its sources of suggestions.

## Test cases

The notes and warnings of this section are checked by the test cases in [AutoCompleteLib-tests.twinproj](AutoCompleteLib-tests.twinproj), a twinBASIC project. It uses AutoCompleteLib as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
