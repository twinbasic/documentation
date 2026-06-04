---
title: _CustomControlContext
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/_CustomControlContext
has_toc: false
---

# _CustomControlContext interface
{: .no_toc }

The default COM interface of the [**CustomControlContext**](CustomControlContext) CoClass, defining the four callback methods the framework exposes to a custom control: serializer access, repaint requests, timer creation, and focus changes.

User code does not reference this interface by name. Any variable declared `As CustomControlContext` automatically binds to `_CustomControlContext` because the CoClass declares it as its default interface. [**_CustomFormContext**](CustomFormContext) extends this interface with the form-specific **Show** and **Close** methods.

## Methods

### GetSerializer
{: .no_toc }

Returns the [**SerializeInfo**](SerializeInfo) handle for this control instance. The serializer exposes the deserialization entry point and the run-time/design-time mode flags.

Syntax: *object*.**GetSerializer** ( ) **As SerializeInfo**

Call **GetSerializer** at the start of a control's [**Initialize**](ICustomControl#initialize) implementation to load any property values that were set in the form designer, and to read the mode flags before storing the context for later use.

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

### Repaint
{: .no_toc }

Tells the framework that the control's appearance has changed and that the canvas should be repainted at the next opportunity.

Syntax: *object*.**Repaint** ( )

The framework schedules one paint pass regardless of how many times **Repaint** is called before it runs --- multiple calls in quick succession produce at most one call to [**ICustomControl.Paint**](ICustomControl#paint). This means it is safe to call **Repaint** from multiple **OnChanged** handlers that fire together when several style properties are set in sequence.

When writing a new custom control, call **Repaint** whenever the control's internal state changes in a way that affects what the next **Paint** call should draw. Every concrete `Waynes...` control hooks the **OnChanged** events raised by its style sub-objects and calls **Repaint** from each handler, so a runtime property assignment triggers an automatic redraw without the caller needing to call **Repaint** directly.

```tb
' In a custom control class:
Private m_Context As CustomControls.CustomControlContext
Private m_Caption As String

Public Property Let Caption(ByVal Value As String)
    m_Caption = Value
    m_Context.Repaint   ' schedule a repaint to show the new caption
End Property
```

### CreateTimer
{: .no_toc }

Returns a new [**CustomControlTimer**](CustomControlTimer) bound to this control's lifetime. The timer is disabled on creation; the caller sets [**Interval**](CustomControlTimer#interval), subscribes to [**OnTimer**](CustomControlTimer#ontimer), and sets [**Enabled**](CustomControlTimer#enabled) to **True** to start it.

Syntax: *object*.**CreateTimer** ( ) **As stdole.IUnknown**

The timer is returned as **stdole.IUnknown**. Cast to [**CustomControlTimer**](CustomControlTimer) with `CType(Of CustomControlTimer)(…)` before accessing its members. Declare the holding field with **WithEvents** so that the **OnTimer** event can be handled.

```tb
Private WithEvents InternalTimer As CustomControlTimer

Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
        Implements CustomControls.ICustomControl.Initialize

    Set Me.ControlContext = Ctx
    Set Me.InternalTimer = CType(Of CustomControlTimer)(Ctx.CreateTimer())
    Me.InternalTimer.Interval = 250
    Me.InternalTimer.Enabled = True
End Sub

Private Sub OnTimer() Handles InternalTimer.OnTimer
    ' called every 250 ms
End Sub
```

### ChangeFocusedElement
{: .no_toc }

Asks the framework to move the keyboard focus to the element identified by *ElementTabIndex*.

Syntax: *object*.**ChangeFocusedElement** *ElementTabIndex*

*ElementTabIndex*
: *required* A **Long** matching the **ElementTabIndex** of an element that was registered in the most recent paint pass.

The framework maintains a focus cursor over the elements a control adds to the [**Canvas**](Canvas) during **Paint**. Normally the cursor advances when the user presses **TAB** or **SHIFT+TAB**. Calling **ChangeFocusedElement** moves it programmatically to the element whose tab index equals *ElementTabIndex*, as if the user had tabbed to that position directly --- without any actual key press.

Use this method when the control changes its own selection state without user keyboard input and needs the form-level focus tracking to reflect the new selection. [**WaynesGrid**](../WaynesGrid/) calls **ChangeFocusedElement** whenever a cell is selected programmatically: it updates **SelectedCellX** and **SelectedCellY**, then calls this method with the element tab index corresponding to the newly selected cell so that the framework's focus cursor stays consistent with the grid's internal selection.

*ElementTabIndex* must correspond to an element added in the **most recent** call to [**ICustomControl.Paint**](ICustomControl#paint). If the value does not match any registered element, the framework ignores the call.

```tb
' In a custom control that renders multiple clickable regions:
Private m_Context As CustomControls.CustomControlContext

Private Sub SelectItem(ByVal ItemIndex As Long)
    m_SelectedIndex = ItemIndex
    ' Move the framework's focus cursor to the matching element.
    ' The element's ElementTabIndex was set equal to ItemIndex when
    ' added to the canvas in the last Paint call.
    m_Context.ChangeFocusedElement ItemIndex
    m_Context.Repaint
End Sub
```

## See Also

- [CustomControlContext](CustomControlContext) -- the CoClass that exposes this interface as its default
- [CustomFormContext](CustomFormContext) -- extends this interface with **Show** and **Close** for form-class controls
- [ICustomControl](ICustomControl) -- the interface a custom control implements; receives a **CustomControlContext** in **Initialize**
- [SerializeInfo](SerializeInfo) -- the handle returned by **GetSerializer**
- [CustomControlTimer](CustomControlTimer) -- the timer object returned by **CreateTimer**
