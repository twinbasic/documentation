---
title: Memory
parent: IDE
# nav_order: 
permalink: /tB/IDE/Project/Memory
---

# Memory

![The Memory 1 pane showing only its toolbar row: a refresh button, an empty box prompting for an expression to watch, a display format dropdown set to Byte (Hex), and a column count dropdown set to Cols 16. No memory contents are listed.](Images/Memory.png)

The Memory pane displays the raw contents of process memory during a paused debugging session, with addresses in the left column and byte values on the right. It is useful for inspecting data structures at the byte level.

A toolbar runs along the top of the pane. The box marked **enter expression** takes the expression whose address is to be watched; the two dropdowns beside it set the display format --- **Byte (Hex)** above --- and the number of columns --- **Cols 16**. The refresh button on the left re-reads the memory at that address.

The pane lists nothing until an expression is entered during a paused debugging session, which is the state shown above. More than one Memory pane can be open at once, and the title bar numbers them; the pane above is **MEMORY 1**.
