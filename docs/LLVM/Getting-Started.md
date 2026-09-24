---
title: Getting Started with LLVM
parent: LLVM
nav_order: 1
permalink: /LLVM/Getting-Started
---

# Getting Started with LLVM

Covers turning on LLVM compilation for a project or for a single procedure, the options that control it, and its current limitations.

## What is LLVM?

LLVM is an optional part of the compiler that produces code highly optimized for performance and size. Most applications benefit from it; how much depends on the code.

During compilation, LLVM translates your code into an *intermediate representation* --- a form between the twinBASIC source and the final machine code. It then reorganizes that representation with a wide variety of techniques, such as removing code that can never run (*dead code elimination*), simplifying loops, rewriting arithmetic to avoid slow operations like division, and inlining functions. Where it applies, LLVM can also make your code use CPU features designed to speed up particular operations.

## LLVM in twinBASIC

You turn LLVM on in [Project Settings](../tB/IDE/Project/Settings). It is off by default while it is experimental. Project Settings has these options for it:

![The Project Settings dialog scrolled to its two compiler option sections, Compiler Options (BUILD) and Compiler Options (DEBUG). Each has the same unticked boxes in two columns: Enable LLVM Compilation, LLVM: Generate optimized code, LLVM: Optimize for smaller filesize, and one LLVM: Target CPUs with box for each of AES, AVX, AVX2, BMI2, FMA, FXSR, LZCNT, POPCNT, RDSEED, SHA, SSE, SSE2, SSE3, SSE4.1, SSE4.2, SSSE3, XSAVE, XSAVEC, XSAVEOPT and XSAVES. Under the BUILD section a note says that software built for a CPU feature will not run on a CPU without it. Under the DEBUG section a bold note says that LLVM compilation in the IDE debug environment is not recommended, because LLVM-compiled code cannot be debugged.](Images/llvmdoc1.jpg)

The same options appear in two sections:

- **Compiler Options (BUILD)** applies when you build the project into an EXE, a DLL or another output file.
- **Compiler Options (DEBUG)** applies when you run the project from the IDE.

**Enable LLVM Compilation** turns LLVM on. With only this box ticked, LLVM runs during compilation and creates the intermediate representation of your code, but does not apply the optimizations for performance and size. You will usually want to tick one or both of the next two options as well: **LLVM: Generate optimized code** and **LLVM: Optimize for smaller filesize**.

