---
title: OLEGuids Package
parent: Contributed Packages
has_toc: false
indexed_from: 1.0.2.0
permalink: /tB/Packages/Contributed/OLEGuids/
---

# OLEGuids Package
{: .no_toc }

**Author:** Krool. **Version:** 1.0.2.0. **On GitHub:** [Kr00l/VBCCR](https://github.com/Kr00l/VBCCR/tree/master/twinBASIC%20Package/OLEGuids), in the folder *twinBASIC Package/OLEGuids*.

A twinBASIC package that declares 23 OLE and COM interfaces and 10 structures in twinBASIC source, so that a 32-bit or 64-bit project can call or implement them without a type library.

The package is a twinBASIC implementation of `OLEGuids.tlb`, the type library of OLE interface and type definitions that Krool's VBCCR and VBFLXGRD controls (`VBCCRxx.OCX` and `VBFLXGRDxx.OCX`) use. It replaces `OLEGuids.tlb` in projects that build 64-bit programs, and works in 32-bit projects as well. This section documents version 1.0.2.0, published under the MIT licence.

## Using the package

Add the package in Project → References (Ctrl-T) → Available Packages. The interfaces and structures are then visible to the whole project. Two things can be done with an interface:

- **Call it.** Declare a variable of the interface type and assign an object to it. The assignment asks the object for that interface, and a call through the variable runs the object's method.
- **Implement it.** Name it in an [**Implements**](../../../Core/Implements) statement in a class, and write each method. A class cannot implement an interface that has a `[PreserveSig]` member (see [How the declarations differ from Windows](#how-the-declarations-differ-from-windows)).

A name can be written bare (`IOleWindow`, `OLERECT`) or qualified with the package name (`OLEGuids.IOleWindow`, `OLEGuids.OLERECT`). The ten structures are declared in a module named `OLEGuids`, which is why the qualified form works for them; the module has no page of its own.

```tb check_build
Private Function InPlaceWindow(ByVal Obj As Object) As LongPtr
    Dim w As IOleWindow = Obj
    Return w.GetWindow()
End Function
```

> [!NOTE]
> In a project that references **stdole**, as every default project does, the bare name `IDispatch` is **stdole**'s declaration. A call through it is late-bound by name, and its four methods are not reached (see [IDispatch](../../../../Reference/COM-Interfaces/IDispatch#the-stdole-declaration)). The package's own declaration needs the qualified name, **OLEGuids.IDispatch**.

```tb check_build
Private Function HasTypeInfo(ByVal Obj As Object) As Boolean
    Dim d As OLEGuids.IDispatch = Obj
    Dim count As Long
    d.GetTypeInfoCount count
    Return count > 0
End Function
```

## How the declarations differ from Windows

The interfaces that exist in Windows have their original interface identifiers, so an object written in another language can be called through them. The declarations differ from the C headers in these ways:

- **The HRESULT is hidden.** A **Sub**, and a **Function** that is not marked `[PreserveSig]`, returns nothing of the Windows method's HRESULT. A failure code raises a run-time error, and a success code other than `S_OK` is read with [**Err.LastHresult**](../../../Modules/ErrObject/LastHresult). Where the Windows method has an output parameter for its result, the **Function**'s result takes its place.
- **`[PreserveSig]` members return the raw HRESULT** as a **Long**. A twinBASIC class cannot implement a member marked [**[PreserveSig]**](../../../Core/Attributes#preservesig): the compiler reports TB5004, *unable to match this implementation to its interface member*. The interfaces with such a member are for calling, not for implementing: [IUnknownUnrestricted](IUnknownUnrestricted), [IOleObject](IOleObject), [IOleControl](IOleControl), [IOleControlSite](IOleControlSite), [IOleInPlaceActiveObject](IOleInPlaceActiveObject), [IOleInPlaceSite](IOleInPlaceSite), [IPerPropertyBrowsing](IPerPropertyBrowsing) and [IRichEditOle](IRichEditOle). A class sets [**Err.ReturnHResult**](../../../Modules/ErrObject/ReturnHResult) to return a specific HRESULT from a **Sub** it implements.
- **Pointers are `LongPtr`.** A parameter that is a pointer to a structure or to an interface the package does not declare (a `RECT*`, a `MSG*`, an `IMoniker*`) is a **LongPtr**. Pass the address of a variable with [**VarPtr**](../../../Modules/Information/VarPtr), or `StrPtr` for a string.
- **Some declarations are partial.** [IOleObject](IOleObject) declares the first nine of the 21 methods of the Windows interface. The four stub interfaces --- [IOleClientSite](IOleClientSite), [IOleInPlaceFrame](IOleInPlaceFrame), [IStorage](IStorage) and [IDataObject](IDataObject) --- declare no methods; their description says to use the tbShellLib package for the full version. A stub is useful for naming the type of a parameter or a variable, not for calling.
- **Five declarations are variants of a Windows interface.** [IUnknownUnrestricted](IUnknownUnrestricted) has no base interface, which makes the three methods of **IUnknown** callable. [IEnumVARIANTUnrestricted](IEnumVARIANTUnrestricted) declares the **IEnumVARIANT** enumerator with **Long** counts. [IOleInPlaceActiveObjectVB](IOleInPlaceActiveObjectVB), [IOleControlVB](IOleControlVB) and [IPerPropertyBrowsingVB](IPerPropertyBrowsingVB) are not Windows interfaces: they have Visual Basic-style signatures that a class can implement.

Every interface except the three `VB` variants is declared `[OleAutomation(False)]`, so it is not marked as an Automation interface. The contract of each method is that of the Windows interface, which Microsoft Learn documents; each interface page links to it.

## Interfaces

- [IDataObject](IDataObject) -- stub for the interface that transfers data between applications
- [IDispatch](IDispatch) -- finds and calls members of an automation object by name or dispatch identifier
- [IEnumVARIANTUnrestricted](IEnumVARIANTUnrestricted) -- enumerator of **Variant** values with **Long** counts
- [IObjectSafety](IObjectSafety) -- reports and sets an object's safety options for untrusted callers and data
- [IOleClientSite](IOleClientSite) -- stub for the container-side site of an embedded object
- [IOleControl](IOleControl) -- keyboard mnemonics, ambient property changes and event freezing of a control
- [IOleControlSite](IOleControlSite) -- the container-side site of a control
- [IOleControlVB](IOleControlVB) -- Visual Basic-style **GetControlInfo** and **OnMnemonic**
- [IOleInPlaceActiveObject](IOleInPlaceActiveObject) -- messages, activation and border changes for an in-place active object
- [IOleInPlaceActiveObjectVB](IOleInPlaceActiveObjectVB) -- Visual Basic-style **TranslateAccelerator**
- [IOleInPlaceFrame](IOleInPlaceFrame) -- stub for the container's frame window in in-place activation
- [IOleInPlaceObject](IOleInPlaceObject) -- activates and deactivates an object in place
- [IOleInPlaceSite](IOleInPlaceSite) -- the container-side site for in-place activation
- [IOleInPlaceUIWindow](IOleInPlaceUIWindow) -- border space in a frame or document window
- [IOleObject](IOleObject) -- connects an embedded object to its site and performs its verbs
- [IOleWindow](IOleWindow) -- returns the window handle of an OLE object
- [IPerPropertyBrowsing](IPerPropertyBrowsing) -- display strings, property pages and predefined values of an object's properties
- [IPerPropertyBrowsingVB](IPerPropertyBrowsingVB) -- Visual Basic-style versions of three **IPerPropertyBrowsing** methods
- [IRichEditOle](IRichEditOle) -- the OLE objects in a Rich Edit control
- [IRichEditOleCallback](IRichEditOleCallback) -- what a Rich Edit control asks its container
- [ISpecifyPropertyPages](ISpecifyPropertyPages) -- lists the property pages of an object
- [IStorage](IStorage) -- stub for the structured-storage interface
- [IUnknownUnrestricted](IUnknownUnrestricted) -- the three methods of **IUnknown**, callable

## Types

- [OLEACCELMSG](OLEACCELMSG) -- a window message, with the layout of the Windows **MSG** structure
- [OLECADWORD](OLECADWORD) -- a counted array of **DWORD** values
- [OLECALPOLESTR](OLECALPOLESTR) -- a counted array of Unicode string pointers
- [OLECAUUID](OLECAUUID) -- a counted array of GUIDs
- [OLECLSID](OLECLSID) -- a class or interface identifier, with the layout of the Windows **GUID** structure
- [OLECONTROLINFO](OLECONTROLINFO) -- the keyboard mnemonic table of a control
- [OLEINPLACEFRAMEINFO](OLEINPLACEFRAMEINFO) -- accelerator information of an in-place frame
- [OLEPOINT](OLEPOINT) -- a point, with the layout of the Windows **POINT** structure
- [OLERECT](OLERECT) -- a rectangle, with the layout of the Windows **RECT** structure
- [OLESIZE](OLESIZE) -- a width and a height, with the layout of the Windows **SIZE** structure
