---
title: COM Interfaces
parent: Reference Section
nav_order: 8
has_toc: false
permalink: /Reference/COM-Interfaces/
---

# COM Interfaces

The standard COM interfaces that twinBASIC code implements or calls, described with what each method must do and what twinBASIC adds or requires.

A twinBASIC class implements a COM interface with [**Implements**](../../tB/Core/Implements), and calls one through a variable of the interface's type. Each page gives the interface's declaration as a twinBASIC project writes it, the contract of each method --- what a caller may pass and what the method must return --- and the behaviour of the language features that use the interface.

## Interfaces

- [**IUnknown**](IUnknown) -- the base of every interface: asks an object for another interface, and counts its references; what **Set**, **Is** and **TypeOf** use
- [**IDispatch**](IDispatch) -- finds a member by name and calls it; what an **Object** variable and [**CallByName**](../../tB/Modules/Interaction/CallByName) use
- [**IEnumVARIANT**](IEnumVARIANT) -- enumerates a sequence of **Variant** values; what [**For Each**](../../tB/Core/For-Each-Next) uses to go through an object
- [**IErrorInfo**](IErrorInfo) and **ISupportErrorInfo** -- describe the error a method failed with; how **Err** is filled after a failed call
- [**IConnectionPoint**](IConnectionPoint) and **IConnectionPointContainer** -- connect an event sink to an object; what [**WithEvents**](../../tB/Core/WithEvents) uses
