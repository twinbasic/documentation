// The build's URL helpers: the two URL filters every page's links go through,
// the base-URL normaliser, and two string helpers.
//
// relativeUrl and absoluteUrl are ports of Jekyll's `relative_url` and
// `absolute_url` filters, with two departures. A network-path reference
// (`//host/path`) is absolute and passes through unchanged, where Jekyll
// would put the base URL in front of it. A value that is not a string gives
// "", which is what Liquid prints for the nil Jekyll returns.

// A scheme (`https:`, `mailto:`) or a network-path reference (`//host`).
const ABSOLUTE_URL = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/;

/** A base URL as "" or "/prefix": one leading slash added if missing, trailing ones removed. */
export function normalizeBaseurl(raw) {
  let baseurl = String(raw ?? "").replace(/\/+$/, "");
  if (baseurl && !baseurl.startsWith("/")) baseurl = `/${baseurl}`;
  return baseurl;
}

/**
 * Encodes each space as %20: the only character in this site's paths that
 * needs it. encodeURI would also encode what must stay, such as a `%`.
 */
export function encodeSpaces(s) {
  return s.includes(" ") ? s.replaceAll(" ", "%20") : s;
}

/** Splits `href` at its first "#": `[before, after]`, `after` null when there is none. */
export function splitFragment(href) {
  const i = href.indexOf("#");
  if (i < 0) return [href, null];
  return [href.slice(0, i), href.slice(i + 1)];
}

/**
 * Puts `baseurl`, as given, in front of a root-relative path and encodes the
 * path's spaces. Anything else -- an absolute URL, a relative path, a bare
 * fragment -- is returned unchanged.
 */
export function relativeUrl(url, baseurl) {
  if (typeof url !== "string") return "";
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  return encodeSpaces(`${baseurl}${url}`);
}

/**
 * The URL `url` has on the deployed site: `config.url`, then `config.baseurl`
 * normalised, then the path, read from the site root whether or not it starts
 * with "/". An absolute URL is returned unchanged, and with no `config.url`
 * the result is the root-relative path.
 */
export function absoluteUrl(url, config) {
  if (typeof url !== "string") return "";
  if (ABSOLUTE_URL.test(url)) return url;
  const rel = relativeUrl(url.startsWith("/") ? url : `/${url}`, normalizeBaseurl(config.baseurl));
  const siteUrl = String(config.url ?? "");
  return siteUrl === "" ? rel : new URL(siteUrl + rel).href;
}
