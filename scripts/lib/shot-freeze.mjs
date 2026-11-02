// A page frozen into one document, so that a picture can show it in a frame of the page
// it is taken of. The SVG of a picture is drawn from the DOM snapshot of one page, and
// a page shown beside it by another process is not in that snapshot: the IDE's Webpage
// pane, a second WebView2 the host lays over the pane, and the detached help window's
// docs frame, whose site is not its page's, a frame of another process. Such a page is
// frozen from its own DevTools target (freezePage) and shown in an <iframe srcdoc> of
// the page the picture is taken of (showFrozen), which is of that page's own process,
// so that the snapshot holds it and the PNG and the SVG are both of the frozen copy.
//
// The copy is the document as it stands, its scripts left out, so that nothing in it
// changes once it is shown: its style sheets as the page's CSSOM holds them (a rule a
// script added included), in their order, in <style>s at the end of its head, each
// url() in them a data: URL of the file (its fonts and pictures), else the absolute
// URL; each <img> the data: URL of the picture it shows; the values of its text
// boxes, check boxes and lists as attributes; where the window and each scrolled box
// are scrolled, put back once it is shown; and a <base> of the page's own address,
// for what is left relative. A file the page cannot read keeps its absolute URL.

// The url() tokens of a style sheet's text, as Chromium writes a rule's cssText (quoted
// with double quotes, or bare), and as an author writes them (single quotes too):
// [{start, end, url}], `url` with the backslash escapes of a quoted one taken out.
// A url(#id), a reference into the document, is left out.
export function cssUrls(text) {
  const out = [];
  const re = /url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^'"()\s]*))\s*\)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const quoted = m[1] ?? m[2];
    const url = quoted === undefined ? m[3] : quoted.replace(/\\(.)/g, "$1");
    if (url && !url.startsWith("#")) out.push({ start: m.index, end: m.index + m[0].length, url });
  }
  return out;
}

// `text` with each of its url()s (cssUrls) replaced by url("<what `replace` gives>"),
// `replace` awaited for each; one it gives null for is left as it was.
export async function rewriteCssUrls(text, replace) {
  const urls = cssUrls(text);
  const by = await Promise.all(urls.map((u) => replace(u.url)));
  let out = "";
  let at = 0;
  for (const [k, u] of urls.entries()) {
    if (by[k] == null) continue;
    out += `${text.slice(at, u.start)}url("${by[k].replace(/["\\]/g, "\\$&")}")`;
    at = u.end;
  }
  return out + text.slice(at);
}

