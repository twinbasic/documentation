---
title: Assert Package
parent: Built-In Packages
nav_order: 4
permalink: /tB/Packages/Assert/
has_toc: false
indexed_from: beta-x-0983
---

# Assert Package

The **Assert** built-in package supplies the assertion functions used to write unit tests for twinBASIC code. Each assertion checks an expected condition; on failure, it records a test failure with the call site and an optional message. The test runner --- the twinBASIC IDE's Test Explorer, or any equivalent harness --- collects those results, decides which tests passed, failed, or were skipped, and reports them.

The package's three modules --- [**Exact**](Exact), [**Strict**](Strict), and [**Permissive**](Permissive) --- expose the same fifteen assertion functions; only the *comparison semantics* differ. Each flavour matches a different strictness level for equality evaluation.

| Module                       | String comparisons | Numeric and other comparisons                                                                                                                              |
|------------------------------|--------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [**Exact**](Exact)           | case-sensitive     | no implicit conversions; datatypes must match exactly (`5` ≠ `5.0`); `vbNullString` is distinct from `""`; `Empty` is distinct from `0`, `False`, and `""`; object default members are *not* evaluated |
| [**Strict**](Strict)         | case-sensitive     | evaluated as if the comparison were written directly in twinBASIC code; object default members are *not* evaluated                                         |
| [**Permissive**](Permissive) | case-insensitive   | evaluated as if the comparison were written directly in twinBASIC code                                                                                     |

