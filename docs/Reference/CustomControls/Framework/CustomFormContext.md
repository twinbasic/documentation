---
title: CustomFormContext
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/CustomFormContext
has_toc: false
---

# CustomFormContext class
{: .no_toc }

The form-class counterpart to [**CustomControlContext**](CustomControlContext). Extends the base context with **Show** and **Close** --- the operations a top-level form needs that an embedded control does not.

[**WaynesForm**](../WaynesForm/) receives its context as a [**CustomControlContext**](CustomControlContext) (because it implements [**ICustomControl**](ICustomControl)) and casts it to **CustomFormContext** internally so that it can call **Show** from its own **Show** method and **Close** from its **Close** method.

```tb
Private Sub OnInitialize(ByVal Ctx As CustomControls.CustomControlContext) _
        Implements CustomControls.ICustomControl.Initialize

    Set Me.ControlContext = CType(Of CustomFormContext)(Ctx)
End Sub
```

## Inherited

A **CustomFormContext** includes every member from [**CustomControlContext**](CustomControlContext) --- [**ChangeFocusedElement**](CustomControlContext#changefocusedelement), [**CreateTimer**](CustomControlContext#createtimer), [**GetSerializer**](CustomControlContext#getserializer), and [**Repaint**](CustomControlContext#repaint) --- and adds the two form-specific members below.

## Methods

### Close
{: .no_toc }

Closes the underlying window. Equivalent to the user clicking the title-bar close button. Application code typically calls [**WaynesForm.Close**](../WaynesForm/#close), which in turn calls into this method.

Syntax: *object*.**Close** ( )

### Show
{: .no_toc }

Shows the underlying window. Application code typically calls [**WaynesForm.Show**](../WaynesForm/#show), which in turn calls into this method.

Syntax: *object*.**Show** ( )
