---
title: Global
parent: VB Package
permalink: /tB/Packages/VB/Global/
has_toc: false
---

# Global class
{: .no_toc }

**Global** is the application's *app object* --- a singleton that the runtime instantiates on startup and whose members are accessible from any code in the project *without qualification*. Writing `App.Path` is in fact a call to `Global.App.Path`; the leading `Global.` is implicit. The class exists so that the language's built-in globals --- the singletons [**App**](../App/), [**Clipboard**](../Clipboard/), and [**Screen**](../Screen/), the [**Forms**](#forms) collection, the **Printer** and **Printers** objects, the resource loaders, and the `Load` / `Unload` form-lifetime helpers --- can be reached uniformly through the same name resolution path.

There is exactly one **Global** per process and it is not creatable from user code: no `New Global`, no public coclass to instantiate. The runtime publishes it via the IDE's special `[AppObject]` mechanism, and the compiler maps unqualified references to its members.

```tb
' All four of these resolve to a method/property on Global:
Dim p As StdPicture
Set p = LoadPicture(App.Path & "\splash.png")

Form2.Show
Load Form3                              ' creates the form without showing it
Unload Form1
```

* TOC
{:toc}

## Built-in singletons

[**App**](#app), [**Clipboard**](#clipboard), and [**Screen**](#screen) return the corresponding runtime singletons. Each is documented on its own page:

- [**App**](../App/) -- application metadata, version info, and process state.
- [**Clipboard**](../Clipboard/) -- system clipboard access.
- [**Screen**](../Screen/) -- primary-display metrics, active form/control, application-wide mouse pointer.

These properties are cached references --- repeated reads return the same object instance for the lifetime of the process.

## Forms collection

[**Forms**](#forms) returns the application's collection of currently-loaded [**Form**](../Form/) instances --- every form that has been **Load**-ed or **Show**-n but not yet **Unload**-ed. The collection is live: it grows when a form is loaded and shrinks when one is unloaded. The collection supports three operations:

- **Forms.Count** --- a **Long** giving the number of currently-loaded forms.
- **Forms.Item(** *Index* **)** --- the [**Form**](../Form/) at zero-based *Index*. **Item** is the default member, so `Forms(0)` and `Forms.Item(0)` are equivalent. Reading a negative or out-of-range index raises run-time error 9 (*Subscript out of range*).
- **Forms.Add(** *Name* **)** --- creates a new instance of the form class named *Name*, adds it to the collection, and returns the new [**Form**](../Form/). The form is loaded but not shown.

The collection also supports `For Each` enumeration:

```tb
Dim f As Form
For Each f In Forms
    Debug.Print f.Name, f.Caption
Next
```

A common idiom is closing every open form at shutdown --- note that unloading shrinks the collection, so iterate backwards or by index from the top down:

```tb
Dim i As Long
For i = Forms.Count - 1 To 0 Step -1
    Unload Forms(i)
Next
```

## Resource loaders

twinBASIC compiles project-level resources (bitmaps, strings, raw byte blobs) into the final EXE's resource section. The four `LoadRes*` methods retrieve them at run time:

- [**LoadResPicture**](#loadrespicture) -- loads a bitmap, icon, or cursor resource into a **StdPicture**.
- [**LoadResString**](#loadresstring) -- loads a string resource.
- [**LoadResData**](#loadresdata) -- loads a raw byte-array resource.
- [**LoadResIdList**](#loadresidlist) -- enumerates the IDs of resources of a given type.

[**LoadPicture**](#loadpicture) loads a picture from a *file* rather than from an embedded resource --- typically used at run time for user-chosen content or for resources kept outside the EXE.

## Form lifetime helpers

[**Load**](#load) creates a form (or, for control arrays, a control instance) without showing it; [**Unload**](#unload) destroys it. Both are written without parentheses by convention --- `Load Form1`, `Unload Form1` --- and behave as statements, but they are in fact calls to **Global.Load** and **Global.Unload**. The corresponding form-lifecycle events ([**Initialize**](../Form/#initialize), [**Load**](../Form/#load), [**Unload**](../Form/#unload), [**Terminate**](../Form/#terminate)) fire at the expected points.

## Printer and Printers

The compile-time `FEATURE_PRINTER` flag exposes the **Printer** and **Printers** members. [**Printer**](../Printer/) is the currently-selected printer, and [**Printers**](../Printers/) is the collection of all installed printers; assigning a different printer object to **Printer** switches the application's current printer.

## Properties

### App
{: .no_toc }

The application's singleton [**App**](../App/) instance --- its identity, version, and process-state metadata. Read-only.

### Clipboard
{: .no_toc }

The application's singleton [**Clipboard**](../Clipboard/) instance --- the system clipboard wrapper. Read-only.

### Forms
{: .no_toc }

The application's live collection of currently-loaded [**Form**](../Form/) instances. Read-only. See [Forms collection](#forms-collection).

### Printer
{: .no_toc }

The currently-selected [**Printer**](../Printer/). Readable and assignable with `Set` --- assigning a different printer object switches the application's current printer.

### Printers
{: .no_toc }

The [**Printers**](../Printers/) collection of all installed printers on the system. Read-only.

### Screen
{: .no_toc }

The application's singleton [**Screen**](../Screen/) instance --- primary-display metrics, active form/control, application-wide mouse pointer. Read-only.

## Methods

### Load
{: .no_toc }

Creates an instance of the named form (or a new element of a control array) without showing it. The form's [**Initialize**](../Form/#initialize) and [**Load**](../Form/#load) events fire.

Syntax: **Load** *object*

*object*
: *required* The default instance of a form class (`Form1`), an explicit form reference, or a control-array element (`Command1(3)`).

```tb
Load Form2                        ' instantiates and runs Form_Load, but Form2 stays hidden
Set frm = Forms("Form2")          ' the new instance now exists in Forms
```

### LoadPicture
{: .no_toc }

Loads a picture from a file. Returns a **stdole.IPictureDisp**.

Syntax: **LoadPicture**( [ *FileName* [, *Size* [, *ColorDepth* [, *X* [, *Y* ] ] ] ] ] )

*FileName*
: *optional* A **String** giving the path to a `.bmp`, `.dib`, `.gif`, `.jpg`, `.png`, `.wmf`, `.emf`, `.ico`, or `.cur` file. When omitted, returns an empty picture --- useful for clearing an [**Image**](../Image/) or [**PictureBox**](../PictureBox/)'s **Picture** property.

*Size*
: *optional* A member of [**LoadPictureSizeConstants**](../../VBRUN/Constants/LoadPictureSizeConstants) --- meaningful only for icons and cursors, where it picks among the sizes stored in the file.

*ColorDepth*
: *optional* A member of [**LoadPictureColorConstants**](../../VBRUN/Constants/LoadPictureColorConstants) --- meaningful only for icons and cursors, where it picks among the colour depths stored in the file.

*X*, *Y*
: *optional* Width and height overrides used when *Size* is **vbLPCustom**, in pixels.

```tb
Set imgLogo.Picture = LoadPicture(App.Path & "\logo.png")
Set imgLogo.Picture = LoadPicture()        ' clears the picture
```

### LoadResData
{: .no_toc }

Loads a raw resource --- usually a binary blob --- from the application's resource section, as a **Byte()** array wrapped in a **Variant**.

Syntax: **LoadResData**( *id*, *Type* )

*id*
: *required* The resource ID, either as a **Long** (numeric ID) or **String** (name).

*Type*
: *required* The resource type, identifying the resource section to look in. Either a **Long** standard-resource type or a **String** custom-resource type.

### LoadResIdList
{: .no_toc }

Returns the list of resource IDs in the resource section of the given type, as a **Variant** array.

Syntax: **LoadResIdList**( *Type* )

*Type*
: *required* The resource type --- see [**LoadResData**](#loadresdata).

### LoadResPicture
{: .no_toc }

Loads a picture, icon, or cursor resource from the application's resource section into a **stdole.IPictureDisp**.

Syntax: **LoadResPicture**( *id*, *restype* [, *width* [, *height* ] ] )

*id*
: *required* The resource ID --- **Long** (numeric) or **String** (name).

*restype*
: *required* A member of [**LoadResConstants**](../../VBRUN/Constants/LoadResConstants) --- **vbResBitmap**, **vbResIcon**, or **vbResCursor**.

*width*, *height*
: *optional* Pixel dimensions for icon/cursor resources; **0** (default) selects the resource's natural size.

### LoadResString
{: .no_toc }

Loads a string resource from the application's resource section. Returns a **String**.

Syntax: **LoadResString**( *id* )

*id*
: *required* The resource ID, as a **Long**.

### Unload
{: .no_toc }

Destroys the form (or removes the control-array element). The form's [**QueryUnload**](../Form/#queryunload), [**Unload**](../Form/#unload), and [**Terminate**](../Form/#terminate) events fire in order. Either of the first two can set its *Cancel* argument non-zero to veto the unload, in which case the form remains loaded and visible.

Syntax: **Unload** *object*

*object*
: *required* The default instance of a form class, an explicit form reference, or a control-array element.

```tb
Unload Me                         ' close the current form
Unload Forms(0)                   ' close whichever form is at the head of the list
```
