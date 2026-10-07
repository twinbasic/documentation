Filed as [twinbasic/twinbasic#2506](https://github.com/twinbasic/twinbasic/issues/2506).

## A tall hover in the code editor disappears when the mouse slides down it onto the dock's resizer

**Describe the bug**
A hover in the code editor that reaches past the editor's bottom edge disappears when the mouse, sliding down inside it, crosses that edge, although the mouse is still over the hover. Monaco draws the hover outside the editor (the IDE creates the editor with `fixedOverflowWidgets: true`), and a long hover, such as the one over `Collection`, which lists its members, reaches over the IDE's dock. The dock has two transparent elements there: the dock resizer along the editor's bottom edge (`DIV.dockElementResizer`, `z-index: 1000`, 6 px tall) and, beneath it, the dock's drop target (`DIV.dockGroupVerticalDockPointBottom`). They are drawn under the hover, so the hover is visible, but they take the mouse: `document.elementFromPoint` returns the resizer where the hover is drawn. When the mouse reaches them, the page gets `mouseout` from the hover to `.dockElementResizer`, and Monaco 0.35.1's `ModesHoverController._onEditorMouseLeave` sees a `relatedTarget` that is not inside the hover and calls `_hideWidgets()`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `hover-hidden-over-dock-resizer.twinproj` (attached as `hover-hidden-over-dock-resizer.zip`), a console project whose `Startup.twin` has `Dim c As Collection` on line 3.
2. Rest the mouse on `Collection` in line 3 and wait a second. A tall hover opens below the line, listing the class's members, and reaches past the code editor's bottom edge.
3. Slide the mouse slowly down inside the hover, past the code editor's bottom edge.
4. The hover disappears as soon as the pointer crosses the edge, with the mouse still over the part of the hover that is drawn below it.

**Expected behavior**
The hover stays while the mouse is over it, as Monaco does by itself: the hover's DOM stays inside the editor's, and `hover.sticky` is true by default (the IDE passes only `hover: { delay: 1e3 }`). Nothing in the dock should take the mouse from a hover drawn over it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
A person sees it by sliding the mouse down the hover at an ordinary speed. A script has to move the mouse 1 px at a time: a larger step jumps over the 6 px resizer and the hover stays. In the scripted run, in a window of 1093 by 784 px, the editor's bottom edge was at y 580, the hover reached y 673 and went at y 575, where the page has `DIV.dockElementResizer`.

What does not reproduce it: the mouse sliding down the same hover above the editor's bottom edge, where nothing of the dock lies under it. With a style `.monaco-editor .monaco-hover { z-index: 100000 !important; }` added to the page, the hover stays at every pixel across the edge, so the hover's position in the page is the cause. Making only the resizer `pointer-events: none` is not enough: the drop target under it takes the mouse instead.

Severity: low. Any hover that reaches the dock goes at the edge, which is the usual case for a hover over a class with many members, and the part of it that shows below the edge cannot be reached to read or scroll.

<!-- Asserted by `ide-test.bat --only hover-past-editor` (test/ide/hover-past-editor.test.mjs: the hover over Collection on line 3 reaches 12 px past the editor's bottom edge; sliding down it in steps of 1 px from 12 px above that edge to 12 px below, the hover goes where the page has the dock resizer, with the mouse above the hover's bottom edge; the controls are the same slide above the dock, and across the edge with the z-index style added); passes on BETA 997. Reproducer: bugs/hover-hidden-over-dock-resizer/; its Startup.twin is test/ide/probes/hover-past-editor/Sources/Startup.twin with a different trailing comment. No documentation page carries a callout for this defect. The help add-in works around it in add-in/Resources/SCRIPTS/hoverhelp.js (commit 246b95e9), by adding the style above to the page while hover help is on, so remove that workaround once a fixed build is released, and then this entry, its reproducer and the lane. -->
