---
title: TbrButton
parent: ToolBar
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ToolBar/TbrButton
has_toc: false
---

# TbrButton class
{: .no_toc }

One button of a [**ToolBar**](.): its caption, its picture, its style and state, its place, and the menu items of a drop-down button. A program gets one from the [**TbrButtons**](TbrButtons) collection, and from that collection's [**Add**](TbrButtons#add) method.

```tb check_build check_run arch=win32,win64
Dim Button As TbrButton
Set Button = ToolBar1.Buttons.Add(, "bold", "Bold", TbrButtonStyleCheck)
Button.ToolTipText = "Bold"
Button.Value = TbrButtonValuePressed
Debug.Print Button.Caption; Button.Value
' Output:
' Bold 1
```

A program cannot make a **TbrButton** object with **New**. A variable that holds one keeps it as long as the toolbar does not make its window again, which [a change of some properties of the toolbar](.#buttons) does. A button that was removed from the collection no longer reaches the toolbar.

* TOC
{:toc}

## Style and state

The [**Style**](#style) of a button is a member of [**TbrButtonStyleConstants**](.#tbrbuttonstyleconstants). A button of style **TbrButtonStyleCheck** or **TbrButtonStyleCheckGroup** is pressed or not by its [**Value**](#value), and the user changes it with a click.

<!-- test: ToolBarTests.Button_Style_Assigned_ChangesTheStyleAndKeepsTheCaption -->
Another **Style** keeps the button's caption, and releases the button if it was pressed. A value that is not a member raises run-time error 380.
<!-- /test -->

The state of a button is [**Enabled**](#enabled), [**Visible**](#visible), [**Value**](#value), [**MixedState**](#mixedstate), [**HighLighted**](#highlighted) and, while the pointer is over it, [**Hot**](#hot). A disabled button shows its caption and picture greyed and takes no click. A hidden one takes no room on the toolbar: the buttons after it move up, and its [**Left**](#left), [**Top**](#top), [**Width**](#width) and [**Height**](#height) read 0.

## Width

A button is as wide as the toolbar's [**ButtonWidth**](.#buttonwidth) says, or wider where its picture and caption need the room. [**AutoSize**](#autosize) makes the width follow the caption and the picture, and [**CustomWidth**](#customwidth) gives it a width of its own.

<!-- test: ToolBarTests.Button_AutoSize_WidthFollowsTheCaption, ToolBarTests.Button_CustomWidth_SetsTheWidth -->
```tb check_build check_run arch=win32,win64
Dim Wide As TbrButton, Narrow As TbrButton
Set Narrow = ToolBar1.Buttons.Add(, "a", "A")
Set Wide = ToolBar1.Buttons.Add(, "b", "A button with a long caption")
Dim Standard As Single
Standard = Narrow.Width
Narrow.AutoSize = True
Wide.AutoSize = True
Debug.Print Narrow.Width < Standard
Debug.Print Wide.Width > Standard
' Output:
' True
' True
```
<!-- /test -->

Properties
----------

### AutoSize
{: .no_toc }

Whether the button is as wide as its caption and its picture need, in place of the toolbar's [**ButtonWidth**](.#buttonwidth). **Boolean**. Default: **False**. A button with **AutoSize** **True** takes no [**CustomWidth**](#customwidth).

### ButtonMenus
{: .no_toc }

The menu items of a drop-down button. A [**TbrButtonMenus**](TbrButtonMenus) object, read-only. The button shows them when its style is **TbrButtonStyleDropDown** or **TbrButtonStyleWholeDropDown**, unless its [**hMenu**](#hmenu) names a menu.

### Caption
{: .no_toc }

The text of the button. **String**. It is the default member. An ampersand before a letter makes the letter the mnemonic of the button, unless [**NoPrefix**](#noprefix) is **True**.

### CustomWidth
{: .no_toc }

The width the program gives the button, in the container's scale units. **Single**. Default: 0, which leaves the width to the toolbar.

<!-- test: ToolBarTests.Button_CustomWidth_SetsTheWidth -->
A negative value raises run-time error 380.
<!-- /test -->

### Description
{: .no_toc }

The text by which the customization dialog of Windows names the button. **String**. Default: empty. See [Customizing](.#customizing).

### Enabled
{: .no_toc }

Whether the button takes a click. **Boolean**. Default: **True**.

### ForeColor
{: .no_toc }

The color of the caption. **OLE_COLOR**. Default: **vbButtonText**. A button that is hot while the toolbar's [**HotTracking**](.#hottracking) is **True** draws its caption in **vbHighlightText**.

### Height
{: .no_toc }

The height of the button, in the container's scale units. **Single**, read-only.

<!-- test: ToolBarTests.Button_Place_Assigned_Raises383 -->
An assignment to **Height**, **Left**, **Top** or **Width** raises run-time error 383.
<!-- /test -->

### hMenu
{: .no_toc }

The handle of a menu of Windows that the program has made, which a drop-down button shows in place of its [**ButtonMenus**](#buttonmenus). **LongPtr**. Default: 0. The toolbar does not destroy the menu. A chosen item raises [**ButtonMenuClick2**](.#buttonmenuclick2) with the item's identifier.

### HighLighted
{: .no_toc }

Whether the button is marked: it is drawn in the highlighted state. **Boolean**. Default: **False**. A program with visual styles draws the button's picture blended instead.

### Hot
{: .no_toc }

Whether the button is the toolbar's hot button. **Boolean**. Assigned **True** it makes the button hot, and assigned **False** it takes the hot state away if the button has it. Each change raises [**ButtonHotChanged**](.#buttonhotchanged). See [Hot buttons](.#hot-buttons).

### ID
{: .no_toc }

The number by which the toolbar's window knows the button, in the messages that Windows sends about it. **Long**, read-only. It stays with the button when the button moves.

### Image
{: .no_toc }

The picture of the button: its number in the toolbar's [**ImageList**](.#imagelist), or its key. **Variant**. Default: 0, which is no picture. It is what the program gave to the property or to [**Add**](TbrButtons#add): a key stays a key.

<!-- test: ToolBarTests.Button_Image_FromTheImageList_ByKeyAndNumber -->
A key that the image list does not have, or a key when the toolbar has no image list, raises run-time error 35601, *Element not found*. A negative number raises error 35600, *Index out of bounds*, and the button keeps its picture after either error.
<!-- /test -->

### ImageIndex
{: .no_toc }

The number of the button's picture in the image list. **Long**, read-only. It is 0 for a button without a picture, and it is the number that a key stands for.

### Index
{: .no_toc }

The number of the button in the [**TbrButtons**](TbrButtons) collection, from 1. **Long**, read-only. It changes when a button is added or removed before this one, and not when the button is moved on the toolbar.

### Key
{: .no_toc }

The key of the button in the collection. **String**. Empty for a button without a key.

<!-- test: ToolBarTests.Button_Key_Assigned_RenamesTheButton -->
An assignment gives the button another key, and the collection no longer finds it by the old one. An empty string takes the key away. A key that another button has raises run-time error 457, and the button keeps its key.
<!-- /test -->

### Left
{: .no_toc }

The distance between the left edge of the toolbar and the left edge of the button, in the container's scale units. **Single**, read-only. See [**Height**](#height).

### MixedState
{: .no_toc }

Whether the button is drawn in the indeterminate state, as a check button is that is neither pressed nor released. **Boolean**. Default: **False**.

### NoImage
{: .no_toc }

Whether the button is drawn without a picture, and without room for one, even where it has one. **Boolean**. Default: **False**.

### NoPrefix
{: .no_toc }

Whether an ampersand in the caption is an ordinary character, without a mnemonic. **Boolean**. Default: **False**.

### Position
{: .no_toc }

The button's place on the toolbar, counted from 1. **Long**. It is the number of the button as the user sees it, which differs from [**Index**](#index) once a button has moved. Assigned a number, it moves the button there, and the buttons it passes shift by one.

<!-- test: ToolBarTests.Button_Position_MovesTheButtonNotItsIndex, ToolBarTests.Button_Position_OwnPlace_Raises380, ToolBarTests.Button_Position_AboveTheLastPlace_MovesTheButtonToTheEnd -->
A value that is the button's own position raises run-time error 380, because nothing moves. A value above the number of buttons moves the button to the end.
<!-- /test -->

### Style
{: .no_toc }

What kind of button it is. A member of [**TbrButtonStyleConstants**](.#tbrbuttonstyleconstants). Default: the style the button was added with. See [Style and state](#style-and-state).

### Tag
{: .no_toc }

A value of the program's own, which the toolbar does not use. **Variant**: unlike the [**Tag**](../Common#tag) of the control it holds a value of any type, an object included, which is assigned with **Set**.

<!-- test: ToolBarTests.Button_Tag_NewButton_IsAnEmptyString -->
A new button has an empty string.
<!-- /test -->

### ToolTipText
{: .no_toc }

The text shown in a small window when the pointer rests on the button, while the toolbar's [**ShowTips**](.#showtips) is **True**. **String**. Default: empty.

### Top
{: .no_toc }

The distance between the top edge of the toolbar and the top edge of the button, in the container's scale units. **Single**, read-only. See [**Height**](#height).

### Value
{: .no_toc }

Whether the button is pressed. A member of [**TbrButtonValueConstants**](.#tbrbuttonvalueconstants). Default: **TbrButtonValueUnpressed**.

<!-- test: ToolBarTests.Button_Value_CheckGroup_UnpressesTheOthers -->
Pressing a check group button releases the other buttons of its group, and a check button changes alone.
<!-- /test -->

### Visible
{: .no_toc }

Whether the button is shown. **Boolean**. Default: **True**.

<!-- test: ToolBarTests.Button_Visible_False_MovesTheLaterButtonsUp -->
A hidden button keeps its [**Position**](#position) and its place in the collection, and the buttons after it move up on the toolbar.
<!-- /test -->

### Width
{: .no_toc }

The width of the button, in the container's scale units. **Single**, read-only. See [**Height**](#height).

## See Also

- [ToolBar](.) class
- [TbrButtons](TbrButtons) class -- the collection of the buttons
- [TbrButtonMenus](TbrButtonMenus) class -- the menu items of a drop-down button
- [TbrButtonStyleConstants](.#tbrbuttonstyleconstants) -- the values of **Style**
- [TbrButtonValueConstants](.#tbrbuttonvalueconstants) -- the values of **Value**
