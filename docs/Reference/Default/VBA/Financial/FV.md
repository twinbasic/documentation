---
title: FV
parent: Financial Module
permalink: /tB/Modules/Financial/FV
vba_attribution: true
---
# FV
{: .no_toc }

Returns a **Double** specifying the future value of an annuity based on periodic fixed payments and a fixed interest rate.

Syntax: **FV(** *rate*, *nper*, *pmt* [ **,** *pv* [ **,** *type* ] ] **)**

*rate*
: *required* **Double** specifying interest rate per period. For example, for a car loan at an annual percentage rate (APR) of 10 percent with monthly payments, the rate per period is 0.1/12, or 0.0083.

*nper*
: *required* **Integer** specifying total number of payment periods in the annuity. For example, monthly payments on a four-year car loan total 4 * 12 (or 48) payment periods.

*pmt*
: *required* **Double** specifying payment to be made each period. Payments usually contain principal and interest that doesn't change over the life of the annuity.

*pv*
: *optional* **Variant** specifying present value (or lump sum) of a series of future payments. For example, when borrowing money to buy a car, the loan amount is the present value to the lender of the monthly car payments to be made. If omitted, 0 is assumed.

*type*
: *optional* **Variant** specifying when payments are due. 0 means payments are due at the end of the period; 1 means payments are due at the beginning. If omitted, 0 is assumed.

An annuity is a series of fixed cash payments made over a period of time. An annuity can be a loan (such as a home mortgage) or an investment (such as a monthly savings plan).

The *rate* and *nper* arguments must be calculated by using payment periods expressed in the same units. For example, if *rate* is calculated by using months, *nper* must also be calculated by using months.

For all arguments, cash paid out (such as deposits to savings) is represented by negative numbers; cash received (such as dividend checks) is represented by positive numbers.

### Example

This example uses the **FV** function to return the future value of an investment given the percentage rate that accrues per period (`APR / 12`), the total number of payments (`TotPmts`), the payment (`Payment`), the current value of the investment (`PVal`), and a number that indicates whether the payment is made at the beginning or end of the payment period (`PayType`). Note that because `Payment` represents cash paid out, it's a negative number.

```tb
Dim Fmt, Payment, APR, TotPmts, PayType, PVal, FVal
Const ENDPERIOD = 0, BEGINPERIOD = 1    ' When payments are made.
Fmt = "###,###,##0.00"    ' Define money format.
Payment = InputBox("How much do you plan to save each month?")
APR = InputBox("Enter the expected interest annual percentage rate.")
If APR > 1 Then APR = APR / 100    ' Ensure proper form.
TotPmts = InputBox("For how many months do you expect to save?")
PayType = MsgBox("Do you make payments at the end of month?", vbYesNo)
If PayType = vbNo Then PayType = BEGINPERIOD Else PayType = ENDPERIOD
PVal = InputBox("How much is in this savings account now?")
FVal = FV(APR / 12, TotPmts, -Payment, -PVal, PayType)
MsgBox "Your savings will be worth " & Format(FVal, Fmt) & "."
```

### See Also

- [PV](PV), [NPer](NPer), [Pmt](Pmt), [Rate](Rate) functions
