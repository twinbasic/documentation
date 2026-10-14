---
title: cDialogInputBox
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogInputBox
has_toc: false
---

# cDialogInputBox class
{: .no_toc }

A **cDialogInputBox** asks the user for one line of text, checks it against rules and asks again when the text fails, up to three times. The box is the **InputBox** of the run-time library, and the messages about a failed check are ordinary message boxes: the class has no window of its own.

A **cDialogInputBox** is made with **New**: `Dim box As New cDialogInputBox`. It cannot be made with **CreateObject**.

The properties [**Title**](#title), [**Prompt**](#prompt), [**DefaultValue**](#defaultvalue) and [**Placeholder**](#placeholder) decide what the box shows, and [**Validation**](#validation), [**MinLength**](#minlength), [**MaxLength**](#maxlength) and [**AllowEmpty**](#allowempty) what it accepts. [**ShowDialog**](#showdialog) shows the box and puts the accepted text into [**Value**](#value). [**ShowSimple**](#showsimple), [**ShowInteger**](#showinteger), [**ShowNumeric**](#shownumeric), [**ShowEmail**](#showemail), [**ShowPhone**](#showphone) and [**ShowURL**](#showurl) set the rules for a kind of text and return the value in one call.

```tb check_build
Dim box As New cDialogInputBox

box.Title = "New user"
box.Prompt = "Name of the user?"
box.MinLength = 3
box.MaxLength = 20
box.AllowEmpty = False

If box.ShowDialog() Then
    Debug.Print "Hello, " & box.Value
Else
    Debug.Print "No name given"
End If
```

## How the box works

The text of the box is [**Prompt**](#prompt), followed by a blank line and `(Hint: ` and [**Placeholder**](#placeholder) and `)` when a placeholder is set, followed by a blank line and a line on the length when [**MinLength**](#minlength) or [**MaxLength**](#maxlength) is above 0: `Length: 3 to 8 characters`, `Length: At least 3 characters` or `Length: Maximum 8 characters`. The edit box holds [**DefaultValue**](#defaultvalue).

[**ShowDialog**](#showdialog) then works like this:

1. When the user cancels, [**Cancelled**](#cancelled) is set to **True**, [**Value**](#value) to an empty string, and the result is **False**.
2. Otherwise [**ValidateInput**](#validateinput) checks the text. A text that passes becomes [**Value**](#value), and the result is **True**.
3. A text that fails is reported in a message box that shows the message of [**ValidateInput**](#validateinput) under the title of the box, and the box is shown again with [**DefaultValue**](#defaultvalue) in the edit box, not with the text that failed.
4. The third failure shows the message with `Maximum attempts reached.` after a blank line. The result is **False**, [**Cancelled**](#cancelled) is **True**, and [**Value**](#value) keeps what it held before the call.

An empty string passes when [**AllowEmpty**](#allowempty) is **True** (the default) and no [**MinLength**](#minlength) is set. The result of the call does not tell the user's cancelling apart from a refusal; both give **False** and [**Cancelled**](#cancelled) **True**. The two differ only in [**Value**](#value).

> [!WARNING] 1.1.0.0
> The properties [**Multiline**](#multiline), [**PasswordChar**](#passwordchar), [**OwnerHwnd**](#ownerhwnd) and [**CustomPattern**](#custompattern) are stored but not used. The box is always a single line, it shows what is typed without masking it, it has no owner window and the owner stays usable while it is open, and the value **Custom** of [**Validation**](#validation) accepts any text that is not empty. A program that sets [**PasswordChar**](#passwordchar) to hide a secret shows the secret on the screen. [**cDialogPassword**](cDialogPassword) masks its entry.

## Properties

### AllowEmpty
{: .no_toc }

Whether an empty entry is accepted.

Syntax: *object*.**AllowEmpty** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**.

With **False**, [**ValidateInput**](#validateinput) refuses an empty string with `Input cannot be empty`. [**ShowSimple**](#showsimple) sets it to **True**, and [**ShowInteger**](#showinteger), [**ShowNumeric**](#shownumeric), [**ShowEmail**](#showemail), [**ShowPhone**](#showphone) and [**ShowURL**](#showurl) to **False**, and the setting stays.

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print box.AllowEmpty    ' True
box.AllowEmpty = False
Debug.Print "[" & box.ValidateInput("") & "]"    ' [Input cannot be empty]
```

### Cancelled
{: .no_toc }

Whether the last call to [**ShowDialog**](#showdialog) ended without a value, read-only.

Syntax: *object*.**Cancelled** **As Boolean**

**False** in a new object, and at the start of every call to [**ShowDialog**](#showdialog). **True** after the user cancelled, and after the third refused entry.

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print box.Cancelled    ' False
```

### CustomPattern
{: .no_toc }

A pattern for the value **Custom** of [**Validation**](#validation), which the class does not use.

Syntax: *object*.**CustomPattern** [ **=** *value* ]

*value*
: A **String**. The default is an empty string.

With [**Validation**](#validation) set to **Custom**, [**ValidateInput**](#validateinput) never compares the text with the pattern. It refuses only an empty text when a pattern is set, with `Input does not match required format`; any other text passes. To check a text against a pattern, use [**ValidateInput**](#validateinput) as the first check and make the second one in the program, for instance with the **tbRegExp** package.

```tb check_build check_run
Dim box As New cDialogInputBox

box.Validation = InputValidation.Custom
box.CustomPattern = "[0-9]+"
Debug.Print "[" & box.ValidateInput("letters only") & "]"    ' []
Debug.Print "[" & box.ValidateInput("") & "]"                ' [Input does not match required format]
```

### DefaultValue
{: .no_toc }

The text that the edit box holds when it opens.

Syntax: *object*.**DefaultValue** [ **=** *value* ]

*value*
: A **String**. The default is an empty string.

The box shows it again after a refused entry. [**ShowSimple**](#showsimple), [**ShowInteger**](#showinteger) and [**ShowNumeric**](#shownumeric) set it from their *defaultValue* argument, [**ShowEmail**](#showemail) and [**ShowPhone**](#showphone) to an empty string and [**ShowURL**](#showurl) to `https://`.

```tb check_build check_run
Dim box As New cDialogInputBox

box.DefaultValue = "Guest"
Debug.Print box.DefaultValue    ' Guest
```

### MaxLength
{: .no_toc }

The longest text that is accepted.

Syntax: *object*.**MaxLength** [ **=** *value* ]

*value*
: A **Long**. 0, the default, means no limit.

[**ValidateInput**](#validateinput) refuses a longer text with `Input must not exceed N characters`. The edit box itself does not stop the typing.

```tb check_build check_run
Dim box As New cDialogInputBox

box.MaxLength = 5
Debug.Print "[" & box.ValidateInput("abcdef") & "]"    ' [Input must not exceed 5 characters]
Debug.Print "[" & box.ValidateInput("abcde") & "]"     ' []
```

### MinLength
{: .no_toc }

The shortest text that is accepted.

Syntax: *object*.**MinLength** [ **=** *value* ]

*value*
: A **Long**. 0, the default, means no minimum.

[**ValidateInput**](#validateinput) refuses a shorter text, an empty one too, with `Input must be at least N characters`. This check comes first, so an empty text with a minimum gets this message and not the one of [**AllowEmpty**](#allowempty).

```tb check_build check_run
Dim box As New cDialogInputBox

box.MinLength = 3
Debug.Print "[" & box.ValidateInput("ab") & "]"    ' [Input must be at least 3 characters]
Debug.Print "[" & box.ValidateInput("abc") & "]"   ' []
```

### Multiline
{: .no_toc }

A property that has no effect.

Syntax: *object*.**Multiline** [ **=** *value* ]

*value*
: A **Boolean**. The default is **False**.

The value is stored. The box has one line whatever it is; see the warning [above](#how-the-box-works).

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print box.Multiline    ' False
```

### OwnerHwnd
{: .no_toc }

A property that has no effect.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

*value*
: A **LongPtr**. The default is 0.

The value is stored. The box has no owner whatever it is; see the warning [above](#how-the-box-works). [**Reset**](#reset) sets it to 0.

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print box.OwnerHwnd    ' 0
```

### PasswordChar
{: .no_toc }

A property that has no effect.

Syntax: *object*.**PasswordChar** [ **=** *value* ]

*value*
: A **String**. The default is an empty string.

The value is stored. The box does not mask the text, whatever it is; see the warning [above](#how-the-box-works).

```tb check_build check_run
Dim box As New cDialogInputBox

box.PasswordChar = "*"
Debug.Print box.PasswordChar    ' *
```

### Placeholder
{: .no_toc }

A hint that the box shows under the prompt.

Syntax: *object*.**Placeholder** [ **=** *value* ]

*value*
: A **String**. The default is an empty string.

The hint is not shown in the edit box. When it is not empty, the prompt gets the line `(Hint: ` followed by the placeholder and `)`. [**ShowEmail**](#showemail), [**ShowPhone**](#showphone) and [**ShowURL**](#showurl) set it to a sample value, and it stays set for the later calls of other methods, [**ShowSimple**](#showsimple) included. Set it to an empty string to remove the hint.

```tb check_build check_run
Dim box As New cDialogInputBox

box.Placeholder = "like ABC"
Debug.Print box.Placeholder    ' like ABC
```

### Prompt
{: .no_toc }

The text above the edit box.

Syntax: *object*.**Prompt** [ **=** *value* ]

*value*
: A **String**. The default is `Please enter a value:`.

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print box.Prompt    ' Please enter a value:
```

### Title
{: .no_toc }

The title of the box and of the messages about a refused entry.

Syntax: *object*.**Title** [ **=** *value* ]

*value*
: A **String**. The default is `Input`.

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print box.Title    ' Input
```

### Validation
{: .no_toc }

The kind of text that is accepted.

Syntax: *object*.**Validation** [ **=** *value* ]

*value*
: An [**InputValidation**](#inputvalidation) member. The default is **None**.

[**ValidateInput**](#validateinput) applies the rule after the checks of [**MinLength**](#minlength), [**MaxLength**](#maxlength) and [**AllowEmpty**](#allowempty). The [**Show\***](#showsimple) methods other than [**ShowDialog**](#showdialog) set it, and it stays set.

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print box.Validation = InputValidation.None    ' True
box.Validation = InputValidation.Email
Debug.Print box.Validation                           ' 5
```

### Value
{: .no_toc }

The text that [**ShowDialog**](#showdialog) accepted last, read-only.

Syntax: *object*.**Value** **As String**

An empty string in a new object, after a cancel, and after [**Reset**](#reset). A call that ends with three refusals leaves it as it was.

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print Len(box.Value)    ' 0
```

## Methods

### GetValueAsInteger
{: .no_toc }

Returns [**Value**](#value) as a **Long**.

Syntax: *object*.**GetValueAsInteger** ( ) **As Long**

Returns 0 when [**Value**](#value) is not a number, and otherwise the **CLng** of it, which rounds: `3.5` gives 4. A value that a **Long** cannot hold raises error 6.

```tb check_build
Dim box As New cDialogInputBox

box.Validation = InputValidation.Numeric
If box.ShowDialog() Then Debug.Print box.GetValueAsInteger()
```

### GetValueAsNumber
{: .no_toc }

Returns [**Value**](#value) as a **Double**.

Syntax: *object*.**GetValueAsNumber** ( ) **As Double**

Returns 0 when [**Value**](#value) is not a number, and otherwise the **CDbl** of it.

```tb check_build check_run
Dim box As New cDialogInputBox

Debug.Print box.GetValueAsNumber()    ' 0
```

### Reset
{: .no_toc }

Restores every property to its starting value.

Syntax: *object*.**Reset**

Sets [**Title**](#title) to `Input`, [**Prompt**](#prompt) to `Please enter a value:`, [**Value**](#value), [**DefaultValue**](#defaultvalue), [**Placeholder**](#placeholder), [**CustomPattern**](#custompattern) and [**PasswordChar**](#passwordchar) to empty strings, [**MinLength**](#minlength), [**MaxLength**](#maxlength) and [**OwnerHwnd**](#ownerhwnd) to 0, [**Validation**](#validation) to **None**, [**AllowEmpty**](#allowempty) to **True** and [**Multiline**](#multiline) and [**Cancelled**](#cancelled) to **False**.

```tb check_build check_run
Dim box As New cDialogInputBox

box.Title = "Age"
box.Validation = InputValidation.Integer
box.Reset
Debug.Print box.Title                                  ' Input
Debug.Print box.Validation = InputValidation.None      ' True
```

### ShowDialog
{: .no_toc }

Shows the box and checks the entry.

Syntax: *object*.**ShowDialog** ( ) **As Boolean**

Returns **True** when the user entered a text that passed the checks, and then [**Value**](#value) holds it. Returns **False** when the user cancelled or the third attempt failed, with [**Cancelled**](#cancelled) **True**. [How the box works](#how-the-box-works) lists the steps.

```tb check_build
Dim box As New cDialogInputBox

box.Title = "Product code"
box.Prompt = "Enter the product code:"
box.Validation = InputValidation.AlphaNumeric
box.MinLength = 4
box.MaxLength = 8
box.DefaultValue = "AB12"

If box.ShowDialog() Then
    Debug.Print "Code: " & box.Value
Else
    Debug.Print "Cancelled"
End If
```

### ShowEmail
{: .no_toc }

Asks for an email address.

Syntax: *object*.**ShowEmail** ( *prompt* [ , *title* ] ) **As String**

*prompt*
: *required* The text above the edit box.

*title*
: *optional* The title. The default is `Enter Email`.

Sets [**Prompt**](#prompt), [**Title**](#title), [**DefaultValue**](#defaultvalue) (empty), [**Validation**](#validation) (**Email**), [**AllowEmpty**](#allowempty) (**False**) and [**Placeholder**](#placeholder) (`example@domain.com`), calls [**ShowDialog**](#showdialog) and returns [**Value**](#value). Returns an empty string when [**ShowDialog**](#showdialog) returned **False**. An address passes when it has exactly one `@` and at least one `.` anywhere.

```tb check_build
Dim box As New cDialogInputBox
Dim address As String

address = box.ShowEmail("Where should the report be sent?")
If Not box.Cancelled Then Debug.Print "Send to " & address
```

### ShowInteger
{: .no_toc }

Asks for a whole number.

Syntax: *object*.**ShowInteger** ( *prompt* [ , *title* [ , *defaultValue* ] ] ) **As Long**

*prompt*
: *required* The text above the edit box.

*title*
: *optional* The title. The default is `Enter Integer`.

*defaultValue*
: *optional* The text in the edit box. The default is an empty string.

Sets the three properties that correspond to the arguments, [**Validation**](#validation) (**Integer**) and [**AllowEmpty**](#allowempty) (**False**), calls [**ShowDialog**](#showdialog) and returns [**Value**](#value) as a **Long**. A cancelled box returns 0, which is also a possible entry, so test [**Cancelled**](#cancelled). The text `1e3` passes and returns 1000.

> [!NOTE] 1.1.0.0
> A text that passes the check but that a **Long** cannot hold, such as `99999999999`, raises error 6 after the box has closed. [**Value**](#value) then holds the text.

```tb check_build
Dim box As New cDialogInputBox
Dim copies As Long

copies = box.ShowInteger("How many copies?", "Print", "1")
If Not box.Cancelled Then Debug.Print copies & " copies"
```

### ShowNumeric
{: .no_toc }

Asks for a number.

Syntax: *object*.**ShowNumeric** ( *prompt* [ , *title* [ , *defaultValue* ] ] ) **As Double**

*prompt*
: *required* The text above the edit box.

*title*
: *optional* The title. The default is `Enter Number`.

*defaultValue*
: *optional* The text in the edit box. The default is an empty string.

As [**ShowInteger**](#showinteger), with [**Validation**](#validation) **Numeric** and a **Double** as the result: `3.5` returns 3.5. A cancelled box returns 0, so test [**Cancelled**](#cancelled).

```tb check_build
Dim box As New cDialogInputBox
Dim price As Double

price = box.ShowNumeric("Price?", "New article", "9.99")
If Not box.Cancelled Then Debug.Print price
```

### ShowPhone
{: .no_toc }

Asks for a telephone number.

Syntax: *object*.**ShowPhone** ( *prompt* [ , *title* ] ) **As String**

*prompt*
: *required* The text above the edit box.

*title*
: *optional* The title. The default is `Enter Phone`.

Sets [**Prompt**](#prompt), [**Title**](#title), [**DefaultValue**](#defaultvalue) (empty), [**Validation**](#validation) (**Phone**), [**AllowEmpty**](#allowempty) (**False**) and [**Placeholder**](#placeholder) (`+1 (555) 123-4567`), calls [**ShowDialog**](#showdialog) and returns [**Value**](#value), or an empty string for **False**. Digits, spaces and `-`, `(`, `)`, `+` and `.` are accepted.

```tb check_build
Dim box As New cDialogInputBox
Dim number As String

number = box.ShowPhone("Telephone number?")
If Not box.Cancelled Then Debug.Print number
```

### ShowSimple
{: .no_toc }

Asks for a text without rules.

Syntax: *object*.**ShowSimple** ( *prompt* [ , *title* [ , *defaultValue* ] ] ) **As String**

*prompt*
: *required* The text above the edit box.

*title*
: *optional* The title. The default is `Input`.

*defaultValue*
: *optional* The text in the edit box. The default is an empty string.

Sets the three properties that correspond to the arguments, sets [**Validation**](#validation) to **None**, [**AllowEmpty**](#allowempty) to **True** and [**MinLength**](#minlength) and [**MaxLength**](#maxlength) to 0, calls [**ShowDialog**](#showdialog) and returns [**Value**](#value), or an empty string for **False**. An empty result does not tell a cancel from an empty entry: test [**Cancelled**](#cancelled). A [**Placeholder**](#placeholder) that an earlier call set is still shown.

```tb check_build
Dim box As New cDialogInputBox
Dim answer As String

answer = box.ShowSimple("Your name?", "Welcome", "Guest")
If Not box.Cancelled Then Debug.Print "Hello, " & answer
```

### ShowURL
{: .no_toc }

Asks for an address on the web.

Syntax: *object*.**ShowURL** ( *prompt* [ , *title* ] ) **As String**

*prompt*
: *required* The text above the edit box.

*title*
: *optional* The title. The default is `Enter URL`.

Sets [**Prompt**](#prompt), [**Title**](#title), [**DefaultValue**](#defaultvalue) (`https://`), [**Validation**](#validation) (**URL**), [**AllowEmpty**](#allowempty) (**False**) and [**Placeholder**](#placeholder) (`https://example.com`), calls [**ShowDialog**](#showdialog) and returns [**Value**](#value), or an empty string for **False**. A text passes when it contains `://`, so the offered `https://` passes unchanged.

```tb check_build
Dim box As New cDialogInputBox
Dim address As String

address = box.ShowURL("Address of the site?")
If Not box.Cancelled Then Debug.Print address
```

### ValidateInput
{: .no_toc }

Checks a text against the rules and returns the reason for a refusal.

Syntax: *object*.**ValidateInput** ( *input* ) **As String**

*input*
: *required* The text to check.

Returns an empty string when the text passes, and otherwise the message that [**ShowDialog**](#showdialog) shows. The checks run in this order, and the first that fails decides:

| Check | Message |
|---|---|
| Fewer characters than [**MinLength**](#minlength) | `Input must be at least N characters` |
| More characters than [**MaxLength**](#maxlength) (above 0) | `Input must not exceed N characters` |
| Empty, with [**AllowEmpty**](#allowempty) **False** | `Input cannot be empty` |
| **Numeric**: **IsNumeric** is **False** | `Input must be a valid number` |
| **Integer**: **IsNumeric** is **False**, or the text has a `.` or a `,` | `Input must be a valid integer` |
| **Alpha**: a character that is not a letter A to Z or a space | `Input must contain only letters` |
| **AlphaNumeric**: a character that is not a letter A to Z, a digit, a space or `_` | `Input must contain only letters and numbers` |
| **Email**: no `@`, no `.`, or more than one `@` | `Input must be a valid email address` |
| **Phone**: a character that is not a digit, a space, `-`, `(`, `)`, `+` or `.` | `Input must be a valid phone number` |
| **URL**: no `://` | `Input must be a valid URL (e.g., https://example.com)` |
| **Custom**: empty, with a [**CustomPattern**](#custompattern) set | `Input does not match required format` |

A rule of **Numeric** to **URL** is not applied to an empty text, which passes it. The method changes nothing in the object.

```tb check_build check_run
Dim box As New cDialogInputBox

box.Validation = InputValidation.Integer
Debug.Print "[" & box.ValidateInput("42") & "]"     ' []
Debug.Print "[" & box.ValidateInput("4.2") & "]"    ' [Input must be a valid integer]
Debug.Print "[" & box.ValidateInput("abc") & "]"    ' [Input must be a valid integer]

box.Validation = InputValidation.Email
Debug.Print "[" & box.ValidateInput("ann@example.com") & "]"    ' []
Debug.Print "[" & box.ValidateInput("ann@@example.com") & "]"   ' [Input must be a valid email address]

box.Validation = InputValidation.AlphaNumeric
Debug.Print "[" & box.ValidateInput("Item_42") & "]"    ' []
Debug.Print "[" & box.ValidateInput("Item-42") & "]"    ' [Input must contain only letters and numbers]
```

## Enumerations

### InputValidation
{: .no_toc }

The kinds of text for [**Validation**](#validation).

| Member | Value | Accepts |
|---|---|---|
| **None** | 0 | Any text |
| **Numeric** | 1 | What **IsNumeric** accepts |
| **Integer** | 2 | What **IsNumeric** accepts, without `.` and `,` |
| **Alpha** | 3 | Letters A to Z and spaces |
| **AlphaNumeric** | 4 | Letters A to Z, digits, spaces and `_` |
| **Email** | 5 | Text with one `@` and a `.` |
| **Phone** | 6 | Digits, spaces and `-`, `(`, `)`, `+`, `.` |
| **URL** | 7 | Text that contains `://` |
| **Custom** | 99 | Any text; see [**CustomPattern**](#custompattern) |

## Example

This example asks for a quantity between 1 and 99 and repeats the question until the user has entered one or cancelled.

```tb check_build
Dim box As New cDialogInputBox
Dim quantity As Long

box.Title = "Order"
box.Prompt = "Quantity (1 to 99)?"
box.Validation = InputValidation.Integer
box.AllowEmpty = False
box.MaxLength = 2
box.DefaultValue = "1"

If box.ShowDialog() Then
    quantity = box.GetValueAsInteger()
    If quantity >= 1 Then Debug.Print "Ordering " & quantity
Else
    Debug.Print "No order"
End If
```

## See Also

- [cDialogPassword](cDialogPassword) class -- asks for a password with a masked entry
- [cDialogDateTime](cDialogDateTime) class -- asks for a date and a time
- [TBMANLIB_Dialog](.) package -- overview
