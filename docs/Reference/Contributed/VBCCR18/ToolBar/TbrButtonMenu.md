---
title: TbrButtonMenu
parent: ToolBar
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ToolBar/TbrButtonMenu
has_toc: false
---

# TbrButtonMenu class
{: .no_toc }

One item of the menu that a drop-down button of a [**ToolBar**](.) shows: its text, its state, an optional picture, or a separator line in its place. A program gets one from the [**TbrButtonMenus**](TbrButtonMenus) collection, and from that collection's [**Add**](TbrButtonMenus#add) method.

```tb check_build check_run arch=win32,win64
Dim Button As TbrButton, Item As TbrButtonMenu
Set Button = ToolBar1.Buttons.Add(, "paste", "Paste", TbrButtonStyleDropDown)
Set Item = Button.ButtonMenus.Add(, "plain", "Paste as plain text")
Item.Checked = True
Button.ButtonMenus.Add , , "-"
Button.ButtonMenus(2).Separator = True
Debug.Print Item.Parent.Key; ": "; Item.Text
Debug.Print Button.ButtonMenus(2).Separator
' Output:
' paste: Paste as plain text
' True
```

A program cannot make a **TbrButtonMenu** object with **New**. The user's choice of an item raises the toolbar's [**ButtonMenuClick**](.#buttonmenuclick) event with the item. The menu is made from the items each time the button opens it, after [**ButtonDropDown**](.#buttondropdown) has been raised, so a handler of that event can still change the items.

* TOC
{:toc}

Properties
----------

### Checked
{: .no_toc }

Whether the item has a check mark. **Boolean**. Default: **False**.

### Enabled
{: .no_toc }

Whether the user can choose the item. **Boolean**. Default: **True**. A disabled item is drawn greyed.

### Index
{: .no_toc }

The number of the item in the [**TbrButtonMenus**](TbrButtonMenus) collection and in the menu, from 1. **Long**, read-only. It changes when an item is added or removed before this one.

### Key
{: .no_toc }

The key of the item in the collection. **String**. Empty for an item without a key.

<!-- test: ToolBarTests.ButtonMenu_Key_Assigned_RenamesTheItem -->
An assignment gives the item another key, and the collection no longer finds it by the old one. A key that another item of the button has raises run-time error 457, and the item keeps its key.
<!-- /test -->

### Parent
{: .no_toc }

The button that has the item. A [**TbrButton**](TbrButton), read-only.

### Picture
{: .no_toc }

A picture drawn beside the text of the item. An icon or a bitmap, as a picture object. Default: **Nothing**. The item keeps a copy.

### Separator
{: .no_toc }

Whether the item is a horizontal line that divides the menu, in place of a choice. **Boolean**. Default: **False**. A separator ignores [**Text**](#text), [**Enabled**](#enabled), [**Checked**](#checked) and [**Picture**](#picture), and the user cannot choose it.

### Tag
{: .no_toc }

A value of the program's own, which the toolbar does not use. **Variant**: it holds a value of any type, an object included, which is assigned with **Set**. A new item has an empty string.

### Text
{: .no_toc }

The text of the item. **String**. It is the default member. An ampersand before a letter makes the letter the item's mnemonic in the menu.

### Visible
{: .no_toc }

Whether the menu shows the item. **Boolean**. Default: **True**. A hidden item takes no place in the menu, and the numbers of the other items do not change.

## See Also

- [ToolBar](.) class
- [TbrButton](TbrButton) class -- the button that has the menu
- [TbrButtonMenus](TbrButtonMenus) class -- the collection of the items
