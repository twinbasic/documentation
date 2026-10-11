---
title: Getting Started with LLVM
parent: LLVM
nav_order: 1
permalink: /LLVM/Getting-Started
---

# Getting Started with LLVM

Covers turning on LLVM compilation for a project or for a single procedure, the options that control it, and its current limitations.

> [!NOTE]
> This page describes twinBASIC BETA 984 and later. Earlier builds have no LLVM settings in Project Settings or IDE Options.

## What is LLVM?

LLVM is an optional part of the compiler that produces code highly optimized for performance and size. Most applications benefit from it; how much depends on the code. LLVM is built into twinBASIC: it does not need a separate LLVM installation, and twinBASIC ignores one if it is present.

During compilation, LLVM translates your code into an *intermediate representation* --- a form between the twinBASIC source and the final machine code. It then reorganizes that representation with a wide variety of techniques, such as removing code that can never run (*dead code elimination*), simplifying loops, rewriting arithmetic to avoid slow operations like division, and inlining functions. Where it applies, LLVM can also make your code use CPU features designed to speed up particular operations.

## LLVM in twinBASIC

You turn LLVM on in [Project Settings](../tB/IDE/Project/Settings). It is off by default while it is experimental. Project Settings has these options for it:

![The Project Settings dialog scrolled to its two compiler option sections, Compiler Options (BUILD) and Compiler Options (DEBUG). Each has the same unticked boxes in two columns: Enable LLVM Compilation, LLVM: Generate optimized code, LLVM: Optimize for smaller filesize, and one LLVM: Target CPUs with box for each of AES, AVX, AVX2, BMI2, FMA, FXSR, LZCNT, POPCNT, RDSEED, SHA, SSE, SSE2, SSE3, SSE4.1, SSE4.2, SSSE3, XSAVE, XSAVEC, XSAVEOPT and XSAVES. Under the BUILD section a note says that software built for a CPU feature will not run on a CPU without it. Under the DEBUG section a bold note says that LLVM compilation in the IDE debug environment is not recommended, because LLVM-compiled code cannot be debugged.](Images/llvmdoc1.png){:width="1102" height="774"}

The same options appear in two sections:

- **Compiler Options (BUILD)** applies when you build the project into an EXE, a DLL or another output file.
- **Compiler Options (DEBUG)** applies when you run the project from the IDE.

> [!NOTE]
> The IDE cannot debug code compiled with LLVM, so turning LLVM on under **Compiler Options (DEBUG)** is not recommended.

**Enable LLVM Compilation** turns LLVM on. With only this box ticked, LLVM runs during compilation and creates the intermediate representation of your code, but does not apply the optimizations for performance and size. You will usually want to tick one or both of the next two options as well: **LLVM: Generate optimized code** and **LLVM: Optimize for smaller filesize**. *Generate optimized code* is for optimizing for speed. This is not mutually exclusive with *Optimize for smaller filesize*, and when both are enabled, LLVM determines if an optimization doesn't provide a significant enough benefit to be worth the size increase.

