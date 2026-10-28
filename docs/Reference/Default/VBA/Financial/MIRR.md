---
title: MIRR
parent: Financial Module
permalink: /tB/Modules/Financial/MIRR
vba_attribution: true
---
# MIRR
{: .no_toc }

Returns a **Double** specifying the modified internal rate of return for a series of periodic cash flows (payments and receipts).

Syntax: **MIRR(** *values()*, *finance_rate*, *reinvest_rate* **)**

*values()*
: *required* Array of **Double** specifying cash flow values, at least one of them negative (a payment).
<!-- VBA: twinBASIC, VB6 and 64-bit VBA take values with no positive element (Common Errors lists what they refuse).
The array must contain at least one negative value (a payment) and one positive value (a receipt).
-->

*finance_rate*
: *required* **Double** specifying interest rate paid as the cost of financing.

*reinvest_rate*
: *required* **Double** specifying interest rate received on gains from cash reinvestment.

The modified internal rate of return is the internal rate of return when payments and receipts are financed at different rates. The **MIRR** function takes into account both the cost of the investment (*finance_rate*) and the interest rate received on reinvestment of cash (*reinvest_rate*).

The *finance_rate* and *reinvest_rate* arguments are percentages expressed as decimal values. For example, 12 percent is expressed as 0.12.

The **MIRR** function uses the order of values within the array to interpret the order of payments and receipts. The payment and receipt values must be in the correct sequence.

<!-- bug: pending (financial-array-arguments) -->
> [!WARNING] BETA 1010
> Given an array that has never been sized (`Dim A() As Double` with no **ReDim**, or one emptied by **Erase**), **MIRR** ends the program with an access violation, in a 32-bit and a 64-bit build. VB6 and 64-bit VBA raise error 5, *Invalid procedure call or argument*.

<!-- bug: pending (financial-argument-checks) -->
> [!WARNING] BETA 1010
> **MIRR** returns a value and raises no error for arguments VB6 and 64-bit VBA refuse. Given *values* with one element it returns -1, and given a *finance_rate* or *reinvest_rate* of -1 it returns a rate; VB6 and 64-bit VBA raise error 5, *Invalid procedure call or argument*. Given *values* with no element less than 0 it returns infinity or NaN (not a number); VB6 and 64-bit VBA raise error 11, *Division by zero*.

<!-- errors: generated from errors/VBA.Financial.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147418113 (`&H8000FFFF`)](tb:Errors#-2147418113), *Catastrophic failure* | *values* has more than one dimension |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *finance_rate* or *reinvest_rate* is **Null** |

> [!NOTE] BETA 1010
> When *values* has one element, or *finance_rate* or *reinvest_rate* is -1, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

> [!NOTE] BETA 1010
> When *values* has no element less than 0, VB6 and 64-bit VBA raise error [11 (`&HB`)](tb:Errors#11), *Division by zero*; twinBASIC raises none.

> [!NOTE] BETA 1010
> When *values* has more than one dimension, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

This example uses the **MIRR** function to return the modified internal rate of return for a series of cash flows contained in the array `Values()`. `LoanAPR` represents the financing interest, and `InvAPR` represents the interest rate received on reinvestment.

```tb check_build
Dim LoanAPR, InvAPR, Fmt, RetRate, Msg
Static Values(5) As Double    ' Set up array.
LoanAPR = .1    ' Loan rate.
InvAPR = .12    ' Reinvestment rate.
Fmt = "#0.00"    ' Define money format.
Values(0) = -70000    ' Business start-up costs.
' Positive cash flows reflecting income for four successive years.
Values(1) = 22000 : Values(2) = 25000
Values(3) = 28000 : Values(4) = 31000
RetRate = MIRR(Values(), LoanAPR, InvAPR)    ' Calculate internal rate.
Msg = "The modified internal rate of return for these five cash flows is"
Msg = Msg & Format(Abs(RetRate) * 100, Fmt) & "%."
MsgBox Msg    ' Display internal return rate.
```

### See Also

- [IRR](IRR), [NPV](NPV), [Rate](Rate) functions
