---
title: Generics Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - HelloWorldModule
indexed_from: 1.0.0.0
permalink: /tB/Packages/Contributed/Generics/
---

# Generics Package
{: .no_toc }

**Author:** mansellan. **Version:** 1.0.0.0

The **Generics** contributed package provides seven tuple classes, **TupleOf1** to **TupleOf7**. A tuple is a read-only object that holds one to seven values, called its items, each of a type given when the tuple is declared.

A tuple lets a function return several values at once, without a user-defined type declared for the purpose or **ByRef** parameters for the results. Each class is a [generic class](../../../../Features/Language/Generics): **TupleOf2(Of Long, String)** holds a **Long** and a **String**, and its **Item1** and **Item2** properties return them with those types. The classes follow .NET's **System.Tuple** classes, and their source comments are taken from .NET's, under the MIT licence. This section documents version 1.0.0.0, published under the MIT licence.

<!-- test: ItemTests.TupleOf3_ReturnsItemsInOrder -->
```tb check_build check_run
Dim t As TupleOf3(Of String, Long, Date) = New TupleOf3(Of String, Long, Date)("Ada", 36, #12/10/1815#)
Debug.Print t.Item1        ' Ada
Debug.Print t.Item2        ' 36
Debug.Print Year(t.Item3)  ' 1815
```
<!-- /test -->

## Syntax

**New TupleOf***n* **(Of** *T1* [ **,** *T2* ... ] **) (** *item1* [ **,** *item2* ... ] **)**

*tuple*.**Item***k*

*n*
: The number of items, 1 to 7. Each number has a class of its own, from **TupleOf1** to **TupleOf7**.

