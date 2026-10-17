---
title: PrivateFontCollection
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/PrivateFontCollection
has_toc: false
---

# PrivateFontCollection class
{: .no_toc }

A set of fonts loaded from files or from memory for use by one program, without installing them.

A **PrivateFontCollection** starts empty. [**AddFontFile**](#addfontfile) and [**AddMemoryFont**](#addmemoryfont) put fonts into it, and [**FamilyCount**](FontCollection#familycount) and [**Families**](FontCollection#families), inherited from [**FontCollection**](FontCollection), list the families that result. To draw with one of them, pass the collection as the last argument of [**FontFamily**](FontFamily) or of [**Font**](Font), with the name of the family. The class mirrors the GDI+ [PrivateFontCollection](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-privatefontcollection) class.

Microsoft warns that a program must never load arbitrary fonts from sources it does not trust: the operating system requires elevated rights to install a font, so that every installed font is trusted.

## Creating

Syntax: *collection* **= PrivateFontCollection**( )

Syntax: *collection* **= New PrivateFontCollection**

<!-- test: Fx_FontCollectionTests.PrivateFontCollection_Create_ReturnsAnEmptyCollection, Fx_FontCollectionTests.PrivateFontCollection_New_ReturnsACollection, Fx_FontCollectionTests.PrivateFontCollection_AddFontFile_AddsTheFamilyOfTheFile, Fx_FontCollectionTests.PrivateFontCollection_AddFontFile_MissingFile_ReturnsFileNotFound, Fx_FontCollectionTests.PrivateFontCollection_FontFromTheCollection_IsAvailable -->
> [!WARNING] 0.9.45.0, BETA 1010
> Creating a **PrivateFontCollection** raises run-time error 438, *Object doesn't support this property or method*, and the result is **Nothing**. The statement `Debug.Assert TypeOf (Me) Is PrivateFontCollection` in the class raises it. Even with that statement removed, the constructor does not store the native collection it creates, so the object has no handle and **AddFontFile**, **AddMemoryFont** and the members of **FontCollection** fail with **InvalidParameter**. The class cannot be used until a version of the package corrects both.

## AddFontFile

Syntax: *status* **=** *collection*.**AddFontFile**( *filename* )

*filename*
: *required* A **String** with the path of a font file, such as a `.ttf` or an `.otf` file.

Adds the fonts of the file to the collection and returns a [**GpStatus**](Enumerations/GpStatus): **Ok** for success, **FileNotFound** when the file does not exist. The families of the file are in [**Families**](FontCollection#families) afterwards.

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()

Dim fonts As PrivateFontCollection = PrivateFontCollection()
Dim status As GpStatus = fonts.AddFontFile(Environ$("TEMP") & "\MyFont.ttf")
If status = Ok Then
    Dim f As GdiPlus.Font = Font(fonts.Families(1).FamilyName, 14!, FontStyleRegular, UnitPoint, fonts)
End If
```

## AddMemoryFont

Syntax: *status* **=** *collection*.**AddMemoryFont**( *memAddress*, *length* )

*memAddress*
: *required* A **LongPtr** with the address of the font data, such as a font file read into a **Byte** array or locked from a resource.

*length*
: *required* A **Long** with the number of bytes at *memAddress*.

Adds the fonts in the block of memory to the collection and returns a [**GpStatus**](Enumerations/GpStatus). GDI+ does not copy the data: the block must stay valid, and unchanged, until the collection is released.

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()

Dim fonts As PrivateFontCollection = PrivateFontCollection()
Dim data(0 To 65535) As Byte
' ... read the bytes of a font file into data ...
Debug.Print fonts.AddMemoryFont(VarPtr(data(0)), UBound(data) + 1)
```

## See Also

- [FontCollection](FontCollection) class -- the members this class inherits
- [InstalledFontCollection](InstalledFontCollection) class -- the fonts installed on the system
- [FontFamily](FontFamily) class
- [Font](Font) class
- [PrivateFontCollection class](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-privatefontcollection) -- Microsoft's GDI+ reference
