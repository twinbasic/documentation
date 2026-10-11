---
title: IOleObject
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleObject
has_toc: false
---

# IOleObject interface
{: .no_toc }

The main interface of an embedded OLE object: connects the object to its container's site, and asks the object to perform a verb such as showing or opening itself.

**IOleObject** has the interface identifier `00000112-0000-0000-C000-000000000046` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IOleObject](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/nn-oleidl-ioleobject).

The declaration is partial. The Windows interface has 21 methods, and this one declares the first nine, up to and including **DoVerb**. The methods that follow --- **EnumVerbs**, **Update**, **IsUpToDate**, **GetUserClassID**, **GetUserType**, **SetExtent**, **GetExtent**, **Advise**, **Unadvise**, **EnumAdvise**, **GetMiscStatus** and **SetColorScheme** --- are not declared. **DoVerb** is marked `[PreserveSig]`, so a class cannot implement this interface; it is for calling. Every method except **DoVerb** hides the HRESULT: a failure code raises a run-time error.

A parameter that is a pointer to an interface or structure that the package does not declare (an `IMoniker*`, an `IDataObject*`, a `RECT*`, a `MSG*`) is a **LongPtr**.

## Methods

### SetClientSite

```tb inert=signature
Sub SetClientSite(ByVal pClientSite As OLEGuids.IOleClientSite)
```

Tells the object which [IOleClientSite](IOleClientSite) represents its place in the container. A container calls it once, when the object is created or loaded.

### GetClientSite

```tb inert=signature
Function GetClientSite() As OLEGuids.IOleClientSite
```

Returns the client site that **SetClientSite** last gave the object.

### SetHostNames

```tb inert=signature
Sub SetHostNames(ByVal lpszContainerApp As LongPtr, ByVal lpszContainerObj As LongPtr)
```

Gives the object the names of the container application and of the container's document or object, which the object can show in its window caption. Both parameters are pointers to Unicode strings, so a caller passes `StrPtr(name)`.

### Close

```tb inert=signature
Sub Close(ByVal dwSaveOption As Long)
```

Moves the object from the running state to the loaded state. *dwSaveOption* says whether the object saves first: 0 saves it if it has changed (`OLECLOSE_SAVEIFDIRTY`), 1 does not save (`OLECLOSE_NOSAVE`), and 2 prompts the user (`OLECLOSE_PROMPTSAVE`).

### SetMoniker

```tb inert=signature
Sub SetMoniker(ByVal dwWhichMoniker As Long, ByVal lpmk As LongPtr)
```

Tells the object the moniker of its container, or of the object itself. *lpmk* is an `IMoniker*`. *dwWhichMoniker* says which moniker it is: 1 for the container's, 2 for the object's name relative to the container, and 3 for the object's full name (`OLEWHICHMK_CONTAINER`, `OLEWHICHMK_OBJREL`, `OLEWHICHMK_OBJFULL`).

### GetMoniker

```tb inert=signature
Function GetMoniker(ByVal dwAssign As Long, ByVal dwWhichMoniker As Long) As LongPtr
```

Returns an `IMoniker*` that names the object, as a **LongPtr**. *dwAssign* says whether the object assigns itself a moniker if it has none: 1 returns one only if it exists, 2 forces an assignment, 3 removes the assignment and 4 assigns a temporary one (`OLEGETMONIKER_ONLYIFTHERE`, `OLEGETMONIKER_FORCEASSIGN`, `OLEGETMONIKER_UNASSIGN`, `OLEGETMONIKER_TEMPFORUSER`). *dwWhichMoniker* is the same value as for **SetMoniker**.

### InitFromData

```tb inert=signature
Sub InitFromData(ByVal lpDataObject As LongPtr, ByVal fCreation As Long, ByVal dwReserved As Long)
```

Initializes the object from the data in an `IDataObject*`, *lpDataObject*. *fCreation* is not 0 when the object is being created from the data, and 0 when the data replaces the contents of an existing object. *dwReserved* is reserved.

### GetClipboardData

```tb inert=signature
Function GetClipboardData(ByVal dwReserved As Long) As LongPtr
```

Returns an `IDataObject*` holding the data the object would put on the clipboard if it were copied, as a **LongPtr**. *dwReserved* is reserved and is passed as 0.

### DoVerb

```tb inert=signature
[PreserveSig]
Function DoVerb(ByVal iVerb As Long, ByVal lpMsg As LongPtr, ByVal pActiveSite As OLEGuids.IOleClientSite, ByVal Index As Long, ByVal hWndParent As LongPtr, ByVal lprcPosRect As LongPtr) As Long
```

Asks the object to perform one of its verbs. The result is the raw HRESULT.

*iVerb*
: A verb number. The standard verbs are negative or zero: 0 is the primary verb (`OLEIVERB_PRIMARY`), -1 shows the object (`OLEIVERB_SHOW`), -2 opens it in a separate window (`OLEIVERB_OPEN`), -3 hides it (`OLEIVERB_HIDE`), -4 activates it in place with its user interface (`OLEIVERB_UIACTIVATE`) and -5 activates it in place without it (`OLEIVERB_INPLACEACTIVATE`).

*lpMsg*
: A pointer to the `MSG` that caused the activation, such as the double-click, or 0.

*pActiveSite*
: The [IOleClientSite](IOleClientSite) of the site that activates the object.

*Index*
: Reserved; the Windows parameter is named `lindex`. Pass 0.

*hWndParent*
: The handle of the container window that holds the object.

*lprcPosRect*
: A pointer to a `RECT` holding the object's position in *hWndParent*, such as the address of an [OLERECT](OLERECT).

## See Also

- [IOleClientSite](IOleClientSite) interface -- the container-side site of an embedded object
- [IOleInPlaceObject](IOleInPlaceObject) interface -- activates and deactivates an object in place
- [IOleControl](IOleControl) interface -- keyboard mnemonics and ambient properties of a control
- [OLERECT](OLERECT) type -- a rectangle
