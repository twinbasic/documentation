---
title: Clear
parent: Collection
permalink: /tB/Modules/Collection/Clear
vba_attribution: true
---
# Clear
{: .no_toc }

Removes all elements from a **Collection** object. After **Clear** returns, the collection's [**Count**](Count) is zero.

Syntax: *object*.**Clear**

*object*
: *required* An object expression that evaluates to a **Collection** object.

> [!NOTE]
>
> **Clear** is a twinBASIC extension; the classic VBA **Collection** object has no **Clear** method. The same effect in VBA requires repeatedly removing the first item until the collection is empty.

Use **Clear** to reset a **Collection** to its initial, empty state when you want to reuse the object without creating a new instance.

### Example

```tb
Dim MyClasses As New Collection
MyClasses.Add "first"
MyClasses.Add "second"
MyClasses.Add "third"
Debug.Print MyClasses.Count   ' Prints 3.

MyClasses.Clear
Debug.Print MyClasses.Count   ' Prints 0.
```

### See Also

- [Count](Count) property
- [Remove](Remove) method