`Null` is never considered equal to anything --- not even to itself --- under any of the three flavours. To test for **Null** explicitly, use the [**IsNull**](Exact#isnull) / [**IsNotNull**](Exact#isnotnull) assertions rather than `AreEqual(..., Null)`.

```tb
Sub TestStringReverse()
    Strict.AreEqual "olleh", StrReverse("hello")
    Strict.AreEqual "", StrReverse("")
End Sub
```

## Calling convention

Every member of every module is tagged `[MustBeQualified(True)]` --- calls *must* be written with the module name, even from inside a project that has imported the **Assert** package:

```tb
Strict.IsTrue x > 0          ' OK
IsTrue x > 0                 ' compile error — module qualifier required
```

If a project references more than one package that exposes a module called **Strict**, qualify further with the package name as well: **Assert.Strict.IsTrue** *x*.

## Debug-only

Every assertion is tagged `[DebugOnly(True)]` --- the calls compile to *nothing* in release builds, in the same way that [**Debug.Print**](../../Core/Print) and the **Debug.Assert** statement do. A test runner therefore needs to build the project with debug enabled.

## Modules

- [Exact](Exact) -- strictest comparisons; datatypes must match and conversions never happen
- [Strict](Strict) -- case-sensitive strings, but otherwise equality matches a direct comparison in twinBASIC code
- [Permissive](Permissive) -- case-insensitive strings; otherwise equality matches a direct comparison in twinBASIC code

## Members

Each module exposes the same fifteen functions. See the per-module pages for the full signatures and the comparison semantics that apply to each member.

### Exact

- [AreEqual](Exact#areequal) -- asserts that *Actual* is equal to *Expected* under strictest semantics; datatypes must match and no implicit conversions occur
- [AreNotEqual](Exact#arenotequal) -- asserts that *Actual* is not equal to *Expected* under strictest semantics; datatypes must match and no implicit conversions occur
- [AreNotSame](Exact#arenotsame) -- asserts that *Actual* and *Expected* refer to different objects
- [AreSame](Exact#aresame) -- asserts that *Actual* and *Expected* refer to the same object
- [Fail](Exact#fail) -- unconditionally records a test failure
- [Inconclusive](Exact#inconclusive) -- records the test as inconclusive --- neither a pass nor a failure
- [IsFalse](Exact#isfalse) -- asserts that *Condition* evaluates to **False**
- [IsNothing](Exact#isnothing) -- asserts that *Value* is the **Nothing** object reference
- [IsNotNothing](Exact#isnotnothing) -- asserts that *Value* refers to an object and is not **Nothing**
- [IsNotNull](Exact#isnotnull) -- asserts that *Value* is not the **Null** value of a **Variant**
- [IsNull](Exact#isnull) -- asserts that *Value* is the **Null** value of a **Variant**
- [IsTrue](Exact#istrue) -- asserts that *Condition* evaluates to **True**
- [NotSequenceEquals](Exact#notsequenceequals) -- asserts that *Actual* and *Expected* differ in length or in at least one element
- [SequenceEquals](Exact#sequenceequals) -- asserts that *Actual* and *Expected* contain the same elements in the same order
- [Succeed](Exact#succeed) -- records that the test reached this point without failure

### Permissive

- [AreEqual](Permissive#areequal) -- asserts that *Actual* is equal to *Expected* with case-insensitive strings and numeric promotion
- [AreNotEqual](Permissive#arenotequal) -- asserts that *Actual* is not equal to *Expected* with case-insensitive strings and numeric promotion
- [AreNotSame](Permissive#arenotsame) -- asserts that *Actual* and *Expected* refer to different objects
- [AreSame](Permissive#aresame) -- asserts that *Actual* and *Expected* refer to the same object
- [Fail](Permissive#fail) -- unconditionally records a test failure
- [Inconclusive](Permissive#inconclusive) -- records the test as inconclusive --- neither a pass nor a failure
- [IsFalse](Permissive#isfalse) -- asserts that *Condition* evaluates to **False**
- [IsNothing](Permissive#isnothing) -- asserts that *Value* is the **Nothing** object reference
- [IsNotNothing](Permissive#isnotnothing) -- asserts that *Value* refers to an object and is not **Nothing**
- [IsNotNull](Permissive#isnotnull) -- asserts that *Value* is not the **Null** value of a **Variant**
- [IsNull](Permissive#isnull) -- asserts that *Value* is the **Null** value of a **Variant**
- [IsTrue](Permissive#istrue) -- asserts that *Condition* evaluates to **True**
- [NotSequenceEquals](Permissive#notsequenceequals) -- asserts that *Actual* and *Expected* differ in length or in at least one element
- [SequenceEquals](Permissive#sequenceequals) -- asserts that *Actual* and *Expected* contain the same elements in the same order
- [Succeed](Permissive#succeed) -- records that the test reached this point without failure

### Strict

- [AreEqual](Strict#areequal) -- asserts that *Actual* is equal to *Expected* with case-sensitive strings and normal twinBASIC equality
- [AreNotEqual](Strict#arenotequal) -- asserts that *Actual* is not equal to *Expected* with case-sensitive strings and normal twinBASIC equality
- [AreNotSame](Strict#arenotsame) -- asserts that *Actual* and *Expected* refer to different objects
- [AreSame](Strict#aresame) -- asserts that *Actual* and *Expected* refer to the same object
- [Fail](Strict#fail) -- unconditionally records a test failure
- [Inconclusive](Strict#inconclusive) -- records the test as inconclusive --- neither a pass nor a failure
- [IsFalse](Strict#isfalse) -- asserts that *Condition* evaluates to **False**
- [IsNothing](Strict#isnothing) -- asserts that *Value* is the **Nothing** object reference
- [IsNotNothing](Strict#isnotnothing) -- asserts that *Value* refers to an object and is not **Nothing**
- [IsNotNull](Strict#isnotnull) -- asserts that *Value* is not the **Null** value of a **Variant**
- [IsNull](Strict#isnull) -- asserts that *Value* is the **Null** value of a **Variant**
- [IsTrue](Strict#istrue) -- asserts that *Condition* evaluates to **True**
- [NotSequenceEquals](Strict#notsequenceequals) -- asserts that *Actual* and *Expected* differ in length or in at least one element
- [SequenceEquals](Strict#sequenceequals) -- asserts that *Actual* and *Expected* contain the same elements in the same order
- [Succeed](Strict#succeed) -- records that the test reached this point without failure
