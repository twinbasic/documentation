Filed as [twinbasic/twinbasic#2528](https://github.com/twinbasic/twinbasic/issues/2528).

## A keyboard-shortcut group whose name contains `|` switches other groups on and off

**Describe the bug**
The IDE keeps the list of keyboard-shortcut groups that are on as one string, each name between two bars, such as `|Mine||Other|`, and looks a name up in it as text. Manage Keyboard Shortcuts accepts a group name that contains `|`, and that name's entry can then contain another group's: with groups `A|B` and `B`, the text `|A|B|` is the entry of `A|B` and also contains `|B|`. Clicking `B` in Window > Keyboard Shortcuts then removes the wrong text: the first click leaves `B` ticked, and the second switches `A|B` off as well and saves a list that ends in a broken `|A`. Nothing warns about the name. It was observed by operating Manage Keyboard Shortcuts and the commands of the Window > Keyboard Shortcuts items in an IDE whose saves were blocked, and reading the list and the menu's ticks after each step.

**To Reproduce**
Steps to reproduce the behavior:
1. There is no project to open. The steps change the groups saved in `HKCU\Software\VB and VBA Program Settings\twinBASIC_IDE\IDESettings` (`CUSTOM_KEYBOARD_SHORTCUT_GROUPS` and `ACTIVE_KEYBOARD_SHORTCUT_GROUPS`): export that key first if they matter. Choose Window > Keyboard Shortcuts > Manage Keyboard Shortcuts..., Add New..., type `A|B`, press Enter, and Save Changes. The new group is switched on.
2. Do the same with the name `B`. Window > Keyboard Shortcuts shows `Custom 1. A|B` and `Custom 2. B`, both ticked. The list of groups that are on is `|A|B||B|`.
3. Click `Custom 2. B`. It stays ticked: the IDE removed the first `|B|` it found, which is the one inside `|A|B|`, and the list is now `|A|B|`.
4. Click `Custom 2. B` again. `A|B` and `B` are both unticked, though only `B` was clicked, and the list saved is `|A`, which names no group.

**Expected behavior**
Step 3 switches `B` off and leaves `A|B` on. Either Manage Keyboard Shortcuts refuses a name that contains `|`, as it refuses one that starts with `<`, or the list is kept in a form that a name cannot break, such as a JSON array of names.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The code, read from `ide\main.js`: `toggleActiveKeyboardShortcutName` tests the list with `indexOf("|" + name + "|")` and removes the entry with `replace`, which replaces the first match; `getCustomKeyboardShortcutMenuOptions` ticks a group by the same `indexOf`. The merge of the groups that are on matches names the same way: with the list `|A|B|`, `A|B` on and `B` defined but never switched on, a shortcut that only `B` defines works, and `B` is ticked in the menu. That was tried with the groups set in the IDE's page as Save Changes sets them, and a real key press.

Severity: low. A name with `|` is unusual, and the groups themselves are kept, but the saved list is corrupted without a message, and the menu shows a group as on after it was switched off.

<!-- Reproducer: bugs/keyboard-group-bar-name/ (mode lane: asserted by `ide-test.bat --only customising` (test/ide/customising.test.mjs), the test "a group named A|B switches B on with it, and toggling B twice switches both off", which passes on BETA 1005; it adds the groups through the Manage Keyboard Shortcuts dialog and runs the menu item's command, tbKeyboardShortcuts_ToggleActiveKeyboardShortcutGroupCustom2, with every save the IDE makes blocked in its page). No project and no zip. docs/IDE/Customising/Keyboard-Shortcuts.md carries a WARNING for it; when a fixed build is released, that WARNING goes. Found 2026-10-11 in the trials for the Customising pages. -->
