---
title: RefreshMode
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/RefreshMode
has_toc: false
---

# RefreshMode enumeration
{: .no_toc }

Says how often the data of a collector changes. A collector returns one member from its [**RefreshMode**](IDiagnosticCollector#refreshmode) property, and [**RunByRefreshMode**](DiagnosticEngine#runbyrefreshmode) runs the collectors that return one member. The enumeration is declared in a module of the package, **RefreshModeModule**, which has no page of its own; the members are written with the name of the enumeration, as in `RefreshMode.Static`.

```tb check_build check_run
Dim c As IDiagnosticCollector
Set c = New DiskInfoCollector

Select Case c.RefreshMode
    Case RefreshMode.Static
        Debug.Print "collected once"
    Case RefreshMode.Dynamic
        Debug.Print "changes all the time"
    Case RefreshMode.SemiDynamic
        Debug.Print "changes slowly"
End Select
Debug.Print CLng(RefreshMode.Static) & " " & CLng(RefreshMode.Dynamic) & " " & CLng(RefreshMode.SemiDynamic)
' Output:
' changes slowly
' 0 1 2
```

| Member | Value | Meaning |
|:-------|------:|:--------|
| **Static** | 0 | The data does not change while the program runs, such as the version of the operating system or the model of the processor. |
| **Dynamic** | 1 | The data changes all the time and is read again for each report, such as the load of the processor or the memory in use. |
| **SemiDynamic** | 2 | The data changes slowly, such as the free space of a disk or the network configuration. A program reads it again when it wants to. |

The mode is a label. The package does not keep the result of a **Static** collector or skip it in a later run, and it does not schedule anything: [**RunAll**](DiagnosticEngine#runall) runs every collector each time it is called. A program that reads the **Static** data once and the **Dynamic** data every second calls **RunByRefreshMode** for each mode, or keeps the results of the first call itself.

The collectors of the package have these modes:

| Mode | Collectors |
|:-----|:-----------|
| **Static** | [**OSInfoCollector**](Collectors#osinfocollector), [**CPUInfoCollector**](Collectors#cpuinfocollector), [**LocaleCollector**](Collectors#localecollector), [**EnvironmentCollector**](Collectors#environmentcollector), [**RuntimesCollector**](Collectors#runtimescollector) |
| **Dynamic** | [**CPULoadCollector**](Collectors#cpuloadcollector), [**MemoryInfoCollector**](Collectors#memoryinfocollector), [**UptimeCollector**](Collectors#uptimecollector), [**ProcessInfoCollector**](Collectors#processinfocollector) |
| **SemiDynamic** | [**DiskInfoCollector**](Collectors#diskinfocollector), [**NetworkInfoCollector**](Collectors#networkinfocollector) |

## See Also

- [IDiagnosticCollector](IDiagnosticCollector) interface -- the **RefreshMode** property
- [DiagnosticEngine](DiagnosticEngine) class -- **RunByRefreshMode**
- [Collectors](Collectors) -- the mode of each collector of the package
