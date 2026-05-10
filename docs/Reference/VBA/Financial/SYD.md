---
title: SYD
parent: Financial Module
permalink: /tB/Modules/Financial/SYD
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

The *life* and *period* arguments must be expressed in the same units. For example, if *life* is given in months, *period* must also be given in months. All arguments must be positive numbers.

### Example

This example uses the **SYD** function to return the depreciation of an asset for a specified period given the asset's initial cost (`InitCost`), the salvage value at the end of the asset's useful life (`SalvageVal`), and the total life of the asset in years (`LifeTime`). The period in years for which the depreciation is calculated is `PDepr`.

```tb
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

{% include VBA-Attribution.md %}
