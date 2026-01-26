---
title: Beep
parent: Interaction Module
permalink: /tB/Modules/Interaction/Beep
redirect_from:
-  /tB/Core/Beep
---
# Beep
{: .no_toc }

Sounds a tone through the computer's speaker.

Syntax: **Beep**

The frequency and duration of the beep depend on your hardware and system  software, and vary among computers.

### Example

This example uses the **Beep** statement to sound three consecutive tones  through the computer's speaker.

```vb
Dim I%
For I = 1 To 3   ' Loop 3 times.
   Beep          ' Sound a tone.
Next I
```

{% include VBA-Attribution.md %}