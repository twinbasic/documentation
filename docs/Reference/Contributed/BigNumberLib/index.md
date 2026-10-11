---
title: BigNumberLib Package
parent: Contributed Packages
has_toc: false
indexed_from: 0.0.0.0
permalink: /tB/Packages/Contributed/BigNumberLib/
---

# BigNumberLib Package
{: .no_toc }

**Author:** WaynePhillipsEA

The **BigNumberLib** contributed package provides arbitrary-precision signed integer arithmetic for twinBASIC.

> [!NOTE]
> Version 0.0.0.0 does not compile in twinBASIC BETA 1005, so a project that references it does not build. **BigNumber** passes `vbNullPtr` to the `ByRef` *remainder* structure parameter of `fp_div` and `fp_div_2d`, where a null pointer for a structure has to be passed as `ByVal vbNullPtr` (error TB5001).

## Classes

- [BigNumber](BigNumber) -- arbitrary-precision signed integer backed by the TomsFastMath (libtfm) C library, supporting numbers up to 4096 bits.
