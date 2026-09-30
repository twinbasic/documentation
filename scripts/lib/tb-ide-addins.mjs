// What a twinBASIC IDE reached over CDP says about its add-ins: the ones its
// compiler loaded, and the folder it loads them from besides the install's.

import path from "node:path";
import { normPath } from "./tb-ide.mjs";

/**
 * The add-ins the IDE's compiler has loaded, as the Add-Ins menu lists them:
 * an array of objects with at least a `name`. Empty when none loaded.
 *
 * The page asks the compiler over its root socket (`RequestAddinsStateList`),
 * so this is the compiler's own answer rather than anything inferred from
 * files on disk. Add-ins load as the compiler starts, so ask once the project
 * has opened.
 *
 * A DLL the compiler found but could not load is listed too, as
 * "Unknown Addin", so look for the name you expect rather than counting. The
 * DEBUG CONSOLE says what went wrong, in a line that starts with the file's
 * name in brackets: "[x.dll] Failed to load addin.  LoadLibrary() failed."
 */
export const loadedAddins = (c) => c.evaluate(
  "new Promise((resolve) => root.getAddinsList(resolve))", { awaitPromise: true });

/**
 * The folder whose addins\win32 or \win64 the IDE's compiler loads add-ins
 * from, besides the install's own: the page's commonFolderRootPath, with its
 * trailing backslash. Null when the page has none.
 *
 * Measured on BETA 983 (P6 in WIP.HelpAddin.md). The page makes it at startup
 * by expanding "%APPDATA%\twinBASIC" in the IDE's own environment, and sends it
 * with RequestLoadAddins; the compiler loads from what it is sent, not from its
 * own %APPDATA%. So an IDE started with APPDATA naming another folder loads
 * none of the add-ins in the user's %APPDATA%\twinBASIC\addins.
 */
export const addinsRoot = (c) => c.evaluate(
  "typeof commonFolderRootPath === 'undefined' || !commonFolderRootPath ? null : commonFolderRootPath");

/**
 * Throw unless the IDE's add-ins root (addinsRoot) is `<appdata>\twinBASIC`,
 * the folder an IDE started with `appdata` as its APPDATA makes. An IDE that
 * did not take %APPDATA% from its environment may have loaded the add-ins in
 * the user's own %APPDATA%\twinBASIC\addins, and whatever it was started for
 * is then testing something else. The add-ins load while the project opens,
 * so this can only say so afterwards.
 */
export async function checkAddinsRoot(c, appdata) {
  const root = await addinsRoot(c);
  const want = path.join(appdata, "twinBASIC");
  if (!root || normPath(path.resolve(root)) !== normPath(path.resolve(want))) {
    throw new Error(`the IDE's add-ins folder is under ${JSON.stringify(root)}, not ${want}: it did ` +
      "not take %APPDATA% from the environment it was started with, and its compiler may have " +
      "loaded the add-ins in the user's own %APPDATA%\\twinBASIC\\addins (P6 in WIP.HelpAddin.md)");
  }
  return root;
}
