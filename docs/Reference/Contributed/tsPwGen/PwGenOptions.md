---
title: PwGenOptions
parent: tsPwGen Package
permalink: /tB/Packages/Contributed/tsPwGen/PwGenOptions
has_toc: false
---

# PwGenOptions class
{: .no_toc }

A **PwGenOptions** object is a recipe for [**PwGen.Generate**](PwGen#generate) and [**PwGen.Entropy**](PwGen#entropy): the mode, the characters or words to draw from, the constraints on the result, and the random source.

A recipe is created from a preset. The predeclared object **PwGenOptions**, written without a variable, is a factory: its five preset properties, [**Alphanumeric**](#alphanumeric), [**Complex**](#complex), [**Hex**](#hex), [**Passphrase**](#passphrase) and [**Pin**](#pin), each return a new recipe with every property set, and [**Clone**](#clone) copies one.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Complex
o.Length = 20
o.StartsWithLetter = True

Dim pw As String = PwGen.Generate(o)
Debug.Print Len(pw)                          ' 20
Debug.Print Left$(pw, 1) Like "[A-Za-z]"     ' True
```

A property of a recipe checks nothing when it is set. A value that cannot be used, such as a **Length** of 0, is found when the recipe is passed to **Generate** or **Entropy**, and is reported there as an error code.

> [!IMPORTANT] timeless
> Assigning a property on the predeclared object itself raises run-time error 5, *Invalid procedure call or argument*, with the source `PwGenOptions` and the message *PwGenOptions (default instance) is a factory. Use Alphanumeric, Complex, Passphrase, Pin, or Hex.* Create a recipe first and assign the properties of that.
>
> ```tb check_build check_run
> On Error Resume Next
> PwGenOptions.Length = 20
> Debug.Print Err.Number    ' 5
> Debug.Print Err.Source    ' PwGenOptions
> ```
>
> Reading a property of the predeclared object does not raise an error. It returns the empty value of the type, 0, **False** or an empty string, and not the default of the property.
>
> ```tb check_build check_run
> Debug.Print PwGenOptions.Length                      ' 0
> Debug.Print PwGenOptions.HasUpperCase                ' False
> Debug.Print "[" & PwGenOptions.WordSeparator & "]"   ' []
> ```

> [!NOTE] BETA 1005
> The class declares a **Private** constructor and the attribute `[COMCreatable(False)]`, so that only its presets create recipes. twinBASIC does not enforce a **Private** constructor, and a project that references the package can still create an object with **New**. It is a recipe in which every property has the empty value of its type: **Length** 0, no class enabled, empty strings, **MinPerClass** 0, **Mode** **pgmRandom** and **RandomSource** **Nothing**. **Generate** returns an empty string for it, with the error `InvalidLength`, until the properties are set. The presets are the way to get the defaults.
>
> ```tb check_build check_run
> Dim o As PwGenOptions = New PwGenOptions
> Debug.Print PwGen.Generate(o) = ""    ' True
> Debug.Print PwGenError.Code           ' InvalidLength
>
> o.Length = 6
> o.HasDigits = True
> Debug.Print Len(PwGen.Generate(o))    ' 6
> Debug.Print o.MinPerClass             ' 0
> ```

* TOC
{:toc}

## Random mode

In random mode ([**Mode**](#mode) is **pgmRandom**, the default) the result is a string of [**Length**](#length) characters, each drawn from a pool. The properties of this section apply only in this mode. In wordlist mode they are not read.

**The pool.** If [**Alphabet**](#alphabet) is not empty, the pool is the different characters of the **Alphabet**, and the settings for classes below have no effect. Otherwise the pool is built from classes:

1. A class is enabled by [**HasUpperCase**](#hasuppercase) (`A` to `Z`), [**HasLowerCase**](#haslowercase) (`a` to `z`), [**HasDigits**](#hasdigits) (`0` to `9`) and [**HasSpecialChars**](#hasspecialchars) (the characters of [**SpecialChars**](#specialchars)). With no class enabled and an empty **Alphabet**, the error is `NoCharset`.
2. Each enabled class loses the characters of [**ExcludeChars**](#excludechars) and, when [**IsAmbiguousExcluded**](#isambiguousexcluded) is **True**, the characters of [**AmbiguousChars**](#ambiguouschars). A class with no character left is an `EmptyClass` error.
3. The pool is all the enabled classes together with the characters of [**IncludeChars**](#includechars), after the same removals, each different character once.

Characters are compared by their character codes, so `a` and `A` are different characters. Each character is one UTF-16 code unit, so a character outside the Basic Multilingual Plane, which is written as two code units, counts as two characters of the pool, and a password can contain one half of it alone:

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.Alphabet = ChrW(&HD83D) & ChrW(&HDE00)   ' U+1F600 as a surrogate pair
o.Length = 1
Debug.Print CLng(2 ^ (PwGen.Entropy(o) / o.Length))   ' 2
Dim pw As String = PwGen.Generate(o)
Debug.Print Len(pw)                                    ' 1
Debug.Print AscW(pw) = AscW(ChrW(&HD83D)) Or AscW(pw) = AscW(ChrW(&HDE00))   ' True
```

**The draw.** The result is built in these steps:

1. When [**StartsWithLetter**](#startswithletter) is **True**, the first character is drawn from the letters `A` to `Z` and `a` to `z` that are in the pool.
2. For each enabled class, [**MinPerClass**](#minperclass) characters are drawn from that class and placed at random free positions. The first character, when it was drawn for **StartsWithLetter**, counts for each class it belongs to. The characters of **IncludeChars** belong to no class.
3. Every position that is still free is filled with a character drawn from the whole pool.
4. The characters are shuffled with the Fisher-Yates method. When **StartsWithLetter** is **True**, the first character stays where it is.
5. When [**HasNoConsecutiveRepeats**](#hasnoconsecutiverepeats) is **True** and two equal characters are next to each other, the characters are shuffled again, up to 48 times.

Each draw is one call to the recipe's [**RandomSource**](#randomsource). The constraints change how likely the results are: a password that must contain a digit is not a uniform choice among all strings of the pool. The entropy that [**PwGen.Entropy**](PwGen#entropy) reports ignores this.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
Debug.Print CLng(2 ^ (PwGen.Entropy(o) / o.Length))   ' 57

o.IncludeChars = "!"             ' adds a character to the pool
Debug.Print CLng(2 ^ (PwGen.Entropy(o) / o.Length))   ' 58

o.ExcludeChars = "!A"            ' removes A from its class and ! from the added characters
Debug.Print CLng(2 ^ (PwGen.Entropy(o) / o.Length))   ' 56

o.ExcludeChars = ""
o.IncludeChars = "0"             ' 0 is one of the ambiguous characters, so it is removed
Debug.Print CLng(2 ^ (PwGen.Entropy(o) / o.Length))   ' 57
```

## Wordlist mode

In wordlist mode ([**Mode**](#mode) is **pgmWordlist**) the result is a passphrase of [**WordCount**](#wordcount) words, each drawn from a list and joined with [**WordSeparator**](#wordseparator). The properties of random mode are not read.

The list is the array in [**CustomWords**](#customwords) when it has words, otherwise the built-in list that [**Wordlist**](#wordlist) names. When [**HasUniqueWords**](#hasuniquewords) is **False**, each word is drawn from the whole list, so a word can appear more than once. When it is **True**, a word that was drawn is taken out of the list before the next draw. When [**Capitalize**](#capitalize) is **True**, the first character of each word is changed to uppercase.

Each draw is one call to the recipe's [**RandomSource**](#randomsource). The bounds are 0 and *n* - 1, where *n* is the number of words that can still be drawn: the whole list, or, with **HasUniqueWords**, the words that are left.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Passphrase
Dim words(0 To 0) As String
words(0) = "tango"
o.CustomWords = words
o.WordCount = 3
o.WordSeparator = "+"
o.Capitalize = True
Debug.Print PwGen.Generate(o)      ' Tango+Tango+Tango
Debug.Print PwGen.Entropy(o)       ' 0
```

The list has one word, so every draw returns it and the entropy is 0.

## Properties

### Alphabet
{: .no_toc }

The complete pool of characters for random mode. A **String**, read/write. Default: an empty string.

Syntax: *options*.**Alphabet** [ **=** *value* ]

When the value is not empty, it is the whole pool. [**HasUpperCase**](#hasuppercase), [**HasLowerCase**](#haslowercase), [**HasDigits**](#hasdigits), [**HasSpecialChars**](#hasspecialchars), [**SpecialChars**](#specialchars), [**IncludeChars**](#includechars), [**ExcludeChars**](#excludechars), [**IsAmbiguousExcluded**](#isambiguousexcluded), [**AmbiguousChars**](#ambiguouschars) and [**MinPerClass**](#minperclass) then have no effect. [**StartsWithLetter**](#startswithletter) and [**HasNoConsecutiveRepeats**](#hasnoconsecutiverepeats) still apply, to this pool. A character that appears more than once counts once, so `aabbcc` is a pool of three characters. The [**Hex**](#hex) preset sets this property to [**PWGEN_ALPHABET_HEX**](PwGen#pwgen_alphabet_hex).

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.Alphabet = "ABC"
o.Length = 12
Dim pw As String = PwGen.Generate(o)
Debug.Print Len(pw)                 ' 12
Debug.Print pw Like "*[!ABC]*"      ' False
```

### AmbiguousChars
{: .no_toc }

The characters that [**IsAmbiguousExcluded**](#isambiguousexcluded) removes. A **String**, read/write. Default: `0O1lI`, the value of [**PWGEN_DEFAULT_AMBIGUOUS_CHARS**](PwGen#pwgen_default_ambiguous_chars).

Syntax: *options*.**AmbiguousChars** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set, or when **IsAmbiguousExcluded** is **False**.

### Capitalize
{: .no_toc }

Whether the first character of each word of a passphrase is changed to uppercase. A **Boolean**, read/write. Default: **False**.

Syntax: *options*.**Capitalize** [ **=** *value* ]

Wordlist mode only. The change is made with **UCase$** on the first character of the word. It is not drawn, so it adds no entropy.

### CustomWords
{: .no_toc }

The word list to use instead of a built-in list. A **String** array, read/write. Default: an empty array.

Syntax: *options*.**CustomWords** [ **=** *value*( ) ]

Wordlist mode only. When the array has words, it overrides [**Wordlist**](#wordlist). Assigning an empty array, or an array that was never allocated, makes the recipe use the built-in list again. The array can have any lower bound.

Assigning copies the array, and reading returns a new array that starts at index 0 and has one element for each word, so changing an array after assigning it or after reading it does not change the recipe. A list must not contain an empty string (`EmptyWord`), and no two words may be equal (`DuplicateWord`). The comparison is by character code, so `alpha` and `Alpha` are different words.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Passphrase
Dim words(1 To 2) As String
words(1) = "red"
words(2) = "blue"
o.CustomWords = words
o.WordCount = 3
o.HasUniqueWords = True

Debug.Print PwGen.Generate(o) = ""    ' True
Debug.Print PwGenError.Code           ' NotEnoughWords

Dim copy() As String = o.CustomWords
Debug.Print LBound(copy)              ' 0
Debug.Print UBound(copy)              ' 1
```

### ExcludeChars
{: .no_toc }

Characters that are removed from every class and from [**IncludeChars**](#includechars). A **String**, read/write. Default: an empty string.

Syntax: *options*.**ExcludeChars** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set. Removing every character of an enabled class is an `EmptyClass` error.

### HasDigits
{: .no_toc }

Whether the digits `0` to `9` are a class of the pool. A **Boolean**, read/write. Default: **True**.

Syntax: *options*.**HasDigits** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set. The [**Pin**](#pin) preset sets it to **True** and disables the other classes.

### HasLowerCase
{: .no_toc }

Whether the letters `a` to `z` are a class of the pool. A **Boolean**, read/write. Default: **True**.

Syntax: *options*.**HasLowerCase** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set.

### HasNoConsecutiveRepeats
{: .no_toc }

Whether two equal characters may not be next to each other. A **Boolean**, read/write. Default: **False**.

Syntax: *options*.**HasNoConsecutiveRepeats** [ **=** *value* ]

Random mode only. The property applies to the pool that [**Alphabet**](#alphabet) gives, too. With a **Length** above 1 and a pool of one character, the error is `CannotAvoidRepeats`, in [**Entropy**](PwGen#entropy) as well as in [**Generate**](PwGen#generate).

The characters are drawn first, and then shuffled again, up to 48 times, until no two equal ones are neighbours. With the default pool this succeeds every time in practice.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.HasNoConsecutiveRepeats = True
Dim pw As String = PwGen.Generate(o)

Dim i As Long
Dim repeated As Boolean
For i = 2 To Len(pw)
    If Mid$(pw, i, 1) = Mid$(pw, i - 1, 1) Then repeated = True
Next
Debug.Print repeated               ' False

o.Alphabet = "A"
o.Length = 4
Debug.Print PwGen.Generate(o) = ""   ' True
Debug.Print PwGenError.Code          ' CannotAvoidRepeats
```

> [!NOTE] 1.0.8.0
> The shuffle only rearranges the characters that were drawn, and the property never draws them again. When the drawn characters cannot be arranged without a repeat, **Generate** returns an empty string and sets `CannotAvoidRepeats`, although other passwords of the same pool would be valid. With a small pool this happens often. From the pool `AB` and a **Length** of 3, the draws `AAA` and `BBB` cannot be arranged, and together they are one draw in four. With a **Length** of 4 the failures are about three calls in five. With [**StartsWithLetter**](#startswithletter) the first character is not moved either, which makes the failures more frequent. A call that fails can be repeated, because the next call draws again.
>
> ```tb check_build check_run
> Dim o As PwGenOptions = PwGenOptions.Alphanumeric
> o.Alphabet = "AB"
> o.Length = 3
> o.HasNoConsecutiveRepeats = True
>
> Dim i As Long
> Dim failures As Long
> For i = 1 To 200
>     If PwGen.Generate(o) = "" Then failures += 1
> Next
> Debug.Print failures >= 20 And failures <= 80   ' True
> ```

### HasSpecialChars
{: .no_toc }

Whether the characters of [**SpecialChars**](#specialchars) are a class of the pool. A **Boolean**, read/write. Default: **False**. The [**Complex**](#complex) preset sets it to **True**.

Syntax: *options*.**HasSpecialChars** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set.

### HasUniqueWords
{: .no_toc }

Whether the words of one passphrase must be different. A **Boolean**, read/write. Default: **False**.

Syntax: *options*.**HasUniqueWords** [ **=** *value* ]

Wordlist mode only. When **True**, each word is drawn from the words that are left, and a [**WordCount**](#wordcount) larger than the number of words in the list is a `NotEnoughWords` error. The entropy is then the sum of `log2(n - i)` over the words, and not `WordCount * log2(n)`.

### HasUpperCase
{: .no_toc }

Whether the letters `A` to `Z` are a class of the pool. A **Boolean**, read/write. Default: **True**.

Syntax: *options*.**HasUpperCase** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set.

### IncludeChars
{: .no_toc }

Characters added to the pool besides the classes. A **String**, read/write. Default: an empty string.

Syntax: *options*.**IncludeChars** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set. The added characters belong to no class, so [**MinPerClass**](#minperclass) does not count them. They are filtered with the pool: [**ExcludeChars**](#excludechars) removes them, and so does [**IsAmbiguousExcluded**](#isambiguousexcluded) for the characters of [**AmbiguousChars**](#ambiguouschars). A character that is already in the pool is not added twice.

### IsAmbiguousExcluded
{: .no_toc }

Whether the characters of [**AmbiguousChars**](#ambiguouschars) are removed from the pool. A **Boolean**, read/write. Default: **True**. The [**Pin**](#pin) preset sets it to **False**.

Syntax: *options*.**IsAmbiguousExcluded** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set. With the default **AmbiguousChars** the pool of the three default classes has 57 characters, and 62 when this property is **False**.

### Length
{: .no_toc }

The number of characters of the password. A **Long**, read/write. Default: 16. The valid values run from 1 to [**PWGEN_MAX_LENGTH**](PwGen#pwgen_max_length), 4096.

Syntax: *options*.**Length** [ **=** *value* ]

Random mode only. A value outside the valid range is an `InvalidLength` error when the recipe is used, not when the property is set. With [**MinPerClass**](#minperclass), the **Length** must also be at least **MinPerClass** times the number of enabled classes (`LengthTooShort`).

### MinPerClass
{: .no_toc }

The smallest number of characters that the password has from each enabled class. A **Long**, read/write. Default: 1.

Syntax: *options*.**MinPerClass** [ **=** *value* ]

Random mode only. Has no effect when [**Alphabet**](#alphabet) is set. The value 0 turns the guarantee off. A negative value is an `InvalidMinPerClass` error. When the guarantee is on, [**Length**](#length) must be at least the value times the number of enabled classes, or the error is `LengthTooShort`. The characters of [**IncludeChars**](#includechars) belong to no class and are not counted.

With the default recipe, the password has at least one uppercase letter, one lowercase letter and one digit.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Alphanumeric
Dim i As Long
Dim ok As Boolean = True
For i = 1 To 200
    Dim pw As String = PwGen.Generate(o)
    If Not (pw Like "*[A-Z]*" And pw Like "*[a-z]*" And pw Like "*[0-9]*") Then ok = False
Next
Debug.Print ok                       ' True

o.Length = 2
PwGen.Generate o
Debug.Print PwGenError.Code          ' LengthTooShort
```

### Mode
{: .no_toc }

Whether the recipe generates a string of characters or a passphrase of words. A [**ePwGenMode**](PwGen#epwgenmode) member, read/write. Default: **pgmRandom**.

Syntax: *options*.**Mode** [ **=** *value* ]

The mode decides which of the other properties are read. [Random mode](#random-mode) and [Wordlist mode](#wordlist-mode) list them. A value that is not a member of the enumeration is an `InvalidMode` error when the recipe is used. The [**Passphrase**](#passphrase) preset sets it to **pgmWordlist**.

### RandomSource
{: .no_toc }

The object that supplies the random numbers for this recipe. A [**PwGenRandom**](PwGenRandom), read/write. Default: **Nothing**.

Syntax: *options*.**RandomSource** [ **=** *value* ]

The property is assigned with [**Set**](../../../Core/Set). **Nothing** means the package's own source, [**PwGenCryptoSource**](PwGenCryptoSource), which calls the Windows CNG function **BCryptGenRandom**. Any object that implements [**PwGenRandom**](PwGenRandom) can be assigned. [**Clone**](#clone) copies the reference, not the object.

[**PwGen.Entropy**](PwGen#entropy) does not use the source.

### SpecialChars
{: .no_toc }

The characters of the special-character class. A **String**, read/write. Default: `!#$%&()+,-.;=@[]_{}~`, the value of [**PWGEN_DEFAULT_SPECIAL_CHARS**](PwGen#pwgen_default_special_chars).

Syntax: *options*.**SpecialChars** [ **=** *value* ]

Random mode only. The class is used when [**HasSpecialChars**](#hasspecialchars) is **True** and [**Alphabet**](#alphabet) is empty. A character that appears more than once counts once, and the pool and the entropy are smaller by the repeats. With an empty string, an enabled class is an `EmptyClass` error.

### StartsWithLetter
{: .no_toc }

Whether the first character must be an ASCII letter. A **Boolean**, read/write. Default: **False**.

Syntax: *options*.**StartsWithLetter** [ **=** *value* ]

Random mode only. The first character is drawn from the letters `A` to `Z` and `a` to `z` that are in the final pool. When the pool has no such letter, for example for the [**Pin**](#pin) preset, the error is `CannotStartWithLetter`. The property applies to the pool that [**Alphabet**](#alphabet) gives, too. The first character is always a letter. The other positions hold a letter only as often as the pool has them, so the results are not evenly spread over the pool.

### WordCount
{: .no_toc }

The number of words of a passphrase. A **Long**, read/write. Default: 5. The valid values run from 1 to [**PWGEN_MAX_WORD_COUNT**](PwGen#pwgen_max_word_count), 256.

Syntax: *options*.**WordCount** [ **=** *value* ]

Wordlist mode only. A value outside the valid range is an `InvalidWordCount` error when the recipe is used.

### Wordlist
{: .no_toc }

The built-in word list to draw from. An [**ePwGenWordlist**](PwGen#epwgenwordlist) member, read/write. Default: **pgwEnglish**.

Syntax: *options*.**Wordlist** [ **=** *value* ]

Wordlist mode only. The property is not read when [**CustomWords**](#customwords) has words. A value that is not a member of the enumeration is an `InvalidWordlist` error when the recipe is used.

### WordSeparator
{: .no_toc }

The string placed between the words of a passphrase. A **String**, read/write. Default: `-`.

Syntax: *options*.**WordSeparator** [ **=** *value* ]

Wordlist mode only. The separator can be any string, including an empty one. It adds no entropy.

## Presets

Each preset is a read-only property of the predeclared object. Every call returns a new recipe, which the caller can change without affecting any other. All the presets start from **Alphanumeric**, which sets the properties to the defaults given above, so a property that a preset does not mention has its default.

### Alphanumeric
{: .no_toc }

Returns a new recipe for a password of letters and digits.

Syntax: *options* **=** **PwGenOptions.Alphanumeric**

The recipe has a **Length** of 16, the classes uppercase, lowercase and digits, no special characters, and the five look-alikes `0O1lI` removed, which leaves 57 characters. [**MinPerClass**](#minperclass) is 1. Its entropy is about 93.3 bits.

### Complex
{: .no_toc }

Returns a new recipe like **Alphanumeric**, with the special characters added.

Syntax: *options* **=** **PwGenOptions.Complex**

[**HasSpecialChars**](#hasspecialchars) is **True**, which adds the 20 characters of [**SpecialChars**](#specialchars) and makes 77 characters. The password has at least one of each of the four classes. Its entropy is about 100.3 bits.

### Hex
{: .no_toc }

Returns a new recipe for a lowercase hexadecimal token.

Syntax: *options* **=** **PwGenOptions.Hex**

The [**Alphabet**](#alphabet) is [**PWGEN_ALPHABET_HEX**](PwGen#pwgen_alphabet_hex), `0123456789abcdef`, and the [**Length**](#length) is 32. Its entropy is 128 bits.

### Passphrase
{: .no_toc }

Returns a new recipe for a passphrase of five English words.

Syntax: *options* **=** **PwGenOptions.Passphrase**

The [**Mode**](#mode) is **pgmWordlist**. The other properties of wordlist mode have their defaults: 5 words from the English list, joined by `-`, drawn with replacement, in lowercase. Its entropy is 65 bits.

### Pin
{: .no_toc }

Returns a new recipe for a PIN of six digits.

Syntax: *options* **=** **PwGenOptions.Pin**

The [**Length**](#length) is 6, and the only class is the digits. [**IsAmbiguousExcluded**](#isambiguousexcluded) is **False**, so `0` and `1` are used. Its entropy is about 19.9 bits.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Pin
Dim pw As String = PwGen.Generate(o)
Debug.Print Len(pw)                 ' 6
Debug.Print pw Like "*[!0-9]*"      ' False
```

## Methods

### Clone
{: .no_toc }

Returns an independent copy of a recipe.

Syntax: *options*.**Clone** ( ) **As PwGenOptions**

Returns a new **PwGenOptions** with the same value in each property. Changing the copy does not change the original. The [**CustomWords**](#customwords) array is copied, and the [**RandomSource**](#randomsource) is not: the copy refers to the same object.

```tb check_build check_run
Dim a As PwGenOptions = PwGenOptions.Alphanumeric
a.Length = 20
Dim b As PwGenOptions = a.Clone()
b.Length = 8
Debug.Print a.Length                ' 20
Debug.Print b.Length                ' 8
```

## See Also

- [PwGen](PwGen) module -- generates results from a recipe and reports its entropy
- [PwGenError](PwGenError) class -- reports why a recipe could not be used
- [PwGenRandom](PwGenRandom) interface -- the type of the random source
- [tsPwGen Package](.) -- the package
