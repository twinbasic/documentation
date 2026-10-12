---
title: Comparer
parent: ArrayListLib Package
permalink: /tB/Packages/Contributed/ArrayListLib/Comparer
has_toc: false
---

# Comparer class
{: .no_toc }

A **Comparer** compares two values and tells which of them is smaller. It implements [**IComparer**](Interfaces#icomparer), so it can be given to [**Sort**](ArrayList#sort) and [**BinarySearch**](ArrayList#binarysearch) of an [**ArrayList**](ArrayList) in place of a comparer that the program writes.

The class is predeclared: `Comparer.Compare(a, b)` can be called without creating an object, and `Comparer` is itself a value that can be passed as a comparer.

```tb check_build
Debug.Print Comparer.Compare(1, 2)
Debug.Print Comparer.Compare(5, 5)
Debug.Print Comparer.Compare("pear", "apple")
Debug.Print Comparer.Compare(#1/2/2026#, #1/1/2026#)
```

[**Sort**](ArrayList#sort) without a comparer compares items with the `<` operator, which needs no help from a **Comparer** for numbers and strings. A **Comparer** is useful for the other kinds of value (an array or an object), and as the base of a comparer that changes the result, such as one that sorts in descending order.

## How two values are compared

**Compare** takes the first rule that applies:

1. It subtracts the second value from the first and takes the sign of the difference ([**Sgn**](../../../Modules/Math/Sgn)). This is the comparison of numbers and of dates.
2. When the subtraction raises an error, two values that are not objects are compared with the `<` and `>` operators. The comparison of strings is by their characters, so an upper-case letter is smaller than a lower-case one.
3. When one of the two values is an array, the first element of the array stands for it: **Compare** compares `X(0)` with `Y(0)`, or with the other value when it is not an array.
4. When the first value is an object, the result is that of its **CompareTo** method called with the second value. The result is returned as the object gives it, not reduced to -1, 0 or 1.
5. When the comparison of rule 2, 3 or 4 raises an error, the result is 0: the two values count as equal. This is the result for an object with no **CompareTo**, and for two values that cannot be compared with each other.

## Writing a comparer

A comparer is any object that implements [**IComparer**](Interfaces#icomparer). Its **Compare** returns a negative number when the first value goes before the second, zero when they are equal and a positive number when the first goes after. A comparer that gives the result of a **Comparer** the other way round sorts in descending order:

```tb check_build projname=comparer-descending slot=file
Class DescendingComparer
    Implements IComparer

    Public Function Compare(X As Variant, Y As Variant) As Long Implements IComparer.Compare
        Return Comparer.Compare(Y, X)
    End Function
End Class
```

```tb check_build projname=comparer-descending
Dim list As New ArrayList
list.AddRange Array(3, 1, 2)
list.Sort 0, , New DescendingComparer

Dim v As Variant
For Each v In list
    Debug.Print v
Next
```

## Methods

### Compare
{: .no_toc }

Compares two values.

Syntax: *object*.**Compare** ( *X*, *Y* ) **As Long**

*X*
: *required* The first value.

*Y*
: *required* The second value.

Returns a negative number when *X* is smaller than *Y*, 0 when they are equal and a positive number when *X* is greater. For values that are not objects the result is -1, 0 or 1. See [How two values are compared](#how-two-values-are-compared) for the rules.

## See Also

- [IComparer](Interfaces#icomparer) interface -- the interface that **Comparer** implements
- [Sort](ArrayList#sort) method of **ArrayList**
- [BinarySearch](ArrayList#binarysearch) method of **ArrayList**
- [ArrayListLib package](./) -- overview
