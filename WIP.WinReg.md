# WinReg --- working notes

The contributed WinReg package, documented at `docs/Reference/Contributed/WinReg/`. This file holds
what its section decided and what is known about the package beyond its pages; the rules for every
contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

**Listed under Experimental Packages** (owner): WinReg does not compile on BETA 1042. It is documented from its source and a copy of it that builds. Its samples are not marked `check_build` at all, because under four lanes its template's compile outruns the 10 s limit: mark them again when a version of WinReg compiles. In a copy of WinReg's source with its four failing calls passed `ByVal`, ReadString, GetRegistryValueType and the first ConvertValueToString give wrong results.
