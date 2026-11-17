# Generics --- working notes

The contributed Generics package, documented at `docs/Reference/Contributed/Generics/`. This file
holds what its section decided and what is known about the package beyond its pages; the rules for
every contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

Generics (tuple classes) is one page (owner), so `analyze` in audit mode lists its classes and members as undocumented.

Generics' `exclude_from_docs` names its test code, `HelloWorldModule`, which the page does not mention.

**Listed under Experimental Packages** (owner): Generics 1.0.0.0, the newest on TWINSERV, does not compile on BETA 1042 (owner, 2026-11-09): the WinDevLib 8.9.518.0 it embeds through WinDevLibImpl has six `Delegate Function` declarations with no `As` clause, which BETA 1042 reports as TB0003, and WinDevLib's own settings make TB0003 an error; it has no test project (git history holds one, for a version that compiles), and its `compile/` holds the six package rows beside its four compile cases.
