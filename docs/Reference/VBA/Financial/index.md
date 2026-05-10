---
title: Financial Module
parent: VBA Package
permalink: /tB/Modules/Financial/
has_toc: false
---

# Financial module

The **Financial** module groups together the procedures that solve standard time-value-of-money problems — annuity calculations for loans and savings plans with fixed periodic cash flows, return and present-value analysis for irregular cash flow streams, and asset depreciation under three different accounting conventions.

## Annuities

An *annuity* is a series of fixed cash payments made at equally spaced intervals. Seven of the module's functions describe the same underlying annuity model and differ only in *which* of its quantities they solve for: [**FV**](FV) returns the future value (the cash balance after the final payment), [**PV**](PV) the present value (the value today of the future cash flows), [**Pmt**](Pmt) the periodic payment amount, [**NPer**](NPer) the number of periods, and [**Rate**](Rate) the interest rate per period. [**IPmt**](IPmt) and [**PPmt**](PPmt) decompose a single payment into its interest and principal portions.

All seven take the same core arguments — *rate*, *nper*, *pmt*, *pv*, *fv*, *type* — in different orders, with the unknown one omitted. *rate* is the interest rate per period (an annual percentage divided by the number of periods per year); *nper* is the total number of payment periods; *pmt* is the payment per period; *pv* and *fv* are the present and future values; *type* is `0` if payments fall at the end of the period and `1` if at the beginning. **Rate** additionally accepts a *guess* argument — it solves its equation iteratively, and a starting estimate can be supplied when the default of 10 % fails to converge in twenty cycles.

```tb
Const APR As Double = 0.06
Dim Monthly As Double
Monthly = -Pmt(APR / 12, 30 * 12, 200000)   ' fixed monthly payment on a 30-year, $200,000 mortgage at 6 % APR
```

## Variable cash flows

For investments whose cash flows vary period to period, three functions take an array of values rather than a single payment amount. [**NPV**](NPV) returns the net present value of the cash flows discounted at a chosen rate; [**IRR**](IRR) returns the internal rate of return — the discount rate that would make **NPV** zero; and [**MIRR**](MIRR) returns the modified internal rate of return, where outflows and reinvested inflows are discounted at separate rates. The order of values within the array is significant — element *i* is the cash flow for period *i* — and the array must contain at least one negative entry (a payment) and one positive entry (a receipt). Like **Rate**, both **IRR** and **MIRR** are computed iteratively and accept an optional *guess*.

```tb
Dim CashFlows(0 To 4) As Double
CashFlows(0) = -70000               ' initial outlay
CashFlows(1) = 22000 : CashFlows(2) = 25000
CashFlows(3) = 28000 : CashFlows(4) = 31000
Debug.Print IRR(CashFlows)          ' approximate internal rate of return
Debug.Print NPV(0.0625, CashFlows)  ' net present value at a 6.25 % discount rate
```

## Depreciation

Three functions return the depreciation of an asset over a chosen period under three different accounting conventions, all parameterised by the asset's initial *cost*, its *salvage* value at the end of its useful life, and its *life* in periods. [**SLN**](SLN) applies straight-line depreciation, spreading the lost value uniformly across each period. [**DDB**](DDB) applies the double-declining balance method (or a chosen multiplier), front-loading the depreciation so it is highest in the first period and decreases geometrically thereafter. [**SYD**](SYD) applies sum-of-years' digits depreciation — also accelerated, but linearly tapered.

**SLN** returns the same value for every period; **DDB** and **SYD** therefore both take an additional *period* argument naming which period to report.

## Sign conventions and units

Two conventions span the entire module. First, **cash flows carry a sign**: money paid *out* (mortgage payments, deposits to savings, investment outlays) is represented by a negative number, and money received (loan proceeds, savings withdrawals, dividends) by a positive number. The same convention applies whether the value appears as a single argument (*pmt*, *pv*, *fv*) or as an element of a cash flow array — entering a payment as a positive number is the most common cause of an unexpected result.

Second, **rates and counts must share a time unit**. If *nper* is given in months, *rate* must be the monthly rate (typically the annual rate divided by twelve); if *nper* is given in years, *rate* must be the annual rate. The same applies to depreciation: the *life* of the asset and the *period* being queried must be expressed in the same units.

## Members

- [DDB](DDB) -- depreciation of an asset for a specified period via the double-declining balance method
- [FV](FV) -- future value of an annuity based on periodic fixed payments and a fixed interest rate
- [IPmt](IPmt) -- interest payment for a given period of an annuity
- [IRR](IRR) -- internal rate of return for a series of periodic cash flows
- [MIRR](MIRR) -- modified internal rate of return for a series of periodic cash flows
- [NPer](NPer) -- number of periods for an annuity based on periodic fixed payments and a fixed interest rate
- [NPV](NPV) -- net present value of an investment based on a series of periodic cash flows and a discount rate
- [Pmt](Pmt) -- payment for an annuity based on periodic fixed payments and a fixed interest rate
- [PPmt](PPmt) -- principal payment for a given period of an annuity
- [PV](PV) -- present value of an annuity based on periodic fixed payments and a fixed interest rate
- [Rate](Rate) -- interest rate per period for an annuity
- [SLN](SLN) -- straight-line depreciation of an asset for a single period
- [SYD](SYD) -- sum-of-years' digits depreciation of an asset for a specified period
