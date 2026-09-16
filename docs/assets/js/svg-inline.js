(function () {
  var zoomTrigger = null;

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

    if (action === "download-svg") {
      triggerDownload(
        new Blob([new XMLSerializer().serializeToString(svg)],
          { type: "image/svg+xml;charset=utf-8" }),
        filename + ".svg");
    } else if (action === "copy-svg") {
      navigator.clipboard.writeText(svg.outerHTML);
    } else if (action === "download-png" || action === "copy-png") {
      var data = new XMLSerializer().serializeToString(svg);
      var blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var vb = svg.viewBox.baseVal;
        var w = 2048, h = Math.round(vb.height * (w / vb.width));
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (action === "download-png") triggerDownload(b, filename + ".png");
          else navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
        }, "image/png");
      };
      img.src = url;
    }
  });

  function triggerDownload(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
})();
