---
title: CustomControlContext
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/CustomControlContext
has_toc: false
---

# CustomControlContext class
{: .no_toc }

The callback object passed to a custom control's [**Initialize**](ICustomControl#initialize). Holds the connection back into the framework — used to deserialize designer-set property values, request repaints, create timers, and move the keyboard focus between elements the control has drawn.

Custom controls store the **CustomControlContext** in a private field (typically called **ControlContext**) so that they can call back into the framework at any point after **Initialize** has returned. The form-class counterpart [**CustomFormContext**](CustomFormContext) extends this with **Show** and **Close**.

```tb
Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
        Implements CustomControls.ICustomControl.Initialize

    ' Load any serialized property values
    If Not Ctx.GetSerializer.RuntimeUISrzDeserialize(Me, False) Then
        InitializeDefaultValues
    End If

    ' Remember the context for later
    Set Me.ControlContext = Ctx
End Sub
```

## Methods

### ChangeFocusedElement
{: .no_toc }

Asks the framework to move the keyboard focus to a particular `ElementTabIndex` value, as if the user had pressed **TAB** until reaching that point. Used by [**WaynesGrid**](../WaynesGrid/) when a cell is selected programmatically — the grid changes its **SelectedCellX** / **SelectedCellY** and then calls this method so that the form-level focus tracking matches.

Syntax: *object*.**ChangeFocusedElement** *ElementTabIndex*

*ElementTabIndex*
: *required* A **Long** matching the **ElementTabIndex** of an element that was added to the canvas in the most recent paint pass.

### CreateTimer
{: .no_toc }

Returns a new [**CustomControlTimer**](CustomControlTimer) bound to this control's lifetime. The timer is **Disabled** on creation; the caller sets [**Interval**](CustomControlTimer#interval), subscribes to the timer's **OnTimer** event, and sets [**Enabled**](CustomControlTimer#enabled) to **True** to start it.

Syntax: *object*.**CreateTimer** ( ) **As stdole.IUnknown**

The framework returns the timer typed as **stdole.IUnknown**; cast with `CType(Of CustomControlTimer)(…)` to get a strongly-typed reference. [**WaynesTimer**](../WaynesTimer) and [**WaynesSlider**](../WaynesSlider/) both use this pattern.

### GetSerializer
{: .no_toc }

Returns the [**SerializeInfo**](SerializeInfo) handle for this control instance. The serializer exposes the deserialization entry point and the run-time / design-time mode flags.

Syntax: *object*.**GetSerializer** ( ) **As SerializeInfo**

### Repaint
{: .no_toc }

Tells the framework that the control's appearance has changed and that the canvas should be repainted at the next opportunity. The framework eventually calls back into [**ICustomControl.Paint**](ICustomControl#paint); calling **Repaint** multiple times in quick succession produces at most one paint.

Syntax: *object*.**Repaint** ( )

Every concrete `Waynes…` control hooks the **OnChanged** events on its state and style sub-objects, and calls **Repaint** from the handler — so a runtime assignment like `btn.NormalState.BackgroundFill.ColorPoints.SetSolidColor vbBlue` triggers an automatic redraw.
