---
title: Timer
parent: DateTime Module
permalink: /tB/Modules/DateTime/Timer
redirect_from:
-  /tB/Core/Timer
vba_attribution: true
---
# Timer
{: .no_toc }

Returns a **Single** representing the number of seconds elapsed since midnight.

Syntax: **Timer**

The **Timer** function returns fractional portions of a second.

### Example

This example uses the **Timer** function to measure elapsed time.

```tb
Dim Start As Single, Finish As Single
Start = Timer                   ' Record start time.
' ... perform some operation ...
Finish = Timer                  ' Record end time.
Debug.Print "Elapsed: " & Finish - Start & " seconds"
```

### See Also

- [Time](Time) property
- [Now](Now) function
