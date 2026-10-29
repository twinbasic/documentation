---
title: NPer
parent: Financial Module
permalink: /tB/Modules/Financial/NPer
vba_attribution: true
---
# NPer
{: .no_toc }

Returns a **Double** specifying the number of periods for an annuity based on periodic, fixed payments and a fixed interest rate.

Syntax: **NPer(** *rate*, *pmt*, *pv* [ **,** *fv* [ **,** *type* ] ] **)**

*rate*
: *required* **Double** specifying interest rate per period. For example, for a car loan at an annual percentage rate (APR) of 10 percent with monthly payments, the rate per period is 0.1/12, or 0.0083.

*pmt*
: *required* **Double** specifying payment to be made each period. Payments usually contain principal and interest that doesn't change over the life of the annuity.

*pv*
: *required* **Double** specifying present value, or value today, of a series of future payments or receipts. For example, when borrowing money to buy a car, the loan amount is the present value to the lender of the monthly car payments to be made.

*fv*
: *optional* **Variant** specifying future value or cash balance remaining after the final payment. For example, the future value of a loan is $0 because that's its value after the final payment. However, to save $50,000 over 18 years for a child's education, $50,000 is the future value. If omitted, 0 is assumed.

*type*
: *optional* **Variant** specifying when payments are due. 0 means payments are due at the end of the period; 1 means payments are due at the beginning. If omitted, 0 is assumed.

An annuity is a series of fixed cash payments made over a period of time. An annuity can be a loan (such as a home mortgage) or an investment (such as a monthly savings plan).

For all arguments, cash paid out (such as deposits to savings) is represented by negative numbers; cash received (such as dividend checks) is represented by positive numbers.

<!-- errors: generated from errors/VBA.Financial.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [6 (`&H6`)](tb:Errors#6), *Overflow* | *rate* and *pmt* are of opposite signs, as in a loan or a savings plan, and a number of periods exists<br>no number of periods exists, as when *pmt* does not cover the interest, or *rate* is -1 and *pmt* is greater than 0 |
| [11 (`&HB`)](tb:Errors#11), *Division by zero* | *pmt* is 0 and *rate* is not 0, or *rate* is -1 and *pmt* is less than 0 |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *rate* and *pmt* are both 0 |
| [13 (`&HD`)](tb:Errors#13), *Type mismatch* | *fv* or *type* is a string that is not a number<br>*fv* or *type* is **Null** |
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *rate*, *pmt* or *pv* is **Null** |

> [!NOTE] BETA 1010
> When *rate* and *pmt* are of opposite signs, as in a loan or a savings plan, and a number of periods exists, VB6 and 64-bit VBA raise no error.

> [!NOTE] BETA 1010
> When no number of periods exists, as when *pmt* does not cover the interest, or *rate* is -1 and *pmt* is greater than 0, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *pmt* is 0 and *rate* is not 0, or *rate* is -1 and *pmt* is less than 0, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *rate* and *pmt* are both 0, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *fv* or *type* is **Null**, VB6 and 64-bit VBA raise error [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null*, instead.

<!-- /errors -->

### Example

This example uses the **NPer** function to return the number of periods during which payments must be made to pay off a loan whose value is contained in `PVal`. Also provided are the interest percentage rate per period (`APR / 12`), the payment (`Payment`), the future value of the loan (`FVal`), and a number that indicates whether the payment is due at the beginning or end of the payment period (`PayType`).

```tb check_build
Dim FVal, PVal, APR, Payment, PayType, TotPmts
Const ENDPERIOD = 0, BEGINPERIOD = 1    ' When payments are made.
FVal = 0    ' Usually 0 for a loan.
PVal = InputBox("How much do you want to borrow?")
APR = InputBox("What is the annual percentage rate of your loan?")
If APR > 1 Then APR = APR / 100    ' Ensure proper form.
Payment = InputBox("How much do you want to pay each month?")
PayType = MsgBox("Do you make payments at the end of month?", vbYesNo)
If PayType = vbNo Then PayType = BEGINPERIOD Else PayType = ENDPERIOD
TotPmts = NPer(APR / 12, -Payment, PVal, FVal, PayType)
If Int(TotPmts) <> TotPmts Then TotPmts = Int(TotPmts) + 1
MsgBox "It will take you " & TotPmts & " months to pay off your loan."
```

### See Also

- [FV](FV), [PV](PV), [Pmt](Pmt), [Rate](Rate) functions
