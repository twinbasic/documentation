---
title: Strict
parent: Assert Package
permalink: /tB/Packages/Assert/Strict
has_toc: false
---

# Strict module
{: .no_toc }

The **Strict** module of the [**Assert**](.) package supplies assertions that compare values as if the comparison had been written directly in twinBASIC code, with two exceptions: string comparisons are case-sensitive (regardless of the project's `Option Compare` setting), and object default members are not evaluated. Use **Strict** for tests that should match the language's normal equality semantics for numbers and primitives but also need a guaranteed case-sensitive string compare and reference-style equality on objects.

* TOC
{:toc}

## Comparison semantics

The four equality assertions in this module — [**AreEqual**](#areequal), [**AreNotEqual**](#arenotequal), [**SequenceEquals**](#sequenceequals), and [**NotSequenceEquals**](#notsequenceequals) — apply the rules listed below. The remaining assertions are unaffected.

- *String* comparisons are case-sensitive (regardless of the project's `Option Compare` setting).
- Object references are compared by identity (the **Is** operator); default-member values are not retrieved.
- All other comparisons are evaluated as if the operands had been written either side of `=` in twinBASIC code — numeric promotions apply (`5` equals `5.0`), `vbNullString` and `""` are both empty strings, and so on.
- `Null` is never equal to anything, not even to itself — use [**IsNull**](#isnull) / [**IsNotNull**](#isnotnull) to test for it.

```tb
' Pass under Strict (would fail under Exact):
Strict.AreEqual 5, 5.0           ' twinBASIC promotes 5 to 5.0 before comparing
Strict.AreEqual vbNullString, "" ' both empty strings under twinBASIC equality

' Still fails — Strict comparisons are case-sensitive:
Strict.AreEqual "Hello", "hello"
```

## Diagnostic outcome

### Succeed

Records that the test reached this point without failure.

Syntax: **Strict.Succeed**

A test procedure that returns without any assertion having failed is reported as passing implicitly, so calling **Succeed** explicitly is rarely necessary. It is occasionally useful in branches that would otherwise look ambiguous about their outcome — for example, the body of a loop that should reach the end.

### Fail

Unconditionally records a test failure.

Syntax: **Strict.Fail** [ *Message* ]

*Message*
: *optional* A **String** describing the failure, recorded together with the source location of the call.

Use **Fail** to mark code paths that should be unreachable in a passing test — most often after a call that is expected to raise an error, in a branch that runs when the call returned normally instead.

```tb
On Error Resume Next
target.SomethingThatShouldRaise
If Err.Number = 0 Then Strict.Fail "expected an error, got success"
```

### Inconclusive

Records the test as inconclusive — neither a pass nor a failure.

Syntax: **Strict.Inconclusive** [ *Message* ]

*Message*
: *optional* A **String** describing why the result is inconclusive.

Use **Inconclusive** when a precondition for the test could not be established, so that the assertion logic that follows would be meaningless. A common case is a setup step that failed to find a required external resource — a test database, a configured network endpoint — where the test itself is neither passing nor failing on its own merits.

## Equality

### AreEqual

Asserts that *Actual* is equal to *Expected*.

Syntax: **Strict.AreEqual** *Expected*, *Actual* [, *Message* ]

*Expected*
: *required* A **Variant** holding the expected value.

*Actual*
: *required* A **Variant** holding the value produced by the code under test.

*Message*
: *optional* A **String** included in the failure record if the comparison fails.

The comparison follows this module's [comparison semantics](#comparison-semantics) — strings are compared case-sensitively, object references are compared by identity, and everything else uses normal twinBASIC equality (so numeric promotions apply and `vbNullString` matches `""`). If either operand is **Null**, the assertion fails — `Null` is never equal to anything; use [**IsNull**](#isnull) to test for **Null** explicitly.

### AreNotEqual

Asserts that *Actual* is not equal to *Expected*.

Syntax: **Strict.AreNotEqual** *Expected*, *Actual* [, *Message* ]

*Expected*
: *required* A **Variant** holding a value that *Actual* must differ from.

*Actual*
: *required* A **Variant** holding the value produced by the code under test.

*Message*
: *optional* A **String** included in the failure record if the values are equal.

Comparison uses this module's [comparison semantics](#comparison-semantics). If either operand is **Null**, the assertion passes — `Null` is never equal to anything.

### AreSame

Asserts that *Actual* and *Expected* refer to the *same* object — equivalent to `Expected Is Actual`.

Syntax: **Strict.AreSame** *Expected*, *Actual* [, *Message* ]

*Expected*
: *required* A **Variant** holding the expected object reference.

*Actual*
: *required* A **Variant** holding the reference produced by the code under test.

*Message*
: *optional* A **String** included in the failure record if the references differ.

Reference identity is independent of the module's other comparison rules — **AreSame** always uses the **Is** operator, never default-member equality. To compare values rather than references, use [**AreEqual**](#areequal).

### AreNotSame

Asserts that *Actual* and *Expected* refer to *different* objects — equivalent to `Expected IsNot Actual`.

Syntax: **Strict.AreNotSame** *Expected*, *Actual* [, *Message* ]

*Expected*
: *required* A **Variant** holding a reference that *Actual* must differ from.

*Actual*
: *required* A **Variant** holding the reference produced by the code under test.

*Message*
: *optional* A **String** included in the failure record if the references are the same.

## Boolean

### IsTrue

Asserts that *Condition* evaluates to **True**.

Syntax: **Strict.IsTrue** *Condition* [, *Message* ]

*Condition*
: *required* A **Variant** holding the condition to test. The value is interpreted as a **Boolean** — zero is **False**, any non-zero value is **True**.

*Message*
: *optional* A **String** included in the failure record if the condition is **False**.

If *Condition* is **Null**, the assertion fails.

### IsFalse

Asserts that *Condition* evaluates to **False**.

Syntax: **Strict.IsFalse** *Condition* [, *Message* ]

*Condition*
: *required* A **Variant** holding the condition to test. Zero is **False**, any non-zero value is **True**.

*Message*
: *optional* A **String** included in the failure record if the condition is **True**.

If *Condition* is **Null**, the assertion fails — `Null` is neither **True** nor **False**.

## Reference and value state

### IsNothing

Asserts that *Value* is the **Nothing** object reference.

Syntax: **Strict.IsNothing** *Value* [, *Message* ]

*Value*
: *required* A **Variant** holding the object reference to test.

*Message*
: *optional* A **String** included in the failure record if *Value* refers to an object.

This is the object-reference test, equivalent to `Value Is Nothing`. To check for the **Null** value of a **Variant** instead, use [**IsNull**](#isnull).

### IsNotNothing

Asserts that *Value* refers to an object — i.e. is *not* the **Nothing** reference.

Syntax: **Strict.IsNotNothing** *Value* [, *Message* ]

*Value*
: *required* A **Variant** holding the object reference to test.

*Message*
: *optional* A **String** included in the failure record if *Value* is **Nothing**.

### IsNull

Asserts that *Value* is the **Null** value of a **Variant**.

Syntax: **Strict.IsNull** *Value* [, *Message* ]

*Value*
: *required* A **Variant** holding the value to test.

*Message*
: *optional* A **String** included in the failure record if *Value* is not **Null**.

Equivalent to checking [**IsNull**](../../Modules/Information/IsNull)`(Value) = True`. To check for the **Nothing** object reference instead, use [**IsNothing**](#isnothing).

### IsNotNull

Asserts that *Value* is not the **Null** value of a **Variant**.

Syntax: **Strict.IsNotNull** *Value* [, *Message* ]

*Value*
: *required* A **Variant** holding the value to test.

*Message*
: *optional* A **String** included in the failure record if *Value* is **Null**.

## Sequence

### SequenceEquals

Asserts that *Actual* and *Expected* contain the same number of elements, in the same order, with each pair of elements equal under this module's [comparison semantics](#comparison-semantics).

Syntax: **Strict.SequenceEquals** *Expected*, *Actual* [, *FailMessage* ]

*Expected*
: *required* A **Variant** holding an array, **Collection**, or other enumerable value.

*Actual*
: *required* A **Variant** holding the sequence produced by the code under test.

*FailMessage*
: *optional* A **String** included in the failure record if the sequences differ.

Both arguments must support iteration via **For Each**. The assertion fails on the first mismatched pair, on a length difference, or if one side is empty while the other is not. Element comparison uses the same per-pair rules as [**AreEqual**](#areequal), so string elements are compared case-sensitively while numbers compare under normal twinBASIC equality.

### NotSequenceEquals

Asserts that *Actual* and *Expected* differ — they contain a different number of elements, or at least one pair of corresponding elements differs under this module's [comparison semantics](#comparison-semantics).

Syntax: **Strict.NotSequenceEquals** *Expected*, *Actual* [, *FailMessage* ]

*Expected*
: *required* A **Variant** holding an array, **Collection**, or other enumerable value.

*Actual*
: *required* A **Variant** holding the sequence produced by the code under test.

*FailMessage*
: *optional* A **String** included in the failure record if the sequences are equal.

## See Also

- [Exact](Exact) -- the strictest comparison flavour: datatypes must match and conversions never happen
- [Permissive](Permissive) -- like **Strict**, but with case-insensitive string comparisons and default-member object equality
- [Assert package](.) -- overview of all three modules and the comparison-semantics table
