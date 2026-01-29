---
title: Debugging
parent: Compiler and IDE Features
nav_order: 2
---

# Debugging Features

twinBASIC includes several features to help with debugging.

## Debug Trace Logger

New to the debugging experience is a powerful trace logging feature that can automatically create detailed logs to either the debug console or a file. Messages can be output to the new system with `Debug.TracePrint`. The logger works both when running from the IDE and in compiled executables.

![image](../Images/4fc2bf99-2bec-4943-837d-21038d791574.png)

## Stale/Dangling Pointer Detection

Bugs result from using Strings and Variants after they have been freed. It may not be noticed immediately if the memory has not been overwritten, but it's sometimes hard to detect and can cause issues like a String displaying it's previous value or garbage. This debugging option detects use-after-free, and replaces the data with a special symbol indicating the problem.

Below shows an example where the ListView ColumnHeader text had been set by previously-freed string and detected by this feature:

![image](../Images/021f6cbf-acce-445d-ade7-3fcad0af4927.png)

Previously, it had shown the same text for every column-- but only under certain circumstances, leading to the issue being overlooked for a long time.
