Filed as [twinbasic/twinbasic#2520](https://github.com/twinbasic/twinbasic/issues/2520).

## Setting a Slider's `BackColor` at run time does not change what the control shows, even after the window is invalidated

**Describe the bug**
The Slider of the WinNativeCommonCtls package keeps drawing its old background after `BackColor` is set at run time. The new colour appears only after the control is hidden and shown again. Invalidating the window (`InvalidateRect` and `UpdateWindow`) does not make it appear. Observed by reading a pixel of the control's window with `GetPixel`, and by eye.
The Slider hands out its `BackColor` only in its handler of the `WM_CTLCOLORSTATIC` message (`HandleGetColors`, in `CONTROLS/Slider.twin`), and has no handler for the property being set. The ProgressBar and the ListView of the same package have one (`BackColorChanged`, `Handles BackColor.OnPropertyLet`), which validates the colour and repaints.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `slider-backcolor-no-repaint.twinproj` (attached as `slider-backcolor-no-repaint.zip`). `Form1` holds one Slider, `Slider1`, with a design-time `BackColor` of `&H808080`.
2. Run the project (F5). `Sub Main` shows `Form1`, lets it paint, and then does:
   ```
   Form1.Slider1.BackColor = vbRed
   Settle                  ' DoEvents and Sleep 25, twenty times
   Debug.Print "BackColor set to &H" & Hex$(Form1.Slider1.BackColor) & ", pixel = &H" & Hex$(Corner())
   ```
   where `Corner` is `GetPixel` on `GetDC(Form1.Slider1.hWnd)` at (2, 2), a point outside the channel and the thumb. It then calls `InvalidateRect` and `UpdateWindow` on the Slider's window and reads the pixel again, and last sets `Visible` to `False` and back to `True` and reads it a third time.
3. See in the DEBUG CONSOLE:
   ```
   painted, BackColor = &H808080, pixel = &H808080
   BackColor set to &HFF, pixel = &H808080
   after InvalidateRect and UpdateWindow, pixel = &H808080
   after Visible = False, True, pixel = &HFF
   ```

**Expected behavior**
The Slider shows `BackColor` as soon as it is set: the second line ends `pixel = &HFF`. A control that is invalidated draws its current `BackColor`, so the third line does too. The ProgressBar and ListView of the same package repaint when their `BackColor` is set.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
`GetPixel` reads what is on screen. `PrintWindow` is not used because it makes the window paint itself, which would show the new colour and hide the defect.
Tried in a scratch variant, not kept: `RedrawWindow` with `RDW_INVALIDATE Or RDW_ERASE Or RDW_UPDATENOW Or RDW_ALLCHILDREN`, and a change of `Slider1.Value`, left the pixel at `&H808080` too. Minimising and restoring the form, and resizing it, were tried only after the hide and show, so they show nothing about this.
Severity: low. The colour is wrong until the control is hidden and shown, and nothing is lost.
VB6 was not tried.

<!-- Reproducer: bugs/slider-backcolor-no-repaint/ (mode run; expect is the four DEBUG CONSOLE lines above, verified on BETA 1005 by `bug_repro.mjs verify`; the form is shown on the IDE's private desktop). Page: docs/Reference/Built-In/WinNativeCommonCtls/Slider.md carries the callout, its BackColor NOTE labelled BETA 1005; remove it when a fix is released. Found 2026-10-14 while documenting WinNativeCommonCtls colours; the owner saw it by eye. -->
