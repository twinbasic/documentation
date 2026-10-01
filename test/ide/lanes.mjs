// The lanes scripts/ide_test.mjs runs (ide-test.bat). A lane is one scenario
// file in this folder, run with node:test in a process of its own, with its own
// DevTools port, work folder and copy of the twinBASIC install;
// scripts/lib/tb-lane.mjs is what the file gets. A scenario file imports
// `scenario` from "../addin/scenario.mjs", as the add-in ones do.
//
//   file      the scenario file
//   name      what --only matches and the report calls the lane; by default
//             the file's name without ".test.mjs"
//   settings  every application name the lane's programs pass to SaveSetting.
//             SaveSetting writes under HKCU\Software\VB and VBA Program
//             Settings\<name>. The runner records those keys before the first
//             lane starts, deletes them before this lane starts, and puts them
//             back as found once every lane has ended. Two lanes that name the
//             same one never run at once. Settings that are not named here are
//             left changed after the run.

export default [{ file: "export.test.mjs" }, { file: "debugger.test.mjs" }];
