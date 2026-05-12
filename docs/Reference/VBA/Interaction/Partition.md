---
title: Partition
parent: Interaction Module
permalink: /tB/Modules/Interaction/Partition
redirect_from:
-  /tB/Core/Partition
vba_attribution: true
---
# Partition
{: .no_toc }

Returns a **Variant** (**String**) labelling which of a series of equal-width numeric ranges a value falls into.

Syntax: **Partition(** *number* **,** *start* **,** *stop* **,** *interval* **)**

*number*
: *required* The value to evaluate against the ranges.

*start*
: *required* The number that begins the overall range. May not be less than 0.

*stop*
: *required* The number that ends the overall range. May not be less than or equal to *start*.

*interval*
: *required* The width of each individual range. May not be less than 1.

The return value identifies the particular range in which *number* falls, formatted as `"<lowervalue>: <uppervalue>"`. **Partition** is most useful in queries — for example, an SQL `SELECT` that groups orders by freight-cost band.

The following table shows how the ranges are determined for three sample sets of *start*, *stop*, and *interval*. The *Before First* column is what **Partition** returns for a *number* below *start*; the *After Last* column is what it returns for a *number* above *stop*.

| *start* | *stop* | *interval* | Before First | First Range | Last Range | After Last |
|--------:|-------:|-----------:|:-------------|:------------|:-----------|:-----------|
| 0       | 99     | 5          | `" :-1"`     | `"  0:  4"` | `" 95: 99"`| `" 100:   "` |
| 20      | 199    | 10         | `"   : 19"`  | `"  20: 29"`| `" 190:199"`| `" 200:   "` |
| 100     | 1010   | 20         | `"   : 99"`  | `" 100: 119"`| `"1000:1010"`| `"1011:   "` |

In the third row, *start* and *stop* don't divide evenly by *interval*: the last range extends to *stop* (covering 11 numbers) even though *interval* is 20.

If necessary, **Partition** pads each end of the range with leading spaces so that there are the same number of characters to the left and right of the colon as there are characters in *stop*, plus one. This keeps the labels in the right order under a plain text sort.

If *interval* is 1, the range collapses to *number:number*, regardless of *start* and *stop*.

Any argument may be a decimal value, but is rounded to the nearest even integer before processing. If any argument is **Null**, **Partition** returns **Null**.

### Example

This example uses **Partition** in an SQL `SELECT` to count the orders whose freight cost falls into each of several ranges. With *start* = 0, *stop* = 500, *interval* = 50, the first range is `"  0: 49"`, and so on up to 500.

```sql
SELECT DISTINCTROW Partition([Freight], 0, 500, 50) AS Range,
                   Count(Orders.Freight)            AS [Count]
FROM Orders
GROUP BY Partition([Freight], 0, 500, 50);
```
