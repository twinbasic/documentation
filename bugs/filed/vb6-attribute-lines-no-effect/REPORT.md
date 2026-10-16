Filed as [twinbasic/twinbasic#2515](https://github.com/twinbasic/twinbasic/issues/2515).

## Some VB6 attribute lines have no effect in a built type library

**Describe the bug**
twinBASIC reads the `Attribute` lines of a `.cls` file, and the IDE's VB6 import keeps them as VB6 wrote them, but some of them do not reach the type library of the built DLL. `VB_HelpID` and `VB_VarHelpID` leave the class and its members with help context 0. `VB_VarMemberFlags = "40"` and `"400"` leave a public field neither hidden nor nonbrowsable. `VB_MemberFlags = "200"` (user-interface default) and `"14"` (bindable and displaybind) leave the member with no flags. No diagnostic says so. The other attribute lines do take effect in the same build: `VB_Description`, `VB_VarDescription`, `VB_UserMemId`, `VB_VarUserMemId`, `VB_MemberFlags = "40"`, `"400"` and `"440"`, `VB_Creatable`, `VB_GlobalNameSpace`, `VB_PredeclaredId` and `VB_Exposed`. Seen by reading the built DLL's type library with `LoadTypeLibEx`.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `vb6-attribute-lines-no-effect.zip` and open `vb6-attribute-lines-no-effect.twinproj`: an ActiveX DLL with **Register DLL after build** off, so building it registers nothing. `Attrs.cls` holds the lines; `TwinAttrs.twin` is the control.
2. Build it.
3. Open the DLL's type library in OLE/COM Object Viewer (**File → View TypeLib...**).
4. See the coclass `Attrs` with no `helpcontext`, and in `_Attrs`: `HiddenField` and `UnbrowsedField` with neither `hidden` nor `nonbrowsable`, `HelpField` and `WithHelp` with no `helpcontext`, `UiDefault` without `uidefault`, and `Bound` without `bindable` or `displaybind`.
5. See `HiddenMethod`, whose line is `VB_MemberFlags = "40"`, marked `hidden`, and `TwinAttrs.HiddenField`, written with `[Hidden]`, marked `hidden` too.

**Expected behavior**
Each line gives what it asks for, as its neighbours do: a help context of 2000, 2001 and 2002, a hidden field as `[Hidden]` gives on a field and as `VB_MemberFlags = "40"` gives on a method, a nonbrowsable field, and `FUNCFLAG_FUIDEFAULT`, `FUNCFLAG_FBINDABLE` and `FUNCFLAG_FDISPLAYBIND`. VB6 writes these lines from its Procedure Attributes dialog, so a VB6 component imported into twinBASIC and built again loses its help context IDs, its hidden fields and its data-binding flags without a word. twinBASIC has no attribute of its own for a help context ID, a user-interface default or data binding, so these lines are the only way to ask for them.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The import is not the cause: it keeps every `Attribute` line of a `.bas` and a `.cls` byte for byte, and those of a `.frm`, `.ctl` and `.pag` inside the class it writes. The type information a class has at run time in the IDE carries no flags and no descriptions for any member, whichever way they are written, so the built DLL is where to look. `[NonBrowsable]` on a public field leaves it without `nonbrowsable` as well. A VB6 build of the same class was not made: VB6 registers an ActiveX DLL as it builds it. Severity: medium for anyone moving a VB6 component to twinBASIC under binary compatibility; nothing fails, and the loss shows only to the component's users, in their object browsers and data-binding dialogs.

<!-- Lane mode in bugs/vb6-attribute-lines-no-effect/repro.json: asserted by `ide-test.bat --only vb6-import` (test/ide/vb6-import.test.mjs), whose test of the same name passes on BETA 1005; the lane imports test/ide/probes/vb6-import with the IDE's own Import from VBP..., builds it with project.dllRegisterAfterBuild false and reads the type library with LoadTypeLibEx (REGKIND_NONE). Page: docs/Miscellaneous/FAQs.md, #vb6-import, carries the WARNING labelled BETA 1005; remove it when a fix is released, and move the lines it names into the list of lines that take effect. Found 2026-10-14 while testing what the VB6 import makes of Attribute lines. -->
