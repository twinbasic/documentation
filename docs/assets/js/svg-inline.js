(function () {
  var zoomTrigger = null;

  // ---- Font embedding for exports -------------------------------------
  //
  // A diagram on the page is inline SVG, so it inherits the document's
  // @font-face rules and draws in Inter like everything around it. An
  // *exported* copy does not: an SVG handed to `new Image()` renders in
  // "secure static mode", where no external resource -- including a font --
  // is fetched, and a downloaded .svg opened elsewhere has no access to this
  // site's stylesheet either. Both fall back to whatever the viewer has
  // installed, which on a machine without Inter means the export does not
  // match the page it came from.
  //
  // Measured on a machine with no local Inter: an exported PNG asking for
  // `font-family="Inter"` rasterised pixel-identical to one asking for a
  // font that does not exist.
  //
  // The fix is to carry the face inside the exported file, as a data: URI in
  // an inline @font-face. A data: URI is not an external fetch, so secure
  // static mode permits it. The bytes come from the HTTP cache -- the page
  // has already downloaded them -- so this costs no network and ~25 ms:
  // ~5 ms to re-read the woff2 from cache, ~2 ms to base64 it, the rest in
  // rasterisation. Encoded size is ~203 KB per face.
  //
  // Paths are resolved against this script's own URL rather than hard-coded,
  // which is what makes them survive the offline mirror and a --baseurl
  // deployment without the build having to rewrite anything here.
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";

  var FONT_FILES = {
    "Inter": {
      weight: "100 900",
      normal: "../fonts/inter-variable.woff2",
      italic: "../fonts/inter-variable-italic.woff2"
    },
    "Cascadia Mono": {
      weight: "200 700",
      normal: "../fonts/cascadia-mono-variable.woff2",
      italic: "../fonts/cascadia-mono-variable-italic.woff2"
    }
  };

  // rel -> Promise<base64 string | null>. Null means "could not read it";
  // the caller then exports without the face rather than failing. That is
  // the normal path in the offline mirror, where fetch() cannot read a
  // file:// URL at all.
  var fontCache = {};

  function fontData(rel) {
    if (fontCache[rel]) return fontCache[rel];
    var url;
    try { url = new URL(rel, SCRIPT_SRC).href; } catch (_e) { url = null; }
    if (!url) return (fontCache[rel] = Promise.resolve(null));
    fontCache[rel] = fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status + " " + r.statusText);
      return r.arrayBuffer();
    }).then(function (buf) {
      var u8 = new Uint8Array(buf), bin = "";
      // Chunked: String.fromCharCode.apply blows the argument limit on a
      // 150 KB array in one call.
      for (var i = 0; i < u8.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      }
      return btoa(bin);
    }).catch(function (err) {
      console.warn("svg-inline: could not embed " + rel + " in the export (" +
        err.message + "); it will use the viewer's fonts instead.");
      return null;
    });
    return fontCache[rel];
  }

  // Which faces does this diagram actually paint with? Read from the live
  // element's computed styles rather than guessed from the markup, so a
  // family inherited from the page counts and one that is merely named in an
  // unused rule does not. Italic is checked separately because it is a
  // second 200 KB and only the two Monaco diagrams use it.
  function facesUsedBy(svg) {
    var wanted = {};
    var nodes = svg.querySelectorAll("*");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], hasText = false;
      for (var j = 0; j < el.childNodes.length; j++) {
        if (el.childNodes[j].nodeType === 3 && el.childNodes[j].nodeValue.trim()) hasText = true;
      }
      if (!hasText) continue;
      var cs = getComputedStyle(el);
      var first = cs.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
      if (!FONT_FILES[first]) continue;
      var style = cs.fontStyle === "italic" || cs.fontStyle === "oblique" ? "italic" : "normal";
      wanted[first + "|" + style] = true;
    }
    return Object.keys(wanted);
  }

  // Serialize a diagram with the faces it uses carried inside it.
  // Falls back to a plain serialization if the bytes cannot be read.
  function serializeWithFonts(svg) {
    var keys = facesUsedBy(svg);
    return Promise.all(keys.map(function (k) {
      var parts = k.split("|"), family = parts[0], style = parts[1];
      return fontData(FONT_FILES[family][style]).then(function (b64) {
        if (!b64) return "";
        return '@font-face{font-family:"' + family + '";font-style:' + style +
          ";font-weight:" + FONT_FILES[family].weight +
          ";src:url(data:font/woff2;base64," + b64 + ') format("woff2")}';
      });
    })).then(function (faces) {
      var css = faces.join("");
      var clone = svg.cloneNode(true);
      if (css) {
        var style = document.createElementNS("http://www.w3.org/2000/svg", "style");
        style.textContent = css;
        clone.insertBefore(style, clone.firstChild);
      }
      return new XMLSerializer().serializeToString(clone);
    });
  }

  function zoomIn(container) {
    var svg = container.querySelector("svg");
    var bg = getComputedStyle(document.body).backgroundColor;
    Object.assign(container.style, {
      position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
      zIndex: "9999", background: bg, padding: "1rem", boxSizing: "border-box",
      overflow: "auto", cursor: "zoom-out"
    });
    if (svg) svg.style.maxWidth = "100%";
    container.dataset.zoomed = "1";
    container.scrollTop = 0;

    // Insert a visible close button
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "svg-zoom-close";
    closeBtn.setAttribute("aria-label", "Close zoom");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
      position: "fixed", top: "0.5rem", right: "0.5rem", zIndex: "10000",
      fontSize: "1.5rem", lineHeight: "1", padding: "0.25rem 0.5rem",
      background: "rgba(0,0,0,0.5)", color: "#fff", border: "none",
      borderRadius: "4px", cursor: "pointer"
    });
    container.appendChild(closeBtn);
    closeBtn.focus();

    // Trap focus within the zoomed overlay
    container.addEventListener("keydown", trapFocus);
  }

  function zoomOut(container) {
    container.removeEventListener("keydown", trapFocus);
    var closeBtn = container.querySelector(".svg-zoom-close");
    if (closeBtn) closeBtn.remove();
    container.removeAttribute("style");
    container.style.cursor = "zoom-in";
    var svg = container.querySelector("svg");
    if (svg) svg.style.maxWidth = "";
    delete container.dataset.zoomed;

    if (zoomTrigger) {
      zoomTrigger.focus();
      zoomTrigger = null;
    }
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    var container = e.currentTarget;
    var focusable = container.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // Click on .svg-container (not on controls) toggles zoom
  document.addEventListener("click", function (e) {
    var container = e.target.closest(".svg-container");
    if (!container) return;
    if (e.target.closest(".svg-controls")) return;
    if (e.target.closest(".svg-zoom-close")) {
      e.preventDefault();
      zoomOut(container);
      return;
    }
    e.preventDefault();
    if (container.dataset.zoomed) {
      zoomOut(container);
    } else {
      zoomTrigger = e.target;
      zoomIn(container);
    }
  });

  // Zoom button in controls bar
  document.addEventListener("click", function (e) {
    var btn = e.target.closest('.svg-controls button[data-action="zoom-svg"]');
    if (!btn) return;
    e.preventDefault();
    var wrap = btn.closest(".svg-inline-wrap");
    var container = wrap && wrap.querySelector(".svg-container");
    if (!container) return;
    if (container.dataset.zoomed) {
      zoomOut(container);
    } else {
      zoomTrigger = btn;
      zoomIn(container);
    }
  });

  // Escape closes zoom
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var zoomed = document.querySelector(".svg-container[data-zoomed]");
    if (!zoomed) return;
    zoomOut(zoomed);
  }, { capture: true });

  // SVG action buttons (download/copy)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".svg-controls button[data-action]");
    if (!btn) return;
    var action = btn.dataset.action;
    if (action === "zoom-svg") return;
    e.preventDefault();
    var wrap = btn.closest(".svg-inline-wrap");
    var svg = wrap && wrap.querySelector(".svg-container > svg");
    if (!svg) return;
    var filename = btn.dataset.filename || "diagram";

    // Every branch goes through serializeWithFonts, so a copied or
    // downloaded diagram carries its own typeface. copy-svg used
    // svg.outerHTML and download-svg used XMLSerializer; they are one path
    // now, which also means the two buttons can no longer drift apart.
    //
    // The catch degrades to a plain serialization rather than dropping the
    // click: an export in the wrong font is worth having, an export that
    // silently does not happen is not. (fontData already swallows its own
    // failures, so this only fires on something unforeseen.)
    serializeWithFonts(svg).catch(function (err) {
      console.warn("svg-inline: embedding fonts failed (" + err.message +
        "); exporting without them.");
      return new XMLSerializer().serializeToString(svg);
    }).then(function (data) {
      if (action === "download-svg") {
        triggerDownload(new Blob([data], { type: "image/svg+xml;charset=utf-8" }),
          filename + ".svg");
      } else if (action === "copy-svg") {
        navigator.clipboard.writeText(data).catch(function (err) {
          exportFailed("SVG copy", "the clipboard refused the write (" + err.message + ").");
        });
      } else if (action === "download-png" || action === "copy-png") {
        rasterise(svg, data, action, filename);
      }
    });
  });

  // SVG -> PNG via an offscreen canvas.
  //
  // This cannot render every diagram, and the failure is worth handling
  // rather than leaving as an uncaught throw. Chromium taints a canvas that
  // has had an SVG containing <foreignObject> drawn into it, and a tainted
  // canvas refuses toBlob() with a SecurityError. Every diagram is Graphviz
  // DOT now, which emits plain <text>, so all of them rasterise -- but a
  // hand-authored SVG could reintroduce a foreignObject, and the throw lands
  // inside an onload handler where nothing surfaces it and the click simply
  // appears to do nothing. Say so instead.
  function rasterise(svg, data, action, filename) {
    var url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
    var img = new Image();
    img.onerror = function () {
      URL.revokeObjectURL(url);
      exportFailed("PNG export", "the diagram could not be rendered as an image.");
    };
    img.onload = function () {
      var vb = svg.viewBox.baseVal;
      var w = 2048, h = Math.round(vb.height * (w / vb.width));
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try {
        c.toBlob(function (b) {
          if (!b) return exportFailed("PNG export", "the image could not be encoded.");
          if (action === "download-png") return triggerDownload(b, filename + ".png");
          // The clipboard can refuse this -- an unfocused document and a
          // denied permission both reject here -- and the rejection used to
          // go nowhere, so the click looked like it had worked. Say so, the
          // same way the SVG copy branch does.
          navigator.clipboard.write([new ClipboardItem({ "image/png": b })])
            .catch(function (err) {
              exportFailed("PNG copy", "the clipboard refused the write (" + err.message + ").");
            });
        }, "image/png");
      } catch (err) {
        exportFailed("PNG export", err && err.name === "SecurityError"
          ? "this diagram uses embedded HTML labels, which the browser will not " +
            "let a page read back out of a canvas. Use Download SVG instead."
          : "the image could not be encoded (" + (err && err.message) + ").");
      }
    };
    img.src = url;
  }

  function exportFailed(what, why) {
    console.warn("svg-inline: " + what + " failed -- " + why);
    var el = document.getElementById("svg-export-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "svg-export-status";
      el.className = "sr-only";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    // Cleared first so an identical repeat message is still announced.
    el.textContent = "";
    setTimeout(function () { el.textContent = what + " failed: " + why; }, 50);
  }

  function triggerDownload(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
})();
