Filed as [twinbasic/twinbasic#2465](https://github.com/twinbasic/twinbasic/issues/2465).

## A member's `[Description]` is listed as a member of its enum in the hover, and is not shown on the member

**Describe the bug**
Hovering over an enum whose member carries a `[Description]` attribute lists the attribute in the hover's *contains* list, as if it were a third member of the enum. Hovering over the member itself shows no description. With the enum below, hovering over `Shade` shows `Dark`, `Light` and a third line, `Description("The light one.")`, and hovering over `Light` shows its value and where it is declared, and nothing of "The light one.". The project compiles clean.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `enum-member-description-hover.twinproj` (attached as `enum-member-description-hover.zip`) and open `Startup.twin`. It holds:
   ```
   Module DescProbe
       [Description("A colour.")]
       Public Enum Shade
           [Description("The light one.")]
           Light = 1
           Dark = 2
       End Enum

       Public Sub UseThem()
           Debug.Print Shade.Light, Dark
       End Sub
   End Module
   ```
2. Hover over `Shade` where `UseThem` writes `Shade.Light`.
3. The hover shows:

   > *enum* **Shade** ... in component EnumMemberDescriptionHover.DescProbe
   >
   > A colour.
   >
   > **contains**
   >  - Dark
   >  - Light
   >  - Description("The light one.")

4. Hover over `Light`. The hover shows `*enum-value* **Light** = 1 (&H00000001)` and `in EnumMemberDescriptionHover.DescProbe.Shade`, and no description.

**Expected behavior**
The *contains* list holds `Dark` and `Light` only, and the hover over `Light` shows "The light one.", as the hover over a procedure, a constant or a variable with a `[Description]` shows its text: the hover over a constant ends with its description.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
The enum's own `[Description]`, "A colour.", is shown, so the attribute is read on the enum, and the same attribute on a member is taken for a member. This was checked by sending `textDocument/hover` over the compiler's language socket, with the parameters the IDE's own hover provider sends; the text above is the markdown that request returns, which is what the IDE's hover shows. The tooltip itself was not looked at in this run.

Severity: cosmetic, but the hover is where a `[Description]` on an enum member is meant to be read, and the list names a member that does not exist.

<!-- Asserted by `addin-test.bat --only symbols` (test/addin/symbols.test.mjs, the last P15 case, over test/addin/probes/symbols/Sources/Described.twin); passes on BETA 995. The reproducer's hover text above was checked on BETA 995 against the reproducer itself. No page carries a callout: the help add-in reads a member's description from its own hover, which has none. When fixed: make that test say what is right, and retire this entry. -->
