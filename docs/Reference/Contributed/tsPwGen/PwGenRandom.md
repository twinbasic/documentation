---
title: PwGenRandom
parent: tsPwGen Package
permalink: /tB/Packages/Contributed/tsPwGen/PwGenRandom
has_toc: false
---

# PwGenRandom interface
{: .no_toc }

A **PwGenRandom** object supplies the random numbers that [**PwGen**](PwGen) uses to draw characters and words. The interface has one method, [**NextInRange**](#nextinrange), which returns a whole number between two bounds.

A recipe names its source in [**RandomSource**](PwGenOptions#randomsource). When the property is **Nothing**, the package uses [**PwGenCryptoSource**](PwGenCryptoSource). A class of the program that implements **PwGenRandom** can replace it, for example to make a result predictable in a test. The class below always returns the lower bound:

```tb check_build projname=pwgenrandom-lowest slot=file
Class LowestRandom
    Implements PwGenRandom

    Private Function NextInRange(ByVal lowerBound As Long, ByVal upperBound As Long) As Long Implements PwGenRandom.NextInRange
        Return lowerBound
    End Function
End Class
```

Every draw then picks the first character of the pool, or the first word that is left:

```tb check_run projname=pwgenrandom-lowest
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.Alphabet = "QR"
o.Length = 5
Set o.RandomSource = New LowestRandom
Debug.Print PwGen.Generate(o)          ' QQQQQ

Dim words(0 To 3) As String
words(0) = "alpha"
words(1) = "bravo"
words(2) = "charlie"
words(3) = "delta"
Dim p As PwGenOptions = PwGenOptions.Passphrase
p.CustomWords = words
p.WordCount = 4
Set p.RandomSource = New LowestRandom

Debug.Print PwGen.Generate(p)          ' alpha-alpha-alpha-alpha
p.HasUniqueWords = True
Debug.Print PwGen.Generate(p)          ' alpha-delta-charlie-bravo
```

With **HasUniqueWords**, the word that was drawn is replaced by the last word that is left, so the second draw returns `delta`, the third `charlie`, and the fourth is the only word left, `bravo`.

## The contract of a source

- **The bounds.** [**NextInRange**](#nextinrange) must return a **Long** that is not below the lower bound and not above the upper bound. The package passes a lower bound of 0 or 1, never a lower bound that is above the upper bound, and equal bounds when there is only one choice, as for a pool of one character.
- **A number outside the bounds is an error.** [**Generate**](PwGen#generate) then returns an empty string and sets the error `RngFailed`, with the message *random source returned a value outside the requested interval*.
- **Evenness.** The package takes each call as an independent, even choice among the whole numbers of the interval. The entropy that [**PwGen.Entropy**](PwGen#entropy) reports is correct only for a source that is even and independent. For any other source the figure is too high.
- **Errors raised inside a source.** The package has no error handler around the call, so a run-time error that a source raises reaches the caller of **Generate** with the number and the source the source gave it, and the last error of the package is not set. The caller handles it with [**On Error**](../../../Core/On-Error). The result variable keeps the value it had.

```tb check_build projname=pwgenrandom-lowest slot=file
Class OutOfRangeRandom
    Implements PwGenRandom

    Private Function NextInRange(ByVal lowerBound As Long, ByVal upperBound As Long) As Long Implements PwGenRandom.NextInRange
        Return upperBound + 1
    End Function
End Class
```

```tb check_run projname=pwgenrandom-lowest
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
Set o.RandomSource = New OutOfRangeRandom
Debug.Print PwGen.Generate(o) = ""        ' True
Debug.Print PwGenError.Code               ' RngFailed
```

A source that raises an error:

```tb check_build projname=pwgenrandom-lowest slot=file
Class RaisingRandom
    Implements PwGenRandom

    Private Function NextInRange(ByVal lowerBound As Long, ByVal upperBound As Long) As Long Implements PwGenRandom.NextInRange
        Err.Raise 5, "RaisingRandom", "no random numbers"
    End Function
End Class
```

```tb check_run projname=pwgenrandom-lowest
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
Set o.RandomSource = New RaisingRandom
Dim pw As String = "unchanged"

On Error Resume Next
pw = PwGen.Generate(o)
Debug.Print Err.Number              ' 5
Debug.Print Err.Source              ' RaisingRandom
Debug.Print pw                      ' unchanged
On Error GoTo 0

Debug.Print PwGenError.HasError     ' False
```

## Methods

### NextInRange
{: .no_toc }

Returns a whole number between two bounds, both included.

Syntax: *source*.**NextInRange** ( *lowerBound*, *upperBound* ) **As Long**

*lowerBound*
: *required* A **Long**, the smallest number that may be returned.

*upperBound*
: *required* A **Long**, the largest number that may be returned. It is not below *lowerBound*.

Returns a **Long** *n* with `lowerBound <= n <= upperBound`. The numbers should be equally likely and independent of one another. [**PwGenCryptoSource**](PwGenCryptoSource) implements the method with the Windows CNG generator.

A class implements the method with a **Private** function whose declaration names the interface member, as the classes above do.

## See Also

- [PwGenCryptoSource](PwGenCryptoSource) class -- the default source, which uses the Windows CNG generator
- [PwGenOptions](PwGenOptions#randomsource) class -- the **RandomSource** property
- [Interface](../../../Core/Interface) statement -- declares an interface
- [Implements](../../../Core/Implements) statement -- implements an interface in a class
- [tsPwGen Package](.) -- the package