The remaining options, from **LLVM: Target CPUs with AES** to **LLVM: Target CPUs with XSAVES**, are for CPU features that not every CPU has. They range from features that almost every CPU from the last 25 years has, to features that only recent CPUs have. [CPU feature availability](#cpu-feature-availability) below gives an overview.

> [!IMPORTANT]
> If you tick a CPU feature that the CPU running your program does not have, the program crashes or does not run at all.

When LLVM is on, a "waiting for LLVM compilation" message appears when you build or run your program. For large applications, and for applications with very large individual procedures, compiling with LLVM can take much longer than the standard compiler. A very large application can take several minutes or more to compile, depending on your hardware.

twinBASIC keeps a cache of compiled code, so later builds are usually much faster: code that has not changed is not compiled again. To clear the cache and compile everything on the next build, choose **Flush the LLVM compiler cache** on the [**Tools** menu](../tB/IDE/Project/Menu/Tools).

## Availability

LLVM compilation is not available with the free Community Edition licence, and twinBASIC ignores the LLVM settings there. With a Personal Edition licence, LLVM compiles only the built-in packages. All other paid editions can use LLVM in full. The [FAQ](../FAQ#cost) describes the editions.

## Current limitations

### Operating system support

LLVM does not currently work on Windows 7; Windows 10 or 11 is recommended. Windows 8 and 8.1 have not been tested yet.

### Language support

The main feature not yet supported is passing an error up to the calling procedure. If an error occurs in a procedure that has no error handler, its caller does not receive the error; instead, the program crashes with an unhandled error. A fix is planned.

All other language features should work, in both 32-bit and 64-bit builds. Please [report](../FAQ#bug-reporting) any crash that LLVM causes, and any message saying "a feature used in your code is not yet supported with the LLVM compiler".

## General LLVM options

Besides the project settings, three settings in [IDE Options](../tB/IDE/Project/Menu/Tools) control how LLVM works when it is on:

![Part of the twinBASIC IDE Options dialog, showing three LLVM settings: LLVM Compiler: Maximum number of threads, set to 10; LLVM Compiler: Complex procedure reporting threshold (milliseconds), set to 10000; and LLVM Compiler: Keep cache process alive after exiting the IDE, ticked.](Images/llvmdoc2.jpg)

**LLVM Compiler: Maximum number of threads**
: The number of threads the LLVM compiler can create. More threads can make LLVM compilation faster, but use more memory. If LLVM compilation starts to crash, this value is probably too high, and lowering it should stop the crashes. The default is 1, but newer computers can probably handle 10 or more.

**LLVM Compiler: Complex procedure reporting threshold (milliseconds)**
: A compile time. Every procedure that takes at least this long to compile is listed in the [Debug Console](../tB/IDE/Project/DebugConsole), which shows the procedures you may want to split up to reduce compile time.

**LLVM Compiler: Keep cache process alive after exiting the IDE**
: Keeps the LLVM cache running after you exit the IDE, so that LLVM does not have to do a long full compile again.

## Per-procedure LLVM options

To reduce compile time, or to work around a procedure that LLVM reports problems with, use the [**CompilerOptions**](../tB/Core/Attributes#compileroptions) attribute with an empty string. It turns LLVM off for that procedure and keeps it on for the rest of your code:

```tb
[CompilerOptions("")]
Public Sub DoNotOptimizeMe()
    ' ...
End Sub
```

The same attribute can also turn LLVM on for chosen procedures when it is off in Project Settings. List the flags, separated by commas: `+llvm`, `+optimize` and `+optimizesize`, then `+` and the name of each CPU instruction set to use. Each flag is the direct equivalent of an option in Project Settings:

`+llvm`
: **Enable LLVM Compilation**

`+optimize`
: **LLVM: Generate optimized code**

`+optimizesize`
: **LLVM: Optimize for smaller filesize**

The flags for CPU instruction sets are `+aes`, `+avx`, `+avx2`, `+bmi2`, `+fma`, `+fxsr`, `+rdseed`, `+sha`, `+sse`, `+sse2`, `+sse3`, `+sse4.1`, `+sse4.2` and `+ssse3`.

For example:

```tb
[CompilerOptions("+llvm,+optimize,+optimizesize")]
Function Multiply(A As Long, B As Long) As Long
    Return A * B
End Function

[CompilerOptions("+llvm,+optimize,+optimizesize,+aes,+avx,+avx2,+bmi2,+fma,+fxsr,+rdseed,+sha,+sse,+sse2,+sse3,+sse4.1,+sse4.2,+ssse3")]
Sub FullyOptimizeMe()
    ' ...
End Sub
```

## CPU feature availability

For each CPU feature, the table gives the first Intel and AMD CPUs to offer it, and the year from which all new Intel and AMD CPUs shipped with it. The last column is an estimate: some rare models, such as specialized CPUs for embedded use, may still have lacked the feature.

| Feature  | First available (Intel)   | First available (AMD)   | In all new CPUs from |
|----------|---------------------------|-------------------------|----------------------|
| AES      | 2010 (Westmere)           | 2011 (Bulldozer)        | 2016                 |
| AVX      | 2011 (Sandy Bridge)       | 2011 (Bulldozer)        | 2022                 |
| AVX2     | 2013 (Haswell)            | 2015 (Excavator)        | 2022                 |
| BMI2     | 2013 (Haswell)            | 2015 (Excavator)        | 2022                 |
| FMA      | 2013 (Haswell)            | 2012 (Piledriver)       | 2022                 |
| FXSR     | 1997 (Pentium II)         | 1999 (Athlon)           | 2011; all x64 CPUs   |
| LZCNT    | 2013 (Haswell)            | 2007 (K10/Phenom)       | 2022                 |
| POPCNT   | 2008 (Nehalem)            | 2007 (K10/Phenom)       | 2013                 |
| RDSEED   | 2014 (Broadwell)          | 2017 (Zen)              | 2020                 |
| SHA      | 2016 (Atom)               | 2017 (Zen)              | 2022                 |
| SSE      | 1999 (Pentium III)        | 2001 (Athlon XP)        | 2002; all x64 CPUs   |
| SSE2     | 2000 (Pentium 4)          | 2003 (Athlon 64)        | 2005; all x64 CPUs   |
| SSE3     | 2004 (Pentium 4 Prescott) | 2005 (Athlon 64 Rev. E) | 2006                 |
| SSE4.1   | 2008 (Nehalem)            | 2011 (Bulldozer)        | 2013                 |
| SSE4.2   | 2008 (Nehalem)            | 2011 (Bulldozer)        | 2013                 |
| SSSE3    | 2006 (Core 2)             | 2011 (Bobcat)           | 2013                 |
| XSAVE    | 2009 (Penryn E0/R0)       | 2011 (Bulldozer)        | 2016                 |
| XSAVEC   | 2015 (Skylake)            | 2017 (Zen)              | 2020                 |
| XSAVEOPT | 2011 (Sandy Bridge)       | 2017 (Zen)              | 2017                 |
| XSAVES   | 2015 (Skylake)            | 2017 (Zen)              | 2020                 |

FXSR, SSE and SSE2 are part of the base feature set that every x64 CPU must support, so 64-bit builds always use them when optimization is on.

## Future of LLVM support

This is the first release of LLVM support in twinBASIC, and the groundwork for making much more use of the optimizations and features that LLVM provides. Later releases will restructure parts of the twinBASIC compiler to get the most from LLVM and to improve the performance of your code.
