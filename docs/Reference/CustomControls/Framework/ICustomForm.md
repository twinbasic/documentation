---
title: ICustomForm
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/ICustomForm
has_toc: false
---

# ICustomForm interface
{: .no_toc }

The form-class counterpart to [**ICustomControl**](ICustomControl). Custom *form* classes --- top-level windows that host other custom controls --- implement this interface instead. The shape is identical to **ICustomControl** except that the **Initialize** callback receives a [**CustomFormContext**](CustomFormContext) (which extends [**CustomControlContext**](CustomControlContext) with **Show** and **Close**) rather than a plain **CustomControlContext**.

[**WaynesForm**](../WaynesForm/), the package's only concrete form class, does in fact implement [**ICustomControl**](ICustomControl) and cast its context to **CustomFormContext** internally --- the **ICustomForm** interface is published for parity with **ICustomControl** but is not currently consumed by any class shipped with the package.

## Methods

### Destroy
{: .no_toc }

Called once when the form is being released. See [**ICustomControl.Destroy**](ICustomControl#destroy).

Syntax: *object*.**Destroy** ( )

### Initialize
{: .no_toc }

Called once after the framework has constructed the form and deserialized any designer-set property values into it.

Syntax: *object*.**Initialize** ( *Context* )

*Context*
: *required* The [**CustomFormContext**](CustomFormContext) for this form instance.

### Paint
{: .no_toc }

Called every time the framework needs to redraw the form's client area. See [**ICustomControl.Paint**](ICustomControl#paint).

Syntax: *object*.**Paint** ( *Canvas* )

*Canvas*
: *required* The [**Canvas**](Canvas) drawing surface for this paint pass.
