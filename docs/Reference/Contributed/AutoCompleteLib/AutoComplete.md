---
title: AutoComplete
parent: AutoCompleteLib Package
permalink: /tB/Packages/Contributed/AutoCompleteLib/AutoComplete
has_toc: false
---

# AutoComplete class
{: .no_toc }

A class that attaches Windows shell auto-complete behaviour to a text-input control's window handle.

**AutoComplete** wraps the `IAutoComplete2` COM interface. After calling [**Init**](#init) with the window handle of an edit box and a source type, the Windows shell begins offering suggestions as the user types. The source can be the shell history, the file system, the most-recently-used list, all three combined, or a custom string array supplied through [**CustomSource**](#customsource).

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

*StringArray*
: A one-dimensional **Variant** holding a **String** array. Empty strings and non-string elements are silently ignored. Assigning **Empty** clears the list. A two-or-more-dimensional array raises run-time error 5 ("Array must be single dimensioned"). An unallocated array raises run-time error 91. Any other value that is not an array raises run-time error 380.

The getter returns the filtered array currently stored in the object. Assigning a new value replaces the previous list in full; there is no way to append individual entries.

### FileSystemOptions
{: .no_toc }

Returns or sets the file-system objects enumerated when the source is **AutoCompleteSourceFileSystem** or **AutoCompleteSourceAll**.

Syntax: *object*.**FileSystemOptions** [ = *value* ]

*value*
: One or more **AutoCompleteFileSystemOptionConstants** values combined with `Or`.

| Constant | Value | Description |
|----------|-------|-------------|
| **AutoCompleteFileSystemOptionNone** | 0 | No specific file-system objects. |
| **AutoCompleteFileSystemOptionCurrentDir** | 1 | The current directory. |
| **AutoCompleteFileSystemOptionMyComputer** | 2 | Objects under *My Computer*. |
| **AutoCompleteFileSystemOptionDesktop** | 4 | Desktop objects. |
| **AutoCompleteFileSystemOptionFavorites** | 8 | Favorites folder contents. |
| **AutoCompleteFileSystemOptionFileSysOnly** | 16 | File-system items only (no virtual shell folders). |
| **AutoCompleteFileSystemOptionFileSysDirs** | 32 | Directories only. |

### Options
{: .no_toc }

Returns or sets flags that control how the completion works.

Syntax: *object*.**Options** [ = *value* ]

*value*
: One or more **AutoCompleteOptionConstants** values combined with `Or`.

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

## Methods

### Disable
{: .no_toc }

Disables auto-complete without destroying the object.

Syntax: *object*.**Disable**

Auto-complete stops offering suggestions. Call [**Enable**](#enable) to turn it back on without calling [**Init**](#init) again.

### DroppedDown
{: .no_toc }

Returns whether the suggestion drop-down list is currently visible.

Syntax: *object*.**DroppedDown** ( ) **As Boolean**

Returns **True** when the drop-down is open, **False** otherwise. The return value is **False** if the `IAutoCompleteDropDown` interface cannot be obtained.

### Enable
{: .no_toc }

Re-enables auto-complete after a call to [**Disable**](#disable).

Syntax: *object*.**Enable**

### Init
{: .no_toc }

Attaches auto-complete to a text-input control.

Syntax: *object*.**Init** *hWndEdit*, *Source*

*hWndEdit*
: *required* A **LongPtr** (32-bit: **Long**) containing the window handle of the edit control that should receive suggestions.

*Source*
: *required* An **AutoCompleteSourceConstants** value identifying where suggestions come from.

| Constant | Value | Description |
|----------|-------|-------------|
| **AutoCompleteSourceNone** | 0 | Not valid; passing this value raises run-time error 380. |
| **AutoCompleteSourceHistory** | 1 | The shell history list (the `ACLHistory` shell object). |
| **AutoCompleteSourceFileSystem** | 2 | File-system paths, filtered by [**FileSystemOptions**](#filesystemoptions). |
| **AutoCompleteSourceMRU** | 3 | The shell most-recently-used list. |
| **AutoCompleteSourceAll** | 4 | History, file system, and MRU combined through an `IObjMgr`. |
| **AutoCompleteSourceCustomSource** | 5 | The one-dimensional string array set through [**CustomSource**](#customsource). |

The target control must exist when **Init** is called, and **Init** is called before the user starts typing. Calling **Init** with **AutoCompleteSourceNone**, or with any other value outside the table, raises run-time error 380 (Invalid property value). If the internal `IAutoComplete2` object could not be created when the **AutoComplete** object was created, **Init** exits silently.

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
