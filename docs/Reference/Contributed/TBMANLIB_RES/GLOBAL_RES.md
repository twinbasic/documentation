---
title: TBMAN
parent: TBMANLIB_RES Package
permalink: /tB/Packages/Contributed/TBMANLIB_RES/TBMAN
has_toc: false
---

# TBMAN module
{: .no_toc }

A standard module that exposes a pre-instantiated [**cRes**](cRes/) object as a public variable, providing package-wide access to resource loading without requiring a separate **cRes** instance.

## Members

### Res

A pre-instantiated **cRes** object.

```tb check_build
Public Res As New cRes
```

Because of **As New**, the instance is created automatically the first time **Res** is referenced. It provides the same interface as a manually constructed **cRes** instance: [**Read**](cRes/Read), [**ReturnBytes**](cRes/ReturnBytes), [**ReturnString**](cRes/ReturnString), [**ReturnHex**](cRes/ReturnHex), [**ReturnBase64**](cRes/ReturnBase64), and [**ReturnPicture**](cRes/ReturnPicture).

> [!NOTE]
> **TBMAN.Res** is a single shared instance for the entire project. Calling **Res.Read** replaces its internal byte buffer. If multiple callers read different resources in the same execution path, use separate **cRes** instances rather than sharing **TBMAN.Res**.

## Example

This example loads a PNG resource and assigns it to a **PictureBox** control.

```tb check_build
Private Sub Form_Load()
    Picture1.Picture = TBMAN.Res.Read(101, "PNG").ReturnPicture()
End Sub
```

## See Also

- [cRes](cRes/) class -- loads and converts binary resources embedded in the project
- [TBMANLIB_RES](.) package -- overview
