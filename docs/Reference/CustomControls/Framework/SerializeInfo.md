---
title: SerializeInfo
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/SerializeInfo
has_toc: false
---

# SerializeInfo type (UDT)
{: .no_toc }

The per-instance serializer for a custom control, returned by [**CustomControlContext.GetSerializer**](CustomControlContext#getserializer). The main entry point is [**RuntimeUISrzDeserialize**](#runtimeuisrzdeserialize) — called from a control's [**Initialize**](ICustomControl#initialize) to load the designer-set property values that were saved into the form's serialized data. The remaining members expose framework state — design-mode flag, runtime / report mode, owner window handle — that a control may need while initializing.

```tb
Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
        Implements CustomControls.ICustomControl.Initialize

    With Ctx.GetSerializer
        If Not .RuntimeUISrzDeserialize(Me, False) Then
            InitializeDefaultValues
        End If

        Me.IsDesignMode = .RuntimeUISrzIsDesignMode()
    End With

    Set Me.ControlContext = Ctx
End Sub
```

## Methods

### RuntimeUISrzDeserialize
{: .no_toc }

Loads the serialized property values for this control instance into *Object*. Returns **True** if serialized data was present and was applied, or **False** if no data was found — in which case the control should apply its own defaults.

Syntax: *SerializeInfo*.**RuntimeUISrzDeserialize** ( *Object*, *UseOuterOwner* ) **As Boolean**

*Object*
: *required* The custom control instance whose properties should be populated. From inside an **Initialize** implementation this is **Me**.

*UseOuterOwner*
: *required* A **Boolean** flag for advanced use; pass **False** in normal cases.

### RuntimeUISrzGetFormHWND
{: .no_toc }

Returns the **HWND** of the parent form's underlying Win32 window.

Syntax: *SerializeInfo*.**RuntimeUISrzGetFormHWND** ( ) **As LongPtr**

### RuntimeUISrzGetOrientationHint
{: .no_toc }

Returns a hint indicating the orientation of the parent form. **Long**.

Syntax: *SerializeInfo*.**RuntimeUISrzGetOrientationHint** ( ) **As Long**

### RuntimeUISrzGetRootCLSID
{: .no_toc }

Returns the CLSID of the form class that owns this control, as a **String**.

Syntax: *SerializeInfo*.**RuntimeUISrzGetRootCLSID** ( ) **As String**

### RuntimeUISrzGetRootClassDispatch
{: .no_toc }

Returns the form-class instance that owns this control, typed as an **Object**.

Syntax: *SerializeInfo*.**RuntimeUISrzGetRootClassDispatch** ( ) **As Object**

### RuntimeUISrzIsDesignMode
{: .no_toc }

Returns **True** if the control is being created at design time (inside the form designer) rather than at run time. Controls that want to render a placeholder at design time only — like [**WaynesTimer**](../WaynesTimer), which draws its 🕑 glyph only when **IsDesignMode** is **True** — read this flag during **Initialize**.

Syntax: *SerializeInfo*.**RuntimeUISrzIsDesignMode** ( ) **As Boolean**

### RuntimeUISrzIsReportMode
{: .no_toc }

Returns **True** if the control is being created as part of a report-rendering pass.

Syntax: *SerializeInfo*.**RuntimeUISrzIsReportMode** ( ) **As Boolean**

### RuntimeUISrzIsRuntimeAdded
{: .no_toc }

Returns **True** if the control was added at run time (via [**CustomControlsCollection.Add**](CustomControlsCollection#add)) rather than placed in the form designer.

Syntax: *SerializeInfo*.**RuntimeUISrzIsRuntimeAdded** ( ) **As Boolean**
