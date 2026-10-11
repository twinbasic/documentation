---
title: IOleInPlaceActiveObject
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleInPlaceActiveObject
has_toc: false
---

# IOleInPlaceActiveObject interface
{: .no_toc }

Lets the container of an OLE object that is active in place pass the object its accelerator keystrokes, window activation changes and border changes.

**IOleInPlaceActiveObject** has the interface identifier `00000117-0000-0000-C000-000000000046`. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IOleInPlaceActiveObject](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/nn-oleidl-ioleinplaceactiveobject).

## Declaration

The Windows interface extends **IOleWindow**. This declaration extends [**IUnknownUnrestricted**](IUnknownUnrestricted) instead, and declares **GetWindow** and **ContextSensitiveHelp** itself, in the order and with the meaning that [IOleWindow](IOleWindow) gives them. The type is therefore not derived from **IOleWindow**, though the methods come in the same order.

Every method is marked `[PreserveSig]`, **GetWindow** and **ContextSensitiveHelp** included: they return the raw HRESULT as a **Long**, and **GetWindow** returns the window handle through its *phWnd* parameter. A class cannot implement this interface; it is for calling. [IOleInPlaceActiveObjectVB](IOleInPlaceActiveObjectVB) declares **TranslateAccelerator** in a form a class can implement.

## Methods

### GetWindow

```tb inert=signature
[PreserveSig]
Function GetWindow(ByRef phWnd As LongPtr) As Long
```

Returns the handle of the window that takes part in in-place activation, in *phWnd*. The result is the raw HRESULT.

### ContextSensitiveHelp

```tb inert=signature
[PreserveSig]
Function ContextSensitiveHelp(ByVal fEnterMode As Long) As Long
```

Turns context-sensitive help mode on, when *fEnterMode* is not 0, or off, when it is 0. The result is the raw HRESULT.

### TranslateAccelerator

```tb inert=signature
[PreserveSig]
Function TranslateAccelerator(ByVal lpMsg As LongPtr) As Long
```

Lets the object process an accelerator keystroke that the container's message loop received. *lpMsg* points to the `MSG` of the keystroke, such as the address of an [OLEACCELMSG](OLEACCELMSG). The result is `S_OK` (0) when the object used the keystroke and `S_FALSE` (1) when it did not.

### OnFrameWindowActivate

```tb inert=signature
[PreserveSig]
Function OnFrameWindowActivate(ByVal fActivate As Long) As Long
```

Tells the object that the container's top-level frame window was activated, when *fActivate* is not 0, or deactivated, when it is 0.

### OnDocWindowActivate

```tb inert=signature
[PreserveSig]
Function OnDocWindowActivate(ByVal fActivate As Long) As Long
```

Tells the object that the container's document window was activated, when *fActivate* is not 0, or deactivated, when it is 0.

### ResizeBorder

```tb inert=signature
[PreserveSig]
Function ResizeBorder(ByVal prcBorder As LongPtr, ByVal pUIWindow As OLEGuids.IOleInPlaceUIWindow, ByVal fFrameWindow As Long) As Long
```

Tells the object that the border space it may use for its tools changed. *prcBorder* points to a `RECT` holding the new outer rectangle in which the object can request space, such as the address of an [OLERECT](OLERECT). *pUIWindow* is the [IOleInPlaceUIWindow](IOleInPlaceUIWindow) of the frame or document window whose border changed, and *fFrameWindow* is not 0 when that is the frame window.

### EnableModeless

```tb inert=signature
[PreserveSig]
Function EnableModeless(ByVal fEnable As Long) As Long
```

Enables the object's modeless dialog windows, when *fEnable* is not 0, or disables them, when it is 0. A container disables them while it shows a modal dialog of its own.

## See Also

- [IUnknownUnrestricted](IUnknownUnrestricted) interface -- the base interface
- [IOleWindow](IOleWindow) interface -- the interface whose two methods are redeclared here
- [IOleInPlaceActiveObjectVB](IOleInPlaceActiveObjectVB) interface -- Visual Basic-style **TranslateAccelerator**
- [IOleInPlaceUIWindow](IOleInPlaceUIWindow) interface -- border space in a frame or document window
- [OLERECT](OLERECT) type -- a rectangle
- [OLEACCELMSG](OLEACCELMSG) type -- a window message
