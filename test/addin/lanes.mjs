// The lanes scripts/addin_test.mjs runs (addin-test.bat). A lane is one
// scenario file in this folder, run with node:test in a process of its own,
// with its own DevTools port, work folder and copy of the twinBASIC install;
// scripts/lib/tb-lane.mjs is what the file gets.
//
//   file      the scenario file
//   name      what --only matches and the report calls the lane; by default
//             the file's name without ".test.mjs"
//   settings  every application name the lane's add-ins pass to SaveSetting.
//             SaveSetting writes under HKCU\Software\VB and VBA Program
//             Settings\<name>, the key any installed copy of the same add-in
//             uses. The runner records those keys before the first lane
//             starts, deletes them before this lane starts, so that its
//             add-ins begin from their defaults, and puts them back as found
//             once every lane has ended. Two lanes that name the same one
//             never run at once. An add-in whose settings are not named here
//             leaves them changed after the run.

export default [
  { file: "sample10.test.mjs" },
  // Sample 15 saves all four of its option boxes whenever one is clicked.
  { file: "sample15.test.mjs", settings: ["GlobalSearchAddIn"] },
  // Stage 2 probes: each builds its own add-in, from probes/<name>.
  { file: "keys.test.mjs" },
];
