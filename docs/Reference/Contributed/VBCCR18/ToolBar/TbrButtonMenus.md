---
title: TbrButtonMenus
parent: ToolBar
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ToolBar/TbrButtonMenus
has_toc: false
---

# TbrButtonMenus class
{: .no_toc }

The collection of the menu items of a drop-down button, which the [**ButtonMenus**](TbrButton#buttonmenus) property of a [**TbrButton**](TbrButton) returns. Its items are [**TbrButtonMenu**](TbrButtonMenu) objects, numbered from 1, and an item can have a key as well.

```tb check_build check_run arch=win32,win64
Dim Button As TbrButton
Set Button = ToolBar1.Buttons.Add(, "view", "View", TbrButtonStyleWholeDropDown)
Button.ButtonMenus.Add , "list", "List"
Button.ButtonMenus.Add , "icons", "Icons"
Button.ButtonMenus("list").Checked = True
Debug.Print Button.ButtonMenus.Count; Button.ButtonMenus("icons").Index
' Output:
'  2  2
```

A program goes through the items with **For Each**, or by number from 1 to [**Count**](#count). It cannot make a **TbrButtonMenus** object with **New**. The items are those of the menu that the button shows when its style is **TbrButtonStyleDropDown** or **TbrButtonStyleWholeDropDown**, in the order of the collection; a button whose [**hMenu**](TbrButton#hmenu) names a menu of Windows shows that menu instead.

* TOC
{:toc}

## Numbers and keys

The number of an item is its place in the collection and in the menu. It changes when an item is added before it or removed before it. A key stays with its item. A key is any string, capital and small letters are the same, and no two items of a button have the same key. An item needs no key.

Properties
----------

### Count
{: .no_toc }

The number of items in the collection. **Long**, read-only.

### Item
{: .no_toc }

Returns one item. It is the default member, so `Button.ButtonMenus("list")` is `Button.ButtonMenus.Item("list")`.

Syntax: *object*.**Item**( *Index* ) **As TbrButtonMenu**

*Index*
: *required* The number of the item, from 1 to [**Count**](#count), or its key as a **String**.

<!-- test: ToolBarTests.ButtonMenus_Add_RefusedArguments_RaiseTheirErrors -->
A number outside that range raises run-time error 9, and a key that no item has raises run-time error 5. [**Exists**](#exists) asks without an error.
<!-- /test -->

Methods
-------

### Add
{: .no_toc }

Puts an item into the menu and returns its [**TbrButtonMenu**](TbrButtonMenu).

Syntax: *object*.**Add**( [ *Index* ] [, *Key* ] [, *Text* ] ) **As TbrButtonMenu**

*Index*
: *optional* A **Long**: the number the new item gets. The items from that number on move up by one. Without it, or with 0, the item goes after the last one.

*Key*
: *optional* A **String** by which the program can name the item.

*Text*
: *optional* A **String**: the text of the item. An ampersand before a letter makes the letter the item's mnemonic in the menu.

<!-- test: ToolBarTests.ButtonMenus_Add_AtAnIndex_MovesTheLaterMenus, ToolBarTests.ButtonMenus_Add_RefusedArguments_RaiseTheirErrors -->
An *Index* below 0, and one above [**Count**](#count) + 1, raises run-time error 35600, *Index out of bounds*. A *Key* that another item has raises run-time error 457, and the collection is as it was.
<!-- /test -->

### Clear
{: .no_toc }

Removes every item.

Syntax: *object*.**Clear**

### Exists
{: .no_toc }

Returns whether the collection has an item of a number or a key, so that a program can ask before [**Item**](#item) raises an error.

Syntax: *object*.**Exists**( *Index* ) **As Boolean**

*Index*
: *required* The number or the key to look for.

### Remove
{: .no_toc }

Removes one item. The items after it move down by one.

Syntax: *object*.**Remove** *Index*

*Index*
: *required* The number or the key of the item. One that the collection does not have raises the error that [**Item**](#item) raises for it.

## See Also

- [ToolBar](.) class
- [TbrButton](TbrButton) class -- the button that has the menu
- [TbrButtonMenu](TbrButtonMenu) class -- one menu item
