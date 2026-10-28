---
title: SYD
parent: Financial Module
permalink: /tB/Modules/Financial/SYD
vba_attribution: true
---
# SYD
{: .no_toc }

Returns a **Double** specifying the sum-of-years' digits depreciation of an asset for a specified period.

Syntax: **SYD(** *cost*, *salvage*, *life*, *period* **)**

*cost*
: *required* **Double** specifying initial cost of the asset.

*salvage*
: *required* **Double** specifying value of the asset at the end of its useful life.

*life*
: *required* **Double** specifying length of the useful life of the asset.

*period*
: *required* **Double** specifying period for which asset depreciation is calculated.

The *life* and *period* arguments must be expressed in the same units. For example, if *life* is given in months, *period* must also be given in months.

<!-- VBA: twinBASIC, VB6 and 64-bit VBA take a negative or zero cost and a zero salvage (Common Errors lists what they refuse). All arguments must be positive numbers. -->

<!-- errors: generated from errors/VBA.Financial.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *life* is 0 or less, *period* is 0 or less or greater than *life*, or *salvage* is less than 0 |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *cost*, *salvage*, *life* or *period* is **Null** |

> [!NOTE] BETA 1010
> When *life* is 0 or less, *period* is 0 or less or greater than *life*, or *salvage* is less than 0, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

This example uses the **SYD** function to return the depreciation of an asset for a specified period given the asset's initial cost (`InitCost`), the salvage value at the end of the asset's useful life (`SalvageVal`), and the total life of the asset in years (`LifeTime`). The period in years for which the depreciation is calculated is `PDepr`.

```tb check_build
Dim Fmt, InitCost, SalvageVal, MonthLife, LifeTime, DepYear, PDepr
Const YEARMONTHS = 12    ' Number of months in a year.
Fmt = "###,##0.00"    ' Define money format.
InitCost = InputBox("What's the initial cost of the asset?")
SalvageVal = InputBox("What's the asset's value at the end of its life?")
MonthLife = InputBox("What's the asset's useful life in months?")
Do While MonthLife < YEARMONTHS    ' Ensure period is >= 1 year.
    MsgBox "Asset life must be a year or more."
    MonthLife = InputBox("What's the asset's useful life in months?")
Loop
LifeTime = MonthLife / YEARMONTHS    ' Convert months to years.
If LifeTime <> Int(MonthLife / YEARMONTHS) Then
    LifeTime = Int(LifeTime + 1)    ' Round up to nearest year.
End If
DepYear = CInt(InputBox("For which year do you want depreciation?"))
Do While DepYear < 1 Or DepYear > LifeTime
    MsgBox "You must enter at least 1 but not more than " & LifeTime
    DepYear = CInt(InputBox("For what year do you want depreciation?"))
Loop
PDepr = SYD(InitCost, SalvageVal, LifeTime, DepYear)
MsgBox "The depreciation for year " & DepYear & " is " & Format(PDepr, Fmt) & "."
```

### See Also

- [DDB](DDB), [SLN](SLN) functions
