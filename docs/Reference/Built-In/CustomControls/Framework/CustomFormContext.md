---
title: CustomFormContext
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/CustomFormContext
has_toc: false
---

# CustomFormContext class
{: .no_toc }

The form-class counterpart to [**CustomControlContext**](CustomControlContext). Extends the base context with **Show** and **Close** --- the operations a top-level custom form needs that an embedded control does not.

A custom form class receives a [**CustomFormContext**](CustomFormContext) through its [**ICustomForm.Initialize**](ICustomForm#initialize) method. It stores that reference and delegates its own **Show** and **Close** methods to the corresponding context methods. The underlying COM interface is [**_CustomFormContext**](_CustomFormContext).

```tb
Private m_Context As CustomControls.CustomFormContext

Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomFormContext) _
        Implements CustomControls.ICustomForm.Initialize

    Set m_Context = Ctx
End Sub

Public Sub Show()
    m_Context.Show
End Sub

Public Sub Close()
    m_Context.Close
End Sub
```

## Inherited

A **CustomFormContext** includes every member from [**CustomControlContext**](CustomControlContext) --- [**GetSerializer**](CustomControlContext#getserializer), [**Repaint**](CustomControlContext#repaint), [**CreateTimer**](CustomControlContext#createtimer), and [**ChangeFocusedElement**](CustomControlContext#changefocusedelement) --- and adds the two form-specific members below.

## Methods

### Close
{: .no_toc }

Closes the underlying window. Equivalent to the user clicking the title-bar close button.

Syntax: *object*.**Close** ( )

Application code typically calls [**WaynesForm.Close**](../WaynesForm/#close), which in turn calls this method through the stored **CustomFormContext** reference.

### Show
{: .no_toc }

Makes the underlying window visible.

Syntax: *object*.**Show** ( )

Application code typically calls [**WaynesForm.Show**](../WaynesForm/#show), which in turn calls this method through the stored **CustomFormContext** reference.

## See Also

- [_CustomFormContext](_CustomFormContext) interface -- the COM interface this CoClass exposes as its default
- [CustomControlContext](CustomControlContext) class -- the base context for embedded custom controls
- [ICustomForm](ICustomForm) interface -- the interface a custom form class implements; receives a **CustomFormContext** in **Initialize**
- [WaynesForm](../WaynesForm/) -- the built-in custom form that uses **CustomFormContext**
