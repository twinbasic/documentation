# DetoursLib --- working notes

The contributed DetoursLib package, documented at `docs/Reference/Contributed/DetoursLib/`. This
file holds what its section decided and what is known about the package beyond its pages; the
rules for every contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

DetoursLib's `exclude_from_docs` names its demonstration module, `DetoursTest` (message boxes), which its landing page describes in a paragraph.

Its test cases run in the IDE's own process, so each detours `MulDiv` of kernel32 and answers for itself only for one marked argument, passing every other call (another thread's included) to the original.

`CreateDetourAtFuncAddress` does not check a *newAddress* of 0, and SlimDetours then reads address 0 inside a transaction that has the process's other threads suspended; no case tries it, since it would leave the IDE frozen, and the page states the missing check from the source alone.
