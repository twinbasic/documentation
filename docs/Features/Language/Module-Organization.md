---
title: Module Organization
parent: Language Syntax
nav_order: 16
permalink: /Features/Language/Module-Organization
---

# Module-Level Code Organization

Module-level code can appear in between methods or properties. `Declare` statements, `Enum`, `Type` and similar declarations need not come before the first `Sub/Function/Property`, as VB6 requires. The following is valid:

```tb check_build
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
