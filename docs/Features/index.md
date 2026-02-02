---
title: Features
nav_order: 6
permalink: /Features/
has_toc: false
---

# Features

This section documents all the features and enhancements that twinBASIC brings compared to VBx and earlier BASIC dialects. 

twinBASIC maintains backward compatibility with VBx syntax while providing these powerful new features. Most enhancements are opt-in, allowing you to gradually adopt them in your projects.

For detailed documentation on each feature, navigate to the specific category listed below.

## Categories

### [Attributes](Attributes)

Attributes allow you to annotate Forms, Modules, Classes, Types, Enums, Declares, and procedures with compiler instructions and metadata. These are now visible directly in your code editor.

### [Language Syntax](Language/)

twinBASIC introduces numerous language enhancements including:

- New data types: **LongPtr**, **LongLong**, **Decimal**,
- Native **Interface** and **CoClass** definitions,
- OOP features with **Implements Via** and **Inherits,**
- Generics and method overloading,
- Enhanced operators and literals,
- Type inference and pointer functionality,
- UDT enhancements with methods and events.

### [Project Configuration](Project-Configuration/)

twinBASIC offers various project types and configuration options:

- Standard DLLs, Console applications, Services, and Kernel drivers
- Compiler options for optimization and security
- Entry point override and IAT placement
- Registration options for ActiveX projects

### [Standard Library](Standard-Library)

Enhancements to the standard library include:

- Full Unicode support throughout
- File I/O with multiple encoding options
- New built-in functions and App object properties
- Direct COM error handling access
- Destructuring assignment for arrays

### [GUI Components](GUI-Components/)

Modernized GUI components featuring:

- Enhanced forms with transparency and alpha blending
- Control anchoring and docking
- Windowed and windowless controls
- 64-bit support and DPI awareness
- New controls (QR Code, Multiframe, CheckMark)

### [Packages](Packages/)

Packages are collections of components that can be referenced from another twinBASIC project. They are distributed as TWINPACK files that contains everything needed by the components in that package.

### [Advanced Features](Advanced/)

Advanced programming capabilities:

- Multithreading support via direct API calls
- Direct assembly insertion with `Emit()`
- Static linking of OBJ and LIB files
- Enhanced API declarations (CDecl, variadic args, ByVal UDTs)
- Parameterized constructors and class exports

### [Compiler and IDE Features](Compiler-IDE/)

Improved development experience:

- Compiler warnings and strict mode
- Debug trace logger and stale pointer detection
- CodeLens for running Subs directly
- Modern IDE with themes, code folding, and more
- Package server for code sharing

### [64bit Compilation](64bit)

twinBASIC can compile native 64bit executables in addition to 32bit, using the **LongPtr** data type and **PtrSafe** keyword for API declarations.

