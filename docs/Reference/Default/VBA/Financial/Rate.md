---
title: Rate
parent: Financial Module
permalink: /tB/Modules/Financial/Rate
vba_attribution: true
---
# Rate
{: .no_toc }

Returns a **Double** specifying the interest rate per period for an annuity.

Syntax: **Rate(** *nper*, *pmt*, *pv* [ **,** *fv* [ **,** *type* [ **,** *guess* ] ] ] **)**

*nper*
: *required* **Double** specifying total number of payment periods in the annuity. For example, monthly payments on a four-year car loan total 4 * 12 (or 48) payment periods.

*pmt*
: *required* **Double** specifying payment to be made each period. Payments usually contain principal and interest that doesn't change over the life of the annuity.

*pv*
: *required* **Double** specifying present value, or value today, of a series of future payments or receipts. For example, when borrowing money to buy a car, the loan amount is the present value to the lender of the monthly car payments to be made.

*fv*
: *optional* **Variant** specifying future value or cash balance remaining after the final payment. For example, the future value of a loan is $0 because that's its value after the final payment. However, to save $50,000 over 18 years for a child's education, $50,000 is the future value. If omitted, 0 is assumed.

*type*
: *optional* **Variant** specifying when payments are due. 0 means payments are due at the end of the period; 1 means payments are due at the beginning. If omitted, 0 is assumed.

*guess*
: *optional* **Variant** specifying an estimate of the value to be returned by **Rate**. If omitted, *guess* is 0.1 (10 percent).

An annuity is a series of fixed cash payments made over a period of time. An annuity can be a loan (such as a home mortgage) or an investment (such as a monthly savings plan).

For all arguments, cash paid out (such as deposits to savings) is represented by negative numbers; cash received (such as dividend checks) is represented by positive numbers.

**Rate** is calculated by iteration. Starting with the value of *guess*, **Rate** cycles through the calculation until the result is accurate to within 0.00001 percent, and fails if it finds none in 20 tries. If it fails from the default of 10 percent, try a different value for *guess*.

<!-- errors: generated from errors/VBA.Financial.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | a rate exists (twinBASIC finds one only for a few annuities, none of them with a *pmt* other than 0)<br>**Rate** finds no result in 20 tries from *guess* (a *guess* of -1 or less, or far from the result, included), or *nper* is 0 or less<br>*nper* is less than 1 and the result is beyond the range of a **Double** |
| [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument* | *nper* is less than 1 and *pmt* is 0 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *fv* or *type* is a string that is not a number<br>*fv* or *type* is **Null** |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *nper*, *pmt* or *pv* is **Null** |

> [!NOTE] BETA 1010
> When a rate exists (twinBASIC finds one only for a few annuities, none of them with a *pmt* other than 0), VB6 and 64-bit VBA raise no error.

> [!NOTE] BETA 1010
> When **Rate** finds no result in 20 tries from *guess* (a *guess* of -1 or less, or far from the result, included), or *nper* is 0 or less, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *nper* is less than 1 and the result is beyond the range of a **Double**, VB6 and 64-bit VBA raise error [6 (`&H6`)](tb:Errors#6), *Overflow*, instead.

> [!NOTE] BETA 1010
> When *nper* is less than 1 and *pmt* is 0, VB6 and 64-bit VBA raise no error.

> [!NOTE] BETA 1010
> When *guess* is **Null**, VB6 and 64-bit VBA raise error [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null*; twinBASIC raises none.

> [!NOTE] BETA 1010
> When *guess* is a string that is not a number, or an error value, VB6 and 64-bit VBA raise error [13 (`&HD`)](tb:Errors#13), *Type mismatch*; twinBASIC raises none.

> [!NOTE] BETA 1010
> When *fv* or *type* is **Null**, VB6 and 64-bit VBA raise error [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null*, instead.

<!-- /errors -->

### Example

This example uses the **Rate** function to calculate the interest rate of a loan given the total number of payments (`TotPmts`), the amount of the loan payment (`Payment`), the present value or principal of the loan (`PVal`), the future value of the loan (`FVal`), a number that indicates whether the payment is due at the beginning or end of the payment period (`PayType`), and an approximation of the expected interest rate (`Guess`).

```tb check_build
Dim Fmt, FVal, Guess, PVal, Payment, TotPmts, PayType, APR
Const ENDPERIOD = 0, BEGINPERIOD = 1    ' When payments are made.
Fmt = "##0.00"    ' Define percentage format.
FVal = 0    ' Usually 0 for a loan.
Guess = .1    ' Guess of 10 percent.
PVal = InputBox("How much did you borrow?")
Payment = InputBox("What's your monthly payment?")
TotPmts = InputBox("How many monthly payments do you have to make?")
PayType = MsgBox("Do you make payments at the end of the month?", _
vbYesNo)
If PayType = vbNo Then PayType = BEGINPERIOD Else PayType = ENDPERIOD
APR = (Rate(TotPmts, -Payment, PVal, FVal, PayType, Guess) * 12) * 100
MsgBox "Your interest rate is " & Format(CInt(APR), Fmt) & " percent."
```

### See Also

- [FV](FV), [IRR](IRR), [NPer](NPer), [Pmt](Pmt), [PV](PV) functions
