---
title: PwGenCryptoSource
parent: tsPwGen Package
permalink: /tB/Packages/Contributed/tsPwGen/PwGenCryptoSource
has_toc: false
---

# PwGenCryptoSource class
{: .no_toc }

A **PwGenCryptoSource** is the random source that the package uses when a recipe's [**RandomSource**](PwGenOptions#randomsource) is **Nothing**. It implements [**PwGenRandom**](PwGenRandom) with the random numbers of the Windows Cryptography API: Next Generation (CNG).

<!-- test: CryptoSourceTests.NewPwGenCryptoSource_CanBeCreatedWithNew, CryptoSourceTests.NextInRange_ReturnsANumberOfTheInterval, CryptoSourceTests.NextInRange_EqualBounds_ReturnsThatNumber -->
The class has no public member of its own. Its one method, **NextInRange**, is **Private** and is reached through a variable of the type **PwGenRandom**. The package's own description of the class calls it internal. It is declared without **Private**, and has neither a **Private** constructor nor `[COMCreatable(False)]`, so a project can create one with **New**.

```tb check_build check_run
Dim src As PwGenRandom = New PwGenCryptoSource
PwGenError.Clear
Dim n As Long = src.NextInRange(1, 6)
Debug.Print n >= 1 And n <= 6          ' True
Debug.Print src.NextInRange(3, 3)      ' 3
```
<!-- /test -->

<!-- test: compile PrivateNextInRange -->
A variable declared with the class itself cannot call the method, because it is **Private**. The compiler reports TB5027, *Unrecognized member 'NextInRange'*:

```tb check_build expect-error=TB5027
Dim s As New PwGenCryptoSource
Debug.Print s.NextInRange(1, 6)
```
<!-- /test -->

## How the numbers are produced

The source asks Windows for random bytes with **BCryptGenRandom** from `bcrypt.dll`. It passes no algorithm handle and the flag `BCRYPT_USE_SYSTEM_PREFERRED_RNG`, so the generator is the one that Windows prefers for the system. The package's source comments call the source cryptographically secure. The strength is that of this Windows generator, and the package adds no random numbers of its own.

For each number the source works as follows:

1. It asks for four random bytes and reads them as an unsigned 32-bit number *r*, from 0 to 4294967295.
2. It computes the size of the interval, *s* = *upperBound* - *lowerBound* + 1, and the largest multiple of *s* that is not above 2^32, called the limit.
3. If *r* is not below the limit, it discards *r* and asks for four new bytes. The discarded numbers are the reason that every number of the interval is equally likely: a plain remainder of *r* divided by *s* would favour the small numbers when *s* does not divide 2^32.
4. Otherwise it returns *lowerBound* + (*r* mod *s*).

The class keeps no state. The package creates one instance when it first needs it and shares it.

## Errors

<!-- test: CryptoSourceTests.NextInRange_ReversedBounds_InvalidRange, CryptoSourceTests.NextInRange_ReversedBounds_RaisesNoRunTimeError -->
The source raises no run-time error. It reports a problem through the last error of the package, [**PwGenError**](PwGenError), and returns 0:

- `InvalidRange`, with the message *lowerBound is greater than upperBound*, when the bounds are reversed. The origin is an empty string.
- `RngFailed`, with the message *BCryptGenRandom failed*, when the Windows function does not return success. The origin is an empty string. When [**PwGen.Generate**](PwGen#generate) calls the source, it replaces the origin with its own, such as `PwGen.Generate`.

```tb check_build check_run
Dim src As PwGenRandom = New PwGenCryptoSource
PwGenError.Clear
Debug.Print src.NextInRange(5, 1)     ' 0
Debug.Print PwGenError.Code           ' InvalidRange
Debug.Print PwGenError.Origin = ""    ' True
```
<!-- /test -->

<!-- test: CryptoSourceTests.NextInRange_AfterAnEarlierFailure_StillReturnsANumberOfTheInterval, CryptoSourceTests.NextInRange_AfterClear_ReturnsANumberOfTheInterval, CryptoSourceTests.PwGenFunctions_AreNotAffectedByAnEarlierFailure -->
> [!WARNING] 1.0.8.0
> **NextInRange** does not clear the last error before it starts, and it returns 0 whenever the last error is already set. It raises no error and sets no error of its own, so a direct call made after any earlier failure of the package returns 0 even when the bounds do not include 0, and the last error still belongs to the earlier failure. Call [**PwGenError.Clear**](PwGenError#clear) first. The functions of [**PwGen**](PwGen) do this themselves, so a recipe is not affected.
>
> ```tb check_build check_run
> Dim src As PwGenRandom = New PwGenCryptoSource
> Dim o As PwGenOptions = PwGenOptions.Alphanumeric
> o.Length = 0
> PwGen.Generate o
> Debug.Print PwGenError.Code         ' InvalidLength
> Debug.Print src.NextInRange(1, 6)   ' 0
> Debug.Print PwGenError.Code         ' InvalidLength
>
> PwGenError.Clear
> Dim n As Long = src.NextInRange(1, 6)
> Debug.Print n >= 1 And n <= 6       ' True
> ```

## Methods

### NextInRange
{: .no_toc }

Returns a whole number between two bounds, both included.

Syntax: *source*.**NextInRange** ( *lowerBound*, *upperBound* ) **As Long**

The method is **Private**: it is called through a **PwGenRandom** variable, as [**PwGenRandom.NextInRange**](PwGenRandom#nextinrange) describes. The two parameters are **Long** values; *lowerBound* must not be above *upperBound*.

<!-- test: CryptoSourceTests.NextInRange_NegativeAndLargeBounds_StayInTheInterval -->
Returns the number, or 0 after `InvalidRange` or `RngFailed`. The bounds can be any two **Long** values, in the right order.
<!-- /test -->

## See Also

- [PwGenRandom](PwGenRandom) interface -- the interface the class implements
- [PwGenOptions](PwGenOptions#randomsource) class -- the **RandomSource** property
- [PwGenError](PwGenError) class -- reports `InvalidRange` and `RngFailed`
- [tsPwGen Package](.) -- the package
