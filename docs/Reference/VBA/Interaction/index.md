---
title: Interaction Module
parent: VBA Package
permalink: /tB/Modules/Interaction/
has_toc: false
---

# Interaction module

The **Interaction** module groups together standalone procedures for everything that happens at the edges of a program — talking to the user, branching on a value, launching another process, reading the environment or the registry, and creating, calling into, or raising events on COM objects.

## Asking the user something

[**MsgBox**](MsgBox) shows a modal dialog with a message, an icon, and a chosen set of buttons; it returns a [**VbMsgBoxResult**](../Constants/VbMsgBoxResult) value identifying the button that was clicked. [**InputBox**](InputBox) shows a similar dialog with a text-entry field and returns the string the user typed (or an empty string if the user cancels). [**Beep**](Beep) sounds the system alert tone — useful as an audible cue when a long-running operation finishes.

```tb
Dim Answer As VbMsgBoxResult
Answer = MsgBox("Save changes before closing?", vbYesNoCancel + vbQuestion, "Confirm")
```

## Choosing a value

The module offers four ways to pick one of several values inline:

- [**If**](If) is the short-circuiting inline conditional — a twinBASIC addition. Only the branch matching the condition is evaluated, so `If(Divisor <> 0, 100 / Divisor, "n/a")` is safe even when *Divisor* is zero.
- [**IIf**](IIf) is the historical VBA inline conditional. Both *truepart* and *falsepart* are always evaluated, so it cannot guard against errors in the unused branch.
- [**Choose**](Choose) returns the *index*-th item from a list of values — a one-based equivalent of array indexing for a fixed-length argument list.
- [**Switch**](Switch) iterates over pairs of *(condition, value)* arguments and returns the value paired with the first **True** condition — a compact stand-in for an **If...ElseIf** ladder.

```tb
Dim Status As Variant
Status = Switch(Age < 13, "Child", _
                Age < 20, "Teenager", _
                Age < 65, "Adult", _
                True,     "Senior")
```

[**Partition**](Partition) is a related utility: it returns a printable label identifying which of a series of equal-width numeric ranges a value falls into.

## Launching and steering other processes

[**Shell**](Shell) starts another program asynchronously and returns the new process's task ID; [**AppActivate**](AppActivate) brings an already-running application's window to the foreground, by title or by task ID. [**SendKeys**](SendKeys) feeds keystrokes to whichever window currently has focus, and [**DoEvents**](DoEvents) yields control back to the message loop so paint, input, and timer events can be dispatched in the middle of a long computation.

## The environment and the command line

[**Command$**](Command) and [**Command**](Command) return the command-line arguments passed to the program when it was started. [**Environ$**](Environ) and [**Environ**](Environ) return the value of a process environment variable, looked up either by name or by 1-based index in the environment block.

## Per-user application settings

The registry-setting helpers read and write per-user values under `HKEY_CURRENT_USER\Software\VB and VBA Program Settings`, mirroring the storage convention used by VB6. [**SaveSetting**](SaveSetting) writes a single key, [**GetSetting**](GetSetting) reads it back (with an optional default for missing keys), [**GetAllSettings**](GetAllSettings) returns every key-value pair in a section as a two-column **Variant** array, and [**DeleteSetting**](DeleteSetting) removes a key, an entire section, or every setting belonging to an application.

```tb
SaveSetting    "MyApp", "Window", "Maximised", "True"
Debug.Print GetSetting("MyApp", "Window", "Maximised", "False")     ' "True"
DeleteSetting  "MyApp", "Window", "Maximised"
```

## COM objects and dynamic dispatch

[**CreateObject**](CreateObject) instantiates a new COM/Automation object given its ProgID or CLSID — optionally on a remote machine when a *servername* is supplied. [**GetObject**](GetObject) is the dual: it either binds to a file (loading the application that owns it) or attaches to an already-running instance of an object class.

Once an object reference is in hand, [**CallByName**](CallByName) and [**CallByDispId**](CallByDispId) invoke a method or property on it dynamically, when the member to call is only known at run time — by name in the first case, or by raw IDispatch dispatch ID in the second. [**RaiseEventByName**](RaiseEventByName) and [**RaiseEventByName2**](RaiseEventByName2) raise an event on an object by event-name string — the run-time equivalent of the **RaiseEvent** statement, useful when the event being raised isn't known at compile time. The two forms differ only in how the event arguments are supplied: as a packed **Variant** array, or as a variable-length argument list.

## Members

- [AppActivate](AppActivate) -- activates an application window
- [Beep](Beep) -- sounds a tone through the computer's speaker
- [CallByDispId](CallByDispId) -- invokes a method or property on an object dynamically by IDispatch dispatch ID
- [CallByName](CallByName) -- invokes a method or property on an object dynamically by name
- [Choose](Choose) -- returns one value from a list, selected by 1-based index
- [Command$, Command](Command) -- returns the command-line arguments passed to the program
- [CreateObject](CreateObject) -- creates a new instance of a COM/Automation object
- [DeleteSetting](DeleteSetting) -- deletes a section or key setting from an application's entry in the Windows registry
- [DoEvents](DoEvents) -- yields control to the message loop so pending events can be processed
- [Environ$, Environ](Environ) -- returns the value of a process environment variable
- [GetAllSettings](GetAllSettings) -- returns every key/value pair in a section of an application's registry entry
- [GetObject](GetObject) -- returns a reference to an Automation object loaded from a file or already running
- [GetSetting](GetSetting) -- returns a key setting value from an application's entry in the Windows registry
- [If](If) -- evaluates an expression and returns one of two values, with short-circuit evaluation
- [IIf](IIf) -- evaluates an expression and returns one of two values; both branches are always evaluated
- [InputBox](InputBox) -- prompts the user for a line of text and returns what was entered
- [MsgBox](MsgBox) -- displays a modal message dialog and returns the button the user clicked
- [Partition](Partition) -- returns a string identifying the range a number falls into
- [RaiseEventByName](RaiseEventByName) -- raises an event by name on an object, taking arguments as a **Variant** array
- [RaiseEventByName2](RaiseEventByName2) -- raises an event by name on an object, taking a variable-length argument list
- [SaveSetting](SaveSetting) -- saves or creates a key setting in an application's entry in the Windows registry
- [SendKeys](SendKeys) -- sends keystrokes to the active window
- [Shell](Shell) -- runs another program asynchronously and returns its task ID
- [Switch](Switch) -- returns the value paired with the first **True** condition in a list of (condition, value) pairs
