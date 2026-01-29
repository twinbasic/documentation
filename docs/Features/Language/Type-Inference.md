---
title: Type Inference
parent: Language Syntax
nav_order: 9
---

# Type Inference

Variables can now be declared `As Any` and their type will be inferred, similar to C++'s `auto`.

## Usage

`Dim x As Any = 5&` would result in x being a `Long`.

## Limitations

This is only for the `Dim` statement; arguments cannot be `As Any` except in API declarations.
