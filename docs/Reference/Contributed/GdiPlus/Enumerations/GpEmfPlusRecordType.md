---
title: GpEmfPlusRecordType
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpEmfPlusRecordType
---

# GpEmfPlusRecordType enumeration
{: .no_toc }

Identifies the record types of Windows metafiles (WMF), enhanced metafiles (EMF) and EMF+ files.

The members come in three groups, each in its own table below. A record of the first two groups can be displayed by GDI and by GDI+. A record of the third group can be displayed by GDI+ only. [**Metafile.PlayRecord**](../Metafile) and the **EnumerateMetafileProc** callback of **Graphics.EnumerateMetafile** use the enumeration.

## WMF records
{: .no_toc }

Each member is a function number of a Windows metafile ([GpMetafileFunctions](GpMetafileFunctions)) combined with `&H10000`, so that it does not collide with the numbers of the other groups.

| Member | Value | Function |
|:-------|:------|:------------|
| **WmfRecordTypeSetBkColor**{: #WmfRecordTypeSetBkColor } | `&H10201` | **META_SETBKCOLOR** |
| **WmfRecordTypeSetBkMode**{: #WmfRecordTypeSetBkMode } | `&H10102` | **META_SETBKMODE** |
| **WmfRecordTypeSetMapMode**{: #WmfRecordTypeSetMapMode } | `&H10103` | **META_SETMAPMODE** |
| **WmfRecordTypeSetROP2**{: #WmfRecordTypeSetROP2 } | `&H10104` | **META_SETROP2** |
| **WmfRecordTypeSetRelAbs**{: #WmfRecordTypeSetRelAbs } | `&H10105` | **META_SETRELABS** |
| **WmfRecordTypeSetPolyFillMode**{: #WmfRecordTypeSetPolyFillMode } | `&H10106` | **META_SETPOLYFILLMODE** |
| **WmfRecordTypeSetStretchBltMode**{: #WmfRecordTypeSetStretchBltMode } | `&H10107` | **META_SETSTRETCHBLTMODE** |
| **WmfRecordTypeSetTextCharExtra**{: #WmfRecordTypeSetTextCharExtra } | `&H10108` | **META_SETTEXTCHAREXTRA** |
| **WmfRecordTypeSetTextColor**{: #WmfRecordTypeSetTextColor } | `&H10209` | **META_SETTEXTCOLOR** |
| **WmfRecordTypeSetTextJustification**{: #WmfRecordTypeSetTextJustification } | `&H1020A` | **META_SETTEXTJUSTIFICATION** |
| **WmfRecordTypeSetWindowOrg**{: #WmfRecordTypeSetWindowOrg } | `&H1020B` | **META_SETWINDOWORG** |
| **WmfRecordTypeSetWindowExt**{: #WmfRecordTypeSetWindowExt } | `&H1020C` | **META_SETWINDOWEXT** |
| **WmfRecordTypeSetViewportOrg**{: #WmfRecordTypeSetViewportOrg } | `&H1020D` | **META_SETVIEWPORTORG** |
| **WmfRecordTypeSetViewportExt**{: #WmfRecordTypeSetViewportExt } | `&H1020E` | **META_SETVIEWPORTEXT** |
| **WmfRecordTypeOffsetWindowOrg**{: #WmfRecordTypeOffsetWindowOrg } | `&H1020F` | **META_OFFSETWINDOWORG** |
| **WmfRecordTypeScaleWindowExt**{: #WmfRecordTypeScaleWindowExt } | `&H10410` | **META_SCALEWINDOWEXT** |
| **WmfRecordTypeOffsetViewportOrg**{: #WmfRecordTypeOffsetViewportOrg } | `&H10211` | **META_OFFSETVIEWPORTORG** |
| **WmfRecordTypeScaleViewportExt**{: #WmfRecordTypeScaleViewportExt } | `&H10412` | **META_SCALEVIEWPORTEXT** |
| **WmfRecordTypeLineTo**{: #WmfRecordTypeLineTo } | `&H10213` | **META_LINETO** |
| **WmfRecordTypeMoveTo**{: #WmfRecordTypeMoveTo } | `&H10214` | **META_MOVETO** |
| **WmfRecordTypeExcludeClipRect**{: #WmfRecordTypeExcludeClipRect } | `&H10415` | **META_EXCLUDECLIPRECT** |
| **WmfRecordTypeIntersectClipRect**{: #WmfRecordTypeIntersectClipRect } | `&H10416` | **META_INTERSECTCLIPRECT** |
| **WmfRecordTypeArc**{: #WmfRecordTypeArc } | `&H10817` | **META_ARC** |
| **WmfRecordTypeEllipse**{: #WmfRecordTypeEllipse } | `&H10418` | **META_ELLIPSE** |
| **WmfRecordTypeFloodFill**{: #WmfRecordTypeFloodFill } | `&H10419` | **META_FLOODFILL** |
| **WmfRecordTypePie**{: #WmfRecordTypePie } | `&H1081A` | **META_PIE** |
| **WmfRecordTypeRectangle**{: #WmfRecordTypeRectangle } | `&H1041B` | **META_RECTANGLE** |
| **WmfRecordTypeRoundRect**{: #WmfRecordTypeRoundRect } | `&H1061C` | **META_ROUNDRECT** |
| **WmfRecordTypePatBlt**{: #WmfRecordTypePatBlt } | `&H1061D` | **META_PATBLT** |
| **WmfRecordTypeSaveDC**{: #WmfRecordTypeSaveDC } | `&H1001E` | **META_SAVEDC** |
| **WmfRecordTypeSetPixel**{: #WmfRecordTypeSetPixel } | `&H1041F` | **META_SETPIXEL** |
| **WmfRecordTypeOffsetClipRgn**{: #WmfRecordTypeOffsetClipRgn } | `&H10220` | **META_OFFSETCLIPRGN** |
| **WmfRecordTypeTextOut**{: #WmfRecordTypeTextOut } | `&H10521` | **META_TEXTOUT** |
| **WmfRecordTypeBitBlt**{: #WmfRecordTypeBitBlt } | `&H10922` | **META_BITBLT** |
| **WmfRecordTypeStretchBlt**{: #WmfRecordTypeStretchBlt } | `&H10B23` | **META_STRETCHBLT** |
| **WmfRecordTypePolygon**{: #WmfRecordTypePolygon } | `&H10324` | **META_POLYGON** |
| **WmfRecordTypePolyline**{: #WmfRecordTypePolyline } | `&H10325` | **META_POLYLINE** |
| **WmfRecordTypeEscape**{: #WmfRecordTypeEscape } | `&H10626` | **META_ESCAPE** |
| **WmfRecordTypeRestoreDC**{: #WmfRecordTypeRestoreDC } | `&H10127` | **META_RESTOREDC** |
| **WmfRecordTypeFillRegion**{: #WmfRecordTypeFillRegion } | `&H10228` | **META_FILLREGION** |
| **WmfRecordTypeFrameRegion**{: #WmfRecordTypeFrameRegion } | `&H10429` | **META_FRAMEREGION** |
| **WmfRecordTypeInvertRegion**{: #WmfRecordTypeInvertRegion } | `&H1012A` | **META_INVERTREGION** |
| **WmfRecordTypePaintRegion**{: #WmfRecordTypePaintRegion } | `&H1012B` | **META_PAINTREGION** |
| **WmfRecordTypeSelectClipRegion**{: #WmfRecordTypeSelectClipRegion } | `&H1012C` | **META_SELECTCLIPREGION** |
| **WmfRecordTypeSelectObject**{: #WmfRecordTypeSelectObject } | `&H1012D` | **META_SELECTOBJECT** |
| **WmfRecordTypeSetTextAlign**{: #WmfRecordTypeSetTextAlign } | `&H1012E` | **META_SETTEXTALIGN** |
| **WmfRecordTypeDrawText**{: #WmfRecordTypeDrawText } | `&H1062F` | **META_DRAWTEXT** |
| **WmfRecordTypeChord**{: #WmfRecordTypeChord } | `&H10830` | **META_CHORD** |
| **WmfRecordTypeSetMapperFlags**{: #WmfRecordTypeSetMapperFlags } | `&H10231` | **META_SETMAPPERFLAGS** |
| **WmfRecordTypeExtTextOut**{: #WmfRecordTypeExtTextOut } | `&H10A32` | **META_EXTTEXTOUT** |
| **WmfRecordTypeSetDIBToDev**{: #WmfRecordTypeSetDIBToDev } | `&H10D33` | **META_SETDIBTODEV** |
| **WmfRecordTypeSelectPalette**{: #WmfRecordTypeSelectPalette } | `&H10234` | **META_SELECTPALETTE** |
| **WmfRecordTypeRealizePalette**{: #WmfRecordTypeRealizePalette } | `&H10035` | **META_REALIZEPALETTE** |
| **WmfRecordTypeAnimatePalette**{: #WmfRecordTypeAnimatePalette } | `&H10436` | **META_ANIMATEPALETTE** |
| **WmfRecordTypeSetPalEntries**{: #WmfRecordTypeSetPalEntries } | `&H10037` | **META_SETPALENTRIES** |
| **WmfRecordTypePolyPolygon**{: #WmfRecordTypePolyPolygon } | `&H10538` | **META_POLYPOLYGON** |
| **WmfRecordTypeResizePalette**{: #WmfRecordTypeResizePalette } | `&H10139` | **META_RESIZEPALETTE** |
| **WmfRecordTypeDIBBitBlt**{: #WmfRecordTypeDIBBitBlt } | `&H10940` | **META_DIBBITBLT** |
| **WmfRecordTypeDIBStretchBlt**{: #WmfRecordTypeDIBStretchBlt } | `&H10B41` | **META_DIBSTRETCHBLT** |
| **WmfRecordTypeDIBCreatePatternBrush**{: #WmfRecordTypeDIBCreatePatternBrush } | `&H10142` | **META_DIBCREATEPATTERNBRUSH** |
| **WmfRecordTypeStretchDIB**{: #WmfRecordTypeStretchDIB } | `&H10F43` | **META_STRETCHDIB** |
| **WmfRecordTypeExtFloodFill**{: #WmfRecordTypeExtFloodFill } | `&H10548` | **META_EXTFLOODFILL** |
| **WmfRecordTypeSetLayout**{: #WmfRecordTypeSetLayout } | `&H10149` | **META_SETLAYOUT** |
| **WmfRecordTypeResetDC**{: #WmfRecordTypeResetDC } | `&H1014C` | **META_RESETDC** |
| **WmfRecordTypeStartDoc**{: #WmfRecordTypeStartDoc } | `&H1014D` | **META_STARTDOC** |
| **WmfRecordTypeStartPage**{: #WmfRecordTypeStartPage } | `&H1004F` | **META_STARTPAGE** |
| **WmfRecordTypeEndPage**{: #WmfRecordTypeEndPage } | `&H10050` | **META_ENDPAGE** |
| **WmfRecordTypeAbortDoc**{: #WmfRecordTypeAbortDoc } | `&H10052` | **META_ABORTDOC** |
| **WmfRecordTypeEndDoc**{: #WmfRecordTypeEndDoc } | `&H1005E` | **META_ENDDOC** |
| **WmfRecordTypeDeleteObject**{: #WmfRecordTypeDeleteObject } | `&H101F0` | **META_DELETEOBJECT** |
| **WmfRecordTypeCreatePalette**{: #WmfRecordTypeCreatePalette } | `&H100F7` | **META_CREATEPALETTE** |
| **WmfRecordTypeCreateBrush**{: #WmfRecordTypeCreateBrush } | `&H100F8` | **META_CREATEBRUSH** |
| **WmfRecordTypeCreatePatternBrush**{: #WmfRecordTypeCreatePatternBrush } | `&H101F9` | **META_CREATEPATTERNBRUSH** |
| **WmfRecordTypeCreatePenIndirect**{: #WmfRecordTypeCreatePenIndirect } | `&H102FA` | **META_CREATEPENINDIRECT** |
| **WmfRecordTypeCreateFontIndirect**{: #WmfRecordTypeCreateFontIndirect } | `&H102FB` | **META_CREATEFONTINDIRECT** |
| **WmfRecordTypeCreateBrushIndirect**{: #WmfRecordTypeCreateBrushIndirect } | `&H102FC` | **META_CREATEBRUSHINDIRECT** |
| **WmfRecordTypeCreateBitmapIndirect**{: #WmfRecordTypeCreateBitmapIndirect } | `&H102FD` | **META_CREATEBITMAPINDIRECT** |
| **WmfRecordTypeCreateBitmap**{: #WmfRecordTypeCreateBitmap } | `&H106FE` | **META_CREATEBITMAP** |
| **WmfRecordTypeCreateRegion**{: #WmfRecordTypeCreateRegion } | `&H106FF` | **META_CREATEREGION** |

## EMF records
{: .no_toc }

Each member has the value of an enhanced metafile record type, the **EMR_** constants of [GpEMR](GpEMR). **EmfRecordTypeMax** and **EmfRecordTypeMin** are the highest and the lowest of them.

| Member | Value | Record |
|:-------|:------|:------------|
| **EmfRecordTypeHeader**{: #EmfRecordTypeHeader } | `1` | **EMR_HEADER** |
| **EmfRecordTypePolyBezier**{: #EmfRecordTypePolyBezier } | `2` | **EMR_POLYBEZIER** |
| **EmfRecordTypePolygon**{: #EmfRecordTypePolygon } | `3` | **EMR_POLYGON** |
| **EmfRecordTypePolyline**{: #EmfRecordTypePolyline } | `4` | **EMR_POLYLINE** |
| **EmfRecordTypePolyBezierTo**{: #EmfRecordTypePolyBezierTo } | `5` | **EMR_POLYBEZIERTO** |
| **EmfRecordTypePolyLineTo**{: #EmfRecordTypePolyLineTo } | `6` | **EMR_POLYLINETO** |
| **EmfRecordTypePolyPolyline**{: #EmfRecordTypePolyPolyline } | `7` | **EMR_POLYPOLYLINE** |
| **EmfRecordTypePolyPolygon**{: #EmfRecordTypePolyPolygon } | `8` | **EMR_POLYPOLYGON** |
| **EmfRecordTypeSetWindowExtEx**{: #EmfRecordTypeSetWindowExtEx } | `9` | **EMR_SETWINDOWEXTEX** |
| **EmfRecordTypeSetWindowOrgEx**{: #EmfRecordTypeSetWindowOrgEx } | `10` | **EMR_SETWINDOWORGEX** |
| **EmfRecordTypeSetViewportExtEx**{: #EmfRecordTypeSetViewportExtEx } | `11` | **EMR_SETVIEWPORTEXTEX** |
| **EmfRecordTypeSetViewportOrgEx**{: #EmfRecordTypeSetViewportOrgEx } | `12` | **EMR_SETVIEWPORTORGEX** |
| **EmfRecordTypeSetBrushOrgEx**{: #EmfRecordTypeSetBrushOrgEx } | `13` | **EMR_SETBRUSHORGEX** |
| **EmfRecordTypeEOF**{: #EmfRecordTypeEOF } | `14` | **EMR_EOF** |
| **EmfRecordTypeSetPixelV**{: #EmfRecordTypeSetPixelV } | `15` | **EMR_SETPIXELV** |
| **EmfRecordTypeSetMapperFlags**{: #EmfRecordTypeSetMapperFlags } | `16` | **EMR_SETMAPPERFLAGS** |
| **EmfRecordTypeSetMapMode**{: #EmfRecordTypeSetMapMode } | `17` | **EMR_SETMAPMODE** |
| **EmfRecordTypeSetBkMode**{: #EmfRecordTypeSetBkMode } | `18` | **EMR_SETBKMODE** |
| **EmfRecordTypeSetPolyFillMode**{: #EmfRecordTypeSetPolyFillMode } | `19` | **EMR_SETPOLYFILLMODE** |
| **EmfRecordTypeSetROP2**{: #EmfRecordTypeSetROP2 } | `20` | **EMR_SETROP2** |
| **EmfRecordTypeSetStretchBltMode**{: #EmfRecordTypeSetStretchBltMode } | `21` | **EMR_SETSTRETCHBLTMODE** |
| **EmfRecordTypeSetTextAlign**{: #EmfRecordTypeSetTextAlign } | `22` | **EMR_SETTEXTALIGN** |
| **EmfRecordTypeSetColorAdjustment**{: #EmfRecordTypeSetColorAdjustment } | `23` | **EMR_SETCOLORADJUSTMENT** |
| **EmfRecordTypeSetTextColor**{: #EmfRecordTypeSetTextColor } | `24` | **EMR_SETTEXTCOLOR** |
| **EmfRecordTypeSetBkColor**{: #EmfRecordTypeSetBkColor } | `25` | **EMR_SETBKCOLOR** |
| **EmfRecordTypeOffsetClipRgn**{: #EmfRecordTypeOffsetClipRgn } | `26` | **EMR_OFFSETCLIPRGN** |
| **EmfRecordTypeMoveToEx**{: #EmfRecordTypeMoveToEx } | `27` | **EMR_MOVETOEX** |
| **EmfRecordTypeSetMetaRgn**{: #EmfRecordTypeSetMetaRgn } | `28` | **EMR_SETMETARGN** |
| **EmfRecordTypeExcludeClipRect**{: #EmfRecordTypeExcludeClipRect } | `29` | **EMR_EXCLUDECLIPRECT** |
| **EmfRecordTypeIntersectClipRect**{: #EmfRecordTypeIntersectClipRect } | `30` | **EMR_INTERSECTCLIPRECT** |
| **EmfRecordTypeScaleViewportExtEx**{: #EmfRecordTypeScaleViewportExtEx } | `31` | **EMR_SCALEVIEWPORTEXTEX** |
| **EmfRecordTypeScaleWindowExtEx**{: #EmfRecordTypeScaleWindowExtEx } | `32` | **EMR_SCALEWINDOWEXTEX** |
| **EmfRecordTypeSaveDC**{: #EmfRecordTypeSaveDC } | `33` | **EMR_SAVEDC** |
| **EmfRecordTypeRestoreDC**{: #EmfRecordTypeRestoreDC } | `34` | **EMR_RESTOREDC** |
| **EmfRecordTypeSetWorldTransform**{: #EmfRecordTypeSetWorldTransform } | `35` | **EMR_SETWORLDTRANSFORM** |
| **EmfRecordTypeModifyWorldTransform**{: #EmfRecordTypeModifyWorldTransform } | `36` | **EMR_MODIFYWORLDTRANSFORM** |
| **EmfRecordTypeSelectObject**{: #EmfRecordTypeSelectObject } | `37` | **EMR_SELECTOBJECT** |
| **EmfRecordTypeCreatePen**{: #EmfRecordTypeCreatePen } | `38` | **EMR_CREATEPEN** |
| **EmfRecordTypeCreateBrushIndirect**{: #EmfRecordTypeCreateBrushIndirect } | `39` | **EMR_CREATEBRUSHINDIRECT** |
| **EmfRecordTypeDeleteObject**{: #EmfRecordTypeDeleteObject } | `40` | **EMR_DELETEOBJECT** |
| **EmfRecordTypeAngleArc**{: #EmfRecordTypeAngleArc } | `41` | **EMR_ANGLEARC** |
| **EmfRecordTypeEllipse**{: #EmfRecordTypeEllipse } | `42` | **EMR_ELLIPSE** |
| **EmfRecordTypeRectangle**{: #EmfRecordTypeRectangle } | `43` | **EMR_RECTANGLE** |
| **EmfRecordTypeRoundRect**{: #EmfRecordTypeRoundRect } | `44` | **EMR_ROUNDRECT** |
| **EmfRecordTypeArc**{: #EmfRecordTypeArc } | `45` | **EMR_ARC** |
| **EmfRecordTypeChord**{: #EmfRecordTypeChord } | `46` | **EMR_CHORD** |
| **EmfRecordTypePie**{: #EmfRecordTypePie } | `47` | **EMR_PIE** |
| **EmfRecordTypeSelectPalette**{: #EmfRecordTypeSelectPalette } | `48` | **EMR_SELECTPALETTE** |
| **EmfRecordTypeCreatePalette**{: #EmfRecordTypeCreatePalette } | `49` | **EMR_CREATEPALETTE** |
| **EmfRecordTypeSetPaletteEntries**{: #EmfRecordTypeSetPaletteEntries } | `50` | **EMR_SETPALETTEENTRIES** |
| **EmfRecordTypeResizePalette**{: #EmfRecordTypeResizePalette } | `51` | **EMR_RESIZEPALETTE** |
| **EmfRecordTypeRealizePalette**{: #EmfRecordTypeRealizePalette } | `52` | **EMR_REALIZEPALETTE** |
| **EmfRecordTypeExtFloodFill**{: #EmfRecordTypeExtFloodFill } | `53` | **EMR_EXTFLOODFILL** |
| **EmfRecordTypeLineTo**{: #EmfRecordTypeLineTo } | `54` | **EMR_LINETO** |
| **EmfRecordTypeArcTo**{: #EmfRecordTypeArcTo } | `55` | **EMR_ARCTO** |
| **EmfRecordTypePolyDraw**{: #EmfRecordTypePolyDraw } | `56` | **EMR_POLYDRAW** |
| **EmfRecordTypeSetArcDirection**{: #EmfRecordTypeSetArcDirection } | `57` | **EMR_SETARCDIRECTION** |
| **EmfRecordTypeSetMiterLimit**{: #EmfRecordTypeSetMiterLimit } | `58` | **EMR_SETMITERLIMIT** |
| **EmfRecordTypeBeginPath**{: #EmfRecordTypeBeginPath } | `59` | **EMR_BEGINPATH** |
| **EmfRecordTypeEndPath**{: #EmfRecordTypeEndPath } | `60` | **EMR_ENDPATH** |
| **EmfRecordTypeCloseFigure**{: #EmfRecordTypeCloseFigure } | `61` | **EMR_CLOSEFIGURE** |
| **EmfRecordTypeFillPath**{: #EmfRecordTypeFillPath } | `62` | **EMR_FILLPATH** |
| **EmfRecordTypeStrokeAndFillPath**{: #EmfRecordTypeStrokeAndFillPath } | `63` | **EMR_STROKEANDFILLPATH** |
| **EmfRecordTypeStrokePath**{: #EmfRecordTypeStrokePath } | `64` | **EMR_STROKEPATH** |
| **EmfRecordTypeFlattenPath**{: #EmfRecordTypeFlattenPath } | `65` | **EMR_FLATTENPATH** |
| **EmfRecordTypeWidenPath**{: #EmfRecordTypeWidenPath } | `66` | **EMR_WIDENPATH** |
| **EmfRecordTypeSelectClipPath**{: #EmfRecordTypeSelectClipPath } | `67` | **EMR_SELECTCLIPPATH** |
| **EmfRecordTypeAbortPath**{: #EmfRecordTypeAbortPath } | `68` | **EMR_ABORTPATH** |
| **EmfRecordTypeReserved_069**{: #EmfRecordTypeReserved_069 } | `69` | Not used. |
| **EmfRecordTypeGdiComment**{: #EmfRecordTypeGdiComment } | `70` | **EMR_GDICOMMENT** |
| **EmfRecordTypeFillRgn**{: #EmfRecordTypeFillRgn } | `71` | **EMR_FILLRGN** |
| **EmfRecordTypeFrameRgn**{: #EmfRecordTypeFrameRgn } | `72` | **EMR_FRAMERGN** |
| **EmfRecordTypeInvertRgn**{: #EmfRecordTypeInvertRgn } | `73` | **EMR_INVERTRGN** |
| **EmfRecordTypePaintRgn**{: #EmfRecordTypePaintRgn } | `74` | **EMR_PAINTRGN** |
| **EmfRecordTypeExtSelectClipRgn**{: #EmfRecordTypeExtSelectClipRgn } | `75` | **EMR_EXTSELECTCLIPRGN** |
| **EmfRecordTypeBitBlt**{: #EmfRecordTypeBitBlt } | `76` | **EMR_BITBLT** |
| **EmfRecordTypeStretchBlt**{: #EmfRecordTypeStretchBlt } | `77` | **EMR_STRETCHBLT** |
| **EmfRecordTypeMaskBlt**{: #EmfRecordTypeMaskBlt } | `78` | **EMR_MASKBLT** |
| **EmfRecordTypePlgBlt**{: #EmfRecordTypePlgBlt } | `79` | **EMR_PLGBLT** |
| **EmfRecordTypeSetDIBitsToDevice**{: #EmfRecordTypeSetDIBitsToDevice } | `80` | **EMR_SETDIBITSTODEVICE** |
| **EmfRecordTypeStretchDIBits**{: #EmfRecordTypeStretchDIBits } | `81` | **EMR_STRETCHDIBITS** |
| **EmfRecordTypeExtCreateFontIndirect**{: #EmfRecordTypeExtCreateFontIndirect } | `82` | **EMR_EXTCREATEFONTINDIRECTW** |
| **EmfRecordTypeExtTextOutA**{: #EmfRecordTypeExtTextOutA } | `83` | **EMR_EXTTEXTOUTA** |
| **EmfRecordTypeExtTextOutW**{: #EmfRecordTypeExtTextOutW } | `84` | **EMR_EXTTEXTOUTW** |
| **EmfRecordTypePolyBezier16**{: #EmfRecordTypePolyBezier16 } | `85` | **EMR_POLYBEZIER16** |
| **EmfRecordTypePolygon16**{: #EmfRecordTypePolygon16 } | `86` | **EMR_POLYGON16** |
| **EmfRecordTypePolyline16**{: #EmfRecordTypePolyline16 } | `87` | **EMR_POLYLINE16** |
| **EmfRecordTypePolyBezierTo16**{: #EmfRecordTypePolyBezierTo16 } | `88` | **EMR_POLYBEZIERTO16** |
| **EmfRecordTypePolylineTo16**{: #EmfRecordTypePolylineTo16 } | `89` | **EMR_POLYLINETO16** |
| **EmfRecordTypePolyPolyline16**{: #EmfRecordTypePolyPolyline16 } | `90` | **EMR_POLYPOLYLINE16** |
| **EmfRecordTypePolyPolygon16**{: #EmfRecordTypePolyPolygon16 } | `91` | **EMR_POLYPOLYGON16** |
| **EmfRecordTypePolyDraw16**{: #EmfRecordTypePolyDraw16 } | `92` | **EMR_POLYDRAW16** |
| **EmfRecordTypeCreateMonoBrush**{: #EmfRecordTypeCreateMonoBrush } | `93` | **EMR_CREATEMONOBRUSH** |
| **EmfRecordTypeCreateDIBPatternBrushPt**{: #EmfRecordTypeCreateDIBPatternBrushPt } | `94` | **EMR_CREATEDIBPATTERNBRUSHPT** |
| **EmfRecordTypeExtCreatePen**{: #EmfRecordTypeExtCreatePen } | `95` | **EMR_EXTCREATEPEN** |
| **EmfRecordTypePolyTextOutA**{: #EmfRecordTypePolyTextOutA } | `96` | **EMR_POLYTEXTOUTA** |
| **EmfRecordTypePolyTextOutW**{: #EmfRecordTypePolyTextOutW } | `97` | **EMR_POLYTEXTOUTW** |
| **EmfRecordTypeSetICMMode**{: #EmfRecordTypeSetICMMode } | `98` | **EMR_SETICMMODE** |
| **EmfRecordTypeCreateColorSpace**{: #EmfRecordTypeCreateColorSpace } | `99` | **EMR_CREATECOLORSPACE** |
| **EmfRecordTypeSetColorSpace**{: #EmfRecordTypeSetColorSpace } | `100` | **EMR_SETCOLORSPACE** |
| **EmfRecordTypeDeleteColorSpace**{: #EmfRecordTypeDeleteColorSpace } | `101` | **EMR_DELETECOLORSPACE** |
| **EmfRecordTypeGLSRecord**{: #EmfRecordTypeGLSRecord } | `102` | **EMR_GLSRECORD** |
| **EmfRecordTypeGLSBoundedRecord**{: #EmfRecordTypeGLSBoundedRecord } | `103` | **EMR_GLSBOUNDEDRECORD** |
| **EmfRecordTypePixelFormat**{: #EmfRecordTypePixelFormat } | `104` | **EMR_PIXELFORMAT** |
| **EmfRecordTypeDrawEscape**{: #EmfRecordTypeDrawEscape } | `105` | **EMR_RESERVED_105** |
| **EmfRecordTypeExtEscape**{: #EmfRecordTypeExtEscape } | `106` | **EMR_RESERVED_106** |
| **EmfRecordTypeStartDoc**{: #EmfRecordTypeStartDoc } | `107` | **EMR_RESERVED_107** |
| **EmfRecordTypeSmallTextOut**{: #EmfRecordTypeSmallTextOut } | `108` | **EMR_RESERVED_108** |
| **EmfRecordTypeForceUFIMapping**{: #EmfRecordTypeForceUFIMapping } | `109` | **EMR_RESERVED_109** |
| **EmfRecordTypeNamedEscape**{: #EmfRecordTypeNamedEscape } | `110` | **EMR_RESERVED_110** |
| **EmfRecordTypeColorCorrectPalette**{: #EmfRecordTypeColorCorrectPalette } | `111` | **EMR_COLORCORRECTPALETTE** |
| **EmfRecordTypeSetICMProfileA**{: #EmfRecordTypeSetICMProfileA } | `112` | **EMR_SETICMPROFILEA** |
| **EmfRecordTypeSetICMProfileW**{: #EmfRecordTypeSetICMProfileW } | `113` | **EMR_SETICMPROFILEW** |
| **EmfRecordTypeAlphaBlend**{: #EmfRecordTypeAlphaBlend } | `114` | **EMR_ALPHABLEND** |
| **EmfRecordTypeSetLayout**{: #EmfRecordTypeSetLayout } | `115` | **EMR_SETLAYOUT** |
| **EmfRecordTypeTransparentBlt**{: #EmfRecordTypeTransparentBlt } | `116` | **EMR_TRANSPARENTBLT** |
| **EmfRecordTypeReserved_117**{: #EmfRecordTypeReserved_117 } | `117` | Not used. |
| **EmfRecordTypeGradientFill**{: #EmfRecordTypeGradientFill } | `118` | **EMR_GRADIENTFILL** |
| **EmfRecordTypeSetLinkedUFIs**{: #EmfRecordTypeSetLinkedUFIs } | `119` | **EMR_RESERVED_119** |
| **EmfRecordTypeSetTextJustification**{: #EmfRecordTypeSetTextJustification } | `120` | **EMR_RESERVED_120** |
| **EmfRecordTypeColorMatchToTargetW**{: #EmfRecordTypeColorMatchToTargetW } | `121` | **EMR_COLORMATCHTOTARGETW** |
| **EmfRecordTypeCreateColorSpaceW**{: #EmfRecordTypeCreateColorSpaceW } | `122` | **EMR_CREATECOLORSPACEW** |
| **EmfRecordTypeMax**{: #EmfRecordTypeMax } | `122` | The highest EMF record type. |
| **EmfRecordTypeMin**{: #EmfRecordTypeMin } | `1` | The lowest EMF record type. |

## EMF+ records
{: .no_toc }

The members are numbered from `&H4000`. Most of them correspond to a method of [**Graphics**](../Graphics), which writes the record when it draws into a metafile. **EmfPlusRecordTotal** is one more than the last record and is not a record.

| Member | Value | Written by |
|:-------|:------|:------------|
| **EmfPlusRecordTypeInvalid**{: #EmfPlusRecordTypeInvalid } | `&H4000` | Not a valid record. |
| **EmfPlusRecordTypeHeader**{: #EmfPlusRecordTypeHeader } | `&H4001` | The EMF+ header. |
| **EmfPlusRecordTypeEndOfFile**{: #EmfPlusRecordTypeEndOfFile } | `&H4002` | The last EMF+ record of a metafile. |
| **EmfPlusRecordTypeComment**{: #EmfPlusRecordTypeComment } | `&H4003` | [**AddMetafileComment**](../Graphics#addmetafilecomment) |
| **EmfPlusRecordTypeGetDC**{: #EmfPlusRecordTypeGetDC } | `&H4004` | [**GetHDC**](../Graphics#gethdc) |
| **EmfPlusRecordTypeMultiFormatStart**{: #EmfPlusRecordTypeMultiFormatStart } | `&H4005` | The start of a multiple-format block. |
| **EmfPlusRecordTypeMultiFormatSection**{: #EmfPlusRecordTypeMultiFormatSection } | `&H4006` | A section in a multiple-format block. Multiple-format records let the same set of records be stored in several formats. |
| **EmfPlusRecordTypeMultiFormatEnd**{: #EmfPlusRecordTypeMultiFormatEnd } | `&H4007` | The end of a multiple-format block. |
| **EmfPlusRecordTypeObject**{: #EmfPlusRecordTypeObject } | `&H4008` | A persistent object, such as a brush, a pen or a path. See [GpObjectType](GpObjectType). |
| **EmfPlusRecordTypeClear**{: #EmfPlusRecordTypeClear } | `&H4009` | [**Clear**](../Graphics#clear) |
| **EmfPlusRecordTypeFillRects**{: #EmfPlusRecordTypeFillRects } | `&H400A` | [**FillRectangle**](../Graphics#fillrectangle), [**FillRectangles**](../Graphics#fillrectangles) |
| **EmfPlusRecordTypeDrawRects**{: #EmfPlusRecordTypeDrawRects } | `&H400B` | [**DrawRectangle**](../Graphics#drawrectangle), [**DrawRectangles**](../Graphics#drawrectangles) |
| **EmfPlusRecordTypeFillPolygon**{: #EmfPlusRecordTypeFillPolygon } | `&H400C` | [**FillPolygon**](../Graphics#fillpolygon) |
| **EmfPlusRecordTypeDrawLines**{: #EmfPlusRecordTypeDrawLines } | `&H400D` | [**DrawLine**](../Graphics#drawline), [**DrawLines**](../Graphics#drawlines) |
| **EmfPlusRecordTypeFillEllipse**{: #EmfPlusRecordTypeFillEllipse } | `&H400E` | [**FillEllipse**](../Graphics#fillellipse) |
| **EmfPlusRecordTypeDrawEllipse**{: #EmfPlusRecordTypeDrawEllipse } | `&H400F` | [**DrawEllipse**](../Graphics#drawellipse) |
| **EmfPlusRecordTypeFillPie**{: #EmfPlusRecordTypeFillPie } | `&H4010` | [**FillPie**](../Graphics#fillpie) |
| **EmfPlusRecordTypeDrawPie**{: #EmfPlusRecordTypeDrawPie } | `&H4011` | [**DrawPie**](../Graphics#drawpie) |
| **EmfPlusRecordTypeDrawArc**{: #EmfPlusRecordTypeDrawArc } | `&H4012` | [**DrawArc**](../Graphics#drawarc) |
| **EmfPlusRecordTypeFillRegion**{: #EmfPlusRecordTypeFillRegion } | `&H4013` | [**FillRegion**](../Graphics#fillregion) |
| **EmfPlusRecordTypeFillPath**{: #EmfPlusRecordTypeFillPath } | `&H4014` | [**FillPath**](../Graphics#fillpath) |
| **EmfPlusRecordTypeDrawPath**{: #EmfPlusRecordTypeDrawPath } | `&H4015` | [**DrawPath**](../Graphics#drawpath) |
| **EmfPlusRecordTypeFillClosedCurve**{: #EmfPlusRecordTypeFillClosedCurve } | `&H4016` | [**FillClosedCurve**](../Graphics#fillclosedcurve) |
| **EmfPlusRecordTypeDrawClosedCurve**{: #EmfPlusRecordTypeDrawClosedCurve } | `&H4017` | [**DrawClosedCurve**](../Graphics#drawclosedcurve) |
| **EmfPlusRecordTypeDrawCurve**{: #EmfPlusRecordTypeDrawCurve } | `&H4018` | [**DrawCurve**](../Graphics#drawcurve) |
| **EmfPlusRecordTypeDrawBeziers**{: #EmfPlusRecordTypeDrawBeziers } | `&H4019` | [**DrawBezier**](../Graphics#drawbezier), [**DrawBeziers**](../Graphics#drawbeziers) |
| **EmfPlusRecordTypeDrawImage**{: #EmfPlusRecordTypeDrawImage } | `&H401A` | [**DrawImage**](../Graphics#drawimage), the overloads without an array of destination points |
| **EmfPlusRecordTypeDrawImagePoints**{: #EmfPlusRecordTypeDrawImagePoints } | `&H401B` | [**DrawImage**](../Graphics#drawimage), the overloads with an array of destination points |
| **EmfPlusRecordTypeDrawString**{: #EmfPlusRecordTypeDrawString } | `&H401C` | [**DrawString**](../Graphics#drawstring) |
| **EmfPlusRecordTypeSetRenderingOrigin**{: #EmfPlusRecordTypeSetRenderingOrigin } | `&H401D` | [**RenderingOrigin**](../Graphics#renderingorigin) |
| **EmfPlusRecordTypeSetAntiAliasMode**{: #EmfPlusRecordTypeSetAntiAliasMode } | `&H401E` | [**SmoothingMode**](../Graphics#smoothingmode) |
| **EmfPlusRecordTypeSetTextRenderingHint**{: #EmfPlusRecordTypeSetTextRenderingHint } | `&H401F` | [**TextRenderingHint**](../Graphics#textrenderinghint) |
| **EmfPlusRecordTypeSetTextContrast**{: #EmfPlusRecordTypeSetTextContrast } | `&H4020` | [**TextContrast**](../Graphics#textcontrast) |
| **EmfPlusRecordTypeSetInterpolationMode**{: #EmfPlusRecordTypeSetInterpolationMode } | `&H4021` | [**InterpolationMode**](../Graphics#interpolationmode) |
| **EmfPlusRecordTypeSetPixelOffsetMode**{: #EmfPlusRecordTypeSetPixelOffsetMode } | `&H4022` | [**PixelOffsetMode**](../Graphics#pixeloffsetmode) |
| **EmfPlusRecordTypeSetCompositingMode**{: #EmfPlusRecordTypeSetCompositingMode } | `&H4023` | [**CompositingMode**](../Graphics#compositingmode) |
| **EmfPlusRecordTypeSetCompositingQuality**{: #EmfPlusRecordTypeSetCompositingQuality } | `&H4024` | [**CompositingQuality**](../Graphics#compositingquality) |
| **EmfPlusRecordTypeSave**{: #EmfPlusRecordTypeSave } | `&H4025` | [**Save**](../Graphics#save) |
| **EmfPlusRecordTypeRestore**{: #EmfPlusRecordTypeRestore } | `&H4026` | [**Restore**](../Graphics#restore) |
| **EmfPlusRecordTypeBeginContainer**{: #EmfPlusRecordTypeBeginContainer } | `&H4027` | [**BeginContainer**](../Graphics#begincontainer), the overloads with rectangles |
| **EmfPlusRecordTypeBeginContainerNoParams**{: #EmfPlusRecordTypeBeginContainerNoParams } | `&H4028` | [**BeginContainer**](../Graphics#begincontainer), the overload without arguments |
| **EmfPlusRecordTypeEndContainer**{: #EmfPlusRecordTypeEndContainer } | `&H4029` | [**EndContainer**](../Graphics#endcontainer) |
| **EmfPlusRecordTypeSetWorldTransform**{: #EmfPlusRecordTypeSetWorldTransform } | `&H402A` | [**Transform**](../Graphics#transform) |
| **EmfPlusRecordTypeResetWorldTransform**{: #EmfPlusRecordTypeResetWorldTransform } | `&H402B` | [**ResetTransform**](../Graphics#resettransform) |
| **EmfPlusRecordTypeMultiplyWorldTransform**{: #EmfPlusRecordTypeMultiplyWorldTransform } | `&H402C` | [**MultiplyTransform**](../Graphics#multiplytransform) |
| **EmfPlusRecordTypeTranslateWorldTransform**{: #EmfPlusRecordTypeTranslateWorldTransform } | `&H402D` | [**TranslateTransform**](../Graphics#translatetransform) |
| **EmfPlusRecordTypeScaleWorldTransform**{: #EmfPlusRecordTypeScaleWorldTransform } | `&H402E` | [**ScaleTransform**](../Graphics#scaletransform) |
| **EmfPlusRecordTypeRotateWorldTransform**{: #EmfPlusRecordTypeRotateWorldTransform } | `&H402F` | [**RotateTransform**](../Graphics#rotatetransform) |
| **EmfPlusRecordTypeSetPageTransform**{: #EmfPlusRecordTypeSetPageTransform } | `&H4030` | [**PageScale**](../Graphics#pagescale), [**PageUnit**](../Graphics#pageunit) |
| **EmfPlusRecordTypeResetClip**{: #EmfPlusRecordTypeResetClip } | `&H4031` | [**ResetClip**](../Graphics#resetclip) |
| **EmfPlusRecordTypeSetClipRect**{: #EmfPlusRecordTypeSetClipRect } | `&H4032` | [**SetClip**](../Graphics#setclip), the overloads with a rectangle |
| **EmfPlusRecordTypeSetClipPath**{: #EmfPlusRecordTypeSetClipPath } | `&H4033` | [**SetClip**](../Graphics#setclip), the overload with a path |
| **EmfPlusRecordTypeSetClipRegion**{: #EmfPlusRecordTypeSetClipRegion } | `&H4034` | [**SetClip**](../Graphics#setclip), the overloads with a region |
| **EmfPlusRecordTypeOffsetClip**{: #EmfPlusRecordTypeOffsetClip } | `&H4035` | [**TranslateClip**](../Graphics#translateclip) |
| **EmfPlusRecordTypeDrawDriverString**{: #EmfPlusRecordTypeDrawDriverString } | `&H4036` | [**DrawDriverString**](../Graphics#drawdriverstring) |
| **EmfPlusRecordTypeStrokeFillPath**{: #EmfPlusRecordTypeStrokeFillPath } | `&H4037` | Microsoft gives no description. |
| **EmfPlusRecordTypeSerializableObject**{: #EmfPlusRecordTypeSerializableObject } | `&H4038` | Microsoft gives no description. |
| **EmfPlusRecordTypeSetTSGraphics**{: #EmfPlusRecordTypeSetTSGraphics } | `&H4039` | Microsoft gives no description. |
| **EmfPlusRecordTypeSetTSClip**{: #EmfPlusRecordTypeSetTSClip } | `&H403A` | Microsoft gives no description. |
| **EmfPlusRecordTotal**{: #EmfPlusRecordTotal } | `&H403B` | One more than the last record. It is not a record. |
| **EmfPlusRecordTypeMax**{: #EmfPlusRecordTypeMax } | `&H403A` | The highest EMF+ record, one less than **EmfPlusRecordTotal**. |
| **EmfPlusRecordTypeMin**{: #EmfPlusRecordTypeMin } | `&H4001` | The lowest EMF+ record, same as **EmfPlusRecordTypeHeader**. |

## Used by

- [**Metafile**](../Metafile) class: [**PlayRecord**](../Metafile#playrecord)
- the **EnumerateMetafileProc** callback

## See Also

- [EmfPlusRecordType](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-emfplusrecordtype) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Metafile](../Metafile) class
