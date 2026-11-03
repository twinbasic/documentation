@echo off
rem Builds the probe's object files for one architecture, with the command line the Static Linking
rem page gives, into the two projects beside this folder: build.cmd 32 ^| 64. Run it from any prompt
rem after a change to a .c file. The objects are committed, so the probe needs no compiler. They are
rem built in this folder, by relative names, so that no path of this machine is written into them.
setlocal
set ARCH=%1
set VC=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build
call "%VC%\vcvars%ARCH%.bat" >nul
cd /d "%~dp0"
set F=/nologo /c /Gw /Gy /GS-
cl %F% basic.c /Fo"..\links\Miscellaneous\basic_%ARCH%.obj"
cl %F% crt.c /Fo"..\links\Miscellaneous\crt_%ARCH%.obj"
cl %F% crtmore.c /Fo"..\refused\Miscellaneous\crtmore_%ARCH%.obj"
cl %F% cppnew.cpp /Fo"..\refused\Miscellaneous\cppnew_%ARCH%.obj"
