---
title: TbrButtons
parent: ToolBar
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ToolBar/TbrButtons
has_toc: false
---

# TbrButtons class
{: .no_toc }

The collection of the buttons of a [**ToolBar**](.), which its [**Buttons**](.#buttons-1) property returns. Its items are [**TbrButton**](TbrButton) objects, numbered from 1, and an item can have a key as well.

```tb check_build check_run arch=win32,win64
Dim Button As TbrButton
ToolBar1.Buttons.Add , "new", "New"
ToolBar1.Buttons.Add , "open", "Open"
ToolBar1.Buttons.Add 1, "save", "Save"            ' before the first
For Each Button In ToolBar1.Buttons
    Debug.Print Button.Index; Button.Key
Next
' Output:
'  1 save
'  2 new
'  3 open
```

A program goes through the buttons with **For Each**, or by number from 1 to [**Count**](#count). It cannot make a **TbrButtons** object with **New**.

* TOC
{:toc}

## Numbers and keys

The number of a button in the collection is its [**Index**](TbrButton#index). It changes when a button is added before it or removed before it, so that a program that keeps a number over such a change keeps the wrong button. A key stays with its button.

<!-- test: ToolBarTests.Buttons_Item_UnknownKey_Raises5, ToolBarTests.Buttons_Add_DuplicateKey_Raises457 -->
A key is any string, and capital and small letters in it are the same: `"Open"` and `"OPEN"` are one key. No two buttons of a toolbar have the same key. A button needs no key: an empty string is no key, and any number of buttons can be without one.
<!-- /test -->

The order of the collection is not the order on the toolbar. The user, or the program through [**Position**](TbrButton#position), moves a button on the toolbar, and its **Index** does not change.

Properties
----------

### Count
{: .no_toc }

The number of buttons in the collection. **Long**, read-only.

### Item
{: .no_toc }

Returns one button. It is the default member, so `ToolBar1.Buttons("open")` is `ToolBar1.Buttons.Item("open")`.

Syntax: *object*.**Item**( *Index* ) **As TbrButton**

*Index*
: *required* The number of the button, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: ToolBarTests.Buttons_Item_NumberOutOfRange_Raises9, ToolBarTests.Buttons_Item_UnknownKey_Raises5 -->
A number outside that range raises run-time error 9, and a key that no button has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Puts a button on the toolbar and returns its [**TbrButton**](TbrButton).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Caption* ] [, *Style* ] [, *Image* ] ) **As TbrButton**

*Index*
: *optional* A **Long**: the number the new button gets. The buttons from that number on move up by one, on the toolbar as well. Without it, or with 0, the button goes after the last one.

*Key*
: *optional* A **String** by which the program can name the button. See [Numbers and keys](#numbers-and-keys).

*Caption*
: *optional* A **String**: the text of the button. An ampersand before a letter makes the letter the button's mnemonic.

*Style*
: *optional* A member of [**TbrButtonStyleConstants**](.#tbrbuttonstyleconstants). Default: **TbrButtonStyleDefault**.

*Image*
: *optional* A **Variant**: the number of a picture in the toolbar's [**ImageList**](.#imagelist), or its key as a **String**.

<!-- test: ToolBarTests.Buttons_Add_AtAnIndex_MovesTheLaterButtons -->
A button added at an *Index* stands at that place on the toolbar as well as in the collection, and the later buttons move up in both.
<!-- /test -->

<!-- test: ToolBarTests.Buttons_Add_IndexOutOfRange_Raises35600, ToolBarTests.Buttons_Add_DuplicateKey_Raises457, ToolBarTests.Buttons_Add_StyleOutOfRange_Raises380 -->
An *Index* below 0, and one above [**Count**](#count) + 1, raises run-time error 35600, *Index out of bounds*. A *Key* that another button has raises run-time error 457. A *Style* that is not a member raises error 380.
<!-- /test -->

A key as *Image* needs an image list on the toolbar that has a picture of that key: where it has not, the call raises run-time error 35601, *Element not found*, and a negative number raises error 35600.

<!-- test: ToolBarTests.Buttons_Add_DuplicateKey_AddsNothingToTheWindow -->
> [!WARNING] 1.8.136.0
> A call that raises error 457 for its key has already put its button on the toolbar. The collection is as it was, and the toolbar shows one button more than [**Count**](#count) says, which no **TbrButton** reaches. A program asks [**Exists**](#exists) before it adds a button with a key that the toolbar may have.

### Clear
{: .no_toc }

Removes every button.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

<!-- test: ToolBarTests.Buttons_Exists_SaysWhetherTheListHasTheNumberOrKey -->
Returns whether the collection has a button of a number or a key, so that a program can ask before [**Item**](#item) raises an error.
<!-- /test -->

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one button. The buttons after it move down by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the button. One that the collection does not have raises the error that [**Item**](#item) raises for it.

<!-- test: ToolBarTests.Buttons_Remove_RenumbersTheLaterButtons -->
A button object that the program kept, and that was removed, no longer belongs to the toolbar: reading its **Position** gives 0.
<!-- /test -->

## See Also

- [ToolBar](.) class
- [TbrButton](TbrButton) class -- one button
- [TbrButtonStyleConstants](.#tbrbuttonstyleconstants) -- the values of the *Style* argument of **Add**
