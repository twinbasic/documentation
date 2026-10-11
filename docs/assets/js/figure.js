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
    Inter: {
      weight: "100 900",
      normal: "../fonts/inter-variable.woff2",
      italic: "../fonts/inter-variable-italic.woff2",
    },
    "Cascadia Mono": {
      weight: "200 700",
      normal: "../fonts/cascadia-mono-variable.woff2",
      italic: "../fonts/cascadia-mono-variable-italic.woff2",
    },
  };

  // rel -> Promise<base64 string | null>. Null means "could not read it";
  // the caller then exports without the face rather than failing. That is
  // the normal path in the offline mirror, where fetch() cannot read a
  // file:// URL at all.
  var fontCache = {};

  function fontData(rel) {
    if (fontCache[rel]) return fontCache[rel];
    var url;
    try {
      url = new URL(rel, SCRIPT_SRC).href;
    } catch (_e) {
      url = null;
    }
    if (!url) return (fontCache[rel] = Promise.resolve(null));
    fontCache[rel] = fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status + " " + r.statusText);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        var u8 = new Uint8Array(buf),
          bin = "";
        // Chunked: String.fromCharCode.apply blows the argument limit on a
        // 150 KB array in one call.
        for (var i = 0; i < u8.length; i += 0x8000) {
          bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        }
        return btoa(bin);
      })
      .catch(function (err) {
        console.warn(
          "figure: could not embed " +
            rel +
            " in the export (" +
            err.message +
            "); it will use the viewer's fonts instead."
        );
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
      var el = nodes[i],
        hasText = false;
      for (var j = 0; j < el.childNodes.length; j++) {
        if (el.childNodes[j].nodeType === 3 && el.childNodes[j].nodeValue.trim()) hasText = true;
      }
      if (!hasText) continue;
      var cs = getComputedStyle(el);
      var first = cs.fontFamily
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "");
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
    return Promise.all(
      keys.map(function (k) {
        var parts = k.split("|"),
          family = parts[0],
          style = parts[1];
        return fontData(FONT_FILES[family][style]).then(function (b64) {
          if (!b64) return "";
          return (
            '@font-face{font-family:"' +
            family +
            '";font-style:' +
            style +
            ";font-weight:" +
            FONT_FILES[family].weight +
            ";src:url(data:font/woff2;base64," +
            b64 +
            ') format("woff2")}'
          );
        });
      })
    ).then(function (faces) {
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

  // ---- Figures --------------------------------------------------------
  //
  // A figure (builder/render.mjs, figurePlugin) is a .fig-wrap holding a
  // .fig-controls bar and a .fig-container. A diagram's container holds its
  // SVG inline; a picture's holds one <img>, or two for a picture in two
  // themes, of which the stylesheet shows one. Every action works on what the
  // reader sees: the inline SVG, or the <img> the theme shows.

  // Opened from disk (the offline copy), a page can neither read a file to
  // put on the clipboard -- fetch() refuses a file:// URL, and a canvas an
  // image from disk was drawn on refuses to be read back -- nor download one:
  // the browser ignores `download` on a file:// link and opens the image in
  // place of the page.
  var FROM_DISK = location.protocol === "file:";

  var SVG_URL = /\.svg(?=[?#]|$)/i;

  // The <img> of a picture's figure that the theme shows.
  function shownImage(wrap) {
    var imgs = wrap.querySelectorAll(".fig-container > img");
    for (var i = 0; i < imgs.length; i++) {
      if (getComputedStyle(imgs[i]).display !== "none") return imgs[i];
    }
    return imgs[0] || null;
  }

  // What a picture's figure offers: its SVG when it is shown as one, and the
  // raster beside it (the PNG a picture's SVG was drawn with), or the image
  // itself when it is a raster.
  function sources(wrap) {
    var img = shownImage(wrap);
    if (!img) return null;
    var src = img.src;
    var svg = SVG_URL.test(src) ? src : null;
    return { img: img, svg: svg, raster: svg ? src.replace(SVG_URL, ".png") : src };
  }

  function fileName(url) {
    var path = new URL(url, location.href).pathname;
    return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1));
  }

  // Each bar offers only what works where the page is read. The offline copy
  // shows a picture's PNG in place of its SVG, so its vector group goes; read
  // from disk, a picture keeps only Zoom. (A diagram's actions work on its
  // inline SVG and need no file, so they all stay.)
  function prepareBars() {
    var wraps = document.querySelectorAll('.fig-wrap[data-kind="picture"]');
    for (var i = 0; i < wraps.length; i++) {
      var s = sources(wraps[i]);
      var groups = wraps[i].querySelectorAll(".fig-group[data-format]");
      for (var j = 0; j < groups.length; j++) {
        var vector = groups[j].dataset.format === "vector";
        if (FROM_DISK || (vector && s && !s.svg)) groups[j].hidden = true;
      }
    }
  }
  prepareBars();

  // ---- Zoom -------------------------------------------------------------
  //
  // The container itself becomes the overlay; the stylesheet lays it out
  // (custom.scss, `.fig-container[data-zoomed]`). Only the background is set
  // here, the body's, so the overlay matches the theme the page is in.

  // The element a zoom enlarges: a diagram's SVG, or the <img> the theme shows.
  function zoomed(container) {
    return container.querySelector(":scope > svg") || shownImage(container.closest(".fig-wrap"));
  }

  // Zoom shows a figure at twice its size on the page, as far as the window's
  // width allows, and never smaller than on the page. Twice is what a
  // screenshot was taken at: its SVG is drawn at the page's size and its PNG
  // at twice that, so a zoomed screenshot is the PNG's pixels exactly. A
  // raster is never stretched past its own pixels. Only the width is fitted:
  // a figure taller than the window scrolls, as it would in an image viewer,
  // rather than shrinking to fit and losing the detail zoom is for -- unless
  // it is at most a tenth taller than the window, when it is fitted to the
  // height instead, rather than scrolling a few pixels.
  var NEAR_FIT = 1.1;

  function zoomWidth(el, shown, ratio, container) {
    var target = 2 * shown;
    if (el.tagName === "IMG" && !SVG_URL.test(el.src) && el.naturalWidth) {
      target = Math.min(target, el.naturalWidth);
    }
    var cs = getComputedStyle(container);
    var roomW = container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var roomH = container.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var width = Math.min(target, roomW);
    var height = width * ratio;
    if (height > roomH && height <= roomH * NEAR_FIT) width = roomH / ratio;
    return Math.max(shown, width);
  }

  // While a figure is zoomed the page under it does not scroll: the overlay
  // covers it, and a scrollbar of its own beside the overlay's would be a
  // second one for nothing. The page's scroll position is kept, and put back
  // once the zoom ends, in case the page reflowed without its scrollbar.
  var pageScroll = null;

  function lockPage() {
    pageScroll = { x: window.scrollX, y: window.scrollY };
    document.documentElement.style.overflow = "hidden";
  }

  function unlockPage() {
    document.documentElement.style.overflow = "";
    if (pageScroll) window.scrollTo({ left: pageScroll.x, top: pageScroll.y, behavior: "instant" });
    pageScroll = null;
  }

  function zoomIn(container) {
    var el = zoomed(container);
    var rect = el ? el.getBoundingClientRect() : null;
    lockPage();
    container.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
    container.dataset.zoomed = "1";
    container.scrollTop = 0;
    if (el && rect && rect.width) {
      // Measured on the page first, sized once the overlay is up and its
      // size is known. The element's own inline style is kept to be put back
      // as it was: an SVG may carry its size there.
      el._pageStyle = el.getAttribute("style");
      el.style.width = zoomWidth(el, rect.width, rect.height / rect.width, container) + "px";
      el.style.height = "auto";
      el.style.maxWidth = "none";
    }

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "fig-zoom-close";
    closeBtn.setAttribute("aria-label", "Close zoom");
    closeBtn.title = "Close zoom";
    // The glyph is the page's own sprite symbol, so it takes the theme's text
    // colour like the bar's buttons; custom.scss places and sizes it.
    closeBtn.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="#fig-close"></use></svg>';
    container.appendChild(closeBtn);
    closeBtn.focus();

    // Trap focus within the zoomed overlay
    container.addEventListener("keydown", trapFocus);
  }

  function zoomOut(container) {
    container.removeEventListener("keydown", trapFocus);
    var closeBtn = container.querySelector(".fig-zoom-close");
    if (closeBtn) closeBtn.remove();
    container.style.backgroundColor = "";
    delete container.dataset.zoomed;
    var el = zoomed(container);
    if (el && el._pageStyle !== undefined) {
      if (el._pageStyle === null) el.removeAttribute("style");
      else el.setAttribute("style", el._pageStyle);
      delete el._pageStyle;
    }
    unlockPage();

    if (zoomTrigger) {
      zoomTrigger.focus();
      zoomTrigger = null;
    }
  }

  function toggleZoom(container, trigger) {
    if (container.dataset.zoomed) {
      zoomOut(container);
    } else {
      zoomTrigger = trigger;
      zoomIn(container);
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

  // A click on the figure itself toggles zoom, as does its close button. A click on a
  // link in a diagram follows the link, out of the zoom first if it is zoomed.
  document.addEventListener("click", function (e) {
    var container = e.target.closest(".fig-container");
    if (!container) return;
    if (e.target.closest("a[href]")) {
      if (container.dataset.zoomed) zoomOut(container);
      return;
    }
    e.preventDefault();
    if (e.target.closest(".fig-zoom-close")) {
      zoomOut(container);
      return;
    }
    toggleZoom(container, e.target);
  });

  // Escape closes zoom
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key !== "Escape") return;
      var zoomed = document.querySelector(".fig-container[data-zoomed]");
      if (!zoomed) return;
      zoomOut(zoomed);
    },
    { capture: true }
  );

  // ---- The bar's buttons ---------------------------------------------------

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".fig-controls button[data-action]");
    if (!btn) return;
    e.preventDefault();
    var wrap = btn.closest(".fig-wrap");
    var container = wrap && wrap.querySelector(".fig-container");
    if (!container) return;
    var action = btn.dataset.action;
    if (action === "zoom") return toggleZoom(container, btn);
    var svg = container.querySelector(":scope > svg");
    if (svg) diagramAction(svg, action, btn);
    else pictureAction(wrap, action, btn);
  });

  // A picture's or an image's: its files are on the site, so a download is a
  // link to the file, and a copy is the file's bytes (or, for a raster that is
  // no PNG, the image drawn on a canvas and encoded as one).
  function pictureAction(wrap, action, btn) {
    var s = sources(wrap);
    if (!s) return;
    if (action === "download-svg" && s.svg) return downloadUrl(s.svg);
    if (action === "download-png") return downloadUrl(s.raster);
    if (action === "copy-svg" && s.svg) {
      var text = fetchBlob(s.svg).then(function (b) {
        return b.text();
      });
      return copyItem(
        btn,
        "SVG",
        text.then(function (t) {
          return new Blob([t], { type: "text/plain" });
        }),
        "text/plain"
      );
    }
    if (action === "copy-png") {
      var png = /\.png(?=[?#]|$)/i.test(s.raster)
        ? fetchBlob(s.raster).then(function (b) {
            return new Blob([b], { type: "image/png" });
          })
        : drawnAsPng(s.raster);
      return copyItem(btn, "PNG", png, "image/png");
    }
  }

  function fetchBlob(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status + " " + r.statusText);
      return r.blob();
    });
  }

  function drawnAsPng(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onerror = function () {
        reject(new Error("the image did not load"));
      };
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        c.toBlob(function (b) {
          if (b) resolve(b);
          else reject(new Error("the image could not be encoded"));
        }, "image/png");
      };
      img.src = url;
    });
  }

  // The item is handed to the clipboard while its bytes are still on their
  // way, which is what lets the write keep the click's permission in Safari.
  function copyItem(btn, format, blobPromise, type) {
    var item = {};
    item[type] = blobPromise;
    navigator.clipboard.write([new ClipboardItem(item)]).then(
      function () {
        copied(btn, format);
      },
      function (err) {
        exportFailed(format + " copy", "the clipboard refused the write (" + err.message + ").");
      }
    );
  }

  function downloadUrl(url) {
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName(url);
    a.click();
  }

  // A diagram's: it is inline SVG, so every action serializes it.
  function diagramAction(svg, action, btn) {
    var filename = btn.dataset.filename || "diagram";

    // Every branch goes through serializeWithFonts, so a copied or
    // downloaded diagram carries its own typeface.
    //
    // The catch degrades to a plain serialization rather than dropping the
    // click: an export in the wrong font is worth having, an export that
    // silently does not happen is not. (fontData already swallows its own
    // failures, so this only fires on something unforeseen.)
    serializeWithFonts(svg)
      .catch(function (err) {
        console.warn("figure: embedding fonts failed (" + err.message + "); exporting without them.");
        return new XMLSerializer().serializeToString(svg);
      })
      .then(function (data) {
        if (action === "download-svg") {
          triggerDownload(new Blob([data], { type: "image/svg+xml;charset=utf-8" }), filename + ".svg");
        } else if (action === "copy-svg") {
          navigator.clipboard.writeText(data).then(
            function () {
              copied(btn, "SVG");
            },
            function (err) {
              exportFailed("SVG copy", "the clipboard refused the write (" + err.message + ").");
            }
          );
        } else if (action === "download-png" || action === "copy-png") {
          rasterise(svg, data, action, filename, btn);
        }
      });
  }

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
  function rasterise(svg, data, action, filename, btn) {
    var url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
    var img = new Image();
    img.onerror = function () {
      URL.revokeObjectURL(url);
      exportFailed("PNG export", "the diagram could not be rendered as an image.");
    };
    img.onload = function () {
      var vb = svg.viewBox.baseVal;
      var w = 2048,
        h = Math.round(vb.height * (w / vb.width));
      var c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try {
        c.toBlob(function (b) {
          if (!b) return exportFailed("PNG export", "the image could not be encoded.");
          if (action === "download-png") return triggerDownload(b, filename + ".png");
          copyItem(btn, "PNG", Promise.resolve(b), "image/png");
        }, "image/png");
      } catch (err) {
        exportFailed(
          "PNG export",
          err && err.name === "SecurityError"
            ? "this diagram uses embedded HTML labels, which the browser will not " +
                "let a page read back out of a canvas. Use Download SVG instead."
            : "the image could not be encoded (" + (err && err.message) + ")."
        );
      }
    };
    img.src = url;
  }

  // A copy that worked: the clipboard glyph is ticked for a moment, as the
  // code blocks' copy button does, and a screen reader is told.
  function copied(btn, format) {
    var use = btn.querySelector("use");
    if (use) {
      use.setAttribute("href", "#fig-copied");
      clearTimeout(btn._copiedTimer);
      btn._copiedTimer = setTimeout(function () {
        use.setAttribute("href", "#fig-copy");
      }, 1500);
    }
    announce(format + " copied to the clipboard.");
  }

  function exportFailed(what, why) {
    console.warn("figure: " + what + " failed -- " + why);
    announce(what + " failed: " + why);
  }

  function announce(message) {
    var el = document.getElementById("fig-export-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "fig-export-status";
      el.className = "sr-only";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    // Cleared first so an identical repeat message is still announced.
    el.textContent = "";
    setTimeout(function () {
      el.textContent = message;
    }, 50);
  }

  function triggerDownload(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
})();
