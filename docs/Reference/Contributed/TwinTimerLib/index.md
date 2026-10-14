---
title: TwinTimerLib Package
parent: Contributed Packages
has_toc: false
indexed_from: 1.0.7.0
permalink: /tB/Packages/Contributed/TwinTimerLib/
---

# TwinTimerLib Package
{: .no_toc }

**Author:** Krool. **Version:** 1.0.7.0

The **TwinTimerLib** contributed package provides a Win32-backed timer class that fires a **Timer** event at a repeating interval and reports the total elapsed time in milliseconds. Unlike the built-in VB **Timer** control, **TwinTimer** does not require a form or control container and can be instantiated from any module.

## Classes

- [TwinTimer](TwinTimer/) -- a timer class that fires a Timer event at a repeating interval and reports the total elapsed time in milliseconds since the first event
  - [Enabled](TwinTimer/Enabled) -- returns or sets a value that determines whether the timer responds to elapsed-interval events
  - [Interval](TwinTimer/Interval) -- returns or sets the number of milliseconds between successive Timer events
  - [Timer](TwinTimer/Timer) -- occurs when the preset interval for a TwinTimer has elapsed

## Test cases

The notes and warnings of this section are checked by the test cases in [TwinTimerLib-tests.twinproj](TwinTimerLib-tests.twinproj), a twinBASIC project. It uses TwinTimerLib as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
