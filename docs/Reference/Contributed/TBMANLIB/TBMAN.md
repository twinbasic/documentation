---
title: TBMAN
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/TBMAN
has_toc: false
---

# TBMAN module
{: .no_toc }

The module that gives the package its name. It holds one ready-made instance of each of the package's classes, as public variables, and a **Version** property. A program can use them without a `New`, and every part of the program shares the same instance of each.

```tb check_build check_run
TBMAN.Json.Clear
TBMAN.Json.Decode "{""name"":""Ann""}"
Debug.Print TBMAN.Json.Item("name")
Debug.Print TypeName(TBMAN.Json)
' Output:
' Ann
' cJson
```

The variables are declared `As New`, so each object is created the first time it is used. Because the instance is shared, its state is shared: the document in [**Json**](#json), the data in [**Csv**](#csv) and the settings in [**Logs**](#logs) are the same wherever the program reads them. A program that needs two documents, or logs with different settings, makes its own objects with `New`.

The package [TBMANLIB_RES](../TBMANLIB_RES/TBMAN) also has a module named **TBMAN**. The name of the package can be put in front of the name of the module, as `TBMANLIB.TBMAN.Json`, to say which module is meant.

```tb check_build check_run
Debug.Print TypeName(TBMANLIB.TBMAN.Json)
' Output:
' cJson
```

* TOC
{:toc}

## Members

### Csv
{: .no_toc }

A shared [**cCsv**](cCsv): in version 1.0.0.5, the reader and writer of INI files.

Syntax: **TBMAN.Csv** **As cCsv**

### Ini
{: .no_toc }

A shared **cIni**. The class has no members; see [Types without members](.#types-without-members).

Syntax: **TBMAN.Ini** **As cIni**

### Json
{: .no_toc }

A shared [**cJson**](cJson), a JSON document that can be read from and written to text and files.

Syntax: **TBMAN.Json** **As cJson**

Call [**Clear**](cJson#clear) before decoding a new document into it: the shared object keeps whatever an earlier part of the program stored.

### Layer
{: .no_toc }

A shared [**cLayer**](cLayer), which shows a message box.

Syntax: **TBMAN.Layer** **As cLayer**

### Logs
{: .no_toc }

A shared [**cLogs**](cLogs), which writes log lines.

Syntax: **TBMAN.Logs** **As cLogs**

### TimerUse
{: .no_toc }

A shared [**cTimeuse**](cTimeuse), a stopwatch.

Syntax: **TBMAN.TimerUse** **As cTimeuse**

### Version
{: .no_toc }

Returns a version number as text.

Syntax: **TBMAN.Version** **As String**

The text is `v`, then `App.Major`, a period, `App.Minor`, a period and `App.Build`. The `App` is that of the program that uses the package, not that of the package: in a program whose version is 2.3.4.7 (major, minor, revision, build), the result is `v2.3.7`. The revision number is not in the text, and the version of the package, 1.0.0.5, is not in it either.

## See Also

- [cJson](cJson), [cLogs](cLogs), [cCsv](cCsv), [cLayer](cLayer), [cTimeuse](cTimeuse) classes -- the classes of the instances
- [TBMANLIB](.) package -- overview
