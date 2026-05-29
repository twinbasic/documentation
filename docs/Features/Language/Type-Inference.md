---
title: Type Inference
parent: Language Syntax
nav_order: 9
permalink: /Features/Language/Type-Inference
---

# Type Inference

Variables can now be declared `As Any` and their type will be inferred, similar to C++'s `auto`.

## Usage

`Dim x As Any = 5&` would result in x being a `Long`.

```tb
Dim x As Any = 5&       ' x is inferred as Long
Dim s As Any = "hello"  ' s is inferred as String
Dim b As Any = True     ' b is inferred as Boolean
```

## Limitations

This is only for the `Dim` statement; arguments cannot be `As Any` except in API declarations.
