// What tbrun adds to a probe's sources before it packs them.
//
// A probe is a module with a [RunAfterBuild] Sub. Two things are added to the
// staged copy, never to the caller's tree:
//
//   * A wrapper. The attribute moves from the probe's Sub to a Sub appended to
//     the same module, which calls the probe's Sub and then prints SENTINEL. A
//     probe that stops before it returns -- End, or an error that ends the run
//     without a word, as an unhandled one raised in LLVM-compiled code does on
//     BETA 995 -- leaves no SENTINEL, which is how tbrun tells it from one that
//     finished. Appended to the same module, so a Private probe Sub can be
//     called. The attribute is blanked to spaces rather than deleted, so every
//     line and column a diagnostic names is still the caller's. The wrapper
//     does not help a module that also holds a procedure named like the
//     module: twinBASIC does not run the hook then, and wrapProbe reports the
//     procedure as `clash` so that tbrun can refuse the probe.
//   * The TbRun module, whose Out writes a line where the run can read it: the
//     DEBUG CONSOLE in the IDE, and standard output in a built exe, where
//     Debug.Print writes nothing. The wrapper tells it which: it sets IDE_FLAG
//     before it calls the probe, and a built exe never runs the wrapper.

import { MODIFIERS } from "./twin-declarations.mjs";

export const SENTINEL = "[tbrun] the probe returned";
export const WRAPPER_SUB = "tbrun_RunProbe";
export const TBRUN_FILE = "TbRun.twin";
export const IDE_FLAG = "tbrun_InIDE";

// Lines the IDE prints after the probe's own run has returned. A probe that
// leaves a form loaded gets this one after SENTINEL (measured, BETA 983 and 995).
const AFTER_RETURN_RE = /^\[DEBUGGER\] Waiting for remaining forms to close\.\.\.$/;

/**
 * Where SENTINEL is in a captured console, if the probe returned.
 *
 * @param {string[]} lines  the console's lines, blank ends trimmed
 * @returns {number} SENTINEL's index when only lines the IDE prints after a
 *   return follow it, else -1
 */
export function sentinelIndex(lines) {
  const at = lines.lastIndexOf(SENTINEL);
  return at >= 0 && lines.slice(at + 1).every((l) => AFTER_RETURN_RE.test(l)) ? at : -1;
}

