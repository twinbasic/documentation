---
title: LogModeConstants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/LogModeConstants
---
# LogModeConstants
{: .no_toc }

Destination and behaviour flags for the application log, used with **App.StartLogging**.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbLogAuto**{: #vbLogAuto } | 0 | Choose a destination automatically based on the platform. |
| **vbLogOff**{: #vbLogOff } | 1 | Disable logging. |
| **vbLogToFile**{: #vbLogToFile } | 2 | Log to a file. |
| **vbLogToNT**{: #vbLogToNT } | 3 | Log to the Windows Event Log. |
| **vbLogOverwrite**{: #vbLogOverwrite } | 16 | When logging to a file, truncate it first instead of appending. |
| **vbLogThreadID**{: #vbLogThreadID } | 32 | Include the thread ID in each log entry. |
