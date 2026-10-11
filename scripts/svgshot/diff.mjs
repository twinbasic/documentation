// How closely an SVG picture matches the PNG the IDE painted of the same clip.
//
// The SVG is shown the way the site shows a picture, as an <img> at the PNG's
// device scale in headless Chromium, so it gets exactly what an SVG image gets:
// no external resources, no scripts. Per pixel, the distance is to the best
// match within one device pixel in the other picture, taken both ways round: a
// glyph placed a fraction of a pixel differently is not a difference, a
// missing one is.

/** The clip an SVG picture names on its root (`data-clip`, page CSS px), else its own size at 0,0. */
export function svgClip(svg) {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? "";
  const attr = (name) => new RegExp(`\\s${name}="([^"]*)"`).exec(root)?.[1];
  const c = attr("data-clip")?.split(/\s+/).map(Number);
  return c
    ? { x: c[0], y: c[1], w: c[2], h: c[3] }
    : { x: 0, y: 0, w: Number.parseFloat(attr("width")), h: Number.parseFloat(attr("height")) };
}

/**
 * Renders `svg` in the puppeteer `page` and compares it with `ref`, a PNG whose
 * top left is the page point `refOrigin` (CSS px) at `scale` device px per CSS
 * px. Returns the statistics -- the share of pixels (percent) differing by at
 * least 8, 32 and 96 levels, the same for 32 without the one-pixel tolerance,
 * the mean, and the `top` worst `tile`-px tiles in page CSS px -- with the
 * render, the reference cropped to the clip, and the difference map, as PNGs.
 */
