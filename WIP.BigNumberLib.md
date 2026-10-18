# BigNumberLib --- working notes

The contributed BigNumberLib package, documented at `docs/Reference/Contributed/BigNumberLib/`,
its test project at `test/package-tests/BigNumberLib/`. This file holds what is known about the
package and is not on its pages yet, with the reason.

## Unconfirmed: AssignDivision near the library's capacity (1.0.4.0, BETA 1010)

Seen by one agent only, while it confirmed the hang of `AssignModulus` and `AssignAdditionModulus`
(the 1.0.4.0 WARNING on the BigNumber page). The owner's rule is that a defect goes on a page only
once a second, independent agent has reproduced it, so this stays here until one has.

- **Corrupt quotient, no error.** In a 32-bit program `AssignDivision` of a dividend of 4300 bits
  gave a quotient of 2173 bits (about 4280 expected); 4288 bits was right. In a 64-bit program a
  dividend of 4544 bits gave 2305 bits (about 4524 expected); 4300 bits was right. The edge is a
  dividend of FP_SIZE - 1 digits or more: over about 4288 bits (32-bit), 4480 bits (64-bit).
- **Cause, from the source.** TomsFastMath 0.13.1 `fp_div` sets `q.used = a.used + 2`; when that
  exceeds FP_SIZE (136 digits of 32 bits, 72 of 64), `fp_clamp` stops at a stray digit and the
  quotient's `used` is wrong. BigNumber.twin's `AssignDivision` calls `fp_div` with no guard.
- **Also seen:** `AssignDivision` hangs from the same edge as `AssignModulus`, since both go
  through `fp_div`, which drops the carry of `fp_mul_2d` when the normalised dividend does not
  fit.
- Both need a dividend beyond the 4096 bits the class supports, which a product that
  `AssignMultiplication` accepts can be.

**To settle it:** a raise-or-right case in `OverflowTests.twin` (as
`Overflow_ModulusOfANumberThatFillsTheLibrary_RaisesErrorOrIsRight`), a second agent with the
verifier brief, then the BigNumber page's overflow WARNING and `expect.json`.