The remaining options, from **LLVM: Target CPUs with AES** to **LLVM: Target CPUs with XSAVES**, are for CPU features that not every CPU has. They range from features that almost every CPU from the last 25 years has, to features that only recent CPUs have. [CPU feature availability](#cpu-feature-availability) below gives an overview.

> [!IMPORTANT]
> If you tick a CPU feature that the CPU running your program does not have, the program crashes or does not run at all.

When LLVM is on, a progress dialog appears when you build or run your program showing the completion percentage of the build process. For large applications, and for applications with very large individual procedures, compiling with LLVM can take much longer than the standard compiler. A very large application can take several minutes or more to compile, depending on your hardware.

twinBASIC keeps a cache of compiled code, so later builds are usually much faster: code that has not changed is not compiled again. To clear the cache and compile everything on the next build, choose **Flush the LLVM compiler cache** on the [**Tools** menu](../tB/IDE/Project/Menu/Tools).

## Availability

LLVM compilation is not available with the free Community Edition licence, and twinBASIC ignores the LLVM settings there. With a Personal Edition licence, LLVM compiles only the built-in packages. All other paid editions can use LLVM in full. The [FAQ](../FAQ#cost) describes the editions.

## Current limitations

### Operating system support

Building with LLVM does not currently work on Windows 7; Windows 10 or 11 is recommended. Windows 8 and 8.1 have not been tested yet. The limit applies only to the computer that builds the program: a program built with LLVM runs on Windows 7.

### Language support

The main feature not yet supported is passing an error up to the calling procedure. A fix is planned.

> [!WARNING]
> In twinBASIC BETA 1005, an error that occurs in a procedure with no error handler is not passed to its caller when either of the two procedures is compiled with LLVM: the caller's own `On Error` statement does not catch it. A run in the IDE ends without a message. A built program stops as it does for an unhandled error when only the caller is compiled with LLVM. When the procedure that has no handler is compiled with LLVM, the program shows a box that names the procedure but no error, and then ends with an access violation. Without LLVM, and in VB6, the caller's handler catches the error.

> [!NOTE]
> In twinBASIC BETA 1005, an error handler in a procedure compiled with LLVM cannot read an error raised with [**Err.Raise**](../tB/Modules/ErrObject/Raise) in that procedure: **Err.Number** returns -353703423 (`&HEAEAEA01`), **Err.Source** is empty, and **Err.Description** is the generic "Application-defined or object-defined error". An error that a statement causes, such as a division by zero, is read correctly.

> [!WARNING]
> In twinBASIC BETA 1005, a **Double** addition, subtraction, multiplication or exponentiation (`^`) that overflows raises no error in code compiled with LLVM: the result is infinity (`1.#INF`), where the same code compiled without LLVM raises error 6, *Overflow*, as VB6 does. [**FloatingPointErrorChecks(True)**](../tB/Core/Attributes#floatingpointerrorchecks) does not change this. A **Double** division that overflows, and a division by zero, still raise their errors. After either, under `On Error Resume Next`, the variable that was to receive the result keeps its old value; without LLVM it holds infinity.

> [!WARNING]
> In twinBASIC BETA 1005, code compiled with LLVM rounds a **Single** or **Double** that is exactly halfway between two integers away from zero when it converts the value to an integer type: in [**CLng**](../tB/Modules/Conversion/CLng), **CInt** and **CLngLng** of a variable, in an assignment to an **Integer** or **Long**, and in the operands of [**\\**](../tB/Core/IntegerDivide). With a **Double** variable holding 2.5, `CLng(x)` is 3, and with -0.5 it is -1. Without LLVM the value is rounded to the even integer, 2 and 0, as VB6 does. A constant expression such as `CLng(2.5)`, a **Variant** argument, and [**Round**](../tB/Modules/Math/Round), **Int** and **Fix** are not affected.

Code compiled with LLVM ignores [**Debug.Assert**](../tB/Modules/Debug#assert): the statement does not stop, and its condition is not evaluated.

All other language features should work, in both 32-bit and 64-bit builds. Please [report](../FAQ#bug-reporting) any crash that LLVM causes, and any message saying "a feature used in your code is not yet supported with the LLVM compiler".

## General LLVM options

Besides the project settings, three settings in [IDE Options](../tB/IDE/Project/Menu/Tools) control how LLVM works when it is on:

![Part of the twinBASIC IDE Options dialog, showing three LLVM settings: LLVM Compiler: Maximum number of threads, set to its default of 1; LLVM Compiler: Complex procedure reporting threshold (milliseconds), set to 10000; and LLVM Compiler: Keep cache process alive after exiting the IDE, ticked.](Images/llvmdoc2.png){:width="628" height="187"}

**LLVM Compiler: Maximum number of threads**
: The number of threads the LLVM compiler can create. More threads can make LLVM compilation faster, but use more memory. If LLVM compilation starts to crash, this value is probably too high, and lowering it should stop the crashes. The default is 1, but newer computers can probably handle 10 or more.

**LLVM Compiler: Complex procedure reporting threshold (milliseconds)**
: A compile time. Every procedure that takes at least this long to compile is listed in the [Debug Console](../tB/IDE/Project/DebugConsole), which shows the procedures you may want to split up to reduce compile time. The default is 10000 milliseconds, which is 10 seconds.

**LLVM Compiler: Keep cache process alive after exiting the IDE**
: Keeps the LLVM cache running after you exit the IDE, so that LLVM does not have to do a long full compile again. It is on by default.

## Per-procedure LLVM options

To reduce compile time, or to work around a procedure that LLVM reports problems with, use the [**CompilerOptions**](../tB/Core/Attributes#compileroptions) attribute with an empty string. It turns LLVM off for that procedure and keeps it on for the rest of your code:

```tb check_build
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

The flags for CPU instruction sets, one for each **LLVM: Target CPUs with** box, are `+aes`, `+avx`, `+avx2`, `+bmi2`, `+fma`, `+fxsr`, `+lzcnt`, `+popcnt`, `+rdseed`, `+sha`, `+sse`, `+sse2`, `+sse3`, `+sse4.1`, `+sse4.2`, `+ssse3`, `+xsave`, `+xsavec`, `+xsaveopt` and `+xsaves`.

For example:

```tb check_build
[CompilerOptions("+llvm,+optimize,+optimizesize")]
Function Multiply(A As Long, B As Long) As Long
    Return A * B
End Function

[CompilerOptions("+llvm,+optimize,+optimizesize,+aes,+avx,+avx2,+bmi2,+fma,+fxsr,+lzcnt,+popcnt,+rdseed,+sha,+sse,+sse2,+sse3,+sse4.1,+sse4.2,+ssse3,+xsave,+xsavec,+xsaveopt,+xsaves")]
Sub FullyOptimizeMe()
    ' ...
End Sub
```

## Unrolling a loop

Inside a procedure compiled with LLVM, [**UnrollLoop**](../tB/Modules/Compilation/UnrollLoop) asks LLVM to unroll one loop: to repeat its body several times in each iteration, so the loop tests its condition and jumps back less often. It must be the first statement in the loop's body, and may give the greatest number of repeats as a literal or a constant. It does not change what the loop does.

```tb check_build
Function Total(Values() As Long) As Long
    Dim i As Long
    For i = LBound(Values) To UBound(Values)
        UnrollLoop 8
        Total += Values(i)
    Next
End Function
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
| SSE4.1   | 2007 (Penryn)             | 2011 (Bulldozer)        | 2013                 |
| SSE4.2   | 2008 (Nehalem)            | 2011 (Bulldozer)        | 2013                 |
| SSSE3    | 2006 (Core 2)             | 2011 (Bobcat)           | 2013                 |
| XSAVE    | 2009 (Penryn E0/R0)       | 2011 (Bulldozer)        | 2016                 |
| XSAVEC   | 2015 (Skylake)            | 2017 (Zen)              | 2020                 |
| XSAVEOPT | 2011 (Sandy Bridge)       | 2017 (Zen)              | 2017                 |
| XSAVES   | 2015 (Skylake)            | 2017 (Zen)              | 2020                 |

FXSR, SSE and SSE2 are part of the base feature set that every x64 CPU must support, so 64-bit builds always use them when optimization is on.

## Future of LLVM support

This is the first release of LLVM support in twinBASIC, and the groundwork for making much more use of the optimizations and features that LLVM provides. Later releases will restructure parts of the twinBASIC compiler to get the most from LLVM and to improve the performance of your code.
