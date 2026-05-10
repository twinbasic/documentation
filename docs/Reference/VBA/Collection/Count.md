---
title: Count
parent: Collection Module
permalink: /tB/Modules/Collection/Count
---
# Count
{: .no_toc }

Returns a **Long** containing the number of items in a **Collection** object. Read-only.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to a **Collection** object.

### Example

This example uses the **Collection** object's **Count** property to specify how many iterations are required to remove all the elements of the collection called `MyClasses`. Collection numeric indexes start at 1 by default. Because collections are reindexed automatically when a removal is made, the following code removes the first member on each iteration.

```tb
Dim Num As Long, MyClasses As Collection
Set MyClasses = New Collection
' ... assume MyClasses has been populated ...

For Num = 1 To MyClasses.Count   ' Default collection numeric indexes
    MyClasses.Remove 1           ' begin at 1.
Next
```

### See Also

- [Add](Add) method
- [Item](Item) method
- [Remove](Remove) method
- [Clear](Clear) method

{% include VBA-Attribution.md %}
