---
title: Compiler Options
parent: Project Configuration
nav_order: 2
---

# Compiler Options

twinBASIC provides several compiler options to control how your code is compiled and optimized.

## COM Initialization

You can specify the call used by the hidden entry point with the following options: `CoInitialize STA`, `CoInitializeEx MTA`, `OleInitialize STA`. If you don't know the difference, don't change it from the default.

## Symbol Table Parameters

You can adjust the following parameters: Max Size Raw, Max Size Lookup, and Data Type Lookup. These options allow for compiling very large projects that would otherwise have issues, and the compiler will notify you if these values need to be increased.

## Boolean Type Sanitization

Under the hood, a Boolean is a 2-byte type. With memory APIs, or when receiving these from outside code, it's possible to store values other than the ones representing `True` and `False`. This option validates Booleans from external sources, e.g. COM objects and APIs, to ensure only the two supported values are stored.

## Additional Options

- **LARGEADDRESSAWARE**: Projects can be marked `LARGEADDRESSAWARE`.
- **Base Address**: A manual base address can be specified.
- **PE Relocation Symbols**: Option to strip PE relocation symbols.

## Exploit Mitigation

You can enable the following security features:

- **Data execution prevention (DEP)**
- **Address-space layout randomization (ASLR)**
