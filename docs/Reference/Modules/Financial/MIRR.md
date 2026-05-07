---
title: MIRR
parent: Financial Module
permalink: /tB/Modules/Financial/MIRR
---
# MIRR
{: .no_toc }

Returns a **Double** specifying the modified internal rate of return for a series of periodic cash flows (payments and receipts).

Syntax: **MIRR(** *values()*, *finance_rate*, *reinvest_rate* **)**

*values()*
: *required* Array of **Double** specifying cash flow values. The array must contain at least one negative value (a payment) and one positive value (a receipt).

*finance_rate*
: *required* **Double** specifying interest rate paid as the cost of financing.

*reinvest_rate*
: *required* **Double** specifying interest rate received on gains from cash reinvestment.

The modified internal rate of return is the internal rate of return when payments and receipts are financed at different rates. The **MIRR** function takes into account both the cost of the investment (*finance_rate*) and the interest rate received on reinvestment of cash (*reinvest_rate*).

The *finance_rate* and *reinvest_rate* arguments are percentages expressed as decimal values. For example, 12 percent is expressed as 0.12.

The **MIRR** function uses the order of values within the array to interpret the order of payments and receipts. Be sure to enter your payment and receipt values in the correct sequence.

### Example

This example uses the **MIRR** function to return the modified internal rate of return for a series of cash flows contained in the array `Values()`. `LoanAPR` represents the financing interest, and `InvAPR` represents the interest rate received on reinvestment.

```tb
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

{% include VBA-Attribution.md %}