const ATTRIBUTE_RE = /^([ \t]*)\[RunAfterBuild\]/gim;
const SUB_RE = new RegExp(
  `^[ \\t]*(?:(?:${MODIFIERS})[ \\t]+)*Sub[ \\t]+(\\w+)[ \\t]*(?:\\([ \\t]*\\))?[ \\t]*(?:'.*)?$`,
  "i",
);
const PROCEDURE_RE = new RegExp(`^[ \\t]*(?:(?:${MODIFIERS})[ \\t]+)*(?:Sub|Function)[ \\t]+(\\w+)`, "gim");
const SKIPPED_RE = /^[ \t]*(?:'.*|\[[^\]]*\][ \t]*)?$/;
const CONTAINER_RE = new RegExp(
  `^[ \\t]*(?:(?:${MODIFIERS})[ \\t]+)*(Module|Class|CoClass|Interface)[ \\t]+(\\w+)`,
  "gim",
);
const END_MODULE_RE = /^[ \t]*End[ \t]+Module\b/im;
const TBRUN_MODULE_RE = /^[ \t]*(?:(?:Public|Private)[ \t]+)?Module[ \t]+TbRun\b/im;

/**
 * Wrap a probe's [RunAfterBuild] Sub, and add the TbRun module.
 *
 * @param {{name: string, text: string}[]} files  the .twin files under the tree's Sources/, each named by its
 *   path there
 * @returns {{files: {name: string, text: string}[], wrapped: {file: string, module: string, sub: string, clash?: string} | null, why?: string}}
 *   the files to write (changed or new), what was wrapped, and why nothing was.
 *   `clash` names a Sub or Function of the hook's module that has the module's
 *   own name, which stops the hook from running in twinBASIC (BETA 997)
 */
export function wrapProbe(files) {
  const out = [];
  // A tree's own TbRun module is left as it is, and the wrapper sets no flag in it.
  const ours = !files.some((f) => TBRUN_MODULE_RE.test(f.text));
  if (ours) out.push({ name: TBRUN_FILE, text: TBRUN_MODULE });
  const none = (why) => ({ files: out, wrapped: null, why });

  const hits = files.flatMap((f) =>
    [...f.text.matchAll(ATTRIBUTE_RE)].map((m) => ({ f, at: m.index + m[1].length, indent: m[1] })),
  );
  if (hits.length !== 1) {
    return none(
      hits.length ? `${hits.length} [RunAfterBuild] attributes` : "no [RunAfterBuild] attribute at the start of a line",
    );
  }
  const { f, at, indent } = hits[0];
  const end = at + "[RunAfterBuild]".length;

  // The Sub it marks: the rest of the attribute's line, or else the first line
  // after it that is not blank, a comment or another attribute.
  const lines = f.text.slice(end).split("\n");
  let sub = null;
  for (const [i, raw] of lines.entries()) {
    const line = raw.replace(/\r$/, "");
    if (SKIPPED_RE.test(line)) continue;
    sub = SUB_RE.exec(line)?.[1] ?? null;
    if (!sub) return none(`the line after [RunAfterBuild] is not a Sub without parameters: ${line.trim()}`);
    lines.length = i + 1;
    break;
  }
  if (!sub) return none("no Sub after [RunAfterBuild]");

  const containers = [...f.text.slice(0, at).matchAll(CONTAINER_RE)];
  const container = containers.at(-1);
  if (!container || container[1].toLowerCase() !== "module") {
    return none(
      `the [RunAfterBuild] Sub is not in a Module${container ? ` but in ${container[1]} ${container[2]}` : ""}`,
    );
  }
  const afterSub = end + lines.join("\n").length;
  const closing = END_MODULE_RE.exec(f.text.slice(afterSub));
  if (!closing) return none(`no End Module after ${sub}`);
  const insertAt = afterSub + closing.index;

  // A Sub or Function named like its module (any case, any modifiers) in the
  // module that holds the hook: the hook does not run (BETA 997).
  const clash = [...f.text.slice(container.index, insertAt).matchAll(PROCEDURE_RE)].find(
    (m) => m[1].toLowerCase() === container[2].toLowerCase(),
  )?.[1];

  const eol = f.text.includes("\r\n") ? "\r\n" : "\n";
  const wrapper = [
    `${indent}[RunAfterBuild]`,
    `${indent}Public Sub ${WRAPPER_SUB}()`,
    ...(ours ? [`${indent}    TbRun.${IDE_FLAG} = True`] : []),
    `${indent}    ${sub}`,
    `${indent}    Debug.Print "${SENTINEL}"`,
    `${indent}End Sub`,
    "",
    "",
  ].join(eol);
  const text =
    f.text.slice(0, at) + " ".repeat(end - at) + f.text.slice(end, insertAt) + wrapper + f.text.slice(insertAt);
  out.push({ name: f.name, text });
  return { files: out, wrapped: { file: f.name, module: container[2], sub, clash } };
}

// Debug.Print writes nothing in a built exe (docs/Features/Project-Configuration/
// Project-Types.md), so there Out writes UTF-8: to the file TBRUN_OUT names, or
// else to standard output. tbrun's --exe names a file, because it starts the
// exe on a private desktop with no handles inherited, so no pipe reaches it.
// Out tells the IDE from the exe by IDE_FLAG, not by App.IsInIDE: App exists
// only in a project that references the VB package, and in any other this
// module would not compile (TB5079, Unrecognized symbol 'App').
const TBRUN_MODULE = `' Added by tbrun to the staged copy of a probe. TbRun.Out writes a line to the
' DEBUG CONSOLE in the IDE; in a built exe, as UTF-8, to the file the TBRUN_OUT
' environment variable names, or else to standard output. tbrun's wrapper Sub
' sets ${IDE_FLAG} before it calls the probe; a built exe runs Sub Main instead.
Module TbRun

    Public ${IDE_FLAG} As Boolean

    Private Declare PtrSafe Function GetStdHandle Lib "kernel32" (ByVal nStdHandle As Long) As LongPtr
    Private Declare PtrSafe Function WriteFile Lib "kernel32" (ByVal hFile As LongPtr, ByVal lpBuffer As LongPtr, ByVal nNumberOfBytesToWrite As Long, ByRef lpNumberOfBytesWritten As Long, ByVal lpOverlapped As LongPtr) As Long
    Private Declare PtrSafe Function WideCharToMultiByte Lib "kernel32" (ByVal CodePage As Long, ByVal dwFlags As Long, ByVal lpWideCharStr As LongPtr, ByVal cchWideChar As Long, ByVal lpMultiByteStr As LongPtr, ByVal cbMultiByte As Long, ByVal lpDefaultChar As LongPtr, ByVal lpUsedDefaultChar As LongPtr) As Long

    Public Sub Out(ByVal Text As String)
        If ${IDE_FLAG} Then
            Debug.Print Text
            Exit Sub
        End If
        Text = Text & vbCrLf
        Dim n As Long = WideCharToMultiByte(65001, 0, StrPtr(Text), Len(Text), 0, 0, 0, 0)
        Dim bytes() As Byte
        ReDim bytes(n - 1)
        WideCharToMultiByte 65001, 0, StrPtr(Text), Len(Text), VarPtr(bytes(0)), n, 0, 0
        Dim file As String = Environ$("TBRUN_OUT")
        If Len(file) = 0 Then
            Dim written As Long
            WriteFile GetStdHandle(-11), VarPtr(bytes(0)), n, written, 0
            Exit Sub
        End If
        Dim f As Integer = FreeFile
        Open file For Binary Access Write As #f
        Put #f, LOF(f) + 1, bytes
        Close #f
    End Sub

End Module
`;
