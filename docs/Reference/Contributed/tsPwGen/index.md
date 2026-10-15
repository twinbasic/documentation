---
title: tsPwGen Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - PwGenCrypto
  - PwGenEngine
  - PwGenErrorStore
  - PwGenWords
  - PwGenWordsDe
  - PwGenWordsEn
  - Tests
  - TestsCore
  - TestsFakeRandom
  - TestsRandom
  - TestsWordlist
indexed_from: 1.0.8.0
permalink: /tB/Packages/Contributed/tsPwGen/
---

# tsPwGen Package
{: .no_toc }

**Author:** thosti. **Version:** 1.0.8.0

The **tsPwGen** contributed package generates passwords, PINs, hexadecimal tokens and passphrases, and computes the entropy of a recipe before anything is generated. The package describes itself as "Passwords you can measure before you generate." This section documents version 1.0.8.0, published under the MIT licence.

A recipe is a [**PwGenOptions**](PwGenOptions) object. Its five presets, **Alphanumeric**, **Complex**, **Passphrase**, **Pin** and **Hex**, cover the common cases, and its properties turn a preset into any other recipe. [**PwGen.Generate**](PwGen#generate) draws a result from a recipe. [**PwGen.Entropy**](PwGen#entropy) reports the entropy of a recipe in bits without drawing anything. Entropy is the base-2 logarithm of the number of results a recipe can produce, when each result is equally likely: a recipe with 128 bits can produce about 2^128 different results.

```tb check_build check_run
Dim o As PwGenOptions = PwGenOptions.Complex
o.Length = 20
Debug.Print CLng(PwGen.Entropy(o))                           ' 125

Dim password As String
If PwGen.TryGenerate(password, o) Then
    Debug.Print Len(password)                                ' 20
End If

Dim phrase As PwGenOptions = PwGenOptions.Passphrase
Debug.Print CLng(PwGen.Entropy(phrase))                      ' 65
Debug.Print UBound(Split(PwGen.Generate(phrase), "-")) + 1   ' 5
```

## The presets

<!-- test: PresetTests.Alphanumeric_Properties, PresetTests.Alphanumeric_Results_SixteenCharsFromFiftySevenWithAllThreeClasses, PresetTests.Complex_Properties, PresetTests.Complex_Results_SixteenCharsFromSeventySevenWithAllFourClasses, PresetTests.Passphrase_Properties, PresetTests.Passphrase_Results_FiveEnglishWordsJoinedByHyphens, PresetTests.Pin_Properties, PresetTests.Pin_Results_SixDigitsWithTheLookAlikesKept, PresetTests.Hex_Results_ThirtyTwoLowercaseHexDigits, PresetTests.Presets_ReturnANewRecipeEachTime, PresetTests.Nothing_MeansANewAlphanumericRecipe -->
Each preset is a read-only property of **PwGenOptions** that returns a new recipe. The values below are the ones the presets start with; every property of the new recipe can be changed.

| Preset | Result | Entropy |
|:-------|:-------|--------:|
| **Alphanumeric** | 16 characters from the letters and digits, without the five look-alikes `0`, `O`, `1`, `l` and `I`, so from 57 characters. The password has at least one uppercase letter, one lowercase letter and one digit. | 93.3 bits |
| **Complex** | Like **Alphanumeric**, with the 20 special characters `!#$%&()+,-.;=@[]_{}~` added, so from 77 characters. The password also has at least one special character. | 100.3 bits |
| **Passphrase** | Five words from the English word list, separated by `-`. | 65 bits |
| **Pin** | 6 digits. The look-alikes are kept, so all ten digits are used. | 19.9 bits |
| **Hex** | 32 characters from `0123456789abcdef`. | 128 bits |

Every function of the package that takes a recipe also accepts **Nothing**, which means a new **Alphanumeric** recipe.
<!-- /test -->

## Entropy

<!-- test: EntropyTests.Random_LengthTimesLogTwoOfThePool, EntropyTests.Random_RepeatedCharactersOfTheAlphabetCountOnce, EntropyTests.Random_RepeatedCharactersOfSpecialCharsAndIncludeCharsCountOnce, EntropyTests.Random_RemovedCharactersDoNotCount, EntropyTests.Random_ConstraintsDoNotLowerTheFigure, EntropyTests.Wordlist_WordCountTimesLogTwoOfTheListSize, EntropyTests.Wordlist_UniqueWords_SumOfLogTwoOfTheWordsLeft, EntropyTests.Wordlist_SeparatorAndCapitalizeAddNothing -->
[**PwGen.Entropy**](PwGen#entropy) computes the entropy of a recipe from its settings alone:

- In random mode, `Length * log2(p)`, where *p* is the number of different characters the password is drawn from.
- In wordlist mode, `WordCount * log2(n)`, where *n* is the number of words in the list. When the words of a passphrase must be different ([**HasUniqueWords**](PwGenOptions#hasuniquewords)), the sum of `log2(n)`, `log2(n - 1)`, `log2(n - 2)` and so on, one term for each word.

The separator and the capital letters of a passphrase add nothing. The constraints of random mode, [**MinPerClass**](PwGenOptions#minperclass), [**StartsWithLetter**](PwGenOptions#startswithletter) and [**HasNoConsecutiveRepeats**](PwGenOptions#hasnoconsecutiverepeats), do not lower the figure, so the entropy of a password drawn under them can be smaller than the figure.
<!-- /test -->

## Errors

<!-- test: ErrorTests.Members_AfterAFailedGenerate, ErrorTests.FailedFunctions_RaiseNoRunTimeError, ErrorTests.EveryFunction_ClearsTheLastErrorWhenItStarts, ErrorTests.TryGenerate_Success_ReturnsTrueAndThePassword, ErrorTests.TryGenerate_Failure_ReturnsFalseAndAnEmptyString, FactoryTests.PredeclaredObject_AssigningAProperty_Raises5 -->
A recipe that cannot be used does not raise a run-time error. [**PwGen.Generate**](PwGen#generate) returns an empty string, [**PwGen.Entropy**](PwGen#entropy) returns 0, and the last error is set. The predeclared object [**PwGenError**](PwGenError) reports it: **HasError** is **True**, **Code** is a short name such as `InvalidLength`, and **Message** and **Origin** describe the error and the function that found it. Each function of [**PwGen**](PwGen) clears the last error when it starts, so the last error always belongs to the latest call. [**PwGen.TryGenerate**](PwGen#trygenerate) returns **False** instead of an empty string when it fails.

The package raises a run-time error in one case: assigning a property on the predeclared object **PwGenOptions** itself, which is a factory and not a recipe. The error is 5, *Invalid procedure call or argument*.
<!-- /test -->

## Random sources

<!-- test: RandomSourceTests.RandomSource_Nothing_DrawsDifferentResults, RandomSourceTests.LowestRandom_RandomMode_DrawsTheFirstCharacterOfThePool -->
Characters and words are drawn with a **PwGenRandom** object. A recipe whose [**RandomSource**](PwGenOptions#randomsource) is **Nothing** uses [**PwGenCryptoSource**](PwGenCryptoSource), which calls the Windows CNG function **BCryptGenRandom**. Any object that implements the [**PwGenRandom**](PwGenRandom) interface can be assigned to **RandomSource** instead. A source that returns fixed values makes the result predictable, which the samples on these pages use.
<!-- /test -->

## Word lists

<!-- test: WordlistTests.BuiltInWordCount_BothListsHave8192Words, WordlistTests.BuiltInWord_FirstAndLastWordsOfBothLists, WordlistTests.BuiltInLists_NoWordTwiceAndOnlyLettersAToZ -->
The package has two built-in word lists, English and German, of 8192 words each. No word appears twice in a list, and 8192 is 2^13, so each word of a passphrase from a built-in list adds 13 bits. Every word of a list is written with the letters `a` to `z` only: the German list spells the umlauts and the sharp s as `ae`, `oe`, `ue` and `ss`.

```tb check_build check_run
Debug.Print PwGen.BuiltInWordCount(pgwEnglish)    ' 8192
Debug.Print PwGen.BuiltInWord(pgwEnglish, 0)      ' abandon
Debug.Print PwGen.BuiltInWord(pgwEnglish, 8191)   ' zurich
Debug.Print PwGen.BuiltInWord(pgwGerman, 0)       ' aal
Debug.Print PwGen.BuiltInWord(pgwGerman, 8191)    ' zypresse
```

<!-- /test -->

A recipe can use its own list instead, through [**CustomWords**](PwGenOptions#customwords).

## Classes and modules

- [PwGen](PwGen) -- the module that generates passwords and passphrases, reports entropy and reads the built-in word lists
  - [BuiltInWord](PwGen#builtinword) -- returns one word of a built-in list
  - [BuiltInWordCount](PwGen#builtinwordcount) -- returns the number of words in a built-in list
  - [Entropy](PwGen#entropy) -- returns the entropy of a recipe in bits, without generating a result
  - [Generate](PwGen#generate) -- generates a password or a passphrase from a recipe
  - [TryGenerate](PwGen#trygenerate) -- generates into a variable and returns whether it succeeded
  - [ePwGenMode](PwGen#epwgenmode) -- the two generation modes
  - [ePwGenWordlist](PwGen#epwgenwordlist) -- the two built-in word lists
  - [PWGEN_ALPHABET_HEX](PwGen#pwgen_alphabet_hex), [PWGEN_DEFAULT_AMBIGUOUS_CHARS](PwGen#pwgen_default_ambiguous_chars), [PWGEN_DEFAULT_SPECIAL_CHARS](PwGen#pwgen_default_special_chars), [PWGEN_MAX_LENGTH](PwGen#pwgen_max_length), [PWGEN_MAX_WORD_COUNT](PwGen#pwgen_max_word_count) -- the constants
- [PwGenOptions](PwGenOptions) -- a recipe: the mode, the characters or words to draw from, and the constraints; its predeclared object creates the five presets
  - [Alphanumeric](PwGenOptions#alphanumeric), [Complex](PwGenOptions#complex), [Hex](PwGenOptions#hex), [Passphrase](PwGenOptions#passphrase), [Pin](PwGenOptions#pin) -- the presets
  - [Clone](PwGenOptions#clone) -- returns an independent copy of a recipe
  - the 22 properties: [Alphabet](PwGenOptions#alphabet), [AmbiguousChars](PwGenOptions#ambiguouschars), [Capitalize](PwGenOptions#capitalize), [CustomWords](PwGenOptions#customwords), [ExcludeChars](PwGenOptions#excludechars), [HasDigits](PwGenOptions#hasdigits), [HasLowerCase](PwGenOptions#haslowercase), [HasNoConsecutiveRepeats](PwGenOptions#hasnoconsecutiverepeats), [HasSpecialChars](PwGenOptions#hasspecialchars), [HasUniqueWords](PwGenOptions#hasuniquewords), [HasUpperCase](PwGenOptions#hasuppercase), [IncludeChars](PwGenOptions#includechars), [IsAmbiguousExcluded](PwGenOptions#isambiguousexcluded), [Length](PwGenOptions#length), [MinPerClass](PwGenOptions#minperclass), [Mode](PwGenOptions#mode), [RandomSource](PwGenOptions#randomsource), [SpecialChars](PwGenOptions#specialchars), [StartsWithLetter](PwGenOptions#startswithletter), [WordCount](PwGenOptions#wordcount), [Wordlist](PwGenOptions#wordlist), [WordSeparator](PwGenOptions#wordseparator)
- [PwGenError](PwGenError) -- the predeclared object that reports the last error; it also holds the table of error codes
  - [Clear](PwGenError#clear), [Code](PwGenError#code), [HasError](PwGenError#haserror), [Message](PwGenError#message), [Origin](PwGenError#origin), [Snapshot](PwGenError#snapshot), [ToString](PwGenError#tostring) -- its members
  - [tPwGenError](PwGenError#tpwgenerror) -- the type that **Snapshot** returns
- [PwGenRandom](PwGenRandom) -- the interface of a random source
  - [NextInRange](PwGenRandom#nextinrange) -- returns a whole number between two bounds
- [PwGenCryptoSource](PwGenCryptoSource) -- the default random source, which uses the Windows CNG generator

## Test code

<!-- test: PackageCodeTests.PackageTests_RunAll_NoCheckFails, PackageCodeTests.PackageTests_FailedCheckIsCounted -->
The package also contains its own test code, which has no pages: the modules **Tests**, **TestsCore**, **TestsRandom** and **TestsWordlist**, and the class **TestsFakeRandom**. **Tests.RunAll** runs three areas and prints the result of each check with **Debug.Print**, so the lines appear in the DEBUG CONSOLE of the IDE and nowhere else. The **Core** area (**TestsCore**) checks the constants, the presets, the guard on the predeclared **PwGenOptions** object, **Clone**, the last error and its snapshot, **TryGenerate** and an invalid mode. The **Random** area (**TestsRandom**) checks the entropy formulas, the recipes, **Alphabet**, **IncludeChars** and **ExcludeChars**, **MinPerClass**, **StartsWithLetter**, **HasNoConsecutiveRepeats**, results drawn with a fixed random source, and the error codes of random mode. The **Wordlist** area (**TestsWordlist**) checks the built-in lists, the default passphrase, **CustomWords**, **HasUniqueWords**, the separator and **Capitalize**, the entropy of passphrases and the error codes of wordlist mode. Each check prints `OK`, `FAIL` or `SKIP`, a failed check does not stop the run, and the last lines give the counts and the elapsed time and say that the tests passed or failed. In version 1.0.8.0 the run has 349 checks that pass, none that fail and 3 that are skipped, and it ends with a line that says the tests passed. The three skipped checks stand for the error codes `EmptyCharset`, `EmptyWordlist` and `InvalidRange`, which no recipe sets.
<!-- /test -->

**TestsFakeRandom** implements [**PwGenRandom**](PwGenRandom) for the tests. It returns the lower bound of each interval it is given; after `SetAlwaysUpper True` it returns the upper bound, and after `SetOutOfRange True` it returns a value one above the upper bound, which makes the generator report `RngFailed`.

## Internal modules

Six more modules are part of the package's implementation and have no pages: **PwGenEngine** (the generator), **PwGenCrypto** (the CNG call and the shared default random source), **PwGenErrorStore** (the storage behind [**PwGenError**](PwGenError)), **PwGenWords** (access to the word lists), and **PwGenWordsEn** and **PwGenWordsDe** (the data of the two lists). The package describes each of them as not part of its public API.

<!-- test: PackageCodeTests.InternalModules_CanBeNamedByAProject, compile UnqualifiedEntropy, compile UnqualifiedGenerate -->
None of them is declared **Private**, so a project that references the package can name them.

```tb check_build check_run
Debug.Print PwGenWords.CountOf(pgwEnglish, "x")   ' 8192
```

The names are visible to the whole project: the **Generate** and **Entropy** functions of **PwGenEngine** make an unqualified call of the functions of [**PwGen**](PwGen) ambiguous (see [Known problems](#known-problems-in-version-1080)).
<!-- /test -->

## Known problems in version 1.0.8.0

<!-- test: CryptoSourceTests.NextInRange_AfterAnEarlierFailure_StillReturnsANumberOfTheInterval, CryptoSourceTests.NextInRange_AfterClear_ReturnsANumberOfTheInterval, CryptoSourceTests.PwGenFunctions_AreNotAffectedByAnEarlierFailure -->
> [!WARNING] 1.0.8.0
> Called directly, the **NextInRange** method of [**PwGenCryptoSource**](PwGenCryptoSource#errors) returns 0, with no error of its own, while an earlier failure of the package is still the last error. Clear the last error first. The functions of [**PwGen**](PwGen) are not affected.

<!-- test: ConsecutiveRepeatTests.SmallPool_LengthThree_AlwaysGeneratesWhenAPasswordExists, ConsecutiveRepeatTests.SmallPool_LengthFour_AlwaysGeneratesWhenAPasswordExists, ConsecutiveRepeatTests.SmallPool_WithStartsWithLetter_AlwaysGeneratesWhenAPasswordExists, compile UnqualifiedEntropy, compile UnqualifiedGenerate, PackageCodeTests.SetContinueOnFail_False_NoCheckRunsAfterTheFirstFailure, ErrorTests.UnusedCodes_NoRecipeSetsEmptyCharsetOrEmptyWordlist -->
> [!NOTE] 1.0.8.0
> The package has four more problems. None of them returns a wrong password.
>
> - **`HasNoConsecutiveRepeats` fails for small pools.** A recipe with [**HasNoConsecutiveRepeats**](PwGenOptions#hasnoconsecutiverepeats) returns an empty string with the error `CannotAvoidRepeats` in about one call of four for the pool `AB` and a **Length** of 3, although valid passwords exist.
> - **An unqualified call is ambiguous.** `Generate()` and `Entropy()` written without `PwGen.` fail with TB5073, because the internal module **PwGenEngine** declares functions with the same names. See [**PwGen**](PwGen).
> - **`Tests.SetContinueOnFail` has no effect.** A failed check never stops **Tests.RunAll**, whatever the setting.
> - **Two error codes are never set.** The package declares `EmptyCharset` and `EmptyWordlist`, but no recipe produces them. See [**PwGenError**](PwGenError#error-codes).

The first check of this sample fails on purpose. The second check still runs after `SetContinueOnFail False`:

```tb check_build check_run
Tests.BeginRun
Tests.SetContinueOnFail False
Tests.CheckTrue "first", False
Tests.CheckTrue "second", True
Debug.Print Tests.FailCount()
' Output:
' === tsPwGen tests ==========================================
' FAIL  first
' expected: True
' actual:   False
' OK    second
' 1
```

## See Also

- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project
- [Interface](../../../Core/Interface) statement -- declares an interface such as **PwGenRandom**
- [Implements](../../../Core/Implements) statement -- implements an interface in a class
- [Like](../../../Core/Like) operator -- compares a string with a pattern, as the samples on these pages do to test the characters of a result

## Test cases

The notes and warnings of this section are checked by the test cases in [tsPwGen-tests.twinproj](tsPwGen-tests.twinproj), a twinBASIC project. It uses tsPwGen as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
