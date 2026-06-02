(function () {
  document.addEventListener("click", function (e) {
    var container = e.target.closest(".svg-container");
    if (!container) return;
    if (e.target.closest(".svg-controls")) return;
    e.preventDefault();
    var svg = container.querySelector("svg");
    if (container.dataset.zoomed) {
      container.removeAttribute("style");
      container.style.cursor = "zoom-in";
      if (svg) svg.style.maxWidth = "";
      delete container.dataset.zoomed;
    } else {
      var bg = getComputedStyle(document.body).backgroundColor;
      Object.assign(container.style, {
        position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
        zIndex: "9999", background: bg, padding: "1rem", boxSizing: "border-box",
        overflow: "auto", cursor: "zoom-out"
      });
      if (svg) svg.style.maxWidth = "100%";
      container.dataset.zoomed = "1";
      container.scrollTop = 0;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var zoomed = document.querySelector(".svg-container[data-zoomed]");
    if (!zoomed) return;
    zoomed.removeAttribute("style");
    zoomed.style.cursor = "zoom-in";
    var svg = zoomed.querySelector("svg");
    if (svg) svg.style.maxWidth = "";
    delete zoomed.dataset.zoomed;
  }, { capture: true });

  document.addEventListener("click", function (e) {
    var link = e.target.closest(".svg-controls a[data-action]");
    if (!link) return;
    e.preventDefault();
    var wrap = link.closest(".svg-inline-wrap");
    var svg = wrap && wrap.querySelector(".svg-container > svg");
    if (!svg) return;
    var action = link.dataset.action;
    var filename = link.dataset.filename || "diagram";

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
