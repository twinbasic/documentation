# TBMANLIB_Diagnostic --- working notes

The contributed TBMANLIB_Diagnostic package, documented at
`docs/Reference/Contributed/TBMANLIB_Diagnostic/`. This file holds what its section decided and
what is known about the package beyond its pages; the rules for every contributed package are in
[WIP.Contributed.md](WIP.Contributed.md).

**Listed under Experimental Packages** (owner): TBMANLIB_Diagnostic cannot create its Dictionary and misplaces List items.

TBMANLIB_Diagnostic's `List` page has a NOTE labelled BETA 1042 under its `SetItem` sample: in a 32-bit IDE run `Err.Description` of the error 5 that `SetItem 0` raises on a list of one item (`Dim x As New List(Of String)`) is "Automation error", while the exe, a 64-bit IDE run and VB6 give "Invalid procedure call or argument" (`bugs/list-error5-automation-text`, with its case `ListTests.SetItem_AtZeroOnOneItemList_ErrorHasTheRuntimeText`). The samples harness runs in the IDE and has no per-sample way to state output that differs from an exe's, so that sample prints `Err.Number` only and the text is in the NOTE; when the entry is retired the NOTE goes and the sample prints `Err.Description` again, with the output `5: Invalid procedure call or argument`.
