---
title: DDB
parent: Financial Module
permalink: /tB/Modules/Financial/DDB
vba_attribution: true
---
# DDB
{: .no_toc }

Returns a **Double** specifying the depreciation of an asset for a specific time period by using the double-declining balance method or some other method you specify.

Syntax: **DDB(** *cost*, *salvage*, *life*, *period* [ **,** *factor* ] **)**

*cost*
: *required* **Double** specifying the initial cost of the asset.

*salvage*
: *required* **Double** specifying the value of the asset at the end of its useful life.

*life*
: *required* **Double** specifying the length of useful life of the asset.

*period*
: *required* **Double** specifying the period for which asset depreciation is calculated.

*factor*
: *optional* **Variant** specifying the rate at which the balance declines. If omitted, 2 (double-declining method) is assumed.

The double-declining balance method computes depreciation at an accelerated rate. Depreciation is highest in the first period and decreases in successive periods.

The *life* and *period* arguments must be expressed in the same units. For example, if *life* is given in months, *period* must also be given in months. All arguments must be positive numbers.

The **DDB** function uses the following formula to calculate depreciation for a given period:

Depreciation / *period* = ((*cost* - *salvage*) * *factor*) / *life*

### Example

This example uses the **DDB** function to return the depreciation of an asset for a specified period given the initial cost (`InitCost`), the salvage value at the end of the asset's useful life (`SalvageVal`), the total life of the asset in years (`LifeTime`), and the period in years for which the depreciation is calculated (`Depr`).

```tb
Dim Fmt, InitCost, SalvageVal, MonthLife, LifeTime, DepYear, Depr
Const YRMOS = 12    ' Number of months in a year.
Fmt = "###,##0.00"
InitCost = InputBox("What's the initial cost of the asset?")
SalvageVal = InputBox("Enter the asset's value at end of its life.")
MonthLife = InputBox("What's the asset's useful life in months?")
Do While MonthLife < YRMOS    ' Ensure period is >= 1 year.
    MsgBox "Asset life must be a year or more."
    MonthLife = InputBox("What's the asset's useful life in months?")
Loop
LifeTime = MonthLife / YRMOS    ' Convert months to years.
If LifeTime <> Int(MonthLife / YRMOS) Then
    LifeTime = Int(LifeTime + 1)    ' Round up to nearest year.
End If
DepYear = CInt(InputBox("Enter year for depreciation calculation."))
Do While DepYear < 1 Or DepYear > LifeTime
    MsgBox "You must enter at least 1 but not more than " & LifeTime
    DepYear = InputBox("Enter year for depreciation calculation.")
Loop
Depr = DDB(InitCost, SalvageVal, LifeTime, DepYear)
MsgBox "The depreciation for year " & DepYear & " is " & _
Format(Depr, Fmt) & "."
```

### See Also

- [SLN](SLN), [SYD](SYD) functions
