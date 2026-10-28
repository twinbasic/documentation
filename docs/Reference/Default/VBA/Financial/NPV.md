---
title: NPV
parent: Financial Module
permalink: /tB/Modules/Financial/NPV
vba_attribution: true
---
# NPV
{: .no_toc }

Returns a **Double** specifying the net present value of an investment based on a series of periodic cash flows (payments and receipts) and a discount rate.

Syntax: **NPV(** *rate*, *values()* **)**

*rate*
: *required* **Double** specifying discount rate over the length of the period, expressed as a decimal.

*values()*
: *required* Array of **Double** specifying cash flow values.
<!-- VBA: twinBASIC, VB6 and 64-bit VBA take values with no negative or no positive element, and an array of one element.
The array must contain at least one negative value (a payment) and one positive value (a receipt).
-->

The net present value of an investment is the current value of a future series of payments and receipts.

The **NPV** function uses the order of values within the array to interpret the order of payments and receipts. The payment and receipt values must be in the correct sequence.

The **NPV** investment begins one period before the date of the first cash flow value and ends with the last cash flow value in the array.

The net present value calculation is based on future cash flows. If the first cash flow occurs at the beginning of the first period, the first value must be added to the value returned by **NPV** and must not be included in the cash flow values of *values()*.

The **NPV** function is similar to the [**PV**](PV) function (present value) except that the **PV** function allows cash flows to begin either at the end or the beginning of a period. Unlike the variable **NPV** cash flow values, **PV** cash flows must be fixed throughout the investment.

<!-- bug: financial-array-arguments -->
> [!WARNING] BETA 1010
> Given an array that has never been sized (`Dim A() As Double` with no **ReDim**, or one emptied by **Erase**), **NPV** ends the program with an access violation, in a 32-bit and a 64-bit build. VB6 and 64-bit VBA raise error 5, *Invalid procedure call or argument*.

<!-- bug: financial-argument-checks -->
> [!WARNING] BETA 1010
> Given a *rate* of -1, **NPV** returns NaN (not a number) and raises no error. VB6 and 64-bit VBA raise error 5, *Invalid procedure call or argument*.

<!-- errors: generated from errors/VBA.Financial.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147418113 (`&H8000FFFF`)](tb:Errors#-2147418113), *Catastrophic failure* | *values* has more than one dimension |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *rate* is **Null** |

> [!NOTE] BETA 1010
> When *rate* is -1, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

> [!NOTE] BETA 1010
> When *values* has more than one dimension, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

This example uses the **NPV** function to return the net present value for a series of cash flows contained in the array `Values()`. `RetRate` represents the fixed internal rate of return.

```tb check_build
Dim Fmt, Guess, RetRate, NetPVal, Msg
Static Values(5) As Double    ' Set up array.
Fmt = "###,##0.00"    ' Define money format.
Guess = .1    ' Guess starts at 10 percent.
RetRate = .0625    ' Set fixed internal rate.
Values(0) = -70000    ' Business start-up costs.
' Positive cash flows reflecting income for four successive years.
Values(1) = 22000 : Values(2) = 25000
Values(3) = 28000 : Values(4) = 31000
NetPVal = NPV(RetRate, Values())    ' Calculate net present value.
Msg = "The net present value of these cash flows is "
Msg = Msg & Format(NetPVal, Fmt) & "."
MsgBox Msg    ' Display net present value.
```

### See Also

- [IRR](IRR), [MIRR](MIRR), [PV](PV) functions
