---
title: Module Organization
parent: Language Syntax
nav_order: 16
---

# Module-Level Code Organization

It's now possible to insert module-level code in between methods or properties. Where previously all `Declare` statements, `Enum`, `Type`, etc had to appear prior to the first `Sub/Function/Property`, the following would now be valid:

```vb
Private Const foo = "foo"
Sub SomeMethod()
'...
End Sub
Private Const bar = "bar"
Sub SomeOtherMethod()
'...
End Sub
```

## Preset Methods for Code Part Names

The following can be used and what they represent will be automatically inserted as a `String`:

- `CurrentComponentName`, e.g. "Form1"
- `CurrentProcedureName`, e.g. "Foo" when in `Sub Foo()`
- `CurrentProjectName`
- `CurrentSourceFile`
- `CurrentComponentCLSID`

## Removal of Limits

twinBASIC imposes no artificial limitations on line continuations, procedure size, number of controls on a form, module size, and more.
