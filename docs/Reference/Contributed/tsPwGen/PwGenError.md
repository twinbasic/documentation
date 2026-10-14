---
title: PwGenError
parent: tsPwGen Package
permalink: /tB/Packages/Contributed/tsPwGen/PwGenError
has_toc: false
---

# PwGenError class
{: .no_toc }

The **PwGenError** object reports the last error of the package: whether there is one, its code, its message and the function that found it.

**PwGenError** is a predeclared object. It is used by its name, without a variable. The error itself is stored in the package, not in the object, and the package keeps a single last error, so an object created with **New** reports the same error as the predeclared object. There is no member that sets it.

The functions of [**PwGen**](PwGen) do not raise run-time errors. A function that fails returns an empty string, or 0, and sets the last error. Each function of **PwGen** clears the last error when it starts, so the last error belongs to the latest call. To keep an error across the next call, copy it with [**Snapshot**](#snapshot).

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.Length = 0
Dim pw As String = PwGen.Generate(o)

Debug.Print pw = ""                 ' True
Debug.Print PwGenError.HasError     ' True
Debug.Print PwGenError.Code         ' InvalidLength
Debug.Print PwGenError.Message      ' Length must be between 1 and 4096.
Debug.Print PwGenError.Origin       ' PwGen.Generate
Debug.Print PwGenError.ToString()   ' PwGen.Generate: InvalidLength - Length must be between 1 and 4096.
```

* TOC
{:toc}

## Error codes

The code is a **String** that names the error. It is case-sensitive. These are the codes that [**PwGen**](PwGen) and [**PwGenCryptoSource**](PwGenCryptoSource) set, with the message that goes with each. A code with two messages is set in two situations.

| Code | Message | Set when |
|:-----|:--------|:---------|
| `InvalidMode` | Mode is not a known ePwGenMode member. | [**Mode**](PwGenOptions#mode) is neither **pgmRandom** nor **pgmWordlist**. |
| `InvalidLength` | Length must be between 1 and 4096. | In random mode, [**Length**](PwGenOptions#length) is below 1 or above [**PWGEN_MAX_LENGTH**](PwGen#pwgen_max_length). |
| `InvalidMinPerClass` | MinPerClass must be >= 0. | In random mode, [**MinPerClass**](PwGenOptions#minperclass) is negative. |
| `NoCharset` | no character class is enabled and Alphabet is empty. | In random mode, the four class properties are **False** and [**Alphabet**](PwGenOptions#alphabet) is empty. |
| `EmptyClass` | an enabled class is empty after exclusions. | An enabled class has no character left after [**ExcludeChars**](PwGenOptions#excludechars) and [**AmbiguousChars**](PwGenOptions#ambiguouschars) are applied, or its characters are an empty [**SpecialChars**](PwGenOptions#specialchars). |
| `LengthTooShort` | Length is smaller than MinPerClass times the number of enabled classes. | [**Length**](PwGenOptions#length) is below [**MinPerClass**](PwGenOptions#minperclass) times the number of enabled classes. |
| | Length is too small for MinPerClass and StartsWithLetter. | While a password is drawn, no free position is left for a character of a class, for example when the first letter came from [**IncludeChars**](PwGenOptions#includechars) and so counts for no class. [**Entropy**](PwGen#entropy) does not find this. |
| `CannotStartWithLetter` | the pool has no ASCII letter for StartsWithLetter. | [**StartsWithLetter**](PwGenOptions#startswithletter) is **True** and the pool has no letter from `A` to `Z` or `a` to `z`. |
| `CannotAvoidRepeats` | HasNoConsecutiveRepeats needs at least two distinct characters. | [**HasNoConsecutiveRepeats**](PwGenOptions#hasnoconsecutiverepeats) is **True**, [**Length**](PwGenOptions#length) is above 1 and the pool has one character. |
| | could not place characters without consecutive repeats. | After 48 shuffles the drawn characters still have two equal neighbours. [**Entropy**](PwGen#entropy) does not find this. |
| `RngFailed` | random source returned a value outside the requested interval. | A [**PwGenRandom**](PwGenRandom) source returned a number outside the bounds it was given. |
| | BCryptGenRandom failed. | The Windows function failed, in [**PwGenCryptoSource**](PwGenCryptoSource). |
| `InvalidRange` | lowerBound is greater than upperBound. | [**NextInRange**](PwGenRandom#nextinrange) of the package's own source is called with the bounds reversed. The package never does this. |
| `InvalidWordCount` | WordCount must be between 1 and 256. | In wordlist mode, [**WordCount**](PwGenOptions#wordcount) is below 1 or above [**PWGEN_MAX_WORD_COUNT**](PwGen#pwgen_max_word_count). |
| `EmptyWord` | CustomWords contains an empty string. | A word of [**CustomWords**](PwGenOptions#customwords) is an empty string. |
| `DuplicateWord` | CustomWords contains a duplicate word. | Two words of [**CustomWords**](PwGenOptions#customwords) are equal, compared by character code. |
| `NotEnoughWords` | WordCount is larger than the word list. | [**HasUniqueWords**](PwGenOptions#hasuniquewords) is **True** and [**WordCount**](PwGenOptions#wordcount) is above the number of words in the list. |
| `InvalidWordlist` | Wordlist is not a known built-in list. | [**Wordlist**](PwGenOptions#wordlist), or the list passed to [**BuiltInWord**](PwGen#builtinword) or [**BuiltInWordCount**](PwGen#builtinwordcount), is not a member of **ePwGenWordlist**. |
| `IndexOutOfRange` | word index is outside the list. | The index passed to [**BuiltInWord**](PwGen#builtinword) is negative or not below the number of words. |

A recipe with several faults sets one error, the first fault that the package finds. In random mode the properties of wordlist mode are not checked, and the other way round.

> [!NOTE] 1.0.8.0
> The package declares two more codes, `EmptyCharset` and `EmptyWordlist`. No recipe sets them: the package's own tests list them as having no trigger, together with `InvalidRange`, which only a direct call of the default random source can set.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.Length = 2
PwGen.Generate o
Debug.Print PwGenError.Code        ' LengthTooShort

Set o = PwGenOptions.Pin
o.StartsWithLetter = True
PwGen.Generate o
Debug.Print PwGenError.Code        ' CannotStartWithLetter

Set o = PwGenOptions.Passphrase
o.WordCount = 257
PwGen.Entropy o
Debug.Print PwGenError.Code        ' InvalidWordCount
Debug.Print PwGenError.Origin      ' PwGen.Entropy
```

## Properties

### Code
{: .no_toc }

The code of the last error. A **String**, read-only.

Syntax: *text* **=** **PwGenError.Code**

Returns the code, such as `InvalidLength`, or an empty string when there is no error. The codes are listed under [Error codes](#error-codes).

### HasError
{: .no_toc }

Whether there is a last error. A **Boolean**, read-only.

Syntax: *flag* **=** **PwGenError.HasError**

Returns **True** after a function of [**PwGen**](PwGen) has failed, and **False** after one has succeeded, because each function clears the last error when it starts. It is also **False** after [**Clear**](#clear).

### Message
{: .no_toc }

The message of the last error. A **String**, read-only.

Syntax: *text* **=** **PwGenError.Message**

Returns the message in English, such as `Length must be between 1 and 4096.`, or an empty string when there is no error. The [Error codes](#error-codes) table gives the message of each code.

### Origin
{: .no_toc }

The function that found the last error. A **String**, read-only.

Syntax: *text* **=** **PwGenError.Origin**

Returns the name of the module and of the public function, such as `PwGen.Generate`, or an empty string when there is no error. A call to [**TryGenerate**](PwGen#trygenerate) gives `PwGen.Generate`, because it calls **Generate**. The origin of an error set by a direct call to the package's random source is an empty string.

## Methods

### Clear
{: .no_toc }

Clears the last error.

Syntax: **PwGenError.Clear**

After the call, [**HasError**](#haserror) is **False** and [**Code**](#code), [**Message**](#message) and [**Origin**](#origin) are empty strings. The functions of [**PwGen**](PwGen) call it themselves when they start, so a program needs it only to discard an error that it has read.

### Snapshot
{: .no_toc }

Returns a copy of the last error.

Syntax: *snap* **=** **PwGenError.Snapshot** ( ) **As** [**tPwGenError**](#tpwgenerror)

Returns a [**tPwGenError**](#tpwgenerror) with the values of **HasError**, **Code**, **Message** and **Origin** at the time of the call. The copy belongs to the caller: the next call of a **PwGen** function, which clears the last error, does not change it.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.Length = 0
PwGen.Generate o
Dim snap As PwGenError.tPwGenError = PwGenError.Snapshot()

PwGen.Generate                       ' succeeds, and clears the last error
Debug.Print PwGenError.HasError      ' False
Debug.Print snap.HasError            ' True
Debug.Print snap.Code                ' InvalidLength
Debug.Print snap.Origin              ' PwGen.Generate
```

The type is declared inside the class. A variable of that type can be declared `As PwGenError.tPwGenError` or, as the package's own tests do, `As tPwGenError`.


### ToString
{: .no_toc }

Returns the last error as one line of text.

Syntax: *text* **=** **PwGenError.ToString** ( ) **As String**

Returns an empty string when there is no error. Otherwise returns **Origin**, a colon and a space, **Code**, a space, a hyphen, a space and **Message**, as in `PwGen.Generate: InvalidLength - Length must be between 1 and 4096.`. The text is meant for logs and for **Debug.Print**.

## Types

### tPwGenError
{: .no_toc }

A copy of the last error, returned by [**Snapshot**](#snapshot). A user-defined type, declared inside the class.

| Field | Type | Content |
|:------|:-----|:--------|
| **HasError** | **Boolean** | Whether there was an error. |
| **Code** | **String** | The code, or an empty string. |
| **Message** | **String** | The message, or an empty string. |
| **Origin** | **String** | The origin, or an empty string. |

The fields are separate values. Unlike the properties of **PwGenError**, they do not change when the last error changes.

## See Also

- [PwGen](PwGen) module -- the functions whose errors it reports
- [PwGenOptions](PwGenOptions) class -- the recipe whose settings the codes refer to
- [PwGenCryptoSource](PwGenCryptoSource) class -- the default random source, which sets `RngFailed` and `InvalidRange`
- [tsPwGen Package](.) -- the package