// Runs in the page: the document frozen, as a string of HTML. `css` is added after its
// own style sheets. It calls this module's `rewriteCssUrls`, which freezePage puts
// beside it in the page.
async function frozenDocument({ css }) {
  const files = new Map();
  const absolute = (url, base) => {
    try {
      return new URL(url, base).href;
    } catch {
      return url;
    }
  };
  // The file at `url` as a data: URL, read once; its absolute URL when it cannot be read.
  const inline = (url, base) => {
    const href = absolute(url, base);
    if (/^(?:data|blob|about|javascript):/i.test(href)) return Promise.resolve(href);
    if (!files.has(href)) {
      files.set(
        href,
        fetch(href)
          .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
          .then(
            (blob) =>
              new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = reject;
                fr.readAsDataURL(blob);
              }),
          )
          .catch(() => href),
      );
    }
    return files.get(href);
  };
  const sheetText = async (sheet) => {
    const base = sheet.href ?? document.baseURI;
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      // a sheet of another origin, whose rules cannot be read: its text
      try {
        return await rewriteCssUrls(await (await fetch(sheet.href)).text(), (u) => inline(u, base));
      } catch {
        return "";
      }
    }
    const parts = [];
    for (const rule of rules) {
      if (rule instanceof CSSImportRule) {
        if (!rule.styleSheet) continue;
        const text = await sheetText(rule.styleSheet);
        const media = rule.media.mediaText;
        parts.push(media ? `@media ${media}{${text}}` : text);
      } else parts.push(rule.cssText);
    }
    return rewriteCssUrls(parts.join("\n"), (u) => inline(u, base));
  };
  const sheets = [];
  for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) {
    if (sheet.disabled) continue;
    const text = await sheetText(sheet);
    const media = sheet.media.mediaText;
    sheets.push(media ? `@media ${media}{${text}}` : text);
  }

  // The copy, and the page's elements beside its own, in the same order.
  const copy = document.documentElement.cloneNode(true);
  const live = [document.documentElement, ...document.documentElement.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  const gone = [];
  const waits = [];
  for (const [k, e] of live.entries()) {
    const c = copies[k];
    const tag = e.localName;
    if (tag === "script" || tag === "style" || tag === "base") gone.push(c);
    else if (tag === "link" && /\b(?:stylesheet|preload|modulepreload|prefetch)\b/i.test(e.rel)) gone.push(c);
    else if (tag === "source" && e.parentElement?.localName === "picture") gone.push(c);
    if (e.scrollTop || e.scrollLeft) c.setAttribute("data-tbfreeze-scroll", `${e.scrollLeft},${e.scrollTop}`);
    if (tag === "input") {
      if (e.type === "checkbox" || e.type === "radio") c.toggleAttribute("checked", e.checked);
      else if (e.type !== "file") c.setAttribute("value", e.value);
    } else if (tag === "textarea") c.textContent = e.value;
    else if (tag === "option") c.toggleAttribute("selected", e.selected);
    else if (tag === "img") {
      const src = e.currentSrc || e.src;
      for (const a of ["srcset", "sizes", "loading"]) c.removeAttribute(a);
      if (src) waits.push(inline(src, document.baseURI).then((u) => c.setAttribute("src", u)));
    } else if (tag === "image" && e.namespaceURI === "http://www.w3.org/2000/svg") {
      const href = e.getAttribute("href") ?? e.getAttribute("xlink:href");
      if (href && !href.startsWith("#")) {
        waits.push(
          inline(href, e.baseURI).then((u) => {
            c.removeAttribute("xlink:href");
            c.setAttribute("href", u);
          }),
        );
      }
    }
    const style = c.getAttribute("style");
    if (style?.includes("url(")) {
      waits.push(rewriteCssUrls(style, (u) => inline(u, document.baseURI)).then((s) => c.setAttribute("style", s)));
    }
  }
  await Promise.all(waits);
  for (const c of gone) c.remove();
  copy.setAttribute("data-tbfreeze-window", `${scrollX},${scrollY}`);
  let head = copy.querySelector("head");
  if (!head) {
    head = document.createElement("head");
    copy.prepend(head);
  }
  const base = document.createElement("base");
  base.href = document.baseURI;
  head.prepend(base);
  for (const text of [...sheets, css]) {
    if (!text) continue;
    const s = document.createElement("style");
    s.textContent = text;
    head.append(s);
  }
  const d = document.doctype;
  const doctype = d
    ? `<!DOCTYPE ${d.name}${d.publicId ? ` PUBLIC "${d.publicId}"` : ""}${d.systemId ? ` "${d.systemId}"` : ""}>`
    : "";
  return doctype + copy.outerHTML;
}

/**
 * The page `conn` is attached to, frozen into one document of HTML (the module's header
 * says what it keeps). `css` is a style sheet added after the page's own.
 */
export async function freezePage(conn, { css = "" } = {}) {
  const code = `(() => {
  const cssUrls = ${cssUrls};
  const rewriteCssUrls = ${rewriteCssUrls};
  return (${frozenDocument})(${JSON.stringify({ css })});
})()`;
  return conn.evaluate(code, { awaitPromise: true, timeout: 60000 });
}

/**
 * Shows the document `html` (freezePage's) in the <iframe> that the expression `iframe`
 * gives in the page `conn` is attached to, and resolves once it has loaded, its fonts and
 * pictures too, and is scrolled where the page it was frozen from was. The frame's own
 * address (src) stays, and comes back when its srcdoc is removed.
 */
export async function showFrozen(conn, iframe, html, { timeout = 20000 } = {}) {
  await conn.evaluate(`(() => { ${iframe}.srcdoc = ${JSON.stringify(html)}; })()`);
  const shown = await conn.evaluate(
    `new Promise((done) => {
  const until = Date.now() + ${timeout};
  const check = () => {
    const d = ${iframe}?.contentDocument;
    const root = d && d.URL === "about:srcdoc" && d.readyState === "complete" && d.documentElement;
    const at = root ? root.getAttribute("data-tbfreeze-window") : null;
    if (at !== null && d.fonts.status === "loaded" && [...d.images].every((i) => i.complete)) {
      const [x, y] = at.split(",").map(Number);
      root.removeAttribute("data-tbfreeze-window");
      for (const e of d.querySelectorAll("[data-tbfreeze-scroll]")) {
        const [left, top] = e.getAttribute("data-tbfreeze-scroll").split(",").map(Number);
        e.removeAttribute("data-tbfreeze-scroll");
        e.scrollLeft = left;
        e.scrollTop = top;
      }
      d.defaultView.scrollTo(x, y);
      done(true);
    } else if (Date.now() > until) done(false);
    else setTimeout(check, 50);
  };
  check();
})`,
    { awaitPromise: true, timeout: timeout + 10000 },
  );
  if (!shown) throw new Error(`the frozen page did not finish loading in ${iframe}`);
}