export async function diffSvg(page, svg, ref, { refOrigin = { x: 0, y: 0 }, scale = 2, tile = 16, top = 12 } = {}) {
  const clip = svgClip(svg);
  await page.setViewport({ width: Math.ceil(clip.w), height: Math.ceil(clip.h), deviceScaleFactor: scale });
  const svgUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block}</style>` +
      `<img id="s" width="${clip.w}" height="${clip.h}" src="${svgUrl}">`,
  );
  await page.evaluate(() => document.getElementById("s").decode());
  const render = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: clip.w, height: clip.h } });

  const out = await page.evaluate(
    async ({ refUrl, renderUrl, clip, refOrigin, scale, tile, top }) => {
      const load = (src) =>
        new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error("image did not load"));
          i.src = src;
        });
      const [refImg, gotImg] = await Promise.all([load(refUrl), load(renderUrl)]);
      const W = gotImg.naturalWidth;
      const H = gotImg.naturalHeight;
      const canvas = () => {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        return c.getContext("2d", { willReadFrequently: true });
      };
      const r = canvas();
      const sx = Math.round((clip.x - refOrigin.x) * scale);
      const sy = Math.round((clip.y - refOrigin.y) * scale);
      r.drawImage(refImg, sx, sy, W, H, 0, 0, W, H);
      const g = canvas();
      g.drawImage(gotImg, 0, 0);
      const a = r.getImageData(0, 0, W, H).data;
      const b = g.getImageData(0, 0, W, H).data;
      const d = canvas();
      const img = d.createImageData(W, H);
      const o = img.data;
      const T = Math.round(tile * scale);
      const tilesX = Math.ceil(W / T);
      const tiles = new Map();
      let over8 = 0;
      let over32 = 0;
      let over96 = 0;
      let strict32 = 0;
      let sum = 0;
      // Luminance and alpha, not each channel: ClearType draws a glyph's edge
      // as colour fringes that hold the same coverage, which a channel-wise
      // distance counts as a difference and a luminance one mostly does not.
      const dist = (x, p, y, q) =>
        Math.max(
          Math.abs(0.299 * (x[p] - y[q]) + 0.587 * (x[p + 1] - y[q + 1]) + 0.114 * (x[p + 2] - y[q + 2])),
          Math.abs(x[p + 3] - y[q + 3]),
        );
      const near = (x, y, p, px, py) => {
        let best = 1e9;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = py + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = px + dx;
            if (xx < 0 || xx >= W) continue;
            const d = dist(x, p, y, (yy * W + xx) * 4);
            if (d < best) best = d;
          }
        }
        return best;
      };
      for (let p = 0; p < a.length; p += 4) {
        const i = p / 4;
        if (dist(a, p, b, p) >= 32) strict32++;
        const pxl = i % W;
        const pyl = Math.floor(i / W);
        const diff = Math.max(near(a, b, p, pxl, pyl), near(b, a, p, pxl, pyl));
        sum += diff;
        const lum = (a[p] * 0.3 + a[p + 1] * 0.59 + a[p + 2] * 0.11) * 0.25 + 180;
        let rgb = [lum, lum, lum];
        if (diff >= 8) over8++;
        if (diff >= 32) {
          over32++;
          const key = Math.floor(i / W / T) * tilesX + Math.floor((i % W) / T);
          tiles.set(key, (tiles.get(key) ?? 0) + 1);
        }
        if (diff >= 96) {
          over96++;
          rgb = [230, 0, 0];
        } else if (diff >= 32) rgb = [255, 140, 0];
        else if (diff >= 8) rgb = [220, 200, 0];
        o[p] = rgb[0];
        o[p + 1] = rgb[1];
        o[p + 2] = rgb[2];
        o[p + 3] = 255;
      }
      d.putImageData(img, 0, 0);
      const pixels = W * H;
      const worst = [...tiles.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, top)
        .map(([key, n]) => ({
          x: clip.x + (key % tilesX) * tile,
          y: clip.y + Math.floor(key / tilesX) * tile,
          share: +(n / (T * T)).toFixed(3),
        }));
      return {
        stats: {
          size: [W, H],
          pct8: +((100 * over8) / pixels).toFixed(3),
          pct32: +((100 * over32) / pixels).toFixed(3),
          pct96: +((100 * over96) / pixels).toFixed(3),
          strictPct32: +((100 * strict32) / pixels).toFixed(3),
          mean: +(sum / pixels).toFixed(3),
          worst,
        },
        diffUrl: d.canvas.toDataURL("image/png"),
        refUrl: r.canvas.toDataURL("image/png"),
      };
    },
    {
      refUrl: `data:image/png;base64,${ref.toString("base64")}`,
      renderUrl: `data:image/png;base64,${render.toString("base64")}`,
      clip,
      refOrigin,
      scale,
      tile,
      top,
    },
  );
  const png = (url) => Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
  return { clip, stats: out.stats, render: Buffer.from(render), diff: png(out.diffUrl), refCrop: png(out.refUrl) };
}

/** Reference above render above difference, magnified without smoothing, for the page area `zoom`. */
export async function zoomPicture(page, { refCrop, render, diff, clip }, zoom, scale = 2) {
  const url = await page.evaluate(
    async ({ urls, clip, zoom, scale }) => {
      const load = (src) =>
        new Promise((resolve) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.src = src;
        });
      const imgs = await Promise.all(urls.map(load));
      const sx = (zoom.x - clip.x) * scale;
      const sy = (zoom.y - clip.y) * scale;
      const sw = zoom.w * scale;
      const sh = zoom.h * scale;
      const k = Math.max(1, Math.floor(1200 / sw));
      const c = document.createElement("canvas");
      c.width = sw * k;
      c.height = (sh * k + 4) * imgs.length;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.fillStyle = "#f0f";
      g.fillRect(0, 0, c.width, c.height);
      for (const [i, img] of imgs.entries()) g.drawImage(img, sx, sy, sw, sh, 0, i * (sh * k + 4), sw * k, sh * k);
      return c.toDataURL("image/png");
    },
    { urls: [refCrop, render, diff].map((b) => `data:image/png;base64,${b.toString("base64")}`), clip, zoom, scale },
  );
  return Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
}
