// What the Chrome extension does in the page it takes. Each function is sent as source
// (take.mjs's inPage), so none may use a name from outside itself. What a function changes it
// records in window.__svgshot.undo, and undoPage puts it all back, last first, so that the page
// is left as it was found.

/**
 * The private words of the document, and of each open shadow root in it, replaced by their
 * stand-ins (private-words.mjs): each text node (a <select>'s options among them), each text
 * box's value and each attribute but those that load something. An <img> whose alternative
 * text, address, link or hover card holds a word shows `avatar` instead: it is a picture of the
 * person, which no text search reaches. Run again it masks only what the page has drawn since.
 * Returns how much it changed: {text, value, attribute, avatar}.
 */
export function maskPage({ list, avatar }) {
  const state = (window.__svgshot ??= { undo: [] });
  const low = list.map((w) => w.find.toLowerCase());
  const holds = (s) => {
    const l = s.toLowerCase();
    return low.some((w) => l.includes(w));
  };
  const clean = (s) => {
    let out = s;
    for (const { find, show } of list) {
      const w = find.toLowerCase();
      for (let at = out.toLowerCase().indexOf(w); at >= 0; at = out.toLowerCase().indexOf(w, at + show.length))
        out = out.slice(0, at) + show + out.slice(at + find.length);
    }
    return out;
  };
  const count = { text: 0, value: 0, attribute: 0, avatar: 0 };
  const noText = new Set(["SCRIPT", "STYLE"]);
  const loads = new Set(["SCRIPT", "LINK", "BASE", "IFRAME", "SOURCE"]);
  const roots = [document];
  for (let i = 0; i < roots.length; i++)
    for (const e of roots[i].querySelectorAll("*")) if (e.shadowRoot) roots.push(e.shadowRoot);
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (noText.has(n.parentElement?.tagName) || !holds(n.data)) continue;
      const [was, now] = [n.data, clean(n.data)];
      n.data = now;
      state.undo.push(() => {
        if (n.data === now) n.data = was;
      });
      count.text++;
    }
    // The pictures first: the words round one are in attributes that are masked next.
    for (const img of root.querySelectorAll("img")) {
      const link = img.closest("a");
      const about = [
        img.alt,
        img.title,
        img.currentSrc,
        img.getAttribute("data-hovercard-url"),
        link?.href,
        link?.getAttribute("data-hovercard-url"),
      ];
      if (img.src === avatar || !holds(about.filter(Boolean).join(" "))) continue;
      const [src, srcset] = [img.getAttribute("src"), img.getAttribute("srcset")];
      const sources =
        img.parentElement?.localName === "picture" ? [...img.parentElement.querySelectorAll("source")] : [];
      const parent = img.parentElement;
      for (const s of sources) s.remove();
      img.removeAttribute("srcset");
      img.src = avatar;
      state.undo.push(() => {
        img.setAttribute("src", src);
        if (srcset !== null) img.setAttribute("srcset", srcset);
        for (const s of sources.toReversed()) parent.prepend(s);
      });
      count.avatar++;
    }
    for (const e of root.querySelectorAll("*")) {
      if (loads.has(e.tagName)) continue;
      for (const { name, value } of [...e.attributes]) {
        if (name === "style" || (e.tagName === "IMG" && (name === "src" || name === "srcset")) || !holds(value))
          continue;
        e.setAttribute(name, clean(value));
        state.undo.push(() => e.setAttribute(name, value));
        count.attribute++;
      }
      if ((e.tagName === "INPUT" || e.tagName === "TEXTAREA") && e.value && holds(e.value)) {
        const was = e.value;
        e.value = clean(was);
        state.undo.push(() => {
          e.value = was;
        });
        count.value++;
      }
    }
  }
  return count;
}

/** Puts back all that window.__svgshot.undo records, last first. */
export function undoPage() {
  const state = window.__svgshot;
  if (!state) return;
  for (const step of state.undo.toReversed()) {
    try {
      step();
    } catch {
      // What has gone from the page since needs nothing put back.
    }
  }
  delete window.__svgshot;
}

/**
 * The style sheet `css` on the document and each open shadow root: a constructed sheet, which
 * a page's Content-Security-Policy does not refuse as it can refuse a <style> a script adds.
 */
export function quietPage({ css }) {
  const state = (window.__svgshot ??= { undo: [] });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const roots = [document];
  for (let i = 0; i < roots.length; i++)
    for (const e of roots[i].querySelectorAll("*")) if (e.shadowRoot) roots.push(e.shadowRoot);
  for (const root of roots) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    state.undo.push(() => {
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
    });
  }
}

/**
 * Sets a theme by the attributes GitHub's pages keep it in, when the page has them: the
 * account's own setting can name one theme whatever the emulated preference says, or a dimmed
 * or high-contrast theme. Any other page follows the emulated prefers-color-scheme alone.
 */
export function pageTheme({ theme }) {
  const state = (window.__svgshot ??= { undo: [] });
  const html = document.documentElement;
  if (!html.hasAttribute("data-color-mode")) return;
  const names = ["data-color-mode", "data-light-theme", "data-dark-theme"];
  if (!state.themed) {
    state.themed = true;
    const was = names.map((n) => html.getAttribute(n));
    state.undo.push(() => {
      for (const [k, n] of names.entries()) html.setAttribute(n, was[k]);
    });
  }
  html.setAttribute("data-color-mode", theme);
  html.setAttribute("data-light-theme", "light");
  html.setAttribute("data-dark-theme", "dark");
}

