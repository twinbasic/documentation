---
title: PwGen
parent: tsPwGen Package
permalink: /tB/Packages/Contributed/tsPwGen/PwGen
has_toc: false
---

# PwGen module
{: .no_toc }

The **PwGen** module generates a password or a passphrase from a recipe, reports the entropy of a recipe without generating anything, and reads the two built-in word lists. A recipe is a [**PwGenOptions**](PwGenOptions) object.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Hex
Debug.Print CLng(PwGen.Entropy(o))    ' 128

Dim token As String = PwGen.Generate(o)
Debug.Print Len(token)                ' 32
Debug.Print token Like "*[!0-9a-f]*"  ' False
```

The module has no settings. Its only state is the last error, which [**PwGenError**](PwGenError) reports. A recipe that cannot be used does not raise a run-time error: the function returns an empty string, or 0, and sets the last error. Every function of the module clears the last error when it starts, so after a call the last error belongs to that call.

<!-- test: compile UnqualifiedEntropy, compile UnqualifiedGenerate -->
> [!NOTE] 1.0.8.0
> Write the module name in every call, as in `PwGen.Generate`. The package's internal module **PwGenEngine** also declares public functions named **Generate** and **Entropy**, so a call written without the module name fails with TB5073, *'Entropy' is ambiguous*, or *'Generate' is ambiguous*.
>
> ```tb check_build expect-error=TB5073
> Debug.Print CLng(Entropy())
> ```

* TOC
{:toc}

## Constants

### PWGEN_ALPHABET_HEX
{: .no_toc }

The characters of a lowercase hexadecimal number, `0123456789abcdef`. A **String** constant. The [**Hex**](PwGenOptions#hex) preset sets its [**Alphabet**](PwGenOptions#alphabet) to this value.

### PWGEN_DEFAULT_AMBIGUOUS_CHARS
{: .no_toc }

The characters that are often mistaken for one another when they are read: the digit zero, the capital `O`, the digit one, the lowercase `l` and the capital `I`. The value is `0O1lI`. A **String** constant. It is the default of [**AmbiguousChars**](PwGenOptions#ambiguouschars).

### PWGEN_DEFAULT_SPECIAL_CHARS
{: .no_toc }

The 20 special characters that a recipe uses by default, `!#$%&()+,-.;=@[]_{}~`. A **String** constant. It is the default of [**SpecialChars**](PwGenOptions#specialchars).

### PWGEN_MAX_LENGTH
{: .no_toc }

