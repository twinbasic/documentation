# ArrayListLib --- working notes

The contributed ArrayListLib package, documented at `docs/Reference/Contributed/ArrayListLib/`. This
file holds what its section decided and what is known about the package beyond its pages; the
rules for every contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

**Listed under Experimental Packages** (owner): ArrayListLib does not compile on BETA 1042. It is documented from its source and a copy of it that builds, and its samples are compile-only. In a copy of ArrayListLib 1.6.151.1 with the arguments of its three `VSwap` calls passed `ByVal` and `LSetByVal` taking a `LongPtr`, a For Each over a list with no items fails, ToString of such a list never returns, Reverse keeps the middle pair of an even run in place and a second GetEnumerator over a list ignores its arguments.
