---
title: _CustomFormContext
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/_CustomFormContext
has_toc: false
---

# _CustomFormContext interface
{: .no_toc }

The underlying COM interface for [**CustomFormContext**](CustomFormContext), extending [**_CustomControlContext**](_CustomControlContext) with **Show** and **Close** --- the two operations a top-level custom form needs that an embedded control does not.

User code works with [**CustomFormContext**](CustomFormContext) directly; this interface page documents the method contract that the CoClass exposes.

## Inherited

Every member of [**_CustomControlContext**](_CustomControlContext) is also present on **_CustomFormContext** --- [**GetSerializer**](_CustomControlContext#getserializer), [**Repaint**](_CustomControlContext#repaint), [**CreateTimer**](_CustomControlContext#createtimer), and [**ChangeFocusedElement**](_CustomControlContext#changefocusedelement).

## Methods

### Show
{: .no_toc }

Makes the underlying window visible.

Syntax: *object*.**Show** ( )

The method maps to the Win32 show-window operation on the form's HWND. Application code typically calls [**WaynesForm.Show**](../WaynesForm/#show), which in turn calls this method through the stored [**CustomFormContext**](CustomFormContext) reference.

A custom form class casts the [**CustomControlContext**](CustomControlContext) it receives in [**ICustomForm.Initialize**](ICustomForm#initialize) to [**CustomFormContext**](CustomFormContext) and stores it; it then exposes its own **Show** method that delegates here:

```tb
Private m_Context As CustomControls.CustomFormContext

Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomFormContext) _
        Implements CustomControls.ICustomForm.Initialize

    Set m_Context = Ctx
End Sub

Public Sub Show()
    m_Context.Show
End Sub
```

### Close
{: .no_toc }

Closes the underlying window. Equivalent to the user clicking the title-bar close button.

Syntax: *object*.**Close** ( )

Application code typically calls [**WaynesForm.Close**](../WaynesForm/#close), which in turn calls this method through the stored [**CustomFormContext**](CustomFormContext) reference.

## See Also

- [CustomFormContext](CustomFormContext) class
- [_CustomControlContext](_CustomControlContext) interface
- [ICustomForm](ICustomForm) interface
- [CustomControlContext](CustomControlContext) class
