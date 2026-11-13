// A table editor for Window > Keyboard Shortcuts > Manage Keyboard Shortcuts,
// where the IDE shows "Keyboard editor coming soon...." once Edit as JSON is
// cleared. Every command of the IDE is a row with its keys and a line on what
// it does; a row of a group of your own opens an editor for that command's
// entry in the group. The group stays the IDE's: the table reads the group's
// text from the IDE's own text area, which it hides, and writes every change
// back into it as JSON with an input event, so that the IDE's own handler
// keeps the dialog's copy and turns on Save Changes. Save, Cancel, Add New and
// Delete are the IDE's. A JSON button at the bottom shows the text area again.
//
// It changes only the call of the global showConfigEditor for this dialog
// (showManageKeyboardShortcuts calls it by name), through the one replacement
// of that function the help add-in's scripts share (see hookOf), and is put
// in only while the IDE has the "coming soon" pane. Running this again
// takes out what an earlier run put in: the original function goes back, and an
// open dialog gets its text area back. It puts in nothing when it is turned
// off. The add-in puts the commands' descriptions, { command: text }, in place
// of the marker below.
var on = $ON$;
var old = window.tbDocsKeyEditor;
if (old) {
  try {
    old.off();
  } catch (err) {
    console.error(err);
  }
  window.tbDocsKeyEditor = null;
}
if (
  on &&
  typeof showConfigEditor === "function" &&
  typeof showManageKeyboardShortcuts === "function" &&
  String(showManageKeyboardShortcuts).indexOf("Keyboard editor coming soon") >= 0 &&
  typeof builtInKeyboardShortcutGroups === "object" &&
  typeof ideCommands === "object" &&
  typeof VirtualKeyCodeLookup === "object"
) {
  (function () {
    var commandText = $COMMANDS$;
    var TITLE = "Manage Keyboard Shortcuts";
    // The commands whose action reads an argument, written cmd('argument').
    var ARG_COMMANDS = { tbDebugConsole_ExecuteCode: true };
    var KM = {
      ctrl: typeof monaco_KeyMod_CtrlCmd === "number" ? monaco_KeyMod_CtrlCmd : 2048,
      alt: typeof monaco_KeyMod_Alt === "number" ? monaco_KeyMod_Alt : 512,
      shift: typeof monaco_KeyMod_Shift === "number" ? monaco_KeyMod_Shift : 1024,
      down: typeof monaco_KeyMod_KEYDOWN === "number" ? monaco_KeyMod_KEYDOWN : 4096,
      repeat: typeof monaco_KeyMod_KEYDOWNREPEAT === "number" ? monaco_KeyMod_KEYDOWNREPEAT : 8192,
    };
    // The keys getKeyBindingCodeFromString lets match with or without Shift.
    var SHIFTABLE = "!\"#$%&'()*+-./:;<=>?@[\\]^_`{|}~";
    var KEY_NAMES = {
      ARROWUP: "Up", ARROWDOWN: "Down", ARROWLEFT: "Left", ARROWRIGHT: "Right",
      ESCAPE: "Esc", ENTER: "Enter", SPACE: "Space", " ": "Space", TAB: "Tab",
      BACKSPACE: "Backspace", DELETE: "Delete", INSERT: "Insert", HOME: "Home",
      END: "End", PAGEUP: "Page Up", PAGEDOWN: "Page Down", CANCEL: "Break",
      CONTROL: "Ctrl", SHIFT: "Shift", ALT: "Alt", CAPSLOCK: "Caps Lock",
      OTHERKEY: "any key with no name",
    };
    var TIMINGS = [
      ["down", "When pressed"],
      ["repeat", "When pressed, and while held"],
      ["release", "When released"],
      ["repeatonly", "Only while held"],
    ];
    var live = true;
    var mounts = [];

    var esc = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    };
    // A description: plain text with `code` in backticks.
    var descHtml = function (s) {
      return esc(s || "").replace(/`([^`]+)`/g, "<code>$1</code>");
    };
    var lower = function (s) {
      return String(s).toLowerCase();
    };
    var byName = function (a, b) {
      return a.localeCompare(b, "en", { sensitivity: "base" });
    };
    var prefixOf = function (id) {
      return id.slice(0, id.indexOf("_") + 1);
    };
    var registered = function (cmd) {
      return Object.prototype.hasOwnProperty.call(ideCommands, cmd) && !!ideCommands[cmd] && !!ideCommands[cmd].internalAction;
    };
    var isBuiltIn = function (g) {
      return Object.prototype.hasOwnProperty.call(builtInKeyboardShortcutGroups, g);
    };

    // ---- key strings, read as getKeyBindingCodeFromString reads them ----

    var parseKey = function (raw) {
      var s = String(raw);
      if (s.substr(0, 11) === "{ALLEXCEPT}") return { raw: raw, allExcept: true };
      var u = s.toUpperCase();
      var take = function (t) {
        if (u.indexOf(t) === -1) return false;
        u = u.replace(t, "");
        return true;
      };
      var k = { raw: raw };
      k.ctrl = take("{CTRL}");
      k.alt = take("{ALT}");
      k.shift = take("{SHIFT}");
      k.down = take("{KEYDOWN}");
      k.repeat = take("{KEYDOWNREPEAT}");
      k.name = u;
      return k;
    };
    // The codes the IDE files the binding under; none for a key it has no name for.
    var codesOf = function (k) {
      if (k.allExcept) return [];
      var a = VirtualKeyCodeLookup[k.name];
      if (!a) return [];
      if (k.ctrl) a += KM.ctrl;
      if (k.alt) a += KM.alt;
      var s = false;
      if (k.shift) a += KM.shift;
      else if (SHIFTABLE.indexOf(k.name) !== -1) s = true;
      if (k.down && k.repeat) {
        return s
          ? [a + KM.down, a + KM.repeat, a + KM.down + KM.shift, a + KM.repeat + KM.shift]
          : [a + KM.down, a + KM.repeat];
      }
      if (k.down) a += KM.down;
      if (k.repeat) a += KM.repeat;
      return s ? [a, a + KM.shift] : [a];
    };
    // A code without when it runs: the key and its modifiers.
    var baseOf = function (code) {
      return code & ~(KM.down | KM.repeat);
    };
    var timingOf = function (k) {
      if (k.down && k.repeat) return "repeat";
      if (k.down) return "down";
      if (k.repeat) return "repeatonly";
      return "release";
    };
    var keyString = function (k, timing) {
      return (
        (timing === "down" || timing === "repeat" ? "{KEYDOWN}" : "") +
        (timing === "repeat" || timing === "repeatonly" ? "{KEYDOWNREPEAT}" : "") +
        (k.ctrl ? "{CTRL}" : "") +
        (k.shift ? "{SHIFT}" : "") +
        (k.alt ? "{ALT}" : "") +
        k.name
      );
    };
    var keyLabel = function (k) {
      if (k.allExcept) return "every other key";
      var name = Object.prototype.hasOwnProperty.call(KEY_NAMES, k.name) ? KEY_NAMES[k.name] : k.name;
      return (k.ctrl ? "Ctrl+" : "") + (k.shift ? "Shift+" : "") + (k.alt ? "Alt+" : "") + (name === "" ? "(empty)" : name);
    };
    // Why a binding cannot run as written: { level: "dead" | "warn", text }, or null.
    var problemOf = function (k) {
      if (k.allExcept) return null;
      if (k.name === "") return { level: "dead", text: "An empty key string binds nothing." };
      if (!VirtualKeyCodeLookup[k.name])
        return { level: "dead", text: "The IDE has no key named " + k.name + ", so this never runs." };
      if (k.name === "OTHERKEY")
        return { level: "warn", text: "OTHERKEY runs for every key the IDE has no name for." };
      if (!k.down && !k.repeat && (k.ctrl || k.alt))
        return {
          level: "dead",
          text: "A key bound for its release never runs with Ctrl or Alt: the IDE remembers a key for its release only when neither is held.",
        };
      if (!k.down && k.repeat)
        return { level: "warn", text: "This runs only while the key repeats, not when it is first pressed." };
      if (k.shift && /^[0-9]$/.test(k.name))
        return {
          level: "warn",
          text: "With Shift held, a digit key arrives as its shifted symbol on most keyboard layouts, so this usually never runs.",
        };
      return null;
    };

    // ---- a group, read as applyKeyboardShortcutsLayering reads it ----

    var unquote = function (e) {
      if (e.startsWith("'") && e.endsWith("'")) e = e.substring(1, e.length - 1);
      return e.replace(/\\'/g, "'");
    };
    var parseEntryName = function (o) {
      var args;
      var i = o.indexOf("(");
      if (i !== -1) {
        args = o.substr(i + 1).trim();
        if (args.substr(args.length - 1, 1) === ")") args = args.substr(0, args.length - 1);
        args = unquote(args);
        o = o.substr(0, i);
      }
      var plus = o.charAt(0) === "+";
      return { cmd: plus ? o.substr(1) : o, plus: plus, args: args, hasParen: i !== -1, additive: plus || !!args };
    };
    var entryName = function (cmd, mode, args) {
      if (args !== undefined) return cmd + "('" + String(args).replace(/'/g, "\\'") + "')";
      return (mode === "add" ? "+" : "") + cmd;
    };
    var parseGroup = function (text) {
      if (typeof text !== "string") return null;
      try {
        var o = JSON.parse(text);
        return o && typeof o === "object" && !Array.isArray(o) ? o : null;
      } catch (err) {
        return null;
      }
    };
    // Applies a group to the merged keys, as the IDE does; false when the IDE
    // would stop at an entry whose value is not a list, leaving the rest out.
    var apply = function (map, g, obj) {
      var names = Object.keys(obj);
      for (var x = 0; x < names.length; x++) {
        var p = parseEntryName(names[x]);
        var n = obj[names[x]];
        var a = [];
        if (n) {
          if (!Array.isArray(n)) return false;
          for (var j = 0; j < n.length; j++) a.push({ key: n[j], args: p.args, g: g, cmd: p.cmd });
        }
        if (p.additive) {
          if (!map[p.cmd]) map[p.cmd] = [];
          map[p.cmd].push.apply(map[p.cmd], a);
        } else {
          map[p.cmd] = a;
        }
      }
      return true;
    };
    var snap = function (map) {
      var out = Object.create(null);
      for (var c in map) out[c] = map[c].slice();
      return out;
    };
    var sameList = function (a, b) {
      a = a || [];
      b = b || [];
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    };

    // ---- the state of one open dialog ----

    var newSession = function (opts) {
      return {
        opts: opts,
        texts: {}, // the text of each group shown in this dialog, as last seen
        added: {}, // groups made with Add New in this dialog, which Save switches on
        view: "table",
        search: "",
        keySearch: null, // { label, bases } while the list shows the commands of a key
        filter: "all",
        collapsed: {},
        open: null, // the command whose editor is open
        capture: null, // { kind: "key" | "arg" | "search", name?, args? }
        argDraft: "",
        message: "",
        scrollTop: 0,
        m: null, // the mount: the dialog's controller, the node and its elements
      };
    };

    var groupObject = function (s, entry) {
      if (entry.readonly) {
        var b = builtInKeyboardShortcutGroups[entry.id];
        return b && b.data && typeof b.data === "object" ? b.data : null;
      }
      var text;
      if (s.m && entry.id === s.m.id) text = s.m.area.value;
      else if (Object.prototype.hasOwnProperty.call(s.texts, entry.id)) text = s.texts[entry.id];
      else if (typeof customKeyboardShortcutGroups === "object" && customKeyboardShortcutGroups[entry.id])
        text = customKeyboardShortcutGroups[entry.id].data;
      return parseGroup(text);
    };
    // Switched on in Window > Keyboard Shortcuts; the IDE keeps the names of
    // those as |name|, and refuses a name with a bar in it.
    var switchedOn = function (id) {
      return typeof activeKeyboardShortcutGroupNames === "string" && activeKeyboardShortcutGroupNames.indexOf("|" + id + "|") > -1;
    };
    // Counted with the others: on, built in, shown, or added in this dialog.
    var isActive = function (s, entry) {
      return entry.readonly || entry.id === s.m.id || !!s.added[entry.id] || switchedOn(entry.id);
    };
    // The merged keys before the shown group, with it, and with every active
    // group, each binding one object throughout, so that a binding the shown
    // group keeps is the same object in all three.
    var layering = function (s) {
      var entries = s.opts.getEntries(s.m.ctl);
      var map = Object.create(null);
      var before = null;
      var through = null;
      var partial = {};
      entries.forEach(function (en) {
        if (!isActive(s, en)) return;
        if (en.id === s.m.id) before = snap(map);
        var obj = groupObject(s, en);
        if (obj && !apply(map, en.id, obj)) partial[en.id] = true;
        if (en.id === s.m.id) through = snap(map);
      });
      var finalSet = new Set();
      var byCode = new Map();
      // Each command's codes in the built-in group: a group of your own that
      // binds a command again to a key the built-in group gives it adds no
      // conflict, whatever else shares the key.
      var builtInCodes = new Set();
      entries.forEach(function (en) {
        if (!en.readonly) return;
        var obj = groupObject(s, en);
        if (!obj) return;
        var m = Object.create(null);
        apply(m, en.id, obj);
        for (var c in m)
          m[c].forEach(function (b) {
            codesOf(parseKey(b.key)).forEach(function (code) {
              builtInCodes.add(c + "\u0000" + code);
            });
          });
      });
      for (var cmd in map) {
        map[cmd].forEach(function (b) {
          finalSet.add(b);
          if (!registered(b.cmd)) return;
          var k = parseKey(b.key);
          if (k.allExcept) return;
          codesOf(k).forEach(function (code) {
            if (!byCode.has(code)) byCode.set(code, []);
            byCode.get(code).push(b);
          });
        });
      }
      return {
        entries: entries,
        before: before || Object.create(null),
        through: through || snap(map),
        final: map,
        finalSet: finalSet,
        byCode: byCode,
        builtInCodes: builtInCodes,
        partial: partial,
      };
    };
    // The other commands that share one of a binding's codes, when a group of
    // your own gives one of them the code and the built-in group does not: the
    // built-in group shares keys between commands that apply in different
    // places on purpose, and keeping one of those keys adds no conflict.
    var clashesOf = function (L, b) {
      if (!L.finalSet.has(b) || !registered(b.cmd)) return [];
      var seen = [];
      var added = function (o, code) {
        return !isBuiltIn(o.g) && !L.builtInCodes.has(o.cmd + "\u0000" + code);
      };
      codesOf(parseKey(b.key)).forEach(function (code) {
        var others = (L.byCode.get(code) || []).filter(function (o) {
          return o.cmd !== b.cmd;
        });
        if (!others.length) return;
        if (!added(b, code) && !others.some(function (o) { return added(o, code); })) return;
        others.forEach(function (o) {
          if (seen.indexOf(o) < 0) seen.push(o);
        });
      });
      return seen;
    };

    // The shown group's entries, in its order, each with its parsed name.
    var groupEntries = function (obj) {
      return Object.keys(obj).map(function (name) {
        var p = parseEntryName(name);
        p.name = name;
        p.value = obj[name];
        p.list = p.value === null || p.value === undefined || Array.isArray(p.value);
        return p;
      });
    };

    // ---- writing the group back through the IDE's text area ----

    var write = function (s, obj) {
      var text = JSON.stringify(obj, null, "\t");
      var area = s.m.area;
      area.value = text;
      s.texts[s.m.id] = text;
      area.dispatchEvent(new Event("input", { bubbles: true }));
      render(s);
    };
    // A copy of the group with the entry `oldName` changed: given the name
    // `newName` and the value, or left out when newName is null. A new entry
    // goes at the end.
    var withEntry = function (obj, oldName, newName, value) {
      var out = {};
      var done = false;
      Object.keys(obj).forEach(function (n) {
        if (n === oldName) {
          if (newName !== null) out[newName] = value;
          done = true;
        } else if (n !== newName || oldName === null) {
          out[n] = obj[n];
        }
      });
      if (!done && newName !== null) out[newName] = value;
      return out;
    };

    // ---- drawing ----

    var chipHtml = function (L, b, cls, extraTitle) {
      var k = parseKey(b.key);
      var problem = problemOf(k);
      var others = cls === "gone" ? [] : clashesOf(L, b);
      var title = ["From " + b.g];
      if (extraTitle) title.push(extraTitle);
      if (k.allExcept) title.push("Every key that " + String(b.key).substr(11) + " does not name");
      var timing = k.allExcept ? "release" : timingOf(k);
      if (timing === "release") title.push("Runs when the key is released");
      if (timing === "repeat") title.push("Runs again while the key is held");
      if (problem) {
        cls += problem.level === "dead" ? " tbKeDead" : " tbKeWarn";
        title.push(problem.text);
      } else if (others.length) {
        cls += " tbKeClash";
        title.push(
          "Also " +
            others
              .map(function (o) {
                return o.cmd + " (" + o.g + ")";
              })
              .join(", "),
        );
      }
      var text = esc(keyLabel(k));
      if (timing === "release" && !k.allExcept) text += ' <span class="tbKeWhen">released</span>';
      if (b.args !== undefined && b.args !== "") text += ' <span class="tbKeArg">(' + esc("'" + b.args + "'") + ")</span>";
      return '<span class="tbKeKey ' + cls + '" title="' + esc(title.join(". ")) + '">' + text + "</span>";
    };

    // What a row needs: its chips, the group's entries for its command, and
    // whether the row has a problem.
    var rowModel = function (s, L, cmd, mine) {
      var before = L.before[cmd] || [];
      var through = L.through[cmd] || [];
      var throughSet = new Set(through);
      var html = "";
      var problems = [];
      var custom = !s.m.readonly;
      // A key the group binds again, with the same argument, is not shown as removed.
      var same = function (b) {
        return lower(b.key) + "\u0000" + (b.args === undefined ? "" : b.args);
      };
      var kept = new Set(through.map(same));
      before.forEach(function (b) {
        if (custom && !throughSet.has(b) && !kept.has(same(b))) html += chipHtml(L, b, "tbKeGone", "Removed by this group");
      });
      through.forEach(function (b) {
        var own = custom && b.g === s.m.id;
        html += chipHtml(L, b, own ? "tbKeMine" : "");
        var k = parseKey(b.key);
        var problem = problemOf(k);
        var others = clashesOf(L, b);
        if ((own || !custom) && (problem || others.length)) problems.push({ b: b, k: k, problem: problem, others: others });
      });
      var plain = mine.filter(function (p) {
        return !p.args;
      });
      if (custom && !through.length && plain.some(function (p) { return !p.additive; }))
        html += '<span class="tbKeNone">no keys</span>';
      // A later group that changes what this one left.
      var later = "";
      if (custom && mine.length && !sameList(through, L.final[cmd])) {
        var by = [];
        var past = false;
        L.entries.forEach(function (en) {
          if (en.id === s.m.id) past = true;
          else if (past && isActive(s, en)) {
            var obj = groupObject(s, en);
            if (obj && Object.keys(obj).some(function (n) { return parseEntryName(n).cmd === cmd; })) by.push(en.id);
          }
        });
        later = '<div class="tbKeLater">' + esc((by.length ? by.join(", ") : "A later group") + " changes this again") + "</div>";
      }
      return { html: html + later, problems: problems, changed: mine.length > 0, hasKeys: through.length > 0 };
    };

    var problemNotes = function (list) {
      return list
        .map(function (p) {
          var label = esc(keyLabel(p.k));
          if (p.problem)
            return '<div class="tbKeNote ' + (p.problem.level === "dead" ? "tbKeError" : "") + '">' + label + ": " + esc(p.problem.text) + "</div>";
          return (
            '<div class="tbKeNote">' +
            label +
            " is also " +
            p.others
              .map(function (o) {
                return "<code>" + esc(o.cmd) + "</code> (" + esc(o.g) + ")";
              })
              .join(", ") +
            ". The IDE runs each command bound to a key whose context applies, in its own order, until one of them ends the key's handling.</div>"
          );
        })
        .join("");
    };

    var editorHtml = function (s, L, cmd, mine, model) {
      var plain = mine.filter(function (p) {
        return !p.args;
      });
      var withArgs = mine.filter(function (p) {
        return !!p.args;
      });
      var h = '<div class="tbKeEditor" data-cmd="' + esc(cmd) + '">';
      var odd = plain.length > 1 || plain.some(function (p) { return p.hasParen || !p.list; });
      if (odd) {
        h +=
          '<div class="tbKeNote tbKeInfo">This group has ' +
          (plain.length > 1 ? plain.length + " entries" : "an entry") +
          " for this command that the table cannot edit. Edit " +
          (plain.length > 1 ? "them" : "it") +
          ' as JSON. <button class="tbKeBtn" data-act="json">Show JSON</button></div>';
      } else {
        var p = plain[0];
        var mode = p && !p.plus ? "replace" : "add";
        var keys = p && Array.isArray(p.value) ? p.value : [];
        h +=
          '<div class="tbKeLine"><span class="tbKeLabel">Keys from earlier groups</span><span class="tbKeSeg" role="group" aria-label="Keys from earlier groups">' +
          '<button class="tbKeSegBtn" data-act="mode" data-mode="add" aria-pressed="' + (mode === "add") + '">Keep them, and add these</button>' +
          '<button class="tbKeSegBtn" data-act="mode" data-mode="replace" aria-pressed="' + (mode === "replace") + '">Replace them with these</button></span></div>';
        h += '<div class="tbKeLine"><span class="tbKeLabel">This group</span><span class="tbKeVals">';
        keys.forEach(function (raw, i) {
          h += keyEditHtml(s, raw, i, "key", p.name);
        });
        if (!keys.length) h += '<span class="tbKeNone">' + (mode === "replace" ? "no keys: the command has none" : "none") + "</span>";
        h += captureHtml(s, { kind: "key" }) + "</span></div>";
      }
      if (ARG_COMMANDS[cmd] || withArgs.length) {
        h += '<div class="tbKeLine"><span class="tbKeLabel">With an argument</span><span class="tbKeArgs">';
        withArgs.forEach(function (a) {
          var keys = Array.isArray(a.value) ? a.value : [];
          h +=
            '<span class="tbKeArgLine"><input class="tbKeArgText" aria-label="Argument" data-act="argtext" data-name="' + esc(a.name) + '" value="' + esc(a.args) + '">';
          keys.forEach(function (raw, i) {
            h += keyEditHtml(s, raw, i, "arg", a.name);
          });
          h += captureHtml(s, { kind: "arg", name: a.name });
          h += '<button class="tbKeBtn" data-act="argremove" data-name="' + esc(a.name) + '" title="Remove this binding">Remove</button></span>';
        });
        h +=
          '<span class="tbKeArgLine"><input class="tbKeArgText" aria-label="New argument" placeholder="? 6*7" data-act="argdraft" value="' + esc(s.argDraft) + '">' +
          captureHtml(s, { kind: "arg", name: null }, "Add a key with this argument") +
          "</span></span></div>";
      }
      h += problemNotes(model.problems.filter(function (q) { return q.b.g === s.m.id; }));
      if (s.message) h += '<div class="tbKeNote tbKeError" role="alert">' + esc(s.message) + "</div>";
      h += '<div class="tbKeLine tbKeEnd">';
      if (plain.length && !odd) h += '<button class="tbKeBtn" data-act="reset">Reset to earlier groups</button>';
      if (!odd) h += '<button class="tbKeBtn" data-act="nokeys">No keys</button>';
      h += '<span class="tbKeGrow"></span><button class="tbKeBtn" data-act="close">Close</button></div></div>';
      return h;
    };

    var keyEditHtml = function (s, raw, i, kind, name) {
      var k = parseKey(raw);
      if (k.allExcept)
        return '<span class="tbKeKeyEdit"><span class="tbKeKey">' + esc(keyLabel(k)) + "</span></span>";
      var t = timingOf(k);
      var h = '<span class="tbKeKeyEdit"><span class="tbKeKey tbKeMine">' + esc(keyLabel(k)) + "</span>";
      h += '<select class="tbKeTiming" aria-label="When ' + esc(keyLabel(k)) + ' runs" data-act="timing" data-kind="' + kind + '" data-name="' + esc(name) + '" data-i="' + i + '">';
      TIMINGS.forEach(function (o) {
        var blocked = o[0] === "release" && (k.ctrl || k.alt) && t !== "release";
        if (o[0] === "repeatonly" && t !== "repeatonly") return;
        h += '<option value="' + o[0] + '"' + (o[0] === t ? " selected" : "") + (blocked ? " disabled" : "") + ">" + o[1] + "</option>";
      });
      h += "</select>";
      h += '<button class="tbKeX" data-act="remove" data-kind="' + kind + '" data-name="' + esc(name) + '" data-i="' + i + '" aria-label="Remove ' + esc(keyLabel(k)) + '" title="Remove"><span class="codicon codicon-close" aria-hidden="true"></span></button></span>';
      return h;
    };

    var captureHtml = function (s, what, label) {
      var c = s.capture;
      var active = c && c.kind === what.kind && (what.kind !== "arg" || c.name === what.name);
      if (active)
        return '<input class="tbKeCapture" readonly data-capture="1" aria-label="Press the keys" placeholder="Press the keys... (Esc to stop)">';
      return (
        '<button class="tbKeBtn" data-act="capture" data-kind="' + what.kind + '"' + (what.name ? ' data-name="' + esc(what.name) + '"' : "") + ">" +
        esc(label || "Add a key") +
        "</button>"
      );
    };

    // The focused control, by what it is rather than by the element, so that
    // the same control has the focus again after the list is drawn again.
    var FOCUS_ATTRS = ["data-act", "data-mode", "data-kind", "data-name", "data-i", "data-prefix", "data-capture"];
    var focusKey = function (list) {
      var el = document.activeElement;
      if (!el || !list.contains(el)) return null;
      if (el.classList.contains("tbKeEditable")) return '.tbKeEditable[data-cmd="' + CSS.escape(el.getAttribute("data-cmd")) + '"]';
      var sel = FOCUS_ATTRS.filter(function (a) {
        return el.hasAttribute(a);
      }).map(function (a) {
        return "[" + a + '="' + CSS.escape(el.getAttribute(a)) + '"]';
      });
      return sel.length ? el.tagName.toLowerCase() + sel.join("") : null;
    };

    var render = function (s) {
      var m = s.m;
      if (!m) return;
      var obj = parseGroup(m.area.value);
      var table = s.view === "table" && !!obj;
      m.top.style.display = table ? "" : "none";
      m.area.style.display = table ? "none" : "";
      m.label.style.display = "none";
      m.viewTable.setAttribute("aria-pressed", String(s.view === "table"));
      m.viewJson.setAttribute("aria-pressed", String(s.view !== "table"));
      if (table && window.tbDocsTextFind && window.tbDocsTextFind.bar && m.node.contains(window.tbDocsTextFind.bar))
        window.tbDocsTextFind.bar.remove();
      var L = layering(s);
      var state = "";
      if (m.readonly) state = "The built-in group: read-only.";
      else if (s.added[m.id]) state = "Switched on when the changes are saved.";
      else if (!switchedOn(m.id)) state = "Off: switch it on in Window > Keyboard Shortcuts.";
      if (!obj) {
        m.status.textContent = (s.view === "table" ? "The text is not valid JSON, so the table cannot show it. " : "") + state;
        m.status.className = s.view === "table" ? "tbKeStatus tbKeBad" : "tbKeStatus";
        return;
      }
      var mine = groupEntries(obj);
      var byCmd = Object.create(null);
      var stray = [];
      var cut = false;
      mine.forEach(function (p) {
        if (cut) {
          stray.push({ p: p, why: "after an entry whose value is not a list: the IDE stops reading the group there" });
          return;
        }
        if (!p.list) {
          stray.push({ p: p, why: "its value is not a list of keys, and the IDE stops reading the group here" });
          cut = true;
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(ideCommands, p.cmd)) {
          stray.push({ p: p, why: "the IDE has no command of this name" });
          return;
        }
        (byCmd[p.cmd] = byCmd[p.cmd] || []).push(p);
      });
      // The rows: every command of the IDE, by prefix and name.
      var ids = Object.keys(ideCommands).sort(byName);
      var q = lower(s.search.trim());
      var counts = { all: 0, keys: 0, changed: 0, problems: 0 };
      var groups = [];
      var byPrefix = Object.create(null);
      ids.forEach(function (cmd) {
        var model = rowModel(s, L, cmd, byCmd[cmd] || []);
        counts.all++;
        if (model.hasKeys) counts.keys++;
        if (model.changed) counts.changed++;
        if (model.problems.length) counts.problems++;
        if (s.filter === "keys" && !model.hasKeys) return;
        if (s.filter === "changed" && !model.changed) return;
        if (s.filter === "problems" && !model.problems.length) return;
        if (s.keySearch) {
          var hit = (L.through[cmd] || []).concat(L.before[cmd] || []).some(function (b) {
            return codesOf(parseKey(b.key)).some(function (code) {
              return s.keySearch.bases.indexOf(baseOf(code)) >= 0;
            });
          });
          if (!hit) return;
        } else if (q) {
          var labels = (L.through[cmd] || [])
            .map(function (b) {
              return lower(keyLabel(parseKey(b.key)));
            })
            .join(" ");
          if (lower(cmd).indexOf(q) < 0 && lower(commandText[cmd] || "").indexOf(q) < 0 && labels.indexOf(q) < 0) return;
        }
        var prefix = prefixOf(cmd);
        if (!byPrefix[prefix]) {
          byPrefix[prefix] = { prefix: prefix, rows: [] };
          groups.push(byPrefix[prefix]);
        }
        byPrefix[prefix].rows.push({ cmd: cmd, model: model });
      });
      groups.sort(function (a, b) {
        if (!a.prefix !== !b.prefix) return a.prefix ? -1 : 1;
        return byName(a.prefix, b.prefix);
      });
      var filtering = !!(q || s.keySearch || s.filter !== "all");
      var h = "";
      if (m.readonly) h += '<div class="tbKeNote tbKeInfo">The built-in group is read-only. Its keys come first, under every group of your own.</div>';
      if (L.partial[m.id]) h += '<div class="tbKeNote tbKeError">The IDE reads this group only up to an entry whose value is not a list of keys. The entries after it have no effect.</div>';
      s.stray = stray;
      if (stray.length) {
        h += '<div class="tbKeHead tbKeStrayHead">Entries the table cannot show</div>';
        stray.forEach(function (x, i) {
          h +=
            '<div class="tbKeRow tbKeStray"><div class="tbKeCmd">' + esc(x.p.name) + '</div><div class="tbKeKeys"><code>' + esc(JSON.stringify(x.p.value)) + '</code></div><div class="tbKeDesc">' +
            esc("Ignored: " + x.why + ".") +
            (m.readonly ? "" : ' <button class="tbKeBtn" data-act="strayremove" data-i="' + i + '">Remove</button>') +
            "</div></div>";
        });
      }
      groups.forEach(function (g) {
        var name = g.prefix || "Other";
        var shut = !filtering && s.collapsed[name];
        h +=
          '<div class="tbKeHead" role="button" tabindex="0" aria-expanded="' + !shut + '" data-act="fold" data-prefix="' + esc(name) + '">' +
          '<span class="tbKeFold codicon codicon-chevron-' + (shut ? "right" : "down") + '" aria-hidden="true"></span>' +
          '<span class="tbKeHeadName">' + esc(name) + '</span> <span class="tbKeCount">' + g.rows.length + "</span></div>";
        if (shut) return;
        g.rows.forEach(function (r) {
          var open = !m.readonly && s.open === r.cmd;
          var cls = "tbKeRow" + (m.readonly ? "" : " tbKeEditable") + (r.model.changed && !m.readonly ? " tbKeChanged" : "") + (open ? " tbKeOpen" : "");
          var rest = g.prefix ? r.cmd.slice(g.prefix.length) : r.cmd;
          h +=
            '<div class="' + cls + '" data-cmd="' + esc(r.cmd) + '"' +
            (m.readonly ? "" : ' role="button" tabindex="0" aria-expanded="' + open + '"') + ">" +
            '<div class="tbKeCmd"><span class="tbKePre">' + esc(g.prefix) + "</span>" + esc(rest) + "</div>" +
            '<div class="tbKeKeys">' + (r.model.html || "&#160;") + "</div>" +
            '<div class="tbKeDesc">' + descHtml(commandText[r.cmd]) + "</div>" +
            (open ? editorHtml(s, L, r.cmd, byCmd[r.cmd] || [], r.model) : "") +
            "</div>";
        });
      });
      if (!groups.length) h += '<div class="tbKeEmpty">No command matches.</div>';
      var scroll = m.list.scrollTop;
      var focused = focusKey(m.list);
      m.list.innerHTML = h;
      m.list.scrollTop = scroll;
      if (focused) {
        var again = m.list.querySelector(focused);
        if (again) again.focus();
      }
      // The filter buttons, with their counts.
      var f = [["all", "All", counts.all], ["keys", "With keys", counts.keys]];
      if (!m.readonly) f.push(["changed", "Changed here", counts.changed]);
      f.push(["problems", "Problems", counts.problems]);
      if (m.readonly && s.filter === "changed") s.filter = "all";
      m.filters.innerHTML = f
        .map(function (x) {
          return (
            '<button class="tbKeSegBtn tbKeChip" data-filter="' + x[0] + '" aria-pressed="' + (s.filter === x[0]) + '">' + x[1] + ' <span class="tbKeCount">' + x[2] + "</span></button>"
          );
        })
        .join("");
      m.keyButton.setAttribute("aria-pressed", String(!!(s.keySearch || (s.capture && s.capture.kind === "search"))));
      m.search.placeholder = s.capture && s.capture.kind === "search" ? "Press the keys to find... (Esc to stop)" : "Find a command, a description or a key";
      if (s.keySearch && m.search.value !== s.keySearch.label) m.search.value = s.keySearch.label;
      m.status.className = "tbKeStatus";
      m.status.textContent =
        (m.readonly ? "" : mine.length + (mine.length === 1 ? " entry" : " entries") + ", ") +
        counts.problems + (counts.problems === 1 ? " command" : " commands") + " with a problem across the active groups. " + state;
      var cap = m.list.querySelector("[data-capture]");
      if (cap) {
        cap.onkeydown = function (e) {
          captureKey(s, e);
        };
        cap.onblur = function () {
          setTimeout(function () {
            if (s.capture && s.capture.kind !== "search" && document.activeElement !== cap) {
              s.capture = null;
              render(s);
            }
          }, 0);
        };
        cap.focus();
      } else if (s.capture && s.capture.kind === "search") {
        m.search.focus();
      }
    };

    // ---- key capture, as globalKeyDown names a key ----

    var captureKey = function (s, e) {
      e.preventDefault();
      e.stopPropagation();
      var plain = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
      if (plain && (e.key === "Escape" || e.key === "Tab")) {
        s.capture = null;
        s.message = "";
        render(s);
        return;
      }
      if (["Control", "Shift", "Alt", "Meta", "AltGraph", "OS"].indexOf(e.key) >= 0) return;
      var fail = function (text) {
        s.message = text;
        render(s);
      };
      if (e.getModifierState && e.getModifierState("AltGraph"))
        return fail("AltGr types a character here, so the IDE cannot take it as a shortcut.");
      if (e.metaKey) return fail("The IDE does not read the Windows key.");
      var o = e.key;
      if (e.code && e.code.startsWith("Key") && !(typeof isSpecialKeyLookup === "object" && isSpecialKeyLookup[o])) o = e.code.substr(3);
      var name = o.toUpperCase();
      if (name === " ") name = "SPACE";
      if (!VirtualKeyCodeLookup[name] || name === "OTHERKEY")
        return fail("The IDE has no name for " + (e.key === "Dead" ? "this key" : e.key) + ", so it cannot be a shortcut. Plain Esc and Tab are bound in the JSON view.");
      var k = { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, name: name };
      var c = s.capture;
      s.message = "";
      if (c.kind === "search") {
        var bases = codesOf(Object.assign({ down: true }, k)).map(baseOf);
        s.keySearch = { label: keyLabel(k), bases: bases };
        s.search = "";
        s.capture = null;
        s.m.search.value = s.keySearch.label;
        render(s);
        return;
      }
      var raw = keyString(k, "down");
      var obj = parseGroup(s.m.area.value);
      if (!obj) return;
      var cmd = s.open;
      s.capture = null;
      if (c.kind === "key") {
        var p = groupEntries(obj).filter(function (x) {
          return x.cmd === cmd && !x.args;
        })[0];
        var keys = p && Array.isArray(p.value) ? p.value.slice() : [];
        if (keys.indexOf(raw) < 0) keys.push(raw);
        write(s, withEntry(obj, p ? p.name : null, p ? p.name : entryName(cmd, "add"), keys));
      } else if (c.name) {
        var list = Array.isArray(obj[c.name]) ? obj[c.name].slice() : [];
        if (list.indexOf(raw) < 0) list.push(raw);
        write(s, withEntry(obj, c.name, c.name, list));
      } else {
        var arg = s.argDraft.trim();
        if (!arg) return fail("Type the argument first.");
        var newName = entryName(cmd, null, arg);
        var have = Array.isArray(obj[newName]) ? obj[newName].slice() : [];
        if (have.indexOf(raw) < 0) have.push(raw);
        s.argDraft = "";
        write(s, withEntry(obj, newName, newName, have));
      }
    };

    // ---- what the controls do ----

    var act = function (s, el, e) {
      var a = el.getAttribute("data-act");
      var obj = parseGroup(s.m.area.value);
      var cmd = s.open;
      var plainOf = function () {
        return groupEntries(obj).filter(function (x) {
          return x.cmd === cmd && !x.args;
        })[0];
      };
      s.message = "";
      if (a === "fold") {
        var name = el.getAttribute("data-prefix");
        s.collapsed[name] = !s.collapsed[name];
        return render(s);
      }
      if (a === "json") {
        s.view = "json";
        return render(s);
      }
      if (a === "close") {
        s.open = null;
        s.capture = null;
        return render(s);
      }
      if (a === "capture") {
        s.capture = { kind: el.getAttribute("data-kind"), name: el.getAttribute("data-name") };
        if (s.capture.kind === "arg" && !s.capture.name && !s.argDraft.trim()) {
          s.capture = null;
          s.message = "Type the argument first.";
        }
        return render(s);
      }
      if (!obj || s.m.readonly) return;
      if (a === "strayremove") {
        var x = s.stray[Number(el.getAttribute("data-i"))];
        if (x) write(s, withEntry(obj, x.p.name, null));
        return;
      }
      var p = plainOf();
      if (a === "mode") {
        var mode = el.getAttribute("data-mode");
        var keys = p && Array.isArray(p.value) ? p.value : [];
        // Keeping the earlier keys and adding none is what no entry does.
        if (mode === "add" && !keys.length) return p ? write(s, withEntry(obj, p.name, null)) : render(s);
        return write(s, withEntry(obj, p ? p.name : null, entryName(cmd, mode), keys));
      }
      if (a === "reset") return p ? write(s, withEntry(obj, p.name, null)) : undefined;
      if (a === "nokeys") return write(s, withEntry(obj, p ? p.name : null, entryName(cmd, "replace"), []));
      if (a === "remove") {
        var ename = el.getAttribute("data-name");
        var list = Array.isArray(obj[ename]) ? obj[ename].slice() : [];
        list.splice(Number(el.getAttribute("data-i")), 1);
        // An entry that adds nothing does nothing, so it goes.
        var gone = !list.length && (el.getAttribute("data-kind") === "arg" || parseEntryName(ename).plus);
        return write(s, withEntry(obj, ename, gone ? null : ename, list));
      }
      if (a === "argremove") return write(s, withEntry(obj, el.getAttribute("data-name"), null));
      if (e && e.type === "change") {
        if (a === "timing") {
          var tname = el.getAttribute("data-name");
          var tlist = Array.isArray(obj[tname]) ? obj[tname].slice() : [];
          var i = Number(el.getAttribute("data-i"));
          var k = parseKey(tlist[i]);
          tlist[i] = keyString(k, el.value);
          return write(s, withEntry(obj, tname, tname, tlist));
        }
        if (a === "argtext") {
          var from = el.getAttribute("data-name");
          var text = el.value.trim();
          if (!text) {
            s.message = "An argument cannot be empty: an entry with an empty argument replaces the command's other keys.";
            return render(s);
          }
          var to = entryName(cmd, null, text);
          if (to !== from && Object.prototype.hasOwnProperty.call(obj, to)) {
            s.message = "This group already binds a key to the command with that argument.";
            return render(s);
          }
          return write(s, withEntry(obj, from, to, obj[from]));
        }
      }
    };

    // ---- putting the table into the IDE's pane ----

    var mount = function (s, ctl, node) {
      var area = node.querySelector("textarea");
      var label = node.querySelector("label");
      if (!area || !label) return;
      var m = {
        ctl: ctl,
        node: node,
        area: area,
        label: label,
        id: ctl.selectedEntryId,
        readonly: area.hasAttribute("readonly"),
      };
      if (!m.readonly) s.texts[m.id] = area.value;
      area.addEventListener("input", function () {
        if (!m.readonly) s.texts[m.id] = area.value;
      });
      if (s.m && s.m.id !== m.id) {
        s.open = null;
        s.capture = null;
        s.message = "";
      }
      s.m = m;
      var top = document.createElement("div");
      top.className = "tbKe tbKeTop";
      top.innerHTML =
        '<div class="tbKeBar"><input class="tbKeSearch" aria-label="Find a command" spellcheck="false">' +
        '<button class="tbKeBtn tbKeKeyFind" title="Find the commands of a key: press it next" aria-label="Find the commands of a key">Find a key</button>' +
        '<span class="tbKeFilters tbKeSeg" role="group" aria-label="Show"></span></div>' +
        '<div class="tbKeList"></div>';
      var foot = document.createElement("div");
      foot.className = "tbKe tbKeFoot";
      foot.innerHTML =
        '<span class="tbKeSeg" role="group" aria-label="View"><button class="tbKeSegBtn" data-view="table">Table</button><button class="tbKeSegBtn" data-view="json">JSON</button></span>' +
        '<span class="tbKeStatus" aria-live="polite"></span>';
      node.insertBefore(top, area);
      node.appendChild(foot);
      m.top = top;
      m.foot = foot;
      m.list = top.querySelector(".tbKeList");
      m.search = top.querySelector(".tbKeSearch");
      m.filters = top.querySelector(".tbKeFilters");
      m.keyButton = top.querySelector(".tbKeKeyFind");
      m.viewTable = foot.querySelector('[data-view="table"]');
      m.viewJson = foot.querySelector('[data-view="json"]');
      m.status = foot.querySelector(".tbKeStatus");
      m.search.value = s.keySearch ? s.keySearch.label : s.search;

      m.search.addEventListener("input", function () {
        s.keySearch = null;
        s.search = m.search.value;
        render(s);
      });
      m.search.addEventListener("keydown", function (e) {
        if (s.capture && s.capture.kind === "search") captureKey(s, e);
      });
      m.search.addEventListener("blur", function () {
        if (s.capture && s.capture.kind === "search") {
          s.capture = null;
          render(s);
        }
      });
      m.keyButton.addEventListener("click", function () {
        if (s.keySearch || (s.capture && s.capture.kind === "search")) {
          s.keySearch = null;
          s.capture = null;
          s.search = "";
          m.search.value = "";
        } else {
          s.capture = { kind: "search" };
          m.search.value = "";
        }
        render(s);
      });
      m.filters.addEventListener("click", function (e) {
        var b = e.target.closest("[data-filter]");
        if (!b) return;
        s.filter = b.getAttribute("data-filter");
        render(s);
      });
      m.viewTable.addEventListener("click", function () {
        s.view = "table";
        render(s);
      });
      m.viewJson.addEventListener("click", function () {
        s.view = "json";
        render(s);
      });
      m.list.addEventListener("scroll", function () {
        s.scrollTop = m.list.scrollTop;
      });
      m.list.addEventListener("click", function (e) {
        var el = e.target.closest("[data-act]");
        if (el && el.tagName !== "SELECT" && el.tagName !== "INPUT") return act(s, el, e);
        if (e.target.closest(".tbKeEditor")) return;
        var row = e.target.closest(".tbKeEditable");
        if (!row) return;
        var cmd = row.getAttribute("data-cmd");
        s.open = s.open === cmd ? null : cmd;
        s.capture = null;
        s.message = "";
        render(s);
      });
      m.list.addEventListener("change", function (e) {
        var el = e.target.closest("[data-act]");
        if (el) act(s, el, e);
      });
      m.list.addEventListener("input", function (e) {
        if (e.target.getAttribute("data-act") === "argdraft") s.argDraft = e.target.value;
      });
      // The dialog's own key handler (on its container) presses its focused
      // button on Enter, cancels the dialog on Esc outside a text box, and
      // keeps Tab and the arrow keys from moving the focus: none of it reaches
      // past the table.
      var keys = function (e) {
        e.stopPropagation();
        if (e.ctrlKey && !e.altKey && e.code === "KeyF") {
          e.preventDefault();
          m.search.focus();
          m.search.select();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          if (s.capture) s.capture = null;
          else if (s.open) s.open = null;
          else if (s.keySearch || s.search) {
            s.keySearch = null;
            s.search = "";
            m.search.value = "";
          } else return;
          s.message = "";
          render(s);
          return;
        }
        var t = e.target;
        if ((e.key === "Enter" || e.key === " ") && t.getAttribute && (t.classList.contains("tbKeEditable") || t.getAttribute("data-act") === "fold")) {
          e.preventDefault();
          t.click();
        }
      };
      top.addEventListener("keydown", keys);
      foot.addEventListener("keydown", keys);
      var record = {
        node: node,
        undo: function () {
          top.remove();
          foot.remove();
          area.style.display = "";
          label.style.display = "";
          var outer = node.closest(".configEditorRootOuter");
          var header = outer && outer.querySelector(".configEditorInfoHeader");
          if (header && typeof s.info === "string") header.innerHTML = s.info;
        },
      };
      mounts = mounts.filter(function (r) {
        return r.node.isConnected;
      });
      mounts.push(record);
      // The IDE puts the node into the dialog after this returns; the list
      // has a height, and its scroll position, only then.
      render(s);
      setTimeout(function () {
        if (s.m === m) m.list.scrollTop = s.scrollTop;
      }, 0);
    };

    // The header's last line promises an editor, which this is: it is left out
    // while the table is on, and put back when it is turned off.
    var PROMISE = /<br\s*\/?>\s*ps\.\s+in future we'll have a proper editor[^<]*$/i;

    // Changes the options of the one dialog, and passes every other call on.
    var adapt = function (opts) {
      var s = newSession(opts);
      if (typeof opts.info === "string") {
        s.info = opts.info;
        opts.info = opts.info.replace(PROMISE, "");
      }
      var getNode = opts.getEntryEditorDomNode;
      var addNew = opts.addNewEntry;
      var del = opts.deleteEntry;
      var ids = function (ctl) {
        var out = {};
        opts.getEntries(ctl).forEach(function (en) {
          out[en.id] = true;
        });
        return out;
      };
      opts.getEntryEditorDomNode = function (ctl) {
        var node = getNode.apply(this, arguments);
        if (!live) return node;
        try {
          mount(s, ctl, node);
        } catch (err) {
          console.error(err);
        }
        return node;
      };
      opts.addNewEntry = function (ctl, name) {
        var had = live ? ids(ctl) : null;
        var r = addNew.apply(this, arguments);
        if (live) {
          try {
            if (!had[name] && ids(ctl)[name]) s.added[name] = true;
            render(s);
          } catch (err) {
            console.error(err);
          }
        }
        return r;
      };
      opts.deleteEntry = function (ctl, id) {
        var r = del.apply(this, arguments);
        if (live) {
          try {
            delete s.texts[id];
            delete s.added[id];
            render(s);
          } catch (err) {
            console.error(err);
          }
        }
        return r;
      };
    };

    // ---- the one replacement of showConfigEditor ----
    // Each script of the add-in that changes a dialog of showConfigEditor
    // puts its adapter here under the dialog's title, or the title, "|" and a
    // name of its own; the replacement calls every adapter for the dialog's
    // title, then the IDE's function. layouteditor.js and layouts.js have the
    // same two functions.
    var hookOf = function () {
      var h = window.tbDocsConfigEditors;
      if (h && window.showConfigEditor === h.dispatch) return h;
      var current = window.showConfigEditor;
      var nh = { original: current.tbDocsOriginal || current, adapters: (h && h.adapters) || {} };
      nh.dispatch = function (opts) {
        var title = opts && typeof opts.title === "string" ? opts.title : null;
        if (title !== null)
          Object.keys(nh.adapters).forEach(function (k) {
            if (k !== title && k.indexOf(title + "|") !== 0) return;
            try {
              nh.adapters[k](opts);
            } catch (err) {
              console.error(err);
            }
          });
        return nh.original.apply(this, arguments);
      };
      nh.dispatch.tbDocsOriginal = nh.original;
      window.showConfigEditor = nh.dispatch;
      window.tbDocsConfigEditors = nh;
      return nh;
    };
    var unhook = function (title) {
      var h = window.tbDocsConfigEditors;
      if (!h) return;
      delete h.adapters[title];
      if (Object.keys(h.adapters).length) return;
      if (window.showConfigEditor === h.dispatch) window.showConfigEditor = h.original;
      window.tbDocsConfigEditors = null;
    };
    var hook = hookOf();
    hook.adapters[TITLE] = function (opts) {
      if (live) adapt(opts);
    };

    var style = document.getElementById("tbDocsKeyEditorStyle");
    if (!style) {
      style = document.createElement("style");
      style.id = "tbDocsKeyEditorStyle";
      document.head.appendChild(style);
    }
    // The look is the IDE's own. Buttons are the dialog's buttons, from the
    // theme's variables, so that they take each theme's shape (square in Dark
    // and Light, rounded in Aurora). Everything else follows the IDE Options
    // and Project Settings dialogs (tips_injectCss and tbps_injectCss in
    // main.js), whose accent, controls and section titles are the same in
    // every theme. The pane the table is in is white whatever the theme
    // (styles.css, .configEditorRHS), so its text and fields are dark on white.
    var ACCENT = "#4271ae";
    var BTN =
      "background:var(--themeDialogButtonsBackColor,#fbfdff);color:var(--themeDialogButtonForeColor,#000);" +
      "border-top:var(--themeDialogButtonBorderTop,1px solid #9b9b9b);border-left:var(--themeDialogButtonBorderLeft,1px solid #9b9b9b);" +
      "border-right:var(--themeDialogButtonBorderRight,1px solid #5e5e5e);border-bottom:var(--themeDialogButtonBorderBottom,1px solid #5e5e5e);" +
      "border-radius:var(--themeDialogButtonBorderRadius,0);box-shadow:var(--themeDialogButtonBoxShadow,2px 2px 3px #7c7c7c78)";
    var FOCUS = "var(--themeDialogButtonFocusWidth,2px) solid var(--themeDialogButtonFocusRectColor,#6d6dc3)";
    var MONO = "font-family:Consolas,Menlo,monospace";
    style.textContent = [
      ".tbKe{color:#1e1e1e;font-size:inherit}",
      ".tbKeTop{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;background:#fff}",
      ".tbKeBar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px;border-bottom:1px solid rgba(128,128,128,.35)}",
      // Text boxes and drop-downs, as the settings dialogs draw them.
      ".tbKe input.tbKeSearch,.tbKe input.tbKeArgText,.tbKe input.tbKeCapture,.tbKe select.tbKeTiming{box-sizing:border-box;height:26px;padding:0 6px;border:1px solid #999;border-radius:4px;background:#fff;color:#1e1e1e;font:inherit;outline:none}",
      ".tbKe input.tbKeSearch{flex:1 1 200px;min-width:140px;padding:0 10px}",
      ".tbKe input.tbKeArgText{width:12em;" + MONO + "}",
      ".tbKe input.tbKeCapture{width:16em;border-color:" + ACCENT + ";background:#eef3ff;box-shadow:0 0 0 2px rgba(66,113,174,.25)}",
      ".tbKe input.tbKeSearch:focus,.tbKe input.tbKeArgText:focus,.tbKe select.tbKeTiming:focus{border-color:" + ACCENT + ";box-shadow:0 0 0 2px rgba(66,113,174,.25)}",
      // Buttons: the dialog's own.
      ".tbKeBtn{box-sizing:border-box;height:26px;padding:0 10px;margin:0 2px 2px 0;font:inherit;cursor:pointer;white-space:nowrap;" + BTN + "}",
      ".tbKeBtn:hover{background-color:#ebeff5;filter:brightness(1.3)}",
      ".tbKeBtn[aria-pressed=true]{background:" + ACCENT + ";color:#fff}",
      ".tbKe .tbKeBtn:focus-visible{outline:" + FOCUS + ";outline-offset:2px}",
      // A choice of one: the settings dialogs' No / Yes control.
      ".tbKeSeg{display:inline-flex;flex-wrap:wrap;border:1px solid #999;border-radius:4px;overflow:hidden;background:#fff}",
      ".tbKeSegBtn{box-sizing:border-box;height:24px;padding:0 10px;margin:0;border:0;border-right:1px solid #999;border-radius:0;background:#fff;color:#1e1e1e;font:inherit;cursor:pointer;white-space:nowrap;user-select:none}",
      ".tbKeSegBtn:last-child{border-right:0}",
      ".tbKeSegBtn:hover{background:rgba(128,128,128,.15)}",
      ".tbKeSegBtn[aria-pressed=true]{background:" + ACCENT + ";color:#fff}",
      ".tbKe .tbKeSegBtn:focus-visible{outline:none;box-shadow:inset 0 0 0 2px var(--themeDialogButtonFocusRectColor,#6d6dc3),inset 0 0 0 3px #fff}",
      ".tbKeCount{font-size:80%;opacity:.6;font-weight:normal}",
      ".tbKeSegBtn[aria-pressed=true] .tbKeCount{opacity:.8}",
      ".tbKeList{flex:1 1 auto;min-height:0;overflow:auto}",
      // A prefix's heading: the settings dialogs' section title.
      ".tbKeHead{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:4px;padding:4px 8px 4px 4px;border-left:4px solid " + ACCENT + ";background:#f5f5f5;font-weight:600;cursor:pointer;user-select:none}",
      ".tbKeHeadName{" + MONO + "}.tbKeHead .tbKeCount{margin-left:auto}",
      ".tbKeFold{font-size:14px;opacity:.7}",
      ".tbKeStrayHead{position:static;display:block;padding-left:8px;border-left-color:#c62828;cursor:default}",
      // The rows: the settings dialogs' option rows.
      ".tbKeRow{display:grid;grid-template-columns:minmax(0,34%) minmax(0,26%) minmax(0,1fr);gap:8px;padding:6px 8px;border-bottom:var(--themeDialogConfigRowBorderBottom,1px solid rgba(128,128,128,.25));align-items:start}",
      ".tbKeEditable{cursor:pointer}.tbKeEditable:hover{background:rgba(128,128,128,.06)}",
      ".tbKeChanged{box-shadow:inset 3px 0 rgba(66,113,174,.5)}",
      ".tbKeOpen,.tbKeOpen:hover{background:rgba(128,128,128,.09)}",
      ".tbKeCmd{" + MONO + ";overflow-wrap:anywhere}.tbKePre{opacity:.5}",
      ".tbKeDesc{color:#5a5a5a}.tbKeDesc code{" + MONO + "}",
      // A key: plain as the dialog's <pre>, and in colour when it says something.
      ".tbKeKey{display:inline-block;margin:1px 3px 1px 0;padding:0 4px;border:1px solid transparent;border-radius:3px;background:rgba(127,127,127,.2);color:#1e1e1e;" + MONO + ";font-size:90%;white-space:nowrap}",
      ".tbKeMine{background:rgba(66,113,174,.14);border-color:" + ACCENT + ";color:#2b4f80}",
      ".tbKeGone{background:transparent;border:1px dashed #999;color:#888;text-decoration:line-through}",
      ".tbKeClash{background:#fff3cd;border-color:#b8860b;color:#6b4e00}",
      ".tbKeWarn{background:#fff3cd;border:1px dashed #b8860b;color:#6b4e00}",
      ".tbKeDead{background:#fdecea;border-color:#c62828;color:#8e1c1c;text-decoration:line-through}",
      ".tbKeWhen,.tbKeArg{opacity:.75}",
      ".tbKeNone{color:#777;font-style:italic}",
      ".tbKeLater{margin-top:2px;color:#6b4e00;font-size:90%}",
      ".tbKeEditor{grid-column:1/-1;margin:6px 0 2px;padding:10px;border:1px solid rgba(128,128,128,.45);border-radius:4px;background:#fff;cursor:default}",
      ".tbKeLine{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}",
      ".tbKeEnd{margin:8px 0 0}.tbKeGrow{flex:1}",
      ".tbKeLabel{flex:0 0 13em;align-self:flex-start;line-height:26px;font-weight:600}",
      ".tbKeVals{display:flex;flex:1 1 0;min-width:0;gap:6px;align-items:center;flex-wrap:wrap}",
      ".tbKeKeyEdit{display:inline-flex;align-items:center;gap:3px;margin-right:8px}",
      ".tbKeX{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:4px;background:transparent;color:#c62828;cursor:pointer}",
      ".tbKeX:hover{background:rgba(128,128,128,.15)}",
      ".tbKe .tbKeX:focus-visible{outline:" + FOCUS + ";outline-offset:0}",
      ".tbKeArgs{display:flex;flex-direction:column;gap:4px}.tbKeArgLine{display:flex;gap:6px;align-items:center;flex-wrap:wrap}",
      // Notes: the settings dialogs' banner, and their error line for an error.
      ".tbKeNote{margin:6px 0;padding:6px 10px;border:1px dashed #b8860b;border-radius:4px;background:#fff3cd;color:#3d2e00;font-size:95%}",
      ".tbKeInfo{border:1px solid rgba(128,128,128,.35);background:rgba(128,128,128,.08);color:#1e1e1e}",
      ".tbKeError{border:0;background:#c62828;color:#fff}.tbKeError code{color:#fff}",
      ".tbKeTop>.tbKeList>.tbKeNote{margin:8px}",
      ".tbKeEmpty{padding:16px;color:#777}",
      // The foot: the grey of the IDE's own Edit as JSON bar.
      ".tbKeFoot{display:flex;gap:10px;align-items:center;padding:6px 8px;background:#b5b5b5}",
      ".tbKeStatus{color:#1e1e1e}.tbKeBad{color:#8e1c1c;font-weight:bold}",
      ".tbKe [role=button]:focus-visible{outline:" + FOCUS + ";outline-offset:-2px}",
    ].join("\n");

    window.tbDocsKeyEditor = {
      original: hook.original,
      off: function () {
        live = false;
        unhook(TITLE);
        mounts.forEach(function (r) {
          if (r.node.isConnected) r.undo();
        });
        mounts = [];
        var st = document.getElementById("tbDocsKeyEditorStyle");
        if (st) st.remove();
      },
    };
  })();
}
