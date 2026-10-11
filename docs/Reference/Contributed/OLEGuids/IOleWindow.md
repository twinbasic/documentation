---
title: IOleWindow
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleWindow
has_toc: false
---

# IOleWindow interface
{: .no_toc }

Returns the handle of a window that an OLE object or container uses, and turns context-sensitive help mode on and off.

**IOleWindow** has the interface identifier `00000114-0000-0000-C000-000000000046` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IOleWindow](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/nn-oleidl-iolewindow).

It is the base of the in-place activation interfaces: [IOleInPlaceObject](IOleInPlaceObject), [IOleInPlaceUIWindow](IOleInPlaceUIWindow) (and through it [IOleInPlaceFrame](IOleInPlaceFrame)) and [IOleInPlaceSite](IOleInPlaceSite) extend it. Neither method is marked `[PreserveSig]`, so the HRESULT is hidden: a failure code raises a run-time error.

## Methods

### GetWindow

```tb inert=signature
Function GetWindow() As LongPtr
```

Returns the handle of one of the windows that take part in in-place activation: the frame, document, parent or in-place object window. The Windows method returns this handle through an output parameter; here it is the result.

### ContextSensitiveHelp

```tb inert=signature
Sub ContextSensitiveHelp(ByVal fEnterMode As Long)
```

Turns context-sensitive help mode on, when *fEnterMode* is not 0, or off, when it is 0. The mode is usually entered with Shift+F1, and the next click then asks for help on the item clicked.

## Example

This class reports one window handle, which it is given when it is created. Its **ContextSensitiveHelp** does nothing, because the class has no help mode.

```tb check_build slot=file
Class WindowSite
    Implements IOleWindow

    Private m_hWnd As LongPtr

    Public Sub Init(ByVal hWnd As LongPtr)
        m_hWnd = hWnd
    End Sub

    Private Function IOleWindow_GetWindow() As LongPtr Implements IOleWindow.GetWindow
        Return m_hWnd
    End Function

    Private Sub IOleWindow_ContextSensitiveHelp(ByVal fEnterMode As Long) Implements IOleWindow.ContextSensitiveHelp
    End Sub
End Class
```

## See Also

- [IOleInPlaceObject](IOleInPlaceObject) interface -- activates and deactivates an object in place
- [IOleInPlaceUIWindow](IOleInPlaceUIWindow) interface -- border space in a frame or document window
- [IOleInPlaceSite](IOleInPlaceSite) interface -- the container-side site for in-place activation
