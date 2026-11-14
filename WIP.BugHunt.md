# Bug hunt: leads not yet investigated

Documenting is the main job. A suspected defect met along the way is written down here, in a
few lines, and left. Nothing in this file goes upstream, and nothing in it is evidence for a
page: a callout needs a reproducer, a lane or a case, never a lead.

[BUGS-TO-REPORT.md](BUGS-TO-REPORT.md) is the next stage, for a defect that has been narrowed
and confirmed. The owner decides what is filed from there, and when, so that twinBASIC's
developers get a few reports they can act on rather than everything a session saw.

## How a lead moves on

1. **Write it down and go back to the page.** Each lead has: the build it was seen on, where
   it was seen (the fixture, setup, probe or page), what was seen, and what is not known yet
   (VB6 not checked, may be a misuse). Mark it **page affected** when a page now says something
   the lead contradicts.
2. **A lead is investigated only when** a page it affects is being worked on and needs it
   settled, or the owner picks it. A lead does not get investigated just because it is there.
3. **Investigating** means narrowing it to a reproducer with nothing else in it, on the newest
   BETA installed, with VB6 checked where VB6 has the feature, and misuse ruled out. It ends in
   one of these, and the lead leaves this file:
   - **Misuse or a wrong expectation**: the lead is deleted, and a page that said the wrong
     thing is fixed.
   - **A defect of a contributed package**: a failing case in the package's test project,
     recorded in its `expect.json` ([test/package-tests/README.md](test/package-tests/README.md)),
     and a callout on the page if a reader would meet it. Not a BUGS-TO-REPORT entry, unless
     the cause turns out to be twinBASIC's.
   - **A defect of twinBASIC** (the compiler, the IDE, or a default or built-in package): an
     entry in BUGS-TO-REPORT.md with its reproducer under `bugs/<slug>/`, made with
     `node scripts/bug_repro.mjs new`, and a callout on the page if a reader would meet it.
4. **A lead nobody can reproduce on the newest BETA** is deleted, with a line in the commit
   message saying so.

## Leads

### VB package

Seen on BETA 1042 by the `vb` setup of `shoot_docs` (fixture `test/shots/vb`). None checked in
VB6.

- **`Controls.Add` of a control class no form holds** raises -2147467259, and never makes a
  QRCode.
- **`TypeOf <MDIForm> Is Form`** is True.
- **`Form.BorderStyle` set at run time** gives the tool-window styles and the fixed dialog
  style no extended window style.
- **A menu's `ShortcutId` set at run time** shows no shortcut text. **Page affected**: the
  Menu page says it does.
- **`MousePointer` `vbIconPointer` and `vbSizePointer`** set a null cursor.
- **A Report's preview** never returns from its first `DoEvents` on a private desktop. May be
  misuse, or the private desktop.

### WinNativeCommonCtls

Seen on BETA 1042 by the `commonctls` setup (fixture `test/shots/commonctls`).

- **A ListView filled while hidden** shows no items in `lvwIcon` view.
- **`MonthView.DayBold`** raises error 380 for a month scrolled into view by setting `Value`.
- **An icon in an ImageList with `ColorDepth24Bit`** draws on black.
- **The DTPicker's long date format** draws its fields with wide gaps.
- **`DTPicker.HandleDropDown`** tests `styles And MCS_NOTODAY = 0`, which by operator
  precedence is `styles And (MCS_NOTODAY = 0)` and never true. Seen in the source, not run.

### CustomControls

- **`Class_Initialize` and `Sub New` together in a WaynesForm class** give TB5135. BETA 1042,
  the `waynes` setup.

### CEF

- **A CefBrowser on a private desktop** raises `Create` and never `Ready` or `Error`; its
  browser process ends with an access violation in the program's own code. BETA 1042, the
  parked `cef` setup; the details and what to try next are in
  [WIP.Screenshots.md](WIP.Screenshots.md) ("CEF has no picture yet"). May be the private
  desktop.

### VBFLXGRD18

- **Without an explicit `Load Form1`**, `Form1.VBFlexGrid1` through the implicit instance
  raises -2147467262 at the grid's first property. BETA 1042, the samples' template project.
  May be twinBASIC's implicit form instance rather than the package.

### User-defined types (from the GdiPlus work)

Seen on BETA 1005, 32-bit, by the agents documenting GdiPlus; not seen again since. Check on
the newest BETA first: each may be gone. The GdiPlus samples avoid every form below.

- **An element of a UDT array passed as a `ByVal` UDT argument** never returns:
  `pts(1).Diff(pts(2))`, `g.DrawLine p, pts(1), pts(2)`, with `pts` a `GpPointF` array and no
  GDI+ call involved.
- **A property read on an element of a UDT array** never returns: `types(1).CloseSubpath`,
  with `types` a `PathPointType` array. Copying the element to a local first works. Another
  agent got an access violation for the same read on a local array. Probably the same cause
  as the lead above.
- **`m.Scale(2, 3)` as a statement**, with parentheses and no `Call`, does nothing and raises
  nothing, on any class with a `Scale` method (also on a test class of its own).
- **`p.Scale(2)`** is a syntax error on `GpPointF` and `GpSizeF`; `p.Scale 2` compiles.
  Probably related to the lead above.
- **GdiPlus's `PathIterator.NextSubpathPath`** gives a LINKER code generation error for any
  project that uses `PathIterator`, though `tbbuild --build` still makes an exe.
- **Some UDT members do not link** ("compilation (codegen) error in Types.X"):
  `GpPointF.Normalized`, and `OffsetBy`, `OffsetByPt`, `InflatedBy` and `InflatedByPt` on
  `GpRect` and `GpRectF`.
