---
title: cCsv
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cCsv
has_toc: false
---

# cCsv class
{: .no_toc }

A **cCsv** holds a table of text in memory and reads and writes it as a file of comma-separated values (CSV). The table is a dictionary of lines, [**Data**](#data), and each line is a dictionary of fields. [**NewLine**](#newline) and [**NewColumn**](#newcolumn) build the table, [**GetLine**](#getline) and [**value**](#value) read it, and [**LoadFrom**](#loadfrom) and [**SaveTo**](#saveto) read and write the file. The package keeps one ready-made instance, [**TBMAN.Csv**](TBMAN#csv).

In version 1.0.0.5 the class of this name was a reader and writer of INI files. That code is now the class [**cIni**](cIni).

```tb check_build check_run
Dim T As New cCsv
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-table.csv"

T.NewLine "id", "name", "note"
T.NewLine 1, "Ann", "x,y"
T.NewLine 2, "Bob"
Debug.Print T.SaveTo(Path)

Dim R As New cCsv
R.LoadFrom Path
Debug.Print R.Data.Count
Debug.Print R.value(2, 3)
Debug.Print "[" & R.value(3, 3) & "]"
Kill Path
' Output:
' True
' 3
' x,y
' []
```

* TOC
{:toc}

## How the table is held

- [**Data**](#data) is a **Scripting.Dictionary**. Its keys are the line numbers, from 1, and each item is a **Scripting.Dictionary** that holds one line.
- A line has the column numbers, from 1, as keys and the fields as items. A field is a **String** when it was read from a file, and any value when it was added with **NewLine**.
- The first line is an ordinary line. By default the class treats it as the line of titles ([**IsFirstLineToHead**](#isfirstlinetohead)), but it is stored in **Data** like the others, and [**SaveTo**](#saveto) writes it first.
- [**HeadTitle**](#headtitle) and [**HeadTitleWidth**](#headtitlewidth) hold a title and a column width for each column. They are for a program that shows the table in a list control; the class stores them and does not draw anything.
- Every line has as many columns as the first line. A line that is added with fewer fields is filled with empty strings, and one with more loses the fields at the end.

## The file format

- **LoadFrom** reads a line at a time and splits it at the character in [**Delimiter**](#delimiter), `,` by default. **SaveTo** joins the fields with the same character and ends each line with a carriage return and line feed.
- A field may be enclosed in double quotes. Inside quotes the delimiter is part of the field, and a pair of double quotes stands for one. **LoadFrom** removes the enclosing quotes. **SaveTo** adds them to a field that holds the delimiter or a double quote, and to no other.
- **LoadFrom** removes the spaces at both ends of every field, also of a quoted one. **SaveTo** does not add or remove any.
- A field cannot hold a line break. **LoadFrom** reads one line at a time, so a quoted field that continues on the next line is read as two lines. **SaveTo** writes a line break inside a field as it is, and the file then has more lines than the table.
- The files are opened as ANSI text, in the code page of the system, not as Unicode or UTF-8, and **SaveTo** cannot write a character that the code page does not have (see the warning at **SaveTo**).
- A line that is empty or holds only spaces is skipped. Its number is still counted, so the numbers of the lines in **Data** have a gap there.

## Fields and properties

### CurrentLineDic
{: .no_toc }

A **Scripting.Dictionary** field, declared `Public CurrentLineDic As New Scripting.Dictionary`. The line that was last added or fetched: [**NewLine**](#newline) and [**GetLine**](#getline) set it, [**SetCurrentLineData**](#setcurrentlinedata) changes it, and [**Reset**](#reset) empties it. It is the same dictionary object as the line in [**Data**](#data), so a change to one is a change to the other. After [**SetLine**](#setline) it is **Nothing**, and the next use creates an empty dictionary.

### CurrentLineNumber
{: .no_toc }

A **Long** field, 0 at the start. The number of the line in [**CurrentLineDic**](#currentlinedic). **NewLine** and **GetLine** set it. [**LoadFrom**](#loadfrom) does not.

### Data
{: .no_toc }

A **Scripting.Dictionary** field: the table. The keys are the line numbers and the items are the dictionaries of the lines; see *How the table is held*. [**LoadFrom**](#loadfrom) replaces it with a new dictionary, and [**Reset**](#reset) empties it.

### Delimiter
{: .no_toc }

A **String** field, `,` at the start and after a [**Reset**](#reset) that is not given *OnlyData*. The character that separates the fields; it should be one character, because a longer text never matches a character of the line when a file is read.

### HasHeadTitle
{: .no_toc }

A **Boolean** field, **True** at the start. Nothing in the class reads it.

### HeadTitle
{: .no_toc }

A **Scripting.Dictionary** field: the title of each column, with the column numbers as keys. [**NewLine**](#newline) and [**LoadFrom**](#loadfrom) fill it with the text `(无标题)`, a Chinese phrase that means *no title*, for each column that has none, and [**NewColumn**](#newcolumn) stores the title it is given. [**LoadFrom**](#loadfrom) does not take the titles from the first line of the file.

### HeadTitleWidth
{: .no_toc }

A **Scripting.Dictionary** field: the width of each column, with the column numbers as keys, in the units of the program's list control (twips, from the default). It is filled with [**HeadTitleWidthDefault**](#headtitlewidthdefault) for each column that has none, and [**SetHeadTitleWidth**](#setheadtitlewidth) and [**NewColumn**](#newcolumn) change it.

### HeadTitleWidthAuto
{: .no_toc }

A **Boolean** field, **False** at the start. Meant to say that the widths follow the text. Nothing in the class reads it.

### HeadTitleWidthDefault
{: .no_toc }

A **Long** field, 1500 at the start and after a **Reset** that is not given *OnlyData*. The width given to a column that has none.

### HeadTitleWidthMax
{: .no_toc }

A **Long** field, 8000 at the start and after a **Reset** that is not given *OnlyData*. [**SetHeadTitleWidth**](#setheadtitlewidth) lowers a width that is greater than this.

### HeadTitleWidthWord
{: .no_toc }

A **Long** field, 0 at the start. Meant to hold the width of one double-byte character. Nothing in the class reads it.

### IsFirstLineToHead
{: .no_toc }

A **Boolean** field, **True** at the start and after a **Reset** that is not given *OnlyData*. It decides what [**NewColumn**](#newcolumn) puts in the first line of the new column: the title when it is **True**, the content when it is **False**.

### LastError
{: .no_toc }

A **String** field. The text of the last error that a method caught: [**GetLine**](#getline), [**SetLine**](#setline), [**SetCurrentLineData**](#setcurrentlinedata), [**SetHeadTitleWidth**](#setheadtitlewidth), [**value**](#value) and [**DeleteColumn**](#deletecolumn) set it to a Chinese text that means *line number does not exist* or *column number does not exist*, and [**LoadFrom**](#loadfrom) and [**SaveTo**](#saveto) set it to the error number, a `#` and the description of the error (and, for **LoadFrom**, a colon and the path).

No call clears it, and **Reset** does not. A successful call leaves the text of an earlier failure in it. **LoadFrom** sets it, also when the file is read, to a Chinese text that means *the content is empty* for each line that is skipped because it is blank.

### value
{: .no_toc }

Reads a field of the table.

Syntax: *object*.**value** ( *LineNumber* **,** *ColumnNumber* )

*LineNumber*
: *required* A **Long**, the key of the line in [**Data**](#data).

*ColumnNumber*
: *required* A **Long**, the number of the column.

Returns the field as a **Variant**. When the line or the column does not exist, the result is the integer 1 (the value of **vbNull**, which the source uses where it means a null) and [**LastError**](#lasterror) holds a Chinese text that says which of the two is missing.

The class declares a **Set** accessor for the property and no **Let** accessor, and neither works. `T.value(2, 3) = "x"` and `Set T.value(2, 3) = Nothing` each compile and raise an error (-2147467259 and -2147352567), and the field is not changed. To change a field, use [**SetCurrentLineData**](#setcurrentlinedata) or write into the dictionary of the line.

## Methods

### DeleteColumn
{: .no_toc }

Meant to remove a column from every line.

Syntax: *object*.**DeleteColumn** ( [ *ColumnNumber* ] ) **As Boolean**

*ColumnNumber*
: *optional* A **Long**, the column to remove. If it is left out, or 0, the last column of the current line is removed.

The function needs line 1 to exist; when it does not, it returns **False** and sets [**LastError**](#lasterror). Otherwise it removes the column from every line, its title and its width, and returns **True**. The other columns keep their numbers.

> [!WARNING] 1.0.0.29
> Only the last column can be removed without damage. A column in front of others leaves a gap in the column numbers, which the other methods do not expect. [**SaveTo**](#saveto) writes the columns for the numbers 1 to the new count of columns, so it writes an empty field in the place of the missing one and leaves out the last column: after removing column 2 of three, a line `a,b,c` is saved as `a,`. [**value**](#value) with the old numbers still finds the fields that remain.

```tb check_build check_run
Dim T As New cCsv
Dim Path As String
Dim Text As String
Path = Environ$("TEMP") & "\tbmanlib-docs-delete.csv"

T.NewLine "a", "b", "c"
T.NewLine "d", "e", "f"
T.DeleteColumn 2
Debug.Print T.Data(1).Count & " " & T.Data(1).Exists(2)
T.SaveTo Path

Open Path For Input As #1
Do Until EOF(1)
    Line Input #1, Text
    Debug.Print "[" & Text & "]"
Loop
Close #1
Kill Path
' Output:
' 2 False
' [a,]
' [d,]
```

### GetLine
{: .no_toc }

Makes a line the current line.

Syntax: *object*.**GetLine** ( *LineNumber* [ **,** *LineDic* ] ) **As Boolean**

*LineNumber*
: *required* A **Long**, the key of the line in [**Data**](#data).

*LineDic*
: *optional* A **Scripting.Dictionary** variable that is meant to receive the line. The variable that is passed is not changed, whether it is **Nothing** or holds a dictionary. Use [**CurrentLineDic**](#currentlinedic).

Sets [**CurrentLineDic**](#currentlinedic) and [**CurrentLineNumber**](#currentlinenumber) and returns **True**. When the line does not exist, returns **False** and sets [**LastError**](#lasterror).

```tb check_build check_run
Dim T As New cCsv
T.NewLine "id", "name"
T.NewLine 1, "Ann"
T.NewLine 2, "Bob"

Debug.Print T.GetLine(2)
Debug.Print T.CurrentLineNumber & " " & T.CurrentLineDic(2)
Debug.Print T.GetLine(9)
Debug.Print T.CurrentLineNumber
' Output:
' True
' 2 Ann
' False
' 2
```

### LoadFrom
{: .no_toc }

Reads a CSV file into [**Data**](#data).

Syntax: *object*.**LoadFrom** ( *FilePath* [ **,** *IsFirstHead* ] ) **As cCsv**

*FilePath*
: *required* A **String**, the file to read. The path is used as written: a name without a folder is looked for in the current folder of the program.

*IsFirstHead*
: *optional* A **Boolean**, **True** by default. It is meant to say that the first line holds the titles. The function does not use it: the titles are never taken from the file.

Returns the object itself. The file is read as described in *The file format*. **Data** is replaced when the file has been opened, with one line for each line of the file that is not blank, numbered by its place in the file. Lines with more fields than the first line are cut to its count, and shorter ones are filled with empty strings. [**HeadTitle**](#headtitle) and [**HeadTitleWidth**](#headtitlewidth) get an entry for each column that has none.

An error, such as a file that does not exist, is not raised. It is caught, [**LastError**](#lasterror) is set to its number, a `#`, the description, a colon and the path, and **Data** is not changed.

> [!NOTE] 1.0.0.29
> A blank line in the file leaves a gap in the line numbers of **Data**: for a file of three lines whose second is blank, the keys are 1 and 3, and the count is 2. [**NewLine**](#newline) numbers the new line with the count plus 1, which here is 3, a line that exists, and raises error 457, *This key is already associated with an element of this collection*. Lines can then not be added until the gap is gone.

```tb check_build check_run
Dim Path As String
Dim T As New cCsv
Path = Environ$("TEMP") & "\tbmanlib-docs-load.csv"

Open Path For Output As #1
Print #1, "id,name,note"
Print #1, "1, Ann ,""x,y"""
Print #1, ""
Print #1, "2,""say """"hi"""""",z"
Close #1

T.LoadFrom Path
Debug.Print T.Data.Count & " " & T.Data.Exists(3) & " " & T.Data.Exists(4)
Debug.Print T.value(2, 2) & "|" & T.value(2, 3)
Debug.Print T.value(4, 2)
Kill Path
' Output:
' 3 False True
' Ann|x,y
' say "hi"
```

### NewColumn
{: .no_toc }

Adds a column to every line.

Syntax: *object*.**NewColumn** ( *Title* [ **,** *Width* ] [ **,** *Content* ] ) **As Boolean**

*Title*
: *required* A **String**, the title of the column. It is stored in [**HeadTitle**](#headtitle), and it is the field of the first line when [**IsFirstLineToHead**](#isfirstlinetohead) is **True**.

*Width*
: *optional* A **Long**, the width. If it is 0 or left out, [**HeadTitleWidthDefault**](#headtitlewidthdefault) is used.

*Content*
: *optional* A **String**, the field for every other line, an empty string by default. With **IsFirstLineToHead** set to **False**, it is the field of the first line as well.

The new column gets the number after the last column of each line. A table with no lines gets no column, and no title.

> [!WARNING] 1.0.0.29
> The function always returns **False**, also when it has added the column: the result is never set. A program cannot use it to see whether the call worked.

```tb check_build check_run
Dim T As New cCsv
T.NewLine "id", "name"
T.NewLine 1, "Ann"
Debug.Print T.NewColumn("age", 700, "0")
Debug.Print T.value(1, 3) & " " & T.value(2, 3)
Debug.Print T.HeadTitle(3) & " " & T.HeadTitleWidth(3)
' Output:
' False
' age 0
' age 700
```

### NewLine
{: .no_toc }

Adds a line to the end of the table.

Syntax: *object*.**NewLine** ( [ *FieldsData* ] ) **As Boolean**

*FieldsData*
: *optional* Any number of values, in a **ParamArray**: the fields of the line. A **Null** or **Empty** value becomes an empty string. As the only argument, a **Scripting.Dictionary** with the column numbers as keys is copied, with its items, and the copy becomes the line; later changes to the dictionary do not reach the table.

The line gets the number after the count of the lines in [**Data**](#data). It is filled to the number of columns of the first line, or cut to it, and becomes the current line ([**CurrentLineDic**](#currentlinedic), [**CurrentLineNumber**](#currentlinenumber)). **HeadTitle** and **HeadTitleWidth** get an entry for each column that has none. Without arguments the line has one empty field, filled up to the width of the table. The first line of a table fixes the number of columns for all the others.

Returns **True**. An error is raised when the number is taken; see the note at [**LoadFrom**](#loadfrom).

```tb check_build check_run
Dim T As New cCsv
T.NewLine "id", "name", "note"
T.NewLine 1, "Ann", "x,y", "dropped"
T.NewLine 2
Debug.Print T.Data(2).Count & " " & T.Data(3).Count
Debug.Print "[" & T.value(3, 2) & "]"
Debug.Print T.CurrentLineNumber
' Output:
' 3 3
' []
' 3
```

### Reset
{: .no_toc }

Empties the table.

Syntax: *object*.**Reset** ( [ *OnlyData* ] )

*OnlyData*
: *optional* A **Boolean**, **False** by default. With **True**, only the table is emptied; the settings stay as they are.

Empties [**Data**](#data), [**HeadTitle**](#headtitle), [**HeadTitleWidth**](#headtitlewidth) and [**CurrentLineDic**](#currentlinedic), and sets [**CurrentLineNumber**](#currentlinenumber) to 0. Without *OnlyData*, it also sets [**Delimiter**](#delimiter), [**HasHeadTitle**](#hasheadtitle), [**HeadTitleWidthDefault**](#headtitlewidthdefault), [**HeadTitleWidthMax**](#headtitlewidthmax) and [**IsFirstLineToHead**](#isfirstlinetohead) to their values at the start. [**LastError**](#lasterror) is not cleared.

### SaveTo
{: .no_toc }

Writes the table to a CSV file.

Syntax: *object*.**SaveTo** ( *FilePath* ) **As Boolean**

*FilePath*
: *required* A **String**, the file to write. A file that exists is replaced. The folder must exist: the function does not create it.

Writes the lines of [**Data**](#data) in the order of their keys, each as described in *The file format*, and returns **True**. When an error occurs, such as a folder that does not exist, it returns **False** and [**LastError**](#lasterror) holds its number, a `#` and the description. The titles in [**HeadTitle**](#headtitle) are not written.

> [!WARNING] 1.0.0.29
> The file is created, or emptied if it exists, before the first field is written. When a field holds a character that the code page of the system does not have, such as `ChrW(&H4E2D)` on a system with the Western code page 1252, writing it fails with error 5, the function returns **False**, and the file is left with no content. The previous content of a file is lost.

```tb check_build check_run
Dim T As New cCsv
Dim Path As String
Dim Text As String
Path = Environ$("TEMP") & "\tbmanlib-docs-quote.csv"

T.NewLine "plain", "a,b", "say ""hi"""
T.Delimiter = ";"
T.NewLine "x;y", "a,b", " pad"
T.SaveTo Path

Open Path For Input As #1
Do Until EOF(1)
    Line Input #1, Text
    Debug.Print Text
Loop
Close #1
Kill Path
' Output:
' plain;a,b;"say ""hi"""
' "x;y";a,b; pad
```

### SetCurrentLineData
{: .no_toc }

Changes a field of the current line.

Syntax: *object*.**SetCurrentLineData** ( *ColumnNumber* **,** *Dat* [ **,** *LineDic* ] ) **As Boolean**

*ColumnNumber*
: *required* A **Long**, the column.

*Dat*
: *required* A **Variant**, the new field.

*LineDic*
: *optional* A **Scripting.Dictionary** variable. The parameter has no effect: the function works on [**CurrentLineDic**](#currentlinedic), and the variable that is passed is not changed.

Returns **True** when the field was changed. It returns **False** and sets [**LastError**](#lasterror) when the current line has no such column, which includes the case that the table has no current line.

### SetHeadTitleWidth
{: .no_toc }

Sets the width of a column.

Syntax: *object*.**SetHeadTitleWidth** ( *ColumnNumber* **,** *ColumnWidth* ) **As Boolean**

*ColumnNumber*
: *required* A **Long**, the column. It has to have an entry in [**HeadTitleWidth**](#headtitlewidth).

*ColumnWidth*
: *required* A **Long**, the width. A value above [**HeadTitleWidthMax**](#headtitlewidthmax) is replaced by it.

Returns **True** when the width was stored. Returns **False** and sets [**LastError**](#lasterror) when the column has no entry.

### SetHeadTitleWidthByDic
{: .no_toc }

Sets the widths of several columns.

Syntax: *object*.**SetHeadTitleWidthByDic** ( *Dic* ) **As Boolean**

*Dic*
: *required* A **Scripting.Dictionary** with column numbers as keys and widths as items.

For each key of *Dic* that has an entry in [**HeadTitleWidth**](#headtitlewidth), the width is stored; other keys are skipped. The widths are not limited by [**HeadTitleWidthMax**](#headtitlewidthmax).

> [!WARNING] 1.0.0.29
> The function always returns **False**, also when it has stored the widths: the result is never set.

### SetLine
{: .no_toc }

Replaces a line of the table.

Syntax: *object*.**SetLine** ( *LineNumber* **,** *LineDic* ) **As Boolean**

*LineNumber*
: *required* A **Long**, the key of a line that exists in [**Data**](#data).

*LineDic*
: *required* A **Scripting.Dictionary** with the column numbers as keys.

Fills *LineDic* or cuts it to the number of columns of the first line, stores it in **Data** under *LineNumber* in place of the old line, and returns **True**. The dictionary itself is stored, not a copy, so later changes to it change the table. When the line does not exist, the function returns **False** and sets [**LastError**](#lasterror). [**CurrentLineDic**](#currentlinedic) is **Nothing** afterwards, and until the next [**GetLine**](#getline) or [**NewLine**](#newline) [**SetCurrentLineData**](#setcurrentlinedata) returns **False**.

## See Also

- [TBMAN](TBMAN) module -- the shared instance **TBMAN.Csv**
- [cIni](cIni) class -- reads and writes INI files; the code that this class held in version 1.0.0.5
- [ToolsDic](ToolsDic) module -- **DeepCopy**, which **NewLine** uses for a dictionary
- [TBMANLIB](.) package -- overview