/** Resolves once fonts have loaded, the images in the window have decoded and two frames are drawn. */
export async function settled() {
  await document.fonts.ready;
  await Promise.allSettled(
    [...document.images]
      .filter((i) => {
        const r = i.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight && r.width > 0;
      })
      .map((i) => i.decode()),
  );
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return true;
}

/** The window's size and scale. */
export function windowSize() {
  return { dpr: devicePixelRatio, width: innerWidth, height: innerHeight };
}

/** The part of the document the window shows, its scrollbars left out, in document CSS px. */
export function shownArea() {
  const { clientWidth, clientHeight } = document.documentElement;
  return { x: scrollX, y: scrollY, width: clientWidth, height: clientHeight };
}

/** Where the window is scrolled to. */
export function scrolled() {
  return { x: scrollX, y: scrollY };
}

/** The addresses of the images that show in `view` (document CSS px), none a data: URL. */
export function imagesIn({ view }) {
  const roots = [document];
  for (let i = 0; i < roots.length; i++)
    for (const e of roots[i].querySelectorAll("*")) if (e.shadowRoot) roots.push(e.shadowRoot);
  const urls = new Set();
  for (const root of roots) {
    for (const img of root.querySelectorAll("img")) {
      const r = img.getBoundingClientRect();
      const [x, y] = [r.x + scrollX, r.y + scrollY];
      if (!img.currentSrc || img.currentSrc.startsWith("data:") || !r.width || !r.height) continue;
      if (x < view.x + view.width && x + r.width > view.x && y < view.y + view.height && y + r.height > view.y)
        urls.add(img.currentSrc);
    }
  }
  return [...urls];
}

/**
 * Each <img> that shows an address in `files` shows that file as a data: URL instead, since the
 * SVG can hold no other kind (snapshot-svg.mjs takes the source the page says it draws).
 */
export async function showImages({ files }) {
  const state = (window.__svgshot ??= { undo: [] });
  const roots = [document];
  for (let i = 0; i < roots.length; i++)
    for (const e of roots[i].querySelectorAll("*")) if (e.shadowRoot) roots.push(e.shadowRoot);
  const loads = [];
  for (const root of roots) {
    for (const img of root.querySelectorAll("img")) {
      const data = files[img.currentSrc];
      if (!data) continue;
      const [src, srcset] = [img.getAttribute("src"), img.getAttribute("srcset")];
      const parent = img.parentElement;
      const sources = parent?.localName === "picture" ? [...parent.querySelectorAll("source")] : [];
      for (const s of sources) s.remove();
      img.removeAttribute("srcset");
      img.src = data;
      state.undo.push(() => {
        img.setAttribute("src", src);
        if (srcset !== null) img.setAttribute("srcset", srcset);
        for (const s of sources.toReversed()) parent.prepend(s);
      });
      loads.push(img.decode());
    }
  }
  await Promise.allSettled(loads);
}

/**
 * Lets the person mark a part of the window: a drag gives the rectangle dragged, and a click the
 * box of the element under it. Resolves to {x, y, width, height} in window CSS px, whole pixels
 * inside the window's content, or null for Esc or window.__svgshot.cancelPick (the panel's
 * Cancel: a key goes to the panel while it has the focus). `hint` says what is asked for.
 */
export function pickArea({ hint }) {
  const state = (window.__svgshot ??= { undo: [] });
  return new Promise((resolve) => {
    const div = (css) => {
      const d = document.createElement("div");
      d.style.cssText = `all:initial;position:fixed;z-index:2147483647;${css}`;
      document.documentElement.append(d);
      return d;
    };
    const veil = div("inset:0;cursor:crosshair;background:rgba(0,0,0,.1);touch-action:none");
    const band = div("display:none;box-sizing:border-box;border:2px solid #E5252A;pointer-events:none");
    const tip = div(
      "left:50%;top:12px;transform:translateX(-50%);padding:6px 12px;border-radius:6px;" +
        "background:#E5252A;color:#fff;font:600 14px/20px system-ui,sans-serif;pointer-events:none",
    );
    tip.textContent = hint;
    const finish = (area) => {
      for (const d of [veil, band, tip]) d.remove();
      removeEventListener("keydown", key, true);
      delete state.cancelPick;
      resolve(area);
    };
    const key = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      finish(null);
    };
    const { clientWidth, clientHeight } = document.documentElement;
    const whole = (x0, y0, x1, y1) => {
      const [l, t] = [Math.max(0, Math.floor(x0)), Math.max(0, Math.floor(y0))];
      const [r, b] = [Math.min(clientWidth, Math.ceil(x1)), Math.min(clientHeight, Math.ceil(y1))];
      return { x: l, y: t, width: r - l, height: b - t };
    };
    let from = null;
    const rectOf = (e) =>
      whole(
        Math.min(from.x, e.clientX),
        Math.min(from.y, e.clientY),
        Math.max(from.x, e.clientX),
        Math.max(from.y, e.clientY),
      );
    veil.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      veil.setPointerCapture(e.pointerId);
      from = { x: e.clientX, y: e.clientY };
      tip.style.display = "none";
    });
    veil.addEventListener("pointermove", (e) => {
      if (!from) return;
      const r = rectOf(e);
      band.style.cssText += `;display:block;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px`;
    });
    veil.addEventListener("pointerup", (e) => {
      if (!from) return;
      const r = rectOf(e);
      if (r.width > 3 || r.height > 3) {
        finish(r);
        return;
      }
      veil.style.display = "none";
      const box = document.elementFromPoint(e.clientX, e.clientY)?.getBoundingClientRect();
      finish(box?.width ? whole(box.left, box.top, box.right, box.bottom) : null);
    });
    addEventListener("keydown", key, true);
    state.cancelPick = () => finish(null);
  });
}
