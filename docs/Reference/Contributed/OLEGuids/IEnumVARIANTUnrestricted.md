---
title: IEnumVARIANTUnrestricted
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IEnumVARIANTUnrestricted
has_toc: false
---

# IEnumVARIANTUnrestricted interface
{: .no_toc }

Enumerates a sequence of **Variant** values, with counts declared as **Long** values.

**IEnumVARIANTUnrestricted** has the interface identifier `00020404-0000-0000-C000-000000000046`, which is the identifier of **IEnumVARIANT**, the enumerator that **For Each** uses. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IEnumVARIANT](https://learn.microsoft.com/en-us/windows/win32/api/oaidl/nn-oaidl-ienumvariant).

## Declaration

The enumerator declared in **stdole** cannot be implemented from twinBASIC, because its counts are unsigned 32-bit integers, which twinBASIC has no type for. This declaration uses **Long** counts instead. Its *cElt* parameters are **Long**, and *lpcEltFetched* is the address of a **Long**, as a **LongPtr**.

The declaration extends **stdole.IDispatch**. The Windows **IEnumVARIANT** extends **IUnknown**.

> [!WARNING] 1.0.10.0
> Because the declaration extends **stdole.IDispatch**, its four methods come after the seven of **IDispatch** in the method table, where the table of an **IEnumVARIANT** has them straight after the three of **IUnknown**. So every method called through this interface on a real enumerator, such as the one a **Collection** returns, calls a slot past the end of its table: **Next**, **Skip** and **Clone** end the program with an access violation, and **Reset** raises a run-time error or does nothing. **For Each** over an object whose enumerator is a class that implements this interface ends the program the same way, without calling any of the class's methods. A program that calls or writes an enumerator declares its own copy of the interface, which extends **stdole.IUnknown**, as the [IEnumVARIANT](../../../../Reference/COM-Interfaces/IEnumVARIANT) page in the COM Interfaces section shows.

The declaration is complete: it has all four methods of the Windows interface. Each is a **Sub**, so the HRESULT is hidden: a failure code raises a run-time error, and a success code such as `S_FALSE` is read with [**Err.LastHresult**](../../../Modules/ErrObject/LastHresult). The [IEnumVARIANT](../../../../Reference/COM-Interfaces/IEnumVARIANT) page in the COM Interfaces section gives the contract of the four methods, how **For Each** uses them, and a project's own declaration of the interface.

## Methods

### Next

```tb inert=signature
Sub Next(ByVal cElt As Long, ByRef rgVar As Variant, ByVal lpcEltFetched As LongPtr)
```

Returns the next *cElt* items of the sequence, or as many as are left. *rgVar* is the first element of the caller's array of **Variant** values, which receives the items. *lpcEltFetched* is the address of a **Long** that receives the number of items fetched, such as `VarPtr(fetched)`. A caller that does not need the count passes 0, a null pointer, which the Windows contract allows only when *cElt* is 1. A call that returns fewer items than asked for returns `S_FALSE`.

### Skip

```tb inert=signature
Sub Skip(ByVal cElt As Long)
```

Skips the next *cElt* items of the sequence. It returns `S_FALSE` when fewer than *cElt* items were left.

### Reset

```tb inert=signature
Sub Reset()
```

Returns to the first item of the sequence.

### Clone

```tb inert=signature
Sub Clone(ByRef ppEnum As stdole.IEnumVARIANT)
```

Returns, in *ppEnum*, a copy of the enumerator that starts at the same position. The two then advance independently. The type of *ppEnum* is **stdole.IEnumVARIANT**.

## See Also

- [IEnumVARIANT](../../../../Reference/COM-Interfaces/IEnumVARIANT) interface -- the contract, in the COM Interfaces section
- [IDispatchUnrestricted](IDispatchUnrestricted) interface -- finds and calls members of an automation object by name or dispatch identifier
