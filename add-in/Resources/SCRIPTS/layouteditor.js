// A picture editor for Window > Panel Layouts > Manage Panel Layouts, where the
// IDE shows each layout as JSON in a plain text area. The selected layout is
// drawn as a small IDE window: every docked panel a tile in its groups, every
// floating panel a window over them, at the IDE window's proportions. A tile
// or a group is edited in a box beside the picture: its direction, its size,
// its place among its neighbours, floating or docked, or out of the layout; a
// panel the layout lacks, an add-in's tool window included, is docked at an
// edge of a tile. The layout stays the IDE's: the editor reads it from the
// IDE's own text area, which it hides, and writes every change back into it
// with an input event, so that the IDE's own handler keeps the dialog's copy
// and turns on Save Changes. Save, Cancel, Add New and Delete are the IDE's. A
// JSON button at the bottom shows the text area again.
//
// It changes only the call of showConfigEditor for this dialog, through the
// one replacement of that function the help add-in's scripts share (see
// hookOf), and is put in only while the dialog still edits a plain text area.
// Running this again takes out what an earlier run put in, and an open dialog
// gets its text area back. It puts in nothing when it is turned off.
var on = $ON$;
var old = window.tbDocsLayoutEditor;
if (old) {
  try {
    old.off();
  } catch (err) {
    console.error(err);
  }
  window.tbDocsLayoutEditor = null;
}
if (
  on &&
  typeof showConfigEditor === "function" &&
  typeof showManagePanelLayouts === "function" &&
  String(showManagePanelLayouts).indexOf("genericMonospaceTextArea") >= 0 &&
  typeof builtInPanelLayouts === "object" &&
  typeof customPanelLayouts === "object" &&
  typeof getPanelsConfiguration === "function"
) {
  (function () {
    var TITLE = "Manage Panel Layouts";
    // The panels restorePanelConfiguration knows, in the order the editor
    // offers them, with the names their headers show.
    var PANELS = [
      ["TOOLBAR", "Toolbar"],
      ["TOOLBOX", "Toolbox"],
      ["EDITOR", "Editor"],
      ["PROJECT EXPLORER", "Project Explorer"],
      ["PROPERTIES", "Properties"],
      ["DEBUG CONSOLE", "Debug Console"],
      ["PROBLEMS", "Diagnostics"],
      ["CALL STACK", "Call Stack"],
      ["VARIABLES", "Variables"],
      ["WATCHES", "Watches"],
      ["OUTLINE", "Outline"],
      ["HISTORY", "History"],
      ["OPEN EDITORS", "Open Editors"],
      ["FIND REPLACE", "Find and Replace"],
      ["PACKAGE PUBLISHING", "Package Publishing"],
      ["WEBPAGE1", "Webpage"],
      ["MEMORY 1", "Memory"],
      ["IDE TRACE OUTPUT", "IDE Trace Output"],
    ];
    var NAMES = {};
    PANELS.forEach(function (p) {
      NAMES[p[0]] = p[1];
    });
    var ADDIN = "ADDIN_";
    // Where the IDE puts a panel shown with its show command and in no layout.
    var FLOAT_AT = { left: 100, top: 100, width: 300, height: 500 };
    var live = true;
    var mounts = [];
    var has = function (o, k) {
      return Object.prototype.hasOwnProperty.call(o, k);
    };
    var esc = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    };

    // ---- the one replacement of showConfigEditor ----
    // Each script of the add-in that changes a dialog of showConfigEditor
    // claims that dialog's title here; the replacement calls its adapter, then
    // the IDE's function. keyeditor.js has the same two functions.
    var hookOf = function () {
      var h = window.tbDocsConfigEditors;
      if (h && window.showConfigEditor === h.dispatch) return h;
      var current = window.showConfigEditor;
      var nh = { original: current.tbDocsOriginal || current, adapters: (h && h.adapters) || {} };
      nh.dispatch = function (opts) {
        try {
          var a = opts && typeof opts.title === "string" && has(nh.adapters, opts.title) ? nh.adapters[opts.title] : null;
          if (a) a(opts);
        } catch (err) {
          console.error(err);
        }
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

    // ---- a layout, read as restoreDockConfig and restoreFloatingConfig read it ----

    var isGroup = function (n) {
      return !!n && (n.type === "vertical" || n.type === "horizontal") && Array.isArray(n.content);
    };
    var isPanel = function (n) {
      return !!n && !isGroup(n) && typeof n.id === "string";
    };
    // "vertical" lays its members out side by side, "horizontal" one above another.
    var sideBySide = function (g) {
      return g.type === "vertical";
    };
    var isAddin = function (id) {
      return String(id).indexOf(ADDIN) === 0;
    };
    var addinWindows = function () {
      var out = {};
      try {
        if (typeof toolWindowsById === "object" && toolWindowsById)
          Object.keys(toolWindowsById).forEach(function (k) {
            if (k !== "") out[ADDIN + k] = toolWindowsById[k];
          });
      } catch (err) {
        console.error(err);
      }
      return out;
    };
    // What an add-in's tool window shows in its header.
    var addinTitle = function (w) {
      try {
        var h = w && w.sectionHeader;
        var t = h && (h.querySelector(".sectionHeaderInner") || h);
        var s = t && String(t.innerText || t.textContent || "").trim();
        if (s && s !== "AddIn Panel") return s;
      } catch (err) {
        /* no title */
      }
      return "";
    };
    var known = function (id) {
      return has(NAMES, id) || id === "debug-console";
    };
    var nameOf = function (s, id) {
      if (has(NAMES, id)) return NAMES[id];
      if (id === "debug-console") return NAMES["DEBUG CONSOLE"];
      if (isAddin(id)) return (s.addins[id] && addinTitle(s.addins[id])) || id.slice(ADDIN.length) || "(no id)";
      return String(id);
    };
    var sizeKind = function (n) {
      if (n.variableSize) return "rest";
      if (n.size === "fit-content") return "fit";
      return "share";
    };
    var sizeLabel = function (n) {
      var k = sizeKind(n);
      if (k === "rest") return "takes the rest";
      if (k === "fit") return "fits its contents";
      var v = parseFloat(n.size);
      return isNaN(v) ? String(n.size || "0%") : Math.round(v * 10) / 10 + "%";
    };
    var parseLayout = function (text) {
      try {
        var o = JSON.parse(text);
        return o && typeof o === "object" && !Array.isArray(o) ? o : null;
      } catch (err) {
        return null;
      }
    };
    var at = function (obj, path) {
      var n = obj.docked;
      for (var i = 0; i < path.length; i++) n = n.content[path[i]];
      return n;
    };
    var pathKey = function (p) {
      return p.join(",");
    };
    var pathOf = function (key) {
      return key === "" ? [] : key.split(",").map(Number);
    };
    // Every panel of the layout, docked and floating, with where it is.
    var panelsOf = function (obj) {
      var out = [];
      var walk = function (n, p) {
        if (isGroup(n))
          n.content.forEach(function (c, i) {
            walk(c, p.concat(i));
          });
        else if (isPanel(n)) out.push({ id: n.id, path: p });
      };
      if (obj.docked && typeof obj.docked === "object") walk(obj.docked, []);
      if (Array.isArray(obj.floating))
        obj.floating.forEach(function (f, i) {
          if (f && typeof f.id === "string") out.push({ id: f.id, floating: i });
        });
      return out;
    };
    var problemsOf = function (obj) {
      if (!obj) return ["the text is not valid JSON"];
      var out = [];
      if (!obj.docked || typeof obj.docked !== "object")
        out.push("it has no docked panels, so the IDE applies <DEFAULT> instead");
      if (has(obj, "floating") && !Array.isArray(obj.floating))
        out.push("its floating panels are not a list, so the IDE warns and shows none");
      var count = {};
      var odd = 0;
      var walk = function (n) {
        if (isGroup(n)) n.content.forEach(walk);
        else if (isPanel(n)) count[n.id] = (count[n.id] || 0) + 1;
        else odd++;
      };
      if (obj.docked && typeof obj.docked === "object") walk(obj.docked);
      if (Array.isArray(obj.floating))
        obj.floating.forEach(function (f) {
          if (f && typeof f.id === "string") count[f.id] = (count[f.id] || 0) + 1;
          else odd++;
        });
      if (out.length === 0 && !count.EDITOR) out.push("it has no Editor");
      Object.keys(count).forEach(function (id) {
        if (count[id] > 1) out.push((NAMES[id] || id) + " is in it " + count[id] + " times");
        if (!known(id) && !isAddin(id)) out.push('"' + id + '" is not a panel of the IDE');
      });
      if (odd) out.push(odd === 1 ? "an entry is neither a panel nor a group" : odd + " entries are neither panels nor groups");
      return out;
    };

    // ---- changes to a layout ----

    var newPanel = function (id, size) {
      return { id: id, variableSize: false, size: size };
    };
    // Takes the member at path out of its group. A group left with one member
    // is replaced by it, which takes the group's size; a group with no member
    // that takes the rest gives it to its last member.
    var takeOut = function (obj, path) {
      var gp = path.slice(0, -1);
      var g = at(obj, gp);
      var n = g.content.splice(path[path.length - 1], 1)[0];
      if (g.content.length && !g.content.some(function (c) {
        return c.variableSize;
      })) {
        var last = g.content[g.content.length - 1];
        last.variableSize = true;
        last.size = "0%";
      }
      if (g.content.length === 1 && gp.length) {
        var only = g.content[0];
        only.variableSize = g.variableSize;
        only.size = g.size;
        at(obj, gp.slice(0, -1)).content[gp[gp.length - 1]] = only;
      } else if (g.content.length === 0 && gp.length) {
        takeOut(obj, gp);
      }
      return n;
    };
    // Docks the panel id at a side of the member at path: into its group when
    // the direction matches, else into a new group round the two.
    var dockAt = function (obj, path, side, id) {
      var row = side === "left" || side === "right";
      var before = side === "left" || side === "top";
      var p = newPanel(id, "25%");
      if (!path.length && !isGroup(obj.docked)) {
        var one = obj.docked;
        obj.docked = { type: row ? "vertical" : "horizontal", variableSize: true, size: "0%", content: before ? [p, one] : [one, p] };
        one.variableSize = true;
        one.size = "0%";
        return;
      }
      if (!path.length) {
        var root = obj.docked;
        if (sideBySide(root) === row) root.content.splice(before ? 0 : root.content.length, 0, p);
        else {
          var inner = { type: root.type, variableSize: true, size: "0%", content: root.content };
          obj.docked = { type: row ? "vertical" : "horizontal", variableSize: root.variableSize, size: root.size, content: before ? [p, inner] : [inner, p] };
        }
        return;
      }
      var g = at(obj, path.slice(0, -1));
      var i = path[path.length - 1];
      var t = g.content[i];
      if (sideBySide(g) === row) {
        g.content.splice(before ? i : i + 1, 0, p);
      } else {
        var grp = { type: row ? "vertical" : "horizontal", variableSize: t.variableSize, size: t.size, content: before ? [p, t] : [t, p] };
        t.variableSize = true;
        t.size = "0%";
        g.content[i] = grp;
      }
    };
    var floatAt = function (obj, id, rect) {
      if (!Array.isArray(obj.floating)) obj.floating = [];
      var f = { id: id, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      obj.floating.push(f);
      return obj.floating.length - 1;
    };

    // ---- the editor ----

    var newSession = function (opts) {
      return { opts: opts, view: "picture", texts: {}, sel: null, placing: null, m: null };
    };
    var ideSize = function () {
      var b = document.body;
      return { w: Math.max(1, b.clientWidth), h: Math.max(1, b.clientHeight) };
    };
    var dockRect = function () {
      var r = document.getElementById("rootTop");
      var b = document.body.getBoundingClientRect();
      if (!r) return null;
      var q = r.getBoundingClientRect();
      if (!q.width || !q.height) return null;
      return { left: q.left - b.left, top: q.top - b.top, width: q.width, height: q.height };
    };

    var write = function (s, obj) {
      var m = s.m;
      var text = JSON.stringify(obj, null, "\t");
      m.area.value = text;
      s.texts[m.id] = text;
      m.area.dispatchEvent(new Event("input", { bubbles: true }));
      render(s);
    };
    var textOf = function (s, id) {
      if (s.m && s.m.id === id) return s.m.area.value;
      if (has(s.texts, id)) return s.texts[id];
      var e = has(builtInPanelLayouts, id) ? builtInPanelLayouts[id] : has(customPanelLayouts, id) ? customPanelLayouts[id] : null;
      if (!e) return null;
      try {
        return JSON.stringify({ docked: JSON.parse(e.layoutData), floating: e.floatingData ? JSON.parse(e.floatingData) : [] });
      } catch (err) {
        return "";
      }
    };

    var tileHtml = function (s, n, path) {
      var key = pathKey(path);
      var sel = s.sel && s.sel.kind === "node" && s.sel.key === key;
      var id = n.id;
      var cls = "tbLeTile";
      if (id === "EDITOR") cls += " tbLeEd";
      if (isAddin(id)) cls += " tbLeAddin";
      var gone = isAddin(id) ? !s.addins[id] : !known(id);
      if (gone) cls += " tbLeGone";
      if (sel) cls += " tbLeSel";
      var note = gone ? (isAddin(id) ? "not loaded" : "not a panel") : "";
      return (
        '<div class="' + cls + '" role="button" tabindex="0" data-act="select" data-key="' + key + '" aria-pressed="' + sel + '" style="flex:' +
        flexOf(n) + '" title="' + esc(id) + '"><span class="tbLeNm">' + esc(nameOf(s, id)) + '</span><span class="tbLeSz">' +
        (note ? esc(note) + " &middot; " : "") + esc(sizeLabel(n)) + "</span></div>"
      );
    };
    var flexOf = function (n) {
      if (n.size === "fit-content" && !n.variableSize) return "0 0 auto";
      return (n.variableSize ? "1 1 " : "0 0 ") + esc(n.size || "0%");
    };
    var treeHtml = function (s, n, path) {
      if (!isGroup(n)) return isPanel(n) ? tileHtml(s, n, path) : '<div class="tbLeTile tbLeGone" style="flex:' + flexOf(n) + '"><span class="tbLeSz">not a panel</span></div>';
      var key = pathKey(path);
      var sel = s.sel && s.sel.kind === "node" && s.sel.key === key;
      var h = '<div class="tbLeG ' + (sideBySide(n) ? "tbLeRow" : "tbLeCol") + (sel ? " tbLeSel" : "") + '" data-act="select" data-key="' + key + '" style="flex:' + (path.length ? flexOf(n) : "1 1 0%") + '">';
      n.content.forEach(function (c, i) {
        if (i) {
          var fixed = s.ro || (c && c.size === "fit-content") || (n.content[i - 1] && n.content[i - 1].size === "fit-content");
          h += '<div class="tbLeSplit' + (fixed ? " tbLeFixed" : "") + '" data-split="' + key + '" data-i="' + (i - 1) + '"></div>';
        }
        h += treeHtml(s, c, path.concat(i));
      });
      return h + "</div>";
    };
    var floatsHtml = function (s, obj, k) {
      if (!Array.isArray(obj.floating)) return "";
      var h = "";
      obj.floating.forEach(function (f, i) {
        if (!f || typeof f.id !== "string") return;
        var sel = s.sel && s.sel.kind === "float" && s.sel.i === i;
        var gone = isAddin(f.id) ? !s.addins[f.id] : !known(f.id);
        h +=
          '<div class="tbLeFloat' + (gone ? " tbLeGone" : "") + (sel ? " tbLeSel" : "") + '" data-act="selectfloat" data-i="' + i + '" style="left:' + Math.round((f.left || 0) * k) +
          "px;top:" + Math.round((f.top || 0) * k) + "px;width:" + Math.max(24, Math.round((f.width || 0) * k)) + "px;height:" + Math.max(18, Math.round((f.height || 0) * k)) +
          'px"><div class="tbLeFt" data-drag="' + i + '">' + esc(nameOf(s, f.id)) + '</div><div class="tbLeFb">' + (gone ? (isAddin(f.id) ? "not loaded<br>" : "not a panel<br>") : "") +
          esc(f.width) + " &times; " + esc(f.height) + "</div></div>";
      });
      return h;
    };

    var segHtml = function (act, value, choices, ro) {
      return (
        '<span class="tbLeSeg" role="group">' +
        choices
          .map(function (c) {
            return '<button class="tbLeSegBtn" data-act="' + act + '" data-v="' + c[0] + '" aria-pressed="' + (c[0] === value) + '"' + (ro ? " disabled" : "") + ">" + esc(c[1]) + "</button>";
          })
          .join("") +
        "</span>"
      );
    };
    var crumbsHtml = function (s, obj, path) {
      var out = [];
      for (var j = 0; j < path.length; j++) {
        var g = at(obj, path.slice(0, j));
        out.push('<a href="#" class="tbLeCrumb" data-act="select" data-key="' + pathKey(path.slice(0, j)) + '">' + (j ? "" : "Window: ") + (sideBySide(g) ? "side by side" : "one above another") + "</a>");
      }
      return out.join(" &rsaquo; ");
    };
    var inspHtml = function (s, obj) {
      var ro = s.ro;
      if (!s.sel) return '<div class="tbLeHead">Nothing selected</div><p class="tbLeMuted">Click a panel or a group in the picture to change it' + (ro ? "." : ", or a panel above to add it.") + "</p>";
      var h;
      var note = function (id) {
        if (isAddin(id))
          return s.addins[id] ? "" : '<div class="tbLeNote">No loaded add-in has this window. The IDE keeps its place, empty and marked <i>(currently unavailable)</i>, until the add-in opens it.</div>';
        return known(id) ? "" : '<div class="tbLeNote tbLeError">This is not a panel of the IDE: applying the layout shows an error.</div>';
      };
      if (s.sel.kind === "float") {
        var f = obj.floating[s.sel.i];
        h = '<div class="tbLeHead">' + esc(nameOf(s, f.id)) + " <code>" + esc(f.id) + "</code> <span class=tbLeMuted>floating</span></div>" + note(f.id);
        h += '<div class="tbLeLabel">Place in the IDE window, in pixels</div><div class="tbLeLine tbLeNums">';
        ["left", "top", "width", "height"].forEach(function (k) {
          h += '<label>' + k.charAt(0).toUpperCase() + k.slice(1) + ' <input class="tbLeNum" type="number" step="1" data-act="floatnum" data-k="' + k + '" value="' + esc(f[k]) + '"' + (ro ? " disabled" : "") + "></label>";
        });
        h += "</div>";
        if (!ro) h += '<div class="tbLeLine"><button class="tbLeBtn" data-act="dockfloat">Dock it...</button><button class="tbLeBtn" data-act="removefloat">Remove from this layout</button></div>';
        return h;
      }
      var path = pathOf(s.sel.key);
      var n = at(obj, path);
      var grp = isGroup(n);
      var root = !path.length;
      var par = root ? null : at(obj, path.slice(0, -1));
      if (grp) h = '<div class="tbLeHead">' + (root ? "The whole window" : "A group of " + n.content.length) + " <code>" + esc(n.type) + "</code></div>";
      else h = '<div class="tbLeHead">' + esc(nameOf(s, n.id)) + " <code>" + esc(n.id) + "</code></div>" + note(n.id);
      if (!root) h += '<div class="tbLeLabel">Where</div><div class="tbLeLine">' + crumbsHtml(s, obj, path) + "</div>";
      if (grp)
        h += '<div class="tbLeLabel">Its members are</div><div class="tbLeLine">' + segHtml("dir", n.type, [["vertical", "Side by side"], ["horizontal", "One above another"]], ro) + "</div>";
      if (!root) {
        var dim = sideBySide(par) ? "width" : "height";
        var k = sizeKind(n);
        h += '<div class="tbLeLabel">Its ' + dim + '</div><div class="tbLeLine">' + segHtml("size", k, [["rest", "The rest"], ["share", "A share"], ["fit", "To fit"]], ro) + "</div>";
        if (k === "share")
          h += '<div class="tbLeLine"><input class="tbLeNum" type="number" step="0.1" min="0" max="100" data-act="pct" value="' + esc(Math.round(parseFloat(n.size) * 10) / 10 || 0) + '"' + (ro ? " disabled" : "") + "> % of the group's " + dim + "</div>";
        if (!ro) {
          var i = path[path.length - 1];
          h += '<div class="tbLeLine"><button class="tbLeBtn" data-act="move" data-d="-1"' + (i === 0 ? " disabled" : "") + ">" + (sideBySide(par) ? "Move left" : "Move up") + "</button>";
          h += '<button class="tbLeBtn" data-act="move" data-d="1"' + (i === par.content.length - 1 ? " disabled" : "") + ">" + (sideBySide(par) ? "Move right" : "Move down") + "</button></div>";
          if (!grp) h += '<div class="tbLeLine"><button class="tbLeBtn" data-act="float">Make it float</button><button class="tbLeBtn" data-act="remove">Remove from this layout</button></div>';
        }
      }
      return h;
    };

    var barHtml = function (s, obj, free) {
      if (s.placing)
        return (
          '<span>Click near an edge of a panel to dock <b>' + esc(nameOf(s, s.placing.id)) + "</b> on that side.</span>" +
          (s.placing.from === undefined ? '<button class="tbLeBtn" data-act="placefloat">Make it float</button>' : "") +
          '<button class="tbLeBtn" data-act="placecancel">Cancel</button>'
        );
      var h = '<span class="tbLeMuted">' + (free.length ? "Not in this layout:" : "Every panel is in this layout.") + "</span>";
      free.forEach(function (id) {
        h +=
          '<button class="tbLeChip' + (isAddin(id) ? " tbLeChipAddin" : "") + '" data-act="place" data-id="' + esc(id) + '" title="' + esc(id) + '"' + (s.ro ? " disabled" : "") + ">" +
          esc(nameOf(s, id)) + (isAddin(id) ? " (add-in)" : "") + "</button>";
      });
      if (!s.ro) h += '<span class="tbLeGrow"></span><button class="tbLeBtn" data-act="current" title="Replace this layout with the panels as the IDE shows them now">Use the current arrangement</button>';
      return h;
    };

    var markEntries = function (s) {
      var m = s.m;
      if (!m || !m.node.isConnected) return;
      var outer = m.node.closest(".configEditorRoot");
      if (!outer) return;
      var entries = [];
      try {
        entries = s.opts.getEntries(m.ctl);
      } catch (err) {
        return;
      }
      var els = outer.querySelectorAll(".configEditorLHS .configEditorEntry");
      entries.forEach(function (en, i) {
        var el = els[i];
        if (!el) return;
        var mark = el.querySelector(".tbLeMark");
        var t = textOf(s, en.id);
        var p = t === null ? [] : problemsOf(parseLayout(t));
        if (!p.length) {
          if (mark) mark.remove();
          return;
        }
        if (!mark) {
          mark = document.createElement("span");
          mark.className = "tbLeMark";
          var txt = el.querySelector(".configEditorEntryText");
          if (txt) txt.appendChild(mark);
          else el.appendChild(mark);
        }
        mark.textContent = " !";
        mark.title = p.join("; ");
      });
    };

    var render = function (s) {
      var m = s.m;
      if (!m) return;
      s.addins = addinWindows();
      var obj = parseLayout(m.area.value);
      var picture = s.view === "picture" && !!obj && !!obj.docked && typeof obj.docked === "object";
      m.top.style.display = picture ? "" : "none";
      m.area.style.display = picture ? "none" : "";
      m.viewPic.setAttribute("aria-pressed", String(s.view === "picture"));
      m.viewJson.setAttribute("aria-pressed", String(s.view !== "picture"));
      if (picture && window.tbDocsTextFind && window.tbDocsTextFind.bar && m.node.contains(window.tbDocsTextFind.bar)) window.tbDocsTextFind.bar.remove();
      setTimeout(function () {
        markEntries(s);
      }, 0);
      var problems = problemsOf(obj);
      var state = m.readonly ? "A built-in layout: read-only. " : "";
      if (!picture) {
        var why = !obj ? "The text is not valid JSON, so the picture cannot show it. " : s.view === "picture" ? "The layout has no docked panels, so the picture cannot show it. " : "";
        m.status.innerHTML = esc(why + state) + (obj && problems.length ? '<span class="tbLeBad">' + esc(problemLine(problems)) + "</span>" : "");
        m.status.className = "tbLeStatus" + (why ? " tbLeBad" : "");
        s.obj = obj;
        return;
      }
      s.obj = obj;
      if (s.sel && s.sel.kind === "float" && !(Array.isArray(obj.floating) && obj.floating[s.sel.i])) s.sel = null;
      if (s.sel && s.sel.kind === "node") {
        try {
          if (!at(obj, pathOf(s.sel.key))) s.sel = null;
        } catch (err) {
          s.sel = null;
        }
      }
      var listed = {};
      panelsOf(obj).forEach(function (p) {
        listed[p.id] = true;
        if (p.id === "debug-console") listed["DEBUG CONSOLE"] = true;
      });
      var free = PANELS.map(function (p) {
        return p[0];
      })
        .concat(Object.keys(s.addins))
        .filter(function (id) {
          return !listed[id];
        });
      m.banner.style.display = m.readonly ? "" : "none";
      m.bar.innerHTML = barHtml(s, obj, free);
      // The IDE window: its size, the dock where rootTop is, and the floating
      // panels in its pixels.
      var size = ideSize();
      var dr = dockRect() || { left: 0, top: 0, width: size.w, height: size.h };
      m.pic.style.aspectRatio = size.w + " / " + size.h;
      var k = m.pic.clientWidth / size.w || 0;
      var dock = '<div class="tbLeDock" style="left:' + (dr.left / size.w) * 100 + "%;top:" + (dr.top / size.h) * 100 + "%;width:" + (dr.width / size.w) * 100 + "%;height:" + (dr.height / size.h) * 100 + '%">' + treeHtml(s, obj.docked, []) + "</div>";
      m.pic.className = "tbLePic" + (s.placing ? " tbLePlacing" : "");
      m.pic.innerHTML = '<div class="tbLeChrome" style="height:' + (dr.top / size.h) * 100 + '%"></div>' + dock + floatsHtml(s, obj, k);
      m.insp.innerHTML = inspHtml(s, obj);
      var docked = 0;
      var floating = 0;
      panelsOf(obj).forEach(function (p) {
        if (p.floating === undefined) docked++;
        else floating++;
      });
      m.status.className = "tbLeStatus";
      m.status.innerHTML =
        esc(state + docked + (docked === 1 ? " panel" : " panels") + " docked, " + floating + " floating, " + free.length + " not in this layout. ") +
        (problems.length ? '<span class="tbLeBad">' + esc(problemLine(problems)) + "</span>" : "");
    };
    var problemLine = function (p) {
      var s = p.join("; ");
      return (p.length === 1 ? "1 problem: " : p.length + " problems: ") + s.charAt(0).toUpperCase() + s.slice(1) + ".";
    };

    // What a click on an element with data-act does.
    var act = function (s, el, e) {
      var a = el.getAttribute("data-act");
      var obj = s.obj;
      if (!obj) return;
      if (e) e.preventDefault();
      if (a === "select") {
        if (s.placing) return;
        s.sel = { kind: "node", key: el.getAttribute("data-key") };
        return render(s);
      }
      if (a === "selectfloat") {
        if (s.placing) return;
        s.sel = { kind: "float", i: Number(el.getAttribute("data-i")) };
        return render(s);
      }
      if (a === "placecancel") {
        s.placing = null;
        return render(s);
      }
      if (s.ro) return;
      var n = s.sel && s.sel.kind === "node" ? at(obj, pathOf(s.sel.key)) : null;
      var path = s.sel && s.sel.kind === "node" ? pathOf(s.sel.key) : null;
      switch (a) {
        case "place":
          s.placing = { id: el.getAttribute("data-id") };
          return render(s);
        case "placefloat":
          s.sel = { kind: "float", i: floatAt(obj, s.placing.id, FLOAT_AT) };
          s.placing = null;
          return write(s, obj);
        case "current": {
          var cfg = getPanelsConfiguration();
          s.sel = null;
          return write(s, { docked: cfg.docked[0], floating: cfg.floating });
        }
        case "dir":
          n.type = el.getAttribute("data-v");
          return write(s, obj);
        case "size": {
          var v = el.getAttribute("data-v");
          if (v === "rest") {
            n.variableSize = true;
            n.size = "0%";
          } else if (v === "fit") {
            n.variableSize = false;
            n.size = "fit-content";
          } else if (sizeKind(n) !== "share") {
            n.variableSize = false;
            n.size = shareOf(s, path) + "%";
          }
          return write(s, obj);
        }
        case "move": {
          var g = at(obj, path.slice(0, -1));
          var i = path[path.length - 1];
          var j = i + Number(el.getAttribute("data-d"));
          if (j < 0 || j >= g.content.length) return;
          var t = g.content[i];
          g.content[i] = g.content[j];
          g.content[j] = t;
          path[path.length - 1] = j;
          s.sel = { kind: "node", key: pathKey(path) };
          return write(s, obj);
        }
        case "float": {
          var id = n.id;
          takeOut(obj, path);
          s.sel = { kind: "float", i: floatAt(obj, id, FLOAT_AT) };
          return write(s, obj);
        }
        case "remove":
          takeOut(obj, path);
          s.sel = null;
          return write(s, obj);
        case "dockfloat":
          s.placing = { id: obj.floating[s.sel.i].id, from: s.sel.i };
          return render(s);
        case "removefloat":
          obj.floating.splice(s.sel.i, 1);
          s.sel = null;
          return write(s, obj);
      }
    };
    // The share a member has now, in per cent of its group, for A share.
    var shareOf = function (s, path) {
      var m = s.m;
      var el = m.pic.querySelector('[data-key="' + pathKey(path) + '"]');
      var g = el && el.parentElement;
      if (!el || !g) return 25;
      var row = g.classList.contains("tbLeRow");
      var a = el.getBoundingClientRect();
      var b = g.getBoundingClientRect();
      var v = row ? a.width / b.width : a.height / b.height;
      return v > 0 && v < 1 ? Number((v * 100).toFixed(4)) : 25;
    };
    var change = function (s, el) {
      var a = el.getAttribute("data-act");
      var obj = s.obj;
      if (!obj || s.ro) return;
      if (a === "pct") {
        var v = parseFloat(el.value);
        if (isNaN(v)) return render(s);
        var n = at(obj, pathOf(s.sel.key));
        n.variableSize = false;
        n.size = Math.max(0, Math.min(100, v)).toFixed(4) + "%";
        return write(s, obj);
      }
      if (a === "floatnum") {
        var f = obj.floating[s.sel.i];
        var w = parseInt(el.value, 10);
        if (isNaN(w)) return render(s);
        f[el.getAttribute("data-k")] = w;
        return write(s, obj);
      }
    };

    // The side of a tile nearest the pointer, and its half shown.
    var sideAt = function (tile, e) {
      var r = tile.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      var d = { left: x, right: 1 - x, top: y, bottom: 1 - y };
      return Object.keys(d).sort(function (a, b) {
        return d[a] - d[b];
      })[0];
    };
    var showZone = function (s, tile, side) {
      var z = s.m.pic.querySelector(".tbLeZone");
      if (!tile) {
        if (z) z.remove();
        return;
      }
      if (!z || z.parentElement !== tile) {
        if (z) z.remove();
        z = document.createElement("div");
        z.className = "tbLeZone";
        tile.appendChild(z);
      }
      z.style.left = side === "right" ? "50%" : "0";
      z.style.top = side === "bottom" ? "50%" : "0";
      z.style.width = side === "left" || side === "right" ? "50%" : "100%";
      z.style.height = side === "top" || side === "bottom" ? "50%" : "100%";
    };
    var dropAt = function (s, tile, side) {
      var obj = s.obj;
      var p = s.placing;
      s.placing = null;
      var path = pathOf(tile.getAttribute("data-key"));
      if (p.from !== undefined) obj.floating.splice(p.from, 1);
      dockAt(obj, path, side, p.id);
      s.sel = null;
      write(s, obj);
    };

    // A splitter, dragged: the member before it takes the pointer's place, or
    // the one after it when the one before takes the rest.
    var dragSplit = function (s, sp, e) {
      var obj = s.obj;
      var g = at(obj, pathOf(sp.getAttribute("data-split")));
      var i = Number(sp.getAttribute("data-i"));
      var ge = sp.parentElement;
      var kids = Array.prototype.filter.call(ge.children, function (c) {
        return !c.classList.contains("tbLeSplit");
      });
      var row = ge.classList.contains("tbLeRow");
      var gr = ge.getBoundingClientRect();
      var total = row ? gr.width : gr.height;
      var ra = kids[i].getBoundingClientRect();
      var rb = kids[i + 1].getBoundingClientRect();
      var a = g.content[i];
      var b = g.content[i + 1];
      var moved = false;
      sp.setPointerCapture(e.pointerId);
      sp.classList.add("tbLeDrag");
      var pc = function (v) {
        return Math.max(2, Math.min(96, (v / total) * 100)).toFixed(4) + "%";
      };
      sp.onpointermove = function (ev) {
        var pos = row ? ev.clientX : ev.clientY;
        moved = true;
        if (!a.variableSize || b.variableSize) {
          a.size = pc(pos - (row ? ra.left : ra.top));
          a.variableSize = false;
        } else {
          b.size = pc((row ? rb.right : rb.bottom) - pos);
        }
        kids[i].style.flex = flexOf(a);
        kids[i + 1].style.flex = flexOf(b);
      };
      sp.onpointerup = sp.onpointercancel = function () {
        sp.onpointermove = sp.onpointerup = sp.onpointercancel = null;
        sp.classList.remove("tbLeDrag");
        if (moved) write(s, obj);
      };
    };
    var dragFloat = function (s, ft, e) {
      var obj = s.obj;
      var i = Number(ft.getAttribute("data-drag"));
      var f = obj.floating[i];
      var win = ft.parentElement;
      var k = s.m.pic.clientWidth / ideSize().w;
      var x0 = e.clientX;
      var y0 = e.clientY;
      var l0 = f.left || 0;
      var t0 = f.top || 0;
      var moved = false;
      ft.setPointerCapture(e.pointerId);
      ft.onpointermove = function (ev) {
        moved = true;
        f.left = Math.round(l0 + (ev.clientX - x0) / k);
        f.top = Math.round(t0 + (ev.clientY - y0) / k);
        win.style.left = Math.round(f.left * k) + "px";
        win.style.top = Math.round(f.top * k) + "px";
      };
      ft.onpointerup = ft.onpointercancel = function () {
        ft.onpointermove = ft.onpointerup = ft.onpointercancel = null;
        s.sel = { kind: "float", i: i };
        if (moved) write(s, obj);
        else render(s);
      };
    };

    // Puts the editor round the IDE's text area: the node returned in its
    // place holds the picture, the text area and the foot.
    var mount = function (s, ctl, area) {
      if (!area || area.tagName !== "TEXTAREA") return area;
      var node = document.createElement("div");
      node.className = "tbLe tbLeRoot";
      var top = document.createElement("div");
      top.className = "tbLeTop";
      top.innerHTML =
        '<div class="tbLeNote tbLeInfo tbLeBanner">A built-in layout cannot be changed. <b>Add New...</b> makes a copy of &lt;DEFAULT&gt; that you can change.</div>' +
        '<div class="tbLeBar"></div><div class="tbLeMain"><div class="tbLeLeft"><div class="tbLePic"></div>' +
        '<p class="tbLeMuted tbLeLegend">Drawn at the IDE window\'s proportions. Drag a splitter to resize, or a floating panel by its title. Click a panel to change it, or the gap round a group to change the group.</p></div>' +
        '<div class="tbLeInsp"></div></div>';
      var foot = document.createElement("div");
      foot.className = "tbLe tbLeFoot";
      foot.innerHTML =
        '<span class="tbLeSeg" role="group" aria-label="View"><button class="tbLeSegBtn" data-view="picture">Picture</button><button class="tbLeSegBtn" data-view="json">JSON</button></span>' +
        '<span class="tbLeStatus" aria-live="polite"></span>';
      node.appendChild(top);
      node.appendChild(area);
      node.appendChild(foot);
      var m = {
        node: node,
        ctl: ctl,
        id: ctl.selectedEntryId,
        area: area,
        readonly: area.hasAttribute("readonly"),
        top: top,
        banner: top.querySelector(".tbLeBanner"),
        bar: top.querySelector(".tbLeBar"),
        pic: top.querySelector(".tbLePic"),
        insp: top.querySelector(".tbLeInsp"),
        foot: foot,
        viewPic: foot.querySelector('[data-view="picture"]'),
        viewJson: foot.querySelector('[data-view="json"]'),
        status: foot.querySelector(".tbLeStatus"),
      };
      if (s.m && s.m.id !== m.id) s.sel = null;
      s.m = m;
      s.ro = m.readonly;
      s.placing = null;
      area.addEventListener("input", function (e) {
        if (!e.isTrusted) return;
        s.texts[m.id] = area.value;
        setTimeout(function () {
          markEntries(s);
        }, 0);
      });
      m.viewPic.addEventListener("click", function () {
        s.view = "picture";
        render(s);
      });
      m.viewJson.addEventListener("click", function () {
        s.view = "json";
        render(s);
      });
      top.addEventListener("click", function (e) {
        if (s.placing) {
          var tile = e.target.closest(".tbLeTile[data-key]");
          if (tile && m.pic.contains(tile)) return dropAt(s, tile, sideAt(tile, e));
        }
        var el = e.target.closest("[data-act]");
        if (!el || el.tagName === "INPUT") return;
        if (el.classList.contains("tbLeG") && e.target !== el) return;
        act(s, el, e);
      });
      top.addEventListener("change", function (e) {
        var el = e.target.closest("[data-act]");
        if (el) change(s, el);
      });
      m.pic.addEventListener("pointermove", function (e) {
        if (!s.placing) return;
        var tile = e.target.closest(".tbLeTile[data-key]");
        showZone(s, tile, tile ? sideAt(tile, e) : null);
      });
      m.pic.addEventListener("pointerleave", function () {
        showZone(s, null);
      });
      m.pic.addEventListener("pointerdown", function (e) {
        if (s.ro || s.placing || e.button !== 0) return;
        var sp = e.target.closest(".tbLeSplit:not(.tbLeFixed)");
        if (sp) {
          e.preventDefault();
          return dragSplit(s, sp, e);
        }
        var ft = e.target.closest("[data-drag]");
        if (ft) {
          e.preventDefault();
          return dragFloat(s, ft, e);
        }
      });
      // The dialog's own key handler (on its container) presses its focused
      // button on Enter, cancels the dialog on Esc outside a text box, and
      // keeps Tab and the arrow keys from moving the focus: none of it reaches
      // past the editor.
      var keys = function (e) {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          if (s.placing) s.placing = null;
          else if (s.sel) s.sel = null;
          else return;
          render(s);
          return;
        }
        var t = e.target;
        if ((e.key === "Enter" || e.key === " ") && t.getAttribute && t.getAttribute("role") === "button") {
          e.preventDefault();
          t.click();
        }
      };
      top.addEventListener("keydown", keys);
      foot.addEventListener("keydown", keys);
      mounts = mounts.filter(function (r) {
        return r.node.isConnected;
      });
      mounts.push({
        node: node,
        undo: function () {
          area.style.display = "";
          if (node.parentNode) node.parentNode.replaceChild(area, node);
          s.m = null;
        },
      });
      // The IDE puts the node into the dialog after this returns; the picture
      // has a width only then.
      render(s);
      setTimeout(function () {
        if (s.m === m) render(s);
      }, 0);
      return node;
    };

    // Changes the options of the one dialog.
    var adapt = function (opts) {
      var s = newSession(opts);
      var getNode = opts.getEntryEditorDomNode;
      var addNew = opts.addNewEntry;
      var del = opts.deleteEntry;
      opts.getEntryEditorDomNode = function (ctl) {
        var area = getNode.apply(this, arguments);
        if (!live) return area;
        try {
          return mount(s, ctl, area);
        } catch (err) {
          console.error(err);
          return area;
        }
      };
      opts.addNewEntry = function () {
        var r = addNew.apply(this, arguments);
        if (live)
          setTimeout(function () {
            markEntries(s);
          }, 0);
        return r;
      };
      opts.deleteEntry = function (ctl, id) {
        var r = del.apply(this, arguments);
        if (live) {
          delete s.texts[id];
          setTimeout(function () {
            markEntries(s);
          }, 0);
        }
        return r;
      };
    };
    hookOf().adapters[TITLE] = function (opts) {
      if (live) adapt(opts);
    };

    var style = document.getElementById("tbDocsLayoutEditorStyle");
    if (!style) {
      style = document.createElement("style");
      style.id = "tbDocsLayoutEditorStyle";
      document.head.appendChild(style);
    }
    // The look is the keyboard shortcut editor's (keyeditor.js), which is the
    // IDE's own: the dialog's buttons from the theme's variables, the rest
    // from the IDE Options and Project Settings dialogs. The pane is white in
    // every theme (styles.css, .configEditorRHS).
    var ACCENT = "#4271ae";
    var BTN =
      "background:var(--themeDialogButtonsBackColor,#fbfdff);color:var(--themeDialogButtonForeColor,#000);" +
      "border-top:var(--themeDialogButtonBorderTop,1px solid #9b9b9b);border-left:var(--themeDialogButtonBorderLeft,1px solid #9b9b9b);" +
      "border-right:var(--themeDialogButtonBorderRight,1px solid #5e5e5e);border-bottom:var(--themeDialogButtonBorderBottom,1px solid #5e5e5e);" +
      "border-radius:var(--themeDialogButtonBorderRadius,0);box-shadow:var(--themeDialogButtonBoxShadow,2px 2px 3px #7c7c7c78)";
    var FOCUS = "var(--themeDialogButtonFocusWidth,2px) solid var(--themeDialogButtonFocusRectColor,#6d6dc3)";
    var MONO = "font-family:Consolas,Menlo,monospace";
    style.textContent = [
      ".tbLe{color:#1e1e1e;font-size:inherit}",
      ".tbLeRoot{display:flex;flex-direction:column;width:100%;height:100%;min-height:0}",
      ".tbLeRoot>textarea{flex:1 1 auto;min-height:0}",
      ".tbLeTop{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:auto;background:#fff}",
      ".tbLeBar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px;border-bottom:1px solid rgba(128,128,128,.35)}",
      ".tbLeGrow{flex:1}",
      ".tbLeMuted{color:#5a5a5a}",
      ".tbLeBtn{box-sizing:border-box;height:26px;padding:0 10px;margin:0 2px 2px 0;font:inherit;cursor:pointer;white-space:nowrap;" + BTN + "}",
      ".tbLeBtn:hover:not(:disabled){background-color:#ebeff5;filter:brightness(1.3)}",
      ".tbLeBtn:disabled{opacity:.5;cursor:default;box-shadow:none}",
      ".tbLe .tbLeBtn:focus-visible{outline:" + FOCUS + ";outline-offset:2px}",
      ".tbLeChip{box-sizing:border-box;height:22px;padding:0 6px;border:1px solid #999;border-radius:3px;background:#f3f3f3;color:#1e1e1e;font-size:90%;" + MONO + ";cursor:pointer;white-space:nowrap}",
      ".tbLeChip:hover:not(:disabled){border-color:" + ACCENT + "}.tbLeChip:disabled{cursor:default}",
      ".tbLeChipAddin{background:rgba(66,113,174,.1)}",
      ".tbLe .tbLeChip:focus-visible{outline:" + FOCUS + ";outline-offset:1px}",
      ".tbLeSeg{display:inline-flex;flex-wrap:wrap;border:1px solid #999;border-radius:4px;overflow:hidden;background:#fff}",
      ".tbLeSegBtn{box-sizing:border-box;height:24px;padding:0 10px;margin:0;border:0;border-right:1px solid #999;border-radius:0;background:#fff;color:#1e1e1e;font:inherit;cursor:pointer;white-space:nowrap;user-select:none}",
      ".tbLeSegBtn:last-child{border-right:0}",
      ".tbLeSegBtn:hover:not(:disabled){background:rgba(128,128,128,.15)}",
      ".tbLeSegBtn[aria-pressed=true]{background:" + ACCENT + ";color:#fff}",
      ".tbLeSegBtn:disabled{cursor:default}.tbLeSegBtn:disabled:not([aria-pressed=true]){color:#888}",
      ".tbLe .tbLeSegBtn:focus-visible{outline:none;box-shadow:inset 0 0 0 2px var(--themeDialogButtonFocusRectColor,#6d6dc3),inset 0 0 0 3px #fff}",
      ".tbLeMain{display:flex;gap:10px;align-items:flex-start;padding:10px}",
      ".tbLeLeft{flex:1 1 auto;min-width:0}",
      ".tbLeLegend{margin:6px 0 0;font-size:90%}",
      // The picture: the IDE window, its title and menu bars, the dock and
      // the floating panels.
      ".tbLePic{position:relative;width:100%;border:1px solid #777;background:#cfd4da;overflow:hidden;user-select:none}",
      ".tbLeChrome{position:absolute;left:0;right:0;top:0;background:#8a8f96}",
      ".tbLeDock{position:absolute;display:flex}",
      ".tbLeG{display:flex;min-width:0;min-height:0;padding:2px;border:1px dashed transparent;box-sizing:border-box;cursor:pointer}",
      ".tbLeRow{flex-direction:row}.tbLeCol{flex-direction:column}",
      ".tbLeG.tbLeSel{border-color:" + ACCENT + ";background:rgba(66,113,174,.15)}",
      ".tbLeSplit{flex:0 0 4px;cursor:pointer}",
      ".tbLeRow>.tbLeSplit:not(.tbLeFixed){cursor:col-resize}.tbLeCol>.tbLeSplit:not(.tbLeFixed){cursor:row-resize}",
      ".tbLeSplit:not(.tbLeFixed):hover,.tbLeSplit.tbLeDrag{background:" + ACCENT + "}",
      ".tbLeFixed{flex-basis:2px;pointer-events:none}",
      ".tbLeTile{position:relative;box-sizing:border-box;min-width:14px;min-height:16px;background:#eef1f5;border:1px solid #9aa6b5;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;text-align:center;line-height:1.2;font-size:85%;padding:1px}",
      ".tbLeEd{background:#fff}",
      ".tbLeTile.tbLeSel{outline:2px solid " + ACCENT + ";outline-offset:-2px;background:#dbe6f5}",
      ".tbLeTile:focus-visible{outline:" + FOCUS + ";outline-offset:-2px}",
      ".tbLeNm{font-weight:600;overflow-wrap:anywhere}",
      ".tbLeAddin .tbLeNm::after{content:' (add-in)';font-weight:normal;color:#5a5a5a}",
      ".tbLeSz{color:#5a5a5a;font-size:90%}",
      ".tbLeGone{background:#f4f4f4;border-style:dashed;color:#777}",
      ".tbLePlacing .tbLeTile{cursor:copy}",
      ".tbLeZone{position:absolute;box-sizing:border-box;background:rgba(66,113,174,.35);border:2px solid " + ACCENT + ";pointer-events:none}",
      ".tbLeFloat{position:absolute;box-sizing:border-box;background:#fff;border:1px solid #666;box-shadow:2px 2px 4px rgba(0,0,0,.3);display:flex;flex-direction:column;font-size:85%;cursor:pointer}",
      ".tbLeFloat.tbLeSel{outline:2px solid " + ACCENT + "}",
      ".tbLeFloat.tbLeGone{border-style:dashed}",
      ".tbLeFt{background:#e3e3e3;padding:0 4px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:move}",
      ".tbLeFb{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;color:#5a5a5a;font-size:90%;overflow:hidden}",
      // The box beside it: the settings dialogs' section title and fields.
      ".tbLeInsp{flex:0 0 270px;box-sizing:border-box;padding:0 10px 10px;border:1px solid rgba(128,128,128,.45);border-radius:4px}",
      ".tbLeHead{margin:0 -10px 8px;padding:4px 8px;border-left:4px solid " + ACCENT + ";background:#f5f5f5;font-weight:600;overflow-wrap:anywhere}",
      ".tbLeHead code{" + MONO + ";font-weight:normal;color:#5a5a5a;font-size:90%}",
      ".tbLeLabel{font-weight:600;margin:8px 0 4px}",
      ".tbLeLine{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px}",
      ".tbLeNums label{display:inline-flex;gap:4px;align-items:center}",
      ".tbLe input.tbLeNum{box-sizing:border-box;width:5.5em;height:24px;padding:0 6px;border:1px solid #999;border-radius:4px;background:#fff;color:#1e1e1e;font:inherit;outline:none}",
      ".tbLe input.tbLeNum:focus{border-color:" + ACCENT + ";box-shadow:0 0 0 2px rgba(66,113,174,.25)}",
      ".tbLeCrumb{color:" + ACCENT + "}",
      ".tbLeNote{margin:6px 0;padding:6px 10px;border:1px dashed #b8860b;border-radius:4px;background:#fff3cd;color:#3d2e00;font-size:95%}",
      ".tbLeInfo{border:1px solid rgba(128,128,128,.35);background:rgba(128,128,128,.08);color:#1e1e1e}",
      ".tbLeTop>.tbLeBanner{margin:8px 8px 0}",
      ".tbLeError{border:0;background:#c62828;color:#fff}",
      // The foot: the grey of the IDE's own Edit as JSON bar.
      ".tbLeFoot{display:flex;gap:10px;align-items:center;padding:6px 8px;background:#b5b5b5}",
      ".tbLeStatus{color:#1e1e1e}.tbLeBad{color:#8e1c1c;font-weight:bold}",
      ".tbLeMark{color:#c62828;font-weight:bold}",
    ].join("\n");

    window.tbDocsLayoutEditor = {
      off: function () {
        live = false;
        unhook(TITLE);
        mounts.forEach(function (r) {
          if (r.node.isConnected) r.undo();
        });
        mounts = [];
        var st = document.getElementById("tbDocsLayoutEditorStyle");
        if (st) st.remove();
        Array.prototype.forEach.call(document.querySelectorAll(".tbLeMark"), function (e) {
          e.remove();
        });
      },
    };
  })();
}