*T1*, *T2* ...
: The types of the items, one for each item, in order. All *n* must be given. [Types of the items](#types-of-the-items) lists the types that work.

*item1*, *item2* ...
: *required* The values of the items, one for each type, in the same order. The parameters are **ByRef**; see [Creating a tuple](#creating-a-tuple).

*tuple*
: An object expression that evaluates to a tuple.

*k*
: The number of an item, 1 to *n*.

<!-- test: ItemTests.TupleOf1_ReturnsItem, ItemTests.TupleOf2_ReturnsItemsInOrder, ItemTests.TupleOf3_ReturnsItemsInOrder, ItemTests.TupleOf5_ReturnsItemsInOrder, ItemTests.TupleOf6_ReturnsItemsInOrder, ItemTests.TupleOf7_ReturnsItemsInOrder -->
**Item***k* returns the *k*th item, of type *Tk*. The properties are read-only: an item is set only when the tuple is created, and nothing changes it afterwards. The classes have no other members.
<!-- /test -->

| Class | Type parameters | Properties |
|:------|:----------------|:-----------|
| **TupleOf1** | *T1* | **Item1** |
| **TupleOf2** | *T1*, *T2* | **Item1**, **Item2** |
| **TupleOf3** | *T1* to *T3* | **Item1** to **Item3** |
| **TupleOf4** | cannot be used; see [TupleOf4](#tupleof4) | |
| **TupleOf5** | *T1* to *T5* | **Item1** to **Item5** |
| **TupleOf6** | *T1* to *T6* | **Item1** to **Item6** |
| **TupleOf7** | *T1* to *T7* | **Item1** to **Item7** |

There is no class for eight or more items. The package's source holds one, **TupleOfN**, as comments only.

## Creating a tuple

[**New**](../../../Core/New) creates a tuple and passes the items to the class's constructor. The **As New** form of **Dim** takes no arguments, so a tuple is created with **New** and assigned to a variable declared with the tuple's type:

```tb check_build check_run
Dim size As TupleOf2(Of Long, Long)
Set size = New TupleOf2(Of Long, Long)(640, 480)
Debug.Print size.Item1 * size.Item2  ' 307200
```

<!-- test: TupleTests.Function_ReturnsTuple -->
A function that returns a tuple declares the tuple's type as its return type:

```tb check_build slot=file
Module GenericsMinMaxDemo
    ' Returns the smallest and the largest value of an array.
    Public Function MinMax(values() As Double) As TupleOf2(Of Double, Double)
        Dim lo As Double = values(LBound(values))
        Dim hi As Double = lo
        Dim i As Long
        For i = LBound(values) + 1 To UBound(values)
            If values(i) < lo Then lo = values(i)
            If values(i) > hi Then hi = values(i)
        Next
        Return New TupleOf2(Of Double, Double)(lo, hi)
    End Function

    Public Sub Report()
        Dim data(2) As Double
        data(0) = 4.5
        data(1) = -2
        data(2) = 9
        Dim r As TupleOf2(Of Double, Double) = MinMax(data)
        Debug.Print "Smallest:"; r.Item1; " Largest:"; r.Item2
    End Sub
End Module
```
<!-- /test -->

<!-- test: compile NewWithoutDeclaration -->
> [!NOTE] BETA 1010
> **New** with a generic class from a package compiles only when some declaration in the project or the package names the same class with the same type arguments. A variable declared with the tuple's type is such a declaration. Without one, `Dim t As Any = New TupleOf2(Of String, Long)("a", 2)` fails with TB5074, *Could not bind to parameterized constructor of class 'TupleOf2'*, and so does **New** assigned to an **Object** or **Variant** variable or passed as an argument. A generic class declared in the project's own code is not affected. Assign the tuple to a variable of its own type first; that variable can then be assigned to an **Object** or **Variant** variable, through which the items are read late-bound:
>
> ```tb check_build check_run
> Dim t As TupleOf2(Of String, Long) = New TupleOf2(Of String, Long)("width", 640)
> Dim o As Object
> Set o = t
> Debug.Print o.Item1; o.Item2  ' width 640
> ```

<!-- test: TupleTests.New_KeepsACopyOfEachItem, TupleTests.New_ConversionOfAByteVariable, compile ByteVariableForLongItem -->
The constructor's parameters are declared without **ByVal**, so they are **ByRef**. A variable passed for an item must have the item's type exactly: a **Byte** variable passed for a **Long** item fails with TB5001, *cannot coerce type 'Byte' to [ByRef] 'Long'*. A literal or any other expression is converted as usual, so wrap such a variable in a conversion function. The tuple keeps a copy of each value, and a later change to the variable does not change the tuple:

```tb check_build check_run
Dim b As Byte = 200
Dim t As TupleOf1(Of Long) = New TupleOf1(Of Long)(CLng(b))
b = 1
Debug.Print t.Item1  ' 200
```
<!-- /test -->

## Reading the items

<!-- test: ItemTests.Items_KeepTheirDeclaredTypes, TupleTests.Variable_NotAssignedIsNothing, TupleTests.Is_TwoTuplesWithEqualItemsAreTwoObjects, TupleTests.TypeName_IsTheClassWithoutItsTypeArguments, TupleTests.LateBound_ReadsItemsThroughObject -->
Each item is read through its **Item** property, which returns it with the type it was declared with. An **Object** or **Variant** variable that holds a tuple reads the items late-bound, through the same names. A tuple is an object, so it is assigned with [**Set**](../../../Core/Set), and a variable that has not been assigned one is **Nothing**. Two tuples with equal items are still two objects: [**Is**](../../../Core/Is) compares the objects themselves, so the items are compared one by one. [**TypeName**](../../../Modules/Information/TypeName) returns the class's name without its type arguments:

```tb check_build check_run
Dim a As TupleOf2(Of Long, String) = New TupleOf2(Of Long, String)(1, "x")
Dim b As TupleOf2(Of Long, String) = New TupleOf2(Of Long, String)(1, "x")
Debug.Print TypeName(a)                              ' TupleOf2
Debug.Print a Is b                                   ' False
Debug.Print a.Item1 = b.Item1 And a.Item2 = b.Item2  ' True
```
<!-- /test -->

Unlike .NET's tuples, the classes have no method that compares two tuples or converts one to a string.

## Types of the items

<!-- test: ItemTests.Items_KeepTheirDeclaredTypes, ItemTests.Items_LongPtr, ItemTests.Items_DateKeepsTimeOfDay -->
An item can have any numeric type, **String**, **Boolean**, **Date**, **Currency** or **LongPtr**.
<!-- /test -->

<!-- test: compile VariantTypeArgument -->
Three kinds of type cannot be used:

- **Variant.** twinBASIC refuses **Variant** as a type argument: TB5124, *Cannot pass Variant datatype as a generic specifier, use a more explicit type instead*.
- **Object types.** A tuple cannot hold an object, another tuple included; see the first note below.
- **Arrays**, such as **Long()**.
<!-- /test -->

<!-- test: ObjectItemTests.New_ObjectItemHoldsAnObject, ObjectItemTests.New_ObjectItemHoldsNothing -->
> [!NOTE] 1.0.0.0
> The constructor stores each item with `=`, not with **Set**, so creating a tuple of an object type fails. For **Object**, which compiles, **New** raises run-time error 91, *Object variable or With block variable not set*, even when the item passed is **Nothing**. A class whose default member takes an argument, such as **Collection**, fails to compile, with TB5092 *Missing argument 'Index'* reported in the package's source.

<!-- test: none -- the compiler crashes, so no program and no case can run; bugs/generic-array-type-argument-crash holds the reproducer -->
> [!WARNING] BETA 1010
> A tuple type with an array as a type argument, such as `TupleOf1(Of Long())`, crashes the compiler wherever it is written: in a declaration, a parameter, a function's result type or after **New**. The compiler restarts and crashes again, so nothing in the project compiles until the line is removed. The same happens with a generic class declared in a project's own code.

## TupleOf4

<!-- test: compile TupleOf4FourTypeArguments -->
> [!NOTE] 1.0.0.0
> **TupleOf4** cannot be used. The package declares it with three type parameters, `TupleOf4(Of T1, T2, T3)`, but its fourth item uses a fourth, *T4*, which is not declared. With four type arguments, a declaration fails with TB5124, *Too many generic specifiers*. With three, the package's source fails with TB5079, *Unrecognized datatype symbol 'T4'*. A project that does not use **TupleOf4** is not affected. For four values, use **TupleOf5** and leave its last item unused.

## See Also

- [Generics](../../../../Features/Language/Generics) -- generic classes, procedures and types in twinBASIC
- [Parameterized class constructors](../../../../Features/Advanced/Classes-and-Modules#parameterized-class-constructors) -- the **Sub New** that each tuple class declares
- [New](../../../Core/New) operator -- creates an object, passing arguments to its constructor

## Test cases

The notes and warnings of this section are checked by the test cases in [Generics-tests.twinproj](Generics-tests.twinproj), a twinBASIC project. It uses Generics as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
