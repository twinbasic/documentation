Filed as [twinbasic/twinbasic#2495](https://github.com/twinbasic/twinbasic/issues/2495).

## A system colour value with a nonzero second or third byte draws black since BETA 984, where VB6 takes the index from the low 16 bits

**Describe the bug**
Since BETA 984 (release note: "fixed: Circle/Line/PSet color value handling to match VB6's relaxed rules"), `Line`, `Circle` and `PSet` draw black for a colour whose top byte is `&H80` and whose second or third byte is not 0, such as `&H80FF000F` or `&H80010003`. The colour is read as a system colour only when the value minus `&H80000000` is 0 to 30, and any other `&H80` value draws black. VB6 takes the system colour index from the low 16 bits and ignores the bits in between, so it draws system colour 15 for `&H80FF000F` and system colour 3 for `&H80010003`. BETA 983 gave the same colours as VB6 for these two values. Observed by reading the pixel back with `GetPixel` from a form with `AutoRedraw` set.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `system-colour-extra-bytes-black.twinproj` (attached as `system-colour-extra-bytes-black.zip`). Its `Sub Main` loads `Form1`, sets `AutoRedraw`, `ScaleMode = vbPixels` and `BackColor = &H30201`, draws one point with `Form1.PSet (10, 10), Color` for each of three colours, and prints the pixel read back with `GetPixel`.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   &H8000000F -> F0F0F0
   &H80FF000F -> 000000
   &H80010003 -> 000000
   ```

**Expected behavior**
The colours VB6 draws, which BETA 983 drew as well:
```
&H8000000F -> F0F0F0
&H80FF000F -> F0F0F0
&H80010003 -> DBCDBF
```
`F0F0F0` is system colour 15 (`vbButtonFace`) and `DBCDBF` is system colour 3 (`vbInactiveTitleBar`) on the machine of the observation. The VB6 project, attached as `system-colour-extra-bytes-black-vb6.zip`, prints exactly these three lines.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. A value like these is not what a `vbButtonFace`-style constant holds, and the colours of VB6 forms and controls are always the plain `&H8000000F` form. The effect is a different colour for a value that VB6 accepts.

BETA 983 drew the same colours as VB6 for `&H80FF000F` and `&H80010003`, by passing the value to `OleTranslateColor`. It also raised error 5 for a value that is neither a system colour nor an RGB value with a top byte of 0, 1 or 2, and 984 fixed that: `-1`, `&HFF0000FF`, `&H7FFFFFFF` and the `&H01` palette forms now draw as VB6 draws them (the low 24 bits), as do a `Double` such as 255.7 (256) and a `String` such as `"255"`. Only the `&H80` top byte differs from VB6.

The same difference exists for the high end of the index range: VB6 draws `&H80000019` to `&H8000001E` black, and twinBASIC draws the system colour of that index (`&H8000001D` gives `FF9933`, `&H8000001E` gives `F0F0F0`); this looks deliberate, since the source names `COLOR_MENUBAR` (30) as the limit. `&H80000100` draws black in both BETA 995 and VB6, and `C8C8C8` (index 0) in BETA 983.

The change is `TranslateColor2` in the VB package's `Graphics.twin`, which `Line`, `Circle` and `PSet` call on `Color`: for a top byte of `&H80` it returns the system colour when the value minus `&H80000000` is 0 to 30 and 0 otherwise, and for any other value it returns the low 24 bits.

<!-- Reproducer: bugs/system-colour-extra-bytes-black/ (mode run, expects the three lines above in twinBASIC); verified on 995, with 983 as the control (F0F0F0, F0F0F0, DBCDBF). The VB6 project is in bugs/system-colour-extra-bytes-black/vb6/ (`bug_repro.mjs vb6 system-colour-extra-bytes-black` prints the three lines above). The fuller sweep (about 45 colour values on 995, 983 and VB6) is in .claude/tooling-review-scratch/beta995-probes/s73/forms/ (c1.out995.txt, c1.out983.txt, c1.outvb6.txt), local scratch files that are not in the repository. Stated in docs/Reference/Core/Graphics-Methods.md, section "Colour values" (the first bullet and the WARNING after it, which names BETA 995; the NOTE below the WARNING is the deliberate difference for indexes 25 to 30): when fixed, remove the WARNING, and change the bullet to say twinBASIC takes the index from the low 16 bits. -->
