---
title: cDialogPassword
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogPassword
has_toc: false
---

# cDialogPassword class
{: .no_toc }

A **cDialogPassword** asks the user for a password in a box whose entry is masked, checks the password against rules (length and kinds of characters) and asks again when it fails. The box is the **InputBox** of the run-time library, and the messages about a failed check are ordinary message boxes: the class has no window of its own. It also rates the strength of a password and offers a second method that asks for the old and the new password.

A **cDialogPassword** is made with **New**: `Dim box As New cDialogPassword`. It cannot be made with **CreateObject**.

The properties [**MinLength**](#minlength), [**MaxLength**](#maxlength), [**RequireUppercase**](#requireuppercase), [**RequireLowercase**](#requirelowercase), [**RequireNumber**](#requirenumber) and [**RequireSpecial**](#requirespecial) are the rules, and [**Validate**](#validate) applies them to a text. [**ShowDialog**](#showdialog) asks for a password and stores the accepted one in [**Password**](#password); with [**RequireConfirm**](#requireconfirm) it asks twice. [**ShowChangeDialog**](#showchangedialog) asks for the current password, a new one and its confirmation.

```tb check_build
Dim box As New cDialogPassword

box.Title = "Create account"
box.Prompt = "Choose a password:"
box.MinLength = 10
box.RequireSpecial = True
box.RequireConfirm = True

If box.ShowDialog() Then
    Debug.Print "Strength: " & box.GetStrengthDescription(box.GetStrength(box.Password))
Else
    Debug.Print "No password chosen"
End If
```

## How the box works

The box has the title [**Title**](#title). Its text is [**Prompt**](#prompt), a blank line, `Requirements:`, and one line for each rule that is on: `- Minimum N characters` always, then `- At least one uppercase letter`, `- At least one lowercase letter`, `- At least one number` and `- At least one special character`. The maximum length is not named.

The class masks the edit box with the character of [**PasswordChar**](#passwordchar). It starts a short timer before it opens the box, and when the timer fires it looks for a window of the box's class with the title [**Title**](#title) and sends it the message that sets the mask. Only a box with exactly that title is masked.

[**ShowDialog**](#showdialog) repeats the question until it has a password that passes or [**MaxAttempts**](#maxattempts) attempts have failed. A failure shows a message box with the reason and `Attempts remaining: N`, and the last failure shows the reason and `Maximum attempts reached.`. If [**RequireConfirm**](#requireconfirm) is **True**, a password that passes is asked for again in a second box, `Please confirm your password:` under the title `Title - Confirm`, and a difference counts as a failed attempt (`Passwords do not match!`). Cancelling any box ends the call.

> [!WARNING] 1.1.0.0
> Only the first box of [**ShowDialog**](#showdialog) is masked. The confirmation box of [**RequireConfirm**](#requireconfirm) and the three boxes of [**ShowChangeDialog**](#showchangedialog) (`Title - Current Password`, `Title - New Password` and `Title - Confirm New Password`) show what the user types in clear text, because the timer looks for a window with exactly the title [**Title**](#title). A program that asks for a confirmation or a change of password shows the passwords on the screen. To keep the entry masked, ask with [**ShowDialog**](#showdialog) alone and compare the two entries in the program, or use another control.

> [!NOTE] 1.1.0.0
> The properties [**ShowStrength**](#showstrength), [**AllowShowPassword**](#allowshowpassword) and [**OwnerHwnd**](#ownerhwnd) are stored but not used: the box has no strength indicator, no control that shows the password and no owner window. The password stays in [**Password**](#password), an ordinary string, until [**Reset**](#reset) empties it or the object ends.

## Properties

### AllowShowPassword
{: .no_toc }

A property that has no effect.

Syntax: *object*.**AllowShowPassword** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**.

The value is stored. The box has no control that shows the password.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.AllowShowPassword    ' True
```

### Cancelled
{: .no_toc }

Whether the last call ended without a password, read-only.

Syntax: *object*.**Cancelled** **As Boolean**

**False** in a new object. [**ShowDialog**](#showdialog) sets it to **True** when the user cancelled a box or the last attempt failed, and to **False** when it accepted a password. [**ShowChangeDialog**](#showchangedialog) sets it to **True** only when the user cancels a box, and does not set it to **False**. [**Reset**](#reset) sets it to **False**.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.Cancelled    ' False
```

### MaxAttempts
{: .no_toc }

The number of attempts that [**ShowDialog**](#showdialog) allows.

Syntax: *object*.**MaxAttempts** [ **=** *value* ]

*value*
: A **Long**. The default is 3.

Every failed password and every difference between the password and its confirmation uses one attempt; cancelling does not. With 0 or less, [**ShowDialog**](#showdialog) shows nothing and returns **False** with [**Cancelled**](#cancelled) **True**. [**ShowChangeDialog**](#showchangedialog) does not use it.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.MaxAttempts    ' 3
box.MaxAttempts = 5
Debug.Print box.MaxAttempts    ' 5
```

### MaxLength
{: .no_toc }

The longest password that is accepted.

Syntax: *object*.**MaxLength** [ **=** *value* ]

*value*
: A **Long**. The default is 128.

[**Validate**](#validate) refuses a longer text with `Password must not exceed N characters`.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.MaxLength    ' 128
box.MaxLength = 10
Debug.Print box.Validate("Zq7-demo-xxx")    ' Password must not exceed 10 characters
```

### MinLength
{: .no_toc }

The shortest password that is accepted.

Syntax: *object*.**MinLength** [ **=** *value* ]

*value*
: A **Long**. The default is 8.

[**Validate**](#validate) refuses a shorter text with `Password must be at least N characters`. With 0, an empty password passes when no character rule is on.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.MinLength                  ' 8
Debug.Print box.Validate("Zq7-")           ' Password must be at least 8 characters
```

### OwnerHwnd
{: .no_toc }

A property that has no effect.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

*value*
: A **LongPtr**. The default is 0.

The value is stored. The boxes have no owner. [**Reset**](#reset) does not change it.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.OwnerHwnd    ' 0
```

### Password
{: .no_toc }

The password that was last accepted, read-only.

Syntax: *object*.**Password** **As String**

Empty in a new object and after [**Reset**](#reset). [**ShowDialog**](#showdialog) and [**ShowChangeDialog**](#showchangedialog) set it when they accept a password. A cancelled or failed call leaves it as it was, so it can still hold the password of an earlier call: test the result of the call, not this property.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print Len(box.Password)    ' 0
```

### PasswordChar
{: .no_toc }

The character that masks the entry.

Syntax: *object*.**PasswordChar** [ **=** *value* ]

*value*
: A **String**. Only its first character is kept; an empty string sets the default, `*`.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.PasswordChar    ' *
box.PasswordChar = "#"
Debug.Print box.PasswordChar    ' #
box.PasswordChar = "abc"
Debug.Print box.PasswordChar    ' a
box.PasswordChar = ""
Debug.Print box.PasswordChar    ' *
```

### Prompt
{: .no_toc }

The first text of the first box.

Syntax: *object*.**Prompt** [ **=** *value* ]

*value*
: A **String**. The default is `Please enter your password:`.

The list of requirements follows it. [**ShowChangeDialog**](#showchangedialog) and the confirmation box have texts of their own.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.Prompt    ' Please enter your password:
```

### RequireConfirm
{: .no_toc }

Whether [**ShowDialog**](#showdialog) asks for the password twice.

Syntax: *object*.**RequireConfirm** [ **=** *value* ]

*value*
: A **Boolean**. The default is **False**.

With **True**, the confirmation box shows the typed text in clear; see the warning [above](#how-the-box-works).

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.RequireConfirm    ' False
```

### RequireLowercase
{: .no_toc }

Whether a password needs a lowercase letter.

Syntax: *object*.**RequireLowercase** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**. Letters are `a` to `z`.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.RequireLowercase    ' True
Debug.Print box.Validate("ALLUPPERCASE1")    ' Password must contain at least one lowercase letter
```

### RequireNumber
{: .no_toc }

Whether a password needs a digit.

Syntax: *object*.**RequireNumber** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**. Digits are `0` to `9`.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.RequireNumber    ' True
Debug.Print box.Validate("NoDigitsHere")    ' Password must contain at least one number
```

### RequireSpecial
{: .no_toc }

Whether a password needs a special character.

Syntax: *object*.**RequireSpecial** [ **=** *value* ]

*value*
: A **Boolean**. The default is **False**.

The special characters are ``! @ # $ % ^ & * ( ) _ + - = [ ] { } | ; : ' , . < > ? / ~`` and the grave accent. A space is not one.

```tb check_build check_run
Dim box As New cDialogPassword

box.RequireSpecial = True
Debug.Print box.Validate("Zq7demoxx")     ' Password must contain at least one special character
Debug.Print "[" & box.Validate("Zq7-demo") & "]"    ' []
```

### RequireUppercase
{: .no_toc }

Whether a password needs an uppercase letter.

Syntax: *object*.**RequireUppercase** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**. Letters are `A` to `Z`.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.RequireUppercase    ' True
Debug.Print box.Validate("alllowercase1")    ' Password must contain at least one uppercase letter
```

### ShowStrength
{: .no_toc }

A property that has no effect.

Syntax: *object*.**ShowStrength** [ **=** *value* ]

*value*
: A **Boolean**. The default is **True**.

The value is stored. The box shows no strength; use [**GetStrength**](#getstrength) to rate a password.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.ShowStrength    ' True
```

### Title
{: .no_toc }

The title of the first box and of the messages about a failed entry.

Syntax: *object*.**Title** [ **=** *value* ]

*value*
: A **String**. The default is `Enter Password`.

The class finds the first box by this title to mask it, so a title that another window of the program also uses can lead to that window being masked instead. The other boxes add `- Confirm`, `- Current Password`, `- New Password` or `- Confirm New Password`.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.Title    ' Enter Password
```

## Methods

### GetRequirementsDescription
{: .no_toc }

Returns the rules as text.

Syntax: *object*.**GetRequirementsDescription** ( ) **As String**

Returns `Password requirements:`, then one line (separated by **vbCrLf**) for the length, `- N to M characters`, and one for each rule that is on, such as `- At least one uppercase letter (A-Z)`. The text of the box is shorter: it names the minimum and no maximum.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.GetRequirementsDescription()
' Output:
' Password requirements:
' - 8 to 128 characters
' - At least one uppercase letter (A-Z)
' - At least one lowercase letter (a-z)
' - At least one number (0-9)
```

### GetStrength
{: .no_toc }

Rates a password.

Syntax: *object*.**GetStrength** ( *password* ) **As** [**PasswordStrength**](#passwordstrength)

*password*
: *required* The text to rate.

The class adds points: 1 for 8 or more characters, 1 more for 12 or more, 1 more for 16 or more, 1 each for an uppercase letter, a lowercase letter and a digit, and 2 for a special character (the list under [**RequireSpecial**](#requirespecial)). A score of 0 to 2 is **VeryWeak**, 3 or 4 **Weak**, 5 or 6 **Fair**, and 7 or 8 **Strong**. The rules of the object (minimum, maximum and the required kinds) play no part.

> [!NOTE] 1.1.0.0
> The highest score is 8, so the result is never **VeryStrong**.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.GetStrengthDescription(box.GetStrength("abc"))             ' Very Weak
Debug.Print box.GetStrengthDescription(box.GetStrength("Password1"))       ' Weak
Debug.Print box.GetStrengthDescription(box.GetStrength("Zq7-demo-xx"))     ' Fair
Debug.Print box.GetStrengthDescription(box.GetStrength("Zq7-demo-xxxx"))   ' Strong
Debug.Print box.GetStrengthDescription(box.GetStrength("Zq7-demo-xxxxxxxxxxxx"))   ' Strong
```

### GetStrengthDescription
{: .no_toc }

Names a strength in words.

Syntax: *object*.**GetStrengthDescription** ( *strength* ) **As String**

*strength*
: *required* A [**PasswordStrength**](#passwordstrength) member.

Returns `Very Weak`, `Weak`, `Fair`, `Strong` or `Very Strong`, and an empty string for another value.

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.GetStrengthDescription(PasswordStrength.Fair)           ' Fair
Debug.Print box.GetStrengthDescription(PasswordStrength.VeryStrong)     ' Very Strong
```

### Reset
{: .no_toc }

Restores the starting values.

Syntax: *object*.**Reset**

Empties [**Password**](#password) and sets every property but [**OwnerHwnd**](#ownerhwnd) to its default: [**Title**](#title) `Enter Password`, [**Prompt**](#prompt) `Please enter your password:`, [**PasswordChar**](#passwordchar) `*`, [**MinLength**](#minlength) 8, [**MaxLength**](#maxlength) 128, [**MaxAttempts**](#maxattempts) 3, [**RequireUppercase**](#requireuppercase), [**RequireLowercase**](#requirelowercase), [**RequireNumber**](#requirenumber), [**ShowStrength**](#showstrength) and [**AllowShowPassword**](#allowshowpassword) **True**, and [**RequireSpecial**](#requirespecial), [**RequireConfirm**](#requireconfirm) and [**Cancelled**](#cancelled) **False**.

```tb check_build check_run
Dim box As New cDialogPassword

box.MinLength = 12
box.RequireSpecial = True
box.Reset
Debug.Print box.MinLength         ' 8
Debug.Print box.RequireSpecial    ' False
```

### ShowChangeDialog
{: .no_toc }

Asks for the current password, a new one and its confirmation.

Syntax: *object*.**ShowChangeDialog** ( *oldPassword* ) **As Boolean**

*oldPassword*
: *required* A **String** variable passed by reference. When it is not empty, the current password that the user types must equal it. After a success it holds the new password.

Shows up to three boxes in a row, titled `Title - Current Password`, `Title - New Password` and `Title - Confirm New Password`, with their own texts (the second lists the requirements). The call stops at the first problem and does not repeat any box:

- Cancelling a box: the result is **False** and [**Cancelled**](#cancelled) **True**.
- A current password that differs from *oldPassword* (checked only when *oldPassword* is not empty): `Incorrect current password.`
- A new password that [**Validate**](#validate) refuses: its message.
- A new password equal to the current one: `New password must be different from the current password.`
- A confirmation that differs from the new password: `Passwords do not match.`

In each of the last four cases the result is **False**, [**Cancelled**](#cancelled) is not changed, and *oldPassword* and [**Password**](#password) are not changed. On success the result is **True** and the new password is in *oldPassword* and [**Password**](#password). The boxes show what is typed in clear text; see the warning [above](#how-the-box-works).

```tb check_build
Dim box As New cDialogPassword
Dim stored As String

stored = "Old-demo-pw1"
If box.ShowChangeDialog(stored) Then
    Debug.Print "Password changed"
ElseIf box.Cancelled Then
    Debug.Print "Cancelled"
Else
    Debug.Print "Not changed"
End If
```

### ShowDialog
{: .no_toc }

Asks for a password.

Syntax: *object*.**ShowDialog** ( ) **As Boolean**

Returns **True** when the user entered a password that passes [**Validate**](#validate) (and the confirmation, if [**RequireConfirm**](#requireconfirm) is on), and then [**Password**](#password) holds it and [**Cancelled**](#cancelled) is **False**. Returns **False**, with [**Cancelled**](#cancelled) **True**, when the user cancelled or [**MaxAttempts**](#maxattempts) attempts failed. [How the box works](#how-the-box-works) lists the steps.

```tb check_build
Dim box As New cDialogPassword

box.Title = "Unlock"
box.Prompt = "Password for the archive:"
box.MinLength = 6
box.RequireNumber = False
box.RequireUppercase = False
box.MaxAttempts = 2

If box.ShowDialog() Then
    Debug.Print "Password has " & Len(box.Password) & " characters"
Else
    Debug.Print "No password"
End If
```

### Validate
{: .no_toc }

Checks a password against the rules.

Syntax: *object*.**Validate** ( *password* ) **As String**

*password*
: *required* The text to check.

Returns an empty string when the text passes and otherwise the reason. The checks run in this order, and the first that fails decides:

| Check | Message |
|---|---|
| Fewer characters than [**MinLength**](#minlength) | `Password must be at least N characters` |
| More characters than [**MaxLength**](#maxlength) | `Password must not exceed N characters` |
| No uppercase letter, with [**RequireUppercase**](#requireuppercase) | `Password must contain at least one uppercase letter` |
| No lowercase letter, with [**RequireLowercase**](#requirelowercase) | `Password must contain at least one lowercase letter` |
| No digit, with [**RequireNumber**](#requirenumber) | `Password must contain at least one number` |
| No special character, with [**RequireSpecial**](#requirespecial) | `Password must contain at least one special character` |

```tb check_build check_run
Dim box As New cDialogPassword

Debug.Print box.Validate("short")            ' Password must be at least 8 characters
Debug.Print box.Validate("alllowercase1")    ' Password must contain at least one uppercase letter
Debug.Print "[" & box.Validate("Zq7-demo-xx") & "]"    ' []
```

## Enumerations

### PasswordStrength
{: .no_toc }

The result of [**GetStrength**](#getstrength).

| Member | Value |
|---|---|
| **VeryWeak** | 0 |
| **Weak** | 1 |
| **Fair** | 2 |
| **Strong** | 3 |
| **VeryStrong** | 4 |

## Example

This example asks for a new password for an account and tells the user how good it is.

```tb check_build
Dim box As New cDialogPassword
Dim current As String

current = "Old-demo-pw1"
box.Title = "Change password"
box.MinLength = 10
box.RequireSpecial = True

Debug.Print box.GetRequirementsDescription()

If box.ShowChangeDialog(current) Then
    Debug.Print "New password is " & box.GetStrengthDescription(box.GetStrength(current))
End If
```

## See Also

- [cDialogInputBox](cDialogInputBox) class -- asks for one line of text, without a mask
- [cDialogCountdownMsgBox](cDialogCountdownMsgBox) class -- shows a message box that closes by itself
- [TBMANLIB_Dialog](.) package -- overview
