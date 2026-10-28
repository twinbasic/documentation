---
title: IRR
parent: Financial Module
permalink: /tB/Modules/Financial/IRR
vba_attribution: true
---
# IRR
{: .no_toc }

Returns a **Double** specifying the internal rate of return for a series of periodic cash flows (payments and receipts).

Syntax: **IRR(** *values()* [ **,** *guess* ] **)**

*values()*
: *required* Array of **Double** specifying cash flow values. The array must contain at least one negative value (a payment) and one positive value (a receipt).

*guess*
: *optional* **Variant** specifying an estimate of the value to be returned by **IRR**. If omitted, *guess* is 0.1 (10 percent).

The internal rate of return is the interest rate received for an investment consisting of payments and receipts that occur at regular intervals.

The **IRR** function uses the order of values within the array to interpret the order of payments and receipts. The payment and receipt values must be in the correct sequence. The cash flow for each period doesn't have to be fixed, as it is for an annuity.

**IRR** is calculated by iteration. Starting with the value of *guess*, **IRR** cycles through the calculation until the result is accurate to within 0.00001 percent, and fails if it finds none in 20 tries.

<!-- bug: pending (financial-array-arguments) -->
> [!WARNING] BETA 1010
> Given an array that has never been sized (`Dim A() As Double` with no **ReDim**, or one emptied by **Erase**), **IRR** ends the program with an access violation, in a 32-bit and a 64-bit build. VB6 and 64-bit VBA raise error 5, *Invalid procedure call or argument*.

<!-- errors: generated from errors/VBA.Financial.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *values* has no element less than 0 or none greater than 0, or **IRR** finds no result in 20 tries from *guess* (a *guess* of -1 or less, or far from the result, included) |
| [-2147418113 (`&H8000FFFF`)](tb:Errors#-2147418113), *Catastrophic failure* | *values* has more than one dimension |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *guess* is a string that is not a number |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *guess* is **Null** |

> [!NOTE] BETA 1010
> When *values* has no element less than 0 or none greater than 0, or **IRR** finds no result in 20 tries from *guess* (a *guess* of -1 or less, or far from the result, included), VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *values* has more than one dimension, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

<!-- /errors -->

### Example

In this example, the **IRR** function returns the internal rate of return for a series of 5 cash flows contained in the array `Values()`. The first array element is a negative cash flow representing business start-up costs. The remaining four cash flows represent positive cash flows for the subsequent 4 years. `Guess` is the estimated internal rate of return.

```tb check_build
Dim Guess, Fmt, RetRate, Msg
Static Values(5) As Double    ' Set up array.
Guess = .1    ' Guess starts at 10 percent.
Fmt = "#0.00"    ' Define percentage format.
Values(0) = -70000    ' Business start-up costs.
' Positive cash flows reflecting income for four successive years.
Values(1) = 22000 : Values(2) = 25000
Values(3) = 28000 : Values(4) = 31000
RetRate = IRR(Values(), Guess) * 100    ' Calculate internal rate.
Msg = "The internal rate of return for these five cash flows is "
Msg = Msg & Format(RetRate, Fmt) & " percent."
MsgBox Msg    ' Display internal return rate.
```

### See Also

- [MIRR](MIRR), [NPV](NPV), [Rate](Rate) functions