The largest value of [**Length**](PwGenOptions#length), 4096. A **Long** constant. A longer password is an `InvalidLength` error.

### PWGEN_MAX_WORD_COUNT
{: .no_toc }

The largest value of [**WordCount**](PwGenOptions#wordcount), 256. A **Long** constant. A larger count is an `InvalidWordCount` error.

## Enumerations

### ePwGenMode
{: .no_toc }

The way a recipe produces its result. [**Mode**](PwGenOptions#mode) takes one of these members. Any other value is an `InvalidMode` error when the recipe is used.

| Member | Value | Meaning |
|:-------|------:|:--------|
| **pgmRandom** | 0 | The result is a string of characters drawn from a pool. |
| **pgmWordlist** | 1 | The result is a passphrase of words drawn from a list. |

### ePwGenWordlist
{: .no_toc }

The built-in word lists. [**Wordlist**](PwGenOptions#wordlist) and the functions [**BuiltInWord**](#builtinword) and [**BuiltInWordCount**](#builtinwordcount) take one of these members. Any other value is an `InvalidWordlist` error.

| Member | Value | Meaning |
|:-------|------:|:--------|
| **pgwEnglish** | 0 | The English list of 8192 words. |
| **pgwGerman** | 1 | The German list of 8192 words. |

## Functions

### BuiltInWord
{: .no_toc }

Returns one word of a built-in word list.

Syntax: **PwGen.BuiltInWord** ( *list*, *index* ) **As String**

*list*
: *required* An [**ePwGenWordlist**](#epwgenwordlist) member that names the list.

*index*
: *required* A **Long**, the position of the word in the list. The first word has index 0, so the valid values run from 0 to [**BuiltInWordCount**](#builtinwordcount) minus 1.

<!-- test: WordlistTests.BuiltInWord_FirstAndLastWordsOfBothLists, WordlistTests.BuiltInWord_IndexOutsideTheList_IndexOutOfRange, WordlistTests.BuiltInWord_NotAList_InvalidWordlist -->
Returns the word, or an empty string when the call fails. The call fails with `InvalidWordlist` when *list* is not a member of **ePwGenWordlist**, and with `IndexOutOfRange` when *index* is below 0 or not below the number of words. Each call copies the whole list internally.
<!-- /test -->


```tb check_build check_run
Debug.Print PwGen.BuiltInWord(pgwEnglish, 0)   ' abandon
Debug.Print PwGen.BuiltInWord(pgwGerman, 0)    ' aal

Dim w As String = PwGen.BuiltInWord(pgwEnglish, 8192)
Debug.Print w = ""                             ' True
Debug.Print PwGenError.Code                    ' IndexOutOfRange
Debug.Print PwGenError.Origin                  ' PwGen.BuiltInWord
```

### BuiltInWordCount
{: .no_toc }

Returns the number of words in a built-in word list.

Syntax: **PwGen.BuiltInWordCount** ( *list* ) **As Long**

*list*
: *required* An [**ePwGenWordlist**](#epwgenwordlist) member that names the list.

<!-- test: WordlistTests.BuiltInWordCount_NotAList_InvalidWordlist -->
Returns 8192 for **pgwEnglish** and for **pgwGerman**. Returns 0 and sets the error `InvalidWordlist` when *list* is not a member of **ePwGenWordlist**.
<!-- /test -->

```tb check_build check_run
Debug.Print PwGen.BuiltInWordCount(pgwEnglish)   ' 8192
Debug.Print PwGen.BuiltInWordCount(pgwGerman)    ' 8192

Debug.Print PwGen.BuiltInWordCount(99)           ' 0
Debug.Print PwGenError.Code                      ' InvalidWordlist
```

### Entropy
{: .no_toc }

Returns the entropy of a recipe in bits, without generating a result.

Syntax: **PwGen.Entropy** ( [ *options* ] ) **As Double**

*options*
: *optional* The [**PwGenOptions**](PwGenOptions) recipe whose entropy is wanted. **Nothing**, the default, means a new **Alphanumeric** recipe. The recipe is not changed.

<!-- test: EntropyTests.Entropy_InvalidRecipe_ReturnsZeroAndSetsTheError, EntropyTests.Entropy_ClearsTheLastErrorWhenItStarts, EntropyTests.Entropy_DoesNotChangeTheRecipe, EntropyTests.Entropy_DoesNotFindTheErrorsThatArisePerDraw, RandomSourceTests.Entropy_DoesNotUseTheSource, ConsecutiveRepeatTests.FixedSource_DrawsThatCannotBeArranged_CannotAvoidRepeats -->
Returns the entropy as a **Double**, or 0 and the last error when the recipe cannot be used. The recipe is checked as [**Generate**](#generate) checks it, with the origin `PwGen.Entropy`. The errors that can arise only while characters are drawn are not found: `RngFailed`, `CannotAvoidRepeats` with the message *could not place characters without consecutive repeats*, and `LengthTooShort` with the message *Length is too small for MinPerClass and StartsWithLetter*. **Entropy** does not use the recipe's [**RandomSource**](PwGenOptions#randomsource). The codes are listed under [Error codes](PwGenError#error-codes).

The figure is computed as follows:

- **Random mode.** `Length * log2(p)`, where *p* is the number of different characters in the pool. A character that appears twice in [**Alphabet**](PwGenOptions#alphabet), [**SpecialChars**](PwGenOptions#specialchars) or [**IncludeChars**](PwGenOptions#includechars) counts once. A character that [**ExcludeChars**](PwGenOptions#excludechars) or [**IsAmbiguousExcluded**](PwGenOptions#isambiguousexcluded) removes does not count.
- **Wordlist mode.** `WordCount * log2(n)`, where *n* is the number of words in the list: the custom list when [**CustomWords**](PwGenOptions#customwords) has words, otherwise the built-in list. When [**HasUniqueWords**](PwGenOptions#hasuniquewords) is **True**, the sum of `log2(n - i)` for *i* from 0 to `WordCount - 1`.

The logarithm is computed as `Log(x) / Log(2)`, so a result can differ from the exact figure in its last digits: the entropy of the **Passphrase** preset is 65 up to rounding. The figure does not take the constraints of random mode into account: [**MinPerClass**](PwGenOptions#minperclass), [**StartsWithLetter**](PwGenOptions#startswithletter) and [**HasNoConsecutiveRepeats**](PwGenOptions#hasnoconsecutiverepeats) make some results impossible or less likely than others, so the entropy of the passwords actually drawn can be lower. The separator and [**Capitalize**](PwGenOptions#capitalize) of a passphrase add nothing.
<!-- /test -->

```tb check_build check_run
Debug.Print Int(PwGen.Entropy())                         ' 93
Debug.Print Int(PwGen.Entropy(PwGenOptions.Complex))     ' 100
Debug.Print Int(PwGen.Entropy(PwGenOptions.Pin))         ' 19
Debug.Print CLng(PwGen.Entropy(PwGenOptions.Hex))        ' 128
Debug.Print CLng(PwGen.Entropy(PwGenOptions.Passphrase)) ' 65

Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.Alphabet = "aabbcc"
o.Length = 10
Debug.Print CLng(2 ^ (PwGen.Entropy(o) / o.Length))      ' 3
```

The last line shows that the three different characters of `aabbcc` are counted, and not the six. The expression `2 ^ (bits / Length)` turns the entropy back into the size of the pool.

### Generate
{: .no_toc }

Generates a password or a passphrase from a recipe.

Syntax: **PwGen.Generate** ( [ *options* ] ) **As String**

*options*
: *optional* The [**PwGenOptions**](PwGenOptions) recipe to use. **Nothing**, the default, means a new **Alphanumeric** recipe: 16 characters from the letters and digits, without the look-alikes `0O1lI`. The recipe is not changed.

<!-- test: FactoryTests.Generate_DoesNotChangeTheRecipe, ErrorTests.EveryFunction_ClearsTheLastErrorWhenItStarts, RandomSourceTests.OutOfRangeSource_RngFailed -->
Returns the password or passphrase. When the recipe cannot be used, or the random source fails, returns an empty string and sets the last error, which [**PwGenError**](PwGenError) reports. The last error is cleared first, so **PwGenError.HasError** after a successful call is **False**. The codes that can be set are listed under [Error codes](PwGenError#error-codes), with the origin `PwGen.Generate`.
<!-- /test -->

The [**Mode**](PwGenOptions#mode) of the recipe decides what is generated. In random mode the result has [**Length**](PwGenOptions#length) characters, in wordlist mode [**WordCount**](PwGenOptions#wordcount) words. [Random mode](PwGenOptions#random-mode) and [Wordlist mode](PwGenOptions#wordlist-mode) describe how the pool is built and what is drawn. All randomness comes from the recipe's [**RandomSource**](PwGenOptions#randomsource), or from [**PwGenCryptoSource**](PwGenCryptoSource) when it is **Nothing**.

```tb check_build check_run
Dim pw As String = PwGen.Generate()
Debug.Print Len(pw)                                   ' 16
Debug.Print pw Like "*[!A-HJ-NP-Za-km-z2-9]*"         ' False

Dim o As PwGenOptions = PwGenOptions.Alphanumeric
o.Length = 0
Debug.Print PwGen.Generate(o) = ""                    ' True
Debug.Print PwGenError.ToString()                     ' PwGen.Generate: InvalidLength - Length must be between 1 and 4096.
```

The pattern in the second line is true for a character outside the pool of the default recipe, so **False** means that every character of the password is in it.

### TryGenerate
{: .no_toc }

Generates a password or a passphrase into a variable and returns whether it succeeded.

Syntax: **PwGen.TryGenerate** ( *password* [ , *options* ] ) **As Boolean**

*password*
: *required* A **String** variable that receives the result. It is passed **ByRef**. After a failed call it is an empty string.

*options*
: *optional* The [**PwGenOptions**](PwGenOptions) recipe to use. **Nothing**, the default, means a new **Alphanumeric** recipe.

<!-- test: ErrorTests.TryGenerate_Success_ReturnsTrueAndThePassword, ErrorTests.TryGenerate_Failure_ReturnsFalseAndAnEmptyString -->
Returns **True** when a result was generated and **False** when not. It calls [**Generate**](#generate) and tests the last error, so the last error is set as **Generate** sets it, with the origin `PwGen.Generate`, and the codes are the same.
<!-- /test -->

```tb check_build check_run
Dim pw As String
Dim o As PwGenOptions = PwGenOptions.Pin
Debug.Print PwGen.TryGenerate(pw, o)    ' True
Debug.Print Len(pw)                     ' 6
Debug.Print pw Like "*[!0-9]*"          ' False

o.Length = 0
Debug.Print PwGen.TryGenerate(pw, o)    ' False
Debug.Print pw = ""                     ' True
Debug.Print PwGenError.Code             ' InvalidLength
```

## See Also

- [PwGenOptions](PwGenOptions) class -- the recipe that every function takes
- [PwGenError](PwGenError) class -- reports the last error and lists the error codes
- [PwGenRandom](PwGenRandom) interface -- the random source of a recipe
- [tsPwGen Package](.) -- the package
