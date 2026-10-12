---
title: JsonHit
parent: tsJson Package
permalink: /tB/Packages/Contributed/tsJson/JsonHit
has_toc: false
---

# JsonHit class
{: .no_toc }

A **JsonHit** is one result of a JSONPath query: the value that was selected, and the RFC 6901 JSON Pointer of the place where it was found. [**Json.QueryHits**](Json#queryhits) and [**JsonPathQuery.QueryHits**](JsonPathQuery#queryhits) return arrays of them. The pointer can be passed to [**Json.PointerGet**](Json#pointerget), [**PointerSet**](Json#pointerset) and [**PointerRemove**](Json#pointerremove) to read or change that place.

```tb check_build check_run
Dim hits() As JsonHit = Json.QueryHits(Json.Parse("{""a"":[10,20]}"), "$.a[*]")
Dim i As Long
For i = LBound(hits) To UBound(hits)
    Debug.Print hits(i).Pointer & " = " & hits(i).Value
Next

Dim root() As JsonHit = Json.QueryHits(Json.Parse("[1]"), "$")
Debug.Print "[" & root(LBound(root)).Pointer & "]"
' Output:
' /a/0 = 10
' /a/1 = 20
' []
```

* TOC
{:toc}

## Properties

### Pointer
{: .no_toc }

The JSON Pointer of the hit. A **String**, read-only.

Syntax: *text* **=** *hit***.Pointer**

Returns the pointer, such as `/store/book/1/title`. The pointer of the document itself is the empty string. Keys are escaped, so a key that holds `/` or `~` appears as `~1` or `~0`.

### Value
{: .no_toc }

The value that was selected. A **Variant**, read-only.

Syntax: *value* **=** *hit***.Value**

Returns the value. A JSON null is **Null**. An object or an array is returned itself, not a copy, so it is the container inside the document.

## See Also

- [JsonPathQuery](JsonPathQuery) class -- runs a compiled path
- [Json](Json#queryhits) module -- **QueryHits** for a path in text
- [tsJson Package](.) -- the package
