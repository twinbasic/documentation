---
title: CefLogSeverity
parent: Enumerations
grand_parent: CEF Package
permalink: /tB/Packages/CEF/Enumerations/CefLogSeverity
---
# CefLogSeverity
{: .no_toc }

The minimum severity at which the CEF runtime records messages to its debug log. Assigned to [**EnvironmentOptions.LogSeverity**](../CefBrowser/EnvironmentOptions#logseverity) before or during the [**Create**](../CefBrowser/#create) event; messages below the chosen level are discarded, messages at or above it are written to the file named by [**LogFilePath**](../CefBrowser/EnvironmentOptions#logfilepath).

| Constant | Value | Description |
|----------|-------|-------------|
| **CefLogDisable**{: #cefLogDisable } | 0 | Default — logging is disabled. |
| **CefLogVerbose**{: #cefLogVerbose } | 1 | All messages, including verbose tracing. |
| **CefLogInfo**{: #cefLogInfo } | 2 | Informational messages and above. |
| **CefLogWarning**{: #cefLogWarning } | 3 | Warnings and above. |
| **CefLogError**{: #cefLogError } | 4 | Errors and above. |
| **CefLogFatal**{: #cefLogFatal } | 5 | Fatal errors only. |
