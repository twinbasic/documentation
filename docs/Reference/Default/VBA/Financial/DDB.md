---
title: DDB
parent: Financial Module
permalink: /tB/Modules/Financial/DDB
vba_attribution: true
---
# DDB
{: .no_toc }

Returns a **Double** specifying the depreciation of an asset for a specific time period by using the double-declining balance method or another specified method.

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

The *life* and *period* arguments must be expressed in the same units. For example, if *life* is given in months, *period* must also be given in months.

<!-- VBA: twinBASIC, VB6 and 64-bit VBA take a negative or zero cost and a zero salvage (Common Errors lists what they refuse). All arguments must be positive numbers. -->

The **DDB** function uses the following formula to calculate depreciation for a given period:

Depreciation / *period* = ((*cost* - *salvage*) * *factor*) / *life*

<!-- errors: generated from errors/VBA.Financial.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *life* is 0 or less, *period* is 0 or less or greater than *life*, *salvage* is less than 0, or *factor* is 0 or less (**Empty** and **True** included)<br>*life* is greater than 0 and less than 1 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *factor* is not a number or a string that holds one<br>*factor* is **Null** |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *cost*, *salvage*, *life* or *period* is **Null** |

> [!NOTE] BETA 1010
> When *life* is 0 or less, *period* is 0 or less or greater than *life*, *salvage* is less than 0, or *factor* is 0 or less (**Empty** and **True** included), VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *life* is greater than 0 and less than 1, VB6 and 64-bit VBA raise no error.

> [!NOTE] BETA 1010
> When *factor* is **Null**, VB6 and 64-bit VBA raise error [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null*, instead.

<!-- /errors -->

### Example

This example uses the **DDB** function to return the depreciation of an asset for a specified period given the initial cost (`InitCost`), the salvage value at the end of the asset's useful life (`SalvageVal`), the total life of the asset in years (`LifeTime`), and the period in years for which the depreciation is calculated (`Depr`).

```tb check_build
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
