---
title: Clear
parent: DataObject Module
permalink: /tB/Packages/VBRUN/DataObject/Clear
---
# Clear
{: .no_toc }

Removes every value and format from the **DataObject**, returning it to the empty state it had immediately after **New**.

Syntax: *object*.**Clear**

*object*
: *required* An object expression that evaluates to a **DataObject**.

After **Clear** returns, [**GetFormat**](GetFormat) reports **False** for every format and [**AvailableFormats**](AvailableFormats) is empty. Use **Clear** when reusing a single **DataObject** for several operations, so that values from the previous operation cannot leak into the next one.

### Example

```tb
Dim Data As New DataObject
Data.SetData "First payload", vbCFText
' ... use Data ...

Data.Clear
Data.SetData "Second payload", vbCFText
```

### See Also

- [SetData](SetData) method
- [AvailableFormats](AvailableFormats) method
