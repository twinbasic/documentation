---
title: SendKeys
parent: Interaction Module
permalink: /tB/Modules/Interaction/SendKeys
redirect_from:
-  /tB/Core/SendKeys
vba_attribution: true
---
# SendKeys
{: .no_toc }

Sends one or more keystrokes to the active window as if typed at the keyboard.

Syntax: **SendKeys** *string* [ **,** *wait* ]

*string*
: *required* String expression specifying the keystrokes to send.

*wait*
: *optional* **Boolean** specifying the wait mode. If **False** (default), control is returned to the procedure as soon as the keys have been queued. If **True**, the keystrokes must be processed by the receiving window before control returns.

Each key is represented by one or more characters. To specify a single keyboard character, use the character itself --- for example, `"A"` for the letter A, or `"ABC"` for A, B, then C in sequence.

The plus sign (`+`), caret (`^`), percent sign (`%`), tilde (`~`), and parentheses `( )` have special meanings to **SendKeys**. To send one of these characters as itself, enclose it in braces: for example, `"{+}"` for the plus sign. Brackets `[ ]` have no special meaning to **SendKeys** itself, but they must be enclosed in braces because other applications may treat them specially during dynamic data exchange (DDE). To send brace characters, use `{% raw %}"{{}"{% endraw %}` and `"{% raw %}{}}{% endraw %}"`.

To send keys that don't correspond to a printable character, use the codes in the following table:

| Key | Code |
|:--|:--|
| BACKSPACE | `{BACKSPACE}`, `{BS}`, or `{BKSP}` |
| BREAK | `{BREAK}` |
| CAPS LOCK | `{CAPSLOCK}` |
| DEL or DELETE | `{DELETE}` or `{DEL}` |
| DOWN ARROW | `{DOWN}` |
| END | `{END}` |
| ENTER | `{ENTER}` or `~` |
| ESC | `{ESC}` |
| HELP | `{HELP}` |
| HOME | `{HOME}` |
| INS or INSERT | `{INSERT}` or `{INS}` |
| LEFT ARROW | `{LEFT}` |
| NUM LOCK | `{NUMLOCK}` |
| PAGE DOWN | `{PGDN}` |
| PAGE UP | `{PGUP}` |
| PRINT SCREEN | `{PRTSC}` |
| RIGHT ARROW | `{RIGHT}` |
| SCROLL LOCK | `{SCROLLLOCK}` |
| TAB | `{TAB}` |
| UP ARROW | `{UP}` |
| F1--F16 | `{F1}` … `{F16}` |

To combine a key with SHIFT, CTRL, or ALT, prefix the key code with one or more of the following modifier codes:

| Key | Code |
|:--|:--|
| SHIFT | `+` |
| CTRL | `^` |
| ALT | `%` |

To hold one or more modifiers down while a sequence of keys is pressed, enclose the keys in parentheses. For example, `"+(EC)"` holds SHIFT down while E and C are pressed.

To repeat a key, use the form `{key number}` --- for example, `"{LEFT 42}"` to press LEFT 42 times, or `"{h 10}"` to type `h` ten times. The space between *key* and *number* is required.

> [!NOTE]
> **SendKeys** can't send keystrokes to applications that aren't running in Windows, and it cannot send the PRINT SCREEN key (`{PRTSC}`) to any application.

### Example

This example uses [**Shell**](Shell) to launch the Windows Calculator and **SendKeys** to control it: it adds the numbers 1 through 100, takes the running total, then closes Calculator with ALT+F4. Because [**AppActivate**](AppActivate) changes the focus, the example must be run, not single-stepped.

```tb
Dim TaskId As Double, I As Long
TaskId = Shell("CALC.EXE", vbNormalFocus)
AppActivate TaskId

For I = 1 To 100
    SendKeys I & "{+}", True
Next I

SendKeys "=", True
SendKeys "%{F4}", True
```

### See Also

- [AppActivate](AppActivate) statement
- [Shell](Shell) function
