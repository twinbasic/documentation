---
title: DebugConsole
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/DebugConsole
has_toc: false
---

# DebugConsole class
{: .no_toc }

The IDE's DEBUG CONSOLE pane — reached through [**Host.DebugConsole**](Host#debugconsole). The canonical place for an addin to write diagnostic and log output.

```tb
With Host.DebugConsole
    .PrintText "[MyAddIn] Project: " & Host.CurrentProject.Name
    .PrintText "[MyAddIn] Compiler: " & Host.CompilerVersion
    .PrintText "[MyAddIn] PID: "      & Host.IDEProcessID
End With
```

The pane is shared across the IDE's own output and every addin's output — prefix log lines with an addin tag (e.g. `"[MyAddIn] "`) so users can tell sources apart.

* TOC
{:toc}

## Methods

### Clear
{: .no_toc }

Clears the entire content of the DEBUG CONSOLE pane.

Syntax: *debugConsole*.**Clear**

### PrintText
{: .no_toc }

Prints one line of text to the pane.

Syntax: *debugConsole*.**PrintText** *Prompt* [, *ColorRGB* ]

*Prompt*
: *required* The text to print. **String**.

*ColorRGB*
: *optional* The text colour as an RGB **Long** (use the `RGB(r, g, b)` function to construct one). Default 0 — the IDE's default DEBUG CONSOLE foreground colour.

```tb
Host.DebugConsole.PrintText "Operation completed"                           ' default colour
Host.DebugConsole.PrintText "Warning: something looks off", RGB(255, 128, 0) ' orange
```

### SetFocus
{: .no_toc }

Gives keyboard focus to the DEBUG CONSOLE's text-entry point — equivalent to the user clicking into the console.

Syntax: *debugConsole*.**SetFocus**
