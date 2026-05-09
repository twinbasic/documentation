---
title: Unlock
parent: Statements
permalink: /tB/Core/Unlock
---
# Unlock
{: .no_toc }

Releases a lock acquired with the [**Lock**](Lock) statement, restoring access by other processes to the previously locked region of an open file.

The **Unlock** statement is documented together with **Lock** on the [**Lock, Unlock**](Lock) page.

Syntax:
> **Unlock** [ **#** ] *filenumber* **,** [ *recordrange* ]

The arguments to **Unlock** must match exactly the arguments of the corresponding **Lock** statement. See [**Lock, Unlock**](Lock) for full details.

> [!IMPORTANT]
> Be sure to remove all locks with an **Unlock** statement before closing a file or quitting your program. Failure to remove locks produces unpredictable results.

### See Also

- [**Lock** statement](Lock)
- [**Open** statement](Open)
- [**Close** statement](Close)

{% include VBA-Attribution.md %}
