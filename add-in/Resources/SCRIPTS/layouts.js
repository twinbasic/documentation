// Tells the help add-in which panel layout the IDE applied or saved, so that it can keep, for
// each layout, where the help is: in its pane or in its own window, and where that window is on
// the screen. The add-in keeps that itself, by layout name, never in the layout's JSON, which
// the IDE builds again from the window at every save. Window > Panel Layouts and its commands
// apply a layout with setActivePanelLayoutName, and Save Current Layout As saves one with
// saveCurrentPanelLayoutAs: both are wrapped here. Save Changes in Manage Panel Layouts sends
// the records edited in the dialog (the panel layout editor's With the Help Add-In box) and the
// names of the layouts that remain, through the one replacement of showConfigEditor the
// add-in's scripts share (see hookOf).
//
// Applying a layout closes every add-in's tool window, and the add-in makes its pane again,
// which runs this script again: a message waits until the pane it would be sent through is the
// IDE's again (stale), and the new run sends what the old one held. The add-in gives the page
// what it keeps in place of the marker below, and later through update(): the pane's id, the
// dots per inch of its pixels, where the help is now, and the record of each layout, by its
// name as enc() writes it.
var sink = this.parentNode;
var state = $STATE$;
var held = [];
var old = window.tbDocsHelpLayouts;
if (old) {
  try {
    held = old.off() || [];
  } catch (err) {
    console.error(err);
  }
  window.tbDocsHelpLayouts = null;
}
if (
  typeof setActivePanelLayoutName === "function" &&
  typeof saveCurrentPanelLayoutAs === "function" &&
  typeof showConfigEditor === "function" &&
  typeof customPanelLayouts === "object"
) {
  (function () {
    var TITLE = "Manage Panel Layouts";
    // This script's adapter for the dialog, beside the panel layout editor's (hookOf).
    var KEY = TITLE + "|help";
    var has = function (o, k) {
      return Object.prototype.hasOwnProperty.call(o, k);
    };
    var apply = setActivePanelLayoutName.tbDocsOriginal || setActivePanelLayoutName;
    var save = saveCurrentPanelLayoutAs.tbDocsOriginal || saveCurrentPanelLayoutAs;
    var pending = held.slice();
    var timer = null;
    var live = true;

    // ---- the one replacement of showConfigEditor ----
    // Each script of the add-in that changes a dialog of showConfigEditor puts its adapter
    // here under the dialog's title, or the title, "|" and a name of its own; the replacement
    // calls every adapter for the dialog's title, then the IDE's function. keyeditor.js and
    // layouteditor.js have the same two functions.
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
    var unhook = function (key) {
      var h = window.tbDocsConfigEditors;
      if (!h) return;
      delete h.adapters[key];
      if (Object.keys(h.adapters).length) return;
      if (window.showConfigEditor === h.dispatch) window.showConfigEditor = h.original;
      window.tbDocsConfigEditors = null;
    };

    // A layout's name as the add-in keeps it: a settings section of its own, so nothing but
    // letters, digits and %, - and _ (a name may hold \, which would make a key of the
    // registry inside another).
    var enc = function (name) {
      return encodeURIComponent(String(name)).replace(/[!'()*~.]/g, function (c) {
        return "%" + c.charCodeAt(0).toString(16).toUpperCase();
      });
    };
    // Whether the pane this run's messages go through is gone: closed with every add-in's tool
    // window when a layout is applied, before the add-in makes it again. A sink outside any
    // tool window (the tests' own) is gone only once it leaves the page.
    var stale = function () {
      if (!sink.isConnected) return true;
      var root = sink.getRootNode ? sink.getRootNode() : null;
      var host = root && root.host;
      if (!host || typeof host.persistenceId !== "string") return false;
      return typeof toolWindowsById !== "object" || toolWindowsById[host.persistenceId] !== host;
    };
    var flush = function () {
      timer = null;
      if (!live || stale()) return;
      while (pending.length) {
        var m = pending.shift();
        try {
          sink.tbDocsLayout(m);
        } catch (err) {
          console.error(err);
        }
      }
    };
    // Sends a message once the code that asked for it has returned; with first, before any
    // that wait.
    var send = function (verb, layout, value, first) {
      var m = { verb: verb, layout: layout || "", value: value || "" };
      if (first) pending.unshift(m);
      else pending.push(m);
      if (!timer) timer = setTimeout(flush, 0);
    };

    // BETA 1042: applying a layout closes every add-in's tool window (closeAllAddinToolwindows),
    // so that each add-in makes its window again, but only after it has taken a floating window
    // that shows out of the page as a built-in panel (removeAllFloatingPanels) and the dock out
    // of the page (restorePanelLayout). Closing such a window then throws inside
    // toolWindowClose, which swallows the error: the add-in never hears of it and never makes
    // it again, and the help's pane is gone until the compiler restarts. A hidden floating
    // window is closed as it should be. Every add-in's window is closed here first, while all
    // are in the page, as closeAllAddinToolwindows closes them, as long as a build's
    // setActivePanelLayoutName still starts by removing the floating panels.
    var closesLate = /removeAllFloatingPanels\(\)/.test(String(apply)) && typeof addInEvents === "object";
    var closeAddinWindows = function () {
      if (!closesLate || typeof toolWindowsById !== "object") return;
      Object.keys(toolWindowsById).forEach(function (k) {
        try {
          var w = toolWindowsById[k];
          if (w && w.shadowDom && w.shadowDom.host && w.shadowDom.host.isConnected) addInEvents.toolWindowClose({ id: w.toolWindowId });
        } catch (err) {
          console.error(err);
        }
      });
    };
    // An add-in's window that a layout floats is put at the layout's place, but showing it later
    // (the help's pane once it is attached) gives it its add-in's suggested size, unless the IDE
    // has a place for it in floatingToolWindowsData, which it writes when the window is moved or
    // resized by hand. The layout's place is written there, as if it had been.
    var keepFloatingPlaces = function (name) {
      if (typeof floatingToolWindowsData !== "object" || !floatingToolWindowsData) return;
      var e = has(builtInPanelLayouts, name) ? builtInPanelLayouts[name] : has(customPanelLayouts, name) ? customPanelLayouts[name] : null;
      var list = [];
      try {
        list = e && e.floatingData ? JSON.parse(e.floatingData) : [];
      } catch (err) {
        return;
      }
      if (!Array.isArray(list)) return;
      list.forEach(function (f) {
        if (!f || typeof f.id !== "string" || f.id.indexOf("ADDIN_") !== 0 || f.id.length === 6) return;
        if (!(f.width > 0 && f.height > 0)) return;
        floatingToolWindowsData[f.id.slice(6)] = { left: f.left | 0, top: f.top | 0, width: f.width | 0, height: f.height | 0 };
      });
    };
    var applied = function (name) {
      if (live) closeAddinWindows();
      var r = apply.apply(this, arguments);
      if (live) keepFloatingPlaces(name);
      if (live) send("applied", enc(name));
      return r;
    };
    applied.tbDocsOriginal = apply;
    var saved = function (name) {
      var r = save.apply(this, arguments);
      if (live) send("saved", enc(name));
      return r;
    };
    saved.tbDocsOriginal = save;
    window.setActivePanelLayoutName = applied;
    window.saveCurrentPanelLayoutAs = saved;

    var api = {
      // The help pane's id in a layout.
      pane: String(state.pane || ""),
      // The dots per inch of the pixels the add-in keeps a window's place in: the display's
      // (the compiler's process is aware of its scaling), 96 at 100%.
      dpi: Number(state.dpi) || 96,
      // Where the help is now: detached or not, and the window's place in screen pixels
      // (width 0 when it has none yet).
      now: state.now || null,
      // Each layout's record, by enc(name): { detached, left, top, width, height }.
      records: state.records || {},
      enc: enc,
      // The records changed in Manage Panel Layouts, by enc(name), while it is open; kept
      // only at Save Changes.
      dialog: null,
      // Called after update(); the panel layout editor draws its picture again.
      onUpdate: null,
      update: function (st) {
        if (!st || typeof st !== "object") return;
        if (st.pane) api.pane = String(st.pane);
        if (st.dpi) api.dpi = Number(st.dpi) || 96;
        api.now = st.now || null;
        api.records = st.records || {};
        if (typeof api.onUpdate === "function") {
          try {
            api.onUpdate();
          } catch (err) {
            console.error(err);
          }
        }
      },
      // A layout's record: the dialog's change, else the add-in's; null when it has none.
      record: function (name) {
        var k = enc(name);
        if (api.dialog && has(api.dialog.edits, k)) return api.dialog.edits[k];
        return has(api.records, k) ? api.records[k] : null;
      },
      // Changes a layout's record in the open dialog.
      edit: function (name, rec) {
        if (api.dialog) api.dialog.edits[enc(name)] = rec;
      },
      // Takes out what this run put in, and returns the messages it still holds.
      off: function () {
        live = false;
        if (timer) clearTimeout(timer);
        timer = null;
        if (window.setActivePanelLayoutName === applied) window.setActivePanelLayoutName = apply;
        if (window.saveCurrentPanelLayoutAs === saved) window.saveCurrentPanelLayoutAs = save;
        unhook(KEY);
        var rest = pending;
        pending = [];
        return rest;
      },
    };

    // The dialog: the add-in is asked where the help is now, for the editor's box, and Save
    // Changes sends the records changed in it and the names of the layouts it keeps. The IDE's
    // Save Changes applies the active layout again, which this run sends after them.
    hookOf().adapters[KEY] = function (opts) {
      if (!live) return;
      var dialog = { edits: {} };
      api.dialog = dialog;
      send("ask");
      var saveChanges = opts.saveChanges;
      if (typeof saveChanges !== "function") return;
      opts.saveChanges = function () {
        var r = saveChanges.apply(this, arguments);
        if (!live) return r;
        var keep = Object.keys(customPanelLayouts).map(enc);
        var lines = ["keep " + keep.join(" ")];
        Object.keys(dialog.edits).forEach(function (k) {
          var e = dialog.edits[k];
          if (keep.indexOf(k) < 0 || !e) return;
          lines.push(["set", k, e.detached ? 1 : 0, e.left | 0, e.top | 0, e.width | 0, e.height | 0].join(" "));
        });
        send("records", "", lines.join("\n"), true);
        if (api.dialog === dialog) api.dialog = null;
        return r;
      };
    };

    window.tbDocsHelpLayouts = api;
    if (pending.length) timer = setTimeout(flush, 0);
  })();
}
