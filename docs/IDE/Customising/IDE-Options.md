---
title: IDE Options
parent: Customising the IDE
grand_parent: IDE
nav_order: 1
permalink: /tB/IDE/Customising/IDE-Options
has_toc: false
---

# IDE Options

The **IDE Options** dialog sets the IDE's fonts, the behaviour of the code editor, IntelliSense and the Project Explorer, and a few settings for the compiler.

Every option is kept per user, in the registry, never in a project. [Where the IDE keeps its settings](.#where-the-ide-keeps-its-settings) gives the details.

## Open the dialog

Choose **Tools → IDE Options...**. The command has no default key.

![The IDE Options dialog at its default settings, scrolled to its top. The first rows set the sizes and fonts of the IDE and the code editor, then two drop-downs that place the editor's combo boxes and show white space. Three LLVM Compiler rows follow, and a run of tick boxes. Change Licence sits at the bottom left, with a greyed-out Save Changes and a Close button at the right.](../Menu/Images/Menu_Tools_IDEOptions.png){:width="628" height="594"}

The dialog is titled **twinBASIC IDE Options**. It is a scrolling list. Each row has the option's label at the left and its control at the right. Rows are one of four kinds:

- a tick box;
- a drop-down list;
- a number box, which accepts any number and sets no limits;
- a font list, which holds the fonts installed on the PC, in ascending order.

The labels are in English whatever language the IDE uses. The dialog has no tooltips.

The buttons are, from left to right:

**Change Licence...**
: Changes the twinBASIC licence. It is shown only while a project is open.

**Save Changes**
: Saves the options and applies them. It is greyed out until you change an option.

**Close**
: Closes the dialog. <kbd>Esc</kbd> does the same. The dialog edits a copy of the options, so **Close** discards every change made since you opened it.

When the IDE starts for the first time and has no saved options, it opens this dialog by itself, after the licence agreement and the question about error reporting. The **Close** button is hidden then. An option that has no saved value takes its default.

> [!NOTE]
> The font lists need a project. With no project open, the **IDE Font** and **Code Editor Font** rows show the grey text *&lt;font list unavailable: load a project first&gt;* in place of a list. **Code Editor Font** reads empty even with a project open, because its default, Monaco, is not a font that Windows installs.

## When a change applies

**Save Changes** applies every change at once. No restart is needed, with two exceptions.

**Eight options restart the compiler.** The compiler is the same one that **Tools → Restart the compiler** restarts. These options take effect when it starts again:

- **IDE: Show Advanced Info On Hover**
- **IDE: Show Hidden Members**
- **IDE: Use new Handles/Implements syntax**
- **IDE: Show memory and resource usage**
- **IDE: Auto refresh Explorer icon cache after build**
- the three **LLVM Compiler** options

No question is asked. About two seconds after **Save Changes**, the **tB Services** field of the status bar goes from **OPERATIONAL** to **UNAVAILABLE**, then **LIMITED**, then **OPERATIONAL** again. A **Please wait...** box with a percentage shows for a moment, and the DEBUG CONSOLE prints `restarting from MEMORY` and the path of the project. The restart starts from the project in memory, so unsaved edits are kept. A change to an **LLVM Compiler** option also ends the LLVM cache process first.

**The real title bar needs a restart of the IDE.** See [Window and status bar](#window-and-status-bar).

## Fonts and text

**IDE Font Size**
: Default 13px. The size of the IDE's own text. The list runs from 8px to 30px in steps of 1px, and 13px is the normal size: the whole IDE is scaled in proportion. <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>+</kbd> makes the text 1px bigger with no upper limit, so it can pass 30px, and <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>-</kbd> makes it 1px smaller, down to 8px. Both keys save the new size at once.

**IDE Font**
: Default Segoe UI. The typeface of the IDE's own text. Segoe UI is also the fallback.

**Code Editor Font Size**
: Default 13px. The size of the text in the code editor, from 8px to 30px. The **Font Size** item of the editor's [menu](#the-code-editors-menu) sets the same option.

**Code Editor Font**
: Default Monaco. The typeface of the code editor. With the default, the editor's list of typefaces is Monaco, Consolas, Courier New and then the system's monospace font. On a PC without Monaco, the editor draws its text in Consolas.

**Code Editor Font: Use Ligatures**
: Default off. Turns the font's ligatures on in the code editor. A ligature draws a run of characters, such as `->`, as one mark.

## Code editor

**Tab Size**
: Default 4. The width of a tab in the code editor. A change applies at once to the editor you are in. A file open in another tab takes the new size when you select its tab.

**Show Code Editor Combo Selectors**
: Default above. Where the editor's three navigation combo boxes sit: **above** the code, **below** it, or **none**, which hides them. The **Show Navigation Bar** item of the editor's [menu](#the-code-editors-menu) sets the same option.

**Monaco: Render Whitespace**
: Default none. Which white-space characters the editor draws as visible marks: **all**, **none**, **boundary**, **selection** or **trailing**. The **Render Whitespace** item of the editor's [menu](#the-code-editors-menu) sets the same option.

**IDE: Sticky scrolling in code editor**
: Default off. Keeps lines at the top of the editor that name the section you are in, such as the module, a region, a procedure or a **With** block, while you scroll. The **Sticky Scroll** item of the editor's [menu](#the-code-editors-menu) sets the same option.

**Always show IDE Inline Code Hints**
: Default off. The hints the editor draws inside the code, such as the annotation at the end of a block. With this option off, the hints show only while you hold <kbd>Ctrl</kbd>. With it on, they always show. The **Code Hints Always Visible** item of the editor's [menu](#the-code-editors-menu) sets the same option.

**IDE: Single row of code panel tabs**
: Default off. Keeps the editor's tabs on one row. The **Tabs List** button and the commands that scroll the tabs reach the tabs that do not fit. The **Show Single Row Of Tabs** item of the editor's [menu](#the-code-editors-menu) sets the same option.

## IntelliSense and hover

**IDE: Intellisense mode**
: Default MODERN. When the IntelliSense list opens. See [Intellisense modes](#intellisense-modes).

**IDE: Signature-Help Show First Line Of Docs**
: Default on. The collapsed signature-help box includes the first line of the procedure's documentation. <kbd>F1</kbd> expands the box.

**IDE: Show Information When Hovering**
: Default on. Shows information in a popup when you point at code in the editor.

**IDE: Show Advanced Info On Hover**
: Default off. Adds detail to the hover popup. Pointing at a class lists each member with its offset in the virtual table, such as `[voffset &H001C] Function Item(...)`, for a class from a package and for a class of your own. [Modern IDE Features](../../../Features/Compiler-IDE/IDE-Features) lists the rest of what the popup shows. The **Show Advanced Info On Hover** item of the editor's [menu](#the-code-editors-menu) sets the same option. A change restarts the compiler.

### Intellisense modes

The mode applies to the code editor and to the entry box of the Debug Console. <kbd>Ctrl</kbd>+<kbd>Space</kbd> opens the list in all three modes. Once a list or a signature-help box is open, every key refreshes it.

| Mode | The list opens |
|---|---|
| **MODERN** | As you type a letter, a `.`, a `(` or an `=`, and after `As `. A signature-help box opens on `(`. In the Debug Console, the list opens on the first letter and on `.`. |
| **LEGACY** | After a `.`, a `(`, an `=`, a `,` or a space. Letters do not open it. In the Debug Console, the list opens only on `.`. |
| **MANUAL** | Only when you ask for it with <kbd>Ctrl</kbd>+<kbd>Space</kbd>. No key opens the list or the signature-help box, not even `.` or `(`. In the Debug Console, typing opens nothing. |

## Project Explorer, tabs and start-up

**Restore Editors State When Opening Project**
: Default on. When you open a project, the editors that were open when you closed it come back, in their order, with the same tab selected, each cursor where it was and each folded section still folded. The watches and the Debug Console history come back whatever this option says. The option applies when a project is opened, not when the compiler restarts.

**Focus The 'Recent' Tab On IDE Startup**
: Default off. The dialog that opens when the IDE starts opens on its **Recent** tab.

**File Explorer: Ask Before Delete Files**
: Default on. Deleting files in the Project Explorer shows a confirmation box first. With the option off, the files are deleted without a question.

**File Explorer: Single-Click Preview**
: Default off. With the option on, one click on a file in the Project Explorer opens it in a *preview tab*, whose title is in italics. There is one preview tab at a time: a single click on another file replaces it. A double-click makes the tab permanent, and so does editing the file. With the option off, one click only selects the file, and a double-click opens it in an ordinary tab. The option also decides whether the files that the debugger steps into, and the commands that switch between a form and its code, open as preview tabs.

**IDE: Check referenced packages are up-to-date**
: Default on. Half a second after a project loads, the IDE asks the package server, over HTTPS, whether each package the project references has a newer version. It does so for every package that has a publisher and is not a compiler package. For each package, the DEBUG CONSOLE prints a line that starts `[PACKAGE CHECK]`, followed by the package's name and version. A tick after the line means the package is current. A cross means it is not, and the line ends with `-- v<new version> is available`. If the request fails, the line `[PACKAGES] version checks failed` appears, with a hint to check the connection.

## Form designer and Toolbox

**IDE: Less transparency for invisible controls**
: Default off. A control whose **Visible** property is **False** is drawn faded in the form designer. With this option on, it is drawn greyed but almost opaque, at 91 per cent. With it off, it is drawn at 70 per cent opacity.

**IDE: Show toolbox icons only**
: Default on. The Toolbox shows icons without control names. The **Show Control Names** item on the Toolbox's **...** button turns the names on and saves that choice at once.

**IDE: Show in-place editing toolbar in the form designer**
: Default on. The toolbar for editing a control in place. The command `tbFormDesigner_ToggleInPlaceEditingToolbar` hides or shows it for the current session, and does not change the option.

## Compiler and LLVM

Changing any of these options restarts the compiler. The three **LLVM Compiler** options are also described in [Getting Started with LLVM](../../../LLVM/Getting-Started#general-llvm-options).

**LLVM Compiler: Maximum number of threads**
: Default 1. The number of threads the LLVM compiler can use. An empty value or 0 means 1.

**LLVM Compiler: Complex procedure reporting threshold (milliseconds)**
: Default 10000. A procedure that takes at least this many milliseconds to compile is listed in the Debug Console. An empty value or 0 means 10000.

**LLVM Compiler: Keep cache process alive after exiting the IDE**
: Default on. Keeps the LLVM cache process running after the IDE closes.

**IDE: Show Hidden Members**
: Default off. Shows members marked `[Hidden]` in tooltips, hovers and the other information the editor shows about code. It is not the same switch as the Project Settings **Intellisense: Show Hidden Members** and **Debugger: Show Hidden Members**.

**IDE: Use new Handles/Implements syntax**
: Default off. When you choose an event of a **WithEvents** variable in the editor's procedure combo box, the handler that the editor inserts has a **Handles** clause. With the option off, the handler is `Private Sub src_Changed(ByVal n As Long)`. With it on, it is `Private Sub src_Changed(ByVal n As Long) Handles src.Changed`. The name of the procedure is the same in both.

**IDE: Auto refresh Explorer icon cache after build**
: Default on. After each build, tells Windows Explorer to refresh its cache of icons. Without the refresh, Explorer can go on showing a program's old icon after a build that changed it.

## Window and status bar

**IDE: Show memory and resource usage**
: Default off. Adds a block of figures at the right-hand end of the status bar, after the social icons, for example `174.5MB in use | 96 ui objects | 16 gdi objects`. The figures are the memory in use, in megabytes, and the numbers of USER objects and GDI objects. Until the first figures arrive, the block reads `?MB in use | ? ui objects | ? gdi objects`. The block shows once a project has loaded, and it is hidden again when the project closes. The Debug Console prints a critical error when the limit of GDI handles is exceeded, and advises you to restart the compiler. A change restarts the compiler.

**IDE: Show real OS titlebar**
: Default off. Gives the IDE window the title bar of Windows, in place of the IDE's own title text and its minimise, maximise and close buttons. **Save Changes** does not change the window at once. The new title bar appears the next time the IDE starts, and the IDE's own buttons stay until then. Choosing the option off again also takes a restart. The choice is also saved in the registry value `Window\RealTitlebar`, under the IDE's key, and **Save Changes** keeps the two in step.

## Settings with no row in the dialog

Some IDE settings are saved with the options but have their own commands.

- The theme is chosen under **Window → Theme**. See [Themes](Themes).
- The language is chosen under **Window → Language**. See [The language of the IDE](.#the-language-of-the-ide).
- The editor's minimap, its folding controls, its indent guides and its line numbers are set from the editor's menu, below.
- The Project Explorer's file or object view is set with its toggle button. It is kept between sessions.
- The panel layout and the Panel Features switches are described in [Panel layouts](Panel-Layouts).

### The code editor's menu

The **...** icon in the header of the editor panel opens a menu of options. The first eleven items are IDE options, and each is saved at once. A combo item lists its values.

**Show Code Folding**
: **never**, **when hovering** or **always**. The default is when hovering.

**Render Whitespace**
: The same option as **Monaco: Render Whitespace**.

**Font Size**
: The same option as **Code Editor Font Size**.

**Show Navigation Bar**
: The same option as **Show Code Editor Combo Selectors**.

**Show Indent Guides**
: Shown by default.

**Show Line Numbers**
: Shown by default.

**Code Hints Always Visible**
: The same option as **Always show IDE Inline Code Hints**.

**Sticky Scroll**
: The same option as **IDE: Sticky scrolling in code editor**.

**Show MiniMap**
: Shown by default.

**Show Advanced Info On Hover**
: The same option as **IDE: Show Advanced Info On Hover**. A change restarts the compiler.

**Show Single Row Of Tabs**
: The same option as **IDE: Single row of code panel tabs**.

Two more items, **Auto Prettify Code** and **Show CodeLens Run Procedure**, are not IDE options. They are Project Settings, so they belong to the project, not to you. Both are on unless the project turns them off.

## See Also

- [Customising the IDE](.) -- where the settings are kept, and the language of the IDE
- [Tools menu](../Reference/Menu/Tools) -- the menu that opens the dialog
- [Getting Started with LLVM](../../../LLVM/Getting-Started) -- the three LLVM options in use
