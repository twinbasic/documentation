---
title: IUnknownUnrestricted
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IUnknownUnrestricted
has_toc: false
---

# IUnknownUnrestricted interface
{: .no_toc }

Declares the three methods of the COM base interface **IUnknown** as ordinary members, so that code can call **QueryInterface**, **AddRef** and **Release** itself.

**IUnknownUnrestricted** has the interface identifier `00000000-0000-0000-C000-000000000046`, which is the identifier of **IUnknown**. Microsoft Learn describes the Windows interface: [IUnknown](https://learn.microsoft.com/en-us/windows/win32/api/unknwn/nn-unknwn-iunknown).

The interface is declared `Extends Nothing` and `[OleAutomation(False)]`. With no base interface, its three methods are the first three entries of the method table, the slots that **IUnknown** occupies. The **stdole.IUnknown** declaration, which every other interface of the package extends, exposes none of them: twinBASIC supplies the three methods for every object and hides them. Every method is marked `[PreserveSig]` and returns the raw result. A class cannot implement this interface; [IOleInPlaceActiveObject](IOleInPlaceActiveObject) extends it for calling.

See [IUnknown](../../../../Reference/COM-Interfaces/IUnknown) for the contract of the three methods and for how twinBASIC uses them.

## Methods

### QueryInterface

```tb inert=signature
[PreserveSig]
Function QueryInterface(ByVal priid As LongPtr, ppvObject As LongPtr) As Long
```

Asks the object for another interface. *priid* is the address of the interface identifier requested, such as the address of an [OLECLSID](OLECLSID) variable. *ppvObject* is passed by reference and receives the interface pointer, or 0 when the object does not support the interface. The result is the HRESULT: 0 (`S_OK`) on success, `&H80004002` (`E_NOINTERFACE`) when the interface is not supported.

A pointer that **QueryInterface** returns comes with a reference, which the caller gives back with **Release**.

### AddRef

```tb inert=signature
[PreserveSig]
Function AddRef() As Long
```

Adds a reference to the object and returns the new reference count.

### Release

```tb inert=signature
[PreserveSig]
Function Release() As Long
```

Removes a reference from the object and returns the new reference count. An object whose count reaches 0 may free itself.

## Example

This function adds a reference and removes it again, and returns the object's reference count at that moment. The count includes the references that the procedure's own variables hold.

```tb check_build
Private Function ReferenceCount(ByVal Obj As Object) As Long
    Dim u As IUnknownUnrestricted = Obj
    u.AddRef
    Return u.Release()
End Function
```

## See Also

- [IUnknown](../../../../Reference/COM-Interfaces/IUnknown) interface -- the contract of the base interface
- [IOleInPlaceActiveObject](IOleInPlaceActiveObject) interface -- extends this interface
- [OLECLSID](OLECLSID) type -- an interface identifier
