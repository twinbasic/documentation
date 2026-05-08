---
title: CompilerVersion
parent: Compilation Module
permalink: /tB/Modules/Compilation/CompilerVersion
---
# CompilerVersion
{: .no_toc }

Returns the twinBASIC compiler version number.

Syntax: **CompilerVersion** [ **()** ]

The return value is a **Long** identifying the compiler that produced the running code.

### Example

```tb
Debug.Print "Built with twinBASIC compiler build #" & CompilerVersion()
```

### See Also

- [ProcessorArchitecture](ProcessorArchitecture) function
