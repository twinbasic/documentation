# Assert Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide.

Three sibling modules — `Exact`, `Strict`, `Permissive` — that expose the **same 15-member API**; only the comparison semantics differ:

| Module        | String comparisons | Other comparisons                                                              |
|---------------|--------------------|--------------------------------------------------------------------------------|
| `Exact`       | case-sensitive     | no implicit conversions; datatypes must match exactly (`5 <> 5.0`); `vbNullString <> ""`; `Empty` distinct from `0` / `False` / `""`; object default members **not** evaluated |
| `Strict`      | case-sensitive     | evaluated as if written directly in twinBASIC; object default members **not** evaluated |
| `Permissive`  | case-insensitive   | evaluated as if written directly in twinBASIC                                  |

`Null` is never equal to anything (not even itself) under any of the three flavours — use `IsNull` / `IsNotNull` to test for it.

The 15 members per module (identical signatures across all three):

| Member                                          | Purpose                                                          |
|-------------------------------------------------|------------------------------------------------------------------|
| `Succeed()`                                     | unconditionally records a pass                                   |
| `Fail([Message])`                               | unconditionally records a failure                                |
| `Inconclusive([Message])`                       | records an inconclusive / skipped result                         |
| `AreEqual(Expected, Actual, [Message])`         | value-equality assertion                                         |
| `AreNotEqual(Expected, Actual, [Message])`      | inverse of `AreEqual`                                            |
| `AreSame(Expected, Actual, [Message])`          | reference-identity (`Is`) assertion for objects                  |
| `AreNotSame(Expected, Actual, [Message])`       | inverse of `AreSame`                                             |
| `IsTrue(Condition, [Message])`                  | asserts the condition is `True`                                  |
| `IsFalse(Condition, [Message])`                 | asserts the condition is `False`                                 |
| `IsNothing(Value, [Message])`                   | asserts the object reference is `Nothing`                        |
| `IsNotNothing(Value, [Message])`                | inverse of `IsNothing`                                           |
| `IsNull(Value, [Message])`                      | asserts the value is `Null`                                      |
| `IsNotNull(Value, [Message])`                   | inverse of `IsNull`                                              |
| `SequenceEquals(Expected, Actual, [FailMessage])`    | element-by-element comparison of two sequences / arrays      |
| `NotSequenceEquals(Expected, Actual, [FailMessage])` | inverse of `SequenceEquals`                                  |

Surface each member as if it were an ordinary `Sub` (e.g. `Sub AreEqual(Expected, Actual, [Message])`); the source-side `Lib "<assert{exact,strict,permissive}>"` / `Alias "#N"` / `PreserveSig` / `DeclareWide` decoration is internal pseudo-DLL plumbing and is **not** surfaced. Call out `[DebugOnly(True)]` (assertions compile out of release builds) and `[MustBeQualified(True)]` (callers must write the module name, e.g. `Strict.IsTrue(x)`).

Layout: one page per module, listing all 15 members inline under `## <Member>` headings (deep-linkable as `…/Strict#areequal`). Replicating 15 × 3 = 45 near-duplicate pages would add noise without value.
