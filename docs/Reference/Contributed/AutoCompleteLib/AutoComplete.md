---
title: AutoComplete
parent: AutoCompleteLib Package
permalink: /tB/Packages/Contributed/AutoCompleteLib/AutoComplete
has_toc: false
---

# AutoComplete class
{: .no_toc }

A class that attaches Windows shell auto-complete behaviour to a text-input control's window handle.

<!-- test: InitTests.CustomSource_CompletesTheTypedText, InitTests.FileSystem_CompletesAPath, InitTests.All_CompletesAPath, InitTests.HistoryMruAndAll_RaiseNothing -->
**AutoComplete** wraps the `IAutoComplete2` COM interface. After calling [**Init**](#init) with the window handle of an edit box and a source type, the Windows shell begins offering suggestions as the user types. The source can be the shell history, the file system, the most-recently-used list, all three combined, or a custom string array supplied through [**CustomSource**](#customsource).
<!-- /test -->

```tb check_build
Private m_AC As AutoComplete

Private Sub Form_Load()
    Set m_AC = New AutoComplete
    m_AC.Init Text1.hWnd, AutoCompleteSourceHistory
    m_AC.Options = AutoCompleteOptionSuggestAppend
End Sub
```

* TOC
{:toc}

## Properties

### CustomSource
{: .no_toc }

Returns or sets a one-dimensional **String** array used as the suggestion list when [**Init**](#init) is called with **AutoCompleteSourceCustomSource**.

Syntax: *object*.**CustomSource** [ = *StringArray* ]

<!-- test: CustomSourceTests.Set_Strings_AreKeptInOrder, CustomSourceTests.Set_EmptyStrings_AreIgnored, CustomSourceTests.Set_NonStringElements_AreIgnored, CustomSourceTests.Set_ArrayOfNumbers_GivesAnEmptyList, CustomSourceTests.Set_TypedStringArray_WithALowerBound_IsKept, CustomSourceTests.Set_ZeroLengthArray_ClearsTheList, CustomSourceTests.Set_Empty_ClearsTheList, CustomSourceTests.Set_TwoDimensionalArray_Raises5_AndKeepsTheList, CustomSourceTests.Set_UnallocatedArray_Raises91_AndKeepsTheList, CustomSourceTests.Set_AValueThatIsNotAnArray_Raises380, InitTests.CustomSource_ClearedAfterInit_CompletesNothing -->
*StringArray*
: A one-dimensional **Variant** holding a **String** array. Empty strings and non-string elements are silently ignored. Assigning **Empty** clears the list. A two-or-more-dimensional array raises run-time error 5 ("Array must be single dimensioned"). An unallocated array raises run-time error 91. Any other value that is not an array raises run-time error 380. An assignment that raises an error leaves the list as it was.
<!-- /test -->

<!-- test: CustomSourceTests.Get_ReturnsAZeroBasedStringArray, CustomSourceTests.Set_TypedStringArray_WithALowerBound_IsKept, CustomSourceTests.Set_NewArray_ReplacesThePreviousListInFull, CustomSourceTests.Get_EmptyList_IsAnArrayThatIsNotAllocated, InitTests.CustomSource_ReplacedAfterInit_CompletesFromTheNewList, InitTests.CustomSource_NoMatch_LeavesTheText, InitTests.CustomSource_EmptyList_LeavesTheText -->
The getter returns the filtered array currently stored in the object: a zero-based array of **String**, whatever the bounds of the array that was assigned. While the list is empty, the array is not allocated, and **UBound** of it raises run-time error 9. Assigning a new value replaces the previous list in full, also while the list is attached to a window; there is no way to append individual entries.
<!-- /test -->

### FileSystemOptions
{: .no_toc }

Returns or sets the file-system objects enumerated when the source is **AutoCompleteSourceFileSystem** or **AutoCompleteSourceAll**.

Syntax: *object*.**FileSystemOptions** [ = *value* ]

*value*
: One or more [**AutoCompleteFileSystemOptionConstants**](Enumerations/AutoCompleteFileSystemOptionConstants) values combined with `Or`.

| Constant | Value | Description |
|----------|-------|-------------|
| **AutoCompleteFileSystemOptionNone** | 0 | No specific file-system objects. |
| **AutoCompleteFileSystemOptionCurrentDir** | 1 | The current directory. |
| **AutoCompleteFileSystemOptionMyComputer** | 2 | Objects under *My Computer*. |
| **AutoCompleteFileSystemOptionDesktop** | 4 | Desktop objects. |
| **AutoCompleteFileSystemOptionFavorites** | 8 | Favorites folder contents. |
| **AutoCompleteFileSystemOptionFileSysOnly** | 16 | File-system items only (no virtual shell folders). |
| **AutoCompleteFileSystemOptionFileSysDirs** | 32 | Directories only. |

<!-- test: FileSystemOptionsTests.EachConstant_IsKept, FileSystemOptionsTests.Combination_IsKept, FileSystemOptionsTests.FileSysDirs_OffersADirectory, FileSystemOptionsTests.FileSysDirs_DoesNotOfferAFile, FileSystemOptionsTests.FileSysOnly_OffersAFile, FileSystemOptionsTests.SetBeforeInit_Applies, FileSystemOptionsTests.SetAfterInit_Applies, FileSystemOptionsTests.AllSource_FollowsTheSetting, OptionsTests.Constants_HaveTheDocumentedValues -->
The getter returns the value that was set. The setting applies whether it is made before or after [**Init**](#init), and to the source **AutoCompleteSourceAll** as to **AutoCompleteSourceFileSystem**. With **AutoCompleteFileSystemOptionFileSysDirs**, the list offers directories and no files; with **AutoCompleteFileSystemOptionFileSysOnly**, it offers files.
<!-- /test -->

### Options
{: .no_toc }

Returns or sets flags that control how the completion works.

Syntax: *object*.**Options** [ = *value* ]

*value*
: One or more [**AutoCompleteOptionConstants**](Enumerations/AutoCompleteOptionConstants) values combined with `Or`.

| Constant | Value | Description |
|----------|-------|-------------|
| **AutoCompleteOptionNone** | &H0 | No special behaviour. |
| **AutoCompleteOptionAppend** | &H2 | Appends the best match to the typed text inline. |
| **AutoCompleteOptionSuggest** | &H1 | Shows a drop-down list of suggestions. |
| **AutoCompleteOptionSuggestAppend** | &H3 | Both **AutoCompleteOptionSuggest** and **AutoCompleteOptionAppend**. |
| **AutoCompleteOptionSearch** | &H4 | Adds a search item at the bottom of the drop-down list. |
| **AutoCompleteOptionFilterPrefixes** | &H8 | Does not match common prefixes such as `www.` and `http://`. |
| **AutoCompleteOptionUseTab** | &H10 | Selects the highlighted suggestion when the user presses **Tab**. |
| **AutoCompleteOptionUpDownKeyDropsList** | &H20 | Opens the drop-down list when the user presses the **Up** or **Down** arrow key. |
| **AutoCompleteOptionRightToLeft** | &H40 | Shows the text of the drop-down list from right to left. |

<!-- test: OptionsTests.EachConstant_IsKept, OptionsTests.Combination_IsKept, OptionsTests.Append_AppendsTheBestMatch, OptionsTests.None_AppendsNothing, OptionsTests.SetAfterInit_Applies, InitTests.CustomSource_CompletesTheTypedText -->
The getter returns the value that was set. The setting applies whether it is made before or after [**Init**](#init). With **AutoCompleteOptionAppend** the text of the best match is appended to what was typed and selected; with **AutoCompleteOptionNone** nothing is appended.
<!-- /test -->

## Methods

### Disable
{: .no_toc }

Disables auto-complete without destroying the object.

Syntax: *object*.**Disable**

<!-- test: SwitchTests.Disable_StopsTheSuggestions, SwitchTests.Disable_KeepsTheSourceAndTheList -->
Auto-complete stops offering suggestions. Call [**Enable**](#enable) to turn it back on without calling [**Init**](#init) again.
<!-- /test -->

### DroppedDown
{: .no_toc }

Returns whether the suggestion drop-down list is currently visible.

Syntax: *object*.**DroppedDown** ( ) **As Boolean**

Returns **True** when the drop-down is open, **False** otherwise. The return value is **False** if the `IAutoCompleteDropDown` interface cannot be obtained.

<!-- test: SwitchTests.DroppedDown_BeforeAnyList_IsFalse -->
An object that has not been initialised, and one whose list has not been opened, return **False**.
<!-- /test -->

### Enable
{: .no_toc }

<!-- test: SwitchTests.Enable_ResumesTheSuggestions -->
Re-enables auto-complete after a call to [**Disable**](#disable).
<!-- /test -->

Syntax: *object*.**Enable**

### Init
{: .no_toc }

Attaches auto-complete to a text-input control.

Syntax: *object*.**Init** *hWndEdit*, *Source*

*hWndEdit*
: *required* A **LongPtr** (32-bit: **Long**) containing the window handle of the edit control that should receive suggestions.

*Source*
: *required* An [**AutoCompleteSourceConstants**](Enumerations/AutoCompleteSourceConstants) value identifying where suggestions come from.

| Constant | Value | Description |
|----------|-------|-------------|
| **AutoCompleteSourceNone** | 0 | Not valid; passing this value raises run-time error 380. |
| **AutoCompleteSourceHistory** | 1 | The shell history list (the `ACLHistory` shell object). |
| **AutoCompleteSourceFileSystem** | 2 | File-system paths, filtered by [**FileSystemOptions**](#filesystemoptions). |
| **AutoCompleteSourceMRU** | 3 | The shell most-recently-used list. |
| **AutoCompleteSourceAll** | 4 | History, file system, and MRU combined through an `IObjMgr`. |
| **AutoCompleteSourceCustomSource** | 5 | The one-dimensional string array set through [**CustomSource**](#customsource). |

The target control must exist when **Init** is called, and **Init** is called before the user starts typing.

<!-- test: InitTests.SourceNone_Raises380, InitTests.SourceOutsideTheTable_Raises380, InitTests.WindowHandleZero_Raises5 -->
Calling **Init** with **AutoCompleteSourceNone**, or with any other value outside the table, raises run-time error 380 (Invalid property value). A *hWndEdit* of 0 raises run-time error 5 (Automation error).
<!-- /test -->

If the internal `IAutoComplete2` object could not be created when the **AutoComplete** object was created, **Init** exits silently.

<!-- test: InitTests.SecondCall_OnTheSameObject_Raises, InitTests.OneObjectForEachWindow_RaiseNothing -->
> [!NOTE] 1.0.3.0
> An **AutoComplete** object attaches to one window, once. A second call to **Init** on the same object, for the same window or for another, raises run-time error -2147467259 (Automation error) and attaches nothing. Create one **AutoComplete** object for each text box.

### Refresh
{: .no_toc }

Forces the drop-down list to rebuild its suggestions from the current source.

Syntax: *object*.**Refresh**

Calls `IAutoCompleteDropDown.ResetEnumerator` on the underlying COM object. Use this after modifying [**CustomSource**](#customsource) while the list is open, or whenever the suggestion set changes at run time.

## Example

This example attaches file-system auto-complete to a text box and restricts suggestions to directories.

```tb check_build
Private m_AC As AutoComplete

Private Sub Form_Load()
    Set m_AC = New AutoComplete
    m_AC.FileSystemOptions = AutoCompleteFileSystemOptionFileSysDirs
    m_AC.Options = AutoCompleteOptionSuggestAppend
    m_AC.Init Text1.hWnd, AutoCompleteSourceFileSystem
End Sub
```

This example supplies a fixed custom list.

```tb check_build
Private m_AC As AutoComplete

Private Sub Form_Load()
    Set m_AC = New AutoComplete
    m_AC.CustomSource = Array("Apple", "Apricot", "Avocado", "Banana", "Blueberry")
    m_AC.Options = AutoCompleteOptionSuggest
    m_AC.Init Text1.hWnd, AutoCompleteSourceCustomSource
End Sub

Private Sub btnRefresh_Click()
    m_AC.CustomSource = Array("Cherry", "Clementine", "Coconut")
    m_AC.Refresh
End Sub
```

## See Also

- [AutoCompleteLib](.) package -- overview
