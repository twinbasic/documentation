---
title: AddCustomBinderObject
parent: ExpressionService Module
permalink: /tB/Modules/ExpressionService/AddCustomBinderObject
---
# AddCustomBinderObject
{: .no_toc }

Exposes the public members of an object so that compiled expressions can reach them.

Syntax: *service*.**AddCustomBinderObject** *name*, *object* [ **,** *flags* ]

*service*
: *required* An object expression that evaluates to a **TbExpressionService** object.

*name*
: *required* A **String** giving the qualifier under which *object*'s members are visible to expressions compiled by *service*.

*object*
: *required* The object whose public members are exposed.

*flags*
: *optional* A combination of [**ExpressionEngineBinderFlags**](./#expressionenginebinderflags) values. The default is `0`, in which case the object's members are reachable only when qualified by *name* (e.g. `Report.Title`). Pass [**IsAppObject**](./#IsAppObject) to additionally make the members reachable without qualification, the way an Office host's **Application** members are.

Member resolution is performed by name through the standard COM/IDispatch protocol — any property or method that is callable from outside the object is callable from the expression. The object must remain alive for as long as expressions might be evaluated against it.

Multiple objects can be bound to the same service, each under its own *name*. They are consulted in the order they were added.

### Example

This example exposes the host's report object so that an expression can refer to its properties either by qualified name or by bare name.

```tb
Dim Service As TbExpressionService = New TbExpressionService
Service.AddStdLibraryBinder()
Service.AddCustomBinderObject "Report", Me, IsAppObject

Debug.Print Service.Compile("Report.Title").Evaluate()    ' "Sales Q4"
Debug.Print Service.Compile("Title").Evaluate()           ' "Sales Q4" — IsAppObject in effect
```

### See Also

- [Compile](Compile) method
- [AddStdLibraryBinder](AddStdLibraryBinder) method
- [AddCustomBinder](AddCustomBinder) method
